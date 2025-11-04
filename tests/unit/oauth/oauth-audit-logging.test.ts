/**
 * OAuth Audit Logging Tests
 *
 * Comprehensive security tests for OAuth audit logging.
 * Verifies that:
 * 1. All OAuth events are logged correctly
 * 2. No sensitive data (tokens, secrets, codes) appears in logs
 * 3. All required metadata is captured
 * 4. Events can be correlated by client ID
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SimplyMCPOAuthProvider } from '../../../src/features/auth/oauth/SimplyMCPOAuthProvider.js';
import { AuditLogger } from '../../../src/features/auth/security/AuditLogger.js';
import type { OAuthProviderConfig } from '../../../src/features/auth/oauth/types.js';
import type { AuditConfig, AuditEventType } from '../../../src/features/auth/security/types.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { Response } from 'express';
import { createHash } from 'crypto';

describe('OAuth Audit Logging', () => {
  let provider: SimplyMCPOAuthProvider;
  let auditLogger: AuditLogger;
  let capturedLogs: Array<{
    eventType: AuditEventType;
    result: 'success' | 'failure' | 'warning';
    details?: any;
  }>;

  const TEST_CLIENT_ID = 'test-client-123';
  const TEST_CLIENT_SECRET = 'test-secret-456';
  const TEST_REDIRECT_URI = 'http://localhost:3000/callback';
  const TEST_SCOPES = ['tools:read', 'resources:write'];

  // Helper function to create client info (no need to fetch from store)
  function getClientInfo(clientId: string): OAuthClientInformationFull {
    if (clientId === TEST_CLIENT_ID) {
      return {
        client_id: TEST_CLIENT_ID,
        redirect_uris: [TEST_REDIRECT_URI],
      };
    }
    throw new Error(`Unknown client ID: ${clientId}`);
  }

  beforeEach(async () => {
    // Reset captured logs
    capturedLogs = [];

    // Create audit logger that captures logs in memory
    const auditConfig: AuditConfig = {
      enabled: true,
      logFile: '/tmp/test-audit.log',
      logToConsole: false,
      includeSensitiveData: false,
    };

    auditLogger = new AuditLogger(auditConfig);

    // Mock the log method to capture logs
    const originalLog = auditLogger.log.bind(auditLogger);
    auditLogger.log = jest.fn((eventType: AuditEventType, result: 'success' | 'failure' | 'warning', context, details) => {
      capturedLogs.push({ eventType, result, details });
      return originalLog(eventType, result, context, details);
    }) as any;

    // Create OAuth provider with audit logger
    const providerConfig: OAuthProviderConfig = {
      clients: [
        {
          clientId: TEST_CLIENT_ID,
          clientSecret: TEST_CLIENT_SECRET,
          redirectUris: [TEST_REDIRECT_URI],
          scopes: TEST_SCOPES,
        },
      ],
      tokenExpiration: 3600,
      refreshTokenExpiration: 86400,
      codeExpiration: 600,
    };

    provider = new SimplyMCPOAuthProvider(providerConfig, auditLogger);
    await provider.initialize();
  });

  afterEach(async () => {
    // Clean up audit logger to stop timer
    auditLogger.close();
    // Clean up storage
    if (provider) {
      await provider['storage'].disconnect();
    }
  });

  describe('Authorization Events', () => {
    it('should log oauth.authorization.requested when authorization starts', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeChallenge = createHash('sha256')
        .update('test-verifier')
        .digest('base64url');

      const mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
          state: 'test-state',
        },
        mockResponse
      );

      const requestedEvent = capturedLogs.find(
        (log) => log.eventType === 'oauth.authorization.requested'
      );
      expect(requestedEvent).toBeDefined();
      expect(requestedEvent?.result).toBe('success');
      expect(requestedEvent?.details?.clientId).toBe(TEST_CLIENT_ID);
      expect(requestedEvent?.details?.scopes).toEqual(TEST_SCOPES);
    });

    it('should log oauth.authorization.granted when authorization succeeds', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeChallenge = createHash('sha256')
        .update('test-verifier')
        .digest('base64url');

      const mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
        },
        mockResponse
      );

      const grantedEvent = capturedLogs.find(
        (log) => log.eventType === 'oauth.authorization.granted'
      );
      expect(grantedEvent).toBeDefined();
      expect(grantedEvent?.result).toBe('success');
      expect(grantedEvent?.details?.clientId).toBe(TEST_CLIENT_ID);
      expect(grantedEvent?.details?.scopes).toEqual(TEST_SCOPES);
      expect(grantedEvent?.details?.codeId).toMatch(/^[a-f0-9]{8}\.\.\./);
    });

    it('should log oauth.authorization.denied for invalid redirect URI', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeChallenge = createHash('sha256')
        .update('test-verifier')
        .digest('base64url');

      const mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any as Response;

      await expect(
        provider.authorize(
          client,
          {
            redirectUri: 'http://evil.com/callback', // Invalid URI
            scopes: TEST_SCOPES,
            codeChallenge,
          },
          mockResponse
        )
      ).rejects.toThrow('Invalid redirect_uri');

      const deniedEvent = capturedLogs.find(
        (log) => log.eventType === 'oauth.authorization.denied'
      );
      expect(deniedEvent).toBeDefined();
      expect(deniedEvent?.result).toBe('failure');
      expect(deniedEvent?.details?.error).toContain('redirect_uri');
    });

    it('should log oauth.authorization.denied for invalid scopes', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeChallenge = createHash('sha256')
        .update('test-verifier')
        .digest('base64url');

      const mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: ['admin:all'], // Scope not allowed
          codeChallenge,
        },
        mockResponse
      );

      const deniedEvent = capturedLogs.find(
        (log) => log.eventType === 'oauth.authorization.denied'
      );
      expect(deniedEvent).toBeDefined();
      expect(deniedEvent?.result).toBe('failure');
      expect(deniedEvent?.details?.error).toContain('scope');
    });
  });

  describe('Token Issuance Events', () => {
    it('should log oauth.token.issued when exchanging authorization code', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeVerifier = 'test-verifier';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      // First, get authorization code
      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
        },
        mockResponse
      );

      // Extract code from redirect URL
      const redirectUrl = new URL((mockResponse.redirect as any).mock.calls[0][1]);
      const authCode = redirectUrl.searchParams.get('code')!;

      // Clear previous logs
      capturedLogs = [];

      // Exchange code for token
      await provider.exchangeAuthorizationCode(
        client,
        authCode,
        codeVerifier,
        TEST_REDIRECT_URI
      );

      const issuedEvent = capturedLogs.find(
        (log) => log.eventType === 'oauth.token.issued'
      );
      expect(issuedEvent).toBeDefined();
      expect(issuedEvent?.result).toBe('success');
      expect(issuedEvent?.details?.clientId).toBe(TEST_CLIENT_ID);
      expect(issuedEvent?.details?.scopes).toEqual(TEST_SCOPES);
      expect(issuedEvent?.details?.tokenId).toMatch(/^[a-f0-9]{8}\.\.\./);
    });

    it('should log oauth.token.issued failure for invalid authorization code', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);

      await expect(
        provider.exchangeAuthorizationCode(
          client,
          'invalid-code',
          'test-verifier'
        )
      ).rejects.toThrow();

      const failureEvent = capturedLogs.find(
        (log) =>
          log.eventType === 'oauth.token.issued' && log.result === 'failure'
      );
      expect(failureEvent).toBeDefined();
      expect(failureEvent?.details?.error).toContain('Invalid authorization code');
    });

    it('should log oauth.token.issued failure for PKCE validation failure', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeVerifier = 'test-verifier';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      // Get authorization code
      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
        },
        mockResponse
      );

      const redirectUrl = new URL((mockResponse.redirect as any).mock.calls[0][1]);
      const authCode = redirectUrl.searchParams.get('code')!;

      capturedLogs = [];

      // Try with wrong verifier
      await expect(
        provider.exchangeAuthorizationCode(
          client,
          authCode,
          'wrong-verifier',
          TEST_REDIRECT_URI
        )
      ).rejects.toThrow();

      const failureEvent = capturedLogs.find(
        (log) =>
          log.eventType === 'oauth.token.issued' && log.result === 'failure'
      );
      expect(failureEvent).toBeDefined();
      expect(failureEvent?.details?.error).toContain('PKCE');
    });
  });

  describe('Token Validation Events', () => {
    it('should log oauth.token.validation.success for valid token', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeVerifier = 'test-verifier';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      // Get authorization code and exchange for token
      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
        },
        mockResponse
      );

      const redirectUrl = new URL((mockResponse.redirect as any).mock.calls[0][1]);
      const authCode = redirectUrl.searchParams.get('code')!;

      const tokens = await provider.exchangeAuthorizationCode(
        client,
        authCode,
        codeVerifier,
        TEST_REDIRECT_URI
      );

      capturedLogs = [];

      // Verify token
      await provider.verifyAccessToken(tokens.access_token);

      const validationEvent = capturedLogs.find(
        (log) => log.eventType === 'oauth.token.validation.success'
      );
      expect(validationEvent).toBeDefined();
      expect(validationEvent?.result).toBe('success');
      expect(validationEvent?.details?.clientId).toBe(TEST_CLIENT_ID);
      expect(validationEvent?.details?.scopes).toEqual(TEST_SCOPES);
    });

    it('should log oauth.token.validation.failed for invalid token', async () => {
      await expect(provider.verifyAccessToken('invalid-token')).rejects.toThrow();

      const failureEvent = capturedLogs.find(
        (log) => log.eventType === 'oauth.token.validation.failed'
      );
      expect(failureEvent).toBeDefined();
      expect(failureEvent?.result).toBe('failure');
      expect(failureEvent?.details?.error).toContain('Invalid access token');
    });
  });

  describe('Token Refresh Events', () => {
    it('should log oauth.token.refreshed when refreshing token', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeVerifier = 'test-verifier';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      // Get tokens
      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
        },
        mockResponse
      );

      const redirectUrl = new URL((mockResponse.redirect as any).mock.calls[0][1]);
      const authCode = redirectUrl.searchParams.get('code')!;

      const tokens = await provider.exchangeAuthorizationCode(
        client,
        authCode,
        codeVerifier,
        TEST_REDIRECT_URI
      );

      capturedLogs = [];

      // Refresh token
      await provider.exchangeRefreshToken(client, tokens.refresh_token!);

      const refreshEvent = capturedLogs.find(
        (log) => log.eventType === 'oauth.token.refreshed'
      );
      expect(refreshEvent).toBeDefined();
      expect(refreshEvent?.result).toBe('success');
      expect(refreshEvent?.details?.clientId).toBe(TEST_CLIENT_ID);
      expect(refreshEvent?.details?.scopes).toEqual(TEST_SCOPES);
    });

    it('should log oauth.token.refreshed failure for invalid refresh token', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);

      await expect(
        provider.exchangeRefreshToken(client, 'invalid-refresh-token')
      ).rejects.toThrow();

      const failureEvent = capturedLogs.find(
        (log) =>
          log.eventType === 'oauth.token.refreshed' && log.result === 'failure'
      );
      expect(failureEvent).toBeDefined();
      expect(failureEvent?.details?.error).toContain('Invalid refresh token');
    });
  });

  describe('Token Revocation Events', () => {
    it('should log oauth.token.revoked when revoking access token', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeVerifier = 'test-verifier';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      // Get tokens
      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
        },
        mockResponse
      );

      const redirectUrl = new URL((mockResponse.redirect as any).mock.calls[0][1]);
      const authCode = redirectUrl.searchParams.get('code')!;

      const tokens = await provider.exchangeAuthorizationCode(
        client,
        authCode,
        codeVerifier,
        TEST_REDIRECT_URI
      );

      capturedLogs = [];

      // Revoke access token
      await provider.revokeToken(client, {
        token: tokens.access_token,
        token_type_hint: 'access_token',
      });

      const revokeEvent = capturedLogs.find(
        (log) => log.eventType === 'oauth.token.revoked'
      );
      expect(revokeEvent).toBeDefined();
      expect(revokeEvent?.result).toBe('success');
      expect(revokeEvent?.details?.clientId).toBe(TEST_CLIENT_ID);
      expect(revokeEvent?.details?.tokenType).toBe('access_token');
    });

    it('should log oauth.token.revoked when revoking refresh token', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeVerifier = 'test-verifier';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      // Get tokens
      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
        },
        mockResponse
      );

      const redirectUrl = new URL((mockResponse.redirect as any).mock.calls[0][1]);
      const authCode = redirectUrl.searchParams.get('code')!;

      const tokens = await provider.exchangeAuthorizationCode(
        client,
        authCode,
        codeVerifier,
        TEST_REDIRECT_URI
      );

      capturedLogs = [];

      // Revoke refresh token
      await provider.revokeToken(client, {
        token: tokens.refresh_token!,
        token_type_hint: 'refresh_token',
      });

      const revokeEvent = capturedLogs.find(
        (log) => log.eventType === 'oauth.token.revoked'
      );
      expect(revokeEvent).toBeDefined();
      expect(revokeEvent?.result).toBe('success');
      expect(revokeEvent?.details?.tokenType).toBe('refresh_token');
    });
  });

  describe('Sensitive Data Filtering', () => {
    it('should NEVER log full access tokens', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeVerifier = 'test-verifier';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
        },
        mockResponse
      );

      const redirectUrl = new URL((mockResponse.redirect as any).mock.calls[0][1]);
      const authCode = redirectUrl.searchParams.get('code')!;

      const tokens = await provider.exchangeAuthorizationCode(
        client,
        authCode,
        codeVerifier,
        TEST_REDIRECT_URI
      );

      // Check all logs
      for (const log of capturedLogs) {
        const logStr = JSON.stringify(log);
        // Full access token should NOT appear in any log
        expect(logStr).not.toContain(tokens.access_token);
        // Only the first 8 chars + '...' should appear
        if (logStr.includes(tokens.access_token.substring(0, 8))) {
          expect(logStr).toContain('...');
        }
      }
    });

    it('should NEVER log full refresh tokens', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeVerifier = 'test-verifier';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
        },
        mockResponse
      );

      const redirectUrl = new URL((mockResponse.redirect as any).mock.calls[0][1]);
      const authCode = redirectUrl.searchParams.get('code')!;

      const tokens = await provider.exchangeAuthorizationCode(
        client,
        authCode,
        codeVerifier,
        TEST_REDIRECT_URI
      );

      // Check all logs
      for (const log of capturedLogs) {
        const logStr = JSON.stringify(log);
        // Full refresh token should NOT appear in any log
        expect(logStr).not.toContain(tokens.refresh_token!);
      }
    });

    it('should NEVER log full authorization codes', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeChallenge = createHash('sha256')
        .update('test-verifier')
        .digest('base64url');

      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
        },
        mockResponse
      );

      const redirectUrl = new URL((mockResponse.redirect as any).mock.calls[0][1]);
      const authCode = redirectUrl.searchParams.get('code')!;

      // Check all logs
      for (const log of capturedLogs) {
        const logStr = JSON.stringify(log);
        // Full authorization code should NOT appear in any log
        expect(logStr).not.toContain(authCode);
        // Only the first 8 chars + '...' should appear
        if (logStr.includes(authCode.substring(0, 8))) {
          expect(logStr).toContain('...');
        }
      }
    });

    it('should NEVER log code verifiers', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeVerifier = 'super-secret-verifier-12345';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
        },
        mockResponse
      );

      const redirectUrl = new URL((mockResponse.redirect as any).mock.calls[0][1]);
      const authCode = redirectUrl.searchParams.get('code')!;

      await provider.exchangeAuthorizationCode(
        client,
        authCode,
        codeVerifier,
        TEST_REDIRECT_URI
      );

      // Check all logs
      for (const log of capturedLogs) {
        const logStr = JSON.stringify(log);
        // Code verifier should NEVER appear in logs
        expect(logStr).not.toContain(codeVerifier);
      }
    });

    it('should NEVER log client secrets', async () => {
      // Client secret should never appear in any logs
      for (const log of capturedLogs) {
        const logStr = JSON.stringify(log);
        expect(logStr).not.toContain(TEST_CLIENT_SECRET);
      }
    });
  });

  describe('Log Format Validation', () => {
    it('should include all required fields in audit logs', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeChallenge = createHash('sha256')
        .update('test-verifier')
        .digest('base64url');

      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
        },
        mockResponse
      );

      // Every log entry must have these fields
      for (const log of capturedLogs) {
        expect(log.eventType).toBeDefined();
        expect(log.result).toBeDefined();
        expect(['success', 'failure', 'warning']).toContain(log.result);
      }
    });
  });

  describe('Event Correlation', () => {
    it('should allow tracing full OAuth flow by client ID', async () => {
      const client = getClientInfo(TEST_CLIENT_ID);
      const codeVerifier = 'test-verifier';
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      // Complete OAuth flow
      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      // 1. Authorization
      await provider.authorize(
        client,
        {
          redirectUri: TEST_REDIRECT_URI,
          scopes: TEST_SCOPES,
          codeChallenge,
        },
        mockResponse
      );

      const redirectUrl = new URL((mockResponse.redirect as any).mock.calls[0][1]);
      const authCode = redirectUrl.searchParams.get('code')!;

      // 2. Token issuance
      const tokens = await provider.exchangeAuthorizationCode(
        client,
        authCode,
        codeVerifier,
        TEST_REDIRECT_URI
      );

      // 3. Token validation
      await provider.verifyAccessToken(tokens.access_token);

      // 4. Token refresh
      await provider.exchangeRefreshToken(client, tokens.refresh_token!);

      // All events should have the client ID
      const clientEvents = capturedLogs.filter(
        (log) => log.details?.clientId === TEST_CLIENT_ID
      );

      expect(clientEvents.length).toBeGreaterThan(0);
      expect(clientEvents).toContainEqual(
        expect.objectContaining({
          eventType: 'oauth.authorization.requested',
        })
      );
      expect(clientEvents).toContainEqual(
        expect.objectContaining({
          eventType: 'oauth.authorization.granted',
        })
      );
      expect(clientEvents).toContainEqual(
        expect.objectContaining({
          eventType: 'oauth.token.issued',
        })
      );
      expect(clientEvents).toContainEqual(
        expect.objectContaining({
          eventType: 'oauth.token.validation.success',
        })
      );
      expect(clientEvents).toContainEqual(
        expect.objectContaining({
          eventType: 'oauth.token.refreshed',
        })
      );
    });
  });
});
