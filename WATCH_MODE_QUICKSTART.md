# Watch Mode - Quick Start Guide

## What is Watch Mode?

Watch mode automatically restarts your MCP server when files change during development. No more manual restarts - just edit and test!

## Basic Usage

```bash
# Start watch mode
simplymcp run my-server.ts --watch

# That's it! Edit your server file and it auto-restarts
```

## Common Use Cases

### Development with STDIO
```bash
simplymcp run my-server.ts --watch
```

### Development with HTTP
```bash
simplymcp run my-server.ts --watch --http --port 3000
```

### Debug Mode (Verbose)
```bash
simplymcp run my-server.ts --watch --verbose
```

### Network Drives
```bash
simplymcp run my-server.ts --watch --watch-poll
```

## What You'll See

```
[Watch] Starting watch mode...
[Watch] File: /path/to/my-server.ts
[Watch] API Style: decorator
[Watch] Transport: STDIO
[Watch] Press Ctrl+C to stop

[Watch] [14:32:10] Server started (PID: 12345)

// Edit your file...

[Watch] [14:32:45] File change detected, restarting server...
[Watch] [14:32:46] ✓ Restart complete (234ms)
```

## Configuration File

Add to `simplymcp.config.js`:

```javascript
export default {
  run: {
    watch: true,          // Enable by default
    verbose: true,        // Show details
  },
};
```

Then just run:
```bash
simplymcp run my-server.ts  # Watch mode enabled from config
```

## What Gets Watched

- ✅ Your main server file
- ✅ All `.ts` files in the same directory
- ✅ `package.json` (for dependency changes)
- ❌ `node_modules/` (ignored)
- ❌ `dist/` (ignored)
- ❌ Test files (ignored)

## Quick Tips

1. **Stop watch mode**: Press `Ctrl+C`
2. **See what changed**: Use `--verbose`
3. **Network drives**: Use `--watch-poll`
4. **Slower polling**: Add `--watch-interval 500`

## Troubleshooting

### Files not being detected?
```bash
simplymcp run my-server.ts --watch --watch-poll
```

### Too many restarts?
- The debouncing (300ms) handles this automatically
- Just wait a moment after saving

### Server won't stop?
- Watch mode will force kill after 5 seconds
- Check for blocking operations in your code

## Examples

### Example 1: Simple Development
```bash
# Terminal 1: Start server
simplymcp run weather-server.ts --watch

# Terminal 2: Test it
# Edit weather-server.ts
# Server auto-restarts
# Test again immediately
```

### Example 2: HTTP API Development
```bash
# Start HTTP server with watch
simplymcp run api.ts --watch --http --port 3000

# In another terminal:
curl http://localhost:3000/mcp/v1/tools

# Edit api.ts
# Server restarts on same port
# Curl again to test changes
```

### Example 3: Package.json Scripts
```json
{
  "scripts": {
    "dev": "simplymcp run server.ts --watch",
    "dev:http": "simplymcp run server.ts --watch --http --port 3000"
  }
}
```

```bash
npm run dev       # STDIO mode with watch
npm run dev:http  # HTTP mode with watch
```

## Limitations

- ⚠️ Development only (never use in production)
- ⚠️ Single server only (multi-server not supported)
- ⚠️ Config changes need manual restart

## Full Documentation

For complete details, see:
- `/mnt/Shared/cs-projects/simple-mcp/docs/WATCH_MODE_GUIDE.md`
- `/mnt/Shared/cs-projects/simple-mcp/WATCH_MODE_IMPLEMENTATION.md`

## Test It

```bash
# Run the test suite
bash mcp/tests/test-watch-mode.sh

# All 9 tests should pass ✅
```

---

**That's it! Happy developing with auto-restart! 🚀**
