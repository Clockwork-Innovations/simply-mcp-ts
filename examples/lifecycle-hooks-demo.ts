#!/usr/bin/env node
/**
 * Simply-MCP Lifecycle Hooks Demo
 *
 * This example demonstrates Simply-MCP's lifecycle management features:
 * - onStartup hook for resource initialization
 * - onShutdown hook for cleanup
 * - Lifespan context for sharing state across requests
 * - Server metadata configuration
 *
 * Common use cases:
 * - Database connection management
 * - Cache initialization
 * - API client setup
 * - Resource pooling
 *
 * Usage:
 *   npx simply-mcp run examples/lifecycle-hooks-demo.ts
 */

import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

// Simulate a database connection
class DatabaseConnection {
  private connected: boolean = false;
  private data: Map<string, any> = new Map();

  async connect() {
    console.error('[Database] Connecting...');
    await new Promise(resolve => setTimeout(resolve, 500));
    this.connected = true;
    console.error('[Database] Connected successfully');

    // Initialize with some sample data
    this.data.set('user:1', { id: 1, name: 'Alice', email: 'alice@example.com' });
    this.data.set('user:2', { id: 2, name: 'Bob', email: 'bob@example.com' });
  }

  async disconnect() {
    console.error('[Database] Disconnecting...');
    await new Promise(resolve => setTimeout(resolve, 200));
    this.connected = false;
    this.data.clear();
    console.error('[Database] Disconnected');
  }

  async get(key: string) {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    return this.data.get(key);
  }

  async set(key: string, value: any) {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    this.data.set(key, value);
  }

  async list(prefix: string) {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    const results: any[] = [];
    this.data.forEach((value, key) => {
      if (key.startsWith(prefix)) {
        results.push(value);
      }
    });
    return results;
  }

  isConnected() {
    return this.connected;
  }
}

// Create server with lifecycle hooks
const server = new BuildMCPServer({
  name: 'lifecycle-demo-server',
  version: '1.0.0',
  description: 'Demonstrates lifecycle hooks and resource management',

  // Server metadata
  instructions: 'This server demonstrates proper resource initialization and cleanup using lifecycle hooks.',
  website_url: 'https://github.com/simply-mcp/simply-mcp',

  // Custom settings accessible via context.server.settings
  settings: {
    database: {
      host: 'localhost',
      port: 5432,
      name: 'demo_db',
    },
    cache: {
      ttl: 3600,
      maxSize: 1000,
    },
  },

  // onStartup hook: Initialize resources
  // The lifespan context is shared across all requests
  onStartup: async (lifespanContext) => {
    console.error('[Lifecycle] onStartup hook called');

    // Initialize database connection
    const db = new DatabaseConnection();
    await db.connect();
    lifespanContext.db = db;

    // Initialize cache
    const cache = new Map<string, { value: any; timestamp: number }>();
    lifespanContext.cache = cache;

    // Track startup time
    lifespanContext.startupTime = new Date().toISOString();

    // Connection counter
    lifespanContext.requestCount = 0;

    console.error('[Lifecycle] Resources initialized successfully');
    console.error(`[Lifecycle] Database: ${db.isConnected() ? 'connected' : 'disconnected'}`);
    console.error(`[Lifecycle] Cache: ready`);
  },

  // onShutdown hook: Cleanup resources
  onShutdown: async (lifespanContext) => {
    console.error('[Lifecycle] onShutdown hook called');

    // Close database connection
    if (lifespanContext.db) {
      await lifespanContext.db.disconnect();
      console.error('[Lifecycle] Database connection closed');
    }

    // Clear cache
    if (lifespanContext.cache) {
      lifespanContext.cache.clear();
      console.error('[Lifecycle] Cache cleared');
    }

    console.error('[Lifecycle] Cleanup complete');
  },
});

/**
 * Tool 1: Get User from Database
 * Demonstrates accessing lifespan context in tools
 */
