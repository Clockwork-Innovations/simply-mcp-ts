# Feature Plan: Bundle Support for SimpleMCP

**Status:** Planning
**Priority:** High
**Version Target:** 3.1.0
**Author:** SimpleMCP Team
**Date:** 2025-10-16

## Executive Summary

Add support for running bundled MCP server packages with automatic dependency management, enabling distribution and execution of complete server packages without requiring manual dependency installation.

## Problem Statement

### Current Limitations

1. **File-based execution only**
   - CLI only supports running individual `.ts`/`.js` files
   - No support for package directories with dependencies
   - Users must manually install dependencies before running

2. **Distribution challenges**
   - Hard to share complete servers with dependencies
   - No standard bundle format
   - Users need technical knowledge to set up servers

3. **Cross-repo inconsistency**
   - Python SimpleMCP supports package bundles via `uvx`
   - TypeScript version lacks equivalent functionality
   - Different user experience across language implementations

### User Pain Points

**Scenario 1: Sharing Servers**
```bash
# Current (complex)
git clone https://github.com/user/mcp-server
cd mcp-server
npm install
npx simply-mcp run server.ts

# Desired (simple)
npx simply-mcp run https://github.com/user/mcp-server
```

**Scenario 2: Running Bundled Servers**
```bash
# Current (doesn't work)
npx simply-mcp run ./weather-server/
# Error: Not a .ts or .js file

# Desired (works)
npx simply-mcp run ./weather-server/
# Auto-detects package, installs deps, runs server
```

## Solution Overview

### Two-Phase Approach

**Phase 1: Package-Based Bundles** (v3.1.0)
- Support npm package directories with package.json
- Automatic dependency installation
- Standard Node.js package conventions
- Compatible with existing npm ecosystem

**Phase 2: .mcpb Format Support** (v3.2.0 - Future)
- Support Anthropic's official .mcpb bundle format
- Zip-based distribution with manifest
- One-click installation in Claude Desktop
- Cross-language compatibility

### Why Package-Based First?

1. **Ecosystem alignment** - Leverages npm/Node.js standards
2. **Developer familiarity** - Everyone knows package.json
3. **Simpler implementation** - No custom formats or specifications
4. **Immediate value** - Works with existing tools and workflows
5. **Python parity** - Matches sibling repo's primary approach
6. **Lower risk** - Uses proven, stable patterns

## Phase 1: Package-Based Bundles

### Architecture

#### Detection Flow

```typescript
// Enhanced run command detection
async function detectInputType(input: string): Promise<InputType> {
  const stats = await stat(input);

  if (stats.isDirectory()) {
    if (await exists(join(input, 'package.json'))) {
      return 'package-bundle';
    }
    throw new Error('Directory must contain package.json');
  }

  if (input.endsWith('.mcpb')) {
    return 'mcpb-bundle';  // Phase 2
  }

  if (input.endsWith('.ts') || input.endsWith('.js')) {
    return 'source-file';
  }

  throw new Error('Unsupported input type');
}
```

#### Package Bundle Structure

```
weather-server/                    # Bundle directory
├── package.json                   # Package metadata + dependencies
├── README.md                      # Documentation
├── .env.example                   # Environment template
└── src/
    └── server.ts                  # Main server implementation
```

#### Package.json Requirements

```json
{
  "name": "weather-mcp-server",
  "version": "1.0.0",
  "description": "Weather information MCP server",
  "type": "module",
  "main": "./src/server.ts",
  "bin": {
    "weather-server": "./src/server.ts"
  },
  "dependencies": {
    "simply-mcp": "^3.0.0",
    "axios": "^1.6.0",
    "zod": "^3.22.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Implementation Details

#### 1. Package Detection Module

**Location:** `src/cli/package-detector.ts`

```typescript
/**
 * Detect if a path is a package bundle
 */
export async function isPackageBundle(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    if (!stats.isDirectory()) return false;

    const pkgPath = join(path, 'package.json');
    return await exists(pkgPath);
  } catch {
    return false;
  }
}

/**
 * Read and validate package.json
 */
