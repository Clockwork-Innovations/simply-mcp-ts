#!/usr/bin/env node
/**
 * Fix UI Import Paths - Phase 3
 *
 * Updates all import statements that reference UI files moved from src/core/ to src/features/ui/
 *
 * Files moved:
 * - ui-bundler.ts
 * - ui-cdn.ts
 * - ui-file-resolver.ts
 * - ui-minifier.ts
 * - ui-optimizer.ts
 * - ui-performance-reporter.ts
 * - ui-performance.ts
 * - ui-react-compiler.ts
 * - ui-remote-dom-compiler.ts
 * - ui-resource.ts
 * - ui-watch-manager.ts
 * - component-registry.ts
 * - theme-manager.ts
 * - package-resolver.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Files that were moved
const movedFiles = [
  'ui-bundler',
  'ui-cdn',
  'ui-file-resolver',
  'ui-minifier',
  'ui-optimizer',
  'ui-performance-reporter',
  'ui-performance',
  'ui-react-compiler',
  'ui-remote-dom-compiler',
  'ui-resource',
  'ui-watch-manager',
  'component-registry',
  'theme-manager',
  'package-resolver',
];

// Statistics
const stats = {
  filesScanned: 0,
  filesModified: 0,
  importsUpdated: 0,
  dynamicImportsFound: 0,
  filesWithChanges: [] as string[],
  dynamicImportFiles: [] as { file: string; line: number; content: string }[],
};

/**
 * Find all TypeScript/JavaScript files in a directory recursively
 */
function findSourceFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, .git, dist, etc.
      if (!['node_modules', '.git', 'dist', 'build', '.cache'].includes(entry)) {
        findSourceFiles(fullPath, files);
      }
    } else if (stat.isFile()) {
      // Include .ts, .tsx, .js, .mjs, .cjs files
      const ext = extname(fullPath);
      if (['.ts', '.tsx', '.js', '.mjs', '.cjs'].includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Calculate the correct relative path from source to target
 */
function calculateRelativePath(fromFile: string, toModule: string): string {
  const fromDir = dirname(fromFile);
  const targetPath = join(projectRoot, 'src', 'features', 'ui', toModule);
  let relativePath = relative(fromDir, targetPath);

  // Ensure it starts with ./ or ../
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  // Remove .ts extension if present, add .js (TypeScript convention)
  relativePath = relativePath.replace(/\.ts$/, '.js');
  if (!relativePath.endsWith('.js')) {
    relativePath += '.js';
  }

  return relativePath;
}

/**
 * Fix imports in a single file
 */
function fixImportsInFile(filePath: string): boolean {
  stats.filesScanned++;

  // Skip files in the src/features/ui directory (they're already in the right place)
  const relativePath = relative(projectRoot, filePath);
  if (relativePath.startsWith('src/features/ui/')) {
    return false;
  }

  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let changesMade = false;
  let lineNumber = 0;

  // Pattern 1: from '../core/ui-*' or from './ui-*' (when in core)
  // Pattern 2: from '../src/features/ui/component-registry.js', theme-manager, package-resolver
  // Pattern 3: from '../../core/ui-*' etc.

  const lines = content.split('\n');
  const updatedLines = lines.map((line, idx) => {
    lineNumber = idx + 1;
    let updatedLine = line;

    // Check for dynamic imports (template strings)
    if (line.includes('import(') && line.includes('${')) {
      const dynamicMatch = line.match(/import\([^)]*\$\{[^}]*\}[^)]*\)/);
      if (dynamicMatch) {
        stats.dynamicImportsFound++;
        stats.dynamicImportFiles.push({
          file: relative(projectRoot, filePath),
          line: lineNumber,
          content: line.trim(),
        });
      }
    }

    // Check each moved file
    for (const movedFile of movedFiles) {
      // Match both static and dynamic imports
      const patterns = [
        // Static: from '../src/features/ui/ui-bundler.js' or from '../src/features/ui/ui-bundler.js'
        {
          regex: new RegExp(`(from\\s+['"])(\\.\\./)*(?:src/)?core/${movedFile}(?:\\.js)?(['"])`, 'g'),
          type: 'static',
        },
        // Static: from '../src/features/ui/ui-bundler.js$3 (when file was in core)
        {
          regex: new RegExp(`(from\\s+['"])\\.\/${movedFile}(?:\\.js)?(['"])`, 'g'),
          type: 'static',
        },
        // Dynamic: import('../src/features/ui/ui-bundler.js') or import('../src/features/ui/ui-bundler.js')
        {
          regex: new RegExp(`(import\\s*\\(['"])(\\.\\./)*(?:src/)?core/${movedFile}(?:\\.js)?(['"]\\))`, 'g'),
          type: 'dynamic',
        },
      ];

      for (const { regex, type } of patterns) {
        if (regex.test(line)) {
          const newPath = calculateRelativePath(filePath, movedFile);

          // Reset regex
          regex.lastIndex = 0;

          // Replace the import path
          // $1 = opening (from ' or import(')
          // $2 = ../ parts (not needed since we calculate newPath)
          // $3 = closing (' or '))
          const newLine = line.replace(regex, `$1${newPath}$3`);

          if (newLine !== line) {
            updatedLine = newLine;
            changesMade = true;
            stats.importsUpdated++;
            console.log(`  [${relative(projectRoot, filePath)}:${lineNumber}]`);
            console.log(`    OLD: ${line.trim()}`);
            console.log(`    NEW: ${newLine.trim()}`);
          }
        }
      }
    }

    return updatedLine;
  });

  if (changesMade) {
    const newContent = updatedLines.join('\n');
    writeFileSync(filePath, newContent, 'utf-8');
    stats.filesModified++;
    stats.filesWithChanges.push(relative(projectRoot, filePath));
    return true;
  }

  return false;
}

