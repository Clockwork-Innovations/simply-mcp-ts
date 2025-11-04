/**
 * Storage abstraction layer for OAuth data persistence.
 *
 * This module provides interfaces for implementing OAuth storage backends
 * (e.g., Redis, PostgreSQL) with support for atomic operations and transactions
 * to prevent race conditions during token exchange and refresh operations.
 *
 * @module storage/types
 */

import type {
  StoredClient,
  StoredToken,
  StoredAuthorizationCode,
} from '../types.js';

/**
 * Configuration options for OAuth storage providers.
 *
 * Implementations may extend this interface with provider-specific options
 * (e.g., Redis connection string, PostgreSQL pool config).
 */
export interface OAuthStorageConfig {
  /**
   * Human-readable name for this storage instance (for logging/debugging)
   */
  name?: string;

  /**
   * Connection timeout in milliseconds
   * @default 5000
   */
  connectionTimeout?: number;

  /**
   * Enable detailed logging of storage operations
   * @default false
   */
  debug?: boolean;

  /**
   * Provider-specific configuration options
   */
  [key: string]: unknown;
}

/**
 * Statistics about storage usage and performance.
 * Used for monitoring and capacity planning.
 */
export interface StorageStats {
  /**
   * Total number of active access tokens
   */
  tokenCount: number;

  /**
   * Total number of refresh tokens
   */
  refreshTokenCount: number;

  /**
   * Total number of authorization codes (including used/expired)
   */
  authorizationCodeCount: number;

  /**
   * Total number of registered clients
   */
  clientCount: number;

  /**
   * Memory usage in bytes (if applicable to the storage backend)
   */
  memoryUsage?: number;

  /**
   * Number of active database connections (if applicable)
   */
  activeConnections?: number;

  /**
   * Provider-specific statistics
   */
  [key: string]: unknown;
}

/**
 * Result of a storage health check operation.
 * Provides detailed information about storage system health.
 */
export interface HealthCheckResult {
  /**
   * Overall health status
   */
  healthy: boolean;

  /**
   * Human-readable status message
   */
  message: string;

  /**
   * Response time for the health check in milliseconds
   */
  responseTimeMs: number;

  /**
   * Timestamp when the check was performed
   */
  timestamp: number;

  /**
   * Detailed component health (e.g., database, cache, etc.)
   */
  components?: Record<string, {
    healthy: boolean;
    message?: string;
  }>;

  /**
   * Any errors encountered during the check
   */
  errors?: string[];
}

/**
 * Transaction context for atomic multi-step operations.
 *
 * Transactions ensure that token rotation (delete old + create new)
 * happens atomically - either both operations succeed or both fail.
 *
 * Usage:
 * ```typescript
 * const txn = await storage.beginTransaction();
 * try {
 *   await txn.deleteToken(oldToken);
 *   await txn.setToken(newToken, tokenData, ttl);
 *   await txn.commit();
 * } catch (error) {
 *   await txn.rollback();
 *   throw error;
 * }
 * ```
 */
export interface StorageTransaction {
  /**
   * Store a client configuration.
   *
   * @param clientId - Unique client identifier
   * @param client - Client configuration with hashed secret
   * @throws If client already exists or storage error occurs
   */
  setClient(clientId: string, client: StoredClient): Promise<void>;

  /**
   * Retrieve a client configuration.
   *
   * @param clientId - Client identifier to look up
   * @returns Client configuration, or undefined if not found
   */
  getClient(clientId: string): Promise<StoredClient | undefined>;

  /**
   * Delete a client configuration.
   *
   * NOTE: Within transactions, this method always returns false immediately.
   * The actual deletion result is only available after commit() completes.
   * Check commit() success to verify the deletion occurred.
   *
   * @param clientId - Client identifier to delete
   * @returns true if client was deleted, false if not found (always false in transactions)
   */
  deleteClient(clientId: string): Promise<boolean>;

  /**
   * Store an access token with automatic expiration.
   *
   * @param token - The access token string
   * @param data - Token metadata (client, scopes, etc.)
   * @param ttl - Time-to-live in seconds
   * @throws If token already exists or storage error occurs
   */
  setToken(token: string, data: StoredToken, ttl: number): Promise<void>;

  /**
   * Retrieve token metadata.
   *
   * @param token - The access token to look up
   * @returns Token metadata, or undefined if not found/expired
   */
  getToken(token: string): Promise<StoredToken | undefined>;

  /**
   * Delete an access token.
   *
   * NOTE: Within transactions, this method always returns false immediately.
   * The actual deletion result is only available after commit() completes.
   * Check commit() success to verify the deletion occurred.
   *
   * @param token - The access token to delete
   * @returns true if token was deleted, false if not found (always false in transactions)
   */
  deleteToken(token: string): Promise<boolean>;