export async function readPackageJson(bundlePath: string): Promise<PackageJson> {
  const pkgPath = join(bundlePath, 'package.json');
  const content = await readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(content);

  // Validate required fields
  if (!pkg.name || !pkg.version) {
    throw new Error('package.json must have name and version');
  }

  return pkg;
}

/**
 * Resolve entry point from package.json
 */
export function resolveEntryPoint(pkg: PackageJson, bundlePath: string): string {
  // Priority: bin > main > module > default
  if (pkg.bin) {
    if (typeof pkg.bin === 'string') {
      return join(bundlePath, pkg.bin);
    }
    if (typeof pkg.bin === 'object') {
      const firstBin = Object.values(pkg.bin)[0];
      return join(bundlePath, firstBin);
    }
  }

  if (pkg.main) {
    return join(bundlePath, pkg.main);
  }

  if (pkg.module) {
    return join(bundlePath, pkg.module);
  }

  // Default locations
  const defaults = [
    'src/server.ts',
    'src/index.ts',
    'server.ts',
    'index.ts'
  ];

  for (const def of defaults) {
    const path = join(bundlePath, def);
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error('No entry point found in package');
}
```

#### 2. Dependency Manager

**Location:** `src/cli/dependency-manager.ts`

```typescript
/**
 * Check if dependencies are installed
 */
export async function areDependenciesInstalled(bundlePath: string): Promise<boolean> {
  const nodeModulesPath = join(bundlePath, 'node_modules');
  return await exists(nodeModulesPath);
}

/**
 * Install package dependencies
 */
export async function installDependencies(
  bundlePath: string,
  options: InstallOptions = {}
): Promise<void> {
  const {
    packageManager = detectPackageManager(bundlePath),
    silent = false,
    force = false
  } = options;

  // Check if already installed
  if (!force && await areDependenciesInstalled(bundlePath)) {
    if (!silent) {
      console.error('[Bundle] Dependencies already installed');
    }
    return;
  }

  if (!silent) {
    console.error(`[Bundle] Installing dependencies using ${packageManager}...`);
  }

  const installCmd = getInstallCommand(packageManager);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(installCmd.cmd, installCmd.args, {
      cwd: bundlePath,
      stdio: silent ? 'pipe' : 'inherit',
      shell: true
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        if (!silent) {
          console.error('[Bundle] Dependencies installed successfully');
        }
        resolve();
      } else {
        reject(new Error(`Dependency installation failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Detect package manager from lock files
 */
function detectPackageManager(bundlePath: string): PackageManager {
  if (existsSync(join(bundlePath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(bundlePath, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(bundlePath, 'bun.lockb'))) return 'bun';
  return 'npm';
}

/**
 * Get install command for package manager
 */
function getInstallCommand(pm: PackageManager): { cmd: string; args: string[] } {
  const commands = {
    npm: { cmd: 'npm', args: ['install'] },
    pnpm: { cmd: 'pnpm', args: ['install'] },
    yarn: { cmd: 'yarn', args: ['install'] },
    bun: { cmd: 'bun', args: ['install'] }
  };

  return commands[pm];
}
```

#### 3. Bundle Runner

**Location:** `src/cli/bundle-runner.ts`

```typescript
/**
 * Run a package bundle
 */
export async function runPackageBundle(
  bundlePath: string,
  options: RunOptions
): Promise<void> {
  const {
    autoInstall = true,
    verbose = false,
    ...runOpts
  } = options;

  if (verbose) {
    console.error(`[Bundle] Loading package from: ${bundlePath}`);
  }

  // 1. Read package.json
  const pkg = await readPackageJson(bundlePath);

  if (verbose) {
    console.error(`[Bundle] Package: ${pkg.name}@${pkg.version}`);
  }

  // 2. Resolve entry point
  const entryPoint = resolveEntryPoint(pkg, bundlePath);

  if (verbose) {
    console.error(`[Bundle] Entry point: ${entryPoint}`);
  }

  // 3. Check/install dependencies
  const depsInstalled = await areDependenciesInstalled(bundlePath);

  if (!depsInstalled) {
    if (autoInstall) {
      await installDependencies(bundlePath, { silent: !verbose });
    } else {
      throw new Error(
        `Dependencies not installed. Run 'npm install' in ${bundlePath} or use --auto-install flag`
      );
    }
  } else if (verbose) {
    console.error('[Bundle] Dependencies already installed');
  }

  // 4. Run the server using existing run logic
  // This leverages the existing API style detection and execution
  const { detectAPIStyle } = await import('./run.js');
  const style = await detectAPIStyle(entryPoint);

  if (verbose) {
    console.error(`[Bundle] Detected API style: ${style}`);
  }

  // Execute using appropriate adapter
  const adapters = {
    interface: () => import('./run.js').then(m => m.runInterfaceAdapter),
    decorator: () => import('./run.js').then(m => m.runDecoratorAdapter),
    functional: () => import('./run.js').then(m => m.runFunctionalAdapter),
    programmatic: () => import('./run.js').then(m => m.runProgrammaticAdapter),
    'mcp-builder': () => import('./run.js').then(m => m.runMCPBuilderAdapter)
  };

  const runAdapter = await adapters[style]();
  await runAdapter(
    entryPoint,
    runOpts.useHttp || false,
    runOpts.useHttpStateless || false,
    runOpts.port || 3000,
    verbose
  );
}
```

#### 4. Integration with Run Command

**Location:** `src/cli/run.ts` (modifications)

```typescript
// In run command handler
export const runCommand: CommandModule = {
  command: 'run [file..]',
  // ... existing builder ...

  handler: async (argv: any) => {
    const files = argv.file ? (Array.isArray(argv.file) ? argv.file : [argv.file]) : [];

    // ... existing validation ...

    for (const file of files) {
      // NEW: Check if file is a package bundle
      if (await isPackageBundle(file)) {
        if (argv.verbose) {
          console.error(`[RunCommand] Detected package bundle: ${file}`);
        }

        await runPackageBundle(file, {
          autoInstall: argv['auto-install'] ?? true,
          verbose: argv.verbose,
          useHttp: useHttp,
          useHttpStateless: useHttpStateless,
          port: port
        });
        continue;
      }

      // Existing file-based logic
      // ...
    }
  }
};
```

### CLI Enhancements

#### New Flags

```typescript
// Add to run command options
.option('auto-install', {
  describe: 'Auto-install dependencies for package bundles',
  type: 'boolean',
  default: true
})
.option('package-manager', {
  describe: 'Package manager to use (npm, pnpm, yarn, bun)',
  type: 'string',
  choices: ['npm', 'pnpm', 'yarn', 'bun']
})
.option('force-install', {
  describe: 'Force reinstall dependencies even if already installed',
  type: 'boolean',
  default: false
})
```

#### Usage Examples

```bash
# Basic usage
npx simply-mcp run ./weather-server/

# With verbose output
npx simply-mcp run ./weather-server/ --verbose

# Skip auto-install
npx simply-mcp run ./weather-server/ --no-auto-install

# Force specific package manager
npx simply-mcp run ./weather-server/ --package-manager pnpm

# Force reinstall
npx simply-mcp run ./weather-server/ --force-install

# With HTTP transport
npx simply-mcp run ./weather-server/ --http --port 3000
```

### Bundle Creation Workflow

#### 1. Create Bundle Command

**New command:** `simply-mcp create-bundle`

```bash
# Interactive bundle creation
npx simply-mcp create-bundle

# Non-interactive
npx simply-mcp create-bundle \
  --name weather-server \
  --entry src/server.ts \
  --output ./bundles/weather-server/
```

#### 2. Bundle from Existing Server

```bash
# Package an existing server
npx simply-mcp create-bundle \
  --from ./my-server.ts \
  --output ./bundles/my-server/
```

This command:
1. Creates directory structure
2. Generates package.json with dependencies
3. Copies server file
4. Creates README.md
5. Adds .env.example if needed

#### 3. Bundle Template Generator

```typescript
// Location: src/cli/create-bundle.ts

export async function createBundle(options: CreateBundleOptions): Promise<void> {
  const {
    name,
    entry,
    output,
    description = 'MCP Server Bundle',
    author = '',
    version = '1.0.0'
  } = options;

  // Create directory structure
  await mkdir(join(output, 'src'), { recursive: true });

  // Generate package.json
  const pkg = {
    name,
    version,
    description,
    type: 'module',
    main: './src/server.ts',
    bin: {
      [name]: './src/server.ts'
    },
    dependencies: await detectDependencies(entry),
    engines: {
      node: '>=20.0.0'
    }
  };

  await writeFile(
    join(output, 'package.json'),
    JSON.stringify(pkg, null, 2)
  );

  // Copy server file
  await copyFile(entry, join(output, 'src/server.ts'));

  // Generate README
  const readme = generateReadme({ name, description, ...pkg });
  await writeFile(join(output, 'README.md'), readme);

  console.log(`✓ Bundle created at: ${output}`);
  console.log(`\nTo run: npx simply-mcp run ${output}`);
}
```

### Enhanced Standalone Bundle Format

#### Update Existing Bundle Command

The existing `simply-mcp bundle` command creates standalone executables. Enhance it to also create package bundles:

```bash
# Create package bundle (new)
npx simply-mcp bundle server.ts \
  --format package \
  --output ./bundles/my-server/

# Existing formats still work
npx simply-mcp bundle server.ts --format single-file
npx simply-mcp bundle server.ts --format standalone
```

#### Package Format Enhancements

Update `src/core/formatters/standalone-formatter.ts`:

```typescript
export async function createPackageBundle(options: PackageBundleOptions): Promise<void> {
  const { entry, output, name, version } = options;

  // Create structure
  await mkdir(join(output, 'src'), { recursive: true });

  // Bundle the code (using esbuild)
  const bundled = await bundle({
    entry,
    output: join(output, 'src/server.js'),
    format: 'esm',
    minify: false,
    platform: 'node'
  });

  // Add shebang to bundled file
  await addShebang(join(output, 'src/server.js'));

  // Generate package.json with detected dependencies
  const pkg = {
    name: name || basename(output),
    version: version || '1.0.0',
    type: 'module',
    main: './src/server.js',
    bin: {
      [name || basename(output)]: './src/server.js'
    },
    dependencies: detectExternalDependencies(bundled),
    engines: { node: '>=20.0.0' }
  };

  await writeFile(
    join(output, 'package.json'),
    JSON.stringify(pkg, null, 2)
  );

  console.log(`✓ Package bundle created: ${output}`);
  console.log(`\nRun: npx simply-mcp run ${output}`);
}
```

## Phase 2: .mcpb Format Support (Future)

### Anthropic .mcpb Specification

Based on https://github.com/anthropics/mcpb:

```
server.mcpb (zip file containing):
├── manifest.json           # Bundle metadata
├── server.js              # Entry point
└── node_modules/          # Optional dependencies
```

#### Manifest Structure

```json
{
  "name": "weather-server",
  "version": "1.0.0",
  "description": "Weather information MCP server",
  "schemaVersion": 1,
  "runtime": "node",
  "entry": "server.js",
  "capabilities": {
    "tools": true,
    "prompts": true,
    "resources": true
  },
  "permissions": {
    "network": true,
    "filesystem": false
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Implementation Plan (Future)

#### 1. MCPB Detector

```typescript
// Location: src/cli/mcpb-detector.ts

export async function isMCPBBundle(path: string): Promise<boolean> {
  if (!path.endsWith('.mcpb')) return false;
  return await exists(path);
}

export async function extractMCPB(mcpbPath: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'mcpb-'));

  // Extract zip to temp directory
  await extract(mcpbPath, { dir: tempDir });

  return tempDir;
}
```

#### 2. Manifest Parser

```typescript
// Location: src/cli/manifest-parser.ts

export async function readManifest(bundlePath: string): Promise<MCPBManifest> {
  const manifestPath = join(bundlePath, 'manifest.json');
  const content = await readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(content);

  // Validate manifest
  validateManifest(manifest);

  return manifest;
}
```

#### 3. MCPB Runner

```typescript
// Location: src/cli/mcpb-runner.ts

export async function runMCPBBundle(
  mcpbPath: string,
  options: RunOptions
): Promise<void> {
  // 1. Extract bundle
  const extractedPath = await extractMCPB(mcpbPath);

  // 2. Read manifest
  const manifest = await readManifest(extractedPath);

  // 3. Validate runtime
  if (manifest.runtime !== 'node') {
    throw new Error(`Unsupported runtime: ${manifest.runtime}`);
  }

  // 4. Resolve entry point
  const entryPoint = join(extractedPath, manifest.entry);

  // 5. Install dependencies if needed
  if (await exists(join(extractedPath, 'package.json'))) {
    await installDependencies(extractedPath);
  }

  // 6. Run server
  await runServer(entryPoint, options);

  // 7. Cleanup on exit
  process.on('exit', () => {
    rmSync(extractedPath, { recursive: true, force: true });
  });
}
```

### .mcpb Creation Tool

```bash
# Create .mcpb from package bundle
npx simply-mcp create-mcpb ./weather-server/ --output weather-server.mcpb

# Create .mcpb from source
npx simply-mcp create-mcpb server.ts --output weather-server.mcpb
```

## Testing Strategy

### Unit Tests

**Location:** `tests/unit/bundle.test.ts`

```typescript
describe('Package Bundle Detection', () => {
  test('detects package bundle directory', async () => {
    const result = await isPackageBundle('./fixtures/valid-bundle/');
    expect(result).toBe(true);
  });

  test('rejects non-bundle directory', async () => {
    const result = await isPackageBundle('./fixtures/no-package-json/');
    expect(result).toBe(false);
  });

  test('rejects file path', async () => {
    const result = await isPackageBundle('./server.ts');
    expect(result).toBe(false);
  });
});

describe('Entry Point Resolution', () => {
  test('resolves from bin field', () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      bin: { 'test': './dist/server.js' }
    };
    const entry = resolveEntryPoint(pkg, '/bundle');
    expect(entry).toBe('/bundle/dist/server.js');
  });

  test('falls back to main field', () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      main: './src/index.ts'
    };
    const entry = resolveEntryPoint(pkg, '/bundle');
    expect(entry).toBe('/bundle/src/index.ts');
  });

  test('uses default locations', () => {
    const pkg = { name: 'test', version: '1.0.0' };
    // Mock file existence
    existsSync.mockReturnValueOnce(false)  // src/server.ts
      .mockReturnValueOnce(true);          // src/index.ts

    const entry = resolveEntryPoint(pkg, '/bundle');
    expect(entry).toBe('/bundle/src/index.ts');
  });
});

