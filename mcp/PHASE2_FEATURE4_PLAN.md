# Phase 2, Feature 4: Bundling Command - Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for adding a CLI bundling command to SimpleMCP servers. This feature will package SimpleMCP servers into standalone distributions for easy deployment, eliminating the need for end users to manage dependencies or configuration.

**Status**: Planning Phase
**Priority**: HIGH
**Estimated Complexity**: High
**Breaking Changes**: None (fully opt-in, backward compatible)
**Relation to Phase 2**: Feature 4 of 4 (builds on Features 2 & 3)

---

## 1. Overview

### 1.1 What is Bundling?

Bundling packages SimpleMCP servers into standalone, production-ready distributions that can be deployed anywhere without external dependencies.

**Key Capabilities:**
1. **Single-file bundles** - All code and dependencies in one .js file
2. **Standalone distributions** - Complete directory with node_modules
3. **Executable binaries** - Native executables for each platform
4. **Multiple output formats** - ESM, CJS, or hybrid
5. **Source maps** - Debug support in production
6. **Tree-shaking** - Remove unused code
7. **Minification** - Reduce bundle size
8. **Cross-platform** - Bundle for Linux, macOS, Windows

### 1.2 FastMCP Parity Goals

Python's FastMCP uses standard Python packaging (pip, PyPI) but doesn't have a direct equivalent to bundling. SimpleMCP's bundling feature goes beyond FastMCP by providing:

**SimpleMCP Bundling Goals:**
- **Single-file distribution** - Bundle everything into one file
- **Zero-dependency deployment** - No npm install required
- **Platform-native binaries** - True executables (optional)
- **Production optimization** - Minified, tree-shaken code
- **Easy deployment** - Copy and run
- **Multiple formats** - Choose output format per use case

**Comparison:**

| Aspect | FastMCP (Python) | SimpleMCP (TypeScript) |
|--------|------------------|------------------------|
| **Distribution** | pip install | Bundle to single file |
| **Dependencies** | Requirements.txt | Bundled into output |
| **Deployment** | Python + pip | Copy bundle file |
| **Optimization** | Bytecode | Minification + tree-shaking |
| **Executables** | PyInstaller (external) | Built-in (pkg) |

### 1.3 User Experience

**Before (Manual deployment):**
```bash
# Developer must:
1. Copy all source files
2. Copy package.json
3. Copy node_modules (huge!)
4. Setup environment
5. Configure runtime

# User directory (50+ MB):
server/
  ├── node_modules/         # 45 MB
  ├── src/                  # Source code
  ├── package.json
  ├── tsconfig.json
  └── ...
```

**After (Bundled deployment):**
```bash
# Developer runs:
simplemcp bundle server.ts --output dist/server.js

# User directory (< 1 MB):
server.js                   # 800 KB - everything bundled

# Just run it:
node server.js
```

**Example CLI usage:**
```bash
# Basic bundling
simplemcp bundle server.ts

# Advanced options
simplemcp bundle server.ts \
  --output dist/bundle.js \
  --format esm \
  --minify \
  --sourcemap \
  --platform node

# Create executable
simplemcp bundle server.ts \
  --format executable \
  --output dist/server
```

---

## 2. Design Decisions

### 2.1 Bundler Technology

**Decision: Use esbuild as primary bundler**

**Rationale:**
- **Speed**: 100x faster than webpack, 10x faster than rollup
- **TypeScript support**: Native, no plugins needed
- **Single-file output**: Built-in support
- **Tree-shaking**: Automatic dead code elimination
- **Minification**: Built-in minifier
- **Source maps**: First-class support
- **Node.js target**: Optimized for Node bundles
- **Active development**: Well-maintained (2025)

**Alternative Considered: @vercel/ncc**
- ✅ Pros: Zero config, simple API, designed for Node
- ❌ Cons: Less flexible, fewer features, slower than esbuild
- **Decision**: Use esbuild, but document ncc as alternative

**Dependency Strategy:**
```typescript
// Add esbuild as devDependency
{
  "devDependencies": {
    "esbuild": "^0.20.0"  // Latest stable
  }
}
```

### 2.2 CLI Interface

**Decision: New `simplemcp bundle` command**

**Command Structure:**
```bash
simplemcp bundle <entry> [options]

Arguments:
  entry                Entry point file (e.g., server.ts)

Options:
  -o, --output <path>       Output file/directory path
  -f, --format <format>     Output format: single-file|standalone|executable|esm|cjs
  -m, --minify              Minify output (default: true in production)
  --no-minify              Disable minification
  -s, --sourcemap          Generate source maps
  -p, --platform <platform> Target platform: node|neutral (default: node)
  -t, --target <version>    Target Node.js version (default: node18)
  -e, --external <packages> External packages (comma-separated)
  --tree-shake             Enable tree-shaking (default: true)
  --no-tree-shake          Disable tree-shaking
  -c, --config <path>      Config file path (default: simplemcp.config.js)
  -w, --watch              Watch mode for development
  -v, --verbose            Verbose output
  -h, --help               Show help
```

**Example Usage:**
```bash
# Basic single-file bundle
simplemcp bundle server.ts

# Production bundle (minified, optimized)
simplemcp bundle server.ts --output dist/server.js --minify

# Development bundle with source maps
simplemcp bundle server.ts --sourcemap --no-minify

# Create native executable
simplemcp bundle server.ts --format executable --output dist/server

# Watch mode
simplemcp bundle server.ts --watch --sourcemap
```

**Rationale:**
- Familiar CLI pattern (like `tsc`, `esbuild`)
- Rich options for flexibility
- Sensible defaults for common cases
- Interactive prompts for missing options (optional)

### 2.3 Output Formats

**Decision: Support 4 primary output formats**

#### Format 1: Single-File (default)
```bash
simplemcp bundle server.ts --format single-file
# Output: server.js (all code bundled)
```

**Characteristics:**
- All code and dependencies in one .js file
- Minified and tree-shaken
- Node.js modules bundled
- Smallest footprint
- **Use case**: Simple deployment, serverless functions

#### Format 2: Standalone
```bash
simplemcp bundle server.ts --format standalone
# Output: dist/ (directory with assets)
```

**Characteristics:**
- Bundle + necessary assets in directory
- Includes package.json (minimal)
- Native modules in node_modules/
- Configuration files
- **Use case**: Traditional deployment, Docker containers

**Directory structure:**
```
dist/
  ├── server.js           # Bundled code
  ├── package.json        # Minimal (runtime dependencies only)
  ├── node_modules/       # Native modules (if any)
  └── assets/             # Static assets
```

#### Format 3: Executable
```bash
simplemcp bundle server.ts --format executable
# Output: server (native binary for current platform)
```

**Characteristics:**
- Single executable file (no Node.js required!)
- Uses `pkg` or `nexe` under the hood
- Platform-specific (Linux, macOS, Windows)
- Largest file size (~50 MB)
- **Use case**: End-user distribution, no Node.js dependency

**Cross-compilation:**
```bash
# Build for all platforms
simplemcp bundle server.ts --format executable \
  --platform linux,macos,windows
# Output:
#   server-linux
#   server-macos
#   server-win.exe
```

#### Format 4: ESM/CJS
```bash
simplemcp bundle server.ts --format esm
simplemcp bundle server.ts --format cjs
```

**Characteristics:**
- Specify module format explicitly
- ESM: Modern, tree-shakeable
- CJS: Compatible with older Node
- **Use case**: Library distribution, compatibility needs

**Rationale:**
- Different use cases require different formats
- Single-file for simplicity
- Standalone for compatibility
- Executable for end users
- ESM/CJS for library authors

### 2.4 Entry Point Detection

**Decision: Explicit entry point required, with auto-detection fallback**

**Primary Method: Explicit `--entry` argument**
```bash
simplemcp bundle server.ts
```

**Fallback Methods (in priority order):**
1. **package.json "main" field**
   ```json
   {
     "main": "./src/server.ts"
   }
   ```

2. **simplemcp.config.js "entry" field**
   ```javascript
   export default {
     entry: './src/server.ts'
   }
   ```

3. **Convention-based detection** (look for these files):
   - `server.ts`
   - `index.ts`
   - `main.ts`
   - `src/server.ts`
   - `src/index.ts`

**Validation:**
```typescript
/**
 * Validate entry point is a SimpleMCP server
 */
async function validateEntryPoint(filePath: string): Promise<boolean> {
  const source = await readFile(filePath, 'utf-8');

  // Check for SimpleMCP imports
  if (!source.includes('SimpleMCP')) {
    throw new Error(
      `Entry point must import SimpleMCP: ${filePath}`
    );
  }

  // Check for SimpleMCP instantiation or export
  const hasNew = /new\s+SimpleMCP/.test(source);
  const hasDefault = /export\s+default.*SimpleMCP/.test(source);

  if (!hasNew && !hasDefault) {
    throw new Error(
      `Entry point must create or export SimpleMCP instance: ${filePath}`
    );
  }

  return true;
}
```

**Rationale:**
- Explicit entry point is clearest
- Fallbacks provide convenience
- Validation prevents bundling wrong files
- Clear error messages guide users

### 2.5 Dependency Handling

**Decision: Bundle all dependencies by default, with external option**

**Default Behavior: Bundle Everything**
```bash
simplemcp bundle server.ts
# Bundles: all dependencies from package.json and inline deps
```

**External Dependencies:**
```bash
simplemcp bundle server.ts --external fsevents,better-sqlite3
# These dependencies remain external (not bundled)
```

