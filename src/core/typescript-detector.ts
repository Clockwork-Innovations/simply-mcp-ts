/**
 * TypeScript Detection Utility
 *
 * Provides robust TypeScript detection across different package managers
 * and installation methods to eliminate false warnings.
 */

import type ts from 'typescript';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Create require function for both ES modules and CommonJS (Jest)
// Jest runs in Node with 'require' already available
// Production ESM needs to create require from import.meta.url
//
// SECURITY AUDIT: The eval() below is safe because:
//   1. Only executed in ESM context (when require is undefined)
//   2. Uses hardcoded string literal - no user input possible
//   3. Only accesses built-in import.meta.url property
//   4. Industry-standard workaround for Jest+ESM compatibility
//   5. Cannot be exploited - string is constant and immutable
//
// See: https://github.com/kulshekhar/ts-jest/issues/1174
let _require: any = undefined;
function getRequire() {
  // Return cached require if already initialized
  if (_require !== undefined) {
    return _require;
  }

  // Jest/Node: use existing require (no eval needed)
  if (typeof require !== 'undefined') {
    _require = require;
    return _require;
  }

  // Production ESM: create require from import.meta.url
  // Wrapped in try-catch to handle edge cases where import.meta might not be available
  // (e.g., bundled code, certain test runners)
  try {
    // eslint-disable-next-line no-eval
    _require = createRequire(eval('import.meta.url'));
    return _require;
  } catch (error) {
    throw new Error(
      'TypeScript detector requires a module context with either CommonJS require or ESM import.meta.\n' +
      `Current context: require=${typeof require}, error=${error instanceof Error ? error.message : String(error)}\n` +
      'If you see "Cannot use import.meta outside a module", ensure:\n' +
      '1. Your package.json has "type": "module"\n' +
      '2. Jest is configured with ts-jest-mock-import-meta transformer\n' +
      '3. The code is not being executed in an incompatible bundled context'
    );
  }
}

/**
 * Cached TypeScript module reference
 */
let TypeScript: typeof ts | undefined;

/**
 * Result of TypeScript detection attempt
 */
interface DetectionResult {
  found: boolean;
  method?: string;
  error?: string;
}

/**
 * Attempt to detect TypeScript using require.resolve
 */
function tryRequireResolve(): DetectionResult {
  try {
    getRequire().resolve('typescript');
    return { found: true, method: 'require.resolve' };
  } catch (error: any) {
    return { found: false, error: error.message };
  }
}

/**
 * Attempt to detect TypeScript using npm list
 * Works with npm and handles transitive dependencies
 */
function tryNpmList(): DetectionResult {
  try {
    const { execSync } = getRequire()('child_process');
    // Use stdio: 'pipe' to suppress output and just check exit code
    // --depth=Infinity ensures we check all nested dependencies
    execSync('npm list typescript --depth=Infinity', {
      stdio: 'pipe',
      timeout: 5000, // 5 second timeout
    });
    return { found: true, method: 'npm list' };
  } catch (error: any) {
    // npm list exits with code 1 if package not found
    // but may also exit with 1 for other reasons (package.json issues, etc.)
    return { found: false, error: error.message };
  }
}

/**
 * Attempt to detect TypeScript using pnpm list
 * Works with pnpm's symlinked node_modules structure
 */
function tryPnpmList(): DetectionResult {
  try {
    const { execSync } = getRequire()('child_process');
    // pnpm list exits with 0 if package is found
    execSync('pnpm list typescript --depth=Infinity', {
      stdio: 'pipe',
      timeout: 5000,
    });
    return { found: true, method: 'pnpm list' };
  } catch (error: any) {
    return { found: false, error: error.message };
  }
}

/**
 * Attempt to detect TypeScript using yarn list
 * Works with yarn's hoisted node_modules structure
 */
function tryYarnList(): DetectionResult {
  try {
    const { execSync } = getRequire()('child_process');
    // yarn list returns 0 if package is found
    execSync('yarn list --pattern typescript --depth=0', {
      stdio: 'pipe',
      timeout: 5000,
    });
    return { found: true, method: 'yarn list' };
  } catch (error: any) {
    return { found: false, error: error.message };
  }
}

/**
 * Detect which package manager is being used
 */