describe('Dependency Installation', () => {
  test('detects installed dependencies', async () => {
    const installed = await areDependenciesInstalled('./fixtures/with-deps/');
    expect(installed).toBe(true);
  });

  test('detects missing dependencies', async () => {
    const installed = await areDependenciesInstalled('./fixtures/no-deps/');
    expect(installed).toBe(false);
  });

  test('installs dependencies with npm', async () => {
    await installDependencies('./fixtures/test-bundle/', {
      packageManager: 'npm',
      silent: true
    });

    expect(existsSync('./fixtures/test-bundle/node_modules')).toBe(true);
  });
});
```

### Integration Tests

**Location:** `tests/integration/test-bundle-run.sh`

```bash
#!/bin/bash
set -e

echo "Testing package bundle execution..."

# Test 1: Run simple bundle
echo "Test 1: Run simple calculator bundle"
npx simply-mcp run ./fixtures/bundles/calculator/ --dry-run
echo "✓ Calculator bundle validated"

# Test 2: Auto-install dependencies
echo "Test 2: Auto-install dependencies"
rm -rf ./fixtures/bundles/weather/node_modules
npx simply-mcp run ./fixtures/bundles/weather/ --verbose &
PID=$!
sleep 2
kill $PID
[ -d "./fixtures/bundles/weather/node_modules" ] || exit 1
echo "✓ Dependencies auto-installed"

