# CLI Basics

Core CLI commands and everyday usage patterns for Simply MCP.

## Table of Contents

- [Installation](#installation)
- [Main Command](#main-command)
- [Run Command](#run-command)
- [Common Options](#common-options)
- [Basic Usage Examples](#basic-usage-examples)
- [Quick Reference](#quick-reference)
- [Related Guides](#related-guides)

---

## Installation

```bash
# Install globally (recommended)
npm install -g simply-mcp

# Install locally (project-specific)
npm install simply-mcp

# Verify installation
npx simply-mcp --version
```

**Requirements:**
- Node.js 20.0.0 or higher
- npm 5.2+ (for npx)

---

## Main Command

The main `simply-mcp` command provides access to all subcommands.

### Syntax

```bash
simply-mcp <command> [options]
```

### Available Commands

- `run` - Auto-detect and run MCP server(s)
- `bundle` - Bundle server into standalone distribution
- `list` - List all running MCP servers
- `stop` - Stop running MCP servers
- `config` - Manage configuration files

### Global Flags

| Flag | Description |
|------|-------------|
| `-h, --help` | Show help information |
| `-V, --version` | Show version number |

### Examples

```bash
# Show help
simply-mcp --help

# Show version
simply-mcp --version

# Run a server
simply-mcp run server.ts

# Bundle a server
simply-mcp bundle server.ts

# List running servers
simply-mcp list

# Stop all servers
simply-mcp stop all
```

---

## Run Command

The `run` command starts MCP servers built with the Interface API.

**Example:** [examples/interface-minimal.ts](../../examples/interface-minimal.ts)

### Syntax

```bash
simply-mcp run [file..] [options]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `file` | string | No* | Path to server file(s), package bundle directory, or named server from config |

*Required unless using config file with `defaultServer` or discovering servers in current directory.

**Note:** The `file` argument can be:
- A single TypeScript/JavaScript file (e.g., `server.ts`)
- A package bundle directory with `package.json` (e.g., `./my-server`)
- A named server from configuration file
- Multiple files for multi-server mode

### Basic Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--config <path>` | string | auto-detect | Path to config file |
| `--http` | boolean | false | Use HTTP transport instead of stdio |
| `--port <number>` | number | 3000 | Port for HTTP server |
| `--verbose` | boolean | false | Show detailed output |

**HTTP Examples:**
- [examples/interface-http-auth.ts](../../examples/interface-http-auth.ts) - HTTP with API key authentication
- [examples/interface-http-stateless.ts](../../examples/interface-http-stateless.ts) - Stateless HTTP deployment

### Watch Mode Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--watch` | boolean | false | Auto-restart on file changes |
| `--watch-poll` | boolean | false | Use polling for file watching |
| `--watch-interval <ms>` | number | 100 | Polling interval in milliseconds |

### Validation Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--dry-run` | boolean | false | Validate without starting server |
| `--json` | boolean | false | Output as JSON (with --dry-run) |

---

## Common Options

### Transport Options

**STDIO (Default):**
```bash
# STDIO is the default (no flags needed)
simply-mcp run server.ts
```

**HTTP:**
```bash
# Enable HTTP transport
simply-mcp run server.ts --http

# Specify custom port
simply-mcp run server.ts --http --port 8080
```

### Development Options

**Watch Mode:**
```bash
# Basic watch mode
simply-mcp run server.ts --watch

# Watch with verbose output
simply-mcp run server.ts --watch --verbose
```

**Validation:**
```bash
# Validate without running
simply-mcp run server.ts --dry-run

# Get JSON validation output
simply-mcp run server.ts --dry-run --json
```

---

## Basic Usage Examples

### Getting Started

```bash
# Quick start - run any server
simply-mcp run server.ts

# Run with HTTP for web integration
simply-mcp run server.ts --http --port 3000

# Run with watch mode for development
simply-mcp run server.ts --watch
```

### Development Workflow

```bash
# Development mode with auto-restart
simply-mcp run server.ts --watch --verbose

# Validate before running
simply-mcp run server.ts --dry-run && simply-mcp run server.ts
```

### Testing and Validation

```bash
# Validate server config
simply-mcp run server.ts --dry-run

# Get JSON validation output
simply-mcp run server.ts --dry-run --json
```

---

## Quick Reference

**Common Command Patterns:**

| Task | Command |
|------|---------|
| Run server (stdio) | `simply-mcp run server.ts` |
| Run server (HTTP) | `simply-mcp run server.ts --http --port 3000` |
| Development with watch | `simply-mcp run server.ts --watch` |
| Validate configuration | `simply-mcp run server.ts --dry-run` |
| Show help | `simply-mcp --help` |
| Show version | `simply-mcp --version` |

**Transport Modes:**
- **stdio**: Standard input/output (default, for Claude Desktop)
- **http**: HTTP server with stateful (default) or stateless modes

---

## Related Guides

- [CLI Advanced](./CLI_ADVANCED.md) - Advanced CLI features
- [Quick Start](./QUICK_START.md) - Get started with Simply MCP
- [Watch Mode Guide](./WATCH_MODE_GUIDE.md) - Auto-restart development
- [Dry-Run Guide](./DRY_RUN_GUIDE.md) - Validation and testing

