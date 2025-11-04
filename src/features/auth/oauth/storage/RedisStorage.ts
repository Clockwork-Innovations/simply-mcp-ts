/**
 * Redis implementation of OAuth storage provider.
 *
 * This is a production-ready storage backend for SimplyMCP's OAuth provider.
 * It uses Redis for persistence with automatic expiration via TTL.
 *
 * Features:
 * - Atomic operations using Lua scripts (markAuthorizationCodeUsed)
 * - Connection management with exponential backoff retry
 * - Transaction support via Redis MULTI/EXEC
 * - Health checks with latency monitoring
 * - Proper TTL handling (Redis uses seconds, not milliseconds)
 * - Key prefixing to avoid collisions
 *
 * Requirements:
 * - Redis 2.6+ (for Lua script support)
 * - ioredis library
 *
 * @module storage/RedisStorage
 */

import Redis from 'ioredis';
import type {
  StoredClient,
  StoredToken,
  StoredAuthorizationCode,
} from '../types.js';
import type {
  OAuthStorageProvider,
  StorageTransaction,
  StorageStats,
  HealthCheckResult,
  OAuthStorageConfig,
} from './types.js';

/**
 * Configuration for Redis storage provider.
 * Extends base OAuthStorageConfig with Redis-specific options.
 */
export interface RedisStorageConfig extends OAuthStorageConfig {
  /**
   * Redis host (default: 'localhost')
   */
  host?: string;

  /**
   * Redis port (default: 6379)
   */
  port?: number;

  /**
   * Redis password (optional)
   */
  password?: string;

  /**
   * Redis database number (default: 0)
   */
  db?: number;

  /**
   * Key prefix for all OAuth keys (default: 'oauth:')
   */
  keyPrefix?: string;

  /**
   * Number of connection retry attempts (default: 5)
   */
  connectionRetryAttempts?: number;

  /**
   * Initial retry delay in milliseconds (default: 1000)
   * Uses exponential backoff: delay * 2^attempt
   */
  connectionRetryDelay?: number;

  /**
   * Maximum retry delay in milliseconds (default: 10000)
   */
  maxRetryDelay?: number;

  /**
   * Enable Redis offline queue (default: false)
   * If true, commands are queued while disconnected
   */
  enableOfflineQueue?: boolean;
}

/**
 * Redis storage provider for OAuth data.
 *
 * Thread-safe via Redis atomic operations.
 * Uses Lua scripts for complex atomic operations.
 */
export class RedisStorage implements OAuthStorageProvider {
  // Configuration
  private config: Required<Pick<RedisStorageConfig, 'name' | 'connectionTimeout' | 'debug' | 'host' | 'port' | 'db' | 'keyPrefix' | 'connectionRetryAttempts' | 'connectionRetryDelay' | 'maxRetryDelay' | 'enableOfflineQueue'>> & { password?: string };

  // Redis client
  private redis: Redis | null = null;

  // Connection state
  private connected = false;
  private connecting = false;

  // Retry tracking
  private retryAttempts = 0;