/**
 * Main execution
 */
function main() {
  console.log('='.repeat(80));
  console.log('UI Import Path Fixer - Phase 3');
  console.log('='.repeat(80));
  console.log();
  console.log('Files moved from src/core/ to src/features/ui/:');
  movedFiles.forEach(f => console.log(`  - ${f}.ts`));
  console.log();
  console.log('Scanning for import statements to update...');
  console.log();

  // Find all source files
  const sourceDirs = [
    join(projectRoot, 'src'),
    join(projectRoot, 'tests'),
    join(projectRoot, 'examples'),
    join(projectRoot, 'scripts'),
  ];

  const allFiles: string[] = [];
  for (const dir of sourceDirs) {
    try {
      const files = findSourceFiles(dir);
      allFiles.push(...files);
    } catch (error) {
      // Directory might not exist
    }
  }

  console.log(`Found ${allFiles.length} source files to check\n`);

  // Process each file
  for (const file of allFiles) {
    fixImportsInFile(file);
  }

  // Print summary
  console.log();
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Files scanned:           ${stats.filesScanned}`);
  console.log(`Files modified:          ${stats.filesModified}`);
  console.log(`Import statements fixed: ${stats.importsUpdated}`);
  console.log(`Dynamic imports found:   ${stats.dynamicImportsFound}`);
  console.log();

  if (stats.filesWithChanges.length > 0) {
    console.log('Modified files:');
    stats.filesWithChanges.forEach(f => console.log(`  - ${f}`));
    console.log();
  }

  if (stats.dynamicImportFiles.length > 0) {
    console.log('⚠️  DYNAMIC IMPORTS DETECTED (require manual review):');
    console.log('='.repeat(80));
    stats.dynamicImportFiles.forEach(({ file, line, content }) => {
      console.log(`  ${file}:${line}`);
      console.log(`    ${content}`);
    });
    console.log();
    console.log('These template string imports cannot be automatically fixed.');
    console.log('Please review and update them manually.');
    console.log();
  }

  console.log('✅ Import path update complete!');
  console.log();
}

main();