**Why External?**
- Native modules (can't be bundled)
- Peer dependencies (user provides)
- Large dependencies (reduce bundle size)
- Dynamic requires (can't be statically analyzed)

**Auto-Detection of Native Modules:**
```typescript
const NATIVE_MODULES = [
  'fsevents',
  'better-sqlite3',
  'sharp',
  'node-gyp',
  // Add more as discovered
];

function detectNativeModules(dependencies: Record<string, string>): string[] {
  return Object.keys(dependencies).filter(dep =>
    NATIVE_MODULES.includes(dep)
  );
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

// 3. Bundle everything (Feature 4)
const bundleResult = await bundle({
  entry: filePath,
  dependencies: {
    ...packageJsonDeps,
    ...inlineDeps.map
  }
});
```

**Rationale:**
- Simplest UX: bundle everything by default
- External option provides escape hatch
- Auto-detect native modules (common issue)
- Seamless integration with previous features

### 2.6 Configuration File

**Decision: Support optional `simplemcp.config.js` (or .ts/.json)**

**Configuration Schema:**
```typescript
export interface BundleConfig {
  // Entry point
  entry?: string;

  // Output configuration
  output?: {
    dir?: string;           // Output directory
    filename?: string;      // Output filename
    format?: BundleFormat;  // Output format
  };

  // Bundle options
  bundle?: {
    minify?: boolean;
    sourcemap?: boolean;
    platform?: 'node' | 'neutral';
    target?: string;        // e.g., 'node18'
    external?: string[];    // External packages
    treeShake?: boolean;
    banner?: string;        // Prepend to output
    footer?: string;        // Append to output
  };

  // Advanced options
  esbuild?: {
    // Pass-through to esbuild
    loader?: Record<string, Loader>;
    define?: Record<string, string>;
    plugins?: Plugin[];
  };

  // Integration with Features 2 & 3
  autoInstall?: boolean;
  dependencies?: Record<string, string>;
}

export type BundleFormat =
  | 'single-file'
  | 'standalone'
  | 'executable'
  | 'esm'
  | 'cjs';
```

**Example Configuration Files:**

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
    sourcemap: true,
    platform: 'node',
    target: 'node18',
    external: ['fsevents', 'better-sqlite3'],
    treeShake: true,
  },
  autoInstall: true,
};
```

**simplemcp.config.ts (with type safety):**
```typescript
import { BundleConfig } from 'simplemcp/bundler';

export default {
  entry: './src/server.ts',
  output: {
    format: 'standalone',
  },
  bundle: {
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
  },
} satisfies BundleConfig;
```

**simplemcp.config.json (simple):**
```json
{
  "entry": "./src/server.ts",
  "output": {
    "format": "single-file"
  },
  "bundle": {
    "minify": true
  }
}
```

**CLI Override:**
```bash
# Config file values can be overridden by CLI flags
simplemcp bundle --config simplemcp.config.js --minify=false
# Result: minify disabled (CLI wins)
```

**Rationale:**
- Configuration file for complex projects
- CLI for quick one-offs
- TypeScript config for type safety
- JSON config for simplicity
- CLI flags override config file

### 2.7 Source Maps

**Decision: Optional source maps, default off in production**

**Usage:**
```bash
# Enable source maps
simplemcp bundle server.ts --sourcemap

# Source map types
simplemcp bundle server.ts --sourcemap=inline   # Inline in bundle
simplemcp bundle server.ts --sourcemap=external # Separate .map file
simplemcp bundle server.ts --sourcemap=both     # Both inline and external
```

**Source Map Behavior:**
- **Development**: Source maps on by default
- **Production**: Source maps off by default (size concerns)
- **Inline**: Larger bundle, but single file
- **External**: Smaller bundle, but two files

**Source Map Format:**
```typescript
interface SourceMapOptions {
  enabled: boolean;
  type: 'inline' | 'external' | 'both';
  includeContent?: boolean;  // Include source content in map
}
```

**Rationale:**
- Debug production issues with source maps
- Default off to minimize bundle size
- Flexible options for different needs
- Clear CLI flags for control

### 2.8 Minification

**Decision: Minify by default in production mode**

**Auto-Detection:**
```typescript
const shouldMinify = options.minify ?? (
  process.env.NODE_ENV === 'production' ||
  !options.watch
);
```

**CLI Control:**
```bash
# Explicit minify
simplemcp bundle server.ts --minify

# Disable minify
simplemcp bundle server.ts --no-minify

# Auto (based on NODE_ENV)
simplemcp bundle server.ts
```

**Minification Options:**
```typescript
interface MinifyOptions {
  enabled: boolean;

  // esbuild minify options
  minifyWhitespace?: boolean;
  minifyIdentifiers?: boolean;
  minifySyntax?: boolean;

  // License comments
  legalComments?: 'none' | 'inline' | 'eof' | 'external';
}
```

**Size Comparison:**
```
Original:        500 KB (with comments, whitespace)
Minified:        200 KB (60% reduction)
Minified + Gzip: 50 KB  (90% reduction)
```

**Rationale:**
- Production bundles should be small
- Development bundles readable
- Clear on/off flags
- Preserve license comments (legal requirement)

### 2.9 Platform Targeting

**Decision: Target Node.js by default, support neutral**

**Platform Options:**
- **node** (default): Optimized for Node.js runtime
  - Keeps Node.js built-ins external (fs, path, etc.)
  - Uses Node.js module resolution
  - Optimized for server-side execution

- **neutral**: Platform-agnostic bundle
  - No Node.js built-ins
  - Can run in browser or edge runtimes
  - Useful for isomorphic code

**Target Version:**
```bash
# Target specific Node.js version
simplemcp bundle server.ts --target node18
simplemcp bundle server.ts --target node20
simplemcp bundle server.ts --target node22

# Auto-detect from .nvmrc or package.json engines
simplemcp bundle server.ts --target auto
```

**package.json Integration:**
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Rationale:**
- SimpleMCP is Node.js-first
- Neutral platform for edge/browser use cases
- Target version ensures compatibility
- Auto-detection from existing config

### 2.10 Watch Mode

**Decision: Support watch mode for development**

**Usage:**
```bash
# Watch for changes and rebuild
simplemcp bundle server.ts --watch

# Watch with custom options
simplemcp bundle server.ts --watch --no-minify --sourcemap
```

**Watch Behavior:**
```typescript
interface WatchOptions {
  enabled: boolean;

  // Watch options
  poll?: boolean;          // Use polling (for network drives)
  interval?: number;       // Poll interval (ms)
  ignored?: string[];      // Ignore patterns

  // Rebuild options
  onRebuild?: (error: Error | null, result: BuildResult) => void;
}
```

**Console Output:**
```
[watch] Build started...
[watch] Build succeeded in 120ms
[watch] Watching for changes...
[watch] File changed: src/server.ts
[watch] Rebuilding...
[watch] Build succeeded in 45ms
```

**Rationale:**
- Fast iteration during development
- Rebuild on file changes
- Clear feedback in console
- Optional (off by default)

### 2.11 Integration with Features 2 & 3

**Decision: Seamless integration with inline dependencies and auto-installation**

**Workflow:**
```bash
# Step 1: Bundle detects inline dependencies (Feature 2)
# Step 2: Auto-installs missing dependencies (Feature 3)
# Step 3: Bundles everything (Feature 4)

simplemcp bundle server.ts --auto-install
```

**Integration Flow:**
```
1. Read server.ts
2. Parse inline dependencies (Feature 2)
   → { axios: '^1.6.0', zod: '^3.22.0' }
3. Check installed status (Feature 3)
   → Missing: ['axios']
4. Auto-install (Feature 3)
   → npm install axios@^1.6.0
5. Bundle (Feature 4)
   → Include axios in bundle
6. Output: server.js
```

**API Integration:**
```typescript
import { bundle } from 'simplemcp/bundler';
import { SimpleMCP } from 'simplemcp';

// Load server with inline deps
const server = await SimpleMCP.fromFile('./server.ts', {
  autoInstall: true  // Feature 3
});

// Bundle server
const result = await bundle({
  entry: './server.ts',
  dependencies: server.getDependencies(),  // Feature 2
  output: 'dist/server.js',
});
```

**Rationale:**
- Features work together seamlessly
- Single command for full workflow
- Auto-installation before bundling
- Inline deps included in bundle

---

## 3. Architecture Design

### 3.1 Component Overview

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
│  └─ Call bundler core                                   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│         Entry Point Detector                             │
│  ├─ Detect entry point                                   │
│  ├─ Validate SimpleMCP usage                            │
│  └─ Return entry path                                   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│    Dependency Resolver (Feature 2 & 3)                  │
│  ├─ Parse inline dependencies                           │
│  ├─ Merge with package.json                             │
│  ├─ Auto-install if requested                           │
│  └─ Return dependency list                              │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│            Bundler Core (bundler.ts)                     │
│  ├─ Configure esbuild                                    │
│  ├─ Set bundle options                                   │
│  ├─ Run bundling process                                │
│  └─ Generate output files                               │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│         Output Formatter                                 │
│  ├─ Single-file: Copy bundle                            │
│  ├─ Standalone: Create directory structure              │
│  ├─ Executable: Use pkg/nexe                            │
│  └─ ESM/CJS: Configure module format                    │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│            Bundle Result                                 │
│  - Output path(s)                                        │
│  - Bundle size                                           │
│  - Warnings/errors                                       │
│  - Statistics                                            │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
User runs:
simplemcp bundle server.ts --output dist/server.js --minify
         │
         ▼
CLI Parser (bundle.ts)
  - Parse args: { entry: 'server.ts', output: 'dist/server.js', minify: true }
  - Load config file (if exists)
  - Merge options
         │
         ▼
Entry Point Detector
  - Validate server.ts exists
  - Check for SimpleMCP import
  - Verify SimpleMCP instantiation
  → Entry: /path/to/server.ts
         │
         ▼
Dependency Resolver
  - Parse inline deps from server.ts
    → { axios: '^1.6.0', zod: '^3.22.0' }
  - Merge with package.json
  - Auto-install missing (if --auto-install)
         │
         ▼
Bundler Core
  - Configure esbuild:
    {
      entryPoints: ['/path/to/server.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      minify: true,
      outfile: 'dist/server.js'
    }
  - Run build()
         │
         ▼
esbuild builds:
  - Resolve imports
  - Bundle dependencies (axios, zod)
  - Tree-shake unused code
  - Minify output
  - Generate source map (if requested)
         │
         ▼
Output Formatter
  - Single-file: dist/server.js
  - Add banner/footer (if configured)
  - Write output files
         │
         ▼
Bundle Result
  {
    success: true,
    outputFiles: ['dist/server.js'],
    size: 856234,  // bytes
    warnings: [],
    stats: {
      entryPoint: 'server.ts',
      dependencies: 15,
      bundleTime: 234,  // ms
    }
  }
```

### 3.3 File Structure

