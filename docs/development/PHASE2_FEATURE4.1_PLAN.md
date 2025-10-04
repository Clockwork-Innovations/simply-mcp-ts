# Phase 2, Feature 4.1: CLI Infrastructure & Core Bundling - Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for the **foundational bundling infrastructure** for SimplyMCP servers. This first phase establishes the CLI framework, entry point detection, dependency resolution, and single-file bundling using esbuild.

**Status**: Planning Phase
**Priority**: HIGH
**Estimated Complexity**: Medium-High
**Breaking Changes**: None (fully opt-in, backward compatible)
**Relation to Phase 2**: Feature 4.1 of Phase 2 (builds on Features 2 & 3)
**Enables**: Feature 4.2 (Advanced Formats & Distribution)

---

## Split Rationale

Feature 4 (Bundling) has been split into two phases for better implementation focus:

**Feature 4.1 (This Document)**: Foundation
- ✅ CLI infrastructure and command parsing
- ✅ Entry point detection and validation
- ✅ Dependency resolution (integrates Features 2 & 3)
- ✅ Core esbuild bundler integration
- ✅ Single-file output format
- ✅ Basic configuration file support (simplemcp.config.js)
- ✅ Minification and tree-shaking
- ✅ Basic testing infrastructure

**Feature 4.2 (Next Phase)**: Advanced Features
- ⏭️ Standalone format (directory with assets)
- ⏭️ Executable format (pkg/nexe for native binaries)
- ⏭️ Watch mode for development
- ⏭️ Source maps (inline, external, both)
- ⏭️ Cross-platform executable builds
- ⏭️ Advanced bundler plugins
- ⏭️ ESM/CJS explicit format control

**Why Split?**
1. **Incremental Value**: Feature 4.1 delivers immediate value (single-file bundles work!)
2. **Reduced Complexity**: Smaller scope = easier to test and validate
3. **Clear Dependencies**: 4.1 foundation → 4.2 builds on top
4. **Faster Iteration**: Ship 4.1 sooner, iterate on 4.2
5. **Risk Management**: Test bundling core before adding advanced features

**Estimated Timeline**:
- Feature 4.1: ~10 days (this plan)
- Feature 4.2: ~8 days (standalone, executable, watch mode)
- Total: ~18 days (vs. 18 days in original monolithic plan)

---

## 1. Overview

### 1.1 What is Feature 4.1?

Feature 4.1 establishes the **foundational bundling infrastructure** for SimplyMCP:

**Core Capabilities (This Phase):**
1. **CLI Command**: `simplemcp bundle <entry>` command with options
2. **Entry Point Detection**: Auto-detect server files or use explicit path
3. **Dependency Resolution**: Parse inline deps (Feature 2) + package.json
4. **esbuild Integration**: Bundle using esbuild for speed and efficiency
5. **Single-File Output**: Create standalone .js file with all dependencies
6. **Basic Config**: Support `simplemcp.config.js` for bundling options
7. **Minification**: Optional minification for production builds
8. **Tree-Shaking**: Automatic dead code elimination

**Out of Scope (Feature 4.2):**
- Standalone directory format
- Native executable creation (pkg/nexe)
- Watch mode
- Source maps
- Cross-platform builds
- Advanced plugins

### 1.2 User Experience

**Before Feature 4.1 (Manual deployment):**
```bash
# Deploy SimplyMCP server manually
scp -r server/ user@prod:/app/
scp -r node_modules/ user@prod:/app/  # 50+ MB!
ssh user@prod "cd /app && npm install && node server.ts"
```

**After Feature 4.1 (Bundled deployment):**
```bash
# Developer bundles locally
simplemcp bundle server.ts --output dist/server.js

# Deploy single file (< 1 MB)
scp dist/server.js user@prod:/app/
ssh user@prod "node /app/server.js"  # Just works!
```

**Example CLI Usage:**
```bash
# Basic single-file bundle
simplemcp bundle server.ts
# Output: dist/server.js

# Production bundle (minified)
simplemcp bundle server.ts --minify --output prod/server.js

# With configuration file
simplemcp bundle --config simplemcp.config.js

# Auto-install deps before bundling (Features 2 & 3)
simplemcp bundle server.ts --auto-install
```

---

## 2. Design Decisions

### 2.1 Bundler Technology: esbuild

**Decision: Use esbuild as the primary bundler**

**Rationale:**
- ✅ **Speed**: 100x faster than webpack, 10x faster than rollup
- ✅ **TypeScript**: Native support, no plugins needed
- ✅ **Single-file output**: Built-in support
- ✅ **Tree-shaking**: Automatic dead code elimination
- ✅ **Minification**: Built-in minifier
- ✅ **Node.js target**: Optimized for server-side bundles
- ✅ **Active development**: Well-maintained (2025)
- ✅ **Simple API**: Easy to integrate

**Alternative Considered: @vercel/ncc**
- ❌ Less flexible
- ❌ Fewer features
- ❌ Slower than esbuild

**Dependency Strategy:**
```json
{
  "devDependencies": {
    "esbuild": "^0.20.0"
  }
}
```

### 2.2 CLI Interface

**Decision: New `simplemcp bundle` subcommand**

