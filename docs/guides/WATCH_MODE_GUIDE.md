# Watch Mode Guide

## Overview

Watch mode provides automatic server restart when files change during development. This enables hot-reload functionality, making it faster and easier to develop and test MCP servers.

## Features

### Core Capabilities

- **Auto-restart on file changes**: Server automatically restarts when source files are modified
- **Dependency tracking**: Watches the main file, related TypeScript files, and package.json
- **Graceful shutdown**: Properly terminates old server before starting new one
- **Multiple transports**: Works with both STDIO and HTTP transports
- **All API styles**: Supports decorator, functional, and programmatic API styles
- **Debouncing**: Prevents rapid restarts when multiple files change simultaneously
- **Restart timing**: Shows how long each restart takes

### Advanced Options

- **Polling mode**: Use `--watch-poll` for network drives or filesystems without native watch support
- **Custom interval**: Configure polling interval with `--watch-interval` (default: 100ms)
- **Verbose output**: Use `--verbose` to see detailed watch activity

## Usage

### Basic Usage

```bash
# Watch a decorator-based server
simplymcp run my-server.ts --watch

# Watch a functional API server
simplymcp run server-config.ts --watch

# Watch with HTTP transport
simplymcp run my-server.ts --watch --http --port 3000
```

### Advanced Usage

```bash
# Watch with polling (for network drives)
simplymcp run my-server.ts --watch --watch-poll

# Custom polling interval (500ms)
simplymcp run my-server.ts --watch --watch-poll --watch-interval 500

# Verbose output for debugging
simplymcp run my-server.ts --watch --verbose
```

## What Gets Watched

Watch mode monitors the following files for changes:

1. **Main server file**: The file you specify in the run command
2. **TypeScript dependencies**: All `.ts` files in the same directory
3. **Package dependencies**: `package.json` for dependency changes

### Ignored Patterns

The following patterns are automatically ignored:

- `**/node_modules/**`
- `**/dist/**`
- `**/*.test.ts`
- `**/*.spec.ts`
- `**/.git/**`
- `**/.DS_Store`
- `**/coverage/**`

## How It Works

### Startup Sequence

1. Starts the initial server process
2. Initializes file watcher with configured patterns
3. Monitors for file changes
4. Shows "Watching for changes..." message

### Restart Sequence

1. Detects file change
2. Logs changed file path
3. Gracefully stops current server (SIGTERM)
4. Waits for server to exit (max 5 seconds)
5. Starts new server process
6. Shows restart completion time

### Shutdown Sequence

1. Receives SIGINT (Ctrl+C) or SIGTERM
2. Closes file watcher
3. Stops child server process
4. Exits cleanly

## Output Format

### Standard Output

```
[Watch] Starting watch mode...
[Watch] File: /path/to/my-server.ts
[Watch] API Style: decorator
[Watch] Transport: STDIO
[Watch] Press Ctrl+C to stop

[Watch] [14:32:10] Starting server process...
[Watch] [14:32:10] Server started (PID: 12345)
[SimplyMCP] Server running on stdio

[Watch] [14:32:45] File change detected, restarting server...
[Watch] [14:32:45] Stopping server process...
[Watch] [14:32:46] Starting server process...
[Watch] [14:32:46] Server started (PID: 12346)
[Watch] [14:32:46] ✓ Restart complete (234ms)
```

### Verbose Output

```
[Watch] Watching patterns:
[Watch]   - /path/to/my-server.ts
[Watch]   - /path/to/**/*.ts
[Watch]   - /path/to/package.json
[Watch] [14:32:10] Watcher ready
[Watch] [14:32:45] Changed: /path/to/my-server.ts
[Watch] [14:32:45] File change detected, restarting server...
[Watch] [14:32:45] Stopping server process...
[Watch] [14:32:45] Server process exited with code: 0
[Watch] [14:32:46] Starting server process...
[Watch] Command: node dist/mcp/cli/index.js run /path/to/my-server.ts --style decorator
[Watch] [14:32:46] Server started (PID: 12346)
[Watch] [14:32:46] ✓ Restart complete (234ms)
```

## Use Cases

### Development Workflow

```bash
# Start watch mode
simplymcp run my-server.ts --watch

# Edit your server file in your editor
# Watch mode automatically restarts

# Test changes immediately in your MCP client
# No manual restart needed
```

### Testing Multiple Changes

```bash
# Watch mode with verbose output
simplymcp run my-server.ts --watch --verbose

# Make multiple edits
# Debouncing prevents rapid restarts
# See detailed logs of what changed
```

### HTTP Development

```bash
# Watch mode with HTTP transport
simplymcp run my-server.ts --watch --http --port 3000

# Server restarts automatically
# HTTP endpoint stays on same port
# Test with curl or browser
```

## Configuration File Support

You can configure watch mode in `simplymcp.config.js`:

```javascript
export default {
  run: {
    watch: true,
    watchPoll: false,
    watchInterval: 100,
    verbose: true,
  },
};
```

