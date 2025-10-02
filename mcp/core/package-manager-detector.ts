/**
 * Package manager detector - Auto-detect which package manager to use
 * Feature 3: Auto-Installation
 */

import { access } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PackageManager, PackageManagerInfo } from './installation-types.js';

const execAsync = promisify(exec);

/**
 * Detect which package manager to use based on lock files
 *
 * Priority order:
 * 1. package-lock.json → npm
 * 2. yarn.lock → yarn
 * 3. pnpm-lock.yaml → pnpm
 * 4. bun.lockb → bun
 * 5. Default → npm
 *
 * @param cwd - Working directory (default: process.cwd())
 * @param preferred - Preferred package manager (overrides detection)
 * @returns Detected package manager information
 *
 * @example
 * ```typescript
 * const pm = await detectPackageManager();
 * console.log(pm.name); // 'npm', 'yarn', 'pnpm', or 'bun'
 * ```
 */
export async function detectPackageManager(
  cwd?: string,
  preferred?: string
): Promise<PackageManagerInfo> {
  const workingDir = cwd || process.cwd();

  // If preferred is specified, verify it and use it
  if (preferred && preferred !== 'auto') {
    const pmName = preferred as PackageManager;
    const available = await isPackageManagerAvailable(pmName);
    const version = await getPackageManagerVersion(pmName);

    return {
      name: pmName,
      version: version || 'unknown',
      available,
      lockFile: getLockFileName(pmName),
    };
  }

  // Check for lock files in priority order
  const lockFileChecks = [
    { file: 'package-lock.json', pm: 'npm' as PackageManager },
    { file: 'yarn.lock', pm: 'yarn' as PackageManager },
    { file: 'pnpm-lock.yaml', pm: 'pnpm' as PackageManager },
    { file: 'bun.lockb', pm: 'bun' as PackageManager },
  ];

  for (const { file, pm } of lockFileChecks) {
    const lockFilePath = join(workingDir, file);
    try {
      await access(lockFilePath);
      // Lock file exists, check if package manager is available
      const available = await isPackageManagerAvailable(pm);
      const version = await getPackageManagerVersion(pm);

      return {
        name: pm,
        version: version || 'unknown',
        available,
        lockFile: file,
      };
    } catch {
      // Lock file doesn't exist, continue
    }
  }

  // No lock files found, default to npm
  const available = await isPackageManagerAvailable('npm');
  const version = await getPackageManagerVersion('npm');

  return {
    name: 'npm',
    version: version || 'unknown',
    available,
    lockFile: 'package-lock.json',
  };
}

/**
 * Check if a package manager is available (installed)
 *
 * @param name - Package manager name
 * @returns True if available, false otherwise
 *
 * @example
 * ```typescript
 * const hasYarn = await isPackageManagerAvailable('yarn');
 * console.log(hasYarn); // true or false
 * ```
 */
export async function isPackageManagerAvailable(name: PackageManager): Promise<boolean> {
  try {
    await execAsync(`${name} --version`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get package manager version
 *
 * @param name - Package manager name
 * @returns Version string or null if not available
 *
 * @example
 * ```typescript
 * const version = await getPackageManagerVersion('npm');
 * console.log(version); // '10.8.0' or null
 * ```
 */
export async function getPackageManagerVersion(name: PackageManager): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`${name} --version`);
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Get lock file name for a package manager
 *
 * @param name - Package manager name
 * @returns Lock file name
 *
 * @example
 * ```typescript
 * const lockFile = getLockFileName('npm');
 * console.log(lockFile); // 'package-lock.json'
 * ```
 */
export function getLockFileName(name: PackageManager): string {
  const lockFiles: Record<PackageManager, string> = {
    npm: 'package-lock.json',
    yarn: 'yarn.lock',
    pnpm: 'pnpm-lock.yaml',
    bun: 'bun.lockb',
  };

  return lockFiles[name];
}
