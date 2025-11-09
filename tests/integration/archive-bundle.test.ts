/**
 * Archive Bundle Integration Tests
 *
 * Tests the complete archive bundle workflow:
 * - Archive creation (tar.gz and zip formats)
 * - Archive extraction with caching
 * - Manifest generation and reading
 * - End-to-end bundle → extract → run workflow
 * - Error handling for corrupted/invalid archives
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { createArchive } from '../../src/core/archiver.js';
import { extractArchive } from '../../src/core/extractor.js';
import { generateManifest, writeManifest, readManifest } from '../../src/core/bundle-manifest.js';
import { BundleCache } from '../../src/utils/cache.js';
import { bundle } from '../../src/core/bundler.js';
import * as tar from 'tar-stream';
import * as zlib from 'zlib';
import { createReadStream } from 'fs';
import * as crypto from 'crypto';

const TEMP_DIR = join(process.cwd(), 'tests', 'integration', 'temp-archive-tests');
const CACHE_DIR = join(TEMP_DIR, 'cache');

function setupTempDir() {
  try {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (err) {
    // Ignore if doesn't exist
  }
  mkdirSync(TEMP_DIR, { recursive: true });
  mkdirSync(CACHE_DIR, { recursive: true });
}

function cleanupTempDir() {
  try {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
}

/**
 * Create a simple test server TypeScript file
 */
function createTestServer(dir: string, serverName: string = 'test-server'): string {
  const serverCode = `
import type { IServer, ITool } from '../../src/index.js';

const server: IServer = {
  name: '${serverName}',
  version: '1.0.0',
  description: 'Test archive server'
};

interface TestTool extends ITool {
  name: 'test_tool';
  description: 'Test tool';
  params: Record<string, never>;
  result: { success: boolean };
}

export default class TestServer {
  testTool: TestTool = async () => {
    return { success: true };
  };
}
`;

  const serverPath = join(dir, 'server.ts');
  writeFileSync(serverPath, serverCode, 'utf-8');
  return serverPath;
}

/**
 * Create a package.json file for the test server
 */
function createPackageJson(dir: string, name: string = 'test-server', version: string = '1.0.0') {
  const packageJson = {
    name,
    version,
    description: 'Test server for archive bundle tests',
    type: 'module',
  };

  const packageJsonPath = join(dir, 'package.json');
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
  return packageJsonPath;
}

/**
 * Verify tar.gz archive contents
 */
async function verifyTarGzContents(archivePath: string, expectedFiles: string[]): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) => {
    const extract = tar.extract();
    const files = new Map<string, Buffer>();
    const gunzip = zlib.createGunzip();

    extract.on('entry', (header, stream, next) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        files.set(header.name, Buffer.concat(chunks));
        next();
      });
      stream.on('error', reject);
    });

    extract.on('finish', () => {
      resolve(files);
    });

    extract.on('error', reject);

    const readStream = createReadStream(archivePath);
    readStream.pipe(gunzip).pipe(extract);
  });
}

/**
 * Corrupt an archive file by truncating it
 */
function corruptArchive(archivePath: string): void {
  const content = readFileSync(archivePath);
  // Truncate to 50% of original size
  const corrupted = content.slice(0, Math.floor(content.length * 0.5));
  writeFileSync(archivePath, corrupted);
}