server.addTool({
  name: 'get_user',
  description: 'Get user from database using lifespan context',
  parameters: z.object({
    user_id: z.number().int().describe('User ID to fetch'),
  }),
  execute: async (args, context) => {
    // Access database from lifespan context
    const db = context?.request_context.lifespan_context?.db;

    if (!db) {
      return 'Database not available (lifespan context not initialized)';
    }

    // Increment request counter
    if (context?.request_context.lifespan_context) {
      context.request_context.lifespan_context.requestCount =
        (context.request_context.lifespan_context.requestCount || 0) + 1;
    }

    try {
      const user = await db.get(`user:${args.user_id}`);

      if (!user) {
        return `User ${args.user_id} not found`;
      }

      return {
        content: [
          {
            type: 'text',
            text: `User found:\n${JSON.stringify(user, null, 2)}\n\n` +
                  `Request ID: ${context?.request_context.request_id}\n` +
                  `Total requests: ${context?.request_context.lifespan_context?.requestCount}`,
          },
        ],
      };
    } catch (error) {
      return `Error fetching user: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

/**
 * Tool 2: List Users
 * Demonstrates using database from lifespan context
 */
server.addTool({
  name: 'list_users',
  description: 'List all users from database',
  parameters: z.object({}),
  execute: async (args, context) => {
    const db = context?.request_context.lifespan_context?.db;

    if (!db) {
      return 'Database not available';
    }

    // Increment request counter
    if (context?.request_context.lifespan_context) {
      context.request_context.lifespan_context.requestCount++;
    }

    try {
      const users = await db.list('user:');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${users.length} users:\n${JSON.stringify(users, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return `Error listing users: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

/**
 * Tool 3: Cache Value
 * Demonstrates using cache from lifespan context
 */
server.addTool({
  name: 'cache_value',
  description: 'Store a value in the shared cache',
  parameters: z.object({
    key: z.string().describe('Cache key'),
    value: z.string().describe('Value to cache'),
  }),
  execute: async (args, context) => {
    const cache = context?.request_context.lifespan_context?.cache;
    const settings = context?.server.settings;

    if (!cache) {
      return 'Cache not available';
    }

    // Get TTL from settings
    const ttl = settings?.cache?.ttl || 3600;

    // Store in cache with timestamp
    cache.set(args.key, {
      value: args.value,
      timestamp: Date.now(),
    });

    return {
      content: [
        {
          type: 'text',
          text: `Cached: "${args.key}" = "${args.value}"\nTTL: ${ttl}s (from server settings)`,
        },
      ],
    };
  },
});

/**
 * Tool 4: Get Cached Value
 * Demonstrates reading from shared cache
 */
server.addTool({
  name: 'get_cached_value',
  description: 'Retrieve a value from the shared cache',
  parameters: z.object({
    key: z.string().describe('Cache key'),
  }),
  execute: async (args, context) => {
    const cache = context?.request_context.lifespan_context?.cache;
    const settings = context?.server.settings;

    if (!cache) {
      return 'Cache not available';
    }

    const entry = cache.get(args.key);

    if (!entry) {
      return `Cache miss: "${args.key}" not found`;
    }

    const ttl = settings?.cache?.ttl || 3600;
    const age = Math.floor((Date.now() - entry.timestamp) / 1000);
    const isExpired = age > ttl;

    if (isExpired) {
      cache.delete(args.key);
      return `Cache expired: "${args.key}" was ${age}s old (TTL: ${ttl}s)`;
    }

    return {
      content: [
        {
          type: 'text',
          text: `Cache hit: "${args.key}" = "${entry.value}"\nAge: ${age}s / ${ttl}s`,
        },
      ],
    };
  },
});

/**
 * Tool 5: Server Stats
 * Demonstrates accessing both lifespan context and server metadata
 */
server.addTool({
  name: 'server_stats',
  description: 'Get server statistics from lifespan context',
  parameters: z.object({}),
  execute: async (args, context) => {
    const lifespanCtx = context?.request_context.lifespan_context;
    const server = context?.server;

    const stats = {
      server: {
        name: server?.name,
        version: server?.version,
        instructions: server?.instructions?.substring(0, 50) + '...',
        settings: server?.settings,
      },
      runtime: {
        startupTime: lifespanCtx?.startupTime,
        uptime: lifespanCtx?.startupTime
          ? `${Math.floor((Date.now() - new Date(lifespanCtx.startupTime).getTime()) / 1000)}s`
          : 'unknown',
        totalRequests: lifespanCtx?.requestCount || 0,
      },
      resources: {
        database: lifespanCtx?.db?.isConnected() ? 'connected' : 'disconnected',
        cacheSize: lifespanCtx?.cache?.size || 0,
      },
      currentRequest: {
        requestId: context?.request_context.request_id,
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `Server Statistics:\n${JSON.stringify(stats, null, 2)}`,
        },
      ],
    };
  },
});

// Add a resource documenting lifecycle hooks
server.addResource({
  uri: 'doc://lifecycle-hooks',
  name: 'Lifecycle Hooks Documentation',
  description: 'Documentation for lifecycle hooks and resource management',
  mimeType: 'text/markdown',
  content: `# Lifecycle Hooks

Simply-MCP provides lifecycle hooks for proper resource management.

## onStartup Hook

Initialize resources when the server starts:

\`\`\`typescript
const server = new BuildMCPServer({
  name: 'my-server',
  onStartup: async (lifespanContext) => {
    // Initialize database
    lifespanContext.db = await connectDatabase();

    // Initialize cache
    lifespanContext.cache = new Map();

    // Any other initialization
    lifespanContext.startupTime = new Date();
  }
});
\`\`\`

## onShutdown Hook

Clean up resources when the server stops:

\`\`\`typescript
const server = new BuildMCPServer({
  name: 'my-server',
  onShutdown: async (lifespanContext) => {
    // Close database connection
    await lifespanContext.db?.close();

    // Clear cache
    lifespanContext.cache?.clear();

    // Any other cleanup
  }
});
\`\`\`

## Lifespan Context

The lifespan context is shared across all requests:

\`\`\`typescript
server.addTool({
  name: 'query_db',
  execute: async (args, context) => {
    // Access database from lifespan context
    const db = context.request_context.lifespan_context.db;

    const result = await db.query(args.sql);
    return result;
  }
});
\`\`\`

## Best Practices

1. **Always clean up** - Use onShutdown to prevent resource leaks
2. **Error handling** - Handle initialization failures gracefully
3. **Type safety** - Define types for your lifespan context
4. **Testing** - Test lifecycle hooks separately

## Common Patterns

### Database Connection
\`\`\`typescript
onStartup: async (ctx) => {
  ctx.db = await createConnection({
    host: 'localhost',
    database: 'mydb'
  });
}

onShutdown: async (ctx) => {
  await ctx.db?.close();
}
\`\`\`

### Cache Management
\`\`\`typescript
onStartup: async (ctx) => {
  ctx.cache = new Map();
  ctx.cacheHits = 0;
  ctx.cacheMisses = 0;
}

onShutdown: async (ctx) => {
  ctx.cache?.clear();
  console.log(\`Cache stats: \${ctx.cacheHits} hits, \${ctx.cacheMisses} misses\`);
}
\`\`\`

### API Client Setup
\`\`\`typescript
onStartup: async (ctx) => {
  ctx.apiClient = createClient({
    apiKey: process.env.API_KEY,
    timeout: 5000
  });
}

onShutdown: async (ctx) => {
  await ctx.apiClient?.close();
}
\`\`\`
`,
});

// Start the server
(async () => {
  try {
    await server.start({
      transport: 'stdio',
    });

    const info = server.getInfo();
    const stats = server.getStats();

    console.error(`[LifecycleDemo] Server "${info.name}" v${info.version} started`);
    console.error(`[LifecycleDemo] Tools: ${stats.tools}, Prompts: ${stats.prompts}, Resources: ${stats.resources}`);
    console.error(`[LifecycleDemo] Lifecycle hooks: onStartup ✓, onShutdown ✓`);
  } catch (error) {
    console.error('[LifecycleDemo] Failed to start server:', error);
    process.exit(1);
  }
})();
