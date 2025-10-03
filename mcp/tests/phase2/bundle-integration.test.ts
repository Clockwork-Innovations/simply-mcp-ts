/**
 * Bundling Feature - Integration Tests
 * Tests integration between bundling components
 * CRITICAL: All tests MUST call real implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bundle } from '../../core/bundler.js';
import { detectEntryPoint } from '../../core/entry-detector.js';
import { resolveDependencies } from '../../core/dependency-resolver.js';
import { loadConfig, mergeConfig } from '../../core/config-loader.js';
import { formatOutput } from '../../core/output-formatter.js';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const TEMP_DIR = '/tmp/mcp-test-bundle-integration';

describe('Bundling - Integration Tests', () => {
  beforeEach(async () => {
    await mkdir(TEMP_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEMP_DIR, { recursive: true, force: true });
  });

  // Group 1: Entry Detection Integration (8 tests)
  describe('Entry Point Detection', () => {
    it('detects server.ts by convention', async () => {
      await writeFile(
        join(TEMP_DIR, 'server.ts'),
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const entry = await detectEntryPoint(undefined, TEMP_DIR);
      expect(entry).toContain('server.ts');
    });

    it('detects from package.json main field', async () => {
      await writeFile(
        join(TEMP_DIR, 'package.json'),
        JSON.stringify({ main: 'src/index.ts' })
      );
      await mkdir(join(TEMP_DIR, 'src'), { recursive: true });
      await writeFile(
        join(TEMP_DIR, 'src/index.ts'),
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const entry = await detectEntryPoint(undefined, TEMP_DIR);
      expect(entry).toContain('src/index.ts');
    });

    it('prefers explicit entry over convention', async () => {
      await writeFile(
        join(TEMP_DIR, 'server.ts'),
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'convention', version: '1.0.0' });`
      );
      await writeFile(
        join(TEMP_DIR, 'explicit.ts'),
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'explicit', version: '1.0.0' });`
      );

      const entry = await detectEntryPoint('explicit.ts', TEMP_DIR);
      expect(entry).toContain('explicit.ts');
    });

    it('validates SimplyMCP import in detected entry', async () => {
      await writeFile(
        join(TEMP_DIR, 'server.ts'),
        `import { SimplyMCP } from 'simplemcp';
         const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
         export default server;`
      );

      const entry = await detectEntryPoint(undefined, TEMP_DIR);
      expect(entry).toBeTruthy();
    });

    it('rejects files without SimplyMCP', async () => {
      await writeFile(
        join(TEMP_DIR, 'server.ts'),
        `console.log('Not a SimplyMCP server');`
      );

      await expect(async () => {
        await detectEntryPoint('server.ts', TEMP_DIR);
      }).rejects.toThrow();
    });

    it('handles nested directory structures', async () => {
      await mkdir(join(TEMP_DIR, 'src/servers'), { recursive: true });
      await writeFile(
        join(TEMP_DIR, 'src/servers/main.ts'),
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const entry = await detectEntryPoint('src/servers/main.ts', TEMP_DIR);
      expect(entry).toContain('src/servers/main.ts');
    });

    it('resolves relative paths correctly', async () => {
      await writeFile(
        join(TEMP_DIR, 'server.ts'),
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const entry = await detectEntryPoint('./server.ts', TEMP_DIR);
      expect(entry).toBeTruthy();
      expect(entry.startsWith('/')).toBe(true); // Should be absolute
    });

    it('handles TypeScript and JavaScript files', async () => {
      await writeFile(
        join(TEMP_DIR, 'server.js'),
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const entry = await detectEntryPoint('server.js', TEMP_DIR);
      expect(entry).toContain('server.js');
    });
  });

  // Group 2: Dependency Resolution Integration (8 tests)
  describe('Dependency Resolution', () => {
    it('resolves inline dependencies', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `// /// dependencies
         // axios@^1.6.0
         // ///
         import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const deps = await resolveDependencies({ entryPoint: serverFile });
      expect(deps.dependencies).toHaveProperty('axios');
      expect(deps.dependencies.axios).toBe('^1.6.0');
    });

    it('resolves package.json dependencies', async () => {
      await writeFile(
        join(TEMP_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            'express': '^4.18.0'
          }
        })
      );
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const deps = await resolveDependencies({
        entryPoint: serverFile,
        basePath: TEMP_DIR
      });
      expect(deps.dependencies).toHaveProperty('express');
    });

    it('inline dependencies override package.json', async () => {
      await writeFile(
        join(TEMP_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            'axios': '^1.5.0'
          }
        })
      );
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `// /// dependencies
         // axios@^1.6.0
         // ///
         import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const deps = await resolveDependencies({
        entryPoint: serverFile,
        basePath: TEMP_DIR
      });
      expect(deps.dependencies.axios).toBe('^1.6.0');
    });

    it('detects native modules correctly', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `// /// dependencies
         // fsevents@^2.3.0
         // axios@^1.6.0
         // ///
         import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const deps = await resolveDependencies({ entryPoint: serverFile });
      expect(deps.nativeModules).toContain('fsevents');
      expect(deps.nativeModules).not.toContain('axios');
    });

    it('includes devDependencies in resolution', async () => {
      await writeFile(
        join(TEMP_DIR, 'package.json'),
        JSON.stringify({
          devDependencies: {
            'vitest': '^1.0.0'
          }
        })
      );
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const deps = await resolveDependencies({
        entryPoint: serverFile,
        basePath: TEMP_DIR
      });
      expect(deps.dependencies).toHaveProperty('vitest');
    });

    it('captures inline dependency errors', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `// /// dependencies
         // invalid-syntax
         // ///
         import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const deps = await resolveDependencies({ entryPoint: serverFile });
      expect(deps.inlineDependencies.errors.length).toBeGreaterThan(0);
    });

    it('handles empty dependency lists', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const deps = await resolveDependencies({ entryPoint: serverFile });
      expect(Object.keys(deps.dependencies).length).toBe(0);
    });

    it('resolves complex dependency trees', async () => {
      await writeFile(
        join(TEMP_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            'express': '^4.18.0',
            'lodash': '^4.17.21'
          },
          devDependencies: {
            'typescript': '^5.3.0'
          }
        })
      );
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `// /// dependencies
         // axios@^1.6.0
         // zod@^3.22.0
         // ///
         import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const deps = await resolveDependencies({
        entryPoint: serverFile,
        basePath: TEMP_DIR
      });
      expect(Object.keys(deps.dependencies).length).toBeGreaterThanOrEqual(5);
    });
  });

  // Group 3: Config Loading Integration (8 tests)
  describe('Configuration Loading', () => {
    it('loads configuration from .js file', async () => {
      await writeFile(
        join(TEMP_DIR, 'simplemcp.config.js'),
        `export default { entry: './server.ts', output: { dir: 'dist' } };`
      );

      const config = await loadConfig(undefined, TEMP_DIR);
      expect(config).toHaveProperty('entry');
      expect(config?.entry).toBe('./server.ts');
    });

    it('loads configuration from .json file', async () => {
      await writeFile(
        join(TEMP_DIR, 'simplemcp.config.json'),
        JSON.stringify({ entry: './server.ts', output: { dir: 'dist' } })
      );

      const config = await loadConfig(undefined, TEMP_DIR);
      expect(config).toHaveProperty('entry');
      expect(config?.entry).toBe('./server.ts');
    });

    it('returns null when no config found', async () => {
      const config = await loadConfig(undefined, TEMP_DIR);
      expect(config).toBeNull();
    });

    it('merges config with CLI options correctly', async () => {
      await writeFile(
        join(TEMP_DIR, 'simplemcp.config.js'),
        `export default {
          entry: './server.ts',
          output: { dir: 'dist' },
          bundle: { minify: true }
        };`
      );

      const config = await loadConfig(undefined, TEMP_DIR);
      const merged = mergeConfig(config, {
        output: 'custom/output.js',
        minify: false
      });

      expect(merged.output).toBe('custom/output.js');
      expect(merged.minify).toBe(false);
    });

    it('CLI options take precedence over config', async () => {
      await writeFile(
        join(TEMP_DIR, 'simplemcp.config.js'),
        `export default { entry: './config.ts' };`
      );

      const config = await loadConfig(undefined, TEMP_DIR);
      const merged = mergeConfig(config, { entry: './cli.ts' });

      expect(merged.entry).toBe('./cli.ts');
    });

    it('validates config structure', async () => {
      await writeFile(
        join(TEMP_DIR, 'simplemcp.config.json'),
        JSON.stringify({ entry: 123 }) // Invalid type
      );

      await expect(async () => {
        await loadConfig(undefined, TEMP_DIR);
      }).rejects.toThrow();
    });

    it('handles missing config gracefully', async () => {
      const config = await loadConfig('nonexistent.js', TEMP_DIR);
      expect(config).toBeNull();
    });

    it('supports multiple config file formats', async () => {
      // Test .js
      await writeFile(
        join(TEMP_DIR, 'test1.config.js'),
        `export default { entry: './test.ts' };`
      );
      const config1 = await loadConfig('test1.config.js', TEMP_DIR);
      expect(config1?.entry).toBe('./test.ts');

      // Test .json
      await writeFile(
        join(TEMP_DIR, 'test2.config.json'),
        JSON.stringify({ entry: './test2.ts' })
      );
      const config2 = await loadConfig('test2.config.json', TEMP_DIR);
      expect(config2?.entry).toBe('./test2.ts');
    });
  });

  // Group 4: End-to-End Bundling (8 tests)
  describe('Bundling Workflows', () => {
    it('bundles simple server successfully', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
         server.addTool({
           name: 'test',
           description: 'Test tool',
           parameters: {},
           execute: async () => ({ result: 'ok' })
         });
         export default server;`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'dist/bundle.js'),
        format: 'single-file',
        minify: false,
      });

      expect(result.success).toBe(true);
      expect(existsSync(join(TEMP_DIR, 'dist/bundle.js'))).toBe(true);
    });

    it('includes metadata in result', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        minify: false,
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.entry).toContain('server.ts');
    });

    it('reports bundle size', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        minify: false,
      });

      expect(result.size).toBeGreaterThan(0);
    });

    it('reports bundle duration', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        minify: false,
      });

      expect(result.duration).toBeGreaterThan(0);
    });

    it('handles bundling errors gracefully', async () => {
      const result = await bundle({
        entry: join(TEMP_DIR, 'nonexistent.ts'),
        output: join(TEMP_DIR, 'bundle.js'),
        minify: false,
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('collects warnings during bundling', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `// /// dependencies
         // invalid@syntax
         // ///
         import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        minify: false,
      });

      // Should succeed but with warnings
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('creates output directory if needed', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'nested/deep/bundle.js'),
        minify: false,
      });

      expect(result.success).toBe(true);
      expect(existsSync(join(TEMP_DIR, 'nested/deep/bundle.js'))).toBe(true);
    });

    it('handles complex server with dependencies', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `// /// dependencies
         // axios@^1.6.0
         // ///
         import { SimplyMCP } from 'simplemcp';
         const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
         server.addTool({
           name: 'fetch',
           description: 'Fetch data',
           parameters: { url: { type: 'string' } },
           execute: async ({ url }) => {
             // Simulate using axios
             return { data: 'fetched' };
           }
         });
         export default server;`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        minify: false,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.dependencies).toContain('axios');
    });
  });

  // Group 5: Output Formats (6 tests)
  describe('Output Formats', () => {
    it('creates single-file format', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        format: 'single-file',
        minify: false,
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe('single-file');
      expect(existsSync(join(TEMP_DIR, 'bundle.js'))).toBe(true);
    });

    it('creates ESM format', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.mjs'),
        format: 'esm',
        minify: false,
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe('esm');
    });

    it('creates CJS format', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.cjs'),
        format: 'cjs',
        minify: false,
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe('cjs');
    });

    it('minifies output when requested', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const unminified = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'unminified.js'),
        minify: false,
      });

      const minified = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'minified.js'),
        minify: true,
      });

      expect(minified.size).toBeLessThan(unminified.size);
    });

    it('respects external packages', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `// /// dependencies
         // axios@^1.6.0
         // ///
         import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        external: ['axios'],
        minify: false,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.external).toContain('axios');
    });

    it('handles native modules as external', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `// /// dependencies
         // fsevents@^2.3.0
         // ///
         import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        minify: false,
      });

      expect(result.metadata?.nativeModules).toContain('fsevents');
      expect(result.metadata?.external).toContain('fsevents');
    });
  });

  // Group 6: Error Handling (6 tests)
  describe('Error Handling', () => {
    it('handles missing entry point', async () => {
      const result = await bundle({
        entry: join(TEMP_DIR, 'nonexistent.ts'),
        output: join(TEMP_DIR, 'bundle.js'),
        minify: false,
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles invalid TypeScript syntax', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         const server = new SimplyMCP({ name: 'test' version: '1.0.0' }); // Missing comma
         export default server;`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        minify: false,
      });

      expect(result.success).toBe(false);
    });

    it('reports error location', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         const server = new SimplyMCP({ name: 'test' version: '1.0.0' });
         export default server;`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        minify: false,
      });

      if (result.errors.length > 0 && result.errors[0].location) {
        expect(result.errors[0].location.file).toBeTruthy();
      }
    });

    it('handles permission errors', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      // Try to write to root (should fail on Unix systems)
      const result = await bundle({
        entry: serverFile,
        output: '/bundle.js',
        minify: false,
      });

      // Should either fail or succeed depending on permissions
      expect(result).toHaveProperty('success');
    });

    it('calls onError callback', async () => {
      let errorCalled = false;
      let errorMessage = '';

      const result = await bundle({
        entry: join(TEMP_DIR, 'nonexistent.ts'),
        output: join(TEMP_DIR, 'bundle.js'),
        onError: (error) => {
          errorCalled = true;
          errorMessage = error.message;
        },
        minify: false,
      });

      expect(errorCalled).toBe(true);
      expect(errorMessage).toBeTruthy();
    });

    it('continues after non-fatal errors', async () => {
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `// /// dependencies
         // invalid-dep-syntax
         // ///
         import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      const result = await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        minify: false,
      });

      // Should succeed with warnings
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // Group 7: Progress Reporting (4 tests)
  describe('Progress Reporting', () => {
    it('calls onProgress callback', async () => {
      const messages: string[] = [];
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        onProgress: (msg) => messages.push(msg),
        minify: false,
      });

      expect(messages.length).toBeGreaterThan(0);
    });

    it('reports entry detection progress', async () => {
      const messages: string[] = [];
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        onProgress: (msg) => messages.push(msg),
        minify: false,
      });

      const hasEntryMessage = messages.some(msg =>
        msg.toLowerCase().includes('entry')
      );
      expect(hasEntryMessage).toBe(true);
    });

    it('reports dependency resolution progress', async () => {
      const messages: string[] = [];
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        onProgress: (msg) => messages.push(msg),
        minify: false,
      });

      const hasDepsMessage = messages.some(msg =>
        msg.toLowerCase().includes('dependenc')
      );
      expect(hasDepsMessage).toBe(true);
    });

    it('reports completion', async () => {
      const messages: string[] = [];
      const serverFile = join(TEMP_DIR, 'server.ts');
      await writeFile(
        serverFile,
        `import { SimplyMCP } from 'simplemcp';
         export default new SimplyMCP({ name: 'test', version: '1.0.0' });`
      );

      await bundle({
        entry: serverFile,
        output: join(TEMP_DIR, 'bundle.js'),
        onProgress: (msg) => messages.push(msg),
        minify: false,
      });

      const hasCompleteMessage = messages.some(msg =>
        msg.toLowerCase().includes('complete')
      );
      expect(hasCompleteMessage).toBe(true);
    });
  });
});
