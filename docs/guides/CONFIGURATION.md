# Configuration Guide

Configure your MCP server for different environments and use cases.

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

### In Your Code

```typescript
// At startup, validate required env vars
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY environment variable required');
}

// Use throughout server
export default defineMCP({
  name: 'my-server',
  version: '1.0.0',
  tools: [
    {
      name: 'call-api',
      execute: async (args) => {
        const response = await fetch('...', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        return response.json();
      }
    }
  ]
});
```

---

## Server Options

### Basic Configuration

```typescript
export default defineMCP({
  name: 'my-server',
  version: '1.0.0',
  description: 'What this server does'
});
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

# Specify API style
npx simply-mcp run server.ts --style functional

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
// Cache results
const cache = new Map();

{
  name: 'fetch-data',
  execute: async (args) => {
    const cacheKey = JSON.stringify(args);
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    const result = await expensiveOperation(args);
    cache.set(cacheKey, result);
    return result;
  }
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

```typescript
import { BuildMCPServer } from 'simply-mcp';

// Production (default) - hide router-assigned tools
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  flattenRouters: false  // or omit (this is the default)
});

// Testing mode - show all tools
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  flattenRouters: true
});

// Environment-based configuration
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  flattenRouters: process.env.NODE_ENV === 'development'
});
```

### What's Visible?

**Production (flattenRouters=false):**
```typescript
server.addTool({ name: 'tool1', ... });  // Assigned to router
server.addTool({ name: 'tool2', ... });  // Assigned to router
server.addTool({ name: 'tool3', ... });  // Not assigned

server.addRouterTool({
  name: 'my_router',
  tools: ['tool1', 'tool2']
});

// tools/list shows:
// - my_router (router)
// - tool3 (unassigned tool)
// Hidden: tool1, tool2
```

**Testing (flattenRouters=true):**
```typescript
// Same setup as above

// tools/list shows:
// - my_router (router)
// - tool1 (visible)
// - tool2 (visible)
// - tool3 (unassigned tool)
```

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

### Environment Variables

Configure based on environment:

```typescript
// Option 1: NODE_ENV
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  flattenRouters: process.env.NODE_ENV !== 'production'
});

// Option 2: Custom variable
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  flattenRouters: process.env.FLATTEN_ROUTERS === 'true'
});

// Option 3: Debug mode
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  flattenRouters: process.env.DEBUG === 'true'
});
```

For complete router documentation, see [Router Tools Guide](./ROUTER_TOOLS.md).

---

## Next Steps

- **Organize tools?** See [ROUTER_TOOLS.md](./ROUTER_TOOLS.md)
- **Deploy?** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Bundle?** See [BUNDLING.md](./BUNDLING.md)
- **Debug?** See [DEBUGGING.md](./DEBUGGING.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
