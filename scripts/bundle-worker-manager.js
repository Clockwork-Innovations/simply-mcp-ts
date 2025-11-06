#!/usr/bin/env node
/**
 * Bundle RemoteDOMWorkerManager for E2E Tests
 *
 * Creates a browser-compatible bundle of RemoteDOMWorkerManager
 * for use in Playwright E2E tests.
 */

import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const outDir = join(projectRoot, 'tests/e2e/dist');

// Ensure output directory exists
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

console.log('📦 Bundling Remote DOM modules for browser...');

try {
  // Bundle RemoteDOMWorkerManager
  await esbuild.build({
    entryPoints: [join(projectRoot, 'src/client/remote-dom/RemoteDOMWorkerManager.ts')],
    bundle: true,
    format: 'esm',
    target: 'es2020',
    outfile: join(outDir, 'worker-manager.js'),
    platform: 'browser',
    sourcemap: true,
    minify: false, // Keep readable for debugging
    logLevel: 'info',
    external: ['react', 'react-dom'],
  });
  console.log('✅ worker-manager.js bundled');

  // Bundle RemoteDOMContext
  await esbuild.build({
    entryPoints: [join(projectRoot, 'src/client/remote-dom/RemoteDOMContext.tsx')],
    bundle: true,
    format: 'esm',
    target: 'es2020',
    outfile: join(outDir, 'RemoteDOMContext.js'),
    platform: 'browser',
    sourcemap: true,
    minify: false,
    logLevel: 'info',
    external: ['react', 'react-dom'],
  });
  console.log('✅ RemoteDOMContext.js bundled');

  // Bundle component-library-v2
  await esbuild.build({
    entryPoints: [join(projectRoot, 'src/client/remote-dom/component-library-v2.tsx')],
    bundle: true,
    format: 'esm',
    target: 'es2020',
    outfile: join(outDir, 'component-library-v2.js'),
    platform: 'browser',
    sourcemap: true,
    minify: false,
    logLevel: 'info',
    external: ['react', 'react-dom'],
  });
  console.log('✅ component-library-v2.js bundled');

  console.log('\n✅ All bundles created successfully in tests/e2e/dist/');
} catch (error) {
  console.error('❌ Bundle failed:', error);
  process.exit(1);
}
