/**
 * Dependency Manager for Package Bundles
 *
 * This module provides automatic dependency installation and package manager detection
 * for SimpleMCP bundles. It enables bundles to auto-install their dependencies without
 * manual setup, detecting the appropriate package manager from lock files.
 *
 * Features:
 * - Auto-detect package manager (npm, pnpm, yarn, bun) from lock files
 * - Install dependencies using detected or specified package manager
 * - Check if dependencies are already installed (node_modules detection)
 * - Force reinstall option
 * - Silent mode for programmatic use
 * - Cross-platform support (Windows, macOS, Linux)
 * - Helpful error messages with actionable suggestions
 */

import { spawn } from 'node:child_process';
import { readFile, stat, rm } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Supported package managers
 */
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

/**
 * Options for dependency installation
 */
export interface InstallOptions {
  /** Package manager to use (auto-detect if not specified) */
  packageManager?: PackageManager;
  /** Suppress installation output */
  silent?: boolean;
  /** Force reinstall even if dependencies are already installed */
  force?: boolean;
  /** Working directory (defaults to bundlePath) */
  cwd?: string;
}

/**
 * Result of dependency validation
 */
export interface DependencyValidation {
  /** Dependencies that are missing version constraints */
  missing: string[];
  /** Warnings about potentially problematic dependencies */
  warnings: string[];
}

/**
 * Lock file mappings for package manager detection
 */
const LOCK_FILES: Record<PackageManager, string> = {
  pnpm: 'pnpm-lock.yaml',
  yarn: 'yarn.lock',
  bun: 'bun.lockb',
  npm: 'package-lock.json',
};

/**
 * Install command configurations for each package manager
 */
const INSTALL_COMMANDS: Record<PackageManager, { cmd: string; args: string[] }> = {
  npm: { cmd: 'npm', args: ['install'] },
  pnpm: { cmd: 'pnpm', args: ['install'] },
  yarn: { cmd: 'yarn', args: ['install'] },
  bun: { cmd: 'bun', args: ['install'] },
};

/**
 * Check if dependencies are already installed in a bundle
 *
 * This function checks for the existence of the node_modules directory,
 * which indicates that dependencies have been installed.
 *
 * @param bundlePath - Path to the package bundle directory
 * @returns True if node_modules exists, false otherwise
 *
 * @example
 * ```typescript
 * if (await areDependenciesInstalled('./my-server')) {
 *   console.log('Dependencies already installed');
 * } else {
 *   console.log('Need to install dependencies');
 * }
 * ```
 */
export async function areDependenciesInstalled(bundlePath: string): Promise<boolean> {
  try {
    const nodeModulesPath = join(bundlePath, 'node_modules');
    const stats = await stat(nodeModulesPath);
    return stats.isDirectory();
  } catch (error) {
    // node_modules doesn't exist or isn't accessible
    return false;
  }
}

/**
 * Detect which package manager was used based on lock files
 *
 * Detection priority (highest to lowest):
 * 1. pnpm-lock.yaml (pnpm)
 * 2. yarn.lock (yarn)
 * 3. bun.lockb (bun)
 * 4. package-lock.json (npm) or default if no lock file found
 *
 * @param bundlePath - Path to the package bundle directory
 * @returns Detected package manager
 *
 * @example
 * ```typescript
 * const pm = detectPackageManager('./my-server');
 * console.log(`Detected package manager: ${pm}`);
 * // Output: Detected package manager: pnpm
 * ```
 */
export function detectPackageManager(bundlePath: string): PackageManager {
  // Priority order: pnpm > yarn > bun > npm (default)
  const priority: PackageManager[] = ['pnpm', 'yarn', 'bun', 'npm'];

  for (const pm of priority) {
    try {
      const lockFilePath = join(bundlePath, LOCK_FILES[pm]);
      // Synchronous check for lock file existence
      const fs = require('node:fs');
      if (fs.existsSync(lockFilePath)) {
        return pm;
      }
    } catch {
      // Continue to next package manager
      continue;
    }
  }

  // Default to npm if no lock file is found
  return 'npm';
}

/**
 * Get the install command for a package manager
 *
 * @param pm - Package manager to get command for
 * @returns Command object with cmd and args
 *
 * @example
 * ```typescript
 * const { cmd, args } = getInstallCommand('pnpm');
 * console.log(`${cmd} ${args.join(' ')}`);
 * // Output: pnpm install
 * ```
 */
export function getInstallCommand(pm: PackageManager): { cmd: string; args: string[] } {
  return INSTALL_COMMANDS[pm];
}

/**
 * Check if a package manager executable is available in PATH
 *
 * @param pm - Package manager to check
 * @returns True if the package manager is available, false otherwise
 */
