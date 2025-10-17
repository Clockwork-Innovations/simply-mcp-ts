# Bundle Creation Guide

Complete guide for creating package bundles for SimpleMCP servers.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Using create-bundle Command](#using-create-bundle-command)
- [Manual Bundle Creation](#manual-bundle-creation)
- [Bundle Formats](#bundle-formats)
- [Package.json Configuration](#packagejson-configuration)
- [Project Structure](#project-structure)
- [Dependencies](#dependencies)
- [Best Practices](#best-practices)
- [Publishing Bundles](#publishing-bundles)
- [Examples](#examples)

---

## Overview

SimpleMCP provides two ways to create package bundles:

1. **Automatic**: Use `simplymcp create-bundle` command
2. **Manual**: Create the structure yourself

Both methods produce the same result: a complete npm package that can be distributed and run as an MCP server.

### What Gets Created

```
my-mcp-server/
├── package.json          # Package metadata and dependencies
├── README.md             # Usage instructions
├── .env.example          # Example environment variables
└── src/
    └── server.ts         # Your server code (copied from source)
```

---

## Quick Start

### Create Bundle from Existing Server

```bash
# Create bundle from a server file
simplymcp create-bundle --from server.ts --output ./my-bundle

# With custom name and description
simplymcp create-bundle \
  --from server.ts \
  --output ./my-bundle \
  --name my-awesome-server \
  --description "My awesome MCP server"
```

### Create Bundle using Bundle Command

```bash
# Alternative: Use bundle command with package format
simplymcp bundle server.ts --format package --output ./my-bundle
```

---

## Using create-bundle Command

The `create-bundle` command automates bundle creation from an existing server file.

### Basic Usage

```bash
simplymcp create-bundle --from <source-file> --output <bundle-dir>
```

### Command Options

| Option | Required | Description | Example |
|--------|----------|-------------|---------|
| `--from` | Yes | Source server file (.ts or .js) | `--from server.ts` |
| `--output` | Yes | Output directory for bundle | `--output ./my-bundle` |
| `--name` | No | Bundle name (default: filename) | `--name my-server` |
| `--description` | No | Bundle description | `--description "Weather server"` |
| `--author` | No | Author name | `--author "John Doe"` |
| `--version` | No | Initial version | `--version 1.0.0` |

### Examples

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

### What It Does

1. **Validates** source file exists and is .ts or .js
2. **Analyzes** imports to detect dependencies
3. **Creates** output directory structure
4. **Copies** source file to `src/server.ts`
5. **Generates** package.json with dependencies
6. **Creates** README.md with usage instructions
7. **Adds** .env.example template

### Output

```
SimplyMCP Bundle Creator
========================

Source:  /full/path/to/server.ts
Output:  /full/path/to/my-bundle
Name:    my-server
Version: 1.0.0

Analyzing dependencies...
Found 3 dependencies

Creating directory structure...
Copying source file...
Generating package.json...
Generating README.md...
Generating .env.example...

✓ Bundle created successfully!

Bundle structure:
  my-bundle/
  ├── package.json
  ├── README.md
  ├── .env.example
  └── src/
      └── server.ts

Next steps:
  1. cd my-bundle
  2. npm install
  3. npx simply-mcp run .
```

---

## Manual Bundle Creation

Create bundles manually for full control over structure and configuration.

### Step 1: Create Directory Structure

```bash
# Create bundle directory
mkdir my-mcp-server
cd my-mcp-server

# Create source directory
mkdir src
```

### Step 2: Create package.json

```bash
npm init -y
```

Edit package.json:

```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "description": "My MCP server",
  "type": "module",
  "main": "./src/server.ts",
  "bin": "./src/server.ts",
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "simply-mcp": "latest"
  },
  "author": "Your Name",
  "license": "MIT"
}
```

### Step 3: Create Server File

**src/server.ts:**

```typescript
/**
 * My MCP Server
 */

export default {
  name: 'my-mcp-server',
  version: '1.0.0',
  tools: [
    {
      name: 'hello',
      description: 'Say hello',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name to greet' }
        },
        required: ['name']
      },
      execute: async (args: any) => {
        return `Hello, ${args.name}!`;
      }
    }
  ]
};
```

### Step 4: Create README.md

```markdown
# My MCP Server

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

Run with SimpleMCP:

\`\`\`bash
npx simply-mcp run .
\`\`\`

Or with HTTP transport:

\`\`\`bash
npx simply-mcp run . --http --port 3000
\`\`\`

## Tools

- `hello` - Say hello to someone

## Configuration

No configuration required.
```

### Step 5: Create .env.example

```bash
# Example environment variables
# Copy to .env and fill in values

# API_KEY=your-api-key-here
# DATABASE_URL=your-database-url
```

### Step 6: Install Dependencies

```bash
npm install
```

### Step 7: Test Bundle

```bash
# Test locally
npx simply-mcp run .

# Test with verbose output
npx simply-mcp run . --verbose

# Test with dry-run
npx simply-mcp run . --dry-run
```

---

## Bundle Formats

SimpleMCP supports multiple bundle output formats.

### Package Format (Recommended)

Complete npm package with source code and dependencies.

```bash
simplymcp create-bundle --from server.ts --output ./my-bundle

# Or using bundle command
simplymcp bundle server.ts --format package --output ./my-bundle
```

**Best for:**
- Distribution via npm
- Team collaboration
- Development and iteration

**Structure:**
```
my-bundle/
├── package.json
├── README.md
├── .env.example
└── src/
    └── server.ts
```

### Single-File Format

Bundled into a single executable JavaScript file.

```bash
simplymcp bundle server.ts --format single-file --output dist/server.js
```

**Best for:**
- Simple distribution
- No native dependencies
- Maximum portability

**Structure:**
```
dist/
└── server.js     # Everything bundled
```

### Standalone Format

Directory with bundled code and native modules.

```bash
simplymcp bundle server.ts --format standalone --output dist/
```

**Best for:**
- Servers with native dependencies
- Database drivers (sqlite3, pg, etc.)
- Image processing libraries

**Structure:**
```
dist/
├── index.js
└── node_modules/
    └── native-modules/
```

---

## Package.json Configuration

### Required Fields

```json
{
  "name": "my-mcp-server",
  "version": "1.0.0"
}
```

### Recommended Fields

```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "description": "My awesome MCP server",
  "type": "module",
  "main": "./src/server.ts",
  "author": "Your Name <you@example.com>",
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0"
  },
  "keywords": ["mcp", "server", "ai"],
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/my-mcp-server"
  }
}
```

### Entry Point Fields

**Option 1: Use `main` field**
```json
{
  "main": "./src/server.ts"
}
```

**Option 2: Use `bin` field**
```json
{
  "bin": {
    "my-server": "./src/server.ts"
  }
}
```

**Option 3: Use `module` field (ESM)**
```json
{
  "type": "module",
  "module": "./src/server.js"
}
```

### Dependencies

```json
{
  "dependencies": {
    "simply-mcp": "^3.0.0",
    "axios": "^1.6.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0"
  }
}
```

### Scripts

```json
{
  "scripts": {
    "start": "npx simply-mcp run .",
    "dev": "npx simply-mcp run . --watch",
    "validate": "npx simply-mcp run . --dry-run",
    "build": "npx simply-mcp bundle src/server.ts -o dist/"
  }
}
```

---

## Project Structure

### Minimal Structure

```
my-mcp-server/
├── package.json          # Metadata and dependencies
└── src/
    └── server.ts         # Server code
```

### Recommended Structure

```
my-mcp-server/
├── package.json          # Metadata
├── README.md             # Documentation
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
├── tsconfig.json         # TypeScript config (optional)
└── src/
    ├── server.ts         # Main entry point
    └── tools/
        ├── tool1.ts      # Tool implementations
        └── tool2.ts
```

### Advanced Structure

```
my-mcp-server/
├── package.json
├── README.md
├── .env.example
├── .gitignore
├── tsconfig.json
├── src/
│   ├── server.ts         # Main entry
│   ├── config.ts         # Configuration
│   ├── tools/
│   │   ├── index.ts
│   │   ├── api-tool.ts
│   │   └── data-tool.ts
│   ├── prompts/
│   │   └── templates.ts
│   └── resources/
│       └── data.ts
├── data/
│   └── sample-data.json  # Asset files
└── tests/
    └── server.test.ts    # Tests
```

---

## Dependencies

### Auto-Detection

The `create-bundle` command automatically detects dependencies from imports:

```typescript
// These imports are detected:
import axios from 'axios';              // → axios
import { z } from 'zod';                // → zod
import '@types/node';                   // → @types/node

// These are skipped:
import './local-file';                  // Local import
import 'node:fs';                       // Node.js built-in
```

### Manually Add Dependencies

After bundle creation, add more dependencies:

```bash
cd my-bundle
npm install axios dotenv lodash
```

Update package.json:
```json
{
  "dependencies": {
    "simply-mcp": "latest",
    "axios": "^1.6.0",
    "dotenv": "^16.0.0",
    "lodash": "^4.17.21"
  }
}
```

### Version Pinning

**Recommended for production:**
```json
{
  "dependencies": {
    "simply-mcp": "3.0.0",        // Exact version
    "axios": "~1.6.0",            // Patch updates only
    "dotenv": "^16.0.0"           // Minor updates allowed
  }
}
```

### Dev Dependencies

```bash
npm install --save-dev typescript @types/node
```

```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## Best Practices

### 1. Use Semantic Versioning

```json
{
  "version": "1.0.0"  // MAJOR.MINOR.PATCH
}
```

- **MAJOR**: Breaking changes (1.0.0 → 2.0.0)
- **MINOR**: New features (1.0.0 → 1.1.0)
- **PATCH**: Bug fixes (1.0.0 → 1.0.1)

### 2. Add Comprehensive README

Include:
- Installation instructions
- Usage examples
- Tool descriptions
- Configuration options
- Environment variables
- Troubleshooting

### 3. Include .env.example

Show all required environment variables:

```bash
# .env.example
API_KEY=your-api-key-here
DATABASE_URL=postgresql://localhost/mydb
PORT=3000
LOG_LEVEL=info
```

### 4. Add .gitignore

```gitignore
# Dependencies
node_modules/

# Environment
.env
.env.local
.env.production

# Build output
dist/
build/
*.log

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
```

### 5. Specify Node Version

```json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=9.0.0"
  }
}
```

### 6. Use TypeScript (Recommended)

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 7. Test Before Publishing

```bash
# 1. Install dependencies
npm install

# 2. Test locally
npx simply-mcp run . --verbose

# 3. Validate
npx simply-mcp run . --dry-run

# 4. Test different transports
npx simply-mcp run . --http --port 3000

# 5. Test watch mode
npx simply-mcp run . --watch
```

### 8. Add Scripts to package.json

```json
{
  "scripts": {
    "start": "simplymcp run .",
    "dev": "simplymcp run . --watch --verbose",
    "validate": "simplymcp run . --dry-run",
    "test": "node --test",
    "build": "simplymcp bundle src/server.ts -o dist/",
    "prepare": "npm run build"
  }
}
```

### 9. Document Tool APIs

Add JSDoc comments:

```typescript
/**
 * Get current weather for a location
 * @param location - City name or coordinates
 * @returns Weather information
 */
{
  name: 'get-weather',
  description: 'Get current weather for a location',
  // ...
}
```

### 10. Version Control

```bash
# Initialize git
git init

# Add files
git add .

# Create first commit
git commit -m "Initial commit"

# Tag version
git tag -a v1.0.0 -m "Release v1.0.0"
```

---

## Publishing Bundles

### Publish to npm

```bash
# 1. Login to npm
npm login

# 2. Publish package
npm publish

# 3. Publish with public access (scoped packages)
npm publish --access public
```

### Publish to GitHub

```bash
# 1. Create GitHub repository
gh repo create my-mcp-server --public

# 2. Push code
git remote add origin https://github.com/yourusername/my-mcp-server.git
git push -u origin main

# 3. Create release
gh release create v1.0.0 --title "v1.0.0" --notes "Initial release"
```

### Publish to GitHub Packages

**package.json:**
```json
{
  "name": "@yourusername/my-mcp-server",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

```bash
npm publish
```

### Usage After Publishing

**From npm:**
```bash
# Install
npm install -g my-mcp-server

# Run
simplymcp run my-mcp-server
```

**From GitHub:**
```bash
# Clone
git clone https://github.com/yourusername/my-mcp-server.git

# Install and run
cd my-mcp-server
npm install
simplymcp run .
```

---

## Examples

### Example 1: Weather Server Bundle

```bash
# Create bundle
simplymcp create-bundle \
  --from weather-server.ts \
  --output ./weather-bundle \
  --name weather-mcp-server \
  --description "Get weather forecasts and current conditions"

# Install dependencies
cd weather-bundle
npm install axios dotenv

# Add environment variables
echo "WEATHER_API_KEY=your-key" > .env

# Test
npx simply-mcp run .
```

### Example 2: Database Server Bundle

```bash
# Create bundle
simplymcp create-bundle \
  --from db-server.ts \
  --output ./db-bundle \
  --name database-mcp-server

# Install database driver
cd db-bundle
npm install pg

# Configure database
echo "DATABASE_URL=postgresql://localhost/mydb" > .env

# Test
npx simply-mcp run . --verbose
```

### Example 3: Multi-Tool Server

**Create complex server structure:**

```bash
mkdir -p my-server/src/tools
cd my-server

# Create package.json
npm init -y

# Create server file
cat > src/server.ts << 'EOF'
import { weatherTools } from './tools/weather.js';
import { dataTools } from './tools/data.js';

export default {
  name: 'multi-tool-server',
  version: '1.0.0',
  tools: [
    ...weatherTools,
    ...dataTools
  ]
};
EOF

# Create tool modules
cat > src/tools/weather.ts << 'EOF'
export const weatherTools = [
  {
    name: 'get-weather',
    description: 'Get current weather',
    parameters: { /* ... */ },
    execute: async (args: any) => { /* ... */ }
  }
];
EOF

cat > src/tools/data.ts << 'EOF'
export const dataTools = [
  {
    name: 'process-data',
    description: 'Process data',
    parameters: { /* ... */ },
    execute: async (args: any) => { /* ... */ }
  }
];
EOF

# Install and test
npm install
npx simply-mcp run .
```

---

## Related Documentation

- [Bundle Usage Guide](./BUNDLE_USAGE.md) - Running bundles
- [CLI Reference](./CLI_REFERENCE.md) - Complete CLI documentation
- [Getting Started](./GETTING_STARTED_GUIDE.md) - Basic usage
- [Bundling Guide](./BUNDLING.md) - Advanced bundling

---

## Need Help?

- **GitHub Issues**: [Report a bug or request a feature](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- **Documentation**: [Browse all guides](https://github.com/Clockwork-Innovations/simply-mcp-ts/tree/main/docs)
- **CLI Help**: `simplymcp create-bundle --help`

---

**Version:** 3.0.0+
**Last Updated:** 2025-10-17
**License:** MIT
