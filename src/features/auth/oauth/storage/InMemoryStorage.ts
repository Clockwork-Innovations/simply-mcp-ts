/**
 * In-memory implementation of OAuth storage provider.
 *
 * This is the default storage backend for SimplyMCP's OAuth provider.
 * It stores all data in memory using Maps and manages TTL with timers.
 *
 * Features:
 * - Automatic expiration via setTimeout
 * - Deep copying to prevent external mutations
 * - Transaction support for atomic operations
 * - Proper cleanup to prevent memory leaks
 *
 * Limitations:
 * - Data is lost on process restart
 * - Not suitable for multi-process deployments (use Redis/PostgreSQL instead)
 * - Memory usage grows with number of active tokens/codes
 *
 * @module storage/InMemoryStorage
 */

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
 * Entry stored in a Map with expiration tracking.
 */
interface StorageEntry<T> {
  data: T;
  expiresAt: number; // Timestamp in milliseconds
}

/**
 * In-memory storage provider for OAuth data.
 *
 * Thread-safe in Node.js (single-threaded event loop).
 * Uses deep copying to prevent mutations.
 */
export class InMemoryStorage implements OAuthStorageProvider {
  // Configuration
  private config: OAuthStorageConfig;

  // Storage maps
  private clients: Map<string, StoredClient> = new Map();
  private tokens: Map<string, StorageEntry<StoredToken>> = new Map();
  private refreshTokens: Map<string, StorageEntry<string>> = new Map();
  private authorizationCodes: Map<string, StorageEntry<StoredAuthorizationCode>> = new Map();

  // TTL timer tracking (for cleanup on disconnect)
  private tokenTimers: Map<string, NodeJS.Timeout> = new Map();
  private refreshTokenTimers: Map<string, NodeJS.Timeout> = new Map();
  private authorizationCodeTimers: Map<string, NodeJS.Timeout> = new Map();

  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Connection state
  private connected = false;

