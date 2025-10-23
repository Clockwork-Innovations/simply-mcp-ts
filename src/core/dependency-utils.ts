/**
 * Utility functions for working with inline dependencies
 */

import {
  InlineDependencies,
  Dependency,
  PackageJson,
} from './dependency-types.js';

/**
 * Generate package.json structure from inline dependencies
 *
 * @param deps - Inline dependencies (package -> version map)
 * @param options - Options for categorizing dependencies
 * @returns Package.json compatible object
 *
 * @example
 * ```typescript
 * const deps = { 'express': '^4.18.0', 'typescript': '^5.0.0' };
 * const pkg = generatePackageJson(deps, {
 *   name: 'my-server',
 *   version: '1.0.0',
 *   devDeps: ['typescript']
 * });
 * ```
 */
export function generatePackageJson(
  deps: InlineDependencies | Dependency[],
  options: {
    name?: string;
    version?: string;
    devDeps?: string[];
    peerDeps?: string[];
  } = {}
): PackageJson {
  const { name = 'mcp-server', version = '1.0.0', devDeps = [], peerDeps = [] } = options;

  // Convert array to map if needed
  const depsMap: InlineDependencies = Array.isArray(deps)
    ? deps.reduce((acc, dep) => {
        acc[dep.name] = dep.version;
        return acc;
      }, {} as InlineDependencies)
    : deps;

  const devDepSet = new Set(devDeps);
  const peerDepSet = new Set(peerDeps);

  const dependencies: InlineDependencies = {};
  const devDependencies: InlineDependencies = {};
  const peerDependencies: InlineDependencies = {};

  for (const [packageName, versionSpec] of Object.entries(depsMap)) {
    if (devDepSet.has(packageName)) {
      devDependencies[packageName] = versionSpec;
    } else if (peerDepSet.has(packageName)) {
      peerDependencies[packageName] = versionSpec;
    } else {
      dependencies[packageName] = versionSpec;
    }
  }

  const packageJson: PackageJson = {
    name,
    version,
  };

  if (Object.keys(dependencies).length > 0) {
    packageJson.dependencies = dependencies;
  }

  if (Object.keys(devDependencies).length > 0) {
    packageJson.devDependencies = devDependencies;
  }

  if (Object.keys(peerDependencies).length > 0) {
    packageJson.peerDependencies = peerDependencies;
  }

  return packageJson;
}

/**
 * Merge inline dependencies with existing package.json dependencies
 * package.json takes precedence over inline deps
 *
 * @param inlineDeps - Inline dependencies from source code
 * @param packageJson - Existing package.json dependencies
 * @returns Merged dependencies with conflicts reported
 *
 * @example
 * ```typescript
 * const inline = { 'express': '^4.18.0' };
 * const pkgJson = { dependencies: { 'express': '^4.17.0', 'zod': '^3.22.0' } };
 * const result = mergeDependencies(inline, pkgJson);
 * // result.dependencies: { 'express': '^4.17.0', 'zod': '^3.22.0' }
 * // result.conflicts: ['express']
 * ```
 */
export function mergeDependencies(
  inlineDeps: InlineDependencies,
  packageJson: PackageJson
): {
  dependencies: InlineDependencies;
  conflicts: string[];
  warnings: string[];
} {
  const merged: InlineDependencies = {};
  const conflicts: string[] = [];
  const warnings: string[] = [];

  // Get all deps from package.json
  const pkgDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
  };

  // Start with package.json dependencies (they take precedence)
  Object.assign(merged, pkgDeps);

  // Add inline deps, checking for conflicts
  for (const [name, version] of Object.entries(inlineDeps)) {
    if (pkgDeps[name]) {
      if (pkgDeps[name] !== version) {
        conflicts.push(name);
        warnings.push(
          `Conflict for "${name}": inline deps specify "${version}" but package.json has "${pkgDeps[name]}" (using package.json version)`
        );
      }
    } else {
      // Not in package.json, add from inline deps
      merged[name] = version;
    }
  }

  return {
    dependencies: merged,
    conflicts,
    warnings,
  };
}

