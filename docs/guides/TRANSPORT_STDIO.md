# Stdio Transport

Standard Input/Output transport for MCP servers.

## Table of Contents

- [What is Stdio?](#what-is-stdio)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Example (Interface API)](#example-interface-api)
- [Claude Desktop Integration](#claude-desktop-integration)
- [Debugging](#debugging)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Related Guides](#related-guides)

---

## What is Stdio?

**Stdio** (Standard Input/Output) is a transport that communicates via process streams:

- **stdin**: Client sends JSON-RPC requests to your server
- **stdout**: Server sends JSON-RPC responses back
- **stderr**: Server logs (doesn't interfere with protocol)

## STDIO Transport Architecture

**How it works**:
- Server reads JSON-RPC from stdin
- Server writes JSON-RPC to stdout
- Client manages process lifecycle
- Communication is bidirectional over process pipes

**Flow**: Client spawns → Server starts → stdin/stdout communication → Client terminates process

**Key Characteristics**:
- One client per server process
- State lives in process memory
- Logs go to stderr (won't corrupt protocol)
- Process termination cleans up resources

## Configuration

The Interface API automatically uses stdio transport by default. Simply define your server and run it with the CLI.

## Example (Interface API)

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a user';
  params: { name: string };
  result: { message: string };
}

interface StdioService extends IServer {
  name: 'stdio-interface';
  version: '1.0.0';
}

export default class StdioServiceImpl implements StdioService {
  greet: GreetTool = async (params) => ({
    message: `Hello, ${params.name}!`
  });
}
```

**Run:**
```bash
npx simply-mcp run StdioServiceImpl.ts
```

## Claude Desktop Integration

**Configuration File Location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Configuration Format:**

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/absolute/path/to/server.js"]
    }
  }
}
```

**With npx (recommended for TypeScript):**

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/absolute/path/to/server.ts"
      ]
    }
  }
}
```

**With environment variables:**

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/server.js"],
      "env": {
        "API_KEY": "secret-key",
        "DEBUG": "true"
      }
    }
  }
}
```

**Multiple servers:**

```json
{
  "mcpServers": {
    "calculator": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/calculator.ts"]
    },
    "weather": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/weather.ts"]
    },
    "filesystem": {
      "command": "node",
      "args": ["/path/to/fs-server.js"]
    }
  }
}
```

**Verifying Configuration:**

1. Save the config file
2. Restart Claude Desktop
3. Click the MCP icon (🔌) in Claude Desktop
4. You should see your server listed
5. If errors occur, check the Claude Desktop logs:
   - **macOS**: `~/Library/Logs/Claude/mcp*.log`
   - **Windows**: `%LOCALAPPDATA%\Claude\logs\mcp*.log`
   - **Linux**: `~/.local/state/Claude/logs/mcp*.log`

## Debugging

**Console Logging:**

```typescript
// ❌ WRONG - Corrupts stdout protocol
console.log('Debug info');

// ✅ CORRECT - Logs to stderr
console.error('Debug info');
```

**With context logger:**

```typescript
server.addTool({
  name: 'debug_tool',
  parameters: z.object({ input: z.string() }),
  execute: async (args, context) => {
    // Logs to stderr
    context?.logger.debug('Processing input:', args.input);
    context?.logger.info('Step 1 complete');
    context?.logger.warn('Potential issue detected');
    context?.logger.error('Error occurred');

    return 'Done';
  },
});
```

**Debugging with MCP Inspector:**

```bash
# Install inspector
npm install -g @modelcontextprotocol/inspector

# Run your server with inspector
npx @modelcontextprotocol/inspector npx tsx server.ts
```

Opens a web UI at http://localhost:6274 showing:
- All requests/responses
- Tool definitions
- Logs
- Performance metrics

**Manual Testing:**

```bash
# Test initialize request
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | npx tsx server.ts

# Test tools/list
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | npx tsx server.ts
```

## Best Practices

