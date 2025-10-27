/**
 * UI File Resolver - Secure file loading for UI resources
 *
 * Resolves relative file paths and loads contents with security validation.
 * Files are cached for performance and invalidated on change (in watch mode).
 */

import { readFile, stat } from 'fs/promises';
import { dirname, resolve, isAbsolute, normalize, extname } from 'path';

/**
 * File resolution result
 */
export interface ResolvedFile {
  path: string;           // Absolute resolved path
  content: string;        // File content
  mimeType: string;       // Inferred MIME type
  size: number;           // File size in bytes
}

/**
 * File resolver options
 */
export interface FileResolverOptions {
  serverFilePath: string;     // Server file path (for relative resolution)
  cache?: boolean;            // Enable caching (default: true)
  verbose?: boolean;          // Enable logging (default: false)
}

/**
 * File cache for performance
 */
const fileCache = new Map<string, ResolvedFile>();

/**
 * Resolve and load a UI file with security validation
 *
 * @param filePath - Relative path to file (e.g., './ui/calculator.html')
 * @param options - Resolution options
 * @returns Resolved file with content
 * @throws Error if path is invalid or file cannot be read
 */
export async function resolveUIFile(
  filePath: string,
  options: FileResolverOptions
): Promise<ResolvedFile> {
  // Step 1: Validate path (security checks)
  validateFilePath(filePath);

  // Step 2: Resolve to absolute path
  const serverDir = dirname(options.serverFilePath);
  const absolutePath = resolve(serverDir, filePath);

  // Step 3: Security check - ensure resolved path is within server directory
  if (!isPathWithinDirectory(absolutePath, serverDir)) {
    throw new Error(
      `Security violation: File path "${filePath}" resolves outside server directory.\n` +
      `Resolved to: ${absolutePath}\n` +
      `Server directory: ${serverDir}\n` +
      `Hint: Use relative paths within the server directory (e.g., './ui/file.html')`
    );
  }

  // Step 4: Check cache
  const cacheEnabled = options.cache !== false;
  if (cacheEnabled && fileCache.has(absolutePath)) {
    if (options.verbose) {
      console.log(`[File Resolver] Cache hit: ${filePath}`);
    }
    return fileCache.get(absolutePath)!;
  }

  // Step 5: Load file
  try {
    const content = await readFile(absolutePath, 'utf-8');
    const stats = await stat(absolutePath);
    const mimeType = inferMimeType(absolutePath);

    const resolved: ResolvedFile = {
      path: absolutePath,
      content,
      mimeType,
      size: stats.size,
    };

    // Step 6: Cache result
    if (cacheEnabled) {
      fileCache.set(absolutePath, resolved);
    }

    if (options.verbose) {
      console.log(`[File Resolver] Loaded: ${filePath} (${stats.size} bytes)`);
    }

    return resolved;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `File not found: "${filePath}"\n` +
        `Resolved to: ${absolutePath}\n` +
        `Server file: ${options.serverFilePath}\n` +
        `Hint: Ensure the file exists relative to the server file.`
      );
    } else if (error.code === 'EACCES') {
      throw new Error(
        `Permission denied: "${filePath}"\n` +
        `Resolved to: ${absolutePath}\n` +
        `Hint: Check file permissions.`
      );
    } else {
      throw new Error(
        `Failed to read file: "${filePath}"\n` +
        `Error: ${error.message}`
      );
    }
  }
}

/**
 * Validate file path (security checks)
 */
function validateFilePath(filePath: string): void {
  // Check for empty path
  if (!filePath || filePath.trim() === '') {
    throw new Error('File path cannot be empty');
  }

  // Check for absolute paths (Unix-style)
  if (isAbsolute(filePath)) {
    throw new Error(
      `Security violation: Absolute paths not allowed: "${filePath}"\n` +
      `Hint: Use relative paths (e.g., './ui/file.html' instead of '/absolute/path')`
    );
  }

  // Check for absolute paths (Windows-style: C:\, D:\, etc.)
  if (/^[a-zA-Z]:[/\\]/.test(filePath)) {
    throw new Error(
      `Security violation: Absolute paths not allowed: "${filePath}"\n` +
      `Hint: Use relative paths (e.g., './ui/file.html' instead of 'C:\\absolute\\path')`
    );
  }

  // Check for parent directory traversal
  if (filePath.includes('..')) {
    throw new Error(
      `Security violation: Parent directory traversal not allowed: "${filePath}"\n` +
      `Hint: Do not use '..' in file paths. Keep files within the server directory.`
    );
  }
}

/**
 * Check if resolved path is within allowed directory
 */
function isPathWithinDirectory(resolvedPath: string, allowedDir: string): boolean {
  const normalizedResolved = normalize(resolvedPath);
  const normalizedAllowed = normalize(allowedDir);
  return normalizedResolved.startsWith(normalizedAllowed);
}

/**
 * Infer MIME type from file extension
 */
function inferMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.jsx': 'application/javascript',
    '.ts': 'application/typescript',
    '.tsx': 'application/typescript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
  };
  return mimeTypes[ext] || 'text/plain';
}

/**
 * Invalidate cache for a file (used in watch mode)
 */
export function invalidateFileCache(absolutePath: string): void {
  fileCache.delete(absolutePath);
}

/**
 * Clear entire file cache
 */
export function clearFileCache(): void {
  fileCache.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getFileCacheStats(): { size: number; files: string[] } {
  return {
    size: fileCache.size,
    files: Array.from(fileCache.keys()),
  };
}
