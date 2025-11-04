/**
 * Reference OAuth 2.1 Provider Implementation
 *
 * This is a REFERENCE IMPLEMENTATION showing how to implement the MCP SDK's
 * OAuthServerProvider interface. It is provided as an example and starting point.
 *
 * IMPORTANT: This implementation builds on the official MCP SDK's OAuth primitives.
 * See https://github.com/modelcontextprotocol/typescript-sdk for the base protocol.
 *
 * For production use, consider:
 * - Using an external OAuth provider (Auth0, Okta, etc.) instead of implementing your own
 * - Implementing JWT tokens instead of opaque UUID tokens
 * - Using a battle-tested OAuth library
 * - Consulting security experts for your specific compliance requirements
 *
 * This reference implementation provides:
 * - UUID-based tokens (not JWT)
 * - PKCE validation (SHA256)
 * - bcrypt-hashed client secrets
 * - Pluggable storage backend (InMemoryStorage or RedisStorage)
 * - Single-use authorization codes
 * - Audit logging support
 *
 * @see https://github.com/modelcontextprotocol/typescript-sdk/tree/main/src/server/auth
 */

import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import bcrypt from 'bcrypt';
import type { Response } from 'express';
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type {
  OAuthClientInformationFull,
  OAuthTokens,
  OAuthTokenRevocationRequest,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import {
  InvalidRequestError,
  InvalidClientError,
  InvalidGrantError,
  InvalidScopeError,
  UnauthorizedClientError,
  UnsupportedGrantTypeError,
} from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type {
  OAuthProviderConfig,
  StoredToken,
  StoredAuthorizationCode,
  StoredClient,
} from '../src/features/auth/oauth/types.js';
import type { AuditLogger } from '../src/features/auth/security/AuditLogger.js';
import type { OAuthStorageProvider } from '../src/features/auth/oauth/storage/types.js';
import { InMemoryStorage } from '../src/features/auth/oauth/storage/InMemoryStorage.js';

/**
 * Creates a default console-based audit logger for OAuth
 */
function createDefaultAuditLogger(): AuditLogger {
  return new (class DefaultAuditLogger {
    log(
      eventType: string,
      result: 'success' | 'failure' | 'warning',
      context?: any,
      details?: any
    ): void {
      const timestamp = new Date().toISOString();
      const level = result === 'failure' || result === 'warning' ? 'warn' : 'info';
      console[level](`[OAuth Audit] ${timestamp} - ${eventType}:`, {
        result,
        context,
        ...details,
      });
    }
  } as any)();
}

/**
 * Factory function to create an OAuth provider with async initialization.
 *
 * This is the recommended way to create an OAuth provider, as it:
 * - Uses async bcrypt.hash() instead of sync bcrypt.hashSync()
 * - Parallelizes client secret hashing for better performance
 * - Ensures the provider is fully initialized before use
 *
 * @param config - OAuth provider configuration
 * @param auditLogger - Optional audit logger (defaults to console logging)
 * @returns Fully initialized OAuth provider
 *
 * @example
 * ```typescript
 * const provider = await createOAuthProvider({
 *   clients: [
 *     {
 *       clientId: 'my-client',
 *       clientSecret: 'my-secret',
 *       redirectUris: ['http://localhost:3000/callback'],
 *       scopes: ['read', 'write'],
 *     },
 *   ],
 * });
 * ```
 */
export async function createOAuthProvider(
  config: OAuthProviderConfig,
  auditLogger?: AuditLogger
): Promise<SimplyMCPOAuthProvider> {
  const provider = new SimplyMCPOAuthProvider(config, auditLogger);
  await provider.initialize();
  return provider;
}

/**
 * Simply-MCP OAuth 2.1 Provider Implementation
 *
 * Implements the MCP SDK's OAuthServerProvider interface with:
 * - UUID-based tokens (not JWT)
 * - PKCE validation (SHA256)
 * - bcrypt-hashed client secrets
 * - Pluggable storage backend (defaults to InMemoryStorage)
 * - Single-use authorization codes
 *
 * NOTE: When using the constructor directly, you MUST call initialize() before use.
 * For convenience, use the createOAuthProvider() factory function instead.
 */
export class SimplyMCPOAuthProvider implements OAuthServerProvider {
  private storage: OAuthStorageProvider;
  private _clientsStore: InMemoryClientsStore;
  private auditLogger: AuditLogger;
  private initialized = false;
  private config: OAuthProviderConfig;

  private readonly tokenExpiration: number;
  private readonly refreshTokenExpiration: number;
  private readonly codeExpiration: number;

  constructor(config: OAuthProviderConfig, auditLogger?: AuditLogger) {
    // Store config for later initialization
    this.config = config;

    // Set expiration times (defaults from spec)
    this.tokenExpiration = config.tokenExpiration ?? 3600; // 1 hour
    this.refreshTokenExpiration = config.refreshTokenExpiration ?? 86400; // 24 hours
    this.codeExpiration = config.codeExpiration ?? 600; // 10 minutes

    // Store audit logger with console fallback
    this.auditLogger = auditLogger ?? createDefaultAuditLogger();

    // Use provided storage or create default InMemoryStorage
    this.storage = config.storage ?? new InMemoryStorage();

    // Create clients store (will be populated during initialization)
    this._clientsStore = new InMemoryClientsStore(this.storage);
  }

  /**
   * Initialize the OAuth provider asynchronously.
   *
   * This method:
   * - Connects to the storage backend
   * - Hashes all client secrets in parallel using async bcrypt
   * - Stores clients in the storage backend
   *
   * MUST be called before using the provider (unless using createOAuthProvider() factory).
   * Safe to call multiple times (idempotent).
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return; // Already initialized, idempotent
    }

    // Connect to storage backend
    await this.storage.connect();

    // Parallelize client secret hashing for better performance
    const saltRounds = 10;
    const clientPromises = this.config.clients.map(async (client) => {
      const secretHash = await bcrypt.hash(client.clientSecret, saltRounds);
      return {
        clientId: client.clientId,
        secretHash,
        redirectUris: client.redirectUris,
        scopes: client.scopes,
      };
    });

    const hashedClients = await Promise.all(clientPromises);

    // Store all clients in the storage backend
    for (const client of hashedClients) {
      await this.storage.setClient(client.clientId, client);
    }

    this.initialized = true;
  }

  /**
   * Get the clients store (required by OAuthServerProvider interface)
   */
  get clientsStore(): OAuthRegisteredClientsStore {
    return this._clientsStore;
  }

  /**
   * Authenticate a client using their secret
   */
  async authenticateClient(
    clientId: string,
    clientSecret: string
  ): Promise<boolean> {
    const client = await this.storage.getClient(clientId);
    if (!client) {
      return false;
    }

    return bcrypt.compare(clientSecret, client.secretHash);
  }

  /**
   * Validate PKCE code verifier against code challenge
   */
  private validatePKCE(codeVerifier: string, codeChallenge: string): boolean {
    const hash = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return hash === codeChallenge;
  }

  /**
   * Safely extract token ID prefix for logging (first 8 chars only)
   * SECURITY: Never log full tokens, secrets, codes, or verifiers
   */
  private safeTokenId(token: string): string {
    return token.substring(0, 8) + '...';
  }

  /**
   * Generate a UUID token
   */
  private generateToken(): string {
    return randomUUID();
  }

  /**
   * Validate that a redirect URI is allowed for a client
   */
  private async isRedirectUriAllowed(clientId: string, redirectUri: string): Promise<boolean> {
    const client = await this.storage.getClient(clientId);
    if (!client) {
      return false;
    }

    return client.redirectUris.includes(redirectUri);
  }

  /**
   * Validate that scopes are allowed for a client
   */
  private async areScopesAllowed(clientId: string, scopes: string[]): Promise<boolean> {
    const client = await this.storage.getClient(clientId);
    if (!client) {
      return false;
    }

    // All requested scopes must be in the client's allowed scopes
    return scopes.every((scope) => client.scopes.includes(scope));
  }

  /**
   * Begin authorization flow
   *
   * Generates authorization code and redirects to client's redirect_uri
   */
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    const scopes = params.scopes ?? [];

    // Log authorization request
    this.auditLogger.log(
      'oauth.authorization.requested',
      'success',
      undefined,
      {
        clientId: client.client_id,
        scopes,
        redirectUri: params.redirectUri,
      }
    );

    // Validate redirect URI
    if (!(await this.isRedirectUriAllowed(client.client_id, params.redirectUri))) {
      this.auditLogger.log(
        'oauth.authorization.denied',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          scopes,
          error: 'Invalid redirect_uri',
        }
      );

      throw new InvalidRequestError('Invalid redirect_uri');
    }

    // Validate scopes
    if (!(await this.areScopesAllowed(client.client_id, scopes))) {
      this.auditLogger.log(
        'oauth.authorization.denied',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          scopes,
          error: 'One or more requested scopes are not allowed',
        }
      );

      // Redirect to client with error
      const errorUrl = new URL(params.redirectUri);
      errorUrl.searchParams.set('error', 'invalid_scope');
      errorUrl.searchParams.set(
        'error_description',
        'One or more requested scopes are not allowed'
      );
      if (params.state) {
        errorUrl.searchParams.set('state', params.state);
      }

      res.redirect(302, errorUrl.toString());
      return;
    }

    // Generate authorization code
    const authorizationCode = this.generateToken();
    const expiresAt = Date.now() + this.codeExpiration * 1000;

    // Store authorization code
    await this.storage.setAuthorizationCode(
      authorizationCode,
      {
        clientId: client.client_id,
        scopes,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        expiresAt,
        used: false,
      },
      this.codeExpiration
    );

    // Log authorization granted
    this.auditLogger.log(
      'oauth.authorization.granted',
      'success',
      undefined,
      {
        clientId: client.client_id,
        scopes,
        codeId: this.safeTokenId(authorizationCode),
        expiresIn: this.codeExpiration,
      }
    );

    // Build success redirect URL
    const redirectUrl = new URL(params.redirectUri);
    redirectUrl.searchParams.set('code', authorizationCode);
    if (params.state) {
      redirectUrl.searchParams.set('state', params.state);
    }

    // Redirect to client
    res.redirect(302, redirectUrl.toString());
  }

  /**
   * Get the code challenge for an authorization code
   */
  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const code = await this.storage.getAuthorizationCode(authorizationCode);

    if (!code) {
      throw new InvalidGrantError('Invalid authorization code');
    }

    if (code.clientId !== client.client_id) {
      throw new InvalidGrantError('Authorization code does not belong to this client');
    }

    return code.codeChallenge;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    codeVerifier?: string,
    redirectUri?: string,
    resource?: URL
  ): Promise<OAuthTokens> {
    // Look up authorization code
    const code = await this.storage.getAuthorizationCode(authorizationCode);

    if (!code) {
      this.auditLogger.log(
        'oauth.token.issued',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          error: 'Invalid authorization code',
        }
      );
      throw new InvalidGrantError('Invalid authorization code');
    }

    // Validate client
    if (code.clientId !== client.client_id) {
      this.auditLogger.log(
        'oauth.token.issued',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          error: 'Authorization code does not belong to this client',
        }
      );
      throw new InvalidGrantError('Authorization code does not belong to this client');
    }

    // Validate not expired
    if (Date.now() > code.expiresAt) {
      await this.storage.deleteAuthorizationCode(authorizationCode);
      this.auditLogger.log(
        'oauth.token.issued',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          codeId: this.safeTokenId(authorizationCode),
          error: 'Authorization code expired',
        }
      );
      throw new InvalidGrantError('Authorization code expired');
    }

    // Validate single-use (CRITICAL: atomic operation to prevent race conditions)
    if (code.used) {
      this.auditLogger.log(
        'oauth.token.issued',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          codeId: this.safeTokenId(authorizationCode),
          error: 'Authorization code already used',
        }
      );
      throw new InvalidGrantError('Authorization code already used');
    }

    // Validate PKCE
    if (!codeVerifier) {
      this.auditLogger.log(
        'oauth.token.issued',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          codeId: this.safeTokenId(authorizationCode),
          error: 'Missing code_verifier (PKCE required)',
        }
      );
      throw new InvalidRequestError('Missing code_verifier (PKCE required)');
    }

    if (!this.validatePKCE(codeVerifier, code.codeChallenge)) {
      this.auditLogger.log(
        'oauth.token.issued',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          codeId: this.safeTokenId(authorizationCode),
          error: 'Invalid code_verifier (PKCE validation failed)',
        }
      );
      throw new InvalidGrantError('Invalid code_verifier (PKCE validation failed)');
    }

    // Validate redirect URI
    if (redirectUri && redirectUri !== code.redirectUri) {
      this.auditLogger.log(
        'oauth.token.issued',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          codeId: this.safeTokenId(authorizationCode),
          error: 'Redirect URI does not match authorization request',
        }
      );
      throw new InvalidGrantError('Redirect URI does not match authorization request');
    }

    // CRITICAL: Atomically mark code as used to prevent race conditions
    const wasMarked = await this.storage.markAuthorizationCodeUsed(authorizationCode);
    if (!wasMarked) {
      this.auditLogger.log(
        'oauth.token.issued',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          codeId: this.safeTokenId(authorizationCode),
          error: 'Authorization code already used (race condition detected)',
        }
      );
      throw new InvalidGrantError('Authorization code already used');
    }

    // Generate access token
    const accessToken = this.generateToken();
    const accessTokenExpiresAt = Date.now() + this.tokenExpiration * 1000;

    // Generate refresh token
    const refreshToken = this.generateToken();
    const refreshTokenExpiresAt =
      Date.now() + this.refreshTokenExpiration * 1000;

    // Store access token
    await this.storage.setToken(
      accessToken,
      {
        clientId: client.client_id,
        scopes: code.scopes,
        expiresAt: accessTokenExpiresAt,
        refreshToken,
        authorizationCodeId: authorizationCode,
      },
      this.tokenExpiration
    );

    // Store refresh token (maps refresh token -> access token)
    await this.storage.setRefreshToken(
      refreshToken,
      accessToken,
      this.refreshTokenExpiration
    );

    // Log token issuance (SUCCESS - do NOT log the tokens themselves!)
    this.auditLogger.log(
      'oauth.token.issued',
      'success',
      undefined,
      {
        clientId: client.client_id,
        scopes: code.scopes,
        tokenId: this.safeTokenId(accessToken),
        codeId: this.safeTokenId(authorizationCode),
        expiresIn: this.tokenExpiration,
      }
    );

    // Return OAuth tokens
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.tokenExpiration,
      refresh_token: refreshToken,
      scope: code.scopes.join(' '),
    };
  }

  /**
   * Exchange refresh token for new access token
   */
  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL
  ): Promise<OAuthTokens> {
    // Look up refresh token to get associated access token
    const oldAccessToken = await this.storage.getRefreshToken(refreshToken);

    if (!oldAccessToken) {
      this.auditLogger.log(
        'oauth.token.refreshed',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          error: 'Invalid refresh token',
        }
      );
      throw new InvalidGrantError('Invalid refresh token');
    }

    // Get the access token data to retrieve metadata
    const storedRefreshToken = await this.storage.getToken(oldAccessToken);

    if (!storedRefreshToken) {
      this.auditLogger.log(
        'oauth.token.refreshed',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          error: 'Invalid refresh token (access token not found)',
        }
      );
      throw new InvalidGrantError('Invalid refresh token');
    }

    // Validate client
    if (storedRefreshToken.clientId !== client.client_id) {
      this.auditLogger.log(
        'oauth.token.refreshed',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          error: 'Refresh token does not belong to this client',
        }
      );
      throw new InvalidGrantError('Refresh token does not belong to this client');
    }

    // Validate not expired (check the token's own expiration)
    if (Date.now() > storedRefreshToken.expiresAt) {
      await this.storage.deleteRefreshToken(refreshToken);
      await this.storage.deleteToken(oldAccessToken);
      this.auditLogger.log(
        'oauth.token.refreshed',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          refreshTokenId: this.safeTokenId(refreshToken),
          error: 'Refresh token expired',
        }
      );
      throw new InvalidGrantError('Refresh token expired');
    }

    // Validate scopes (if provided, must be subset of original)
    const tokenScopes = scopes ?? storedRefreshToken.scopes;
    if (
      !tokenScopes.every((scope) => storedRefreshToken.scopes.includes(scope))
    ) {
      this.auditLogger.log(
        'oauth.token.refreshed',
        'failure',
        undefined,
        {
          clientId: client.client_id,
          refreshTokenId: this.safeTokenId(refreshToken),
          requestedScopes: tokenScopes,
          originalScopes: storedRefreshToken.scopes,
          error: 'Requested scopes exceed original authorization',
        }
      );
      throw new InvalidScopeError(
        'Requested scopes exceed original authorization'
      );
    }

    // Generate new access token
    const accessToken = this.generateToken();
    const accessTokenExpiresAt = Date.now() + this.tokenExpiration * 1000;

    // Optionally rotate refresh token
    const newRefreshToken = this.generateToken();
    const refreshTokenExpiresAt =
      Date.now() + this.refreshTokenExpiration * 1000;

    // Store new access token
    await this.storage.setToken(
      accessToken,
      {
        clientId: client.client_id,
        scopes: tokenScopes,
        expiresAt: accessTokenExpiresAt,
        refreshToken: newRefreshToken,
        authorizationCodeId: storedRefreshToken.authorizationCodeId,
      },
      this.tokenExpiration
    );

    // Remove old refresh token and store new one
    await this.storage.deleteRefreshToken(refreshToken);
    await this.storage.setRefreshToken(
      newRefreshToken,
      accessToken,
      this.refreshTokenExpiration
    );

    // Log token refresh (SUCCESS - do NOT log the tokens themselves!)
    this.auditLogger.log(
      'oauth.token.refreshed',
      'success',
      undefined,
      {
        clientId: client.client_id,
        scopes: tokenScopes,
        newTokenId: this.safeTokenId(accessToken),
        oldRefreshTokenId: this.safeTokenId(refreshToken),
        newRefreshTokenId: this.safeTokenId(newRefreshToken),
        expiresIn: this.tokenExpiration,
      }
    );

    // Return OAuth tokens
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.tokenExpiration,
      refresh_token: newRefreshToken,
      scope: tokenScopes.join(' '),
    };
  }

  /**
   * Verify access token and return auth info
   */
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const storedToken = await this.storage.getToken(token);

    if (!storedToken) {
      this.auditLogger.log(
        'oauth.token.validation.failed',
        'failure',
        undefined,
        {
          tokenId: this.safeTokenId(token),
          error: 'Invalid access token',
        }
      );
      throw new InvalidGrantError('Invalid access token');
    }

    // Check expiration
    if (Date.now() > storedToken.expiresAt) {
      await this.storage.deleteToken(token);
      this.auditLogger.log(
        'oauth.token.validation.failed',
        'failure',
        undefined,
        {
          clientId: storedToken.clientId,
          tokenId: this.safeTokenId(token),
          error: 'Access token expired',
        }
      );
      throw new InvalidGrantError('Access token expired');
    }

    // Log successful validation
    this.auditLogger.log(
      'oauth.token.validation.success',
      'success',
      undefined,
      {
        clientId: storedToken.clientId,
        scopes: storedToken.scopes,
        tokenId: this.safeTokenId(token),
      }
    );

    // Return auth info
    return {
      token,
      clientId: storedToken.clientId,
      scopes: storedToken.scopes,
      expiresAt: Math.floor(storedToken.expiresAt / 1000), // Convert to seconds
    };
  }

  /**
   * Revoke a token (access or refresh)
   */
  async revokeToken(
    client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest
  ): Promise<void> {
    const { token, token_type_hint } = request;
    let revoked = false;
    let tokenType: 'access_token' | 'refresh_token' | undefined;

    // Try as access token first (or if hint says access_token)
    if (!token_type_hint || token_type_hint === 'access_token') {
      const storedToken = await this.storage.getToken(token);
      if (storedToken && storedToken.clientId === client.client_id) {
        await this.storage.deleteToken(token);
        // Also revoke associated refresh token
        if (storedToken.refreshToken) {
          await this.storage.deleteRefreshToken(storedToken.refreshToken);
        }
        revoked = true;
        tokenType = 'access_token';

        // Log successful revocation
        this.auditLogger.log(
          'oauth.token.revoked',
          'success',
          undefined,
          {
            clientId: client.client_id,
            tokenType: 'access_token',
            tokenId: this.safeTokenId(token),
            scopes: storedToken.scopes,
          }
        );
        return;
      }
    }

    // Try as refresh token (or if hint says refresh_token)
    if (!token_type_hint || token_type_hint === 'refresh_token') {
      // Get the access token associated with this refresh token
      const accessToken = await this.storage.getRefreshToken(token);
      if (accessToken) {
        const storedAccessToken = await this.storage.getToken(accessToken);

        if (storedAccessToken && storedAccessToken.clientId === client.client_id) {
          await this.storage.deleteRefreshToken(token);

          // Find and revoke associated access tokens using storage method
          const relatedTokens = await this.storage.findTokensByRefreshToken(token);
          let revokedAccessTokens = 0;
          for (const [accessTokenKey] of relatedTokens) {
            await this.storage.deleteToken(accessTokenKey);
            revokedAccessTokens++;
          }

          revoked = true;
          tokenType = 'refresh_token';

          // Log successful revocation
          this.auditLogger.log(
            'oauth.token.revoked',
            'success',
            undefined,
            {
              clientId: client.client_id,
              tokenType: 'refresh_token',
              tokenId: this.safeTokenId(token),
              scopes: storedAccessToken.scopes,
              revokedAccessTokens,
            }
          );
          return;
        }
      }
    }

    // Per OAuth 2.1 spec, silently succeed even if token doesn't exist
    // or doesn't belong to this client - but still log the attempt
    if (!revoked) {
      this.auditLogger.log(
        'oauth.token.revoked',
        'success',
        undefined,
        {
          clientId: client.client_id,
          tokenType: token_type_hint || 'unknown',
          tokenId: this.safeTokenId(token),
          note: 'Token not found or does not belong to client (silent success per OAuth 2.1 spec)',
        }
      );
    }
  }

  /**
   * Get statistics (for testing/debugging)
   *
   * Note: Cleanup is handled automatically by the storage backend.
   */
  async getStats() {
    const stats = await this.storage.getStats();
    return {
      clients: stats.clientCount,
      tokens: stats.tokenCount,
      refreshTokens: stats.refreshTokenCount,
      authorizationCodes: stats.authorizationCodeCount,
    };
  }
}

