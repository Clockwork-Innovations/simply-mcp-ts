<div align="center">
  <img src="simply-mcp-banner.png" alt="Simply MCP" width="100%">
</div>

# Simply MCP

> Type-safe TypeScript framework for building MCP servers with pure interface-driven API - zero boilerplate, full type safety.

[![npm version](https://badge.fury.io/js/simply-mcp.svg)](https://www.npmjs.com/package/simply-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

## What is Simply MCP?

Simply MCP is a TypeScript framework that makes building Model Context Protocol (MCP) servers effortless. Instead of writing verbose schema definitions and boilerplate code, you define your server's capabilities using pure TypeScript interfaces—and Simply MCP handles the rest.

**The Problem:** Traditional MCP server development requires manual schema definitions, protocol handling, and extensive boilerplate code.

**The Solution:** Simply MCP uses AST-based extraction to automatically generate all protocol schemas from your TypeScript interfaces, giving you full type safety with zero boilerplate.

Built on top of the official [Anthropic MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk), Simply MCP adds developer experience features like hot reload, React UI support, tool routing, and OAuth 2.1 authentication—all configured through TypeScript interfaces.

---

## Key Features

✨ **Zero-Boilerplate API**
Define tools, resources, and prompts using pure TypeScript interfaces. Full IntelliSense, compile-time validation, and automatic schema generation.

🚀 **Multiple Transport Modes**
Stdio, HTTP (stateful with sessions/SSE), and HTTP (stateless for serverless). Built-in API key and OAuth 2.1 authentication.

🔌 **Complete MCP Protocol Support**
Sampling, elicitation, roots, subscriptions, progress messages, tool annotations, JSON-RPC batch processing, and autocomplete.

🎨 **React UI Resources**
Build interactive UIs with React/JSX, automatic bundling, hot reload, and adapter hooks for any component library (shadcn, Radix, Material-UI).

🎵 **Rich Content Types**
Serve audio resources (MP3, WAV, OGG, FLAC) with metadata, text/image/embedded content, and dynamic resources.

**Learn More:** [Complete Feature List](./docs/guides/FEATURES.md)

---

## Quick Start

### Installation

```bash
npm install simply-mcp
```

**Optional Dependencies:** Simply-MCP uses lazy loading for advanced features. Dependencies are only required when you use them:
- HTTP transport → `express`, `cors`
- Watch mode → `chokidar`
- Bundling → `esbuild`
- Minification → `terser`, `html-minifier-terser`, `cssnano`
- Client rendering → `@remote-dom/core`, `@remote-dom/react`, `react`, `react-dom`

### Create Your First Server

Simply MCP supports two API patterns: **const-based** (simpler, functional) and **class-based** (traditional). Both are fully supported.

**Const Pattern (Recommended for new projects):**

```typescript
// server.ts
import type { ITool, IParam, IServer, ToolHelper } from 'simply-mcp';

// 1. Configure your server
const server: IServer = {
  name: 'my-server',
  version: '1.0.0',
  description: 'A helpful MCP server'
};

// 2. Define parameter interface
interface NameParam extends IParam {
  type: 'string';
  description: 'Person name to greet';
}

// 3. Define your tool interface
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: NameParam };
  result: string;
}

// 4. Implement tool as const
const greet: ToolHelper<GreetTool> = async (params) => `Hello, ${params.name}!`;

// 5. Export implementations
export { server, greet };
```

**Class Pattern (Alternative - same interfaces):**

```typescript
// 4. Implement the server as class
export default class Server {
  greet: ToolHelper<GreetTool> = async (params) => `Hello, ${params.name}!`;
}
```

**Why const pattern?**
- Less boilerplate (no class declaration)
- Simpler syntax (direct assignments)
- Functional programming style
- Better type inference

**When to use class?**
- Need shared state (`this.counter`, `this.db`)
- Complex initialization logic
- Multiple tools sharing data

See [Const Patterns Guide](./docs/guides/CONST_PATTERNS.md) for complete reference.

### Advanced Parameter Types

Simply MCP supports complex TypeScript types with automatic schema generation:

**Nested Objects:**
```typescript
interface CreateUserTool extends ITool {
  name: 'create_user';
  params: {
    user: {
      name: string;
      email: string;
      address: {
        street: string;
        city: string;
        zipCode?: string;  // Optional nested field
      };
    };
  };
}
```

**Typed Arrays:**
```typescript
interface ProcessItemsTool extends ITool {
  name: 'process_items';
  params: {
    tags: string[];           // String array
    scores: number[];         // Number array
    items: Array<{            // Array of objects
      id: string;
      value: number;
    }>;
  };
}
```

**Union Types (Enums):**
```typescript
interface SetStatusTool extends ITool {
  name: 'set_status';
  params: {
    status: 'active' | 'inactive' | 'pending';  // Automatically becomes enum
  };
}
```

**JSDoc Descriptions:**
```typescript
interface MyTool extends ITool {
  name: 'my_tool';
  params: {
    /** User's full name */
    name: string;
    /** User's age in years */
    age: number;
  };
}
```

All these patterns work with **strict type validation** and automatic schema generation during bundling.

## Choosing Your Pattern: ToolHelper vs Bare Interface

Simply-MCP supports **two equally valid patterns** for implementing tools, prompts, and resources:

| Pattern | Best For | Type Safety | TypeScript Strictness |
|---------|----------|-------------|----------------------|
| **ToolHelper** | Maximum type safety, complex params | Full inference | Works with `strict: true` |
| **Bare Interface** | Simple tools, quick prototypes | Manual typing | Requires `strict: false` |

### When to use ToolHelper?

✅ Use `ToolHelper<T>` when:
- You encounter TypeScript errors with bare interface pattern
- Complex parameter types with nested objects
- Need automatic type inference for params and return types
- Team prefers explicit typing
- Working in strict TypeScript mode

```typescript
const greet: ToolHelper<GreetTool> = async (params) => {
  return `Hello, ${params.name}!`;  // ✅ params.name typed automatically
};
```

### When to use bare interface?

✅ Use bare interface when:
- Simple tools with basic params (strings, numbers, booleans)
- Quick prototypes or examples
- Familiar with manual typing
- Minimal boilerplate preferred
- Working in relaxed TypeScript mode

```typescript
const greet: GreetTool = async (params) => {
  return `Hello, ${params.name}!`;  // ⚠️ params type must match manually
};
```

**Troubleshooting:** If you get TypeScript errors like `"Type 'X' is not assignable to type 'Y'"`, use the ToolHelper pattern for automatic type inference. See [Const Patterns Guide](./docs/guides/CONST_PATTERNS.md#troubleshooting-typescript-errors) for detailed troubleshooting.

### Validate Your Server

```bash
npx simply-mcp run server.ts --dry-run
```

The dry-run validates your interface definitions and catches configuration errors early.

### Run Your Server

```bash
# STDIO transport (default)
npx simply-mcp run server.ts

# HTTP transport (stateful with sessions)
npx simply-mcp run server.ts --transport http --port 3000

# HTTP transport (stateless for serverless)
npx simply-mcp run server.ts --transport http-stateless --port 3000

# WebSocket transport
npx simply-mcp run server.ts --transport ws --port 8080
```

That's it! Your MCP server is running with full type safety and zero boilerplate.

**Next Steps:**
- 📘 [Quick Start Guide](./docs/guides/QUICK_START.md) - Detailed tutorial with testing & troubleshooting
- 📘 [Features Guide](./docs/guides/FEATURES.md) - Tools, prompts, resources
- 📘 [API Reference](./docs/guides/API_REFERENCE.md) - Complete API documentation

---

## Using with Claude CLI

Simply MCP servers integrate seamlessly with Anthropic's Claude CLI using stdio transport. This allows you to use your MCP tools directly in Claude conversations.

### Quick Setup

**1. Bundle Your Server** (recommended for best startup time):

```bash
npx simply-mcp bundle src/my-server.ts -o dist/my-server.js
```

**2. Create MCP Configuration File**:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": [
        "node_modules/simply-mcp/dist/src/cli/index.js",
        "run",
        "dist/my-server.js"
      ],
      "env": {
        "MCP_TIMEOUT": "30000"
      }
    }
  }
}
```

Save this as `mcp-config.json` in your project root.

**3. Run Claude CLI with Your Server**:

```bash
# Set timeout environment variable
export MCP_TIMEOUT=30000

