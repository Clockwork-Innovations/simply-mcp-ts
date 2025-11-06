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

console.log('📦 Bundling RemoteDOMWorkerManager for browser...');

try {
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
  });

  console.log('✅ Bundle created successfully at tests/e2e/dist/worker-manager.js');
} catch (error) {
  console.error('❌ Bundle failed:', error);
  process.exit(1);
}
