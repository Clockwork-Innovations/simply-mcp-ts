/**
 * Dependency resolution for bundling
 * Integrates with Feature 2 (inline deps) and Feature 3 (auto-install)
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { parseInlineDependencies } from './dependency-parser.js';
import { installDependencies } from './dependency-installer.js';
import { InstallOptions } from './installation-types.js';
import { ResolvedDependencies } from './bundle-types.js';

/**
 * Known native modules that cannot be bundled
 * These must be marked as external
 */
const KNOWN_NATIVE_MODULES = [
  'fsevents',
  'better-sqlite3',
  'sqlite3',
  'canvas',
  '@node-rs/argon2',
  '@node-rs/bcrypt',
  '@node-rs/xxhash',
  'sharp',
  'esbuild',
  'vite',
  'swc',
  'node-gyp',
  'node-pre-gyp',
  'bufferutil',
  'utf-8-validate',
  'cpu-features',
  'lightningcss',
  'parcel-watcher',
];

/**
 * Resolve all dependencies for bundling
 *
 * Process:
 * 1. Parse inline dependencies from source (Feature 2)
 * 2. Read package.json dependencies
 * 3. Merge all dependencies
 * 4. Detect native modules (mark as external)
 * 5. Auto-install if requested (Feature 3)
 *
 * @param options - Resolution options
 * @returns Resolved dependencies with native modules identified
 *
 * @example
 * ```typescript
 * const resolved = await resolveDependencies({
 *   entryPoint: './server.ts',
 *   autoInstall: true
 * });
 * console.log(resolved.dependencies); // { axios: '^1.6.0', ... }
 * console.log(resolved.nativeModules); // ['fsevents']
 * ```
 */
export async function resolveDependencies(options: {
  entryPoint: string;
  autoInstall?: boolean;
  basePath?: string;
  installOptions?: InstallOptions;
}): Promise<ResolvedDependencies> {
  const { entryPoint, autoInstall, basePath = process.cwd(), installOptions } = options;

  // 1. Parse inline dependencies (Feature 2)
  const content = await readFile(entryPoint, 'utf-8');
  const inlineDeps = parseInlineDependencies(content, {
    strict: false,
    validateSemver: true,
    allowComments: true,
  });

  // 2. Read package.json dependencies
  const pkgPath = join(basePath, 'package.json');
  let packageJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  } = {};

  if (existsSync(pkgPath)) {
    try {
      const pkgContent = await readFile(pkgPath, 'utf-8');
      packageJson = JSON.parse(pkgContent);
    } catch (error) {
      console.warn(`Warning: Failed to read package.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 3. Merge dependencies (inline takes precedence)
  const allDeps: Record<string, string> = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...inlineDeps.dependencies,
  };

  // 4. Detect native modules
  const nativeModules = detectNativeModules(Object.keys(allDeps));

  // 5. Auto-install if requested (Feature 3)
  if (autoInstall && Object.keys(inlineDeps.dependencies).length > 0) {
    try {
      const result = await installDependencies(inlineDeps.dependencies, {
        cwd: basePath,
        ...installOptions,
      });

      if (!result.success) {
        console.warn('Warning: Some dependencies failed to install:');
        result.errors.forEach(err => {
          console.warn(`  - ${err.packageName || 'unknown'}: ${err.message}`);
        });
      }
    } catch (error) {
      console.warn(`Warning: Failed to auto-install dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    dependencies: allDeps,
    nativeModules,
    inlineDependencies: {
      map: inlineDeps.dependencies,
      errors: inlineDeps.errors,
      warnings: inlineDeps.warnings,
    },
  };
}

/**
 * Detect native modules from dependency list
 *
 * @param dependencies - List of dependency names
 * @returns List of native module names
 */
export function detectNativeModules(dependencies: string[]): string[] {
  return dependencies.filter(dep => {
    // Check known native modules
    if (KNOWN_NATIVE_MODULES.includes(dep)) {
      return true;
    }

    // Check patterns that often indicate native modules
    const nativePatterns = [
      /^node-/,           // node-* packages often native
      /-native$/,         // *-native packages
      /@node-rs\//,       // @node-rs/* packages
      /^@napi-rs\//,      // @napi-rs/* packages
    ];

    return nativePatterns.some(pattern => pattern.test(dep));
  });
}

/**
 * Check if a specific package is a native module
 *
 * @param packageName - Package name to check
 * @returns True if package is native
 */
export function isNativeModule(packageName: string): boolean {
  return detectNativeModules([packageName]).length > 0;
}

/**
 * Merge multiple dependency sources with conflict resolution
 *
 * Priority order (highest to lowest):
 * 1. Inline dependencies
 * 2. package.json dependencies
 * 3. package.json devDependencies
 *
 * @param sources - Dependency sources in priority order
 * @returns Merged dependencies
 */
export function mergeDependencies(
  ...sources: Array<Record<string, string> | undefined>
): Record<string, string> {
  const merged: Record<string, string> = {};

  // Iterate in forward order so later sources (higher priority) overwrite earlier ones
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    if (source) {
      Object.assign(merged, source);
    }
  }

  return merged;
}