Then run without flags:

```bash
simplymcp run my-server.ts  # Uses config settings
```

CLI flags override config settings:

```bash
simplymcp run my-server.ts --no-watch  # Disables watch from config
```

## Troubleshooting

### Watch Not Detecting Changes

**Problem**: Files change but server doesn't restart

**Solution**: Try polling mode
```bash
simplymcp run my-server.ts --watch --watch-poll
```

### Too Many Restarts

**Problem**: Server restarts multiple times for one change

**Solution**: Increase debounce interval (default: 300ms)
- Edit `mcp/cli/watch-mode.ts` and increase `RESTART_DEBOUNCE_MS`

### Server Not Stopping

**Problem**: Old server process doesn't exit

**Solution**: Watch mode will force kill after 5 seconds
- Check for blocking operations in your server
- Ensure proper cleanup in shutdown handlers

### Network Drives

**Problem**: Watch mode doesn't work on network drives

**Solution**: Use polling mode with custom interval
```bash
simplymcp run my-server.ts --watch --watch-poll --watch-interval 500
```

## Limitations

### Current Limitations

1. **Multi-server mode**: Watch mode doesn't support running multiple servers simultaneously
2. **Config file changes**: Changes to `simplymcp.config.js` require manual restart
3. **Node module changes**: Installing new npm packages requires manual restart

### Platform-Specific Notes

- **macOS**: Uses native FSEvents (fast and efficient)
- **Linux**: Uses inotify (fast and efficient)
- **Windows**: Uses ReadDirectoryChangesW (may need polling for some filesystems)
- **Network drives**: Use polling mode (`--watch-poll`)

## Best Practices

### Performance

1. **Minimize watched files**: Keep related files in the same directory
2. **Use .gitignore patterns**: Ignored files won't trigger restarts
3. **Adjust polling interval**: Lower values = more responsive but higher CPU usage

### Development

1. **Use verbose mode**: Debug watch issues with `--verbose`
2. **Test with HTTP**: Easier to verify restarts with HTTP endpoints
3. **Check restart timing**: Monitor restart times to optimize your server

### Production

**Warning**: Watch mode is for development only. Never use in production:
- Adds overhead from file watching
- Auto-restarts can cause service disruption
- Not designed for production reliability

## Examples

### Decorator API with Watch Mode

```typescript
// my-server.ts
// Unified import pattern (v2.5.0+)
import { MCPServer } from 'simply-mcp';

@MCPServer({ name: 'my-server', version: '1.0.0' })
export default class MyServer {
  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}
```

```bash
# Start with watch mode
simplymcp run my-server.ts --watch

# Edit my-server.ts (e.g., change greeting)
# Server automatically restarts
```

### Functional API with Watch Mode

```typescript
// server.ts
import { defineMCP } from 'simply-mcp';

export default defineMCP({
  name: 'my-server',
  version: '1.0.0',
  tools: [
    {
      name: 'greet',
      description: 'Greet a person',
      parameters: { name: 'string' },
      execute: async ({ name }) => `Hello, ${name}!`,
    },
  ],
});
```

```bash
# Start with watch mode and HTTP
simplymcp run server.ts --watch --http --port 3000

# Edit server.ts
# Server restarts on port 3000
```

### Watch Mode with Config File

```javascript
// simplymcp.config.js
export default {
  run: {
    watch: true,
    verbose: true,
    http: true,
    port: 3000,
  },
};
```

```bash
# Uses config settings automatically
simplymcp run my-server.ts
```

## Integration with Development Tools

### VS Code

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Watch MCP Server",
      "type": "shell",
      "command": "simplymcp run my-server.ts --watch --verbose",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "dedicated"
      }
    }
  ]
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "simplymcp run my-server.ts --watch",
    "dev:http": "simplymcp run my-server.ts --watch --http --port 3000",
    "dev:verbose": "simplymcp run my-server.ts --watch --verbose"
  }
}
```

Then run:
```bash
npm run dev
npm run dev:http
npm run dev:verbose
```

## API Reference

### Command Line Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--watch` | boolean | false | Enable watch mode |
| `--watch-poll` | boolean | false | Use polling instead of native |
| `--watch-interval` | number | 100 | Polling interval in ms |
| `--verbose` | boolean | false | Show detailed watch output |

### Watch Mode Behavior

- **Debounce**: 300ms between restarts
- **Force kill timeout**: 5 seconds
- **Restart sequence**: SIGTERM → wait → SIGKILL (if needed)
- **File stabilization**: 100ms after last change

## Summary

Watch mode is a powerful development tool that:

- ✅ Automatically restarts your server when files change
- ✅ Tracks dependencies and related files
- ✅ Works with all API styles and transports
- ✅ Provides detailed logging and timing
- ✅ Handles graceful shutdown
- ✅ Supports polling for challenging filesystems

Use it during development to speed up your workflow and test changes instantly!
