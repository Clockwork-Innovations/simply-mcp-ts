/**
 * Authentication configuration types
 */

/**
 * Base Authentication Configuration Interface
 *
 * Base interface for all authentication configurations using the discriminated
 * union pattern. The `type` field determines which authentication strategy is used.
 *
 * Extend this interface to create specific authentication configurations:
 * - 'apiKey': API key-based authentication (see IApiKeyAuth)
 * - 'oauth2': OAuth 2.0 authentication (future)
 * - 'database': Database-backed authentication (future)
 * - 'custom': Custom authentication strategy (future)
 *
 * @example API Key Authentication
 * ```typescript
 * interface MyAuth extends IApiKeyAuth {
 *   type: 'apiKey';
 *   keys: [
 *     { name: 'admin', key: 'sk-admin-123', permissions: ['*'] },
 *     { name: 'readonly', key: 'sk-read-456', permissions: ['read:*'] }
 *   ];
 * }
 *
 * interface MyServer extends IServer {
 *   name: 'my-server';
 *   version: '1.0.0';
 *   transport: 'http';
 *   port: 3000;
 *   auth: MyAuth;
 * }
 * ```
 *
 * @example Future OAuth2 (for reference)
 * ```typescript
 * // This will be supported in future versions
 * interface OAuth2Auth extends IAuth {
 *   type: 'oauth2';
 *   clientId: string;
 *   clientSecret: string;
 *   authorizationUrl: string;
 *   tokenUrl: string;
 * }
 * ```
 */
export interface IAuth {
  /**
   * Authentication type discriminator
   *
   * Determines which authentication strategy is used:
   * - 'apiKey': API key-based authentication
   * - 'oauth2': OAuth 2.0 (future)
   * - 'database': Database authentication (future)
   * - 'custom': Custom strategy (future)
   */
  type: 'apiKey' | 'oauth2' | 'database' | 'custom';
}

/**
 * API Key Configuration for a single key
 */
export interface IApiKeyConfig {
  /**
   * Human-readable name for this API key
   * Used for identification in logs and audit trails
   */
  name: string;

  /**
   * The actual API key string
   * Should be a securely generated random string (e.g., 'sk-admin-abc123...')
   */
  key: string;

  /**
   * Permissions granted to this API key
   *
   * Use '*' for all permissions, or specify granular permissions:
   * - 'read:*': Read access to all resources
   * - 'write:*': Write access to all resources
   * - 'tool:weather': Access to specific tool
   * - 'resource:config': Access to specific resource
   */
  permissions: string[];
}

/**
 * API Key Authentication Configuration
 *
 * Provides API key-based authentication for HTTP transport.
 * Multiple API keys can be configured with different permission levels.
 *
 * @example Basic API Key Auth
 * ```typescript
 * interface ApiKeyAuth extends IApiKeyAuth {
 *   type: 'apiKey';
 *   keys: [
 *     { name: 'admin', key: 'sk-admin-123', permissions: ['*'] }
 *   ];
 * }
 *
 * interface MyServer extends IServer {
 *   name: 'my-server';
 *   version: '1.0.0';
 *   transport: 'http';
 *   port: 3000;
 *   auth: ApiKeyAuth;
 * }
 * ```
 *
 * @example Multiple Keys with Different Permissions
 * ```typescript
 * interface MultiKeyAuth extends IApiKeyAuth {
 *   type: 'apiKey';
 *   headerName: 'x-api-key';
 *   keys: [
 *     { name: 'admin', key: 'sk-admin-xyz', permissions: ['*'] },
 *     { name: 'readonly', key: 'sk-read-abc', permissions: ['read:*'] },
 *     { name: 'weather', key: 'sk-weather-def', permissions: ['tool:get_weather', 'tool:get_forecast'] }
 *   ];
 *   allowAnonymous: false;
 * }
 * ```
 *
 * @example Allow Anonymous Access
 * ```typescript
 * interface OptionalAuth extends IApiKeyAuth {
 *   type: 'apiKey';
 *   keys: [
 *     { name: 'premium', key: 'sk-premium-123', permissions: ['*'] }
 *   ];
 *   allowAnonymous: true; // Unauthenticated requests allowed with limited access
 * }
 * ```
 */