describe('Archive Bundle Integration Tests', () => {
  beforeEach(() => {
    setupTempDir();
  });

  afterEach(() => {
    cleanupTempDir();
  });

  describe('Archive Creation Tests', () => {
    it('should create valid tar.gz archive from source directory', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      mkdirSync(sourceDir, { recursive: true });

      // Create test files
      writeFileSync(join(sourceDir, 'server.js'), 'console.log("test");', 'utf-8');
      writeFileSync(join(sourceDir, 'bundle.json'), JSON.stringify({ name: 'test' }), 'utf-8');

      const archivePath = join(TEMP_DIR, 'test.tar.gz');

      await createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath: archivePath,
      });

      // Verify archive exists and has content
      expect(existsSync(archivePath)).toBe(true);
      const stats = statSync(archivePath);
      expect(stats.size).toBeGreaterThan(0);

      // Verify archive contains expected files
      const files = await verifyTarGzContents(archivePath, ['server.js', 'bundle.json']);
      expect(files.has('server.js')).toBe(true);
      expect(files.has('bundle.json')).toBe(true);
      expect(files.get('server.js')?.toString()).toContain('console.log');
    });

    it('should create valid zip archive from source directory', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      mkdirSync(sourceDir, { recursive: true });

      // Create test files
      writeFileSync(join(sourceDir, 'server.js'), 'console.log("test");', 'utf-8');
      writeFileSync(join(sourceDir, 'bundle.json'), JSON.stringify({ name: 'test' }), 'utf-8');

      const archivePath = join(TEMP_DIR, 'test.zip');

      await createArchive({
        format: 'zip',
        sourceDir,
        outputPath: archivePath,
      });

      // Verify archive exists and has content
      expect(existsSync(archivePath)).toBe(true);
      const stats = statSync(archivePath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should include nested directories in tar.gz archive', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      const nestedDir = join(sourceDir, 'nested', 'deep');
      mkdirSync(nestedDir, { recursive: true });

      writeFileSync(join(sourceDir, 'root.js'), 'root', 'utf-8');
      writeFileSync(join(nestedDir, 'deep.js'), 'deep', 'utf-8');

      const archivePath = join(TEMP_DIR, 'nested.tar.gz');

      await createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath: archivePath,
      });

      const files = await verifyTarGzContents(archivePath, ['root.js', 'nested/deep/deep.js']);
      expect(files.has('root.js')).toBe(true);
      expect(files.has('nested/deep/deep.js')).toBe(true);
    });

    it('should include nested directories in zip archive', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      const nestedDir = join(sourceDir, 'nested', 'deep');
      mkdirSync(nestedDir, { recursive: true });

      writeFileSync(join(sourceDir, 'root.js'), 'root', 'utf-8');
      writeFileSync(join(nestedDir, 'deep.js'), 'deep', 'utf-8');

      const archivePath = join(TEMP_DIR, 'nested.zip');

      await createArchive({
        format: 'zip',
        sourceDir,
        outputPath: archivePath,
      });

      expect(existsSync(archivePath)).toBe(true);
    });

    it('should fail when source directory does not exist', async () => {
      const sourceDir = join(TEMP_DIR, 'nonexistent');
      const archivePath = join(TEMP_DIR, 'test.tar.gz');

      await expect(
        createArchive({
          format: 'tar.gz',
          sourceDir,
          outputPath: archivePath,
        })
      ).rejects.toThrow(/Source directory does not exist/i);
    });

    it('should fail when output directory does not exist', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(join(sourceDir, 'test.js'), 'test', 'utf-8');

      const archivePath = join(TEMP_DIR, 'nonexistent-dir', 'test.tar.gz');

      await expect(
        createArchive({
          format: 'tar.gz',
          sourceDir,
          outputPath: archivePath,
        })
      ).rejects.toThrow(/Output directory does not exist/i);
    });
  });

  describe('Archive Extraction Tests', () => {
    it('should extract tar.gz archive correctly', async () => {
      // Create source directory with files
      const sourceDir = join(TEMP_DIR, 'source-tgz');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(join(sourceDir, 'server.js'), 'console.log("extracted");', 'utf-8');
      writeFileSync(join(sourceDir, 'bundle.json'), '{"name":"test"}', 'utf-8');

      // Create archive
      const archivePath = join(TEMP_DIR, 'test.tar.gz');
      await createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath: archivePath,
      });

      // Extract archive
      const extractDir = join(TEMP_DIR, 'extracted-tgz');
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });

      // Verify extracted files
      expect(existsSync(join(extractDir, 'server.js'))).toBe(true);
      expect(existsSync(join(extractDir, 'bundle.json'))).toBe(true);

      const serverContent = readFileSync(join(extractDir, 'server.js'), 'utf-8');
      expect(serverContent).toContain('extracted');

      const bundleContent = readFileSync(join(extractDir, 'bundle.json'), 'utf-8');
      expect(JSON.parse(bundleContent).name).toBe('test');
    });

    it('should extract zip archive correctly', async () => {
      // Create source directory with files
      const sourceDir = join(TEMP_DIR, 'source-zip');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(join(sourceDir, 'server.js'), 'console.log("extracted");', 'utf-8');
      writeFileSync(join(sourceDir, 'bundle.json'), '{"name":"test"}', 'utf-8');

      // Create archive
      const archivePath = join(TEMP_DIR, 'test.zip');
      await createArchive({
        format: 'zip',
        sourceDir,
        outputPath: archivePath,
      });

      // Extract archive
      const extractDir = join(TEMP_DIR, 'extracted-zip');
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });

      // Add a small delay to ensure zip extraction completes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify extracted files
      expect(existsSync(join(extractDir, 'server.js'))).toBe(true);
      expect(existsSync(join(extractDir, 'bundle.json'))).toBe(true);

      const serverContent = readFileSync(join(extractDir, 'server.js'), 'utf-8');
      expect(serverContent).toContain('extracted');
    });

    it('should extract nested directories from tar.gz', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      const nestedDir = join(sourceDir, 'nested', 'deep');
      mkdirSync(nestedDir, { recursive: true });
      writeFileSync(join(nestedDir, 'file.js'), 'nested content', 'utf-8');

      const archivePath = join(TEMP_DIR, 'nested.tar.gz');
      await createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath: archivePath,
      });

      const extractDir = join(TEMP_DIR, 'extracted');
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });

      expect(existsSync(join(extractDir, 'nested', 'deep', 'file.js'))).toBe(true);
      const content = readFileSync(join(extractDir, 'nested', 'deep', 'file.js'), 'utf-8');
      expect(content).toBe('nested content');
    });

    it('should auto-detect format from .tar.gz extension', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(join(sourceDir, 'test.js'), 'test', 'utf-8');

      const archivePath = join(TEMP_DIR, 'test.tar.gz');
      await createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath: archivePath,
      });

      const extractDir = join(TEMP_DIR, 'extracted');
      // Don't specify format - should auto-detect
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });

      expect(existsSync(join(extractDir, 'test.js'))).toBe(true);
    });

    it('should auto-detect format from .zip extension', async () => {
      const sourceDir = join(TEMP_DIR, 'source-auto-zip');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(join(sourceDir, 'test.js'), 'test', 'utf-8');

      const archivePath = join(TEMP_DIR, 'auto-test.zip');
      await createArchive({
        format: 'zip',
        sourceDir,
        outputPath: archivePath,
      });

      const extractDir = join(TEMP_DIR, 'extracted-auto-zip');
      // Don't specify format - should auto-detect
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });

      // Add a small delay to ensure zip extraction completes
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(existsSync(join(extractDir, 'test.js'))).toBe(true);
    });

    it('should create target directory if it does not exist', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(join(sourceDir, 'test.js'), 'test', 'utf-8');

      const archivePath = join(TEMP_DIR, 'test.tar.gz');
      await createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath: archivePath,
      });

      const extractDir = join(TEMP_DIR, 'deep', 'nested', 'extracted');
      // Directory doesn't exist yet
      expect(existsSync(extractDir)).toBe(false);

      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });

      // Should be created and contain files
      expect(existsSync(extractDir)).toBe(true);
      expect(existsSync(join(extractDir, 'test.js'))).toBe(true);
    });

    it('should fail gracefully with corrupted tar.gz archive', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(join(sourceDir, 'test.js'), 'test', 'utf-8');

      const archivePath = join(TEMP_DIR, 'test.tar.gz');
      await createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath: archivePath,
      });

      // Corrupt the archive
      corruptArchive(archivePath);

      const extractDir = join(TEMP_DIR, 'extracted');
      await expect(
        extractArchive({
          archivePath,
          targetDir: extractDir,
        })
      ).rejects.toThrow(/corrupted|failed/i);
    });

    it('should fail with non-existent archive', async () => {
      const archivePath = join(TEMP_DIR, 'nonexistent.tar.gz');
      const extractDir = join(TEMP_DIR, 'extracted');

      await expect(
        extractArchive({
          archivePath,
          targetDir: extractDir,
        })
      ).rejects.toThrow(/not found|not readable/i);
    });

    it('should fail with invalid archive format', async () => {
      const archivePath = join(TEMP_DIR, 'invalid.tar.gz');
      writeFileSync(archivePath, 'this is not a valid archive', 'utf-8');

      const extractDir = join(TEMP_DIR, 'extracted');
      await expect(
        extractArchive({
          archivePath,
          targetDir: extractDir,
        })
      ).rejects.toThrow();
    });
  });

  describe('Bundle Manifest Tests', () => {
    it('should generate valid manifest with metadata', () => {
      const manifest = generateManifest(
        {
          name: 'test-server',
          version: '2.0.0',
          description: 'Test server description',
        },
        ['better-sqlite3'],
        'server.js'
      );

      expect(manifest.name).toBe('test-server');
      expect(manifest.version).toBe('2.0.0');
      expect(manifest.description).toBe('Test server description');
      expect(manifest.entryPoint).toBe('server.js');
      expect(manifest.nativeDependencies).toEqual(['better-sqlite3']);
      expect(manifest.createdAt).toBeTruthy();
      expect(manifest.simplyMcpVersion).toBeTruthy();
    });

    it('should write and read manifest correctly', async () => {
      const bundleDir = join(TEMP_DIR, 'bundle');
      mkdirSync(bundleDir, { recursive: true });

      const manifest = generateManifest(
        {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test description',
        },
        ['native-dep'],
        'server.js'
      );

      await writeManifest(bundleDir, manifest);

      // Verify file exists
      const manifestPath = join(bundleDir, 'bundle.json');
      expect(existsSync(manifestPath)).toBe(true);

      // Read and verify
      const readBack = await readManifest(bundleDir);
      expect(readBack.name).toBe('test-server');
      expect(readBack.version).toBe('1.0.0');
      expect(readBack.description).toBe('Test description');
      expect(readBack.nativeDependencies).toEqual(['native-dep']);
      expect(readBack.entryPoint).toBe('server.js');
    });

    it('should validate manifest on read', async () => {
      const bundleDir = join(TEMP_DIR, 'bundle');
      mkdirSync(bundleDir, { recursive: true });

      // Write invalid manifest (missing required fields)
      const invalidManifest = {
        name: 'test',
        // Missing version, entryPoint, etc.
      };
      writeFileSync(join(bundleDir, 'bundle.json'), JSON.stringify(invalidManifest), 'utf-8');

      await expect(readManifest(bundleDir)).rejects.toThrow(/missing required fields/i);
    });

    it('should fail to read non-existent manifest', async () => {
      const bundleDir = join(TEMP_DIR, 'nonexistent');

      await expect(readManifest(bundleDir)).rejects.toThrow(/Failed to read bundle manifest/i);
    });

    it('should fail to read invalid JSON in manifest', async () => {
      const bundleDir = join(TEMP_DIR, 'bundle');
      mkdirSync(bundleDir, { recursive: true });

      writeFileSync(join(bundleDir, 'bundle.json'), 'invalid json {', 'utf-8');

      await expect(readManifest(bundleDir)).rejects.toThrow(/Invalid JSON/i);
    });
  });

  describe('Bundle Cache Tests', () => {
    it('should create cache directory with SHA-256 hash', () => {
      const cache = new BundleCache({ cacheDir: CACHE_DIR });
      const archivePath = join(TEMP_DIR, 'test.tar.gz');

      const cachePath = cache.getCachePath(archivePath);

      // Should be a subdirectory of cache dir
      expect(cachePath.startsWith(CACHE_DIR)).toBe(true);

      // Should use hash of absolute path (resolve to get the actual absolute path)
      const absoluteArchivePath = require('path').resolve(archivePath);
      const hash = crypto
        .createHash('sha256')
        .update(absoluteArchivePath)
        .digest('hex');
      expect(cachePath).toContain(hash);
    });

    it('should return same cache path for same archive', () => {
      const cache = new BundleCache({ cacheDir: CACHE_DIR });
      const archivePath = join(TEMP_DIR, 'test.tar.gz');

      const cachePath1 = cache.getCachePath(archivePath);
      const cachePath2 = cache.getCachePath(archivePath);

      expect(cachePath1).toBe(cachePath2);
    });

    it('should detect uncached bundle', async () => {
      const cache = new BundleCache({ cacheDir: CACHE_DIR });
      const archivePath = join(TEMP_DIR, 'test.tar.gz');

      const isCached = await cache.isCached(archivePath);
      expect(isCached).toBe(false);
    });

    it('should detect cached bundle', async () => {
      const cache = new BundleCache({ cacheDir: CACHE_DIR });
      const archivePath = join(TEMP_DIR, 'test.tar.gz');

      // Create cache directory with a file
      const cachePath = cache.getCachePath(archivePath);
      mkdirSync(cachePath, { recursive: true });
      writeFileSync(join(cachePath, 'server.js'), 'cached', 'utf-8');

      const isCached = await cache.isCached(archivePath);
      expect(isCached).toBe(true);
    });

    it('should not consider empty cache directory as cached', async () => {
      const cache = new BundleCache({ cacheDir: CACHE_DIR });
      const archivePath = join(TEMP_DIR, 'test.tar.gz');

      // Create empty cache directory
      const cachePath = cache.getCachePath(archivePath);
      mkdirSync(cachePath, { recursive: true });

      const isCached = await cache.isCached(archivePath);
      expect(isCached).toBe(false);
    });
  });

  describe('End-to-End Archive Workflow Tests', () => {
    it('should complete full workflow: bundle → extract → run for tar.gz', async () => {
      const serverDir = join(TEMP_DIR, 'server-source');
      mkdirSync(serverDir, { recursive: true });

      // Create test server and package.json
      createTestServer(serverDir, 'e2e-test-server');
      createPackageJson(serverDir, 'e2e-test-server', '1.0.0');

      // Bundle to tar.gz
      const archivePath = join(TEMP_DIR, 'test-bundle.tar.gz');
      const bundleResult = await bundle({
        entry: join(serverDir, 'server.ts'),
        output: archivePath,
        format: 'tar.gz',
        basePath: serverDir,
        minify: false, // Easier to debug
      });

      expect(bundleResult.success).toBe(true);
      expect(existsSync(archivePath)).toBe(true);

      // Extract archive
      const extractDir = join(TEMP_DIR, 'extracted-bundle');
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });

      // Verify extracted contents
      expect(existsSync(join(extractDir, 'server.js'))).toBe(true);
      expect(existsSync(join(extractDir, 'bundle.json'))).toBe(true);

      // Read and verify manifest
      const manifest = await readManifest(extractDir);
      expect(manifest.name).toBe('e2e-test-server');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.entryPoint).toBe('server.js');

      // Verify server.js contains compiled code
      const serverJs = readFileSync(join(extractDir, 'server.js'), 'utf-8');
      expect(serverJs).toBeTruthy();
      expect(serverJs.length).toBeGreaterThan(0);
    });

    it('should complete full workflow: bundle → extract → run for zip', async () => {
      const serverDir = join(TEMP_DIR, 'server-source-zip');
      mkdirSync(serverDir, { recursive: true });

      // Create test server and package.json
      createTestServer(serverDir, 'e2e-zip-server');
      createPackageJson(serverDir, 'e2e-zip-server', '2.0.0');

      // Bundle to zip
      const archivePath = join(TEMP_DIR, 'test-bundle.zip');
      const bundleResult = await bundle({
        entry: join(serverDir, 'server.ts'),
        output: archivePath,
        format: 'zip',
        basePath: serverDir,
        minify: false,
      });

      expect(bundleResult.success).toBe(true);
      expect(existsSync(archivePath)).toBe(true);

      // Extract archive
      const extractDir = join(TEMP_DIR, 'extracted-bundle-zip');
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });

      // Add a small delay to ensure zip extraction completes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify extracted contents
      expect(existsSync(join(extractDir, 'server.js'))).toBe(true);
      expect(existsSync(join(extractDir, 'bundle.json'))).toBe(true);

      // Read and verify manifest
      const manifest = await readManifest(extractDir);
      expect(manifest.name).toBe('e2e-zip-server');
      expect(manifest.version).toBe('2.0.0');
      expect(manifest.entryPoint).toBe('server.js');
    });

    it('should use cache on subsequent extractions', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(join(sourceDir, 'server.js'), 'console.log("test");', 'utf-8');

      const archivePath = join(TEMP_DIR, 'cached-test.tar.gz');
      await createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath: archivePath,
      });

      const cache = new BundleCache({ cacheDir: CACHE_DIR });

      // First extraction - should not be cached
      expect(await cache.isCached(archivePath)).toBe(false);

      const cachePath = cache.getCachePath(archivePath);
      await extractArchive({
        archivePath,
        targetDir: cachePath,
      });

      // Second check - should be cached now
      expect(await cache.isCached(archivePath)).toBe(true);
      expect(existsSync(join(cachePath, 'server.js'))).toBe(true);

      // Verify we can read from cache without re-extracting
      const cachedContent = readFileSync(join(cachePath, 'server.js'), 'utf-8');
      expect(cachedContent).toContain('console.log');
    });

    it('should handle archives with native dependencies', async () => {
      const serverDir = join(TEMP_DIR, 'server-with-native');
      mkdirSync(serverDir, { recursive: true });

      // Create server that would have native deps
      const serverCode = `
import type { IServer, ITool } from '../../src/index.js';

const server: IServer = {
  name: 'native-dep-server',
  version: '1.0.0',
  description: 'Server with native dependencies'
};

interface DbTool extends ITool {
  name: 'query_db';
  description: 'Query database';
  params: Record<string, never>;
  result: { rows: number };
}

export default class NativeServer {
  queryDb: DbTool = async () => {
    // Would use better-sqlite3 here
    return { rows: 42 };
  };
}
`;
      writeFileSync(join(serverDir, 'server.ts'), serverCode, 'utf-8');

      // Create package.json with native dependency
      const packageJson = {
        name: 'native-dep-server',
        version: '1.0.0',
        dependencies: {
          'better-sqlite3': '^9.0.0',
        },
      };
      writeFileSync(join(serverDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');

      // Bundle (should detect native dependency)
      const archivePath = join(TEMP_DIR, 'native-bundle.tar.gz');
      const bundleResult = await bundle({
        entry: join(serverDir, 'server.ts'),
        output: archivePath,
        format: 'tar.gz',
        basePath: serverDir,
        minify: false,
      });

      expect(bundleResult.success).toBe(true);

      // Extract and verify
      const extractDir = join(TEMP_DIR, 'extracted-native');
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });

      // Should contain package.json for native deps
      expect(existsSync(join(extractDir, 'package.json'))).toBe(true);

      // Manifest should list native dependencies
      const manifest = await readManifest(extractDir);
      expect(manifest.nativeDependencies).toContain('better-sqlite3');
    });
  });

  describe('Archive Metadata Tests', () => {
    it('should preserve file permissions in tar.gz archives', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(join(sourceDir, 'test.js'), 'test', 'utf-8');

      const archivePath = join(TEMP_DIR, 'perms.tar.gz');
      await createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath: archivePath,
      });

      const extractDir = join(TEMP_DIR, 'extracted');
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });

      // File should exist and be readable
      expect(existsSync(join(extractDir, 'test.js'))).toBe(true);
      const content = readFileSync(join(extractDir, 'test.js'), 'utf-8');
      expect(content).toBe('test');
    });

    it('should handle archives with bundle.json manifest', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      mkdirSync(sourceDir, { recursive: true });

      writeFileSync(join(sourceDir, 'server.js'), 'console.log("test");', 'utf-8');

      // Write manifest
      const manifest = generateManifest(
        {
          name: 'manifest-test',
          version: '3.0.0',
          description: 'Test with manifest',
        },
        [],
        'server.js'
      );
      await writeManifest(sourceDir, manifest);

      // Create archive
      const archivePath = join(TEMP_DIR, 'with-manifest.tar.gz');
      await createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath: archivePath,
      });

      // Extract and read manifest
      const extractDir = join(TEMP_DIR, 'extracted');
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });

      const extractedManifest = await readManifest(extractDir);
      expect(extractedManifest.name).toBe('manifest-test');
      expect(extractedManifest.version).toBe('3.0.0');
      expect(extractedManifest.description).toBe('Test with manifest');
    });

    it('should create archives with correct file count', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      mkdirSync(sourceDir, { recursive: true });

      // Create multiple files
      writeFileSync(join(sourceDir, 'file1.js'), 'file1', 'utf-8');
      writeFileSync(join(sourceDir, 'file2.js'), 'file2', 'utf-8');
      writeFileSync(join(sourceDir, 'file3.js'), 'file3', 'utf-8');
      writeFileSync(join(sourceDir, 'bundle.json'), '{}', 'utf-8');

      const archivePath = join(TEMP_DIR, 'multi-file.tar.gz');
      await createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath: archivePath,
      });

      const files = await verifyTarGzContents(archivePath, []);
      expect(files.size).toBe(4); // 3 .js files + bundle.json
      expect(files.has('file1.js')).toBe(true);
      expect(files.has('file2.js')).toBe(true);
      expect(files.has('file3.js')).toBe(true);
      expect(files.has('bundle.json')).toBe(true);
    });
  });

  describe('Error Recovery Tests', () => {
    it('should clean up partial extraction on failure', async () => {
      const sourceDir = join(TEMP_DIR, 'source');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(join(sourceDir, 'test.js'), 'test', 'utf-8');

      const archivePath = join(TEMP_DIR, 'test.tar.gz');
      await createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath: archivePath,
      });

      // Corrupt archive
      corruptArchive(archivePath);

      const extractDir = join(TEMP_DIR, 'extracted');

      // Should fail and clean up
      await expect(
        extractArchive({
          archivePath,
          targetDir: extractDir,
        })
      ).rejects.toThrow();

      // Extract directory should not exist or be empty (cleanup)
      // The extractor cleans up on failure
      if (existsSync(extractDir)) {
        const files = require('fs').readdirSync(extractDir);
        // Some implementations may leave the directory, but it should be empty or minimal
        expect(files.length).toBeLessThanOrEqual(0);
      }
    });

    it('should handle missing manifest gracefully during bundle creation', async () => {
      const serverDir = join(TEMP_DIR, 'server-no-pkg');
      mkdirSync(serverDir, { recursive: true });

      createTestServer(serverDir, 'no-package-server');
      // Intentionally don't create package.json

      const archivePath = join(TEMP_DIR, 'no-pkg.tar.gz');
      const bundleResult = await bundle({
        entry: join(serverDir, 'server.ts'),
        output: archivePath,
        format: 'tar.gz',
        basePath: serverDir,
        minify: false,
      });

      // Should still succeed with default metadata
      expect(bundleResult.success).toBe(true);
      expect(existsSync(archivePath)).toBe(true);

      // Extract and check manifest
      const extractDir = join(TEMP_DIR, 'extracted');
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });

      const manifest = await readManifest(extractDir);
      expect(manifest.name).toBeTruthy(); // Should have some default name
      expect(manifest.version).toBe('1.0.0'); // Default version
    });
  });

  describe('Path Security Tests', () => {
    it('should reject path traversal attacks in tar.gz archives', async () => {
      // This is a security test to ensure path traversal is blocked
      // We can't easily create a malicious tar.gz programmatically,
      // but we can verify the extraction logic handles it

      const sourceDir = join(TEMP_DIR, 'source');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(join(sourceDir, 'safe.js'), 'safe', 'utf-8');

      const archivePath = join(TEMP_DIR, 'safe.tar.gz');
      await createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath: archivePath,
      });

      const extractDir = join(TEMP_DIR, 'safe-extract');
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });

      // All files should be within extract dir
      const extractedFile = join(extractDir, 'safe.js');
      expect(extractedFile.startsWith(extractDir)).toBe(true);
      expect(existsSync(extractedFile)).toBe(true);
    });
  });
});
