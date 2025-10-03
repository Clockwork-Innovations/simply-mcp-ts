# Advanced Bundling Options

This guide covers advanced bundling features and options for SimplyMCP servers.

## Output Formats

SimplyMCP supports multiple output formats for different deployment scenarios.

### Single-File (Default)

Everything bundled into one JavaScript file:

```bash
simplemcp bundle server.ts --format single-file
```

**Use cases:**
- Serverless functions (AWS Lambda, Vercel)
- Simple deployments
- Minimal footprint

**Output:**
```
dist/bundle.js  (800 KB)
```

### Standalone Distribution

Complete directory with bundle + package.json + README:

```bash
simplemcp bundle server.ts --format standalone --output dist/
```

**Use cases:**
- Traditional deployments
- Docker containers
- Distribution to end users

**Output:**
```
dist/
├── bundle.js           # Bundled code
├── package.json        # Minimal runtime metadata
├── README.md          # Usage instructions
└── .gitignore         # Ignore patterns
```

### Executable Format

Wrapper script for direct execution:

```bash
simplemcp bundle server.ts --format executable --output dist/server
```

**Use cases:**
- CLI tools
- System services
- Easy distribution

**Output:**
```
dist/
├── server             # Executable wrapper (chmod +x)
├── server.js          # Bundle
└── README.md         # Usage instructions
```

Run directly:
```bash
./dist/server
```

### ESM Format

Modern ECMAScript modules:

```bash
simplemcp bundle server.ts --format esm
```

**Use cases:**
- Modern Node.js (18+)
- Import from other modules
- Tree-shaking benefits

### CommonJS Format

Traditional Node.js modules:

```bash
simplemcp bundle server.ts --format cjs
```

**Use cases:**
- Legacy Node.js compatibility
- CommonJS-only environments
- Maximum compatibility

## Platform & Target Options

### Target Platform

```bash
# Node.js platform (default)
simplemcp bundle server.ts --platform node

# Neutral platform (browser-like)
simplemcp bundle server.ts --platform neutral
```

### Target Version

```bash
# Node.js 18
simplemcp bundle server.ts --target node18

# Node.js 20 (default)
simplemcp bundle server.ts --target node20

# Node.js 22
simplemcp bundle server.ts --target node22

# Latest ECMAScript
simplemcp bundle server.ts --target esnext
```

## External Dependencies

Mark packages as external (not bundled):

```bash
simplemcp bundle server.ts --external fsevents,better-sqlite3
```

**Why external?**
- Native modules (can't be bundled)
- Large dependencies (reduce size)
- Dynamic requires (can't be analyzed)

**Auto-detected externals:**
- Native modules: `fsevents`, `better-sqlite3`, `sharp`
- Built-in Node.js modules: `fs`, `http`, `crypto`, etc.

## Minification & Optimization

### Disable Minification

For debugging:

```bash
simplemcp bundle server.ts --no-minify
```

### Disable Tree-Shaking

Include all code:

```bash
simplemcp bundle server.ts --no-tree-shake
```

### Source Maps

Generate source maps for debugging:

```bash
# External source map
simplemcp bundle server.ts --sourcemap

# Inline source map
simplemcp bundle server.ts --sourcemap inline
```

## Auto-Installation

Auto-install dependencies before bundling:

```bash
simplemcp bundle server.ts --auto-install
```

This automatically:
1. Detects inline dependencies
2. Installs missing packages
3. Bundles everything

Perfect for CI/CD pipelines!

## Production Build

Complete production-ready build:

```bash
simplemcp bundle server.ts \
  --output dist/server.js \
  --format single-file \
  --minify \
  --platform node \
  --target node20 \
  --external fsevents
```

## Development Build

Development with hot reload:

```bash
simplemcp bundle server.ts \
  --output dist/dev.js \
  --no-minify \
  --sourcemap \
  --watch
```

## Multi-Target Builds

Bundle for multiple platforms:

```bash
# Linux/macOS
simplemcp bundle server.ts \
  --output dist/server-linux.js \
  --target node20

# Windows (if needed)
simplemcp bundle server.ts \
  --output dist/server-win.js \
  --target node20
```

## Advanced Examples

### Lambda Function

Optimized for AWS Lambda:

```bash
simplemcp bundle server.ts \
  --output lambda/index.js \
  --format single-file \
  --minify \
  --target node20 \
  --external aws-sdk
```

### Docker Multi-Stage Build

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

### GitHub Actions CI

```yaml
name: Build and Deploy
on: [push]
jobs:
  build:
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

### Monorepo Bundle

Bundle from monorepo:

```bash
cd packages/my-server
simplemcp bundle src/index.ts \
  --output ../../dist/my-server.js \
  --external @my-org/shared
```

## Troubleshooting

### Large Bundle Size

Check what's included:

```bash
simplemcp bundle server.ts --verbose
```

Externalize large dependencies:

```bash
simplemcp bundle server.ts --external lodash,moment
```

### Native Module Errors

Mark native modules as external:

```bash
simplemcp bundle server.ts --external fsevents,sharp
```

### Dynamic Require Warnings

Some packages use dynamic requires that can't be bundled. Mark them external:

```bash
simplemcp bundle server.ts --external problematic-package
```

### TypeScript Errors

Ensure TypeScript is configured correctly:

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "target": "ES2020"
  }
}
```

## Performance Tips

1. **Use specific targets**: `--target node20` is smaller than `--target es2015`
2. **Externalize native modules**: They can't be bundled anyway
3. **Enable tree-shaking**: Removes unused code (on by default)
4. **Minify in production**: Reduces size by 30-50%
5. **Watch mode in development**: Faster rebuilds

## Next Steps

- [Configuration Files](./bundle-config.md) - Use config files for complex setups
- [Deployment Guide](./bundle-deploy.md) - Production deployment strategies
