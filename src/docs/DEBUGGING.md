# Debugging SimpleMCP Servers

This guide shows you how to debug your MCP servers using the built-in Node.js inspector with Chrome DevTools or VS Code.

## Quick Start

Start your server with the `--inspect` flag:

```bash
simplymcp run server.ts --inspect
```

This will output:

```
[Debug] Starting server with Node.js inspector...
[Debug] Inspector will listen on port 9229
[Debug] Waiting for debugger to attach...

Debugger listening on ws://127.0.0.1:9229/abc-123-def
For help, see: https://nodejs.org/en/docs/inspector

[Debug] Inspector URL: ws://127.0.0.1:9229/abc-123-def
[Debug] Open chrome://inspect in Chrome to debug
[Debug] Or connect your IDE debugger to port 9229
[Debug] Debugger attached. Server starting...
```

## Using Chrome DevTools

### Setup (one-time)

1. Open Chrome and navigate to: `chrome://inspect`
2. Click "Configure" next to "Discover network targets"
3. Add `localhost:9229` to the list
4. Click "Done"

### Debugging Session

1. Start your server with inspector:
   ```bash
   simplymcp run server.ts --inspect
   ```

2. In Chrome at `chrome://inspect`, your server should appear under "Remote Target"

3. Click "inspect" to open DevTools

4. You can now:
   - Set breakpoints in your code
   - Inspect variables
   - Step through execution
   - View console output
   - Profile performance

## Using VS Code

### Setup

1. Create or edit `.vscode/launch.json` in your project:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to SimpleMCP",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"],
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

### Debugging Session

1. Start your server with inspector:
   ```bash
   simplymcp run server.ts --inspect
   ```

2. In VS Code:
   - Press `F5`, or
   - Open the "Run and Debug" panel (Ctrl+Shift+D / Cmd+Shift+D)
   - Select "Attach to SimpleMCP"
   - Click the green play button

3. Set breakpoints by clicking in the gutter next to line numbers

4. Your server will pause at breakpoints, allowing you to:
   - Inspect variables in the Variables panel
   - Step through code with F10 (step over) / F11 (step into)
   - Evaluate expressions in the Debug Console
   - View the call stack

## Breaking Before Code Runs

Use `--inspect-brk` to pause execution before your code starts:

```bash
simplymcp run server.ts --inspect-brk
```

This will output:

```
[Debug] Starting server with Node.js inspector...
[Debug] Inspector will listen on port 9229
[Debug] Waiting for debugger to attach...

Debugger listening on ws://127.0.0.1:9229/abc-123-def
For help, see: https://nodejs.org/en/docs/inspector
Debugger attached.

[Debug] Inspector URL: ws://127.0.0.1:9229/abc-123-def
[Debug] Open chrome://inspect in Chrome to debug
[Debug] Or connect your IDE debugger to port 9229
[Debug] Execution paused. Attach debugger to continue.
```

The server will **pause** and wait for you to attach a debugger before running any code.

### When to use `--inspect-brk`

- Setting breakpoints in initialization code
- Debugging startup issues
- Inspecting decorator metadata during class loading
- Debugging configuration parsing
- Catching errors that occur before the server starts

## Custom Inspector Port

If port 9229 is already in use, specify a different port:

```bash
simplymcp run server.ts --inspect --inspect-port 9230
```

Update your debugger configuration to match:

**Chrome DevTools**: Add `localhost:9230` to network targets

**VS Code**: Change the port in `.vscode/launch.json`:
```json
{
  "port": 9230
}
```

## Combining with Other Features

### Debug with Watch Mode

Auto-restart the server with debugging when files change:

```bash
simplymcp run server.ts --watch --inspect
```

The inspector will reconnect automatically on each restart.

### Debug with HTTP Transport

Debug a server using HTTP instead of stdio:

```bash
simplymcp run server.ts --http --port 3000 --inspect
```

### Debug Validation Logic

Debug the dry-run validation process:

```bash
simplymcp run server.ts --dry-run --inspect
```

## Common Debugging Scenarios

### Debugging Tool Execution

Set a breakpoint in your tool's implementation:

```typescript
// Decorator API
@Tool('description')
async myTool(param: string) {
  debugger; // Execution will pause here
  return `Result: ${param}`;
}

// Functional API
{
  tools: [{
    name: 'my-tool',
    execute: async (args) => {
      debugger; // Execution will pause here
      return `Result: ${args.param}`;
    }
  }]
}
```

### Debugging Startup Issues

Use `--inspect-brk` to pause before any code runs:

```bash
simplymcp run server.ts --inspect-brk
```

Then step through the initialization code to find the issue.

### Debugging Type Inference

For decorator-based servers, debug the type parsing:

```bash
simplymcp run server.ts --inspect-brk --verbose
```

Set breakpoints in the decorator code to see how types are inferred.

### Debugging Configuration Loading

Debug config file loading:

```bash
simplymcp run server.ts --config custom-config.js --inspect-brk
```

Set breakpoints in your config file to inspect values.

## Tips and Tricks

### Using `debugger` Statements

Add `debugger;` statements in your code to create programmatic breakpoints:

```typescript
async function myTool(input: string) {
  debugger; // Execution pauses here when inspector is attached
  const result = processInput(input);
  return result;
}
```

These only activate when the inspector is attached, so they're safe to leave in during development.

### Logging Inspector Events

Enable verbose mode to see more details:

```bash
simplymcp run server.ts --inspect --verbose
```

### Remote Debugging

Debug a server running on a remote machine:

1. Start the server with a specific host:
   ```bash
   simplymcp run server.ts --inspect --inspect-port 9229
   ```

2. SSH tunnel to the remote machine:
   ```bash
   ssh -L 9229:localhost:9229 user@remote-host
   ```

3. Connect your local debugger to `localhost:9229`

### Performance Profiling

Use Chrome DevTools Profiler:

1. Start server with `--inspect`
2. Open Chrome DevTools
3. Go to the "Profiler" tab
4. Record a profile while exercising your server
5. Analyze CPU usage and identify bottlenecks

## Troubleshooting

### Inspector Won't Connect

- Check that port 9229 (or your custom port) isn't blocked by a firewall
- Verify the inspector URL in the console output
- Try a different port with `--inspect-port`
- Make sure no other process is using the inspector port

### Breakpoints Not Hit

- Verify source maps are enabled in your debugger
- Check that the file path matches between your editor and the running code
- Try using `debugger;` statements instead of editor breakpoints
- Rebuild your project if using compiled code

### Inspector URL Not Showing

- The inspector URL appears on stderr, make sure you're capturing it
- Try `--inspect-brk` to ensure the inspector initializes before any code runs
- Check that Node.js version is 20.0.0 or higher

### Performance Impact

- The inspector adds some overhead, especially with many breakpoints
- Remove `debugger;` statements in production code
- Use `--inspect` only during development

## Additional Resources

- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Chrome DevTools Documentation](https://developer.chrome.com/docs/devtools/)
- [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [Node.js Inspector Protocol](https://nodejs.org/api/inspector.html)
