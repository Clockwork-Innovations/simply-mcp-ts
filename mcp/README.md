# MCP Framework

This directory contains a comprehensive Model Context Protocol (MCP) framework with support for multiple transports and configurable tools, prompts, and resources.

## Documentation

- **[Quick Start](./docs/QUICK-START.md)** - Get started in 5 minutes
- **[Documentation Index](./docs/INDEX.md)** - Complete documentation guide and navigation
- **[Architecture](./docs/architecture/TECHNICAL.md)** - System architecture and design diagrams
- **[Deployment Guide](./docs/guides/DEPLOYMENT.md)** - Deployment guide and production setup
- **[Handler Development](./docs/guides/HANDLER-DEVELOPMENT.md)** - Complete guide to creating handlers
- **[Input Validation](./docs/guides/INPUT-VALIDATION.md)** - Input validation reference (includes quick reference)
- **[API Integration](./docs/guides/API-INTEGRATION.md)** - Client examples (curl, TypeScript, Python)
- **[Transports](./docs/reference/TRANSPORTS.md)** - Transport comparison and selection guide
- **[Testing](./docs/testing/OVERVIEW.md)** - Testing status and test suite documentation
- **[LLM Integration](./docs/reference/LLM-INTEGRATION.md)** - LLM-friendly error messages
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

## Core Files

### Decorator API (Class-Based) 🌟 **NEW & RECOMMENDED**
- **`class-adapter.ts`** - Class-based decorator runner
- **`decorators.ts`** - Decorator definitions (@tool, @prompt, @resource)
- **`DECORATOR-API.md`** - Complete decorator API guide
- **`examples/class-minimal.ts`** - Minimal example (zero config!)
- **`examples/class-basic.ts`** - With explicit decorators
- **`examples/class-jsdoc.ts`** - JSDoc examples
- **`examples/class-advanced.ts`** - Advanced features (optional params, defaults)

### Single-File Adapter (FastMCP-style)
- **`adapter.ts`** - Single-file MCP adapter runner (like FastMCP)
- **`single-file-types.ts`** - Type definitions for single-file configs
- **`examples/single-file-basic.ts`** - Basic single-file example
- **`examples/single-file-advanced.ts`** - Advanced single-file example

### SimplyMCP Framework
- **`SimplyMCP.ts`** - Programmatic MCP server API
- **`examples/simple-server.ts`** - SimplyMCP usage example

### Traditional Servers
- **`configurableServer.ts`** - JSON-based stateful HTTP server
- **`types.ts`** - TypeScript type definitions
- **`config.json`** - Example JSON configuration file
- **`simpleStreamableHttp.ts`** - Basic example server

## Quick Start

### Decorator API (Cleanest - Just a Class!) 🌟 **RECOMMENDED**

**The easiest way to create an MCP server** - just write a TypeScript class:

```bash
# Run a class-based server
npx tsx mcp/class-adapter.ts mcp/examples/class-minimal.ts

# Or with HTTP transport
npx tsx mcp/class-adapter.ts mcp/examples/class-minimal.ts --http --port 3000
```

**Example server (automatic tool registration!):**
```typescript
import { MCPServer } from 'simply-mcp';

@MCPServer()  // Uses class name as server name
export default class MyServer {
  // Public methods automatically become tools!

  add(a: number, b: number): number {
    return a + b;
  }

  greet(name: string, formal?: boolean): string {
    return formal ? `Good day, ${name}` : `Hello, ${name}!`;
  }
}
```

**With JSDoc for rich documentation:**
```typescript
/**
 * Calculate rectangle area
 *
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @returns Area in square units
 *
 * @example
 * calculateArea(10, 5)
 * // Returns: 50
 */
calculateArea(width: number, height: number): number {
  return width * height;
}
```

See [DECORATOR-API.md](./DECORATOR-API.md) for complete guide.

### Single-File Server (Functional Approach)

**Functional approach** - inspired by FastMCP Python library:

```bash
# Run a single-file TypeScript config
npx tsx mcp/adapter.ts mcp/examples/single-file-basic.ts

# Or with HTTP transport
npx tsx mcp/adapter.ts mcp/examples/single-file-basic.ts --http --port 3000
```

**Example config file (clean interface-based schemas):**
```typescript
import { defineMCP, Schema } from 'simply-mcp';

export default defineMCP({
  name: 'my-server',
  version: '1.0.0',
  tools: [
    {
      name: 'greet',
      description: 'Greet a user',
      parameters: Schema.object({
        name: Schema.string({ description: 'Name to greet' }),
        formal: Schema.boolean({ optional: true })
      }),
      execute: async (args) => `Hello, ${args.name}!`
    }
  ]
});
```

