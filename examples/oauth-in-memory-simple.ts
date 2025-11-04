/**
 * Simple OAuth Server with In-Memory Storage
 *
 * This example demonstrates the default behavior of Simply-MCP OAuth provider.
 * No external dependencies (like Redis) are required - everything runs in memory.
 *
 * This is suitable for:
 * - Development and testing
 * - Single-process applications
 * - Low-traffic applications where data loss on restart is acceptable
 *
 * For production deployments with multiple processes or data persistence,
 * see oauth-redis-production.ts
 *
 * Usage:
 *   npx tsx examples/oauth-in-memory-simple.ts
 */

import { createOAuthProvider } from './reference-oauth-provider.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import { createHash } from 'crypto';

async function main() {
  console.log('='.repeat(60));
  console.log('Simple OAuth Server with In-Memory Storage');
  console.log('='.repeat(60));
  console.log();

  // Create provider with default in-memory storage
  console.log('1. Creating OAuth Provider (In-Memory)');
  console.log('-'.repeat(60));

  const provider = await createOAuthProvider({
    clients: [
      {
        clientId: 'my-client',
        clientSecret: 'my-secret',
        redirectUris: ['http://localhost:3000/callback'],
        scopes: ['read', 'write'],
      },
    ],
    tokenExpiration: 3600, // 1 hour
    refreshTokenExpiration: 86400, // 24 hours
    codeExpiration: 600, // 10 minutes
    // Note: No 'storage' parameter = uses InMemoryStorage by default
  });

  console.log('✓ OAuth provider initialized with in-memory storage');
  console.log('Client ID:', 'my-client');
  console.log('Allowed Scopes:', 'read, write');
  console.log('Token Expiration:', '1 hour');
  console.log();

  // Get initial statistics
  console.log('2. Initial Statistics');
  console.log('-'.repeat(60));

  const initialStats = await provider.getStats();
  console.log('Active Clients:', initialStats.clients);
  console.log('Active Tokens:', initialStats.tokens);
  console.log('Active Refresh Tokens:', initialStats.refreshTokens);
  console.log('Active Auth Codes:', initialStats.authorizationCodes);
  console.log();

  // Demonstrate OAuth flow
  console.log('3. OAuth Authorization Flow');
  console.log('-'.repeat(60));

  // Mock client
  const client: OAuthClientInformationFull = {
    client_id: 'my-client',
    redirect_uris: ['http://localhost:3000/callback'],
  };

  // Generate PKCE challenge/verifier
  const codeVerifier = 'test-code-verifier-1234567890abcdefghijklmnopqrstuvwxyz';
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  console.log('PKCE Code Verifier:', codeVerifier);
  console.log('PKCE Code Challenge:', codeChallenge);
  console.log();

  // Mock response object to capture authorization code
  let authorizationCode = '';
  const mockResponse = {
    redirect: (code: number, url: string) => {
      const urlObj = new URL(url);
      authorizationCode = urlObj.searchParams.get('code') || '';
      console.log('Authorization redirect:', url);
      return url;
    },
    status: (code: number) => ({
      json: (data: any) => {
        console.log(`Response ${code}:`, data);
      },
    }),
  };

  // Request authorization
  await provider.authorize(
    client,
    {
      redirectUri: 'http://localhost:3000/callback',
      codeChallenge,
      scopes: ['read', 'write'],
      state: 'demo-state-12345',
    },
    mockResponse as any
  );

  console.log('✓ Authorization code issued');
  console.log('Authorization Code:', authorizationCode);
  console.log();

  // Exchange authorization code for tokens
  console.log('4. Token Exchange');
  console.log('-'.repeat(60));

  const tokens = await provider.exchangeAuthorizationCode(
    client,
    authorizationCode,
    codeVerifier,
    'http://localhost:3000/callback'
  );

  console.log('✓ Tokens issued');
  console.log('Access Token:', tokens.access_token);
  console.log('Token Type:', tokens.token_type);
  console.log('Expires In:', tokens.expires_in, 'seconds');
  console.log('Refresh Token:', tokens.refresh_token);
  console.log('Scope:', tokens.scope);
  console.log();

  // Verify access token
  console.log('5. Token Verification');
  console.log('-'.repeat(60));

  const authInfo = await provider.verifyAccessToken(tokens.access_token);
  console.log('✓ Token is valid');
  console.log('Client ID:', authInfo.clientId);
  console.log('Scopes:', authInfo.scopes.join(', '));
  console.log('Expires At:', new Date(authInfo.expiresAt! * 1000).toISOString());
  console.log();

  // Refresh token exchange
  console.log('6. Refresh Token Exchange');
  console.log('-'.repeat(60));

  const newTokens = await provider.exchangeRefreshToken(
    client,
    tokens.refresh_token!,
    ['read'] // Request reduced scope
  );

  console.log('✓ Tokens refreshed');
  console.log('New Access Token:', newTokens.access_token);
  console.log('New Refresh Token:', newTokens.refresh_token);
  console.log('Scope:', newTokens.scope);
  console.log('Tokens Rotated:', newTokens.refresh_token !== tokens.refresh_token);
  console.log();

  // Get updated statistics
  console.log('7. Updated Statistics');
  console.log('-'.repeat(60));

  const updatedStats = await provider.getStats();
  console.log('Active Clients:', updatedStats.clients);
  console.log('Active Tokens:', updatedStats.tokens);
  console.log('Active Refresh Tokens:', updatedStats.refreshTokens);
  console.log('Active Auth Codes:', updatedStats.authorizationCodes);
  console.log();

  // Revoke token
  console.log('8. Token Revocation');
  console.log('-'.repeat(60));

  await provider.revokeToken(client, {
    token: newTokens.access_token,
    token_type_hint: 'access_token',
  });

  console.log('✓ Token revoked');

  try {
    await provider.verifyAccessToken(newTokens.access_token);
    console.log('✗ ERROR: Token should be invalid');
  } catch (error) {
    console.log('✓ Token verification failed (expected):', (error as Error).message);
  }
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log();
  console.log('In-Memory Storage Characteristics:');
  console.log('  • No external dependencies required');
  console.log('  • Fast (<1ms latency)');
  console.log('  • Data lost on process restart');
  console.log('  • Not suitable for multi-process deployments');
  console.log('  • Perfect for development and testing');
  console.log();
  console.log('For production deployments, consider Redis storage:');
  console.log('  • Data persistence across restarts');
  console.log('  • Shared state for multi-process/multi-server deployments');
  console.log('  • See examples/oauth-redis-production.ts');
  console.log('  • See docs/guides/OAUTH_STORAGE_MIGRATION.md');
  console.log();
  console.log('='.repeat(60));
  console.log('✓ Demo Complete!');
  console.log('='.repeat(60));
}

// Run with error handling
main().catch((error) => {
  console.error();
  console.error('='.repeat(60));
  console.error('ERROR');
  console.error('='.repeat(60));
  console.error(error);
  console.error();
  console.error('Stack trace:');
  console.error(error.stack);
  process.exit(1);
});