**Command Structure:**
```bash
simplemcp bundle <entry> [options]

Arguments:
  entry                    Entry point file (e.g., server.ts)

Options (Feature 4.1):
  -o, --output <path>      Output file path (default: dist/server.js)
  -m, --minify             Minify output (default: auto)
  --no-minify              Disable minification
  -p, --platform <name>    Target platform: node|neutral (default: node)
  -t, --target <version>   Target Node.js version (default: node18)
  -e, --external <list>    External packages (comma-separated)
  --tree-shake             Enable tree-shaking (default: true)
  --no-tree-shake          Disable tree-shaking
  -c, --config <path>      Config file path
  --auto-install           Auto-install deps before bundling
  -v, --verbose            Verbose output
  -h, --help               Show help

Options (Feature 4.2 - Future):
  -f, --format <format>    Output format: standalone|executable (4.2)
  -s, --sourcemap          Generate source maps (4.2)
  -w, --watch              Watch mode (4.2)
```

**Feature 4.1 Examples:**
```bash
# Basic bundle
simplemcp bundle server.ts

# Production bundle
simplemcp bundle server.ts --minify --output dist/prod-server.js

# Custom target
simplemcp bundle server.ts --target node20 --platform node

# External deps
simplemcp bundle server.ts --external better-sqlite3,sharp

# Use config file
simplemcp bundle --config simplemcp.config.js

# Verbose output
simplemcp bundle server.ts --verbose
```

### 2.3 Output Format (Feature 4.1 Scope)

**Decision: Single-file output only (for now)**

#### Single-File Format
```bash
simplemcp bundle server.ts --output dist/server.js
```

**Characteristics:**
- All code and dependencies in one .js file
- Minified (optional) and tree-shaken
- Node.js modules bundled
- Smallest footprint possible
- **Use case**: Simple deployment, serverless functions, Lambda

**Output Structure:**
```
dist/
  └── server.js           # ~800 KB - everything bundled
```

**Run Bundled Server:**
```bash
node dist/server.js
```

**Future Formats (Feature 4.2):**
- `standalone`: Directory with bundle + assets + minimal package.json
- `executable`: Native binary (no Node.js required)
- `esm`/`cjs`: Explicit module format control

### 2.4 Entry Point Detection

**Decision: Explicit entry point with fallback detection**

**Priority Order:**
1. **Explicit CLI argument** (highest priority)
   ```bash
   simplemcp bundle server.ts
   ```

2. **Config file `entry` field**
   ```javascript
   // simplemcp.config.js
   export default { entry: './src/server.ts' }
   ```

3. **package.json `main` field**
   ```json
   { "main": "./src/server.ts" }
   ```

4. **Convention-based detection** (lowest priority)
   - `server.ts`
   - `index.ts`
   - `main.ts`
   - `src/server.ts`
   - `src/index.ts`

**Validation:**
```typescript
async function validateEntryPoint(filePath: string): Promise<boolean> {
  const source = await readFile(filePath, 'utf-8');

  // Must import SimplyMCP
  if (!source.includes('SimplyMCP')) {
    throw new Error(`Entry point must import SimplyMCP: ${filePath}`);
  }

  // Must create SimplyMCP instance
  const hasInstantiation = /new\s+SimplyMCP|export\s+default.*SimplyMCP/.test(source);
  if (!hasInstantiation) {
    throw new Error(`Entry point must create SimplyMCP instance: ${filePath}`);
  }

  return true;
}
```

### 2.5 Dependency Handling

**Decision: Bundle all dependencies by default, with external option**

**Default Behavior:**
```bash
simplemcp bundle server.ts
# Bundles: all deps from package.json + inline deps (Feature 2)
```

**External Dependencies:**
```bash
simplemcp bundle server.ts --external fsevents,better-sqlite3
# These remain external (not bundled)
```

