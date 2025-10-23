# Context System Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-19

Simply-MCP provides a unified context system for accessing server metadata, session operations, and request-specific data within tool, prompt, and resource handlers.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Context Structure](#context-structure)
3. [Server Information](#server-information-contextserver)
4. [Session Methods](#session-methods-contextsession)
5. [Request Context](#request-context-contextrequest_context)
6. [Practical Examples](#practical-examples)
7. [Best Practices](#best-practices)

---

## Introduction

The context system provides a consistent way to access server capabilities and information from within your handlers. Instead of passing multiple parameters or using global state, all necessary context is available through a single `context` object.

**Why use the context system?**

- **Unified API**: Access server info, session methods, and request data through one object
- **Type Safety**: Full TypeScript support with interfaces
- **Consistency**: Same pattern across all handler types (tools, prompts, resources)
- **Simplicity**: No need to manage global state or pass multiple parameters

**When to use it:**

- Accessing server configuration or metadata
- Logging with request tracking
- Sending progress notifications to the client
- Using shared state (lifespan context)
- Requesting LLM completions from the client

---

## Context Structure

The context object has three main properties:

```typescript
interface Context {
  // Server metadata and configuration
  server: ServerInfo;

  // Methods for interacting with the client
  session: Session;

  // Request-specific data
  request_context: RequestContext;
}
```

### Quick Reference

| Property | Description | Example Use Case |
|----------|-------------|------------------|
| `context.server` | Server metadata | Get server name, version, settings |
| `context.session` | Session methods | Send logs, progress notifications |
| `context.request_context` | Request data | Get request ID, access lifespan context |

---

## Server Information (context.server)

The `context.server` property provides read-only access to server metadata and configuration.

### Available Properties

```typescript
interface ServerInfo {
  readonly name: string;              // Server name
  readonly version: string;           // Server version
  readonly description?: string;      // Server description
  readonly instructions?: string;     // Instructions for LLMs
  readonly website_url?: string;      // Server website URL
  readonly icons?: Icons;             // Server icon URIs
  readonly settings?: Record<string, any>; // Custom settings
}
```

### Example: Accessing Server Metadata

```typescript
server.addTool({
  name: 'get_server_info',
  description: 'Get server metadata',
  parameters: z.object({}),
  execute: async (args, context) => {
    return {
      name: context?.server.name,
      version: context?.server.version,
      description: context?.server.description,
      website: context?.server.website_url,
    };
  },
});
```

### Example: Using Custom Settings

```typescript
// Server configuration
const server = new BuildMCPServer({
  name: 'api-server',
  version: '1.0.0',
  settings: {
    maxRetries: 3,
    timeout: 5000,
    apiEndpoint: 'https://api.example.com',
  },
});

// Access in tool
server.addTool({
  name: 'call_api',
  execute: async (args, context) => {
    const endpoint = context?.server.settings?.apiEndpoint;
    const timeout = context?.server.settings?.timeout || 30000;
    const maxRetries = context?.server.settings?.maxRetries || 1;

    // Use settings for API call configuration
    return await callAPI(endpoint, { timeout, maxRetries });
  },
});
```

### Example: Accessing Instructions

```typescript
server.addTool({
  name: 'get_help',
  execute: async (args, context) => {
    return {
      serverName: context?.server.name,
      instructions: context?.server.instructions,
      documentation: context?.server.website_url,
    };
  },
});
```

---

## Session Methods (context.session)

The `context.session` property provides methods for interacting with the client session.

### Available Methods

```typescript
interface Session {
  // Client capabilities (from initialize request)
  readonly client_params?: ClientCapabilities;

  // Send a log message to the client
  send_log_message(
    level: LogLevel,
    data: string,
    logger?: string
  ): Promise<void>;

  // Request LLM completion from the client
  create_message(
    messages: SamplingMessage[],
    options?: SamplingOptions
  ): Promise<CreateMessageResult>;

  // Send progress notification
  send_progress_notification(
    progressToken: string | number,
    progress: number,
    total?: number,
    message?: string
  ): Promise<void>;

  // Notify client of resource changes
  send_resource_updated(uri: string): Promise<void>;
  send_resource_list_changed(): Promise<void>;

  // Notify client of capability changes
  send_tool_list_changed(): Promise<void>;
  send_prompt_list_changed(): Promise<void>;
}
```

### Example: Logging with Request Tracking

```typescript
server.addTool({
  name: 'process_data',
  execute: async (args, context) => {
    const requestId = context?.request_context.request_id;

    // Log start
    await context?.session.send_log_message(
      'info',
      `[${requestId}] Starting data processing...`,
      context.server.name
    );

    // Do work...
    await processData(args.data);

    // Log completion
    await context?.session.send_log_message(
      'info',
      `[${requestId}] Processing complete`,
      context.server.name
    );

    return 'Success';
  },
});
```

### Example: Progress Notifications

```typescript
server.addTool({
  name: 'batch_process',
  parameters: z.object({
    items: z.array(z.string()),
  }),
  execute: async (args, context) => {
    const progressToken = context?.request_context.meta?.progressToken;
    const total = args.items.length;

    for (let i = 0; i < total; i++) {
      await processItem(args.items[i]);

      // Report progress to client
      if (progressToken && context?.session.send_progress_notification) {
        await context.session.send_progress_notification(
          progressToken,
          i + 1,
          total,
          `Processing item ${i + 1}/${total}`
        );
      }
    }

    return `Processed ${total} items`;
  },
});
```

### Example: LLM Sampling (Fresh Context)

```typescript
server.addTool({
  name: 'ask_llm',
  parameters: z.object({
    question: z.string(),
  }),
  execute: async (args, context) => {
    // Request LLM completion from client (fresh context)
    if (context?.session.create_message) {
      const result = await context.session.create_message(
        [
          {
            role: 'user',
            content: {
              type: 'text',
              text: args.question,
            },
          },
        ],
        {
          maxTokens: 1000,
          // No includeContext - fresh conversation
        }
      );

      return result.content.text;
    }

    return 'LLM sampling not available';
  },
});
```

### Example: LLM Sampling with Current Context

```typescript
server.addTool({
  name: 'continue_conversation',
  parameters: z.object({
    question: z.string(),
  }),
  execute: async (args, context) => {
    // Request LLM completion with conversation context
    if (context?.session.create_message) {
      const result = await context.session.create_message(
        [
          {
            role: 'user',
            content: {
              type: 'text',
              text: args.question,
            },
          },
        ],
        {
          maxTokens: 1000,
          includeContext: 'thisServer', // Include conversation history
          temperature: 0.7,
        }
      );

      return result.content.text;
    }

    return 'LLM sampling not available';
  },
});
```

### Example: LLM Sampling with System Prompt

```typescript
server.addTool({
  name: 'code_review',
  parameters: z.object({
    code: z.string(),
    language: z.string(),
  }),
  execute: async (args, context) => {
    if (context?.session.create_message) {
      const result = await context.session.create_message(
        [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Review this ${args.language} code:\n\n${args.code}`,
            },
          },
        ],
        {
          systemPrompt: 'You are a senior code reviewer. Identify bugs, security issues, and suggest improvements.',
          maxTokens: 1500,
          temperature: 0.5,
          modelPreferences: {
            hints: [{ name: 'claude-3-5-sonnet' }],
            intelligencePriority: 1.0,
          },
        }
      );

      return result.content.text;
    }

    return 'LLM sampling not available';
  },
});
```

### Example: Dynamic List Notifications

```typescript
server.addTool({
  name: 'add_tool_dynamically',
  execute: async (args, context) => {
    // Add a new tool at runtime
    server.addTool({
      name: 'dynamic_tool',
      description: 'Dynamically added tool',
      parameters: z.object({}),
      execute: async () => 'Hello from dynamic tool!',
    });

    // Notify client that tool list has changed
    await context?.session.send_tool_list_changed();

    return 'New tool added';
  },
});
```

---

## Request Context (context.request_context)

The `context.request_context` property provides request-specific information.

### Available Properties

```typescript
interface RequestContext {
  // Unique request identifier (UUID v4)
  readonly request_id: string;