# Test 3: HTTP transport with bundle
echo "Test 3: HTTP transport"
npx simply-mcp run ./fixtures/bundles/api-server/ --http --port 3456 &
PID=$!
sleep 2
curl -s http://localhost:3456/health
kill $PID
echo "✓ HTTP transport works"

# Test 4: Package manager detection
echo "Test 4: Package manager detection"
touch ./fixtures/bundles/test/pnpm-lock.yaml
npx simply-mcp run ./fixtures/bundles/test/ --verbose 2>&1 | grep "pnpm"
rm ./fixtures/bundles/test/pnpm-lock.yaml
echo "✓ Package manager detected"

echo "All bundle tests passed!"
```

### Bundle Fixtures

Create test bundles:

```bash
tests/fixtures/bundles/
├── calculator/
│   ├── package.json
│   └── src/server.ts
├── weather/
│   ├── package.json
│   ├── src/server.ts
│   └── .env.example
└── api-server/
    ├── package.json
    └── src/
        ├── server.ts
        └── utils.ts
```

## Documentation Updates

### 1. User Guide

**Location:** `docs/guides/BUNDLE_USAGE.md`

```markdown
# Running Package Bundles

## Quick Start

Run a package bundle:
```bash
npx simply-mcp run ./my-server-bundle/
```