  /**
   * Store a refresh token mapping.
   *
   * @param refreshToken - The refresh token string
   * @param accessToken - The associated access token
   * @param ttl - Time-to-live in seconds
   * @throws If refresh token already exists or storage error occurs
   */
  setRefreshToken(
    refreshToken: string,
    accessToken: string,
    ttl: number
  ): Promise<void>;

  /**
   * Retrieve the access token associated with a refresh token.
   *
   * @param refreshToken - The refresh token to look up
   * @returns Associated access token, or undefined if not found/expired
   */
  getRefreshToken(refreshToken: string): Promise<string | undefined>;

  /**
   * Delete a refresh token.
   *
   * NOTE: Within transactions, this method always returns false immediately.
   * The actual deletion result is only available after commit() completes.
   * Check commit() success to verify the deletion occurred.
   *
   * @param refreshToken - The refresh token to delete
   * @returns true if refresh token was deleted, false if not found (always false in transactions)
   */
  deleteRefreshToken(refreshToken: string): Promise<boolean>;

  /**
   * Store an authorization code with automatic expiration.
   *
   * @param code - The authorization code string
   * @param data - Code metadata (client, scopes, PKCE challenge, etc.)
   * @param ttl - Time-to-live in seconds
   * @throws If code already exists or storage error occurs
   */
  setAuthorizationCode(
    code: string,
    data: StoredAuthorizationCode,
    ttl: number
  ): Promise<void>;

  /**
   * Retrieve authorization code metadata.
   *
   * @param code - The authorization code to look up
   * @returns Code metadata, or undefined if not found/expired
   */
  getAuthorizationCode(
    code: string
  ): Promise<StoredAuthorizationCode | undefined>;

  /**
   * Delete an authorization code.
   *
   * NOTE: Within transactions, this method always returns false immediately.
   * The actual deletion result is only available after commit() completes.
   * Check commit() success to verify the deletion occurred.
   *
   * @param code - The authorization code to delete
   * @returns true if code was deleted, false if not found (always false in transactions)
   */
  deleteAuthorizationCode(code: string): Promise<boolean>;

  /**
   * Atomically mark an authorization code as used.
   *
   * This operation MUST be atomic to prevent race conditions where
   * the same code is exchanged multiple times in parallel requests.
   *
   * Implementation notes:
   * - Redis: Use WATCH/MULTI/EXEC or Lua script
   * - PostgreSQL: Use SELECT FOR UPDATE or UPDATE with WHERE used=false
   *
   * NOTE: Within transactions, this method always returns false immediately.
   * The actual result is only available after commit() completes.
   *
   * @param code - The authorization code to mark as used
   * @returns true if code was marked as used, false if already used (always false in transactions)
   * @throws If code does not exist or storage error occurs
   */
  markAuthorizationCodeUsed(code: string): Promise<boolean>;

  /**
   * Commit this transaction, making all changes permanent.
   * After commit, the transaction cannot be used for further operations.
   *
   * @throws If commit fails or transaction was already committed/rolled back
   */
  commit(): Promise<void>;

  /**
   * Rollback this transaction, discarding all changes.
   * After rollback, the transaction cannot be used for further operations.
   *
   * @throws If rollback fails or transaction was already committed/rolled back
   */
  rollback(): Promise<void>;
}

/**
 * OAuth storage provider interface.
 *
 * Implementations must handle:
 * - Automatic expiration of tokens and codes (via TTL)
 * - Atomic operations for race condition prevention
 * - Transaction support for multi-step operations
 * - Efficient queries for cleanup and monitoring
 *
 * Thread safety:
 * - All methods must be thread-safe
 * - Atomic operations (markAuthorizationCodeUsed) must use database primitives
 * - Transactions must provide isolation (read committed or higher)
 */
export interface OAuthStorageProvider {
  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /**
   * Connect to the storage backend.
   *
   * This method should:
   * - Establish connection(s) to the storage system
   * - Verify connectivity and authentication
   * - Initialize any required schema/indexes
   * - Perform migration if needed
   *
   * @throws If connection fails or configuration is invalid
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the storage backend.
   *
   * This method should:
   * - Close all active connections gracefully
   * - Flush any pending writes
   * - Release resources
   *
   * Safe to call multiple times (idempotent).
   */
  disconnect(): Promise<void>;

  /**
   * Check if the storage backend is healthy and responsive.
   *
   * This method should:
   * - Perform a simple read/write test
   * - Check connection pool health
   * - Verify adequate resources (memory, disk space)
   *
   * @returns Detailed health check results
   */
  healthCheck(): Promise<HealthCheckResult>;

