# Bundling Command

## Overview

SimplyMCP's **Bundling Command** packages your MCP servers into standalone, production-ready distributions that can be deployed anywhere without external dependencies. This feature transforms your TypeScript/JavaScript server into optimized bundles ready for any deployment scenario.

### What It Does

- Bundle entire SimplyMCP servers into single JavaScript files
- Create standalone distributions with minimal dependencies
- Generate optimized bundles for deployment
- Support multiple output formats (ESM, CJS, single-file, standalone)
- Automatically detect and externalize native modules
- Integrate seamlessly with inline dependencies (Feature 2) and auto-installation (Feature 3)
- Optimize bundles with minification and tree-shaking
- Generate source maps for production debugging
- Watch mode for development with automatic rebuilds

### Why It's Useful

- **Zero-Dependency Deployment**: Bundle everything into one file - no npm install required
- **Production Optimization**: Minified, tree-shaken code for smallest footprint
- **Easy Distribution**: Share a single file instead of an entire project
- **Platform Flexibility**: Deploy to servers, serverless, containers, or edge functions
- **Developer Experience**: Fast rebuilds with watch mode, source maps for debugging
- **CI/CD Ready**: One-command build process for automated pipelines
- **Cross-Platform**: Bundle for Node.js 18, 20, 22, or latest ECMAScript

### When to Use It

Use bundling when you want to:
- Deploy SimplyMCP servers to production environments
- Create serverless functions (AWS Lambda, Vercel, Cloudflare Workers)
- Distribute servers to end users without Node.js expertise
- Minimize deployment footprint (single file vs. node_modules)
- Optimize for cold start times in serverless environments
- Package servers for Docker containers
- Create CLI tools with embedded servers
- Enable offline deployments without npm registry access

## Status

- **Phase**: 2, Feature 4 (Final Phase 2 feature)
- **Status**: ✅ Implemented
- **Tested**: ✅ 118+ tests passing (100% pass rate)
  - 47 entry detection tests
  - 32 dependency resolution tests
  - 21 bundler tests
  - 18+ CLI integration tests
- **Available in**: SimplyMCP v1.4.0+
- **Integrates with**: Feature 2 (Inline Dependencies), Feature 3 (Auto-Installation)

## Quick Start

> **New in v2.4.7**: The default bundle format is now **ESM** instead of `single-file` (CommonJS). This means bundling now works out-of-the-box with modern MCP servers that use top-level `await`. If you need CommonJS, explicitly use `--format single-file`.

### Simplest Example (1 command)

```bash
simplemcp bundle server.ts
```

**Output:**
```
SimplyMCP Bundler
=================

Entry:    /path/to/server.ts
Output:   /path/to/dist/bundle.js
Format:   esm
Minify:   Yes
Platform: node
Target:   node20

✓ Bundle created successfully!

Output:   /path/to/dist/bundle.js
Size:     847.2 KB
Duration: 1234ms
Modules:  23
```

**Run the bundle:**
```bash
node dist/bundle.js
```

That's it! Your server is bundled and ready to deploy.

## Core Concepts

### Bundling Architecture

SimplyMCP bundling follows a multi-stage pipeline:

```
┌─────────────────┐
│  Entry Point    │
│  Detection      │  ← Auto-detect or explicit entry
└────────┬────────┘
         ↓
┌─────────────────┐
│  Dependency     │
│  Resolution     │  ← Merge inline deps + package.json
└────────┬────────┘
         ↓
┌─────────────────┐
│  Native Module  │
│  Detection      │  ← Auto-externalize native modules
└────────┬────────┘
         ↓
┌─────────────────┐
│  esbuild        │
│  Bundling       │  ← Bundle, minify, tree-shake
└────────┬────────┘
         ↓
┌─────────────────┐
│  Output         │
│  Formatting     │  ← Format based on output type
└─────────────────┘
```

### Bundle Formats

SimplyMCP supports 5 output formats:

#### 1. ESM Format (Default - New in v2.4.7)

Modern ECMAScript modules with top-level await support:

```bash
simplemcp bundle server.ts
# OR explicitly: simplemcp bundle server.ts --format esm
```

**Characteristics:**
- ES module format
- Import/export syntax
- **Supports top-level await** (the most common use case)
- Tree-shaking benefits
- Modern Node.js (18+) required

**Use cases:**
- Modern MCP servers using `await server.start()`
- Node.js 18+ environments
- Importing from other modules
- Maximum tree-shaking

**Output:**
```
dist/bundle.js  (ESM format)
```

**Note**: Prior to v2.4.7, the default was `single-file` (CommonJS), which didn't support top-level await. If you need CommonJS, use `--format single-file` explicitly.

#### 2. Single-File Format

Everything bundled into one CommonJS file:

```bash
simplemcp bundle server.ts --format single-file
```

**Characteristics:**
- All code and dependencies in one `.js` file
- CommonJS format (no top-level await)
- Minified and tree-shaken by default
- Native modules marked as external
- Smallest footprint (500KB - 2MB typical)

**Use cases:**
- Legacy Node.js compatibility
- Environments requiring CommonJS
- When top-level await is not needed

**Output:**
```
dist/bundle.js  (847 KB)
```

#### 3. Standalone Distribution

Complete directory with bundle + metadata:

```bash
simplemcp bundle server.ts --format standalone --output dist/
```

**Characteristics:**
- Bundle + minimal package.json
- README with deployment instructions
- .gitignore for clean repos
- Notes about native modules if present

**Use cases:**
- Traditional server deployments
- Docker containers
- Distribution to end users

**Output:**
```
dist/
├── bundle.js           # Bundled code
├── package.json        # Minimal runtime metadata
├── README.md          # Usage instructions
├── .gitignore         # Ignore patterns
└── NATIVE_MODULES.md  # Native deps (if any)
```

#### 4. CJS Format

Traditional CommonJS modules:

```bash
simplemcp bundle server.ts --format cjs
```

**Characteristics:**
- CommonJS format
- require/module.exports syntax
- Maximum compatibility
- Works with older Node.js

**Use cases:**
- Legacy Node.js compatibility
- CommonJS-only environments

### Entry Point Detection

SimplyMCP automatically detects entry points using multiple strategies:

#### Auto-Detection Priority

1. **Explicit CLI argument** (highest priority)
   ```bash
   simplemcp bundle server.ts
   ```

2. **package.json "main" field**
   ```json
   {
     "main": "./src/server.ts"
   }
   ```

3. **simplemcp.config.js entry**
   ```javascript
   export default {
     entry: './src/server.ts'
   }
   ```

4. **Convention-based detection**
   - `server.ts`
   - `index.ts`
   - `main.ts`
   - `src/server.ts`
   - `src/index.ts`
   - `src/main.ts`
   - (plus `.js` variants)

#### Validation

SimplyMCP validates that the entry point:
- Exists and is readable
- Imports SimplyMCP (`import { SimplyMCP }` or similar)
- Creates or exports a SimplyMCP instance (`new SimplyMCP(...)`)

**Error if invalid:**
```
Error: Entry point does not appear to import SimplyMCP: /path/to/file.ts
Expected: import { SimplyMCP } from "simplemcp" or similar
```

### Dependency Handling

SimplyMCP intelligently handles dependencies from multiple sources:

#### Dependency Sources (Priority Order)

1. **Inline dependencies** (Feature 2) - highest priority
   ```typescript
   // /// dependencies
   // axios@^1.6.0
   // zod@^3.22.0
   // ///
   ```

2. **package.json dependencies**
   ```json
   {
     "dependencies": {
       "axios": "^1.6.0"
     }
   }
   ```

3. **package.json devDependencies**
   ```json
   {
     "devDependencies": {
       "zod": "^3.22.0"
     }
   }
   ```

All sources are merged, with inline dependencies taking precedence.

#### Native Module Detection

SimplyMCP automatically detects native modules that cannot be bundled:

**Known native modules:**
- `fsevents` (macOS file watching)
- `better-sqlite3`, `sqlite3` (SQLite bindings)
- `sharp` (image processing)
- `canvas` (Canvas API)
- `@node-rs/*` (Rust native modules)
- `@napi-rs/*` (NAPI native modules)
- `esbuild`, `vite`, `swc` (bundlers with native components)

**Auto-externalized:**
```
External: fsevents, better-sqlite3
Native:   fsevents, better-sqlite3
```

These must be installed separately in the deployment environment.

#### Built-in Modules

Node.js built-in modules are always external:
- `fs`, `http`, `https`, `path`, `crypto`, etc.
- `node:fs`, `node:http` (Node.js 18+ prefix style)

### Integration with Previous Features

#### Feature 2: Inline Dependencies

Bundling automatically parses and includes inline dependencies:

```typescript
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

// Bundle includes both packages automatically
```

#### Feature 3: Auto-Installation

Combine bundling with auto-installation:

```bash
simplemcp bundle server.ts --auto-install
```

This will:
1. Parse inline dependencies
2. Auto-install missing packages
3. Bundle everything together

Perfect for CI/CD pipelines where dependencies aren't pre-installed.

## CLI Reference

### Command Syntax

```bash
simplemcp bundle [entry] [options]
```

### Arguments

#### `entry` (optional)

Entry point file. If omitted, auto-detection is used.

```bash
simplemcp bundle server.ts
simplemcp bundle src/index.ts
simplemcp bundle  # Auto-detect
```

### Options

#### `-o, --output <path>`

Output file or directory path.

```bash
simplemcp bundle server.ts --output dist/server.js
simplemcp bundle server.ts -o build/bundle.js
```

**Default:** `dist/bundle.js`

#### `-f, --format <format>`

Output format: `esm` | `single-file` | `standalone` | `cjs`

```bash
simplemcp bundle server.ts --format esm          # Default (v2.4.7+)
simplemcp bundle server.ts --format single-file  # CommonJS
simplemcp bundle server.ts --format standalone
simplemcp bundle server.ts -f cjs
```

**Default:** `esm` (changed in v2.4.7 to support top-level await)

#### `-m, --minify`

Enable minification (enabled by default in production).

```bash
simplemcp bundle server.ts --minify
simplemcp bundle server.ts -m
```

#### `--no-minify`

Disable minification.

```bash
simplemcp bundle server.ts --no-minify
```

**Use for:** Development builds, debugging

#### `-s, --sourcemap`

Generate source maps.

```bash
simplemcp bundle server.ts --sourcemap          # External source map
simplemcp bundle server.ts -s                   # External source map
```

**Default:** No source maps

#### `-p, --platform <platform>`

Target platform: `node` | `neutral`

```bash
simplemcp bundle server.ts --platform node      # Node.js (default)
simplemcp bundle server.ts --platform neutral   # Browser-like
simplemcp bundle server.ts -p node
```

**Default:** `node`

#### `-t, --target <version>`

Target Node.js version or ECMAScript standard.

**Options:** `node18` | `node20` | `node22` | `esnext` | `es2020` | `es2021` | `es2022`

```bash
simplemcp bundle server.ts --target node18
simplemcp bundle server.ts --target node20      # Default
simplemcp bundle server.ts --target node22
simplemcp bundle server.ts --target esnext
simplemcp bundle server.ts -t es2022
```

**Default:** `node20`

#### `-e, --external <packages>`

External packages (comma-separated, not bundled).

```bash
simplemcp bundle server.ts --external fsevents
simplemcp bundle server.ts --external fsevents,sharp
simplemcp bundle server.ts -e better-sqlite3
```

**Auto-externalized:** Native modules, built-in Node.js modules

#### `--tree-shake`

Enable tree-shaking (enabled by default).

```bash
simplemcp bundle server.ts --tree-shake
```

#### `--no-tree-shake`

Disable tree-shaking.

```bash
simplemcp bundle server.ts --no-tree-shake
```

**Use for:** Debugging, preserving all code

#### `-c, --config <path>`

Config file path.

```bash
simplemcp bundle --config simplemcp.config.js
simplemcp bundle --config configs/prod.config.js
simplemcp bundle -c simplemcp.config.ts
```

**Default search:** `simplemcp.config.{js,ts,mjs,json}`, `mcp.config.{js,ts,json}`

#### `-w, --watch`

Watch mode for development.

```bash
simplemcp bundle server.ts --watch
simplemcp bundle server.ts -w
```

Auto-rebuilds on file changes. Press Ctrl+C to stop.

#### `--auto-install`

Auto-install dependencies before bundling (Feature 3).

```bash
simplemcp bundle server.ts --auto-install
```

Perfect for CI/CD when dependencies aren't installed.

#### `-v, --verbose`

Verbose output.

```bash
simplemcp bundle server.ts --verbose
simplemcp bundle server.ts -v
```

Shows detailed progress and debug information.

#### `-h, --help`

Show help.

```bash
simplemcp bundle --help
simplemcp bundle -h
```

## Configuration File

### Config File Formats

SimplyMCP supports multiple configuration formats:

- `simplemcp.config.js` (JavaScript, recommended)
- `simplemcp.config.ts` (TypeScript, type-safe)
- `simplemcp.config.mjs` (ESM modules)
- `simplemcp.config.json` (JSON, simple)
- `mcp.config.js` (Alternative naming)

### Basic Configuration

**simplemcp.config.js:**

```javascript
export default {
  entry: './src/server.ts',
  output: {
    dir: 'dist',
    filename: 'server.bundle.js',
    format: 'single-file',
  },
  bundle: {
    minify: true,
    sourcemap: false,
    platform: 'node',
    target: 'node20',
    external: ['fsevents', 'better-sqlite3'],
    treeShake: true,
  },
  autoInstall: false,
};
```

### TypeScript Configuration

**simplemcp.config.ts:**

```typescript
import { SimplyMCPConfig } from 'simplemcp/bundler';

export default {
  entry: './src/server.ts',
  output: {
    dir: 'dist',
    filename: 'server.bundle.js',
    format: 'single-file',
  },
  bundle: {
    minify: true,
    sourcemap: false,
    platform: 'node',
    target: 'node20',
    external: ['fsevents'],
    treeShake: true,
  },
} satisfies SimplyMCPConfig;
```

Benefits:
- Full type checking
- IntelliSense support
- Catch errors at config time

### Environment-Based Configuration

```javascript
const isProd = process.env.NODE_ENV === 'production';

export default {
  entry: './src/server.ts',
  output: {
    dir: 'dist',
    filename: isProd ? 'server.min.js' : 'server.dev.js',
    format: 'single-file',
  },
  bundle: {
    minify: isProd,
    sourcemap: !isProd,
    target: isProd ? 'node20' : 'esnext',
  },
};
```

**Run:**
```bash
NODE_ENV=development simplemcp bundle
NODE_ENV=production simplemcp bundle
```

### Configuration Schema

```typescript
interface SimplyMCPConfig {
  // Entry point
  entry?: string;

  // Output configuration
  output?: {
    dir?: string;              // Output directory
    filename?: string;         // Output filename
    format?: BundleFormat;     // Output format
  };

  // Bundle options
  bundle?: {
    minify?: boolean;          // Minify output
    sourcemap?: SourceMapType; // Source maps
    platform?: Platform;       // Target platform
    target?: Target;           // Target version
    external?: string[];       // External packages
    treeShake?: boolean;       // Tree-shaking
    banner?: string;           // Prepend to output
    footer?: string;           // Append to output
  };

  // Auto-install (Feature 3)
  autoInstall?: boolean;

  // Inline dependencies (Feature 2)
  dependencies?: Record<string, string>;
}

type BundleFormat = 'single-file' | 'standalone' | 'esm' | 'cjs';
type Platform = 'node' | 'neutral';
type Target = 'node18' | 'node20' | 'node22' | 'esnext' | 'es2020' | 'es2021' | 'es2022';
type SourceMapType = 'inline' | 'external' | 'both' | false;
```

### CLI Override

CLI options always override config file settings:

```bash
# Config says minify: true, CLI overrides
simplemcp bundle --no-minify

# Config says format: 'cjs', CLI overrides
simplemcp bundle --format esm
```

## Examples

### Example 1: Basic Bundle

Bundle a simple server:

```bash
simplemcp bundle server.ts
```

**Output:**
```
dist/bundle.js  (847 KB)
```

**Deploy:**
```bash
node dist/bundle.js
```

### Example 2: Production Bundle

Optimized production build:

```bash
simplemcp bundle server.ts \
  --output dist/server.js \
  --minify \
  --target node20 \
  --external fsevents
```

**Output:**
```
✓ Bundle created successfully!

Output:   dist/server.js
Size:     723.4 KB
Duration: 1456ms
Modules:  18
```

### Example 3: Development Bundle

Development with source maps and watch mode:

```bash
simplemcp bundle server.ts \
  --no-minify \
  --sourcemap \
  --watch
```

**Output:**
```
dist/bundle.js      (1.2 MB, readable)
dist/bundle.js.map  (source map)

Watching for changes... (press Ctrl+C to stop)
```

### Example 4: Standalone Distribution

Create complete distribution:

```bash
simplemcp bundle server.ts \
  --format standalone \
  --output dist/
```

**Output:**
```
dist/
├── bundle.js
├── package.json
├── README.md
└── .gitignore
```

### Example 5: ESM Bundle

Modern ECMAScript modules:

```bash
simplemcp bundle server.ts \
  --format esm \
  --output dist/server.mjs
```

### Example 6: Multiple Formats

Build multiple formats:

```bash
# Single-file for Lambda
simplemcp bundle server.ts --output lambda/index.js --format single-file

# Standalone for Docker
simplemcp bundle server.ts --output docker/ --format standalone

# ESM bundle for modern deployments
simplemcp bundle server.ts --output dist/ --format esm
```

### Example 7: CI/CD Pipeline

Auto-install and bundle in CI:

```bash
simplemcp bundle server.ts \
  --auto-install \
  --output dist/bundle.js
```

### Example 9: Custom Output Path

Specify custom paths:

```bash
simplemcp bundle src/index.ts --output build/prod/server.bundle.js
```

### Example 10: External Dependencies

Externalize large dependencies:

```bash
simplemcp bundle server.ts \
  --external axios,lodash,moment
```

Reduces bundle size by excluding these packages (must be installed separately).

### Example 11: Multi-Stage Docker

**Dockerfile:**
```dockerfile
# Stage 1: Build
FROM node:20 AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npx simplemcp bundle server.ts --output dist/bundle.js

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/bundle.js .
CMD ["node", "bundle.js"]
```

**Build:**
```bash
docker build -t myserver .
docker run -p 3000:3000 myserver
```

### Example 12: AWS Lambda

Bundle for AWS Lambda:

```bash
simplemcp bundle server.ts \
  --output lambda/index.js \
  --format single-file \
  --minify \
  --target node20 \
  --external aws-sdk
```

**lambda/handler.js:**
```javascript
import bundle from './index.js';

export const handler = async (event, context) => {
  return await bundle.handleRequest(event);
};
```

### Example 13: Vercel Edge Function

Bundle for Vercel:

```bash
simplemcp bundle server.ts \
  --output api/server.js \
  --format esm \
  --minify
```

**Deploy:**
```bash
vercel deploy
```

### Example 14: GitHub Actions

**.github/workflows/deploy.yml:**
```yaml
name: Build and Deploy
on: [push]

jobs:
  bundle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - uses: actions/setup-node@v2
        with:
          node-version: 20

      - run: npm install

      - run: npx simplemcp bundle server.ts --auto-install

      - run: scp dist/bundle.js user@server:/app/
```

### Example 15: Package.json Scripts

**package.json:**
```json
{
  "scripts": {
    "build": "NODE_ENV=production simplemcp bundle server.ts",
    "build:dev": "NODE_ENV=development simplemcp bundle server.ts --no-minify --sourcemap",
    "watch": "simplemcp bundle server.ts --watch",
    "bundle:lambda": "simplemcp bundle server.ts --output lambda/index.js --format single-file",
    "bundle:docker": "simplemcp bundle server.ts --output docker/ --format standalone"
  }
}
```

**Run:**
```bash
npm run build        # Production
npm run build:dev    # Development
npm run watch        # Watch mode
```

## Best Practices

### 1. Use Configuration Files for Repeatable Builds

Instead of long CLI commands, use config files:

```javascript
// simplemcp.config.js
export default {
  entry: './src/server.ts',
  output: {
    dir: 'dist',
    filename: 'server.bundle.js',
  },
  bundle: {
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
  },
};
```

### 2. Externalize Native Modules

Always externalize native modules:

```bash
simplemcp bundle server.ts --external fsevents,better-sqlite3,sharp
```

Native modules can't be bundled and must be installed in the deployment environment.

### 3. Use Specific Targets

Specify the exact Node.js version:

```bash
simplemcp bundle server.ts --target node20
```

More specific targets = smaller bundles.

### 4. Enable Minification in Production

```bash
simplemcp bundle server.ts --minify  # Production
simplemcp bundle server.ts --no-minify --sourcemap  # Development
```

Minification reduces bundle size by 30-50%.

### 5. Test Bundles Before Deployment

Always test the bundle locally:

```bash
# Bundle
simplemcp bundle server.ts

# Test
node dist/bundle.js
```

### 6. Use Watch Mode During Development

```bash
simplemcp bundle server.ts --watch --no-minify --sourcemap
```

Automatic rebuilds = faster development.

### 7. Separate Dev and Prod Configs

**simplemcp.config.dev.js:**
```javascript
export default {
  bundle: {
    minify: false,
    sourcemap: true,
  },
};
```

**simplemcp.config.prod.js:**
```javascript
export default {
  bundle: {
    minify: true,
    sourcemap: false,
    target: 'node20',
  },
};
```

### 8. Version Your Config Files

Commit config files to git for reproducible builds:

```bash
git add simplemcp.config.js
git commit -m "Add bundle configuration"
```

### 9. Document Deployment Requirements

If native modules are required, document them:

```markdown
## Deployment

After deploying the bundle, install native modules:

\`\`\`bash
npm install fsevents better-sqlite3
\`\`\`
```

### 10. Use Auto-Install in CI/CD

```bash
simplemcp bundle server.ts --auto-install
```

Ensures dependencies are installed even in clean CI environments.

## Troubleshooting

### Issue 1: "Entry point does not import SimplyMCP"

**Error:**
```
Error: Entry point does not appear to import SimplyMCP: /path/to/file.ts
Expected: import { SimplyMCP } from "simplemcp" or similar
```

**Solution:**
Ensure your entry file imports and uses SimplyMCP:

```typescript
import { SimplyMCP } from './SimplyMCP';

const server = new SimplyMCP({ name: 'my-server' });
```

### Issue 2: "Cannot find module" in Bundle

**Error:**
```
Error: Cannot find module 'some-package'
```

**Causes:**
- Native module not externalized
- Dynamic require that can't be analyzed
- Package not installed

**Solutions:**

1. Externalize the module:
   ```bash
   simplemcp bundle server.ts --external some-package
   ```

2. Install in deployment environment:
   ```bash
   npm install some-package
   ```

3. Use auto-install:
   ```bash
   simplemcp bundle server.ts --auto-install
   ```

### Issue 3: Large Bundle Size

**Problem:**
Bundle is several MB in size.

**Solutions:**

1. Check what's bundled:
   ```bash
   simplemcp bundle server.ts --verbose
   ```

2. Externalize large dependencies:
   ```bash
   simplemcp bundle server.ts --external lodash,moment,axios
   ```

3. Enable tree-shaking (default):
   ```bash
   simplemcp bundle server.ts --tree-shake
   ```

4. Use specific imports:
   ```typescript
   // Instead of
   import _ from 'lodash';

   // Use
   import { map } from 'lodash-es';
   ```

### Issue 4: Native Module Errors

**Error:**
```
Error: Cannot bundle native module 'fsevents'
```

**Solution:**
Native modules must be external:

```bash
simplemcp bundle server.ts --external fsevents
```

**Auto-detected native modules:**
- fsevents
- better-sqlite3
- sharp
- canvas
- @node-rs/*
- @napi-rs/*

### Issue 5: TypeScript Compilation Errors

**Error:**
```
Error: TypeScript compilation failed
```

**Solution:**
Ensure tsconfig.json is configured correctly:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "target": "ES2020",
    "esModuleInterop": true
  }
}
```

### Issue 6: Dynamic Require Warnings

**Warning:**
```
Warning: Dynamic require detected: require(variable)
```

**Cause:**
Code uses dynamic requires that can't be statically analyzed.

**Solutions:**

1. Externalize the problematic package:
   ```bash
   simplemcp bundle server.ts --external problematic-package
   ```

2. Refactor to static imports:
   ```typescript
   // Instead of
   const mod = require(someVariable);

   // Use
   import mod from 'specific-package';
   ```

### Issue 7: Bundle Fails with "ENOENT"

**Error:**
```
Error: ENOENT: no such file or directory
```

**Causes:**
- Invalid entry path
- Output directory doesn't exist

**Solutions:**

1. Check entry path:
   ```bash
   ls -la server.ts  # Verify file exists
   ```

2. Create output directory:
   ```bash
   mkdir -p dist
   simplemcp bundle server.ts --output dist/bundle.js
   ```

### Issue 8: Watch Mode Not Rebuilding

**Problem:**
Watch mode doesn't trigger rebuilds.

**Solutions:**

1. Check file watcher limits (Linux):
   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. Use verbose mode to debug:
   ```bash
   simplemcp bundle server.ts --watch --verbose
   ```

### Issue 9: Source Maps Not Generated

**Problem:**
Source maps missing despite `--sourcemap` flag.

**Solution:**
Ensure output path is correct:

```bash
simplemcp bundle server.ts --sourcemap
# Generates:
# - dist/bundle.js
# - dist/bundle.js.map
```

Check that both files exist:
```bash
ls -la dist/
```

### Issue 10: "Module format mismatch" Error

**Error:**
```
Error: Module format mismatch
```

**Cause:**
ESM/CJS format conflicts.

**Solutions:**

1. Specify format explicitly:
   ```bash
   simplemcp bundle server.ts --format esm
   ```

2. Check package.json type:
   ```json
   {
     "type": "module"  // ESM
   }
   ```

3. Use correct extension:
   - `.mjs` for ESM
   - `.cjs` for CommonJS

## Performance

### Bundle Sizes

Typical bundle sizes:

| Server Type | Dependencies | Bundle Size | Minified |
|-------------|--------------|-------------|----------|
| **Minimal** | SimplyMCP only | 120-200 KB | 80-120 KB |
| **Small** | + zod | 200-400 KB | 150-250 KB |
| **Medium** | + axios, zod | 800 KB - 1.5 MB | 500-800 KB |
| **Large** | + many deps | 2-5 MB | 1-3 MB |
| **Very Large** | + heavy deps | 5-10+ MB | 3-6+ MB |

### Build Times

Typical build times on modern hardware:

| Bundle Size | Cold Build | Incremental (Watch) |
|-------------|------------|---------------------|
| < 500 KB | 500-1000ms | 100-300ms |
| 500KB - 2MB | 1-2s | 200-500ms |
| 2-5 MB | 2-5s | 500ms-1s |
| 5+ MB | 5-10s | 1-2s |

### Optimization Tips

1. **Externalize large dependencies**
   ```bash
   simplemcp bundle server.ts --external lodash,moment
   ```
   Reduces bundle size significantly.

2. **Use tree-shaking**
   ```bash
   simplemcp bundle server.ts --tree-shake
   ```
   Removes unused code (enabled by default).

3. **Target specific Node versions**
   ```bash
   simplemcp bundle server.ts --target node20
   ```
   More specific = smaller output.

4. **Minify in production**
   ```bash
   simplemcp bundle server.ts --minify
   ```
   30-50% size reduction.

5. **Use ESM imports**
   ```typescript
   import { specific } from 'package';  // Tree-shakeable
   ```

6. **Avoid dynamic requires**
   ```typescript
   // Bad (can't tree-shake)
   const mod = require(variable);

   // Good (tree-shakeable)
   import { func } from 'package';
   ```

### Cold Start Performance (Serverless)

Bundle size directly impacts serverless cold start times:

| Bundle Size | Lambda Cold Start | Vercel Cold Start |
|-------------|-------------------|-------------------|
| < 500 KB | 100-200ms | 50-150ms |
| 500KB - 2MB | 200-500ms | 150-300ms |
| 2-5 MB | 500ms-1s | 300-700ms |
| 5+ MB | 1-2s | 700ms-1.5s |

**Optimization for serverless:**
```bash
simplemcp bundle server.ts \
  --minify \
  --target node20 \
  --external aws-sdk \
  --tree-shake
```

## FAQ

### Q1: Can I bundle TypeScript files?

**A:** Yes! SimplyMCP automatically compiles TypeScript during bundling. No separate tsc step needed.

```bash
simplemcp bundle server.ts  # TypeScript ✓
simplemcp bundle server.js  # JavaScript ✓
```

### Q2: What's the difference between single-file and standalone?

**A:**
- **Single-file**: Just the bundle.js file
- **Standalone**: Bundle + package.json + README + .gitignore

Use single-file for serverless, standalone for traditional deployments.

### Q3: Can I bundle multiple servers?

**A:** Yes, bundle each separately:

```bash
simplemcp bundle server1.ts --output dist/server1.js
simplemcp bundle server2.ts --output dist/server2.js
```

Or use a build script:
```bash
for server in server1.ts server2.ts; do
  simplemcp bundle $server --output dist/${server%.ts}.js
done
```

### Q4: Do I need to bundle for development?

**A:** No, bundling is optional. Use it for:
- Production deployments
- Distribution to others
- Performance optimization

In development, run directly:
```bash
tsx server.ts  # Development
node dist/bundle.js  # Production
```

### Q5: Can I use bundling with inline dependencies?

**A:** Yes! Bundling automatically detects and includes inline dependencies:

```typescript
// /// dependencies
// axios@^1.6.0
// ///

// Bundle includes axios
```

### Q6: How do I deploy bundles?

**A:** Bundles are just JavaScript files:

```bash
# Copy to server
scp dist/bundle.js user@server:/app/

# Run
ssh user@server "node /app/bundle.js"
```

See [Deployment Guide](../guides/BUNDLING_DEPLOYMENT.md) for detailed strategies.

### Q7: Can I bundle for browsers?

**A:** SimplyMCP servers are Node.js-only (MCP protocol over stdio/HTTP). Bundling targets Node.js environments.

For browser-compatible code, use `--platform neutral`, but MCP servers won't work in browsers.

### Q8: What happens to native modules?

**A:** Native modules are automatically externalized:

```
External: fsevents, better-sqlite3
Native:   fsevents, better-sqlite3
```

You must install them separately:
```bash
npm install fsevents better-sqlite3
```

### Q9: Can I customize the bundle output?

**A:** Yes, use banner/footer:

```javascript
// simplemcp.config.js
export default {
  bundle: {
    banner: '#!/usr/bin/env node\n// My Custom Header',
    footer: '// End of bundle',
  },
};
```

### Q10: How do I debug bundled code?

**A:** Use source maps:

```bash
simplemcp bundle server.ts --sourcemap --no-minify
```

Then debug with Node.js:
```bash
node --inspect dist/bundle.js
```

### Q11: Can I bundle from a monorepo?

**A:** Yes:

```bash
cd packages/my-server
simplemcp bundle src/index.ts \
  --output ../../dist/my-server.js \
  --external @my-org/shared
```

### Q12: What if bundling fails?

**A:** Use verbose mode to diagnose:

```bash
simplemcp bundle server.ts --verbose
```

Check:
- Entry point is valid SimplyMCP server
- All dependencies are installed
- No TypeScript errors
- Native modules are externalized

### Q13: Can I bundle without node_modules?

**A:** Yes, use auto-install:

```bash
simplemcp bundle server.ts --auto-install
```

This installs dependencies before bundling.

### Q14: How do I reduce bundle size?

**A:**
1. Externalize large deps
2. Use tree-shaking
3. Minify
4. Use specific imports

```bash
simplemcp bundle server.ts \
  --minify \
  --tree-shake \
  --external lodash,moment \
  --target esnext
```

### Q15: Can I bundle serverless functions?

**A:** Yes! Perfect for Lambda, Vercel, Cloudflare:

```bash
simplemcp bundle server.ts \
  --output lambda/index.js \
  --minify \
  --target node20
```

See deployment examples above.

## Integration Points

### With Feature 2 (Inline Dependencies)

Bundling automatically parses and includes inline dependencies:

```typescript
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

// Bundle includes both packages
```

### With Feature 3 (Auto-Installation)

Combine for complete automation:

```bash
simplemcp bundle server.ts --auto-install
```

1. Parses inline dependencies
2. Installs missing packages
3. Bundles everything

### With Feature 1 (Binary Content)

Bundles include binary content helpers:

```typescript
import { imageContent, binaryContent } from './mcp/content-helpers';

// Bundled and ready to use
```

## Related Documentation

- [Deployment Guide](../guides/BUNDLING_DEPLOYMENT.md) - Production deployment strategies
- [Inline Dependencies](./inline-dependencies.md) - Declare dependencies in source
- [Auto-Installation](./auto-installation.md) - Automatic package installation
- [Binary Content](./binary-content.md) - Return images and files
- [Quick Start Guide](../QUICK-START.md) - Get started with SimplyMCP

## Comparison with Other Tools

### SimplyMCP Bundling vs. Alternatives

| Feature | SimplyMCP | @vercel/ncc | esbuild | webpack |
|---------|-----------|-------------|---------|---------|
| **TypeScript** | ✅ Built-in | ✅ Built-in | ✅ Built-in | ⚠️ Needs loader |
| **Single-file** | ✅ Default | ✅ Default | ✅ Yes | ⚠️ Complex |
| **Native modules** | ✅ Auto-detect | ⚠️ Manual | ⚠️ Manual | ⚠️ Manual |
| **Watch mode** | ✅ Built-in | ❌ No | ✅ Yes | ✅ Yes |
| **Inline deps** | ✅ Auto-parse | ❌ No | ❌ No | ❌ No |
| **Auto-install** | ✅ Built-in | ❌ No | ❌ No | ❌ No |
| **Config files** | ✅ Multiple formats | ❌ CLI only | ⚠️ JS only | ✅ Yes |
| **Speed** | ⚡ Fast (esbuild) | ⚡ Fast | ⚡ Fastest | 🐌 Slow |
| **Simplicity** | ✅ Simple | ✅ Simple | ⚠️ Medium | ❌ Complex |

**SimplyMCP advantages:**
- MCP-specific optimizations
- Integrated with inline dependencies
- Auto-installation support
- Multiple output formats
- Entry point auto-detection

## Version History

- **v1.4.0** (Oct 2025) - Initial bundling implementation
  - Single-file, standalone formats
  - ESM/CJS support
  - Auto-detection and validation
  - Native module handling
  - Configuration files
  - Watch mode
  - 118+ tests, 100% pass rate

## Contributing

Found a bug or have a feature request for bundling?

1. Check [existing issues](https://github.com/your-org/simplemcp/issues)
2. Open a new issue with:
   - Bundle configuration used
   - Error messages (use `--verbose`)
   - Expected vs. actual behavior
3. Or submit a PR with tests!

---

**Last Updated:** October 2, 2025
**Version:** 1.4.0
**Maintained by:** SimplyMCP Team
