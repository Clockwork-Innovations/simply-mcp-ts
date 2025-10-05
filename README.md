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

### Basic Example

```typescript
import { SimplyMCP } from 'simply-mcp';

const server = new SimplyMCP({
  name: 'my-server',
  version: '1.0.0'
});

// Add a tool
server.addTool({
  name: 'greet',
  description: 'Greet a user',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'User name' }
    },
    required: ['name']
  },
  handler: async ({ name }) => ({
    content: [{ type: 'text', text: `Hello, ${name}!` }]
  })
});

// Start stdio server
await server.start('stdio');
```

### Decorator API Example

```typescript
import { MCPServer, tool } from 'simply-mcp/decorators';

// Zero config! Automatically uses class name and package.json version
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

**Smart Defaults:**
- `name`: Auto-generated from class name (Calculator -> calculator)
- `version`: Auto-detected from package.json or defaults to '1.0.0'
- `transport`: Optional configuration under nested `transport` object
- `capabilities`: Optional configuration for advanced features

## CLI Usage

Simply MCP provides powerful CLI tools for running servers:

```bash
# Auto-detect and run a server
npx simplymcp run server.ts

# Run with decorator API
npx simplymcp-class MyServer.ts

# Run with HTTP transport
npx simplymcp run server.ts --http --port 3000

# Show verbose output
npx simplymcp run server.ts --verbose
```

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

const server = new SimplyMCP(config);
await server.start('stdio');
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

// Or override at start time
await server.start({
  transport: 'http',
  port: 3001,
  stateful: true
});
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
server.addResource({
  uri: 'file://data/config',
  name: 'config',
  description: 'Server configuration',
  handler: async () => ({
    uri: 'file://data/config',
    mimeType: 'application/json',
    text: JSON.stringify(config, null, 2)
  })
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
npx tsx examples/simple-server.ts
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
