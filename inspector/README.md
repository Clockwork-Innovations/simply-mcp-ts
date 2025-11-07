# SimplyMCP Inspector

A web-based inspector for exploring and testing Model Context Protocol (MCP) servers. Built with Next.js and the SimplyMCP framework.

## Features

- 🔍 **Explore MCP Servers** - Browse available tools, resources, and prompts
- 🧪 **Test Tools** - Execute tools with custom parameters and see results
- 📊 **Schema Inspection** - View detailed schemas for all MCP capabilities
- 🎨 **Modern UI** - Clean, responsive interface built with Radix UI and Tailwind CSS
- 🚀 **Easy Launch** - Start with a single command

## Installation

### Global Installation

```bash
npm install -g simply-mcp-inspector
```

### NPX (No Installation Required)

```bash
npx simply-mcp-inspector
```

## Usage

### Basic Usage

Start the inspector on port 3000 (or next available port):

```bash
simply-mcp-inspector
```

### Custom Port

Specify a custom port:

```bash
simply-mcp-inspector --port 8080
simply-mcp-inspector -p 3001
```

### Connect to MCP Server

Once the inspector is running, open your browser to the displayed URL (e.g., `http://localhost:3000`) and:

1. Enter your MCP server URL or select from running servers
2. Explore available tools, resources, and prompts
3. Test tools by providing parameters and executing them
4. View detailed schemas and documentation

## Development

### Prerequisites

- Node.js >= 20.0.0
- npm or yarn

### Setup

```bash
# From the inspector directory
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Project Structure

```
inspector/
├── app/              # Next.js app directory
│   ├── components/   # React components
│   ├── page.tsx      # Main inspector page
│   └── layout.tsx    # App layout
├── cli.ts            # CLI entry point
├── package.json      # Package configuration
└── README.md         # This file
```

## CLI Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--port` | `-p` | Port to run inspector on | 3000 (auto-increments if unavailable) |
| `--help` | `-h` | Show help | - |
| `--version` | `-v` | Show version | - |

## Examples

```bash
# Start on default port (3000)
simply-mcp-inspector

# Start on specific port
simply-mcp-inspector --port 8080

# Port in use? Auto-finds next available
simply-mcp-inspector
# → Port 3000 in use, using port 3001 instead

# Quick test with npx
npx simply-mcp-inspector
```

## Integration with SimplyMCP

The inspector works seamlessly with SimplyMCP servers:

```bash
# Terminal 1: Start your MCP server
npx simply-mcp run my-server.ts --http --port 3000

# Terminal 2: Start inspector
npx simply-mcp-inspector --port 3001
```

Then connect to `http://localhost:3000` from the inspector UI.

## Technologies

- **Next.js 16** - React framework
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first styling
- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **SimplyMCP** - MCP server framework

## Requirements

- **Peer Dependency**: `simply-mcp ^4.0.0`
- **Node.js**: >= 20.0.0

## Publishing

The inspector is designed to be published as a separate npm package:

```bash
# From the inspector directory
npm run build
npm publish
```

Users can then install globally or use via npx:

```bash
npm install -g simply-mcp-inspector
# or
npx simply-mcp-inspector
```

## License

MIT - See LICENSE file for details

## Contributing

Issues and pull requests are welcome at the [main repository](https://github.com/Clockwork-Innovations/simply-mcp-ts).

## Links

- [SimplyMCP Framework](https://github.com/Clockwork-Innovations/simply-mcp-ts)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Documentation](https://github.com/Clockwork-Innovations/simply-mcp-ts/tree/main/docs)

---

**Need help?** Open an issue on [GitHub](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
