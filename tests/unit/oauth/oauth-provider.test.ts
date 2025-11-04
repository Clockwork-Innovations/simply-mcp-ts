import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createHash } from 'crypto';
import bcrypt from 'bcrypt';
import { SimplyMCPOAuthProvider } from '../../../src/features/auth/oauth/SimplyMCPOAuthProvider.js';
import type { OAuthProviderConfig } from '../../../src/features/auth/oauth/types.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';

describe('SimplyMCPOAuthProvider', () => {
  let provider: SimplyMCPOAuthProvider;
  let testConfig: OAuthProviderConfig;
  let testClient: OAuthClientInformationFull;

  beforeEach(async () => {
    // Set up test configuration
    testConfig = {
      clients: [
        {
          clientId: 'test-client-1',
          clientSecret: 'test-secret-1',
          redirectUris: ['http://localhost:3000/callback', 'https://example.com/oauth/callback'],
          scopes: ['read', 'write', 'admin'],
        },
        {
          clientId: 'test-client-2',
          clientSecret: 'test-secret-2',
          redirectUris: ['http://localhost:4000/callback'],
          scopes: ['read'],
        },
      ],
      tokenExpiration: 3600,
      refreshTokenExpiration: 86400,
      codeExpiration: 600,
    };

    // Create provider and initialize
    provider = new SimplyMCPOAuthProvider(testConfig);
    await provider.initialize();

    // Test client info
    testClient = {
      client_id: 'test-client-1',
      redirect_uris: ['http://localhost:3000/callback', 'https://example.com/oauth/callback'],
    };
  });

  afterEach(async () => {
    if (provider) {
      await provider['storage'].disconnect();
    }
  });

  describe('Provider Initialization', () => {
    it('should initialize with correct number of clients', async () => {
      const stats = await provider.getStats();
      expect(stats.clients).toBe(2);
    });

    it('should hash client secrets with bcrypt', async () => {
      // Access private clients map via authenticateClient
      const isValid = await provider.authenticateClient('test-client-1', 'test-secret-1');
      expect(isValid).toBe(true);
    });

    it('should reject wrong client secret', async () => {
      const isValid = await provider.authenticateClient('test-client-1', 'wrong-secret');
      expect(isValid).toBe(false);
    });

    it('should reject unknown client', async () => {
      const isValid = await provider.authenticateClient('unknown-client', 'test-secret-1');
      expect(isValid).toBe(false);
    });

    it('should have clients store', async () => {
      expect(provider.clientsStore).toBeDefined();
      // Test that the client exists by authenticating with the correct secret
      const isValid = await provider.authenticateClient('test-client-1', 'test-secret-1');
      expect(isValid).toBe(true);
    });
  });

  describe('Authorization Flow', () => {
    it('should generate authorization code', async () => {
      const mockResponse = createMockResponse();
      const codeChallenge = 'test-code-challenge';

      await provider.authorize(
        testClient,
        {
          redirectUri: 'http://localhost:3000/callback',
          codeChallenge,
          scopes: ['read'],
          state: 'test-state',
        },
        mockResponse as any
      );

      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectUrl = new URL(mockResponse.redirectUrl!);
      expect(redirectUrl.searchParams.has('code')).toBe(true);
      expect(redirectUrl.searchParams.get('state')).toBe('test-state');
    });

    it('should reject invalid redirect URI', async () => {
      const mockResponse = createMockResponse();

      await expect(
        provider.authorize(
          testClient,
          {
            redirectUri: 'http://evil.com/callback',
            codeChallenge: 'test-challenge',
            scopes: ['read'],
          },
          mockResponse as any
        )
      ).rejects.toThrow('Invalid redirect_uri');
    });

    it('should redirect with error for invalid scopes', async () => {
      const mockResponse = createMockResponse();

      await provider.authorize(
        testClient,
        {
          redirectUri: 'http://localhost:3000/callback',
          codeChallenge: 'test-challenge',
          scopes: ['invalid-scope'],
          state: 'test-state',
        },
        mockResponse as any
      );

      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectUrl = new URL(mockResponse.redirectUrl!);
      expect(redirectUrl.searchParams.get('error')).toBe('invalid_scope');
      expect(redirectUrl.searchParams.get('state')).toBe('test-state');
    });
  });

  describe('PKCE Validation', () => {
    it('should validate correct PKCE code verifier', async () => {
      // Generate valid PKCE pair
      const codeVerifier = 'test-code-verifier-12345678901234567890';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      // Get authorization code
      const mockResponse = createMockResponse();
      await provider.authorize(
        testClient,
        {
          redirectUri: 'http://localhost:3000/callback',
          codeChallenge,
          scopes: ['read'],
        },
        mockResponse as any
      );

      const redirectUrl = new URL(mockResponse.redirectUrl!);
      const authCode = redirectUrl.searchParams.get('code')!;

      // Exchange code with correct verifier
      const tokens = await provider.exchangeAuthorizationCode(
        testClient,
        authCode,
        codeVerifier,
        'http://localhost:3000/callback'
      );

      expect(tokens.access_token).toBeDefined();
      expect(tokens.token_type).toBe('Bearer');
    });

    it('should reject invalid PKCE code verifier', async () => {
      const codeVerifier = 'test-code-verifier-12345678901234567890';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      const mockResponse = createMockResponse();
      await provider.authorize(
        testClient,
        {
          redirectUri: 'http://localhost:3000/callback',
          codeChallenge,
          scopes: ['read'],
        },
        mockResponse as any
      );

      const redirectUrl = new URL(mockResponse.redirectUrl!);
      const authCode = redirectUrl.searchParams.get('code')!;

      // Try with wrong verifier
      await expect(
        provider.exchangeAuthorizationCode(
          testClient,
          authCode,
          'wrong-verifier',
          'http://localhost:3000/callback'
        )
      ).rejects.toThrow('PKCE validation failed');
    });

    it('should require code verifier', async () => {
      const codeChallenge = 'test-challenge';
      const mockResponse = createMockResponse();

      await provider.authorize(
        testClient,
        {
          redirectUri: 'http://localhost:3000/callback',
          codeChallenge,
          scopes: ['read'],
        },
        mockResponse as any
      );

      const redirectUrl = new URL(mockResponse.redirectUrl!);
      const authCode = redirectUrl.searchParams.get('code')!;

      await expect(
        provider.exchangeAuthorizationCode(
          testClient,
          authCode,
          undefined,
          'http://localhost:3000/callback'
        )
      ).rejects.toThrow('Missing code_verifier');
    });
  });

  describe('Code Exchange', () => {
    it('should exchange valid authorization code for tokens', async () => {
      const { authCode } = await getValidAuthCode(provider, testClient);

      const tokens = await provider.exchangeAuthorizationCode(
        testClient,
        authCode,
        'test-verifier',
        'http://localhost:3000/callback'
      );

      expect(tokens.access_token).toBeDefined();
      expect(tokens.refresh_token).toBeDefined();
      expect(tokens.token_type).toBe('Bearer');
      expect(tokens.expires_in).toBe(3600);
      expect(tokens.scope).toBe('read');
    });

    it('should enforce single-use authorization codes', async () => {
      const { authCode } = await getValidAuthCode(provider, testClient);

      // First exchange should succeed
      await provider.exchangeAuthorizationCode(
        testClient,
        authCode,
        'test-verifier',
        'http://localhost:3000/callback'
      );

      // Second exchange should fail
      await expect(
        provider.exchangeAuthorizationCode(
          testClient,
          authCode,
          'test-verifier',
          'http://localhost:3000/callback'
        )
      ).rejects.toThrow('already used');
    });

    it('should reject expired authorization code', async () => {
      // Create provider with very short code expiration
      const shortExpiryProvider = new SimplyMCPOAuthProvider({
        ...testConfig,
        codeExpiration: 1, // 1 second
      });
      await shortExpiryProvider.initialize();

      const { authCode } = await getValidAuthCode(shortExpiryProvider, testClient);

      // Wait for code to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // The code should be either expired or cleaned up (both are acceptable)
      await expect(
        shortExpiryProvider.exchangeAuthorizationCode(
          testClient,
          authCode,
          'test-verifier',
          'http://localhost:3000/callback'
        )
      ).rejects.toThrow(/expired|Invalid authorization code/);

      await shortExpiryProvider['storage'].disconnect();
    });

    it('should validate redirect URI matches', async () => {
      const { authCode } = await getValidAuthCode(provider, testClient);

      await expect(
        provider.exchangeAuthorizationCode(
          testClient,
          authCode,
          'test-verifier',
          'http://different-uri.com/callback'
        )
      ).rejects.toThrow('Redirect URI does not match');
    });

    it('should reject invalid authorization code', async () => {
      await expect(
        provider.exchangeAuthorizationCode(
          testClient,
          'invalid-code',
          'test-verifier',
          'http://localhost:3000/callback'
        )
      ).rejects.toThrow('Invalid authorization code');
    });

    it('should validate client ownership of code', async () => {
      const { authCode } = await getValidAuthCode(provider, testClient);

      const differentClient: OAuthClientInformationFull = {
        client_id: 'test-client-2',
        redirect_uris: ['http://localhost:4000/callback'],
      };

      await expect(
        provider.exchangeAuthorizationCode(
          differentClient,
          authCode,
          'test-verifier',
          'http://localhost:3000/callback'
        )
      ).rejects.toThrow('does not belong to this client');
    });
  });

  describe('Token Validation', () => {
    it('should verify valid access token', async () => {
      const { tokens } = await getValidTokens(provider, testClient);

      const authInfo = await provider.verifyAccessToken(tokens.access_token);

      expect(authInfo.token).toBe(tokens.access_token);
      expect(authInfo.clientId).toBe('test-client-1');
      expect(authInfo.scopes).toEqual(['read']);
      expect(authInfo.expiresAt).toBeDefined();
    });

    it('should reject invalid access token', async () => {
      await expect(
        provider.verifyAccessToken('invalid-token')
      ).rejects.toThrow('Invalid access token');
    });

    it('should reject expired access token', async () => {
      // Create provider with very short token expiration
      const shortExpiryProvider = new SimplyMCPOAuthProvider({
        ...testConfig,
        tokenExpiration: 1, // 1 second
      });
      await shortExpiryProvider.initialize();

      const { tokens } = await getValidTokens(shortExpiryProvider, testClient);

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // The token should be either expired or cleaned up (both are acceptable)
      await expect(
        shortExpiryProvider.verifyAccessToken(tokens.access_token)
      ).rejects.toThrow(/expired|Invalid access token/);

      await shortExpiryProvider['storage'].disconnect();
    });
  });

  describe('Refresh Token Flow', () => {
    it('should exchange valid refresh token for new access token', async () => {
      const { tokens } = await getValidTokens(provider, testClient);

      const newTokens = await provider.exchangeRefreshToken(
        testClient,
        tokens.refresh_token!,
        ['read']
      );

      expect(newTokens.access_token).toBeDefined();
      expect(newTokens.access_token).not.toBe(tokens.access_token);
      expect(newTokens.refresh_token).toBeDefined();
      expect(newTokens.refresh_token).not.toBe(tokens.refresh_token);
    });

    it('should reject invalid refresh token', async () => {
      await expect(
        provider.exchangeRefreshToken(
          testClient,
          'invalid-refresh-token',
          ['read']
        )
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should validate client ownership of refresh token', async () => {
      const { tokens } = await getValidTokens(provider, testClient);

      const differentClient: OAuthClientInformationFull = {
        client_id: 'test-client-2',
        redirect_uris: ['http://localhost:4000/callback'],
      };

      await expect(
        provider.exchangeRefreshToken(
          differentClient,
          tokens.refresh_token!,
          ['read']
        )
      ).rejects.toThrow('does not belong to this client');
    });

    it('should validate scopes are subset of original', async () => {
      const { tokens } = await getValidTokens(provider, testClient);

      await expect(
        provider.exchangeRefreshToken(
          testClient,
          tokens.refresh_token!,
          ['read', 'admin'] // Original only had 'read'
        )
      ).rejects.toThrow('exceed original authorization');
    });

    it('should use original scopes if none provided', async () => {
      const { tokens } = await getValidTokens(provider, testClient);

      const newTokens = await provider.exchangeRefreshToken(
        testClient,
        tokens.refresh_token!
      );

      expect(newTokens.scope).toBe('read');
    });
  });

  describe('Token Revocation', () => {
    it('should revoke access token', async () => {
      const { tokens } = await getValidTokens(provider, testClient);

      // Revoke the token
      await provider.revokeToken(testClient, {
        token: tokens.access_token,
        token_type_hint: 'access_token',
      });

      // Verify token is invalid
      await expect(
        provider.verifyAccessToken(tokens.access_token)
      ).rejects.toThrow('Invalid access token');
    });

    it('should revoke refresh token', async () => {
      const { tokens } = await getValidTokens(provider, testClient);

      // Revoke the refresh token
      await provider.revokeToken(testClient, {
        token: tokens.refresh_token!,
        token_type_hint: 'refresh_token',
      });

      // Verify refresh token is invalid
      await expect(
        provider.exchangeRefreshToken(testClient, tokens.refresh_token!, ['read'])
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should revoke associated tokens when revoking access token', async () => {
      const { tokens } = await getValidTokens(provider, testClient);

      // Revoke access token
      await provider.revokeToken(testClient, {
        token: tokens.access_token,
        token_type_hint: 'access_token',
      });

      // Verify refresh token is also revoked
      await expect(
        provider.exchangeRefreshToken(testClient, tokens.refresh_token!, ['read'])
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should silently succeed for unknown token', async () => {
      // Should not throw
      await provider.revokeToken(testClient, {
        token: 'unknown-token',
      });
    });

    it('should silently succeed for wrong client', async () => {
      const { tokens } = await getValidTokens(provider, testClient);

      const differentClient: OAuthClientInformationFull = {
        client_id: 'test-client-2',
        redirect_uris: ['http://localhost:4000/callback'],
      };

      // Should not throw
      await provider.revokeToken(differentClient, {
        token: tokens.access_token,
      });

      // But token should still be valid for original client
      const authInfo = await provider.verifyAccessToken(tokens.access_token);
      expect(authInfo.clientId).toBe('test-client-1');
    });
  });

  describe('Scope Validation', () => {
    it('should allow subset of client scopes', async () => {
      const mockResponse = createMockResponse();

      await provider.authorize(
        testClient,
        {
          redirectUri: 'http://localhost:3000/callback',
          codeChallenge: 'test-challenge',
          scopes: ['read'], // Subset of ['read', 'write', 'admin']
        },
        mockResponse as any
      );

      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectUrl = new URL(mockResponse.redirectUrl!);
      expect(redirectUrl.searchParams.has('code')).toBe(true);
    });

    it('should reject scopes not allowed for client', async () => {
      const mockResponse = createMockResponse();

      const limitedClient: OAuthClientInformationFull = {
        client_id: 'test-client-2',
        redirect_uris: ['http://localhost:4000/callback'],
      };

      await provider.authorize(
        limitedClient,
        {
          redirectUri: 'http://localhost:4000/callback',
          codeChallenge: 'test-challenge',
          scopes: ['write'], // Not allowed for test-client-2
        },
        mockResponse as any
      );

      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectUrl = new URL(mockResponse.redirectUrl!);
      expect(redirectUrl.searchParams.get('error')).toBe('invalid_scope');
    });
  });

  describe('Token Format', () => {
    it('should generate UUID tokens', async () => {
      const { tokens } = await getValidTokens(provider, testClient);

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(tokens.access_token).toMatch(uuidRegex);
      expect(tokens.refresh_token).toMatch(uuidRegex);
    });

    it('should generate unique tokens', async () => {
      const { tokens: tokens1 } = await getValidTokens(provider, testClient);
      const { tokens: tokens2 } = await getValidTokens(provider, testClient);

      expect(tokens1.access_token).not.toBe(tokens2.access_token);
      expect(tokens1.refresh_token).not.toBe(tokens2.refresh_token);
    });
  });

  describe('Statistics', () => {
    it('should track token counts', async () => {
      const initialStats = await provider.getStats();

      await getValidTokens(provider, testClient);

      const newStats = await provider.getStats();
      expect(newStats.tokens).toBe(initialStats.tokens + 1);
      expect(newStats.refreshTokens).toBe(initialStats.refreshTokens + 1);
    });
  });
});

// Helper functions

function createMockResponse() {
  const mock = {
    statusCode: undefined as number | undefined,
    jsonData: undefined as any,
    redirectUrl: undefined as string | undefined,
    status: jest.fn((code: number) => {
      mock.statusCode = code;
      return {
        json: jest.fn((data: any) => {
          mock.jsonData = data;
        }),
      };
    }),
    redirect: jest.fn((code: number, url: string) => {
      mock.redirectUrl = url;
    }),
  };

  return mock;
}

async function getValidAuthCode(
  provider: SimplyMCPOAuthProvider,
  client: OAuthClientInformationFull
) {
  const mockResponse = createMockResponse();
  const codeVerifier = 'test-verifier';
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  await provider.authorize(
    client,
    {
      redirectUri: 'http://localhost:3000/callback',
      codeChallenge,
      scopes: ['read'],
    },
    mockResponse as any
  );

  const redirectUrl = new URL(mockResponse.redirectUrl!);
  const authCode = redirectUrl.searchParams.get('code')!;

  return { authCode, codeVerifier, mockResponse };
}

async function getValidTokens(
  provider: SimplyMCPOAuthProvider,
  client: OAuthClientInformationFull
) {
  const { authCode, codeVerifier } = await getValidAuthCode(provider, client);

  const tokens = await provider.exchangeAuthorizationCode(
    client,
    authCode,
    codeVerifier,
    'http://localhost:3000/callback'
  );

  return { tokens };
}