```
mcp/
├── cli/                                 (NEW)
│   ├── index.ts                         (NEW - CLI entry point)
│   ├── bundle.ts                        (NEW - bundle command)
│   ├── commands/                        (NEW - future commands)
│   │   └── bundle/
│   │       ├── bundle-command.ts        (NEW - command handler)
│   │       ├── bundle-options.ts        (NEW - option parser)
│   │       └── bundle-reporter.ts       (NEW - progress reporting)
│   └── utils/
│       ├── config-loader.ts             (NEW - load config files)
│       └── logger.ts                    (NEW - CLI logger)
│
├── core/
│   ├── bundler.ts                       (NEW - ~400 lines)
│   │   ├── bundle()
│   │   ├── configureBuild()
│   │   ├── runBuild()
│   │   └── validateResult()
│   │
│   ├── bundle-types.ts                  (NEW - ~200 lines)
│   │   ├── BundleOptions
│   │   ├── BundleResult
│   │   ├── BundleConfig
│   │   ├── BundleFormat
│   │   └── BundleStats
│   │
│   ├── entry-detector.ts                (NEW - ~150 lines)
│   │   ├── detectEntryPoint()
│   │   ├── validateEntryPoint()
│   │   ├── findEntryByConvention()
│   │   └── checkSimpleMCPUsage()
│   │
│   ├── dependency-resolver.ts           (NEW - ~250 lines)
│   │   ├── resolveDependencies()
│   │   ├── mergeDependencies()
│   │   ├── detectNativeModules()
│   │   ├── getExternalDependencies()
│   │   └── validateDependencies()
│   │
│   ├── output-formatter.ts              (NEW - ~300 lines)
│   │   ├── formatOutput()
│   │   ├── createSingleFile()
│   │   ├── createStandalone()
│   │   ├── createExecutable()
│   │   └── createModuleBundle()
│   │
│   ├── config-loader.ts                 (NEW - ~150 lines)
│   │   ├── loadConfig()
│   │   ├── findConfigFile()
│   │   ├── parseConfig()
│   │   └── mergeWithCLI()
│   │
│   ├── dependency-parser.ts             (EXISTING - Feature 2)
│   ├── dependency-installer.ts          (EXISTING - Feature 3)
│   └── ...
│
├── SimpleMCP.ts                         (EXISTING - no changes)
│
├── examples/
│   └── bundling/                        (NEW)
│       ├── basic-bundle.md              (NEW - ~80 lines)
│       ├── advanced-bundle.md           (NEW - ~120 lines)
│       ├── config-example.md            (NEW - ~100 lines)
│       ├── executable-example.md        (NEW - ~80 lines)
│       └── watch-mode.md                (NEW - ~60 lines)
│
├── simplemcp.config.example.js          (NEW - ~50 lines)
├── simplemcp.config.example.ts          (NEW - ~60 lines)
│
├── package.json                         (MODIFIED)
│   └── Add "bin" field, esbuild devDep
│
└── tests/
    └── phase2/
        ├── test-bundle-entry-detector.sh       (NEW - ~400 lines / 20 tests)
        ├── test-bundle-dependency-resolver.sh  (NEW - ~450 lines / 20 tests)
        ├── test-bundle-output-formatter.sh     (NEW - ~400 lines / 20 tests)
        ├── test-bundle-config-loader.sh        (NEW - ~300 lines / 15 tests)
        ├── bundle-integration.test.ts          (NEW - ~800 lines / 30 tests)
        ├── test-bundle-e2e.sh                  (NEW - ~400 lines / 15 tests)
        └── run-bundle-tests.sh                 (NEW - master test runner)
```

---

## 4. Core Components

### 4.1 CLI Entry Point

**File: `/mcp/cli/index.ts`**

**Purpose:** Main CLI entry point, routes commands

```typescript
#!/usr/bin/env node
/**
 * SimpleMCP CLI
 * Main entry point for all CLI commands
 */

import { program } from 'commander';
import { bundleCommand } from './bundle.js';

// CLI version from package.json
import { readFileSync } from 'fs';
import { join } from 'path';
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
);

program
  .name('simplemcp')
  .description('SimpleMCP CLI - Build and bundle MCP servers')
  .version(packageJson.version);

// Bundle command
program
  .command('bundle <entry>')
  .description('Bundle a SimpleMCP server into a standalone file')
  .option('-o, --output <path>', 'Output file or directory path')
  .option('-f, --format <format>', 'Output format: single-file|standalone|executable|esm|cjs', 'single-file')
  .option('-m, --minify', 'Minify output', true)
  .option('--no-minify', 'Disable minification')
  .option('-s, --sourcemap [type]', 'Generate source maps (inline|external|both)')
  .option('-p, --platform <platform>', 'Target platform: node|neutral', 'node')
  .option('-t, --target <version>', 'Target Node.js version', 'node18')
  .option('-e, --external <packages>', 'External packages (comma-separated)')
  .option('--tree-shake', 'Enable tree-shaking', true)
  .option('--no-tree-shake', 'Disable tree-shaking')
  .option('-c, --config <path>', 'Config file path')
  .option('-w, --watch', 'Watch mode for development')
  .option('--auto-install', 'Auto-install dependencies before bundling')
  .option('-v, --verbose', 'Verbose output')
  .action(bundleCommand);

// Parse CLI arguments
program.parse();
```

**Test Coverage:** 5 tests
- CLI loads correctly
- --version shows package version
- --help shows command list
- Invalid command shows error
- Bundle command routes correctly

### 4.2 Bundle Command

**File: `/mcp/cli/bundle.ts`**

**Purpose:** Handle `bundle` command, orchestrate bundling process

```typescript
import { bundle } from '../core/bundler.js';
import { loadConfig } from '../core/config-loader.js';
import { BundleOptions, BundleResult } from '../core/bundle-types.js';
import { logger } from './utils/logger.js';

export async function bundleCommand(
  entry: string,
  options: any
): Promise<void> {
  try {
    logger.info(`Bundling ${entry}...`);

    // 1. Load configuration file (if specified)
    const config = options.config
      ? await loadConfig(options.config)
      : await loadConfig(); // Auto-detect

    // 2. Merge CLI options with config
    const bundleOptions: BundleOptions = {
      entry,
      output: options.output || config?.output,
      format: options.format || config?.output?.format || 'single-file',
      minify: options.minify ?? config?.bundle?.minify ?? true,
      sourcemap: options.sourcemap || config?.bundle?.sourcemap,
      platform: options.platform || config?.bundle?.platform || 'node',
      target: options.target || config?.bundle?.target || 'node18',
      external: parseExternal(options.external) || config?.bundle?.external,
      treeShake: options.treeShake ?? config?.bundle?.treeShake ?? true,
      watch: options.watch || false,
      autoInstall: options.autoInstall || config?.autoInstall,
      verbose: options.verbose || false,
    };

    // 3. Run bundler
    const result = await bundle(bundleOptions);

    // 4. Report results
    if (result.success) {
      logger.success(`Bundle created successfully!`);
      logger.info(`Output: ${result.outputFiles.join(', ')}`);
      logger.info(`Size: ${formatBytes(result.size)}`);
      logger.info(`Time: ${result.stats.bundleTime}ms`);

      if (result.warnings.length > 0) {
        logger.warn(`Warnings: ${result.warnings.length}`);
        result.warnings.forEach(w => logger.warn(`  - ${w}`));
      }
    } else {
      logger.error('Bundle failed!');
      result.errors.forEach(e => logger.error(`  - ${e}`));
      process.exit(1);
    }

  } catch (error) {
    logger.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    if (options.verbose && error instanceof Error && error.stack) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

function parseExternal(external?: string): string[] | undefined {
  if (!external) return undefined;
  return external.split(',').map(s => s.trim());
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

**Test Coverage:** 10 tests
- Parse CLI arguments correctly
- Load and merge config file
- Handle missing entry point
- Handle invalid options
- Report success output
- Report warnings
- Report errors
- Handle --watch mode
- Handle --auto-install
- Verbose logging

### 4.3 Bundler Core

**File: `/mcp/core/bundler.ts`**

**Purpose:** Core bundling logic using esbuild

```typescript
import * as esbuild from 'esbuild';
import { BundleOptions, BundleResult, BundleFormat } from './bundle-types.js';
import { detectEntryPoint, validateEntryPoint } from './entry-detector.js';
import { resolveDependencies } from './dependency-resolver.js';
import { formatOutput } from './output-formatter.js';
import { readFile } from 'fs/promises';
import { join, dirname, basename } from 'path';

/**
 * Bundle a SimpleMCP server
 *
 * @param options - Bundle options
 * @returns Bundle result
 */
export async function bundle(options: BundleOptions): Promise<BundleResult> {
  const startTime = Date.now();

  try {
    // 1. Detect and validate entry point
    const entryPath = await detectEntryPoint(options.entry);
    await validateEntryPoint(entryPath);

    // 2. Resolve dependencies (Features 2 & 3 integration)
    const dependencies = await resolveDependencies(entryPath, {
      autoInstall: options.autoInstall,
    });

    // 3. Configure esbuild
    const buildConfig = configureBuild(entryPath, options, dependencies);

    // 4. Run build
    const buildResult = options.watch
      ? await runWatchBuild(buildConfig)
      : await runBuild(buildConfig);

    // 5. Format output based on format
    const outputFiles = await formatOutput(buildResult, options);

    // 6. Gather statistics
    const stats = {
      entryPoint: basename(entryPath),
      dependencies: dependencies.length,
      bundleTime: Date.now() - startTime,
      outputFormat: options.format || 'single-file',
      minified: options.minify ?? true,
      sourcemap: !!options.sourcemap,
    };

    // 7. Calculate total size
    const totalSize = buildResult.outputFiles
      ?.reduce((sum, file) => sum + file.contents.byteLength, 0) || 0;

    return {
      success: true,
      outputFiles,
      size: totalSize,
      warnings: buildResult.warnings.map(w => w.text),
      errors: [],
      stats,
    };

  } catch (error) {
    return {
      success: false,
      outputFiles: [],
      size: 0,
      warnings: [],
      errors: [error instanceof Error ? error.message : String(error)],
      stats: {
        entryPoint: basename(options.entry),
        dependencies: 0,
        bundleTime: Date.now() - startTime,
        outputFormat: options.format || 'single-file',
        minified: false,
        sourcemap: false,
      },
    };
  }
}

/**
 * Configure esbuild options
 */
function configureBuild(
  entryPath: string,
  options: BundleOptions,
  dependencies: string[]
): esbuild.BuildOptions {
  const outfile = options.output || `dist/${basename(entryPath, '.ts')}.js`;

  return {
    entryPoints: [entryPath],
    bundle: true,
    outfile,

    // Platform and target
    platform: options.platform || 'node',
    target: options.target || 'node18',

    // Format
    format: getEsbuildFormat(options.format),

    // Optimization
    minify: options.minify ?? true,
    treeShaking: options.treeShake ?? true,

    // Source maps
    sourcemap: getSourceMapType(options.sourcemap),

    // External packages
    external: options.external || [],

    // Metadata
    metafile: true,
    write: false,  // We'll write files manually

    // Node.js built-ins
    packages: 'external',  // Don't bundle node_modules by default

    // Banner/footer
    banner: options.banner ? { js: options.banner } : undefined,
    footer: options.footer ? { js: options.footer } : undefined,

    // Logging
    logLevel: options.verbose ? 'info' : 'warning',
  };
}

/**
 * Run esbuild
 */