**Or use Zod directly if you prefer:**
```typescript
import { z } from 'zod';
// Same as above but with: parameters: z.object({ name: z.string() })
```

See examples:
- `mcp/examples/single-file-clean.ts` - **Recommended**: Clean interface-based schemas
- `mcp/examples/single-file-basic.ts` - Using Zod directly
- `mcp/examples/single-file-advanced.ts` - Advanced Zod patterns

### SimplyMCP (Programmatic API)

For when you need more control or want to build servers programmatically:

```bash
npx tsx mcp/examples/simple-server.ts
```

### Simple Server (Basic Example)

Run the basic example server:

```bash
npx tsx mcp/simpleStreamableHttp.ts
```

Server will start on port 3000 with:
- 1 tool: `greet`
- 1 prompt: `greeting-template`
- 1 resource: Default greeting

### Configurable Server (JSON Config)

Run with the example config:

```bash
npx tsx mcp/configurableServer.ts mcp/config.json
```

Or specify a custom config file:

```bash
npx tsx mcp/configurableServer.ts path/to/your/config.json
```

Server will start on the port specified in config (default: 3001) and load all tools, prompts, and resources from the JSON file.

## Configuration Format

### Tools

```json
{
  "name": "tool-name",
  "description": "Tool description",
  "inputSchema": {
    "type": "object",
    "properties": {
      "param1": {
        "type": "string",
        "description": "Parameter description"
      }
    },
    "required": ["param1"]
  },
  "handler": "handlerName"
}
```

### Prompts

```json
{
  "name": "prompt-name",
  "description": "Prompt description",
  "arguments": [
    {
      "name": "arg1",
      "description": "Argument description",
      "required": true
    }
  ],
  "template": "Template text with {{arg1}} placeholders"
}
```

### Resources

```json
{
  "uri": "https://example.com/resource",
  "name": "Resource Name",
  "description": "Resource description",
  "mimeType": "text/plain",
  "content": "Static content or JSON object"
}
```

## Testing

### Method 1: Claude CLI (Recommended) 🌟

The easiest way to test your MCP server is with Claude CLI, which provides natural language interaction with your tools.

#### Step 1: Add Your Server to Claude CLI

```bash
# Add a server with stdio transport
claude mcp add my-server "npx tsx mcp/examples/simple-server.ts"

# Verify it was added
claude mcp list
```

#### Step 2: Test with Claude CLI

**Option A: Interactive Mode**
```bash
# Start an interactive session with your MCP server
claude

# Then ask Claude to use your tools:
# "List all available tools"
# "Use the greet tool to say hello to World"
# "Calculate 42 times 123 using the calculate tool"
```

**Option B: Non-Interactive Mode**
```bash
# Test tool discovery
echo "What tools are available?" | claude --print --dangerously-skip-permissions

# Test a specific tool
echo "Use the greet tool to greet 'Alice' formally" | claude --print --dangerously-skip-permissions

# Test calculations
echo "Calculate 123 multiplied by 456" | claude --print --dangerously-skip-permissions
```

**Option C: Inline MCP Config (No Permanent Setup)**
```bash
# Test without adding to config permanently
echo "List available tools" | claude --print \
  --strict-mcp-config \
  --dangerously-skip-permissions \
  --mcp-config '{"mcpServers":{"test":{"command":"npx","args":["tsx","mcp/examples/simple-server.ts"]}}}'
```

#### Claude CLI Commands

```bash
# List all configured MCP servers
claude mcp list

# Get details about a specific server
claude mcp get my-server

# Remove a server
claude mcp remove my-server

# Add server with JSON config
claude mcp add-json my-server '{"command":"npx","args":["tsx","mcp/examples/simple-server.ts"]}'
```

### Method 2: MCP Inspector

The official MCP Inspector provides a visual debugging interface.

```bash
# Test SimplyMCP server
npx @modelcontextprotocol/inspector npx tsx mcp/examples/simple-server.ts --http --port 3000

# Test class-based server
npx @modelcontextprotocol/inspector npx tsx mcp/class-adapter.ts mcp/examples/class-minimal.ts

# Opens in browser at http://localhost:6274
```

The Inspector provides:
- Visual tool testing interface
- Request/response inspection
- Real-time logging
- Connection management

### Method 3: Automated Test Suite

Run the comprehensive test suite covering all transport types:

```bash
# Run all tests (stdio, HTTP, SSE)
bash mcp/tests/run-all-tests.sh

# Run specific transport tests
bash mcp/tests/test-stdio.sh           # 13 tests
bash mcp/tests/test-stateful-http.sh   # 18 tests
bash mcp/tests/test-stateless-http.sh  # 10 tests
bash mcp/tests/test-sse.sh            # 12 tests
```

