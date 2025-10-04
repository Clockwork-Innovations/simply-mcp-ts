/**
 * Dependency checker - Check which dependencies are installed and verify versions
 * Feature 3: Auto-Installation
 */

import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { DependencyStatus } from './installation-types.js';
import { InlineDependencies } from './dependency-types.js';

/**
 * Check which dependencies are installed
 *
 * @param required - Required dependencies (package -> version map)
 * @param cwd - Working directory (default: process.cwd())
 * @returns Dependency status with installed, missing, and outdated packages
 *
 * @example
 * ```typescript
 * const status = await checkDependencies({
 *   'axios': '^1.6.0',
 *   'zod': '^3.22.0'
 * });
 * console.log('Missing:', status.missing);
 * ```
 */
export async function checkDependencies(
  required: Record<string, string>,
  cwd?: string
): Promise<DependencyStatus> {
  const workingDir = cwd || process.cwd();
  const installed: string[] = [];
  const missing: string[] = [];
  const outdated: Array<{ name: string; current: string; required: string }> = [];

  for (const [packageName, requiredVersion] of Object.entries(required)) {
    const isInstalled = await isPackageInstalled(packageName, workingDir);

    if (!isInstalled) {
      missing.push(packageName);
      continue;
    }

    // Package is installed, check version
    const installedVersion = await getInstalledVersion(packageName, workingDir);

    if (installedVersion) {
      // Check if version satisfies requirement
      const satisfies = verifyVersion(installedVersion, requiredVersion);

      if (satisfies) {
        installed.push(packageName);
      } else {
        outdated.push({
          name: packageName,
          current: installedVersion,
          required: requiredVersion,
        });
      }
    } else {
      // Package exists but can't read version - consider missing
      missing.push(packageName);
    }
  }

  return {
    installed,
    missing,
    outdated,
  };
}

/**
 * Check if a specific package is installed
 *
 * @param packageName - Package name to check
 * @param cwd - Working directory (default: process.cwd())
 * @returns True if package exists in node_modules
 *
 * @example
 * ```typescript
 * const hasAxios = await isPackageInstalled('axios');
 * console.log(hasAxios); // true or false
 * ```
 */
export async function isPackageInstalled(
  packageName: string,
  cwd?: string
): Promise<boolean> {
  const workingDir = cwd || process.cwd();

  try {
    // Check if package.json exists in node_modules
    const packageJsonPath = join(workingDir, 'node_modules', packageName, 'package.json');
    await access(packageJsonPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get installed version of a package
 *
 * @param packageName - Package name
 * @param cwd - Working directory (default: process.cwd())
 * @returns Installed version or null if not found
 *
 * @example
 * ```typescript
 * const version = await getInstalledVersion('axios');
 * console.log(version); // '1.6.0' or null
 * ```
 */
export async function getInstalledVersion(
  packageName: string,
  cwd?: string
): Promise<string | null> {
  const workingDir = cwd || process.cwd();

  try {
    const packageJsonPath = join(workingDir, 'node_modules', packageName, 'package.json');
    const content = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);
    return packageJson.version || null;
  } catch {
    return null;
  }
}

/**
 * Verify if installed version matches required version range
 *
 * This is a simplified version check. For production use, consider using
 * the 'semver' package for full semver compliance.
 *
 * @param installed - Installed version (e.g., '1.6.0')
 * @param required - Required version range (e.g., '^1.6.0')
 * @returns True if installed version satisfies requirement
 *
 * @example
 * ```typescript
 * verifyVersion('1.6.0', '^1.6.0'); // true
 * verifyVersion('1.5.0', '^1.6.0'); // false
 * verifyVersion('2.0.0', '^1.6.0'); // false
 * ```
 */
export function verifyVersion(installed: string, required: string): boolean {
  // Handle exact version match
  if (installed === required) {
    return true;
  }

  // Handle wildcard requirements
  if (required === '*' || required === 'latest' || required === 'x') {
    return true;
  }

  // Parse versions
  const installedParts = parseVersion(installed);
  const requiredParts = parseVersion(required);

  if (!installedParts || !requiredParts) {
    // If we can't parse, assume it's compatible (conservative)
    return true;
  }

  const { major: iMajor, minor: iMinor, patch: iPatch } = installedParts;
  const { major: rMajor, minor: rMinor, patch: rPatch, operator } = requiredParts;

  // Handle different operators
  switch (operator) {
    case '^': // Caret: allows changes that don't modify left-most non-zero digit
      if (rMajor !== 0) {
        // ^1.2.3 := >=1.2.3 <2.0.0
        return iMajor === rMajor && (iMinor > rMinor || (iMinor === rMinor && iPatch >= rPatch));
      } else if (rMinor !== 0) {
        // ^0.2.3 := >=0.2.3 <0.3.0
        return iMajor === 0 && iMinor === rMinor && iPatch >= rPatch;
      } else {
        // ^0.0.3 := >=0.0.3 <0.0.4
        return iMajor === 0 && iMinor === 0 && iPatch === rPatch;
      }

    case '~': // Tilde: allows patch-level changes
      // ~1.2.3 := >=1.2.3 <1.3.0
      return iMajor === rMajor && iMinor === rMinor && iPatch >= rPatch;

    case '>=':
      return compareVersions(iMajor, iMinor, iPatch, rMajor, rMinor, rPatch) >= 0;

    case '>':
      return compareVersions(iMajor, iMinor, iPatch, rMajor, rMinor, rPatch) > 0;

    case '<=':
      return compareVersions(iMajor, iMinor, iPatch, rMajor, rMinor, rPatch) <= 0;

    case '<':
      return compareVersions(iMajor, iMinor, iPatch, rMajor, rMinor, rPatch) < 0;

    case '=':
    default:
      // Exact match
      return iMajor === rMajor && iMinor === rMinor && iPatch === rPatch;
  }
}

/**
 * Parse version string into components
 */
function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
  operator?: string;
} | null {
  // Extract operator if present
  const operatorMatch = version.match(/^([~^>=<]+)/);
  const operator = operatorMatch ? operatorMatch[1] : '';
  const versionPart = version.replace(/^[~^>=<]+/, '');

  // Parse version numbers (handle pre-release and build metadata)
  const match = versionPart.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);

  if (!match) {
    return null;
  }

  return {
    major: parseInt(match[1], 10),
    minor: match[2] ? parseInt(match[2], 10) : 0,
    patch: match[3] ? parseInt(match[3], 10) : 0,
    operator: operator || undefined,
  };
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(
  major1: number,
  minor1: number,
  patch1: number,
  major2: number,
  minor2: number,
  patch2: number
): number {
  if (major1 !== major2) return major1 > major2 ? 1 : -1;
  if (minor1 !== minor2) return minor1 > minor2 ? 1 : -1;
  if (patch1 !== patch2) return patch1 > patch2 ? 1 : -1;
  return 0;
}