async function runBuild(config: esbuild.BuildOptions): Promise<esbuild.BuildResult> {
  return esbuild.build(config);
}

/**
 * Run esbuild in watch mode
 */
async function runWatchBuild(config: esbuild.BuildOptions): Promise<esbuild.BuildResult> {
  const context = await esbuild.context({
    ...config,
    plugins: [
      ...(config.plugins || []),
      {
        name: 'watch-reporter',
        setup(build) {
          build.onEnd(result => {
            if (result.errors.length > 0) {
              console.error('[watch] Build failed');
            } else {
              console.log('[watch] Build succeeded');
            }
          });
        },
      },
    ],
  });

  await context.watch();

  // Return empty result (watch mode runs forever)
  return {
    errors: [],
    warnings: [],
    outputFiles: [],
  } as esbuild.BuildResult;
}

/**
 * Get esbuild format from bundle format
 */
function getEsbuildFormat(format?: BundleFormat): esbuild.Format {
  switch (format) {
    case 'esm':
      return 'esm';
    case 'cjs':
      return 'cjs';
    case 'single-file':
    case 'standalone':
    case 'executable':
    default:
      return 'esm';  // Default to ESM
  }
}

/**
 * Get source map type
 */
function getSourceMapType(
  sourcemap?: boolean | string
): esbuild.BuildOptions['sourcemap'] {
  if (!sourcemap) return false;
  if (sourcemap === true) return 'external';
  if (sourcemap === 'inline') return 'inline';
  if (sourcemap === 'external') return 'external';
  if (sourcemap === 'both') return 'both';
  return false;
}
```

**Test Coverage:** 25 tests
- Bundle simple server successfully
- Bundle with dependencies
- Bundle with minification
- Bundle with source maps
- Bundle with external packages
- Bundle different formats (ESM, CJS)
- Bundle with tree-shaking
- Bundle with custom config
- Watch mode initialization
- Error handling (invalid entry)
- Error handling (build failures)
- Performance benchmarks

### 4.4 Entry Point Detector

**File: `/mcp/core/entry-detector.ts`**

**Purpose:** Detect and validate SimpleMCP server entry points

```typescript
import { readFile, access } from 'fs/promises';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

/**
 * Detect entry point using multiple strategies
 */
export async function detectEntryPoint(entry: string): Promise<string> {
  // 1. Explicit entry point (user provided)
  if (entry) {
    const resolved = resolve(entry);
    if (existsSync(resolved)) {
      return resolved;
    }
    throw new Error(`Entry point not found: ${entry}`);
  }

  // 2. Look in package.json "main" field
  const packageJsonEntry = await findEntryInPackageJson();
  if (packageJsonEntry) {
    return packageJsonEntry;
  }

  // 3. Convention-based detection
  const conventionEntry = await findEntryByConvention();
  if (conventionEntry) {
    return conventionEntry;
  }

  throw new Error(
    'No entry point found. Please specify entry point: simplemcp bundle <entry>'
  );
}

/**
 * Validate entry point is a SimpleMCP server
 */