# Use Claude with your MCP server
claude --mcp-config mcp-config.json "Use my-server to help me"
```

### Important Configuration Notes

**Timeout Configuration:** Simply MCP servers take approximately 2 seconds to start up. The default MCP timeout is too short, so you must set `MCP_TIMEOUT=30000` (30 seconds) either:
- As an environment variable: `export MCP_TIMEOUT=30000`
- In the `env` section of your MCP config (as shown above)
- Inline with your command: `MCP_TIMEOUT=30000 claude --mcp-config config.json "prompt"`

**Bundling vs Direct TypeScript:** We strongly recommend bundling your server for production use with Claude CLI:
- ✅ **Bundled** (`dist/my-server.js`): Fast startup, reliable, recommended
- ⚠️ **TypeScript** (`src/my-server.ts`): Currently has loader issues, use bundled instead

### Testing Your Setup

Validate your configuration with a simple test:

```bash
# Test that your server starts correctly
node node_modules/simply-mcp/dist/src/cli/index.js run dist/my-server.js --dry-run

# Test with Claude CLI (non-interactive)
MCP_TIMEOUT=30000 claude --print \
  --model haiku \
  --mcp-config mcp-config.json \
  --strict-mcp-config \
  --dangerously-skip-permissions \
  "List available tools from my-server"
