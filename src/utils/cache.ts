import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import { mkdirSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Options for configuring the bundle cache.
 */
export interface CacheOptions {
  /**
   * Directory where cached bundles are stored.
   * Default: ~/.cache/simply-mcp/bundles/
   */
  cacheDir?: string;
}

/**
 * Manages a cache directory for extracted bundles.
 *
 * Uses SHA-256 hashing of absolute archive paths to create deterministic
 * cache directory names. This allows fast lookups and avoids extraction
 * when a bundle has already been cached.
 *
 * @example
 * ```typescript
 * const cache = new BundleCache();
 * const cachePath = cache.getCachePath('/path/to/bundle.tar.gz');
 * if (!cache.isCached('/path/to/bundle.tar.gz')) {
 *   // Extract bundle to cachePath
 * }
 * ```
 */
export class BundleCache {
  private readonly cacheDir: string;

  /**
   * Creates a new BundleCache instance.
   *
   * @param options - Configuration options for the cache
   */
  constructor(options?: CacheOptions) {
    if (options?.cacheDir) {
      this.cacheDir = this.resolveTilde(options.cacheDir);
    } else {
      // Default: ~/.cache/simply-mcp/bundles/
      this.cacheDir = path.join(os.homedir(), '.cache', 'simply-mcp', 'bundles');
    }
  }

  /**
   * Resolves tilde (~) in paths to the user's home directory.
   *
   * @param filePath - Path that may contain ~
   * @returns Resolved absolute path
   */
  private resolveTilde(filePath: string): string {
    if (filePath.startsWith('~/') || filePath === '~') {
      return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
  }

  /**
   * Computes SHA-256 hash of the absolute archive path.
   *
   * @param archivePath - Path to the archive file
   * @returns Hex-encoded SHA-256 hash
   */
  private hashPath(archivePath: string): string {
    // Convert to absolute path for consistent hashing
    const absolutePath = path.resolve(archivePath);
    const hash = crypto.createHash('sha256');
    hash.update(absolutePath);
    return hash.digest('hex');
  }

  /**
   * Gets the cache directory path for a given archive.
   * Creates the parent cache directory if it doesn't exist.
   *
   * @param archivePath - Path to the archive file
   * @returns Absolute path to the cache directory for this archive
   */
  getCachePath(archivePath: string): string {
    const hash = this.hashPath(archivePath);
    const cachePath = path.join(this.cacheDir, hash);

    // Create parent cache directory if needed (sync to keep method synchronous)
    try {
      mkdirSync(this.cacheDir, { recursive: true });
    } catch (err) {
      // Ignore errors if directory already exists
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err;
      }
    }

    return cachePath;
  }

  /**
   * Checks if a bundle is already cached.
   *
   * A bundle is considered cached if its cache directory exists and contains files.
   *
   * @param archivePath - Path to the archive file
   * @returns True if the bundle is cached, false otherwise
   */
  async isCached(archivePath: string): Promise<boolean> {
    const cachePath = this.getCachePath(archivePath);

    try {
      const stats = await fs.stat(cachePath);
      if (!stats.isDirectory()) {
        return false;
      }

      // Check if directory contains any files
      const entries = await fs.readdir(cachePath);
      return entries.length > 0;
    } catch (err) {
      // Directory doesn't exist or is inaccessible
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  }

  /**
   * Cleans old cache entries.
   *
   * Removes cache directories that haven't been accessed in longer than maxAge.
   * If maxAge is not specified, no cleaning is performed.
   *
   * @param maxAge - Maximum age in milliseconds. Cache entries older than this are removed.
   * @returns Promise that resolves when cleaning is complete
   */
  async clean(maxAge?: number): Promise<void> {
    if (maxAge === undefined) {
      return;
    }

    try {
      const entries = await fs.readdir(this.cacheDir);
      const now = Date.now();

      for (const entry of entries) {
        const entryPath = path.join(this.cacheDir, entry);

        try {
          const stats = await fs.stat(entryPath);

          if (stats.isDirectory()) {
            // Check last access time
            const age = now - stats.atimeMs;

            if (age > maxAge) {
              // Remove old cache entry
              await fs.rm(entryPath, { recursive: true, force: true });
            }
          }
        } catch (err) {
          // Skip entries that can't be accessed
          continue;
        }
      }
    } catch (err) {
      // Cache directory doesn't exist or is inaccessible
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      throw err;
    }
  }
}
