# Phase 2, Feature 4.2: Advanced Bundle Formats & Distribution - Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for **advanced bundling features** for SimplyMCP servers. This second phase adds standalone formats, native executables, source maps, watch mode, and cross-platform distribution capabilities.

**Status**: Planning Phase
**Priority**: MEDIUM-HIGH
**Estimated Complexity**: Medium
**Breaking Changes**: None (fully opt-in, backward compatible)
**Relation to Phase 2**: Feature 4.2 of Phase 2 (builds on Feature 4.1)
**Depends On**: Feature 4.1 (CLI Infrastructure & Core Bundling)

---

## Split Rationale

Feature 4.2 builds on top of Feature 4.1's foundation and adds:

**Feature 4.1 (Prerequisite)**:
- ✅ CLI infrastructure
- ✅ Entry point detection
- ✅ Dependency resolution
- ✅ Single-file bundling with esbuild
- ✅ Basic configuration support

**Feature 4.2 (This Document)**: Advanced Features
- ✅ Standalone format (directory with assets)
- ✅ Executable format (native binaries via pkg)
- ✅ Source maps (inline, external, both)
- ✅ Watch mode for development
- ✅ Cross-platform executable builds
- ✅ ESM/CJS explicit format control
- ✅ Advanced bundler plugins

**Why Separate?**
1. **Core Value First**: 4.1 delivers working bundles, 4.2 adds convenience
2. **Complexity**: Executables and watch mode are more complex
3. **Dependencies**: Requires additional tools (pkg, chokidar)
4. **Testing**: More extensive testing needed for cross-platform
5. **Iteration**: Can ship 4.1, then enhance with 4.2

**Estimated Timeline**:
- Feature 4.1: ~10 days (prerequisite)
- Feature 4.2: ~8 days (this plan)
- Total: ~18 days

---

## 1. Overview

### 1.1 What is Feature 4.2?

Feature 4.2 adds **advanced bundling formats and development tools**:

**New Capabilities:**
1. **Standalone Format**: Bundle + assets in directory structure
2. **Executable Format**: Native binaries for Linux, macOS, Windows
3. **Source Maps**: Debug production bundles (inline, external, both)
4. **Watch Mode**: Auto-rebuild on file changes
5. **Cross-Platform**: Build for multiple platforms at once
6. **Module Formats**: Explicit ESM/CJS control
7. **Advanced Plugins**: Custom esbuild plugins

### 1.2 Output Formats (Complete Set)

After Feature 4.2, users can choose:

#### Format 1: Single-File (Feature 4.1)
```bash
simplemcp bundle server.ts --format single-file
# Output: dist/server.js
```

#### Format 2: Standalone (Feature 4.2 - NEW)
```bash
simplemcp bundle server.ts --format standalone --output dist/
# Output: dist/ directory with bundle + assets
```

**Directory structure:**
```
dist/
  ├── server.js           # Bundled code
  ├── package.json        # Minimal runtime deps
  ├── node_modules/       # Native modules (if any)
  └── assets/             # Static assets
```

#### Format 3: Executable (Feature 4.2 - NEW)
```bash
simplemcp bundle server.ts --format executable --output dist/server
# Output: dist/server (native binary, no Node.js needed!)
```

**Cross-platform:**
```bash
simplemcp bundle server.ts --format executable \
  --platforms linux,macos,windows --output dist/
# Output:
#   dist/server-linux
#   dist/server-macos
#   dist/server-win.exe
```

#### Format 4: ESM/CJS (Feature 4.2 - NEW)
```bash
simplemcp bundle server.ts --format esm
simplemcp bundle server.ts --format cjs
```

### 1.3 Source Maps (Feature 4.2)

```bash
# Inline source map (single file)
simplemcp bundle server.ts --sourcemap inline

# External source map (.map file)
simplemcp bundle server.ts --sourcemap external

# Both (for maximum debugging)
simplemcp bundle server.ts --sourcemap both
```

### 1.4 Watch Mode (Feature 4.2)

```bash
# Watch and rebuild on changes
simplemcp bundle server.ts --watch

# Watch with custom options
simplemcp bundle server.ts --watch --no-minify --sourcemap inline
```

**Output:**
```
[watch] Build started...
[watch] Build succeeded in 120ms
[watch] Watching for changes...
[watch] File changed: src/server.ts
[watch] Rebuilding...
[watch] Build succeeded in 45ms
```

