# Debugging Guide

Learn how to troubleshoot and debug your Simply MCP servers during development and production.

---

## Development Tools

### Watch Mode

Auto-restart your server when files change:

```bash
# Basic watch mode
npx simply-mcp run server.ts --watch

# Watch with verbose output
npx simply-mcp run server.ts --watch --verbose

# Watch with polling (for network drives)
npx simply-mcp run server.ts --watch --watch-poll
```

**Benefits:**
- Automatic reload on file changes
- Faster development iteration
- See errors immediately

See [WATCH_MODE_GUIDE.md](./WATCH_MODE_GUIDE.md) for complete details.

---

### Dry-Run Validation

Validate your server without running it:

```bash
# Basic validation
npx simply-mcp run server.ts --dry-run

# Get JSON output for parsing
npx simply-mcp run server.ts --dry-run --json

# Validate with specific API style
npx simply-mcp run server.ts --dry-run --style decorator
```

**What it checks:**
- Configuration syntax
- Tool definitions
- Prompts and resources
- API style detection
- Duplicate names
- Port availability (with --http)

See [DRY_RUN_GUIDE.md](./DRY_RUN_GUIDE.md) for complete details.

---

### Verbose Output

Enable detailed logging:

```bash
# Show detailed startup information
npx simply-mcp run server.ts --verbose

# Combine with watch mode
npx simply-mcp run server.ts --watch --verbose

# Combine with dry-run
npx simply-mcp run server.ts --dry-run --verbose
```

**Shows:**
- Config file detection
- API style detection logic
- File path resolution
- Transport configuration
- Startup sequence
- Watch mode changes

---

### Node Inspector & Chrome DevTools

Debug with Chrome's DevTools:

```bash
# Enable inspector (port 9229)
npx simply-mcp run server.ts --inspect

# Enable inspector and break on first line
npx simply-mcp run server.ts --inspect-brk

# Custom inspector port
npx simply-mcp run server.ts --inspect --inspect-port 9230
```

**How to use:**

1. Start your server with `--inspect` or `--inspect-brk`
2. Open `chrome://inspect` in Chrome
3. Click "inspect" on your server
4. Use Chrome DevTools to:
   - Set breakpoints
   - Step through code
   - Inspect variables
   - View console output

**Pro tips:**
- Use `--inspect-brk` to pause at startup
- Source maps work with `--sourcemap` flag
- Breakpoints persist across restarts

---

## Common Debugging Scenarios

### Scenario 1: Server Won't Start

**Problem:** Server fails to start with error

```bash
npx simply-mcp run server.ts
# Error: Cannot find module 'axios'
```

**Solutions:**

```bash
# 1. Check verbose output
npx simply-mcp run server.ts --verbose

# 2. Validate configuration
npx simply-mcp run server.ts --dry-run --verbose

# 3. Check for syntax errors
npx simply-mcp run server.ts --inspect-brk

# 4. Force install dependencies
npm install

# 5. Clear cache and retry
rm -rf node_modules package-lock.json
npm install
npx simply-mcp run server.ts
```

### Scenario 2: Server Configuration Issues

**Problem:** Server not starting or behaving unexpectedly

```bash
# Check what's detected
npx simply-mcp run server.ts --verbose

# Validate configuration
npx simply-mcp run server.ts --dry-run --verbose
```

### Scenario 3: Tool Not Appearing

**Problem:** Defined tool doesn't show in available tools

```bash
# 1. Validate with dry-run
npx simply-mcp run server.ts --dry-run --json

# 2. Check verbose output
npx simply-mcp run server.ts --verbose

# 3. Verify tool definition (Interface API)
# - Tool name is correct (snake_case)
# - Tool extends ITool interface
# - Tool has description in interface
# - Parameters are valid
# - Method is implemented in class

# 4. Ensure export
export default class MyServer { ... }
```

### Scenario 4: Type Errors

**Problem:** TypeScript compilation errors

```bash
# View detailed errors
npx simply-mcp run server.ts --verbose

# For IDE support (optional):
npx tsc --noEmit

# With Interface API, ensure:
# - Interfaces extend ITool, IPrompt, IResource, or IServer
# - Class implements the server interface
# - Tool methods match interface signatures
```

### Scenario 5: Performance Issues

**Problem:** Server is slow to respond

```bash
# 1. Enable profiling with Node
node --prof server.ts
node --prof-process isolate-*.log > profile.txt

# 2. Check for blocking operations
# - Long-running synchronous code
# - Sequential network requests
# - Inefficient database queries

# 3. Use async/await properly
// Bad
const result = await fetch1(); // waits for 1s
const result2 = await fetch2(); // waits for 1s
// Total: 2s

// Good
const [result, result2] = await Promise.all([
  fetch1(),  // both in parallel
  fetch2()
]); // Total: ~1s
```

---

## Debugging by Transport

### STDIO (Default)

```bash
# Basic debugging
npx simply-mcp run server.ts --verbose

# With breakpoints
npx simply-mcp run server.ts --inspect-brk
```

