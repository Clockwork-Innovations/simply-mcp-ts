/**
 * OAuth 2.1 Utilities (Built on MCP SDK)
 *
 * Storage adapters and helpers for OAuth. The provider implementation is internal
 * (used only by Interface API). For programmatic OAuth, use external providers or
 * see examples/reference-oauth-provider.ts.
 *
 * @see https://github.com/modelcontextprotocol/typescript-sdk/tree/main/src/server/auth
 */

// Internal provider (not exported - Interface API only)
export { SimplyMCPOAuthProvider, createOAuthProvider } from './SimplyMCPOAuthProvider.js';

// Storage adapters for token/client persistence
export { InMemoryStorage } from './storage/InMemoryStorage.js';
export { RedisStorage } from './storage/RedisStorage.js';
export type { RedisStorageConfig } from './storage/RedisStorage.js';
export type { OAuthStorageProvider, OAuthStorageConfig, StorageStats, HealthCheckResult } from './storage/types.js';

// Router and middleware helpers (thin wrappers around SDK)
export { createOAuthRouter, createOAuthMiddleware } from './router.js';
export type { OAuthRouterConfig } from './router.js';

// Types (compatible with MCP SDK)
export type { OAuthProviderConfig, StoredToken, StoredAuthorizationCode, StoredClient } from './types.js';