export interface IApiKeyAuth extends IAuth {
  /**
   * Authentication type - must be 'apiKey'
   */
  type: 'apiKey';

  /**
   * HTTP header name for the API key
   * Default: 'x-api-key'
   *
   * @example
   * - 'x-api-key' (default)
   * - 'Authorization' (if using Bearer token pattern)
   * - 'x-custom-auth-token'
   */
  headerName?: string;

  /**
   * Array of valid API keys with their permissions
   * At least one key must be configured
   */
  keys: IApiKeyConfig[];

  /**
   * Whether to allow anonymous (unauthenticated) requests
   * Default: false
   *
   * When true, requests without an API key are allowed but receive
   * limited permissions (typically read-only access to public resources).
   * When false, all requests must include a valid API key.
   */
  allowAnonymous?: boolean;
}

/**
 * OAuth Client Configuration
 *
 * Defines a registered OAuth 2.1 client that can authenticate with the server.
 * Each client has unique credentials, allowed redirect URIs, and scopes.
 *
 * @example Web Application Client
 * ```typescript
 * const webClient: IOAuthClient = {
 *   clientId: 'web-app-123',
 *   clientSecret: process.env.WEB_CLIENT_SECRET!,
 *   redirectUris: ['https://app.example.com/oauth/callback'],
 *   scopes: ['read', 'write', 'tools:execute'],
 *   name: 'Main Web Application'
 * };
 * ```
 *
 * @example CLI Tool Client
 * ```typescript
 * const cliClient: IOAuthClient = {
 *   clientId: 'cli-tool',
 *   clientSecret: process.env.CLI_CLIENT_SECRET!,
 *   redirectUris: ['http://localhost:3000/callback'],
 *   scopes: ['read', 'write'],
 *   name: 'CLI Tool'
 * };
 * ```
 */
export interface IOAuthClient {
  /**
   * OAuth client ID (unique identifier)
   *
   * This is a public identifier for the client application.
   * Use a descriptive, unique string (e.g., 'web-app-123', 'mobile-client').
   */
  clientId: string;

  /**
   * Client secret (will be hashed with bcrypt)
   *
   * SECURITY WARNING: In production, ALWAYS load from environment variables.
   * NEVER hardcode secrets in source code or commit them to version control.
   *
   * @example Good Practice
   * ```typescript
   * clientSecret: process.env.OAUTH_CLIENT_SECRET!
   * ```
   *
   * @example BAD - Never Do This
   * ```typescript
   * clientSecret: 'my-secret-123'  // ❌ DON'T hardcode!
   * ```
   */
  clientSecret: string;

  /**
   * Allowed redirect URIs for this client
   *
   * Authorization codes can ONLY be sent to URIs in this list.
   * This prevents authorization code interception attacks.
   *
   * @example Development and Production URIs
   * ```typescript
   * redirectUris: [
   *   'http://localhost:3000/callback',           // Dev
   *   'https://app.example.com/oauth/callback'    // Prod
   * ]
   * ```
   */
  redirectUris: string[];

  /**
   * Scopes this client is allowed to request
   *
   * Defines what permissions this client can request during authorization.
   * Use domain-specific scopes for fine-grained access control.
   *
   * @example Granular Scopes
   * ```typescript
   * scopes: [
   *   'read',              // Read access
   *   'write',             // Write access
   *   'tools:execute',     // Execute tools
   *   'admin:users'        // Admin user management
   * ]
   * ```
   */
  scopes: string[];

  /**
   * Optional: Client name for display purposes
   *
   * Human-readable name shown in logs, audit trails, and authorization screens.
   */
  name?: string;
}