/**
 * Format dependency list as human-readable string
 *
 * @param deps - Dependencies to format
 * @param options - Formatting options
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * const deps = { 'express': '^4.18.0', 'zod': '^3.22.0' };
 * console.log(formatDependencyList(deps));
 * // express@^4.18.0
 * // zod@^3.22.0
 * ```
 */
export function formatDependencyList(
  deps: InlineDependencies | Dependency[],
  options: {
    format?: 'inline' | 'list' | 'json';
    includeCount?: boolean;
  } = {}
): string {
  const { format = 'list', includeCount = false } = options;

  // Convert array to map if needed
  const depsMap: InlineDependencies = Array.isArray(deps)
    ? deps.reduce((acc, dep) => {
        acc[dep.name] = dep.version;
        return acc;
      }, {} as InlineDependencies)
    : deps;

  const entries = Object.entries(depsMap);

  if (entries.length === 0) {
    return '(no dependencies)';
  }

  let result = '';

  if (includeCount) {
    result += `${entries.length} ${entries.length === 1 ? 'dependency' : 'dependencies'}:\n`;
  }

  switch (format) {
    case 'inline':
      result += entries.map(([name, version]) => `${name}@${version}`).join(', ');
      break;

    case 'json':
      result += JSON.stringify(depsMap, null, 2);
      break;

    case 'list':
    default:
      result += entries.map(([name, version]) => `${name}@${version}`).join('\n');
      break;
  }

  return result;
}

/**
 * Convert dependency array to map
 *
 * @param deps - Array of dependencies
 * @returns Dependencies as package -> version map
 */
export function dependencyArrayToMap(deps: Dependency[]): InlineDependencies {
  return deps.reduce((acc, dep) => {
    acc[dep.name] = dep.version;
    return acc;
  }, {} as InlineDependencies);
}

/**
 * Convert dependency map to array
 *
 * @param deps - Dependencies as package -> version map
 * @returns Array of Dependency objects
 */
export function dependencyMapToArray(deps: InlineDependencies): Dependency[] {
  return Object.entries(deps).map(([name, version]) => ({
    name,
    version,
  }));
}

/**
 * Sort dependencies alphabetically by package name
 *
 * @param deps - Dependencies to sort
 * @returns Sorted dependencies
 */
export function sortDependencies(deps: InlineDependencies): InlineDependencies {
  const sorted: InlineDependencies = {};
  const keys = Object.keys(deps).sort();

  for (const key of keys) {
    sorted[key] = deps[key];
  }

  return sorted;
}

/**
 * Filter dependencies by package name pattern
 *
 * @param deps - Dependencies to filter
 * @param pattern - Pattern to match (supports wildcards)
 * @returns Filtered dependencies
 *
 * @example
 * ```typescript
 * const deps = { '@types/node': '^20', '@types/express': '^4', 'chalk': '^5.0.0' };
 * const typesDeps = filterDependencies(deps, '@types/*');
 * // { '@types/node': '^20', '@types/express': '^4' }
 * ```
 */
export function filterDependencies(
  deps: InlineDependencies,
  pattern: string | RegExp
): InlineDependencies {
  const regex = typeof pattern === 'string'
    ? new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    : pattern;

  const filtered: InlineDependencies = {};

  for (const [name, version] of Object.entries(deps)) {
    if (regex.test(name)) {
      filtered[name] = version;
    }
  }

  return filtered;
}

/**
 * Get dependency statistics
 *
 * @param deps - Dependencies to analyze
 * @returns Statistics object
 */
export function getDependencyStats(deps: InlineDependencies): {
  total: number;
  scoped: number;
  unscoped: number;
  types: number;
  versioned: number;
  wildcards: number;
} {
  const entries = Object.entries(deps);

  return {
    total: entries.length,
    scoped: entries.filter(([name]) => name.startsWith('@')).length,
    unscoped: entries.filter(([name]) => !name.startsWith('@')).length,
    types: entries.filter(([name]) => name.startsWith('@types/')).length,
    versioned: entries.filter(([, version]) => !['*', 'x', 'latest', 'next'].includes(version)).length,
    wildcards: entries.filter(([, version]) => ['*', 'x', 'latest', 'next'].includes(version)).length,
  };
}
