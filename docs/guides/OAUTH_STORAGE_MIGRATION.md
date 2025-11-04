# OAuth Storage Migration Guide

## Overview

Starting with **v4.0**, Simply-MCP introduces a **pluggable storage abstraction** for OAuth data persistence. This enables production-ready deployments with persistent storage backends like Redis, while maintaining full backwards compatibility with the default in-memory storage.

### What Changed in v4.0

- **Storage Abstraction Layer**: New `OAuthStorageProvider` interface for pluggable backends
- **Default Behavior**: In-memory storage (same as v3.x) - **no changes required**
- **Production Option**: Redis storage for multi-process deployments and data persistence
- **Zero Breaking Changes**: All existing code continues to work without modifications

### Why Storage Abstraction Matters

**In-Memory Storage Limitations**:
- Data is lost on process restart
- Not suitable for multi-process deployments (e.g., clustered applications)
- Limited scalability for high-traffic applications

**Redis Storage Benefits**:
- Persistent token storage across restarts
- Shared state for multi-process/multi-server deployments
- Automatic TTL-based expiration at the database level
- Production-grade scalability and reliability

### Zero Breaking Changes

The default behavior is **identical to v3.x**. If you don't specify a storage provider, Simply-MCP automatically uses `InMemoryStorage`:

```typescript
// v3.x code (still works in v4.x)
const provider = await createOAuthProvider({
  clients: [{ /* ... */ }],
});

// v4.x code (explicit, but optional)
const provider = await createOAuthProvider({
  clients: [{ /* ... */ }],
  storage: new InMemoryStorage(), // This is the default
});
```

---

## Quick Start

### Using Default In-Memory Storage (No Changes Required)

Your existing code continues to work without any modifications:

```typescript
import { createOAuthProvider } from 'simply-mcp';

const provider = await createOAuthProvider({
  clients: [
    {
      clientId: 'my-client',
      clientSecret: 'my-secret',
      redirectUris: ['http://localhost:3000/callback'],
      scopes: ['read', 'write'],
    },
  ],
});

// Use provider normally
```

### Migrating to Redis Storage (3 Steps)

1. **Install ioredis dependency**:
   ```bash
   npm install ioredis
   ```

2. **Configure Redis storage**:
   ```typescript
   import { createOAuthProvider, RedisStorage } from 'simply-mcp';

   const storage = new RedisStorage({
     host: 'localhost',
     port: 6379,
   });
   ```

3. **Update provider initialization**:
   ```typescript
   await storage.connect();

   const provider = await createOAuthProvider({
     clients: [{ /* ... */ }],
     storage, // Pass Redis storage
   });
   ```

That's it! Your OAuth provider now uses Redis for persistent storage.

---

## Step-by-Step Migration

### Option 1: In-Memory Storage (Default)

#### Using Factory Function (Recommended)

```typescript
import { createOAuthProvider } from 'simply-mcp';

// Factory function handles async initialization
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
});
```

#### Using Constructor + Initialize

```typescript
import { SimplyMCPOAuthProvider } from 'simply-mcp';

// Create provider instance
const provider = new SimplyMCPOAuthProvider({
  clients: [{ /* ... */ }],
});

// IMPORTANT: Must call initialize() before use
await provider.initialize();
```

**Note**: The factory function (`createOAuthProvider`) is recommended because it handles initialization automatically.

---

### Option 2: Redis Storage (Production)

#### Install ioredis

```bash
npm install ioredis
```

#### Basic Configuration

```typescript
import { createOAuthProvider, RedisStorage } from 'simply-mcp';

// Create Redis storage
const storage = new RedisStorage({
  host: 'localhost',
  port: 6379,
  password: process.env.REDIS_PASSWORD, // Optional
  db: 0, // Redis database number
  keyPrefix: 'oauth:', // Key prefix for isolation
});

// Connect to Redis
await storage.connect();

// Create provider with Redis storage
const provider = await createOAuthProvider({
  clients: [
    {
      clientId: 'my-client',
      clientSecret: 'my-secret',
      redirectUris: ['http://localhost:3000/callback'],
      scopes: ['read', 'write'],
    },
  ],
  storage, // Use Redis storage
});
```

#### Test the Migration