Dependencies are installed automatically!

## Creating Bundles

### Method 1: From Scratch
[Step-by-step guide...]

### Method 2: From Existing Server
[Conversion guide...]

## Distribution

### Sharing via Git
[Git workflow...]

### Publishing to npm
[npm publish workflow...]
```

### 2. API Reference

**Location:** `docs/guides/CLI_REFERENCE.md` (update)

Add section:

```markdown
## Running Package Bundles

### Syntax

```bash
simply-mcp run <bundle-directory> [options]
```

### Bundle Requirements

- Must contain `package.json`
- Must specify entry point (bin, main, or module field)
- Dependencies listed in `dependencies` field

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--auto-install` | Auto-install dependencies | `true` |
| `--package-manager` | Package manager (npm/pnpm/yarn/bun) | auto-detect |
| `--force-install` | Force reinstall dependencies | `false` |

### Examples
[Examples...]
```

### 3. Bundle Guide

**Location:** `docs/guides/BUNDLING.md` (update)

Add sections:
- Package Bundle Format
- Creating Package Bundles
- Distribution Best Practices
- Troubleshooting

### 4. Migration Guide

**Location:** `docs/guides/BUNDLE_MIGRATION.md` (new)

Guide for converting existing servers to bundles.

## Examples

### Example 1: Weather Server Bundle

