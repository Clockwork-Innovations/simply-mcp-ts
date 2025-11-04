/**
 * OAuth Router Demo
 *
 * Demonstrates how to use the OAuth router wrapper with MCP SDK
 *
 * Usage:
 *   npx tsx examples/oauth-router-demo.ts
 *
 * Then visit:
 *   http://localhost:3000/.well-known/oauth-authorization-server
 */

import express from 'express';
import {
  SimplyMCPOAuthProvider,
  createOAuthRouter,
  createOAuthMiddleware,
} from '../src/features/auth/oauth/index.js';

// Create OAuth provider
const provider = new SimplyMCPOAuthProvider({
  clients: [
    {
      clientId: 'demo-client',
      clientSecret: 'demo-secret-12345',
      redirectUris: ['http://localhost:3000/callback'],
      scopes: ['read', 'write', 'admin'],
    },
    {
      clientId: 'mobile-app',
      clientSecret: 'mobile-secret-67890',
      redirectUris: ['myapp://callback'],
      scopes: ['read', 'write'],
    },
  ],
  tokenExpiration: 3600, // 1 hour
  refreshTokenExpiration: 86400, // 24 hours
  codeExpiration: 600, // 10 minutes
});

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount OAuth router
const oauthRouter = createOAuthRouter({
  provider,
  issuerUrl: 'http://localhost:3000',
  scopesSupported: ['read', 'write', 'admin'],
  resourceName: 'Demo MCP Server',
  serviceDocumentationUrl: 'http://localhost:3000/docs',
});

app.use(oauthRouter);

// Public endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'OAuth Router Demo',
    endpoints: {
      metadata: '/.well-known/oauth-authorization-server',
      protected: '/protected',
      protectedWrite: '/protected/write',
    },
    docs: 'http://localhost:3000/docs',
  });
});

app.get('/docs', (req, res) => {
  res.json({
    title: 'OAuth Router Demo Documentation',
    description: 'Demonstrates Simply-MCP OAuth integration',
    oauth: {
      issuer: 'http://localhost:3000',
      metadata_endpoint: '/.well-known/oauth-authorization-server',
    },
    clients: [
      {
        client_id: 'demo-client',
        scopes: ['read', 'write', 'admin'],
        note: 'Use client secret: demo-secret-12345',
      },
      {
        client_id: 'mobile-app',
        scopes: ['read', 'write'],
        note: 'Use client secret: mobile-secret-67890',
      },
    ],
  });
});

// Protected endpoints
app.get('/protected', createOAuthMiddleware({ provider }), (req, res) => {
  res.json({
    message: 'This is a protected resource',
    scope: 'read',
    timestamp: new Date().toISOString(),
  });
});

app.get('/protected/write', createOAuthMiddleware({ provider }), (req, res) => {
  res.json({
    message: 'This is a write-protected resource',
    scope: 'write',
    timestamp: new Date().toISOString(),
  });
});

app.get('/protected/admin', createOAuthMiddleware({ provider }), (req, res) => {
  res.json({
    message: 'This is an admin-only resource',
    scope: 'admin',
    timestamp: new Date().toISOString(),
  });
});

// Stats endpoint (for demo purposes)
app.get('/stats', (req, res) => {
  const stats = provider.getStats();
  res.json({
    provider: 'SimplyMCPOAuthProvider',
    stats,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 OAuth Router Demo Server running on http://localhost:${PORT}\n`);
  console.log('Available endpoints:');
  console.log(`  • Home:     http://localhost:${PORT}/`);
  console.log(`  • Docs:     http://localhost:${PORT}/docs`);
  console.log(`  • Metadata: http://localhost:${PORT}/.well-known/oauth-authorization-server`);
  console.log(`  • Stats:    http://localhost:${PORT}/stats`);
  console.log(`  • Protected: http://localhost:${PORT}/protected (requires Bearer token)`);
  console.log('\nRegistered clients:');
  console.log('  • demo-client (secret: demo-secret-12345)');
  console.log('  • mobile-app (secret: mobile-secret-67890)');
  console.log('');
});
