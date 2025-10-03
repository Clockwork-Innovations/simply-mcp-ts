# SimpleMCP

A modern, type-safe Model Context Protocol (MCP) server framework for TypeScript with multiple API styles and full-featured tooling support.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![CI](https://github.com/clockwork-innovations/simply-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/clockwork-innovations/simply-mcp/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/simply-mcp.svg)](https://www.npmjs.com/package/simply-mcp)

## 🚀 Features

- **Multiple API Styles** - Choose what fits your workflow:
  - 🎨 **Decorator API** - Python FastMCP-inspired class decorators
  - ⚡ **Functional API** - Clean, declarative single-file definitions
  - 🔧 **Programmatic API** - Full control for dynamic server generation

- **Multiple Transports** - stdio, HTTP, and SSE support
- **Full Type Safety** - TypeScript-first with Zod schema validation
- **Session Management** - Both stateful and stateless modes
- **Enhanced Features**:
  - LLM sampling/completions
  - Progress notifications
  - Resource management
  - Binary content support (images, audio, PDFs)

- **Developer Experience**:
  - Automatic type inference from JSDoc comments
  - Built-in dependency management
  - Comprehensive error handling
  - Production-ready logging

## 📦 Installation

### As a Dependency

```bash
npm install simply-mcp
```

### For Development

```bash
git clone <repository-url>
cd simply-mcp
npm install --legacy-peer-deps
npm run build
```

## 🎯 Quick Start

### Decorator API (Recommended)

Write classes, get MCP servers automatically:

```typescript
import { MCPServer } from 'simply-mcp';

@MCPServer({ name: 'calculator', version: '1.0.0' })
class Calculator {
  /**
   * Add two numbers together
   * @param a First number
   * @param b Second number
   * @returns Sum of a and b
   */
  add(a: number, b: number): number {
    return a + b;
  }

  /**
   * Calculate fibonacci number
   * @param n Position in sequence
   */
  fibonacci(n: number): number {
    if (n <= 1) return n;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }
}
```

Run it:
```bash
npx tsx my-server.ts
```

### Functional API

Clean, declarative configuration:

```typescript
import { defineMCP } from 'simply-mcp';
import { z } from 'zod';

export default defineMCP({
  name: 'weather-service',
  version: '1.0.0',
  tools: [
    {
      name: 'get_weather',
      description: 'Get current weather for a city',
      parameters: z.object({
        city: z.string().describe('City name'),
        units: z.enum(['celsius', 'fahrenheit']).optional()
      }),
      execute: async (args) => {
        // Your implementation
        return `Weather in ${args.city}: 72°F, Sunny`;
      }
    }
  ],
  prompts: [
    {
      name: 'weather_report',
      description: 'Generate a weather report',
      arguments: [
        { name: 'city', description: 'City name', required: true }
      ],
      template: 'Generate a detailed weather report for {{city}}'
    }
  ]
});
```

### Programmatic API

For dynamic server generation:

```typescript
import { SimpleMCP } from 'simply-mcp';
import { z } from 'zod';

const server = new SimpleMCP({
  name: 'dynamic-tools',
  version: '1.0.0'
});

// Add tools dynamically
server.addTool({
  name: 'echo',
  description: 'Echo back the input',
  parameters: z.object({
    message: z.string()
  }),
  execute: async (args) => args.message
});

// Add prompts
server.addPrompt({
  name: 'greet',
  description: 'Greeting template',
  arguments: [
    { name: 'name', description: 'Name to greet', required: true }
  ],
  template: (args) => `Hello, ${args.name}!`
});

// Start with stdio (default)
await server.start();

// Or start with HTTP
await server.start({
  transport: 'http',
  port: 3000
});
```

## 🏗️ Project Structure

```
simply-mcp/
├── mcp/
│   ├── index.ts              # Main module entry point
│   ├── SimpleMCP.ts          # Programmatic API
│   ├── decorators.ts         # Decorator API
│   ├── single-file-types.ts  # Functional API
│   ├── core/                 # Core framework
│   │   ├── types.ts
│   │   ├── errors.ts
│   │   ├── HandlerManager.ts
│   │   └── ...
│   ├── examples/             # Usage examples
│   ├── docs/                 # Documentation
│   └── tests/                # Test suite
├── dist/                     # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## 📚 Documentation

- **[Quick Start Guide](./mcp/docs/QUICK-START.md)** - Get started in 5 minutes
- **[Documentation Index](./mcp/docs/INDEX.md)** - Complete documentation guide
- **[Architecture Overview](./mcp/docs/architecture/TECHNICAL.md)** - System design and internals
- **[API Reference](./mcp/docs/guides/HANDLER-DEVELOPMENT.md)** - Handler development guide
- **[Deployment Guide](./mcp/docs/guides/DEPLOYMENT.md)** - Production deployment
- **[Module Usage](./MODULE_USAGE.md)** - Using SimpleMCP as a module

## 🎨 API Comparison

| Feature | Decorator | Functional | Programmatic |
|---------|-----------|------------|--------------|
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Type Safety** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Flexibility** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Auto-inference** | ✅ JSDoc | ❌ | ❌ |
| **Single File** | ✅ | ✅ | ❌ |
| **Dynamic Tools** | ❌ | ❌ | ✅ |

## 🔧 Advanced Features

### Binary Content Support

```typescript
server.addTool({
  name: 'generate_chart',
  description: 'Generate a chart image',
  parameters: z.object({
    data: z.array(z.number())
  }),
  execute: async (args) => {
    const imageBuffer = generateChart(args.data);
    return {
      content: [{
        type: 'image',
        data: imageBuffer.toString('base64'),
        mimeType: 'image/png'
      }]
    };
  }
});
```

### LLM Sampling

```typescript
server.addTool({
  name: 'analyze_sentiment',
  description: 'Analyze sentiment using LLM',
  parameters: z.object({
    text: z.string()
  }),
  execute: async (args, context) => {
    const result = await context.sample([
      {
        role: 'user',
        content: { type: 'text', text: `Analyze sentiment: ${args.text}` }
      }
    ]);
    return result.content.text;
  }
});
```

### Progress Reporting

```typescript
server.addTool({
  name: 'process_large_file',
  description: 'Process a large file with progress updates',
  parameters: z.object({
    filepath: z.string()
  }),
  execute: async (args, context) => {
    const chunks = getFileChunks(args.filepath);

    for (let i = 0; i < chunks.length; i++) {
      await processChunk(chunks[i]);
      await context.reportProgress?.(i + 1, chunks.length,
        `Processing chunk ${i + 1}/${chunks.length}`);
    }

    return 'Processing complete!';
  }
});
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific transport tests
npm run test:stdio
npm run test:http

# Run examples
npm run dev              # stdio transport
npm run dev:http         # HTTP transport
npm run dev:class        # Decorator API example
```

## 🏗️ Building

```bash
# Clean build
npm run clean

# Build TypeScript
npm run build

# Prepare for publishing
npm run prepublishOnly
```

## 📋 Requirements

- Node.js 20+
- TypeScript 5.0+
- Dependencies:
  - `@modelcontextprotocol/sdk` ^1.18.2
  - `express` ^5.1.0
  - `zod` ^4.1.11
  - `reflect-metadata` ^0.2.2

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [FastMCP](https://github.com/jlowin/fastmcp) (Python)
- Built on the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- TypeScript ecosystem and community

## 🔗 Links

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Issue Tracker](https://github.com/clockwork-innovations/simply-mcp/issues)
- [Clockwork Innovations](https://cwinnov.com)

## 🔄 Contributing & Releases

### Making a Release

```bash
# Patch release (1.0.0 -> 1.0.1)
npm run release:patch

# Minor release (1.0.0 -> 1.1.0)
npm run release:minor

# Major release (1.0.0 -> 2.0.0)
npm run release:major
```

See [Release Documentation](./.github/RELEASE.md) for complete CI/CD and publishing guide.

## 📧 Support

- 📖 [Documentation](./mcp/docs/INDEX.md)
- 🐛 [Report Bug](https://github.com/clockwork-innovations/simply-mcp/issues)
- 💡 [Request Feature](https://github.com/clockwork-innovations/simply-mcp/issues)

## 🌟 Star History

If you find this project useful, please consider giving it a star ⭐

---

## 👥 About

**SimpleMCP** is created and maintained by [Clockwork Innovations, LLC](https://cwinnov.com)

**Founder & Author**: Nicholas Marinkovich, MD

Clockwork Innovations foresees a future where the convergence of technologies revolutionizes healthcare. *Design Today, Define Tomorrow.*

---

**Made with ❤️ by the SimpleMCP team**