**Why External?**
- Native modules (can't be bundled)
- Large dependencies (reduce bundle size)
- Dynamic requires (can't be statically analyzed)

**Auto-Detection of Native Modules:**
```typescript
const NATIVE_MODULES = [
  'fsevents',
  'better-sqlite3',
  'sharp',
  'canvas',
  'node-gyp',
];

function detectNativeModules(deps: Record<string, string>): string[] {
  return Object.keys(deps).filter(dep => NATIVE_MODULES.includes(dep));
}
```

**Integration with Features 2 & 3:**
```typescript
// 1. Parse inline dependencies (Feature 2)
const inlineDeps = parseInlineDependencies(source);

// 2. Auto-install if requested (Feature 3)
if (options.autoInstall) {
  await installDependencies(inlineDeps);
}

// 3. Bundle everything (Feature 4.1)
await bundle({
  entry: filePath,
  dependencies: { ...packageJsonDeps, ...inlineDeps }
});
```

### 2.6 Configuration File (Basic)

**Decision: Support simplemcp.config.js (basic subset for 4.1)**

**Configuration Schema (4.1 Subset):**
```typescript
export interface BundleConfig {
  // Entry point
  entry?: string;

  // Output (single-file only for 4.1)
  output?: {
    path?: string;        // Output file path
  };

  // Bundle options
  bundle?: {
    minify?: boolean;     // Minification
    platform?: 'node' | 'neutral';
    target?: string;      // e.g., 'node18'
    external?: string[];  // External packages
    treeShake?: boolean;  // Tree-shaking
  };

  // Integration with Features 2 & 3
  autoInstall?: boolean;

  // Advanced (4.1)
  esbuild?: {
    // Pass-through esbuild options
    define?: Record<string, string>;
  };
}
```

**Example Config (Feature 4.1):**
```javascript
// simplemcp.config.js
export default {
  entry: './src/server.ts',
  output: {
    path: 'dist/production-server.js'
  },
  bundle: {
    minify: true,
    platform: 'node',
    target: 'node18',
    external: ['better-sqlite3'],
    treeShake: true
  },
  autoInstall: true
};
```

**CLI Override:**
```bash
# Config file values can be overridden
simplemcp bundle --config simplemcp.config.js --no-minify
# Result: minify disabled (CLI wins)
```

**Future (4.2):**
- `output.format` (standalone, executable)
- `output.dir` (for standalone)
- `sourcemap` options
- `watch` options

### 2.7 Minification

**Decision: Minify by default in production mode**

**Auto-Detection:**
```typescript
const shouldMinify = options.minify ?? (
  process.env.NODE_ENV === 'production'
);
```

**CLI Control:**
```bash
# Explicit minify
simplemcp bundle server.ts --minify

# Disable minify
simplemcp bundle server.ts --no-minify

# Auto (based on NODE_ENV)
NODE_ENV=production simplemcp bundle server.ts
```

**Size Impact:**
```
Original:        500 KB (with comments, whitespace)
Minified:        200 KB (60% reduction)
Minified + Gzip: 50 KB  (90% reduction)
```

### 2.8 Platform Targeting

**Decision: Target Node.js by default**

**Platform Options:**
- **node** (default): Optimized for Node.js runtime
  - Keeps Node.js built-ins external (fs, path, http, etc.)
  - Uses Node.js module resolution
  - Server-side optimizations

- **neutral**: Platform-agnostic bundle
  - No Node.js built-ins (for edge/browser)

**Target Version:**
```bash
# Target specific Node.js version
simplemcp bundle server.ts --target node18
simplemcp bundle server.ts --target node20
simplemcp bundle server.ts --target node22
```

**Auto-detect from package.json:**
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 3. Architecture Design

### 3.1 Component Overview (Feature 4.1)

```
┌─────────────────────────────────────────────────────────┐
│                    CLI Command                           │
│  simplemcp bundle server.ts --output dist/server.js     │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│            CLI Parser (bundle.ts)                        │
│  ├─ Parse arguments                                      │
│  ├─ Load configuration file                              │
│  ├─ Merge CLI + config options                          │
│  └─ Validate options                                    │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│         Entry Point Detector                             │
│  ├─ Detect entry point (explicit > config > convention) │
│  ├─ Validate SimplyMCP usage                            │
│  └─ Return entry path                                   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│    Dependency Resolver (Features 2 & 3)                 │
│  ├─ Parse inline dependencies (Feature 2)               │
│  ├─ Merge with package.json                             │
│  ├─ Auto-install if requested (Feature 3)               │
│  ├─ Detect native modules                               │
│  └─ Get external dependencies                           │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│            Bundler Core (bundler.ts)                     │
│  ├─ Configure esbuild                                    │
│  ├─ Set bundle options (minify, platform, target)      │
│  ├─ Run esbuild.build()                                 │
│  └─ Validate build result                               │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│         Single-File Output                               │
│  ├─ Write bundle to output path                         │
│  ├─ Report bundle size                                   │
│  └─ Display success message                             │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│            Bundle Result                                 │
│  - Output path: dist/server.js                          │
│  - Bundle size: 856 KB                                   │
│  - Warnings/errors: []                                   │
│  - Statistics: { dependencies: 15, time: 234ms }        │
└─────────────────────────────────────────────────────────┘
```

### 3.2 File Structure (Feature 4.1)

```
mcp/
├── cli/                                 (NEW)
│   ├── index.ts                         (NEW - CLI entry, ~150 lines)
│   │   └─ Main CLI with commander.js
│   │
│   └── bundle.ts                        (NEW - bundle command, ~200 lines)
│       ├─ Parse bundle command options
│       ├─ Load config file
│       ├─ Merge options
│       └─ Call bundler core
│
├── core/
│   ├── bundler.ts                       (NEW - ~300 lines)
│   │   ├─ bundle() - main bundling function
│   │   ├─ configureBuild() - esbuild config
│   │   ├─ runBuild() - execute esbuild
│   │   └─ validateResult() - check output
│   │
│   ├── bundle-types.ts                  (NEW - ~150 lines)
│   │   ├─ BundleOptions interface
│   │   ├─ BundleResult interface
│   │   ├─ BundleConfig interface
│   │   └─ BundleStats interface
│   │
│   ├── entry-detector.ts                (NEW - ~150 lines)
│   │   ├─ detectEntryPoint()
│   │   ├─ validateEntryPoint()
│   │   ├─ findEntryByConvention()
│   │   └─ checkSimplyMCPUsage()
│   │
│   ├── dependency-resolver.ts           (NEW - ~200 lines)
│   │   ├─ resolveDependencies()
│   │   ├─ mergeDependencies()
│   │   ├─ detectNativeModules()
│   │   └─ getExternalDependencies()
│   │
│   ├── config-loader.ts                 (NEW - ~120 lines)
│   │   ├─ loadConfig()
│   │   ├─ findConfigFile()
│   │   ├─ parseConfig()
│   │   └─ mergeWithCLI()
│   │
│   ├── inline-deps/                     (EXISTING - Feature 2)
│   ├── dependency-installer.ts          (EXISTING - Feature 3)
│   └── ...
│
├── examples/
│   └── bundling/                        (NEW)
│       ├── basic-bundle-example.ts      (NEW - ~60 lines)
│       ├── production-bundle.ts         (NEW - ~80 lines)
│       └── config-example/              (NEW)
│           ├── server.ts
│           └── simplemcp.config.js
│
├── simplemcp.config.example.js          (NEW - ~40 lines)
│
├── package.json                         (MODIFIED)
│   └── Add esbuild devDependency
│
└── tests/
    └── phase2/
        ├── test-bundle-entry-detector.sh       (NEW - ~400 lines / 20 tests)
        ├── test-bundle-dependency-resolver.sh  (NEW - ~400 lines / 20 tests)
        ├── test-bundle-config-loader.sh        (NEW - ~300 lines / 15 tests)
        ├── test-bundle-core.sh                 (NEW - ~400 lines / 20 tests)
        ├── bundle-integration.test.ts          (NEW - ~500 lines / 20 tests)
        └── run-bundle-tests.sh                 (NEW - master test runner)
```

---

## 4. Core Components (Feature 4.1)

### 4.1 CLI Entry Point

**File: `/mcp/cli/index.ts`**

```typescript
#!/usr/bin/env node
/**
 * SimplyMCP CLI
 * Main entry point for all CLI commands
 */

import { program } from 'commander';
import { bundleCommand } from './bundle.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get package version
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
);

program
  .name('simplemcp')
  .description('SimplyMCP CLI - Build and bundle MCP servers')
  .version(packageJson.version);

// Bundle command (Feature 4.1)
program
  .command('bundle <entry>')
  .description('Bundle a SimplyMCP server into a standalone file')
  .option('-o, --output <path>', 'Output file path', 'dist/server.js')
  .option('-m, --minify', 'Minify output')
  .option('--no-minify', 'Disable minification')
  .option('-p, --platform <name>', 'Target platform: node|neutral', 'node')
  .option('-t, --target <version>', 'Target Node.js version', 'node18')
  .option('-e, --external <list>', 'External packages (comma-separated)')
  .option('--tree-shake', 'Enable tree-shaking (default: true)')
  .option('--no-tree-shake', 'Disable tree-shaking')
  .option('-c, --config <path>', 'Config file path')
  .option('--auto-install', 'Auto-install dependencies before bundling')
  .option('-v, --verbose', 'Verbose output')
  .action(bundleCommand);

program.parse();
```

### 4.2 Bundle Command Handler

**File: `/mcp/cli/bundle.ts`**

```typescript
import { bundle } from '../core/bundler.js';
import { loadConfig } from '../core/config-loader.js';
import { BundleCommandOptions } from '../core/bundle-types.js';

export async function bundleCommand(
  entry: string,
  options: BundleCommandOptions
): Promise<void> {
  try {
    console.log('[SimplyMCP] Starting bundle...');

    // Load config file if specified
    const config = options.config
      ? await loadConfig(options.config)
      : {};

    // Merge options (CLI wins)
    const bundleOptions = {
      entry: entry || config.entry,
      output: options.output || config.output?.path,
      minify: options.minify ?? config.bundle?.minify,
      platform: options.platform || config.bundle?.platform,
      target: options.target || config.bundle?.target,
      external: options.external?.split(',') || config.bundle?.external,
      treeShake: options.treeShake ?? config.bundle?.treeShake ?? true,
      autoInstall: options.autoInstall ?? config.autoInstall,
      verbose: options.verbose,
    };

    // Validate entry point exists
    if (!bundleOptions.entry) {
      throw new Error('Entry point required. Use: simplemcp bundle <entry>');
    }

    if (bundleOptions.verbose) {
      console.log('[SimplyMCP] Bundle options:', bundleOptions);
    }

    // Run bundler
    const result = await bundle(bundleOptions);

    // Report results
    if (result.success) {
      console.log(`[SimplyMCP] ✓ Bundle created: ${result.outputFiles[0]}`);
      console.log(`[SimplyMCP] Bundle size: ${(result.size / 1024).toFixed(2)} KB`);
      console.log(`[SimplyMCP] Build time: ${result.stats.bundleTime}ms`);
    } else {
      console.error('[SimplyMCP] ✗ Bundle failed');
      result.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

  } catch (error) {
    console.error('[SimplyMCP] Error:', error.message);
    process.exit(1);
  }
}
```

### 4.3 Entry Point Detector

**File: `/mcp/core/entry-detector.ts`**

```typescript
import { readFile, access } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

/**
 * Detect entry point from various sources
 */
export async function detectEntryPoint(
  explicit?: string,
  cwd: string = process.cwd()
): Promise<string> {
  // 1. Explicit entry point (highest priority)
  if (explicit) {
    const entryPath = resolve(cwd, explicit);
    await validateEntryPoint(entryPath);
    return entryPath;
  }

  // 2. Find by convention
  const conventional = await findEntryByConvention(cwd);
  if (conventional) {
    return conventional;
  }

  throw new Error(
    'Entry point not found. Specify entry file or use convention (server.ts, index.ts)'
  );
}

/**
 * Find entry by convention
 */
async function findEntryByConvention(cwd: string): Promise<string | null> {
  const candidates = [
    'server.ts',
    'index.ts',
    'main.ts',
    'src/server.ts',
    'src/index.ts',
  ];

  for (const candidate of candidates) {
    const candidatePath = join(cwd, candidate);
    if (existsSync(candidatePath)) {
      try {
        await validateEntryPoint(candidatePath);
        return candidatePath;
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Validate entry point is a SimplyMCP server
 */
export async function validateEntryPoint(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Entry point not found: ${filePath}`);
  }

  const source = await readFile(filePath, 'utf-8');

  // Check for SimplyMCP usage
  if (!checkSimplyMCPUsage(source)) {
    throw new Error(
      `Entry point must import and use SimplyMCP: ${filePath}\n` +
      `  Hint: Add "import { SimplyMCP } from 'simply-mcp';" and create a server instance`
    );
  }
}