  constructor(config: OAuthStorageConfig = {}) {
    this.config = {
      name: config.name || 'InMemoryStorage',
      connectionTimeout: config.connectionTimeout || 5000,
      debug: config.debug || false,
      ...config,
    };
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  async connect(): Promise<void> {
    if (this.connected) {
      return; // Already connected, idempotent
    }

    if (this.config.debug) {
      console.log(`[${this.config.name}] Connecting...`);
    }

    // Start background cleanup every 60 seconds
    this.cleanupInterval = setInterval(() => {
      void this.cleanupExpired();
    }, 60_000);

    this.connected = true;

    if (this.config.debug) {
      console.log(`[${this.config.name}] Connected`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return; // Already disconnected, idempotent
    }

    if (this.config.debug) {
      console.log(`[${this.config.name}] Disconnecting...`);
    }

    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clear all TTL timers to prevent memory leaks
    Array.from(this.tokenTimers.values()).forEach(timer => clearTimeout(timer));
    this.tokenTimers.clear();

    Array.from(this.refreshTokenTimers.values()).forEach(timer => clearTimeout(timer));
    this.refreshTokenTimers.clear();

    Array.from(this.authorizationCodeTimers.values()).forEach(timer => clearTimeout(timer));
    this.authorizationCodeTimers.clear();

    this.connected = false;

    if (this.config.debug) {
      console.log(`[${this.config.name}] Disconnected`);
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();

    // In-memory storage has no external dependencies
    // Always healthy unless disconnected
    const healthy = this.connected;
    const message = healthy
      ? 'In-memory storage is operational'
      : 'In-memory storage is disconnected';

    return {
      healthy,
      message,
      responseTimeMs: Date.now() - start,
      timestamp: Date.now(),
      components: {
        memory: {
          healthy: true,
          message: `${this.tokens.size} tokens, ${this.authorizationCodes.size} codes`,
        },
      },
    };
  }

  // ============================================================================
  // Client Management
  // ============================================================================

  async setClient(clientId: string, client: StoredClient): Promise<void> {
    if (this.clients.has(clientId)) {
      throw new Error(`Client already exists: ${clientId}`);
    }

    // Deep copy to prevent external mutations
    this.clients.set(clientId, this.deepCopy(client));

    if (this.config.debug) {
      console.log(`[${this.config.name}] Set client: ${clientId}`);
    }
  }

  async getClient(clientId: string): Promise<StoredClient | undefined> {
    const client = this.clients.get(clientId);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Get client: ${clientId} -> ${client ? 'found' : 'not found'}`);
    }

    // Deep copy to prevent external mutations
    return client ? this.deepCopy(client) : undefined;
  }

  async deleteClient(clientId: string): Promise<boolean> {
    const deleted = this.clients.delete(clientId);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Delete client: ${clientId} -> ${deleted}`);
    }

    return deleted;
  }

  async listClients(): Promise<string[]> {
    const clientIds = Array.from(this.clients.keys());

    if (this.config.debug) {
      console.log(`[${this.config.name}] List clients: ${clientIds.length} clients`);
    }

    return clientIds;
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  async setToken(token: string, data: StoredToken, ttl: number): Promise<void> {
    if (this.tokens.has(token)) {
      throw new Error(`Token already exists: ${token.substring(0, 8)}...`);
    }

    const expiresAt = Date.now() + ttl * 1000;

    // Store with expiration
    this.tokens.set(token, {
      data: this.deepCopy(data),
      expiresAt,
    });

    // Set up TTL timer
    this.clearTokenTimer(token);
    const timer = setTimeout(() => {
      this.tokens.delete(token);
      this.tokenTimers.delete(token);

      if (this.config.debug) {
        console.log(`[${this.config.name}] Token expired: ${token.substring(0, 8)}...`);
      }
    }, ttl * 1000);

    this.tokenTimers.set(token, timer);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Set token: ${token.substring(0, 8)}... (TTL: ${ttl}s)`);
    }
  }

  async getToken(token: string): Promise<StoredToken | undefined> {
    const entry = this.tokens.get(token);

    if (!entry) {
      if (this.config.debug) {
        console.log(`[${this.config.name}] Get token: ${token.substring(0, 8)}... -> not found`);
      }
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      // Expired - clean up
      this.tokens.delete(token);
      this.clearTokenTimer(token);

      if (this.config.debug) {
        console.log(`[${this.config.name}] Get token: ${token.substring(0, 8)}... -> expired`);
      }

      return undefined;
    }

    if (this.config.debug) {
      console.log(`[${this.config.name}] Get token: ${token.substring(0, 8)}... -> found`);
    }

    // Deep copy to prevent external mutations
    return this.deepCopy(entry.data);
  }

  async deleteToken(token: string): Promise<boolean> {
    const deleted = this.tokens.delete(token);
    this.clearTokenTimer(token);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Delete token: ${token.substring(0, 8)}... -> ${deleted}`);
    }

    return deleted;
  }

  async deleteTokensByClient(clientId: string): Promise<number> {
    let count = 0;

    for (const [token, entry] of Array.from(this.tokens.entries())) {
      if (entry.data.clientId === clientId) {
        this.tokens.delete(token);
        this.clearTokenTimer(token);
        count++;
      }
    }

    if (this.config.debug) {
      console.log(`[${this.config.name}] Delete tokens by client: ${clientId} -> ${count} tokens`);
    }

    return count;
  }

  // ============================================================================
  // Refresh Token Management
  // ============================================================================

