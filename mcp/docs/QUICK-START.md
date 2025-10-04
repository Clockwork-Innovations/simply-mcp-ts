# Quick Start Guide

Get your first MCP server running with a custom tool in **under 10 minutes**!

## What You'll Learn

This guide will walk you through:
- Starting a basic MCP server
- Creating a custom tool with inline handlers
- Testing your tool with real requests
- Understanding the MCP request/response flow

**Time estimate:** 5-10 minutes

## Prerequisites

Before you begin, ensure you have:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- Basic terminal/command line knowledge
- A text editor

### Check Your Setup

Verify your Node.js installation:

```bash
node --version
```

You should see something like `v18.0.0` or higher.

---

## Step 1: Install Dependencies

First, make sure you're in the project root directory and install the required dependencies:

```bash
npm install
```

This installs:
- `@modelcontextprotocol/sdk` - The MCP TypeScript SDK
- `express` - Web server framework
- `tsx` - TypeScript execution runtime

✅ **Verify installation:** You should see a `node_modules` folder in your project.

---

## Step 2: Create Your First Configuration

Create a new configuration file to define your MCP server and tools. Let's create a simple config with a calculator tool.

Create a file named `my-first-config.json` in the `mcp` directory:

```bash
touch mcp/my-first-config.json
```

Add this complete configuration:

```json
{
  "name": "my-first-mcp-server",
  "version": "1.0.0",
  "port": 3002,
  "tools": [
    {
      "name": "add",
      "description": "Adds two numbers together",
      "inputSchema": {
        "type": "object",
        "properties": {
          "a": {
            "type": "number",
            "description": "First number"
          },
          "b": {
            "type": "number",
            "description": "Second number"
          }
        },
        "required": ["a", "b"]
      },
      "handler": {
        "type": "inline",
        "code": "async (args) => ({ content: [{ type: 'text', text: `Result: ${args.a} + ${args.b} = ${args.a + args.b}` }] })"
      }
    },
    {
      "name": "greet",
      "description": "Greets someone by name",
      "inputSchema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of person to greet"
          }
        },
        "required": ["name"]
      },
      "handler": {
        "type": "inline",
        "code": "async (args) => ({ content: [{ type: 'text', text: `Hello, ${args.name}! Welcome to MCP!` }] })"
      }
    }
  ]
}
```

### Understanding the Configuration

Let's break down what each part does:

- **`name` & `version`**: Identifies your server
- **`port`**: The port your server will run on (3002 in this case)
- **`tools`**: Array of tools your server provides
  - **`name`**: Unique identifier for the tool
  - **`description`**: Explains what the tool does (helps LLMs understand when to use it)
  - **`inputSchema`**: JSON Schema defining the tool's parameters
  - **`handler`**: The code that runs when the tool is called
    - **`type: "inline"`**: Code is embedded directly in the config
    - **`code`**: An async function that receives args and returns a response

💡 **Note:** Inline handlers are great for simple logic. For complex handlers, use file-based handlers (we'll cover that in the Handler Guide).

---

## Step 3: Start Your Server

Now let's start your MCP server with the configuration you just created:

```bash
npx tsx mcp/configurableServer.ts mcp/my-first-config.json
```

**Expected output:**

```
🚀 MCP Server 'my-first-mcp-server' starting...
✅ Loaded 2 tools
✅ Loaded 0 prompts
✅ Loaded 0 resources
🌐 Server running on http://localhost:3002
📍 MCP endpoint: http://localhost:3002/mcp
```

✅ **Success!** Your MCP server is now running.

⚠️ **Keep this terminal window open** - the server needs to stay running to handle requests.

---

## Step 4: Initialize a Session

MCP uses sessions to manage client connections. First, you need to initialize a session.

Open a **new terminal window** (keep the server running in the first one) and run:

```bash
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "quick-start-test",
        "version": "1.0.0"
      }
    }
  }'
```

**Expected response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "prompts": {},
      "resources": {}
    },
    "serverInfo": {
      "name": "my-first-mcp-server",
      "version": "1.0.0"
    },
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

💡 **Important:** Copy the `sessionId` value from your response - you'll need it for the next steps!

---

## Step 5: Test Your Tools

Now let's test the tools you created. Replace `YOUR_SESSION_ID` with the actual session ID from Step 4.

### Test 1: List Available Tools

First, let's see what tools are available:

```bash
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

**Expected response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "add",
        "description": "Adds two numbers together",
        "inputSchema": {
          "type": "object",
          "properties": {
            "a": { "type": "number", "description": "First number" },
            "b": { "type": "number", "description": "Second number" }
          },
          "required": ["a", "b"]
        }
      },
      {
        "name": "greet",
        "description": "Greets someone by name",
        "inputSchema": {
          "type": "object",
          "properties": {
            "name": { "type": "string", "description": "Name of person to greet" }
          },
          "required": ["name"]
        }
      }
    ]
  }
}
```

