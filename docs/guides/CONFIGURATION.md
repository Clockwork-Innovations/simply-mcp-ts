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

## Next Steps

- **Deploy?** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Bundle?** See [BUNDLING.md](./BUNDLING.md)
- **Debug?** See [DEBUGGING.md](./DEBUGGING.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
