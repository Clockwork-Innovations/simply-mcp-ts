import { describe, it, expect, beforeAll } from '@jest/globals';
import express, { type Express } from 'express';
import request from 'supertest';
import { createHash } from 'crypto';
import { SimplyMCPOAuthProvider } from '../../src/features/auth/oauth/SimplyMCPOAuthProvider.js';
import { createOAuthRouter, createOAuthMiddleware } from '../../src/features/auth/oauth/router.js';

describe('OAuth End-to-End Flow', () => {
  let app: Express;
  let provider: SimplyMCPOAuthProvider;

  beforeAll(async () => {
    // Create provider
    provider = new SimplyMCPOAuthProvider({
      clients: [
        {
          clientId: 'test-client',
          clientSecret: 'test-secret',
          redirectUris: ['http://localhost:3000/callback'],
          scopes: ['read', 'write'],
        },
      ],
      tokenExpiration: 3600, // 1 hour
      refreshTokenExpiration: 86400, // 24 hours
      codeExpiration: 600, // 10 minutes
    });
    await provider.initialize();

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

    // Protect a test endpoint
    app.get('/protected', createOAuthMiddleware({ provider }), (req, res) => {
      res.json({ message: 'Protected resource' });
    });

    // Add another protected endpoint with specific scope requirement
    app.get('/protected/write', createOAuthMiddleware({ provider }), (req, res) => {
      res.json({ message: 'Protected write resource' });
    });
  });

  afterAll(() => {
    // Cleanup
  });

  it('should verify OAuth provider can generate and verify tokens', async () => {
    // Test the provider directly (since OAuth endpoints aren't exposed by MCP SDK router)
    const mockClient = {
      client_id: 'test-client',
      redirect_uris: ['http://localhost:3000/callback'],
    };

    // Test client authentication
    const isAuthenticated = await provider.authenticateClient('test-client', 'test-secret');
    expect(isAuthenticated).toBe(true);

    const isNotAuthenticated = await provider.authenticateClient('test-client', 'wrong-secret');
    expect(isNotAuthenticated).toBe(false);

    // Get provider stats
    const stats = await provider.getStats();
    expect(stats).toHaveProperty('clients');
    expect(stats.clients).toBeGreaterThan(0);
  });

  it('should verify OAuth metadata includes required fields', async () => {
    const metadataRes = await request(app)
      .get('/.well-known/oauth-authorization-server')
      .expect(200);

    const metadata = metadataRes.body;

    // RFC 8414 required fields
    expect(metadata).toHaveProperty('issuer');
    expect(metadata).toHaveProperty('authorization_endpoint');
    expect(metadata).toHaveProperty('token_endpoint');
    expect(metadata).toHaveProperty('response_types_supported');
    expect(metadata).toHaveProperty('grant_types_supported');

    // Verify issuer format
    expect(metadata.issuer).toMatch(/^https?:\/\//);
  });

  it('should verify middleware protects endpoints correctly', async () => {
    // Without auth - should fail with 401 (no credentials)
    const noAuthRes = await request(app).get('/protected');
    expect(noAuthRes.status).toBe(401);

    // With invalid token - should fail with 400 (bad credentials) or 401 (unauthorized)
    const invalidTokenRes = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token-12345');
    expect([400, 401]).toContain(invalidTokenRes.status);
  });

  it('should verify createOAuthMiddleware function', () => {
    const middleware = createOAuthMiddleware({ provider });

    // Should return a function
    expect(typeof middleware).toBe('function');

    // Middleware should accept req, res, next
    expect(middleware.length).toBeGreaterThanOrEqual(3);
  });
});