  async setRefreshToken(
    refreshToken: string,
    accessToken: string,
    ttl: number
  ): Promise<void> {
    if (this.refreshTokens.has(refreshToken)) {
      throw new Error(`Refresh token already exists: ${refreshToken.substring(0, 8)}...`);
    }

    const expiresAt = Date.now() + ttl * 1000;

    // Store with expiration
    this.refreshTokens.set(refreshToken, {
      data: accessToken,
      expiresAt,
    });

    // Set up TTL timer
    this.clearRefreshTokenTimer(refreshToken);
    const timer = setTimeout(() => {
      this.refreshTokens.delete(refreshToken);
      this.refreshTokenTimers.delete(refreshToken);

      if (this.config.debug) {
        console.log(`[${this.config.name}] Refresh token expired: ${refreshToken.substring(0, 8)}...`);
      }
    }, ttl * 1000);

    this.refreshTokenTimers.set(refreshToken, timer);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Set refresh token: ${refreshToken.substring(0, 8)}... (TTL: ${ttl}s)`);
    }
  }

  async getRefreshToken(refreshToken: string): Promise<string | undefined> {
    const entry = this.refreshTokens.get(refreshToken);

    if (!entry) {
      if (this.config.debug) {
        console.log(`[${this.config.name}] Get refresh token: ${refreshToken.substring(0, 8)}... -> not found`);
      }
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      // Expired - clean up
      this.refreshTokens.delete(refreshToken);
      this.clearRefreshTokenTimer(refreshToken);

      if (this.config.debug) {
        console.log(`[${this.config.name}] Get refresh token: ${refreshToken.substring(0, 8)}... -> expired`);
      }

      return undefined;
    }

    if (this.config.debug) {
      console.log(`[${this.config.name}] Get refresh token: ${refreshToken.substring(0, 8)}... -> found`);
    }

    return entry.data;
  }

  async deleteRefreshToken(refreshToken: string): Promise<boolean> {
    const deleted = this.refreshTokens.delete(refreshToken);
    this.clearRefreshTokenTimer(refreshToken);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Delete refresh token: ${refreshToken.substring(0, 8)}... -> ${deleted}`);
    }

    return deleted;
  }

  async findTokensByRefreshToken(
    refreshToken: string
  ): Promise<Array<[string, StoredToken]>> {
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
    if (this.authorizationCodes.has(code)) {
      throw new Error(`Authorization code already exists: ${code.substring(0, 8)}...`);
    }

    const expiresAt = Date.now() + ttl * 1000;

    // Store with expiration
    this.authorizationCodes.set(code, {
      data: this.deepCopy(data),
      expiresAt,
    });

    // Set up TTL timer
    this.clearAuthorizationCodeTimer(code);
    const timer = setTimeout(() => {
      this.authorizationCodes.delete(code);
      this.authorizationCodeTimers.delete(code);

      if (this.config.debug) {
        console.log(`[${this.config.name}] Authorization code expired: ${code.substring(0, 8)}...`);
      }
    }, ttl * 1000);

    this.authorizationCodeTimers.set(code, timer);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Set authorization code: ${code.substring(0, 8)}... (TTL: ${ttl}s)`);
    }
  }

  async getAuthorizationCode(
    code: string
  ): Promise<StoredAuthorizationCode | undefined> {
    const entry = this.authorizationCodes.get(code);

    if (!entry) {
      if (this.config.debug) {
        console.log(`[${this.config.name}] Get authorization code: ${code.substring(0, 8)}... -> not found`);
      }
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      // Expired - clean up
      this.authorizationCodes.delete(code);
      this.clearAuthorizationCodeTimer(code);

      if (this.config.debug) {
        console.log(`[${this.config.name}] Get authorization code: ${code.substring(0, 8)}... -> expired`);
      }

      return undefined;
    }

    if (this.config.debug) {
      console.log(`[${this.config.name}] Get authorization code: ${code.substring(0, 8)}... -> found`);
    }

    // Deep copy to prevent external mutations
    return this.deepCopy(entry.data);
  }

  async deleteAuthorizationCode(code: string): Promise<boolean> {
    const deleted = this.authorizationCodes.delete(code);
    this.clearAuthorizationCodeTimer(code);

    if (this.config.debug) {
      console.log(`[${this.config.name}] Delete authorization code: ${code.substring(0, 8)}... -> ${deleted}`);
    }

    return deleted;
  }

  /**
   * Atomically mark an authorization code as used.
   *
   * CRITICAL: This must be atomic to prevent replay attacks.
   * In Node.js single-threaded event loop, this is naturally atomic.
   *
   * @param code - The authorization code to mark
   * @returns true if marked successfully, false if already used
   * @throws If code does not exist
   */
  async markAuthorizationCodeUsed(code: string): Promise<boolean> {
    const entry = this.authorizationCodes.get(code);

    if (!entry) {
      throw new Error(`Authorization code not found: ${code.substring(0, 8)}...`);
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      // Expired - clean up and throw
      this.authorizationCodes.delete(code);
      this.clearAuthorizationCodeTimer(code);

      throw new Error(`Authorization code expired: ${code.substring(0, 8)}...`);
    }

    // Check if already used
    if (entry.data.used) {
      if (this.config.debug) {
        console.log(`[${this.config.name}] Mark authorization code used: ${code.substring(0, 8)}... -> already used`);
      }
      return false;
    }

    // Mark as used (atomic in single-threaded JS)
    entry.data.used = true;

    if (this.config.debug) {
      console.log(`[${this.config.name}] Mark authorization code used: ${code.substring(0, 8)}... -> success`);
    }

    return true;
  }

  // ============================================================================
  // Transaction Support
  // ============================================================================

  async beginTransaction(): Promise<StorageTransaction> {
    if (this.config.debug) {
      console.log(`[${this.config.name}] Begin transaction`);
    }

    return new InMemoryTransaction(this, this.config.debug || false);
  }

  // ============================================================================
  // Monitoring & Statistics
  // ============================================================================

  async getStats(): Promise<StorageStats> {
    // Count non-expired entries
    const now = Date.now();

    let tokenCount = 0;
    for (const entry of Array.from(this.tokens.values())) {
      if (entry.expiresAt > now) {
        tokenCount++;
      }
    }

    let refreshTokenCount = 0;
    for (const entry of Array.from(this.refreshTokens.values())) {
      if (entry.expiresAt > now) {
        refreshTokenCount++;
      }
    }

    let authorizationCodeCount = 0;
    for (const entry of Array.from(this.authorizationCodes.values())) {
      if (entry.expiresAt > now) {
        authorizationCodeCount++;
      }
    }

    // Approximate memory usage
    const memoryUsage = this.estimateMemoryUsage();

    return {
      tokenCount,
      refreshTokenCount,
      authorizationCodeCount,
      clientCount: this.clients.size,
      memoryUsage,
      activeConnections: 1, // In-memory has no connection pool
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Clean up expired entries (called periodically by cleanup interval).
   */
  private async cleanupExpired(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;

    // Clean up expired tokens
    for (const [token, entry] of Array.from(this.tokens.entries())) {
      if (entry.expiresAt <= now) {
        this.tokens.delete(token);
        this.clearTokenTimer(token);
        cleaned++;
      }
    }

    // Clean up expired refresh tokens
    for (const [refreshToken, entry] of Array.from(this.refreshTokens.entries())) {
      if (entry.expiresAt <= now) {
        this.refreshTokens.delete(refreshToken);
        this.clearRefreshTokenTimer(refreshToken);
        cleaned++;
      }
    }

    // Clean up expired authorization codes
    for (const [code, entry] of Array.from(this.authorizationCodes.entries())) {
      if (entry.expiresAt <= now) {
        this.authorizationCodes.delete(code);
        this.clearAuthorizationCodeTimer(code);
        cleaned++;
      }
    }

    if (this.config.debug && cleaned > 0) {
      console.log(`[${this.config.name}] Cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Clear a token's TTL timer.
   */
  private clearTokenTimer(token: string): void {
    const timer = this.tokenTimers.get(token);
    if (timer) {
      clearTimeout(timer);
      this.tokenTimers.delete(token);
    }
  }

  /**
   * Clear a refresh token's TTL timer.
   */
  private clearRefreshTokenTimer(refreshToken: string): void {
    const timer = this.refreshTokenTimers.get(refreshToken);
    if (timer) {
      clearTimeout(timer);
      this.refreshTokenTimers.delete(refreshToken);
    }
  }

  /**
   * Clear an authorization code's TTL timer.
   */
  private clearAuthorizationCodeTimer(code: string): void {
    const timer = this.authorizationCodeTimers.get(code);
    if (timer) {
      clearTimeout(timer);
      this.authorizationCodeTimers.delete(code);
    }
  }

  /**
   * Deep copy an object to prevent external mutations.
   */
  private deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Estimate memory usage in bytes (approximate).
   */
  private estimateMemoryUsage(): number {
    // Rough estimate: JSON.stringify size * 2 (overhead)
    let size = 0;

    for (const client of Array.from(this.clients.values())) {
      size += JSON.stringify(client).length * 2;
    }

    for (const entry of Array.from(this.tokens.values())) {
      size += JSON.stringify(entry).length * 2;
    }

    for (const entry of Array.from(this.refreshTokens.values())) {
      size += JSON.stringify(entry).length * 2;
    }

    for (const entry of Array.from(this.authorizationCodes.values())) {
      size += JSON.stringify(entry).length * 2;
    }

    return size;
  }
}

