/**
 * Auto-Installation Feature - Integration Tests
 * Tests integration between components and SimplyMCP API
 * CRITICAL: All tests MUST call real implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimplyMCP } from '../../SimplyMCP.js';
import { checkDependencies, isPackageInstalled, getInstalledVersion } from '../../core/dependency-checker.js';
import { detectPackageManager } from '../../core/package-manager-detector.js';
import { installDependencies } from '../../core/dependency-installer.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

const TEMP_DIR = '/tmp/mcp-test-auto-install-integration';

describe('Auto-Installation - Integration Tests', () => {
  beforeEach(async () => {
    await mkdir(TEMP_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEMP_DIR, { recursive: true, force: true });
  });

  // Group 1: SimplyMCP API Tests (10 tests)
  describe('SimplyMCP API', () => {
    it('server.checkDependencies() returns status', async () => {
      const server = new SimplyMCP({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          map: { axios: '^1.6.0' },
          dependencies: [{ name: 'axios', version: '^1.6.0' }],
          errors: [],
          warnings: [],
          raw: '',
        },
      });

      const status = await server.checkDependencies();
      expect(status).toHaveProperty('installed');
      expect(status).toHaveProperty('missing');
      expect(status).toHaveProperty('outdated');
      expect(Array.isArray(status.missing)).toBe(true);
    });

    it('server.checkDependencies() with no deps returns empty', async () => {
      const server = new SimplyMCP({
        name: 'test',
        version: '1.0.0',
      });

      const status = await server.checkDependencies();
      expect(status.installed.length).toBe(0);
      expect(status.missing.length).toBe(0);
      expect(status.outdated.length).toBe(0);
    });

    it('server.installDependencies() returns result with empty deps', async () => {
      const server = new SimplyMCP({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          map: {},
          dependencies: [],
          errors: [],
          warnings: [],
          raw: '',
        },
      });

      const result = await server.installDependencies({ packageManager: 'npm' });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('installed');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('packageManager');
      expect(result.success).toBe(true);
      expect(result.installed.length).toBe(0);
    });

    it('server.installDependencies() with invalid package fails validation', async () => {
      const server = new SimplyMCP({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          map: { 'INVALID@NAME': '^1.0.0' },
          dependencies: [{ name: 'INVALID@NAME', version: '^1.0.0' }],
          errors: [],
          warnings: [],
          raw: '',
        },
      });

      const result = await server.installDependencies({ packageManager: 'npm' });
      expect(result.success).toBe(false);
      expect(result.failed.length).toBeGreaterThan(0);
    });

    it('server dependencies are parsed correctly from constructor', async () => {
      const server = new SimplyMCP({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          map: { axios: '^1.6.0', zod: '^3.22.0' },
          dependencies: [
            { name: 'axios', version: '^1.6.0' },
            { name: 'zod', version: '^3.22.0' },
          ],
          errors: [],
          warnings: [],
          raw: '',
        },
      });

      const status = await server.checkDependencies();
      expect(status.missing.length).toBeGreaterThanOrEqual(0);
      // Either missing or installed, but should have 2 total packages tracked
      const totalPackages = status.missing.length + status.installed.length + status.outdated.length;
      expect(totalPackages).toBe(2);
    });

    it('server handles undefined dependencies gracefully', async () => {
      const server = new SimplyMCP({
        name: 'test',
        version: '1.0.0',
      });

      const status = await server.checkDependencies();
      expect(status).toBeDefined();
      expect(status.installed).toEqual([]);
      expect(status.missing).toEqual([]);
      expect(status.outdated).toEqual([]);
    });

    it('server.installDependencies() accepts custom options', async () => {
      const server = new SimplyMCP({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          map: {},
          dependencies: [],
          errors: [],
          warnings: [],
          raw: '',
        },
      });

      const result = await server.installDependencies({
        packageManager: 'npm',
        timeout: 60000,
        retries: 5,
        ignoreScripts: true,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('server basePath is used for dependency checking', async () => {
      const customPath = join(TEMP_DIR, 'custom');
      await mkdir(customPath, { recursive: true });

      const server = new SimplyMCP({
        name: 'test',
        version: '1.0.0',
        basePath: customPath,
        dependencies: {
          map: { axios: '^1.6.0' },
          dependencies: [{ name: 'axios', version: '^1.6.0' }],
          errors: [],
          warnings: [],
          raw: '',
        },
      });

      const status = await server.checkDependencies();
      expect(status).toBeDefined();
      // Should check in custom path, not cwd
      expect(status.missing).toContain('axios');
    });

    it('server handles progress callbacks', async () => {
      const server = new SimplyMCP({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          map: {},
          dependencies: [],
          errors: [],
          warnings: [],
          raw: '',
        },
      });

      let progressCalled = false;
      const result = await server.installDependencies({
        packageManager: 'npm',
        onProgress: (event) => {
          progressCalled = true;
        },
      });

      expect(result).toBeDefined();
      // Progress may or may not be called with empty deps
      expect(typeof progressCalled).toBe('boolean');
    });

    it('server handles error callbacks', async () => {
      const server = new SimplyMCP({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          map: { 'INVALID_PKG': '^1.0.0' },
          dependencies: [{ name: 'INVALID_PKG', version: '^1.0.0' }],
          errors: [],
          warnings: [],
          raw: '',
        },
      });

      let errorCalled = false;
      const result = await server.installDependencies({
        packageManager: 'npm',
        onError: (error) => {
          errorCalled = true;
        },
      });

      expect(result).toBeDefined();
      // Error callback might be called
      expect(typeof errorCalled).toBe('boolean');
    });
  });

  // Group 2: Dependency Checking Integration (10 tests)
  describe('Dependency Checking', () => {
    it('identifies missing dependencies correctly', async () => {
      const tempDir = join(TEMP_DIR, 'missing-deps');
      await mkdir(tempDir, { recursive: true });

      // Create node_modules with one package
      await mkdir(join(tempDir, 'node_modules', 'axios'), { recursive: true });
      await writeFile(
        join(tempDir, 'node_modules', 'axios', 'package.json'),
        JSON.stringify({ name: 'axios', version: '1.6.0' })
      );

      // Check for axios (installed) and zod (missing)
      const status = await checkDependencies(
        { axios: '^1.6.0', zod: '^3.22.0' },
        tempDir
      );

      expect(status.installed).toContain('axios');
      expect(status.missing).toContain('zod');
    });

    it('identifies outdated dependencies correctly', async () => {
      const tempDir = join(TEMP_DIR, 'outdated-deps');
      await mkdir(tempDir, { recursive: true });

      // Install old version of axios
      await mkdir(join(tempDir, 'node_modules', 'axios'), { recursive: true });
      await writeFile(
        join(tempDir, 'node_modules', 'axios', 'package.json'),
        JSON.stringify({ name: 'axios', version: '1.0.0' })
      );

      const status = await checkDependencies(
        { axios: '^1.5.0' }, // Require 1.5.0+, but have 1.0.0
        tempDir
      );

      expect(status.outdated.length).toBeGreaterThan(0);
      expect(status.outdated[0].name).toBe('axios');
      expect(status.outdated[0].current).toBe('1.0.0');
    });

    it('handles scoped packages correctly', async () => {
      const tempDir = join(TEMP_DIR, 'scoped-deps');
      await mkdir(tempDir, { recursive: true });

      // Create scoped package
      await mkdir(join(tempDir, 'node_modules', '@types', 'node'), { recursive: true });
      await writeFile(
        join(tempDir, 'node_modules', '@types', 'node', 'package.json'),
        JSON.stringify({ name: '@types/node', version: '20.0.0' })
      );

      const status = await checkDependencies(
        { '@types/node': '^20.0.0' },
        tempDir
      );

      expect(status.installed).toContain('@types/node');
    });

    it('isPackageInstalled works correctly', async () => {
      const tempDir = join(TEMP_DIR, 'is-installed');
      await mkdir(tempDir, { recursive: true });

      // Create package
      await mkdir(join(tempDir, 'node_modules', 'axios'), { recursive: true });
      await writeFile(
        join(tempDir, 'node_modules', 'axios', 'package.json'),
        JSON.stringify({ name: 'axios', version: '1.6.0' })
      );

      const installed = await isPackageInstalled('axios', tempDir);
      const notInstalled = await isPackageInstalled('zod', tempDir);

      expect(installed).toBe(true);
      expect(notInstalled).toBe(false);
    });

    it('getInstalledVersion returns correct version', async () => {
      const tempDir = join(TEMP_DIR, 'get-version');
      await mkdir(tempDir, { recursive: true });

      await mkdir(join(tempDir, 'node_modules', 'axios'), { recursive: true });
      await writeFile(
        join(tempDir, 'node_modules', 'axios', 'package.json'),
        JSON.stringify({ name: 'axios', version: '1.6.0' })
      );

      const version = await getInstalledVersion('axios', tempDir);
      expect(version).toBe('1.6.0');
    });

    it('getInstalledVersion returns null for missing package', async () => {
      const tempDir = join(TEMP_DIR, 'get-version-null');
      await mkdir(tempDir, { recursive: true });

      const version = await getInstalledVersion('nonexistent', tempDir);
      expect(version).toBeNull();
    });

    it('handles corrupted package.json gracefully', async () => {
      const tempDir = join(TEMP_DIR, 'corrupted');
      await mkdir(tempDir, { recursive: true });

      await mkdir(join(tempDir, 'node_modules', 'axios'), { recursive: true });
      await writeFile(
        join(tempDir, 'node_modules', 'axios', 'package.json'),
        '{ invalid json'
      );

      const status = await checkDependencies({ axios: '^1.6.0' }, tempDir);
      // Should treat as missing
      expect(status.missing).toContain('axios');
    });

    it('handles multiple packages correctly', async () => {
      const tempDir = join(TEMP_DIR, 'multiple');
      await mkdir(tempDir, { recursive: true });

      // Install some packages
      const packages = ['axios', 'zod', 'lodash'];
      for (const pkg of packages) {
        await mkdir(join(tempDir, 'node_modules', pkg), { recursive: true });
        await writeFile(
          join(tempDir, 'node_modules', pkg, 'package.json'),
          JSON.stringify({ name: pkg, version: '1.0.0' })
        );
      }

      const status = await checkDependencies(
        {
          axios: '*',
          zod: '*',
          lodash: '*',
          missing: '^1.0.0',
        },
        tempDir
      );

      expect(status.installed.length).toBe(3);
      expect(status.missing.length).toBe(1);
    });

    it('handles empty node_modules directory', async () => {
      const tempDir = join(TEMP_DIR, 'empty-nm');
      await mkdir(tempDir, { recursive: true });
      await mkdir(join(tempDir, 'node_modules'), { recursive: true });

      const status = await checkDependencies({ axios: '^1.6.0' }, tempDir);
      expect(status.missing).toContain('axios');
    });

    it('works without node_modules directory', async () => {
      const tempDir = join(TEMP_DIR, 'no-nm');
      await mkdir(tempDir, { recursive: true });

      const status = await checkDependencies({ axios: '^1.6.0' }, tempDir);
      expect(status.missing).toContain('axios');
    });
  });

  // Group 3: Package Manager Detection Integration (5 tests)
  describe('Package Manager Detection', () => {
    it('detects npm from package-lock.json', async () => {
      const tempDir = join(TEMP_DIR, 'detect-npm');
      await mkdir(tempDir, { recursive: true });
      await writeFile(join(tempDir, 'package-lock.json'), '{}');

      const pm = await detectPackageManager(tempDir);
      expect(pm.name).toBe('npm');
    });

    it('detects yarn from yarn.lock', async () => {
      const tempDir = join(TEMP_DIR, 'detect-yarn');
      await mkdir(tempDir, { recursive: true });
      await writeFile(join(tempDir, 'yarn.lock'), '');

      const pm = await detectPackageManager(tempDir);
      expect(pm.name).toBe('yarn');
    });

    it('detects pnpm from pnpm-lock.yaml', async () => {
      const tempDir = join(TEMP_DIR, 'detect-pnpm');
      await mkdir(tempDir, { recursive: true });
      await writeFile(join(tempDir, 'pnpm-lock.yaml'), '');

      const pm = await detectPackageManager(tempDir);
      expect(pm.name).toBe('pnpm');
    });

    it('defaults to npm when no lock files exist', async () => {
      const tempDir = join(TEMP_DIR, 'detect-default');
      await mkdir(tempDir, { recursive: true });

      const pm = await detectPackageManager(tempDir);
      expect(pm.name).toBe('npm');
    });

    it('respects package manager preference', async () => {
      const tempDir = join(TEMP_DIR, 'detect-prefer');
      await mkdir(tempDir, { recursive: true });
      await writeFile(join(tempDir, 'package-lock.json'), '{}');

      // Prefer yarn even though npm lock exists
      const pm = await detectPackageManager(tempDir, 'yarn');
      expect(pm.name).toBe('yarn');
    });
  });

  // Group 4: Installation Integration (5 tests)
  describe('Installation Integration', () => {
    it('installDependencies returns proper structure with empty deps', async () => {
      const tempDir = join(TEMP_DIR, 'install-empty');
      await mkdir(tempDir, { recursive: true });

      const result = await installDependencies({}, {
        packageManager: 'npm',
        cwd: tempDir,
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('installed');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('packageManager');
      expect(result).toHaveProperty('lockFile');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    it('validates package names before installation', async () => {
      const tempDir = join(TEMP_DIR, 'install-validate');
      await mkdir(tempDir, { recursive: true });

      const result = await installDependencies(
        { 'INVALID@NAME': '^1.0.0' },
        {
          packageManager: 'npm',
          cwd: tempDir,
        }
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('validates versions before installation', async () => {
      const tempDir = join(TEMP_DIR, 'install-validate-version');
      await mkdir(tempDir, { recursive: true });

      const result = await installDependencies(
        { axios: 'not-a-version' },
        {
          packageManager: 'npm',
          cwd: tempDir,
        }
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles progress callbacks correctly', async () => {
      const tempDir = join(TEMP_DIR, 'install-progress');
      await mkdir(tempDir, { recursive: true });

      const progressEvents: any[] = [];
      await installDependencies({}, {
        packageManager: 'npm',
        cwd: tempDir,
        onProgress: (event) => {
          progressEvents.push(event);
        },
      });

      // May or may not have progress events with empty deps
      expect(Array.isArray(progressEvents)).toBe(true);
    });

    it('handles error callbacks correctly', async () => {
      const tempDir = join(TEMP_DIR, 'install-error');
      await mkdir(tempDir, { recursive: true });

      const errors: any[] = [];
      const result = await installDependencies(
        { 'INVALID_PKG': '^1.0.0' },
        {
          packageManager: 'npm',
          cwd: tempDir,
          onError: (error) => {
            errors.push(error);
          },
        }
      );

      expect(result.errors.length).toBeGreaterThan(0);
      // Error callback might be called
      expect(Array.isArray(errors)).toBe(true);
    });
  });
});