```

### Troubleshooting

**"Connection timeout" or "Failed to connect to server"**
- Increase timeout: `export MCP_TIMEOUT=30000` or add to config `env` section
- Verify server starts manually: `node ... run dist/my-server.js --dry-run`

**"Cannot find module" errors**
- Use bundled servers (`dist/my-server.js`) instead of TypeScript sources
- Ensure bundle exists: `ls dist/my-server.js`

**Tools not appearing**
- Check server validation: `npx simply-mcp run dist/my-server.js --dry-run`
- Verify MCP config syntax is valid JSON
- Try with `--strict-mcp-config` flag to isolate server issues

**HTTP transport "Cannot POST /" or "Not Acceptable" errors**
- stdio transport is recommended for Claude CLI (HTTP has additional configuration requirements)
- If using HTTP: endpoint is `/mcp`, not `/`
- Required header: `Accept: application/json, text/event-stream`

See the [Quick Start Guide](./docs/guides/QUICK_START.md) for more detailed troubleshooting.

---

## Transport & Authentication

Simply MCP supports multiple transports and authentication methods configured via interfaces:

**Transport Options:**
- **Stdio** - Standard input/output (default)
- **HTTP Stateful** - Sessions + Server-Sent Events (SSE)
- **HTTP Stateless** - Serverless-ready (AWS Lambda, Vercel)

**Authentication:**
- **API Key** - Simple key-based auth for internal tools
- **OAuth 2.1** - Authorization Code + PKCE flow with scope-based access control

All configuration is type-safe and declared in your `IServer` interface.

**Learn More:** [Transport Guide](./docs/guides/TRANSPORT.md) | [OAuth 2.1 Guide](./docs/guides/OAUTH2.md) | [API Reference](./docs/guides/API_REFERENCE.md)

---

## UI Adapter Layer - React Hooks

Build UIs with **any React component library** using hooks that eliminate boilerplate:

```typescript
const search = useMCPTool('search_products', {
  onSuccess: (data) => console.log('Found:', data)
});