```typescript
// Test health check
const health = await storage.healthCheck();
console.log('Redis health:', health);

// Test token storage
const tokens = await provider.exchangeAuthorizationCode(/* ... */);
console.log('Tokens stored in Redis:', tokens);

// Verify statistics
const stats = await provider.getStats();
console.log('Storage stats:', stats);
```

#### Deploy

Once tested locally, deploy with production Redis configuration:

```typescript
const storage = new RedisStorage({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'oauth:',
  connectionRetryAttempts: 5,
  connectionRetryDelay: 1000,
});

await storage.connect();
```

---

## Configuration Options

### InMemoryStorage Configuration

```typescript
import { InMemoryStorage } from 'simply-mcp';

const storage = new InMemoryStorage({
  name: 'MyOAuthStorage', // Human-readable name for logging
  debug: true, // Enable detailed logging
});

await storage.connect();
```

**Default Behavior**:
- No external dependencies
- Automatic TTL-based expiration using timers
- Deep copying to prevent mutations
- Background cleanup every 60 seconds

**Suitable for**:
- Development and testing
- Single-process applications
- Low-traffic applications where data loss on restart is acceptable

**Limitations**:
- Data is lost on process restart
- Not suitable for multi-process deployments (no shared state)
- Memory usage grows with number of active tokens

---

### RedisStorage Configuration

```typescript
import { RedisStorage } from 'simply-mcp';

const storage = new RedisStorage({
  // Connection settings
  host: 'localhost', // Redis host
  port: 6379, // Redis port
  password: 'secret', // Optional password
  db: 0, // Redis database number (0-15)

  // Key management
  keyPrefix: 'oauth:', // Prefix for all keys (isolation)

  // Retry configuration
  connectionRetryAttempts: 5, // Max retry attempts
  connectionRetryDelay: 1000, // Initial delay (ms)
  maxRetryDelay: 10000, // Max delay (ms)

  // Connection options
  connectionTimeout: 5000, // Connection timeout (ms)
  enableOfflineQueue: false, // Queue commands while disconnected

  // Logging
  name: 'RedisOAuthStorage', // Human-readable name
  debug: true, // Enable detailed logging
});

await storage.connect();
```

**Key Features**:
- **Atomic Operations**: Uses Lua scripts for race condition prevention
- **TTL-Based Expiration**: Redis handles cleanup automatically
- **Connection Management**: Exponential backoff retry with configurable limits
- **Health Monitoring**: Built-in health checks with latency tracking
- **Transaction Support**: MULTI/EXEC for atomic multi-step operations

**Suitable for**:
- Production deployments
- Multi-process/multi-server applications
- High-traffic applications
- Applications requiring data persistence

---

## Production Deployment

### Prerequisites

1. **Redis Server**:
   - Redis 5.0+ (recommended)
   - Redis 2.6+ (minimum for Lua script support)

2. **Network Connectivity**:
   - Application can reach Redis server
   - Firewall rules allow Redis port (default: 6379)

3. **Authentication**:
   - Redis password (strongly recommended)
   - Network segmentation (VPC/subnet isolation)

### Environment Variables

```bash
# Redis connection
REDIS_HOST=redis.production.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_DB=0

# Key management
REDIS_KEY_PREFIX=oauth:prod:

# Optional: Connection tuning
REDIS_CONNECTION_TIMEOUT=5000
REDIS_RETRY_ATTEMPTS=5
REDIS_RETRY_DELAY=1000
```

### Production Configuration Example

```typescript
import { createOAuthProvider, RedisStorage } from 'simply-mcp';

const storage = new RedisStorage({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'oauth:',
  connectionRetryAttempts: 5,
  connectionRetryDelay: 1000,
  maxRetryDelay: 10000,
  connectionTimeout: 5000,
  debug: false, // Disable in production
});

// Connect with error handling
try {
  await storage.connect();
  console.log('Connected to Redis');
} catch (error) {
  console.error('Failed to connect to Redis:', error);
  process.exit(1);
}

// Create OAuth provider
const provider = await createOAuthProvider({
  clients: [
    {
      clientId: process.env.OAUTH_CLIENT_ID!,
      clientSecret: process.env.OAUTH_CLIENT_SECRET!,
      redirectUris: [process.env.OAUTH_REDIRECT_URI!],
      scopes: ['read', 'write'],
    },
  ],
  storage,
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await storage.disconnect();
  process.exit(0);
});
```