function detectPackageManager(): 'npm' | 'pnpm' | 'yarn' | 'unknown' {
  try {
    const fs = getRequire()('fs');
    const path = getRequire()('path');
    const { existsSync } = fs;
    const { join } = path;

    // Check for lock files in current directory and parent directories
    // Search up to 10 levels (increased from 5) to handle deeper project structures
    let currentDir = process.cwd();
    for (let i = 0; i < 10; i++) {
      if (existsSync(join(currentDir, 'pnpm-lock.yaml'))) {
        return 'pnpm';
      }
      if (existsSync(join(currentDir, 'yarn.lock'))) {
        return 'yarn';
      }
      if (existsSync(join(currentDir, 'package-lock.json'))) {
        return 'npm';
      }

      const parentDir = join(currentDir, '..');
      if (parentDir === currentDir) break; // reached root
      currentDir = parentDir;
    }

    // Fallback: check npm_execpath environment variable set by npm/yarn/pnpm
    if (process.env.npm_execpath) {
      if (process.env.npm_execpath.includes('pnpm')) return 'pnpm';
      if (process.env.npm_execpath.includes('yarn')) return 'yarn';
      return 'npm'; // Default for npm
    }

    return 'unknown';
  } catch (error) {
    // Log specific error for debugging but don't fail
    if (error instanceof Error) {
      console.warn(`[Package Manager Detection] Failed: ${error.message}`);
    }

    return 'unknown';
  }
}

/**
 * Ensure TypeScript is installed and available
 *
 * Uses multiple detection methods to minimize false warnings:
 * 1. Try require.resolve('typescript') - works for direct dependencies
 * 2. Try package manager list command - works for transitive dependencies
 * 3. Try dynamic require - final fallback
 *
 * Only throws an error if ALL detection methods fail.
 *
 * @returns TypeScript module
 * @throws Error if TypeScript is genuinely not available
 */
export function ensureTypeScript(): typeof ts {
  // If already loaded, return cached module
  if (TypeScript) {
    return TypeScript;
  }

  // Track detection attempts for error reporting
  const attempts: DetectionResult[] = [];

  // Method 1: Try require.resolve (fastest, works for direct deps)
  const requireResolveResult = tryRequireResolve();
  attempts.push(requireResolveResult);

  if (requireResolveResult.found) {
    try {
      TypeScript = getRequire()('typescript');
      return TypeScript;
    } catch (error: any) {
      // require.resolve succeeded but require failed - this shouldn't happen
      attempts.push({ found: false, method: 'require', error: error.message });
    }
  }

  // Method 2: Detect package manager and use appropriate list command
  const packageManager = detectPackageManager();
  let listResult: DetectionResult | null = null;

  switch (packageManager) {
    case 'pnpm':
      listResult = tryPnpmList();
      break;
    case 'yarn':
      listResult = tryYarnList();
      break;
    case 'npm':
      listResult = tryNpmList();
      break;
    case 'unknown':
      // Try all package managers as fallback
      listResult = tryPnpmList();
      if (!listResult.found) {
        listResult = tryYarnList();
      }
      if (!listResult.found) {
        listResult = tryNpmList();
      }
      break;
  }

  if (listResult) {
    attempts.push(listResult);

    if (listResult.found) {
      // Package manager found TypeScript, try requiring it again
      // It might be in a nested node_modules that require.resolve missed
      try {
        TypeScript = getRequire()('typescript');
        return TypeScript;
      } catch (error: any) {
        // Package manager found it but we still can't require it
        // This is a real installation issue
        attempts.push({ found: false, method: 'require (after list)', error: error.message });
      }
    }
  }

  // Method 3: Final fallback - try dynamic import
  // This might work in some edge cases where require() fails
  try {
    TypeScript = getRequire()('typescript');
    return TypeScript;
  } catch (error: any) {
    attempts.push({ found: false, method: 'final require', error: error.message });
  }

  // All detection methods failed - TypeScript is genuinely not available
  const attemptsSummary = attempts
    .map(a => `  - ${a.method || 'unknown'}: ${a.found ? 'success' : `failed (${a.error})`}`)
    .join('\n');

  throw new Error(
    'TypeScript is required for interface-driven API but is not installed.\n\n' +
    `Package manager detected: ${packageManager}\n\n` +
    'Detection attempts:\n' +
    attemptsSummary + '\n\n' +
    'To fix this issue:\n' +
    '  npm install --save-dev typescript   (for npm)\n' +
    '  pnpm add -D typescript              (for pnpm)\n' +
    '  yarn add -D typescript              (for yarn)\n\n' +
    'Note: TypeScript is a peer dependency for simply-mcp.\n' +
    'It is only needed if you use the interface-driven API (IServer, ITools, etc.).'
  );
}

/**
 * Check if TypeScript is available without throwing an error
 * Useful for conditional feature enablement
 *
 * @returns true if TypeScript is available, false otherwise
 */
export function isTypeScriptAvailable(): boolean {
  try {
    ensureTypeScript();
    return true;
  } catch {
    return false;
  }
}