return <Button onClick={() => search.execute({ query: 'laptop' })}
               disabled={search.loading}>
  {search.loading ? 'Searching...' : 'Search'}
</Button>
```

**Available Hooks:** `useMCPTool`, `usePromptSubmit`, `useIntent`, `useNotify`, `useOpenLink`

Works with: shadcn/ui, Radix UI, Material-UI, Chakra UI, native HTML

**Learn More:** [MCP UI Adapter Hooks Guide](./docs/guides/MCP_UI_ADAPTER_HOOKS.md) | [Examples](./examples/ui-with-hooks/)

---

## Tool Routers

Organize related tools into namespaced groups to reduce context clutter:

```typescript
interface WeatherRouter extends IToolRouter {
  name: 'weather_router';
  description: 'Weather information tools';
  tools: [GetWeatherTool, GetForecastTool];
}
```

When `flattenRouters: false`, only the router appears in the main tools list. Call the router to discover available tools, then access them via namespace: `weather_router__get_weather`

**Learn More:** [Router Tools Guide](./docs/guides/ROUTER_TOOLS.md)

---

## Batch Processing

Process multiple tool calls efficiently with JSON-RPC 2.0 batch support:

```typescript
const server = new BuildMCPServer({
  batching: {
    enabled: true,
    parallel: true,      // 5x faster throughput
    maxBatchSize: 100    // DoS protection
  }
});
```

**Performance:** 940 requests/second (parallel) vs 192 requests/second (sequential). Tools receive batch context for resource pooling optimization.

**Learn More:** [Batch Processing Guide](./docs/guides/FEATURES.md#batch-processing)

---

## Documentation

### 📚 Getting Started
- [Quick Start](./docs/guides/QUICK_START.md) - Get started in 5 minutes
- [Features Guide](./docs/guides/FEATURES.md) - Complete feature reference
- [API Reference](./docs/guides/API_REFERENCE.md) - Full API documentation

### 🔧 Core Features
- [Transport Guide](./docs/guides/TRANSPORT.md) - Stdio, HTTP stateful/stateless
- [Authentication](./docs/guides/OAUTH2.md) - OAuth 2.1 and API keys
- [Validation Guide](./docs/guides/VALIDATION.md) - Parameter validation
- [Router Tools](./docs/guides/ROUTER_TOOLS.md) - Namespaced tool organization

### 🎨 UI Resources
- [MCP UI Protocol](./docs/guides/MCP_UI_PROTOCOL.md) - UI protocol reference
- [MCP UI Adapter Hooks](./docs/guides/MCP_UI_ADAPTER_HOOKS.md) - React hooks API
- [Remote DOM Advanced](./docs/guides/REMOTE_DOM_ADVANCED.md) - Performance tuning
- [Remote DOM Troubleshooting](./docs/guides/REMOTE_DOM_TROUBLESHOOTING.md) - Debug guide

### ⚡ Advanced Topics
- [Protocol Features](./docs/guides/PROTOCOL.md) - Sampling, elicitation, subscriptions
- [Batch Processing](./docs/guides/FEATURES.md#batch-processing) - High-throughput optimization
- [Configuration](./docs/guides/CONFIGURATION.md) - Environment variables
- [Bundling](./docs/guides/BUNDLING.md) - Production deployment

---

## Examples

**Getting Started:**
- **[bundle-test-server.ts](./examples/bundle-test-server.ts)** - Minimal interface-driven server (great starting point)
- **[const-patterns/minimal-server.ts](./examples/const-patterns/minimal-server.ts)** - Complete const-based API patterns
- **[const-patterns/all-primitives.ts](./examples/const-patterns/all-primitives.ts)** - All 10 MCP primitives as const

**Transport Examples:**
- **[interface-websocket.ts](./examples/interface-websocket.ts)** - WebSocket transport with real-time communication
- **OAuth Examples** - See [examples/oauth-*.ts](./examples/) for in-memory, Redis, router, and scope enforcement patterns

**UI Examples:**
- **[v4/01-minimal.ts](./examples/v4/01-minimal.ts)** - Inline HTML UI
- **[v4/03-react-component.ts](./examples/v4/03-react-component.ts)** - React with JSX
- **[v4/06-remote-dom.ts](./examples/v4/06-remote-dom.ts)** - Shopify Remote DOM integration
- **[v4/07-with-tools.ts](./examples/v4/07-with-tools.ts)** - UI + tools combined
- **[ui-with-hooks/](./examples/ui-with-hooks/)** - MCP UI adapter hooks with component libraries

**Code Execution:**
- **[v4/code-execution-server.ts](./examples/v4/code-execution-server.ts)** - Secure code execution with isolated-vm
- **[v4/code-execution-docker-server.ts](./examples/v4/code-execution-docker-server.ts)** - Docker-based isolation

**Production Bundles:**
- **[calculator-bundle/](./examples/calculator-bundle/)** - Complete bundled server with arithmetic operations
- **[weather-bundle/](./examples/weather-bundle/)** - Weather services with forecasts and alerts

**Troubleshooting:**
- **[troubleshooting/pattern-migration.ts](./examples/troubleshooting/pattern-migration.ts)** - Migration guide
- **[troubleshooting/typescript-errors.ts](./examples/troubleshooting/typescript-errors.ts)** - Common errors and solutions

---

## MCP Interpreter - Reference Client

A Next.js application demonstrating MCP client integration with visual interfaces for testing and development.

**Features:**
- Visual interface for all MCP primitives (tools, resources, prompts, roots, sampling, elicitation)
- Connection management for testing MCP servers
- Sandboxed iframe support for UI resources with postMessage communication
- Implementation of MCP UI adapter hooks

**Location:** [inspector/](./inspector/)

**Use Cases:**
- Testing your MCP servers during development
- Learning how to build MCP clients
- Reference implementation for client-side MCP integration

---

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run with coverage
npm run test:unit:coverage
```

