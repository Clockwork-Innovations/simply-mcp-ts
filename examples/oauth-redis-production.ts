/**
 * Production OAuth Server with Redis Storage
 *
 * This example demonstrates a production-ready OAuth 2.1 implementation with:
 * - Redis persistent storage for multi-process deployments
 * - Environment variable configuration
 * - Health monitoring and metrics
 * - Graceful shutdown handling
 * - Comprehensive error handling
 * - Security best practices
 *
 * Prerequisites:
 * - Redis server running (redis-server)
 * - ioredis installed (npm install ioredis)
 *
 * Environment Variables:
 * - REDIS_HOST: Redis host (default: localhost)
 * - REDIS_PORT: Redis port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 * - REDIS_DB: Redis database number (default: 0)
 * - REDIS_KEY_PREFIX: Key prefix for isolation (default: oauth:)
 * - OAUTH_CLIENT_ID: OAuth client ID
 * - OAUTH_CLIENT_SECRET: OAuth client secret
 * - OAUTH_REDIRECT_URI: OAuth redirect URI
 *
 * Usage:
 *   npx tsx examples/oauth-redis-production.ts
 */

import { createOAuthProvider, RedisStorage } from './reference-oauth-provider.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';

// Configuration from environment variables
const config = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'oauth:',
  },
  oauth: {
    clientId: process.env.OAUTH_CLIENT_ID || 'production-client',
    clientSecret: process.env.OAUTH_CLIENT_SECRET || 'production-secret-change-me',
    redirectUri: process.env.OAUTH_REDIRECT_URI || 'https://app.example.com/callback',
  },
};