### Test 2: Call the Add Tool

Let's add two numbers:

```bash
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "add",
      "arguments": {
        "a": 42,
        "b": 8
      }
    }
  }'
```

**Expected response:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Result: 42 + 8 = 50"
      }
    ]
  }
}
```

### Test 3: Call the Greet Tool

Let's greet someone:

```bash
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "greet",
      "arguments": {
        "name": "World"
      }
    }
  }'
```

**Expected response:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Hello, World! Welcome to MCP!"
      }
    ]
  }
}
```

✅ **Congratulations!** You've successfully created and tested your first MCP server with custom tools!

---

## Step 6: Try the Pre-Built Examples

The framework includes several example configurations you can try:

### Basic Example (Inline Handlers)

```bash
npx tsx mcp/configurableServer.ts mcp/examples/basic-config.json
```

This runs on port 3001 with `greet` and `echo` tools using inline handlers.

### Full Example (Multiple Handler Types)

```bash
npx tsx mcp/configurableServer.ts mcp/config.json
```

This runs on port 3001 with:
- File-based handlers (`greet`, `calculate`)
- HTTP proxy handler (`fetch-joke`)
- Inline handler (`echo`)
- Security features (API keys, rate limiting)

### Simple Server (No Config File)

```bash
npx tsx mcp/simpleStreamableHttp.ts
```

This runs a hardcoded server on port 3000 - great for understanding the core SDK.

---

## Understanding Handler Types

The MCP framework supports four types of handlers:

### 1. Inline Handlers (What You Just Used!)

Perfect for simple logic. Code is embedded directly in the config:

```json
{
  "handler": {
    "type": "inline",
    "code": "async (args) => ({ content: [{ type: 'text', text: `Hello ${args.name}` }] })"
  }
}
```

**Use when:** Logic is simple (one-liners, basic calculations, string formatting)

### 2. File Handlers

For complex logic. Code lives in a separate TypeScript file:

```json
{
  "handler": {
    "type": "file",
    "path": "./mcp/handlers/examples/calculateHandler.ts"
  }
}
```

**Use when:** Logic is complex, reusable, or requires imports

### 3. Registry Handlers

Pre-registered functions in code:

```json
{
  "handler": {
    "type": "registry",
    "name": "myRegisteredHandler"
  }
}
```

**Use when:** Building a library of reusable handlers

### 4. HTTP Handlers

Proxy to external HTTP APIs:

```json
{
  "handler": {
    "type": "http",
    "url": "https://api.example.com/endpoint",
    "method": "POST"
  }
}
```

**Use when:** Integrating with external services

---

## Next Steps

Now that you have a working MCP server, here's what to learn next:

### 📚 Read the Guides

1. **[HANDLER-GUIDE.md](./HANDLER-GUIDE.md)** - Deep dive into creating handlers
   - File-based handlers for complex logic
   - Error handling best practices
   - Handler testing strategies

2. **[VALIDATION-GUIDE.md](./VALIDATION-GUIDE.md)** - Input validation and sanitization
   - Protect against XSS and injection attacks
   - Define strict schemas
   - Custom validation rules

3. **[API-EXAMPLES.md](./API-EXAMPLES.md)** - More client examples
   - TypeScript SDK usage
   - Python client examples
   - Advanced curl patterns

4. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and patterns
   - How the framework works internally
   - Extensibility points
   - Performance considerations

### 🔨 Build Something

Try creating a tool that:
- Reads from a database
- Calls an external API (weather, news, etc.)
- Performs file operations
- Integrates with your existing system

### 🔍 Explore Examples

Check out the example handlers in `mcp/handlers/examples/`:
- `greetHandler.ts` - Simple greeting
- `calculateHandler.ts` - Calculator with validation
- `fetchDataHandler.ts` - HTTP request example

### 🚀 Production Deployment

When you're ready to deploy:
- Read **[DEPLOYMENT.md](./DEPLOYMENT.md)** for production best practices
- Enable security features (API keys, rate limiting)
- Set up monitoring and logging
- Configure HTTPS

---

## Troubleshooting

### ❌ Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3002`

**Solution:**
1. Kill the process using the port:
   ```bash
   lsof -ti:3002 | xargs kill -9
   ```
2. Or change the port in your config file

### ❌ Config File Not Found

**Error:** `Error: ENOENT: no such file or directory`

**Solution:** Make sure you're running the command from the project root directory:
```bash
pwd  # Should show: /path/to/cv-gen
```

### ❌ Session ID Error

**Error:** `Missing or invalid session ID`

**Solution:**
1. Make sure you initialized a session first (Step 4)
2. Copy the exact `sessionId` from the initialize response
3. Replace `YOUR_SESSION_ID` in the curl command with your actual session ID