  // ============================================================================
  // Client Management
  // ============================================================================

  /**
   * Store a client configuration.
   *
   * @param clientId - Unique client identifier
   * @param client - Client configuration with hashed secret
   * @throws If client already exists or storage error occurs
   */
  setClient(clientId: string, client: StoredClient): Promise<void>;

  /**
   * Retrieve a client configuration.
   *
   * @param clientId - Client identifier to look up
   * @returns Client configuration, or undefined if not found
   */
  getClient(clientId: string): Promise<StoredClient | undefined>;

  /**
   * Delete a client configuration.
   *
   * @param clientId - Client identifier to delete
   * @returns true if client was deleted, false if not found
   */
  deleteClient(clientId: string): Promise<boolean>;

  /**
   * List all registered client IDs.
   *
   * @returns Array of client IDs
   */
  listClients(): Promise<string[]>;

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Store an access token with automatic expiration.
   *
   * @param token - The access token string
   * @param data - Token metadata (client, scopes, etc.)
   * @param ttl - Time-to-live in seconds
   * @throws If token already exists or storage error occurs
   */
  setToken(token: string, data: StoredToken, ttl: number): Promise<void>;

  /**
   * Retrieve token metadata.
   *
   * @param token - The access token to look up
   * @returns Token metadata, or undefined if not found/expired
   */
  getToken(token: string): Promise<StoredToken | undefined>;

  /**
   * Delete an access token.
   *
   * @param token - The access token to delete
   * @returns true if token was deleted, false if not found
   */
  deleteToken(token: string): Promise<boolean>;

  /**
   * Delete all tokens belonging to a specific client.
   *
   * Use case: Client revocation or cleanup
   *
   * @param clientId - Client identifier
   * @returns Number of tokens deleted
   */
  deleteTokensByClient(clientId: string): Promise<number>;

  // ============================================================================
  // Refresh Token Management
  // ============================================================================

  /**
   * Store a refresh token mapping.
   *
   * @param refreshToken - The refresh token string
   * @param accessToken - The associated access token
   * @param ttl - Time-to-live in seconds
   * @throws If refresh token already exists or storage error occurs
   */
  setRefreshToken(
    refreshToken: string,
    accessToken: string,
    ttl: number
  ): Promise<void>;

  /**
   * Retrieve the access token associated with a refresh token.
   *
   * @param refreshToken - The refresh token to look up
   * @returns Associated access token, or undefined if not found/expired
   */
  getRefreshToken(refreshToken: string): Promise<string | undefined>;

  /**
   * Delete a refresh token.
   *
   * @param refreshToken - The refresh token to delete
   * @returns true if refresh token was deleted, false if not found
   */
  deleteRefreshToken(refreshToken: string): Promise<boolean>;

  /**
   * Find all access tokens associated with a refresh token.
   *
   * Use case: Token rotation - find the access token to delete when rotating
   *
   * Note: This is inefficient in some storage backends. Consider storing
   * a direct refresh_token -> access_token mapping instead.
   *
   * @param refreshToken - The refresh token to search for
   * @returns Array of [accessToken, tokenData] pairs
   */
  findTokensByRefreshToken(
    refreshToken: string
  ): Promise<Array<[string, StoredToken]>>;

  // ============================================================================
  // Authorization Code Management
  // ============================================================================

  /**
   * Store an authorization code with automatic expiration.
   *
   * @param code - The authorization code string
   * @param data - Code metadata (client, scopes, PKCE challenge, etc.)
   * @param ttl - Time-to-live in seconds
   * @throws If code already exists or storage error occurs
   */
  setAuthorizationCode(
    code: string,
    data: StoredAuthorizationCode,
    ttl: number
  ): Promise<void>;

  /**
   * Retrieve authorization code metadata.
   *
   * @param code - The authorization code to look up
   * @returns Code metadata, or undefined if not found/expired
   */
  getAuthorizationCode(
    code: string
  ): Promise<StoredAuthorizationCode | undefined>;

  /**
   * Delete an authorization code.
   *
   * @param code - The authorization code to delete
   * @returns true if code was deleted, false if not found
   */
  deleteAuthorizationCode(code: string): Promise<boolean>;

  /**
   * Atomically mark an authorization code as used.
   *
   * This operation MUST be atomic to prevent race conditions where
   * the same code is exchanged multiple times in parallel requests.
   *
   * Implementation notes:
   * - Redis: Use WATCH/MULTI/EXEC or Lua script
   * - PostgreSQL: Use SELECT FOR UPDATE or UPDATE with WHERE used=false
   *
   * @param code - The authorization code to mark as used
   * @returns true if code was marked as used, false if already used
   * @throws If code does not exist or storage error occurs
   */
  markAuthorizationCodeUsed(code: string): Promise<boolean>;

