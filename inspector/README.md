# SimplyMCP Inspector

A web-based inspector for exploring and testing [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers. Built on Next.js with instant startup and zero runtime dependency installation.

[![npm version](https://img.shields.io/npm/v/simply-mcp-inspector.svg)](https://www.npmjs.com/package/simply-mcp-inspector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Instant Startup** - Ready in <300ms with pre-built standalone mode
- 🔍 **Complete MCP Testing** - Test all MCP primitives (tools, resources, prompts, roots, sampling)
- 🎨 **Modern UI** - Clean, dark-themed interface built with React and Tailwind CSS
- 🔌 **Multiple Transports** - Supports stdio, HTTP stateful (SSE), and HTTP stateless (REST)
- 📦 **Zero Bloat** - 24MB package, no runtime dependency installation
- 🛠️ **Developer Friendly** - Auto port detection, clear logging, easy debugging

## Quick Start

```bash
# Run directly with npx (recommended)
npx simply-mcp-inspector

# Or install globally
npm install -g simply-mcp-inspector
simply-mcp-inspector
```

The inspector will automatically:
- Start on port 3000 (or next available port)
- Open at `http://localhost:3000`
- Display connection status and options

## Usage

### Basic Usage

```bash
# Start on default port (3000)
npx simply-mcp-inspector

# Start on specific port
npx simply-mcp-inspector --port 8080
npx simply-mcp-inspector -p 3001
```

### Port Auto-Detection

If port 3000 is busy, the inspector automatically finds the next available port:

```bash
$ npx simply-mcp-inspector
ℹ️  Port 3000 in use, using port 3001 instead
🚀 Starting SimplyMCP Inspector on port 3001...
📍 Open http://localhost:3001 in your browser
```

### CLI Options

```bash
Options:
  -p, --port <number>  Port to run on (default: 3000)
  -h, --help          Show help
  -v, --version       Show version
```

## Connecting to MCP Servers

### Stdio Transport (Local Servers)

1. Select "Stdio (Local)" transport type
2. Enter the path to your TypeScript server file
3. Click "Connect"

Example:
```
Server Path: /path/to/your/server.ts
```

The inspector uses the `simply-mcp` CLI to run TypeScript servers automatically.

### HTTP Transports

**HTTP Stateful (SSE)**:
```
Base URL: http://localhost:3001/sse
```

**HTTP Stateless (REST)**:
```
Base URL: http://localhost:3001/api
```

## Inspector Features

### Tools Tab
- View all available tools from the server
- Execute tools with custom arguments
- View tool responses and errors
- Test tool schemas and validation

### Resources Tab
- List all resources
- Read resource contents
- View resource metadata
- Test resource URIs
- Subscribe to resource updates

### Prompts Tab
- Browse available prompts
- Execute prompts with arguments
- View prompt templates
- Test prompt responses

### Roots Tab
- List available roots
- View root URIs
- Test root listings

### Sampling Tab
- Test LLM sampling capabilities
- Configure model parameters
- View sampling responses

### Logs Tab
- Real-time server logs
- Filter by log level
- View log metadata
- Export logs

### Metrics Tab
- View performance metrics
- Monitor request/response times
- Track success/error rates

### Config Tab
- Server configuration viewer
- Capability inspection
- Protocol version info

## Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/Clockwork-Innovations/simply-mcp-ts.git
cd simply-mcp-ts/inspector

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Test the built package
node dist/cli.js
```

### Project Structure

```
inspector/
├── app/              # Next.js app directory
│   ├── api/         # API routes
│   ├── components/  # React components
│   └── page.tsx     # Main page
├── lib/             # Utility libraries
├── hooks/           # React hooks
├── public/          # Static assets
├── cli.ts           # CLI entry point
├── next.config.ts   # Next.js configuration
└── package.json     # Package metadata
```

## Requirements

- Node.js 20.x or higher
- `simply-mcp` ^4.0.0 (peer dependency)

## Peer Dependencies

The inspector requires `simply-mcp` to be installed:

```bash
npm install simply-mcp
```

When using `npx`, peer dependencies are automatically resolved.

## Performance

- **Package Size**: 24.3 MB compressed, 76.3 MB unpacked
- **Startup Time**: <300ms (production mode)
- **Build**: Next.js standalone with pre-compiled assets
- **Dependencies**: Pre-bundled, no runtime installation

### Before vs After Optimization

| Metric | Before (v0.1.0) | After (v0.2.x) |
|--------|----------------|----------------|
| Installation | 653 MB | 24.3 MB |
| Startup Time | 60+ seconds | <300ms |
| Dependencies | 354 packages | Pre-bundled |
| Install Step | Every run | One-time |

## Troubleshooting

### Port Already in Use

The inspector will automatically find the next available port. To force a specific port:

```bash
npx simply-mcp-inspector --port 8080
```

### CSS Not Loading

If styles don't load properly, ensure you're running the latest version:

```bash
npm install -g simply-mcp-inspector@latest
```

### Server Connection Fails

1. Verify the server path is correct
2. Check that the server file is valid TypeScript
3. Ensure `simply-mcp` is installed
4. Check the Logs tab for error details

### Build Issues

If you encounter build issues:

```bash
cd inspector
rm -rf .next node_modules
npm install
npm run build
```

## Related Packages

- [simply-mcp](https://www.npmjs.com/package/simply-mcp) - MCP server framework
- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - Official MCP SDK

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/Clockwork-Innovations/simply-mcp-ts) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT © [Nicholas Marinkovich, MD](https://cwinnov.com)

## Links

- **GitHub**: https://github.com/Clockwork-Innovations/simply-mcp-ts
- **npm**: https://www.npmjs.com/package/simply-mcp-inspector
- **Issues**: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues
- **MCP Specification**: https://modelcontextprotocol.io/

## Changelog

### v0.2.1 (Latest)
- Fixed CSS and static asset loading in standalone build
- Assets now correctly served from standalone directory structure

### v0.2.0
- **Major Performance Improvement**: Standalone Next.js build
- Instant startup (<300ms)
- Reduced package size from 653 MB to 24.3 MB
- Zero runtime dependency installation
- Pre-bundled all assets and dependencies

### v0.1.0
- Initial release
- Web-based MCP inspector
- Support for all MCP primitives
- Multiple transport types

---

**Made with ❤️ by [Clockwork Innovations](https://cwinnov.com)**
