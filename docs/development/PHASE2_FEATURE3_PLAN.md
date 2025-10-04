# Phase 2, Feature 3: Auto-Installation - Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for adding automatic dependency installation to SimplyMCP servers. This feature will detect missing dependencies (from inline declarations or package.json), automatically install them using npm/yarn/pnpm, and manage lock files - providing a seamless developer experience similar to Python's uv package manager.

**Status**: Planning Phase
**Priority**: HIGH
**Estimated Complexity**: High
**Breaking Changes**: None (fully opt-in, backward compatible)
**Relation to Phase 2**: Feature 3 of 4 (builds on Feature 2: Inline Dependencies)

---

## 1. Overview

### 1.1 What is Auto-Installation?

Auto-installation automatically detects and installs missing npm dependencies when running a SimplyMCP server, eliminating manual `npm install` steps and enabling true single-file server distribution.

**Key Capabilities:**
1. **Automatic detection** of missing dependencies from inline declarations
2. **Smart installation** using npm/yarn/pnpm (auto-detected or user-specified)
3. **Lock file management** (generation and updates)
4. **Installation status reporting** with progress feedback
5. **Error handling and recovery** with helpful diagnostics
6. **Integration with Feature 2** (Inline Dependencies)

### 1.2 FastMCP Parity Goals

Python's FastMCP uses `uv` for automatic dependency management. SimplyMCP aims to provide equivalent functionality using npm/yarn/pnpm:

**FastMCP (Python) Behavior:**
- Uses `uv` for package installation
- Detects missing packages from inline dependencies
- Creates virtual environments automatically
- Handles dependency conflicts intelligently
- Provides installation progress feedback
- Zero-config experience

**SimplyMCP (TypeScript) Goals:**
- Use npm/yarn/pnpm for package installation
- Detect missing packages from inline dependencies
- Install to local node_modules automatically
- Handle dependency conflicts with clear warnings
- Provide installation progress feedback
- Zero-config experience with smart defaults

### 1.3 User Experience

**Before (Manual):**
```bash
# User must manually install dependencies
cat server.ts  # See dependencies declared inline
npm install axios@^1.6.0 zod@^3.22.0
node server.ts
```

**After (Automatic):**
```bash
# SimplyMCP handles everything
npx simplemcp run server.ts

# Output:
# [SimplyMCP] Detected 2 inline dependencies
# [SimplyMCP] Missing packages: axios, zod
# [SimplyMCP] Install dependencies? (y/n): y
# [SimplyMCP] Installing with npm...
# [SimplyMCP] ✓ Installed axios@^1.6.0
# [SimplyMCP] ✓ Installed zod@^3.22.0
# [SimplyMCP] ✓ Generated package-lock.json
# [SimplyMCP] Starting server...
```

---

## 2. Design Decisions

### 2.1 Installation Trigger Points

**Decision: Multiple trigger points, user-controlled**

**A. Explicit API Call (Primary)**
```typescript
// Manual installation via API
await server.installDependencies();
```

**B. SimplyMCP.fromFile() with autoInstall Option**
```typescript
// Auto-install when loading from file
const server = await SimplyMCP.fromFile('./server.ts', {
  autoInstall: true  // Opt-in
});
```

**C. CLI Command (Feature 4)**
```bash
# CLI handles auto-installation
npx simplemcp run server.ts --auto-install
```

**D. Never on server.start()** - Too late, imports already failed

**Rationale:**
- Explicit control prevents unexpected network/disk operations
- Opt-in ensures backward compatibility
- CLI provides best UX for end users
- API provides flexibility for programmatic usage

### 2.2 Package Manager Detection

**Decision: Auto-detect with override option**

**Detection Strategy (Priority Order):**
1. Check for `package-lock.json` → Use **npm**
2. Check for `yarn.lock` → Use **yarn**
3. Check for `pnpm-lock.yaml` → Use **pnpm**
4. Check for `bun.lockb` → Use **bun** (future)
5. Check user preference → `options.packageManager`
6. Default → **npm**

**Implementation:**
```typescript
function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(join(cwd, 'package-lock.json'))) return 'npm';
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(cwd, 'bun.lockb'))) return 'bun';
  return 'npm'; // Default
}
```

**User Override:**
```typescript
await server.installDependencies({
  packageManager: 'pnpm' // Override detection
});
```

**Rationale:**
- Lock files indicate project's package manager
- Respects existing project configuration
- Allows override for special cases
- npm is universal fallback

### 2.3 Installation Strategy

**Decision: Install to local node_modules in current directory**

**Strategy:**
- Install packages to `./node_modules` relative to server file
- Respect existing `package.json` if present
- Generate `package.json` if missing
- Update/generate lock files automatically
- Use `--save` flag to persist to package.json

**Directory Structure:**
```
/project
  ├── server.ts              # SimplyMCP server with inline deps
  ├── package.json           # Generated/updated
  ├── package-lock.json      # Generated by npm
  └── node_modules/          # Installed packages
      ├── axios/
      └── zod/
```

**Rationale:**
- Standard Node.js convention
- Works with existing tooling
- No global pollution
- Easy cleanup (delete node_modules)

### 2.4 Lock File Management

**Decision: Always generate/update lock files**

**Behavior:**
- **npm**: Generate/update `package-lock.json`
- **yarn**: Generate/update `yarn.lock`
- **pnpm**: Generate/update `pnpm-lock.yaml`
- **bun**: Generate/update `bun.lockb`

**Verification:**
- Check lock file integrity after installation
- Warn if lock file is corrupted
- Offer to regenerate on corruption

**Implementation:**
```typescript
async function installWithLockfile(
  packageManager: PackageManager,
  packages: string[]
): Promise<InstallResult> {
  // Install packages
  await runPackageManager(packageManager, ['install', ...packages]);

  // Verify lock file was created/updated
  const lockFile = getLockFilePath(packageManager);
  if (!existsSync(lockFile)) {
    throw new Error(`Lock file not generated: ${lockFile}`);
  }

  return { success: true, lockFile };
}
```

**Rationale:**
- Lock files ensure reproducible builds
- Critical for production deployments
- Standard practice in Node.js ecosystem

### 2.5 Progress Reporting

**Decision: Multi-channel progress reporting**

**Channels:**
1. **Console output** (stderr) - Default for CLI
2. **Event emitters** - For programmatic usage
3. **Callback functions** - For custom UX
4. **Logger integration** - Use SimplyMCP logger

**Progress Events:**
```typescript
interface InstallProgressEvent {
  stage: 'detecting' | 'resolving' | 'downloading' | 'installing' | 'complete';
  package?: string;
  current?: number;
  total?: number;
  message?: string;
}
```

**Implementation:**
```typescript
server.on('install:progress', (event: InstallProgressEvent) => {
  console.log(`[${event.stage}] ${event.message}`);
});

await server.installDependencies({
  onProgress: (event) => {
    // Custom progress handling
    updateProgressBar(event.current, event.total);
  }
});
```

**Rationale:**
- Flexible reporting for different contexts
- Real-time feedback for long installations
- Integrates with existing logger system

### 2.6 Error Handling

**Decision: Graceful degradation with actionable errors**

**Error Scenarios:**

| Error | Behavior | Recovery |
|-------|----------|----------|
| npm not installed | Throw with install instructions | Manual npm install |
| Network unavailable | Retry 3x, then throw | Offline mode (future) |
| Permission denied | Throw with sudo hint | Run with permissions |
| Disk full | Throw with space info | Free up space |
| Invalid package name | Throw with validation error | Fix package name |
| Package not found | Throw with registry info | Check package exists |
| Version conflict | Warn, use package.json version | Manual resolution |
| Installation timeout | Throw after 5 minutes | Increase timeout |

**Error Types:**
```typescript
class InstallationError extends Error {
  constructor(
    public code: InstallErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

type InstallErrorCode =
  | 'PACKAGE_MANAGER_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'PERMISSION_ERROR'
  | 'DISK_FULL'
  | 'INVALID_PACKAGE'
  | 'PACKAGE_NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'TIMEOUT';
```

**Rationale:**
- Clear, actionable error messages
- Automatic retry for transient failures
- Graceful degradation when possible
- User control over error handling

### 2.7 Dependency Conflicts

**Decision: package.json takes precedence, warn on conflicts**

**Conflict Resolution:**
```typescript
// Inline deps: axios@^1.6.0
// package.json: axios@^1.5.0
// Result: Use ^1.5.0, warn user

const { dependencies, conflicts } = mergeDependencies(
  inlineDeps,
  packageJsonDeps
);

if (conflicts.length > 0) {
  console.warn('[SimplyMCP] Dependency conflicts detected:');
  conflicts.forEach(pkg => {
    console.warn(`  - ${pkg}: inline=${inlineDeps[pkg]}, package.json=${packageJsonDeps[pkg]}`);
    console.warn(`    Using package.json version: ${packageJsonDeps[pkg]}`);
  });
}
```

**Rationale:**
- package.json is npm's source of truth
- Inline deps are informational/bootstrap
- Conflicts indicate outdated inline declarations
- Warnings help users maintain consistency

### 2.8 Security Considerations

**Decision: Validate everything, sandbox nothing (trust npm)**

**Security Measures:**

1. **Package Name Validation** (reuse Feature 2)
   - Strict regex validation
   - No shell characters
   - Length limits
   - Lowercase enforcement

2. **Version Validation** (reuse Feature 2)
   - Semver-only
   - No shell injection
   - Whitelist approach

3. **Installation Sandboxing**
   - Run npm/yarn/pnpm with `--ignore-scripts` by default
   - Option to enable scripts with explicit flag
   - No arbitrary code execution during install