  constructor(config: RedisStorageConfig = {}) {
    this.config = {
      name: config.name || 'RedisStorage',
      connectionTimeout: config.connectionTimeout || 5000,
      debug: config.debug || false,
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password,
      db: config.db || 0,
      keyPrefix: config.keyPrefix || 'oauth:',
      connectionRetryAttempts: config.connectionRetryAttempts || 5,
      connectionRetryDelay: config.connectionRetryDelay || 1000,
      maxRetryDelay: config.maxRetryDelay || 10000,
      enableOfflineQueue: config.enableOfflineQueue || false,
    };
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  async connect(): Promise<void> {
    if (this.connected) {
      return; // Already connected, idempotent
    }

    if (this.connecting) {
      // Wait for existing connection attempt
      while (this.connecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.connecting = true;

    try {
      if (this.config.debug) {
        console.log(`[${this.config.name}] Connecting to Redis at ${this.config.host}:${this.config.port}...`);
      }

      // Create Redis client with retry strategy
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        enableOfflineQueue: this.config.enableOfflineQueue,
        retryStrategy: (times: number) => {
          if (times > this.config.connectionRetryAttempts) {
            // Stop retrying
            if (this.config.debug) {
              console.error(`[${this.config.name}] Max retry attempts (${this.config.connectionRetryAttempts}) reached`);
            }
            return null;
          }

          // Exponential backoff with max delay
          const delay = Math.min(
            this.config.connectionRetryDelay * Math.pow(2, times - 1),
            this.config.maxRetryDelay
          );

          if (this.config.debug) {
            console.log(`[${this.config.name}] Retry attempt ${times}/${this.config.connectionRetryAttempts} in ${delay}ms`);
          }

          this.retryAttempts = times;
          return delay;
        },
        connectTimeout: this.config.connectionTimeout,
      });

      // Set up event handlers
      this.redis.on('connect', () => {
        if (this.config.debug) {
          console.log(`[${this.config.name}] Connected to Redis`);
        }
        this.connected = true;
        this.retryAttempts = 0;
      });

      this.redis.on('ready', () => {
        if (this.config.debug) {
          console.log(`[${this.config.name}] Redis client ready`);
        }
        // Update connection state when Redis is ready (important for reconnection)
        this.connected = true;
        this.retryAttempts = 0;
      });

      this.redis.on('error', (error: Error) => {
        console.error(`[${this.config.name}] Redis error:`, error.message);
        // Mark as disconnected on error so health checks reflect the issue
        this.connected = false;
      });

      this.redis.on('close', () => {
        if (this.config.debug) {
          console.log(`[${this.config.name}] Redis connection closed`);
        }
        this.connected = false;
      });

      this.redis.on('end', () => {
        if (this.config.debug) {
          console.log(`[${this.config.name}] Redis connection ended`);
        }
        this.connected = false;
      });

      this.redis.on('reconnecting', () => {
        if (this.config.debug) {
          console.log(`[${this.config.name}] Reconnecting to Redis...`);
        }
      });

      // Wait for connection with timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Connection timeout after ${this.config.connectionTimeout}ms`));
        }, this.config.connectionTimeout);

        this.redis!.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.redis!.once('error', (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      this.connecting = false;
      throw new Error(
        `Failed to connect to Redis: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      this.connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.redis) {
      return; // Already disconnected, idempotent
    }

    if (this.config.debug) {
      console.log(`[${this.config.name}] Disconnecting from Redis...`);
    }

    try {
      // Graceful disconnect
      await this.redis.quit();
    } catch (error) {
      // Force disconnect if graceful fails
      if (this.config.debug) {
        console.warn(`[${this.config.name}] Graceful disconnect failed, forcing:`, error);
      }
      this.redis.disconnect();
    } finally {
      this.redis = null;
      this.connected = false;

      if (this.config.debug) {
        console.log(`[${this.config.name}] Disconnected from Redis`);
      }
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();

    if (!this.redis || !this.connected) {
      return {
        healthy: false,
        message: 'Redis client not connected',
        responseTimeMs: Date.now() - start,
        timestamp: Date.now(),
        components: {
          connection: {
            healthy: false,
            message: 'Not connected',
          },
        },
        errors: ['Redis client not connected'],
      };
    }

    try {
      // Test 1: Ping
      const pingStart = Date.now();
      await this.redis.ping();
      const pingLatency = Date.now() - pingStart;

      // Test 2: Read/write test
      const testKey = this.getKey('health', 'check');
      const testValue = Date.now().toString();
      await this.redis.setex(testKey, 10, testValue);
      const retrievedValue = await this.redis.get(testKey);

      const readWriteSuccess = retrievedValue === testValue;

      // Get storage stats
      const stats = await this.getStats();

      const totalLatency = Date.now() - start;
      const healthy = totalLatency < 100;
      const degraded = totalLatency >= 100 && totalLatency < 500;

      return {
        healthy,
        message: healthy
          ? 'Redis storage is healthy'
          : degraded
          ? 'Redis storage is degraded (high latency)'
          : 'Redis storage is unhealthy',
        responseTimeMs: totalLatency,
        timestamp: Date.now(),
        components: {
          connection: {
            healthy: true,
            message: `Connected to ${this.config.host}:${this.config.port}`,
          },
          ping: {
            healthy: pingLatency < 50,
            message: `${pingLatency}ms`,
          },
          readWrite: {
            healthy: readWriteSuccess,
            message: readWriteSuccess ? 'Read/write successful' : 'Read/write failed',
          },
          storage: {
            healthy: true,
            message: `${stats.tokenCount} tokens, ${stats.authorizationCodeCount} codes`,
          },
        },
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Health check failed',
        responseTimeMs: Date.now() - start,
        timestamp: Date.now(),
        components: {
          connection: {
            healthy: false,
            message: error instanceof Error ? error.message : String(error),
          },
        },
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  // ============================================================================
  // Client Management
  // ============================================================================

  async setClient(clientId: string, client: StoredClient): Promise<void> {
    this.ensureConnected();

    const key = this.getKey('client', clientId);

    // Check if client already exists
    const exists = await this.redis!.exists(key);
    if (exists) {
      throw new Error(`Client already exists: ${clientId}`);
    }

    await this.redis!.set(key, JSON.stringify(client));

    if (this.config.debug) {
      console.log(`[${this.config.name}] Set client: ${clientId}`);
    }
  }

  async getClient(clientId: string): Promise<StoredClient | undefined> {
    this.ensureConnected();

    const key = this.getKey('client', clientId);
    const data = await this.redis!.get(key);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Get client: ${clientId} -> ${data ? 'found' : 'not found'}`);
    }

    return data ? JSON.parse(data) : undefined;
  }

  async deleteClient(clientId: string): Promise<boolean> {
    this.ensureConnected();

    const key = this.getKey('client', clientId);
    const deleted = await this.redis!.del(key);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Delete client: ${clientId} -> ${deleted > 0}`);
    }

    return deleted > 0;
  }

  async listClients(): Promise<string[]> {
    this.ensureConnected();

    const pattern = this.getKey('client', '*');
    const keys = await this.redis!.keys(pattern);

    // Extract client IDs from keys
    const prefix = this.config.keyPrefix;
    const clientIds = keys.map(key => {
      // Remove prefix and 'client:' part
      const withoutPrefix = key.startsWith(prefix) ? key.slice(prefix.length) : key;
      return withoutPrefix.replace(/^client:/, '');
    });

    if (this.config.debug) {
      console.log(`[${this.config.name}] List clients: ${clientIds.length} clients`);
    }

    return clientIds;
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  async setToken(token: string, data: StoredToken, ttl: number): Promise<void> {
    this.ensureConnected();

    const key = this.getKey('token', token);

    // Check if token already exists
    const exists = await this.redis!.exists(key);
    if (exists) {
      throw new Error(`Token already exists: ${token.substring(0, 8)}...`);
    }

    // Convert TTL from seconds to seconds (already in correct unit)
    // Redis SETEX expects seconds
    if (ttl <= 0) {
      throw new Error(`Invalid TTL: ${ttl} (must be > 0)`);
    }

    await this.redis!.setex(key, ttl, JSON.stringify(data));

    if (this.config.debug) {
      console.log(`[${this.config.name}] Set token: ${token.substring(0, 8)}... (TTL: ${ttl}s)`);
    }
  }

  async getToken(token: string): Promise<StoredToken | undefined> {
    this.ensureConnected();

    const key = this.getKey('token', token);
    const data = await this.redis!.get(key);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Get token: ${token.substring(0, 8)}... -> ${data ? 'found' : 'not found'}`);
    }

