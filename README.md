# Simply MCP

> A powerful, type-safe TypeScript framework for building Model Context Protocol (MCP) servers with support for multiple transports and decorator-based APIs.

[![npm version](https://badge.fury.io/js/simply-mcp.svg)](https://www.npmjs.com/package/simply-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

## Features

✨ **Multiple Transport Support**
- 📡 Stdio (standard input/output)
- 🌐 HTTP with dual modes:
  - **Stateful**: Session-based with SSE streaming (default)
  - **Stateless**: Perfect for serverless/Lambda deployments
- 🔄 SSE (Server-Sent Events)

🎨 **Decorator API**
- `@tool` - Define MCP tools with automatic schema generation
- `@prompt` - Create prompt templates
- `@resource` - Expose resources with dynamic content

⚡ **Developer Experience**
- Type-safe with full TypeScript support
- Auto-detection of API styles
- Built-in validation and error handling
- Comprehensive CLI tools

🚀 **Advanced Features**
- Handler system (file, inline, HTTP, registry)
- Binary content support (images, PDFs, audio)
- Session management for stateful transports
- Security features (rate limiting, access control, audit logging)

## Quick Start

### Installation

```bash
npm install simply-mcp
```

### Create Your First Server

**That's it - just one file, zero configuration!**

```typescript
// server.ts
import { MCPServer, tool } from 'simply-mcp/decorators';

@MCPServer()
class Calculator {
  /**
   * Add two numbers
   * @param a - First number
   * @param b - Second number
   */
  @tool()
  async add(a: number, b: number) {
    return { result: a + b };
  }

  /**
   * Multiply two numbers
   * @param a - First number
   * @param b - Second number
   */
  @tool()
  async multiply(a: number, b: number) {
    return { result: a * b };
  }
}
```

**Run it:**

```bash
npx simply-mcp run server.ts
```

**That's all you need!** No `package.json`, no `tsconfig.json`, no configuration files.

**Smart Defaults:**
- `name`: Auto-generated from class name (Calculator -> calculator)
- `version`: Auto-detected from package.json or defaults to '1.0.0'
- `transport`: stdio (override with `--http` flag)
- `capabilities`: Automatically configured based on your tools

### Programmatic API (Alternative)

You can also use the programmatic API:

```typescript
import { SimplyMCP } from 'simply-mcp';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'my-server',
  version: '1.0.0'
});

// Add a tool
server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string().describe('User name')
  }),
  execute: async ({ name }) => ({
    content: [{ type: 'text', text: `Hello, ${name}!` }]
  })
});

// Start stdio server (default transport)
await server.start();
```

**Run it:**

```bash
npx simply-mcp run server.ts
```

**Same command works for all API styles!**

## CLI Usage

Simply MCP's CLI automatically detects your API style and runs your server with zero configuration.

### Basic Usage

```bash
# Run any server (auto-detects decorator/programmatic/functional API)
npx simply-mcp run server.ts
```

### With Options

```bash
# HTTP transport
npx simply-mcp run server.ts --http --port 3000

# Watch mode (auto-restart on file changes)
npx simply-mcp run server.ts --watch

# Debug mode (attach Chrome DevTools)
npx simply-mcp run server.ts --inspect

# Verbose output
npx simply-mcp run server.ts --verbose

# Multiple servers
npx simply-mcp run server1.ts server2.ts server3.ts
```

### Advanced Options

```bash
# Validate without running
npx simply-mcp run server.ts --dry-run

# Force specific API style
npx simply-mcp run server.ts --style decorator

# Use configuration file
npx simply-mcp run server.ts --config simplymcp.config.json
```

### Alternative Commands (Advanced)

For users who need explicit control over the API style:

```bash
# Explicitly use decorator API
npx simplymcp-class MyServer.ts

# Explicitly use functional API
npx simplymcp-func server.ts
```

**Note:** We recommend using `simply-mcp run` for all use cases as it auto-detects the API style and provides more features.

## TypeScript Configuration (Optional)

### How SimpleMCP Handles TypeScript

SimpleMCP uses [tsx](https://github.com/esbuild-kit/tsx) to run TypeScript directly with **zero configuration required**. This means:

- No compilation step needed
- Decorators work automatically
- Your `tsconfig.json` is **NOT used** at runtime
- Modern ES features supported out of the box

**Bottom line:** You can write and run TypeScript servers without any configuration files!

### Running Your Server

No configuration needed:

```bash
npx simply-mcp run server.ts
```

tsx handles all TypeScript transpilation using sensible defaults, regardless of whether you have a `tsconfig.json` or what settings it contains.

### Type Checking (Optional)

If you want IDE IntelliSense and type checking with `tsc`, you can optionally create a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true
  }
}
```

This is completely optional and only affects:
- IDE IntelliSense and autocomplete
- `tsc --noEmit` type checking
- Build-time type errors

**It does NOT affect how SimpleMCP runs your server.**

### Module Type (Not Required)

You do NOT need to set `"type": "module"` in your `package.json`. SimpleMCP handles module resolution automatically.

```json
// package.json - module type is optional
{
  "name": "my-server",
  "scripts": {
    "dev": "simply-mcp run server.ts"
  }
}
```

### Summary

**To run your server:** Just write TypeScript and run it - zero config needed!

**For type checking:** Optionally create `tsconfig.json` for IDE support.

## Documentation

### Core Guides
- [Quick Start](./src/docs/QUICK-START.md) - Get started in 5 minutes
- [Decorator API](./docs/development/DECORATOR-API.md) - Using decorators
- [HTTP Transport](./src/docs/HTTP-TRANSPORT.md) - HTTP server setup
- [Handler Development](./src/docs/guides/HANDLER-DEVELOPMENT.md) - Creating handlers

### Advanced Topics
- [Binary Content](./src/docs/features/binary-content.md) - Working with images/files
- [Input Validation](./src/docs/guides/INPUT-VALIDATION.md) - Validating tool inputs
- [Security](./src/security/index.ts) - Rate limiting, access control, auditing
- [Bundling & Deployment](./src/docs/features/bundling.md) - Production deployment

### API Reference
- [API Documentation](./src/docs/INDEX.md) - Complete API reference
- [Transports](./src/docs/reference/TRANSPORTS.md) - Transport comparison
- [Troubleshooting](./src/docs/TROUBLESHOOTING.md) - Common issues

## Architecture

```
simply-mcp/
├── src/
│   ├── SimplyMCP.ts          # Core server implementation
│   ├── decorators.ts          # Decorator API
│   ├── cli/                   # CLI tools
│   ├── core/                  # Core utilities
│   ├── handlers/              # Handler resolvers
│   ├── servers/               # Transport implementations
│   ├── security/              # Security features
│   └── validation/            # Input validation
├── examples/                  # Example servers
├── tests/                     # Test suite
└── docs/                      # Documentation
```

## Transport Comparison

| Feature | Stdio | HTTP Stateful | HTTP Stateless | SSE |
|---------|-------|---------------|----------------|-----|
| Session | Per-process | Header-based | None | Query-based |
| Use Case | CLI tools | Web apps, workflows | Serverless, APIs | Streaming (legacy) |
| Streaming | No | Yes (SSE) | No | Yes |
| State | In-process | Across requests | None | Across requests |
| Complexity | Low | Medium | Low | Medium |

## Examples

### Configuration-Based Server

```typescript
import { SimplyMCP } from 'simply-mcp';
import config from './config.json';

(async () => {
  const server = new SimplyMCP(config);
  await server.start();
})().catch(console.error);
```

### HTTP Server with Sessions

```typescript
const server = new SimplyMCP({
  name: 'api-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,
    stateful: true  // Default
  }
});