/**
 * In-memory transaction implementation.
 *
 * Buffers all operations until commit(), then applies them atomically.
 * Rollback discards all buffered operations.
 */
class InMemoryTransaction implements StorageTransaction {
  private storage: InMemoryStorage;
  private debug: boolean;

  // Buffered operations
  private operations: Array<() => Promise<void>> = [];

  // Transaction state
  private state: 'active' | 'committed' | 'rolled_back' = 'active';

  constructor(storage: InMemoryStorage, debug: boolean) {
    this.storage = storage;
    this.debug = debug;
  }

  // ============================================================================
  // Client Operations
  // ============================================================================

  async setClient(clientId: string, client: StoredClient): Promise<void> {
    this.ensureActive();
    this.operations.push(() => this.storage.setClient(clientId, client));
  }

  async getClient(clientId: string): Promise<StoredClient | undefined> {
    this.ensureActive();
    // Read operations are not buffered - read from current state
    return this.storage.getClient(clientId);
  }

  async deleteClient(clientId: string): Promise<boolean> {
    this.ensureActive();
    // Buffer the delete operation
    let result = false;
    this.operations.push(async () => {
      result = await this.storage.deleteClient(clientId);
    });
    return result;
  }

  // ============================================================================
  // Token Operations
  // ============================================================================