```
weather-server/
├── package.json
├── README.md
├── .env.example
└── src/
    └── server.ts
```

**package.json:**
```json
{
  "name": "weather-mcp-server",
  "version": "1.0.0",
  "description": "Weather information via OpenWeatherMap API",
  "type": "module",
  "main": "./src/server.ts",
  "bin": {
    "weather-server": "./src/server.ts"
  },
  "dependencies": {
    "simply-mcp": "^3.0.0",
    "axios": "^1.6.0",
    "dotenv": "^16.0.0",
    "zod": "^3.22.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**src/server.ts:**
```typescript
#!/usr/bin/env node
import 'dotenv/config';
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';
import axios from 'axios';

const server = new BuildMCPServer({
  name: 'weather',
  version: '1.0.0'
});

server.addTool({
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: z.object({
    city: z.string(),
    units: z.enum(['metric', 'imperial']).optional()
  }),
  execute: async ({ city, units = 'metric' }) => {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          q: city,
          units,
          appid: process.env.OPENWEATHER_API_KEY
        }
      }
    );

    return {
      temperature: response.data.main.temp,
      conditions: response.data.weather[0].description,
      humidity: response.data.main.humidity
    };
  }
});

await server.start();
```

**Usage:**
```bash
# Run the bundle
npx simply-mcp run ./weather-server/

# Or from Git
npx simply-mcp run https://github.com/user/weather-server
```

### Example 2: Calculator Bundle

**Minimal structure:**
```
calculator/
├── package.json
└── server.ts
```

**package.json:**
```json
{
  "name": "calculator-mcp",
  "version": "1.0.0",
  "main": "./server.ts",
  "dependencies": {
    "simply-mcp": "^3.0.0",
    "zod": "^3.22.0"
  }
}
```

### Example 3: Database Server Bundle

**With multiple files:**
```
db-server/
├── package.json
├── README.md
├── .env.example
└── src/
    ├── server.ts
    ├── database.ts
    └── queries/
        ├── users.ts
        └── posts.ts