4. **Registry Verification**
   - Use default npm registry (https://registry.npmjs.org)
   - Support for custom registries via .npmrc
   - Warn on custom registry usage

5. **Timeout Limits**
   - Default: 5 minutes per package
   - Configurable via options
   - Prevents infinite hangs

6. **Disk Space Checks**
   - Check available space before install
   - Warn if < 100MB available
   - Abort if < 10MB available

**Implementation:**
```typescript
async function installWithSecurity(
  packages: string[],
  options: InstallOptions
): Promise<InstallResult> {
  // 1. Validate package names (reuse Feature 2)
  for (const pkg of packages) {
    const [name, version] = pkg.split('@');
    if (!validatePackageName(name)) {
      throw new InstallationError('INVALID_PACKAGE', `Invalid package: ${name}`);
    }
    if (!validateSemverRange(version)) {
      throw new InstallationError('INVALID_PACKAGE', `Invalid version: ${version}`);
    }
  }

  // 2. Check disk space
  const { available } = await checkDiskSpace(process.cwd());
  if (available < 10 * 1024 * 1024) { // 10MB
    throw new InstallationError('DISK_FULL', 'Insufficient disk space');
  }

  // 3. Install with security flags
  const args = [
    'install',
    ...packages,
    '--ignore-scripts', // Disable install scripts by default
    '--no-audit', // Skip audit for speed (optional)
  ];

  if (options.enableScripts) {
    args.splice(args.indexOf('--ignore-scripts'), 1);
  }

  // 4. Run with timeout
  const result = await runWithTimeout(
    () => runPackageManager(packageManager, args),
    options.timeout || 5 * 60 * 1000 // 5 minutes
  );

  return result;
}
```

**Rationale:**
- Validation prevents injection attacks
- Sandboxing prevents malicious scripts
- Timeouts prevent DoS
- Disk checks prevent failures
- Trust npm's security model for actual downloads

### 2.9 Opt-in vs Opt-out

**Decision: Opt-in (disabled by default)**

**Default Behavior:**
```typescript
// By default, auto-install is DISABLED
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
// No auto-installation happens

// Must explicitly enable
const server = await SimplyMCP.fromFile('./server.ts', {
  autoInstall: true  // Opt-in
});

// Or call manually
await server.installDependencies();
```

**Environment Variable:**
```bash
# Enable globally via env var
export SIMPLEMCP_AUTO_INSTALL=true
npx simplemcp run server.ts
```

**Rationale:**
- Safe default (no unexpected network/disk operations)
- Explicit user consent required
- Prevents supply chain attacks via auto-install
- Environment variable for power users

### 2.10 Offline Support

**Decision: Graceful degradation with helpful errors**

**Behavior:**
1. **Detect offline state** - Check network connectivity before install
2. **Use npm cache** - Leverage npm's local cache when offline
3. **Helpful errors** - Explain why installation failed
4. **Skip option** - Allow skipping auto-install when offline

**Implementation:**
```typescript
async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    await fetch('https://registry.npmjs.org', {
      method: 'HEAD',
      timeout: 5000
    });
    return true;
  } catch {
    return false;
  }
}

async function installDependencies(options: InstallOptions): Promise<InstallResult> {
  const isOnline = await checkNetworkConnectivity();

  if (!isOnline) {
    if (options.offline) {
      // Try npm cache
      return installFromCache(options);
    } else {
      throw new InstallationError(
        'NETWORK_ERROR',
        'Cannot install dependencies: Network unavailable. Try --offline to use local cache.'
      );
    }
  }

  // Online installation
  return installFromRegistry(options);
}
```

**Rationale:**
- Offline development is common
- npm cache provides offline capability
- Clear errors help users understand issue
- Graceful degradation maintains usability

---

## 3. Architecture Design

### 3.1 Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                    SimplyMCP Server                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Dependencies (from Feature 2)                      │ │
│  │ { "axios": "^1.6.0", "zod": "^3.22.0" }           │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│                          │ check installed               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │         DependencyChecker                          │ │
│  │  ├─ checkInstalled()                               │ │
│  │  ├─ findMissing()                                  │ │
│  │  ├─ verifyVersions()                               │ │
│  │  └─ getInstalledVersion()                          │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│                          │ missing packages              │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │      PackageManagerDetector                        │ │
│  │  ├─ detectPackageManager()                         │ │
│  │  ├─ verifyInstalled()                              │ │
│  │  └─ getVersion()                                   │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│                          │ package manager               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │        DependencyInstaller                         │ │
│  │  ├─ install()                                      │ │
│  │  ├─ installSingle()                                │ │
│  │  ├─ generateLockfile()                             │ │
│  │  ├─ reportProgress()                               │ │
│  │  └─ handleErrors()                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│                          │ installation result           │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │            Installation Result                     │ │
│  │  - Installed packages                              │ │
│  │  - Lock file path                                  │ │
│  │  - Errors/warnings                                 │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
User calls
installDependencies()
         │
         ▼
Parse inline deps (Feature 2)
  { "axios": "^1.6.0", "zod": "^3.22.0" }
         │
         ▼
Check which packages are installed
  DependencyChecker.findMissing()
         │
         ▼
Missing: ["axios", "zod"]
         │
         ▼
Detect package manager
  PackageManagerDetector.detect()
  → "npm"
         │
         ▼
Verify npm is installed
  PackageManagerDetector.verifyInstalled()
  → npm v10.8.0
         │
         ▼
Build install command
  ["install", "axios@^1.6.0", "zod@^3.22.0", "--save"]
         │
         ▼
Execute npm install
  DependencyInstaller.install()
         │
         ▼
Stream output, report progress
  emit('install:progress', {...})
         │
         ▼
Verify installation
  DependencyChecker.verifyVersions()
         │
         ▼
Generate lock file
  DependencyInstaller.generateLockfile()
         │
         ▼
Return result
  { installed: [...], lockFile: "package-lock.json" }
```

### 3.3 File Structure

```
mcp/
├── core/
│   ├── dependency-checker.ts           (NEW - ~200 lines)
│   │   ├── checkInstalled()
│   │   ├── findMissing()
│   │   ├── verifyVersions()
│   │   ├── getInstalledVersion()
│   │   └── checkDiskSpace()
│   │
│   ├── package-manager-detector.ts     (NEW - ~150 lines)
│   │   ├── detectPackageManager()
│   │   ├── verifyInstalled()
│   │   ├── getVersion()
│   │   ├── getLockFilePath()
│   │   └── getInstallCommand()
│   │
│   ├── dependency-installer.ts         (NEW - ~300 lines)
│   │   ├── install()
│   │   ├── installSingle()
│   │   ├── runPackageManager()
│   │   ├── streamOutput()
│   │   ├── parseInstallOutput()
│   │   ├── generateLockfile()
│   │   ├── verifyLockfile()
│   │   ├── reportProgress()
│   │   └── handleInstallErrors()
│   │
│   ├── installation-types.ts           (NEW - ~150 lines)
│   │   ├── InstallOptions
│   │   ├── InstallResult
│   │   ├── InstallProgressEvent
│   │   ├── InstallError
│   │   ├── PackageManager type
│   │   ├── InstallStatus
│   │   └── DependencyCheckResult
│   │
│   ├── dependency-parser.ts            (EXISTING - Feature 2)
│   ├── dependency-validator.ts         (EXISTING - Feature 2)
│   ├── dependency-utils.ts             (EXISTING - Feature 2)
│   └── dependency-types.ts             (EXISTING - Feature 2)
│
├── SimplyMCP.ts                        (MODIFIED - add auto-install support)
│   ├── installDependencies() method    (NEW)
│   ├── checkDependencies() method      (NEW)
│   ├── autoInstall option              (NEW)
│   └── Event emitters for progress     (NEW)
│
├── examples/
│   ├── auto-install-basic.ts           (NEW - ~100 lines)
│   │   └── Simple auto-installation example
│   │
│   ├── auto-install-advanced.ts        (NEW - ~150 lines)
│   │   └── Custom options, progress tracking
│   │
│   └── auto-install-error-handling.ts  (NEW - ~120 lines)
│       └── Error scenarios and recovery
│
└── tests/
    └── phase2/
        ├── test-auto-install-checker.sh       (NEW - ~400 lines / 20 tests)
        ├── test-auto-install-detector.sh      (NEW - ~300 lines / 15 tests)
        ├── test-auto-install-installer.sh     (NEW - ~500 lines / 25 tests)
        ├── auto-install-integration.test.ts   (NEW - ~600 lines / 30 tests)
        ├── test-auto-install-e2e.sh          (NEW - ~300 lines / 10 tests)
        └── run-auto-install-tests.sh         (NEW - master test runner)
```

---

## 4. Core Components

### 4.1 Dependency Checker

**File: `/mcp/core/dependency-checker.ts`**

**Purpose:** Check which dependencies are installed and verify versions

**Key Functions:**

```typescript
/**
 * Check if a package is installed
 */
export async function checkInstalled(
  packageName: string,
  cwd: string = process.cwd()
): Promise<boolean> {
  try {
    const packagePath = require.resolve(packageName, {
      paths: [cwd]
    });
    return existsSync(packagePath);
  } catch {
    return false;
  }
}

/**
 * Find missing dependencies
 */
export async function findMissing(
  dependencies: InlineDependencies,
  cwd: string = process.cwd()
): Promise<string[]> {
  const missing: string[] = [];

  for (const packageName of Object.keys(dependencies)) {
    const isInstalled = await checkInstalled(packageName, cwd);
    if (!isInstalled) {
      missing.push(packageName);
    }
  }

  return missing;
}

/**
 * Verify installed versions match required versions
 */
export async function verifyVersions(
  dependencies: InlineDependencies,
  cwd: string = process.cwd()
): Promise<{
  matching: string[];
  mismatched: Array<{ package: string; installed: string; required: string }>;
}> {
  const matching: string[] = [];
  const mismatched: Array<{ package: string; installed: string; required: string }> = [];

  for (const [packageName, requiredVersion] of Object.entries(dependencies)) {
    const installedVersion = await getInstalledVersion(packageName, cwd);

    if (!installedVersion) {
      continue; // Package not installed
    }

    if (satisfies(installedVersion, requiredVersion)) {
      matching.push(packageName);
    } else {
      mismatched.push({
        package: packageName,
        installed: installedVersion,
        required: requiredVersion
      });
    }
  }

  return { matching, mismatched };
}

/**
 * Get installed version of a package
 */
export async function getInstalledVersion(
  packageName: string,
  cwd: string = process.cwd()
): Promise<string | null> {
  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`, {
      paths: [cwd]
    });
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return null;
  }
}

/**
 * Check available disk space
 */
export async function checkDiskSpace(cwd: string): Promise<{
  available: number;
  total: number;
  percentage: number;
}> {
  // Use 'check-disk-space' package or native methods
  const { free, size } = await checkDiskSpaceNative(cwd);
  return {
    available: free,
    total: size,
    percentage: (free / size) * 100
  };
}
```

**Test Coverage:** 20 tests
- Check installed packages (installed, not installed, scoped packages)
- Find missing dependencies (all missing, partial, none missing)
- Verify versions (matching, mismatched, wildcard ranges)
- Get installed version (valid, invalid, not found)
- Check disk space (sufficient, low, critical)
- Handle edge cases (invalid node_modules, corrupted packages)

### 4.2 Package Manager Detector

**File: `/mcp/core/package-manager-detector.ts`**

**Purpose:** Auto-detect package manager from lock files

**Key Functions:**

```typescript
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

/**
 * Detect package manager from lock files
 */
export function detectPackageManager(
  cwd: string = process.cwd()
): PackageManager {
  // Check for lock files in priority order
  if (existsSync(join(cwd, 'package-lock.json'))) return 'npm';
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(cwd, 'bun.lockb'))) return 'bun';

  // Default to npm
  return 'npm';
}

/**
 * Verify package manager is installed
 */
export async function verifyInstalled(
  packageManager: PackageManager
): Promise<boolean> {
  try {
    await execAsync(`${packageManager} --version`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get package manager version
 */
export async function getVersion(
  packageManager: PackageManager
): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`${packageManager} --version`);
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Get lock file path for package manager
 */
export function getLockFilePath(
  packageManager: PackageManager,
  cwd: string = process.cwd()
): string {
  const lockFiles: Record<PackageManager, string> = {
    npm: 'package-lock.json',
    yarn: 'yarn.lock',
    pnpm: 'pnpm-lock.yaml',
    bun: 'bun.lockb'
  };
  return join(cwd, lockFiles[packageManager]);
}

/**
 * Get install command for package manager
 */
export function getInstallCommand(
  packageManager: PackageManager,
  packages: string[],
  options: InstallCommandOptions = {}
): string[] {
  const baseCommands: Record<PackageManager, string[]> = {
    npm: ['install', ...packages, '--save'],
    yarn: ['add', ...packages],
    pnpm: ['add', ...packages],
    bun: ['add', ...packages]
  };

  const cmd = [...baseCommands[packageManager]];

  if (options.dev) {
    cmd.push(packageManager === 'npm' ? '--save-dev' : '--dev');
  }

  if (options.ignoreScripts) {
    cmd.push('--ignore-scripts');
  }

  return cmd;
}
```

**Test Coverage:** 15 tests
- Detect from package-lock.json → npm
- Detect from yarn.lock → yarn
- Detect from pnpm-lock.yaml → pnpm
- Detect from bun.lockb → bun
- Handle multiple lock files (priority order)
- Verify npm installed (success/failure)
- Get package manager version
- Get correct lock file path
- Build install command (npm, yarn, pnpm)
- Handle install options (dev, ignore-scripts)

### 4.3 Dependency Installer

**File: `/mcp/core/dependency-installer.ts`**

**Purpose:** Execute package manager to install dependencies

**Key Functions:**

```typescript
/**
 * Install dependencies using detected package manager
 */
export async function install(
  dependencies: InlineDependencies,
  options: InstallOptions = {}
): Promise<InstallResult> {
  const {
    packageManager = detectPackageManager(),
    cwd = process.cwd(),
    timeout = 5 * 60 * 1000, // 5 minutes
    onProgress,
    ignoreScripts = true,
    production = false
  } = options;

  // Verify package manager is installed
  const isInstalled = await verifyInstalled(packageManager);
  if (!isInstalled) {
    throw new InstallationError(
      'PACKAGE_MANAGER_NOT_FOUND',
      `${packageManager} is not installed. Please install it first.`
    );
  }

  // Check disk space
  const { available } = await checkDiskSpace(cwd);
  if (available < 10 * 1024 * 1024) { // 10MB
    throw new InstallationError('DISK_FULL', 'Insufficient disk space');
  }

  // Build package list
  const packages = Object.entries(dependencies).map(
    ([name, version]) => `${name}@${version}`
  );

  // Report progress
  onProgress?.({
    stage: 'installing',
    total: packages.length,
    current: 0,
    message: `Installing ${packages.length} packages with ${packageManager}...`
  });

  // Install packages
  const installed: string[] = [];
  const errors: InstallError[] = [];

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];

    try {
      await installSingle(pkg, packageManager, {
        cwd,
        timeout,
        ignoreScripts,
        production
      });
      installed.push(pkg);

      onProgress?.({
        stage: 'installing',
        package: pkg,
        current: i + 1,
        total: packages.length,
        message: `✓ Installed ${pkg}`
      });
    } catch (error) {
      errors.push({
        package: pkg,
        error: error instanceof Error ? error.message : String(error)
      });

      onProgress?.({
        stage: 'installing',
        package: pkg,
        current: i + 1,
        total: packages.length,
        message: `✗ Failed to install ${pkg}`
      });
    }
  }

  // Generate/update lock file
  const lockFile = await generateLockfile(packageManager, cwd);

  onProgress?.({
    stage: 'complete',
    message: `Installation complete: ${installed.length} succeeded, ${errors.length} failed`
  });

  return {
    success: errors.length === 0,
    installed,
    errors,
    lockFile,
    packageManager
  };
}

/**
 * Install a single package
 */
async function installSingle(
  pkg: string,
  packageManager: PackageManager,
  options: {
    cwd: string;
    timeout: number;
    ignoreScripts: boolean;
    production: boolean;
  }
): Promise<void> {
  const args = getInstallCommand(packageManager, [pkg], {
    ignoreScripts: options.ignoreScripts,
    production: options.production
  });

  await runWithTimeout(
    () => runPackageManager(packageManager, args, options.cwd),
    options.timeout
  );
}

/**
 * Run package manager command
 */
async function runPackageManager(
  packageManager: PackageManager,
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(packageManager, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${packageManager} exited with code ${code}\n${stderr}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Generate or update lock file
 */
async function generateLockfile(
  packageManager: PackageManager,
  cwd: string
): Promise<string> {
  const lockFilePath = getLockFilePath(packageManager, cwd);

  // Run package manager to generate lock file
  if (packageManager === 'npm') {
    await runPackageManager('npm', ['install'], cwd);
  } else if (packageManager === 'yarn') {
    await runPackageManager('yarn', ['install'], cwd);
  } else if (packageManager === 'pnpm') {
    await runPackageManager('pnpm', ['install'], cwd);
  }

  // Verify lock file exists
  if (!existsSync(lockFilePath)) {
    throw new Error(`Failed to generate lock file: ${lockFilePath}`);
  }

  return lockFilePath;
}

/**
 * Run command with timeout
 */
async function runWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Installation timeout')), timeout)
    )
  ]);
}
```

**Test Coverage:** 25 tests
- Install with npm (success)
- Install with yarn (success)
- Install with pnpm (success)
- Install single package
- Install multiple packages
- Progress reporting (each stage)
- Error handling (package not found)
- Error handling (network error)
- Error handling (timeout)
- Timeout enforcement
- Lock file generation (npm)
- Lock file generation (yarn)
- Lock file generation (pnpm)
- Lock file verification
- Retry logic (network failures)
- Ignore scripts flag
- Production flag
- Dev dependencies
- Disk space checks
- Permission errors

### 4.4 Installation Types

**File: `/mcp/core/installation-types.ts`**

**Purpose:** TypeScript interfaces for auto-installation

**Type Definitions:**

```typescript
/**
 * Package manager type
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

/**
 * Options for dependency installation
 */
export interface InstallOptions {
  /**
   * Package manager to use (auto-detected if not specified)
   */
  packageManager?: PackageManager;

  /**
   * Working directory (default: process.cwd())
   */
  cwd?: string;

  /**
   * Installation timeout in milliseconds (default: 5 minutes)
   */
  timeout?: number;

  /**
   * Number of retry attempts on failure (default: 3)
   */
  retries?: number;

  /**
   * Progress callback
   */
  onProgress?: (event: InstallProgressEvent) => void;

  /**
   * Error callback
   */
  onError?: (error: InstallError) => void;

  /**
   * Ignore install scripts (default: true for security)
   */
  ignoreScripts?: boolean;

  /**
   * Install only production dependencies (default: false)
   */
  production?: boolean;

  /**
   * Force reinstall even if already installed (default: false)
   */
  force?: boolean;

  /**
   * Use offline mode (npm cache only) (default: false)
   */
  offline?: boolean;
}

/**
 * Result of dependency installation
 */
export interface InstallResult {
  /**
   * Whether installation succeeded
   */
  success: boolean;

  /**
   * List of successfully installed packages
   */
  installed: string[];

  /**
   * Installation errors
   */
  errors: InstallError[];

  /**
   * Path to generated/updated lock file
   */
  lockFile: string;

  /**
   * Package manager used
   */
  packageManager: PackageManager;

  /**
   * Installation duration in milliseconds
   */
  duration?: number;
}

/**
 * Progress event during installation
 */
export interface InstallProgressEvent {
  /**
   * Current installation stage
   */
  stage: 'detecting' | 'resolving' | 'downloading' | 'installing' | 'complete';

  /**
   * Package currently being processed
   */
  package?: string;

  /**
   * Current progress (0-based index)
   */
  current?: number;

  /**
   * Total number of packages
   */
  total?: number;

  /**
   * Progress message
   */
  message?: string;

  /**
   * Timestamp
   */
  timestamp?: number;
}

/**
 * Installation error
 */
export interface InstallError {
  /**
   * Package that failed to install
   */
  package: string;

  /**
   * Error message
   */
  error: string;

  /**
   * Error code
   */
  code?: InstallErrorCode;

  /**
   * Additional error details
   */
  details?: unknown;
}

/**
 * Installation error codes
 */
export type InstallErrorCode =
  | 'PACKAGE_MANAGER_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'PERMISSION_ERROR'
  | 'DISK_FULL'
  | 'INVALID_PACKAGE'
  | 'PACKAGE_NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'TIMEOUT'
  | 'UNKNOWN';

/**
 * Dependency check result
 */
export interface DependencyCheckResult {
  /**
   * All required dependencies
   */
  required: string[];

  /**
   * Currently installed dependencies
   */
  installed: string[];

  /**
   * Missing dependencies
   */
  missing: string[];

  /**
   * Outdated dependencies (installed but wrong version)
   */
  outdated: Array<{
    package: string;
    installed: string;
    required: string;
  }>;
}

/**
 * Installation status
 */
export type InstallStatus = 'pending' | 'installing' | 'complete' | 'failed';
```

---

## 5. SimplyMCP API Additions

**File: `/mcp/SimplyMCP.ts` (modifications)**

### 5.1 Constructor Options

```typescript
export interface SimplyMCPOptions {
  name: string;
  version: string;
  port?: number;
  basePath?: string;
  defaultTimeout?: number;

  capabilities?: {
    sampling?: boolean;
    logging?: boolean;
  };

  // Feature 2: Inline Dependencies
  dependencies?: ParsedDependencies;

  // Feature 3: Auto-Installation (NEW)
  autoInstall?: boolean | {
    enabled: boolean;
    packageManager?: PackageManager;
    timeout?: number;
    retries?: number;
    onProgress?: (event: InstallProgressEvent) => void;
    onError?: (error: InstallError) => void;
  };
}
```

### 5.2 New Methods

```typescript
class SimplyMCP {
  /**
   * Install missing dependencies
   *
   * @param options - Installation options
   * @returns Installation result
   *
   * @example
   * ```typescript
   * const result = await server.installDependencies({
   *   packageManager: 'npm',
   *   timeout: 10 * 60 * 1000, // 10 minutes
   *   onProgress: (event) => {
   *     console.log(`${event.stage}: ${event.message}`);
   *   }
   * });
   *
   * if (result.success) {
   *   console.log(`Installed: ${result.installed.join(', ')}`);
   * } else {
   *   console.error(`Errors: ${result.errors.length}`);
   * }
   * ```
   */
  async installDependencies(options?: InstallOptions): Promise<InstallResult> {
    const deps = this.getDependencies();

    if (!deps || Object.keys(deps.map).length === 0) {
      return {
        success: true,
        installed: [],
        errors: [],
        lockFile: '',
        packageManager: 'npm'
      };
    }

    // Find missing dependencies
    const missing = await findMissing(deps.map, this.options.basePath);

    if (missing.length === 0) {
      this.logger?.info('All dependencies already installed');
      return {
        success: true,
        installed: [],
        errors: [],
        lockFile: '',
        packageManager: detectPackageManager(this.options.basePath)
      };
    }

    // Install missing dependencies
    const missingDeps = missing.reduce((acc, pkg) => {
      acc[pkg] = deps.map[pkg];
      return acc;
    }, {} as InlineDependencies);

    return install(missingDeps, {
      cwd: this.options.basePath,
      ...options
    });
  }

  /**
   * Check dependency status (installed vs missing)
   *
   * @returns Dependency check result
   *
   * @example
   * ```typescript
   * const status = await server.checkDependencies();
   * console.log(`Missing: ${status.missing.join(', ')}`);
   * console.log(`Installed: ${status.installed.join(', ')}`);
   * ```
   */
  async checkDependencies(): Promise<DependencyCheckResult> {
    const deps = this.getDependencies();

    if (!deps || Object.keys(deps.map).length === 0) {
      return {
        required: [],
        installed: [],
        missing: [],
        outdated: []
      };
    }

    const required = Object.keys(deps.map);
    const missing = await findMissing(deps.map, this.options.basePath);
    const installed = required.filter(pkg => !missing.includes(pkg));

    // Check for outdated versions
    const { mismatched } = await verifyVersions(deps.map, this.options.basePath);

    return {
      required,
      installed,
      missing,
      outdated: mismatched
    };
  }
}
```

### 5.3 Static Method Update

```typescript
/**
 * Create SimplyMCP server from file with inline dependencies
 *
 * @param filePath - Path to server file
 * @param options - Additional server options
 * @returns SimplyMCP instance (with optional auto-install)
 *
 * @example
 * ```typescript
 * // Without auto-install (default)
 * const server = await SimplyMCP.fromFile('./server.ts');
 *
 * // With auto-install
 * const server = await SimplyMCP.fromFile('./server.ts', {
 *   autoInstall: true
 * });
 *
 * // With custom install options
 * const server = await SimplyMCP.fromFile('./server.ts', {
 *   autoInstall: {
 *     enabled: true,
 *     packageManager: 'pnpm',
 *     onProgress: (event) => console.log(event.message)
 *   }
 * });
 * ```
 */
static async fromFile(
  filePath: string,
  options?: Partial<SimplyMCPOptions>
): Promise<SimplyMCP> {
  // Parse inline dependencies (Feature 2)
  const source = await readFile(filePath, 'utf-8');
  const parseResult = parseInlineDependencies(source);

  // Create dependencies object
  const dependencies: ParsedDependencies = {
    dependencies: Object.entries(parseResult.dependencies).map(([name, version]) => ({
      name,
      version
    })),
    map: parseResult.dependencies,
    errors: parseResult.errors,
    warnings: parseResult.warnings,
    raw: parseResult.raw
  };

  // Create server
  const server = new SimplyMCP({
    name: options?.name || 'server-from-file',
    version: options?.version || '1.0.0',
    ...options,
    dependencies
  });

  // Auto-install if requested
  if (options?.autoInstall) {
    const installOptions = typeof options.autoInstall === 'object'
      ? options.autoInstall
      : {};

    if (installOptions.enabled !== false) {
      const result = await server.installDependencies(installOptions);

      if (!result.success) {
        throw new Error(
          `Failed to install dependencies:\n${result.errors.map(e => `  - ${e.package}: ${e.error}`).join('\n')}`
        );
      }
    }
  }

  return server;
}
```

### 5.4 Event Emitters

```typescript
class SimplyMCP extends EventEmitter {
  // Emit installation progress
  on(event: 'install:progress', listener: (event: InstallProgressEvent) => void): this;

  // Emit installation errors
  on(event: 'install:error', listener: (error: InstallError) => void): this;

  // Emit installation complete
  on(event: 'install:complete', listener: (result: InstallResult) => void): this;
}
```

---

## 6. Examples

### 6.1 Basic Auto-Installation

**File: `/mcp/examples/auto-install-basic.ts`**

```typescript
#!/usr/bin/env npx tsx
/**
 * Basic Auto-Installation Example
 *
 * This example demonstrates simple automatic dependency installation
 */

// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

import { SimplyMCP } from '../SimplyMCP.js';

async function main() {
  // Load server from file with auto-install
  const server = await SimplyMCP.fromFile('./auto-install-basic.ts', {
    autoInstall: true  // Enable auto-installation
  });

  console.log('[Example] Server loaded with auto-install');

  // Check dependency status
  const status = await server.checkDependencies();
  console.log('[Example] Dependencies installed:', status.installed);

  await server.start();
}

main().catch(console.error);
```

### 6.2 Advanced Auto-Installation

**File: `/mcp/examples/auto-install-advanced.ts`**

```typescript
#!/usr/bin/env npx tsx
/**
 * Advanced Auto-Installation Example
 *
 * This example demonstrates custom installation options and progress tracking
 */

// /// dependencies
// axios@^1.6.0
// lodash@^4.17.21
// date-fns@^2.30.0
// ///

import { SimplyMCP } from '../SimplyMCP.js';
import { InstallProgressEvent } from '../core/installation-types.js';

async function main() {
  console.log('[Example] Loading server with custom auto-install options...');

  // Create progress bar
  let progressBar = '';

  const server = await SimplyMCP.fromFile('./auto-install-advanced.ts', {
    autoInstall: {
      enabled: true,
      packageManager: 'npm',
      timeout: 10 * 60 * 1000, // 10 minutes
      retries: 3,

      onProgress: (event: InstallProgressEvent) => {
        if (event.stage === 'installing' && event.current && event.total) {
          const percent = Math.floor((event.current / event.total) * 100);
          progressBar = `[${'='.repeat(percent / 2)}${' '.repeat(50 - percent / 2)}] ${percent}%`;
          process.stdout.write(`\r${progressBar} ${event.message}`);
        } else {
          console.log(`\n[${event.stage}] ${event.message}`);
        }
      },

      onError: (error) => {
        console.error(`\n[Error] ${error.package}: ${error.error}`);
      }
    }
  });

  console.log('\n[Example] Installation complete!');

  // Check final status
  const status = await server.checkDependencies();
  console.log('[Example] Installed packages:', status.installed.length);
  console.log('[Example] Missing packages:', status.missing.length);

  if (status.outdated.length > 0) {
    console.warn('[Example] Outdated packages:');
    status.outdated.forEach(pkg => {
      console.warn(`  - ${pkg.package}: installed=${pkg.installed}, required=${pkg.required}`);
    });
  }

  await server.start();
}

main().catch(console.error);
```

### 6.3 Error Handling

**File: `/mcp/examples/auto-install-error-handling.ts`**

```typescript
#!/usr/bin/env npx tsx
/**
 * Auto-Installation Error Handling Example
 *
 * This example demonstrates error scenarios and recovery strategies
 */

// /// dependencies
// axios@^1.6.0
// invalid-package-that-does-not-exist@^1.0.0  # This will fail
// ///

import { SimplyMCP } from '../SimplyMCP.js';
import { InstallationError } from '../core/dependency-installer.js';

async function main() {
  try {
    console.log('[Example] Attempting to install dependencies (including invalid package)...');

    const server = await SimplyMCP.fromFile('./auto-install-error-handling.ts', {
      autoInstall: {
        enabled: true,

        onError: (error) => {
          console.error(`[Error] Failed to install ${error.package}`);
          console.error(`  Reason: ${error.error}`);

          // Attempt recovery
          if (error.code === 'PACKAGE_NOT_FOUND') {
            console.log(`  Skipping ${error.package} (not found in registry)`);
          } else if (error.code === 'NETWORK_ERROR') {
            console.log(`  Will retry ${error.package} (network issue)`);
          }
        }
      }
    });

    // Even with errors, server may have partial dependencies installed
    const status = await server.checkDependencies();
    console.log('[Example] Successfully installed:', status.installed);
    console.log('[Example] Failed/missing:', status.missing);

  } catch (error) {
    if (error instanceof InstallationError) {
      console.error('[Fatal] Installation failed:', error.message);
      console.error('  Error code:', error.code);

      // Provide actionable recovery steps
      if (error.code === 'PACKAGE_MANAGER_NOT_FOUND') {
        console.log('\nRecovery steps:');
        console.log('  1. Install npm: https://nodejs.org');
        console.log('  2. Or install yarn: npm install -g yarn');
      } else if (error.code === 'NETWORK_ERROR') {
        console.log('\nRecovery steps:');
        console.log('  1. Check internet connection');
        console.log('  2. Try again with --offline flag (uses npm cache)');
        console.log('  3. Configure proxy if behind firewall');
      } else if (error.code === 'DISK_FULL') {
        console.log('\nRecovery steps:');
        console.log('  1. Free up disk space');
        console.log('  2. Run: npm cache clean --force');
      }

      process.exit(1);
    }

    throw error;
  }
}

main().catch(console.error);
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

#### A. Dependency Checker Tests (20 tests)

**File: `/mcp/tests/phase2/test-auto-install-checker.sh`**

```bash
#!/usr/bin/env bash

# Test 1: Check installed package (installed)
# Test 2: Check installed package (not installed)
# Test 3: Check scoped package (@types/node)
# Test 4: Find missing dependencies (all missing)
# Test 5: Find missing dependencies (partial)
# Test 6: Find missing dependencies (none missing)
# Test 7: Verify versions (matching)
# Test 8: Verify versions (mismatched)
# Test 9: Verify versions (wildcard ranges)
# Test 10: Get installed version (valid package)
# Test 11: Get installed version (not found)
# Test 12: Get installed version (corrupted package.json)
# Test 13: Check disk space (sufficient)
# Test 14: Check disk space (low)
# Test 15: Check disk space (critical)
# Test 16: Handle invalid node_modules
# Test 17: Handle missing node_modules
# Test 18: Handle symlinked packages
# Test 19: Concurrent check operations
# Test 20: Performance test (100 packages)
```

#### B. Package Manager Detector Tests (15 tests)

**File: `/mcp/tests/phase2/test-auto-install-detector.sh`**

```bash
#!/usr/bin/env bash

# Test 1: Detect npm from package-lock.json
# Test 2: Detect yarn from yarn.lock
# Test 3: Detect pnpm from pnpm-lock.yaml
# Test 4: Detect bun from bun.lockb
# Test 5: Handle multiple lock files (priority order)
# Test 6: Default to npm (no lock files)
# Test 7: Verify npm installed (success)
# Test 8: Verify npm installed (not found)
# Test 9: Get npm version
# Test 10: Get yarn version
# Test 11: Get lock file path (npm)
# Test 12: Get lock file path (yarn)
# Test 13: Get install command (npm)
# Test 14: Get install command (yarn, dev)
# Test 15: Get install command (pnpm, ignore-scripts)
```

#### C. Dependency Installer Tests (25 tests)

**File: `/mcp/tests/phase2/test-auto-install-installer.sh`**

```bash
#!/usr/bin/env bash

# Test 1: Install with npm (single package)
# Test 2: Install with npm (multiple packages)
# Test 3: Install with yarn (single package)
# Test 4: Install with pnpm (single package)
# Test 5: Progress reporting (detecting stage)
# Test 6: Progress reporting (installing stage)
# Test 7: Progress reporting (complete stage)
# Test 8: Error handling (package not found)
# Test 9: Error handling (network error)
# Test 10: Error handling (timeout)
# Test 11: Timeout enforcement (5 seconds)
# Test 12: Timeout enforcement (custom timeout)
# Test 13: Lock file generation (npm)
# Test 14: Lock file generation (yarn)
# Test 15: Lock file generation (pnpm)
# Test 16: Lock file verification (exists)
# Test 17: Lock file verification (corrupted)
# Test 18: Retry logic (network failure, 3 retries)
# Test 19: Ignore scripts flag
# Test 20: Production flag
# Test 21: Dev dependencies
# Test 22: Disk space check (sufficient)
# Test 23: Disk space check (insufficient)
# Test 24: Permission error handling
# Test 25: Concurrent installations (race condition)
```

### 7.2 Integration Tests (30 tests)

**File: `/mcp/tests/phase2/auto-install-integration.test.ts`**

```typescript
describe('Auto-Installation Integration Tests', () => {
  // SimplyMCP.fromFile() Tests
  test('fromFile with autoInstall (success)', async () => {
    // Create temp server file with inline deps
    // Call SimplyMCP.fromFile({ autoInstall: true })
    // Verify packages installed
    // Verify lock file created
  });

  test('fromFile with autoInstall (missing package)', async () => {
    // Create temp server with invalid package
    // Call SimplyMCP.fromFile({ autoInstall: true })
    // Expect error
    // Verify partial installation
  });

  test('fromFile without autoInstall (default)', async () => {
    // Call SimplyMCP.fromFile() without autoInstall
    // Verify NO installation occurred
  });

  // server.installDependencies() Tests
  test('installDependencies (all missing)', async () => {
    // Create server with deps
    // Call server.installDependencies()
    // Verify all installed
  });

  test('installDependencies (partial missing)', async () => {
    // Pre-install some packages
    // Call server.installDependencies()
    // Verify only missing packages installed
  });

  test('installDependencies (none missing)', async () => {
    // Pre-install all packages
    // Call server.installDependencies()
    // Verify no installation occurred
  });

  // server.checkDependencies() Tests
  test('checkDependencies (all installed)', async () => {
    // Pre-install packages
    // Call server.checkDependencies()
    // Verify correct status
  });

  test('checkDependencies (all missing)', async () => {
    // Create server with deps
    // Call server.checkDependencies()
    // Verify all listed as missing
  });

  test('checkDependencies (version mismatch)', async () => {
    // Install wrong version
    // Call server.checkDependencies()
    // Verify listed in outdated
  });

  // Conflict Resolution Tests
  test('inline deps vs package.json (conflict)', async () => {
    // Inline: axios@^1.6.0
    // package.json: axios@^1.5.0
    // Verify package.json version used
    // Verify warning logged
  });

  test('inline deps vs package.json (no conflict)', async () => {
    // Inline: axios@^1.6.0
    // package.json: axios@^1.6.0
    // Verify no warning
  });

  test('mergeDependencies (package.json precedence)', async () => {
    // Use mergeDependencies utility
    // Verify conflicts reported
  });

  // Lock File Tests
  test('generate package-lock.json (npm)', async () => {
    // Install with npm
    // Verify package-lock.json exists
    // Verify lock file valid JSON
  });

  test('generate yarn.lock (yarn)', async () => {
    // Install with yarn
    // Verify yarn.lock exists
  });

  test('generate pnpm-lock.yaml (pnpm)', async () => {
    // Install with pnpm
    // Verify pnpm-lock.yaml exists
  });

  // Progress Reporting Tests
  test('progress events (all stages)', async () => {
    // Setup progress listener
    // Call installDependencies()
    // Verify all stages emitted
  });

  test('progress callback (custom handler)', async () => {
    // Setup custom onProgress callback
    // Call installDependencies({ onProgress })
    // Verify callback invoked
  });

  // Error Handling Tests
  test('npm not installed (error)', async () => {
    // Mock npm not found
    // Call installDependencies()
    // Expect PACKAGE_MANAGER_NOT_FOUND error
  });

  test('network unavailable (error)', async () => {
    // Mock network failure
    // Call installDependencies()
    // Expect NETWORK_ERROR
  });

  test('timeout (error)', async () => {
    // Mock slow install (>5 minutes)
    // Call installDependencies({ timeout: 5000 })
    // Expect TIMEOUT error
  });

  test('disk full (error)', async () => {
    // Mock disk full
    // Call installDependencies()
    // Expect DISK_FULL error
  });

  // Package Manager Detection Tests
  test('detect npm (package-lock.json)', async () => {
    // Create package-lock.json
    // Call detectPackageManager()
    // Verify 'npm' returned
  });

  test('detect yarn (yarn.lock)', async () => {
    // Create yarn.lock
    // Call detectPackageManager()
    // Verify 'yarn' returned
  });

  test('override detection (user preference)', async () => {
    // Create package-lock.json (npm)
    // Call installDependencies({ packageManager: 'yarn' })
    // Verify yarn used
  });

  // Security Tests
  test('ignore-scripts flag (default)', async () => {
    // Call installDependencies()
    // Verify --ignore-scripts used
  });

  test('enable-scripts flag (explicit)', async () => {
    // Call installDependencies({ ignoreScripts: false })
    // Verify --ignore-scripts NOT used
  });

  // Edge Cases
  test('empty dependencies (no-op)', async () => {
    // Create server without deps
    // Call installDependencies()
    // Verify no installation
  });

  test('only devDependencies (dev flag)', async () => {
    // Install with dev: true
    // Verify dev deps installed
  });

  test('concurrent installs (same server)', async () => {
    // Call installDependencies() twice concurrently
    // Verify no race conditions
  });

  test('reinstall (force flag)', async () => {
    // Pre-install packages
    // Call installDependencies({ force: true })
    // Verify reinstalled
  });
});
```

### 7.3 End-to-End Tests (10 tests)

**File: `/mcp/tests/phase2/test-auto-install-e2e.sh`**

```bash
#!/usr/bin/env bash

# Test 1: Real npm install (temp directory)
# Test 2: Real yarn install (temp directory)
# Test 3: Real pnpm install (temp directory)
# Test 4: Real package.json generation
# Test 5: Real lock file creation (npm)
# Test 6: Real lock file creation (yarn)
# Test 7: Installation verification (import packages)
# Test 8: Rollback on failure (partial install)
# Test 9: Multi-step workflow (parse → check → install → verify)
# Test 10: Full server lifecycle (load → install → start → run tool)
```

### 7.4 Test Summary

**Total Tests: 100+**

- **Unit Tests**: 60 tests
  - Dependency Checker: 20 tests
  - Package Manager Detector: 15 tests
  - Dependency Installer: 25 tests

- **Integration Tests**: 30 tests
  - SimplyMCP.fromFile(): 3 tests
  - installDependencies(): 3 tests
  - checkDependencies(): 3 tests
  - Conflict Resolution: 3 tests
  - Lock Files: 3 tests
  - Progress Reporting: 2 tests
  - Error Handling: 4 tests
  - Package Manager Detection: 3 tests
  - Security: 2 tests
  - Edge Cases: 4 tests

- **E2E Tests**: 10 tests
  - Real installations: 3 tests
  - File generation: 3 tests
  - Verification: 2 tests
  - Workflows: 2 tests

**Success Criteria: 100% pass rate**

---

## 8. Security Considerations

### 8.1 Package Name Validation (Reuse Feature 2)

**Implementation:**
```typescript
// Reuse existing validation from Feature 2
import { validatePackageName } from './core/dependency-validator.js';

async function installWithValidation(packages: string[]): Promise<void> {
  for (const pkg of packages) {
    const [name] = pkg.split('@');
    const result = validatePackageName(name);

    if (!result.valid) {
      throw new InstallationError(
        'INVALID_PACKAGE',
        `Invalid package name: ${name} - ${result.error}`
      );
    }
  }

  // Proceed with installation
}
```

**Security Checks:**
- Lowercase enforcement
- Length limits (max 214 characters)
- No dangerous characters (`;`, `|`, `&`, etc.)
- No path traversal (`../`)
- Scoped package validation

### 8.2 Installation Sandboxing

**Default Security:**
```typescript
// Always use --ignore-scripts by default
const installArgs = [
  'install',
  ...packages,
  '--ignore-scripts',  // Prevent malicious scripts
  '--no-audit',        // Skip audit for speed (optional)
];

// Only enable scripts if explicitly requested
if (options.enableScripts) {
  const index = installArgs.indexOf('--ignore-scripts');
  installArgs.splice(index, 1);
}
```

**Rationale:**
- Many npm packages include install scripts
- Scripts can execute arbitrary code
- Malicious packages can exploit this
- Disable by default, require explicit opt-in

### 8.3 Registry Verification

**Implementation:**
```typescript
// Use default npm registry
const NPM_REGISTRY = 'https://registry.npmjs.org';

async function verifyRegistry(packageName: string): Promise<boolean> {
  try {
    const response = await fetch(`${NPM_REGISTRY}/${packageName}`);
    return response.ok;
  } catch {
    return false;
  }
}

// Warn on custom registries
const customRegistry = process.env.NPM_CONFIG_REGISTRY;
if (customRegistry && customRegistry !== NPM_REGISTRY) {
  console.warn(`[SimplyMCP] Using custom registry: ${customRegistry}`);
  console.warn('[SimplyMCP] Ensure this registry is trusted');
}
```

### 8.4 Timeout and Resource Limits

**Implementation:**
```typescript
const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MAX_TIMEOUT = 30 * 60 * 1000;   // 30 minutes

async function installWithLimits(
  packages: string[],
  timeout: number = DEFAULT_TIMEOUT
): Promise<void> {
  // Enforce maximum timeout
  if (timeout > MAX_TIMEOUT) {
    throw new Error(`Timeout exceeds maximum: ${MAX_TIMEOUT}ms`);
  }

  // Check disk space
  const { available } = await checkDiskSpace(process.cwd());
  if (available < 10 * 1024 * 1024) { // 10MB minimum
    throw new InstallationError('DISK_FULL', 'Insufficient disk space');
  }

  // Install with timeout
  await runWithTimeout(() => install(packages), timeout);
}
```

### 8.5 Permission Checks

**Implementation:**
```typescript
async function checkPermissions(cwd: string): Promise<void> {
  try {
    // Check write permission
    const testFile = join(cwd, '.simplemcp-write-test');
    await writeFile(testFile, 'test');
    await unlink(testFile);
  } catch (error) {
    throw new InstallationError(
      'PERMISSION_ERROR',
      `No write permission in ${cwd}. Try running with elevated permissions.`
    );
  }
}
```

---

## 9. Performance Considerations

### 9.1 Installation Performance

**Optimizations:**

1. **Parallel Installation** (where possible)
   ```typescript
   // Install independent packages in parallel
   await Promise.all(
     packages.map(pkg => installSingle(pkg))
   );
   ```

2. **Cache npm Metadata**
   ```typescript
   const packageCache = new Map<string, boolean>();

   async function checkInstalled(pkg: string): Promise<boolean> {
     if (packageCache.has(pkg)) {
       return packageCache.get(pkg)!;
     }

     const installed = await checkInstalledNative(pkg);
     packageCache.set(pkg, installed);
     return installed;
   }
   ```

3. **Lazy Lock File Generation**
   ```typescript
   // Only regenerate lock file if packages changed
   if (newPackagesInstalled) {
     await generateLockfile();
   }
   ```

### 9.2 Memory Usage

**Optimizations:**

1. **Stream Installation Output**
   ```typescript
   // Don't buffer entire output in memory
   proc.stdout.on('data', (chunk) => {
     // Process chunk immediately
     processChunk(chunk);
   });
   ```

2. **Clear Caches**
   ```typescript
   // Clear package cache after installation
   packageCache.clear();
   ```

### 9.3 Network Optimization

**Strategies:**

1. **Retry with Exponential Backoff**
   ```typescript
   async function installWithRetry(
     pkg: string,
     retries: number = 3
   ): Promise<void> {
     for (let i = 0; i < retries; i++) {
       try {
         await install(pkg);
         return;
       } catch (error) {
         if (i === retries - 1) throw error;
         await delay(Math.pow(2, i) * 1000); // Exponential backoff
       }
     }
   }
   ```

2. **Use npm Cache**
   ```typescript
   // Leverage npm's built-in cache
   const installArgs = [
     'install',
     ...packages,
     '--prefer-offline', // Use cache when available
   ];
   ```

---

## 10. Error Scenarios & Recovery

### 10.1 Error Matrix

| Error Scenario | Detection | User Message | Recovery Action |
|---------------|-----------|--------------|-----------------|
| **npm not installed** | `npm --version` fails | "npm not found. Install from nodejs.org" | Install Node.js/npm |
| **Network unavailable** | Registry HEAD request fails | "Network unavailable. Check connection or use --offline" | Fix network or use cache |
| **Permission denied** | Write test fails | "No write permission. Try sudo or check directory" | Run with permissions |
| **Disk full** | Check disk space < 10MB | "Disk full. Free up space or clean npm cache" | Free disk space |
| **Invalid package** | Validation fails | "Invalid package name: {name}" | Fix package name |
| **Package not found** | npm returns 404 | "Package not found: {name}. Check registry" | Verify package exists |
| **Version conflict** | Merge dependencies | "Conflict: inline={v1}, package.json={v2}" | Update inline or package.json |
| **Timeout** | Installation > 5 min | "Installation timeout. Increase timeout or check network" | Increase timeout |
| **Corrupted lock file** | Lock file validation fails | "Lock file corrupted. Delete and regenerate" | Delete lock file |
| **Install script failed** | npm returns error | "Install script failed for {package}" | Check package logs |

### 10.2 Recovery Strategies

```typescript
class InstallRecovery {
  /**
   * Attempt to recover from installation error
   */
  static async recover(error: InstallationError): Promise<InstallResult | null> {
    switch (error.code) {
      case 'NETWORK_ERROR':
        // Retry with offline mode
        console.log('[Recovery] Retrying with offline mode...');
        return install(packages, { offline: true });

      case 'TIMEOUT':
        // Retry with increased timeout
        console.log('[Recovery] Retrying with increased timeout...');
        return install(packages, { timeout: 10 * 60 * 1000 });

      case 'CORRUPTED_LOCK':
        // Delete and regenerate lock file
        console.log('[Recovery] Regenerating lock file...');
        await unlink(lockFilePath);
        return install(packages);

      default:
        // No automatic recovery
        return null;
    }
  }
}
```

---

## 11. Migration & Backward Compatibility

### 11.1 No Breaking Changes

**Existing Code Works Unchanged:**
```typescript
// Before Feature 3 (still works)
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
await server.start(); // No auto-installation

// Feature 3 is opt-in
const server = await SimplyMCP.fromFile('./server.ts', {
  autoInstall: true  // Must explicitly enable
});
```

### 11.2 Migration Path

**Step 1: Add inline dependencies (Feature 2)**
```typescript
// /// dependencies
// axios@^1.6.0
// ///
```

**Step 2: Enable auto-install (Feature 3)**
```typescript
const server = await SimplyMCP.fromFile('./server.ts', {
  autoInstall: true
});
```

**Step 3: Use CLI (Feature 4 - future)**
```bash
npx simplemcp run server.ts --auto-install
```

### 11.3 Adoption Strategy

**Phase 1: Documentation (Week 1)**
- Document auto-installation feature
- Provide migration examples
- Update getting-started guide

**Phase 2: Examples (Week 2)**
- Update example servers to use auto-install
- Create video tutorial
- Blog post announcement

**Phase 3: CLI Integration (Feature 4)**
- Add auto-install to CLI
- Make it default for `simplemcp run`

---

## 12. Open Questions & Design Decisions

### 12.1 Should we support bun as a package manager?

**Question:** Bun is gaining popularity. Should SimplyMCP support it?

**Decision: YES (future enhancement)**
- Add `bun` to PackageManager type
- Detect `bun.lockb`
- Support bun install command
- Low priority (npm/yarn/pnpm first)

### 12.2 Should we support private registries?

**Question:** Should SimplyMCP support private npm registries?

**Decision: YES (via .npmrc)**
- Respect existing `.npmrc` configuration
- No custom registry in code
- Warn users about custom registries
- Document how to configure .npmrc

### 12.3 Should we support git dependencies?

**Question:** Should inline deps support git URLs?

**Format:**
```typescript
// /// dependencies
// my-package@git+https://github.com/user/repo.git
// ///
```

**Decision: NO (not in MVP)**
- Adds complexity
- Security concerns
- Can be added later if demand exists
- Use package.json for git deps

### 12.4 Should we support workspaces/monorepos?

**Question:** Should SimplyMCP work in monorepo workspaces?

**Decision: YES (basic support)**
- Install to nearest node_modules
- Respect workspace configuration
- Don't manage workspaces (use package manager)
- Document workspace usage

### 12.5 Should we support peer dependency resolution?

**Question:** Auto-install peer dependencies?

**Decision: NO (let package manager handle it)**
- npm/yarn/pnpm handle peer deps
- Too complex to replicate
- Warnings from package manager are sufficient

---

## 13. Implementation Checklist

### Phase A: Core Detection (Days 1-3)

- [ ] **dependency-checker.ts**
  - [ ] Implement `checkInstalled()`
  - [ ] Implement `findMissing()`
  - [ ] Implement `verifyVersions()`
  - [ ] Implement `getInstalledVersion()`
  - [ ] Implement `checkDiskSpace()`
  - [ ] Write unit tests (20 tests)

- [ ] **package-manager-detector.ts**
  - [ ] Implement `detectPackageManager()`
  - [ ] Implement `verifyInstalled()`
  - [ ] Implement `getVersion()`
  - [ ] Implement `getLockFilePath()`
  - [ ] Implement `getInstallCommand()`
  - [ ] Write unit tests (15 tests)

### Phase B: Installation Logic (Days 4-6)

- [ ] **dependency-installer.ts**
  - [ ] Implement `install()`
  - [ ] Implement `installSingle()`
  - [ ] Implement `runPackageManager()`
  - [ ] Implement `streamOutput()`
  - [ ] Implement `parseInstallOutput()`
  - [ ] Implement `generateLockfile()`
  - [ ] Implement `verifyLockfile()`
  - [ ] Implement `reportProgress()`
  - [ ] Implement `handleInstallErrors()`
  - [ ] Implement retry logic
  - [ ] Implement timeout handling
  - [ ] Write unit tests (25 tests)

- [ ] **installation-types.ts**
  - [ ] Define `PackageManager` type
  - [ ] Define `InstallOptions` interface
  - [ ] Define `InstallResult` interface
  - [ ] Define `InstallProgressEvent` interface
  - [ ] Define `InstallError` interface
  - [ ] Define `InstallErrorCode` type
  - [ ] Define `DependencyCheckResult` interface
  - [ ] Define `InstallStatus` type

### Phase C: SimplyMCP Integration (Days 7-8)

- [ ] **SimplyMCP.ts modifications**
  - [ ] Add `autoInstall` option to `SimplyMCPOptions`
  - [ ] Implement `installDependencies()` method
  - [ ] Implement `checkDependencies()` method
  - [ ] Update `fromFile()` to support auto-install
  - [ ] Add event emitters (`install:progress`, `install:error`, `install:complete`)
  - [ ] Integrate with Feature 2 (inline dependencies)
  - [ ] Add error handling
  - [ ] Add progress reporting

### Phase D: Examples (Day 9)

- [ ] **auto-install-basic.ts**
  - [ ] Create simple auto-install example
  - [ ] Demonstrate `fromFile()` with `autoInstall: true`
  - [ ] Show dependency checking

- [ ] **auto-install-advanced.ts**
  - [ ] Create advanced example
  - [ ] Custom install options
  - [ ] Progress tracking
  - [ ] Status reporting

- [ ] **auto-install-error-handling.ts**
  - [ ] Create error handling example
  - [ ] Invalid package scenario
  - [ ] Recovery strategies
  - [ ] Helpful error messages

### Phase E: Testing (Days 10-12)

- [ ] **Unit tests**
  - [ ] Run test-auto-install-checker.sh
  - [ ] Run test-auto-install-detector.sh
  - [ ] Run test-auto-install-installer.sh
  - [ ] Verify 100% pass rate

- [ ] **Integration tests**
  - [ ] Run auto-install-integration.test.ts
  - [ ] Verify all 30 tests pass
  - [ ] Test across npm/yarn/pnpm

- [ ] **E2E tests**
  - [ ] Run test-auto-install-e2e.sh
  - [ ] Verify real installations work
  - [ ] Test full workflows

### Phase F: Documentation (Day 13)

- [ ] **Feature documentation**
  - [ ] Write auto-installation guide
  - [ ] Document API (`installDependencies`, `checkDependencies`)
  - [ ] Document options and configuration
  - [ ] Add troubleshooting section

- [ ] **Update existing docs**
  - [ ] Update main README
  - [ ] Update architecture docs
  - [ ] Update examples documentation
  - [ ] Update CHANGELOG

### Phase G: Polish & Review (Day 14)

- [ ] **Code review**
  - [ ] Security review (validation, sandboxing)
  - [ ] Performance review (caching, parallel)
  - [ ] API review (consistency, ergonomics)
  - [ ] Error handling review

- [ ] **Final testing**
  - [ ] Run all tests (100+ tests)
  - [ ] Manual testing (npm, yarn, pnpm)
  - [ ] Cross-platform testing (Linux, macOS, Windows)
  - [ ] Performance benchmarks

---

## 14. Success Criteria

### 14.1 Feature Complete When:

- [ ] All core components implemented (checker, detector, installer)
- [ ] SimplyMCP API additions complete
- [ ] Auto-installation works with npm, yarn, pnpm
- [ ] Lock files generated correctly
- [ ] Progress reporting functional
- [ ] Error handling robust
- [ ] 100+ tests passing (100% pass rate)
- [ ] Zero breaking changes to existing API
- [ ] Integration with Feature 2 seamless
- [ ] Examples work out of the box
- [ ] Documentation comprehensive
- [ ] Security measures in place
- [ ] Performance benchmarks met

### 14.2 User Acceptance Criteria:

1. **User can auto-install from inline deps**
   ```typescript
   const server = await SimplyMCP.fromFile('./server.ts', {
     autoInstall: true
   });
   ```

2. **User can manually install dependencies**
   ```typescript
   await server.installDependencies();
   ```

3. **User can check dependency status**
   ```typescript
   const status = await server.checkDependencies();
   console.log('Missing:', status.missing);
   ```

4. **User gets progress feedback**
   ```typescript
   await server.installDependencies({
     onProgress: (e) => console.log(e.message)
   });
   ```

5. **User gets actionable errors**
   ```typescript
   try {
     await server.installDependencies();
   } catch (error) {
     // Error includes recovery steps
   }
   ```

6. **Existing servers work unchanged**
   ```typescript
   // No auto-install by default
   const server = new SimplyMCP({ name: 'test' });
   ```

---

## 15. Risk Assessment

### 15.1 Technical Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **npm API changes** | MEDIUM | LOW | Use stable npm commands, version lock |
| **Network failures** | HIGH | MEDIUM | Retry logic, offline mode, caching |
| **Package manager bugs** | MEDIUM | LOW | Extensive testing, error handling |
| **Lock file corruption** | LOW | LOW | Validation, regeneration logic |
| **Security vulnerabilities** | HIGH | LOW | Sandboxing, validation, ignore-scripts |
| **Performance issues** | LOW | LOW | Caching, parallel install, optimization |
| **Cross-platform issues** | MEDIUM | MEDIUM | Test on Linux/macOS/Windows |

### 15.2 Implementation Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Scope creep** | HIGH | MEDIUM | Stick to MVP, defer enhancements |
| **Testing complexity** | MEDIUM | MEDIUM | Use temp directories, cleanup |
| **Integration issues** | MEDIUM | LOW | Build on Feature 2 foundation |
| **Deadline pressure** | MEDIUM | MEDIUM | Prioritize core features |

### 15.3 User Experience Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Unexpected installations** | HIGH | LOW | Opt-in by default |
| **Confusing errors** | MEDIUM | MEDIUM | Actionable error messages |
| **Slow installations** | LOW | LOW | Progress reporting, timeout |
| **Lock file conflicts** | MEDIUM | MEDIUM | Clear warnings, documentation |

---

## 16. Future Enhancements (Out of Scope)

### 16.1 Advanced Package Managers

- **Bun support**: Detect and use bun for installation
- **Volta support**: Respect Volta configuration
- **nvm integration**: Auto-switch Node.js version

### 16.2 Dependency Resolution

- **Peer dependency auto-install**: Install peer dependencies automatically
- **Conflict resolution**: Smart version resolution for conflicts
- **Dependency graph**: Visualize dependency tree

### 16.3 Offline Capabilities

- **Full offline mode**: Work completely offline with cache
- **Dependency bundling**: Bundle dependencies with server
- **Vendoring**: Vendor dependencies into server file

### 16.4 Advanced Features

- **Parallel installation**: Install multiple packages in parallel
- **Delta updates**: Only install changed dependencies
- **Version pinning**: Lock specific versions automatically
- **Security scanning**: Audit dependencies for vulnerabilities

---

## 17. Examples Gallery

### Example 1: Simple Auto-Install

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// axios@^1.6.0
// ///

import { SimplyMCP } from './mcp/SimplyMCP.js';

const server = await SimplyMCP.fromFile('./server.ts', {
  autoInstall: true
});

await server.start();
```

### Example 2: Custom Package Manager

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

import { SimplyMCP } from './mcp/SimplyMCP.js';

const server = await SimplyMCP.fromFile('./server.ts', {
  autoInstall: {
    enabled: true,
    packageManager: 'pnpm',  // Use pnpm instead of npm
    timeout: 10 * 60 * 1000  // 10 minute timeout
  }
});

await server.start();
```

### Example 3: Progress Tracking

```typescript
#!/usr/bin/env npx tsx
import { SimplyMCP } from './mcp/SimplyMCP.js';

const server = await SimplyMCP.fromFile('./server.ts', {
  autoInstall: {
    enabled: true,
    onProgress: (event) => {
      console.log(`[${event.stage}] ${event.message}`);
      if (event.current && event.total) {
        const percent = Math.floor((event.current / event.total) * 100);
        console.log(`  Progress: ${percent}%`);
      }
    }
  }
});
```

### Example 4: Manual Installation

```typescript
import { SimplyMCP } from './mcp/SimplyMCP.js';

const server = await SimplyMCP.fromFile('./server.ts');

// Check status
const status = await server.checkDependencies();
console.log('Missing:', status.missing);

// Install manually
if (status.missing.length > 0) {
  const result = await server.installDependencies({
    onProgress: (e) => console.log(e.message)
  });

  console.log(`Installed ${result.installed.length} packages`);
}

await server.start();
```

---

## 18. Summary

### 18.1 What This Feature Adds

- **Automatic dependency detection** from inline declarations
- **Smart installation** using npm/yarn/pnpm
- **Lock file management** (generation and updates)
- **Progress reporting** with multiple channels
- **Robust error handling** with recovery strategies
- **Security features** (validation, sandboxing, timeouts)
- **Backward compatibility** (100% opt-in)

### 18.2 Key Design Principles

1. **Opt-in by default** - No unexpected installations
2. **Package manager agnostic** - Works with npm/yarn/pnpm
3. **Robust error handling** - Actionable error messages
4. **Security first** - Validation, sandboxing, timeouts
5. **Progressive enhancement** - Works with or without auto-install
6. **Integration with Feature 2** - Builds on inline dependencies

### 18.3 Implementation Complexity

**Estimated Implementation Time: 14 days**

**Complexity Breakdown:**
- **Core Components**: Medium complexity (detection, installation)
- **SimplyMCP Integration**: Low complexity (API additions)
- **Testing**: High complexity (100+ tests, E2E scenarios)
- **Documentation**: Medium complexity

**Critical Success Factors:**
- Robust error handling (network, permissions, disk)
- Cross-platform compatibility (Linux, macOS, Windows)
- Security measures (validation, sandboxing)
- Comprehensive testing (unit, integration, E2E)

---

## 19. Next Steps for Agent 2 (Implementer)

1. **Read this plan thoroughly**
2. **Review Feature 2 implementation** (dependency parsing/validation)
3. **Start with Phase A** (dependency-checker.ts, package-manager-detector.ts)
4. **Build incrementally** (test each component in isolation)
5. **Follow Implementation Checklist** (Section 13)
6. **Write tests alongside code** (TDD approach)
7. **Document as you go** (inline comments, examples)
8. **Ask questions early** if requirements unclear

**Priority Tasks:**
1. Dependency checker (detect installed packages)
2. Package manager detector (auto-detect npm/yarn/pnpm)
3. Dependency installer (run package manager)
4. SimplyMCP integration (API additions)
5. Comprehensive testing (100+ tests)

**Critical Reminders:**
- Reuse Feature 2 validation (don't duplicate)
- Default to opt-in (autoInstall: false)
- Security first (--ignore-scripts by default)
- Test across package managers (npm, yarn, pnpm)
- Document all error scenarios
- Provide actionable recovery steps

---

**Plan Version:** 1.0
**Created:** 2025-10-02
**Author:** Agent 1 (Planner)
**For:** SimplyMCP Phase 2, Feature 3
**Estimated Lines:** ~1,200 lines
**Next:** Agent 2 (Implementer) executes this plan

---

## Appendix A: Installation Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│          User calls installDependencies()                │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  1. Get inline dependencies (Feature 2)                  │
│     { "axios": "^1.6.0", "zod": "^3.22.0" }             │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  2. Check which packages are installed                   │
│     DependencyChecker.findMissing()                      │
│     → ["axios", "zod"] (both missing)                   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  3. Detect package manager                               │
│     PackageManagerDetector.detect()                      │
│     → "npm" (from package-lock.json)                    │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  4. Verify package manager installed                     │
│     PackageManagerDetector.verifyInstalled()             │
│     → npm v10.8.0                                       │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  5. Check disk space                                     │
│     DependencyChecker.checkDiskSpace()                   │
│     → 500MB available (sufficient)                      │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  6. Build install command                                │
│     getInstallCommand("npm", [...])                      │
│     → ["install", "axios@^1.6.0", "zod@^3.22.0",        │
│        "--save", "--ignore-scripts"]                    │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  7. Execute npm install                                  │
│     DependencyInstaller.install()                        │
│     → Stream output, report progress                    │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  8. Verify installation                                  │
│     DependencyChecker.verifyVersions()                   │
│     → axios@1.6.0 ✓, zod@3.22.0 ✓                       │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  9. Generate lock file                                   │
│     DependencyInstaller.generateLockfile()               │
│     → package-lock.json created                         │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  10. Return result                                       │
│      { success: true, installed: [...], lockFile: ... } │
└─────────────────────────────────────────────────────────┘
```

---

## Appendix B: Error Recovery Matrix

| Error | Detection Method | User Message | Auto-Recovery | Manual Recovery |
|-------|-----------------|--------------|---------------|-----------------|
| **npm not found** | `npm --version` fails | "npm not found. Install from nodejs.org" | ❌ No | Install Node.js |
| **Network down** | Registry HEAD fails | "Network unavailable. Try --offline" | ✅ Retry with cache | Fix network |
| **No write permission** | Write test fails | "Permission denied. Use sudo or check dir" | ❌ No | Fix permissions |
| **Disk full** | Space < 10MB | "Disk full. Free up space" | ❌ No | Free disk space |
| **Invalid package** | Validation fails | "Invalid package: {name}" | ❌ No | Fix package name |
| **Package not found** | npm 404 | "Package not found: {name}" | ❌ No | Check registry |
| **Version conflict** | Merge check | "Conflict: inline vs package.json" | ✅ Use package.json | Update declarations |
| **Timeout** | Time > 5min | "Timeout. Increase timeout or check network" | ✅ Retry with 10min | Increase timeout |
| **Corrupted lock** | Validation fails | "Lock file corrupted. Regenerating..." | ✅ Regenerate | Delete lock file |
| **Install script error** | npm error | "Install script failed: {pkg}" | ❌ No | Check package logs |

---

**END OF PLAN**
