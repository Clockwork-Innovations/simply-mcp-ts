/**
 * Scope-to-Permission Mapping Integration Tests
 *
 * Tests OAuth scope mapping to Simply-MCP permissions, including:
 * - Standard scope mappings (read, write, tools:execute, etc.)
 * - Custom scope handling (pass-through)
 * - Permission validation with OAuth scopes
 * - SecurityContext creation from OAuth tokens
 * - Authorization enforcement with scopes
 * - End-to-end OAuth flow with scope checking
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express, { type Express } from 'express';
import request from 'supertest';
import { createHash } from 'crypto';
import { SimplyMCPOAuthProvider } from '../../src/features/auth/oauth/SimplyMCPOAuthProvider.js';
import { createOAuthRouter, createOAuthMiddleware, type MCPRequest } from '../../src/features/auth/oauth/router.js';
import { mapScopesToPermissions } from '../../src/features/auth/security/AccessControl.js';
import { PermissionChecker } from '../../src/features/auth/security/AccessControl.js';
import type { SecurityContext } from '../../src/features/auth/security/types.js';

describe('Scope-to-Permission Mapping', () => {
  let app: Express;
  let provider: SimplyMCPOAuthProvider;
  let permissionChecker: PermissionChecker;

  // Helper to generate PKCE code challenge
  function generateCodeChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url');
  }

  // Helper to generate access token directly via provider (bypassing OAuth flow)
  // This is necessary because the MCP SDK router doesn't expose testable OAuth endpoints
  async function getAccessToken(scopes: string[]): Promise<string> {
    const clientId = 'test-client';
    const clientSecret = 'test-secret';
    const redirectUri = 'http://localhost:3000/callback';
    const codeVerifier = 'test-code-verifier-with-enough-entropy-here';
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const mockClient = {
      client_id: clientId,
      redirect_uris: [redirectUri],
    };

    const mockRes = {
      redirect: (code: number, url: string) => {
        const urlObj = new URL(url);
        mockRes.authCode = urlObj.searchParams.get('code') || '';
      },
      authCode: '',
    } as any;

    // Step 1: Authorize (via provider directly)
    await provider.authorize(
      mockClient,
      {
        redirectUri,
        scopes,
        codeChallenge,
        state: 'test-state',
      },
      mockRes
    );

    const authCode = mockRes.authCode;
    expect(authCode).toBeTruthy();

    // Step 2: Exchange code for token
    const tokens = await provider.exchangeAuthorizationCode(
      mockClient,
      authCode,
      codeVerifier,
      redirectUri
    );

    expect(tokens.access_token).toBeTruthy();
    return tokens.access_token;
  }

  beforeAll(async () => {
    // Create provider with comprehensive scopes
    provider = new SimplyMCPOAuthProvider({
      clients: [
        {
          clientId: 'test-client',
          clientSecret: 'test-secret',
          redirectUris: ['http://localhost:3000/callback'],
          scopes: [
            'read',
            'write',
            'tools:execute',
            'resources:read',
            'prompts:read',
            'admin',
            'custom:feature',
            'custom:analytics',
          ],
        },
      ],
    });
    await provider.initialize();

    // Create permission checker
    permissionChecker = new PermissionChecker();

    // Create Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Mount OAuth router
    const oauthRouter = createOAuthRouter({
      provider,
      issuerUrl: 'http://localhost:3000',
    });
    app.use(oauthRouter);

    // Protected endpoints that check different permissions
    app.get(
      '/protected/tool',
      createOAuthMiddleware({ provider }),
      (req, res) => {
        const mcpReq = req as MCPRequest;
        const context = mcpReq.mcpContext;

        if (!context) {
          return res.status(500).json({ error: 'No security context' });
        }

        // Check if user has permission to execute tools
        const hasPermission = permissionChecker.hasPermission(context, 'tools:test-tool');

        if (!hasPermission) {
          return res.status(403).json({
            error: 'forbidden',
            message: 'Missing required permission: tools:test-tool',
            permissions: context.permissions,
          });
        }

        res.json({
          message: 'Tool executed',
          permissions: context.permissions,
        });
      }
    );

    app.get(
      '/protected/resource',
      createOAuthMiddleware({ provider }),
      (req, res) => {
        const mcpReq = req as MCPRequest;
        const context = mcpReq.mcpContext;

        if (!context) {
          return res.status(500).json({ error: 'No security context' });
        }

        // Check if user has permission to read resources
        const hasPermission = permissionChecker.hasPermission(context, 'resources:test-resource');

        if (!hasPermission) {
          return res.status(403).json({
            error: 'forbidden',
            message: 'Missing required permission: resources:test-resource',
            permissions: context.permissions,
          });
        }

        res.json({
          message: 'Resource accessed',
          permissions: context.permissions,
        });
      }
    );

    app.get(
      '/protected/context',
      createOAuthMiddleware({ provider }),
      (req, res) => {
        const mcpReq = req as MCPRequest;
        const context = mcpReq.mcpContext;

        if (!context) {
          return res.status(500).json({ error: 'No security context' });
        }

        res.json({
          authenticated: context.authenticated,
          permissions: context.permissions,
          ipAddress: context.ipAddress,
          createdAt: context.createdAt,
        });
      }
    );
  });

  afterAll(() => {
    // Clean up
  });

  describe('Scope Mapping Logic', () => {
    it('should map standard "read" scope to "read:*" permission', () => {
      const permissions = mapScopesToPermissions(['read']);
      expect(permissions).toEqual(['read:*']);
    });

    it('should map standard "write" scope to "write:*" permission', () => {
      const permissions = mapScopesToPermissions(['write']);
      expect(permissions).toEqual(['write:*']);
    });

    it('should map "tools:execute" scope to "tools:*" permission', () => {
      const permissions = mapScopesToPermissions(['tools:execute']);
      expect(permissions).toEqual(['tools:*']);
    });

    it('should map "resources:read" scope to "resources:*" permission', () => {
      const permissions = mapScopesToPermissions(['resources:read']);
      expect(permissions).toEqual(['resources:*']);
    });

    it('should map "prompts:read" scope to "prompts:*" permission', () => {
      const permissions = mapScopesToPermissions(['prompts:read']);
      expect(permissions).toEqual(['prompts:*']);
    });

    it('should map "admin" scope to "*" permission (full access)', () => {
      const permissions = mapScopesToPermissions(['admin']);
      expect(permissions).toEqual(['*']);
    });

    it('should pass through custom scopes unchanged', () => {
      const permissions = mapScopesToPermissions(['custom:feature']);
      expect(permissions).toEqual(['custom:feature']);
    });

    it('should combine multiple scopes correctly', () => {
      const permissions = mapScopesToPermissions(['read', 'tools:execute', 'custom:feature']);
      expect(permissions).toContain('read:*');
      expect(permissions).toContain('tools:*');
      expect(permissions).toContain('custom:feature');
      expect(permissions.length).toBe(3);
    });

    it('should deduplicate permissions when mapping', () => {
      const permissions = mapScopesToPermissions(['read', 'read', 'write']);
      expect(permissions).toEqual(['read:*', 'write:*']);
    });

    it('should handle empty scopes array gracefully', () => {
      const permissions = mapScopesToPermissions([]);
      expect(permissions).toEqual([]);
    });
  });

  describe('Permission Validation with OAuth Scopes', () => {
    it('should grant tool access with "tools:execute" scope', () => {
      const context: SecurityContext = {
        authenticated: true,
        permissions: mapScopesToPermissions(['tools:execute']),
        createdAt: Date.now(),
      };

      const hasPermission = permissionChecker.hasPermission(context, 'tools:test-tool');
      expect(hasPermission).toBe(true);
    });

    it('should grant resource access with "resources:read" scope', () => {
      const context: SecurityContext = {
        authenticated: true,
        permissions: mapScopesToPermissions(['resources:read']),
        createdAt: Date.now(),
      };

      const hasPermission = permissionChecker.hasPermission(context, 'resources:test-resource');
      expect(hasPermission).toBe(true);
    });

    it('should deny tool access with only "read" scope', () => {
      const context: SecurityContext = {
        authenticated: true,
        permissions: mapScopesToPermissions(['read']),
        createdAt: Date.now(),
      };

      const hasPermission = permissionChecker.hasPermission(context, 'tools:test-tool');
      expect(hasPermission).toBe(false);
    });

    it('should grant all access with "admin" scope', () => {
      const context: SecurityContext = {
        authenticated: true,
        permissions: mapScopesToPermissions(['admin']),
        createdAt: Date.now(),
      };

      expect(permissionChecker.hasPermission(context, 'tools:test-tool')).toBe(true);
      expect(permissionChecker.hasPermission(context, 'resources:test')).toBe(true);
      expect(permissionChecker.hasPermission(context, 'prompts:test')).toBe(true);
      expect(permissionChecker.hasPermission(context, 'anything:else')).toBe(true);
    });

    it('should handle custom scopes in permission checks', () => {
      const context: SecurityContext = {
        authenticated: true,
        permissions: mapScopesToPermissions(['custom:feature']),
        createdAt: Date.now(),
      };

      const hasPermission = permissionChecker.hasPermission(context, 'custom:feature');
      expect(hasPermission).toBe(true);
    });
  });

  describe('SecurityContext Creation from OAuth Token', () => {
    it('should create SecurityContext with mapped permissions from token scopes', async () => {
      const accessToken = await getAccessToken(['read', 'tools:execute']);

      const response = await request(app)
        .get('/protected/context')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.authenticated).toBe(true);
      expect(response.body.permissions).toContain('read:*');
      expect(response.body.permissions).toContain('tools:*');
      expect(response.body.createdAt).toBeTruthy();
    });

    it('should include IP address and user agent in SecurityContext', async () => {
      const accessToken = await getAccessToken(['read']);

      const response = await request(app)
        .get('/protected/context')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('User-Agent', 'TestClient/1.0')
        .expect(200);

      expect(response.body.ipAddress).toBeTruthy();
    });
  });

  describe('Tool Authorization with Scopes', () => {
    it('should allow tool execution with "tools:execute" scope', async () => {
      const accessToken = await getAccessToken(['tools:execute']);

      const response = await request(app)
        .get('/protected/tool')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Tool executed');
      expect(response.body.permissions).toContain('tools:*');
    });

    it('should deny tool execution with only "read" scope', async () => {
      const accessToken = await getAccessToken(['read']);

      const response = await request(app)
        .get('/protected/tool')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.error).toBe('forbidden');
      expect(response.body.message).toContain('Missing required permission');
    });

    it('should allow tool execution with "admin" scope', async () => {
      const accessToken = await getAccessToken(['admin']);

      const response = await request(app)
        .get('/protected/tool')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Tool executed');
      expect(response.body.permissions).toContain('*');
    });
  });

  describe('Resource Authorization with Scopes', () => {
    it('should allow resource access with "resources:read" scope', async () => {
      const accessToken = await getAccessToken(['resources:read']);

      const response = await request(app)
        .get('/protected/resource')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Resource accessed');
      expect(response.body.permissions).toContain('resources:*');
    });

    it('should deny resource access with only "tools:execute" scope', async () => {
      const accessToken = await getAccessToken(['tools:execute']);

      const response = await request(app)
        .get('/protected/resource')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.error).toBe('forbidden');
    });
  });

  describe('Scope Violations', () => {
    it('should deny access when token has no relevant scopes', async () => {
      const accessToken = await getAccessToken(['custom:feature']);

      // Try to access tool endpoint
      const toolResponse = await request(app)
        .get('/protected/tool')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(toolResponse.body.error).toBe('forbidden');

      // Try to access resource endpoint
      const resourceResponse = await request(app)
        .get('/protected/resource')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(resourceResponse.body.error).toBe('forbidden');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/protected/tool')
        .set('Authorization', 'Bearer invalid-token-here');

      expect([400, 401]).toContain(response.status);
    });

    it('should deny access without Authorization header', async () => {
      const response = await request(app)
        .get('/protected/tool');

      expect(response.status).toBe(401);
    });
  });

  describe('Multiple Scopes Combined', () => {
    it('should grant access to multiple resources with combined scopes', async () => {
      const accessToken = await getAccessToken(['tools:execute', 'resources:read']);

      // Should access tool endpoint
      const toolResponse = await request(app)
        .get('/protected/tool')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(toolResponse.body.message).toBe('Tool executed');

      // Should access resource endpoint
      const resourceResponse = await request(app)
        .get('/protected/resource')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(resourceResponse.body.message).toBe('Resource accessed');
    });
  });

  describe('End-to-End Scope Enforcement', () => {
    it('should enforce scopes through complete OAuth flow to tool call', async () => {
      // Complete OAuth flow with limited scope
      const limitedToken = await getAccessToken(['read']);

      // Verify context created correctly
      const contextResponse = await request(app)
        .get('/protected/context')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(200);

      expect(contextResponse.body.authenticated).toBe(true);
      expect(contextResponse.body.permissions).toEqual(['read:*']);

      // Verify scope enforcement - should deny tool access
      const toolResponse = await request(app)
        .get('/protected/tool')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403);

      expect(toolResponse.body.error).toBe('forbidden');
      expect(toolResponse.body.permissions).toEqual(['read:*']);
    });

    it('should enforce admin scope grants all permissions', async () => {
      const adminToken = await getAccessToken(['admin']);

      // Should access tool endpoint
      await request(app)
        .get('/protected/tool')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should access resource endpoint
      await request(app)
        .get('/protected/resource')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify admin permission in context
      const contextResponse = await request(app)
        .get('/protected/context')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(contextResponse.body.permissions).toEqual(['*']);
    });
  });
});
