/**
 * Package Bundle Detection and Entry Point Resolution
 *
 * This module provides functionality to detect npm package bundles and resolve
 * their entry points for execution. It handles various package.json configurations
 * including bin, main, module fields and default fallbacks.
 */

import { readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

/**
 * Minimal package.json type definition
 * Only includes fields used for bundle detection and entry point resolution
 */
export interface PackageJson {
  name: string;
  version: string;
  main?: string;
  module?: string;
  bin?: string | Record<string, string>;
  type?: 'module' | 'commonjs';
  description?: string;
}

/**
 * Default entry point files to check (in priority order)
 * These are checked if no explicit entry point is found in package.json
 */
const DEFAULT_ENTRY_POINTS = [
  'src/server.ts',
  'src/server.js',
  'src/index.ts',
  'src/index.js',
  // Note: Removed 'server.ts' from root-level defaults to prevent false discovery
  // Bundle examples use 'src/server.ts' which is still checked first
  'server.js',
  'index.ts',
  'index.js',
];

/**
 * Check if a path is a package bundle (directory with package.json)
 *
 * @param path - Path to check (can be file or directory)
 * @returns True if path is a directory containing a valid package.json
 *
 * @example
 * ```typescript
 * if (await isPackageBundle('./my-server')) {
 *   console.log('This is a package bundle');
 * }
 * ```
 */
export async function isPackageBundle(path: string): Promise<boolean> {
  try {
    // Check if path exists and is a directory
    const stats = await stat(path);
    if (!stats.isDirectory()) {
      return false;
    }

    // Check if package.json exists in the directory
    const packageJsonPath = join(path, 'package.json');
    await stat(packageJsonPath);
    return true;
  } catch (error) {
    // Path doesn't exist, isn't a directory, or doesn't have package.json
    return false;
  }
}

/**
 * Read and validate package.json from a bundle directory
 *
 * @param bundlePath - Path to the package bundle directory
 * @returns Parsed and validated package.json object
 * @throws Error if package.json is missing, invalid, or lacks required fields
 *
 * @example
 * ```typescript
 * try {
 *   const pkg = await readPackageJson('./my-server');
 *   console.log(`Found package: ${pkg.name}@${pkg.version}`);
 * } catch (error) {
 *   console.error('Invalid package:', error.message);
 * }
 * ```
 */
export async function readPackageJson(bundlePath: string): Promise<PackageJson> {
  const packageJsonPath = join(bundlePath, 'package.json');

  try {
    const content = await readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content) as PackageJson;

    // Validate required fields
    if (!pkg.name) {
      throw new Error(`package.json missing required field: "name"`);
    }

    if (!pkg.version) {
      throw new Error(`package.json missing required field: "version"`);
    }

    return pkg;
  } catch (error) {
    // Re-throw validation errors (from our checks above)
    if (error instanceof Error && error.message.includes('missing required field')) {
      throw error;
    }

    // Handle file system errors
    if (error && typeof error === 'object' && 'code' in error) {
      if ((error as any).code === 'ENOENT') {
        throw new Error(`Package bundle missing package.json: ${bundlePath}`);
      }
    }

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in package.json: ${error.message}`);
    }

    // For other errors
    if (error instanceof Error) {
      throw new Error(`Failed to read package.json: ${error.message}`);
    }

    throw new Error(`Failed to read package.json: ${String(error)}`);
  }
}

/**
 * Resolve the entry point file from package.json
 *
 * Resolution priority:
 * 1. bin field (string or first entry in object)
 * 2. main field
 * 3. module field
 * 4. Default files (src/server.ts, src/index.ts, server.ts, index.ts, etc.)
 *
 * @param pkg - Parsed package.json object
 * @param bundlePath - Absolute path to the package bundle directory
 * @returns Absolute path to the entry point file
 * @throws Error if no valid entry point can be found
 *
 * @example
 * ```typescript
 * const pkg = await readPackageJson('./my-server');
 * const entryPoint = resolveEntryPoint(pkg, '/absolute/path/to/my-server');
 * console.log('Entry point:', entryPoint);
 * // Output: /absolute/path/to/my-server/dist/src/cli/index.js
 * ```
 */
export function resolveEntryPoint(pkg: PackageJson, bundlePath: string): string {
  // Priority 1: Check bin field
  if (pkg.bin) {
    let binPath: string | undefined;

    if (typeof pkg.bin === 'string') {
      // bin is a string path
      binPath = pkg.bin;
    } else if (typeof pkg.bin === 'object' && Object.keys(pkg.bin).length > 0) {
      // bin is an object, use the first entry
      // In a real MCP server package, there's usually one main bin entry
      binPath = Object.values(pkg.bin)[0];
    }

    if (binPath) {
      return resolve(bundlePath, binPath);
    }
  }

  // Priority 2: Check main field
  if (pkg.main) {
    return resolve(bundlePath, pkg.main);
  }

  // Priority 3: Check module field
  if (pkg.module) {
    return resolve(bundlePath, pkg.module);
  }

  // Priority 4: Check default entry points
  for (const defaultEntry of DEFAULT_ENTRY_POINTS) {
    const entryPath = resolve(bundlePath, defaultEntry);
    // We can't do async stat check here, so we return the first default
    // The caller will handle ENOENT if the file doesn't exist
    return entryPath;
  }

  // No entry point found
  throw new Error(
    `No entry point found in package "${pkg.name}". ` +
    `Please specify "bin", "main", or "module" in package.json, ` +
    `or create one of: ${DEFAULT_ENTRY_POINTS.join(', ')}`
  );
}

/**
 * Helper function to check if an entry point file exists
 * Used internally to verify resolved entry points
 *
 * @param entryPath - Absolute path to the entry point file
 * @returns True if the file exists and is a file (not a directory)
 */
export async function entryPointExists(entryPath: string): Promise<boolean> {
  try {
    const stats = await stat(entryPath);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}

/**
 * Resolve entry point with existence check and fallback support
 *
 * This is a more robust version of resolveEntryPoint that checks if files exist
 * and tries fallbacks if the primary entry point doesn't exist.
 *
 * @param pkg - Parsed package.json object
 * @param bundlePath - Absolute path to the package bundle directory
 * @returns Absolute path to a verified existing entry point file
 * @throws Error if no valid entry point file can be found
 */
export async function resolveEntryPointWithFallback(
  pkg: PackageJson,
  bundlePath: string
): Promise<string> {
  // Try bin field first
  if (pkg.bin) {
    let binPath: string | undefined;
    if (typeof pkg.bin === 'string') {
      binPath = pkg.bin;
    } else if (typeof pkg.bin === 'object' && Object.keys(pkg.bin).length > 0) {
      binPath = Object.values(pkg.bin)[0];
    }

    if (binPath) {
      const entryPath = resolve(bundlePath, binPath);
      if (await entryPointExists(entryPath)) {
        return entryPath;
      }
    }
  }

  // Try main field
  if (pkg.main) {
    const entryPath = resolve(bundlePath, pkg.main);
    if (await entryPointExists(entryPath)) {
      return entryPath;
    }
  }

  // Try module field
  if (pkg.module) {
    const entryPath = resolve(bundlePath, pkg.module);
    if (await entryPointExists(entryPath)) {
      return entryPath;
    }
  }

  // Try all default entry points
  for (const defaultEntry of DEFAULT_ENTRY_POINTS) {
    const entryPath = resolve(bundlePath, defaultEntry);
    if (await entryPointExists(entryPath)) {
      return entryPath;
    }
  }

  // No entry point found
  throw new Error(
    `No entry point file found in package "${pkg.name}". ` +
    `Tried: ${pkg.bin ? 'bin, ' : ''}${pkg.main ? 'main, ' : ''}${pkg.module ? 'module, ' : ''}` +
    `and default files: ${DEFAULT_ENTRY_POINTS.join(', ')}`
  );
}
