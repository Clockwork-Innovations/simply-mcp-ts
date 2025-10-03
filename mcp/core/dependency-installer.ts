/**
 * Dependency installer - Execute package manager to install dependencies
 * Feature 3: Auto-Installation
 */

import { spawn } from 'child_process';
import { access } from 'fs/promises';
import { join } from 'path';
import { InstallOptions, InstallResult, InstallProgressEvent, InstallError, PackageManager } from './installation-types.js';
import { detectPackageManager, isPackageManagerAvailable, getLockFileName } from './package-manager-detector.js';
import { validatePackageName, validateSemverRange } from './dependency-validator.js';

/**
 * Install dependencies using detected package manager
 *
 * @param dependencies - Dependencies to install (package -> version map)
 * @param options - Installation options
 * @returns Installation result
 *
 * @example
 * ```typescript
 * const result = await installDependencies({
 *   'axios': '^1.6.0',
 *   'zod': '^3.22.0'
 * });
 * console.log(result.installed); // ['axios@^1.6.0', 'zod@^3.22.0']
 * ```
 */
export async function installDependencies(
  dependencies: Record<string, string>,
  options: InstallOptions = {}
): Promise<InstallResult> {
  const startTime = Date.now();
  const {
    packageManager: pmOption = 'auto',
    cwd = process.cwd(),
    timeout = 5 * 60 * 1000, // 5 minutes default
    retries = 3,
    ignoreScripts = true,
    production = false,
    force = false,
    onProgress,
    onError,
  } = options;

  const installed: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];
  const errors: InstallError[] = [];
  const warnings: string[] = [];

  // Detect package manager
  const pmInfo = await detectPackageManager(cwd, pmOption === 'auto' ? undefined : pmOption);

  if (!pmInfo.available) {
    const error: InstallError = {
      message: `Package manager '${pmInfo.name}' is not installed. Please install it first.`,
      code: 'PACKAGE_MANAGER_NOT_FOUND',
    };
    errors.push(error);
    if (onError) onError(error);

    return {
      success: false,
      installed: [],
      failed: Object.keys(dependencies),
      skipped: [],
      packageManager: pmInfo.name,
      lockFile: null,
      duration: Date.now() - startTime,
      errors,
      warnings,
    };
  }

  const packageManager = pmInfo.name;

  // Emit start event
  if (onProgress) {
    onProgress({
      type: 'start',
      message: `Installing ${Object.keys(dependencies).length} packages with ${packageManager}...`,
      timestamp: Date.now(),
    });
  }

  // Validate all packages first
  for (const [name, version] of Object.entries(dependencies)) {
    const nameValidation = validatePackageName(name);
    if (!nameValidation.valid) {
      const error: InstallError = {
        packageName: name,
        message: nameValidation.error || `Invalid package name: ${name}`,
        code: 'INVALID_PACKAGE',
      };
      errors.push(error);
      failed.push(`${name}@${version}`);
      if (onError) onError(error);
      continue;
    }

    const versionValidation = validateSemverRange(version);
    if (!versionValidation.valid) {
      const error: InstallError = {
        packageName: name,
        message: versionValidation.error || `Invalid version: ${version}`,
        code: 'INVALID_VERSION',
      };
      errors.push(error);
      failed.push(`${name}@${version}`);
      if (onError) onError(error);
    }
  }

  // If all packages failed validation, return early
  // But only if there were actually packages to validate (not empty dependencies)
  if (failed.length > 0 && failed.length === Object.keys(dependencies).length) {
    return {
      success: false,
      installed: [],
      failed,
      skipped: [],
      packageManager,
      lockFile: null,
      duration: Date.now() - startTime,
      errors,
      warnings,
    };
  }

  // Build package list for installation
  const packagesToInstall = Object.entries(dependencies)
    .filter(([name, version]) => !failed.includes(`${name}@${version}`))
    .map(([name, version]) => `${name}@${version}`);

  if (packagesToInstall.length === 0) {
    return {
      success: true,
      installed: [],
      failed: [],
      skipped: [],
      packageManager,
      lockFile: null,
      duration: Date.now() - startTime,
      errors: [],
      warnings,
    };
  }

  // Build install command
  const args = buildInstallArgs(packageManager, packagesToInstall, {
    ignoreScripts,
    production,
  });

  // Execute installation with retries
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Emit progress
      if (onProgress) {
        onProgress({
          type: 'progress',
          message: `Installing packages (attempt ${attempt}/${retries})...`,
          timestamp: Date.now(),
        });
      }

      const result = await executeInstall(packageManager, args, {
        cwd,
        timeout,
        onOutput: (line) => {
          // Parse and report progress from package manager output
          if (onProgress) {
            const event = parseInstallOutput(line, packageManager);
            if (event) {
              onProgress(event);
            }
          }
        },
      });

      // Installation succeeded
      installed.push(...packagesToInstall);
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === retries) {
        // All retries failed
        const installError: InstallError = {
          message: lastError.message,
          code: 'INSTALLATION_FAILED',
          stack: lastError.stack,
        };
        errors.push(installError);
        failed.push(...packagesToInstall);
        if (onError) onError(installError);
      } else {
        // Retry with exponential backoff
        await delay(Math.pow(2, attempt - 1) * 1000);
      }
    }
  }

  // Verify lock file was created/updated
  let lockFile: string | null = null;
  const lockFilePath = join(cwd, pmInfo.lockFile);
  try {
    await access(lockFilePath);
    lockFile = lockFilePath;
  } catch {
    warnings.push(`Lock file not generated: ${pmInfo.lockFile}`);
  }

  // Emit complete event
  if (onProgress) {
    onProgress({
      type: 'complete',
      message: `Installation complete: ${installed.length} installed, ${failed.length} failed`,
      timestamp: Date.now(),
    });
  }

  return {
    success: errors.length === 0,
    installed,
    failed,
    skipped,
    packageManager,
    lockFile,
    duration: Date.now() - startTime,
    errors,
    warnings,
  };
}

