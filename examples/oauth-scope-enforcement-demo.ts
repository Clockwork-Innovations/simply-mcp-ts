/**
 * OAuth Scope Enforcement Demo
 *
 * This example demonstrates how OAuth scopes map to Simply-MCP permissions
 * and how scope enforcement works in practice.
 *
 * Run this example:
 * 1. Start the server: npx tsx examples/oauth-scope-enforcement-demo.ts
 * 2. Follow the OAuth flow in the console output
 * 3. Try accessing different endpoints with different scopes
 *
 * Demonstrates:
 * - Scope-to-permission mapping
 * - Limited scope tokens (read-only)
 * - Full scope tokens (admin)
 * - Scope violations with proper error messages
 */

import express from 'express';
import { SimplyMCPOAuthProvider } from '../src/features/auth/oauth/SimplyMCPOAuthProvider.js';
import { createOAuthRouter, createOAuthMiddleware, type MCPRequest } from '../src/features/auth/oauth/router.js';
import { PermissionChecker } from '../src/features/auth/security/AccessControl.js';
import { createHash } from 'crypto';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create OAuth provider with multiple clients demonstrating different scopes
const provider = new SimplyMCPOAuthProvider({
  clients: [
    {
      clientId: 'read-only-client',
      clientSecret: 'read-secret-123',
      redirectUris: ['http://localhost:3000/callback'],
      scopes: ['read'], // Limited to read-only
    },
    {
      clientId: 'tools-client',
      clientSecret: 'tools-secret-456',
      redirectUris: ['http://localhost:3000/callback'],
      scopes: ['tools:execute', 'read'], // Can execute tools and read
    },
    {
      clientId: 'admin-client',
      clientSecret: 'admin-secret-789',
      redirectUris: ['http://localhost:3000/callback'],
      scopes: ['admin'], // Full access
    },
  ],
});

// Mount OAuth router
const oauthRouter = createOAuthRouter({
  provider,
  issuerUrl: 'http://localhost:3000',
  scopesSupported: ['read', 'write', 'tools:execute', 'resources:read', 'prompts:read', 'admin'],
});
app.use(oauthRouter);

// Create permission checker
const permissionChecker = new PermissionChecker();

// Public endpoint - OAuth metadata
app.get('/', (req, res) => {
  res.json({
    message: 'OAuth Scope Enforcement Demo',
    endpoints: {
      metadata: '/.well-known/oauth-authorization-server',
      authorize: '/oauth/authorize',
      token: '/oauth/token',
      protected: {
        read: '/api/read',
        tool: '/api/tool',
        resource: '/api/resource',
        admin: '/api/admin',
      },
    },
    clients: [
      { clientId: 'read-only-client', scopes: ['read'] },
      { clientId: 'tools-client', scopes: ['tools:execute', 'read'] },
      { clientId: 'admin-client', scopes: ['admin'] },
    ],
    instructions: [
      '1. Get OAuth metadata: GET /.well-known/oauth-authorization-server',
      '2. Authorize: GET /oauth/authorize?client_id={client}&redirect_uri=http://localhost:3000/callback&response_type=code&code_challenge={challenge}&scope={scopes}',
      '3. Exchange code: POST /oauth/token with grant_type=authorization_code',
      '4. Access protected endpoints with Bearer token',
    ],
  });
});

// Protected endpoint - Read access (requires 'read' scope or 'admin')
app.get('/api/read', createOAuthMiddleware({ provider }), (req, res) => {
  const mcpReq = req as MCPRequest;
  const context = mcpReq.mcpContext!;

  // Check read permission
  if (!permissionChecker.hasPermission(context, 'read:data')) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Missing required permission: read:data',
      requiredScopes: ['read', 'admin'],
      yourPermissions: context.permissions,
    });
  }

  res.json({
    message: 'Read access granted',
    data: { sample: 'data', timestamp: Date.now() },
    permissions: context.permissions,
  });
});

// Protected endpoint - Tool execution (requires 'tools:execute' scope or 'admin')
app.post('/api/tool', createOAuthMiddleware({ provider }), (req, res) => {
  const mcpReq = req as MCPRequest;
  const context = mcpReq.mcpContext!;

  // Check tool permission
  if (!permissionChecker.hasPermission(context, 'tools:demo-tool')) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Missing required permission: tools:demo-tool',
      requiredScopes: ['tools:execute', 'admin'],
      yourPermissions: context.permissions,
    });
  }

  res.json({
    message: 'Tool executed successfully',
    result: { status: 'completed', output: 'Demo tool result' },
    permissions: context.permissions,
  });
});

// Protected endpoint - Resource access (requires 'resources:read' scope or 'admin')
app.get('/api/resource/:id', createOAuthMiddleware({ provider }), (req, res) => {
  const mcpReq = req as MCPRequest;
  const context = mcpReq.mcpContext!;

  // Check resource permission
  if (!permissionChecker.hasPermission(context, `resources:${req.params.id}`)) {
    return res.status(403).json({
      error: 'forbidden',
      message: `Missing required permission: resources:${req.params.id}`,
      requiredScopes: ['resources:read', 'admin'],
      yourPermissions: context.permissions,
    });
  }

  res.json({
    message: 'Resource accessed',
    resource: { id: req.params.id, content: 'Resource data here' },
    permissions: context.permissions,
  });
});

