/**
 * Bundle Manifest Test Suite
 *
 * Comprehensive tests for bundle manifest generation, reading, and writing.
 * Tests the bundle.json schema that stores metadata about archived bundles.
 *
 * Test Coverage:
 * - generateManifest() - Creating manifests from server metadata
 * - writeManifest() - Writing manifests to bundle.json files
 * - readManifest() - Reading and validating manifests from files
 * - Validation logic for all required and optional fields
 * - Round-trip tests (generate → write → read)
 * - Error handling for invalid data and missing files
 * - Edge cases (empty dependencies, special characters, etc.)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  generateManifest,
  readManifest,
  writeManifest,
  type BundleManifest,
  type ServerMetadata,
} from '../../src/core/bundle-manifest.js';

describe('Bundle Manifest - generateManifest()', () => {
  it('should create manifest with all required fields', () => {
    const metadata: ServerMetadata = {
      name: 'test-server',
      version: '1.0.0',
      description: 'A test server',
    };

    const manifest = generateManifest(metadata, ['better-sqlite3']);

    expect(manifest.name).toBe('test-server');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.description).toBe('A test server');
    expect(manifest.entryPoint).toBe('server.js');
    expect(manifest.nativeDependencies).toEqual(['better-sqlite3']);
    expect(manifest.createdAt).toBeTruthy();
    expect(manifest.simplyMcpVersion).toBeTruthy();
  });

  it('should use provided server metadata correctly', () => {
    const metadata: ServerMetadata = {
      name: 'my-awesome-server',
      version: '2.3.4',
      description: 'My awesome MCP server',
    };

    const manifest = generateManifest(metadata, []);

    expect(manifest.name).toBe('my-awesome-server');
    expect(manifest.version).toBe('2.3.4');
    expect(manifest.description).toBe('My awesome MCP server');
  });

  it('should set default entry point when not provided', () => {
    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0',
    };

    const manifest = generateManifest(metadata, []);

    expect(manifest.entryPoint).toBe('server.js');
  });

  it('should use custom entry point when provided', () => {
    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0',
    };

    const manifest = generateManifest(metadata, [], 'index.js');

    expect(manifest.entryPoint).toBe('index.js');
  });

  it('should include native dependencies list', () => {
    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0',
    };

    const nativeDeps = ['better-sqlite3', 'bcrypt', 'sharp'];
    const manifest = generateManifest(metadata, nativeDeps);

    expect(manifest.nativeDependencies).toEqual(nativeDeps);
    expect(manifest.nativeDependencies.length).toBe(3);
  });

  it('should set createdAt as valid ISO timestamp', () => {
    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0',
    };

    const manifest = generateManifest(metadata, []);

    // Verify it's a valid ISO 8601 timestamp
    expect(manifest.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(manifest.createdAt).toISOString()).toBe(manifest.createdAt);
    expect(isNaN(Date.parse(manifest.createdAt))).toBe(false);
  });

  it('should set simplyMcpVersion correctly', () => {
    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0',
    };

    const manifest = generateManifest(metadata, []);

    // Should be a valid semver version or "unknown"
    expect(manifest.simplyMcpVersion).toBeTruthy();
    expect(typeof manifest.simplyMcpVersion).toBe('string');
    expect(manifest.simplyMcpVersion.length).toBeGreaterThan(0);
  });

  it('should handle optional description being undefined', () => {
    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0',
      // description intentionally omitted
    };

    const manifest = generateManifest(metadata, []);

    expect(manifest.description).toBeUndefined();
  });

  it('should handle empty native dependencies array', () => {
    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0',
    };

    const manifest = generateManifest(metadata, []);

    expect(manifest.nativeDependencies).toEqual([]);
    expect(Array.isArray(manifest.nativeDependencies)).toBe(true);
  });

  it('should handle special characters in fields', () => {
    const metadata: ServerMetadata = {
      name: '@scope/package-name',
      version: '1.0.0-beta.1',
      description: 'Server with "quotes" and special chars: <>&',
    };

    const manifest = generateManifest(metadata, ['@native/package']);

    expect(manifest.name).toBe('@scope/package-name');
    expect(manifest.version).toBe('1.0.0-beta.1');
    expect(manifest.description).toBe('Server with "quotes" and special chars: <>&');
    expect(manifest.nativeDependencies).toEqual(['@native/package']);
  });

  it('should handle very long server names', () => {
    const longName = 'a'.repeat(500);
    const metadata: ServerMetadata = {
      name: longName,
      version: '1.0.0',
    };

    const manifest = generateManifest(metadata, []);

    expect(manifest.name).toBe(longName);
    expect(manifest.name.length).toBe(500);
  });
});

describe('Bundle Manifest - writeManifest()', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-manifest-write-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should write manifest to bundle.json correctly', async () => {
    const bundleDir = join(testDir, 'write-test');
    await mkdir(bundleDir, { recursive: true });

    const manifest: BundleManifest = {
      name: 'test-server',
      version: '1.0.0',
      description: 'Test description',
      entryPoint: 'server.js',
      nativeDependencies: ['better-sqlite3'],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
    };

    await writeManifest(bundleDir, manifest);

    const manifestPath = join(bundleDir, 'bundle.json');
    const content = await readFile(manifestPath, 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed.name).toBe('test-server');
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.description).toBe('Test description');
    expect(parsed.entryPoint).toBe('server.js');
    expect(parsed.nativeDependencies).toEqual(['better-sqlite3']);
    expect(parsed.createdAt).toBe(manifest.createdAt);
    expect(parsed.simplyMcpVersion).toBe('4.0.0');
  });

  it('should create properly formatted JSON (readable)', async () => {
    const bundleDir = join(testDir, 'formatted-json');
    await mkdir(bundleDir, { recursive: true });

    const manifest: BundleManifest = {
      name: 'test',
      version: '1.0.0',
      entryPoint: 'server.js',
      nativeDependencies: [],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
    };

    await writeManifest(bundleDir, manifest);

    const manifestPath = join(bundleDir, 'bundle.json');
    const content = await readFile(manifestPath, 'utf-8');

    // Should be formatted with 2-space indentation
    expect(content).toContain('{\n  "name"');
    expect(content).toContain('\n}');
    // Should be valid JSON
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('should throw error when directory does not exist', async () => {
    const nonExistentDir = join(testDir, 'does-not-exist');

    const manifest: BundleManifest = {
      name: 'test',
      version: '1.0.0',
      entryPoint: 'server.js',
      nativeDependencies: [],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
    };

    await expect(writeManifest(nonExistentDir, manifest)).rejects.toThrow(/Failed to write bundle manifest/);
  });

  it('should validate manifest before writing - missing name', async () => {
    const bundleDir = join(testDir, 'invalid-manifest-name');
    await mkdir(bundleDir, { recursive: true });

    const manifest: any = {
      // name missing
      version: '1.0.0',
      entryPoint: 'server.js',
      nativeDependencies: [],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
    };

    await expect(writeManifest(bundleDir, manifest)).rejects.toThrow(/missing required fields.*name/);
  });

  it('should validate manifest before writing - invalid type for name', async () => {
    const bundleDir = join(testDir, 'invalid-type-name');
    await mkdir(bundleDir, { recursive: true });

    const manifest: any = {
      name: 123, // Should be string
      version: '1.0.0',
      entryPoint: 'server.js',
      nativeDependencies: [],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
    };

    await expect(writeManifest(bundleDir, manifest)).rejects.toThrow(/'name' must be a string/);
  });

  it('should handle manifest without optional description', async () => {
    const bundleDir = join(testDir, 'no-description');
    await mkdir(bundleDir, { recursive: true });

    const manifest: BundleManifest = {
      name: 'test',
      version: '1.0.0',
      // description intentionally omitted
      entryPoint: 'server.js',
      nativeDependencies: [],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
    };

    await writeManifest(bundleDir, manifest);

    const manifestPath = join(bundleDir, 'bundle.json');
    const content = await readFile(manifestPath, 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed).not.toHaveProperty('description');
  });
});

describe('Bundle Manifest - readManifest()', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-manifest-read-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should read valid manifest correctly', async () => {
    const bundleDir = join(testDir, 'read-valid');
    await mkdir(bundleDir, { recursive: true });

    const manifestData = {
      name: 'test-server',
      version: '1.2.3',
      description: 'Test server description',
      entryPoint: 'server.js',
      nativeDependencies: ['better-sqlite3', 'bcrypt'],
      createdAt: '2025-01-01T12:00:00.000Z',
      simplyMcpVersion: '4.0.0',
    };

    await writeFile(join(bundleDir, 'bundle.json'), JSON.stringify(manifestData, null, 2));

    const manifest = await readManifest(bundleDir);

    expect(manifest.name).toBe('test-server');
    expect(manifest.version).toBe('1.2.3');
    expect(manifest.description).toBe('Test server description');
    expect(manifest.entryPoint).toBe('server.js');
    expect(manifest.nativeDependencies).toEqual(['better-sqlite3', 'bcrypt']);
    expect(manifest.createdAt).toBe('2025-01-01T12:00:00.000Z');
    expect(manifest.simplyMcpVersion).toBe('4.0.0');
  });

  it('should parse all fields with correct types', async () => {
    const bundleDir = join(testDir, 'read-types');
    await mkdir(bundleDir, { recursive: true });

    const manifestData = {
      name: 'test',
      version: '1.0.0',
      entryPoint: 'server.js',
      nativeDependencies: [],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
    };

    await writeFile(join(bundleDir, 'bundle.json'), JSON.stringify(manifestData));

    const manifest = await readManifest(bundleDir);

    expect(typeof manifest.name).toBe('string');
    expect(typeof manifest.version).toBe('string');
    expect(typeof manifest.entryPoint).toBe('string');
    expect(Array.isArray(manifest.nativeDependencies)).toBe(true);
    expect(typeof manifest.createdAt).toBe('string');
    expect(typeof manifest.simplyMcpVersion).toBe('string');
  });

  it('should throw error when bundle.json does not exist', async () => {
    const bundleDir = join(testDir, 'no-bundle-json');
    await mkdir(bundleDir, { recursive: true });

    await expect(readManifest(bundleDir)).rejects.toThrow(/Failed to read bundle manifest/);
  });

  it('should throw error for invalid JSON', async () => {
    const bundleDir = join(testDir, 'invalid-json');
    await mkdir(bundleDir, { recursive: true });

    await writeFile(join(bundleDir, 'bundle.json'), '{ invalid json }');

    await expect(readManifest(bundleDir)).rejects.toThrow(/Invalid JSON in bundle manifest/);
  });

  it('should throw error for missing required field: name', async () => {
    const bundleDir = join(testDir, 'missing-name');
    await mkdir(bundleDir, { recursive: true });

    const manifestData = {
      // name missing
      version: '1.0.0',
      entryPoint: 'server.js',
      nativeDependencies: [],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
    };

    await writeFile(join(bundleDir, 'bundle.json'), JSON.stringify(manifestData));

    await expect(readManifest(bundleDir)).rejects.toThrow(/missing required fields.*name/);
  });

  it('should throw error for missing required field: version', async () => {
    const bundleDir = join(testDir, 'missing-version');
    await mkdir(bundleDir, { recursive: true });

    const manifestData = {
      name: 'test',
      // version missing
      entryPoint: 'server.js',
      nativeDependencies: [],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
    };

    await writeFile(join(bundleDir, 'bundle.json'), JSON.stringify(manifestData));

    await expect(readManifest(bundleDir)).rejects.toThrow(/missing required fields.*version/);
  });

  it('should throw error for missing required field: entryPoint', async () => {
    const bundleDir = join(testDir, 'missing-entrypoint');
    await mkdir(bundleDir, { recursive: true });

    const manifestData = {
      name: 'test',
      version: '1.0.0',
      // entryPoint missing
      nativeDependencies: [],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
    };

    await writeFile(join(bundleDir, 'bundle.json'), JSON.stringify(manifestData));

    await expect(readManifest(bundleDir)).rejects.toThrow(/missing required fields.*entryPoint/);
  });

  it('should throw error for invalid field type: name not string', async () => {
    const bundleDir = join(testDir, 'invalid-name-type');
    await mkdir(bundleDir, { recursive: true });

    const manifestData = {
      name: 123,
      version: '1.0.0',
      entryPoint: 'server.js',
      nativeDependencies: [],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
    };

    await writeFile(join(bundleDir, 'bundle.json'), JSON.stringify(manifestData));

    await expect(readManifest(bundleDir)).rejects.toThrow(/'name' must be a string/);
  });

  it('should throw error for invalid field type: nativeDependencies not array', async () => {
    const bundleDir = join(testDir, 'invalid-deps-type');
    await mkdir(bundleDir, { recursive: true });

    const manifestData = {
      name: 'test',
      version: '1.0.0',
      entryPoint: 'server.js',
      nativeDependencies: 'not-an-array',
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
    };

    await writeFile(join(bundleDir, 'bundle.json'), JSON.stringify(manifestData));

    await expect(readManifest(bundleDir)).rejects.toThrow(/'nativeDependencies' must be an array/);
  });

  it('should throw error for invalid timestamp format', async () => {
    const bundleDir = join(testDir, 'invalid-timestamp');
    await mkdir(bundleDir, { recursive: true });

    const manifestData = {
      name: 'test',
      version: '1.0.0',
      entryPoint: 'server.js',
      nativeDependencies: [],
      createdAt: 'not-a-valid-timestamp',
      simplyMcpVersion: '4.0.0',
    };

    await writeFile(join(bundleDir, 'bundle.json'), JSON.stringify(manifestData));

    await expect(readManifest(bundleDir)).rejects.toThrow(/'createdAt' must be a valid ISO timestamp/);
  });

  it('should handle manifest with minimal fields (no description)', async () => {
    const bundleDir = join(testDir, 'minimal-manifest');
    await mkdir(bundleDir, { recursive: true });

    const manifestData = {
      name: 'test',
      version: '1.0.0',
      entryPoint: 'server.js',
      nativeDependencies: [],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
    };

    await writeFile(join(bundleDir, 'bundle.json'), JSON.stringify(manifestData));

    const manifest = await readManifest(bundleDir);

    expect(manifest.name).toBe('test');
    expect(manifest.description).toBeUndefined();
  });
});

describe('Bundle Manifest - Round-trip Tests', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-manifest-roundtrip-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should produce same data after generate → write → read', async () => {
    const bundleDir = join(testDir, 'roundtrip-1');
    await mkdir(bundleDir, { recursive: true });

    const metadata: ServerMetadata = {
      name: 'roundtrip-server',
      version: '1.0.0',
      description: 'Roundtrip test server',
    };

    const nativeDeps = ['better-sqlite3', 'bcrypt'];
    const manifest = generateManifest(metadata, nativeDeps, 'server.js');

    await writeManifest(bundleDir, manifest);
    const readBack = await readManifest(bundleDir);

    expect(readBack.name).toBe(manifest.name);
    expect(readBack.version).toBe(manifest.version);
    expect(readBack.description).toBe(manifest.description);
    expect(readBack.entryPoint).toBe(manifest.entryPoint);
    expect(readBack.nativeDependencies).toEqual(manifest.nativeDependencies);
    expect(readBack.createdAt).toBe(manifest.createdAt);
    expect(readBack.simplyMcpVersion).toBe(manifest.simplyMcpVersion);
  });

  it('should handle multiple write/read cycles correctly', async () => {
    const bundleDir = join(testDir, 'multi-cycle');
    await mkdir(bundleDir, { recursive: true });

    const metadata: ServerMetadata = {
      name: 'multi-cycle-server',
      version: '1.0.0',
    };

    // First cycle
    const manifest1 = generateManifest(metadata, ['dep1']);
    await writeManifest(bundleDir, manifest1);
    const read1 = await readManifest(bundleDir);
    expect(read1.nativeDependencies).toEqual(['dep1']);

    // Second cycle - overwrite with new data
    const manifest2 = generateManifest(metadata, ['dep2', 'dep3']);
    await writeManifest(bundleDir, manifest2);
    const read2 = await readManifest(bundleDir);
    expect(read2.nativeDependencies).toEqual(['dep2', 'dep3']);

    // Third cycle - empty dependencies
    const manifest3 = generateManifest(metadata, []);
    await writeManifest(bundleDir, manifest3);
    const read3 = await readManifest(bundleDir);
    expect(read3.nativeDependencies).toEqual([]);
  });

  it('should preserve special characters through roundtrip', async () => {
    const bundleDir = join(testDir, 'special-chars');
    await mkdir(bundleDir, { recursive: true });

    const metadata: ServerMetadata = {
      name: '@scope/package-name',
      version: '1.0.0-beta.1+build.123',
      description: 'Server with "quotes", <tags>, & ampersands, \n newlines',
    };

    const manifest = generateManifest(metadata, ['@native/package']);
    await writeManifest(bundleDir, manifest);
    const readBack = await readManifest(bundleDir);

    expect(readBack.name).toBe(metadata.name);
    expect(readBack.version).toBe(metadata.version);
    expect(readBack.description).toBe(metadata.description);
  });

  it('should preserve empty arrays through roundtrip', async () => {
    const bundleDir = join(testDir, 'empty-arrays');
    await mkdir(bundleDir, { recursive: true });

    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0',
    };

    const manifest = generateManifest(metadata, []);
    await writeManifest(bundleDir, manifest);
    const readBack = await readManifest(bundleDir);

    expect(readBack.nativeDependencies).toEqual([]);
    expect(Array.isArray(readBack.nativeDependencies)).toBe(true);
  });
});

describe('Bundle Manifest - Edge Cases', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-manifest-edge-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should handle scoped package names', () => {
    const metadata: ServerMetadata = {
      name: '@myorg/my-server',
      version: '1.0.0',
    };

    const manifest = generateManifest(metadata, ['@native/sqlite']);

    expect(manifest.name).toBe('@myorg/my-server');
    expect(manifest.nativeDependencies).toEqual(['@native/sqlite']);
  });

  it('should handle semver pre-release versions', () => {
    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0-alpha.1',
    };

    const manifest = generateManifest(metadata, []);

    expect(manifest.version).toBe('1.0.0-alpha.1');
  });

  it('should handle semver build metadata', () => {
    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0+build.123',
    };

    const manifest = generateManifest(metadata, []);

    expect(manifest.version).toBe('1.0.0+build.123');
  });

  it('should handle Unicode characters in description', async () => {
    const bundleDir = join(testDir, 'unicode');
    await mkdir(bundleDir, { recursive: true });

    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0',
      description: 'Server with Unicode: 你好, мир, 🌍',
    };

    const manifest = generateManifest(metadata, []);
    await writeManifest(bundleDir, manifest);
    const readBack = await readManifest(bundleDir);

    expect(readBack.description).toBe('Server with Unicode: 你好, мир, 🌍');
  });

  it('should handle very long dependency lists', () => {
    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0',
    };

    const manyDeps = Array.from({ length: 100 }, (_, i) => `dep-${i}`);
    const manifest = generateManifest(metadata, manyDeps);

    expect(manifest.nativeDependencies.length).toBe(100);
    expect(manifest.nativeDependencies[0]).toBe('dep-0');
    expect(manifest.nativeDependencies[99]).toBe('dep-99');
  });

  it('should handle different entry point names', () => {
    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0',
    };

    const testCases = ['index.js', 'main.js', 'dist/server.js', 'src/index.ts'];

    testCases.forEach(entryPoint => {
      const manifest = generateManifest(metadata, [], entryPoint);
      expect(manifest.entryPoint).toBe(entryPoint);
    });
  });

  it('should handle timestamp precision', () => {
    const metadata: ServerMetadata = {
      name: 'test',
      version: '1.0.0',
    };

    const manifest = generateManifest(metadata, []);

    // Should include milliseconds
    expect(manifest.createdAt).toMatch(/\.\d{3}Z$/);
  });

  it('should handle manifest with extra unknown fields', async () => {
    const bundleDir = join(testDir, 'extra-fields');
    await mkdir(bundleDir, { recursive: true });

    const manifestData = {
      name: 'test',
      version: '1.0.0',
      entryPoint: 'server.js',
      nativeDependencies: [],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
      extraField: 'this should be ignored but not cause errors',
      anotherExtra: 123,
    };

    await writeFile(join(bundleDir, 'bundle.json'), JSON.stringify(manifestData));

    // Should read successfully and ignore extra fields
    const manifest = await readManifest(bundleDir);

    expect(manifest.name).toBe('test');
    expect((manifest as any).extraField).toBe('this should be ignored but not cause errors');
  });

  it('should validate all required fields are present even if extra fields exist', async () => {
    const bundleDir = join(testDir, 'extra-missing-required');
    await mkdir(bundleDir, { recursive: true });

    const manifestData = {
      name: 'test',
      // version missing - should still fail
      entryPoint: 'server.js',
      nativeDependencies: [],
      createdAt: new Date().toISOString(),
      simplyMcpVersion: '4.0.0',
      extraField: 'extra',
    };

    await writeFile(join(bundleDir, 'bundle.json'), JSON.stringify(manifestData));

    await expect(readManifest(bundleDir)).rejects.toThrow(/missing required fields.*version/);
  });
});