// Add tools...

// Start the server (uses configuration from constructor)
await server.start();

// Or override port at start time
// await server.start({ port: 3001 });
```

### Stateless HTTP for Serverless

```typescript
const server = new SimplyMCP({
  name: 'lambda-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,
    stateful: false  // Stateless for serverless
  }
});

// Add tools...

// Start stateless HTTP server (perfect for AWS Lambda, Cloud Functions)
await server.start();
```

**When to use each mode:**

**Stateful Mode** (default):
- Web applications with user sessions
- Multi-step workflows requiring context
- Real-time updates via SSE
- Long-running conversations

**Stateless Mode**:
- AWS Lambda / Cloud Functions
- Serverless deployments
- Stateless microservices
- Simple REST-like APIs
- Load-balanced services without sticky sessions

### Resource Handler

```typescript
const config = { key: 'value' };

server.addResource({
  uri: 'file://data/config',
  name: 'config',
  description: 'Server configuration',
  mimeType: 'application/json',
  content: JSON.stringify(config, null, 2)
});
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
bash tests/test-stdio.sh
bash tests/test-decorators.sh

# Run with coverage
npm run test:coverage
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run examples
npx simply-mcp run examples/simple-server.ts
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./.github/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/simply-mcp-ts.git`
3. Create a branch: `git checkout -b feature/amazing-feature`
4. Make your changes
5. Run tests: `npm test`
6. Commit: `git commit -m 'Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open a Pull Request

## License

MIT © [Nicholas Marinkovich, MD](https://cwinnov.com)

## Links

- [NPM Package](https://www.npmjs.com/package/simply-mcp)
- [GitHub Repository](https://github.com/Clockwork-Innovations/simply-mcp-ts)
- [Issue Tracker](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- [Changelog](./docs/releases/CHANGELOG.md)

## Support

- 📖 [Documentation](./src/docs/INDEX.md)
- 💬 [Discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)
- 🐛 [Issue Tracker](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)

## Acknowledgments

Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) by Anthropic.

---

**Made with ❤️ by the Simply MCP Team**