```

## Implementation Timeline

### Sprint 1: Core Infrastructure (Week 1)
- [ ] Package detection module
- [ ] Dependency manager
- [ ] Entry point resolver
- [ ] Unit tests for core functions

### Sprint 2: CLI Integration (Week 2)
- [ ] Integrate with run command
- [ ] Add CLI flags
- [ ] Bundle runner implementation
- [ ] Integration tests

### Sprint 3: Bundle Creation (Week 3)
- [ ] create-bundle command
- [ ] Bundle templates
- [ ] Package format enhancements
- [ ] Documentation

### Sprint 4: Polish & Release (Week 4)
- [ ] Error handling improvements
- [ ] Performance optimization
- [ ] Complete documentation
- [ ] Release v3.1.0

## Success Metrics

### Technical Metrics
- [ ] Unit test coverage > 80%
- [ ] All integration tests pass
- [ ] Zero regression in existing functionality
- [ ] Bundle run time < 5 seconds (with cached deps)
- [ ] Dependency install time < 30 seconds

### User Metrics
- [ ] Successful bundle execution on first try > 90%
- [ ] Auto-install success rate > 95%
- [ ] Clear error messages for all failure cases
- [ ] Documentation completeness > 90%

## Risk Mitigation

### Risk 1: Dependency Installation Failures
**Impact:** High
**Probability:** Medium
**Mitigation:**
- Graceful degradation with clear error messages
- Support for pre-installed dependencies
- Manual installation fallback
- Package manager compatibility testing

### Risk 2: Entry Point Detection Issues
**Impact:** Medium
**Probability:** Low
**Mitigation:**
- Multiple fallback strategies
- Explicit error messages with suggestions
- Documentation of requirements
- Validation in dry-run mode

### Risk 3: Breaking Changes to Existing Functionality
**Impact:** High
**Probability:** Low
**Mitigation:**
- Comprehensive regression testing
- Feature flags for gradual rollout
- Backward compatibility guarantees
- Beta testing period

## Future Enhancements (Post v3.1.0)

### v3.2.0: .mcpb Support
- [ ] MCPB format parser
- [ ] Zip extraction utilities
- [ ] Manifest validation
- [ ] MCPB creation tools

### v3.3.0: Remote Bundles
- [ ] HTTP/HTTPS bundle URLs
- [ ] Git repository support
- [ ] NPM package resolution
- [ ] Bundle caching

### v3.4.0: Bundle Registry
- [ ] Public bundle registry
- [ ] Discovery and search
- [ ] Version management
- [ ] Security scanning

## Open Questions

1. **Should we support Git URLs directly?**
   - `npx simply-mcp run https://github.com/user/server`
   - Requires git clone implementation
   - Caching strategy needed

2. **Should bundles be cached globally?**
   - `~/.simply-mcp/bundles/` directory?
   - Cache invalidation strategy
   - Disk space management

3. **Should we validate bundle security?**
   - Package signature verification
   - Dependency vulnerability scanning
   - Sandboxing options

4. **Should we support monorepo bundles?**
   - Multiple servers in one bundle
   - Workspace support
   - Shared dependencies

## References

### Internal
- [Bundling Guide](../guides/BUNDLING.md)
- [CLI Architecture](../development/ARCHITECTURE.md)
- [Python SimpleMCP Bundle Setup](../../simply-mcp-py/BUNDLE_SETUP.md)

### External
- [NPM Package.json Spec](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [Anthropic MCPB Spec](https://github.com/anthropics/mcpb)
- [Python UV Bundle Approach](https://docs.astral.sh/uv/guides/tools/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## Approval & Sign-off

- [ ] Technical Lead Review
- [ ] Security Review
- [ ] Documentation Review
- [ ] QA Sign-off
- [ ] Product Manager Approval

---

**Next Steps:**
1. Review and approve plan
2. Create implementation tickets
3. Begin Sprint 1 development
4. Weekly progress reviews
