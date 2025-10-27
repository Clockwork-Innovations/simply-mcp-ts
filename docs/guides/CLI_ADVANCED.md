# CLI Advanced

Advanced CLI features, debugging, bundling, and configuration management.

## Table of Contents

- [Bundle Command](#bundle-command)
- [Debugging Options](#debugging-options)
- [Management Commands](#management-commands)
- [Configuration Files](#configuration-files)
- [Environment Variables](#environment-variables)
- [Advanced Examples](#advanced-examples)
- [Troubleshooting](#troubleshooting)
- [Related Guides](#related-guides)

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

### Output Options

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--output <path>` | `-o` | string | `dist/bundle.js` | Output file/directory path |

### Build Options

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--minify` | `-m` | boolean | true | Minify output |
| `--no-minify` | - | boolean | - | Disable minification |
| `--sourcemap` | `-s` | boolean | false | Generate source maps |
| `--platform <plat>` | `-p` | string | `node` | Target platform |
| `--target <tgt>` | `-t` | string | `node20` | Target Node.js version |
| `--tree-shake` | - | boolean | true | Enable tree-shaking |
| `--no-tree-shake` | - | boolean | - | Disable tree-shaking |

### Dependencies

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--external <pkgs>` | `-e` | string | - | External packages (comma-separated) |
| `--auto-install` | - | boolean | false | Auto-install dependencies |
| `--assets <files>` | - | string | - | Include assets (comma-separated) |

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

---

## Debugging Options

Enable Node.js inspector for debugging.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--inspect` | boolean | false | Enable inspector |
| `--inspect-brk` | boolean | false | Break on first line |
| `--inspect-port <port>` | number | 9229 | Inspector port |

### Examples

```bash
# Enable debugger
simply-mcp run server.ts --inspect

# Break on first line
simply-mcp run server.ts --inspect-brk

# Custom inspector port
simply-mcp run server.ts --inspect --inspect-port 9230
```

### How to Use

1. Start server with `--inspect` or `--inspect-brk`
2. Open `chrome://inspect` in Chrome
3. Click "inspect" on your server
4. Use Chrome DevTools to debug

---

## Management Commands

Commands for managing running MCP servers.

### simply-mcp list

List all running MCP servers.

**Syntax:**
```bash
simply-mcp list [options]
```

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--verbose` | `-v` | boolean | false | Show detailed information |
| `--cleanup` | `-c` | boolean | false | Remove dead servers from registry |
| `--json` | - | boolean | false | Output in JSON format |

**Examples:**

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

### simply-mcp stop

Stop running MCP servers.

**Syntax:**
```bash
simply-mcp stop [target] [options]
```

**Arguments:**

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `target` | string | No | PID, server name, group ID, or "all" |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--force` | `-f` | boolean | false | Force kill (SIGKILL) |
| `--group <id>` | `-g` | string | - | Stop all servers in group |

**Examples:**

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

### simply-mcp config

Manage SimpleMCP configuration files.

**Syntax:**
```bash
simply-mcp config <action> [options]
```

**Actions:**

| Action | Description |
|--------|-------------|
| `show` | Show current configuration |
| `validate` | Validate configuration file |
| `list` | List available servers in config |
| `init` | Initialize new config file |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--config <path>` | `-c` | string | auto-detect | Path to config file |
| `--format <fmt>` | `-f` | string | `ts` | Config format (init only) |

**Examples:**

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

## Advanced Examples

### Production Deployment

```bash
# Create production bundle
simply-mcp bundle server.ts \
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

### Package.json Scripts

Add convenient npm scripts:

```json
{
  "scripts": {
    "dev": "simply-mcp run server.ts --watch",
    "dev:http": "simply-mcp run server.ts --watch --http --port 3000",
    "start": "simply-mcp run server.ts",
    "validate": "simply-mcp run server.ts --dry-run",
    "bundle": "simply-mcp bundle server.ts -o dist/server.js",
    "debug": "simply-mcp run server.ts --inspect-brk"
  }
}
```

---

## Troubleshooting

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

---

## Related Guides

- [CLI Basics](./CLI_BASICS.md) - Core CLI commands
- [Bundling Guide](./BUNDLING.md) - Complete bundling documentation
- [Watch Mode Guide](./WATCH_MODE_GUIDE.md) - Auto-restart development
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment

