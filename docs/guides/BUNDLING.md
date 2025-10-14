# Bundling MCP Servers

Create minimal, self-contained distributions of your MCP servers that can be executed immediately with `npx` - no installation required.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Bundle Formats](#bundle-formats)
- [Command Reference](#command-reference)
- [Distribution Guide](#distribution-guide)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

### What is Bundling?

The SimplyMCP bundler creates self-contained distributions of your MCP servers using esbuild. These bundles include all your code and dependencies in optimized packages that can be shared and executed without requiring users to run `npm install`.

### Why Use Bundled Distributions?

**For Developers:**
- Share servers as single files or small folders
- No complex build configuration required
- Automatic dependency resolution
- Production-ready optimization (minification, tree-shaking)

**For Users:**
- Zero installation - run with `npx ./bundle` immediately
- No dependency conflicts
- Predictable, consistent behavior
- Smaller download sizes

### What's New in v2.5.0

- **Single-file bundles** - Entire server in one executable .js file
- **Standalone bundles** - Folder with server + minimal dependencies
- **NPX execution** - Bundles work with `npx` out of the box
- **Automatic shebang** - Single-file bundles are immediately executable
- **Native module support** - Standalone format handles native dependencies
- **Watch mode** - Auto-rebuild on file changes during development

## Quick Start

### Installation

```bash
npm install simply-mcp
```

### 1. Create a Server

```typescript
// server.ts
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'greeting-server',
  version: '1.0.0',
});

server.addTool({
  name: 'greet',
  description: 'Greet someone warmly',
  parameters: z.object({
    name: z.string().describe('Name of person to greet'),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}! Welcome to SimplyMCP!`;
  },
});

server.start({ transport: 'stdio' });
```

### 2. Bundle It

```bash
# Create single executable file
npx simplymcp bundle server.ts -f single-file -o greeting-server.js
```

Output:
```
SimplyMCP Bundler
=================

Entry:    /path/to/server.ts
Output:   /path/to/greeting-server.js
Format:   single-file
Minify:   Yes
Platform: node
Target:   node20

✓ Bundle created successfully!

Output:   /path/to/greeting-server.js
Size:     11.9 MB  (5.0 MB with --minify)
Duration: 1243ms
Modules:  42
```

### 3. Run It

```bash
# Execute with node (recommended for single-file bundles)
node ./greeting-server.js

# Or make it directly executable
chmod +x greeting-server.js
./greeting-server.js
```

**Note:** Use `node` for single-file bundles, or make executable with `chmod +x` and run directly. Use `npx` for standalone bundles (directories with package.json).

### 4. Share It

```bash
# Package for distribution
tar -czf greeting-server.tar.gz greeting-server.js

# User extracts and runs - no npm install needed!
tar -xzf greeting-server.tar.gz
node ./greeting-server.js
```

That's it! Your server is now a portable, self-contained bundle.

## Bundle Formats

SimplyMCP supports four bundle formats. Choose based on your needs:

### Single-File Format (Recommended for Most Use Cases)

**What it is:**
A single executable `.js` file containing your entire server with all dependencies bundled inline.

**When to use it:**
- Your server has no native modules (like `fsevents`, `sharp`, `sqlite3`)
- You want the simplest distribution (one file)
- Maximum portability is important
- You're sharing the server with non-technical users

**Characteristics:**
- Size: ~5-12 MB unminified, ~5 MB minified (beta.3 includes framework dependencies)
- All npm dependencies bundled inline
- Node.js built-ins remain external
- Includes shebang (`#!/usr/bin/env node`)
- Executable with `node` or `chmod +x`

> **Note on Bundle Sizes (beta.3):** Current bundle sizes are larger than optimal (~5-12 MB)
> as the bundler includes framework dependencies. We're working on optimizing this in future
> releases. Use `--minify` to reduce size by ~50% (12 MB → 5 MB).

**Example:**
```bash
npx simplymcp bundle server.ts -f single-file -o my-server.js
```

**Limitations:**
- Cannot bundle native modules (will throw error if detected)
- Slightly larger than standalone for servers with few dependencies

### Standalone Format (For Native Modules)

**What it is:**
A folder containing your bundled server plus a minimal `node_modules` directory with only the native modules and their dependencies.