**CI/CD Pipeline:**
- ✅ Unit tests + Examples validation: **Required** (blocks PRs on failure)
- ⚠️ Integration tests: Informational (non-blocking)

### Pre-Release Testing

Before releasing a new version, run manual tests with Claude CLI to catch regressions:

```bash
# Build the project
npm run build

# Run manual tests (requires Claude CLI installed)
bash tests/manual/test-bundled-schemas-with-claude-cli.sh
```

These tests verify:
- Bundled servers generate proper parameter schemas
- Parameter validation works with real MCP clients
- Both stdio and HTTP transports function correctly

See [`tests/manual/README.md`](./tests/manual/README.md) for details.

---

## Development

### Getting Started with Development

```bash
# Clone the repo
git clone https://github.com/Clockwork-Innovations/simply-mcp-ts.git
cd simply-mcp-ts

# Install dependencies
npm install

# Build
npm run build

# Run examples
npx simply-mcp run examples/interface-minimal.ts
```

### Development Workflow

```bash
# Watch mode for development
npm run dev

# Test your changes
npm run test:unit
npm run test:examples

# Run full test suite
npm test
```

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./.github/CONTRIBUTING.md) for details.

---

## License

MIT © [Nicholas Marinkovich, MD](https://cwinnov.com)

---

## Links

- [NPM Package](https://www.npmjs.com/package/simply-mcp)
- [GitHub Repository](https://github.com/Clockwork-Innovations/simply-mcp-ts)
- [Issue Tracker](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- [Changelog](./CHANGELOG.md)

## Support

- 📖 [Documentation](./docs/guides/QUICK_START.md)
- 💬 [Discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)
- 🐛 [Issue Tracker](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)

## Acknowledgments

Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) by Anthropic.