### ❌ Handler Execution Error

**Error:** `Handler execution failed`

**Solution:**
1. Check the server terminal for detailed error messages
2. Verify your inline handler code syntax
3. Make sure all required parameters are provided
4. Check the server logs for stack traces

### ❌ Invalid JSON in Request

**Error:** `Unexpected token` or `JSON parse error`

**Solution:**
1. Validate your JSON at [jsonlint.com](https://jsonlint.com)
2. Make sure all quotes are properly escaped
3. Check for trailing commas (not allowed in JSON)

### 🆘 Still Having Issues?

1. **Check the logs:** Server logs show detailed error messages
2. **Try the examples:** Run `npx tsx mcp/examples/basic-config.json` to verify setup
3. **Read the guides:** More detailed troubleshooting in individual guides
4. **Review the test suite:** `mcp/TESTING.md` has integration test examples

---

## Quick Reference

### Testing with Claude CLI (Easiest!) 🌟

```bash
# Add your server to Claude CLI (using new simplified commands)
claude mcp add my-server "simplymcp run mcp/examples/simple-server.ts"

# Or with watch mode for development
claude mcp add my-server-dev "simplymcp run mcp/examples/simple-server.ts --watch"

# Or with old commands (still supported)
claude mcp add my-server "npx tsx mcp/examples/simple-server.ts"

# Test interactively
claude
# Then: "List all available tools"
# Then: "Use the greet tool to say hello to World"

# Test non-interactively
echo "Calculate 123 multiplied by 456" | claude --print --dangerously-skip-permissions

# One-time test (no config change)
echo "What tools are available?" | claude --print \
  --strict-mcp-config \
  --dangerously-skip-permissions \
  --mcp-config '{"mcpServers":{"test":{"command":"simplymcp","args":["run","mcp/examples/simple-server.ts"]}}}'

# List configured servers
claude mcp list

# Remove a server
claude mcp remove my-server
```

### Development Workflow with Motorcycle Features

```bash
# Watch mode - auto-restart on changes
simplymcp run server.ts --watch

# Debug mode - attach debugger
simplymcp run server.ts --inspect

# Dry-run - validate before running
simplymcp run server.ts --dry-run

# Multiple servers
simplymcp run api.ts auth.ts data.ts --http --port 3000

# List running servers
simplymcp list --verbose

# Stop all servers
simplymcp stop all
```

### Common Commands

```bash
# Start server with custom config
npx tsx mcp/configurableServer.ts path/to/config.json

# Start simple example server
npx tsx mcp/simpleStreamableHttp.ts

# Test with MCP Inspector (visual interface)
npx @modelcontextprotocol/inspector npx tsx mcp/examples/simple-server.ts

# Run automated test suite
bash mcp/tests/run-all-tests.sh

# Initialize session (manual HTTP testing)
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# List tools
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call a tool
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"TOOL_NAME","arguments":{}}}'
```

### MCP Protocol Methods

- `initialize` - Start a new session
- `tools/list` - List available tools
- `tools/call` - Execute a tool
- `prompts/list` - List available prompts
- `prompts/get` - Get a prompt template
- `resources/list` - List available resources
- `resources/read` - Read a resource

---

## What You've Learned

✅ How to create an MCP server configuration
✅ How to define tools with JSON Schema
✅ How to write inline handlers
✅ How to start the server
✅ How to initialize a session
✅ How to call tools via the MCP protocol
✅ How to troubleshoot common issues

**Motorcycle Phase Features (New!):**
✅ Use watch mode for auto-restart during development
✅ Debug servers with Chrome DevTools or VS Code
✅ Validate configurations with dry-run mode
✅ Run multiple servers simultaneously
✅ Manage servers with list and stop commands
✅ Use configuration files for defaults

**You're now ready to build powerful MCP-based tools!** 🎉

---

## Next: Explore Motorcycle Features

**Watch Mode:**
```bash
simplymcp run server.ts --watch
```
Auto-restart when files change. Perfect for rapid development!

**Debug Mode:**
```bash
simplymcp run server.ts --inspect
```
Debug with Chrome DevTools or VS Code. See [DEBUGGING.md](DEBUGGING.md).

**Multi-Server:**
```bash
simplymcp run s1.ts s2.ts s3.ts --http --port 3000
```
Run multiple servers on different ports. See [MULTI_SERVER_QUICKSTART.md](../MULTI_SERVER_QUICKSTART.md).

**Configuration Files:**
Create `simplymcp.config.ts` to define defaults:
```typescript
export default {
  servers: {
    api: { entry: 'api.ts', port: 3000 }
  },
  defaults: { watch: true, verbose: true }
};
```

Then run: `simplymcp run api`

---

**Happy building!** If you have questions or feedback, please check the other guides or review the examples in the `mcp/handlers/examples/` directory.