**When to use it:**
- Your server uses native modules (database drivers, image processors, file watchers)
- You need to include static assets (JSON files, images)
- You want smaller total size for servers with many native dependencies

**Characteristics:**
- Size: ~12 MB for bundled code, plus native module dependencies if present
- Folder structure: `server.js` + `node_modules/` + `package.json`
- Native modules pre-installed
- Pure JavaScript dependencies bundled inline
- Includes optional assets directory

**Example:**
```bash
# Bundle server with native modules
npx simplymcp bundle server.ts -f standalone -o my-server-standalone

# Run from standalone directory
npx ./my-server-standalone/server.js
```

**Structure:**
```
my-server-standalone/
├── server.js           # Bundled server code
├── package.json        # Minimal dependencies list
├── node_modules/       # Native modules only
│   ├── fsevents/
│   └── sharp/
└── assets/            # Optional: your assets
    └── config.json
```

### ESM Format (Library Distribution)

**What it is:**
Standard ECMAScript Module output for library distribution or import into other projects.

**When to use it:**
- Building a library/package to be imported
- Need ESM module format specifically
- Want to publish to npm

**Example:**
```bash
npx simplymcp bundle server.ts -f esm -o dist/server.mjs
```

### CJS Format (Legacy Compatibility)

**What it is:**
CommonJS module output for older Node.js environments or require-based projects.

**When to use it:**
- Legacy Node.js compatibility required
- Integration with CommonJS projects
- Older tooling that doesn't support ESM

**Example:**
```bash
npx simplymcp bundle server.ts -f cjs -o dist/server.cjs
```

## Command Reference

### Basic Command

```bash
npx simplymcp bundle [entry] [options]
```

### Options

#### `-f, --format <format>`

Output format: `single-file`, `standalone`, `esm`, `cjs`

**Default:** `esm`

```bash
# Create single-file bundle
npx simplymcp bundle server.ts -f single-file

# Create standalone distribution
npx simplymcp bundle server.ts -f standalone
```

#### `-o, --output <path>`

Output file or directory path

**Default:** `dist/bundle.js`

```bash
# Specify output file
npx simplymcp bundle server.ts -o my-server.js

# Specify output directory (for standalone)
npx simplymcp bundle server.ts -f standalone -o ./dist/my-server
```

#### `-m, --minify` / `--no-minify`

Enable or disable minification

**Default:** `true` (minified)

```bash
# Disable minification for debugging
npx simplymcp bundle server.ts --no-minify

# Explicitly enable (default)
npx simplymcp bundle server.ts --minify
```

#### `-s, --sourcemap`

Generate external source maps (.map files)

**Type:** Boolean flag

**Default:** `false`

```bash
# Generate source map
npx simplymcp bundle server.ts -s
# Creates: bundle.js and bundle.js.map

# Or using long form
npx simplymcp bundle server.ts --sourcemap
```

> **Note:** The `-s` flag generates external source maps (.map files).
> Inline source maps are not currently supported in this version.

#### `-e, --external <packages>`