### Health Monitoring

Implement health check endpoints for monitoring:

```typescript
import express from 'express';

const app = express();

app.get('/health', async (req, res) => {
  try {
    const health = await storage.healthCheck();

    if (health.healthy) {
      res.status(200).json({
        status: 'healthy',
        storage: health,
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        storage: health,
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
    });
  }
});

app.get('/metrics', async (req, res) => {
  const stats = await provider.getStats();
  res.json(stats);
});
```

### Performance Considerations

**Redis vs In-Memory Latency**:
- In-memory: <1ms
- Redis (local): 1-5ms
- Redis (network): 5-50ms

**Connection Pooling**:
- ioredis automatically manages connection pooling
- Single Redis client is sufficient for most applications
- Consider multiple clients for very high traffic (10k+ req/s)

**TTL-Based Expiration**:
- Redis automatically removes expired keys
- No background cleanup needed
- More efficient than in-memory timers

### Security Best Practices

1. **Use Redis AUTH**:
   ```typescript
   const storage = new RedisStorage({
     password: process.env.REDIS_PASSWORD, // Always set a password
   });
   ```

2. **Enable TLS for Connections**:
   ```typescript
   import Redis from 'ioredis';

   const redis = new Redis({
     host: 'redis.production.com',
     port: 6380,
     password: process.env.REDIS_PASSWORD,
     tls: {
       // TLS options
     },
   });
   ```

3. **Network Segmentation**:
   - Run Redis in a private VPC/subnet
   - Only allow connections from application servers
   - Use security groups/firewall rules

4. **Key Prefix Isolation**:
   ```typescript
   const storage = new RedisStorage({
     keyPrefix: 'oauth:app1:', // Isolate by application
   });
   ```

5. **Monitor Access**:
   - Enable Redis audit logging
   - Monitor failed authentication attempts
   - Alert on unusual access patterns

---

## Troubleshooting

### Common Issues

#### 1. Connection Failures

**Symptom**: `Failed to connect to Redis: ECONNREFUSED`

**Solutions**:
- Verify Redis is running: `redis-cli ping`
- Check host/port configuration
- Verify firewall rules allow connection
- Check network connectivity

```typescript
// Enable debug logging to diagnose
const storage = new RedisStorage({
  debug: true, // See detailed connection logs
});
```

#### 2. Authentication Errors

**Symptom**: `Failed to connect to Redis: NOAUTH Authentication required`

**Solutions**:
- Set Redis password in configuration
- Verify password is correct
- Check Redis AUTH is enabled

```typescript
const storage = new RedisStorage({
  password: process.env.REDIS_PASSWORD,
});
```

#### 3. Timeout Errors

**Symptom**: `Connection timeout after 5000ms`

**Solutions**:
- Increase connection timeout
- Check network latency
- Verify Redis is responsive

```typescript
const storage = new RedisStorage({
  connectionTimeout: 10000, // 10 seconds
});
```

#### 4. TTL Misconfiguration

**Symptom**: Tokens expire too quickly or too slowly

**Solutions**:
- Verify TTL values in provider configuration
- Check Redis TTL: `redis-cli TTL oauth:token:abc123`
- Ensure TTL is in seconds (not milliseconds)

```typescript
const provider = await createOAuthProvider({
  tokenExpiration: 3600, // 1 hour (in seconds)
  storage,
});
```

### Debugging

#### Enable Debug Logging

```typescript
const storage = new RedisStorage({
  debug: true, // Detailed operation logging
});
```

#### Check Redis Connection

```bash
# Test Redis connection
redis-cli -h localhost -p 6379 -a YOUR_PASSWORD ping

# List OAuth keys
redis-cli -h localhost -p 6379 -a YOUR_PASSWORD KEYS "oauth:*"

# Check token TTL
redis-cli -h localhost -p 6379 -a YOUR_PASSWORD TTL "oauth:token:abc123..."
```

#### Verify Key Prefixes

```typescript
// List all clients
const clients = await storage.listClients();
console.log('Registered clients:', clients);

// Get storage statistics
const stats = await storage.getStats();
console.log('Storage stats:', stats);
```

#### Monitor Health Checks