**Test Results:**
- ✅ Stdio: 13/13 tests passed
- ✅ Stateful HTTP: 18/18 tests passed
- ✅ Stateless HTTP: 10/10 tests passed
- ✅ SSE: 12/12 tests passed
- **Total: 53/53 tests passed (100%)**

### Method 4: Manual HTTP Testing (curl)

For testing HTTP transport directly without Claude CLI:

#### Initialize Connection

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'
```

Response will include a session ID in the output. Use it for subsequent requests.

#### List Tools

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

#### Call a Tool

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"greet","arguments":{"name":"World"}}}'
```

#### Get a Prompt

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":4,"method":"prompts/get","params":{"name":"greeting-template","arguments":{"name":"Alice"}}}'
```

#### Read a Resource

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":5,"method":"resources/read","params":{"uri":"https://example.com/api/info"}}'
```

### Testing Best Practices

1. **Start with Claude CLI** - Natural language testing is fastest for development
2. **Use MCP Inspector** - Visual debugging when tools behave unexpectedly
3. **Run test suite** - Verify all transports work before deployment
4. **Manual curl testing** - Debug low-level protocol issues

### Common Testing Scenarios

```bash
# Scenario 1: Test a new tool you just added
claude mcp add dev-server "npx tsx mcp/examples/simple-server.ts"
echo "Test the greet tool with name 'Developer'" | claude --print --dangerously-skip-permissions

# Scenario 2: Debug tool parameters
npx @modelcontextprotocol/inspector npx tsx mcp/examples/simple-server.ts

# Scenario 3: Verify production readiness
bash mcp/tests/run-all-tests.sh

# Scenario 4: Test HTTP transport
npx tsx mcp/examples/simple-server.ts --http --port 3000
# In another terminal:
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
```

## Features

### Single-File Adapter (FastMCP-style)
- ✅ **Define everything in one TypeScript file** - no separate config/handler files
- ✅ **FastMCP-inspired API** - familiar Python-like decorator pattern
- ✅ **Full Zod validation** - type-safe schemas with automatic validation
- ✅ **Type inference** - full TypeScript support with inferred types
- ✅ **Stdio and HTTP transports** - command-line flags to switch
- ✅ **Zero boilerplate** - `npx tsx mcp/adapter.ts your-file.ts`

### Framework Features
- ✅ Streamable HTTP transport with SSE support
- ✅ Session management with UUID generation
- ✅ CORS enabled for cross-origin requests
- ✅ Tools, Prompts, and Resources support
- ✅ JSON/TypeScript configuration options
- ✅ Template variables in prompts ({{variable}} syntax)
- ✅ Graceful shutdown handling
- ✅ Input validation and sanitization
- ✅ LLM-friendly error messages
- ✅ Structured logging with context
- ✅ **Image & Binary Content Support** (Phase 2) - Return images, PDFs, audio, and other binary data with auto-detection and base64 encoding

## Dependencies

- `@modelcontextprotocol/sdk` - MCP TypeScript SDK
- `express` - Web server framework
- `cors` - CORS middleware
- `zod` - Schema validation and type inference
- `zod-to-json-schema` - Convert Zod schemas to JSON Schema
- `tsx` - TypeScript execution

## Which Approach Should I Use?

### Use Decorator API (Class-Based) if: 🌟 **RECOMMENDED**
- ✅ You want the **absolute cleanest** syntax
- ✅ You prefer object-oriented programming
- ✅ You want **automatic tool registration** from public methods
- ✅ You need **JSDoc documentation** auto-extraction
- ✅ You want **optional parameters and defaults** with minimal code
- ✅ You're building a medium to large server

### Use Single-File Adapter (FastMCP-style) if:
- ✅ You want a simple, functional approach
- ✅ You prefer all code in one file
- ✅ You want Zod validation with full type safety
- ✅ You're familiar with FastMCP or similar frameworks
- ✅ You want to quickly prototype or build small servers

### Use SimplyMCP (Programmatic) if:
- ✅ You need to build servers dynamically at runtime
- ✅ You want programmatic control over server lifecycle
- ✅ You're building a server generation tool
- ✅ You need to add/remove tools dynamically

### Use JSON Config Server if:
- ✅ You prefer separating config from code
- ✅ You want non-developers to modify configuration
- ✅ You need external handler files for complex logic
- ✅ You're working with existing JSON-based tooling

## Notes

- **Single-file adapter** is the recommended approach for most use cases
- Session IDs are generated using Node's `crypto.randomUUID()`
- All servers support graceful shutdown via SIGINT (Ctrl+C)
- The framework includes comprehensive validation, security, and error handling