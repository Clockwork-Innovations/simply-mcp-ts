# Bundle Usage Guide

Complete guide for running and using SimpleMCP package bundles as MCP servers.

## Table of Contents

- [What are Package Bundles?](#what-are-package-bundles)
- [Quick Start](#quick-start)
- [When to Use Bundles](#when-to-use-bundles)
- [Running Bundles](#running-bundles)
- [Entry Point Resolution](#entry-point-resolution)
- [Package Managers](#package-managers)
- [Environment Variables](#environment-variables)
- [Transport Options](#transport-options)
- [Common Issues](#common-issues)
- [Advanced Usage](#advanced-usage)
- [Best Practices](#best-practices)

---

## What are Package Bundles?

Package bundles are complete npm package directories that can be run as MCP servers. Unlike single-file servers, bundles include:

- **package.json** with metadata and dependencies
- **Source code** organized in directories
- **Dependencies** managed by npm/pnpm/yarn/bun
- **Configuration files** (.env, config files, etc.)
- **Assets** (JSON data, templates, etc.)

### Bundle Structure

```
my-mcp-server/
├── package.json          # Required: name, version, entry point
├── README.md             # Recommended
├── .env                  # Optional: environment variables
├── src/
│   ├── server.ts         # Entry point
│   └── tools/
│       └── my-tool.ts    # Tool implementations
└── node_modules/         # Auto-installed dependencies
```

---

## Quick Start

### Run a Bundle

```bash
# Run any directory with package.json
simplymcp run ./my-mcp-server

# Run with HTTP transport
simplymcp run ./my-mcp-server --http --port 3000

# Run with verbose output
simplymcp run ./my-mcp-server --verbose
```

### Example Output

```
[BundleRunner] Detected package bundle: ./my-mcp-server
[BundleRunner] Package: my-mcp-server@1.0.0
[BundleRunner] Description: My awesome MCP server
[BundleRunner] Dependencies already installed
[BundleRunner] Resolved entry point: /full/path/to/src/server.ts
[BundleRunner] Detected API style: functional
[Adapter] Server: my-server v1.0.0
[Adapter] Loaded: 5 tools, 2 prompts, 1 resources
[Server] Listening on stdio...
```

---

## When to Use Bundles

### Use Package Bundles When:

✅ **Distributing servers** - Share complete servers via npm or GitHub
✅ **Complex dependencies** - Multiple npm packages required
✅ **Team collaboration** - Multiple files and organized structure
✅ **Version management** - Track server versions with semantic versioning
✅ **Environment configuration** - Need .env files or config files
✅ **Asset files** - Include JSON data, templates, or other resources

### Use Single Files When:

❌ **Simple servers** - One or two tools, no dependencies
❌ **Quick prototypes** - Testing concepts quickly
❌ **Standalone scripts** - No external dependencies needed

---

## Running Bundles

### Basic Execution

```bash
# Run bundle from current directory
simplymcp run .

# Run bundle from subdirectory
simplymcp run ./packages/my-server

# Run bundle with absolute path
simplymcp run /home/user/projects/my-server
```

### Auto-Install Dependencies

By default, SimpleMCP automatically installs dependencies if not present:

```bash
# Auto-install enabled (default)
simplymcp run ./my-server

# Disable auto-install
simplymcp run ./my-server --no-auto-install

# Force reinstall dependencies
simplymcp run ./my-server --force-install
```

### Specify Package Manager

```bash
# Auto-detect package manager (default)
simplymcp run ./my-server

# Use specific package manager
simplymcp run ./my-server --package-manager npm
simplymcp run ./my-server --package-manager pnpm
simplymcp run ./my-server --package-manager yarn
simplymcp run ./my-server --package-manager bun
```

### All CLI Flags Work

All `simplymcp run` flags work with bundles:

```bash
# HTTP transport
simplymcp run ./my-server --http --port 3000

# Watch mode
simplymcp run ./my-server --watch

# Debug mode
simplymcp run ./my-server --inspect

# Dry-run validation
simplymcp run ./my-server --dry-run

# Force API style
simplymcp run ./my-server --style functional

# Verbose output
simplymcp run ./my-server --verbose
```

---

## Entry Point Resolution

SimpleMCP automatically finds your server entry point using this priority order:

### 1. `bin` Field (Highest Priority)

**package.json:**
```json
{
  "name": "my-server",
  "version": "1.0.0",
  "bin": {
    "my-server": "./dist/index.js"
  }
}
```

**or string format:**
```json
{
  "bin": "./src/server.ts"
}
```

### 2. `main` Field

**package.json:**
```json
{
  "name": "my-server",
  "version": "1.0.0",
  "main": "./src/server.ts"
}
```

### 3. `module` Field (ESM)

**package.json:**
```json
{
  "name": "my-server",
  "version": "1.0.0",
  "module": "./src/server.js",
  "type": "module"
}
```

### 4. Default Locations (Fallback)

If no fields are specified, SimpleMCP checks these locations:

1. `src/server.ts`
2. `src/server.js`
3. `src/index.ts`
4. `src/index.js`
5. `server.ts`
6. `server.js`
7. `index.ts`
8. `index.js`

### Verify Entry Point

Use `--verbose` to see which entry point was resolved:

```bash
simplymcp run ./my-server --verbose
```

Output:
```
[BundleRunner] Resolved entry point: /full/path/to/src/server.ts
```

---

## Package Managers

SimpleMCP supports all major Node.js package managers with auto-detection.

### Auto-Detection

SimpleMCP detects the package manager by checking for lock files:

| Lock File | Package Manager |
|-----------|----------------|
| `pnpm-lock.yaml` | pnpm |
| `yarn.lock` | yarn |
| `bun.lockb` | bun |
| `package-lock.json` | npm |
| *(no lock file)* | npm (default) |

### Manual Selection

```bash
# Use npm
simplymcp run ./my-server --package-manager npm

# Use pnpm
simplymcp run ./my-server --package-manager pnpm

# Use yarn
simplymcp run ./my-server --package-manager yarn

# Use bun
simplymcp run ./my-server --package-manager bun
```

### Installation Process

When dependencies need to be installed:

1. **Detection** - Check if `node_modules/` exists
2. **Package Manager** - Detect or use specified manager
3. **Install** - Run `npm install` (or equivalent)
4. **Verify** - Ensure installation succeeded
5. **Execute** - Run the server

### Disable Auto-Install

```bash
# Skip automatic dependency installation
simplymcp run ./my-server --no-auto-install
```

**Warning:** Server may fail if dependencies are missing!

---

## Environment Variables

### Using .env Files

Create a `.env` file in your bundle directory:

**.env:**
```bash
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Database
DATABASE_URL=postgresql://localhost/mydb

# Server Config
PORT=3000
NODE_ENV=production
```

### Loading Environment Variables

SimpleMCP doesn't automatically load `.env` files. Load them in your server:

**Option 1: Use dotenv**

```typescript
import 'dotenv/config';

export default {
  name: 'my-server',
  version: '1.0.0',
  tools: [
    {
      name: 'api-call',
      execute: async () => {
        const apiKey = process.env.OPENAI_API_KEY;
        // Use apiKey...
      }
    }
  ]
};
```

**Option 2: Manual loading**

```typescript
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env file
const envFile = readFileSync(resolve(__dirname, '../.env'), 'utf-8');
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.trim();
  }
});
```

### Runtime Environment Variables

```bash
# Set environment variables at runtime
OPENAI_API_KEY=sk-... simplymcp run ./my-server

# Multiple variables
NODE_ENV=production API_KEY=abc123 simplymcp run ./my-server
```

---

## Transport Options

### STDIO Transport (Default)

```bash
# Default: STDIO transport
simplymcp run ./my-server

# Explicit STDIO
simplymcp run ./my-server --transport stdio
```

**Best for:**
- Claude Desktop integration
- CLI tools
- Single-client scenarios

### HTTP Transport

```bash
# Enable HTTP transport
simplymcp run ./my-server --http --port 3000

# Custom port
simplymcp run ./my-server --http --port 8080

# Use PORT environment variable
PORT=4000 simplymcp run ./my-server --http
```

**Best for:**
- Web applications
- Multiple clients
- Remote access

### Stateless HTTP

```bash
# Stateless mode (no sessions)
simplymcp run ./my-server --http-stateless --port 3000
```

**Best for:**
- AWS Lambda
- Serverless functions
- Load-balanced deployments

See [Transport Guide](./TRANSPORT_GUIDE.md) for more details.

---

## Common Issues

### Issue: Dependencies Not Found

**Problem:**
```
Error: Cannot find module 'axios'
```

**Solutions:**

```bash
# 1. Enable auto-install (default)
simplymcp run ./my-server

# 2. Force reinstall
simplymcp run ./my-server --force-install

# 3. Manual install
cd my-server
npm install
cd ..
simplymcp run ./my-server
```

### Issue: Entry Point Not Found

**Problem:**
```
Error: Could not resolve entry point
```

**Solutions:**

```bash
# 1. Check package.json has required fields
cat my-server/package.json

# 2. Add main field
{
  "main": "./src/server.ts"
}

# 3. Use default locations
mv my-server/app.ts my-server/src/server.ts

# 4. Use verbose to see what's checked
simplymcp run ./my-server --verbose
```

### Issue: Wrong API Style Detected

**Problem:**
```
Server doesn't start or behaves incorrectly
```

**Solutions:**

```bash
# 1. Force specific API style
simplymcp run ./my-server --style functional
simplymcp run ./my-server --style decorator
simplymcp run ./my-server --style interface

# 2. Check with verbose
simplymcp run ./my-server --verbose

# 3. Validate with dry-run
simplymcp run ./my-server --dry-run --verbose
```

### Issue: Port Already in Use

**Problem:**
```
Error: Port 3000 is already in use
```

**Solutions:**

```bash
# 1. Use different port
simplymcp run ./my-server --http --port 8080

# 2. Find what's using the port
lsof -i :3000          # macOS/Linux
netstat -ano | find "3000"  # Windows

# 3. Kill process on port
kill $(lsof -t -i:3000)     # macOS/Linux
```

### Issue: Package Manager Not Found

**Problem:**
```
Error: pnpm not found
```

**Solutions:**

```bash
# 1. Install package manager
npm install -g pnpm
npm install -g yarn

# 2. Use different package manager
simplymcp run ./my-server --package-manager npm

# 3. Disable auto-install and install manually
cd my-server && npm install && cd ..
simplymcp run ./my-server --no-auto-install
```

---

## Advanced Usage

### Configuration File Integration

Use bundles with SimpleMCP config files:

**simplymcp.config.ts:**
```typescript
export default {
  servers: {
    'my-server': {
      entry: './packages/my-server',  // Bundle path
      http: true,
      port: 3000,
      verbose: true
    }
  }
};
```

**Run:**
```bash
simplymcp run my-server
```

### Multi-Server with Bundles

```bash
# Run multiple bundle servers
simplymcp run ./server1 ./server2 ./server3

# Automatically enables HTTP transport
# Each server gets its own port (3000, 3001, 3002...)
```

### Watch Mode with Bundles

```bash
# Watch for changes and auto-restart
simplymcp run ./my-server --watch

# Watch with verbose output
simplymcp run ./my-server --watch --verbose

# Watch with custom interval
simplymcp run ./my-server --watch --watch-interval 500
```

### Debug Bundle Servers

```bash
# Enable Node.js inspector
simplymcp run ./my-server --inspect

# Break on first line
simplymcp run ./my-server --inspect-brk

# Custom inspector port
simplymcp run ./my-server --inspect --inspect-port 9230
```

### Validate Bundle Before Running

```bash
# Dry-run validation
simplymcp run ./my-server --dry-run

# Get JSON output
simplymcp run ./my-server --dry-run --json

# Validate with specific style
simplymcp run ./my-server --dry-run --style functional
```

---

## Best Practices

### 1. Always Include package.json

**Required fields:**
```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "main": "./src/server.ts"
}
```

**Recommended fields:**
```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "description": "My awesome MCP server",
  "main": "./src/server.ts",
  "author": "Your Name",
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### 2. Use Semantic Versioning

```json
{
  "version": "1.0.0"  // MAJOR.MINOR.PATCH
}
```

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### 3. Add README.md

Include usage instructions:

```markdown
# My MCP Server

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
simplymcp run .
\`\`\`

## Configuration
Set these environment variables:
- `API_KEY` - Your API key
- `PORT` - HTTP port (default: 3000)
```

### 4. Include .env.example

Show required environment variables:

```bash
# .env.example
API_KEY=your-api-key-here
DATABASE_URL=postgresql://localhost/mydb
PORT=3000
```

Users copy to `.env` and fill in values.

### 5. Lock Dependencies

Commit lock files to ensure reproducible builds:

- `package-lock.json` (npm)
- `pnpm-lock.yaml` (pnpm)
- `yarn.lock` (yarn)
- `bun.lockb` (bun)

### 6. Use .gitignore

```gitignore
# Dependencies
node_modules/

# Environment
.env
.env.local

# Build output
dist/
*.log

# OS files
.DS_Store
Thumbs.db
```

### 7. Specify Node Version

```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### 8. Test Locally First

```bash
# 1. Install dependencies
cd my-server && npm install

# 2. Test with verbose
simplymcp run . --verbose

# 3. Test with dry-run
simplymcp run . --dry-run

# 4. Test HTTP transport
simplymcp run . --http --port 3000
```

### 9. Document Bundle Structure

Add to README.md:

```markdown
## Project Structure

\`\`\`
my-mcp-server/
├── package.json          # Package metadata
├── README.md             # This file
├── .env.example          # Example environment variables
├── src/
│   ├── server.ts         # Main entry point
│   └── tools/
│       ├── tool1.ts      # Tool implementations
│       └── tool2.ts
└── node_modules/         # Dependencies (auto-installed)
\`\`\`
```

### 10. Version Your Bundle

Use git tags:

```bash
# Tag a release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Update package.json version
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.1 -> 1.1.0
npm version major  # 1.1.0 -> 2.0.0
```

---

## Related Documentation

- [Bundle Creation Guide](./BUNDLE_CREATION.md) - How to create bundles
- [CLI Reference](./CLI_REFERENCE.md) - Complete CLI documentation
- [Quick Start](./QUICK_START.md) - 5-minute intro to SimpleMCP
- [Documentation Index](../README.md) - Complete documentation map

---

## Need Help?

- **GitHub Issues**: [Report a bug or request a feature](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- **Documentation**: [Browse all guides](https://github.com/Clockwork-Innovations/simply-mcp-ts/tree/main/docs)
- **CLI Help**: `simplymcp run --help`

---

**Version:** 3.0.0+
**Last Updated:** 2025-10-17
**License:** MIT