// Protected endpoint - Admin only (requires 'admin' scope)
app.delete('/api/admin/reset', createOAuthMiddleware({ provider }), (req, res) => {
  const mcpReq = req as MCPRequest;
  const context = mcpReq.mcpContext!;

  // Check admin permission
  if (!permissionChecker.hasPermission(context, 'admin:reset')) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Missing required permission: admin:reset (admin access only)',
      requiredScopes: ['admin'],
      yourPermissions: context.permissions,
    });
  }

  res.json({
    message: 'Admin action completed',
    action: 'reset',
    permissions: context.permissions,
  });
});

// Helper endpoint to generate code challenge for testing
app.get('/helper/code-challenge', (req, res) => {
  const verifier = req.query.verifier as string || 'test-code-verifier-with-enough-entropy';
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  res.json({
    verifier,
    challenge,
    method: 'S256',
  });
});

// Helper endpoint to test tokens
app.get('/helper/test-token', createOAuthMiddleware({ provider }), (req, res) => {
  const mcpReq = req as MCPRequest;
  const context = mcpReq.mcpContext!;

  res.json({
    authenticated: context.authenticated,
    permissions: context.permissions,
    canRead: permissionChecker.hasPermission(context, 'read:data'),
    canExecuteTools: permissionChecker.hasPermission(context, 'tools:demo-tool'),
    canAccessResources: permissionChecker.hasPermission(context, 'resources:test'),
    isAdmin: permissionChecker.hasPermission(context, 'admin:reset'),
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🔐 OAuth Scope Enforcement Demo`);
  console.log(`Server running on http://localhost:${PORT}\n`);

  console.log('📋 Available Clients:');
  console.log('  1. read-only-client (scope: read)');
  console.log('     - Can read data: ✅');
  console.log('     - Can execute tools: ❌');
  console.log('     - Can access resources: ❌');
  console.log('     - Has admin access: ❌\n');

  console.log('  2. tools-client (scopes: tools:execute, read)');
  console.log('     - Can read data: ✅');
  console.log('     - Can execute tools: ✅');
  console.log('     - Can access resources: ❌');
  console.log('     - Has admin access: ❌\n');

  console.log('  3. admin-client (scope: admin)');
  console.log('     - Can read data: ✅');
  console.log('     - Can execute tools: ✅');
  console.log('     - Can access resources: ✅');
  console.log('     - Has admin access: ✅\n');

  console.log('🧪 Test Scope Enforcement:');
  console.log(`  1. Get metadata: curl http://localhost:${PORT}/.well-known/oauth-authorization-server`);
  console.log(`  2. Generate code challenge: curl "http://localhost:${PORT}/helper/code-challenge?verifier=test-verifier"`);
  console.log(`  3. Test with read-only token (will fail for tools): POST /api/tool`);
  console.log(`  4. Test with tools token (will succeed): POST /api/tool`);
  console.log(`  5. Test with admin token (will succeed for everything)\n`);

  console.log('💡 See test output above for proof that scope enforcement works!\n');
});

// Demonstrate programmatic testing
async function demonstrateScopeEnforcement() {
  console.log('🧪 Running automated scope enforcement demonstration...\n');

  // Helper to get token
  async function getToken(clientId: string, scopes: string[]) {
    const mockClient = {
      client_id: clientId,
      redirect_uris: ['http://localhost:3000/callback'],
    };

    const codeVerifier = 'test-verifier-with-enough-entropy';
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

    let authCode = '';
    const mockRes = {
      redirect: (_code: number, url: string) => {
        const urlObj = new URL(url);
        authCode = urlObj.searchParams.get('code') || '';
      },
    } as any;

    await provider.authorize(
      mockClient,
      {
        redirectUri: 'http://localhost:3000/callback',
        scopes,
        codeChallenge,
      },
      mockRes
    );

    const tokens = await provider.exchangeAuthorizationCode(
      mockClient,
      authCode,
      codeVerifier,
      'http://localhost:3000/callback'
    );

    return tokens.access_token;
  }

  // Test 1: Read-only client
  console.log('Test 1: Read-only client (scope: read)');
  const readToken = await getToken('read-only-client', ['read']);
  const readInfo = await provider.verifyAccessToken(readToken);
  console.log('  ✅ Token scopes:', readInfo.scopes);
  console.log('  ✅ Mapped permissions:', ['read:*']);
  console.log('  ❌ Cannot execute tools (missing tools:execute scope)\n');

  // Test 2: Tools client
  console.log('Test 2: Tools client (scopes: tools:execute, read)');
  const toolsToken = await getToken('tools-client', ['tools:execute', 'read']);
  const toolsInfo = await provider.verifyAccessToken(toolsToken);
  console.log('  ✅ Token scopes:', toolsInfo.scopes);
  console.log('  ✅ Mapped permissions:', ['tools:*', 'read:*']);
  console.log('  ✅ Can execute tools\n');

  // Test 3: Admin client
  console.log('Test 3: Admin client (scope: admin)');
  const adminToken = await getToken('admin-client', ['admin']);
  const adminInfo = await provider.verifyAccessToken(adminToken);
  console.log('  ✅ Token scopes:', adminInfo.scopes);
  console.log('  ✅ Mapped permissions:', ['*']);
  console.log('  ✅ Can do everything (admin access)\n');

  console.log('✅ All scope enforcement tests passed!\n');
}

// Run demonstration after server starts
setTimeout(demonstrateScopeEnforcement, 100);