---

## 2. Design Decisions

### 2.1 Standalone Format

**Decision: Create directory structure with minimal runtime deps**

**Directory Layout:**
```
dist/
  ├── server.js              # Bundled application code
  ├── package.json           # Minimal package.json (runtime only)
  ├── node_modules/          # Only native modules that can't be bundled
  │   └── better-sqlite3/    # Example: native module
  └── assets/                # Static assets (optional)
      └── config.json
```

**package.json Generation:**
```json
{
  "name": "bundled-server",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "dependencies": {
    "better-sqlite3": "^9.0.0"  // Only native modules
  }
}
```

**Use Case:**
- Traditional deployment (copy entire directory)
- Docker containers
- Server environments with npm available

### 2.2 Executable Format

**Decision: Use `pkg` for native executables**

**Technology Choice: pkg**
- ✅ Popular (used by Vercel, Zeit, etc.)
- ✅ Cross-platform (Linux, macOS, Windows)
- ✅ Good Node.js support
- ✅ Asset inclusion
- ✅ Active community

**Alternative Considered: nexe**
- ❌ Less maintained
- ❌ More complex configuration
- ✅ Pros: Smaller binaries

**Implementation:**
```typescript
import pkg from 'pkg';

async function createExecutable(
  bundlePath: string,
  outputPath: string,
  platforms: string[]
): Promise<void> {
  await pkg.exec([
    bundlePath,
    '--targets', platforms.join(','),
    '--output', outputPath,
    '--compress', 'GZip'
  ]);
}
```

**Cross-Platform Targets:**
```bash
# All platforms
simplemcp bundle server.ts --format executable \
  --platforms linux,macos,windows

# Specific platform
simplemcp bundle server.ts --format executable \
  --platforms linux-x64
```

**Platform Codes:**
- `linux-x64`: Linux 64-bit
- `macos-x64`: macOS Intel
- `macos-arm64`: macOS Apple Silicon
- `windows-x64`: Windows 64-bit
- `alpine-x64`: Alpine Linux (Docker)

### 2.3 Source Maps

**Decision: Support all three source map modes**

#### Mode 1: Inline (Default for Development)
```bash
simplemcp bundle server.ts --sourcemap inline
```

**Characteristics:**
- Source map embedded in bundle
- Single file output
- Larger bundle size (+30-50%)
- No additional files needed

**Use Case:** Development, debugging

#### Mode 2: External (Default for Production)
```bash
simplemcp bundle server.ts --sourcemap external
```

**Characteristics:**
- Separate .map file
- Smaller bundle
- Source map optional at runtime
- Can be excluded from deployment

**Output:**
```
dist/
  ├── server.js
  └── server.js.map
```

**Use Case:** Production debugging (optional)

#### Mode 3: Both
```bash
simplemcp bundle server.ts --sourcemap both
```

**Characteristics:**
- Inline AND external
- Maximum debugging capability
- Largest output

**Use Case:** Debugging complex production issues

### 2.4 Watch Mode

**Decision: Use esbuild's watch + custom file watcher**

**Technology: esbuild watch + chokidar**
- ✅ esbuild has built-in watch
- ✅ chokidar for advanced patterns
- ✅ Fast rebuilds (incremental)

**Watch Behavior:**
```typescript
interface WatchOptions {
  enabled: boolean;
  poll?: boolean;          // Use polling (network drives)
  interval?: number;       // Poll interval (ms)
  ignored?: string[];      // Ignore patterns
  onRebuild?: (error: Error | null, result: BuildResult) => void;
}
```

**Console Output:**
```
[watch] Build started...
[watch] ✓ Build succeeded in 120ms
[watch] Watching for changes...
[watch] Changed: src/tools/calculator.ts
[watch] Rebuilding...
[watch] ✓ Build succeeded in 45ms (incremental)
```

**Auto-Restart Server (Optional):**
```bash
simplemcp bundle server.ts --watch --restart
# Restarts server after each rebuild
```

### 2.5 Module Format Control

**Decision: Support explicit ESM/CJS format**

#### ESM Format (Default)
```bash
simplemcp bundle server.ts --format esm
```

**Output:**
```javascript
// ES modules
import { SimplyMCP } from './mcp/SimplyMCP.js';
export default server;
```

