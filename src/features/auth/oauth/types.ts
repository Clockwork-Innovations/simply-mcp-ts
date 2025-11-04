import type { OAuthStorageProvider } from './storage/types.js';

/**
 * Configuration for the OAuth provider
 */
export interface OAuthProviderConfig {
  /**
   * OAuth clients that are allowed to authenticate
   */
  clients: Array<{
    /**
     * Unique client identifier
     */
    clientId: string;
    /**
     * Client secret (plain text - will be hashed with bcrypt)
     */
    clientSecret: string;
    /**
     * Allowed redirect URIs for this client
     */
    redirectUris: string[];
    /**
     * Scopes this client is allowed to request
     */
    scopes: string[];
  }>;
  /**
   * Access token expiration in seconds (default: 3600 = 1 hour)
   */
  tokenExpiration?: number;
  /**
   * Refresh token expiration in seconds (default: 86400 = 24 hours)
   */
  refreshTokenExpiration?: number;
  /**
   * Authorization code expiration in seconds (default: 600 = 10 minutes)
   */
  codeExpiration?: number;
  /**
   * Storage provider for OAuth data (default: InMemoryStorage)
   */
  storage?: OAuthStorageProvider;
}

/**
 * Stored access/refresh token information
 */
export interface StoredToken {
  /**
   * Client ID that owns this token
   */
  clientId: string;
  /**
   * Scopes granted to this token
   */
  scopes: string[];
  /**
   * Expiration timestamp (milliseconds since epoch)
   */
  expiresAt: number;
  /**
   * Optional refresh token associated with this access token
   */
  refreshToken?: string;
  /**
   * Original authorization code ID (for audit trail)
   */
  authorizationCodeId?: string;
}

/**
 * Stored authorization code information
 */
export interface StoredAuthorizationCode {
  /**
   * Client ID that requested this code
   */
  clientId: string;
  /**
   * Scopes requested in the authorization
   */
  scopes: string[];
  /**
   * Redirect URI used in the authorization request
   */
  redirectUri: string;
  /**
   * PKCE code challenge (base64url-encoded SHA256 hash)
   */
  codeChallenge: string;
  /**
   * Expiration timestamp (milliseconds since epoch)
   */
  expiresAt: number;
  /**
   * Whether this code has been used (single-use enforcement)
   */
  used: boolean;
}

/**
 * Stored client information (with hashed secret)
 */
export interface StoredClient {
  /**
   * Client ID
   */
  clientId: string;
  /**
   * Hashed client secret (bcrypt)
   */
  secretHash: string;
  /**
   * Allowed redirect URIs
   */
  redirectUris: string[];
  /**
   * Allowed scopes
   */
  scopes: string[];
}