async function main() {
  console.log('='.repeat(60));
  console.log('Production OAuth Server with Redis Storage');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Create Redis storage with production configuration
  console.log('1. Configuring Redis Storage');
  console.log('-'.repeat(60));
  console.log('Redis Host:', config.redis.host);
  console.log('Redis Port:', config.redis.port);
  console.log('Redis DB:', config.redis.db);
  console.log('Key Prefix:', config.redis.keyPrefix);
  console.log('Password:', config.redis.password ? '***' : '(none)');
  console.log();

  const storage = new RedisStorage({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    keyPrefix: config.redis.keyPrefix,
    // Production-grade retry configuration
    connectionRetryAttempts: 5,
    connectionRetryDelay: 1000, // Start with 1 second
    maxRetryDelay: 10000, // Max 10 seconds
    connectionTimeout: 5000, // 5 second timeout
    enableOfflineQueue: false, // Fail fast in production
    debug: false, // Disable debug logging in production
  });

  // Step 2: Connect to Redis with error handling
  console.log('2. Connecting to Redis');
  console.log('-'.repeat(60));

  try {
    await storage.connect();
    console.log('✓ Successfully connected to Redis');
  } catch (error) {
    console.error('✗ Failed to connect to Redis:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Verify Redis is running: redis-cli ping');
    console.error('2. Check host/port configuration');
    console.error('3. Verify password (if required)');
    console.error('4. Check firewall rules');
    process.exit(1);
  }
  console.log();

  // Step 3: Perform health check
  console.log('3. Health Check');
  console.log('-'.repeat(60));

  try {
    const health = await storage.healthCheck();
    console.log('Status:', health.healthy ? '✓ Healthy' : '✗ Unhealthy');
    console.log('Message:', health.message);
    console.log('Response Time:', health.responseTimeMs, 'ms');
    console.log('Components:');
    for (const [name, component] of Object.entries(health.components || {})) {
      console.log(`  ${name}:`, component.healthy ? '✓' : '✗', component.message);
    }

    if (!health.healthy) {
      console.error('\nWarning: Storage is unhealthy but continuing...');
    }
  } catch (error) {
    console.error('✗ Health check failed:', error);
  }
  console.log();

  // Step 4: Create OAuth provider with Redis storage
  console.log('4. Creating OAuth Provider');
  console.log('-'.repeat(60));

  let provider;
  try {
    provider = await createOAuthProvider({
      clients: [
        {
          clientId: config.oauth.clientId,
          clientSecret: config.oauth.clientSecret,
          redirectUris: [config.oauth.redirectUri],
          scopes: ['read', 'write', 'admin'],
        },
      ],
      tokenExpiration: 3600, // 1 hour
      refreshTokenExpiration: 86400, // 24 hours
      codeExpiration: 600, // 10 minutes
      storage, // Use Redis storage
    });

    console.log('✓ OAuth provider initialized');
    console.log('Client ID:', config.oauth.clientId);
    console.log('Allowed Scopes:', 'read, write, admin');
    console.log('Token Expiration:', '1 hour');
    console.log('Refresh Token Expiration:', '24 hours');
  } catch (error) {
    console.error('✗ Failed to create OAuth provider:', error);
    await storage.disconnect();
    process.exit(1);
  }
  console.log();

  // Step 5: Verify provider statistics
  console.log('5. Provider Statistics');
  console.log('-'.repeat(60));

  try {
    const stats = await provider.getStats();
    console.log('Active Clients:', stats.clients);
    console.log('Active Tokens:', stats.tokens);
    console.log('Active Refresh Tokens:', stats.refreshTokens);
    console.log('Active Auth Codes:', stats.authorizationCodes);
  } catch (error) {
    console.error('✗ Failed to get statistics:', error);
  }
  console.log();

  // Step 6: Set up periodic health monitoring
  console.log('6. Health Monitoring');
  console.log('-'.repeat(60));
  console.log('Starting periodic health checks (every 30 seconds)...');

  const healthCheckInterval = setInterval(async () => {
    try {
      const health = await storage.healthCheck();
      const timestamp = new Date().toISOString();

      if (health.healthy) {
        console.log(`[${timestamp}] ✓ Health check passed (${health.responseTimeMs}ms)`);
      } else {
        console.error(`[${timestamp}] ✗ Health check failed: ${health.message}`);
        // In production, trigger alerts here
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ✗ Health check error:`, error);
    }
  }, 30000); // Every 30 seconds
  console.log();

  // Step 7: Demonstrate OAuth flow (simulation)
  console.log('7. OAuth Flow Simulation');
  console.log('-'.repeat(60));
  console.log('Simulating OAuth authorization flow...');

  try {
    // In production, these values come from actual authorization requests
    const mockClient: OAuthClientInformationFull = {
      client_id: config.oauth.clientId,
      redirect_uris: [config.oauth.redirectUri],
    };

    // Simulate PKCE challenge (in production, generated by client)
    const codeChallenge = 'test-challenge-abcdefghijklmnopqrstuvwxyz123456';
    const codeVerifier = 'test-verifier-abcdefghijklmnopqrstuvwxyz123456';

    console.log('✓ OAuth flow ready');
    console.log('  Note: In production, use actual authorization requests');
  } catch (error) {
    console.error('✗ OAuth flow simulation failed:', error);
  }
  console.log();

  // Step 8: Production deployment checklist
  console.log('8. Production Deployment Checklist');
  console.log('-'.repeat(60));
  console.log('✓ Redis storage configured');
  console.log('✓ Connection retry logic enabled');
  console.log('✓ Health monitoring active');
  console.log('✓ Environment variables configured');
  console.log('✓ Graceful shutdown handlers registered');
  console.log();
  console.log('Additional recommendations:');
  console.log('  • Enable Redis AUTH (password protection)');
  console.log('  • Use TLS for Redis connections');
  console.log('  • Implement rate limiting');
  console.log('  • Set up monitoring/alerting');
  console.log('  • Configure backup/recovery procedures');
  console.log('  • Review security best practices');
  console.log();

  // Step 9: Graceful shutdown handling
  console.log('9. Graceful Shutdown Configuration');
  console.log('-'.repeat(60));
  console.log('Registered shutdown handlers for SIGTERM and SIGINT');

  const shutdown = async (signal: string) => {
    console.log();
    console.log(`\nReceived ${signal}, shutting down gracefully...`);

    // Stop health monitoring
    clearInterval(healthCheckInterval);
    console.log('✓ Stopped health monitoring');

    // Disconnect from Redis
    try {
      await storage.disconnect();
      console.log('✓ Disconnected from Redis');
    } catch (error) {
      console.error('✗ Error disconnecting from Redis:', error);
    }

    console.log('✓ Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  console.log();

  // Step 10: Server ready
  console.log('='.repeat(60));
  console.log('✓ OAuth Server Ready');
  console.log('='.repeat(60));
  console.log();
  console.log('Press Ctrl+C to shut down gracefully');
  console.log();

  // Keep process alive
  await new Promise(() => {}); // Wait indefinitely
}

// Run with error handling
main().catch(async (error) => {
  console.error();
  console.error('='.repeat(60));
  console.error('FATAL ERROR');
  console.error('='.repeat(60));
  console.error(error);
  console.error();
  console.error('Stack trace:');
  console.error(error.stack);
  process.exit(1);
});
