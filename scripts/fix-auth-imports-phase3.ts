#!/usr/bin/env ts-node
/**
 * Fix Auth Imports - Phase 3 Final Import Fix
 *
 * This script fixes ALL import statements after moving auth/security files to src/features/auth/
 *
 * Files Moved:
 * 1. src/auth-adapter.ts → src/features/auth/adapter.ts
 * 2. src/security/*.ts → src/features/auth/security/*.ts
 *
 * Fixes:
 * 1. Internal imports within adapter.ts (wrong relative paths)
 * 2. External imports from other files (old paths)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

interface ImportFix {
  file: string;
  line: number;
  oldImport: string;
  newImport: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixes: ImportFix[] = [];
const projectRoot = join(__dirname, '..');
const srcDir = join(projectRoot, 'src');

// Logging
function log(message: string) {
  console.log(`[AUTH-IMPORT-FIX] ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80));
}

/**
 * Calculate correct relative path from a file to the new auth location
 */
function getCorrectAuthPath(fromFile: string, importWhat: 'adapter' | 'security' | 'security-types'): string {
  const fromDir = dirname(fromFile);
  const relativeToSrc = relative(srcDir, fromDir);
  const depth = relativeToSrc.split('/').filter(p => p && p !== '.').length;

  // Build the relative path with correct number of ../
  const upLevels = '../'.repeat(depth);

  if (importWhat === 'adapter') {
    return `${upLevels}features/auth/adapter.js`;
  } else if (importWhat === 'security') {
    return `${upLevels}features/auth/security/index.js`;
  } else {
    return `${upLevels}features/auth/security/types.js`;
  }
}

/**
 * Fix a single file's imports
 */