External packages (comma-separated, won't be bundled)

**Default:** Node.js built-ins only

```bash
# Keep axios external
npx simplymcp bundle server.ts -e axios

# Multiple external packages
npx simplymcp bundle server.ts -e axios,lodash,zod
```

#### `-p, --platform <platform>`

Target platform: `node`, `neutral`

**Default:** `node`

```bash
npx simplymcp bundle server.ts -p node
```

#### `-t, --target <target>`

Target Node.js version or ECMAScript standard

**Default:** `node20`

**Options:** `node18`, `node20`, `node22`, `esnext`, `es2020`, `es2021`, `es2022`

```bash
# Target Node.js 18
npx simplymcp bundle server.ts -t node18

# Target latest features
npx simplymcp bundle server.ts -t esnext
```

#### `--tree-shake` / `--no-tree-shake`

Enable or disable tree-shaking (dead code elimination)

**Default:** `true` (enabled)

```bash
# Disable tree-shaking
npx simplymcp bundle server.ts --no-tree-shake
```

#### `-c, --config <path>`

Path to configuration file

```bash
npx simplymcp bundle -c simplymcp.config.js
```

#### `-w, --watch`

Watch mode - rebuild on file changes

```bash
npx simplymcp bundle server.ts -w
```

#### `--watch-restart`

Auto-restart server after rebuild in watch mode

```bash
npx simplymcp bundle server.ts -w --watch-restart
```

#### `--assets <files>`

Include assets in bundle (comma-separated file paths)

```bash
# Include asset files
npx simplymcp bundle server.ts --assets config.json,data.csv

# Include with glob pattern
npx simplymcp bundle server.ts --assets "assets/**/*.json"
```

#### `--verbose`

Verbose output with detailed progress

```bash
npx simplymcp bundle server.ts --verbose
```

#### `--auto-install`

Auto-install missing dependencies before bundling

```bash
npx simplymcp bundle server.ts --auto-install
```

## Distribution Guide

### Creating Distributable Packages

#### Single-File Distribution

**1. Bundle the server:**
```bash
npx simplymcp bundle server.ts -f single-file -o my-server.js
```

**2. Create tarball:**
```bash
tar -czf my-server-v1.0.0.tar.gz my-server.js README.md
```

**3. Share the tarball:**
```bash
# User downloads and extracts
tar -xzf my-server-v1.0.0.tar.gz

# User runs immediately
node ./my-server.js
```

**Distribution size:** ~5-12 MB unminified, ~5 MB minified (beta.3)

#### Standalone Distribution

**1. Bundle with standalone format:**
```bash
npx simplymcp bundle server.ts -f standalone -o my-server --assets config.json
```

**2. Create tarball:**
```bash
tar -czf my-server-v1.0.0.tar.gz my-server/
```

**3. Share and run:**
```bash
# User extracts
tar -xzf my-server-v1.0.0.tar.gz

# User runs
npx ./my-server/server.js
```

**Distribution size:** ~12 MB for bundled code, plus native module dependencies if present

### Sharing via Git

**1. Create repository:**
```bash
mkdir my-mcp-server
cd my-mcp-server
git init
```

**2. Bundle server:**
```bash
npx simplymcp bundle ../server.ts -f single-file -o server.js
```

**3. Add README:**
```bash
cat > README.md << 'EOF'
# My MCP Server

## Quick Start

```bash
# Clone
git clone https://github.com/username/my-mcp-server.git
cd my-mcp-server

# Run
node ./server.js
```
EOF
```

**4. Commit and push:**
```bash
git add server.js README.md
git commit -m "Initial release"
git push origin main
```

**Users can now:**
```bash
git clone https://github.com/username/my-mcp-server.git
cd my-mcp-server
node ./server.js
```

### Publishing to NPM (Optional)

**1. Create package.json:**
```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "description": "My awesome MCP server",
  "bin": {
    "my-mcp-server": "./server.js"
  },
  "files": [
    "server.js"
  ]
}
```

**2. Bundle:**
```bash
npx simplymcp bundle server.ts -f single-file -o server.js
```

**3. Publish:**
```bash
npm publish
```

**Users can run:**
```bash
npx my-mcp-server
```

### What Users Need

**Requirements:**
- Node.js 20+ installed
- `npx` command (comes with npm 5.2+)

**That's it!** No `npm install`, no dependencies, no build steps.

**User experience:**
```bash
# Download bundle
curl -O https://example.com/my-server.js

# Run immediately
node ./my-server.js
```

## Advanced Usage

### Using Configuration Files

Create `simplymcp.config.js`:

```javascript
export default {
  entry: './server.ts',
  output: {
    dir: 'dist',
    filename: 'server.js',
    format: 'single-file'
  },
  bundle: {
    minify: true,
    sourcemap: 'external',
    target: 'node20',
    external: ['@modelcontextprotocol/sdk'],
    treeShake: true
  }
};
```

Bundle with config:
```bash
npx simplymcp bundle -c simplymcp.config.js
```

### Watch Mode for Development

Rebuild automatically on file changes:

```bash
# Basic watch mode
npx simplymcp bundle server.ts -w

# Watch with auto-restart
npx simplymcp bundle server.ts -w --watch-restart

# Watch with verbose output
npx simplymcp bundle server.ts -w --verbose
```

### Including Assets

**Single files:**
```bash
npx simplymcp bundle server.ts --assets config.json,schema.json
```

**Multiple files:**
```bash
npx simplymcp bundle server.ts --assets "data/*.json,assets/*.png"
```

**In standalone format:**
Assets are copied to `assets/` directory in the bundle.

### Optimizing Bundle Size

**1. Use external packages for large dependencies:**
```bash
npx simplymcp bundle server.ts -e lodash,moment
```

**2. Enable tree-shaking:**
```bash
npx simplymcp bundle server.ts --tree-shake
```

**3. Enable minification:**
```bash
npx simplymcp bundle server.ts --minify
```

**4. Use single-file format (when possible):**
Single-file bundles are typically smaller than standalone for pure JavaScript servers.

### Debugging Bundles

**Generate source maps:**
```bash
npx simplymcp bundle server.ts -s --no-minify
```

**Verbose output:**
```bash
npx simplymcp bundle server.ts --verbose
```

**Run with Node.js debugger:**
```bash
node --inspect ./bundle.js
```

## Troubleshooting

### Error: "Cannot create single-file bundle: native modules detected"

**Problem:** You're trying to create a single-file bundle, but your server uses native modules like `fsevents`, `sharp`, `sqlite3`, etc.

**Solution:** Use standalone format instead:
```bash
npx simplymcp bundle server.ts -f standalone -o my-server
```

**Why:** Native modules are compiled binaries that can't be bundled into a single JavaScript file. Standalone format includes them in `node_modules/`.

### Error: "EACCES: permission denied"

**Problem:** Bundle file isn't executable.

**Solution:**
```bash
chmod +x my-server.js
```

Or just use `node`:
```bash
node ./my-server.js  # Works without chmod
```

### Error: "Cannot find module"

**Problem:** Missing dependency or incorrect external configuration.

**Solutions:**

1. **Check if dependency is marked external:**
```bash
# Don't mark required dependencies as external
npx simplymcp bundle server.ts  # Let bundler include it
```

2. **Install missing dependencies:**
```bash
npm install missing-package
```

3. **Use auto-install:**
```bash
npx simplymcp bundle server.ts --auto-install
```

### Bundle Size Larger Than Expected

**Symptom:** Bundle is 5-12 MB instead of expected 300KB-1MB

**Cause:** Beta.3 includes framework dependencies in the bundle

**Solutions:**
- Use `--minify` flag to reduce size by ~50% (12 MB → 5 MB)
- This is expected behavior in beta.3
- Future releases will optimize bundle size
- The larger bundle is still self-contained and works correctly

**Additional optimization options:**

1. **Enable minification:**
```bash
npx simplymcp bundle server.ts --minify
```

2. **Enable tree-shaking:**
```bash
npx simplymcp bundle server.ts --tree-shake
```

3. **Mark large dependencies as external:**
```bash
npx simplymcp bundle server.ts -e large-package
```

4. **Check what's included:**
```bash
npx simplymcp bundle server.ts --verbose
```

### "SyntaxError: Unexpected token"

**Problem:** Bundle uses features not supported by your Node.js version.

**Solution:** Target an appropriate Node.js version:
```bash
# For Node.js 18
npx simplymcp bundle server.ts -t node18

# For Node.js 20
npx simplymcp bundle server.ts -t node20
```

### Standalone Bundle Missing Dependencies

**Problem:** Standalone bundle's `node_modules` is incomplete.

**Solution:**

1. **Ensure package.json exists:**
```bash
npm init -y
```

2. **Install all dependencies:**
```bash
npm install
```

3. **Rebuild bundle:**
```bash
npx simplymcp bundle server.ts -f standalone -o my-server
```

## Best Practices

### 1. Choose the Right Format

- **Single-file** for simple servers without native modules
- **Standalone** for servers with database drivers, image processors, etc.
- **ESM/CJS** for library distribution

### 2. Version Your Bundles

Include version in filename:
```bash
npx simplymcp bundle server.ts -o my-server-v1.0.0.js
```

### 3. Test Bundles Before Distribution

Always test your bundle in a clean environment:
```bash
# Create test directory
mkdir test-bundle
cd test-bundle

# Copy bundle
cp ../my-server.js .

# Test run
node ./my-server.js
```

### 4. Include Documentation

Provide clear README with:
- Requirements (Node.js version)
- How to run the bundle
- Configuration options
- Examples

### 5. Use Minification in Production

Smaller bundles = faster downloads:
```bash
npx simplymcp bundle server.ts --minify
```

### 6. Keep Bundles Up to Date

Rebuild bundles when you update:
- Server code
- Dependencies
- Node.js target version

### 7. Security Considerations

- Don't bundle secrets (use environment variables)
- Validate all inputs in your tools
- Keep dependencies updated
- Review bundle contents before sharing

### 8. Use Watch Mode During Development

Speed up development:
```bash
npx simplymcp bundle server.ts -w --no-minify -s
```

### 9. Optimize for Your Use Case

**For sharing:**
- Use single-file format
- Enable minification
- Include README

**For development:**
- Use watch mode
- Disable minification
- Generate source maps

**For production deployment:**
- Use appropriate format
- Enable minification
- Target specific Node.js version
- Test thoroughly

### 10. Document External Dependencies

If your bundle requires external packages, document them:
```markdown
## Requirements

- Node.js 20+
- External dependencies:
  - Install with: `npm install axios zod`
```

## Examples

### Example 1: Simple Tool Server

```typescript
// calculator.ts
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'calculator',
  version: '1.0.0',
});

server.addTool({
  name: 'add',
  description: 'Add two numbers',
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ a, b }) => ({ result: a + b }),
});

server.start({ transport: 'stdio' });
```

**Bundle:**
```bash
npx simplymcp bundle calculator.ts -f single-file -o calculator.js
```

**Run:**
```bash
node ./calculator.js
```

### Example 2: Server with Prompts and Resources

```typescript
// knowledge-base.ts
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'knowledge-base',
  version: '1.0.0',
});

server.addPrompt({
  name: 'explain-topic',
  description: 'Explain a technical topic',
  arguments: [
    { name: 'topic', description: 'Topic to explain', required: true },
    { name: 'level', description: 'Expertise level', required: false },
  ],
  template: `Explain {{topic}} at a {{level}} level.`,
});

server.addResource({
  uri: 'docs://readme',
  name: 'Documentation',
  mimeType: 'text/plain',
  content: 'Knowledge base documentation...',
});

server.start({ transport: 'stdio' });
```

**Bundle:**
```bash
npx simplymcp bundle knowledge-base.ts -f single-file -o knowledge-base.js
```

### Example 3: Server with Native Modules

```typescript
// image-processor.ts
/// dependencies
/// sharp@^0.33.0
///
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';
import sharp from 'sharp';

const server = new BuildMCPServer({
  name: 'image-processor',
  version: '1.0.0',
});

server.addTool({
  name: 'resize_image',
  description: 'Resize an image',
  parameters: z.object({
    input: z.string(),
    width: z.number(),
    height: z.number(),
  }),
  execute: async ({ input, width, height }) => {
    await sharp(input)
      .resize(width, height)
      .toFile('output.jpg');
    return { success: true };
  },
});

server.start({ transport: 'stdio' });
```

**Bundle (must use standalone):**
```bash
npx simplymcp bundle image-processor.ts -f standalone -o image-processor
```

**Run:**
```bash
npx ./image-processor/server.js
```

### Example 4: Distribution Package

```bash
# 1. Bundle
npx simplymcp bundle server.ts -f single-file -o weather-server.js

# 2. Create README
cat > README.md << 'EOF'
# Weather MCP Server

Get current weather information via MCP.

## Quick Start

```bash
node ./weather-server.js
```

## Requirements

- Node.js 20+

## License

MIT
EOF

# 3. Create tarball
tar -czf weather-server-v1.0.0.tar.gz weather-server.js README.md LICENSE

# 4. Share
# Upload to GitHub releases, website, etc.
```

---

## Summary

The SimplyMCP bundler makes it easy to create portable, self-contained MCP servers:

- **Single-file bundles** for maximum portability (~5-12 MB unminified, ~5 MB minified in beta.3)
- **Standalone bundles** for native modules (~12 MB bundled code)
- **NPX execution** - works immediately, no installation
- **Multiple formats** - ESM, CJS, single-file, standalone
- **Developer-friendly** - watch mode, source maps, verbose output

Get started now:
```bash
npx simplymcp bundle server.ts -f single-file -o my-server.js
node ./my-server.js
```

For more information, see:
- [CLI Reference](../development/CLI_REFERENCE.md)
- [Configuration Guide](../development/CONFIGURATION.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
