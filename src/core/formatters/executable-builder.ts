/**
 * DEPRECATED: Executable builder functionality has been removed
 *
 * The executable format was removed in v3.2.0 due to:
 * - Security vulnerability in pkg package (CVE-2024-24828)
 * - Bloated binary sizes (~120 MB) unsuitable for MCP servers
 * - Node.js SEA approach was not production-ready
 *
 * Alternative formats:
 * - Use 'single-file' format for portable bundles
 * - Use 'standalone' format for npm packages
 *
 * @deprecated This module exists only for backward compatibility with existing tests
 */

import { existsSync, statSync } from 'fs';

/**
 * @deprecated Executable builder was removed in v3.2.0
 * @throws Error indicating the feature was removed
 */
export async function createExecutable(): Promise<never> {
  throw new Error(
    'createExecutable() was removed in v3.2.0.\n' +
    'The executable format was deprecated due to security concerns and large binary sizes.\n' +
    'Please use --format single-file or --format standalone instead.'
  );
}

/**
 * Validate that a file exists and is executable
 * This function is kept for backward compatibility but does not create executables
 *
 * @param path - Path to executable to validate
 * @returns true if file exists and is a regular file, false otherwise
 */
export async function validateExecutable(path: string): Promise<boolean> {
  try {
    if (!existsSync(path)) {
      return false;
    }

    const stats = statSync(path);

    // Return true only if it's a file (not a directory)
    return stats.isFile();
  } catch {
    return false;
  }
}