  // Request metadata from MCP protocol
  readonly meta?: RequestMeta;

  // Shared server-wide state (from onStartup hook)
  readonly lifespan_context?: LifespanContext;
}
```

### Example: Request ID for Tracking

```typescript
server.addTool({
  name: 'tracked_operation',
  execute: async (args, context) => {
    const requestId = context?.request_context.request_id;

    console.error(`[${requestId}] Operation started`);

    // Do work...

    return {
      requestId,
      status: 'completed',
      timestamp: new Date().toISOString(),
    };
  },
});
```

### Example: Using Lifespan Context

```typescript
// Initialize in onStartup hook
const server = new BuildMCPServer({
  name: 'db-server',
  onStartup: async (lifespanContext) => {
    lifespanContext.db = await connectDatabase();
    lifespanContext.cache = new Map();
  },
});

// Access in tool
server.addTool({
  name: 'query_db',
  parameters: z.object({
    query: z.string(),
  }),
  execute: async (args, context) => {
    // Access database from lifespan context
    const db = context?.request_context.lifespan_context?.db;

    if (!db) {
      return 'Database not available';
    }

    const result = await db.query(args.query);
    return result;
  },
});
```

### Example: Progress Token from Metadata

```typescript
server.addTool({
  name: 'long_operation',
  execute: async (args, context) => {
    const progressToken = context?.request_context.meta?.progressToken;

    if (progressToken) {
      // Client supports progress - send updates
      for (let i = 0; i < 10; i++) {
        await doWork(i);
        await context?.session.send_progress_notification(
          progressToken,
          i + 1,
          10
        );
      }
    } else {
      // No progress support - just do the work
      for (let i = 0; i < 10; i++) {
        await doWork(i);
      }
    }

    return 'Complete';
  },
});
```

---

## Practical Examples

### Pattern 1: Server Configuration Management

```typescript
const server = new BuildMCPServer({
  name: 'config-server',
  version: '1.0.0',
  settings: {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
    },
    features: {
      caching: true,
      analytics: false,
    },
  },
});

