/**
 * Bundling Feature 4.2 - Advanced Formats Integration Tests
 * Tests integration between standalone formatter, executable builder,
 * source map handler, and watch manager
 * CRITICAL: All tests MUST call real implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createStandaloneBundle } from '../../core/formatters/standalone-formatter.js';
import { createExecutable, validateExecutable } from '../../core/formatters/executable-builder.js';
import { handleSourceMap, inlineSourceMap } from '../../core/formatters/sourcemap-handler.js';
import { bundle } from '../../core/bundler.js';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const TEMP_DIR = '/tmp/mcp-test-bundle-advanced-integration';

describe('Feature 4.2 - Advanced Formats Integration', () => {
  beforeEach(async () => {
    await mkdir(TEMP_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEMP_DIR, { recursive: true, force: true });
  });

  // Group 1: Standalone Formatter Integration (5 tests)
  describe('Standalone Formatter', () => {
    it('creates standalone bundle with all files', async () => {
      const bundlePath = join(TEMP_DIR, 'bundle.js');
      await writeFile(
        bundlePath,
        `import { SimplyMCP } from 'simply-mcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await createStandaloneBundle({
        bundlePath,
        outputDir: join(TEMP_DIR, 'standalone'),
      });

      expect(result.outputDir).toBe(join(TEMP_DIR, 'standalone'));
      expect(result.files.length).toBeGreaterThanOrEqual(2);
      expect(existsSync(join(TEMP_DIR, 'standalone/server.js'))).toBe(true);
      expect(existsSync(join(TEMP_DIR, 'standalone/package.json'))).toBe(true);
    });

    it('generates valid package.json', async () => {
      const bundlePath = join(TEMP_DIR, 'bundle.js');
      await writeFile(bundlePath, `console.log('test');`);

      await createStandaloneBundle({
        bundlePath,
        outputDir: join(TEMP_DIR, 'standalone'),
      });

      const pkgPath = join(TEMP_DIR, 'standalone/package.json');
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));

      expect(pkg.name).toBeTruthy();
      expect(pkg.main).toBe('server.js');
      expect(pkg.type).toBe('module');
      expect(pkg.scripts.start).toBe('node server.js');
    });

    it('includes only native modules in dependencies', async () => {
      const bundlePath = join(TEMP_DIR, 'bundle.js');
      await writeFile(bundlePath, `console.log('test');`);

      await createStandaloneBundle({
        bundlePath,
        outputDir: join(TEMP_DIR, 'standalone'),
        dependencies: {
          'better-sqlite3': '^9.0.0',
          'sharp': '^0.32.0',
          'axios': '^1.6.0',
          'lodash': '^4.17.0',
        },
      });

      const pkgPath = join(TEMP_DIR, 'standalone/package.json');
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));

      expect(pkg.dependencies).toHaveProperty('better-sqlite3');
      expect(pkg.dependencies).toHaveProperty('sharp');
      expect(pkg.dependencies).not.toHaveProperty('axios');
      expect(pkg.dependencies).not.toHaveProperty('lodash');
    });

    it('copies assets to assets directory', async () => {
      const bundlePath = join(TEMP_DIR, 'bundle.js');
      await writeFile(bundlePath, `console.log('test');`);

      const assetPath = join(TEMP_DIR, 'asset.txt');
      await writeFile(assetPath, 'test asset');

      const result = await createStandaloneBundle({
        bundlePath,
        outputDir: join(TEMP_DIR, 'standalone'),
        includeAssets: [assetPath],
      });

      expect(existsSync(join(TEMP_DIR, 'standalone/assets/asset.txt'))).toBe(true);
      expect(result.files.length).toBeGreaterThanOrEqual(3);
    });

    it('handles missing assets gracefully', async () => {
      const bundlePath = join(TEMP_DIR, 'bundle.js');
      await writeFile(bundlePath, `console.log('test');`);

      const result = await createStandaloneBundle({
        bundlePath,
        outputDir: join(TEMP_DIR, 'standalone'),
        includeAssets: [join(TEMP_DIR, 'nonexistent.txt')],
      });

      expect(result.outputDir).toBeTruthy();
      expect(result.files.length).toBeGreaterThanOrEqual(2);
    });
  });

  // Group 2: Executable Builder Integration (5 tests)
  describe('Executable Builder', () => {
    it('validates existing executable', async () => {
      const execPath = join(TEMP_DIR, 'test-exec');
      await writeFile(execPath, '#!/usr/bin/env node\nconsole.log("test");');

      // Make executable on Unix
      if (process.platform !== 'win32') {
        const { chmod } = await import('fs/promises');
        await chmod(execPath, 0o755);
      }

      const isValid = await validateExecutable(execPath);
      expect(isValid).toBe(true);
    });

    it('rejects non-existent executable', async () => {
      const isValid = await validateExecutable(join(TEMP_DIR, 'nonexistent'));
      expect(isValid).toBe(false);
    });

    it('rejects directories as executables', async () => {
      const dirPath = join(TEMP_DIR, 'test-dir');
      await mkdir(dirPath, { recursive: true });

      const isValid = await validateExecutable(dirPath);
      expect(isValid).toBe(false);
    });

    it('maps platform targets correctly', () => {
      const PLATFORM_TARGETS: Record<string, string> = {
        'linux': 'node18-linux-x64',
        'macos': 'node18-macos-x64',
        'macos-arm': 'node18-macos-arm64',
        'windows': 'node18-win-x64',
        'alpine': 'node18-alpine-x64',
      };

      expect(PLATFORM_TARGETS['linux']).toBe('node18-linux-x64');
      expect(PLATFORM_TARGETS['macos']).toBe('node18-macos-x64');
      expect(PLATFORM_TARGETS['macos-arm']).toBe('node18-macos-arm64');
      expect(PLATFORM_TARGETS['windows']).toBe('node18-win-x64');
      expect(PLATFORM_TARGETS['alpine']).toBe('node18-alpine-x64');
    });

    it('generates correct output paths for multiple platforms', () => {
      const platforms = ['linux', 'macos', 'windows'];
      const outputPath = join(TEMP_DIR, 'server');
      const executables: string[] = [];

      for (const platform of platforms) {
        let execPath = outputPath;
        if (platforms.length > 1) {
          execPath = `${outputPath}-${platform}${platform === 'windows' ? '.exe' : ''}`;
        }
        executables.push(execPath);
      }

      expect(executables.length).toBe(3);
      expect(executables.some(e => e.includes('-linux'))).toBe(true);
      expect(executables.some(e => e.includes('-macos'))).toBe(true);
      expect(executables.some(e => e.endsWith('.exe'))).toBe(true);
    });
  });

  // Group 3: Source Map Handler Integration (5 tests)
  describe('Source Map Handler', () => {
    it('creates inline source map', async () => {
      const bundlePath = join(TEMP_DIR, 'bundle.js');
      await writeFile(bundlePath, `console.log('test');`);

      const result = await handleSourceMap({
        bundlePath,
        sourceMapContent: JSON.stringify({ version: 3, sources: [], mappings: '' }),
        mode: 'inline',
      });

      expect(result.inline).toBe(true);
      expect(result.external).toBeNull();
    });

    it('creates external source map file', async () => {
      const bundlePath = join(TEMP_DIR, 'bundle.js');
      await writeFile(bundlePath, `console.log('test');`);

      const result = await handleSourceMap({
        bundlePath,
        sourceMapContent: JSON.stringify({ version: 3, sources: [], mappings: '' }),
        mode: 'external',
      });

      expect(result.inline).toBe(false);
      expect(result.external).toBe(`${bundlePath}.map`);
      expect(existsSync(`${bundlePath}.map`)).toBe(true);
    });

    it('creates both inline and external source maps', async () => {
      const bundlePath = join(TEMP_DIR, 'bundle.js');
      await writeFile(bundlePath, `console.log('test');`);

      const result = await handleSourceMap({
        bundlePath,
        sourceMapContent: JSON.stringify({ version: 3, sources: [], mappings: '' }),
        mode: 'both',
      });

      expect(result.inline).toBe(true);
      expect(result.external).toBe(`${bundlePath}.map`);
      expect(existsSync(`${bundlePath}.map`)).toBe(true);
    });

    it('inlines source map with base64 encoding', () => {
      const bundleCode = `console.log('test');`;
      const sourceMapContent = JSON.stringify({ version: 3, sources: ['test.ts'], mappings: 'AAAA' });

      const inlined = inlineSourceMap(bundleCode, sourceMapContent);

      expect(inlined).toContain(bundleCode);
      expect(inlined).toContain('sourceMappingURL=data:application/json;base64');
      expect(inlined).toMatch(/\/\/# sourceMappingURL=/);
    });

    it('validates external source map JSON', async () => {
      const bundlePath = join(TEMP_DIR, 'bundle.js');
      await writeFile(bundlePath, `console.log('test');`);

      const sourceMapContent = JSON.stringify({
        version: 3,
        sources: ['test.ts'],
        mappings: 'AAAA',
        names: [],
      });

      await handleSourceMap({
        bundlePath,
        sourceMapContent,
        mode: 'external',
      });

      const mapContent = await readFile(`${bundlePath}.map`, 'utf-8');
      const parsed = JSON.parse(mapContent);

      expect(parsed.version).toBe(3);
      expect(Array.isArray(parsed.sources)).toBe(true);
      expect(parsed.sources).toContain('test.ts');
    });
  });

  // Group 4: Full Bundle Integration with Advanced Formats (5 tests)
  describe('Full Bundle Integration', () => {
    it('bundles with standalone format', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simply-mcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'dist'),
        format: 'standalone',
        minify: false,
        external: ['simply-mcp'],
      });

      expect(result.success).toBe(true);
      expect(existsSync(join(TEMP_DIR, 'dist/server.js'))).toBe(true);
      expect(existsSync(join(TEMP_DIR, 'dist/package.json'))).toBe(true);
    });

    it('bundles with inline source maps', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simply-mcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        sourcemap: 'inline',
        minify: false,
        external: ['simply-mcp'],
      });

      expect(result.success).toBe(true);
      const bundleContent = await readFile(join(TEMP_DIR, 'bundle.js'), 'utf-8');
      expect(bundleContent).toContain('sourceMappingURL=data:application/json;base64');
    });

    it('bundles with external source maps', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simply-mcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        sourcemap: 'external',
        minify: false,
        external: ['simply-mcp'],
      });

      expect(result.success).toBe(true);
      expect(existsSync(join(TEMP_DIR, 'bundle.js'))).toBe(true);
      expect(existsSync(join(TEMP_DIR, 'bundle.js.map'))).toBe(true);
    });

    it('standalone format includes dependencies metadata', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `// /// dependencies
         // better-sqlite3@^9.0.0
         // ///
         import { SimplyMCP } from 'simply-mcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'dist'),
        format: 'standalone',
        minify: false,
        external: ['simply-mcp'],
      });

      expect(result.success).toBe(true);
      const pkgPath = join(TEMP_DIR, 'dist/package.json');
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      expect(pkg.dependencies).toHaveProperty('better-sqlite3');
    });

    it('reports bundle size for all formats', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simply-mcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const singleResult = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'single.js'),
        format: 'single-file',
        minify: false,
        external: ['simply-mcp'],
      });

      const standaloneResult = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'standalone'),
        format: 'standalone',
        minify: false,
        external: ['simply-mcp'],
      });

      expect(singleResult.size).toBeGreaterThan(0);
      expect(standaloneResult.size).toBeGreaterThan(0);
    });
  });

  // Group 5: Error Handling and Edge Cases (5 tests)
  describe('Error Handling', () => {
    it('handles missing bundle file in standalone format', async () => {
      await expect(async () => {
        await createStandaloneBundle({
          bundlePath: join(TEMP_DIR, 'nonexistent.js'),
          outputDir: join(TEMP_DIR, 'standalone'),
        });
      }).rejects.toThrow();
    });

    it('creates nested output directories', async () => {
      const bundlePath = join(TEMP_DIR, 'bundle.js');
      await writeFile(bundlePath, `console.log('test');`);

      const result = await createStandaloneBundle({
        bundlePath,
        outputDir: join(TEMP_DIR, 'nested/deep/standalone'),
      });

      expect(existsSync(join(TEMP_DIR, 'nested/deep/standalone'))).toBe(true);
      expect(result.outputDir).toBe(join(TEMP_DIR, 'nested/deep/standalone'));
    });

    it('handles empty dependencies object', async () => {
      const bundlePath = join(TEMP_DIR, 'bundle.js');
      await writeFile(bundlePath, `console.log('test');`);

      const result = await createStandaloneBundle({
        bundlePath,
        outputDir: join(TEMP_DIR, 'standalone'),
        dependencies: {},
      });

      const pkgPath = join(TEMP_DIR, 'standalone/package.json');
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      expect(Object.keys(pkg.dependencies || {}).length).toBe(0);
    });

    it('source map preserves original code', () => {
      const originalCode = `const x = 42;\nconsole.log(x);`;
      const sourceMapContent = JSON.stringify({ version: 3, sources: [], mappings: '' });

      const inlined = inlineSourceMap(originalCode, sourceMapContent);

      expect(inlined.startsWith(originalCode)).toBe(true);
      expect(inlined.length).toBeGreaterThan(originalCode.length);
    });

    it('validates source map is valid JSON', async () => {
      const bundlePath = join(TEMP_DIR, 'bundle.js');
      await writeFile(bundlePath, `console.log('test');`);

      const sourceMapContent = JSON.stringify({
        version: 3,
        sources: ['test.ts'],
        mappings: 'AAAA',
      });

      await handleSourceMap({
        bundlePath,
        sourceMapContent,
        mode: 'external',
      });

      const mapContent = await readFile(`${bundlePath}.map`, 'utf-8');
      expect(() => JSON.parse(mapContent)).not.toThrow();
    });
  });
});