**Use Case:**
- Modern Node.js (v14+)
- Tree-shaking
- Top-level await

#### CJS Format
```bash
simplemcp bundle server.ts --format cjs
```

**Output:**
```javascript
// CommonJS
const { SimplyMCP } = require('./mcp/SimplyMCP.js');
module.exports = server;
```

**Use Case:**
- Legacy Node.js
- Older tools
- Compatibility

### 2.6 Configuration Extensions

**Updated Config Schema (4.1 + 4.2):**
```typescript
export interface BundleConfig {
  // Feature 4.1
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

  // Feature 4.2 (NEW)
  format?: 'single-file' | 'standalone' | 'executable' | 'esm' | 'cjs';

  sourcemap?: boolean | 'inline' | 'external' | 'both';

  watch?: {
    enabled?: boolean;
    poll?: boolean;
    interval?: number;
    ignored?: string[];
    restart?: boolean;
  };

  executable?: {
    platforms?: string[];
    compress?: boolean;
    assets?: string[];
  };

  standalone?: {
    includeAssets?: string[];
    includeNativeModules?: boolean;
  };

  esbuild?: {
    define?: Record<string, string>;
    plugins?: any[];
    loader?: Record<string, string>;
  };
}
```

---

## 3. Architecture Design

### 3.1 Extended Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLI Command                           │
│  simplemcp bundle server.ts --format executable         │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│            Bundle Core (Feature 4.1)                     │
│  ├─ Entry point detection                                │
│  ├─ Dependency resolution                                │
│  ├─ esbuild bundling                                     │
│  └─ Single-file output                                  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│        Format Router (Feature 4.2 - NEW)                │
│  ├─ Detect requested format                             │
│  ├─ Route to appropriate formatter                      │
│  └─ Handle source maps                                  │
└─────────────────────────────────────────────────────────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Standalone│  │Executable│  │  Watch   │
    │ Formatter │  │ Builder  │  │  Mode    │
    └──────────┘  └──────────┘  └──────────┘
```

### 3.2 File Structure (Feature 4.2 Additions)

```
mcp/
├── core/
│   ├── bundler.ts                       (MODIFIED - add format routing)
│   ├── bundle-types.ts                  (MODIFIED - add new formats)
│   │
│   ├── formatters/                      (NEW - Feature 4.2)
│   │   ├── standalone-formatter.ts      (NEW - ~200 lines)
│   │   │   ├─ createStandaloneBundle()
│   │   │   ├─ generatePackageJson()
│   │   │   ├─ copyNativeModules()
│   │   │   └─ includeAssets()
│   │   │
│   │   ├── executable-builder.ts        (NEW - ~250 lines)
│   │   │   ├─ createExecutable()
│   │   │   ├─ buildForPlatform()
│   │   │   ├─ compressExecutable()
│   │   │   └─ validateExecutable()
│   │   │
│   │   ├── sourcemap-handler.ts         (NEW - ~150 lines)
│   │   │   ├─ generateSourceMap()
│   │   │   ├─ inlineSourceMap()
│   │   │   ├─ externalSourceMap()
│   │   │   └─ validateSourceMap()
│   │   │
│   │   └── watch-manager.ts             (NEW - ~200 lines)
│   │       ├─ startWatch()
│   │       ├─ handleFileChange()
│   │       ├─ rebuild()
│   │       └─ restartServer()
│   │
│   └── ...
│
├── package.json                         (MODIFIED)
│   └── Add: pkg, chokidar devDependencies
│
└── tests/
    └── phase2/
        ├── test-standalone-formatter.sh        (NEW - ~300 lines / 15 tests)
        ├── test-executable-builder.sh          (NEW - ~400 lines / 20 tests)
        ├── test-sourcemap-handler.sh           (NEW - ~300 lines / 15 tests)
        ├── test-watch-manager.sh               (NEW - ~300 lines / 15 tests)
        ├── bundle-advanced-integration.test.ts (NEW - ~600 lines / 25 tests)
        └── run-bundle-advanced-tests.sh        (NEW - master test runner)
