# Configuration Guide

> **Complete guide to configuring Simply MCP servers - all methods, options, and patterns**

## Table of Contents

- [Introduction](#introduction)
- [Configuration Methods](#configuration-methods)
  - [In-Code Configuration](#in-code-configuration)
  - [Configuration Files](#configuration-files)
  - [Environment Variables](#environment-variables)
  - [CLI Flags](#cli-flags)
  - [Configuration Hierarchy](#configuration-hierarchy)
- [Server Configuration](#server-configuration)
  - [Name and Version](#name-and-version)
  - [Description](#description)
  - [Base Path](#base-path)
  - [Timeout Settings](#timeout-settings)
- [Transport Configuration](#transport-configuration)
  - [Transport Types](#transport-types)
  - [Stdio Transport](#stdio-transport)
  - [HTTP Stateful Mode](#http-stateful-mode)
  - [HTTP Stateless Mode](#http-stateless-mode)
  - [Port Configuration](#port-configuration)
- [Capabilities Configuration](#capabilities-configuration)
  - [Logging Capability](#logging-capability)
  - [Sampling Capability](#sampling-capability)
- [Feature Configuration](#feature-configuration)
  - [Watch Mode](#watch-mode)
  - [Debug Mode](#debug-mode)
  - [Verbose Output](#verbose-output)
  - [Dry Run](#dry-run)
- [Development Configuration](#development-configuration)
  - [Hot Reload](#hot-reload)
  - [Inspector Mode](#inspector-mode)
  - [Local Development](#local-development)
- [Production Configuration](#production-configuration)
  - [Security Settings](#security-settings)
  - [Performance Tuning](#performance-tuning)
  - [Error Handling](#error-handling)
- [Configuration File Format](#configuration-file-format)
  - [TypeScript Config](#typescript-config)
  - [JavaScript Config](#javascript-config)
  - [JSON Config](#json-config)
  - [Complete Schema](#complete-schema)
- [Environment Variables](#environment-variables-reference)
- [CLI Configuration Command](#cli-configuration-command)
- [Configuration Patterns](#configuration-patterns)
  - [Development Environment](#development-environment)
  - [Staging Environment](#staging-environment)
  - [Production Environment](#production-environment)
  - [Multi-Server Setup](#multi-server-setup)
  - [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Reference Tables](#reference-tables)

---

## Introduction

Simply MCP supports multiple configuration methods to fit different workflows. You can configure servers through:

1. **In-code configuration** - Direct API calls in your server code
2. **Configuration files** - `simplymcp.config.ts/js/json` files
3. **Environment variables** - `PORT`, `DEBUG`, etc.
4. **CLI flags** - `--http`, `--port 3000`, etc.

**Configuration hierarchy** (highest to lowest precedence):
```
CLI flags > Environment variables > Config file > In-code config > Defaults
```

**Version:** This guide covers Simply MCP v2.5.0-beta.3

---

## Configuration Methods

### In-Code Configuration

Configure servers directly in your TypeScript/JavaScript code.

#### Functional API

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  // Server identity
  name: 'my-server',
  version: '1.0.0',
  description: 'My awesome MCP server',

  // File paths
  basePath: process.cwd(),

  // Performance
  defaultTimeout: 30000,  // 30 seconds

  // Transport
  transport: {
    type: 'http',
    port: 3000,
    stateful: true
  },

  // Capabilities
  capabilities: {
    logging: true,
    sampling: false
  }
});

await server.start();
```

#### Decorator API

```typescript
import { MCPServer } from 'simply-mcp';

@MCPServer({
  name: 'weather-service',
  version: '2.0.0',
  description: 'Weather information service',

  transport: {
    type: 'http',
    port: 8080,
    stateful: true
  },

  capabilities: {
    logging: true,
    sampling: false
  }
})
export default class WeatherService {
  // Tools...
}
```

#### Interface API

Server metadata is defined in interfaces:

```typescript
import type { IServer } from 'simply-mcp';

interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  description: 'My server description';
}

export default class MyServerImpl implements MyServer {
  // Implementation...
}
```

Transport is configured via CLI flags:

```bash
npx simply-mcp run server.ts --http --port 3000
```

### Configuration Files

Create a `simplymcp.config.ts/js/json` file for reusable configurations.

**Supported file names:**
- `simplymcp.config.ts` (recommended)
- `simplymcp.config.js`
- `simplymcp.config.mjs`
- `simplymcp.config.json`
- `simplemcp.config.ts`
- `simplemcp.config.js`
- `.simplymcprc.json`
- `.simplymcprc.js`

**Location:** Place in project root or specify with `--config` flag.

**Basic structure:**

```typescript
// simplymcp.config.ts
import { defineConfig } from 'simply-mcp/config';

export default defineConfig({
  // Default server (when no file specified)
  defaultServer: 'api-server',

  // Named server configurations
  servers: {
    'api-server': {
      entry: './src/api-server.ts',
      transport: 'http',
      port: 3000,
      watch: true,
    },
    'worker-server': {
      entry: './src/worker.ts',
      transport: 'stdio',
    }
  },

  // Global defaults for all servers
  defaults: {
    transport: 'stdio',
    verbose: false,
    watch: false,
  }
});
```

**Usage:**

```bash
# Run default server
npx simply-mcp run

# Run named server
npx simply-mcp run api-server

# Run specific file
npx simply-mcp run custom-server.ts

# Use custom config file
npx simply-mcp run server.ts --config my-config.ts
```

### Environment Variables

Set environment variables to configure runtime behavior.

**Common variables:**

```bash
# Port configuration
PORT=3000 npx simply-mcp run server.ts --http

# Node.js options
NODE_OPTIONS='--max-old-space-size=4096' npx simply-mcp run server.ts

# Debug mode
DEBUG=* npx simply-mcp run server.ts

# Custom environment (for use in server code)
API_KEY=secret123 npx simply-mcp run server.ts
```

**Accessing in server code:**

```typescript
server.addTool({
  name: 'api_call',
  description: 'Call external API',
  parameters: z.object({}),
  execute: async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API_KEY not configured');
    }
    // Use apiKey...
  }
});
```

**Config file environment variables:**

```typescript
export default defineConfig({
  servers: {
    'prod-server': {
      entry: './server.ts',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      }
    }
  }
});
```

### CLI Flags

Override configuration with command-line flags.

**Available flags:**

```bash
# Transport
--http                  # Use HTTP transport
--port <number>         # HTTP port (default: 3000)

# Development
--watch                 # Enable watch mode
--watch-poll            # Use polling for watch mode
--watch-interval <ms>   # Polling interval (default: 1000)
--verbose, -v           # Verbose output
--inspect               # Enable Node.js inspector
--inspect-port <port>   # Inspector port (default: 9229)

# Validation
--dry-run               # Validate without running

# API style
--style <style>         # Force API style (decorator/functional/interface)

# Config
--config <file>         # Custom config file path

# Help
--help, -h              # Show help
```

**Examples:**

```bash
# HTTP on port 8080
npx simply-mcp run server.ts --http --port 8080

# Watch mode with verbose output
npx simply-mcp run server.ts --watch --verbose

# Debug with inspector
npx simply-mcp run server.ts --inspect --inspect-port 9230

# Validate without running
npx simply-mcp run server.ts --dry-run

# Multiple servers
npx simply-mcp run server1.ts server2.ts server3.ts
```

### Configuration Hierarchy

When multiple configuration methods are used, this is the precedence order:

```
┌─────────────────────────────┐
│  1. CLI Flags (Highest)     │ --port 3000
├─────────────────────────────┤
│  2. Environment Variables   │ PORT=3000
├─────────────────────────────┤
│  3. Config File             │ simplymcp.config.ts
├─────────────────────────────┤
│  4. In-Code Configuration   │ new BuildMCPServer({ port: 3000 })
├─────────────────────────────┤
│  5. Defaults (Lowest)       │ 3000
└─────────────────────────────┘
```

**Example:**

```typescript
// In code: port 3000
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  transport: { type: 'http', port: 3000 }
});

// Config file: port 4000
export default defineConfig({
  servers: {
    'my-server': {
      entry: './server.ts',
      port: 4000
    }
  }
});

// CLI flag: port 5000
// npx simply-mcp run server.ts --port 5000

// Result: Server runs on port 5000 (CLI flag wins)
```

---

## Server Configuration

### Name and Version

Server identity is the foundation of configuration.

**Functional API:**

```typescript
const server = new BuildMCPServer({
  name: 'my-server',        // Required: kebab-case recommended
  version: '1.0.0',         // Required: semantic versioning
  description: 'Optional description'
});
```

**Decorator API:**

```typescript
@MCPServer({
  name: 'my-server',        // Optional: auto-generated from class name
  version: '1.0.0',         // Optional: auto-detected from package.json
  description: 'My server'
})
export default class MyServer { }
```

**Interface API:**

```typescript
interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  description: 'My server';
}
```

**Best practices:**
- Use kebab-case for names: `weather-service`, `api-server`
- Follow semantic versioning: `MAJOR.MINOR.PATCH`
- Keep descriptions under 100 characters
- Use descriptive names that reflect server purpose

### Description

Optional human-readable description.

```typescript
const server = new BuildMCPServer({
  name: 'analytics-server',
  version: '2.0.0',
  description: 'Real-time analytics and reporting MCP server'
});
```

**When to use:**
- Multi-server deployments (helps identify servers)
- Public/shared servers (documents purpose)
- API documentation generation

### Base Path

Base directory for file operations.

```typescript
const server = new BuildMCPServer({
  name: 'file-server',
  version: '1.0.0',
  basePath: '/opt/mcp-data',  // Default: process.cwd()
});
```

**Use cases:**
- File reading/writing tools
- Binary content handling
- Resource path resolution
- Dependency installation

**Example:**

```typescript
server.addTool({
  name: 'read_file',
  description: 'Read a file',
  parameters: z.object({
    path: z.string()
  }),
  execute: async (args) => {
    // Paths are resolved relative to basePath
    const fullPath = path.join(server.basePath, args.path);
    return await readFile(fullPath, 'utf-8');
  }
});
```

### Timeout Settings

Configure handler execution timeouts.

```typescript
const server = new BuildMCPServer({
  name: 'api-server',
  version: '1.0.0',
  defaultTimeout: 60000,  // 60 seconds (default: 5000)
});
```

**Considerations:**
- Short timeout (5s): Fast operations, quick feedback
- Medium timeout (30s): API calls, database queries
- Long timeout (60s+): File processing, batch operations
- No timeout: Set to `0` (use with caution)

**Per-tool timeout:**

```typescript
// Functional API supports per-handler timeout via HandlerManager
// Currently global only; per-tool timeout is roadmap feature
```

---

## Transport Configuration

### Transport Types

Simply MCP supports two transport types:

| Transport | Use Case | Features |
|-----------|----------|----------|
| **stdio** | CLI tools, desktop apps | Simple, single-client, lightweight |
| **http** | Web apps, APIs, serverless | Multi-client, stateful/stateless modes |

**Choosing a transport:**

```typescript
// CLI tools, Claude Desktop integration
transport: { type: 'stdio' }

// Web applications, workflows
transport: { type: 'http', port: 3000, stateful: true }

// Serverless, load-balanced APIs
transport: { type: 'http', port: 3000, stateful: false }
```

### Stdio Transport

Standard input/output transport for CLI usage.

**Configuration:**

```typescript
const server = new BuildMCPServer({
  name: 'cli-server',
  version: '1.0.0',
  transport: {
    type: 'stdio'
  }
});

await server.start();
```

**CLI usage:**

```bash
# Default transport is stdio
npx simply-mcp run server.ts

# Explicit stdio flag
npx simply-mcp run server.ts --stdio
```

**Characteristics:**
- Communication via stdin/stdout
- Logs to stderr (won't interfere with protocol)
- One client per process
- Automatic graceful shutdown on SIGINT (Ctrl+C)
- Lightweight and fast

**When to use:**
- Claude Desktop integration
- CLI tools and scripts
- Piped workflows
- Simple single-client servers

### HTTP Stateful Mode

Session-based HTTP transport with SSE streaming.

**Configuration:**

```typescript
const server = new BuildMCPServer({
  name: 'web-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,
    stateful: true  // Default
  }
});

await server.start();
```

**Features:**
- Session management via `Mcp-Session-Id` header
- Server-Sent Events (SSE) for streaming
- Persistent connections
- Multiple concurrent sessions
- State maintained across requests

**Endpoints:**
- `POST /mcp` - Initialize session and handle requests
- `GET /mcp` - SSE stream (requires session ID)
- `DELETE /mcp` - Terminate session
- `GET /health` - Health check
- `GET /` - Server info

**Client flow:**

```bash
# 1. Initialize (creates session)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"initialize","params":{"protocolVersion":"1.0"}}'
# Response includes: Mcp-Session-Id header

# 2. Subsequent requests (use session ID)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{"method":"tools/list"}'

# 3. Subscribe to events (optional, SSE)
curl http://localhost:3000/mcp \
  -H "Mcp-Session-Id: <session-id>"

# 4. Terminate (optional)
curl -X DELETE http://localhost:3000/mcp \
  -H "Mcp-Session-Id: <session-id>"
```

**When to use:**
- Web applications
- Multi-step workflows
- Real-time updates
- Long-running conversations
- Session-based state

### HTTP Stateless Mode

Serverless-friendly HTTP transport without sessions.

**Configuration:**

```typescript
const server = new BuildMCPServer({
  name: 'lambda-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,
    stateful: false  // Stateless mode
  }
});

await server.start();
```

**Features:**
- No session tracking
- Each request is independent
- Perfect for serverless (AWS Lambda, Cloud Functions)
- No persistent state
- Unlimited scalability

**Endpoints:**
- `POST /mcp` - Handle any MCP request
- `GET /health` - Health check
- `GET /` - Server info
- No GET or DELETE (no sessions)

**Client flow:**

```bash
# All requests are independent (no session)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'

# No session ID needed
# No SSE streaming
```

**When to use:**
- AWS Lambda / Cloud Functions
- Serverless deployments
- Load-balanced services
- Stateless microservices
- Simple REST-like APIs

**Comparison:**

| Feature | Stateful | Stateless |
|---------|----------|-----------|
| Session ID | Required (after init) | Not used |
| State | Maintained | None |
| Streaming (SSE) | Yes | No |
| Scalability | Limited (sessions) | Unlimited |
| Complexity | Medium | Low |
| Best for | Web apps, workflows | Serverless, APIs |

### Port Configuration

Configure HTTP server port.

**In code:**

```typescript
transport: { type: 'http', port: 8080 }
```

**Config file:**

```typescript
servers: {
  'api': { entry: './api.ts', port: 8080 }
}
```

**CLI flag:**

```bash
npx simply-mcp run server.ts --http --port 8080
```

**Environment variable:**

```bash
PORT=8080 npx simply-mcp run server.ts --http
```

**Default:** 3000

**Valid range:** 1-65535

**Port selection guide:**
- `3000-3999`: Development ports
- `4000-4999`: Application ports
- `8000-8999`: Alternative HTTP ports
- `9000-9999`: Developer tools
- Avoid: `80`, `443` (require root), `3306` (MySQL), `5432` (PostgreSQL)

---

## Capabilities Configuration

### Logging Capability

Enable logging notifications to the client.

**Configuration:**

```typescript
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  capabilities: {
    logging: true  // Enable logging (default: false)
  }
});
```

**Usage in tools:**

```typescript
server.addTool({
  name: 'process_data',
  description: 'Process data with logging',
  parameters: z.object({
    data: z.string()
  }),
  execute: async (args, context) => {
    // Logs are sent to client if logging capability enabled
    context?.logger.info('Starting processing');
    context?.logger.debug('Data:', args.data);

    // Process...

    context?.logger.info('Processing complete');
    return 'Done';
  }
});
```

**Log levels:**
- `debug` - Detailed debugging information
- `info` - General informational messages
- `warn` - Warning messages
- `error` - Error messages

**When to enable:**
- Debugging complex workflows
- Monitoring long-running operations
- Providing user feedback
- Tracking execution flow

**Performance impact:** Minimal (notifications are async)

### Sampling Capability

Enable LLM sampling/completion requests (planned feature).

**Configuration:**

```typescript
const server = new BuildMCPServer({
  name: 'ai-server',
  version: '1.0.0',
  capabilities: {
    sampling: true  // Enable sampling (planned)
  }
});
```

**Usage (planned):**

```typescript
server.addTool({
  name: 'analyze_text',
  description: 'Analyze text with AI',
  parameters: z.object({
    text: z.string()
  }),
  execute: async (args, context) => {
    if (!context?.sample) {
      return 'Sampling not available';
    }

    const response = await context.sample([
      { role: 'user', content: `Analyze: ${args.text}` }
    ], {
      maxTokens: 1000,
      temperature: 0.7
    });

    return response;
  }
});
```

**Status:** Planned for future release (client support required)

---

## Feature Configuration

### Watch Mode

Auto-restart server on file changes.

**CLI usage:**

```bash
# Enable watch mode
npx simply-mcp run server.ts --watch

# Watch with polling (for network drives)
npx simply-mcp run server.ts --watch --watch-poll

# Custom polling interval (ms)
npx simply-mcp run server.ts --watch --watch-poll --watch-interval 2000
```

**Config file:**

```typescript
export default defineConfig({
  servers: {
    'dev-server': {
      entry: './server.ts',
      watch: true  // Enable for this server
    }
  },
  defaults: {
    watch: false  // Default for all servers
  }
});
```

**Watched files:**
- Server entry file
- Imported modules
- Dependencies (node_modules are excluded)

**Use cases:**
- Local development
- Rapid iteration
- Testing changes
- Hot reload workflows

**Performance:**
- Normal mode: Uses native FS events (fast)
- Poll mode: Checks files periodically (slower, compatible)

### Debug Mode

Enable Node.js inspector for debugging.

**CLI usage:**

```bash
# Enable inspector (default port: 9229)
npx simply-mcp run server.ts --inspect

# Custom inspector port
npx simply-mcp run server.ts --inspect --inspect-port 9230

# Break on first line
npx simply-mcp run server.ts --inspect-brk
```

**Chrome DevTools:**

1. Start server with `--inspect`
2. Open Chrome: `chrome://inspect`
3. Click "Configure" and add `localhost:9229`
4. Click "inspect" under Remote Target

**VS Code:**

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Server",
      "program": "${workspaceFolder}/server.ts",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["simply-mcp", "run"],
      "args": ["--inspect"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Verbose Output

Enable detailed logging.

**CLI usage:**

```bash
# Verbose output
npx simply-mcp run server.ts --verbose
npx simply-mcp run server.ts -v
```

**Config file:**

```typescript
export default defineConfig({
  defaults: {
    verbose: true
  }
});
```

**What gets logged:**
- Server initialization
- Tool registration
- Request processing
- Error details
- Performance metrics

**When to use:**
- Debugging issues
- Understanding execution flow
- Performance analysis
- Production monitoring (use with caution)

### Dry Run

Validate configuration without starting server.

**CLI usage:**

```bash
# Validate server
npx simply-mcp run server.ts --dry-run

# Check config file
npx simply-mcp config validate

# List servers in config
npx simply-mcp config list
```

**What gets checked:**
- File existence
- Syntax errors
- Configuration validity
- Import resolution
- Schema validation

**Use cases:**
- Pre-deployment validation
- CI/CD checks
- Configuration testing
- Troubleshooting

---

## Development Configuration

### Hot Reload

Watch mode provides hot reload functionality.

**Configuration:**

```bash
# Watch mode with verbose output
npx simply-mcp run server.ts --watch --verbose
```

**What gets reloaded:**
- Server code changes
- Tool modifications
- Schema updates
- Dependency changes (triggers restart)

**Preserved state:**
- HTTP sessions (cleared on reload)
- In-memory data (reset)
- File system state (unchanged)

**Best practices:**
- Use for development only
- Don't rely on session persistence
- Test reload scenarios
- Clear state between reloads

### Inspector Mode

Debug server with Chrome DevTools or VS Code.

**Breakpoint debugging:**

```typescript
server.addTool({
  name: 'debug_example',
  description: 'Debugging example',
  parameters: z.object({
    value: z.number()
  }),
  execute: async (args) => {
    debugger;  // Breakpoint here
    const result = args.value * 2;
    return `Result: ${result}`;
  }
});
```

**Run with inspector:**

```bash
npx simply-mcp run server.ts --inspect
```

**Step-by-step debugging:**
1. Set breakpoints in code
2. Start server with `--inspect`
3. Connect Chrome DevTools
4. Trigger tool execution
5. Step through code

### Local Development

Recommended development setup.

**Project structure:**

```
my-mcp-server/
├── src/
│   └── server.ts
├── simplymcp.config.ts
├── package.json
└── tsconfig.json (optional)
```

**package.json:**

```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "simply-mcp run src/server.ts --watch --verbose",
    "dev:http": "simply-mcp run src/server.ts --http --port 3000 --watch",
    "debug": "simply-mcp run src/server.ts --inspect --watch",
    "validate": "simply-mcp run src/server.ts --dry-run",
    "start": "simply-mcp run src/server.ts"
  },
  "dependencies": {
    "simply-mcp": "^2.5.0-beta.3",
    "zod": "^3.25.0"
  }
}
```

**simplymcp.config.ts:**

```typescript
import { defineConfig } from 'simply-mcp/config';

export default defineConfig({
  defaultServer: 'dev',

  servers: {
    'dev': {
      entry: './src/server.ts',
      transport: 'http',
      port: 3000,
      watch: true,
      verbose: true
    },
    'test': {
      entry: './src/server.ts',
      transport: 'stdio',
      verbose: false
    }
  }
});
```

**Workflow:**

```bash
# Development
npm run dev

# HTTP development
npm run dev:http

# Debug mode
npm run debug

# Validation
npm run validate

# Production
npm start
```

---

## Production Configuration

### Security Settings

Secure your production servers.

**Origin validation (HTTP):**

Built-in DNS rebinding protection:

```typescript
// Simply MCP automatically validates origins in HTTP mode
// Allowed origins: localhost, 127.0.0.1, ::1

// For production, configure a reverse proxy (nginx, Apache)
// with strict origin validation
```

**Environment secrets:**

```typescript
// Don't hardcode secrets
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY environment variable required');
}

server.addTool({
  name: 'api_call',
  parameters: z.object({}),
  execute: async () => {
    // Use API_KEY from environment
  }
});
```

**HTTPS (via reverse proxy):**

```nginx
# nginx config
server {
  listen 443 ssl;
  server_name api.example.com;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
  }
}
```

**Best practices:**
- Use environment variables for secrets
- Enable HTTPS via reverse proxy
- Validate all inputs (Zod schemas)
- Limit request size
- Implement rate limiting (application level)
- Log security events
- Regular security updates

### Performance Tuning

Optimize for production workloads.

**Timeout configuration:**

```typescript
const server = new BuildMCPServer({
  name: 'prod-server',
  version: '1.0.0',
  defaultTimeout: 30000,  // 30 seconds
});
```

**Node.js options:**

```bash
# Increase memory limit
NODE_OPTIONS='--max-old-space-size=4096' npx simply-mcp run server.ts

# Enable performance monitoring
NODE_OPTIONS='--enable-source-maps' npx simply-mcp run server.ts
```

**HTTP configuration:**

```typescript
transport: {
  type: 'http',
  port: 3000,
  stateful: false  // Stateless for better scalability
}
```

**Monitoring:**

```typescript
server.addTool({
  name: 'get_stats',
  description: 'Get server statistics',
  parameters: z.object({}),
  execute: async () => {
    const stats = server.getStats();
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      tools: stats.tools,
      prompts: stats.prompts,
      resources: stats.resources,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
      },
      uptime: Math.round(uptime) + ' seconds'
    };
  }
});
```

### Error Handling

Robust error handling for production.

**Graceful degradation:**

```typescript
server.addTool({
  name: 'fetch_data',
  description: 'Fetch data from external API',
  parameters: z.object({
    url: z.string().url()
  }),
  execute: async (args, context) => {
    try {
      const response = await fetch(args.url, {
        timeout: 5000  // 5 second timeout
      });

      if (!response.ok) {
        context?.logger.warn(`API returned ${response.status}`);
        return `Warning: API returned status ${response.status}`;
      }

      return await response.json();
    } catch (error) {
      // Log error
      context?.logger.error('API call failed', { error });

      // Return graceful error
      return {
        content: [{
          type: 'text',
          text: `Error: Unable to fetch data. ${error.message}`
        }],
        isError: true
      };
    }
  }
});
```

**Process management:**

```typescript
// Graceful shutdown (built-in)
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Log to monitoring service
  // Attempt graceful shutdown
  server.stop().then(() => process.exit(1));
});
```

**Logging:**

```typescript
capabilities: {
  logging: true  // Enable for production monitoring
}
```

---

## Configuration File Format

### TypeScript Config

Recommended format with full type safety.

**simplymcp.config.ts:**

```typescript
import { defineConfig } from 'simply-mcp/config';

export default defineConfig({
  // Default server to run when no file is specified
  defaultServer: 'api-server',

  // Named server configurations
  servers: {
    'api-server': {
      entry: './src/api-server.ts',
      style: 'decorator',  // Force API style
      transport: 'http',
      port: 3000,
      watch: true,
      verbose: true,
      env: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug'
      }
    },

    'worker-server': {
      entry: './src/worker.ts',
      transport: 'stdio',
      watch: false
    },

    'lambda-server': {
      entry: './src/lambda.ts',
      transport: 'http',
      port: 3001,
      // Stateless mode for serverless
      // Note: stateful property not in ServerConfig,
      // use CLI flag: --stateless
    }
  },

  // Global defaults for all servers
  defaults: {
    transport: 'stdio',
    port: 3000,
    verbose: false,
    watch: false
  },

  // Run command defaults
  run: {
    http: false,
    port: 3000,
    watch: false,
    watchPoll: false,
    watchInterval: 1000,
    inspect: false,
    inspectPort: 9229,
    verbose: false
  },

  // Bundle command defaults
  bundle: {
    format: 'single-file',
    minify: false,
    sourcemap: false,
    platform: 'node',
    target: 'node20',
    external: ['@modelcontextprotocol/sdk'],
    treeShake: true,
    autoInstall: false
  }
});
```

**Note:** When using TypeScript config files (`.ts`), add `"type": "module"` to your `package.json` to avoid Node.js warnings:

```json
{
  "name": "my-mcp-server",
  "type": "module",
  "dependencies": {
    "simply-mcp": "^2.5.0-beta.3"
  }
}
```

Alternatively, rename your config file to `.mts` (e.g., `simplymcp.config.mts`) to indicate it's an ES module without modifying package.json.

### JavaScript Config

ES modules format.

**simplymcp.config.js:**

```javascript
export default {
  defaultServer: 'my-server',

  servers: {
    'my-server': {
      entry: './server.js',
      transport: 'http',
      port: 3000,
      watch: true
    }
  },

  defaults: {
    transport: 'stdio',
    verbose: false
  }
};
```

### JSON Config

Simple JSON format (no comments).

**simplymcp.config.json:**

```json
{
  "servers": {
    "api-server": {
      "entry": "./src/server.ts",
      "transport": "http",
      "port": 3000,
      "watch": true
    }
  },
  "defaults": {
    "transport": "stdio",
    "verbose": false
  }
}
```

### Complete Schema

Full configuration schema reference.

```typescript
interface CLIConfig {
  // Default server name
  defaultServer?: string;

  // Named servers
  servers?: Record<string, ServerConfig>;

  // Global defaults
  defaults?: DefaultsConfig;

  // Run command defaults
  run?: RunConfig;

  // Bundle command defaults
  bundle?: BundleConfig;
}

interface ServerConfig {
  entry: string;                    // Path to server file (required)
  style?: 'decorator' | 'functional' | 'programmatic';
  transport?: 'stdio' | 'http';
  port?: number;                    // 1-65535
  watch?: boolean;
  env?: Record<string, string>;     // Environment variables
  verbose?: boolean;
}

interface DefaultsConfig {
  transport?: 'stdio' | 'http';
  port?: number;
  verbose?: boolean;
  watch?: boolean;
}

interface RunConfig {
  style?: 'decorator' | 'functional' | 'programmatic';
  http?: boolean;
  port?: number;
  watch?: boolean;
  watchPoll?: boolean;
  watchInterval?: number;           // Milliseconds, >= 100
  inspect?: boolean;
  inspectPort?: number;             // 1-65535
  verbose?: boolean;
}

interface BundleConfig {
  entry?: string;
  output?: string;
  format?: 'single-file' | 'standalone' | 'executable' | 'esm' | 'cjs';
  minify?: boolean;
  sourcemap?: 'inline' | 'external' | 'both' | false;
  platform?: 'node' | 'neutral';
  target?: 'node18' | 'node20' | 'node22' | 'esnext' | 'es2020' | 'es2021' | 'es2022';
  external?: string[];
  treeShake?: boolean;
  autoInstall?: boolean;
}
```

---

## Environment Variables Reference

### Standard Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `PORT` | number | HTTP server port | `PORT=3000` |
| `NODE_ENV` | string | Environment (development/production) | `NODE_ENV=production` |
| `DEBUG` | string | Debug namespaces | `DEBUG=*` |
| `NODE_OPTIONS` | string | Node.js runtime options | `NODE_OPTIONS='--max-old-space-size=4096'` |

### Custom Variables

Access in server code via `process.env`:

```typescript
// Define in shell
export API_KEY=secret123
export DATABASE_URL=postgresql://localhost/mydb

// Access in code
const apiKey = process.env.API_KEY;
const dbUrl = process.env.DATABASE_URL;
```

### Config File Environment

Set per-server environment variables:

```typescript
servers: {
  'prod': {
    entry: './server.ts',
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info',
      API_TIMEOUT: '30000'
    }
  }
}
```

---

## CLI Configuration Command

Manage configuration with the `config` command.

### Show Configuration

Display current configuration:

```bash
# Show config from default location
npx simply-mcp config show

# Show config from custom file
npx simply-mcp config show --config my-config.ts
```

**Output:**
```
Configuration file: /path/to/simplymcp.config.ts

Configuration:
{
  "defaultServer": "api-server",
  "servers": {
    "api-server": {
      "entry": "./src/api-server.ts",
      "transport": "http",
      "port": 3000
    }
  }
}
```

### Validate Configuration

Check configuration validity:

```bash
# Validate default config
npx simply-mcp config validate

# Validate custom config
npx simply-mcp config validate --config my-config.ts
```

**Output:**
```
Validating configuration: /path/to/simplymcp.config.ts

✓ Configuration is valid

Warnings:
  - Server "api": HTTP transport configured without explicit port (will use default 3000)
```

### List Servers

Show available servers:

```bash
# List servers in config
npx simply-mcp config list

# List from custom config
npx simply-mcp config list --config my-config.ts
```

**Output:**
```
Available servers:

  api-server (default)
    Entry: ./src/api-server.ts
    Transport: http
    Port: 3000
    Watch: enabled

  worker-server
    Entry: ./src/worker.ts
    Transport: stdio

Global defaults:
  Transport: stdio
  Verbose: false
```

### Initialize Configuration

Create a new config file:

```bash
# Create TypeScript config (recommended)
npx simply-mcp config init

# Create JavaScript config
npx simply-mcp config init --format js

# Create JSON config
npx simply-mcp config init --format json
```

**Generated file (TypeScript):**

```typescript
import { defineConfig } from 'simply-mcp/config';

export default defineConfig({
  // Default server to run when no file is specified
  // defaultServer: 'my-server',

  // Named server configurations
  servers: {
    // Example server configuration (uncomment and modify):
    // 'my-server': {
    //   entry: './src/my-server.ts',
    //   transport: 'http',
    //   port: 3000,
    //   watch: true,
    // },
  },

  // Global defaults for all servers
  defaults: {
    transport: 'stdio',
    verbose: false,
  },
});
```

---

## Configuration Patterns

### Development Environment

Local development setup with hot reload.

**simplymcp.config.ts:**

```typescript
import { defineConfig } from 'simply-mcp/config';

export default defineConfig({
  defaultServer: 'dev',

  servers: {
    'dev': {
      entry: './src/server.ts',
      transport: 'http',
      port: 3000,
      watch: true,
      verbose: true,
      env: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        ENABLE_CORS: 'true'
      }
    },

    'dev-stdio': {
      entry: './src/server.ts',
      transport: 'stdio',
      watch: true,
      verbose: true
    }
  }
});
```

**Usage:**

```bash
# HTTP development
npm run dev
# or
npx simply-mcp run dev

# Stdio development
npx simply-mcp run dev-stdio

# Debug mode
npx simply-mcp run dev --inspect
```

### Staging Environment

Pre-production testing environment.

**simplymcp.config.staging.ts:**

```typescript
import { defineConfig } from 'simply-mcp/config';

export default defineConfig({
  defaultServer: 'staging',

  servers: {
    'staging': {
      entry: './dist/server.js',
      transport: 'http',
      port: 3000,
      watch: false,
      verbose: true,
      env: {
        NODE_ENV: 'staging',
        LOG_LEVEL: 'info',
        API_URL: 'https://staging-api.example.com'
      }
    }
  }
});
```

**Usage:**

```bash
# Build first
npm run build

# Run staging server
npx simply-mcp run --config simplymcp.config.staging.ts
```

### Production Environment

Production-ready configuration.

**simplymcp.config.prod.ts:**

```typescript
import { defineConfig } from 'simply-mcp/config';

export default defineConfig({
  defaultServer: 'production',

  servers: {
    'production': {
      entry: './dist/server.js',
      transport: 'http',
      port: 3000,
      watch: false,
      verbose: false,  // Reduce log noise
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'warn',
        API_URL: 'https://api.example.com'
      }
    }
  }
});
```

**Deployment:**

```bash
# Build
npm run build

# Start production server
NODE_OPTIONS='--max-old-space-size=4096' \
  npx simply-mcp run --config simplymcp.config.prod.ts
```

**Docker:**

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
COPY simplymcp.config.prod.ts ./

EXPOSE 3000
CMD ["npx", "simply-mcp", "run", "--config", "simplymcp.config.prod.ts"]
```

**Kubernetes:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: my-mcp-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Multi-Server Setup

Run multiple servers for different purposes.

**simplymcp.config.ts:**

```typescript
import { defineConfig } from 'simply-mcp/config';

export default defineConfig({
  servers: {
    // Public API server
    'api': {
      entry: './src/api-server.ts',
      transport: 'http',
      port: 3000,
      env: {
        SERVER_TYPE: 'api',
        RATE_LIMIT: '100'
      }
    },

    // Internal admin server
    'admin': {
      entry: './src/admin-server.ts',
      transport: 'http',
      port: 3001,
      env: {
        SERVER_TYPE: 'admin',
        REQUIRE_AUTH: 'true'
      }
    },

    // Background worker
    'worker': {
      entry: './src/worker-server.ts',
      transport: 'stdio',
      env: {
        SERVER_TYPE: 'worker',
        QUEUE_URL: 'redis://localhost:6379'
      }
    },

    // Monitoring server
    'monitor': {
      entry: './src/monitor-server.ts',
      transport: 'http',
      port: 9090,
      env: {
        SERVER_TYPE: 'monitor'
      }
    }
  }
});
```

**Usage:**

```bash
# Start all servers (separate terminals)
npx simply-mcp run api &
npx simply-mcp run admin &
npx simply-mcp run worker &
npx simply-mcp run monitor &

# Or use process manager (PM2)
pm2 start "npx simply-mcp run api" --name mcp-api
pm2 start "npx simply-mcp run admin" --name mcp-admin
pm2 start "npx simply-mcp run worker" --name mcp-worker
pm2 start "npx simply-mcp run monitor" --name mcp-monitor
```

### CI/CD Integration

Automated testing and deployment.

**GitHub Actions:**

```yaml
# .github/workflows/test.yml
name: Test MCP Server

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Validate configuration
        run: npx simply-mcp config validate

      - name: Dry run server
        run: npx simply-mcp run src/server.ts --dry-run

      - name: Run tests
        run: npm test
```

**GitLab CI:**

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - test
  - build
  - deploy

validate-config:
  stage: validate
  script:
    - npm ci
    - npx simply-mcp config validate

test-server:
  stage: test
  script:
    - npm ci
    - npx simply-mcp run src/server.ts --dry-run
    - npm test

build-production:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

deploy-production:
  stage: deploy
  only:
    - main
  script:
    - docker build -t mcp-server:$CI_COMMIT_SHA .
    - docker push mcp-server:$CI_COMMIT_SHA
```

---

## Best Practices

### 1. Use Configuration Files for Reusability

**Don't:**
```bash
# Repeating flags every time
npx simply-mcp run server.ts --http --port 3000 --watch --verbose
```

**Do:**
```typescript
// simplymcp.config.ts
export default defineConfig({
  servers: {
    'dev': {
      entry: './server.ts',
      transport: 'http',
      port: 3000,
      watch: true,
      verbose: true
    }
  }
});
```

```bash
# Simple command
npx simply-mcp run dev
```

### 2. Environment-Specific Configs

**Structure:**
```
my-project/
├── simplymcp.config.ts          # Development
├── simplymcp.config.staging.ts  # Staging
├── simplymcp.config.prod.ts     # Production
└── src/server.ts
```

**Usage:**
```bash
# Development (default)
npx simply-mcp run

# Staging
npx simply-mcp run --config simplymcp.config.staging.ts

# Production
npx simply-mcp run --config simplymcp.config.prod.ts
```

### 3. Use Environment Variables for Secrets

**Don't:**
```typescript
// Hardcoded secret (bad!)
const API_KEY = 'secret123';
```

**Do:**
```typescript
// From environment (good!)
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY environment variable required');
}
```

**Config file:**
```typescript
servers: {
  'prod': {
    entry: './server.ts',
    env: {
      // Public config only
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
      // Never put secrets here!
    }
  }
}
```

### 4. Document Your Configuration

Add comments to configuration files:

```typescript
export default defineConfig({
  // API server runs on port 3000 (development)
  // In production, this is proxied through nginx on port 443
  servers: {
    'api': {
      entry: './src/api-server.ts',
      transport: 'http',
      port: 3000,

      // Watch mode enabled for development hot reload
      watch: true,

      // Verbose logging for debugging
      verbose: true,

      env: {
        // Development environment
        NODE_ENV: 'development',

        // Debug logging level
        LOG_LEVEL: 'debug'
      }
    }
  }
});
```

### 5. Validate Before Deployment

Always validate configuration:

```bash
# Add to CI/CD pipeline
npx simply-mcp config validate

# Dry run before deploying
npx simply-mcp run server.ts --dry-run --config production.config.ts
```

### 6. Use Defaults Wisely

```typescript
export default defineConfig({
  // Set sensible defaults
  defaults: {
    transport: 'stdio',   // Safe default
    verbose: false,       // Reduce noise
    watch: false          // Disable in production
  },

  servers: {
    // Override defaults as needed
    'dev': {
      entry: './server.ts',
      verbose: true,  // Override for dev
      watch: true     // Override for dev
    }
  }
});
```

### 7. Separate Concerns

```typescript
// Good: Separate configs for different purposes
servers: {
  'api': { entry: './api.ts', port: 3000 },
  'admin': { entry: './admin.ts', port: 3001 },
  'worker': { entry: './worker.ts', transport: 'stdio' }
}

// Bad: One server doing everything
servers: {
  'everything': { entry: './monolith.ts' }
}
```

### 8. Version Control Best Practices

**.gitignore:**
```
# Ignore environment-specific configs with secrets
*.local.config.ts
.env
.env.local

# Keep template configs
!simplymcp.config.example.ts
```

**Commit:**
```
# Safe to commit
simplymcp.config.ts (no secrets)
simplymcp.config.example.ts (template)

# Never commit
.env (secrets)
simplymcp.config.local.ts (local overrides with secrets)
```

---

## Troubleshooting

### Configuration Not Found

**Problem:**
```
No configuration file found.
```

**Solution:**

1. Check file name: `simplymcp.config.ts`
2. Check location: project root
3. Or specify explicitly: `--config path/to/config.ts`

**Supported names:**
- simplymcp.config.ts/js/mjs/json
- simplemcp.config.ts/js/mjs/json
- .simplymcprc.json/js

### Configuration Validation Errors

**Problem:**
```
Config field "servers" must be an object
```

**Solution:**

Check configuration structure:

```typescript
// Wrong
export default {
  servers: ['server1.ts', 'server2.ts']  // Array not allowed
};

// Correct
export default {
  servers: {
    'server1': { entry: './server1.ts' },
    'server2': { entry: './server2.ts' }
  }
};
```

### Port Already in Use

**Problem:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

1. **Find process using port:**
```bash
# Linux/Mac
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

2. **Kill process or use different port:**
```bash
# Use different port
npx simply-mcp run server.ts --http --port 3001

# Or update config
servers: {
  'my-server': {
    entry: './server.ts',
    port: 3001
  }
}
```

### Environment Variables Not Working

**Problem:**
Environment variables not accessible in server code.

**Solution:**

1. **Check variable is set:**
```bash
echo $MY_VAR
```

2. **Set before running:**
```bash
MY_VAR=value npx simply-mcp run server.ts
```

3. **Or use .env file (with dotenv):**
```bash
npm install dotenv
```

```typescript
// At top of server.ts
import 'dotenv/config';

// Now process.env.MY_VAR is available
```

### Configuration Precedence Issues

**Problem:**
CLI flag not overriding config file.

**Check precedence order:**
1. CLI flags (highest)
2. Environment variables
3. Config file
4. In-code config
5. Defaults (lowest)

**Debug:**
```bash
# Add --verbose to see which config is used
npx simply-mcp run server.ts --port 4000 --verbose
```

### Watch Mode Not Working

**Problem:**
File changes not triggering reload.

**Solutions:**

1. **Use polling mode (network drives):**
```bash
npx simply-mcp run server.ts --watch --watch-poll
```

2. **Check file is in project:**
```bash
# Watch only monitors project files, not node_modules
```

3. **Increase interval:**
```bash
npx simply-mcp run server.ts --watch --watch-poll --watch-interval 2000
```

### Invalid Server Entry

**Problem:**
```
Server "my-server": entry file not found: ./src/server.ts
```

**Solution:**

1. **Check file exists:**
```bash
ls -la ./src/server.ts
```

2. **Check path is correct:**
```typescript
servers: {
  'my-server': {
    entry: './src/server.ts',  // Relative to config file location
  }
}
```

3. **Use absolute path:**
```typescript
import { resolve } from 'path';

servers: {
  'my-server': {
    entry: resolve(__dirname, 'src/server.ts')
  }
}
```

---

## Reference Tables

### All Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **Server Identity** |
| `name` | string | required | Server name (kebab-case) |
| `version` | string | required | Semantic version |
| `description` | string | undefined | Server description |
| **Paths & Performance** |
| `basePath` | string | `process.cwd()` | Base directory for file operations |
| `defaultTimeout` | number | 5000 | Handler timeout (ms) |
| **Transport** |
| `transport.type` | 'stdio'\|'http' | 'stdio' | Transport type |
| `transport.port` | number | 3000 | HTTP port (1-65535) |
| `transport.stateful` | boolean | true | HTTP stateful mode |
| **Capabilities** |
| `capabilities.logging` | boolean | false | Enable logging notifications |
| `capabilities.sampling` | boolean | false | Enable LLM sampling (planned) |

### CLI Flags Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--http` | boolean | false | Use HTTP transport |
| `--port <n>` | number | 3000 | HTTP port |
| `--watch` | boolean | false | Enable watch mode |
| `--watch-poll` | boolean | false | Use polling for watch |
| `--watch-interval <ms>` | number | 1000 | Polling interval |
| `--verbose, -v` | boolean | false | Verbose output |
| `--inspect` | boolean | false | Enable inspector |
| `--inspect-port <n>` | number | 9229 | Inspector port |
| `--dry-run` | boolean | false | Validate only |
| `--style <style>` | string | auto | Force API style |
| `--config <file>` | string | auto | Config file path |
| `--help, -h` | boolean | false | Show help |

### Config File Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `defaultServer` | string | No | Default server name |
| `servers` | object | No | Named server configurations |
| `defaults` | object | No | Global defaults |
| `run` | object | No | Run command defaults |
| `bundle` | object | No | Bundle command defaults |

### Server Config Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entry` | string | Yes | Path to server file |
| `style` | string | No | API style (decorator/functional/programmatic) |
| `transport` | string | No | Transport type (stdio/http) |
| `port` | number | No | HTTP port |
| `watch` | boolean | No | Enable watch mode |
| `verbose` | boolean | No | Verbose output |
| `env` | object | No | Environment variables |

### Transport Comparison

| Feature | Stdio | HTTP Stateful | HTTP Stateless |
|---------|-------|---------------|----------------|
| **Use Case** | CLI, desktop | Web apps, workflows | Serverless, APIs |
| **Sessions** | Per-process | Header-based | None |
| **Streaming** | No | Yes (SSE) | No |
| **State** | In-process | Across requests | None |
| **Scalability** | Single client | Multiple sessions | Unlimited |
| **Complexity** | Low | Medium | Low |
| **Progress Reporting** | No | Yes | No |
| **Logging** | stderr | SSE events | No events |

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `PORT` | HTTP port | `PORT=3000` |
| `NODE_ENV` | Environment | `NODE_ENV=production` |
| `DEBUG` | Debug namespace | `DEBUG=*` |
| `NODE_OPTIONS` | Node.js options | `NODE_OPTIONS='--max-old-space-size=4096'` |
| Custom | Application config | `API_KEY=secret` |

### Configuration File Formats

| Format | File Name | Use Case |
|--------|-----------|----------|
| TypeScript | `simplymcp.config.ts` | Recommended (type safety) |
| JavaScript | `simplymcp.config.js` | ES modules |
| JSON | `simplymcp.config.json` | Simple configs |

---

## Summary

**Configuration methods covered:** 4
- In-code configuration (3 API styles)
- Configuration files (TypeScript/JavaScript/JSON)
- Environment variables
- CLI flags

**Total options documented:** 30+
- Server configuration: 5 options
- Transport configuration: 3 options
- Capabilities: 2 options
- CLI flags: 12 options
- Config file fields: 8+ options

**Examples provided:** 20+
- Basic configurations
- Development setup
- Production deployment
- Multi-server patterns
- CI/CD integration
- Docker and Kubernetes
- Troubleshooting scenarios

**Key patterns:**
- Configuration hierarchy (CLI > Env > File > Code > Defaults)
- Environment-specific configs (dev/staging/prod)
- Multi-server setup
- Security best practices
- CI/CD integration

**Quick reference:**
- All configuration options with types and defaults
- CLI flag reference
- Environment variable mapping
- Transport comparison table
- Troubleshooting guide

---

**Need help?**
- Check [Troubleshooting](#troubleshooting)
- See [Examples](#configuration-patterns)
- Read API guides: [Functional](./FUNCTIONAL_API_GUIDE.md), [Decorator](../development/DECORATOR-API.md), [Interface](./INTERFACE_API_GUIDE.md)
- Open an issue: [GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)

**Version:** Simply MCP v2.5.0-beta.3
