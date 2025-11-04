/**
 * OAuth Storage Abstraction Layer
 *
 * This module provides storage interfaces and implementations for OAuth data persistence.
 *
 * @module storage
 */

export type {
  OAuthStorageConfig,
  OAuthStorageProvider,
  StorageTransaction,
  StorageStats,
  HealthCheckResult,
} from './types.js';

export {
  isOAuthStorageProvider,
  isStorageTransaction,
} from './types.js';

export { InMemoryStorage } from './InMemoryStorage.js';
export { RedisStorage } from './RedisStorage.js';
export type { RedisStorageConfig } from './RedisStorage.js';
