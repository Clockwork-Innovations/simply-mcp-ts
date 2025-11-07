#!/usr/bin/env node
/**
 * Post-build script for Next.js standalone output
 * Copies static assets and public files into the standalone directory
 */

import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('📦 Copying static assets for standalone build...');

try {
  const standaloneDir = join(rootDir, '.next/standalone');

  if (!existsSync(standaloneDir)) {
    console.error('❌ Standalone directory not found. Make sure Next.js build ran successfully.');
    process.exit(1);
  }

  // Copy .next/static to standalone/inspector/.next/static
  // (Next.js standalone creates a directory structure mirroring the monorepo)
  const staticSource = join(rootDir, '.next/static');
  const staticDest = join(standaloneDir, 'inspector', '.next', 'static');

  if (existsSync(staticSource)) {
    console.log('  Copying .next/static to standalone/inspector/.next/static...');
    mkdirSync(dirname(staticDest), { recursive: true });
    cpSync(staticSource, staticDest, { recursive: true });
  }

  // Copy public directory to standalone/inspector/public
  const publicSource = join(rootDir, 'public');
  const publicDest = join(standaloneDir, 'inspector', 'public');

  if (existsSync(publicSource)) {
    console.log('  Copying public directory to standalone/inspector/public...');
    cpSync(publicSource, publicDest, { recursive: true });
  }

  console.log('✅ Standalone build prepared successfully');
} catch (err) {
  console.error('❌ Error preparing standalone build:', err.message);
  process.exit(1);
}