**1. Always log to stderr:**
```typescript
// ✅ Good
console.error('[MyServer] Starting...');
context?.logger.info('Processing request');

// ❌ Bad
console.log('Starting...');  // Corrupts stdout
```

**2. Handle SIGINT gracefully:**
```typescript
process.on('SIGINT', async () => {
  console.error('[MyServer] Shutting down gracefully...');
  await server.stop();
  process.exit(0);
});
```

**3. Validate inputs thoroughly:**
```typescript
server.addTool({
  name: 'process_file',
  parameters: z.object({
    path: z.string()
      .min(1, 'Path cannot be empty')
      .refine(p => !p.includes('..'), 'Path traversal not allowed'),
  }),
  execute: async (args) => {
    // Safe to use args.path
  },
});
```

**4. Return structured errors:**
```typescript
execute: async (args) => {
  try {
    return await processData(args);
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}
```

**5. Use absolute paths in Claude config:**
```json
{
  "command": "node",
  "args": ["/Users/username/projects/my-server/dist/server.js"]
}
```

**6. Keep server stateless if possible:**
```typescript
// ❌ Avoid server-wide state (process may be restarted)
let globalCounter = 0;

// ✅ Use request-specific data or external storage
execute: async (args) => {
  const counter = await redis.incr('counter');
  return `Count: ${counter}`;
}
```

## Troubleshooting

### Issue: Server not appearing in Claude Desktop

**Symptoms:**
- Server not listed in MCP menu
- No error messages in Claude

**Solutions:**

1. **Check config file location:**
   ```bash
   # macOS
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

   # Windows
   type %APPDATA%\Claude\claude_desktop_config.json
   ```

2. **Validate JSON syntax:**
   ```bash
   # Use jq or online JSON validator
   cat claude_desktop_config.json | jq .
   ```

3. **Use absolute paths:**
   ```json
   {
     "command": "node",
     "args": ["/full/path/to/server.js"]  // Not ./server.js
   }
   ```

4. **Check permissions:**
   ```bash
   chmod +x server.js
   ```

5. **Restart Claude Desktop** (required after config changes)

### Issue: Protocol errors / Invalid responses

**Symptoms:**
- "Invalid JSON-RPC response"
- "Unexpected output on stdout"

**Solutions:**

1. **Check all console.log statements:**
   ```typescript
   // Find and replace
   console.log → console.error
   ```

2. **Validate JSON output:**
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | npx tsx server.ts | jq .
   ```

3. **Enable debug mode:**
   ```typescript
   console.error('[Debug] Request:', JSON.stringify(request));
   console.error('[Debug] Response:', JSON.stringify(response));
   ```

### Issue: Server crashes or hangs

**Symptoms:**
- Process terminates unexpectedly
- Claude Desktop shows "Server disconnected"
- No response to requests

**Solutions:**

1. **Add error handling:**
   ```typescript
   process.on('uncaughtException', (error) => {
     console.error('[Fatal] Uncaught exception:', error);
     process.exit(1);
   });

   process.on('unhandledRejection', (reason) => {
     console.error('[Fatal] Unhandled rejection:', reason);
     process.exit(1);
   });
   ```

2. **Check for infinite loops or long-running operations:**
   ```typescript
   execute: async (args) => {
     // ✅ Add timeout
     const timeoutMs = 30000;
     const timeout = new Promise((_, reject) =>
       setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
     );

     return await Promise.race([
       processData(args),
       timeout
     ]);
   }
   ```

3. **Check Claude Desktop logs:**
   ```bash
   # macOS
   tail -f ~/Library/Logs/Claude/mcp*.log

   # Windows
   type %LOCALAPPDATA%\Claude\logs\mcp*.log
   ```

---

## Related Guides

- [Transport Overview](./TRANSPORT_OVERVIEW.md) - Transport comparison
- [HTTP Transport](./TRANSPORT_HTTP.md) - Alternative transports
- [Quick Start](./QUICK_START.md) - Get started with stdio