  // ============================================================================
  // Transaction Support
  // ============================================================================

  /**
   * Begin a new transaction for atomic multi-step operations.
   *
   * Use case: Token rotation
   * ```typescript
   * const txn = await storage.beginTransaction();
   * try {
   *   // Delete old access token
   *   await txn.deleteToken(oldAccessToken);
   *
   *   // Delete old refresh token
   *   await txn.deleteRefreshToken(oldRefreshToken);
   *
   *   // Create new access token
   *   await txn.setToken(newAccessToken, tokenData, ttl);
   *
   *   // Create new refresh token
   *   await txn.setRefreshToken(newRefreshToken, newAccessToken, refreshTtl);
   *
   *   // Commit all changes atomically
   *   await txn.commit();
   * } catch (error) {
   *   await txn.rollback();
   *   throw error;
   * }
   * ```
   *
   * @returns A new transaction context
   * @throws If transaction creation fails
   */
  beginTransaction(): Promise<StorageTransaction>;

  // ============================================================================
  // Monitoring & Statistics
  // ============================================================================

  /**
   * Get storage statistics and usage metrics.
   *
   * Use case: Monitoring, capacity planning, debugging
   *
   * @returns Current storage statistics
   */
  getStats(): Promise<StorageStats>;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an object implements the OAuthStorageProvider interface.
 *
 * Note: This performs a shallow check of method existence, not runtime behavior.
 *
 * @param obj - Object to check
 * @returns true if object appears to implement OAuthStorageProvider
 */
export function isOAuthStorageProvider(obj: unknown): obj is OAuthStorageProvider {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const provider = obj as Partial<OAuthStorageProvider>;

  // Check for required lifecycle methods
  if (typeof provider.connect !== 'function') return false;
  if (typeof provider.disconnect !== 'function') return false;
  if (typeof provider.healthCheck !== 'function') return false;

  // Check for required client methods
  if (typeof provider.setClient !== 'function') return false;
  if (typeof provider.getClient !== 'function') return false;
  if (typeof provider.deleteClient !== 'function') return false;
  if (typeof provider.listClients !== 'function') return false;

  // Check for required token methods
  if (typeof provider.setToken !== 'function') return false;
  if (typeof provider.getToken !== 'function') return false;
  if (typeof provider.deleteToken !== 'function') return false;
  if (typeof provider.deleteTokensByClient !== 'function') return false;

  // Check for required refresh token methods
  if (typeof provider.setRefreshToken !== 'function') return false;
  if (typeof provider.getRefreshToken !== 'function') return false;
  if (typeof provider.deleteRefreshToken !== 'function') return false;
  if (typeof provider.findTokensByRefreshToken !== 'function') return false;

  // Check for required authorization code methods
  if (typeof provider.setAuthorizationCode !== 'function') return false;
  if (typeof provider.getAuthorizationCode !== 'function') return false;
  if (typeof provider.deleteAuthorizationCode !== 'function') return false;
  if (typeof provider.markAuthorizationCodeUsed !== 'function') return false;

  // Check for transaction support
  if (typeof provider.beginTransaction !== 'function') return false;

  // Check for monitoring methods
  if (typeof provider.getStats !== 'function') return false;

  return true;
}

/**
 * Type guard to check if an object implements the StorageTransaction interface.
 *
 * @param obj - Object to check
 * @returns true if object appears to implement StorageTransaction
 */
export function isStorageTransaction(obj: unknown): obj is StorageTransaction {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const txn = obj as Partial<StorageTransaction>;

  // Check for transaction control methods
  if (typeof txn.commit !== 'function') return false;
  if (typeof txn.rollback !== 'function') return false;

  // Check for data methods (same as provider, minus lifecycle/monitoring)
  if (typeof txn.setClient !== 'function') return false;
  if (typeof txn.getClient !== 'function') return false;
  if (typeof txn.deleteClient !== 'function') return false;

  if (typeof txn.setToken !== 'function') return false;
  if (typeof txn.getToken !== 'function') return false;
  if (typeof txn.deleteToken !== 'function') return false;

  if (typeof txn.setRefreshToken !== 'function') return false;
  if (typeof txn.getRefreshToken !== 'function') return false;
  if (typeof txn.deleteRefreshToken !== 'function') return false;

  if (typeof txn.setAuthorizationCode !== 'function') return false;
  if (typeof txn.getAuthorizationCode !== 'function') return false;
  if (typeof txn.deleteAuthorizationCode !== 'function') return false;
  if (typeof txn.markAuthorizationCodeUsed !== 'function') return false;

  return true;
}
