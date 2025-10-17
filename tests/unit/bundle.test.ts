/**
 * Bundle Detection and Entry Point Resolution Test Suite
 *
 * Tests the foundational bundle detection and execution system that enables
 * SimpleMCP to run package directories with automatic entry point resolution.
 *
 * Test Coverage:
 * - Package bundle detection (valid bundles vs non-bundles)
 * - Package.json reading and validation
 * - Entry point resolution priority (bin → main → module → defaults)
 * - Error handling for missing/invalid package.json
 * - Edge cases (empty directories, file paths, etc.)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  isPackageBundle,
  readPackageJson,
  resolveEntryPoint,
  resolveEntryPointWithFallback,
  entryPointExists,
  type PackageJson,
} from '../../src/cli/package-detector.js';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Bundle Detection - isPackageBundle', () => {
  let testDir: string;

  beforeAll(async () => {
    // Create a temporary directory for tests
    testDir = join(tmpdir(), `simple-mcp-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  it('should return true for a valid package bundle (directory with package.json)', async () => {
    const bundleDir = join(testDir, 'valid-bundle');
    await mkdir(bundleDir, { recursive: true });
    await writeFile(join(bundleDir, 'package.json'), JSON.stringify({
      name: 'test-package',
      version: '1.0.0',
    }));

    const result = await isPackageBundle(bundleDir);
    expect(result).toBe(true);
  });

  it('should return false for a directory without package.json', async () => {
    const emptyDir = join(testDir, 'empty-dir');
    await mkdir(emptyDir, { recursive: true });

    const result = await isPackageBundle(emptyDir);
    expect(result).toBe(false);
  });

  it('should return false for a file path (not a directory)', async () => {
    const filePath = join(testDir, 'test-file.js');
    await writeFile(filePath, 'console.log("test");');

    const result = await isPackageBundle(filePath);
    expect(result).toBe(false);
  });

  it('should return false for a non-existent path', async () => {
    const nonExistentPath = join(testDir, 'does-not-exist');

    const result = await isPackageBundle(nonExistentPath);
    expect(result).toBe(false);
  });

  it('should return false for package.json file itself', async () => {
    const bundleDir = join(testDir, 'bundle-for-file-test');
    await mkdir(bundleDir, { recursive: true });
    const packageJsonPath = join(bundleDir, 'package.json');
    await writeFile(packageJsonPath, JSON.stringify({
      name: 'test-package',
      version: '1.0.0',
    }));

    const result = await isPackageBundle(packageJsonPath);
    expect(result).toBe(false);
  });
});

describe('Package.json Reading - readPackageJson', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-test-read-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should successfully read and parse a valid package.json', async () => {
    const bundleDir = join(testDir, 'valid-package');
    await mkdir(bundleDir, { recursive: true });
    await writeFile(join(bundleDir, 'package.json'), JSON.stringify({
      name: 'my-mcp-server',
      version: '2.1.0',
      description: 'Test MCP server',
      main: 'dist/index.js',
    }));

    const pkg = await readPackageJson(bundleDir);
    expect(pkg.name).toBe('my-mcp-server');
    expect(pkg.version).toBe('2.1.0');
    expect(pkg.description).toBe('Test MCP server');
    expect(pkg.main).toBe('dist/index.js');
  });

  it('should throw error for missing package.json', async () => {
    const bundleDir = join(testDir, 'no-package-json');
    await mkdir(bundleDir, { recursive: true });

    await expect(readPackageJson(bundleDir)).rejects.toThrow('Package bundle missing package.json');
  });

  it('should throw error for package.json missing "name" field', async () => {
    const bundleDir = join(testDir, 'missing-name');
    await mkdir(bundleDir, { recursive: true });
    await writeFile(join(bundleDir, 'package.json'), JSON.stringify({
      version: '1.0.0',
    }));

    await expect(readPackageJson(bundleDir)).rejects.toThrow('missing required field: "name"');
  });

  it('should throw error for package.json missing "version" field', async () => {
    const bundleDir = join(testDir, 'missing-version');
    await mkdir(bundleDir, { recursive: true });
    await writeFile(join(bundleDir, 'package.json'), JSON.stringify({
      name: 'test-package',
    }));

    await expect(readPackageJson(bundleDir)).rejects.toThrow('missing required field: "version"');
  });

  it('should throw error for invalid JSON in package.json', async () => {
    const bundleDir = join(testDir, 'invalid-json');
    await mkdir(bundleDir, { recursive: true });
    await writeFile(join(bundleDir, 'package.json'), '{ invalid json }');

    await expect(readPackageJson(bundleDir)).rejects.toThrow('Invalid JSON in package.json');
  });

  it('should handle package.json with all common fields', async () => {
    const bundleDir = join(testDir, 'full-package');
    await mkdir(bundleDir, { recursive: true });
    await writeFile(join(bundleDir, 'package.json'), JSON.stringify({
      name: 'full-mcp-server',
      version: '3.2.1',
      description: 'Full featured MCP server',
      main: 'dist/index.js',
      module: 'dist/esm/index.js',
      bin: './dist/cli/index.js',
      type: 'module',
    }));

    const pkg = await readPackageJson(bundleDir);
    expect(pkg.name).toBe('full-mcp-server');
    expect(pkg.version).toBe('3.2.1');
    expect(pkg.description).toBe('Full featured MCP server');
    expect(pkg.main).toBe('dist/index.js');
    expect(pkg.module).toBe('dist/esm/index.js');
    expect(pkg.bin).toBe('./dist/cli/index.js');
    expect(pkg.type).toBe('module');
  });
});

describe('Entry Point Resolution - resolveEntryPoint', () => {
  const testBundlePath = '/test/bundle/path';

  it('should resolve entry point from bin field (string)', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      bin: './dist/cli/index.js',
    };

    const entryPoint = resolveEntryPoint(pkg, testBundlePath);
    expect(entryPoint).toBe('/test/bundle/path/dist/cli/index.js');
  });

  it('should resolve entry point from bin field (object - single entry)', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      bin: {
        'my-cli': './dist/cli/index.js',
      },
    };

    const entryPoint = resolveEntryPoint(pkg, testBundlePath);
    expect(entryPoint).toBe('/test/bundle/path/dist/cli/index.js');
  });

  it('should resolve entry point from bin field (object - multiple entries, uses first)', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      bin: {
        'cli-main': './dist/cli/main.js',
        'cli-alt': './dist/cli/alt.js',
      },
    };

    const entryPoint = resolveEntryPoint(pkg, testBundlePath);
    // Should use first entry (object insertion order preserved in modern JS)
    expect(entryPoint).toBe('/test/bundle/path/dist/cli/main.js');
  });

  it('should fall back to main field when bin is not present', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      main: 'dist/index.js',
    };

    const entryPoint = resolveEntryPoint(pkg, testBundlePath);
    expect(entryPoint).toBe('/test/bundle/path/dist/index.js');
  });

  it('should fall back to module field when bin and main are not present', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      module: 'dist/esm/index.js',
    };

    const entryPoint = resolveEntryPoint(pkg, testBundlePath);
    expect(entryPoint).toBe('/test/bundle/path/dist/esm/index.js');
  });

  it('should use bin over main when both are present', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      bin: './cli.js',
      main: './index.js',
    };

    const entryPoint = resolveEntryPoint(pkg, testBundlePath);
    expect(entryPoint).toBe('/test/bundle/path/cli.js');
  });

  it('should use main over module when both are present (but bin is not)', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      main: './index.js',
      module: './esm/index.js',
    };

    const entryPoint = resolveEntryPoint(pkg, testBundlePath);
    expect(entryPoint).toBe('/test/bundle/path/index.js');
  });

  it('should fall back to default src/server.ts when no fields are present', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
    };

    const entryPoint = resolveEntryPoint(pkg, testBundlePath);
    // Should return first default entry point
    expect(entryPoint).toBe('/test/bundle/path/src/server.ts');
  });

  it('should handle relative paths correctly', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      main: './src/index.ts',
    };

    const entryPoint = resolveEntryPoint(pkg, testBundlePath);
    expect(entryPoint).toBe('/test/bundle/path/src/index.ts');
  });

  it('should handle paths without leading ./', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      main: 'build/server.js',
    };

    const entryPoint = resolveEntryPoint(pkg, testBundlePath);
    expect(entryPoint).toBe('/test/bundle/path/build/server.js');
  });
});

describe('Entry Point Existence Check - entryPointExists', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-test-exists-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should return true for an existing file', async () => {
    const filePath = join(testDir, 'exists.js');
    await writeFile(filePath, 'console.log("test");');

    const result = await entryPointExists(filePath);
    expect(result).toBe(true);
  });

  it('should return false for a non-existent file', async () => {
    const filePath = join(testDir, 'does-not-exist.js');

    const result = await entryPointExists(filePath);
    expect(result).toBe(false);
  });

  it('should return false for a directory (not a file)', async () => {
    const dirPath = join(testDir, 'is-directory');
    await mkdir(dirPath, { recursive: true });

    const result = await entryPointExists(dirPath);
    expect(result).toBe(false);
  });
});

describe('Entry Point Resolution with Fallback - resolveEntryPointWithFallback', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-test-fallback-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should resolve bin field if file exists', async () => {
    const bundleDir = join(testDir, 'bundle-with-bin');
    await mkdir(bundleDir, { recursive: true });
    await mkdir(join(bundleDir, 'dist'), { recursive: true });
    await writeFile(join(bundleDir, 'dist', 'cli.js'), 'console.log("cli");');

    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      bin: './dist/cli.js',
    };

    const entryPoint = await resolveEntryPointWithFallback(pkg, bundleDir);
    expect(entryPoint).toBe(join(bundleDir, 'dist', 'cli.js'));
  });

  it('should fall back to main field if bin file does not exist', async () => {
    const bundleDir = join(testDir, 'bundle-with-main');
    await mkdir(bundleDir, { recursive: true });
    await mkdir(join(bundleDir, 'dist'), { recursive: true });
    await writeFile(join(bundleDir, 'dist', 'index.js'), 'console.log("main");');

    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      bin: './dist/cli.js', // This file doesn't exist
      main: './dist/index.js', // This file exists
    };

    const entryPoint = await resolveEntryPointWithFallback(pkg, bundleDir);
    expect(entryPoint).toBe(join(bundleDir, 'dist', 'index.js'));
  });

  it('should fall back to default src/server.ts if specified fields do not exist', async () => {
    const bundleDir = join(testDir, 'bundle-with-default');
    await mkdir(bundleDir, { recursive: true });
    await mkdir(join(bundleDir, 'src'), { recursive: true });
    await writeFile(join(bundleDir, 'src', 'server.ts'), 'console.log("server");');

    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      bin: './dist/cli.js', // Doesn't exist
      main: './dist/index.js', // Doesn't exist
    };

    const entryPoint = await resolveEntryPointWithFallback(pkg, bundleDir);
    expect(entryPoint).toBe(join(bundleDir, 'src', 'server.ts'));
  });

  it('should fall back to src/index.ts if src/server.ts does not exist', async () => {
    const bundleDir = join(testDir, 'bundle-with-src-index');
    await mkdir(bundleDir, { recursive: true });
    await mkdir(join(bundleDir, 'src'), { recursive: true });
    await writeFile(join(bundleDir, 'src', 'index.ts'), 'console.log("index");');

    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
    };

    const entryPoint = await resolveEntryPointWithFallback(pkg, bundleDir);
    expect(entryPoint).toBe(join(bundleDir, 'src', 'index.ts'));
  });

  it('should fall back to root-level index.ts if src files do not exist', async () => {
    const bundleDir = join(testDir, 'bundle-with-root-index');
    await mkdir(bundleDir, { recursive: true });
    await writeFile(join(bundleDir, 'index.ts'), 'console.log("root index");');

    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
    };

    const entryPoint = await resolveEntryPointWithFallback(pkg, bundleDir);
    expect(entryPoint).toBe(join(bundleDir, 'index.ts'));
  });

  it('should throw error if no valid entry point file exists', async () => {
    const bundleDir = join(testDir, 'bundle-empty');
    await mkdir(bundleDir, { recursive: true });

    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
    };

    await expect(resolveEntryPointWithFallback(pkg, bundleDir)).rejects.toThrow(
      'No entry point file found in package "test"'
    );
  });

  it('should prefer .ts files over .js files in defaults', async () => {
    const bundleDir = join(testDir, 'bundle-ts-preference');
    await mkdir(bundleDir, { recursive: true });
    await mkdir(join(bundleDir, 'src'), { recursive: true });
    await writeFile(join(bundleDir, 'src', 'server.ts'), 'console.log("ts");');
    await writeFile(join(bundleDir, 'src', 'server.js'), 'console.log("js");');

    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
    };

    const entryPoint = await resolveEntryPointWithFallback(pkg, bundleDir);
    // Should prefer .ts file
    expect(entryPoint).toBe(join(bundleDir, 'src', 'server.ts'));
  });
});

describe('Edge Cases and Error Handling', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-test-edge-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should handle empty bin object gracefully', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      bin: {},
      main: './index.js',
    };

    const entryPoint = resolveEntryPoint(pkg, '/test/path');
    // Should fall back to main since bin is empty
    expect(entryPoint).toBe('/test/path/index.js');
  });

  it('should handle package.json with only name and version', async () => {
    const bundleDir = join(testDir, 'minimal-package');
    await mkdir(bundleDir, { recursive: true });
    await writeFile(join(bundleDir, 'package.json'), JSON.stringify({
      name: 'minimal',
      version: '1.0.0',
    }));
    await mkdir(join(bundleDir, 'src'), { recursive: true });
    await writeFile(join(bundleDir, 'src', 'server.ts'), 'console.log("minimal");');

    const pkg = await readPackageJson(bundleDir);
    const entryPoint = await resolveEntryPointWithFallback(pkg, bundleDir);

    expect(pkg.name).toBe('minimal');
    expect(pkg.version).toBe('1.0.0');
    expect(entryPoint).toBe(join(bundleDir, 'src', 'server.ts'));
  });

  it('should handle nested paths in bin field', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      bin: './dist/cli/bin/server.js',
    };

    const entryPoint = resolveEntryPoint(pkg, '/test/path');
    expect(entryPoint).toBe('/test/path/dist/cli/bin/server.js');
  });

  it('should detect bundle even if package.json is the only file', async () => {
    const bundleDir = join(testDir, 'only-package-json');
    await mkdir(bundleDir, { recursive: true });
    await writeFile(join(bundleDir, 'package.json'), JSON.stringify({
      name: 'lonely',
      version: '0.0.1',
    }));

    const result = await isPackageBundle(bundleDir);
    expect(result).toBe(true);
  });

  it('should handle absolute paths in package.json fields (though not recommended)', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      main: '/absolute/path/to/index.js',
    };

    // resolve() should handle absolute paths correctly
    const entryPoint = resolveEntryPoint(pkg, '/bundle/path');
    expect(entryPoint).toBe('/absolute/path/to/index.js');
  });
});