/**
 * In-memory implementation of OAuthRegisteredClientsStore
 */
class InMemoryClientsStore implements OAuthRegisteredClientsStore {
  constructor(private storage: OAuthStorageProvider) {}

  getClient(clientId: string): OAuthClientInformationFull | undefined {
    // Note: This method is synchronous in the SDK interface, but storage is async
    // We need to make this async-compatible
    // For now, we'll throw an error suggesting the use of async patterns
    throw new Error(
      'InMemoryClientsStore.getClient() is not supported with async storage. ' +
      'Use the provider methods directly (e.g., authenticateClient, authorize, etc.)'
    );
  }

  /**
   * Register a new OAuth client dynamically (RFC 7591)
   *
   * Generates client_id and client_secret, hashes the secret,
   * and stores the client in the registry.
   *
   * Note: This method returns a promise-like object to support async storage.
   *
   * @param client - Client metadata (without client_id)
   * @returns Registered client with client_id and client_secret
   */
  registerClient(
    client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>
  ): OAuthClientInformationFull {
    // This method needs to be async but the SDK interface doesn't support it
    // For now, throw an error
    throw new Error(
      'InMemoryClientsStore.registerClient() is not supported with async storage. ' +
      'Dynamic client registration will be supported in a future version.'
    );
  }
}