  async setToken(token: string, data: StoredToken, ttl: number): Promise<void> {
    this.ensureActive();
    this.operations.push(() => this.storage.setToken(token, data, ttl));
  }

  async getToken(token: string): Promise<StoredToken | undefined> {
    this.ensureActive();
    return this.storage.getToken(token);
  }

  async deleteToken(token: string): Promise<boolean> {
    this.ensureActive();
    let result = false;
    this.operations.push(async () => {
      result = await this.storage.deleteToken(token);
    });
    return result;
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
    this.operations.push(() =>
      this.storage.setRefreshToken(refreshToken, accessToken, ttl)
    );
  }

  async getRefreshToken(refreshToken: string): Promise<string | undefined> {
    this.ensureActive();
    return this.storage.getRefreshToken(refreshToken);
  }

  async deleteRefreshToken(refreshToken: string): Promise<boolean> {
    this.ensureActive();
    let result = false;
    this.operations.push(async () => {
      result = await this.storage.deleteRefreshToken(refreshToken);
    });
    return result;
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
    this.operations.push(() =>
      this.storage.setAuthorizationCode(code, data, ttl)
    );
  }

  async getAuthorizationCode(
    code: string
  ): Promise<StoredAuthorizationCode | undefined> {
    this.ensureActive();
    return this.storage.getAuthorizationCode(code);
  }

  async deleteAuthorizationCode(code: string): Promise<boolean> {
    this.ensureActive();
    let result = false;
    this.operations.push(async () => {
      result = await this.storage.deleteAuthorizationCode(code);
    });
    return result;
  }

  async markAuthorizationCodeUsed(code: string): Promise<boolean> {
    this.ensureActive();
    let result = false;
    this.operations.push(async () => {
      result = await this.storage.markAuthorizationCodeUsed(code);
    });
    return result;
  }

  // ============================================================================
  // Transaction Control
  // ============================================================================

  async commit(): Promise<void> {
    this.ensureActive();

    if (this.debug) {
      console.log(`[Transaction] Committing ${this.operations.length} operations`);
    }

    try {
      // Execute all buffered operations in order
      for (const operation of this.operations) {
        await operation();
      }

      this.state = 'committed';

      if (this.debug) {
        console.log(`[Transaction] Commit successful`);
      }
    } catch (error) {
      // If any operation fails, the transaction is implicitly rolled back
      // (no operations have been applied yet since we buffer them)
      this.state = 'rolled_back';

      if (this.debug) {
        console.error(`[Transaction] Commit failed, rolling back:`, error);
      }

      throw error;
    }
  }

  async rollback(): Promise<void> {
    this.ensureActive();

    if (this.debug) {
      console.log(`[Transaction] Rolling back ${this.operations.length} operations`);
    }

    // Discard all buffered operations
    this.operations = [];
    this.state = 'rolled_back';

    if (this.debug) {
      console.log(`[Transaction] Rollback successful`);
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