/**
 * OAuth 2.1 Authentication Configuration
 *
 * Provides OAuth 2.1 authentication using the MCP SDK's OAuth infrastructure.
 * Supports multiple clients, PKCE (Proof Key for Code Exchange), and token refresh.
 *
 * OAuth 2.1 includes security best practices:
 * - PKCE required for all clients (prevents authorization code interception)
 * - No implicit flow (authorization code flow only)
 * - Refresh token rotation (enhances security)
 *
 * @example Basic OAuth Server
 * ```typescript
 * interface OAuthAuth extends IOAuth2Auth {
 *   type: 'oauth2';
 *   issuerUrl: 'https://auth.example.com';
 *   clients: [
 *     {
 *       clientId: 'web-app';
 *       clientSecret: process.env.WEB_CLIENT_SECRET!;
 *       redirectUris: ['https://app.example.com/callback'];
 *       scopes: ['read', 'write'];
 *     }
 *   ];
 * }
 *
 * interface MyServer extends IServer {
 *   name: 'oauth-server';
 *   transport: 'http';
 *   port: 3000;
 *   auth: OAuthAuth;
 * }
 * ```
 *
 * @example Multiple Clients with Custom Expirations
 * ```typescript
 * interface MultiClientAuth extends IOAuth2Auth {
 *   type: 'oauth2';
 *   issuerUrl: 'http://localhost:3000';
 *   clients: [
 *     {
 *       clientId: 'admin-dashboard';
 *       clientSecret: process.env.ADMIN_SECRET!;
 *       redirectUris: ['https://admin.example.com/oauth'];
 *       scopes: ['admin', 'read', 'write'];
 *       name: 'Admin Dashboard';
 *     },
 *     {
 *       clientId: 'mobile-app';
 *       clientSecret: process.env.MOBILE_SECRET!;
 *       redirectUris: ['myapp://oauth/callback'];
 *       scopes: ['read'];
 *       name: 'Mobile App';
 *     }
 *   ];
 *   tokenExpiration: 7200;        // 2 hours
 *   refreshTokenExpiration: 604800; // 7 days
 * }
 * ```
 */
export interface IOAuth2Auth extends IAuth {
  /**
   * Authentication type - must be 'oauth2'
   */
  type: 'oauth2';

  /**
   * OAuth issuer URL (e.g., 'https://auth.example.com' or 'http://localhost:3000')
   *
   * This URL is used in OAuth metadata and token claims (iss claim).
   * It should be the base URL of your OAuth authorization server.
   *
   * @example Production
   * ```typescript
   * issuerUrl: 'https://auth.example.com'
   * ```
   *
   * @example Development
   * ```typescript
   * issuerUrl: 'http://localhost:3000'
   * ```
   */
  issuerUrl: string;

  /**
   * Registered OAuth clients
   *
   * Each client represents an application that can authenticate users.
   * Configure multiple clients for different applications (web, mobile, CLI, etc.).
   */
  clients: IOAuthClient[];

  /**
   * Access token expiration in seconds
   *
   * Default: 3600 (1 hour)
   *
   * Access tokens are short-lived for security. When expired, clients use
   * the refresh token to obtain a new access token without re-authentication.
   *
   * @example Short-lived tokens (more secure)
   * ```typescript
   * tokenExpiration: 900  // 15 minutes
   * ```
   *
   * @example Long-lived tokens (less secure, more convenient)
   * ```typescript
   * tokenExpiration: 7200  // 2 hours
   * ```
   */
  tokenExpiration?: number;

  /**
   * Refresh token expiration in seconds
   *
   * Default: 86400 (24 hours)
   *
   * Refresh tokens are long-lived and used to obtain new access tokens.
   * They should expire eventually to require periodic re-authentication.
   *
   * @example 7 days
   * ```typescript
   * refreshTokenExpiration: 604800
   * ```
   */
  refreshTokenExpiration?: number;

  /**
   * Authorization code expiration in seconds
   *
   * Default: 600 (10 minutes)
   *
   * Authorization codes are single-use and should be short-lived.
   * They are exchanged for tokens immediately after authorization.
   *
   * @example Very short-lived (more secure)
   * ```typescript
   * codeExpiration: 300  // 5 minutes
   * ```
   */
  codeExpiration?: number;
}
