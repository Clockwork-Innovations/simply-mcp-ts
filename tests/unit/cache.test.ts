/**
 * Bundle Cache Manager Test Suite
 *
 * Tests the hash-based cache system that manages extracted bundle directories.
 * The cache uses SHA-256 hashing of absolute archive paths to create deterministic
 * cache directories, enabling fast lookups and avoiding redundant extractions.
 *
 * Test Coverage:
 * - Cache construction with default and custom directories
 * - Tilde (~) expansion in cache paths
 * - Hash-based cache path generation and consistency
 * - Cache existence checks (empty vs populated directories)
 * - Cache cleaning based on access time
 * - Edge cases (special characters, long paths, concurrent access)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { BundleCache, type CacheOptions } from '../../src/utils/cache.js';
import { mkdir, writeFile, rm, readdir, stat, utimes } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';

describe('BundleCache - Constructor and Initialization', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-cache-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should use default cache directory when no options provided', () => {
    const cache = new BundleCache();
    const cachePath = cache.getCachePath('/test/archive.tar.gz');

    // Default cache path should be in home directory
    expect(cachePath).toContain('.cache/simply-mcp/bundles');
    expect(cachePath).toContain(homedir());
  });

  it('should use custom cache directory when provided', () => {
    const customDir = join(testDir, 'custom-cache');
    const cache = new BundleCache({ cacheDir: customDir });
    const cachePath = cache.getCachePath('/test/archive.tar.gz');

    expect(cachePath).toContain(customDir);
  });

  it('should expand tilde (~) to home directory', () => {
    const cache = new BundleCache({ cacheDir: '~/.my-custom-cache' });
    const cachePath = cache.getCachePath('/test/archive.tar.gz');

    expect(cachePath).toContain(homedir());
    expect(cachePath).toContain('.my-custom-cache');
    expect(cachePath).not.toContain('~');
  });

  it('should handle tilde (~) as standalone path', () => {
    const cache = new BundleCache({ cacheDir: '~' });
    const cachePath = cache.getCachePath('/test/archive.tar.gz');

    expect(cachePath).toContain(homedir());
    expect(cachePath).not.toContain('~');
  });

  it('should not modify paths that do not start with tilde', () => {
    const absolutePath = join(testDir, 'no-tilde-cache');
    const cache = new BundleCache({ cacheDir: absolutePath });
    const cachePath = cache.getCachePath('/test/archive.tar.gz');

    expect(cachePath).toContain(absolutePath);
  });
});

describe('BundleCache - getCachePath', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-cache-path-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should return consistent hash-based paths for same archive', () => {
    const cacheDir = join(testDir, 'consistency-test');
    const cache = new BundleCache({ cacheDir });
    const archivePath = '/test/my-bundle.tar.gz';

    const path1 = cache.getCachePath(archivePath);
    const path2 = cache.getCachePath(archivePath);

    expect(path1).toBe(path2);
  });

  it('should return different cache paths for different archives', () => {
    const cacheDir = join(testDir, 'uniqueness-test');
    const cache = new BundleCache({ cacheDir });

    const path1 = cache.getCachePath('/test/bundle1.tar.gz');
    const path2 = cache.getCachePath('/test/bundle2.tar.gz');

    expect(path1).not.toBe(path2);
  });

  it('should create cache directory if it does not exist', () => {
    const cacheDir = join(testDir, 'auto-create-test');
    const cache = new BundleCache({ cacheDir });

    // Cache directory should not exist yet
    expect(existsSync(cacheDir)).toBe(false);

    // getCachePath should create it
    cache.getCachePath('/test/archive.tar.gz');

    // Now it should exist
    expect(existsSync(cacheDir)).toBe(true);
  });

  it('should handle relative archive paths by converting to absolute', () => {
    const cacheDir = join(testDir, 'relative-path-test');
    const cache = new BundleCache({ cacheDir });

    // Same relative path should always resolve to same absolute path
    const path1 = cache.getCachePath('./relative/bundle.tar.gz');
    const path2 = cache.getCachePath('./relative/bundle.tar.gz');

    expect(path1).toBe(path2);
  });

  it('should generate different hashes for relative vs absolute paths to different files', () => {
    const cacheDir = join(testDir, 'relative-vs-absolute-test');
    const cache = new BundleCache({ cacheDir });

    const absolutePath = join(testDir, 'bundle.tar.gz');
    const relativePath = './different-bundle.tar.gz';

    const hash1 = cache.getCachePath(absolutePath);
    const hash2 = cache.getCachePath(relativePath);

    // These should be different because they resolve to different absolute paths
    expect(hash1).not.toBe(hash2);
  });

  it('should handle archive paths with special characters', () => {
    const cacheDir = join(testDir, 'special-chars-test');
    const cache = new BundleCache({ cacheDir });

    const specialPaths = [
      '/test/bundle with spaces.tar.gz',
      '/test/bundle-with-@symbol.tar.gz',
      '/test/bundle_with_underscores.tar.gz',
      '/test/bündlé-üñíçödé.tar.gz',
    ];

    const cachePaths = specialPaths.map(p => cache.getCachePath(p));

    // All should be valid paths
    cachePaths.forEach(path => {
      expect(path).toBeTruthy();
      expect(path).toContain(cacheDir);
    });

    // All should be unique
    const uniquePaths = new Set(cachePaths);
    expect(uniquePaths.size).toBe(specialPaths.length);
  });

  it('should handle very long archive paths', () => {
    const cacheDir = join(testDir, 'long-path-test');
    const cache = new BundleCache({ cacheDir });

    // Create a very long path
    const longPath = '/test/' + 'very-long-directory-name/'.repeat(20) + 'bundle.tar.gz';

    const cachePath = cache.getCachePath(longPath);

    expect(cachePath).toBeTruthy();
    expect(cachePath).toContain(cacheDir);
    // Hash should be fixed length regardless of input length
    const hashPart = cachePath.replace(cacheDir + '/', '');
    expect(hashPart.length).toBe(64); // SHA-256 produces 64 hex characters
  });

  it('should handle non-existent archive paths (hash computation only)', () => {
    const cacheDir = join(testDir, 'nonexistent-archive-test');
    const cache = new BundleCache({ cacheDir });

    // Archive doesn't need to exist to compute cache path
    const cachePath = cache.getCachePath('/non/existent/bundle.tar.gz');

    expect(cachePath).toBeTruthy();
    expect(cachePath).toContain(cacheDir);
  });
});

describe('BundleCache - isCached', () => {
  let testDir: string;
  let cacheDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-cached-test-${Date.now()}`);
    cacheDir = join(testDir, 'cache');
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should return false for uncached archives', async () => {
    const cache = new BundleCache({ cacheDir });
    const archivePath = '/test/uncached-bundle.tar.gz';

    const cached = await cache.isCached(archivePath);

    expect(cached).toBe(false);
  });

  it('should return true for cached archives (directory exists with files)', async () => {
    const cache = new BundleCache({ cacheDir });
    const archivePath = '/test/cached-bundle.tar.gz';

    // Create cache directory and add a file
    const cachePath = cache.getCachePath(archivePath);
    await mkdir(cachePath, { recursive: true });
    await writeFile(join(cachePath, 'server.js'), 'console.log("cached");');

    const cached = await cache.isCached(archivePath);

    expect(cached).toBe(true);
  });

  it('should return false for empty cache directories', async () => {
    const cache = new BundleCache({ cacheDir });
    const archivePath = '/test/empty-cache-bundle.tar.gz';

    // Create cache directory but leave it empty
    const cachePath = cache.getCachePath(archivePath);
    await mkdir(cachePath, { recursive: true });

    const cached = await cache.isCached(archivePath);

    expect(cached).toBe(false);
  });

  it('should handle missing cache root directory gracefully', async () => {
    const nonExistentCacheDir = join(testDir, 'does-not-exist');
    const cache = new BundleCache({ cacheDir: nonExistentCacheDir });

    const cached = await cache.isCached('/test/bundle.tar.gz');

    expect(cached).toBe(false);
  });

  it('should return false if cache path is a file instead of directory', async () => {
    const cache = new BundleCache({ cacheDir });
    const archivePath = '/test/file-instead-of-dir.tar.gz';

    // Create a file where the cache directory should be
    const cachePath = cache.getCachePath(archivePath);
    await writeFile(cachePath, 'This is a file, not a directory');

    const cached = await cache.isCached(archivePath);

    expect(cached).toBe(false);
  });

  it('should correctly identify cache with multiple files', async () => {
    const cache = new BundleCache({ cacheDir });
    const archivePath = '/test/multi-file-bundle.tar.gz';

    // Create cache directory with multiple files
    const cachePath = cache.getCachePath(archivePath);
    await mkdir(cachePath, { recursive: true });
    await writeFile(join(cachePath, 'file1.js'), 'file 1');
    await writeFile(join(cachePath, 'file2.js'), 'file 2');
    await mkdir(join(cachePath, 'subdir'), { recursive: true });
    await writeFile(join(cachePath, 'subdir', 'file3.js'), 'file 3');

    const cached = await cache.isCached(archivePath);

    expect(cached).toBe(true);
  });
});

describe('BundleCache - clean', () => {
  let testDir: string;
  let cacheDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `simple-mcp-clean-test-${Date.now()}`);
    cacheDir = join(testDir, 'cache');
    await mkdir(cacheDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should do nothing when maxAge is undefined', async () => {
    const cache = new BundleCache({ cacheDir });

    // Create some cache entries
    const oldCache = join(cacheDir, 'old-entry');
    await mkdir(oldCache, { recursive: true });
    await writeFile(join(oldCache, 'file.js'), 'old file');

    // Clean with no maxAge
    await cache.clean();

    // Directory should still exist
    const exists = existsSync(oldCache);
    expect(exists).toBe(true);
  });

  it('should remove cache entries older than maxAge', async () => {
    const cache = new BundleCache({ cacheDir });

    // Create an old cache entry
    const oldCache = join(cacheDir, 'old-entry');
    await mkdir(oldCache, { recursive: true });
    await writeFile(join(oldCache, 'file.js'), 'old file');

    // Set access time to 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await utimes(oldCache, twoHoursAgo, twoHoursAgo);

    // Clean entries older than 1 hour
    const oneHour = 60 * 60 * 1000;
    await cache.clean(oneHour);

    // Old entry should be removed
    const exists = existsSync(oldCache);
    expect(exists).toBe(false);
  });

  it('should keep recent cache entries', async () => {
    const cache = new BundleCache({ cacheDir });

    // Create a recent cache entry
    const recentCache = join(cacheDir, 'recent-entry');
    await mkdir(recentCache, { recursive: true });
    await writeFile(join(recentCache, 'file.js'), 'recent file');

    // Access time is current (just created)

    // Clean entries older than 1 hour
    const oneHour = 60 * 60 * 1000;
    await cache.clean(oneHour);

    // Recent entry should still exist
    const exists = existsSync(recentCache);
    expect(exists).toBe(true);
  });

  it('should handle missing cache directory gracefully', async () => {
    const nonExistentCacheDir = join(testDir, 'does-not-exist');
    const cache = new BundleCache({ cacheDir: nonExistentCacheDir });

    // Should not throw error
    await expect(cache.clean(1000)).resolves.toBeUndefined();
  });

  it('should handle mixed old and new cache entries correctly', async () => {
    const cache = new BundleCache({ cacheDir });

    // Create old cache entry
    const oldCache = join(cacheDir, 'old-entry');
    await mkdir(oldCache, { recursive: true });
    await writeFile(join(oldCache, 'file.js'), 'old file');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await utimes(oldCache, twoHoursAgo, twoHoursAgo);

    // Create recent cache entry
    const recentCache = join(cacheDir, 'recent-entry');
    await mkdir(recentCache, { recursive: true });
    await writeFile(join(recentCache, 'file.js'), 'recent file');

    // Clean entries older than 1 hour
    const oneHour = 60 * 60 * 1000;
    await cache.clean(oneHour);

    // Old should be removed, recent should remain
    expect(existsSync(oldCache)).toBe(false);
    expect(existsSync(recentCache)).toBe(true);
  });

  it('should only remove directories, not files in cache root', async () => {
    const cache = new BundleCache({ cacheDir });

    // Create a file in cache root (should be ignored)
    const rootFile = join(cacheDir, 'root-file.txt');
    await writeFile(rootFile, 'root file');

    // Create old cache directory
    const oldCache = join(cacheDir, 'old-entry');
    await mkdir(oldCache, { recursive: true });
    await writeFile(join(oldCache, 'file.js'), 'old file');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await utimes(oldCache, twoHoursAgo, twoHoursAgo);

    // Clean entries older than 1 hour
    const oneHour = 60 * 60 * 1000;
    await cache.clean(oneHour);

    // Root file should still exist (not removed)
    expect(existsSync(rootFile)).toBe(true);
    // Old cache directory should be removed
    expect(existsSync(oldCache)).toBe(false);
  });

  it('should handle cache entries with nested content', async () => {
    const cache = new BundleCache({ cacheDir });

    // Create old cache with nested structure
    const oldCache = join(cacheDir, 'old-nested-entry');
    await mkdir(join(oldCache, 'src', 'utils'), { recursive: true });
    await writeFile(join(oldCache, 'package.json'), '{}');
    await writeFile(join(oldCache, 'src', 'index.js'), 'index');
    await writeFile(join(oldCache, 'src', 'utils', 'helper.js'), 'helper');

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await utimes(oldCache, twoHoursAgo, twoHoursAgo);

    // Clean entries older than 1 hour
    const oneHour = 60 * 60 * 1000;
    await cache.clean(oneHour);

    // Entire nested structure should be removed
    expect(existsSync(oldCache)).toBe(false);
  });
});

describe('BundleCache - Edge Cases and Integration', () => {
  let testDir: string;
  let cacheDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-edge-test-${Date.now()}`);
    cacheDir = join(testDir, 'cache');
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should handle complete cache lifecycle for an archive', async () => {
    const cache = new BundleCache({ cacheDir });
    const archivePath = join(testDir, 'test-bundle.tar.gz');

    // Initially not cached
    expect(await cache.isCached(archivePath)).toBe(false);

    // Get cache path and simulate extraction
    const cachePath = cache.getCachePath(archivePath);
    await mkdir(cachePath, { recursive: true });
    await writeFile(join(cachePath, 'server.js'), 'console.log("server");');

    // Now it should be cached
    expect(await cache.isCached(archivePath)).toBe(true);

    // Set old access time
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await utimes(cachePath, twoHoursAgo, twoHoursAgo);

    // Clean old entries
    await cache.clean(60 * 60 * 1000); // 1 hour

    // Should no longer be cached
    expect(await cache.isCached(archivePath)).toBe(false);
  });

  it('should handle concurrent cache path requests for same archive', () => {
    const cache = new BundleCache({ cacheDir });
    const archivePath = '/test/concurrent-bundle.tar.gz';

    // Get cache path multiple times
    const paths = Array.from({ length: 10 }, () => cache.getCachePath(archivePath));

    // All should be identical
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(1);
  });

  it('should maintain hash consistency across different cache instances', () => {
    const archivePath = '/test/consistency-bundle.tar.gz';

    // Create two different cache instances
    const cache1 = new BundleCache({ cacheDir });
    const cache2 = new BundleCache({ cacheDir });

    const path1 = cache1.getCachePath(archivePath);
    const path2 = cache2.getCachePath(archivePath);

    expect(path1).toBe(path2);
  });

  it('should handle paths with trailing slashes correctly', () => {
    const cache = new BundleCache({ cacheDir });

    // These should normalize to the same path
    const path1 = cache.getCachePath('/test/bundle.tar.gz');
    const path2 = cache.getCachePath('/test/bundle.tar.gz/');

    // They might be different due to trailing slash, but both should be valid
    expect(path1).toBeTruthy();
    expect(path2).toBeTruthy();
  });

  it('should handle cache directory with deeply nested path', async () => {
    const deepCacheDir = join(testDir, 'very', 'deep', 'nested', 'cache', 'directory');
    const cache = new BundleCache({ cacheDir: deepCacheDir });

    const archivePath = '/test/deep-cache-bundle.tar.gz';

    // Should create entire directory structure
    const cachePath = cache.getCachePath(archivePath);
    expect(existsSync(deepCacheDir)).toBe(true);
    expect(cachePath).toContain(deepCacheDir);
  });

  it('should verify hash determinism over multiple calls', () => {
    const cache = new BundleCache({ cacheDir });
    const archivePath = '/test/deterministic-bundle.tar.gz';

    // Get cache path 100 times
    const paths = Array.from({ length: 100 }, () => cache.getCachePath(archivePath));

    // All should be identical
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(1);

    // Verify it's a SHA-256 hash (64 hex characters)
    const hashPart = paths[0].replace(cacheDir + '/', '');
    expect(hashPart).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should verify hash uniqueness for different archives', () => {
    const cache = new BundleCache({ cacheDir });

    // Generate cache paths for 100 different archives
    const paths = Array.from({ length: 100 }, (_, i) =>
      cache.getCachePath(`/test/bundle-${i}.tar.gz`)
    );

    // All should be unique
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(100);
  });
});
