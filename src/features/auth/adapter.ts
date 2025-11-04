/**
 * Authentication Adapter
 *
 * Converts IAuth interface configurations to SecurityConfig format
 * used by the security system.
 *
 * This adapter bridges the interface-driven API with the programmatic
 * security system, providing a clean separation of concerns between
 * type definitions and runtime security enforcement.
 */

import type { ParsedAuth } from '../../server/parser.js';
import type { SecurityConfig, ApiKeyConfig } from './security/types.js';
import { SimplyMCPOAuthProvider, type OAuthProviderConfig } from './oauth/index.js';

/**
 * Convert ParsedAuth to SecurityConfig
 *
 * Takes authentication configuration extracted from interface definitions
 * and converts it to the SecurityConfig format used by the runtime security system.
 *
 * @param parsedAuth - Authentication configuration from interface parsing (undefined if no auth)
 * @returns SecurityConfig with sensible defaults, or undefined if no auth configured
 *
 * @example Basic API Key Auth
 * ```typescript
 * const parsedAuth: ParsedAuth = {
 *   type: 'apiKey',
 *   interfaceName: 'MyAuth',
 *   keys: [
 *     { name: 'admin', key: 'sk-admin-123', permissions: ['*'] }
 *   ]
 * };
 *
 * const securityConfig = authConfigFromParsed(parsedAuth);
 * // Returns full SecurityConfig with auth, rate limiting, and audit settings
 * ```
 *
 * @example No Auth
 * ```typescript
 * const securityConfig = authConfigFromParsed(undefined);
 * // Returns undefined - no security configuration
 * ```
 */
export function authConfigFromParsed(parsedAuth: ParsedAuth | undefined): SecurityConfig | undefined {
  if (!parsedAuth) return undefined;

  switch (parsedAuth.type) {
    case 'apiKey':
      return createApiKeySecurityConfig(parsedAuth);
    case 'oauth2':
      return createOAuth2SecurityConfig(parsedAuth);
    case 'database':
    case 'custom':
      throw new Error(`Auth type '${parsedAuth.type}' not yet implemented.`);
    default:
      throw new Error(`Unknown auth type: ${(parsedAuth as any).type}`);
  }
}

/**
 * Create SecurityConfig for API key authentication
 *
 * Converts IApiKeyAuth configuration to the full SecurityConfig format with:
 * - Authentication settings (API keys, header name, anonymous access)
 * - Permission defaults (full access for authenticated, limited for anonymous)
 * - Rate limiting (sliding window, 100 req/min default)
 * - Audit logging (file-based with console option)
 *
 * @param auth - Parsed API key authentication configuration
 * @returns Complete SecurityConfig with sensible defaults
 *
 * @internal
 */
function createApiKeySecurityConfig(auth: ParsedAuth): SecurityConfig {
  // Convert IApiKeyConfig format to ApiKeyConfig format
  const apiKeys: ApiKeyConfig[] = (auth.keys || []).map(key => ({
    key: key.key,
    name: key.name,
    permissions: key.permissions,
    enabled: true, // Default to enabled
  }));

  return {
    enabled: true,
    authentication: {
      enabled: true,
      type: 'apiKey',
      apiKeys,
      headerName: auth.headerName || 'x-api-key',
      allowAnonymous: auth.allowAnonymous ?? false,
    },
    permissions: {
      authenticated: ['*'], // Default: full access when authenticated
      anonymous: auth.allowAnonymous ? ['read:*'] : [],
    },
    rateLimit: {
      enabled: true,
      strategy: 'sliding-window',
      window: 60000, // 1 minute
      maxRequests: 100,
    },
    audit: {
      enabled: true,
      logFile: './logs/audit.log',
      logToConsole: false,
    },
  };
}

/**
 * Create SecurityConfig for OAuth 2.1 authentication
 *
 * Converts IOAuth2Auth configuration to the full SecurityConfig format with:
 * - OAuth provider instance (handles authorization flow, token management)
 * - Issuer URL (used in OAuth metadata and token claims)
 * - Permission defaults (full access for authenticated users)
 * - Rate limiting (sliding window, 100 req/min default)
 * - Audit logging (file-based with console option)
 *
 * @param auth - Parsed OAuth 2.1 authentication configuration
 * @returns Complete SecurityConfig with OAuth provider
 *
 * @internal
 */
function createOAuth2SecurityConfig(auth: ParsedAuth): SecurityConfig {
  if (auth.type !== 'oauth2') {
    throw new Error('createOAuth2SecurityConfig called with non-oauth2 auth type');
  }

  if (!auth.issuerUrl) {
    throw new Error('OAuth2 auth requires issuerUrl');
  }

  if (!auth.clients || auth.clients.length === 0) {
    throw new Error('OAuth2 auth requires at least one client');
  }

  // Convert ParsedAuth clients to OAuthProviderConfig format
  const providerConfig: OAuthProviderConfig = {
    clients: auth.clients.map(client => ({
      clientId: client.clientId,
      clientSecret: client.clientSecret,
      redirectUris: client.redirectUris,
      scopes: client.scopes,
    })),
    tokenExpiration: auth.tokenExpiration,
    refreshTokenExpiration: auth.refreshTokenExpiration,
    codeExpiration: auth.codeExpiration,
  };

  // Create OAuth provider instance
  const provider = new SimplyMCPOAuthProvider(providerConfig);

  return {
    enabled: true,
    authentication: {
      enabled: true,
      type: 'oauth2',
      issuerUrl: auth.issuerUrl,
      oauthProvider: provider,
    },
    permissions: {
      authenticated: ['*'], // Default: full access when authenticated
      anonymous: [], // OAuth doesn't support anonymous access
    },
    rateLimit: {
      enabled: true,
      strategy: 'sliding-window',
      window: 60000, // 1 minute
      maxRequests: 100,
    },
    audit: {
      enabled: true,
      logFile: './logs/oauth-audit.log',
      logToConsole: false,
    },
  };
}
