<div align="center">
  <img src="simply-mcp-banner.png" alt="Simply MCP" width="100%">
</div>

# Simply MCP

> Type-safe TypeScript framework for building MCP servers with pure interface-driven API - zero boilerplate, full type safety.

[![npm version](https://badge.fury.io/js/simply-mcp.svg)](https://www.npmjs.com/package/simply-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

## Features

✨ **Pure TypeScript Interfaces**
- Zero boilerplate - just TypeScript interfaces
- Full type safety and IntelliSense
- Compile-time validation
- Clean, intuitive API

📦 **v4.0 Improvements**
- **Slim Package**: 50-60% smaller with optional dependencies
- **File-Based Configuration**: Declare transport and auth in your server interface
- **Built-In Authentication**: API key auth out of the box
- **Dynamic Loading**: Only load what you use
- **MCP Protocol Features**: Full support for server-to-client communication

🚀 **Multiple Transport Support**
- 📡 Stdio (standard input/output)
- 🌐 HTTP with dual modes:
  - **Stateful**: Session-based with SSE streaming (default)
  - **Stateless**: Perfect for serverless/Lambda deployments

⚡ **Developer Experience**
- Type-safe with full TypeScript support
- Built-in validation and error handling
- Comprehensive CLI tools
- Auto-detection and smart defaults

🎯 **Advanced Features**
- Router tools for organizing and scaling servers
- Binary content support (images, PDFs, audio)
- Session management for stateful transports
- Security features (rate limiting, access control, audit logging)

🔌 **MCP Protocol Features** (v4.0)
- **Sampling**: Request LLM completions from clients
- **Elicitation**: Request user input during tool execution
- **Roots**: Discover client root directories
- **Subscriptions**: Notify clients of resource updates
- **Completions**: Provide autocomplete suggestions

🎨 **UI Resources** (v4.0)
- **IUI Interface**: Define user interfaces with zero boilerplate
- **React/JSX Support**: Write UIs in React with full TypeScript support
- **File-Based UIs**: Reference external HTML/CSS/JS files
- **Hot Reload**: Watch mode for instant UI updates
- **Production Optimizations**: Bundling, minification, CDN, theming
- **Performance Monitoring**: Track build times, bundle sizes, compression ratios

## 🎉 v4.0.0: 100% MCP UI Protocol Compliance

Simply-MCP v4.0.0 achieves **100% compliance** with the official MCP UI specification:

✅ **5/5 Action Types**
- `tool` - Call server tools
- `notify` - Show notifications
- `prompt` - Submit to LLM (new)
- `intent` - Trigger intents (new)
- `link` - Navigate URLs (new)

✅ **3/3 MIME Types**
- `text/html` - HTML markup
- `text/uri-list` - External URLs (new)
- `application/vnd.mcp-ui.remote-dom` - Remote DOM (new)

✅ **Official Protocol Format**
- Nested `payload` structure
- `messageId` correlation
- Zero legacy types

⚠️ **Breaking Changes in v4.0.0** - See [MIGRATION-v4.md](docs/MIGRATION-v4.md) for upgrade guide.

## Quick Start

### Installation

```bash
npm install simply-mcp
```

### Optional Dependencies

SimplyMCP v4.0 uses optional dependencies for features you may not need, keeping the package slim:

```bash
# HTTP transport (only if using transport: 'http')
npm install express cors

# Watch mode (only if using --watch flag)
npm install chokidar

# Bundling (only if using bundle command)
npm install esbuild

# UI Resources (only if using IUI interfaces)
npm install @babel/core @babel/preset-react @babel/preset-typescript  # React/JSX compilation
npm install html-minifier-terser cssnano postcss terser              # Minification
```

The CLI will show helpful errors if you try to use a feature without its dependencies.

### Create Your First Server

Simply MCP uses pure TypeScript interfaces - the cleanest way to define MCP servers:

```typescript
// server.ts
import type { ITool, IServer } from 'simply-mcp';

// 1. Configure your server (stdio by default)
interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  // Optional: Use HTTP transport
  // transport: 'http';
  // port: 3000;
}

// 2. Define your tool interface
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: string };
  result: string;
}

// 3. Implement the server
export default class Server implements MyServer {
  name = 'my-server' as const;
  version = '1.0.0' as const;

  greet: GreetTool = async ({ name }) => `Hello, ${name}!`;
}
```

### Run Your Server

```bash
npx simply-mcp run server.ts
```

That's it! Your MCP server is running with full type safety and zero boilerplate.

### Add a User Interface

Adding UIs is just as simple - use the `IUI` interface:

```typescript
import type { IUI, IServer } from 'simply-mcp';

// Define a UI resource
interface DashboardUI extends IUI {
  name: 'dashboard';
  uri: 'ui://dashboard';

  html: '<div id="app"><h1>My Dashboard</h1></div>';
  css: 'body { font-family: system-ui; padding: 20px; }';
  minify: true;  // 37% avg size savings
}

export default class Server implements IServer {
  name = 'my-server' as const;
  version = '1.0.0' as const;

  dashboard: DashboardUI = {
    html: '<div id="app"><h1>My Dashboard</h1></div>',
    css: 'body { font-family: system-ui; padding: 20px; }',
  };
}
```

Run with hot reload:
```bash
npx simply-mcp run server.ts --ui-watch
```

**Learn More:**
- 📘 [UI Watch Mode Guide](./docs/guides/UI_WATCH_MODE.md) - Hot reload and file watching
- 📁 **Examples**: `examples/interface-file-based-ui.ts`, `interface-react-dashboard.ts`, `interface-production-optimized.ts`
- 🎨 **IUI Options**: Inline HTML/CSS/JS, external files, React/JSX, bundling, theming, minification

---

## Feature Implementation Requirements

This table shows which features require implementation and which are auto-handled by the framework:

| Feature | Implementation Required? | Notes |
|---------|-------------------------|-------|
| **Tools** | ✅ Always | Every tool must have an implementation method |
| **Static Prompts** | ❌ No | Framework auto-interpolates template string |
| **Dynamic Prompts** | ✅ Required | Must implement when `dynamic: true` or no template |
| **Static Resources** | ❌ No | Framework serves literal data directly |
| **Dynamic Resources** | ✅ Required | Must implement when `data` uses type annotations |

### Quick Reference

**You MUST implement:**
- ✅ All tools (every tool needs a method)
- ✅ Dynamic prompts (when `dynamic: true` or no `template`)
- ✅ Dynamic resources (when `data` contains types like `number`, `string`, etc.)

**Framework handles automatically:**
- ✅ Static prompts (when `template` field provided)
- ✅ Static resources (when `data` contains literal values like `123`, `'text'`)

### Implementation Checklist

For each feature you define:

1. **Is it a tool?**
   - → ✅ **IMPLEMENT** as method (always required)

2. **Is it a prompt?**
   - Has `template` field? → ❌ **NO IMPLEMENTATION** needed
   - Has `dynamic: true` or no template? → ✅ **IMPLEMENT** as method

3. **Is it a resource?**
   - All `data` values are literals (like `version: '1.0.0'`)? → ❌ **NO IMPLEMENTATION** needed
   - `data` has type annotations (like `count: number`)? → ✅ **IMPLEMENT** as property

### Examples

**Tool (always needs implementation):**
```typescript
interface GreetTool extends ITool {
  name: 'greet';
  params: { name: string };
  result: string;
}

// Must implement
export default class MyServer implements IServer {
  greet: GreetTool = async (params) => `Hello, ${params.name}!`;
}
```

**Static Prompt (no implementation needed):**
```typescript
interface SummarizePrompt extends IPrompt {
  name: 'summarize';
  template: `Summarize this text: {text}`;
  // No implementation needed - framework interpolates {text} automatically
}
```

**Dynamic Resource (needs implementation):**
```typescript
interface StatsResource extends IResource {
  uri: 'stats://requests';
  data: { count: number }; // Type annotation - needs implementation
}

// Must implement
export default class MyServer implements IServer {
  'stats://requests': StatsResource = async () => ({ count: 42 });
}
```

---

### Transport Configuration

**Stdio (Default)**
```typescript
interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  // transport defaults to 'stdio' - no config needed
}
```

**HTTP Server**
```typescript
interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  transport: 'http';
  port: 3000;
}
```

Run: `npx simply-mcp run server.ts` (uses config from file, no flags needed!)

### Authentication

Secure your HTTP servers with API key authentication:

```typescript
import type { IServer, IApiKeyAuth } from 'simply-mcp';

interface MyAuth extends IApiKeyAuth {
  type: 'apiKey';
  keys: [
    { name: 'admin', key: 'sk-xxx', permissions: ['*'] },
    { name: 'readonly', key: 'sk-yyy', permissions: ['read:*'] }
  ];
}

interface MyServer extends IServer {
  name: 'secure-server';
  version: '1.0.0';
  transport: 'http';
  port: 3000;
  auth: MyAuth;
}
```

Clients must include header: `x-api-key: sk-xxx`

---

## HTTP Server with Authentication

Combine HTTP transport and API key authentication for a production-ready secure server.

### Complete Example

**Step 1: Define Authentication**

```typescript
import type { IServer, IApiKeyAuth, ITool } from 'simply-mcp';

interface ServerAuth extends IApiKeyAuth {
  type: 'apiKey';
  keys: [
    { name: 'admin', key: 'sk-admin-key', permissions: ['*'] },
    { name: 'readonly', key: 'sk-read-key', permissions: ['read:*'] }
  ];
}
```

**Step 2: Configure HTTP Server with Auth**

```typescript
interface SecureWeatherServer extends IServer {
  name: 'secure-weather';
  version: '1.0.0';
  transport: 'http';
  port: 3000;
  auth: ServerAuth;  // Add authentication
}
```

**Step 3: Implement Tools (Same as Always)**

```typescript
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get weather (requires API key)';
  params: { location: string };
  result: { temperature: number; conditions: string };
}

export default class SecureWeatherServer implements SecureWeatherServer {
  getWeather: GetWeatherTool = async (params) => {
    return {
      temperature: 22,
      conditions: 'Sunny'
    };
  };
}
```

### Running the Server

```bash
npx simply-mcp run server.ts
# Server starts on http://localhost:3000/mcp
# Clients must provide: x-api-key header
```

### Testing with curl

**Initialize Session (Requires API Key)**

```bash
curl -H "x-api-key: sk-admin-key" \
  -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    },
    "id": 1
  }'
```

Response includes `mcp-session-id` - use it for subsequent requests.

**Call Tool (Requires Session ID)**

```bash
curl -H "x-api-key: sk-admin-key" \
  -H "mcp-session-id: <session-id-from-response>" \
  -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_weather",
      "arguments": {"location": "San Francisco"}
    },
    "id": 2
  }'
```

### Permission Levels

Control access with permission arrays:

```typescript
interface ServerAuth extends IApiKeyAuth {
  type: 'apiKey';
  keys: [
    // Full access to everything
    { name: 'admin', key: 'sk-admin', permissions: ['*'] },

    // Access to tools and resources only
    { name: 'developer', key: 'sk-dev', permissions: ['tool:*', 'resource:*'] },

    // Read-only access
    { name: 'readonly', key: 'sk-read', permissions: ['read:*'] },

    // Specific tool access
    { name: 'weather-only', key: 'sk-weather', permissions: ['tool:get_weather'] }
  ];
}
```

**Permission Syntax:**
- `['*']` - Full access
- `['tool:*']` - All tools
- `['tool:get_weather']` - Specific tool
- `['resource:*']` - All resources
- `['read:*']` - Read operations only

### HTTP + Auth + Stateful

For session-based state management:

```typescript
interface SecureStatefulServer extends IServer {
  name: 'secure-stateful';
  version: '1.0.0';
  transport: 'http';
  port: 3000;
  stateful: true;  // Enable sessions
  auth: ServerAuth;
}
```

### Security Best Practices

1. **Use strong API keys**: At least 32 characters, cryptographically random
2. **HTTPS in production**: Use reverse proxy (nginx, Cloudflare) for TLS
3. **Rotate keys regularly**: Update API keys periodically
4. **Least privilege**: Give clients minimal required permissions
5. **Monitor access**: Log authentication attempts and tool calls

### Example: Read-Only API Key

Client with read-only key can't call tools:

```typescript
// This will fail with sk-read-key:
curl -H "x-api-key: sk-read-key" ... # Call tool → 403 Forbidden

// This works with sk-read-key:
curl -H "x-api-key: sk-read-key" ... # Read resource → 200 OK
```

---

> **📚 [Interface API Reference](https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/INTERFACE_API_REFERENCE.md)** - Complete documentation with advanced features

## Why Interface API?

**Zero Boilerplate:**
- No manual schema definitions
- No decorator setup
- Just TypeScript types!

**Full Type Safety:**
- Compile-time type checking
- Complete IntelliSense support
- Auto-generated schemas from TypeScript types

**Clean Code:**
- Pure interface definitions
- No runtime overhead
- Easy to read and maintain

## Advanced Features

### Tools, Prompts, and Resources

The Interface API supports all MCP primitives:

**Tools** - Functions AI agents can call:
```typescript
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather';
  params: { location: string };
  result: { temperature: number; conditions: string };
}
```

**Prompts** - Reusable templates:
```typescript
// Static prompt (template-based)
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Generate weather report';
  args: { location: string };
  template: `Generate a weather report for {location}.`;
}

// Dynamic prompt (implemented as method)
interface DynamicPrompt extends IPrompt {
  name: 'context_aware';
  description: 'Context-aware prompt';
  args: { location: string };
  dynamic: true;
}
```

**Resources** - Static or dynamic data:
```typescript
// Static resource
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  mimeType: 'application/json';
  data: { version: '1.0.0' };
}

// Dynamic resource (implemented as method)
interface StatsResource extends IResource {
  uri: 'stats://requests';
  name: 'Request Statistics';
  mimeType: 'application/json';
  data: { count: number };
}
```

### Router Tools

Organize related tools into routers for better discoverability:

```typescript
interface WeatherRouterTool extends IRouterTool {
  name: 'weather_router';
  description: 'Weather information toolkit';
  tools: ['get_weather', 'get_forecast', 'get_alerts'];
}
```

See [Router Tools Guide](./docs/guides/ROUTER_TOOLS.md) for complete documentation.

## CLI Usage

### Basic Usage

```bash
# Run your server
npx simply-mcp run server.ts

# HTTP transport
npx simply-mcp run server.ts --http --port 3000

# Watch mode (auto-restart on file changes)
npx simply-mcp run server.ts --watch

# Debug mode
npx simply-mcp run server.ts --inspect
```

### Advanced Options

```bash
# Validate without running
npx simply-mcp run server.ts --dry-run

# Verbose output
npx simply-mcp run server.ts --verbose

# Use configuration file
npx simply-mcp run server.ts --config simplymcp.config.json
```

See [CLI Reference](./docs/guides/CLI_REFERENCE.md) for complete documentation.

## Transport Configuration

### Stdio (Default)

No configuration needed - stdio is the default transport for desktop app integration:

```typescript
interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  // transport defaults to 'stdio' - no explicit config needed
}
```

Use stdio when:
- ✅ Integrating with Claude Desktop or similar apps
- ✅ Local development and testing
- ✅ Process-based communication

### HTTP - Simple Configuration

For basic HTTP server on custom port:

```typescript
interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  transport: 'http';
  port: 3000;
  // stateful defaults to true
}
```

Use simple HTTP when:
- ✅ Web-based MCP clients
- ✅ Standard server deployment
- ✅ Default session management

### HTTP - Advanced Configuration

For fine-grained control over HTTP behavior:

```typescript
interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  transport: {
    type: 'http';
    port: 3000;
    stateful: true;    // Session-based (default)
    // OR
    // stateful: false; // Stateless for serverless/Lambda
  };
}
```

Use advanced HTTP when:
- ✅ Need explicit stateful/stateless control
- ✅ Serverless deployment (AWS Lambda, Google Cloud Functions)
- ✅ Multiple transport configurations in same codebase

### Stateful vs Stateless

**Stateful (Default):**
- Session tracking with `mcp-session-id`
- SSE streaming support
- Per-session state management
- Best for: Web applications, persistent connections

**Stateless:**
- No session storage
- Each request independent
- No SSE streaming
- Best for: Serverless functions, API gateways, high scalability

**Example - Serverless (Stateless):**

```typescript
interface ServerlessWeather extends IServer {
  name: 'serverless-weather';
  version: '1.0.0';
  transport: {
    type: 'http';
    port: 3000;
    stateful: false;  // Stateless for Lambda
  };
}
```

### Configuration Comparison

| Config Type | When to Use | Example |
|-------------|-------------|---------|
| **No transport** | Desktop apps, CLI | `// No transport field` |
| **Simple HTTP** | Web servers, default settings | `transport: 'http'; port: 3000;` |
| **Advanced HTTP** | Serverless, custom config | `transport: { type: 'http'; stateful: false }` |

## Documentation

### Getting Started
- [Interface API Reference](https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/INTERFACE_API_REFERENCE.md) - Complete Interface API documentation
- [Quick Start](./docs/guides/QUICK_START.md) - Get started in 5 minutes
- [CLI Reference](./docs/guides/CLI_REFERENCE.md) - All CLI commands and options

### Advanced Topics
- [UI Watch Mode Guide](./docs/guides/UI_WATCH_MODE.md) - UI hot reload and file watching
- [Router Tools Guide](./docs/guides/ROUTER_TOOLS.md) - Organize tools with routers
- [Transport Guide](./docs/guides/TRANSPORT_GUIDE.md) - Stdio and HTTP transport options
- [Context System](./src/docs/guides/CONTEXT-SYSTEM.md) - Server metadata and session management
- [Lifecycle Management](./src/docs/guides/LIFECYCLE-MANAGEMENT.md) - Initialization and cleanup hooks
- [Security Features](./docs/guides/SECURITY.md) - Rate limiting, access control, audit logging

### Deployment & Production
- [Bundling Guide](./docs/guides/BUNDLING.md) - Production bundling
- [Deployment Guide](./docs/guides/DEPLOYMENT_GUIDE.md) - Deploy to various platforms
- [Performance Guide](./docs/guides/PERFORMANCE_GUIDE.md) - Optimization techniques
- [Error Handling](./docs/guides/ERROR_HANDLING.md) - Comprehensive error handling
- [Testing Guide](./docs/guides/TESTING.md) - Testing MCP servers

### Additional Resources
- [Configuration Guide](./docs/guides/CONFIGURATION.md) - Environment and runtime options
- [Watch Mode Guide](./docs/guides/WATCH_MODE_GUIDE.md) - Auto-reload during development
- [Documentation Index](./docs/README.md) - Complete documentation map

## Examples

Working examples using the Interface API:

**Basic Examples:**
- **[interface-minimal.ts](./examples/interface-minimal.ts)** - Minimal server with basic tools
- **[interface-advanced.ts](./examples/interface-advanced.ts)** - Advanced features (prompts, resources, validation)
- **[interface-comprehensive.ts](./examples/interface-comprehensive.ts)** - Complete example with all features
- **[interface-file-prompts.ts](./examples/interface-file-prompts.ts)** - File-based prompt templates

**UI Examples:**
- **[interface-file-based-ui.ts](./examples/interface-file-based-ui.ts)** - External HTML/CSS/JS files with tools
- **[interface-react-dashboard.ts](./examples/interface-react-dashboard.ts)** - Full React dashboard with recharts/date-fns
- **[interface-sampling-ui.ts](./examples/interface-sampling-ui.ts)** - Chat UI with MCP sampling integration
- **[interface-production-optimized.ts](./examples/interface-production-optimized.ts)** - Production-ready with bundling, minification, CDN

**All examples are validated automatically:**
- See [Examples Index](./examples/EXAMPLES_INDEX.md) for complete list
- Run validation: `npm run test:examples`
- View report: `examples-validation-report.md`

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run example validation
npm run test:examples

# Run with coverage
npm run test:unit:coverage
```

**CI/CD Pipeline:**
- ✅ Unit tests + Examples validation: **Required** (blocks PRs on failure)
- ⚠️ Integration tests: Informational (non-blocking)

See [Testing Guide](./docs/guides/TESTING.md) for comprehensive testing documentation.

## Development

### Getting Started with Development

**Clone the repository** to start developing or running examples:

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
npx simply-mcp run examples/interface-http-auth.ts --port 8080
```

### Development Workflow

```bash
# Watch mode for development
npm run dev

# Test your changes
npm run test:unit          # Run unit tests
npm run test:examples      # Validate all examples
npm run test:unit:watch    # Watch mode for tests

# Run full test suite
npm test
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./.github/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Development Setup

1. Fork the repository on GitHub
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/simply-mcp-ts.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/amazing-feature`
5. Make your changes and add tests
6. Run the full test suite: `npm test`
7. Commit your changes: `git commit -m 'Add amazing feature'`
8. Push to your fork: `git push origin feature/amazing-feature`
9. Open a Pull Request

## License

MIT © [Nicholas Marinkovich, MD](https://cwinnov.com)

## Links

- [NPM Package](https://www.npmjs.com/package/simply-mcp)
- [GitHub Repository](https://github.com/Clockwork-Innovations/simply-mcp-ts)
- [Issue Tracker](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- [Changelog](./CHANGELOG.md)

## Support

- 📖 [Documentation](./src/docs/INDEX.md)
- 💬 [Discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)
- 🐛 [Issue Tracker](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)

## Acknowledgments

Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) by Anthropic.

---

**Made with ❤️ by the Simply MCP Team**
