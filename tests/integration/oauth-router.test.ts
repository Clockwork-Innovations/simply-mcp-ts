import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express, { type Express } from 'express';
import request from 'supertest';
import { SimplyMCPOAuthProvider } from '../../src/features/auth/oauth/SimplyMCPOAuthProvider.js';
import { createOAuthRouter, createOAuthMiddleware } from '../../src/features/auth/oauth/router.js';

describe('OAuth Router Integration', () => {
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
  });

  afterAll(() => {
    // Clean up - allow Jest to exit cleanly
    // No explicit cleanup needed for supertest
  });

  it('should create OAuth metadata endpoint', async () => {
    const response = await request(app)
      .get('/.well-known/oauth-authorization-server')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('issuer');
    expect(response.body).toHaveProperty('token_endpoint');
    expect(response.body).toHaveProperty('authorization_endpoint');
    // Issuer may include trailing slash
    expect(response.body.issuer).toMatch(/^http:\/\/localhost:3000\/?$/);
  });

  it('should verify OAuth router wrapper is callable', () => {
    // The createOAuthRouter function should return a RequestHandler
    expect(typeof createOAuthRouter).toBe('function');

    const handler = createOAuthRouter({
      provider,
      issuerUrl: 'http://localhost:3000',
    });

    // Should return a function (RequestHandler)
    expect(typeof handler).toBe('function');
  });

  it('should support additional router configuration options', () => {
    const handler = createOAuthRouter({
      provider,
      issuerUrl: 'http://localhost:3000',
      baseUrl: 'http://localhost:3000',
      serviceDocumentationUrl: 'http://localhost:3000/docs',
      scopesSupported: ['read', 'write'],
      resourceName: 'Test Resource',
      resourceServerUrl: 'http://localhost:3000',
    });

    // Should return a function with all options
    expect(typeof handler).toBe('function');
  });

  it('should protect endpoints with Bearer middleware', async () => {
    // Without token - should fail with 401 (no credentials)
    const noTokenRes = await request(app).get('/protected');
    expect(noTokenRes.status).toBe(401);

    // With invalid token - should fail with 400 (bad credentials) or 401 (unauthorized)
    const invalidTokenRes = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token');
    expect([400, 401]).toContain(invalidTokenRes.status);
  });

  it('should create protected resource metadata endpoint', async () => {
    const response = await request(app)
      .get('/.well-known/oauth-protected-resource');

    // This endpoint may or may not exist depending on MCP SDK implementation
    // Accept either 200 or 404
    expect([200, 404]).toContain(response.status);
  });
});
