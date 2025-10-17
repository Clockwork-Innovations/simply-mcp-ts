# CLI Reference Guide

Complete command-line interface reference for Simply MCP v2.5.0-beta.3

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Command Index](#command-index)
- [Main Command: simply-mcp](#main-command-simply-mcp)
- [Run Commands](#run-commands)
- [Bundle Command](#bundle-command)
- [Management Commands](#management-commands)
- [Global Options](#global-options)
- [Transport Options](#transport-options)
- [Development Options](#development-options)
- [Configuration Files](#configuration-files)
- [Environment Variables](#environment-variables)
- [Exit Codes](#exit-codes)
- [Examples by Use Case](#examples-by-use-case)
- [Tips and Tricks](#tips-and-tricks)
- [Troubleshooting](#troubleshooting)

---

## Introduction

Simply MCP provides a powerful CLI for running, bundling, and managing MCP servers. The CLI supports multiple API styles (Interface, Decorator, Functional, MCP Builder), auto-detection, and zero-configuration operation.

### Key Features

- **Auto-detection**: Automatically detects API style from source code
- **Zero configuration**: Run TypeScript files directly without compilation
- **Multiple transports**: STDIO (default) and HTTP with stateful/stateless modes
- **Watch mode**: Auto-restart on file changes during development
- **Bundling**: Create self-contained distributions for easy sharing
- **Multi-server**: Run multiple servers simultaneously
- **Debugging**: Built-in Node.js inspector support

### Getting Help

```bash
# Show general help
simply-mcp --help
simplymcp -h

# Show command-specific help
simply-mcp run --help
simply-mcp bundle --help
simply-mcp list --help

# Show version
simply-mcp --version
simplymcp -V
```

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

## Command Index

Quick reference table of all available commands:

| Command | Alias | Description | Common Use |
|---------|-------|-------------|------------|
| `simply-mcp run` | `simplymcp run` | Auto-detect and run server(s) | Development and testing |
| `simply-mcp-run` | `simplymcp-run` | Direct run alias (auto-detect) | Quick server launch |
| `simply-mcp-class` | `simplymcp-class` | Run decorator API server | Explicit decorator style |
| `simply-mcp-func` | `simplymcp-func` | Run functional API server | Explicit functional style |
| `simply-mcp-interface` | `simplymcp-interface` | Run interface API server | Explicit interface style |
| `simply-mcp bundle` | `simplymcp-bundle` | Bundle server for distribution | Production deployment |
| `simply-mcp create-bundle` | - | Create package bundle from server file | Package creation |
| `simply-mcp list` | - | List running servers | Server management |
| `simply-mcp stop` | - | Stop running servers | Server management |
| `simply-mcp config` | - | Manage configuration | Configuration management |

**Note:** All commands support both `simply-mcp` and `simplymcp` aliases. The CLI also accepts `SimplyMCP` and `simplyMCP` (case variations).

---

## Main Command: simply-mcp

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
simply-mcp bundle server.ts -f single-file

# List running servers
simply-mcp list

# Stop all servers
simply-mcp stop all
```

---

## Run Commands

The `run` command family starts MCP servers with automatic API style detection.

### simply-mcp run (Recommended)

Auto-detects API style and runs server(s).

#### Syntax

```bash
simply-mcp run [file..] [options]
```

#### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `file` | string | No* | Path to server file(s), package bundle directory, or named server from config |

*Required unless using config file with `defaultServer` or discovering servers in current directory.

**Note:** The `file` argument can be:
- A single TypeScript/JavaScript file (e.g., `server.ts`)
- A package bundle directory with `package.json` (e.g., `./my-server`)
- A named server from configuration file
- Multiple files for multi-server mode

#### Options

**Basic Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--config <path>` | string | auto-detect | Path to config file |
| `--http` | boolean | false | Use HTTP transport instead of stdio |
| `--port <number>` | number | 3000 | Port for HTTP server |
| `--style <style>` | string | auto | Force specific API style |
| `--verbose` | boolean | false | Show detailed output |

**Watch Mode:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--watch` | boolean | false | Auto-restart on file changes |
| `--watch-poll` | boolean | false | Use polling for file watching |
| `--watch-interval <ms>` | number | 100 | Polling interval in milliseconds |

**Debugging:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--inspect` | boolean | false | Enable Node.js inspector |
| `--inspect-brk` | boolean | false | Enable inspector and break on first line |
| `--inspect-port <port>` | number | 9229 | Inspector port |

**Validation:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--dry-run` | boolean | false | Validate without starting server |
| `--json` | boolean | false | Output as JSON (with --dry-run) |

**Package Bundle Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--auto-install` | boolean | true | Auto-install dependencies for package bundles |
| `--no-auto-install` | boolean | - | Disable automatic dependency installation |
| `--package-manager <pm>` | string | auto-detect | Specify package manager (npm, pnpm, yarn, bun) |
| `--force-install` | boolean | false | Force reinstall dependencies |

#### API Style Values

| Style | Description | Auto-detected when file contains: |
|-------|-------------|-----------------------------------|
| `interface` | Interface API | `extends ITool`, `extends IServer` |
| `decorator` | Decorator API | `@MCPServer()` decorator |
| `functional` | Functional API | `export default defineMCP(` |
| `programmatic` | Programmatic API | Direct `SimplyMCP` instantiation |
| `mcp-builder` | MCP Builder API | `defineMCPBuilder`, `createMCPBuilder` |

#### Examples

**Basic Usage:**

```bash
# Run with auto-detection (stdio transport)
simply-mcp run server.ts

# Run multiple servers (enables HTTP automatically)
simply-mcp run server1.ts server2.ts server3.ts

# Run named server from config
simply-mcp run my-server
```

**Transport Options:**

```bash
# Use HTTP transport
simply-mcp run server.ts --http --port 3000

# Use HTTP on custom port
simply-mcp run server.ts --http --port 8080
```

**Development:**

```bash
# Watch mode (auto-restart on changes)
simply-mcp run server.ts --watch

# Watch with verbose output
simply-mcp run server.ts --watch --verbose

# Watch with polling (network drives)
simply-mcp run server.ts --watch --watch-poll --watch-interval 500
```

**Debugging:**

```bash
# Enable debugger (attach with Chrome DevTools)
simply-mcp run server.ts --inspect

# Break on first line (wait for debugger)
simply-mcp run server.ts --inspect-brk

# Use custom inspector port
simply-mcp run server.ts --inspect --inspect-port 9230
```

**Validation:**

```bash
# Validate without running
simply-mcp run server.ts --dry-run

# Get JSON validation output
simply-mcp run server.ts --dry-run --json
```

**Force API Style:**

```bash
# Force decorator API
simply-mcp run server.ts --style decorator

# Force interface API
simply-mcp run server.ts --style interface

# Force functional API
simply-mcp run server.ts --style functional
```

**Package Bundles:**

```bash
# Run package bundle (auto-installs dependencies)
simply-mcp run ./my-mcp-server

# Run bundle without auto-install
simply-mcp run ./my-mcp-server --no-auto-install

# Force reinstall dependencies
simply-mcp run ./my-mcp-server --force-install

# Use specific package manager
simply-mcp run ./my-mcp-server --package-manager pnpm
simply-mcp run ./my-mcp-server --package-manager yarn
simply-mcp run ./my-mcp-server --package-manager bun

# Run bundle with HTTP transport
simply-mcp run ./my-mcp-server --http --port 3000

# Run bundle with verbose output
simply-mcp run ./my-mcp-server --verbose
```

#### Related Guides

- [Watch Mode Guide](./WATCH_MODE_GUIDE.md) - Complete watch mode documentation
- [Dry-Run Guide](./DRY_RUN_GUIDE.md) - Validation and testing
- [Getting Started](./GETTING_STARTED_GUIDE.md) - Basic usage
- [Bundle Usage Guide](./BUNDLE_USAGE.md) - Running package bundles
- [Bundle Creation Guide](./BUNDLE_CREATION.md) - Creating package bundles

---

### simply-mcp-run

Direct run alias with auto-detection (equivalent to `simply-mcp run`).

#### Syntax

```bash
simply-mcp-run <file> [options]
# Or: simplymcp-run <file> [options]
```

#### Description

Identical to `simply-mcp run` but as a direct command. Accepts all the same options.

#### Examples

```bash
# Run server
simply-mcp-run server.ts

# Run with HTTP
simply-mcp-run server.ts --http --port 3000

# Run with watch mode
simply-mcp-run server.ts --watch
```

---

### simply-mcp-class

Explicitly run a server using the Decorator API.

#### Syntax

```bash
simply-mcp-class <file> [options]
# Or: simplymcp-class <file> [options]
```

#### Description

Forces the Decorator API adapter. Use when you want to bypass auto-detection or ensure decorator API is used.

#### When to Use

- Your file contains both decorator and other API patterns
- You want explicit control over API style
- Debugging API style detection issues

#### Examples

```bash
# Run decorator API server
simply-mcp-class MyServer.ts

# With HTTP transport
simply-mcp-class MyServer.ts --http --port 3000

# With watch mode
simply-mcp-class MyServer.ts --watch --verbose
```

#### Notes

- File must contain a class decorated with `@MCPServer()`
- Class must be exported (default or named export)
- Accepts same options as `simply-mcp run` except `--style`

---

### simply-mcp-func

Explicitly run a server using the Functional API.

#### Syntax

```bash
simply-mcp-func <file> [options]
# Or: simplymcp-func <file> [options]
```

#### Description

Forces the Functional API adapter. Use when you want to bypass auto-detection.

#### When to Use

- Your file uses `defineMCP()` pattern
- You want explicit control over API style
- Debugging API style detection issues

#### Examples

```bash
# Run functional API server
simply-mcp-func server-config.ts

# With HTTP transport
simply-mcp-func server-config.ts --http --port 3000

# With verbose output
simply-mcp-func server-config.ts --verbose
```

#### Notes

- File must have `export default defineMCP(...)` or similar
- Accepts same options as `simply-mcp run` except `--style`

---

### simply-mcp-interface

Explicitly run a server using the Interface API.

#### Syntax

```bash
simply-mcp-interface <file> [options]
# Or: simplymcp-interface <file> [options]
```

#### Description

Forces the Interface API adapter. Use when you want to bypass auto-detection.

#### When to Use

- Your file uses interface-based API (`ITool`, `IServer`, etc.)
- You want explicit control over API style
- Debugging API style detection issues

#### Examples

```bash
# Run interface API server
simply-mcp-interface weather-service.ts

# With HTTP transport
simply-mcp-interface weather-service.ts --http --port 3000

# With verbose output
simply-mcp-interface weather-service.ts --verbose
```

#### Notes

- File must contain interfaces extending `ITool`, `IPrompt`, `IResource`, or `IServer`
- Implementation class must be default export
- Accepts same options as `simply-mcp run` except `--style`

---

## Bundle Command

Create standalone, distributable bundles of your MCP servers.

### Syntax

```bash
simply-mcp bundle [entry] [options]
# Or: simply-mcp-bundle [entry] [options]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `entry` | string | No* | Entry point file (e.g., server.ts) |

*Auto-detected if not provided.

### Options

**Output Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--output <path>` | `-o` | string | `dist/bundle.js` | Output file/directory path |
| `--format <fmt>` | `-f` | string | `esm` | Output format |

**Build Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--minify` | `-m` | boolean | true | Minify output |
| `--no-minify` | - | boolean | - | Disable minification |
| `--sourcemap` | `-s` | boolean | false | Generate source maps |
| `--platform <plat>` | `-p` | string | `node` | Target platform |
| `--target <tgt>` | `-t` | string | `node20` | Target Node.js version |
| `--tree-shake` | - | boolean | true | Enable tree-shaking |
| `--no-tree-shake` | - | boolean | - | Disable tree-shaking |

**Dependencies:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--external <pkgs>` | `-e` | string | - | External packages (comma-separated) |
| `--auto-install` | - | boolean | false | Auto-install dependencies |
| `--assets <files>` | - | string | - | Include assets (comma-separated) |

**Watch Mode:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--watch` | `-w` | boolean | false | Watch for changes |
| `--watch-poll` | - | boolean | false | Use polling for watching |
| `--watch-interval <ms>` | - | number | 100 | Polling interval |
| `--watch-restart` | - | boolean | false | Auto-restart after rebuild |

**Configuration:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--config <path>` | `-c` | string | - | Config file path |
| `--verbose` | - | boolean | false | Verbose output |

### Bundle Formats

| Format | Description | Use Case | Output |
|--------|-------------|----------|--------|
| `single-file` | Single executable .js file | Maximum portability, no native modules | One .js file |
| `standalone` | Folder with server + native modules | Servers with database/image libraries | Directory |
| `esm` | ECMAScript Module | Library distribution | .mjs file |
| `cjs` | CommonJS Module | Legacy compatibility | .cjs file |

### Platform Values

| Platform | Description |
|----------|-------------|
| `node` | Target Node.js environment (default) |
| `neutral` | Platform-agnostic (no Node.js built-ins) |

### Target Values

| Target | Description |
|--------|-------------|
| `node18` | Node.js 18.x |
| `node20` | Node.js 20.x (default) |
| `node22` | Node.js 22.x |
| `esnext` | Latest ECMAScript features |
| `es2020` | ECMAScript 2020 |
| `es2021` | ECMAScript 2021 |
| `es2022` | ECMAScript 2022 |

### Examples

**Basic Bundling:**

```bash
# Auto-detect entry and bundle
simply-mcp bundle

# Bundle specific file
simply-mcp bundle server.ts

# Bundle to specific output
simply-mcp bundle server.ts -o dist/my-server.js
```

**Bundle Formats:**

```bash
# Single-file bundle (portable)
simply-mcp bundle server.ts -f single-file -o my-server.js

# Standalone bundle (with native modules)
simply-mcp bundle server.ts -f standalone -o my-server-dist

# ESM bundle
simply-mcp bundle server.ts -f esm -o dist/server.mjs

# CommonJS bundle
simply-mcp bundle server.ts -f cjs -o dist/server.cjs
```

**Optimization:**

```bash
# Disable minification (debugging)
simply-mcp bundle server.ts --no-minify

# Generate source maps
simply-mcp bundle server.ts -s --no-minify

# Disable tree-shaking
simply-mcp bundle server.ts --no-tree-shake
```

**Dependencies:**

```bash
# Mark packages as external
simply-mcp bundle server.ts -e axios,lodash

# Auto-install missing dependencies
simply-mcp bundle server.ts --auto-install

# Include asset files
simply-mcp bundle server.ts --assets config.json,data.csv
```

**Watch Mode:**

```bash
# Watch and rebuild on changes
simply-mcp bundle server.ts -w

# Watch with auto-restart
simply-mcp bundle server.ts -w --watch-restart

# Watch with verbose output
simply-mcp bundle server.ts -w --verbose
```

**Advanced:**

```bash
# Target Node.js 18
simply-mcp bundle server.ts -t node18

# Full production build
simply-mcp bundle server.ts \
  -f single-file \
  -o dist/server.js \
  --minify \
  --tree-shake \
  -t node20

# Development build
simply-mcp bundle server.ts \
  --no-minify \
  -s \
  -w \
  --verbose
```

### Related Guides

- [Bundling Guide](./BUNDLING.md) - Complete bundling documentation
- [Bundle Creation Guide](./BUNDLE_CREATION.md) - Creating package bundles
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment

---

### simply-mcp create-bundle

Create a package bundle from an existing server file.

#### Syntax

```bash
simply-mcp create-bundle --from <source-file> --output <bundle-dir> [options]
```

#### Arguments

| Option | Short | Type | Required | Description |
|--------|-------|------|----------|-------------|
| `--from <file>` | - | string | Yes | Source server file (.ts or .js) |
| `--output <dir>` | - | string | Yes | Output bundle directory |
| `--name <name>` | - | string | No | Bundle name (default: filename) |
| `--description <desc>` | - | string | No | Bundle description |
| `--author <name>` | - | string | No | Author name |
| `--version <ver>` | - | string | No | Initial version (default: 1.0.0) |

#### Description

The `create-bundle` command creates a complete npm package from an existing server file. It automatically:

1. Analyzes imports to detect dependencies
2. Creates directory structure (`package.json`, `README.md`, etc.)
3. Copies source file to `src/server.ts`
4. Generates documentation templates

#### Examples

**Minimal example:**
```bash
simplymcp create-bundle --from server.ts --output ./my-bundle
```

**Full example:**
```bash
simplymcp create-bundle \
  --from server.ts \
  --output ./weather-server \
  --name weather-mcp-server \
  --description "Get weather forecasts for any location" \
  --author "Jane Developer" \
  --version 1.0.0
```

**Using bundle command (alternative):**
```bash
# Equivalent to create-bundle
simplymcp bundle server.ts --format package --output ./my-bundle
```

#### Output Structure

```
my-bundle/
├── package.json          # Generated with dependencies
├── README.md             # Usage instructions
├── .env.example          # Environment variable template
└── src/
    └── server.ts         # Your server code (copied)
```

#### Next Steps After Creation

```bash
# 1. Navigate to bundle
cd my-bundle

# 2. Install dependencies
npm install

# 3. Test the bundle
npx simply-mcp run .

# 4. Optionally publish
npm publish
```

#### Related Commands

- `simply-mcp bundle --format package` - Alternative way to create bundles
- `simply-mcp run <bundle-dir>` - Run the created bundle

#### Related Guides

- [Bundle Creation Guide](./BUNDLE_CREATION.md) - Detailed creation instructions
- [Bundle Usage Guide](./BUNDLE_USAGE.md) - Running bundles

---

## Management Commands

Commands for managing running MCP servers.

### simply-mcp list

List all running MCP servers.

#### Syntax

```bash
simply-mcp list [options]
```

#### Options

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--verbose` | `-v` | boolean | false | Show detailed information |
| `--cleanup` | `-c` | boolean | false | Remove dead servers from registry |
| `--json` | - | boolean | false | Output in JSON format |

#### Examples

```bash
# List all servers
simply-mcp list

# Show detailed info
simply-mcp list --verbose

# List and cleanup dead servers
simply-mcp list --cleanup

# Get JSON output
simply-mcp list --json
```

#### Output Format

**Standard Output:**
```
Running MCP Servers:

  ✓ my-server - HTTP :3000 - PID 12345
  ✓ calculator - stdio - PID 12346

Total: 2 running
```

**Verbose Output:**
```
Running MCP Servers:

  ✓ my-server (server.ts)
    Path: /path/to/server.ts
    Uptime: 2h 15m
    Version: 1.0.0

  ✓ calculator (calc.ts)
    Path: /path/to/calc.ts
    Uptime: 45m 30s

Total: 2 running
```

**JSON Output:**
```json
[
  {
    "name": "my-server",
    "pid": 12345,
    "transport": "http",
    "port": 3000,
    "filePath": "/path/to/server.ts",
    "startedAt": 1234567890,
    "alive": true,
    "uptime": 7890000
  }
]
```

---

### simply-mcp stop

Stop running MCP servers.

#### Syntax

```bash
simply-mcp stop [target] [options]
```

#### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `target` | string | No | PID, server name, group ID, or "all" |

#### Options

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--force` | `-f` | boolean | false | Force kill (SIGKILL) |
| `--group <id>` | `-g` | string | - | Stop all servers in group |

#### Examples

```bash
# Stop all servers
simply-mcp stop
simply-mcp stop all

# Stop specific server by PID
simply-mcp stop 12345

# Stop by server name
simply-mcp stop my-server

# Force kill server
simply-mcp stop my-server --force

# Stop server group
simply-mcp stop --group multi-123
```

#### Behavior

1. **Graceful shutdown (default):** Sends SIGTERM to allow clean shutdown
2. **Wait period:** Waits 500ms for process to exit
3. **Force mode:** Sends SIGKILL after 1 second if `--force` is used
4. **Auto-cleanup:** Removes stopped servers from registry

---

### simply-mcp config

Manage SimpleMCP configuration files.

#### Syntax

```bash
simply-mcp config <action> [options]
```

#### Actions

| Action | Description |
|--------|-------------|
| `show` | Show current configuration |
| `validate` | Validate configuration file |
| `list` | List available servers in config |
| `init` | Initialize new config file |

#### Options

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--config <path>` | `-c` | string | auto-detect | Path to config file |
| `--format <fmt>` | `-f` | string | `ts` | Config format (init only) |

#### Format Values (for init)

| Format | File Name | Description |
|--------|-----------|-------------|
| `ts` | `simplymcp.config.ts` | TypeScript config (default) |
| `js` | `simplymcp.config.js` | JavaScript config |
| `json` | `simplymcp.config.json` | JSON config |

#### Examples

```bash
# Show current config
simply-mcp config show

# Show specific config file
simply-mcp config show --config custom.config.ts

# Validate config
simply-mcp config validate

# List available servers
simply-mcp config list

# Initialize new TypeScript config
simply-mcp config init

# Initialize JSON config
simply-mcp config init --format json

# Initialize JavaScript config
simply-mcp config init --format js
```

#### Configuration File Locations

Auto-detected in this order:
1. `simplymcp.config.ts`
2. `simplymcp.config.js`
3. `simplymcp.config.mjs`
4. `simplymcp.config.json`

---

## Global Options

Options that work with all commands.

### Help and Version

| Option | Short | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help information |
| `--version` | `-V` | Show version number |

### Examples

```bash
# Show general help
simply-mcp --help

# Show command help
simply-mcp run --help
simply-mcp bundle -h

# Show version
simply-mcp --version
simply-mcp -V
```

---

## Transport Options

Configure how the MCP server communicates with clients.

### STDIO Transport (Default)

Communication via standard input/output.

**Characteristics:**
- Default transport mode
- Single client per process
- Used by CLI tools and desktop apps
- No port required

**Usage:**
```bash
# STDIO is the default (no flags needed)
simply-mcp run server.ts
```

**When to use:**
- Desktop applications (Claude Desktop)
- CLI integrations
- Testing and development
- Single-client scenarios

---

### HTTP Transport

Communication via HTTP/HTTPS.

**Characteristics:**
- Multiple clients via sessions
- Requires port configuration
- Stateful (default) or stateless modes
- Web application integration

**Usage:**
```bash
# Enable HTTP transport
simply-mcp run server.ts --http

# Specify custom port
simply-mcp run server.ts --http --port 8080
```

**When to use:**
- Web applications
- Multi-client scenarios
- Serverless deployments (stateless mode)
- Load-balanced services

**Modes:**

**Stateful Mode (default):**
- Session-based communication
- Real-time updates via SSE
- Multi-step workflows
- Long-running conversations

**Stateless Mode:**
- No session management
- AWS Lambda compatible
- Simple REST-like APIs
- Each request independent

---

## Development Options

Options for development and debugging workflows.

### Watch Mode

Auto-restart server when files change.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--watch` | boolean | false | Enable watch mode |
| `--watch-poll` | boolean | false | Use polling (network drives) |
| `--watch-interval <ms>` | number | 100 | Polling interval |

**Examples:**

```bash
# Basic watch mode
simply-mcp run server.ts --watch

# Watch with polling
simply-mcp run server.ts --watch --watch-poll

# Custom polling interval
simply-mcp run server.ts --watch --watch-poll --watch-interval 500

# Watch with verbose output
simply-mcp run server.ts --watch --verbose
```

**What gets watched:**
- Main server file
- TypeScript dependencies in same directory
- `package.json` for dependency changes

**Ignored patterns:**
- `**/node_modules/**`
- `**/dist/**`
- `**/*.test.ts`
- `**/.git/**`

See [Watch Mode Guide](./WATCH_MODE_GUIDE.md) for details.

---

### Debugging

Enable Node.js inspector for debugging.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--inspect` | boolean | false | Enable inspector |
| `--inspect-brk` | boolean | false | Break on first line |
| `--inspect-port <port>` | number | 9229 | Inspector port |

**Examples:**

```bash
# Enable debugger
simply-mcp run server.ts --inspect

# Break on first line
simply-mcp run server.ts --inspect-brk

# Custom inspector port
simply-mcp run server.ts --inspect --inspect-port 9230
```

**How to use:**

1. Start server with `--inspect` or `--inspect-brk`
2. Open `chrome://inspect` in Chrome
3. Click "inspect" on your server
4. Use Chrome DevTools to debug

---

### Dry-Run Mode

Validate configuration without starting server.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--dry-run` | boolean | false | Validate only |
| `--json` | boolean | false | JSON output |

**Examples:**

```bash
# Validate server
simply-mcp run server.ts --dry-run

# Get JSON validation output
simply-mcp run server.ts --dry-run --json
```

**What it checks:**
- Server configuration (name, version)
- Tool definitions and names
- Port availability (with --http)
- API style detection
- Duplicate tool names

See [Dry-Run Guide](./DRY_RUN_GUIDE.md) for details.

---

### Verbose Output

Show detailed logging and debug information.

**Option:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--verbose` | boolean | false | Detailed output |

**Examples:**

```bash
# Verbose run
simply-mcp run server.ts --verbose

# Verbose with watch mode
simply-mcp run server.ts --watch --verbose

# Verbose bundling
simply-mcp bundle server.ts --verbose
```

**What it shows:**
- Config file detection and loading
- API style detection logic
- File paths and resolution
- Transport configuration
- Server startup sequence
- Watch mode file changes

---

## Configuration Files

Simply MCP supports configuration files for managing multiple servers and default settings.

### Configuration File Formats

Supported formats (auto-detected in order):

1. **TypeScript** - `simplymcp.config.ts` (recommended)
2. **JavaScript** - `simplymcp.config.js`
3. **JavaScript Module** - `simplymcp.config.mjs`
4. **JSON** - `simplymcp.config.json`

### Configuration Schema

**TypeScript/JavaScript:**

```typescript
export default {
  // Default server to run when no file specified
  defaultServer: 'my-server',

  // Named server configurations
  servers: {
    'my-server': {
      entry: './src/my-server.ts',
      transport: 'http',
      port: 3000,
      style: 'decorator',
      watch: true,
      verbose: false
    },
    'api-server': {
      entry: './src/api.ts',
      transport: 'http',
      port: 3001,
      http: true
    }
  },

  // Global defaults for all servers
  defaults: {
    transport: 'stdio',
    verbose: false,
    watch: false,
    port: 3000
  },

  // Run command defaults
  run: {
    http: false,
    port: 3000,
    verbose: false,
    watch: false,
    watchPoll: false,
    watchInterval: 100
  }
};
```

**JSON:**

```json
{
  "defaultServer": "my-server",
  "servers": {
    "my-server": {
      "entry": "./src/my-server.ts",
      "transport": "http",
      "port": 3000
    }
  },
  "defaults": {
    "transport": "stdio",
    "verbose": false
  }
}
```

### Configuration Fields

**Server Configuration:**

| Field | Type | Description |
|-------|------|-------------|
| `entry` | string | Path to server file |
| `transport` | string | Transport type (`stdio` or `http`) |
| `port` | number | HTTP port |
| `style` | string | API style (interface/decorator/functional) |
| `http` | boolean | Use HTTP transport |
| `watch` | boolean | Enable watch mode |
| `watchPoll` | boolean | Use polling for watch |
| `watchInterval` | number | Polling interval (ms) |
| `verbose` | boolean | Verbose output |

**Global Configuration:**

| Field | Type | Description |
|-------|------|-------------|
| `defaultServer` | string | Default server name |
| `servers` | object | Named server configs |
| `defaults` | object | Global defaults |
| `run` | object | Run command defaults |

### Using Configuration

**Run named server:**

```bash
# Run server from config by name
simply-mcp run my-server

# Override config options
simply-mcp run my-server --port 8080
```

**Specify config file:**

```bash
# Use custom config file
simply-mcp run --config custom.config.ts

# Show config
simply-mcp config show --config custom.config.ts
```

**Priority order (highest to lowest):**

1. CLI flags
2. Named server config
3. Global defaults
4. Built-in defaults

### Create Configuration

```bash
# Initialize TypeScript config
simply-mcp config init

# Initialize JSON config
simply-mcp config init --format json

# Initialize JavaScript config
simply-mcp config init --format js
```

---

## Environment Variables

Environment variables that affect CLI behavior.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SIMPLYMCP_AUTO_CONFIRM` | boolean | false | Skip confirmation prompts |
| `NODE_ENV` | string | - | Node.js environment |
| `DEBUG` | string | - | Enable debug output |

### Examples

```bash
# Skip stop confirmation
SIMPLYMCP_AUTO_CONFIRM=true simply-mcp stop all

# Set Node environment
NODE_ENV=production simply-mcp run server.ts

# Enable debug output
DEBUG=* simply-mcp run server.ts --verbose
```

---

## Exit Codes

CLI exit codes for scripting and automation.

| Code | Description | Example |
|------|-------------|---------|
| `0` | Success | Server started/stopped successfully |
| `1` | General error | Invalid arguments, file not found |
| `2` | Runtime error | Server failed to start, execution error |

### Examples

**Using exit codes in scripts:**

```bash
#!/bin/bash

# Validate before running
if simply-mcp run server.ts --dry-run; then
  echo "Validation passed"
  simply-mcp run server.ts
else
  echo "Validation failed"
  exit 1
fi
```

```bash
# Stop server and check result
if simply-mcp stop my-server; then
  echo "Server stopped successfully"
else
  echo "Failed to stop server"
fi
```

---

## Examples by Use Case

Practical examples for common scenarios.

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

# Development with HTTP and debugging
simply-mcp run server.ts --http --port 3000 --watch --inspect

# Validate before running
simply-mcp run server.ts --dry-run && simply-mcp run server.ts
```

### Multi-Server Setup

```bash
# Run multiple servers (auto-enables HTTP)
simply-mcp run server1.ts server2.ts server3.ts

# List running servers
simply-mcp list --verbose

# Stop specific server
simply-mcp stop server1

# Stop all servers
simply-mcp stop all
```

### Production Deployment

```bash
# Create production bundle
simply-mcp bundle server.ts \
  -f single-file \
  -o dist/server.js \
  --minify \
  --tree-shake \
  -t node20

# Run bundled server
node dist/server.js
```

### Debugging Scenarios

```bash
# Debug with Chrome DevTools
simply-mcp run server.ts --inspect

# Break on first line
simply-mcp run server.ts --inspect-brk

# Debug with source maps
simply-mcp bundle server.ts -s --no-minify
node --inspect dist/bundle.js
```

### Testing and Validation

```bash
# Validate server config
simply-mcp run server.ts --dry-run

# Get JSON validation output
simply-mcp run server.ts --dry-run --json

# Validate with specific style
simply-mcp run server.ts --dry-run --style decorator
```

### Configuration-Based Workflow

```bash
# Initialize config
simply-mcp config init

# Edit config file, then run named server
simply-mcp run my-server

# List configured servers
simply-mcp config list

# Validate config
simply-mcp config validate
```

---

## Tips and Tricks

### Aliases and Shortcuts

```bash
# Use short command names
simplymcp run server.ts

# Use short flags
simply-mcp run server.ts -h -p 3000 -w -v

# Combine multiple servers
simply-mcp run *.ts
```

### Package.json Scripts

Add convenient npm scripts:

```json
{
  "scripts": {
    "dev": "simply-mcp run server.ts --watch",
    "dev:http": "simply-mcp run server.ts --watch --http --port 3000",
    "start": "simply-mcp run server.ts",
    "validate": "simply-mcp run server.ts --dry-run",
    "bundle": "simply-mcp bundle server.ts -f single-file -o dist/server.js",
    "debug": "simply-mcp run server.ts --inspect-brk"
  }
}
```

### Shell Aliases

Add to `.bashrc` or `.zshrc`:

```bash
# Quick shortcuts
alias smcp='simply-mcp'
alias smcp-run='simply-mcp run'
alias smcp-watch='simply-mcp run --watch'
alias smcp-http='simply-mcp run --http --port 3000'
```

### Watch Mode Best Practices

```bash
# Use polling for network drives
simply-mcp run server.ts --watch --watch-poll --watch-interval 500

# Combine watch with verbose for debugging
simply-mcp run server.ts --watch --verbose

# Watch multiple files
# (Note: multi-server + watch not yet supported)
```

### Debugging Tips

```bash
# Use verbose to see what's happening
simply-mcp run server.ts --verbose

# Combine dry-run with verbose
simply-mcp run server.ts --dry-run --verbose

# Get JSON output for parsing
simply-mcp run server.ts --dry-run --json | jq .
```

---

## Troubleshooting

Common issues and solutions.

### Command Not Found

**Problem:** `simply-mcp: command not found`

**Solution:**

```bash
# Install globally
npm install -g simply-mcp

# Or use npx
npx simply-mcp run server.ts

# Check installation
npm list -g simply-mcp
```

### TypeScript Errors

**Problem:** `Cannot compile TypeScript`

**Solution:**

```bash
# tsx is bundled with simply-mcp, but verify
npm install tsx

# Use npx to ensure latest
npx simply-mcp run server.ts
```

### Port Already in Use

**Problem:** `Error: Port 3000 is already in use`

**Solution:**

```bash
# Use different port
simply-mcp run server.ts --http --port 8080

# Find what's using the port (Linux/Mac)
lsof -i :3000

# Kill process using port
kill $(lsof -t -i:3000)
```

### Watch Mode Not Working

**Problem:** Watch mode doesn't detect changes

**Solution:**

```bash
# Use polling mode
simply-mcp run server.ts --watch --watch-poll

# Increase polling interval
simply-mcp run server.ts --watch --watch-poll --watch-interval 1000

# Check verbose output
simply-mcp run server.ts --watch --verbose
```

### Server Won't Stop

**Problem:** `simply-mcp stop` doesn't stop server

**Solution:**

```bash
# Use force kill
simply-mcp stop my-server --force

# Find PID and kill manually
simply-mcp list
kill -9 <PID>

# Clean up dead servers
simply-mcp list --cleanup
```

### Bundle Too Large

**Problem:** Bundle is 5-12 MB (beta.3 issue)

**Solution:**

```bash
# Use minification (reduces by ~50%)
simply-mcp bundle server.ts --minify

# Mark large dependencies as external
simply-mcp bundle server.ts -e axios,lodash

# This is expected in beta.3
# Future releases will optimize bundle size
```

### Validation Fails

**Problem:** `--dry-run` reports errors

**Solution:**

```bash
# Check verbose output
simply-mcp run server.ts --dry-run --verbose

# Get JSON details
simply-mcp run server.ts --dry-run --json | jq .errors

# Verify API style
simply-mcp run server.ts --dry-run --style decorator
```

### API Style Detection Issues

**Problem:** Wrong API style detected

**Solution:**

```bash
# Force specific style
simply-mcp run server.ts --style decorator
simply-mcp run server.ts --style interface
simply-mcp run server.ts --style functional

# Use explicit command
simply-mcp-class server.ts
simply-mcp-interface server.ts
simply-mcp-func server.ts

# Check verbose output
simply-mcp run server.ts --verbose
```

---

## Summary

This CLI reference documents all commands, options, and usage patterns for Simply MCP v2.5.0-beta.3.

**Key Points:**
- **13 command aliases** documented (main + variations)
- **50+ options and flags** across all commands
- **All API styles supported**: Interface, Decorator, Functional, MCP Builder, Programmatic
- **Multiple transports**: STDIO (default) and HTTP (stateful/stateless)
- **Development features**: Watch mode, debugging, dry-run validation
- **Production features**: Bundling, minification, deployment

**Next Steps:**
- [Getting Started Guide](./GETTING_STARTED_GUIDE.md) - Basic usage
- [Watch Mode Guide](./WATCH_MODE_GUIDE.md) - Auto-restart development
- [Bundling Guide](./BUNDLING.md) - Create distributions
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment

**Get Help:**
- GitHub Issues: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues
- Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts
- CLI Help: `simply-mcp --help`

---

**Version:** 2.5.0-beta.3
**Last Updated:** 2025-10-09
**License:** MIT