```typescript
setInterval(async () => {
  const health = await storage.healthCheck();
  console.log('Health:', health);
}, 10000); // Every 10 seconds
```

---

## Rollback Strategy

### How to Revert to In-Memory Storage

If you encounter issues with Redis, you can easily revert to in-memory storage:

```typescript
// Remove Redis storage parameter
const provider = await createOAuthProvider({
  clients: [{ /* ... */ }],
  // storage: redisStorage, // Comment out or remove
});

// Or explicitly use InMemoryStorage
import { InMemoryStorage } from 'simply-mcp';

const provider = await createOAuthProvider({
  clients: [{ /* ... */ }],
  storage: new InMemoryStorage(),
});
```

### Data Migration Considerations

**Important**: OAuth tokens are **ephemeral** by design:
- Access tokens expire within hours (default: 1 hour)
- Refresh tokens expire within days (default: 24 hours)
- Authorization codes expire within minutes (default: 10 minutes)

**Migration Strategy**:
1. **Switch storage backend** at any time
2. **Existing tokens** in old storage will naturally expire
3. **New tokens** are created in new storage
4. **No data migration** is required

**Zero-Downtime Rollback**:
1. Deploy application with in-memory storage
2. Old Redis tokens expire naturally
3. New tokens use in-memory storage
4. Remove Redis dependency when ready

---

## FAQ

### Do I need to change my existing code?

**No**. The default behavior is identical to v3.x. If you don't specify a `storage` parameter, Simply-MCP automatically uses `InMemoryStorage`.

### What happens to existing tokens during migration?

OAuth tokens are ephemeral and expire naturally:
- When switching to Redis, existing in-memory tokens expire normally (hours/days)
- When switching to in-memory, existing Redis tokens expire normally
- No data migration is needed

### Can I switch storage backends at runtime?

**No**. Storage must be configured at provider initialization. However, you can:
1. Create a new provider with different storage
2. Existing tokens in old provider expire naturally
3. New tokens use new provider/storage

### Does this affect performance?

**Slightly**, but only for Redis storage:
- In-memory: <1ms latency
- Redis (local): 1-5ms latency
- Redis (network): 5-50ms latency

For most applications, this is negligible compared to network I/O and business logic.

### Can I use other storage backends (PostgreSQL, MongoDB, etc.)?

**Yes**! You can implement the `OAuthStorageProvider` interface:

```typescript
import type { OAuthStorageProvider } from 'simply-mcp';

class PostgreSQLStorage implements OAuthStorageProvider {
  // Implement all required methods
  async connect() { /* ... */ }
  async setToken() { /* ... */ }
  // ... etc
}

const provider = await createOAuthProvider({
  clients: [{ /* ... */ }],
  storage: new PostgreSQLStorage(),
});
```

See `src/features/auth/oauth/storage/types.ts` for the full interface.

### Is Redis required for production?

**Not necessarily**. Redis is recommended for:
- Multi-process/multi-server deployments
- Applications requiring data persistence across restarts
- High-traffic applications

In-memory storage is acceptable for:
- Single-process applications
- Applications where token loss on restart is acceptable
- Development and testing

### How do I monitor storage health?

Use the built-in health check:

```typescript
const health = await storage.healthCheck();
console.log('Health:', health);
// {
//   healthy: true,
//   message: 'Redis storage is healthy',
//   responseTimeMs: 5,
//   timestamp: 1234567890,
//   components: { ... }
// }
```

### What Redis version is required?

- **Recommended**: Redis 5.0+
- **Minimum**: Redis 2.6+ (for Lua script support)

### Can I use Redis Cluster?

**Yes**, but transaction support is limited. ioredis supports Redis Cluster, but transactions spanning multiple keys may not work. For most OAuth use cases, this is not an issue.

---

## Additional Resources

- [OAuth 2.1 Specification](https://oauth.net/2.1/)
- [Redis Documentation](https://redis.io/documentation)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Simply-MCP OAuth Guide](./OAUTH2.md)
- [Production Example](../../examples/oauth-redis-production.ts)

---

## Support

If you encounter issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review [existing issues](https://github.com/your-repo/issues)
3. Open a [new issue](https://github.com/your-repo/issues/new) with:
   - Simply-MCP version
   - Storage backend (InMemory/Redis)
   - Error messages and stack traces
   - Minimal reproduction example
