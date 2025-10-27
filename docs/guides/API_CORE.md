# API Core

Core concepts and basic structure for building MCP servers with Simply MCP.

## Table of Contents

- [Basic Structure](#basic-structure)
- [Core Types](#core-types)
- [Transport Configuration](#transport-configuration)
- [Authentication](#authentication)
- [Running Servers](#running-servers)
- [Related Guides](#related-guides)

---

## Basic Structure

Simply-mcp uses TypeScript interfaces to define MCP primitives (tools, prompts, resources) and a class to implement them.

> **See:** [Quick Start Guide](./QUICK_START.md) for a complete first server example, or [Tools Guide](./TOOLS.md) for detailed tool implementation patterns.

---

## Core Types

### IServer

```typescript
interface IServer {
  name: string;              // Server name (kebab-case)
  version: string;           // Semantic version
  description?: string;      // Optional description
}
```

---

## Transport Configuration

The Interface API supports both `stdio` (for Claude Desktop) and `http` (for web clients) transports. Configure transport settings directly in your IServer interface:

```typescript
interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  transport?: 'stdio' | 'http';  // Default: 'stdio'
  port?: number;                  // Required for HTTP transport
  stateful?: boolean;             // HTTP session mode (default: true)
}
```

**Transport Fields:**

- **`transport`**: Transport type
  - `'stdio'` - Standard input/output (default, for Claude Desktop)
  - `'http'` - HTTP server (for web clients and remote access)
- **`port`**: Port number for HTTP server (ignored for stdio)
  - Required when `transport: 'http'`
  - Example: `3000`, `8080`
- **`stateful`**: Enable stateful sessions for HTTP (default: `true`)
  - When `true`, maintains session state between requests
  - When `false`, treats each request independently

**Example: HTTP Server**

```typescript
import type { IServer, ITool } from 'simply-mcp';

interface GetTimeTool extends ITool {
  name: 'get_time';
  description: 'Get current server time';
  params: {};
  result: { time: string };
}

interface TimeServer extends IServer {
  name: 'time-server';
  version: '1.0.0';
  transport: 'http';
  port: 3000;
  stateful: true;
}

export default class TimeServer implements TimeServer {
  getTime: GetTimeTool = async () => ({
    time: new Date().toISOString()
  });
}
```

**Run it:**
```bash
# stdio transport (default)
npx simply-mcp run server.ts

# HTTP transport (uses interface config)
npx simply-mcp run server.ts

# Override with CLI flags
npx simply-mcp run server.ts --http --port 8080
```

---

## Authentication

### IAuth Interface

The Interface API provides built-in authentication support for HTTP servers. Currently supports API key authentication via the `IApiKeyAuth` interface.

```typescript
import type { IApiKeyAuth, IServer } from 'simply-mcp';

interface MyAuth extends IApiKeyAuth {
  type: 'apiKey';
  headerName?: string;      // Default: 'x-api-key'
  keys: Array<{
    name: string;           // Key identifier (e.g., 'admin', 'readonly')
    key: string;            // The actual API key value
    permissions: string[];  // Permission list (e.g., ['*'], ['read:*'])
  }>;
  allowAnonymous?: boolean; // Allow unauthenticated requests (default: false)
}

interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  transport: 'http';
  port: 3000;
  auth: MyAuth;             // Apply authentication
}
```

**Authentication Fields:**

- **`type`**: Authentication type (currently only `'apiKey'` is supported)
- **`headerName`**: HTTP header to check for API key (default: `'x-api-key'`)
- **`keys`**: Array of valid API keys with metadata
  - `name`: Human-readable identifier for the key
  - `key`: The actual API key string
  - `permissions`: Array of permission strings (e.g., `['*']`, `['read:*']`, `['tool:get_data']`)
- **`allowAnonymous`**: Whether to allow requests without authentication (default: `false`)

**Permission Format:**

- `['*']` - Full access to all resources
- `['read:*']` - Read-only access to all resources
- `['tool:get_data']` - Access to specific tool
- `['resource:config://app']` - Access to specific resource
- Multiple permissions can be combined: `['tool:get_data', 'tool:search', 'resource:*']`

### Complete Authentication Example

```typescript
import type { IApiKeyAuth, IServer, ITool } from 'simply-mcp';

// Define authentication configuration
interface AdminAuth extends IApiKeyAuth {
  type: 'apiKey';
  headerName: 'x-api-key';
  keys: [
    {
      name: 'admin';
      key: 'sk-admin-xxx-secure-key-here';
      permissions: ['*'];
    },
    {
      name: 'readonly';
      key: 'sk-read-yyy-secure-key-here';
      permissions: ['read:*'];
    },
    {
      name: 'limited';
      key: 'sk-limit-zzz-secure-key-here';
      permissions: ['tool:get_data'];
    }
  ];
  allowAnonymous: false;
}

// Define server with authentication
interface SecureServer extends IServer {
  name: 'secure-server';
  version: '1.0.0';
  transport: 'http';
  port: 3000;
  stateful: true;
  auth: AdminAuth;
}

// Define tools
interface GetDataTool extends ITool {
  name: 'get_data';
  description: 'Fetch protected data';
  params: { id: string };
  result: { data: any };
}

interface UpdateDataTool extends ITool {
  name: 'update_data';
  description: 'Update protected data';
  params: { id: string; value: any };
  result: { success: boolean };
}

// Implementation
export default class SecureServer implements SecureServer {
  name = 'secure-server' as const;
  version = '1.0.0' as const;
  transport = 'http' as const;
  port = 3000 as const;

  // Protected by API key authentication
  getData: GetDataTool = async ({ id }) => {
    // Only accessible with valid API key
    // 'admin' and 'readonly' and 'limited' keys can access
    return {
      data: {
        id,
        value: 'secret data',
        timestamp: Date.now()
      }
    };
  };

  // Only admin can access (write operation)
  updateData: UpdateDataTool = async ({ id, value }) => {
    // Only accessible with 'admin' key (needs write permission)
    return { success: true };
  };
}
```

**Testing with curl:**

```bash
# Valid admin key - full access
curl -H "x-api-key: sk-admin-xxx-secure-key-here" \
  http://localhost:3000/tools/get_data

# Valid readonly key - can read
curl -H "x-api-key: sk-read-yyy-secure-key-here" \
  http://localhost:3000/tools/get_data

# Invalid key - rejected
curl -H "x-api-key: invalid-key" \
  http://localhost:3000/tools/get_data

# No key - rejected (unless allowAnonymous: true)
curl http://localhost:3000/tools/get_data
```

**Best Practices:**

1. **Never commit API keys to version control**
   - Use environment variables: `process.env.ADMIN_API_KEY`
   - Use secret management services in production

2. **Use strong, random keys**
   - Minimum 32 characters
   - Mix of letters, numbers, special characters
   - Consider using crypto libraries: `crypto.randomBytes(32).toString('hex')`

3. **Implement least privilege**
   - Give each key only the permissions it needs
   - Use specific permissions over wildcards when possible
   - Separate admin and user keys

4. **Rotate keys regularly**
   - Update keys periodically
   - Provide key rotation mechanisms
   - Log key usage for audit trails

5. **Use HTTPS in production**
   - API keys in headers are visible over HTTP
   - Always use TLS/HTTPS for production deployments

### Environment Variable Example

```typescript
import type { IApiKeyAuth, IServer } from 'simply-mcp';

interface EnvAuth extends IApiKeyAuth {
  type: 'apiKey';
  keys: [
    {
      name: 'admin';
      key: process.env.ADMIN_API_KEY || '';
      permissions: ['*'];
    },
    {
      name: 'user';
      key: process.env.USER_API_KEY || '';
      permissions: ['read:*'];
    }
  ];
}

interface SecureServer extends IServer {
  name: 'secure-server';
  version: '1.0.0';
  transport: 'http';
  port: 3000;
  auth: EnvAuth;
}

export default class SecureServer implements SecureServer {
  name = 'secure-server' as const;
  version = '1.0.0' as const;
  transport = 'http' as const;
  port = 3000 as const;

  // Implementation...
}
```

**Run with environment variables:**
```bash
ADMIN_API_KEY=sk-admin-xxx USER_API_KEY=sk-user-yyy npx simply-mcp run server.ts
```

---

## Running Servers

**Basic run commands:**

```bash
# STDIO transport (default)
npx simply-mcp run server.ts

# HTTP transport
npx simply-mcp run server.ts --http --port 3000

# With watch mode
npx simply-mcp run server.ts --watch

# With debugging
npx simply-mcp run server.ts --inspect
```

**Transport modes:**
- **stdio**: Standard input/output (for Claude Desktop)
- **http**: HTTP server with stateful (default) or stateless modes

**Common patterns:**

```bash
# Development with auto-restart
npx simply-mcp run server.ts --watch --verbose

# HTTP server with custom port
npx simply-mcp run server.ts --http --port 8080

# Validate without running
npx simply-mcp run server.ts --dry-run
```

---

## Related Guides

- [API Features](./API_FEATURES.md) - Tools, prompts, resources
- [API Protocol](./API_PROTOCOL.md) - Advanced protocol features
- [Quick Start](./QUICK_START.md) - Get started quickly
- [Examples Index](../../examples/EXAMPLES_INDEX.md) - Code examples

