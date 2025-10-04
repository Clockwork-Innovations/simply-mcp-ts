# SimplyMCP

A modern, type-safe Model Context Protocol (MCP) server framework for TypeScript with multiple API styles and full-featured tooling support.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![CI](https://github.com/clockwork-innovations/simply-mcp-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/clockwork-innovations/simply-mcp-ts/actions/workflows/ci.yml)
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
  - Simple CLI with auto-detection (`simplymcp run`)
  - Watch mode with auto-restart (`--watch`)
  - Debug support with Chrome DevTools (`--inspect`)
  - Dry-run validation (`--dry-run`)
  - Configuration file support (`simplymcp.config.ts`)
  - Multi-server orchestration (`list`, `stop` commands)
  - Production bundling (`simplemcp bundle`)
  - Automatic type inference from JSDoc comments
  - Built-in dependency management
  - Comprehensive error handling
  - Production-ready logging
  - Performance optimizations with caching

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
# Auto-detect and run
simplymcp run my-server.ts

# Development with auto-restart
simplymcp run my-server.ts --watch

# Debug with Chrome DevTools
simplymcp run my-server.ts --inspect

# Validate configuration
simplymcp run my-server.ts --dry-run

# Or explicit decorator command
simplymcp-class my-server.ts

# Or run directly (programmatic API)
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

Run it:
```bash
# Auto-detect and run
simplymcp run my-server.ts

# Development with watch mode
simplymcp run my-server.ts --watch

# Or explicit functional command
simplymcp-func my-server.ts
```

### Programmatic API

For dynamic server generation:

```typescript
import { SimplyMCP } from 'simply-mcp';
import { z } from 'zod';

const server = new SimplyMCP({
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
│   ├── SimplyMCP.ts          # Programmatic API
│   ├── decorators.ts         # Decorator API
│   ├── single-file-types.ts  # Functional API
│   ├── cli/                  # CLI commands
│   │   ├── index.ts          # Main CLI entry
│   │   ├── run.ts            # Auto-detect & run
│   │   └── ...
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
- **[Module Usage](./MODULE_USAGE.md)** - Using SimplyMCP as a module

## 🚀 Developer Features

### Watch Mode

Automatically restart your server when files change:

```bash
# Basic watch mode
simplymcp run server.ts --watch

# Watch mode with HTTP transport
simplymcp run server.ts --watch --http --port 3000

# Use polling for network drives
simplymcp run server.ts --watch --watch-poll --watch-interval 200
```

Watch mode monitors your server file and its dependencies, automatically restarting when changes are detected. Perfect for rapid development iterations.

### Debug Support

Debug with Chrome DevTools or VS Code:

```bash
# Start with inspector
simplymcp run server.ts --inspect

# Break before code starts
simplymcp run server.ts --inspect-brk

# Custom inspector port
simplymcp run server.ts --inspect --inspect-port 9230
```

**Chrome DevTools:**
1. Run with `--inspect`
2. Open `chrome://inspect` in Chrome
3. Click "Configure" and add `localhost:9229`
4. Click "inspect" to open DevTools

**VS Code:**
1. Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to SimpleMCP",
  "port": 9229
}
```
2. Run server with `--inspect`
3. Press F5 to attach debugger

See [Debugging Guide](mcp/docs/DEBUGGING.md) for details.

### Dry-Run Validation

Validate your configuration without starting the server:

```bash
# Validate configuration
simplymcp run server.ts --dry-run

# JSON output for CI/CD
simplymcp run server.ts --dry-run --json
```

Perfect for:
- CI/CD pipelines
- Pre-deployment validation
- Configuration testing
- Quick syntax checks

### Configuration Files

Define defaults in `simplymcp.config.ts`:

```typescript
export default {
  servers: {
    weather: {
      entry: 'services/weather.ts',
      port: 3000
    },
    calculator: {
      entry: 'services/calc.ts',
      port: 3001
    },
  },
  defaults: {
    watch: true,
    verbose: true,
    http: true
  }
};
```

Then run by name:
```bash
# Run configured server
simplymcp run weather

# Override config settings
simplymcp run weather --port 4000
```

Supports `.ts`, `.js`, `.mjs`, and `.json` formats.

### Multi-Server Support

Run and manage multiple servers simultaneously:

```bash
# Run multiple servers
simplymcp run server1.ts server2.ts server3.ts --http --port 3000
# Servers run on ports 3000, 3001, 3002

# List running servers
simplymcp list
simplymcp list --verbose
simplymcp list --json