export async function validateEntryPoint(filePath: string): Promise<void> {
  const source = await readFile(filePath, 'utf-8');

  // Check for SimpleMCP import
  const hasImport = /import\s+.*SimpleMCP.*from/.test(source);
  const hasRequire = /require\(['"].*SimpleMCP.*['"]\)/.test(source);

  if (!hasImport && !hasRequire) {
    throw new Error(
      `Entry point must import SimpleMCP: ${filePath}\n` +
      `Expected: import { SimpleMCP } from 'simplemcp';`
    );
  }

  // Check for SimpleMCP usage
  const hasNew = /new\s+SimpleMCP/.test(source);
  const hasExport = /export\s+(default\s+)?.*SimpleMCP/.test(source);

  if (!hasNew && !hasExport) {
    throw new Error(
      `Entry point must create or export SimpleMCP instance: ${filePath}\n` +
      `Expected: const server = new SimpleMCP({ ... });`
    );
  }
}

/**
 * Find entry in package.json
 */
async function findEntryInPackageJson(): Promise<string | null> {
  const packageJsonPath = join(process.cwd(), 'package.json');

  if (!existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const packageJson = JSON.parse(
      await readFile(packageJsonPath, 'utf-8')
    );

    if (packageJson.main) {
      const mainPath = resolve(packageJson.main);
      if (existsSync(mainPath)) {
        return mainPath;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Find entry by convention (common file names)
 */
async function findEntryByConvention(): Promise<string | null> {
  const candidates = [
    'server.ts',
    'server.js',
    'index.ts',
    'index.js',
    'main.ts',
    'main.js',
    'src/server.ts',
    'src/server.js',
    'src/index.ts',
    'src/index.js',
  ];

  for (const candidate of candidates) {
    const path = resolve(candidate);
    if (existsSync(path)) {
      // Verify it's a SimpleMCP server
      try {
        await validateEntryPoint(path);
        return path;
      } catch {
        // Not a SimpleMCP server, try next
        continue;
      }
    }
  }

  return null;
}

/**
 * Check if file contains SimpleMCP usage
 */
export function checkSimpleMCPUsage(source: string): boolean {
  const hasImport = /import\s+.*SimpleMCP.*from/.test(source);
  const hasNew = /new\s+SimpleMCP/.test(source);
  return hasImport && hasNew;
}
```

**Test Coverage:** 20 tests
- Detect explicit entry point
- Detect from package.json main
- Detect by convention (server.ts)
- Detect by convention (index.ts)
- Detect by convention (src/server.ts)
- Validate SimpleMCP import
- Validate SimpleMCP instantiation
- Handle missing entry point
- Handle invalid entry point
- Handle non-SimpleMCP files
- Multiple entry point candidates
- Priority order (explicit > package.json > convention)

### 4.5 Dependency Resolver

**File: `/mcp/core/dependency-resolver.ts`**

**Purpose:** Resolve all dependencies for bundling

```typescript
import { parseInlineDependencies } from './dependency-parser.js';
import { installDependencies } from './dependency-installer.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

// Known native modules that can't be bundled
const NATIVE_MODULES = [
  'fsevents',
  'better-sqlite3',
  'sharp',
  'node-gyp',
  'sqlite3',
  'leveldown',
  'canvas',
];

/**
 * Resolve dependencies for bundling
 */
export async function resolveDependencies(
  entryPath: string,
  options: {
    autoInstall?: boolean;
  } = {}
): Promise<string[]> {
  const cwd = dirname(entryPath);

  // 1. Parse inline dependencies (Feature 2)
  const source = await readFile(entryPath, 'utf-8');
  const inlineDeps = parseInlineDependencies(source);

  // 2. Read package.json dependencies
  const packageJsonDeps = await readPackageJsonDependencies(cwd);

  // 3. Merge dependencies
  const allDeps = mergeDependencies(inlineDeps.dependencies, packageJsonDeps);

  // 4. Auto-install if requested (Feature 3)
  if (options.autoInstall && Object.keys(inlineDeps.map).length > 0) {
    await installDependencies(inlineDeps.map, { cwd });
  }

  // 5. Return list of dependency names
  return Object.keys(allDeps);
}

/**
 * Read dependencies from package.json
 */
async function readPackageJsonDependencies(
  cwd: string
): Promise<Record<string, string>> {
  const packageJsonPath = join(cwd, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return {};
  }

  try {
    const packageJson = JSON.parse(
      await readFile(packageJsonPath, 'utf-8')
    );

    return {
      ...(packageJson.dependencies || {}),
      ...(packageJson.peerDependencies || {}),
    };
  } catch {
    return {};
  }
}

/**
 * Merge inline and package.json dependencies
 * package.json takes precedence in case of conflicts
 */
export function mergeDependencies(
  inlineDeps: Record<string, string>,
  packageJsonDeps: Record<string, string>
): Record<string, string> {
  const merged = { ...inlineDeps };

  // package.json wins in conflicts
  for (const [name, version] of Object.entries(packageJsonDeps)) {
    if (merged[name] && merged[name] !== version) {
      console.warn(
        `[bundle] Dependency conflict: ${name}\n` +
        `  Inline: ${merged[name]}\n` +
        `  package.json: ${version}\n` +
        `  Using: ${version} (package.json)`
      );
    }
    merged[name] = version;
  }

  return merged;
}

/**
 * Detect native modules in dependency list
 */
export function detectNativeModules(dependencies: string[]): string[] {
  return dependencies.filter(dep => NATIVE_MODULES.includes(dep));
}

/**
 * Get external dependencies (should not be bundled)
 */
export function getExternalDependencies(
  dependencies: string[],
  userExternal: string[] = []
): string[] {
  const nativeModules = detectNativeModules(dependencies);
  const external = [...new Set([...nativeModules, ...userExternal])];

  if (external.length > 0) {
    console.log(`[bundle] External packages (not bundled): ${external.join(', ')}`);
  }

  return external;
}

/**
 * Validate dependencies can be bundled
 */
export function validateDependencies(dependencies: string[]): void {
  // Check for problematic dependencies
  const problematic = dependencies.filter(dep => {
    // Dynamic requires can't be bundled
    return dep.includes('*') || dep.includes('?');
  });

  if (problematic.length > 0) {
    throw new Error(
      `Cannot bundle dependencies with dynamic requires: ${problematic.join(', ')}`
    );
  }
}
```

**Test Coverage:** 20 tests
- Resolve inline dependencies
- Resolve package.json dependencies
- Merge dependencies (no conflict)
- Merge dependencies (with conflict)
- package.json precedence in conflicts
- Detect native modules
- Get external dependencies
- Validate bundleable dependencies
- Handle missing package.json
- Handle corrupted package.json
- Auto-install integration
- Dependency count accuracy

### 4.6 Output Formatter

**File: `/mcp/core/output-formatter.ts`**

**Purpose:** Format bundled output based on target format

```typescript
import { writeFile, mkdir, copyFile } from 'fs/promises';
import { dirname, join, basename } from 'path';
import * as esbuild from 'esbuild';
import { BundleOptions, BundleFormat } from './bundle-types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Format output based on bundle format
 */
export async function formatOutput(
  buildResult: esbuild.BuildResult,
  options: BundleOptions
): Promise<string[]> {
  const format = options.format || 'single-file';

  switch (format) {
    case 'single-file':
      return createSingleFile(buildResult, options);

    case 'standalone':
      return createStandalone(buildResult, options);

    case 'executable':
      return createExecutable(buildResult, options);

    case 'esm':
    case 'cjs':
      return createModuleBundle(buildResult, options);

    default:
      throw new Error(`Unknown bundle format: ${format}`);
  }
}

/**
 * Create single-file bundle
 */
async function createSingleFile(
  buildResult: esbuild.BuildResult,
  options: BundleOptions
): Promise<string[]> {
  const outputPath = options.output || 'dist/bundle.js';

  // Ensure output directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  // Write bundle file
  const outputFile = buildResult.outputFiles?.[0];
  if (!outputFile) {
    throw new Error('No output file generated');
  }

  await writeFile(outputPath, outputFile.contents);

  // Write source map if present
  const sourceMapFile = buildResult.outputFiles?.find(f => f.path.endsWith('.map'));
  if (sourceMapFile) {
    await writeFile(outputPath + '.map', sourceMapFile.contents);
    return [outputPath, outputPath + '.map'];
  }

  return [outputPath];
}

/**
 * Create standalone directory bundle
 */
async function createStandalone(
  buildResult: esbuild.BuildResult,
  options: BundleOptions
): Promise<string[]> {
  const outputDir = options.output || 'dist';

  // Create output directory structure
  await mkdir(outputDir, { recursive: true });
  await mkdir(join(outputDir, 'node_modules'), { recursive: true });

  // Write bundle file
  const bundlePath = join(outputDir, 'server.js');
  const outputFile = buildResult.outputFiles?.[0];
  if (!outputFile) {
    throw new Error('No output file generated');
  }

  await writeFile(bundlePath, outputFile.contents);

  // Create minimal package.json
  const packageJson = {
    name: 'simplemcp-server',
    version: '1.0.0',
    type: 'module',
    main: 'server.js',
    engines: {
      node: options.target || '>=18.0.0'
    },
  };

  await writeFile(
    join(outputDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Copy external dependencies (if any)
  if (options.external && options.external.length > 0) {
    // Note: In real implementation, copy node_modules for external deps
    console.log('[bundle] External dependencies should be installed separately');
  }

  const files = [bundlePath, join(outputDir, 'package.json')];

  // Copy source map if present
  const sourceMapFile = buildResult.outputFiles?.find(f => f.path.endsWith('.map'));
  if (sourceMapFile) {
    const mapPath = join(outputDir, 'server.js.map');
    await writeFile(mapPath, sourceMapFile.contents);
    files.push(mapPath);
  }

  return files;
}

/**
 * Create executable binary using pkg
 */
async function createExecutable(
  buildResult: esbuild.BuildResult,
  options: BundleOptions
): Promise<string[]> {
  const outputPath = options.output || 'dist/server';

  // First, create single-file bundle
  const tempBundle = 'dist/.temp-bundle.js';
  const outputFile = buildResult.outputFiles?.[0];
  if (!outputFile) {
    throw new Error('No output file generated');
  }

  await mkdir(dirname(tempBundle), { recursive: true });
  await writeFile(tempBundle, outputFile.contents);

  // Check if pkg is installed
  try {
    await execAsync('pkg --version');
  } catch {
    throw new Error(
      'pkg is not installed. Install it with: npm install -g pkg'
    );
  }

  // Build executable using pkg
  const target = options.target || 'node18';
  const platform = process.platform;  // or from options

  await execAsync(
    `pkg ${tempBundle} --output ${outputPath} --target ${target}-${platform}`
  );

  // Clean up temp file
  await execAsync(`rm ${tempBundle}`);

  return [outputPath];
}

/**
 * Create module bundle (ESM/CJS)
 */
async function createModuleBundle(
  buildResult: esbuild.BuildResult,
  options: BundleOptions
): Promise<string[]> {
  // Similar to single-file, but with explicit module format
  return createSingleFile(buildResult, options);
}
```

**Test Coverage:** 20 tests
- Create single-file bundle
- Create standalone bundle
- Create executable (mocked)
- Create ESM bundle
- Create CJS bundle
- Handle source maps
- Directory creation
- File writing
- Handle missing output directory
- Handle write permissions error
- Standalone package.json generation
- External dependency handling
- Executable cross-platform

### 4.7 Configuration Loader

**File: `/mcp/core/config-loader.ts`**

**Purpose:** Load and parse configuration files

```typescript
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { pathToFileURL } from 'url';
import { BundleConfig } from './bundle-types.js';

/**
 * Load configuration from file
 */
export async function loadConfig(
  configPath?: string
): Promise<BundleConfig | null> {
  const path = configPath || (await findConfigFile());

  if (!path) {
    return null;
  }

  return parseConfig(path);
}

/**
 * Find configuration file using conventions
 */
export async function findConfigFile(): Promise<string | null> {
  const candidates = [
    'simplemcp.config.js',
    'simplemcp.config.ts',
    'simplemcp.config.mjs',
    'simplemcp.config.json',
    '.simplemcprc.js',
    '.simplemcprc.json',
  ];

  for (const candidate of candidates) {
    const path = resolve(candidate);
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Parse configuration file based on extension
 */
export async function parseConfig(configPath: string): Promise<BundleConfig> {
  if (configPath.endsWith('.json')) {
    return parseJSONConfig(configPath);
  }

  if (configPath.endsWith('.js') || configPath.endsWith('.mjs')) {
    return parseJSConfig(configPath);
  }

  if (configPath.endsWith('.ts')) {
    return parseTSConfig(configPath);
  }

  throw new Error(`Unsupported config file type: ${configPath}`);
}

/**
 * Parse JSON configuration
 */
async function parseJSONConfig(configPath: string): Promise<BundleConfig> {
  try {
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON config: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Parse JavaScript configuration
 */
async function parseJSConfig(configPath: string): Promise<BundleConfig> {
  try {
    // Use dynamic import for ES modules
    const fileUrl = pathToFileURL(resolve(configPath)).href;
    const module = await import(fileUrl);
    return module.default || module;
  } catch (error) {
    throw new Error(
      `Failed to load JS config: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Parse TypeScript configuration
 */
async function parseTSConfig(configPath: string): Promise<BundleConfig> {
  try {
    // Use tsx or ts-node to load TypeScript config
    // For now, compile to JS first (or require tsx)
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Compile TS to JS using esbuild
    const tempJs = configPath.replace('.ts', '.temp.js');
    await execAsync(`npx esbuild ${configPath} --outfile=${tempJs} --format=esm`);

    // Load compiled JS
    const config = await parseJSConfig(tempJs);

    // Clean up temp file
    await execAsync(`rm ${tempJs}`);

    return config;
  } catch (error) {
    throw new Error(
      `Failed to load TS config: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Merge configuration with CLI options
 * CLI options take precedence
 */
export function mergeWithCLI(
  config: BundleConfig | null,
  cliOptions: Partial<BundleConfig>
): BundleConfig {
  if (!config) {
    return cliOptions as BundleConfig;
  }

  return {
    entry: cliOptions.entry || config.entry,
    output: {
      ...config.output,
      ...cliOptions.output,
    },
    bundle: {
      ...config.bundle,
      ...cliOptions.bundle,
    },
    esbuild: {
      ...config.esbuild,
      ...cliOptions.esbuild,
    },
    autoInstall: cliOptions.autoInstall ?? config.autoInstall,
    dependencies: {
      ...config.dependencies,
      ...cliOptions.dependencies,
    },
  };
}
```

**Test Coverage:** 15 tests
- Load JSON config
- Load JS config
- Load TS config
- Find config by convention
- Handle missing config file
- Parse valid JSON
- Parse invalid JSON (error)
- Parse valid JS
- Parse invalid JS (error)
- Merge with CLI options (CLI wins)
- Merge with CLI options (no config)
- Config file priority order
- Handle corrupted config file

### 4.8 Bundle Types

**File: `/mcp/core/bundle-types.ts`**

**Purpose:** TypeScript interfaces for bundling

```typescript
/**
 * Bundle output format
 */
export type BundleFormat =
  | 'single-file'   // Single .js file with all deps
  | 'standalone'    // Directory with bundle + assets
  | 'executable'    // Native executable binary
  | 'esm'          // ES module format
  | 'cjs';         // CommonJS format

/**
 * Bundle options
 */
export interface BundleOptions {
  // Entry point
  entry: string;

  // Output
  output?: string;
  format?: BundleFormat;

  // Optimization
  minify?: boolean;
  treeShake?: boolean;

  // Source maps
  sourcemap?: boolean | 'inline' | 'external' | 'both';

  // Platform
  platform?: 'node' | 'neutral';
  target?: string;  // e.g., 'node18'

  // Dependencies
  external?: string[];

  // Advanced
  banner?: string;
  footer?: string;

  // Features 2 & 3
  autoInstall?: boolean;

  // Watch mode
  watch?: boolean;

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
  bundleTime: number;  // milliseconds
  outputFormat: BundleFormat;
  minified: boolean;
  sourcemap: boolean;
}

/**
 * Configuration file schema
 */
export interface BundleConfig {
  entry?: string;

  output?: {
    dir?: string;
    filename?: string;
    format?: BundleFormat;
  };

  bundle?: {
    minify?: boolean;
    sourcemap?: boolean | 'inline' | 'external' | 'both';
    platform?: 'node' | 'neutral';
    target?: string;
    external?: string[];
    treeShake?: boolean;
    banner?: string;
    footer?: string;
  };

  esbuild?: {
    loader?: Record<string, any>;
    define?: Record<string, string>;
    plugins?: any[];
  };

  autoInstall?: boolean;
  dependencies?: Record<string, string>;
}

/**
 * CLI command options
 */
export interface BundleCommandOptions {
  entry: string;
  output?: string;
  format?: string;
  minify?: boolean;
  sourcemap?: boolean | string;
  platform?: string;
  target?: string;
  external?: string;
  treeShake?: boolean;
  config?: string;
  watch?: boolean;
  autoInstall?: boolean;
  verbose?: boolean;
}
```

---

## 5. Examples

### 5.1 Basic Bundling

**File: `/mcp/examples/bundling/basic-bundle.md`**

```markdown
# Basic Bundling Example

Bundle a simple SimpleMCP server into a single file.

## Server Code (server.ts)

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// zod@^3.22.0
// ///

import { SimpleMCP } from '../SimpleMCP.js';
import { z } from 'zod';

const server = new SimpleMCP({
  name: 'basic-server',
  version: '1.0.0',
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}!`;
  },
});

await server.start();
```

## Bundle Command

```bash
# Basic bundle (single file)
simplemcp bundle server.ts

# Output: dist/server.js
```

## Run Bundled Server

```bash
node dist/server.js
```

That's it! The bundle includes everything needed to run.
```

### 5.2 Advanced Bundling

**File: `/mcp/examples/bundling/advanced-bundle.md`**

```markdown
# Advanced Bundling Example

Advanced bundling with custom options and configuration.

## Configuration File (simplemcp.config.js)

```javascript
export default {
  entry: './src/server.ts',
  output: {
    dir: 'dist',
    filename: 'production-server.js',
    format: 'single-file',
  },
  bundle: {
    minify: true,
    sourcemap: true,
    platform: 'node',
    target: 'node18',
    external: ['better-sqlite3'],  // Native module
    treeShake: true,
  },
  autoInstall: true,
};
```

## Bundle Command

```bash
# Use config file
simplemcp bundle --config simplemcp.config.js

# Or override config with CLI flags
simplemcp bundle --config simplemcp.config.js --no-minify

# Output: dist/production-server.js
```

## Deploy

```bash
# Copy to production server
scp dist/production-server.js user@prod-server:/opt/simplemcp/

# Run on production
ssh user@prod-server 'node /opt/simplemcp/production-server.js'
```
```

### 5.3 Executable Example

**File: `/mcp/examples/bundling/executable-example.md`**

```markdown
# Executable Bundle Example

Create native executables for distribution.

## Bundle Command

```bash
# Create executable for current platform
simplemcp bundle server.ts --format executable --output dist/server

# Create executables for all platforms
simplemcp bundle server.ts --format executable \
  --platform linux,macos,windows \
  --output dist/

# Output:
#   dist/server-linux
#   dist/server-macos
#   dist/server-win.exe
```

## Run Executable

```bash
# No Node.js required!
./dist/server-linux

# Or on Windows:
dist/server-win.exe
```

## Distribution

Now you can distribute the executable to end users who don't have Node.js installed.

```bash
# Package for distribution
tar -czf simplemcp-server-linux.tar.gz dist/server-linux

# End users just extract and run
tar -xzf simplemcp-server-linux.tar.gz
./server-linux
```
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Total: ~75 tests**

#### A. Entry Detector Tests (20 tests)
```bash
# File: test-bundle-entry-detector.sh

Test 1: Detect explicit entry point
Test 2: Detect from package.json main
Test 3: Detect by convention (server.ts)
Test 4: Detect by convention (index.ts)
Test 5: Detect by convention (src/server.ts)
Test 6: Priority order (explicit > package.json > convention)
Test 7: Validate SimpleMCP import (present)
Test 8: Validate SimpleMCP import (missing - error)
Test 9: Validate SimpleMCP instantiation (present)
Test 10: Validate SimpleMCP instantiation (missing - error)
Test 11: Handle missing entry point (error)
Test 12: Handle invalid entry point (error)
Test 13: Handle non-SimpleMCP file (error)
Test 14: Multiple entry candidates (choose first)
Test 15: Absolute vs relative paths
Test 16: Symbolic links
Test 17: Entry point in subdirectory
Test 18: Entry point with TypeScript
Test 19: Entry point with JavaScript
Test 20: checkSimpleMCPUsage() function
```

#### B. Dependency Resolver Tests (20 tests)
```bash
# File: test-bundle-dependency-resolver.sh

Test 1: Resolve inline dependencies
Test 2: Resolve package.json dependencies
Test 3: Merge dependencies (no conflict)
Test 4: Merge dependencies (with conflict, package.json wins)
Test 5: Auto-install integration (Feature 3)
Test 6: Detect native modules (fsevents)
Test 7: Detect native modules (better-sqlite3)
Test 8: Detect native modules (multiple)
Test 9: Get external dependencies (native)
Test 10: Get external dependencies (user-specified)
Test 11: Get external dependencies (combined)
Test 12: Validate bundleable dependencies
Test 13: Validate dynamic requires (error)
Test 14: Handle missing package.json
Test 15: Handle corrupted package.json
Test 16: Dependency count accuracy
Test 17: Peer dependencies handling
Test 18: Dev dependencies exclusion
Test 19: Optional dependencies
Test 20: Scoped packages (@scope/package)
```

#### C. Output Formatter Tests (20 tests)
```bash
# File: test-bundle-output-formatter.sh

Test 1: Create single-file bundle
Test 2: Create standalone bundle
Test 3: Create executable bundle (mocked)
Test 4: Create ESM bundle
Test 5: Create CJS bundle
Test 6: Handle source maps (inline)
Test 7: Handle source maps (external)
Test 8: Handle source maps (both)
Test 9: Directory creation (recursive)
Test 10: File writing
Test 11: Handle missing output directory
Test 12: Handle write permissions error
Test 13: Standalone package.json generation
Test 14: Standalone node_modules handling
Test 15: External dependency copying
Test 16: Banner/footer injection
Test 17: Output path resolution
Test 18: Overwrite existing files
Test 19: Executable cross-platform (Linux)
Test 20: Executable cross-platform (macOS, Windows)
```

#### D. Config Loader Tests (15 tests)
```bash
# File: test-bundle-config-loader.sh

Test 1: Load JSON config
Test 2: Load JS config
Test 3: Load TS config
Test 4: Find config by convention (simplemcp.config.js)
Test 5: Find config by convention (.simplemcprc.json)
Test 6: Handle missing config file
Test 7: Parse valid JSON
Test 8: Parse invalid JSON (error)
Test 9: Parse valid JS
Test 10: Parse invalid JS (error)
Test 11: Merge with CLI options (CLI wins)
Test 12: Merge with CLI options (no config)
Test 13: Config file priority order
Test 14: Handle corrupted config file
Test 15: TypeScript config compilation
```

### 6.2 Integration Tests (30 tests)

**File: `bundle-integration.test.ts`**

```typescript
describe('Bundle Integration Tests', () => {
  // Basic bundling
  test('Bundle simple server (success)', async () => {
    // Create temp server
    // Bundle with simplemcp bundle
    // Verify output exists
    // Verify output runs
  });

  test('Bundle with dependencies (success)', async () => {
    // Server with axios dependency
    // Bundle
    // Verify axios bundled
    // Run and test HTTP request
  });

  test('Bundle with inline deps (Feature 2)', async () => {
    // Server with inline deps
    // Bundle
    // Verify deps included
  });

  test('Bundle with auto-install (Feature 3)', async () => {
    // Server with missing deps
    // Bundle with --auto-install
    // Verify deps installed
    // Verify deps bundled
  });

  // Output formats
  test('Bundle single-file format', async () => {
    // Bundle with format=single-file
    // Verify single .js file
    // Verify no dependencies directory
  });

  test('Bundle standalone format', async () => {
    // Bundle with format=standalone
    // Verify dist/ directory
    // Verify package.json
    // Verify server.js
  });

  test('Bundle ESM format', async () => {
    // Bundle with format=esm
    // Verify ES module syntax
    // Verify import/export
  });

  test('Bundle CJS format', async () => {
    // Bundle with format=cjs
    // Verify CommonJS syntax
    // Verify require/module.exports
  });

  // Optimization
  test('Bundle with minification', async () => {
    // Bundle with --minify
    // Verify output is minified
    // Verify smaller size
  });

  test('Bundle without minification', async () => {
    // Bundle with --no-minify
    // Verify readable code
    // Verify larger size
  });

  test('Bundle with source maps', async () => {
    // Bundle with --sourcemap
    // Verify .map file exists
    // Verify mapping accuracy
  });

  test('Bundle with tree-shaking', async () => {
    // Server with unused imports
    // Bundle with tree-shaking
    // Verify unused code removed
  });

  // External dependencies
  test('Bundle with external packages', async () => {
    // Bundle with --external fsevents
    // Verify fsevents NOT bundled
    // Verify runtime requires external
  });

  test('Bundle with native modules (auto-detect)', async () => {
    // Server using better-sqlite3
    // Bundle (auto-detect native)
    // Verify NOT bundled
  });

  // Configuration
  test('Bundle with config file (JS)', async () => {
    // Create simplemcp.config.js
    // Bundle
    // Verify config applied
  });

  test('Bundle with config file (JSON)', async () => {
    // Create simplemcp.config.json
    // Bundle
    // Verify config applied
  });

  test('CLI overrides config file', async () => {
    // Config: minify=true
    // CLI: --no-minify
    // Verify minify=false (CLI wins)
  });

  // Watch mode
  test('Bundle watch mode', async () => {
    // Bundle with --watch
    // Modify source file
    // Verify rebuild triggered
    // Verify output updated
  });

  // Error handling
  test('Bundle missing entry point (error)', async () => {
    // Bundle non-existent file
    // Verify error message
  });

  test('Bundle invalid entry point (error)', async () => {
    // Bundle non-SimpleMCP file
    // Verify error message
  });

  test('Bundle with invalid config (error)', async () => {
    // Create invalid config
    // Bundle
    // Verify error message
  });

  // CLI
  test('CLI help command', async () => {
    // Run simplemcp bundle --help
    // Verify help text
  });

  test('CLI version command', async () => {
    // Run simplemcp --version
    // Verify version number
  });

  // Entry point detection
  test('Auto-detect entry from package.json', async () => {
    // package.json with "main"
    // Bundle without entry arg
    // Verify uses package.json main
  });

  test('Auto-detect entry by convention', async () => {
    // Create server.ts
    // Bundle without entry arg
    // Verify uses server.ts
  });

  // Platform targeting
  test('Bundle for Node.js platform', async () => {
    // Bundle with --platform node
    // Verify Node built-ins external
  });

  test('Bundle for neutral platform', async () => {
    // Bundle with --platform neutral
    // Verify no Node built-ins
  });

  // Statistics
  test('Bundle statistics reporting', async () => {
    // Bundle
    // Verify stats (size, time, deps)
  });

  test('Bundle warnings reporting', async () => {
    // Bundle with issues
    // Verify warnings displayed
  });

  test('Bundle size calculation', async () => {
    // Bundle
    // Verify size accurate
  });
});
```

### 6.3 End-to-End Tests (15 tests)

**File: `test-bundle-e2e.sh`**

```bash
#!/usr/bin/env bash

# E2E Test 1: Full bundle workflow (temp directory)
test_full_bundle_workflow() {
  # Create temp directory
  # Create simple server
  # Run: simplemcp bundle server.ts
  # Verify: dist/server.js exists
  # Run: node dist/server.js
  # Verify: server starts successfully
}

# E2E Test 2: Bundle with real dependencies
test_bundle_with_real_dependencies() {
  # Create server using axios
  # Install axios
  # Bundle
  # Verify axios included
  # Run server
  # Test HTTP request
}

# E2E Test 3: Bundle and deploy workflow
test_bundle_and_deploy() {
  # Bundle server
  # Create deployment package
  # Extract on "remote" (temp dir)
  # Run deployed server
  # Verify functionality
}

# E2E Test 4: Standalone bundle deployment
test_standalone_deployment() {
  # Bundle with format=standalone
  # Copy dist/ to new location
  # Run: node server.js
  # Verify works
}

# E2E Test 5: Auto-install before bundling
test_auto_install_bundle() {
  # Create server with inline deps
  # Delete node_modules
  # Bundle with --auto-install
  # Verify deps installed
  # Verify bundle created
  # Run bundle
}

# E2E Test 6: Watch mode development
test_watch_mode_development() {
  # Bundle with --watch (background)
  # Modify source file
  # Wait for rebuild
  # Verify output updated
  # Kill watch process
}

# E2E Test 7: Multi-platform bundling
test_multi_platform_bundling() {
  # Bundle for multiple platforms
  # Verify separate outputs
  # Test on current platform
}

# E2E Test 8: Large project bundling
test_large_project_bundling() {
  # Create project with 20+ files
  # Many dependencies
  # Bundle
  # Verify all code included
  # Verify reasonable performance
}

# E2E Test 9: Source map debugging
test_source_map_debugging() {
  # Bundle with sourcemaps
  # Simulate error
  # Verify stack trace maps to source
}

# E2E Test 10: Minified production bundle
test_production_bundle() {
  # Bundle with --minify
  # Verify code minified
  # Verify smaller size
  # Run and verify works
}

# E2E Test 11: Configuration file workflow
test_config_file_workflow() {
  # Create simplemcp.config.js
  # Bundle
  # Verify config respected
  # Modify config
  # Bundle again
  # Verify changes applied
}

# E2E Test 12: External dependencies handling
test_external_dependencies() {
  # Bundle with native module
  # Mark as external
  # Verify not bundled
  # Install separately
  # Run and verify works
}

# E2E Test 13: Bundle size comparison
test_bundle_size_comparison() {
  # Bundle with minify
  # Bundle without minify
  # Compare sizes
  # Verify minify reduces size
}

# E2E Test 14: Cross-version Node.js targets
test_cross_version_targets() {
  # Bundle for node18
  # Bundle for node20
  # Verify syntax differences
}

# E2E Test 15: Real-world server bundling
test_real_world_server() {
  # Use actual example server
  # Bundle
  # Deploy to temp location
  # Run comprehensive tests
  # Verify all features work
}
```

### 6.4 Test Summary

**Total Tests: 120**

- **Unit Tests**: 75 tests
  - Entry Detector: 20 tests
  - Dependency Resolver: 20 tests
  - Output Formatter: 20 tests
  - Config Loader: 15 tests

- **Integration Tests**: 30 tests
  - Bundling workflows
  - Output formats
  - Optimization
  - Configuration
  - Error handling
  - CLI interface

- **E2E Tests**: 15 tests
  - Full workflows
  - Real dependencies
  - Deployment scenarios
  - Watch mode
  - Production bundles

**Success Criteria: 100% pass rate**

---

## 7. Security Considerations

### 7.1 Input Validation

**Entry Point Validation:**
```typescript
// Validate entry point path
function validateEntryPath(path: string): void {
  // Prevent path traversal
  if (path.includes('..')) {
    throw new Error('Path traversal not allowed');
  }

  // Must be within project directory
  const resolved = resolve(path);
  const cwd = process.cwd();
  if (!resolved.startsWith(cwd)) {
    throw new Error('Entry point must be within project directory');
  }
}
```

### 7.2 Bundling Safety

**Code Injection Prevention:**
```typescript
// Don't execute user code during bundling
// Only static analysis and file I/O
```

**Dependency Verification:**
```typescript
// Verify dependencies come from trusted sources
// Warn on custom registries
// Support lock file verification
```

### 7.3 Output Safety

**Safe File Writing:**
```typescript
// Prevent overwriting system files
function safeWrite(outputPath: string): void {
  const dangerous = ['/bin', '/usr', '/etc', '/sys'];
  if (dangerous.some(dir => outputPath.startsWith(dir))) {
    throw new Error('Cannot write to system directories');
  }
}
```

**Permission Checks:**
```typescript
// Check write permissions before bundling
async function checkWritePermission(dir: string): Promise<void> {
  try {
    const testFile = join(dir, '.write-test');
    await writeFile(testFile, 'test');
    await unlink(testFile);
  } catch {
    throw new Error(`No write permission: ${dir}`);
  }
}
```

### 7.4 Resource Limits

**Bundle Size Limits:**
```typescript
const MAX_BUNDLE_SIZE = 100 * 1024 * 1024;  // 100 MB

function checkBundleSize(size: number): void {
  if (size > MAX_BUNDLE_SIZE) {
    throw new Error(
      `Bundle size (${size} bytes) exceeds maximum (${MAX_BUNDLE_SIZE} bytes)`
    );
  }
}
```

**Timeout Limits:**
```typescript
const BUNDLE_TIMEOUT = 5 * 60 * 1000;  // 5 minutes

async function bundleWithTimeout(options: BundleOptions): Promise<BundleResult> {
  return Promise.race([
    bundle(options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Bundle timeout')), BUNDLE_TIMEOUT)
    )
  ]);
}
```

---

## 8. Performance Considerations

### 8.1 Bundling Performance

**Optimization Strategies:**

1. **Parallel Processing**: Bundle multiple files in parallel where possible
2. **Caching**: Cache AST and dependency resolution between builds
3. **Incremental Builds**: Only rebuild changed files in watch mode
4. **Code Splitting**: Split large bundles into chunks (future)

**Performance Benchmarks:**
```
Small server (<10 files):     < 500ms
Medium server (10-50 files):  < 2s
Large server (50+ files):     < 5s
```

### 8.2 Bundle Size Optimization

**Tree-Shaking:**
```typescript
// Remove unused exports
export { usedFunction };     // Kept
export { unusedFunction };   // Removed by tree-shaking
```

**Minification Results:**
```
Original:          500 KB
Minified:          200 KB (-60%)
Minified + Gzip:   50 KB  (-90%)
```

### 8.3 Memory Usage

**Memory Limits:**
```typescript
// Limit memory usage for large bundles
process.env.NODE_OPTIONS = '--max-old-space-size=4096';  // 4GB
```

**Streaming:**
```typescript
// Stream large files instead of loading into memory
import { createReadStream, createWriteStream } from 'fs';

async function copyLargeFile(src: string, dest: string): Promise<void> {
  const read = createReadStream(src);
  const write = createWriteStream(dest);
  read.pipe(write);
  await new Promise((resolve, reject) => {
    write.on('finish', resolve);
    write.on('error', reject);
  });
}
```

---

## 9. Error Scenarios & Recovery

### 9.1 Error Matrix

| Error | Detection | User Message | Recovery |
|-------|-----------|--------------|----------|
| **Entry not found** | File access | "Entry point not found: {path}" | Specify correct entry |
| **Invalid entry** | SimpleMCP validation | "Entry must be SimpleMCP server" | Fix import/instantiation |
| **Missing dependencies** | Dependency resolution | "Dependencies missing: {list}" | Run --auto-install |
| **Build failure** | esbuild error | "Build failed: {reason}" | Fix source code |
| **Output directory** | Write permission | "Cannot write to: {path}" | Check permissions |
| **Disk full** | Write failure | "Disk full" | Free disk space |
| **Timeout** | Build timeout | "Bundle timeout (>5min)" | Simplify or increase timeout |
| **Native module** | Module detection | "Cannot bundle native: {name}" | Use --external |
| **Config invalid** | Config parsing | "Invalid config: {reason}" | Fix config file |
| **pkg not installed** | Executable creation | "pkg not found" | npm install -g pkg |

### 9.2 Error Handling Example

```typescript
try {
  const result = await bundle(options);

  if (!result.success) {
    console.error('Bundle failed!');
    result.errors.forEach(err => console.error(`  - ${err}`));

    // Provide recovery suggestions
    if (result.errors.some(e => e.includes('Entry point'))) {
      console.log('\nSuggestion: Check entry point path');
      console.log('  simplemcp bundle server.ts');
    }

    if (result.errors.some(e => e.includes('dependencies'))) {
      console.log('\nSuggestion: Install dependencies first');
      console.log('  simplemcp bundle server.ts --auto-install');
    }

    process.exit(1);
  }

} catch (error) {
  console.error('Fatal error:', error.message);

  if (error.code === 'EACCES') {
    console.log('\nRecovery: Check write permissions');
    console.log('  chmod +w dist/');
  }

  if (error.code === 'ENOSPC') {
    console.log('\nRecovery: Free disk space');
    console.log('  df -h');
  }

  process.exit(1);
}
```

---

## 10. Migration & Backward Compatibility

### 10.1 No Breaking Changes

**Existing Code Unchanged:**
```typescript
// Before Feature 4 (still works)
const server = new SimpleMCP({ name: 'test', version: '1.0.0' });
server.addTool({ ... });
await server.start();

// Feature 4 is opt-in (CLI command)
// No impact on programmatic usage
```

### 10.2 Adoption Path

**Step 1: Install CLI (if not already)**
```bash
npm install -g simplemcp
```

**Step 2: Bundle your server**
```bash
simplemcp bundle server.ts
```

**Step 3: Deploy bundle**
```bash
scp dist/server.js prod-server:/opt/app/
ssh prod-server 'node /opt/app/server.js'
```

### 10.3 package.json Changes

**Add bin field:**
```json
{
  "name": "simplemcp",
  "version": "2.4.0",
  "bin": {
    "simplemcp": "./cli/index.js"
  },
  "devDependencies": {
    "esbuild": "^0.20.0",
    "commander": "^11.0.0"
  }
}
```

---

## 11. Implementation Phases

### Phase A: CLI Foundation (Days 1-2)

- [ ] Create `/mcp/cli/` directory
- [ ] Implement `cli/index.ts` (CLI entry point)
- [ ] Implement `cli/bundle.ts` (bundle command)
- [ ] Add commander for argument parsing
- [ ] Add package.json "bin" field
- [ ] Test CLI invocation
- [ ] Write CLI tests (10 tests)

### Phase B: Core Bundler (Days 3-5)

- [ ] Implement `core/bundler.ts`
- [ ] Implement `core/bundle-types.ts`
- [ ] Add esbuild integration
- [ ] Configure build options
- [ ] Handle build execution
- [ ] Write bundler tests (25 tests)

### Phase C: Entry Detection & Validation (Days 6-7)

- [ ] Implement `core/entry-detector.ts`
- [ ] Entry point detection strategies
- [ ] SimpleMCP validation
- [ ] Convention-based detection
- [ ] Write entry detector tests (20 tests)

### Phase D: Dependency Resolution (Days 8-9)

- [ ] Implement `core/dependency-resolver.ts`
- [ ] Parse inline deps (Feature 2 integration)
- [ ] Merge with package.json
- [ ] Auto-install integration (Feature 3)
- [ ] Native module detection
- [ ] Write dependency resolver tests (20 tests)

### Phase E: Output Formatting (Days 10-11)

- [ ] Implement `core/output-formatter.ts`
- [ ] Single-file output
- [ ] Standalone output
- [ ] Executable output (pkg integration)
- [ ] ESM/CJS output
- [ ] Write output formatter tests (20 tests)

### Phase F: Configuration (Day 12)

- [ ] Implement `core/config-loader.ts`
- [ ] JSON config support
- [ ] JS/TS config support
- [ ] Config file detection
- [ ] CLI override logic
- [ ] Write config loader tests (15 tests)

### Phase G: Examples (Day 13)

- [ ] Create `examples/bundling/` directory
- [ ] Write basic-bundle.md
- [ ] Write advanced-bundle.md
- [ ] Write config-example.md
- [ ] Write executable-example.md
- [ ] Write watch-mode.md
- [ ] Create simplemcp.config.example.js
- [ ] Create simplemcp.config.example.ts

### Phase H: Integration Testing (Days 14-15)

- [ ] Write `bundle-integration.test.ts` (30 tests)
- [ ] Test bundling workflows
- [ ] Test output formats
- [ ] Test optimization options
- [ ] Test configuration
- [ ] Test error handling
- [ ] Test CLI interface

### Phase I: End-to-End Testing (Day 16)

- [ ] Write `test-bundle-e2e.sh` (15 tests)
- [ ] Test full workflows
- [ ] Test real dependencies
- [ ] Test deployment scenarios
- [ ] Test watch mode
- [ ] Test production bundles

### Phase J: Documentation (Day 17)

- [ ] Update main README
- [ ] Write bundling guide
- [ ] Document CLI commands
- [ ] Document configuration options
- [ ] Add troubleshooting section
- [ ] Update CHANGELOG

### Phase K: Polish & Review (Day 18)

- [ ] Code review (security, performance, API)
- [ ] Run all tests (120 tests)
- [ ] Cross-platform testing
- [ ] Performance benchmarks
- [ ] Final documentation review

---

## 12. Success Criteria

### 12.1 Feature Complete When:

- [ ] CLI command works (`simplemcp bundle`)
- [ ] Single-file bundles generate successfully
- [ ] Standalone bundles work correctly
- [ ] Executable bundles create (with pkg)
- [ ] ESM/CJS formats supported
- [ ] Source maps generate
- [ ] Minification works
- [ ] Tree-shaking removes unused code
- [ ] External dependencies handled
- [ ] Watch mode functional
- [ ] Configuration files load
- [ ] Auto-install integration works (Features 2 & 3)
- [ ] 120 tests passing (100% pass rate)
- [ ] Zero breaking changes
- [ ] Examples bundle successfully
- [ ] Documentation comprehensive
- [ ] Cross-platform support (Linux, macOS, Windows)

### 12.2 User Acceptance Criteria:

1. **User can bundle server with one command**
   ```bash
   simplemcp bundle server.ts
   ```

2. **User can deploy bundle easily**
   ```bash
   scp dist/server.js prod:/app/
   ```

3. **User can create executables**
   ```bash
   simplemcp bundle server.ts --format executable
   ```

4. **User can use config file**
   ```bash
   simplemcp bundle --config simplemcp.config.js
   ```

5. **User gets helpful errors**
   ```bash
   # Clear error messages with recovery steps
   ```

6. **Bundle is production-ready**
   - Minified
   - Tree-shaken
   - Optimized
   - <1 MB for typical server

---

## 13. Open Questions

### 13.1 Should we support code splitting?

**Question**: Allow splitting bundle into multiple chunks?

**Decision: NO (not in MVP)**
- Adds complexity
- SimpleMCP servers are typically small
- Single file is simpler to deploy
- Can be added later if demand exists

### 13.2 Should we support custom esbuild plugins?

**Question**: Allow users to add esbuild plugins via config?

**Decision: YES (via config file)**
```javascript
export default {
  esbuild: {
    plugins: [
      myCustomPlugin(),
    ],
  },
};
```

### 13.3 Should we bundle TypeScript declarations (.d.ts)?

**Question**: Generate .d.ts files for bundled output?

**Decision: NO (not needed for servers)**
- SimpleMCP servers are applications, not libraries
- No external consumers need types
- Reduces bundle complexity

### 13.4 Should we support Docker image creation?

**Question**: Add `--format docker` to create Docker images?

**Decision: NO (out of scope)**
- Different concern (containerization vs bundling)
- Users can Dockerize bundles manually
- May add in future as separate feature

---

## 14. File Manifest

### New Files (18 files):

**CLI:**
- `/mcp/cli/index.ts` (~100 lines)
- `/mcp/cli/bundle.ts` (~200 lines)
- `/mcp/cli/utils/logger.ts` (~80 lines)

**Core:**
- `/mcp/core/bundler.ts` (~400 lines)
- `/mcp/core/bundle-types.ts` (~200 lines)
- `/mcp/core/entry-detector.ts` (~150 lines)
- `/mcp/core/dependency-resolver.ts` (~250 lines)
- `/mcp/core/output-formatter.ts` (~300 lines)
- `/mcp/core/config-loader.ts` (~150 lines)

**Examples:**
- `/mcp/examples/bundling/basic-bundle.md` (~80 lines)
- `/mcp/examples/bundling/advanced-bundle.md` (~120 lines)
- `/mcp/examples/bundling/config-example.md` (~100 lines)
- `/mcp/examples/bundling/executable-example.md` (~80 lines)
- `/mcp/examples/bundling/watch-mode.md` (~60 lines)
- `/mcp/simplemcp.config.example.js` (~50 lines)
- `/mcp/simplemcp.config.example.ts` (~60 lines)

**Tests:**
- `/mcp/tests/phase2/test-bundle-entry-detector.sh` (~400 lines)
- `/mcp/tests/phase2/test-bundle-dependency-resolver.sh` (~450 lines)
- `/mcp/tests/phase2/test-bundle-output-formatter.sh` (~400 lines)
- `/mcp/tests/phase2/test-bundle-config-loader.sh` (~300 lines)
- `/mcp/tests/phase2/bundle-integration.test.ts` (~800 lines)
- `/mcp/tests/phase2/test-bundle-e2e.sh` (~400 lines)
- `/mcp/tests/phase2/run-bundle-tests.sh` (~100 lines)

### Modified Files (1 file):

- `/mcp/package.json` (add "bin" field, add esbuild devDep)

**Total New Lines: ~4,600**

---

## 15. Risk Assessment

### 15.1 Technical Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **esbuild API changes** | MEDIUM | LOW | Pin version, test upgrades |
| **Native module bundling** | HIGH | MEDIUM | Auto-detect, mark external |
| **Cross-platform issues** | MEDIUM | MEDIUM | Test on Linux/macOS/Windows |
| **pkg/nexe availability** | LOW | LOW | Make executable format optional |
| **Bundle size bloat** | MEDIUM | MEDIUM | Tree-shaking, minification |
| **Source map accuracy** | LOW | LOW | Test with real errors |
| **Watch mode stability** | LOW | LOW | Use esbuild's watch API |

### 15.2 Implementation Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Scope creep** | HIGH | MEDIUM | Stick to MVP, defer enhancements |
| **Testing complexity** | MEDIUM | MEDIUM | Comprehensive test plan |
| **Integration issues** | MEDIUM | LOW | Build on Features 2 & 3 |
| **CLI complexity** | LOW | LOW | Use commander library |

---

## 16. Future Enhancements (Out of Scope)

### 16.1 Advanced Bundling

- **Code splitting**: Split into multiple chunks
- **Lazy loading**: Dynamic imports
- **Shared chunks**: Common dependencies in separate file
- **Bundle analysis**: Visualize bundle composition

### 16.2 Deployment Integration

- **Docker images**: `--format docker`
- **Serverless packages**: AWS Lambda, Vercel, etc.
- **Cloud deployment**: Deploy to AWS/GCP/Azure
- **Container registries**: Push to Docker Hub

### 16.3 Optimization

- **Compression**: Brotli/Gzip built-in
- **Image optimization**: Optimize bundled images
- **Asset pipeline**: Process CSS, images, etc.
- **Cache busting**: Content-based hashing

---

## 17. Summary

### 17.1 What This Feature Adds

- **CLI bundling command** - `simplemcp bundle`
- **Multiple output formats** - single-file, standalone, executable, ESM, CJS
- **Production optimization** - minification, tree-shaking
- **Source map support** - debug production code
- **Watch mode** - fast iteration during development
- **Configuration files** - flexible project setup
- **Integration with Features 2 & 3** - inline deps and auto-install

### 17.2 Key Design Principles

1. **Simplicity** - One command to bundle
2. **Flexibility** - Multiple formats for different needs
3. **Performance** - Fast bundling with esbuild
4. **Production-ready** - Optimized output by default
5. **Developer experience** - Clear errors, helpful messages
6. **Integration** - Seamless with existing features

### 17.3 Implementation Complexity

**Estimated Time: 18 days**

**Complexity Breakdown:**
- **Core Bundler**: Medium (esbuild integration)
- **CLI**: Low (commander library)
- **Output Formats**: Medium-High (multiple formats, pkg)
- **Testing**: High (120 tests, E2E scenarios)
- **Documentation**: Medium

**Critical Success Factors:**
- esbuild integration works reliably
- Native module detection accurate
- Cross-platform compatibility
- Comprehensive testing
- Clear documentation

---

## 18. Next Steps for Agent 2 (Implementer)

1. **Read this plan thoroughly**
2. **Review esbuild documentation**
3. **Study Features 2 & 3** (dependency parsing/installation)
4. **Start with Phase A** (CLI foundation)
5. **Build incrementally** (test each component)
6. **Follow Implementation Phases** (Section 11)
7. **Write tests alongside code** (TDD approach)
8. **Document as you go**

**Priority Tasks:**
1. CLI setup (commander, bin field)
2. Core bundler (esbuild integration)
3. Entry point detection
4. Output formatting
5. Configuration loading
6. Comprehensive testing (120 tests)

**Critical Reminders:**
- Use esbuild for all bundling
- Default to single-file format
- Minify by default in production
- Auto-detect native modules
- Integrate with Features 2 & 3
- Test across platforms
- Provide clear error messages
- Document all options

---

**Plan Version:** 1.0
**Created:** 2025-10-02
**Author:** Agent 1 (Planner)
**For:** SimpleMCP Phase 2, Feature 4
**Estimated Lines:** ~1,200 lines
**Next:** Agent 2 (Implementer) executes this plan

---

**END OF PLAN**