**Characteristics:**
- Single client connection
- Direct console output
- Easy local testing
- Use for CLI tools and desktop apps

### HTTP Transport

```bash
# Start HTTP server
npx simply-mcp run server.ts --http --port 3000

# Test with curl
curl http://localhost:3000/tools

# With verbose output
npx simply-mcp run server.ts --http --port 3000 --verbose

# With debugging
npx simply-mcp run server.ts --http --port 3000 --inspect
```

**Common issues:**
- Port already in use → Use different port with `--port`
- Client connection lost → Check network, increase timeout
- Session issues → Use `--http-stateless` for serverless

### Multiple Servers

```bash
# Run multiple servers (HTTP enabled automatically)
npx simply-mcp run server1.ts server2.ts server3.ts

# Monitor with verbose
npx simply-mcp run server1.ts server2.ts --verbose

# List running servers
npx simply-mcp list

# Stop specific server
npx simply-mcp stop server1
```

---

## Error Messages & Solutions

### "Port already in use"

```bash
# Find what's using the port
lsof -i :3000          # macOS/Linux
netstat -ano | grep 3000  # Windows

# Use different port
npx simply-mcp run server.ts --http --port 8080

# Kill existing process (dangerous!)
kill $(lsof -t -i:3000)  # macOS/Linux
```

### "Cannot find module"

```bash
# Install dependencies
npm install

# For bundles, force reinstall
npx simply-mcp run ./my-bundle --force-install

# Check node_modules
ls node_modules
```

### "Server validation failed"

```bash
# Get detailed validation errors
npx simply-mcp run server.ts --dry-run --json

# Check for Interface API patterns:
# - Interface extends IServer
# - Class implements server interface
# - Tool interfaces extend ITool
# - All tools are properly typed
```

### "Tool validation failed"

```bash
# Get detailed error
npx simply-mcp run server.ts --dry-run --json

# Common issues:
# - Missing description
# - Invalid parameter types
# - Duplicate tool names
# - Non-serializable return types
```

---

## Debugging Tools & Features

### JSON Output

Get structured output for programmatic use:

```bash
npx simply-mcp run server.ts --dry-run --json | jq .

# Parse specific fields
npx simply-mcp run server.ts --dry-run --json | jq '.tools'
npx simply-mcp run server.ts --dry-run --json | jq '.errors'
```

### Environment Variables

Control debugging behavior:

```bash
# Enable all debug output
DEBUG=* npx simply-mcp run server.ts

# Specific module debugging
DEBUG=simply-mcp:* npx simply-mcp run server.ts

# Node.js debugging
NODE_DEBUG=http npx simply-mcp run server.ts
```

### Configuration Files

Use config files for complex setups:

```bash
# Create config
npx simply-mcp config init

# Show current config
npx simply-mcp config show

# Validate config
npx simply-mcp config validate

# Run with config
npx simply-mcp run my-server  # uses simplymcp.config.ts
```

---

## Testing Your Server

### Manual Testing

```bash
# 1. Start in watch mode
npx simply-mcp run server.ts --watch

# 2. In another terminal, test with CLI tool
npx simply-mcp list

# 3. Connect from Claude Desktop or MCP client
# ... test in client ...

# 4. Watch for errors in server terminal
# 5. Edit server, save - watch mode restarts
```

### Automated Testing

```bash
# Create test file
cat > test-server.ts << 'EOF'
import server from './server.ts';

// Test tools
const result = await server.tools[0].execute({ /* args */ });
console.log('Tool result:', result);
EOF

# Run test
npx tsx test-server.ts
```

### With Examples

```bash
# Run example servers
npx simply-mcp run examples/interface-minimal.ts --verbose

# Test with advanced example
npx simply-mcp run examples/interface-advanced.ts --inspect

# Multiple examples
npx simply-mcp run examples/interface-minimal.ts examples/interface-protocol-comprehensive.ts --verbose
```

---

## Debugging in Production

### Monitor Running Servers

```bash
# List all running servers
npx simply-mcp list --verbose

# Get JSON output
npx simply-mcp list --json

# Check specific server status
npx simply-mcp list | grep my-server
```

### Log Aggregation

```bash
# Redirect output to file
npx simply-mcp run server.ts >> server.log 2>&1

# Monitor in real-time
tail -f server.log

# With timestamp
npx simply-mcp run server.ts | while IFS= read -r line; do
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $line"
done | tee server.log
```

### Performance Monitoring

```bash
# Enable Node.js profiling
node --prof server.ts

# Process profile
node --prof-process isolate-*.log > profile.txt
cat profile.txt

# Memory usage
node --max-old-space-size=4096 server.ts
```

---

## See Also

- [ERROR_HANDLING.md](./ERROR_HANDLING.md) - Error handling in code
- [WATCH_MODE_GUIDE.md](./WATCH_MODE_GUIDE.md) - Watch mode details
- [DRY_RUN_GUIDE.md](./DRY_RUN_GUIDE.md) - Validation details
- [CLI_ADVANCED.md](./CLI_ADVANCED.md) - All CLI options
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production debugging

---

**Need help?** Open an issue on [GitHub](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