# Stop servers
simplymcp stop all
simplymcp stop <pid>
simplymcp stop <name>
simplymcp stop --force
```

Features:
- Auto port assignment
- Color-coded aggregated logging
- Process tracking and management
- Graceful shutdown handling

See [Multi-Server Quick Start](MULTI_SERVER_QUICKSTART.md) for details.

### Performance Optimizations

Built-in optimizations for faster startup:

- **Detection caching**: 11.9x faster API style detection
- **Lazy loading**: Adapter modules loaded only when needed
- **Performance metrics**: Track startup time and bottlenecks

```bash
# View performance metrics
simplymcp run server.ts --verbose
```

## 🤖 Using with Claude Code/Desktop

SimplyMCP servers work with Claude Code CLI and Claude Desktop. Create `.mcp.json` in your project root:

**Auto-detect (Recommended):**
```json
{
  "mcpServers": {
    "my-server": {
      "command": "simplymcp",
      "args": ["run", "path/to/server.ts"]
    }
  }
}
```

**Explicit Commands:**
```json
{
  "mcpServers": {
    "decorator-server": {
      "command": "simplymcp-class",
      "args": ["path/to/server.ts"]
    },
    "functional-server": {
      "command": "simplymcp-func",
      "args": ["path/to/server.ts"]
    }
  }
}
```

**Programmatic API:**
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["tsx", "path/to/server.ts"]
    }
  }
}
```

**Environment Variables:**
```json
{
  "mcpServers": {
    "my-server": {
      "command": "simplymcp",
      "args": ["run", "server.ts"],
      "env": {
        "API_KEY": "${API_KEY}",
        "DATABASE_URL": "${DATABASE_URL:-sqlite://./dev.db}"
      }
    }
  }
}
```

**Verify:** `claude mcp list`

### CLI Commands

The `simplymcp` CLI automatically detects your API style and runs your server:

```bash
# Auto-detect API style (recommended)
simplymcp run server.ts

# Multiple servers
simplymcp run server1.ts server2.ts server3.ts

# With flags
simplymcp run server.ts --http --port 3000 --watch
simplymcp run server.ts --style decorator --verbose --inspect

# Explicit commands (skip auto-detection)
simplymcp-class server.ts    # For @MCPServer classes
simplymcp-func server.ts     # For defineMCP() configs

# Server management
simplymcp list              # List running servers
simplymcp stop all          # Stop all servers

# Get help
simplymcp run --help
```

**Available Commands:**
- `simplymcp run <file..>` - Run one or more MCP servers
- `simplymcp bundle [entry]` - Bundle server for distribution
- `simplymcp list` - List running servers
- `simplymcp stop <target>` - Stop running servers
- `simplymcp config <action>` - Manage configuration

**Available Flags:**
- `--http` - Use HTTP transport instead of stdio
- `--port <number>` - Port for HTTP server (default: 3000)
- `--style <type>` - Override auto-detection (decorator|functional|programmatic)
- `--verbose` - Show detailed detection and startup information
- `--watch` - Watch for file changes and auto-restart
- `--watch-poll` - Use polling mode for file watching
- `--watch-interval <ms>` - Polling interval in milliseconds
- `--inspect` - Enable Node.js debugger (opens inspector on port 9229)
- `--inspect-brk` - Enable debugger and break before code starts
- `--inspect-port <number>` - Custom port for debugger (default: 9229)
- `--dry-run` - Validate configuration without starting server
- `--json` - Output as JSON (with --dry-run or list command)
- `--config <path>` - Path to config file (auto-detected if not specified)

### Migration from Old CLI Commands

If you're upgrading from an earlier version, here's how to update your commands:

**BEFORE (Old Adapter Commands):**
```bash
# Class-based servers
npx tsx node_modules/simply-mcp/mcp/class-adapter.ts server.ts
npx tsx mcp/class-adapter.ts server.ts

# Functional servers
npx tsx node_modules/simply-mcp/mcp/adapter.ts server.ts
npx tsx mcp/adapter.ts server.ts

# With HTTP transport
npx tsx mcp/class-adapter.ts server.ts --http --port 3000
```

**AFTER (New Simplified Commands):**
```bash
# Auto-detect (recommended)
simplymcp run server.ts

# Or explicit commands
simplymcp-class server.ts
simplymcp-func server.ts

# With HTTP transport
simplymcp run server.ts --http --port 3000
```

**Note:** The old adapter commands still work but are deprecated and will be removed in a future version.

### Debugging Your Server

SimpleMCP has built-in debugging support using the Node.js inspector. This allows you to use Chrome DevTools or VS Code to debug your server.

**Quick Start:**
```bash
# Start server with debugger
simplymcp run server.ts --inspect

# Break before code runs (useful for debugging startup)
simplymcp run server.ts --inspect-brk

# Use custom debugger port
simplymcp run server.ts --inspect --inspect-port 9230
```

**Connect with Chrome DevTools:**
1. Run your server with `--inspect`
2. Open Chrome and navigate to `chrome://inspect`
3. Click "Configure" and add `localhost:9229`
4. Your server will appear under "Remote Target"
5. Click "inspect" to open DevTools

**Connect with VS Code:**
1. Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to SimpleMCP",
  "port": 9229,
  "skipFiles": ["<node_internals>/**"]
}
```
2. Start server with `--inspect`
3. Press F5 in VS Code or use "Run and Debug" panel

**Debugging Features:**
- Set breakpoints in your tool implementations
- Inspect variables and call stacks
- Step through code execution
- Debug async operations
- Profile performance
- Use `debugger;` statements for programmatic breakpoints

For complete debugging documentation, see [mcp/docs/DEBUGGING.md](mcp/docs/DEBUGGING.md).

### Bundling for Production

The `simplemcp bundle` command packages your MCP server into a single, optimized file for deployment:

```bash
# Bundle with auto-detected entry point
simplemcp bundle