async function isPackageManagerAvailable(pm: PackageManager): Promise<boolean> {
  return new Promise((resolve) => {
    // Use 'where' on Windows, 'which' on Unix
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const child = spawn(whichCmd, [pm], {
      stdio: 'ignore',
      shell: true,
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Install dependencies for a bundle
 *
 * This function:
 * 1. Auto-detects or uses the specified package manager
 * 2. Checks if the package manager is available
 * 3. Optionally removes existing node_modules (if force flag is set)
 * 4. Spawns a subprocess to run the install command
 * 5. Shows progress unless silent mode is enabled
 * 6. Handles errors and provides helpful suggestions
 *
 * @param bundlePath - Path to the package bundle directory
 * @param options - Installation options
 * @throws Error if installation fails or package manager is not available
 *
 * @example
 * ```typescript
 * try {
 *   await installDependencies('./my-server', {
 *     packageManager: 'pnpm',
 *     silent: false,
 *     force: false
 *   });
 *   console.log('Dependencies installed successfully');
 * } catch (error) {
 *   console.error('Installation failed:', error.message);
 * }
 * ```
 */
export async function installDependencies(
  bundlePath: string,
  options: InstallOptions = {}
): Promise<void> {
  // Detect or use specified package manager
  const pm = options.packageManager || detectPackageManager(bundlePath);
  const { cmd, args } = getInstallCommand(pm);
  const cwd = options.cwd || bundlePath;
  const silent = options.silent ?? false;
  const force = options.force ?? false;

  // Check if package manager is available
  const isAvailable = await isPackageManagerAvailable(pm);
  if (!isAvailable) {
    const installSuggestions: Record<PackageManager, string> = {
      npm: 'npm is usually included with Node.js. Please reinstall Node.js.',
      pnpm: 'npm install -g pnpm',
      yarn: 'npm install -g yarn',
      bun: 'Visit https://bun.sh for installation instructions',
    };

    throw new Error(
      `Package manager '${pm}' not found.\n` +
      `Install it with: ${installSuggestions[pm]}`
    );
  }

  // If force flag is set, remove existing node_modules
  if (force) {
    const nodeModulesPath = join(bundlePath, 'node_modules');
    try {
      if (!silent) {
        console.error(`[DependencyManager] Removing existing node_modules...`);
      }
      await rm(nodeModulesPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if node_modules doesn't exist
    }
  }

  if (!silent) {
    console.error(`[DependencyManager] Installing dependencies with ${pm}...`);
  }

  return new Promise((resolve, reject) => {
    // Spawn the install process
    const child = spawn(cmd, args, {
      cwd,
      stdio: silent ? 'ignore' : 'inherit',
      shell: true, // Use shell for cross-platform compatibility
      env: process.env,
    });

    // Set timeout (120 seconds max)
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(
        `Installation timed out after 120 seconds (${bundlePath})\n` +
        `Try running '${cmd} ${args.join(' ')}' manually in the bundle directory.`
      ));
    }, 120000);

    // Handle successful completion
    child.on('close', (code) => {
      clearTimeout(timeout);

      if (code === 0) {
        if (!silent) {
          console.error(`[DependencyManager] Dependencies installed successfully`);
        }
        resolve();
      } else {
        const errorMsg =
          `${cmd} ${args.join(' ')} failed with exit code ${code}\n` +
          `Bundle path: ${bundlePath}\n`;

        // Add helpful suggestions based on common error codes
        let suggestion = '';
        if (code === 1) {
          suggestion = `Suggestion: Try running with --force-install flag to resolve conflicts`;
        } else if (code === 127) {
          suggestion = `Suggestion: Package manager '${pm}' may not be installed correctly`;
        }

        reject(new Error(errorMsg + (suggestion ? `\n${suggestion}` : '')));
      }
    });

    // Handle spawn errors (e.g., command not found)
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(
        `Failed to start ${cmd}: ${error.message}\n` +
        `Make sure ${pm} is installed and accessible in PATH`
      ));
    });
  });
}

/**
 * Parse and validate dependencies in package.json
 *
 * This function:
 * 1. Reads package.json from the bundle
 * 2. Checks if all dependencies have version constraints
 * 3. Warns about potentially problematic patterns (e.g., internal @node/* packages)
 *
 * @param bundlePath - Path to the package bundle directory
 * @returns Validation result with missing dependencies and warnings
 *
 * @example
 * ```typescript
 * const { missing, warnings } = await validateDependencies('./my-server');
 * if (missing.length > 0) {
 *   console.log('Missing version constraints:', missing);
 * }
 * if (warnings.length > 0) {
 *   console.log('Warnings:', warnings);
 * }
 * ```
 */
export async function validateDependencies(bundlePath: string): Promise<DependencyValidation> {
  const packageJsonPath = join(bundlePath, 'package.json');
  const missing: string[] = [];
  const warnings: string[] = [];

  try {
    const content = await readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    // Check dependencies and devDependencies
    const depSections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

    for (const section of depSections) {
      const deps = pkg[section];
      if (!deps || typeof deps !== 'object') {
        continue;
      }

      for (const [name, version] of Object.entries(deps)) {
        // Check if version is missing or empty
        if (!version || typeof version !== 'string' || version.trim() === '') {
          missing.push(`${name} (in ${section})`);
        }

        // Warn about internal @node/* packages (these may not be published)
        if (name.startsWith('@node/')) {
          warnings.push(
            `Internal package detected: ${name} - ` +
            `This may not be available on npm registry`
          );
        }

        // Warn about file: protocol dependencies
        if (typeof version === 'string' && version.startsWith('file:')) {
          warnings.push(
            `Local file dependency detected: ${name} - ` +
            `Make sure the path is correct and accessible`
          );
        }

        // Warn about git: protocol dependencies
        if (typeof version === 'string' && version.startsWith('git')) {
          warnings.push(
            `Git dependency detected: ${name} - ` +
            `This may require git to be installed`
          );
        }
      }
    }

    return { missing, warnings };
  } catch (error) {
    // Handle file not found
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'ENOENT') {
      throw new Error(`package.json not found in ${bundlePath}`);
    }
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in package.json: ${error.message}`);
    }
    throw error;
  }
}
