# Functional API Guide

> **Complete guide to building MCP servers with the Simply MCP Functional API**

## Table of Contents

- [Introduction](#introduction)
  - [What is the Functional API?](#what-is-the-functional-api)
  - [When to Use the Functional API](#when-to-use-the-functional-api)
  - [Key Benefits](#key-benefits)
- [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Minimal Example](#minimal-example)
  - [Running Your Server](#running-your-server)
- [Core Concepts](#core-concepts)
  - [Creating Servers](#creating-servers)
  - [Adding Tools](#adding-tools)
  - [Adding Prompts](#adding-prompts)
  - [Adding Resources](#adding-resources)
  - [Starting Servers](#starting-servers)
- [Schema Definition with Zod](#schema-definition-with-zod)
  - [Basic Types](#basic-types)
  - [Optional Fields](#optional-fields)
  - [Enums and Unions](#enums-and-unions)
  - [Nested Objects](#nested-objects)
  - [Arrays](#arrays)
  - [Validation Rules](#validation-rules)
  - [Custom Descriptions](#custom-descriptions)
- [Tool Documentation](#tool-documentation)
  - [Adding Descriptions](#adding-descriptions)
  - [Comparison with Other APIs](#comparison-with-other-apis)
  - [Why Parameter Descriptions Matter](#why-parameter-descriptions-matter)
- [Transport Configuration](#transport-configuration)
  - [Stdio Transport](#stdio-transport)
  - [HTTP Stateful Mode](#http-stateful-mode)
  - [HTTP Stateless Mode](#http-stateless-mode)
  - [Transport Comparison](#transport-comparison)
- [Handler System](#handler-system)
  - [Handler Context](#handler-context)
  - [Return Values](#return-values)
  - [Error Handling](#error-handling)
  - [Binary Content](#binary-content)
- [Configuration Options](#configuration-options)
  - [Server Options](#server-options)
  - [Start Options](#start-options)
  - [Capabilities](#capabilities)
- [Advanced Features](#advanced-features)
  - [Progress Reporting](#progress-reporting)
  - [Logging Notifications](#logging-notifications)
  - [Reading Resources](#reading-resources)
  - [Session Management](#session-management)
  - [Context Access](#context-access)
- [Complete Examples](#complete-examples)
  - [Simple Calculator](#simple-calculator)
  - [Weather Service](#weather-service)
  - [File Processor](#file-processor)
  - [Multi-Tool Server](#multi-tool-server)
- [API Reference](#api-reference)
  - [SimplyMCP Class](#simplymcp-class)
  - [ToolDefinition Interface](#tooldefinition-interface)
  - [PromptDefinition Interface](#promptdefinition-interface)
  - [ResourceDefinition Interface](#resourcedefinition-interface)
  - [HandlerContext Interface](#handlercontext-interface)
  - [HandlerResult Interface](#handlerresult-interface)
- [Best Practices](#best-practices)
  - [Server Organization](#server-organization)
  - [Error Handling Patterns](#error-handling-patterns)
  - [Schema Design](#schema-design)
  - [Performance Tips](#performance-tips)
- [Troubleshooting](#troubleshooting)
  - [Common Errors](#common-errors)
  - [Debugging Tips](#debugging-tips)
  - [Getting Help](#getting-help)
- [Migration Guide](#migration-guide)
  - [From Decorator API](#from-decorator-api)
  - [From Interface API](#from-interface-api)
  - [From JSON Config](#from-json-config)
- [API Comparison](#api-comparison)
  - [Functional vs Decorator](#functional-vs-decorator)
  - [Functional vs Interface](#functional-vs-interface)
  - [Feature Matrix](#feature-matrix)

---

## Introduction

### What is the Functional API?

The **Functional API** is Simply MCP's programmatic approach to building MCP servers. It provides a straightforward, imperative style where you explicitly register tools, prompts, and resources using method calls.

**Core characteristics:**
- **Explicit registration** - You call `addTool()`, `addPrompt()`, `addResource()` explicitly
- **Zod schemas** - Use Zod for runtime type validation and automatic schema generation
- **Programmatic control** - Full control over server initialization and configuration
- **Maximum flexibility** - Perfect for dynamic servers, testing, and complex logic

**Example:**
```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0'
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}!`;
  },
});

await server.start();
```

### When to Use the Functional API

**Choose the Functional API when you:**

✅ **Need runtime control**
- Generate tools dynamically based on configuration
- Load capabilities from external sources
- Conditionally enable features

✅ **Build programmatic servers**
- Configuration-driven servers
- Plugin systems
- Multi-tenant systems

✅ **Write comprehensive tests**
- Test individual tools in isolation
- Mock handlers easily
- Control exact server state

✅ **Prefer explicit code**
- No "magic" decorators
- Clear registration flow
- Easy to trace execution

**Choose other APIs when you:**

❌ **Want minimal boilerplate** → Use [Interface API](./INTERFACE_API_GUIDE.md)
- Pure TypeScript interfaces
- Zero manual schemas
- Cleanest code

❌ **Prefer class-based organization** → Use [Decorator API](../development/DECORATOR-API.md)
- Class methods as tools
- Auto-registration with decorators
- OOP patterns

### Key Benefits

| Feature | Functional API | Why It Matters |
|---------|---------------|----------------|
| **Explicit Control** | ✅ Full | You see exactly what's registered and when |
| **Runtime Flexibility** | ✅ Maximum | Build servers dynamically at runtime |
| **Type Safety** | ✅ Zod + TypeScript | Runtime validation + compile-time types |
| **Testing** | ✅ Excellent | Easy to mock, stub, and test in isolation |
| **Learning Curve** | ⭐⭐ Easy | Straightforward imperative style |
| **Debugging** | ✅ Simple | Clear stack traces, no decorator magic |
| **Code Visibility** | ✅ High | All registration visible in one place |
| **Dynamic Servers** | ✅ Perfect | Add/remove capabilities at runtime |

---

## Quick Start

### Installation

```bash
npm install simply-mcp
```

**Requirements:**
- Node.js 20+
- TypeScript 5.x (optional, but recommended)

### Minimal Example

Create a file `server.ts`:

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'greeter',
  version: '1.0.0'
});

server.addTool({
  name: 'greet',
  description: 'Greet someone warmly',
  parameters: z.object({
    name: z.string().describe('Name of person to greet'),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}! Welcome to Simply MCP!`;
  },
});

await server.start();
```

**That's it!** Just 20 lines for a complete MCP server.

### Running Your Server

```bash
# Run with npx (no build needed)
npx simply-mcp run server.ts

# Or with tsx directly
npx tsx server.ts

# With HTTP transport
npx simply-mcp run server.ts --http --port 3000

# Watch mode (auto-restart on changes)
npx simply-mcp run server.ts --watch
```

**Test it:**
```bash
# Your server is now running and ready to accept MCP requests
# Connect with any MCP client (Claude Desktop, Continue, etc.)
```

---

## Core Concepts

### Creating Servers

Create a server instance with `new BuildMCPServer()`:

```typescript
import { BuildMCPServer } from 'simply-mcp';

const server = new BuildMCPServer({
  name: 'my-server',           // Required: Server name
  version: '1.0.0',            // Required: Semantic version
  description: 'My MCP server' // Optional: Description
});
```

**Full options:**

```typescript
const server = new BuildMCPServer({
  // Required
  name: 'my-server',
  version: '1.0.0',

  // Optional
  description: 'A comprehensive MCP server',
  basePath: process.cwd(),           // Base path for file operations
  defaultTimeout: 30000,             // Default timeout (ms)

  // Transport configuration
  transport: {
    type: 'stdio',                   // 'stdio' or 'http'
    port: 3000,                      // HTTP port (HTTP only)
    stateful: true,                  // Stateful mode (HTTP only)
  },

  // Capabilities
  capabilities: {
    sampling: false,                 // LLM sampling (Phase 1)
    logging: true,                   // Logging notifications
  },
});
```

### Adding Tools

Tools are callable functions exposed to LLM clients:

```typescript
server.addTool({
  name: 'tool_name',
  description: 'What this tool does',
  parameters: z.object({ /* schema */ }),
  execute: async (args, context) => {
    // Tool logic here
    return 'Result';
  },
});
```

**Complete example:**

```typescript
import { z } from 'zod';

server.addTool({
  name: 'calculate',
  description: 'Perform arithmetic operations',
  parameters: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  execute: async (args, context) => {
    context?.logger.info(`Calculating: ${args.a} ${args.operation} ${args.b}`);

    let result: number;
    switch (args.operation) {
      case 'add': result = args.a + args.b; break;
      case 'subtract': result = args.a - args.b; break;
      case 'multiply': result = args.a * args.b; break;
      case 'divide':
        if (args.b === 0) {
          return 'Error: Division by zero';
        }
        result = args.a / args.b;
        break;
    }

    return `${args.a} ${args.operation} ${args.b} = ${result}`;
  },
});
```

**Method chaining:**

```typescript
server
  .addTool({ name: 'tool1', /* ... */ })
  .addTool({ name: 'tool2', /* ... */ })
  .addTool({ name: 'tool3', /* ... */ });
```

### Adding Prompts

Prompts are reusable templates for LLM interactions:

```typescript
server.addPrompt({
  name: 'code_review',
  description: 'Generate code review prompt',
  arguments: [
    {
      name: 'language',
      description: 'Programming language',
      required: true,
    },
    {
      name: 'focus',
      description: 'Review focus area',
      required: false,
    },
  ],
  template: `Please review the following {{language}} code.
{{#if focus}}Focus on: {{focus}}{{/if}}

Look for:
- Code quality and readability
- Potential bugs
- Performance issues
- Security vulnerabilities`,
});
```

**Template variables:**
- Use `{{variable}}` syntax for substitution
- Variables are replaced with argument values
- Missing optional arguments remain as `{{name}}`

**Dynamic prompts (with functions):**

```typescript
server.addPrompt({
  name: 'contextual_help',
  description: 'Context-aware help',
  arguments: [
    { name: 'topic', description: 'Help topic', required: true },
    { name: 'level', description: 'User level', required: false },
  ],
  template: (args: any) => {
    const level = args.level || 'beginner';
    return level === 'beginner'
      ? `Simple explanation of ${args.topic}...`
      : `Advanced guide on ${args.topic}...`;
  },
});
```

### Adding Resources

Resources expose static or dynamic data:

```typescript
// Static resource (string)
server.addResource({
  uri: 'doc://readme',
  name: 'README',
  description: 'Project documentation',
  mimeType: 'text/plain',
  content: 'Project README content...',
});

// Static resource (JSON)
server.addResource({
  uri: 'config://server',
  name: 'Server Config',
  description: 'Server configuration',
  mimeType: 'application/json',
  content: {
    version: '1.0.0',
    features: ['tools', 'prompts', 'resources'],
    port: 3000,
  },
});

// Binary resource (Buffer)
import { readFileSync } from 'fs';

server.addResource({
  uri: 'file://logo.png',
  name: 'Logo',
  description: 'Company logo',
  mimeType: 'image/png',
  content: readFileSync('logo.png'),
});
```

**Dynamic resources (from tools):**

Tools can read resources via `context.readResource()`:

```typescript
server.addTool({
  name: 'get_config',
  description: 'Get server configuration',
  parameters: z.object({}),
  execute: async (args, context) => {
    if (!context?.readResource) {
      return 'Resource reading not available';
    }

    const config = await context.readResource('config://server');
    return config.text;
  },
});
```

### Starting Servers

Start the server with the configured or overridden transport:

```typescript
// Start with default transport (from constructor)
await server.start();

// Override transport at start
await server.start({
  transport: 'http',
  port: 3000,
  stateful: true,
});
```

**Start options:**

```typescript
interface StartOptions {
  transport?: 'stdio' | 'http';  // Override transport type
  port?: number;                 // Override HTTP port
  stateful?: boolean;            // Override HTTP mode (stateful/stateless)
}
```

**Stopping:**

```typescript
// Graceful shutdown
await server.stop();
```

**Process signals:**

```typescript
// Automatic graceful shutdown on SIGINT (Ctrl+C)
// Built into SimplyMCP - no manual handling needed
```

---

## Schema Definition with Zod

The Functional API uses [Zod](https://zod.dev) for runtime validation and automatic schema generation.

### Basic Types

```typescript
import { z } from 'zod';

z.string()              // String
z.number()              // Number
z.boolean()             // Boolean
z.date()                // Date object
z.null()                // null
z.undefined()           // undefined
z.any()                 // Any type (avoid if possible)
```

**Usage in tools:**

```typescript
server.addTool({
  name: 'example',
  description: 'Basic types example',
  parameters: z.object({
    name: z.string(),
    age: z.number(),
    active: z.boolean(),
  }),
  execute: async (args) => {
    // args.name: string
    // args.age: number
    // args.active: boolean
    return 'OK';
  },
});
```

### Optional Fields

```typescript
z.string().optional()        // string | undefined
z.number().optional()        // number | undefined
z.boolean().nullable()       // boolean | null
z.string().nullish()         // string | null | undefined
```

**Default values:**

```typescript
z.string().default('hello')
z.number().default(0)
z.boolean().default(true)
```

**Example:**

```typescript
parameters: z.object({
  name: z.string(),                        // Required
  age: z.number().optional(),              // Optional
  email: z.string().default(''),           // Required with default
  active: z.boolean().default(true),       // Optional with default
})
```

### Enums and Unions

```typescript
// Enum (recommended)
z.enum(['small', 'medium', 'large'])

// Literal union
z.union([z.literal('a'), z.literal('b')])

// Type union
z.union([z.string(), z.number()])

// Discriminated union
z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('number'), value: z.number() }),
])
```

**Example:**

```typescript
parameters: z.object({
  size: z.enum(['small', 'medium', 'large']),
  format: z.union([z.literal('json'), z.literal('xml')]),
  units: z.enum(['metric', 'imperial']).default('metric'),
})
```

### Nested Objects

```typescript
z.object({
  user: z.object({
    name: z.string(),
    email: z.string(),
    profile: z.object({
      bio: z.string(),
      avatar: z.string().url(),
    }),
  }),
})
```

**Example:**

```typescript
server.addTool({
  name: 'create_user',
  description: 'Create a new user',
  parameters: z.object({
    username: z.string().min(3).max(20),
    profile: z.object({
      firstName: z.string(),
      lastName: z.string(),
      bio: z.string().max(500).optional(),
      interests: z.array(z.string()).optional(),
    }),
    settings: z.object({
      theme: z.enum(['light', 'dark', 'auto']).default('auto'),
      notifications: z.boolean().default(true),
    }).optional(),
  }),
  execute: async (args) => {
    return { id: 'user_123', ...args };
  },
});
```

### Arrays

```typescript
z.array(z.string())                    // string[]
z.array(z.number())                    // number[]
z.array(z.object({ id: z.string() }))  // { id: string }[]

// With constraints
z.array(z.string()).min(1)             // At least 1 item
z.array(z.string()).max(10)            // At most 10 items
z.array(z.string()).length(5)          // Exactly 5 items
z.array(z.string()).nonempty()         // At least 1 item
```

**Example:**

```typescript
parameters: z.object({
  tags: z.array(z.string()).min(1).max(10),
  items: z.array(z.object({
    id: z.string(),
    quantity: z.number().int().positive(),
  })),
})
```

### Validation Rules

**Strings:**

```typescript
z.string().min(3)                      // Min length
z.string().max(100)                    // Max length
z.string().length(10)                  // Exact length
z.string().email()                     // Email format
z.string().url()                       // URL format
z.string().uuid()                      // UUID format
z.string().regex(/^[A-Z]+$/)          // Pattern match
z.string().startsWith('prefix')        // Starts with
z.string().endsWith('suffix')          // Ends with
z.string().trim()                      // Trim whitespace
z.string().toLowerCase()               // Convert to lowercase
```

**Numbers:**

```typescript
z.number().min(0)                      // Minimum value
z.number().max(100)                    // Maximum value
z.number().int()                       // Integer only
z.number().positive()                  // > 0
z.number().nonnegative()               // >= 0
z.number().negative()                  // < 0
z.number().nonpositive()               // <= 0
z.number().multipleOf(5)               // Divisible by 5
```

**Example:**

```typescript
parameters: z.object({
  username: z.string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .describe('Username (3-20 chars, alphanumeric)'),

  age: z.number()
    .int()
    .min(13)
    .max(120)
    .describe('Age (must be 13+)'),

  email: z.string()
    .email()
    .toLowerCase()
    .describe('Email address'),

  score: z.number()
    .min(0)
    .max(100)
    .multipleOf(0.1)
    .describe('Score (0-100, max 1 decimal)'),
})
```

### Custom Descriptions

Add descriptions for better LLM understanding:

```typescript
parameters: z.object({
  query: z.string()
    .describe('Search query (keywords or phrases)'),

  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('Maximum number of results (1-100)'),

  filter: z.object({
    type: z.enum(['pdf', 'markdown', 'text'])
      .describe('File type to filter by'),
    dateFrom: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe('Start date (YYYY-MM-DD format)'),
  }).describe('Filter criteria'),
})
```

**Best practices:**
- Always add `.describe()` to parameters
- Explain constraints and formats
- Give examples in descriptions
- Use clear, concise language

---

## Tool Documentation

### Adding Descriptions

In the Functional API, you use Zod's `.describe()` method to provide descriptions for the tool and its parameters. These descriptions become part of the MCP tool schema that AI agents see when selecting tools.

**Tool Description:**
```typescript
server.addTool({
  name: 'calculate_tip',
  description: 'Calculate tip amount and total bill',  // Tool description
  parameters: z.object({
    // parameters here
  }),
  execute: async (args) => { /* ... */ }
});
```

**Parameter Descriptions:**
```typescript
parameters: z.object({
  billAmount: z.number()
    .describe('Bill amount before tip (in dollars)'),  // Parameter description
  tipPercentage: z.number()
    .min(0).max(100)
    .describe('Tip percentage (0-100)')
})
```

### Comparison with Other APIs

All Simply MCP API styles produce identical MCP schemas. The only difference is how you provide descriptions:

#### Functional API (Zod `.describe()`)
```typescript
server.addTool({
  name: 'calculate_tip',
  description: 'Calculate tip amount and total',
  parameters: z.object({
    billAmount: z.number()
      .describe('Bill amount before tip'),
    tipPercentage: z.number()
      .describe('Tip percentage (0-100)')
  }),
  execute: async (args) => { /* ... */ }
});
```

#### Decorator API (JSDoc)
```typescript
/**
 * Calculate tip amount and total
 * @param billAmount - Bill amount before tip
 * @param tipPercentage - Tip percentage (0-100)
 */
@tool()
calculateTip(billAmount: number, tipPercentage: number) {
  // ...
}
```

#### Interface API (JSDoc on types)
```typescript
interface CalculateTipTool extends ITool {
  name: 'calculate_tip';
  description: 'Calculate tip amount and total';
  params: {
    /** Bill amount before tip */
    billAmount: number;
    /** Tip percentage (0-100) */
    tipPercentage: number;
  };
}
```

**All three produce the same MCP schema:**
```json
{
  "name": "calculate_tip",
  "description": "Calculate tip amount and total",
  "inputSchema": {
    "type": "object",
    "properties": {
      "billAmount": {
        "type": "number",
        "description": "Bill amount before tip"
      },
      "tipPercentage": {
        "type": "number",
        "description": "Tip percentage (0-100)"
      }
    }
  }
}
```

### Why Parameter Descriptions Matter

Parameter descriptions are visible to AI agents when they select tools. Good descriptions help agents:
- Understand what each parameter expects
- Choose appropriate values
- Handle edge cases correctly

**Good descriptions:**
- ✅ "User's email address (must be valid format)"
- ✅ "Search query (1-100 characters)"
- ✅ "Temperature in Celsius (-273.15 to 1000)"

**Poor descriptions:**
- ❌ "Email" (too vague)
- ❌ "Query" (no constraints mentioned)
- ❌ "temp" (unclear unit, no range)

For complete documentation patterns including JSDoc standards, see the [JSDoc and Descriptions Guide](./JSDOC_AND_DESCRIPTIONS.md).

For JSDoc examples in the Decorator API, see the [Decorator API Guide](./DECORATOR_API_GUIDE.md#jsdoc-documentation-support).

---

## Transport Configuration

### Stdio Transport

Standard input/output transport for CLI usage:

```typescript
// Constructor configuration
const server = new BuildMCPServer({
  name: 'cli-server',
  version: '1.0.0',
  transport: {
    type: 'stdio',
  },
});

await server.start();
```

**Or override at start:**

```typescript
const server = new BuildMCPServer({
  name: 'cli-server',
  version: '1.0.0',
});

await server.start({ transport: 'stdio' });
```

**Use cases:**
- Claude Desktop integration
- CLI tools
- Piped workflows
- Simple integrations

**Characteristics:**
- Communication via stdin/stdout
- Logs to stderr
- One client per process
- Lightweight and fast

### HTTP Stateful Mode

Session-based HTTP transport with SSE streaming:

```typescript
const server = new BuildMCPServer({
  name: 'api-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,
    stateful: true,  // Default
  },
});

await server.start();
```

**Features:**
- Session management (via `Mcp-Session-Id` header)
- Server-Sent Events (SSE) for streaming
- Persistent connections
- Multiple concurrent sessions

**Endpoints:**
- `POST /mcp` - Initialize session and handle requests
- `GET /mcp` - SSE stream (requires session ID)
- `DELETE /mcp` - Terminate session
- `GET /health` - Health check
- `GET /` - Server info

**Client flow:**

```typescript
// 1. Initialize (creates session)
POST /mcp
Body: { method: 'initialize', ... }
Response Headers: Mcp-Session-Id: <uuid>

// 2. Subsequent requests (use session ID)
POST /mcp
Headers: Mcp-Session-Id: <uuid>
Body: { method: 'tools/call', ... }

// 3. Subscribe to events (optional)
GET /mcp
Headers: Mcp-Session-Id: <uuid>
(SSE stream)

// 4. Terminate (optional)
DELETE /mcp
Headers: Mcp-Session-Id: <uuid>
```

**Use cases:**
- Web applications
- Multi-step workflows
- Real-time updates
- Long-running operations

### HTTP Stateless Mode

Serverless-friendly HTTP transport without sessions:

```typescript
const server = new BuildMCPServer({
  name: 'lambda-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,
    stateful: false,  // Stateless mode
  },
});

await server.start();
```

**Features:**
- No session tracking
- Each request is independent
- Perfect for serverless (AWS Lambda, Cloud Functions)
- No persistent state

**Endpoints:**
- `POST /mcp` - Handle any MCP request
- `GET /health` - Health check
- `GET /` - Server info
- No GET or DELETE (no sessions)

**Client flow:**

```typescript
// All requests are independent
POST /mcp
Body: { method: 'initialize', ... }

POST /mcp
Body: { method: 'tools/call', ... }

// No session ID needed
// No SSE streaming
```

**Use cases:**
- AWS Lambda / Cloud Functions
- Serverless deployments
- Load-balanced services
- Stateless microservices
- Simple REST-like APIs

### Transport Comparison

| Feature | Stdio | HTTP Stateful | HTTP Stateless |
|---------|-------|---------------|----------------|
| **Session** | Per-process | Header-based | None |
| **Streaming** | No | Yes (SSE) | No |
| **State** | In-process | Across requests | None |
| **Complexity** | Low | Medium | Low |
| **Scalability** | One client | Multiple sessions | High (serverless) |
| **Use Case** | CLI, Desktop | Web apps | Serverless, APIs |
| **Progress** | No | Yes | No |
| **Concurrent Clients** | 1 | Many | Unlimited |

**Choosing a transport:**

```typescript
// CLI tools, desktop apps
transport: { type: 'stdio' }

// Web apps, workflows, real-time
transport: { type: 'http', port: 3000, stateful: true }

// Serverless, load-balanced APIs
transport: { type: 'http', port: 3000, stateful: false }
```

---

## Handler System

### Handler Context

Every tool receives an optional `context` parameter:

```typescript
interface HandlerContext {
  logger: Logger;                       // Logging utilities
  metadata?: Record<string, any>;       // Request metadata
  sample?: SampleFunction;              // LLM sampling (if enabled)
  reportProgress?: ProgressFunction;    // Progress reporting (if token provided)
  readResource?: ResourceFunction;      // Resource reading (if resources exist)
}
```

**Using context:**

```typescript
server.addTool({
  name: 'process_data',
  description: 'Process data with progress',
  parameters: z.object({
    items: z.array(z.string()),
  }),
  execute: async (args, context) => {
    // Logging
    context?.logger.info('Starting processing');

    // Progress (if client provided progressToken)
    if (context?.reportProgress) {
      await context.reportProgress(0, args.items.length, 'Starting...');
    }

    // Process items
    for (let i = 0; i < args.items.length; i++) {
      const item = args.items[i];

      // Log each item
      context?.logger.debug(`Processing item ${i + 1}: ${item}`);

      // Report progress
      if (context?.reportProgress) {
        await context.reportProgress(i + 1, args.items.length, `Processing ${item}`);
      }
    }

    // Read a resource (if needed)
    if (context?.readResource) {
      const config = await context.readResource('config://server');
      context.logger.info(`Config: ${config.text}`);
    }

    return 'Processing complete';
  },
});
```

**Logger methods:**

```typescript
context.logger.debug('Debug message');
context.logger.info('Info message');
context.logger.warn('Warning message');
context.logger.error('Error message');

// With data
context.logger.info('User created', { userId: 123 });
```

### Return Values

Tools can return multiple formats:

**1. Simple string:**

```typescript
execute: async (args) => {
  return 'Simple text result';
}
```

**2. Structured HandlerResult:**

```typescript
execute: async (args) => {
  return {
    content: [
      { type: 'text', text: 'Processing complete' },
    ],
    metadata: {
      processedCount: 42,
      duration: 1234,
    },
  };
}
```

**3. Binary content (images, audio, files):**

```typescript
import { readFileSync } from 'fs';

execute: async (args) => {
  // Return Buffer or Uint8Array
  return readFileSync('image.png');
}

// Or with type hint
execute: async (args) => {
  return {
    type: 'image',
    data: readFileSync('image.png'),
    mimeType: 'image/png',
  };
}
```

**4. Multiple content items:**

```typescript
execute: async (args) => {
  return {
    content: [
      { type: 'text', text: 'Results:' },
      { type: 'text', text: JSON.stringify(data, null, 2) },
      {
        type: 'resource',
        resource: {
          uri: 'data://results',
          mimeType: 'application/json',
          text: JSON.stringify(data),
        },
      },
    ],
  };
}
```

**5. Errors:**

```typescript
execute: async (args) => {
  if (args.value < 0) {
    return {
      content: [
        { type: 'text', text: 'Error: Value must be positive' },
      ],
      isError: true,
    };
  }

  return 'Success';
}
```

### Error Handling

**Throwing errors:**

```typescript
execute: async (args) => {
  if (!args.required) {
    throw new Error('Missing required parameter');
  }

  try {
    const result = await externalAPI(args.query);
    return result;
  } catch (error) {
    throw new Error(`API error: ${error.message}`);
  }
}
```

**Returning errors:**

```typescript
execute: async (args) => {
  try {
    return await processData(args);
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}
```

**Validation errors (Zod):**

Zod automatically validates parameters. Invalid inputs return:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Validation Error:\nname: String must contain at least 3 character(s)\nage: Expected number, received string"
    }
  ],
  "isError": true
}
```

**Best practices:**
- Use Zod schemas for input validation
- Throw errors for unexpected conditions
- Return structured errors for user-facing issues
- Log errors with `context.logger.error()`
- Include helpful error messages

### Binary Content

**Images:**

```typescript
import { readFileSync } from 'fs';

server.addTool({
  name: 'get_image',
  description: 'Get an image file',
  parameters: z.object({
    path: z.string(),
  }),
  execute: async (args) => {
    const imageData = readFileSync(args.path);

    return {
      type: 'image',
      data: imageData,
      mimeType: 'image/png',
    };
  },
});
```

**Audio:**

```typescript
execute: async (args) => {
  const audioData = readFileSync('audio.mp3');

  return {
    type: 'audio',
    data: audioData,
    mimeType: 'audio/mpeg',
  };
}
```

**Generic binary:**

```typescript
execute: async (args) => {
  const pdfData = readFileSync('document.pdf');

  return {
    type: 'binary',
    data: pdfData,
    mimeType: 'application/pdf',
  };
}
```

**From file path:**

```typescript
execute: async (args) => {
  return {
    type: 'file',
    path: '/path/to/image.png',
    mimeType: 'image/png',
  };
}
```

---

## Configuration Options

### Server Options

```typescript
interface SimplyMCPOptions {
  // Required
  name: string;                  // Server name
  version: string;               // Semantic version

  // Optional
  description?: string;          // Server description
  basePath?: string;             // Base path (default: cwd)
  defaultTimeout?: number;       // Handler timeout (ms)

  // Transport
  transport?: {
    type?: 'stdio' | 'http';     // Transport type
    port?: number;               // HTTP port
    stateful?: boolean;          // HTTP mode
  };

  // Capabilities
  capabilities?: {
    sampling?: boolean;          // LLM sampling
    logging?: boolean;           // Logging notifications
  };
}
```

**Example:**

```typescript
const server = new BuildMCPServer({
  name: 'production-server',
  version: '2.1.0',
  description: 'Production MCP server with all features',
  basePath: '/opt/mcp-server',
  defaultTimeout: 60000,  // 60 seconds

  transport: {
    type: 'http',
    port: 8080,
    stateful: true,
  },

  capabilities: {
    sampling: false,
    logging: true,
  },
});
```

### Start Options

Override transport configuration at start time:

```typescript
interface StartOptions {
  transport?: 'stdio' | 'http';
  port?: number;
  stateful?: boolean;
}
```

**Examples:**

```typescript
// Start with stdio (override HTTP in constructor)
await server.start({ transport: 'stdio' });

// Start with HTTP on different port
await server.start({
  transport: 'http',
  port: 4000,
  stateful: false,
});

// Use constructor defaults
await server.start();
```

### Capabilities

**Logging capability:**

Enable client notifications:

```typescript
capabilities: {
  logging: true,
}
```

When enabled, `context.logger` sends notifications to the client:

```typescript
context.logger.info('User created');  // Sends to client
context.logger.warn('Rate limit approaching');
context.logger.error('Database connection failed');
```

**Sampling capability (Phase 1 - Planned):**

```typescript
capabilities: {
  sampling: true,
}
```

When enabled, tools can request LLM completions:

```typescript
execute: async (args, context) => {
  if (!context?.sample) {
    return 'Sampling not available';
  }

  const response = await context.sample([
    { role: 'user', content: 'Analyze this code...' },
  ], {
    maxTokens: 1000,
    temperature: 0.7,
  });

  return response;
}
```

---

## Advanced Features

### Progress Reporting

Report progress for long-running operations:

```typescript
server.addTool({
  name: 'process_large_file',
  description: 'Process a large file with progress updates',
  parameters: z.object({
    filePath: z.string(),
    chunkSize: z.number().default(1000),
  }),
  execute: async (args, context) => {
    // Only available if client provides progressToken
    if (!context?.reportProgress) {
      return 'Progress reporting not available';
    }

    const totalChunks = 100;

    // Initial progress
    await context.reportProgress(0, totalChunks, 'Starting processing...');

    // Process in chunks
    for (let i = 0; i < totalChunks; i++) {
      // Process chunk
      await processChunk(i);

      // Update progress
      await context.reportProgress(
        i + 1,
        totalChunks,
        `Processing chunk ${i + 1}/${totalChunks}`
      );

      // Log every 10 chunks
      if ((i + 1) % 10 === 0) {
        context.logger.info(`Progress: ${((i + 1) / totalChunks * 100).toFixed(0)}%`);
      }
    }

    // Final progress
    await context.reportProgress(totalChunks, totalChunks, 'Processing complete!');

    return `Processed ${totalChunks} chunks successfully`;
  },
});
```

**Progress function signature:**

```typescript
reportProgress(
  progress: number,    // Current progress (e.g., 5)
  total?: number,      // Total items (e.g., 10)
  message?: string     // Status message
): Promise<void>
```

### Logging Notifications

Send logs to the client (requires `logging` capability):

```typescript
server.addTool({
  name: 'batch_process',
  description: 'Process items in batch',
  parameters: z.object({
    items: z.array(z.string()),
  }),
  execute: async (args, context) => {
    context?.logger.info('Starting batch processing');

    for (const item of args.items) {
      try {
        context?.logger.debug(`Processing: ${item}`);
        await processItem(item);
      } catch (error) {
        context?.logger.error(`Failed to process ${item}`, {
          error: error.message,
        });
      }
    }

    context?.logger.info('Batch processing complete', {
      total: args.items.length,
    });

    return 'Batch complete';
  },
});
```

**Log levels:**
- `debug` - Detailed debugging information
- `info` - General informational messages
- `warn` - Warning messages
- `error` - Error messages

### Reading Resources

Tools can read registered resources:

```typescript
// Register a resource
server.addResource({
  uri: 'config://database',
  name: 'Database Config',
  description: 'Database configuration',
  mimeType: 'application/json',
  content: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
  },
});

// Read from tool
server.addTool({
  name: 'connect_db',
  description: 'Connect to database',
  parameters: z.object({}),
  execute: async (args, context) => {
    if (!context?.readResource) {
      return 'Resource reading not available';
    }

    const configResource = await context.readResource('config://database');
    const config = JSON.parse(configResource.text);

    context.logger.info(`Connecting to ${config.host}:${config.port}`);

    // Use config to connect...

    return `Connected to database: ${config.database}`;
  },
});
```

### Session Management

**HTTP Stateful mode** maintains sessions:

```typescript
const server = new BuildMCPServer({
  name: 'session-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,
    stateful: true,
  },
});

// Sessions are managed automatically
// Client receives Mcp-Session-Id header
// Client sends it with subsequent requests
```

**Session info:**

```typescript
// Get session count
console.log(`Active sessions: ${server.getStats().sessions || 0}`);
```

### Context Access

Full context object structure:

```typescript
interface HandlerContext {
  // Logger (always available)
  logger: {
    debug(message: string, data?: unknown): void;
    info(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, data?: unknown): void;
  };

  // Metadata (always available)
  metadata?: {
    toolName: string;
    progressToken?: string | number;
    [key: string]: any;
  };

  // Sampling (if capability enabled)
  sample?: (
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      stopSequences?: string[];
    }
  ) => Promise<any>;

  // Progress reporting (if client provides progressToken)
  reportProgress?: (
    progress: number,
    total?: number,
    message?: string
  ) => Promise<void>;

  // Resource reading (if resources registered)
  readResource?: (uri: string) => Promise<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
}
```

**Checking availability:**

```typescript
execute: async (args, context) => {
  // Check if feature is available
  if (context?.reportProgress) {
    await context.reportProgress(50, 100, 'Halfway');
  }

  if (context?.sample) {
    const response = await context.sample([...]);
  }

  if (context?.readResource) {
    const resource = await context.readResource('config://...');
  }

  // Logger is always available
  context?.logger.info('Always works');

  return 'Done';
}
```

---

## Complete Examples

### Simple Calculator

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'calculator',
  version: '1.0.0',
  description: 'Simple calculator server',
});

server.addTool({
  name: 'add',
  description: 'Add two numbers',
  parameters: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  execute: async ({ a, b }) => ({
    result: a + b,
    equation: `${a} + ${b} = ${a + b}`,
  }),
});

server.addTool({
  name: 'subtract',
  description: 'Subtract two numbers',
  parameters: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  execute: async ({ a, b }) => ({
    result: a - b,
    equation: `${a} - ${b} = ${a - b}`,
  }),
});

server.addTool({
  name: 'multiply',
  description: 'Multiply two numbers',
  parameters: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  execute: async ({ a, b }) => ({
    result: a * b,
    equation: `${a} × ${b} = ${a * b}`,
  }),
});

server.addTool({
  name: 'divide',
  description: 'Divide two numbers',
  parameters: z.object({
    a: z.number().describe('Dividend'),
    b: z.number().describe('Divisor (cannot be zero)'),
  }),
  execute: async ({ a, b }) => {
    if (b === 0) {
      return {
        content: [{ type: 'text', text: 'Error: Division by zero' }],
        isError: true,
      };
    }
    return {
      result: a / b,
      equation: `${a} ÷ ${b} = ${a / b}`,
    };
  },
});

await server.start({ transport: 'stdio' });
```

### Weather Service

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'weather-service',
  version: '1.0.0',
  description: 'Weather information service',
  capabilities: {
    logging: true,
  },
});

// Tool: Get current weather
server.addTool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: z.object({
    location: z.string().describe('City name or coordinates'),
    units: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  execute: async (args, context) => {
    context?.logger.info(`Fetching weather for ${args.location}`);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    const temp = args.units === 'celsius' ? 22 : 72;
    const unit = args.units === 'celsius' ? '°C' : '°F';

    return {
      content: [
        {
          type: 'text',
          text: `Weather in ${args.location}:\nTemperature: ${temp}${unit}\nConditions: Partly cloudy\nHumidity: 65%\nWind: 10 km/h`,
        },
      ],
      metadata: {
        location: args.location,
        temperature: temp,
        units: args.units,
        fetchedAt: new Date().toISOString(),
      },
    };
  },
});

// Tool: Get forecast
server.addTool({
  name: 'get_forecast',
  description: 'Get weather forecast',
  parameters: z.object({
    location: z.string(),
    days: z.number().int().min(1).max(7).default(3),
  }),
  execute: async (args, context) => {
    context?.logger.info(`Fetching ${args.days}-day forecast for ${args.location}`);

    const forecast = Array.from({ length: args.days }, (_, i) => ({
      day: `Day ${i + 1}`,
      high: 20 + Math.floor(Math.random() * 10),
      low: 10 + Math.floor(Math.random() * 10),
      conditions: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)],
    }));

    const text = forecast.map(f =>
      `${f.day}: ${f.high}°C / ${f.low}°C - ${f.conditions}`
    ).join('\n');

    return {
      content: [{ type: 'text', text: `Forecast for ${args.location}:\n${text}` }],
      metadata: { location: args.location, days: args.days },
    };
  },
});

// Prompt: Weather report
server.addPrompt({
  name: 'weather_report',
  description: 'Generate a weather report',
  arguments: [
    { name: 'location', description: 'Location', required: true },
    { name: 'style', description: 'Report style', required: false },
  ],
  template: `Generate a weather report for {{location}}.
Style: {{style}}

Include:
- Current conditions
- Temperature and feels-like
- Humidity and wind
- 3-day forecast
- Recommendations for activities`,
});

// Resource: Server configuration
server.addResource({
  uri: 'config://weather',
  name: 'Weather Config',
  description: 'Weather service configuration',
  mimeType: 'application/json',
  content: {
    version: '1.0.0',
    features: ['current', 'forecast'],
    defaultUnits: 'celsius',
    maxForecastDays: 7,
  },
});

await server.start({
  transport: 'http',
  port: 3000,
  stateful: true,
});
```

### File Processor

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const server = new BuildMCPServer({
  name: 'file-processor',
  version: '1.0.0',
  description: 'File processing utilities',
  capabilities: {
    logging: true,
  },
});

// Tool: List files
server.addTool({
  name: 'list_files',
  description: 'List files in a directory',
  parameters: z.object({
    path: z.string().default('.'),
    pattern: z.string().optional(),
  }),
  execute: async (args, context) => {
    try {
      context?.logger.info(`Listing files in ${args.path}`);

      const files = readdirSync(args.path);
      let filtered = files;

      if (args.pattern) {
        const regex = new RegExp(args.pattern.replace(/\*/g, '.*'));
        filtered = files.filter(f => regex.test(f));
      }

      const fileList = filtered.map(f => {
        const stats = statSync(join(args.path, f));
        return `${stats.isDirectory() ? '📁' : '📄'} ${f}`;
      }).join('\n');

      return {
        content: [
          { type: 'text', text: `Files in ${args.path}:\n${fileList}` },
        ],
        metadata: {
          path: args.path,
          totalFiles: filtered.length,
          pattern: args.pattern,
        },
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  },
});

// Tool: Read file
server.addTool({
  name: 'read_file',
  description: 'Read a text file',
  parameters: z.object({
    path: z.string(),
    encoding: z.enum(['utf8', 'ascii', 'base64']).default('utf8'),
  }),
  execute: async (args, context) => {
    try {
      context?.logger.info(`Reading file: ${args.path}`);
      const content = readFileSync(args.path, args.encoding);
      return content;
    } catch (error) {
      return {
        content: [
          { type: 'text', text: `Error reading file: ${error.message}` },
        ],
        isError: true,
      };
    }
  },
});

// Tool: Analyze text
server.addTool({
  name: 'analyze_text',
  description: 'Analyze text statistics',
  parameters: z.object({
    text: z.string().min(1),
    includeWordFrequency: z.boolean().default(false),
  }),
  execute: async (args, context) => {
    const words = args.text.trim().split(/\s+/);
    const chars = args.text.length;
    const lines = args.text.split('\n').length;
    const sentences = args.text.split(/[.!?]+/).filter(s => s.trim()).length;

    let result = `Text Analysis:
- Characters: ${chars}
- Words: ${words.length}
- Lines: ${lines}
- Sentences: ${sentences}
- Avg word length: ${(chars / words.length).toFixed(2)}`;

    if (args.includeWordFrequency) {
      const freq = words.reduce((acc, word) => {
        const lower = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (lower) acc[lower] = (acc[lower] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const top = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word, count]) => `  "${word}": ${count}`)
        .join('\n');

      result += `\n\nTop 5 words:\n${top}`;
    }

    return result;
  },
});

await server.start({ transport: 'stdio' });
```

### Multi-Tool Server

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'multi-tool-server',
  version: '2.0.0',
  description: 'Comprehensive server with multiple tools, prompts, and resources',
  capabilities: {
    logging: true,
  },
});

// ============================================================================
// TOOLS
// ============================================================================

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string(),
    formal: z.boolean().default(false),
  }),
  execute: async ({ name, formal }) => {
    const greeting = formal ? 'Good day' : 'Hello';
    return `${greeting}, ${name}!`;
  },
});

server.addTool({
  name: 'calculate',
  description: 'Perform calculations',
  parameters: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ operation, a, b }, context) => {
    context?.logger.info(`Calculating: ${a} ${operation} ${b}`);

    let result: number;
    switch (operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide':
        if (b === 0) return 'Error: Division by zero';
        result = a / b;
        break;
    }

    return `${a} ${operation} ${b} = ${result}`;
  },
});

server.addTool({
  name: 'create_user',
  description: 'Create a new user',
  parameters: z.object({
    username: z.string().min(3).max(20),
    email: z.string().email(),
    age: z.number().int().min(13).optional(),
    profile: z.object({
      firstName: z.string(),
      lastName: z.string(),
      bio: z.string().max(500).optional(),
    }),
  }),
  execute: async (args, context) => {
    context?.logger.info(`Creating user: ${args.username}`);

    const user = {
      id: Math.random().toString(36).substring(7),
      ...args,
      createdAt: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: 'text',
          text: `User created!\n${JSON.stringify(user, null, 2)}`,
        },
      ],
      metadata: { userId: user.id },
    };
  },
});

// ============================================================================
// PROMPTS
// ============================================================================

server.addPrompt({
  name: 'code_review',
  description: 'Code review prompt',
  arguments: [
    { name: 'language', description: 'Language', required: true },
    { name: 'focus', description: 'Focus area', required: false },
  ],
  template: `Review the {{language}} code.
{{#if focus}}Focus: {{focus}}{{/if}}

Check for:
- Code quality
- Bugs and edge cases
- Performance
- Security`,
});

server.addPrompt({
  name: 'explain_concept',
  description: 'Explain a concept',
  arguments: [
    { name: 'concept', description: 'Concept', required: true },
    { name: 'level', description: 'Level', required: false },
  ],
  template: `Explain {{concept}} at a {{level}} level.

Include:
- Definition
- Key principles
- Examples
- Common use cases`,
});

// ============================================================================
// RESOURCES
// ============================================================================

server.addResource({
  uri: 'config://server',
  name: 'Server Configuration',
  description: 'Server settings',
  mimeType: 'application/json',
  content: {
    name: 'multi-tool-server',
    version: '2.0.0',
    features: ['tools', 'prompts', 'resources'],
    maxConcurrent: 10,
  },
});

server.addResource({
  uri: 'doc://readme',
  name: 'README',
  description: 'Server documentation',
  mimeType: 'text/plain',
  content: `Multi-Tool Server

A comprehensive MCP server with:
- User management tools
- Calculation tools
- Code review prompts
- Concept explanation prompts

For more info, see the configuration at config://server`,
});

// ============================================================================
// START SERVER
// ============================================================================

await server.start({
  transport: 'http',
  port: 3000,
  stateful: true,
});

console.log('Multi-tool server running on port 3000');
```

---

## API Reference

### SimplyMCP Class

```typescript
class SimplyMCP {
  constructor(options: SimplyMCPOptions);

  // Properties
  readonly name: string;
  readonly version: string;
  readonly description?: string;

  // Methods
  addTool<T>(definition: ToolDefinition<T>): this;
  addPrompt(definition: PromptDefinition): this;
  addResource(definition: ResourceDefinition): this;

  async start(options?: StartOptions): Promise<void>;
  async stop(): Promise<void>;

  getInfo(): { name: string; version: string; isRunning: boolean };
  getStats(): { tools: number; prompts: number; resources: number };
}
```

### ToolDefinition Interface

```typescript
interface ToolDefinition<T = any> {
  name: string;                           // Tool name (snake_case)
  description: string;                    // Tool description
  parameters: ZodSchema<T>;               // Zod parameter schema
  execute: ExecuteFunction<T>;            // Handler function
}

type ExecuteFunction<T> = (
  args: T,
  context?: HandlerContext
) => Promise<string | HandlerResult> | string | HandlerResult;
```

### PromptDefinition Interface

```typescript
interface PromptDefinition {
  name: string;                           // Prompt name
  description: string;                    // Prompt description
  arguments?: Array<{                     // Prompt arguments
    name: string;
    description: string;
    required: boolean;
  }>;
  template: string | ((args: any) => string);  // Template or function
}
```

### ResourceDefinition Interface

```typescript
interface ResourceDefinition {
  uri: string;                            // Resource URI
  name: string;                           // Resource name
  description: string;                    // Resource description
  mimeType: string;                       // MIME type
  content: string | object | Buffer | Uint8Array;  // Content
}
```

### HandlerContext Interface

```typescript
interface HandlerContext {
  logger: Logger;                         // Logging utilities
  metadata?: Record<string, any>;         // Request metadata
  sample?: SampleFunction;                // LLM sampling
  reportProgress?: ProgressFunction;      // Progress reporting
  readResource?: ResourceFunction;        // Resource reading
}

interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

type ProgressFunction = (
  progress: number,
  total?: number,
  message?: string
) => Promise<void>;

type ResourceFunction = (uri: string) => Promise<{
  uri: string;
  mimeType: string;
  text: string;
}>;
```

### HandlerResult Interface

```typescript
interface HandlerResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    resource?: {
      uri: string;
      mimeType: string;
      text: string;
    };
  }>;
  metadata?: Record<string, any>;
  isError?: boolean;
}
```

---

## Best Practices

### Server Organization

**1. Group related tools:**

```typescript
// User management tools
server
  .addTool({ name: 'create_user', /* ... */ })
  .addTool({ name: 'update_user', /* ... */ })
  .addTool({ name: 'delete_user', /* ... */ });

// Data tools
server
  .addTool({ name: 'query_data', /* ... */ })
  .addTool({ name: 'insert_data', /* ... */ });
```

**2. Use consistent naming:**

```typescript
// Good: snake_case, descriptive
server.addTool({ name: 'get_user_profile', /* ... */ });
server.addTool({ name: 'update_user_settings', /* ... */ });

// Bad: inconsistent, vague
server.addTool({ name: 'getUserProfile', /* ... */ });
server.addTool({ name: 'update', /* ... */ });
```

**3. Extract schemas:**

```typescript
// Define schemas separately
const UserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  age: z.number().int().min(13).optional(),
});

const ProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  bio: z.string().max(500).optional(),
});

// Reuse in tools
server.addTool({
  name: 'create_user',
  parameters: z.object({
    user: UserSchema,
    profile: ProfileSchema,
  }),
  execute: async (args) => { /* ... */ },
});
```

**4. Centralize configuration:**

```typescript
const CONFIG = {
  name: 'my-server',
  version: '1.0.0',
  port: 3000,
  timeout: 30000,
};

const server = new BuildMCPServer({
  name: CONFIG.name,
  version: CONFIG.version,
  defaultTimeout: CONFIG.timeout,
  transport: {
    type: 'http',
    port: CONFIG.port,
  },
});
```

### Error Handling Patterns

**1. Validate early:**

```typescript
execute: async (args, context) => {
  // Let Zod validate first
  // Additional validation
  if (args.items.length === 0) {
    return {
      content: [{ type: 'text', text: 'Error: No items provided' }],
      isError: true,
    };
  }

  // Process...
}
```

**2. Use try-catch for external calls:**

```typescript
execute: async (args, context) => {
  try {
    const result = await externalAPI(args.query);
    return result;
  } catch (error) {
    context?.logger.error('API call failed', { error: error.message });
    return {
      content: [
        { type: 'text', text: `API error: ${error.message}` },
      ],
      isError: true,
    };
  }
}
```

**3. Return structured errors:**

```typescript
execute: async (args) => {
  if (args.value < 0) {
    return {
      content: [
        { type: 'text', text: 'Validation error: Value must be non-negative' },
      ],
      isError: true,
      metadata: {
        errorCode: 'INVALID_VALUE',
        value: args.value,
      },
    };
  }

  return 'Success';
}
```

**4. Log errors:**

```typescript
execute: async (args, context) => {
  try {
    return await processData(args);
  } catch (error) {
    context?.logger.error('Processing failed', {
      args,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
```

### Schema Design

**1. Always add descriptions:**

```typescript
parameters: z.object({
  query: z.string()
    .describe('Search query (keywords or phrases)'),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('Maximum results (1-100, default: 10)'),
})
```

**2. Use appropriate constraints:**

```typescript
// String constraints
username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
email: z.string().email().toLowerCase(),
url: z.string().url(),

// Number constraints
age: z.number().int().min(0).max(120),
score: z.number().min(0).max(100).multipleOf(0.1),
price: z.number().positive(),

// Array constraints
tags: z.array(z.string()).min(1).max(10),
items: z.array(z.object({ id: z.string() })).nonempty(),
```

**3. Prefer enums over strings:**

```typescript
// Good: Type-safe enum
status: z.enum(['pending', 'approved', 'rejected'])

// Bad: Open string
status: z.string()
```

**4. Use optional with defaults wisely:**

```typescript
// Optional with default
limit: z.number().default(10)

// Optional without default (truly optional)
filter: z.string().optional()

// Required but with fallback in code
theme: z.enum(['light', 'dark'])
execute: async (args) => {
  const theme = args.theme || 'light';
}
```

### Performance Tips

**1. Avoid heavy work in initialization:**

```typescript
// Bad: Heavy work in constructor
const server = new BuildMCPServer({ /* ... */ });
const data = loadLargeDataset();  // Blocks startup

// Good: Load on demand
server.addTool({
  name: 'query_data',
  execute: async (args) => {
    const data = await loadDataset();  // Load when needed
    return queryData(data, args.query);
  },
});
```

**2. Use async properly:**

```typescript
// Good: Parallel execution
execute: async (args) => {
  const [data1, data2, data3] = await Promise.all([
    fetchData1(),
    fetchData2(),
    fetchData3(),
  ]);
  return combineData(data1, data2, data3);
}

// Bad: Sequential execution
execute: async (args) => {
  const data1 = await fetchData1();
  const data2 = await fetchData2();
  const data3 = await fetchData3();
  return combineData(data1, data2, data3);
}
```

**3. Report progress for long operations:**

```typescript
execute: async (args, context) => {
  const items = args.items;

  for (let i = 0; i < items.length; i++) {
    await processItem(items[i]);

    // Update every 10 items
    if (context?.reportProgress && i % 10 === 0) {
      await context.reportProgress(i, items.length);
    }
  }
}
```

**4. Set appropriate timeouts:**

```typescript
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  defaultTimeout: 60000,  // 60 seconds for slow operations
});
```

---

## Troubleshooting

### Common Errors

#### 1. "Cannot add tools after server has started"

**Problem:**
```typescript
await server.start();
server.addTool({ /* ... */ });  // ERROR
```

**Solution:**
Add all tools before starting:

```typescript
server.addTool({ /* ... */ });
server.addTool({ /* ... */ });
await server.start();
```

#### 2. "Tool 'name' is already registered"

**Problem:**
```typescript
server.addTool({ name: 'search', /* ... */ });
server.addTool({ name: 'search', /* ... */ });  // ERROR
```

**Solution:**
Use unique names or remove duplicate:

```typescript
server.addTool({ name: 'search_users', /* ... */ });
server.addTool({ name: 'search_products', /* ... */ });
```

#### 3. "Unknown tool: name"

**Problem:**
Client calls a tool that doesn't exist.

**Solution:**
1. Check tool name for typos
2. Ensure tool was registered
3. List registered tools: `server.getStats()`

#### 4. "Validation Error: ..."

**Problem:**
Invalid arguments passed to tool.

**Solution:**
Check Zod schema requirements:

```typescript
// Schema requires string
parameters: z.object({
  name: z.string(),
})

// Client sent number
{ name: 123 }  // ERROR

// Fix: send string
{ name: "John" }  // OK
```

#### 5. "Server not initialized"

**Problem:**
Internal error, server instance wasn't created.

**Solution:**
Report bug with configuration and steps to reproduce.

### Debugging Tips

**1. Enable verbose logging:**

```typescript
server.addTool({
  name: 'debug_tool',
  execute: async (args, context) => {
    context?.logger.debug('Arguments:', args);
    context?.logger.info('Processing started');

    const result = await process(args);

    context?.logger.debug('Result:', result);
    return result;
  },
});
```

**2. Check server stats:**

```typescript
const stats = server.getStats();
console.log('Registered tools:', stats.tools);
console.log('Registered prompts:', stats.prompts);
console.log('Registered resources:', stats.resources);
```

**3. Test tools in isolation:**

```typescript
const server = new BuildMCPServer({
  name: 'test-server',
  version: '1.0.0',
});

server.addTool({
  name: 'test_tool',
  parameters: z.object({ value: z.number() }),
  execute: async (args) => {
    console.log('Tool called with:', args);
    return 'Test result';
  },
});

// Test manually
const result = await server['tools'].get('test_tool')?.definition.execute({ value: 42 });
console.log('Result:', result);
```

**4. Use HTTP mode for easier debugging:**

```typescript
await server.start({
  transport: 'http',
  port: 3000,
  stateful: false,
});

// Test with curl
// curl -X POST http://localhost:3000/mcp \
//   -H "Content-Type: application/json" \
//   -d '{"method":"tools/list"}'
```

**5. Check Zod schema:**

```typescript
const schema = z.object({
  name: z.string(),
  age: z.number().int().min(0),
});

// Test schema
const result = schema.safeParse({ name: 'John', age: 25 });
if (!result.success) {
  console.error('Validation errors:', result.error.issues);
} else {
  console.log('Valid data:', result.data);
}
```

### Getting Help

If you encounter issues:

1. **Check documentation:**
   - [Main README](../../README.md)
   - [Troubleshooting Guide](../../src/docs/TROUBLESHOOTING.md)
   - [API Reference](../../src/docs/INDEX.md)

2. **Search existing issues:**
   - [GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)

3. **Ask for help:**
   - [GitHub Discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)

4. **Report bugs:**
   - Include server configuration
   - Provide minimal reproduction
   - Share error messages and stack traces
   - Include Node.js and package versions

---

## Migration Guide

### From Decorator API

**Before (Decorator):**

```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer()
export default class Calculator {
  @tool()
  async add(a: number, b: number) {
    return { result: a + b };
  }
}
```

**After (Functional):**

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'calculator',
  version: '1.0.0',
});

server.addTool({
  name: 'add',
  description: 'Add two numbers',
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ a, b }) => ({ result: a + b }),
});

await server.start();
```

**Key differences:**
- Replace `@MCPServer()` with `new BuildMCPServer()`
- Replace `@tool()` with `server.addTool()`
- Add explicit Zod schemas
- Call `await server.start()`

### From Interface API

**Before (Interface):**

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: number; b: number };
  result: { sum: number };
}

interface Calculator extends IServer {
  name: 'calculator';
  version: '1.0.0';
}

export default class CalculatorService implements Calculator {
  add: AddTool = async (params) => ({
    sum: params.a + params.b,
  });
}
```

**After (Functional):**

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'calculator',
  version: '1.0.0',
});

server.addTool({
  name: 'add',
  description: 'Add two numbers',
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ a, b }) => ({ sum: a + b }),
});

await server.start();
```

**Key differences:**
- Replace interface definitions with `new BuildMCPServer()`
- Replace method implementations with `server.addTool()`
- Convert TypeScript types to Zod schemas
- No class needed

### From JSON Config

**Before (JSON):**

```json
{
  "name": "calculator",
  "version": "1.0.0",
  "tools": [
    {
      "name": "add",
      "description": "Add two numbers",
      "inputSchema": {
        "type": "object",
        "properties": {
          "a": { "type": "number" },
          "b": { "type": "number" }
        },
        "required": ["a", "b"]
      },
      "handler": "./handlers/add.js"
    }
  ]
}
```

**After (Functional):**

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'calculator',
  version: '1.0.0',
});

server.addTool({
  name: 'add',
  description: 'Add two numbers',
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ a, b }) => ({ result: a + b }),
});

await server.start();
```

**Key differences:**
- Move from JSON to TypeScript
- Replace JSON Schema with Zod
- Inline handler logic
- Full type safety

---

## API Comparison

### Functional vs Decorator

| Feature | Functional API | Decorator API |
|---------|---------------|---------------|
| **Style** | Imperative | Declarative |
| **Registration** | Explicit (`addTool()`) | Automatic (`@tool()`) |
| **Organization** | Procedural | Class-based |
| **Schemas** | Zod (explicit) | Zod or inferred |
| **Type Safety** | Runtime + compile | Runtime + compile |
| **Learning Curve** | Easy | Easy |
| **Boilerplate** | Low | Low |
| **Dynamic Tools** | ✅ Excellent | ❌ Limited |
| **Testing** | ✅ Excellent | ⭐ Good |
| **Code Visibility** | ✅ High | ⭐ Medium |
| **Best For** | Dynamic servers, testing | Class-based apps |

**When to choose:**
- **Functional** → Runtime control, testing, procedural style
- **Decorator** → Class-based organization, OOP patterns

### Functional vs Interface

| Feature | Functional API | Interface API |
|---------|---------------|---------------|
| **Style** | Imperative | Declarative |
| **Schemas** | Zod (explicit) | TypeScript → Zod (auto) |
| **Type Safety** | Runtime | Compile-time |
| **Boilerplate** | Medium | ✅ Minimal |
| **Code Clarity** | ⭐ Good | ✅ Excellent |
| **Learning Curve** | Easy | Easy |
| **Dynamic Tools** | ✅ Excellent | ❌ No |
| **Testing** | ✅ Excellent | ⭐ Good |
| **Runtime Flexibility** | ✅ High | ❌ Low |
| **Best For** | Dynamic servers | Static servers |

**When to choose:**
- **Functional** → Runtime control, dynamic servers, testing
- **Interface** → Cleanest code, static servers, TypeScript-first

### Feature Matrix

| Feature | Functional | Decorator | Interface |
|---------|-----------|-----------|-----------|
| **Tools** | ✅ | ✅ | ✅ |
| **Prompts** | ✅ | ✅ | ✅ |
| **Resources** | ✅ | ✅ | ✅ |
| **Progress Reporting** | ✅ | ✅ | ✅ |
| **Logging** | ✅ | ✅ | ✅ |
| **Binary Content** | ✅ | ✅ | ✅ |
| **HTTP Transport** | ✅ | ✅ | ✅ |
| **Stdio Transport** | ✅ | ✅ | ✅ |
| **Stateful HTTP** | ✅ | ✅ | ✅ |
| **Stateless HTTP** | ✅ | ✅ | ✅ |
| **Dynamic Registration** | ✅ | ❌ | ❌ |
| **Runtime Flexibility** | ✅ | ❌ | ❌ |
| **Zero Boilerplate** | ❌ | ❌ | ✅ |
| **Auto Schema Gen** | ❌ | ⭐ Partial | ✅ |

---

## Summary

The **Functional API** is Simply MCP's programmatic approach:

✅ **Maximum control** - Explicit registration, full visibility
✅ **Runtime flexibility** - Build servers dynamically
✅ **Excellent testing** - Easy mocking and isolation
✅ **Type safety** - Zod + TypeScript
✅ **Simple learning** - Straightforward imperative style

**Get started now:**

```bash
npm install simply-mcp
```

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0'
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async ({ name }) => `Hello, ${name}!`,
});

await server.start();
```

```bash
npx simply-mcp run server.ts
```

**Learn more:**
- [Main README](../../README.md)
- [Interface API Guide](./INTERFACE_API_GUIDE.md)
- [Decorator API Guide](../development/DECORATOR-API.md)
- [Examples](../../examples/)

---

**Questions or feedback?** Open an issue on [GitHub](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)!