/**
 * Filter dependencies by pattern
 *
 * @param dependencies - Dependencies to filter
 * @param patterns - Patterns to match (strings or regex)
 * @param include - If true, include matches; if false, exclude matches
 * @returns Filtered dependencies
 *
 * @example
 * ```typescript
 * const deps = { 'axios': '^1.0.0', '@types/node': '^20.0.0', 'zod': '^3.0.0' };
 *
 * // Include only @types/* packages
 * const types = filterDependencies(deps, [/^@types\//], true);
 * // { '@types/node': '^20.0.0' }
 *
 * // Exclude @types/* packages
 * const noTypes = filterDependencies(deps, [/^@types\//], false);
 * // { 'axios': '^1.0.0', 'zod': '^3.0.0' }
 * ```
 */
export function filterDependencies(
  dependencies: Record<string, string>,
  patterns: Array<string | RegExp>,
  include: boolean = true
): Record<string, string> {
  const filtered: Record<string, string> = {};

  for (const [name, version] of Object.entries(dependencies)) {
    const matches = patterns.some(pattern => {
      if (typeof pattern === 'string') {
        return name === pattern;
      }
      return pattern.test(name);
    });

    if ((include && matches) || (!include && !matches)) {
      filtered[name] = version;
    }
  }

  return filtered;
}

/**
 * Detect peer dependencies that should be marked as external
 *
 * @param basePath - Base directory for package.json lookup
 * @returns List of peer dependency names
 */
export async function detectPeerDependencies(basePath: string): Promise<string[]> {
  const pkgPath = join(basePath, 'package.json');
  if (!existsSync(pkgPath)) {
    return [];
  }

  try {
    const pkgContent = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);
    return Object.keys(pkg.peerDependencies || {});
  } catch {
    return [];
  }
}

/**
 * Get built-in Node.js modules that should be marked as external
 *
 * @returns List of built-in module names
 */
export function getBuiltinModules(): string[] {
  return [
    'assert',
    'buffer',
    'child_process',
    'cluster',
    'crypto',
    'dgram',
    'dns',
    'events',
    'fs',
    'http',
    'https',
    'net',
    'os',
    'path',
    'querystring',
    'readline',
    'stream',
    'string_decoder',
    'tls',
    'tty',
    'url',
    'util',
    'v8',
    'vm',
    'zlib',
    // Node.js 18+ modules
    'node:assert',
    'node:buffer',
    'node:child_process',
    'node:cluster',
    'node:crypto',
    'node:dgram',
    'node:dns',
    'node:events',
    'node:fs',
    'node:http',
    'node:https',
    'node:net',
    'node:os',
    'node:path',
    'node:querystring',
    'node:readline',
    'node:stream',
    'node:string_decoder',
    'node:tls',
    'node:tty',
    'node:url',
    'node:util',
    'node:v8',
    'node:vm',
    'node:zlib',
  ];
}