/**
 * Check if source uses SimplyMCP
 */
export function checkSimplyMCPUsage(source: string): boolean {
  // Must import SimplyMCP
  const hasImport = /import\s+.*SimplyMCP.*from\s+['"].*simply-?mcp['"]/.test(source);
  if (!hasImport) return false;

  // Must instantiate or export SimplyMCP
  const hasInstantiation =
    /new\s+SimplyMCP\s*\(/.test(source) ||
    /export\s+default.*SimplyMCP/.test(source) ||
    /@MCPServer/.test(source);  // Decorator API

  return hasInstantiation;
}
```

### 4.4 Dependency Resolver

**File: `/mcp/core/dependency-resolver.ts`**

```typescript
import { parseInlineDependencies } from './inline-deps/parser.js';
import { installDependencies } from './dependency-installer.js';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';

const NATIVE_MODULES = [
  'fsevents',
  'better-sqlite3',
  'sharp',
  'canvas',
  'node-gyp',
  'sqlite3',
];

export interface ResolvedDependencies {
  all: Record<string, string>;
  external: string[];
  bundled: string[];
}

/**
 * Resolve all dependencies for bundling
 */
export async function resolveDependencies(
  entryPoint: string,
  options: {
    autoInstall?: boolean;
    external?: string[];
  } = {}
): Promise<ResolvedDependencies> {
  const cwd = dirname(entryPoint);

  // Parse inline dependencies (Feature 2)
  const source = await readFile(entryPoint, 'utf-8');
  const inlineResult = parseInlineDependencies(source);
  const inlineDeps = inlineResult.dependencies;

  // Load package.json dependencies
  const packageJsonPath = resolve(cwd, 'package.json');
  let packageJsonDeps = {};

  if (existsSync(packageJsonPath)) {
    const pkg = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    packageJsonDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
  }

  // Merge dependencies (package.json wins on conflicts)
  const allDeps = mergeDependencies(inlineDeps, packageJsonDeps);

  // Auto-install if requested (Feature 3)
  if (options.autoInstall) {
    await installDependencies(allDeps, { cwd });
  }

  // Detect native modules (must be external)
  const nativeModules = detectNativeModules(allDeps);

  // Get external dependencies
  const external = getExternalDependencies({
    native: nativeModules,
    userSpecified: options.external || [],
  });

  // Bundled = all deps except external
  const bundled = Object.keys(allDeps).filter(dep => !external.includes(dep));

  return {
    all: allDeps,
    external,
    bundled,
  };
}

/**
 * Merge dependencies (package.json precedence)
 */
function mergeDependencies(
  inline: Record<string, string>,
  packageJson: Record<string, string>
): Record<string, string> {
  const conflicts: string[] = [];

  for (const [name, version] of Object.entries(inline)) {
    if (packageJson[name] && packageJson[name] !== version) {
      conflicts.push(name);
    }
  }

  if (conflicts.length > 0) {
    console.warn('[SimplyMCP] Dependency conflicts detected:');
    conflicts.forEach(pkg => {
      console.warn(
        `  - ${pkg}: inline=${inline[pkg]}, package.json=${packageJson[pkg]} (using package.json)`
      );
    });
  }

  return { ...inline, ...packageJson };
}

/**
 * Detect native modules
 */
function detectNativeModules(deps: Record<string, string>): string[] {
  return Object.keys(deps).filter(dep => NATIVE_MODULES.includes(dep));
}

/**
 * Get external dependencies
 */
function getExternalDependencies(options: {
  native: string[];
  userSpecified: string[];
}): string[] {
  const external = new Set<string>([
    ...options.native,
    ...options.userSpecified,
  ]);

  return Array.from(external);
}
```

### 4.5 Core Bundler

**File: `/mcp/core/bundler.ts`**

```typescript
import esbuild from 'esbuild';
import { detectEntryPoint } from './entry-detector.js';
import { resolveDependencies } from './dependency-resolver.js';
import { BundleOptions, BundleResult } from './bundle-types.js';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';

/**
 * Main bundle function
 */
export async function bundle(options: BundleOptions): Promise<BundleResult> {
  const startTime = Date.now();

  try {
    // 1. Detect and validate entry point
    const entryPoint = await detectEntryPoint(options.entry);

    if (options.verbose) {
      console.log(`[Bundler] Entry point: ${entryPoint}`);
    }

    // 2. Resolve dependencies
    const deps = await resolveDependencies(entryPoint, {
      autoInstall: options.autoInstall,
      external: options.external,
    });

    if (options.verbose) {
      console.log(`[Bundler] Dependencies: ${Object.keys(deps.all).length}`);
      console.log(`[Bundler] External: ${deps.external.join(', ') || 'none'}`);
      console.log(`[Bundler] Bundled: ${deps.bundled.join(', ')}`);
    }

    // 3. Configure esbuild
    const buildConfig = configureBuild(entryPoint, options, deps.external);

    if (options.verbose) {
      console.log(`[Bundler] Build config:`, buildConfig);
    }

    // 4. Run esbuild
    const buildResult = await runBuild(buildConfig);

    // 5. Validate result
    validateResult(buildResult);

    // 6. Write output
    const outputPath = resolve(options.output || 'dist/server.js');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, buildResult.outputFiles[0].text);

    const bundleTime = Date.now() - startTime;

    return {
      success: true,
      outputFiles: [outputPath],
      size: buildResult.outputFiles[0].contents.length,
      warnings: buildResult.warnings.map(w => w.text),
      errors: [],
      stats: {
        entryPoint,
        dependencies: Object.keys(deps.all).length,
        bundleTime,
        outputFormat: 'single-file',
        minified: options.minify ?? false,
        sourcemap: false,  // Feature 4.2
      },
    };

  } catch (error) {
    return {
      success: false,
      outputFiles: [],
      size: 0,
      warnings: [],
      errors: [error.message],
      stats: {
        entryPoint: options.entry || '',
        dependencies: 0,
        bundleTime: Date.now() - startTime,
        outputFormat: 'single-file',
        minified: false,
        sourcemap: false,
      },
    };
  }
}

/**
 * Configure esbuild
 */
function configureBuild(
  entryPoint: string,
  options: BundleOptions,
  external: string[]
): esbuild.BuildOptions {
  return {
    entryPoints: [entryPoint],
    bundle: true,
    platform: options.platform || 'node',
    target: options.target || 'node18',
    format: 'esm',  // Always ESM for Feature 4.1
    minify: options.minify ?? process.env.NODE_ENV === 'production',
    treeShaking: options.treeShake ?? true,
    external: [
      ...external,
      // Always external: Node.js built-ins
      'fs', 'path', 'http', 'https', 'net', 'os', 'crypto', 'stream',
    ],
    write: false,  // We write manually
    metafile: true,
    logLevel: options.verbose ? 'info' : 'warning',
    ...(options.banner && { banner: { js: options.banner } }),
    ...(options.footer && { footer: { js: options.footer } }),
  };
}

/**
 * Run esbuild
 */
async function runBuild(config: esbuild.BuildOptions): Promise<esbuild.BuildResult> {
  return esbuild.build(config);
}

/**
 * Validate build result
 */
function validateResult(result: esbuild.BuildResult): void {
  if (!result.outputFiles || result.outputFiles.length === 0) {
    throw new Error('Build failed: No output files generated');
  }

  if (result.errors.length > 0) {
    const errorMessages = result.errors.map(e => e.text).join('\n');
    throw new Error(`Build failed:\n${errorMessages}`);
  }
}
```

### 4.6 Config Loader

**File: `/mcp/core/config-loader.ts`**

```typescript
import { readFile } from 'fs/promises';
import { resolve, join, dirname } from 'path';
import { existsSync } from 'fs';
import { BundleConfig } from './bundle-types.js';
import { pathToFileURL } from 'url';

/**
 * Load configuration from file
 */
export async function loadConfig(
  configPath?: string,
  cwd: string = process.cwd()
): Promise<BundleConfig> {
  const configFile = configPath
    ? resolve(cwd, configPath)
    : await findConfigFile(cwd);

  if (!configFile) {
    return {};
  }

  if (!existsSync(configFile)) {
    throw new Error(`Config file not found: ${configFile}`);
  }

  return parseConfig(configFile);
}

/**
 * Find config file by convention
 */
async function findConfigFile(cwd: string): Promise<string | null> {
  const candidates = [
    'simplemcp.config.js',
    'simplemcp.config.mjs',
    'simplemcp.config.ts',
    '.simplemcprc.json',
    '.simplemcprc.js',
  ];

  for (const candidate of candidates) {
    const candidatePath = join(cwd, candidate);
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

/**
 * Parse config file
 */
async function parseConfig(configPath: string): Promise<BundleConfig> {
  const ext = configPath.split('.').pop();

  if (ext === 'json') {
    // JSON config
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } else if (ext === 'js' || ext === 'mjs' || ext === 'ts') {
    // JavaScript/TypeScript config
    const configUrl = pathToFileURL(configPath).href;
    const module = await import(configUrl);
    return module.default || module;
  } else {
    throw new Error(`Unsupported config file format: ${ext}`);
  }
}
```

### 4.7 Bundle Types

**File: `/mcp/core/bundle-types.ts`**

```typescript
/**
 * Bundle options (Feature 4.1 subset)
 */
export interface BundleOptions {
  // Entry
  entry: string;

  // Output
  output?: string;

  // Optimization
  minify?: boolean;
  treeShake?: boolean;

  // Platform
  platform?: 'node' | 'neutral';
  target?: string;

  // Dependencies
  external?: string[];

  // Advanced
  banner?: string;
  footer?: string;

  // Features 2 & 3
  autoInstall?: boolean;

  // Logging
  verbose?: boolean;
}

/**
 * Bundle result
 */
export interface BundleResult {
  success: boolean;
  outputFiles: string[];
  size: number;
  warnings: string[];
  errors: string[];
  stats: BundleStats;
}

/**
 * Bundle statistics
 */
export interface BundleStats {
  entryPoint: string;
  dependencies: number;
  bundleTime: number;
  outputFormat: 'single-file';
  minified: boolean;
  sourcemap: boolean;
}

/**
 * Configuration file schema (Feature 4.1 subset)
 */
export interface BundleConfig {
  entry?: string;
  output?: {
    path?: string;
  };
  bundle?: {
    minify?: boolean;
    platform?: 'node' | 'neutral';
    target?: string;
    external?: string[];
    treeShake?: boolean;
  };
  esbuild?: {
    define?: Record<string, string>;
  };
  autoInstall?: boolean;
}

/**
 * CLI command options
 */
export interface BundleCommandOptions {
  output?: string;
  minify?: boolean;
  platform?: string;
  target?: string;
  external?: string;
  treeShake?: boolean;
  config?: string;
  autoInstall?: boolean;
  verbose?: boolean;
}
```

---

## 5. Testing Strategy (Feature 4.1)

### 5.1 Unit Tests

**Total: 75 tests**

#### A. Entry Detector Tests (20 tests)
**File**: `test-bundle-entry-detector.sh`

```bash
Test 1: Detect explicit entry point
Test 2: Detect from package.json main
Test 3: Detect by convention (server.ts)
Test 4: Detect by convention (index.ts)
Test 5: Detect by convention (src/server.ts)
Test 6: Priority order (explicit > convention)
Test 7: Validate SimplyMCP import (present)
Test 8: Validate SimplyMCP import (missing - error)
Test 9: Validate SimplyMCP instantiation (new SimplyMCP)
Test 10: Validate SimplyMCP instantiation (export default)
Test 11: Validate decorator API (@MCPServer)
Test 12: Handle missing entry point (error)
Test 13: Handle invalid entry point (error)
Test 14: Handle non-SimplyMCP file (error)
Test 15: Multiple entry candidates (choose first)
Test 16: Absolute vs relative paths
Test 17: Entry point in subdirectory
Test 18: Entry point with TypeScript
Test 19: Entry point with JavaScript
Test 20: checkSimplyMCPUsage() accuracy
```

#### B. Dependency Resolver Tests (20 tests)
**File**: `test-bundle-dependency-resolver.sh`

```bash
Test 1: Resolve inline dependencies
Test 2: Resolve package.json dependencies
Test 3: Merge dependencies (no conflict)
Test 4: Merge dependencies (conflict, package.json wins)
Test 5: Auto-install integration (Feature 3)
Test 6: Detect native module (fsevents)
Test 7: Detect native module (better-sqlite3)
Test 8: Detect native modules (multiple)
Test 9: Get external dependencies (native)
Test 10: Get external dependencies (user-specified)
Test 11: Get external dependencies (combined)
Test 12: Handle missing package.json
Test 13: Handle corrupted package.json
Test 14: Dependency count accuracy
Test 15: Scoped packages (@scope/package)
Test 16: Empty dependencies
Test 17: Inline-only dependencies
Test 18: Package.json-only dependencies
Test 19: Mixed inline + package.json
Test 20: Validate merge warnings
```

#### C. Config Loader Tests (15 tests)
**File**: `test-bundle-config-loader.sh`

```bash
Test 1: Load JSON config (simplemcp.config.json)
Test 2: Load JS config (simplemcp.config.js)
Test 3: Load MJS config (simplemcp.config.mjs)
Test 4: Find config by convention
Test 5: Handle missing config file (no error)
Test 6: Parse valid JSON
Test 7: Parse invalid JSON (error)
Test 8: Parse valid JavaScript
Test 9: Parse invalid JavaScript (error)
Test 10: Merge with CLI options (CLI wins)
Test 11: Config file priority order
Test 12: Handle corrupted config
Test 13: Default export vs named export
Test 14: Relative vs absolute config path
Test 15: Config in subdirectory
```

#### D. Core Bundler Tests (20 tests)
**File**: `test-bundle-core.sh`

```bash
Test 1: Bundle simple server (no deps)
Test 2: Bundle with dependencies
Test 3: Bundle with inline deps (Feature 2)
Test 4: Bundle with auto-install (Feature 3)
Test 5: Minification enabled
Test 6: Minification disabled
Test 7: Tree-shaking enabled
Test 8: Tree-shaking disabled
Test 9: Platform: node
Test 10: Platform: neutral
Test 11: Target: node18
Test 12: Target: node20
Test 13: External dependencies
Test 14: Native modules auto-external
Test 15: esbuild configuration
Test 16: Build errors propagation
Test 17: Build warnings handling
Test 18: Output file creation
Test 19: Output directory creation
Test 20: Bundle size reporting
```

### 5.2 Integration Tests (20 tests)

**File**: `bundle-integration.test.ts`

```typescript
describe('Bundle Integration Tests (Feature 4.1)', () => {
  test('Bundle simple server (success)', async () => {
    // Create temp server.ts
    // Run: simplemcp bundle server.ts
    // Verify: dist/server.js exists
    // Run bundle: node dist/server.js
    // Verify: server starts
  });

  test('Bundle with dependencies', async () => {
    // Server with axios
    // Bundle
    // Verify axios bundled
    // Run and test
  });

  test('Bundle with inline deps (Feature 2)', async () => {
    // Server with inline deps
    // Bundle
    // Verify deps included
  });

  test('Bundle with auto-install (Feature 3)', async () => {
    // Server with missing deps
    // Bundle --auto-install
    // Verify deps installed
    // Verify deps bundled
  });

  test('Bundle with minification', async () => {
    // Bundle --minify
    // Verify minified (smaller size)
    // Verify works
  });

  test('Bundle with config file', async () => {
    // Create simplemcp.config.js
    // Bundle --config
    // Verify config used
  });

  test('CLI override config', async () => {
    // Config: minify=true
    // CLI: --no-minify
    // Verify not minified
  });

  test('Bundle target version', async () => {
    // Bundle --target node20
    // Verify target in build
  });

  test('Bundle external deps', async () => {
    // Bundle --external axios
    // Verify axios not bundled
  });

  test('Bundle native module auto-external', async () => {
    // Server with better-sqlite3
    // Bundle
    // Verify better-sqlite3 external
  });

  // Error handling
  test('Bundle non-existent entry (error)', async () => {
    // Bundle missing.ts
    // Expect error
  });

  test('Bundle non-SimplyMCP file (error)', async () => {
    // Bundle regular.ts (no SimplyMCP)
    // Expect error
  });

  test('Bundle with build errors (error)', async () => {
    // Server with syntax errors
    // Bundle
    // Expect build error
  });

  test('Bundle conflicting deps (warning)', async () => {
    // Inline: axios@^1.6.0
    // package.json: axios@^1.5.0
    // Verify warning shown
  });

  // Output
  test('Bundle to custom output path', async () => {
    // Bundle --output custom/path.js
    // Verify created at custom path
  });

  test('Bundle creates output directory', async () => {
    // Bundle --output deep/nested/server.js
    // Verify directory created
  });

  test('Bundle size reporting', async () => {
    // Bundle
    // Verify size reported
    // Verify accurate
  });

  test('Bundle statistics', async () => {
    // Bundle --verbose
    // Verify stats shown
    // Verify accurate
  });

  test('Bundle multiple servers', async () => {
    // Bundle server1.ts
    // Bundle server2.ts
    // Verify both work
  });

  test('Bundle with banner/footer', async () => {
    // Config with banner/footer
    // Bundle
    // Verify banner/footer in output
  });
});
```

---

## 6. Implementation Checklist (Feature 4.1)

### Phase A: CLI Infrastructure (Days 1-2)

- [ ] **Setup CLI framework**
  - [ ] Add `commander` dependency
  - [ ] Create `mcp/cli/index.ts` (CLI entry)
  - [ ] Add `bin` field to package.json
  - [ ] Test: `simplemcp --version`

- [ ] **Bundle command skeleton**
  - [ ] Create `mcp/cli/bundle.ts`
  - [ ] Parse bundle command options
  - [ ] Handle --help
  - [ ] Test: `simplemcp bundle --help`

### Phase B: Entry Point Detection (Days 3-4)

- [ ] **entry-detector.ts**
  - [ ] Implement `detectEntryPoint()`
  - [ ] Implement `findEntryByConvention()`
  - [ ] Implement `validateEntryPoint()`
  - [ ] Implement `checkSimplyMCPUsage()`
  - [ ] Write unit tests (20 tests)

### Phase C: Dependency Resolution (Days 5-6)

- [ ] **dependency-resolver.ts**
  - [ ] Implement `resolveDependencies()`
  - [ ] Implement `mergeDependencies()`
  - [ ] Implement `detectNativeModules()`
  - [ ] Implement `getExternalDependencies()`
  - [ ] Integrate Feature 2 (inline deps)
  - [ ] Integrate Feature 3 (auto-install)
  - [ ] Write unit tests (20 tests)

### Phase D: Core Bundler (Days 7-8)

- [ ] **Add esbuild dependency**
  - [ ] `npm install --save-dev esbuild`

- [ ] **bundler.ts**
  - [ ] Implement `bundle()` main function
  - [ ] Implement `configureBuild()`
  - [ ] Implement `runBuild()`
  - [ ] Implement `validateResult()`
  - [ ] Write unit tests (20 tests)

- [ ] **bundle-types.ts**
  - [ ] Define `BundleOptions`
  - [ ] Define `BundleResult`
  - [ ] Define `BundleStats`
  - [ ] Define `BundleConfig`
  - [ ] Define `BundleCommandOptions`

### Phase E: Configuration (Day 9)

- [ ] **config-loader.ts**
  - [ ] Implement `loadConfig()`
  - [ ] Implement `findConfigFile()`
  - [ ] Implement `parseConfig()`
  - [ ] Support JSON config
  - [ ] Support JavaScript config
  - [ ] Write unit tests (15 tests)

- [ ] **Example config**
  - [ ] Create `simplemcp.config.example.js`
  - [ ] Document all options

### Phase F: Integration & Testing (Day 10)

- [ ] **Integration tests**
  - [ ] Write bundle-integration.test.ts (20 tests)
  - [ ] Test all combinations
  - [ ] Test Features 2 & 3 integration

- [ ] **Examples**
  - [ ] Create `examples/bundling/basic-bundle-example.ts`
  - [ ] Create `examples/bundling/production-bundle.ts`
  - [ ] Create config example directory

- [ ] **CLI integration test**
  - [ ] Test real CLI execution
  - [ ] Test help output
  - [ ] Test version output

### Phase G: Documentation & Polish (Day 10)

- [ ] **Documentation**
  - [ ] Update main README
  - [ ] Add bundling section
  - [ ] Document CLI options
  - [ ] Add troubleshooting section

- [ ] **Code review**
  - [ ] Review all code
  - [ ] Check error handling
  - [ ] Verify type safety
  - [ ] Test edge cases

---

## 7. Success Criteria (Feature 4.1)

### 7.1 Feature Complete When:

- [ ] CLI command works: `simplemcp bundle server.ts`
- [ ] Single-file bundle created
- [ ] Bundle is runnable: `node dist/server.js`
- [ ] Entry point auto-detection works
- [ ] Dependency resolution works (Features 2 & 3)
- [ ] Native modules auto-external
- [ ] Configuration file support works
- [ ] Minification works
- [ ] Tree-shaking works
- [ ] All 75 unit tests pass
- [ ] All 20 integration tests pass
- [ ] Documentation complete
- [ ] Examples work

### 7.2 User Acceptance:

1. **User can bundle a server**
   ```bash
   simplemcp bundle server.ts
   # Creates: dist/server.js
   ```

2. **Bundle runs successfully**
   ```bash
   node dist/server.js
   # Server starts and works
   ```

3. **User can use config file**
   ```bash
   simplemcp bundle --config simplemcp.config.js
   ```

4. **User can minify**
   ```bash
   simplemcp bundle server.ts --minify
   # Bundle is minified
   ```

5. **Auto-install works**
   ```bash
   simplemcp bundle server.ts --auto-install
   # Dependencies installed, then bundled
   ```

---

## 8. Next Steps After Feature 4.1

Once Feature 4.1 is complete, proceed to **Feature 4.2**:

- [ ] Standalone format (directory structure)
- [ ] Executable format (pkg/nexe)
- [ ] Source maps (inline, external, both)
- [ ] Watch mode for development
- [ ] Cross-platform executable builds
- [ ] ESM/CJS explicit control

---

## Summary

**Feature 4.1 delivers**:
✅ Working CLI infrastructure
✅ Single-file bundling (core use case)
✅ Integration with Features 2 & 3
✅ Production-ready bundles (minification, tree-shaking)
✅ Configuration file support

**Estimated Timeline**: 10 days

**Next**: Feature 4.2 (Advanced Formats & Distribution)
