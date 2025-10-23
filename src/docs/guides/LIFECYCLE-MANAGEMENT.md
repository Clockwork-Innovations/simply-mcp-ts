# Lifecycle Management Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-19

Simply-MCP provides lifecycle hooks for proper resource initialization and cleanup, ensuring your server manages resources effectively throughout its lifetime.

---

## Table of Contents

1. [Introduction](#introduction)
2. [onStartup Hook](#onstartup-hook)
3. [onShutdown Hook](#onshutdown-hook)
4. [Lifespan Context](#lifespan-context)
5. [Complete Patterns](#complete-patterns)
6. [Best Practices](#best-practices)
7. [Testing Lifecycle Hooks](#testing-lifecycle-hooks)

---

## Introduction

Lifecycle hooks allow you to run code at specific points in your server's lifetime:

- **onStartup**: Run code when the server starts (before handling requests)
- **onShutdown**: Run code when the server stops (cleanup phase)

**Common Use Cases:**

- Database connection management
- Cache initialization
- API client setup
- Resource pooling
- Metric collection initialization
- Configuration loading

**Benefits:**

- **Clean Resource Management**: Initialize once, use everywhere
- **Graceful Shutdown**: Proper cleanup prevents resource leaks
- **Shared State**: Lifespan context available to all handlers
- **Type Safety**: Full TypeScript support

---

## onStartup Hook

The `onStartup` hook is called once when the server starts, before it begins handling requests.

### Signature

```typescript
type OnStartupHook = (
  lifespanContext: LifespanContext
) => Promise<void> | void;
```

### Basic Example

```typescript
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',

  onStartup: async (lifespanContext) => {
    console.log('Server starting...');

    // Initialize resources
    lifespanContext.startupTime = new Date();
    lifespanContext.requestCount = 0;

    console.log('Server ready!');
  },
});
```

### Database Connection Example

```typescript
import { createConnection } from 'my-db-library';

const server = new BuildMCPServer({
  name: 'database-server',
  version: '1.0.0',

  onStartup: async (lifespanContext) => {
    // Connect to database
    const db = await createConnection({
      host: 'localhost',
      database: 'myapp',
      user: 'dbuser',
      password: process.env.DB_PASSWORD,
    });

    // Store in lifespan context
    lifespanContext.db = db;

    console.log('Database connected');
  },
});
```

### Multiple Resource Initialization

```typescript
const server = new BuildMCPServer({
  name: 'multi-resource-server',
  version: '1.0.0',

  onStartup: async (lifespanContext) => {
    // Initialize database
    lifespanContext.db = await connectDatabase();

    // Initialize cache
    lifespanContext.cache = new Map();

    // Initialize API client
    lifespanContext.apiClient = createClient({
      apiKey: process.env.API_KEY,
      timeout: 5000,
    });

    // Initialize metrics
    lifespanContext.metrics = {
      requests: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };

    console.log('All resources initialized');
  },
});
```

### Error Handling in onStartup

```typescript
const server = new BuildMCPServer({
  name: 'resilient-server',
  version: '1.0.0',

  onStartup: async (lifespanContext) => {
    try {
      // Try to connect to database
      lifespanContext.db = await connectDatabase();
      console.log('Database connected');
    } catch (error) {
      // Fallback to in-memory storage
      console.warn('Database connection failed, using in-memory storage');
      lifespanContext.db = createInMemoryStore();
    }

    // Always initialize cache (critical)
    lifespanContext.cache = new Map();
  },
});
```

---

## onShutdown Hook

The `onShutdown` hook is called when the server is stopping, allowing you to clean up resources.

### Signature

```typescript
type OnShutdownHook = (
  lifespanContext: LifespanContext
) => Promise<void> | void;
```

### Basic Example

```typescript
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',

  onShutdown: async (lifespanContext) => {
    console.log('Server shutting down...');

    // Cleanup logic here

    console.log('Cleanup complete');
  },
});
```

### Database Cleanup Example

```typescript
const server = new BuildMCPServer({
  name: 'database-server',
  version: '1.0.0',

  onStartup: async (ctx) => {
    ctx.db = await createConnection({ /* ... */ });
  },

  onShutdown: async (ctx) => {
    // Close database connection
    if (ctx.db) {
      console.log('Closing database connection...');
      await ctx.db.close();
      console.log('Database connection closed');
    }
  },
});
```

### Multiple Resource Cleanup

```typescript
const server = new BuildMCPServer({
  name: 'multi-resource-server',
  version: '1.0.0',

  onShutdown: async (lifespanContext) => {
    console.log('Starting cleanup...');

    // Close database connection
    if (lifespanContext.db) {
      await lifespanContext.db.close();
      console.log('Database closed');
    }

    // Close API client
    if (lifespanContext.apiClient) {
      await lifespanContext.apiClient.close();
      console.log('API client closed');
    }

    // Clear cache and report stats
    if (lifespanContext.cache) {
      const cacheSize = lifespanContext.cache.size;
      lifespanContext.cache.clear();
      console.log(`Cache cleared (${cacheSize} entries)`);
    }

    // Log final metrics
    if (lifespanContext.metrics) {
      console.log('Final metrics:', lifespanContext.metrics);
    }

    console.log('Cleanup complete');
  },
});
```

### Graceful Shutdown

```typescript
const server = new BuildMCPServer({
  name: 'graceful-server',
  version: '1.0.0',

  onShutdown: async (lifespanContext) => {
    // Wait for pending operations
    if (lifespanContext.pendingOperations > 0) {
      console.log(`Waiting for ${lifespanContext.pendingOperations} operations...`);
      await new Promise(resolve => {
        const interval = setInterval(() => {
          if (lifespanContext.pendingOperations === 0) {
            clearInterval(interval);
            resolve(undefined);
          }
        }, 100);
      });
    }

    // Then cleanup
    await lifespanContext.db?.close();
  },
});
```

---

## Lifespan Context

The lifespan context is shared state that persists for the entire lifetime of the server and is accessible in all handlers.

### What is Lifespan Context?

```typescript
interface LifespanContext {
  [key: string]: any; // Flexible structure for your needs
}
```

- **Initialized**: In the `onStartup` hook
- **Accessible**: Via `context.request_context.lifespan_context` in all handlers
- **Shared**: Same object across all requests
- **Cleaned up**: In the `onShutdown` hook

### Accessing in Handlers

```typescript
// Initialize in onStartup
const server = new BuildMCPServer({
  onStartup: async (ctx) => {
    ctx.db = await connectDatabase();
    ctx.requestCount = 0;
  },
});

// Access in tool
server.addTool({
  name: 'query',
  parameters: z.object({
    sql: z.string(),
  }),
  execute: async (args, context) => {
    // Access from lifespan context
    const db = context?.request_context.lifespan_context?.db;
    const count = context?.request_context.lifespan_context?.requestCount || 0;

    // Increment counter
    if (context?.request_context.lifespan_context) {
      context.request_context.lifespan_context.requestCount = count + 1;
    }

    // Use database
    if (!db) {
      throw new Error('Database not available');
    }

    return await db.query(args.sql);
  },
});
```

### Type Safety for Lifespan Context

```typescript
// Define your lifespan context interface
interface MyLifespanContext extends LifespanContext {
  db: DatabaseConnection;
  cache: Map<string, CacheEntry>;
  apiClient: APIClient;
  metrics: {
    requests: number;
    errors: number;
  };
  startupTime: Date;
}

// Type assertion in handlers
server.addTool({
  name: 'query',
  execute: async (args, context) => {
    const ctx = context?.request_context.lifespan_context as MyLifespanContext | undefined;

    if (!ctx?.db) {
      throw new Error('Database not initialized');
    }

    // Now you have full type safety
    const result = await ctx.db.query(args.sql);
    ctx.metrics.requests++;

    return result;
  },
});
```

---

## Complete Patterns

### Pattern 1: Database Lifecycle

```typescript
import { Pool } from 'pg';

interface DBContext extends LifespanContext {
  pool: Pool;
  queryCount: number;
}

const server = new BuildMCPServer({
  name: 'postgres-server',
  version: '1.0.0',

  onStartup: async (ctx: DBContext) => {
    // Create connection pool
    ctx.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    ctx.queryCount = 0;

    // Test connection
    const client = await ctx.pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    console.log('Database pool created');
  },

  onShutdown: async (ctx: DBContext) => {
    // Close all connections
    if (ctx.pool) {
      await ctx.pool.end();
      console.log(`Pool closed after ${ctx.queryCount} queries`);
    }
  },
});

// Use in tool
server.addTool({
  name: 'query_db',
  parameters: z.object({
    sql: z.string(),
  }),
  execute: async (args, context) => {
    const ctx = context?.request_context.lifespan_context as DBContext;
    const client = await ctx.pool.connect();

    try {
      const result = await client.query(args.sql);
      ctx.queryCount++;
      return result.rows;
    } finally {
      client.release();
    }
  },
});
```

### Pattern 2: Cache with Expiration

```typescript
interface CacheEntry {
  value: any;
  timestamp: number;
}

interface CacheContext extends LifespanContext {
  cache: Map<string, CacheEntry>;
  settings: {
    ttl: number;
    maxSize: number;
  };
}

const server = new BuildMCPServer({
  name: 'cache-server',
  version: '1.0.0',
  settings: {
    cache: {
      ttl: 3600, // 1 hour
      maxSize: 1000,
    },
  },

  onStartup: async (ctx: CacheContext) => {
    ctx.cache = new Map();
    ctx.settings = {
      ttl: 3600,
      maxSize: 1000,
    };

    // Cleanup expired entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of ctx.cache.entries()) {
        if (now - entry.timestamp > ctx.settings.ttl * 1000) {
          ctx.cache.delete(key);
        }
      }
    }, 60000);

    console.log('Cache initialized');
  },

  onShutdown: async (ctx: CacheContext) => {
    console.log(`Cache cleared (${ctx.cache.size} entries)`);
    ctx.cache.clear();
  },
});

// Cache set tool
server.addTool({
  name: 'cache_set',
  parameters: z.object({
    key: z.string(),
    value: z.any(),
  }),
  execute: async (args, context) => {
    const ctx = context?.request_context.lifespan_context as CacheContext;

    // Enforce max size
    if (ctx.cache.size >= ctx.settings.maxSize) {
      // Remove oldest entry
      const oldestKey = ctx.cache.keys().next().value;
      ctx.cache.delete(oldestKey);
    }

    ctx.cache.set(args.key, {
      value: args.value,
      timestamp: Date.now(),
    });

    return `Cached: ${args.key}`;
  },
});

// Cache get tool
server.addTool({
  name: 'cache_get',
  parameters: z.object({
    key: z.string(),
  }),
  execute: async (args, context) => {
    const ctx = context?.request_context.lifespan_context as CacheContext;
    const entry = ctx.cache.get(args.key);

    if (!entry) {
      return null;
    }

    // Check expiration
    const age = (Date.now() - entry.timestamp) / 1000;
    if (age > ctx.settings.ttl) {
      ctx.cache.delete(args.key);
      return null;
    }

    return entry.value;
  },
});
```

### Pattern 3: API Client with Rate Limiting

```typescript
interface APIContext extends LifespanContext {
  apiClient: any;
  rateLimiter: {
    tokens: number;
    lastRefill: number;
    maxTokens: number;
    refillRate: number;
  };
}

const server = new BuildMCPServer({
  name: 'api-server',
  version: '1.0.0',

  onStartup: async (ctx: APIContext) => {
    // Initialize API client
    ctx.apiClient = createClient({
      apiKey: process.env.API_KEY,
      baseURL: 'https://api.example.com',
    });

    // Initialize token bucket rate limiter
    ctx.rateLimiter = {
      tokens: 10,
      lastRefill: Date.now(),
      maxTokens: 10,
      refillRate: 1, // 1 token per second
    };

    console.log('API client initialized');
  },

  onShutdown: async (ctx: APIContext) => {
    await ctx.apiClient?.close();
    console.log('API client closed');
  },
});

server.addTool({
  name: 'call_api',
  parameters: z.object({
    endpoint: z.string(),
  }),
  execute: async (args, context) => {
    const ctx = context?.request_context.lifespan_context as APIContext;

    // Refill tokens
    const now = Date.now();
    const timePassed = (now - ctx.rateLimiter.lastRefill) / 1000;
    const tokensToAdd = Math.floor(timePassed * ctx.rateLimiter.refillRate);

    if (tokensToAdd > 0) {
      ctx.rateLimiter.tokens = Math.min(
        ctx.rateLimiter.maxTokens,
        ctx.rateLimiter.tokens + tokensToAdd
      );
      ctx.rateLimiter.lastRefill = now;
    }

    // Check if we have tokens
    if (ctx.rateLimiter.tokens < 1) {
      throw new Error('Rate limit exceeded');
    }

    // Consume token
    ctx.rateLimiter.tokens--;

    // Make API call
    return await ctx.apiClient.get(args.endpoint);
  },
});
```

---

## Best Practices

### 1. Always Implement onShutdown

If you have an `onStartup` hook, always implement the corresponding `onShutdown`:

```typescript
// Good
const server = new BuildMCPServer({
  onStartup: async (ctx) => {
    ctx.db = await connectDatabase();
  },
  onShutdown: async (ctx) => {
    await ctx.db?.close();
  },
});

// Bad - resource leak!
const server = new BuildMCPServer({
  onStartup: async (ctx) => {
    ctx.db = await connectDatabase();
  },
  // No onShutdown - connection never closed!
});
```

### 2. Handle Errors in Lifecycle Hooks

```typescript
const server = new BuildMCPServer({
  onStartup: async (ctx) => {
    try {
      ctx.db = await connectDatabase();
    } catch (error) {
      console.error('Database connection failed:', error);
      // Provide fallback or fail fast
      throw error; // Server won't start
    }
  },

  onShutdown: async (ctx) => {
    try {
      await ctx.db?.close();
    } catch (error) {
      console.error('Error closing database:', error);
      // Log but don't throw - allow shutdown to continue
    }
  },
});
```

### 3. Check for Lifespan Context Availability

Always check if lifespan context is available before using it:

```typescript
server.addTool({
  name: 'use_db',
  execute: async (args, context) => {
    const db = context?.request_context.lifespan_context?.db;

    if (!db) {
      throw new Error('Database not initialized');
    }

    return await db.query(args.sql);
  },
});
```

### 4. Type Your Lifespan Context

Use TypeScript interfaces for better type safety:

```typescript
interface MyContext extends LifespanContext {
  db: DatabaseConnection;
  cache: Map<string, any>;
}

// In hooks
onStartup: async (ctx: MyContext) => {
  ctx.db = await connectDatabase();
  ctx.cache = new Map();
}

// In handlers
const ctx = context?.request_context.lifespan_context as MyContext | undefined;
```

### 5. Log Lifecycle Events

Always log startup and shutdown events for debugging:

```typescript
const server = new BuildMCPServer({
  onStartup: async (ctx) => {
    console.log('Starting server...');
    ctx.db = await connectDatabase();
    console.log('Database connected');
    console.log('Server ready');
  },

  onShutdown: async (ctx) => {
    console.log('Shutting down server...');
    await ctx.db?.close();
    console.log('Database closed');
    console.log('Server stopped');
  },
});
```

### 6. Avoid Blocking Operations in onShutdown

Keep shutdown fast to allow graceful termination:

```typescript
// Good - quick cleanup
onShutdown: async (ctx) => {
  await ctx.db?.close();
  ctx.cache?.clear();
}

// Bad - may timeout
onShutdown: async (ctx) => {
  // Don't wait for all pending operations
  await Promise.all(ctx.pendingOperations); // Could take forever!
  await ctx.db?.close();
}
```

---

## Testing Lifecycle Hooks

### Unit Testing Hooks

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Lifecycle Hooks', () => {
  it('should initialize database in onStartup', async () => {
    const ctx: any = {};

    // Call onStartup hook directly
    await server.onStartup?.(ctx);

    expect(ctx.db).toBeDefined();
    expect(ctx.db.isConnected()).toBe(true);
  });

  it('should cleanup database in onShutdown', async () => {
    const ctx: any = {
      db: await connectDatabase(),
    };

    // Call onShutdown hook directly
    await server.onShutdown?.(ctx);

    expect(ctx.db.isConnected()).toBe(false);
  });
});
```

### Integration Testing

```typescript
describe('Server Lifecycle', () => {
  it('should start and stop server correctly', async () => {
    const server = new BuildMCPServer({
      name: 'test-server',
      onStartup: async (ctx) => {
        ctx.started = true;
      },
      onShutdown: async (ctx) => {
        ctx.stopped = true;
      },
    });

    // Start server
    await server.start({ transport: 'stdio' });

    // Verify startup
    // ... test server functionality ...

    // Stop server
    await server.stop();

    // Verify shutdown
    // ... verify cleanup ...
  });
});
```

---

## See Also

- **Example Files:**
  - [lifecycle-hooks-demo.ts](../../../examples/lifecycle-hooks-demo.ts) - Complete lifecycle demonstration
  - [context-system-demo.ts](../../../examples/context-system-demo.ts) - Using context with lifecycle

- **Related Guides:**
  - [Context System Guide](./CONTEXT-SYSTEM.md) - Accessing lifespan context
  - [Handler Development Guide](./HANDLER-DEVELOPMENT.md) - Writing handlers

- **API Reference:**
  - [BuildMCPServer API](../reference/BUILD-MCP-SERVER.md)
  - [Type Definitions](../../core/Context.ts)

---

**Questions or Issues?**
Open an issue on [GitHub](https://github.com/simply-mcp/simply-mcp/issues)