function fixFileImports(filePath: string): number {
  let content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let changesMade = 0;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    let newLine = line;

    // Fix: from '../../features/auth/adapter.js' or from '../auth-adapter.js' (with or without .js)
    const authAdapterMatch = line.match(/from ['"](\.\.\/)?(\.\/)?auth-adapter(\.js)?['"]/);
    if (authAdapterMatch) {
      const correctPath = getCorrectAuthPath(filePath, 'adapter');
      newLine = line.replace(/from ['"](\.\.\/)?(\.\/)?auth-adapter(\.js)?['"]/, `from '${correctPath}'`);

      if (newLine !== line) {
        fixes.push({
          file: filePath,
          line: lineNum,
          oldImport: line.trim(),
          newImport: newLine.trim(),
        });
        changesMade++;
      }
    }

    // Fix: from '../../features/auth/security/types.js' or from '../security/types.js'
    const securityTypesMatch = line.match(/from ['"](\.\.\/)?(\.\/)?security\/types(\.js)?['"]/);
    if (securityTypesMatch) {
      const correctPath = getCorrectAuthPath(filePath, 'security-types');
      newLine = line.replace(/from ['"](\.\.\/)?(\.\/)?security\/types(\.js)?['"]/, `from '${correctPath}'`);

      if (newLine !== line) {
        fixes.push({
          file: filePath,
          line: lineNum,
          oldImport: line.trim(),
          newImport: newLine.trim(),
        });
        changesMade++;
      }
    }

    // Fix: from '../../features/auth/security/index.js' or from '../security/index' or '../security'
    const securityIndexMatch = line.match(/from ['"](\.\.\/)?(\.\/)?security(\/(index))?(\.js)?['"]/);
    if (securityIndexMatch && !line.includes('security/types')) {
      const correctPath = getCorrectAuthPath(filePath, 'security');
      newLine = line.replace(/from ['"](\.\.\/)?(\.\/)?security(\/(index))?(\.js)?['"]/, `from '${correctPath}'`);

      if (newLine !== line) {
        fixes.push({
          file: filePath,
          line: lineNum,
          oldImport: line.trim(),
          newImport: newLine.trim(),
        });
        changesMade++;
      }
    }

    lines[idx] = newLine;
  });

  if (changesMade > 0) {
    writeFileSync(filePath, lines.join('\n'), 'utf-8');
  }

  return changesMade;
}

/**
 * Fix internal import in adapter.ts
 * The file moved from src/ to src/features/auth/, so './server/parser.js' needs to become '../../server/parser.js'
 */
function fixAdapterInternalImport(): number {
  const adapterPath = join(srcDir, 'features', 'auth', 'adapter.ts');
  let content = readFileSync(adapterPath, 'utf-8');
  const lines = content.split('\n');
  let changesMade = 0;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    let newLine = line;

    // Fix: from './server/parser.js' → from '../../server/parser.js'
    if (/from ['"]\.\/server\/parser\.js['"]/.test(line)) {
      newLine = line.replace(/from ['"]\.\/server\/parser\.js['"]/, `from '../../server/parser.js'`);

      if (newLine !== line) {
        fixes.push({
          file: adapterPath,
          line: lineNum,
          oldImport: line.trim(),
          newImport: newLine.trim(),
        });
        changesMade++;
      }
    }

    lines[idx] = newLine;
  });

  if (changesMade > 0) {
    writeFileSync(adapterPath, lines.join('\n'), 'utf-8');
  }

  return changesMade;
}

/**
 * Recursively find all TypeScript files
 */
function findTypeScriptFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, build
      if (!['node_modules', 'dist', 'build', '.git'].includes(entry)) {
        findTypeScriptFiles(fullPath, files);
      }
    } else if (stat.isFile()) {
      // Only .ts and .tsx files
      const ext = extname(fullPath);
      if (['.ts', '.tsx'].includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Main execution
 */
function main() {
  logSection('Phase 3: Auth Import Fix - Starting');

  // Step 1: Fix internal import in adapter.ts
  logSection('Step 1: Fix Internal Import in adapter.ts');
  const adapterChanges = fixAdapterInternalImport();
  log(`Fixed ${adapterChanges} internal import(s) in adapter.ts`);

  // Step 2: Find all TypeScript files
  logSection('Step 2: Finding TypeScript Files');
  const allFiles = findTypeScriptFiles(projectRoot);
  log(`Found ${allFiles.length} TypeScript files`);

  // Step 3: Fix external imports
  logSection('Step 3: Fixing External Imports');
  let filesProcessed = 0;
  let totalChanges = 0;

  for (const file of allFiles) {
    // Skip the new auth files themselves (except adapter.ts which we already fixed)
    if (file.includes('src/features/auth/') && !file.includes('adapter.ts')) {
      continue;
    }

    const changes = fixFileImports(file);
    if (changes > 0) {
      filesProcessed++;
      totalChanges += changes;
      const relPath = relative(projectRoot, file);
      log(`✓ ${relPath}: ${changes} import(s) fixed`);
    }
  }

  // Summary
  logSection('Summary');
  log(`Files processed: ${filesProcessed + (adapterChanges > 0 ? 1 : 0)}`);
  log(`Total imports fixed: ${totalChanges + adapterChanges}`);

  if (fixes.length > 0) {
    logSection('All Changes Made');
    const fileGroups = fixes.reduce((acc, fix) => {
      const relPath = relative(projectRoot, fix.file);
      if (!acc[relPath]) acc[relPath] = [];
      acc[relPath].push(fix);
      return acc;
    }, {} as Record<string, ImportFix[]>);

    for (const [file, fileFixes] of Object.entries(fileGroups)) {
      console.log(`\n${file}:`);
      fileFixes.forEach(fix => {
        console.log(`  Line ${fix.line}:`);
        console.log(`    - ${fix.oldImport}`);
        console.log(`    + ${fix.newImport}`);
      });
    }
  }

  // Verification
  logSection('Verification');
  log('Checking for any remaining old imports...');

  const verificationFiles = findTypeScriptFiles(srcDir);
  const remainingIssues: string[] = [];

  for (const file of verificationFiles) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // Check for old auth-adapter imports (but not in the fix-imports.ts script itself)
      if (/from ['"](\.\.\/)?(\.\/)?auth-adapter/.test(line) && !file.includes('fix-imports.ts')) {
        remainingIssues.push(`${relative(projectRoot, file)}:${idx + 1} - ${line.trim()}`);
      }

      // Check for old security imports (but not in features/auth itself or fix scripts)
      if (/from ['"](\.\.\/)?(\.\/)?security/.test(line) &&
          !file.includes('features/auth/') &&
          !file.includes('fix-imports.ts')) {
        remainingIssues.push(`${relative(projectRoot, file)}:${idx + 1} - ${line.trim()}`);
      }
    });
  }

  if (remainingIssues.length > 0) {
    console.log('\n⚠️  WARNING: Found remaining old imports:');
    remainingIssues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log('✓ No old import paths found - all imports updated successfully!');
  }

  logSection('Phase 3: Auth Import Fix - Complete');
}

// Run the script
main();