# Specify custom entry point and output
simplemcp bundle --entry src/my-server.ts --outfile dist/server.js

# Bundle with minification and source maps
simplemcp bundle --minify --sourcemap

# Generate CommonJS bundle
simplemcp bundle --format cjs

# Verbose output for debugging
simplemcp bundle --verbose
```

**Bundle Features:**
- **Auto-detection** - Automatically finds server.ts, index.ts, main.ts, or src/server.ts
- **Configuration file** - Use simplemcp.config.js/mjs/json for custom settings
- **Optimized output** - Minification and tree-shaking with esbuild
- **Native modules** - Automatic detection and externalization of native dependencies
- **Source maps** - Support for inline, external, or no source maps
- **Format support** - Generate ESM (default) or CommonJS bundles

**Configuration File Example (simplemcp.config.js):**
```javascript
export default {
  entry: './src/server.ts',
  outfile: './dist/bundle.js',
  format: 'esm',
  minify: true,
  sourcemap: 'external',
  external: ['better-sqlite3'] // Additional external packages
};
```

**CLI Flags:**
- `--entry <path>` - Entry point file (default: auto-detect)
- `--outfile <path>` - Output bundle path (default: dist/bundle.js)
- `--format <esm|cjs>` - Output format (default: esm)
- `--minify` - Minify the bundle
- `--sourcemap <inline|external|none>` - Source map generation
- `--config <path>` - Custom config file path
- `--verbose` - Show detailed bundling information

### Advanced Bundle Formats

#### Standalone Format
Create a directory bundle with package.json and assets:
```bash
simplemcp bundle server.ts --format standalone --output dist/
```

Output structure:
```
dist/
├── server.js         # Bundled application
├── package.json      # Runtime dependencies (native modules only)
├── node_modules/     # Native modules (if needed)
└── assets/           # Static assets (if included)
```

#### Executable Format
Create native binaries that don't require Node.js:
```bash
# Single platform
simplemcp bundle server.ts --format executable --output myserver

# Cross-platform builds
simplemcp bundle server.ts --format executable \
  --platforms linux,macos,windows --output dist/server
```

Creates: `dist/server-linux`, `dist/server-macos`, `dist/server-win.exe`

Supported platforms: `linux`, `macos`, `macos-arm`, `windows`, `alpine`

#### Watch Mode
Auto-rebuild during development:
```bash
simplemcp bundle server.ts --watch --watch-restart
```

Options:
- `--watch`: Enable watch mode
- `--watch-poll`: Use polling (for network drives)
- `--watch-interval`: Polling interval in ms (default: 100)
- `--watch-restart`: Auto-restart server after rebuild

#### Source Maps
Enhanced debugging with multiple source map modes:
```bash
# Inline (embedded in bundle)
simplemcp bundle server.ts --sourcemap inline

# External (.map file)
simplemcp bundle server.ts --sourcemap external

# Both (maximum compatibility)
simplemcp bundle server.ts --sourcemap both
```

### Complete CLI Reference

All bundling options:
```
--format           Output format (single-file|standalone|executable|esm|cjs)
-o, --output       Output path (file or directory depending on format)
--minify           Minify output
--sourcemap        Source maps (inline|external|both)
--platforms        Target platforms for executable (comma-separated)
--compress         Compress executable with GZip (default: true)
--assets           Include assets (comma-separated paths)
--external         External packages (comma-separated)
--watch            Watch mode
--watch-poll       Use polling for watch mode
--watch-interval   Polling interval (default: 100ms)
--watch-restart    Auto-restart server after rebuild
--config           Configuration file path
--verbose          Verbose output
```

### Example: Production Deployment

Create an optimized executable for production:
```bash
# Development: Watch mode with auto-restart
simplemcp bundle server.ts --watch --watch-restart --sourcemap inline

# Production: Minified executable for Linux
simplemcp bundle server.ts --format executable \
  --platforms linux --minify --output prod/server

# Deploy: Just copy the binary (no Node.js needed)
scp prod/server-linux user@server:/app/
ssh user@server "/app/server-linux"
```

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

# Run examples with CLI commands
simplymcp run mcp/examples/class-minimal.ts
simplymcp run mcp/examples/single-file-basic.ts --http --port 3000

# Or use npm scripts
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
- [Issue Tracker](https://github.com/clockwork-innovations/simply-mcp-ts/issues)
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
- 🐛 [Report Bug](https://github.com/clockwork-innovations/simply-mcp-ts/issues)
- 💡 [Request Feature](https://github.com/clockwork-innovations/simply-mcp-ts/issues)

## 🌟 Star History

If you find this project useful, please consider giving it a star ⭐

---

## 👥 About

**SimplyMCP** is created and maintained by [Clockwork Innovations, LLC](https://cwinnov.com)

**Founder & Author**: Nicholas Marinkovich, MD

Clockwork Innovations foresees a future where the convergence of technologies revolutionizes healthcare. *Design Today, Define Tomorrow.*

---

**Made with ❤️ by the SimplyMCP team**