server.addTool({
  name: 'get_feature_flag',
  parameters: z.object({
    feature: z.string(),
  }),
  execute: async (args, context) => {
    const features = context?.server.settings?.features || {};
    return {
      feature: args.feature,
      enabled: features[args.feature] || false,
    };
  },
});
```

### Pattern 2: Request Tracking and Logging

```typescript
server.addTool({
  name: 'tracked_api_call',
  parameters: z.object({
    endpoint: z.string(),
  }),
  execute: async (args, context) => {
    const requestId = context?.request_context.request_id;
    const serverName = context?.server.name;

    // Log request start
    await context?.session.send_log_message(
      'info',
      `[${requestId}] API call to ${args.endpoint}`,
      serverName
    );

    try {
      const result = await fetch(args.endpoint);

      // Log success
      await context?.session.send_log_message(
        'info',
        `[${requestId}] API call successful`,
        serverName
      );

      return result;
    } catch (error) {
      // Log error
      await context?.session.send_log_message(
        'error',
        `[${requestId}] API call failed: ${error}`,
        serverName
      );

      throw error;
    }
  },
});
```

### Pattern 3: Shared Resource Management

```typescript
const server = new BuildMCPServer({
  name: 'resource-server',
  onStartup: async (ctx) => {
    ctx.connectionPool = createPool({ max: 10 });
    ctx.requestCounter = 0;
  },
  onShutdown: async (ctx) => {
    await ctx.connectionPool?.close();
  },
});

server.addTool({
  name: 'use_resource',
  execute: async (args, context) => {
    const pool = context?.request_context.lifespan_context?.connectionPool;

    if (!pool) {
      return 'Resource pool not available';
    }

    // Increment counter
    const ctx = context?.request_context.lifespan_context;
    if (ctx) {
      ctx.requestCounter = (ctx.requestCounter || 0) + 1;
    }

    // Use resource from pool
    const connection = await pool.acquire();
    try {
      const result = await connection.execute(args.query);
      return {
        result,
        totalRequests: ctx?.requestCounter,
      };
    } finally {
      await pool.release(connection);
    }
  },
});
```

---

## Best Practices

### 1. Always Check for Context Availability

Use optional chaining to handle cases where context might be undefined:

```typescript
const serverName = context?.server.name || 'unknown';
const requestId = context?.request_context.request_id || 'no-id';
```

### 2. Use Server Settings for Configuration

Store configuration in server settings instead of environment variables or hardcoding:

```typescript
// Good
const timeout = context?.server.settings?.timeout || 5000;

// Avoid
const timeout = parseInt(process.env.TIMEOUT || '5000');
```

### 3. Include Request IDs in Logs

Always include request IDs in log messages for traceability:

```typescript
await context?.session.send_log_message(
  'info',
  `[${context.request_context.request_id}] Operation complete`,
  context.server.name
);
```

### 4. Initialize Shared Resources in onStartup

Use lifespan context for resources that should persist across requests:

```typescript
const server = new BuildMCPServer({
  onStartup: async (ctx) => {
    // Good: Shared database connection
    ctx.db = await connectDatabase();
  },
});

// Avoid: Creating new connection per request
server.addTool({
  execute: async (args) => {
    const db = await connectDatabase(); // Bad: New connection each time
  },
});
```

### 5. Type Your Lifespan Context

Define types for your lifespan context for better type safety:

```typescript
interface MyLifespanContext extends LifespanContext {
  db: DatabaseConnection;
  cache: Map<string, any>;
  startupTime: Date;
}

// In handler
const db = context?.request_context.lifespan_context as MyLifespanContext;
```

### 6. Handle Missing Progress Tokens Gracefully

Not all clients support progress notifications:

```typescript
if (progressToken && context?.session.send_progress_notification) {
  // Send progress
  await context.session.send_progress_notification(...);
} else {
  // Continue without progress reporting
}
```

---

## See Also

- **Example Files:**
  - [context-system-demo.ts](../../../examples/context-system-demo.ts) - Complete context system demonstration
  - [lifecycle-hooks-demo.ts](../../../examples/lifecycle-hooks-demo.ts) - Lifespan context and lifecycle management
  - [sampling-demo.ts](../../../examples/sampling-demo.ts) - LLM sampling with context modes

- **Related Guides:**
  - [Lifecycle Management Guide](./LIFECYCLE-MANAGEMENT.md) - onStartup/onShutdown hooks
  - [Handler Development Guide](./HANDLER-DEVELOPMENT.md) - Writing handlers with context
  - [Sampling & LLM Completion](../features/sampling.md) - Complete sampling documentation

- **API Reference:**
  - [BuildMCPServer API](../reference/BUILD-MCP-SERVER.md)
  - [Type Definitions](../../core/Context.ts)

---

**Questions or Issues?**
Open an issue on [GitHub](https://github.com/simply-mcp/simply-mcp/issues)
