# Configuration Guide

Configure your MCP server for different environments and use cases.

---

## MCP Client Configuration

Configure MCP clients (Claude CLI, Claude Desktop, etc.) to connect to your Simply-MCP servers.

### Configuration Files

MCP clients use JSON configuration files to define available servers:

**`.mcp.json`** - Project-scoped configuration
- Location: Project root directory
- Use case: Team-shared, project-specific servers
- Version controlled with your project

**`~/.claude.json`** - User-global configuration
- Location: User home directory (`~/.claude.json` or `%USERPROFILE%\.claude.json`)
- Use case: Personal utilities, system-wide tools
- Persists across all projects

**Difference from `simplymcp.config.ts`:**
- `simplymcp.config.ts` = Server-side CLI configuration (how to run/bundle servers)
- `.mcp.json` / `~/.claude.json` = Client-side configuration (how clients connect to servers)

### File Format

MCP client configuration uses the `mcpServers` object structure:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["simply-mcp", "run", "server.ts"],
      "env": {
        "API_KEY": "your-key",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

**Fields:**
- `command` - Executable to run (npx, node, etc.)
- `args` - Array of command arguments
- `env` - Optional environment variables

### Configuration Priority

Configuration files are evaluated in order of precedence (highest to lowest):

| Priority | Source | Scope | Override |
|----------|--------|-------|----------|
| 1 (Highest) | `--mcp-config` flag | Single command | Always wins |
| 2 | `.mcp.json` | Project directory | Overrides global |
| 3 | `~/.claude.json` | User home | Overrides defaults |
| 4 (Lowest) | Client defaults | Built-in | Fallback only |

**Important:** Configs do not merge. The highest priority config completely replaces lower priority configs.

**Example precedence:**
```bash
# Uses .mcp.json (project-scoped)
claude

# Uses custom.json (--mcp-config wins)
claude --mcp-config custom.json

# Uses ~/.claude.json (no .mcp.json in project)
cd ~/empty-dir && claude
```

### Transport Configuration

#### STDIO Transport (Default)

Standard input/output communication:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["simply-mcp", "run", "server.ts"]
    }
  }
}
```

**Use when:**
- Single client per server
- Desktop applications (Claude Desktop)
- CLI integrations

**Example:** [examples/interface-minimal.ts](../../examples/interface-minimal.ts)

#### HTTP Transport

HTTP server with multiple client support:

```json
{
  "mcpServers": {
    "my-http-server": {
      "command": "npx",
      "args": ["simply-mcp", "run", "server.ts", "--http", "--port", "3000"]
    }
  }
}
```

**Use when:**
- Multiple clients need to connect
- Web application integration
- Load-balanced services

**Examples:**
- With auth: [examples/interface-http-auth.ts](../../examples/interface-http-auth.ts)
- Stateless: [examples/interface-http-stateless.ts](../../examples/interface-http-stateless.ts)

#### HTTP Stateless Transport

HTTP without session management (serverless compatible):

```json
{
  "mcpServers": {
    "my-stateless-server": {
      "command": "npx",
      "args": ["simply-mcp", "run", "server.ts", "--http-stateless", "--port", "3000"]
    }
  }
}
```

**Use when:**
- Serverless deployments (AWS Lambda)
- Each request is independent
- No conversation state needed

### Multiple Servers

Configure multiple servers in a single config file:

```json
{
  "mcpServers": {
    "weather": {
      "command": "npx",
      "args": ["simply-mcp", "run", "weather-server.ts"]
    },
    "database": {
      "command": "npx",
      "args": ["simply-mcp", "run", "db-server.ts", "--http", "--port", "3001"]
    },
    "calculator": {
      "command": "node",
      "args": ["dist/calculator.js"]
    }
  }
}
```

Each server gets its own key in the `mcpServers` object.

### Environment Variables

Pass environment variables to servers through the `env` field:

```json
{
  "mcpServers": {
    "api-server": {
      "command": "npx",
      "args": ["simply-mcp", "run", "api-server.ts"],
      "env": {
        "API_KEY": "sk-1234567890",
        "DATABASE_URL": "postgresql://localhost/mydb",
        "LOG_LEVEL": "debug",
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Best practices:**
- Never commit secrets to version control
- Use `.env` files for local development
- Use secret management for production

### Bundled Servers

Configure bundled servers (distributed as single files):

```json
{
  "mcpServers": {
    "my-bundled-server": {
      "command": "node",
      "args": ["dist/server.js"]
    }
  }
}
```

Or as npm packages:

```json
{
  "mcpServers": {
    "weather-service": {
      "command": "npx",
      "args": ["weather-mcp-server"]
    }
  }
}
```

### When to Use Each

**Use `.mcp.json` for:**
- Project-specific servers
- Team-shared configuration
- Version-controlled setups
- Development workflows

**Use `~/.claude.json` for:**
- Personal utility servers
- System-wide tools
- Cross-project servers
- Global defaults

**Use `--mcp-config` for:**
- Testing new servers
- Temporary configurations
- CI/CD pipelines
- One-off commands

---

## Claude CLI Integration

Integrate Simply-MCP servers with Claude CLI for interactive development and testing.

### Adding Servers

#### Using `claude mcp add`

Add a server to your global configuration:

```bash
# Add server with stdio transport
claude mcp add my-server "npx simply-mcp run server.ts"

# Add server with HTTP transport
claude mcp add api-server "npx simply-mcp run api.ts --http --port 3000"

# Add with watch mode for development
claude mcp add dev-server "npx simply-mcp run server.ts --watch"
```

#### Manual Configuration

Edit `~/.claude.json` or `.mcp.json` directly:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["simply-mcp", "run", "server.ts"]
    }
  }
}
```

#### Listing Servers

View configured servers:

```bash
# List all configured servers
claude mcp list

# Show detailed server information
claude mcp list --verbose
```

#### Removing Servers

Remove servers from configuration:

```bash
# Remove specific server
claude mcp remove my-server

# Remove all servers
claude mcp remove --all
```

### Inline Configuration

Test servers without modifying config files using the `--mcp-config` flag:

```bash
# Inline JSON configuration
claude --mcp-config '{"mcpServers":{"test":{"command":"npx","args":["simply-mcp","run","server.ts"]}}}'

# Using a temporary config file
claude --mcp-config ./test-config.json
```

**Use cases:**
- Quick testing without permanent changes
- CI/CD pipeline configurations
- Debugging server issues
- Temporary server connections

### Testing Servers

Recommended workflow for testing new servers:

```bash
# 1. Create your server
# server.ts already exists

# 2. Test with inline config
claude --mcp-config '{"mcpServers":{"test":{"command":"npx","args":["simply-mcp","run","server.ts"]}}}'

# 3. Test the server tools interactively
# (use Claude to call your server's tools)

# 4. If working, add to permanent config
claude mcp add my-server "npx simply-mcp run server.ts"

# 5. Remove temporary config (automatic with inline)
# Or remove added server if not needed
claude mcp remove my-server
```

**Testing with permissions:**
```bash
# Bypass permission prompts for testing
claude --mcp-config config.json --permission-mode bypassPermissions

# Strict mode (only use configured servers)
claude --mcp-config config.json --strict-mcp-config
```

### Bundled Servers

Configure bundled servers created with `simply-mcp bundle`:

**Single-file bundle:**
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["dist/server.js"]
    }
  }
}
```

**NPM package:**
```json
{
  "mcpServers": {
    "weather-service": {
      "command": "npx",
      "args": ["weather-mcp-server"]
    }
  }
}
```

**Local package bundle:**
```json
{
  "mcpServers": {
    "local-server": {
      "command": "npx",
      "args": ["simply-mcp", "run", "./my-server-package"]
    }
  }
}
```

---

## Environment Variables

### Required Configuration

Set these before running:

```bash
export API_KEY="your-key"
export DATABASE_URL="postgresql://localhost/mydb"
export LOG_LEVEL="debug"

npx simply-mcp run server.ts
```

### In Your Code (Interface API)

```typescript
import type { ITool, IServer } from 'simply-mcp';

// Validate required env vars at module level
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY environment variable required');
}

interface CallApiTool extends ITool {
  name: 'call_api';
  description: 'Call external API';
  params: { endpoint: string };
  result: any;
}

interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
}

export default class MyServer {
  callApi: CallApiTool = async (args) => {
    const response = await fetch(args.endpoint, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.json();
  };
}
```

---

## Server Options (Interface API)

**Examples:**
- Basic config: [examples/interface-minimal.ts](../../examples/interface-minimal.ts)
- TypeScript strict mode: [examples/interface-strict-mode.ts](../../examples/interface-strict-mode.ts)
- HTTP with auth: [examples/interface-http-auth.ts](../../examples/interface-http-auth.ts)

### Basic Configuration

```typescript
import type { IServer, ITool } from 'simply-mcp';

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a user';
  params: { name: string };
  result: string;
}

const server: IServer = {
  name: 'my-server',
  version: '1.0.0',
  description: 'What this server does'
}

export default class MyServer {
  greet: GreetTool = async ({ name }) => `Hello, ${name}!`;
}
```

### With Transports

```bash
# Default (stdio)
npx simply-mcp run server.ts

# HTTP
npx simply-mcp run server.ts --http --port 3000

# HTTP Stateless (no sessions)
npx simply-mcp run server.ts --http-stateless --port 3000
```

---

## Runtime Options

```bash
# Watch mode (auto-reload on file changes)
npx simply-mcp run server.ts --watch

# Verbose output
npx simply-mcp run server.ts --verbose

# Dry-run (validate without executing)
npx simply-mcp run server.ts --dry-run

# Force auto-install dependencies
npx simply-mcp run server.ts --force-install
```

---

## Bundling Configuration

### Via CLI

```bash
# Single-file bundle
npx simplymcp bundle server.ts -f single-file -o dist/server.js

# Standalone bundle
npx simplymcp bundle server.ts -f standalone -o dist/server

# Minified
npx simplymcp bundle server.ts --minify

# With source maps
npx simplymcp bundle server.ts --sourcemap
```

### Via Config File

Create `simplymcp.config.js`:

```javascript
export default {
  entry: './server.ts',
  output: {
    dir: 'dist',
    filename: 'server.js',
    format: 'single-file'
  },
  bundle: {
    minify: true,
    target: 'node20',
    external: [],
    treeShake: true
  }
};
```

Then:
```bash
npx simplymcp bundle -c simplymcp.config.js
```

---

## Common Configurations

### Development Setup

```bash
# Watch mode with verbose output
npx simply-mcp run server.ts --watch --verbose

# Or use npm script
# In package.json:
# "scripts": { "dev": "simply-mcp run server.ts --watch --verbose" }
npm run dev
```

### Testing

```bash
# Validate server without running tools
npx simply-mcp run server.ts --dry-run --verbose

# Test with specific style
npx simply-mcp run server.ts --dry-run --style functional
```

### Production

```bash
# Create optimized bundle
npx simplymcp bundle server.ts -f single-file --minify -o my-server.js

# Run with production environment
NODE_ENV=production npx simply-mcp run server.ts --http --port 3000
```

### Debugging

```bash
# Enable Node debugger
node --inspect server.ts

# Or via CLI
npx simply-mcp run server.ts --inspect

# With breakpoints
node --inspect-brk server.ts
```

---

## Performance Tuning

### For High Load

```bash
# Use HTTP (stdio is single-threaded)
npx simply-mcp run server.ts --http --port 3000

# Disable unnecessary features
# - Only include needed tools
# - Minimize resource overhead
```

### For Low Latency

```typescript
import type { ITool, IServer } from 'simply-mcp';

// Cache results at module level
const cache = new Map();

interface FetchDataTool extends ITool {
  name: 'fetch_data';
  description: 'Fetch data with caching';
  params: any;
  result: any;
}

interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
}

export default class MyServer {
  fetchData: FetchDataTool = async (args) => {
    const cacheKey = JSON.stringify(args);
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    const result = await expensiveOperation(args);
    cache.set(cacheKey, result);
    return result;
  };
}
```

---

## Multi-Server Setup

Run multiple servers:

```bash
npx simply-mcp run ./server1 ./server2 ./server3

# Or specify ports:
PORT=3000 npx simply-mcp run ./server1 --http
PORT=3001 npx simply-mcp run ./server2 --http
PORT=3002 npx simply-mcp run ./server3 --http
```

---

## Deployment Configuration

### Docker

```dockerfile
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build bundle
RUN npx simplymcp bundle src/server.ts -f single-file -o dist/server.js

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Environment-Specific

```bash
# Development
npx simply-mcp run server.ts --watch

# Staging
NODE_ENV=staging npx simplymcp run server.ts --http --port 3000

# Production
NODE_ENV=production npx simplymcp bundle server.ts -f single-file --minify -o server.js
node server.js
```

---

## Configuration Best Practices

✅ **DO:**
- Use environment variables for secrets
- Validate configuration at startup
- Log configuration changes
- Document all configuration options
- Test in different environments

❌ **DON'T:**
- Hardcode secrets in code
- Trust user input without validation
- Mix development and production configs
- Ignore configuration errors
- Deploy untested configurations

---

## flattenRouters Option

Control how router-assigned tools appear in the tools list.

**Default:** `false` (production mode - hides router-assigned tools)

**Option:** `flattenRouters?: boolean`

### Modes

**flattenRouters: false (Production - Default)**
- Router-assigned tools are HIDDEN from tools/list
- Only routers and unassigned tools appear
- Recommended for production
- Reduces cognitive load for models
- Cleaner, more organized tool list

**flattenRouters: true (Testing/Development)**
- ALL tools appear in tools/list
- Including router-assigned tools
- Recommended for development and exploration
- Useful for testing tool discovery
- Models can call any tool directly

### Example

Router configuration is an advanced feature. For most use cases, the Interface API handles routing automatically. See [Router Tools Guide](./ROUTER_TOOLS.md) for advanced router configuration.

### What's Visible?

See [Router Tools Guide](./ROUTER_TOOLS.md) for detailed router configuration examples.

### Notes

- `flattenRouters` only affects visibility, not tool execution
- Tools can be called directly regardless of flattenRouters setting
- Namespace calling (`router__tool`) works in both modes
- Does NOT affect performance or functionality

### Use Cases

**Use flattenRouters=false (production) when:**
- Deploying to production
- You want a clean, organized tool list
- You have many tools and want to hide complexity
- Models should discover tools progressively

**Use flattenRouters=true (testing) when:**
- Developing and testing your server
- Debugging tool discovery issues
- Exploring available tools
- You want direct access to all tools

For complete router documentation and environment-based configuration, see [Router Tools Guide](./ROUTER_TOOLS.md).

---

## Next Steps

- **Need more CLI options?** See [CLI_BASICS.md](./CLI_BASICS.md)
- **Organize tools?** See [ROUTER_TOOLS.md](./ROUTER_TOOLS.md)
- **Deploy?** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Bundle?** See [BUNDLING.md](./BUNDLING.md)
- **Debug?** See [DEBUGGING.md](./DEBUGGING.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