/**
 * Build install command arguments for package manager
 */
function buildInstallArgs(
  packageManager: PackageManager,
  packages: string[],
  options: {
    ignoreScripts?: boolean;
    production?: boolean;
  }
): string[] {
  const { ignoreScripts = true, production = false } = options;

  let args: string[];

  switch (packageManager) {
    case 'npm':
      args = ['install', ...packages, '--save'];
      if (ignoreScripts) args.push('--ignore-scripts');
      if (production) args.push('--production');
      break;

    case 'yarn':
      args = ['add', ...packages];
      if (ignoreScripts) args.push('--ignore-scripts');
      if (production) args.push('--production');
      break;

    case 'pnpm':
      args = ['add', ...packages];
      if (ignoreScripts) args.push('--ignore-scripts');
      if (production) args.push('--prod');
      break;

    case 'bun':
      args = ['add', ...packages];
      if (production) args.push('--production');
      break;
  }

  return args;
}

/**
 * Execute package manager install command
 */
async function executeInstall(
  packageManager: string,
  args: string[],
  options: {
    cwd: string;
    timeout: number;
    onOutput?: (line: string) => void;
  }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { cwd, timeout, onOutput } = options;

  return new Promise((resolve, reject) => {
    const proc = spawn(packageManager, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timeoutHandle: NodeJS.Timeout | null = null;

    // Set timeout
    if (timeout > 0) {
      timeoutHandle = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Installation timeout after ${timeout}ms`));
      }, timeout);
    }

    // Capture stdout
    proc.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;

      // Call output handler for each line
      if (onOutput) {
        const lines = text.split('\n').filter((l: string) => l.trim());
        lines.forEach(onOutput);
      }
    });

    // Capture stderr
    proc.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;

      // Also process stderr for progress
      if (onOutput) {
        const lines = text.split('\n').filter((l: string) => l.trim());
        lines.forEach(onOutput);
      }
    });

    // Handle process completion
    proc.on('close', (code) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (code === 0) {
        resolve({ stdout, stderr, exitCode: code });
      } else {
        reject(new Error(`${packageManager} exited with code ${code}\n${stderr || stdout}`));
      }
    });

    // Handle process errors
    proc.on('error', (error) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      reject(error);
    });
  });
}

/**
 * Parse installation output to extract progress information
 */
function parseInstallOutput(line: string, packageManager: string): InstallProgressEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // npm patterns
  if (packageManager === 'npm') {
    if (trimmed.includes('added')) {
      return {
        type: 'progress',
        message: trimmed,
        timestamp: Date.now(),
      };
    }
    if (trimmed.startsWith('npm WARN') || trimmed.startsWith('npm notice')) {
      return {
        type: 'progress',
        message: trimmed,
        timestamp: Date.now(),
      };
    }
  }

  // yarn patterns
  if (packageManager === 'yarn') {
    if (trimmed.includes('success')) {
      return {
        type: 'progress',
        message: trimmed,
        timestamp: Date.now(),
      };
    }
  }

  // pnpm patterns
  if (packageManager === 'pnpm') {
    if (trimmed.includes('Progress')) {
      return {
        type: 'progress',
        message: trimmed,
        timestamp: Date.now(),
      };
    }
  }

  // Generic progress indicator
  if (trimmed.includes('installing') || trimmed.includes('downloading') || trimmed.includes('resolving')) {
    return {
      type: 'progress',
      message: trimmed,
      timestamp: Date.now(),
    };
  }

  return null;
}

/**
 * Delay helper for retries
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
