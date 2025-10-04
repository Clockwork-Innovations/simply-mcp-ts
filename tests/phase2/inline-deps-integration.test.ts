/**
 * Integration Tests for Inline Dependencies
 *
 * Tests SimplyMCP integration and end-to-end workflows
 * These tests actually call the implementation (no mocking!)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { SimplyMCP } from '../../SimplyMCP.js';
import {
  parseInlineDependencies,
  extractDependencyBlock,
} from '../../core/dependency-parser.js';
import {
  validateDependencies,
  validatePackageName,
  validateSemverRange,
  detectConflicts,
} from '../../core/dependency-validator.js';
import {
  generatePackageJson,
  mergeDependencies,
  formatDependencyList,
  getDependencyStats,
  filterDependencies,
  sortDependencies,
} from '../../core/dependency-utils.js';

const FIXTURES_DIR = join(__dirname, 'fixtures', 'inline-deps');
const TEMP_DIR = '/tmp/mcp-test-inline-deps';

describe('Inline Dependencies - Integration Tests', () => {
  beforeEach(async () => {
    // Create temp directory for tests
    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true });
    }
  });

  // ========================================================================
  // SimplyMCP.fromFile() Integration Tests
  // ========================================================================

  describe('SimplyMCP.fromFile()', () => {
    it('should parse inline dependencies from file', async () => {
      const filePath = join(FIXTURES_DIR, 'real-server.ts');
      const server = await SimplyMCP.fromFile(filePath, {
        name: 'test-server',
        version: '1.0.0',
      });

      const deps = server.getDependencies();
      expect(deps).toBeDefined();
      expect(deps?.map).toHaveProperty('zod');
      expect(deps?.map.zod).toBe('^3.22.0');
    });

    it('should work with files without inline deps', async () => {
      const filePath = join(FIXTURES_DIR, 'no-deps.txt');
      const server = await SimplyMCP.fromFile(filePath, {
        name: 'test',
        version: '1.0.0',
      });

      const deps = server.getDependencies();
      expect(deps).toBeDefined();
      expect(Object.keys(deps?.map || {}).length).toBe(0);
    });

    it('should throw on invalid inline deps with strict mode', async () => {
      const tempFile = join(TEMP_DIR, 'invalid-strict.ts');
      await writeFile(
        tempFile,
        `// /// dependencies\n// INVALID@^1.0.0\n// ///\n`
      );

      await expect(
        SimplyMCP.fromFile(tempFile, {
          name: 'test',
          version: '1.0.0',
          parseOptions: { strict: true },
        })
      ).rejects.toThrow();
    });
  });

  // ========================================================================
  // SimplyMCP Dependency Access Tests
  // ========================================================================

  describe('SimplyMCP Dependency Access', () => {
    it('hasDependency() should return true for existing deps', () => {
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

      expect(server.hasDependency('axios')).toBe(true);
      expect(server.hasDependency('zod')).toBe(true);
      expect(server.hasDependency('lodash')).toBe(false);
    });

    it('getDependencyVersion() should return correct version', () => {
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

      expect(server.getDependencyVersion('axios')).toBe('^1.6.0');
      expect(server.getDependencyVersion('zod')).toBe('^3.22.0');
      expect(server.getDependencyVersion('lodash')).toBeUndefined();
    });

    it('getDependencies() should return all deps', () => {
      const inlineDeps = {
        map: { axios: '^1.6.0', zod: '^3.22.0' },
        dependencies: [
          { name: 'axios', version: '^1.6.0' },
          { name: 'zod', version: '^3.22.0' },
        ],
        errors: [],
        warnings: [],
        raw: '',
      };

      const server = new SimplyMCP({
        name: 'test',
        version: '1.0.0',
        dependencies: inlineDeps,
      });

      const deps = server.getDependencies();
      expect(deps).toEqual(inlineDeps);
      expect(deps?.dependencies.length).toBe(2);
    });
  });

  // ========================================================================
  // Package.json Generation Tests
  // ========================================================================

  describe('generatePackageJson()', () => {
    it('should generate valid package.json structure', () => {
      const deps = {
        axios: '^1.6.0',
        zod: '^3.22.0',
        typescript: '^5.0.0',
      };

      const pkg = generatePackageJson(deps, {
        name: 'test-server',
        version: '1.0.0',
        devDeps: ['typescript'],
      });

      expect(pkg.name).toBe('test-server');
      expect(pkg.version).toBe('1.0.0');
      expect(pkg.dependencies).toEqual({
        axios: '^1.6.0',
        zod: '^3.22.0',
      });
      expect(pkg.devDependencies).toEqual({
        typescript: '^5.0.0',
      });
    });

    it('should handle peer dependencies', () => {
      const deps = {
        axios: '^1.6.0',
        react: '^18.0.0',
      };

      const pkg = generatePackageJson(deps, {
        name: 'test',
        version: '1.0.0',
        peerDeps: ['react'],
      });

      expect(pkg.dependencies).toEqual({ axios: '^1.6.0' });
      expect(pkg.peerDependencies).toEqual({ react: '^18.0.0' });
    });

    it('should handle dependency array input', () => {
      const deps = [
        { name: 'axios', version: '^1.6.0' },
        { name: 'zod', version: '^3.22.0' },
      ];

      const pkg = generatePackageJson(deps, {
        name: 'test',
        version: '1.0.0',
      });

      expect(pkg.dependencies).toEqual({
        axios: '^1.6.0',
        zod: '^3.22.0',
      });
    });
  });

  // ========================================================================
  // Dependency Merging Tests
  // ========================================================================

  describe('mergeDependencies()', () => {
    it('should merge inline deps with package.json', () => {
      const inlineDeps = {
        axios: '^1.6.0',
        zod: '^3.22.0',
      };

      const packageJson = {
        name: 'test',
        version: '1.0.0',
        dependencies: {
          lodash: '^4.17.21',
        },
      };

      const result = mergeDependencies(inlineDeps, packageJson);

      expect(result.dependencies).toEqual({
        lodash: '^4.17.21',
        axios: '^1.6.0',
        zod: '^3.22.0',
      });
      expect(result.conflicts.length).toBe(0);
    });

    it('should detect conflicts (package.json wins)', () => {
      const inlineDeps = {
        axios: '^1.6.0',
      };

      const packageJson = {
        name: 'test',
        version: '1.0.0',
        dependencies: {
          axios: '^1.5.0',
        },
      };

      const result = mergeDependencies(inlineDeps, packageJson);

      expect(result.dependencies.axios).toBe('^1.5.0');
      expect(result.conflicts).toContain('axios');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle devDependencies and peerDependencies', () => {
      const inlineDeps = {
        axios: '^1.6.0',
      };

      const packageJson = {
        name: 'test',
        version: '1.0.0',
        dependencies: {
          lodash: '^4.17.21',
        },
        devDependencies: {
          typescript: '^5.0.0',
        },
        peerDependencies: {
          react: '^18.0.0',
        },
      };

      const result = mergeDependencies(inlineDeps, packageJson);

      expect(result.dependencies).toHaveProperty('axios');
      expect(result.dependencies).toHaveProperty('lodash');
      expect(result.dependencies).toHaveProperty('typescript');
      expect(result.dependencies).toHaveProperty('react');
    });
  });

  // ========================================================================
  // Formatting Tests
  // ========================================================================

  describe('formatDependencyList()', () => {
    it('should format as list (default)', () => {
      const deps = {
        axios: '^1.6.0',
        zod: '^3.22.0',
      };

      const formatted = formatDependencyList(deps);
      expect(formatted).toContain('axios@^1.6.0');
      expect(formatted).toContain('zod@^3.22.0');
    });

    it('should format as inline', () => {
      const deps = {
        axios: '^1.6.0',
        zod: '^3.22.0',
      };

      const formatted = formatDependencyList(deps, { format: 'inline' });
      expect(formatted).toContain('axios@^1.6.0,');
      expect(formatted).toContain('zod@^3.22.0');
    });

    it('should format as JSON', () => {
      const deps = {
        axios: '^1.6.0',
        zod: '^3.22.0',
      };

      const formatted = formatDependencyList(deps, { format: 'json' });
      const parsed = JSON.parse(formatted);
      expect(parsed).toEqual(deps);
    });

    it('should include count', () => {
      const deps = {
        axios: '^1.6.0',
        zod: '^3.22.0',
      };

      const formatted = formatDependencyList(deps, { includeCount: true });
      expect(formatted).toContain('2 dependencies');
    });
  });

  // ========================================================================
  // Stats and Filtering Tests
  // ========================================================================

  describe('getDependencyStats()', () => {
    it('should calculate correct stats', () => {
      const deps = {
        axios: '^1.6.0',
        '@types/node': '^20.0.0',
        '@types/express': '^4.17.0',
        lodash: '*',
        zod: 'latest',
        'date-fns': '^2.30.0',
      };

      const stats = getDependencyStats(deps);

      expect(stats.total).toBe(6);
      expect(stats.scoped).toBe(2);
      expect(stats.unscoped).toBe(4);
      expect(stats.types).toBe(2);
      expect(stats.wildcards).toBe(2);
      expect(stats.versioned).toBe(4);
    });
  });

  describe('filterDependencies()', () => {
    it('should filter by pattern', () => {
      const deps = {
        '@types/node': '^20.0.0',
        '@types/express': '^4.17.0',
        axios: '^1.6.0',
        zod: '^3.22.0',
      };

      const filtered = filterDependencies(deps, '@types/*');

      expect(Object.keys(filtered).length).toBe(2);
      expect(filtered).toHaveProperty('@types/node');
      expect(filtered).toHaveProperty('@types/express');
      expect(filtered).not.toHaveProperty('axios');
    });

    it('should filter by regex', () => {
      const deps = {
        axios: '^1.6.0',
        'axios-retry': '^3.8.0',
        zod: '^3.22.0',
      };

      const filtered = filterDependencies(deps, /^axios/);

      expect(Object.keys(filtered).length).toBe(2);
      expect(filtered).toHaveProperty('axios');
      expect(filtered).toHaveProperty('axios-retry');
    });
  });

  describe('sortDependencies()', () => {
    it('should sort alphabetically', () => {
      const deps = {
        zod: '^3.22.0',
        axios: '^1.6.0',
        lodash: '^4.17.21',
        '@types/node': '^20.0.0',
      };

      const sorted = sortDependencies(deps);
      const keys = Object.keys(sorted);

      expect(keys[0]).toBe('@types/node');
      expect(keys[1]).toBe('axios');
      expect(keys[2]).toBe('lodash');
      expect(keys[3]).toBe('zod');
    });
  });

  // ========================================================================
  // End-to-End Workflow Tests
  // ========================================================================

  describe('E2E Workflows', () => {
    it('should parse → validate → generate package.json', async () => {
      const source = await readFile(
        join(FIXTURES_DIR, 'valid-simple.txt'),
        'utf-8'
      );

      // Parse
      const parseResult = parseInlineDependencies(source);
      expect(parseResult.errors.length).toBe(0);

      // Validate
      const validation = validateDependencies(parseResult.dependencies);
      expect(validation.valid).toBe(true);

      // Generate package.json
      const pkg = generatePackageJson(parseResult.dependencies, {
        name: 'test-server',
        version: '1.0.0',
      });

      expect(pkg.dependencies).toEqual(parseResult.dependencies);
    });

    it('should handle complete server lifecycle', async () => {
      // Create server file
      const serverFile = join(TEMP_DIR, 'test-server.ts');
      await writeFile(
        serverFile,
        `// /// dependencies
// zod@^3.22.0
// ///

import { SimplyMCP } from '../../../SimplyMCP.js';
import { z } from 'zod';

const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
export default server;
`
      );

      // Load server
      const server = await SimplyMCP.fromFile(serverFile, {
        name: 'test',
        version: '1.0.0',
      });

      // Check dependencies
      expect(server.hasDependency('zod')).toBe(true);
      expect(server.getDependencyVersion('zod')).toBe('^3.22.0');

      // Get dependencies
      const deps = server.getDependencies();
      expect(deps?.dependencies.length).toBe(1);

      // Generate package.json
      const pkg = generatePackageJson(deps!.map, {
        name: 'test-server',
        version: '1.0.0',
      });

      expect(pkg.dependencies).toHaveProperty('zod');
    });

    it('should detect and handle security issues', async () => {
      const source = await readFile(
        join(FIXTURES_DIR, 'security-injection.txt'),
        'utf-8'
      );

      const result = parseInlineDependencies(source);

      // Should have errors for all malicious entries
      expect(result.errors.length).toBeGreaterThan(0);

      // Should not have successfully parsed any dangerous deps
      expect(Object.keys(result.dependencies).length).toBe(0);
    });

    it('should handle large dependency lists efficiently', async () => {
      const source = await readFile(
        join(FIXTURES_DIR, 'large-list.txt'),
        'utf-8'
      );

      const startTime = Date.now();
      const result = parseInlineDependencies(source);
      const endTime = Date.now();

      expect(result.errors.length).toBe(0);
      expect(Object.keys(result.dependencies).length).toBeGreaterThan(10);

      // Should parse in reasonable time (<100ms for 20 packages)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should maintain backward compatibility', () => {
      // Server without inline deps should work fine
      const server = new SimplyMCP({
        name: 'old-server',
        version: '1.0.0',
      });

      expect(server.getDependencies()).toBeNull();
      expect(server.hasDependency('axios')).toBe(false);
      expect(server.getDependencyVersion('axios')).toBeUndefined();
    });
  });
});