```

---

## 4. Core Components (Feature 4.2)

### 4.1 Standalone Formatter

**File: `/mcp/core/formatters/standalone-formatter.ts`**

```typescript
import { mkdir, writeFile, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

export interface StandaloneOptions {
  bundlePath: string;
  outputDir: string;
  includeAssets?: string[];
  includeNativeModules?: boolean;
  dependencies?: Record<string, string>;
}

/**
 * Create standalone bundle (directory format)
 */
export async function createStandaloneBundle(
  options: StandaloneOptions
): Promise<{ outputDir: string; files: string[] }> {
  const { bundlePath, outputDir, includeAssets, includeNativeModules, dependencies } = options;

  // 1. Create output directory
  await mkdir(outputDir, { recursive: true });

  // 2. Copy bundle
  const serverPath = join(outputDir, 'server.js');
  await copyFile(bundlePath, serverPath);

  const outputFiles = [serverPath];

  // 3. Generate package.json
  const packageJsonPath = await generatePackageJson(outputDir, dependencies);
  outputFiles.push(packageJsonPath);

  // 4. Copy native modules (if any)
  if (includeNativeModules && dependencies) {
    const nativeModules = await copyNativeModules(outputDir, dependencies);
    outputFiles.push(...nativeModules);
  }

  // 5. Copy assets (if specified)
  if (includeAssets && includeAssets.length > 0) {
    const assets = await copyAssets(outputDir, includeAssets);
    outputFiles.push(...assets);
  }

  return {
    outputDir,
    files: outputFiles,
  };
}

/**
 * Generate minimal package.json
 */
async function generatePackageJson(
  outputDir: string,
  dependencies?: Record<string, string>
): Promise<string> {
  // Only include native modules in dependencies
  const nativeModules = ['better-sqlite3', 'sharp', 'canvas'];
  const runtimeDeps: Record<string, string> = {};

  if (dependencies) {
    for (const [name, version] of Object.entries(dependencies)) {
      if (nativeModules.includes(name)) {
        runtimeDeps[name] = version;
      }
    }
  }

  const packageJson = {
    name: 'bundled-simplemcp-server',
    version: '1.0.0',
    type: 'module',
    main: 'server.js',
    scripts: {
      start: 'node server.js',
    },
    dependencies: runtimeDeps,
  };

  const packageJsonPath = join(outputDir, 'package.json');
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

  return packageJsonPath;
}

/**
 * Copy native modules to node_modules
 */
async function copyNativeModules(
  outputDir: string,
  dependencies: Record<string, string>
): Promise<string[]> {
  const nativeModules = Object.keys(dependencies).filter(dep =>
    ['better-sqlite3', 'sharp', 'canvas'].includes(dep)
  );

  const copiedFiles: string[] = [];

  for (const moduleName of nativeModules) {
    const sourceModulePath = join(process.cwd(), 'node_modules', moduleName);
    if (existsSync(sourceModulePath)) {
      const destModulePath = join(outputDir, 'node_modules', moduleName);
      await copyDirectory(sourceModulePath, destModulePath);
      copiedFiles.push(destModulePath);
    }
  }

  return copiedFiles;
}

/**
 * Copy assets
 */
async function copyAssets(
  outputDir: string,
  assetPatterns: string[]
): Promise<string[]> {
  const assetsDir = join(outputDir, 'assets');
  await mkdir(assetsDir, { recursive: true });

  const copiedFiles: string[] = [];

  for (const pattern of assetPatterns) {
    const sourcePath = join(process.cwd(), pattern);
    if (existsSync(sourcePath)) {
      const destPath = join(assetsDir, basename(pattern));
      await copyFile(sourcePath, destPath);
      copiedFiles.push(destPath);
    }
  }

  return copiedFiles;
}
```

### 4.2 Executable Builder

**File: `/mcp/core/formatters/executable-builder.ts`**

```typescript
import pkg from 'pkg';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';

export interface ExecutableOptions {
  bundlePath: string;
  outputPath: string;
  platforms?: string[];
  compress?: boolean;
  assets?: string[];
}

const PLATFORM_TARGETS: Record<string, string> = {
  'linux': 'node18-linux-x64',
  'macos': 'node18-macos-x64',
  'macos-arm': 'node18-macos-arm64',
  'windows': 'node18-win-x64',
  'alpine': 'node18-alpine-x64',
};

/**
 * Create native executable
 */
export async function createExecutable(
  options: ExecutableOptions
): Promise<{ executables: string[]; size: number }> {
  const { bundlePath, outputPath, platforms = ['linux'], compress = true, assets } = options;

  // Create output directory
  await mkdir(dirname(outputPath), { recursive: true });

  // Build targets
  const targets = platforms.map(platform => PLATFORM_TARGETS[platform] || platform);

  console.log(`[Executable] Building for: ${targets.join(', ')}`);

  // pkg configuration
  const pkgConfig = {
    targets,
    output: outputPath,
    compress: compress ? 'GZip' : 'None',
    assets: assets || [],
  };

  // Run pkg
  await pkg.exec([
    bundlePath,
    '--targets', targets.join(','),
    '--output', outputPath,
    ...(compress ? ['--compress', 'GZip'] : []),
    ...(assets ? ['--assets', assets.join(',')] : []),
  ]);

  // Generate output paths
  const executables: string[] = [];
  let totalSize = 0;

  for (const platform of platforms) {
    let execPath = outputPath;

    if (platforms.length > 1) {
      // Multiple platforms: add suffix
      execPath = `${outputPath}-${platform}${platform === 'windows' ? '.exe' : ''}`;
    } else if (platform === 'windows') {
      // Single Windows platform
      execPath = `${outputPath}.exe`;
    }

    executables.push(execPath);

    // Get file size
    if (existsSync(execPath)) {
      const stats = await stat(execPath);
      totalSize += stats.size;
    }
  }

  return { executables, size: totalSize };
}

/**
 * Validate executable
 */
export async function validateExecutable(execPath: string): Promise<boolean> {
  if (!existsSync(execPath)) {
    return false;
  }

  // Check if executable
  const stats = await stat(execPath);
  if (!stats.isFile()) {
    return false;
  }

  // Check permissions (Unix)
  if (process.platform !== 'win32') {
    const mode = stats.mode;
    const isExecutable = (mode & 0o111) !== 0;
    if (!isExecutable) {
      console.warn(`[Executable] Warning: ${execPath} is not executable`);
    }
  }

  return true;
}
```

### 4.3 Source Map Handler

**File: `/mcp/core/formatters/sourcemap-handler.ts`**

```typescript
import { writeFile } from 'fs/promises';
import { join } from 'path';

export type SourceMapMode = 'inline' | 'external' | 'both';

export interface SourceMapOptions {
  bundlePath: string;
  sourceMapContent: string;
  mode: SourceMapMode;
}

/**
 * Handle source map generation
 */
export async function handleSourceMap(
  options: SourceMapOptions
): Promise<{ inline: boolean; external: string | null }> {
  const { bundlePath, sourceMapContent, mode } = options;

  let inlineSourceMap = false;
  let externalSourceMapPath: string | null = null;

  switch (mode) {
    case 'inline':
      inlineSourceMap = true;
      break;

    case 'external':
      externalSourceMapPath = await writeExternalSourceMap(bundlePath, sourceMapContent);
      break;

    case 'both':
      inlineSourceMap = true;
      externalSourceMapPath = await writeExternalSourceMap(bundlePath, sourceMapContent);
      break;
  }

  return { inline: inlineSourceMap, external: externalSourceMapPath };
}

/**
 * Write external source map
 */
async function writeExternalSourceMap(
  bundlePath: string,
  sourceMapContent: string
): Promise<string> {
  const sourceMapPath = `${bundlePath}.map`;
  await writeFile(sourceMapPath, sourceMapContent);
  return sourceMapPath;
}

/**
 * Inline source map into bundle
 */
export function inlineSourceMap(bundleCode: string, sourceMapContent: string): string {
  const base64SourceMap = Buffer.from(sourceMapContent).toString('base64');
  const sourceMappingURL = `//# sourceMappingURL=data:application/json;base64,${base64SourceMap}`;
  return `${bundleCode}\n${sourceMappingURL}`;
}
```

### 4.4 Watch Manager

**File: `/mcp/core/formatters/watch-manager.ts`**

```typescript
import chokidar from 'chokidar';
import { bundle } from '../bundler.js';
import { BundleOptions, BundleResult } from '../bundle-types.js';

export interface WatchOptions {
  bundleOptions: BundleOptions;
  poll?: boolean;
  interval?: number;
  ignored?: string[];
  restart?: boolean;
  onRebuild?: (error: Error | null, result: BundleResult | null) => void;
}

/**
 * Start watch mode
 */
export async function startWatch(options: WatchOptions): Promise<void> {
  const { bundleOptions, poll, interval, ignored, restart, onRebuild } = options;

  console.log('[watch] Build started...');

  // Initial build
  let result = await bundle(bundleOptions);

  if (result.success) {
    console.log(`[watch] ✓ Build succeeded in ${result.stats.bundleTime}ms`);
  } else {
    console.error(`[watch] ✗ Build failed`);
    result.errors.forEach(err => console.error(`  - ${err}`));
  }

  console.log('[watch] Watching for changes...');

  // Setup watcher
  const watcher = chokidar.watch(bundleOptions.entry, {
    ignored: ignored || ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    persistent: true,
    usePolling: poll,
    interval: interval || 100,
  });

  // Handle file changes
  watcher.on('change', async (changedPath) => {
    console.log(`[watch] Changed: ${changedPath}`);
    console.log('[watch] Rebuilding...');

    const rebuildStart = Date.now();

    try {
      result = await bundle(bundleOptions);

      if (result.success) {
        const rebuildTime = Date.now() - rebuildStart;
        console.log(`[watch] ✓ Build succeeded in ${rebuildTime}ms (incremental)`);

        // Restart server if requested
        if (restart) {
          await restartServer(result.outputFiles[0]);
        }

        // Call user callback
        onRebuild?.(null, result);
      } else {
        console.error(`[watch] ✗ Build failed`);
        result.errors.forEach(err => console.error(`  - ${err}`));
        onRebuild?.(new Error('Build failed'), null);
      }
    } catch (error) {
      console.error(`[watch] ✗ Build error:`, error.message);
      onRebuild?.(error, null);
    }
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[watch] Stopping...');
    watcher.close();
    process.exit(0);
  });
}

/**
 * Restart server after rebuild
 */
async function restartServer(bundlePath: string): Promise<void> {
  console.log('[watch] Restarting server...');

  // Kill existing server process if running
  // This is simplified - real implementation would track child process

  // Start new server process
  const { spawn } = await import('child_process');
  const serverProcess = spawn('node', [bundlePath], {
    stdio: 'inherit',
  });

  serverProcess.on('error', (error) => {
    console.error(`[watch] Server error:`, error.message);
  });
}
```

---

## 5. Testing Strategy (Feature 4.2)

### 5.1 Unit Tests

**Total: 65 tests**

#### A. Standalone Formatter Tests (15 tests)
**File**: `test-standalone-formatter.sh`

```bash
Test 1: Create standalone bundle
Test 2: Generate package.json
Test 3: Copy native modules
Test 4: Copy assets
Test 5: Handle missing assets
Test 6: Directory creation
Test 7: File permissions
Test 8: Empty dependencies
Test 9: Only native modules
Test 10: Mixed dependencies
Test 11: Asset patterns
Test 12: Nested directories
Test 13: Validate output structure
Test 14: Bundle size calculation
Test 15: Error handling
```

#### B. Executable Builder Tests (20 tests)
**File**: `test-executable-builder.sh`

```bash
Test 1: Create Linux executable
Test 2: Create macOS executable
Test 3: Create Windows executable
Test 4: Cross-platform build (all platforms)
Test 5: Platform target mapping
Test 6: Compression enabled
Test 7: Compression disabled
Test 8: Include assets in executable
Test 9: Validate executable exists
Test 10: Validate executable permissions
Test 11: File size reporting
Test 12: Platform suffix (Linux)
Test 13: Platform suffix (macOS)
Test 14: Platform suffix (Windows .exe)
Test 15: Invalid platform (error)
Test 16: Missing pkg dependency (error)
Test 17: pkg execution error handling
Test 18: Output path creation
Test 19: Multiple platform outputs
Test 20: Executable verification
```

#### C. Source Map Handler Tests (15 tests)
**File**: `test-sourcemap-handler.sh`

```bash
Test 1: Inline source map
Test 2: External source map
Test 3: Both (inline + external)
Test 4: Write external .map file
Test 5: Base64 encoding (inline)
Test 6: Source map URL comment
Test 7: Validate source map JSON
Test 8: Handle missing source map content
Test 9: File path generation (.map)
Test 10: Source map content structure
Test 11: Inline vs external size comparison
Test 12: Multiple source maps
Test 13: Source map validation
Test 14: Error handling (write failure)
Test 15: Source map path resolution
```

#### D. Watch Manager Tests (15 tests)
**File**: `test-watch-manager.sh`

```bash
Test 1: Start watch mode
Test 2: Initial build
Test 3: File change detection
Test 4: Rebuild on change
Test 5: Incremental build timing
Test 6: Ignore patterns (node_modules)
Test 7: Ignore patterns (dist)
Test 8: Poll mode
Test 9: Custom interval
Test 10: Restart server after rebuild
Test 11: Error handling (build failure)
Test 12: Graceful shutdown (SIGINT)
Test 13: Multiple file changes
Test 14: Debouncing (rapid changes)
Test 15: Watch callback invocation
```

### 5.2 Integration Tests (25 tests)

**File**: `bundle-advanced-integration.test.ts`

```typescript
describe('Bundle Advanced Integration Tests (Feature 4.2)', () => {
  // Standalone format
  test('Bundle standalone format', async () => {
    // Bundle --format standalone
    // Verify dist/ directory structure
    // Verify package.json
    // Verify server.js
    // Run: cd dist && npm install && node server.js
  });

  test('Standalone with native modules', async () => {
    // Server with better-sqlite3
    // Bundle --format standalone
    // Verify node_modules/better-sqlite3 copied
    // Verify package.json includes better-sqlite3
  });

  test('Standalone with assets', async () => {
    // Bundle with assets
    // Verify assets/ directory
    // Verify files copied
  });

  // Executable format
  test('Bundle executable (Linux)', async () => {
    // Bundle --format executable --platforms linux
    // Verify executable created
    // Verify permissions
    // Run executable (if on Linux)
  });

  test('Bundle executable (cross-platform)', async () => {
    // Bundle --format executable --platforms linux,macos,windows
    // Verify 3 executables
    // Verify correct extensions (.exe for Windows)
  });

  test('Executable with compression', async () => {
    // Bundle --format executable --compress
    // Verify smaller size
    // Verify still works
  });

  // Source maps
  test('Bundle with inline source map', async () => {
    // Bundle --sourcemap inline
    // Verify base64 source map in bundle
    // Verify works with debugger
  });

  test('Bundle with external source map', async () => {
    // Bundle --sourcemap external
    // Verify .map file created
    // Verify source map valid JSON
  });

  test('Bundle with both source maps', async () => {
    // Bundle --sourcemap both
    // Verify inline AND .map file
  });

  // Watch mode
  test('Watch mode rebuilds on change', async () => {
    // Bundle --watch (in background)
    // Modify source file
    // Wait for rebuild
    // Verify new bundle
    // Kill watch
  });

  test('Watch mode handles errors', async () => {
    // Bundle --watch
    // Introduce syntax error
    // Wait for rebuild
    // Verify error reported
    // Fix error
    // Verify rebuild succeeds
  });

  test('Watch with restart option', async () => {
    // Bundle --watch --restart
    // Modify file
    // Verify server restarted
  });

  // Module formats
  test('Bundle ESM format explicit', async () => {
    // Bundle --format esm
    // Verify import/export syntax
    // Verify works
  });

  test('Bundle CJS format explicit', async () => {
    // Bundle --format cjs
    // Verify require/module.exports
    // Verify works
  });

  // Combined features
  test('Standalone with source maps', async () => {
    // Bundle --format standalone --sourcemap external
    // Verify dist/ with .map file
  });

  test('Watch mode with minification', async () => {
    // Bundle --watch --minify
    // Modify file
    // Verify rebuild is minified
  });

  test('Executable with assets', async () => {
    // Bundle --format executable --assets config.json
    // Verify asset included in executable
  });

  test('All formats from same source', async () => {
    // Bundle same server to all formats
    // Verify all work
  });

  // Config file
  test('Config with standalone options', async () => {
    // simplemcp.config.js with standalone settings
    // Bundle
    // Verify standalone created
  });

  test('Config with executable options', async () => {
    // Config with executable platforms
    // Bundle
    // Verify cross-platform executables
  });

  test('Config with watch options', async () => {
    // Config with watch settings
    // Bundle
    // Verify watch starts
  });

  // Error scenarios
  test('Invalid format (error)', async () => {
    // Bundle --format invalid
    // Expect error
  });

  test('Executable without pkg (error)', async () => {
    // Remove pkg from devDependencies
    // Bundle --format executable
    // Expect error with helpful message
  });

  test('Watch without entry point (error)', async () => {
    // Bundle --watch missing.ts
    // Expect error
  });

  // Performance
  test('Watch incremental builds are fast', async () => {
    // Initial bundle
    // Watch mode
    // Modify small file
    // Verify rebuild < 500ms
  });

  test('Executable size reasonable', async () => {
    // Bundle --format executable
    // Verify size < 100MB
  });
});
```

---

## 6. Implementation Checklist (Feature 4.2)

### Phase A: Standalone Format (Days 1-2)

- [ ] **standalone-formatter.ts**
  - [ ] Implement `createStandaloneBundle()`
  - [ ] Implement `generatePackageJson()`
  - [ ] Implement `copyNativeModules()`
  - [ ] Implement `copyAssets()`
  - [ ] Write unit tests (15 tests)

### Phase B: Executable Format (Days 3-4)

- [ ] **Add pkg dependency**
  - [ ] `npm install --save-dev pkg`

- [ ] **executable-builder.ts**
  - [ ] Implement `createExecutable()`
  - [ ] Implement platform targeting
  - [ ] Implement compression
  - [ ] Implement `validateExecutable()`
  - [ ] Write unit tests (20 tests)

### Phase C: Source Maps (Day 5)

- [ ] **sourcemap-handler.ts**
  - [ ] Implement `handleSourceMap()`
  - [ ] Implement inline mode
  - [ ] Implement external mode
  - [ ] Implement both mode
  - [ ] Write unit tests (15 tests)

- [ ] **Integrate with bundler**
  - [ ] Update `bundler.ts` to call source map handler
  - [ ] Add sourcemap option to CLI

### Phase D: Watch Mode (Days 6-7)

- [ ] **Add chokidar dependency**
  - [ ] `npm install --save-dev chokidar`

- [ ] **watch-manager.ts**
  - [ ] Implement `startWatch()`
  - [ ] Implement file change detection
  - [ ] Implement rebuild logic
  - [ ] Implement restart logic
  - [ ] Implement graceful shutdown
  - [ ] Write unit tests (15 tests)

- [ ] **CLI integration**
  - [ ] Add `--watch` flag
  - [ ] Add `--restart` flag

### Phase E: Integration & Testing (Day 8)

- [ ] **Integration tests**
  - [ ] Write bundle-advanced-integration.test.ts (25 tests)
  - [ ] Test all format combinations
  - [ ] Test watch mode end-to-end

- [ ] **Configuration**
  - [ ] Update config schema
  - [ ] Update example configs

- [ ] **Documentation**
  - [ ] Update README
  - [ ] Add advanced bundling guide
  - [ ] Document all new formats
  - [ ] Add examples

---

## 7. Success Criteria (Feature 4.2)

### 7.1 Feature Complete When:

- [ ] Standalone format works
- [ ] Executable format works (Linux, macOS, Windows)
- [ ] Source maps work (inline, external, both)
- [ ] Watch mode works
- [ ] All 65 unit tests pass
- [ ] All 25 integration tests pass
- [ ] Documentation complete
- [ ] Cross-platform tested

### 7.2 User Acceptance:

1. **Standalone format**
   ```bash
   simplemcp bundle server.ts --format standalone --output dist/
   cd dist && npm install && node server.js
   ```

2. **Executable format**
   ```bash
   simplemcp bundle server.ts --format executable --output app
   ./app  # Runs without Node.js!
   ```

3. **Source maps**
   ```bash
   simplemcp bundle server.ts --sourcemap external
   # Debug production bundle with source maps
   ```

4. **Watch mode**
   ```bash
   simplemcp bundle server.ts --watch
   # Auto-rebuilds on file changes
   ```

5. **Cross-platform**
   ```bash
   simplemcp bundle server.ts --format executable \
     --platforms linux,macos,windows
   # Creates 3 executables
   ```

---

## 8. Summary

**Feature 4.2 delivers**:
✅ Standalone directory format
✅ Native executables (no Node.js required)
✅ Source maps for debugging
✅ Watch mode for development
✅ Cross-platform builds
✅ ESM/CJS format control

**Depends On**: Feature 4.1 (CLI Infrastructure & Core Bundling)

**Estimated Timeline**: 8 days

**After Feature 4.2**: Complete bundling solution for all deployment scenarios!