    return data ? JSON.parse(data) : undefined;
  }

  async deleteToken(token: string): Promise<boolean> {
    this.ensureConnected();

    const key = this.getKey('token', token);
    const deleted = await this.redis!.del(key);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Delete token: ${token.substring(0, 8)}... -> ${deleted > 0}`);
    }

    return deleted > 0;
  }

  async deleteTokensByClient(clientId: string): Promise<number> {
    this.ensureConnected();

    const pattern = this.getKey('token', '*');
    const keys = await this.redis!.keys(pattern);

    let deleted = 0;
    for (const key of keys) {
      const data = await this.redis!.get(key);
      if (data) {
        const token: StoredToken = JSON.parse(data);
        if (token.clientId === clientId) {
          await this.redis!.del(key);
          deleted++;
        }
      }
    }

    if (this.config.debug) {
      console.log(`[${this.config.name}] Delete tokens by client: ${clientId} -> ${deleted} tokens`);
    }

    return deleted;
  }

  // ============================================================================
  // Refresh Token Management
  // ============================================================================

  async setRefreshToken(
    refreshToken: string,
    accessToken: string,
    ttl: number
  ): Promise<void> {
    this.ensureConnected();

    const key = this.getKey('refreshToken', refreshToken);

    // Check if refresh token already exists
    const exists = await this.redis!.exists(key);
    if (exists) {
      throw new Error(`Refresh token already exists: ${refreshToken.substring(0, 8)}...`);
    }

    if (ttl <= 0) {
      throw new Error(`Invalid TTL: ${ttl} (must be > 0)`);
    }

    await this.redis!.setex(key, ttl, accessToken);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Set refresh token: ${refreshToken.substring(0, 8)}... (TTL: ${ttl}s)`);
    }
  }

  async getRefreshToken(refreshToken: string): Promise<string | undefined> {
    this.ensureConnected();

    const key = this.getKey('refreshToken', refreshToken);
    const accessToken = await this.redis!.get(key);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Get refresh token: ${refreshToken.substring(0, 8)}... -> ${accessToken ? 'found' : 'not found'}`);
    }

    return accessToken || undefined;
  }

  async deleteRefreshToken(refreshToken: string): Promise<boolean> {
    this.ensureConnected();

    const key = this.getKey('refreshToken', refreshToken);
    const deleted = await this.redis!.del(key);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Delete refresh token: ${refreshToken.substring(0, 8)}... -> ${deleted > 0}`);
    }

    return deleted > 0;
  }

  async findTokensByRefreshToken(
    refreshToken: string
  ): Promise<Array<[string, StoredToken]>> {
    this.ensureConnected();

    const results: Array<[string, StoredToken]> = [];

    // Find the access token associated with this refresh token
    const accessToken = await this.getRefreshToken(refreshToken);
    if (!accessToken) {
      return results;
    }

    // Get the token data
    const tokenData = await this.getToken(accessToken);
    if (tokenData) {
      results.push([accessToken, tokenData]);
    }

    if (this.config.debug) {
      console.log(`[${this.config.name}] Find tokens by refresh token: ${refreshToken.substring(0, 8)}... -> ${results.length} tokens`);
    }

    return results;
  }

  // ============================================================================
  // Authorization Code Management
  // ============================================================================

  async setAuthorizationCode(
    code: string,
    data: StoredAuthorizationCode,
    ttl: number
  ): Promise<void> {
    this.ensureConnected();

    const key = this.getKey('authorizationCode', code);

    // Check if code already exists
    const exists = await this.redis!.exists(key);
    if (exists) {
      throw new Error(`Authorization code already exists: ${code.substring(0, 8)}...`);
    }

    if (ttl <= 0) {
      throw new Error(`Invalid TTL: ${ttl} (must be > 0)`);
    }

    await this.redis!.setex(key, ttl, JSON.stringify(data));

    if (this.config.debug) {
      console.log(`[${this.config.name}] Set authorization code: ${code.substring(0, 8)}... (TTL: ${ttl}s)`);
    }
  }

  async getAuthorizationCode(
    code: string
  ): Promise<StoredAuthorizationCode | undefined> {
    this.ensureConnected();

    const key = this.getKey('authorizationCode', code);
    const data = await this.redis!.get(key);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Get authorization code: ${code.substring(0, 8)}... -> ${data ? 'found' : 'not found'}`);
    }

    return data ? JSON.parse(data) : undefined;
  }

  async deleteAuthorizationCode(code: string): Promise<boolean> {
    this.ensureConnected();

    const key = this.getKey('authorizationCode', code);
    const deleted = await this.redis!.del(key);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Delete authorization code: ${code.substring(0, 8)}... -> ${deleted > 0}`);
    }

    return deleted > 0;
  }

  /**
   * Atomically mark an authorization code as used.
   *
   * CRITICAL: Uses Lua script to ensure atomicity and prevent race conditions.
   * This prevents replay attacks where the same code is used multiple times.
   *
   * @param code - The authorization code to mark
   * @returns true if marked successfully, false if already used
   * @throws If code does not exist or is expired
   */
  async markAuthorizationCodeUsed(code: string): Promise<boolean> {
    this.ensureConnected();

    const key = this.getKey('authorizationCode', code);

    // Lua script for atomic check-and-set
    // Returns:
    // - nil if code doesn't exist
    // - 0 if already used
    // - 1 if successfully marked
    const script = `
      local key = KEYS[1]
      local data = redis.call('GET', key)
      if not data then
        return nil
      end
      local authCode = cjson.decode(data)
      if authCode.used then
        return 0
      end
      authCode.used = true
      local ttl = redis.call('TTL', key)
      if ttl > 0 then
        redis.call('SETEX', key, ttl, cjson.encode(authCode))
      end
      return 1
    `;

    const result = await this.redis!.eval(
      script,
      1, // Number of keys
      key
    ) as number | null;

    if (result === null) {
      throw new Error(`Authorization code not found: ${code.substring(0, 8)}...`);
    }

    const success = result === 1;

    if (this.config.debug) {
      console.log(`[${this.config.name}] Mark authorization code used: ${code.substring(0, 8)}... -> ${success ? 'success' : 'already used'}`);
    }

    return success;
  }

  // ============================================================================
  // Transaction Support
  // ============================================================================

  async beginTransaction(): Promise<StorageTransaction> {
    this.ensureConnected();

    if (this.config.debug) {
      console.log(`[${this.config.name}] Begin transaction`);
    }

    return new RedisTransaction(this, this.redis!, this.config);
  }

  // ============================================================================
  // Monitoring & Statistics
  // ============================================================================

  async getStats(): Promise<StorageStats> {
    this.ensureConnected();

    // Count keys by pattern
    const tokenKeys = await this.redis!.keys(this.getKey('token', '*'));
    const refreshTokenKeys = await this.redis!.keys(this.getKey('refreshToken', '*'));
    const authorizationCodeKeys = await this.redis!.keys(this.getKey('authorizationCode', '*'));
    const clientKeys = await this.redis!.keys(this.getKey('client', '*'));

    // Get Redis info for memory usage
    let memoryUsage: number | undefined;
    let activeConnections: number | undefined;

    try {
      const info = await this.redis!.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      if (memoryMatch) {
        memoryUsage = parseInt(memoryMatch[1], 10);
      }

      const clientsInfo = await this.redis!.info('clients');
      const connectionsMatch = clientsInfo.match(/connected_clients:(\d+)/);
      if (connectionsMatch) {
        activeConnections = parseInt(connectionsMatch[1], 10);
      }
    } catch (error) {
      // INFO command may not be available in some Redis configurations
      if (this.config.debug) {
        console.warn(`[${this.config.name}] Could not get Redis INFO:`, error);
      }
    }

    return {
      tokenCount: tokenKeys.length,
      refreshTokenCount: refreshTokenKeys.length,
      authorizationCodeCount: authorizationCodeKeys.length,
      clientCount: clientKeys.length,
      memoryUsage,
      activeConnections,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get a Redis key with the configured prefix.
   * This method is public to allow RedisTransaction access.
   *
   * @param type - Type of key (client, token, refreshToken, authorizationCode)
   * @param id - Identifier
   * @returns Prefixed key
   */
  public getKey(type: string, id: string): string {
    return `${this.config.keyPrefix}${type}:${id}`;
  }

  /**
   * Ensure Redis is connected, throw if not.
   */
  private ensureConnected(): void {
    if (!this.redis || !this.connected) {
      throw new Error('Redis client not connected. Call connect() first.');
    }
  }
}

/**
 * Redis transaction implementation.
 *
 * Uses Redis MULTI/EXEC for atomic operations.
 * Buffers all operations until commit(), then executes them atomically.
 */
class RedisTransaction implements StorageTransaction {
  private storage: RedisStorage;
  private redis: Redis;
  private config: RedisStorage['config'];

  // Redis MULTI pipeline
  private pipeline: ReturnType<Redis['multi']> | null = null;

  // Transaction state
  private state: 'active' | 'committed' | 'rolled_back' = 'active';

  constructor(storage: RedisStorage, redis: Redis, config: RedisStorage['config']) {
    this.storage = storage;
    this.redis = redis;
    this.config = config;

    // Start MULTI transaction
    this.pipeline = this.redis.multi();
  }

  // ============================================================================
  // Client Operations
  // ============================================================================

  async setClient(clientId: string, client: StoredClient): Promise<void> {
    this.ensureActive();

    // Note: We can't check for existence in a transaction without executing it
    // This is a limitation of Redis MULTI/EXEC
    // The caller should ensure the client doesn't exist before starting the transaction
    const key = this.storage.getKey('client', clientId);
    this.pipeline!.set(key, JSON.stringify(client));
  }

  async getClient(clientId: string): Promise<StoredClient | undefined> {
    this.ensureActive();
    // Read operations bypass the transaction and read current state
    return this.storage.getClient(clientId);
  }

  async deleteClient(clientId: string): Promise<boolean> {
    this.ensureActive();
    const key = this.storage.getKey('client', clientId);
    this.pipeline!.del(key);
    // Note: Return value is not available until commit
    return false;
  }

  // ============================================================================
  // Token Operations
  // ============================================================================

  async setToken(token: string, data: StoredToken, ttl: number): Promise<void> {
    this.ensureActive();

    if (ttl <= 0) {
      throw new Error(`Invalid TTL: ${ttl} (must be > 0)`);
    }

    const key = this.storage.getKey('token', token);
    this.pipeline!.setex(key, ttl, JSON.stringify(data));
  }

  async getToken(token: string): Promise<StoredToken | undefined> {
    this.ensureActive();
    return this.storage.getToken(token);
  }

  async deleteToken(token: string): Promise<boolean> {
    this.ensureActive();
    const key = this.storage.getKey('token', token);
    this.pipeline!.del(key);
    return false;
  }

  // ============================================================================
  // Refresh Token Operations
  // ============================================================================

  async setRefreshToken(
    refreshToken: string,
    accessToken: string,
    ttl: number
  ): Promise<void> {
    this.ensureActive();

    if (ttl <= 0) {
      throw new Error(`Invalid TTL: ${ttl} (must be > 0)`);
    }

    const key = this.storage.getKey('refreshToken', refreshToken);
    this.pipeline!.setex(key, ttl, accessToken);
  }

  async getRefreshToken(refreshToken: string): Promise<string | undefined> {
    this.ensureActive();
    return this.storage.getRefreshToken(refreshToken);
  }

  async deleteRefreshToken(refreshToken: string): Promise<boolean> {
    this.ensureActive();
    const key = this.storage.getKey('refreshToken', refreshToken);
    this.pipeline!.del(key);
    return false;
  }

  // ============================================================================
  // Authorization Code Operations
  // ============================================================================

  async setAuthorizationCode(
    code: string,
    data: StoredAuthorizationCode,
    ttl: number
  ): Promise<void> {
    this.ensureActive();

    if (ttl <= 0) {
      throw new Error(`Invalid TTL: ${ttl} (must be > 0)`);
    }

    const key = this.storage.getKey('authorizationCode', code);
    this.pipeline!.setex(key, ttl, JSON.stringify(data));
  }

  async getAuthorizationCode(
    code: string
  ): Promise<StoredAuthorizationCode | undefined> {
    this.ensureActive();
    return this.storage.getAuthorizationCode(code);
  }

  async deleteAuthorizationCode(code: string): Promise<boolean> {
    this.ensureActive();
    const key = this.storage.getKey('authorizationCode', code);
    this.pipeline!.del(key);
    return false;
  }

  async markAuthorizationCodeUsed(code: string): Promise<boolean> {
    this.ensureActive();

    // Note: This cannot be done atomically within a MULTI/EXEC transaction
    // because Lua scripts don't work inside MULTI/EXEC
    // The caller should use this operation outside of transactions
    // or use the storage's markAuthorizationCodeUsed directly
    throw new Error(
      'markAuthorizationCodeUsed cannot be used in transactions. ' +
      'Use storage.markAuthorizationCodeUsed() directly for atomic operation.'
    );
  }

  // ============================================================================
  // Transaction Control
  // ============================================================================

  async commit(): Promise<void> {
    this.ensureActive();

    if (this.config.debug) {
      console.log(`[${this.config.name}] Committing transaction`);
    }

    try {
      // Execute all buffered commands atomically
      await this.pipeline!.exec();

      this.state = 'committed';
      this.pipeline = null;

      if (this.config.debug) {
        console.log(`[${this.config.name}] Transaction committed`);
      }
    } catch (error) {
      this.state = 'rolled_back';
      this.pipeline = null;

      if (this.config.debug) {
        console.error(`[${this.config.name}] Transaction commit failed:`, error);
      }

      throw new Error(
        `Transaction commit failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async rollback(): Promise<void> {
    this.ensureActive();

    if (this.config.debug) {
      console.log(`[${this.config.name}] Rolling back transaction`);
    }

    // Discard the MULTI pipeline
    if (this.pipeline) {
      this.pipeline.discard();
      this.pipeline = null;
    }

    this.state = 'rolled_back';

    if (this.config.debug) {
      console.log(`[${this.config.name}] Transaction rolled back`);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private ensureActive(): void {
    if (this.state !== 'active') {
      throw new Error(
        `Transaction is ${this.state}, cannot perform operations`
      );
    }
  }
}
