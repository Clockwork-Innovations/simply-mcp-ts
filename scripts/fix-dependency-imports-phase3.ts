#!/usr/bin/env tsx

/**
 * Fix Dependency Imports - Phase 3
 *
 * Updates all import statements that reference the 10 dependency files
 * that were moved from src/core/ to src/features/dependencies/
 *
 * Moved files:
 * 1. dependency-checker.ts
 * 2. dependency-installer.ts
 * 3. dependency-parser.ts
 * 4. dependency-resolver.ts
 * 5. dependency-types.ts
 * 6. dependency-utils.ts
 * 7. dependency-validator.ts
 * 8. installation-types.ts
 * 9. bundle-types.ts
 * 10. package-manager-detector.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ImportReplacement {
  oldPattern: RegExp;
  newPath: (match: string, relativePrefix: string, filename: string, extension: string) => string;
  description: string;
}

// Files that were moved
const MOVED_FILES = [
  'dependency-checker',
  'dependency-installer',
  'dependency-parser',
  'dependency-resolver',
  'dependency-types',
  'dependency-utils',
  'dependency-validator',
  'installation-types',
  'bundle-types',
  'package-manager-detector',
];

// Statistics
let filesProcessed = 0;
let filesModified = 0;
let importsUpdated = 0;
const modifiedFiles: string[] = [];

/**
 * Create replacement patterns for all moved files
 */
function createReplacements(): ImportReplacement[] {
  const replacements: ImportReplacement[] = [];

  for (const filename of MOVED_FILES) {
    // Pattern: from '../core/filename.js' or from '../../core/filename.js' etc
    // Captures: relative prefix (../, ../../, etc), filename, and optional extension
    const pattern = new RegExp(
      `from\\s+(['"])((?:\\.\\.\\/)+)core\\/${filename}(\\.js)?\\1`,
      'g'
    );

    replacements.push({
      oldPattern: pattern,
      newPath: (match, relativePrefix, filename, extension) => {
        // Count how many '../' there are
        const levels = (relativePrefix.match(/\.\.\//g) || []).length;

        // Adjust the relative path for the new location
        // If it was ../core/, it becomes ../features/dependencies/
        // If it was ../../core/, it becomes ../../features/dependencies/
        const newPrefix = '../'.repeat(levels);

        return `from '${newPrefix}features/dependencies/${filename}${extension || ''}'`;
      },
      description: `Update imports for ${filename}`,
    });

    // Pattern: from './filename.js' (for files that were in src/core/)
    const localPattern = new RegExp(
      `from\\s+(['"])\\.\\/${filename}(\\.js)?\\1`,
      'g'
    );

    replacements.push({
      oldPattern: localPattern,
      newPath: (match, quote, filename, extension) => {
        return `from '../features/dependencies/${filename}${extension || ''}'`;
      },
      description: `Update local imports for ${filename}`,
    });
  }

  return replacements;
}

/**
 * Process a single file
 */
function processFile(filePath: string, replacements: ImportReplacement[]): boolean {
  filesProcessed++;

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let fileUpdates = 0;

  // Handle special patterns in test shell scripts
  // Pattern: $MCP_ROOT/core/dependency-*.js
  for (const filename of MOVED_FILES) {
    const mpcRootPattern = new RegExp(
      `\\$MCP_ROOT/core/${filename}\\.js`,
      'g'
    );
    if (content.match(mpcRootPattern)) {
      content = content.replace(mpcRootPattern, `\\$MCP_ROOT/features/dependencies/${filename}.js`);
      importsUpdated++;
      fileUpdates++;
    }
  }

  // Pattern: ./src/core/dependency-*.js (relative to project root in tests)
  for (const filename of MOVED_FILES) {
    const srcPattern = new RegExp(
      `\\./src/core/${filename}\\.js`,
      'g'
    );
    if (content.match(srcPattern)) {
      content = content.replace(srcPattern, `./src/features/dependencies/${filename}.js`);
      importsUpdated++;
      fileUpdates++;
    }
  }

  // Pattern: ../../src/core/dependency-*.js (from tests to src)
  for (const filename of MOVED_FILES) {
    const testToSrcPattern = new RegExp(
      `\\.\\./\\.\\./src/core/${filename}\\.js`,
      'g'
    );
    if (content.match(testToSrcPattern)) {
      content = content.replace(testToSrcPattern, `../../src/features/dependencies/${filename}.js`);
      importsUpdated++;
      fileUpdates++;
    }
  }

  for (const replacement of replacements) {
    const matches = content.match(replacement.oldPattern);
    if (matches) {
      content = content.replace(replacement.oldPattern, (match) => {
        // Extract the parts using a more careful approach
        const quoteMatch = match.match(/from\s+(['"])/);
        if (!quoteMatch) return match;

        const quote = quoteMatch[1];
        const pathMatch = match.match(/from\s+['"](.+)['"]/);
        if (!pathMatch) return match;

        const importPath = pathMatch[1];

        // Determine relative prefix
        const relativePrefixMatch = importPath.match(/^((?:\.\.\/)*)core\//);
        if (!relativePrefixMatch) return match;

        const relativePrefix = relativePrefixMatch[1];

        // Extract filename and extension
        const filenameMatch = importPath.match(/\/([^/]+?)(\.js)?$/);
        if (!filenameMatch) return match;

        const filename = filenameMatch[1];
        const extension = filenameMatch[2] || '';

        // Calculate new path
        const levels = (relativePrefix.match(/\.\.\//g) || []).length;
        const newPrefix = '../'.repeat(levels);

        importsUpdated++;
        fileUpdates++;

        return `from ${quote}${newPrefix}features/dependencies/${filename}${extension}${quote}`;
      });
    }
  }

  // Check for local imports in files that were themselves in core/
  if (filePath.includes('/src/core/') || filePath.includes('/tests/')) {
    for (const filename of MOVED_FILES) {
      const localPattern = new RegExp(
        `from\\s+(['"])\\.\\/${filename}(\\.js)?\\1`,
        'g'
      );

      const matches = content.match(localPattern);
      if (matches) {
        content = content.replace(localPattern, (match) => {
          const quoteMatch = match.match(/from\s+(['"])/);
          if (!quoteMatch) return match;

          const quote = quoteMatch[1];
          const extensionMatch = match.match(/(\\.js)?['"]$/);
          const extension = extensionMatch && extensionMatch[1] ? extensionMatch[1] : '';

          importsUpdated++;
          fileUpdates++;

          // Determine relative path from current file to features/dependencies
          const relativePath = filePath.includes('/tests/phase2/')
            ? '../../features/dependencies'
            : '../features/dependencies';

          return `from ${quote}${relativePath}/${filename}${extension}${quote}`;
        });
      }
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    filesModified++;
    modifiedFiles.push(filePath);
    console.log(`✓ Updated ${fileUpdates} import(s) in ${path.relative(process.cwd(), filePath)}`);
    return true;
  }

  return false;
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Fix Dependency Imports - Phase 3');
  console.log('='.repeat(80));
  console.log();

  const replacements = createReplacements();
  console.log(`Created ${replacements.length} replacement patterns for ${MOVED_FILES.length} moved files\n`);

  // Find all TypeScript files
  const patterns = [
    'src/**/*.ts',
    'tests/**/*.ts',
    'examples/**/*.ts',
    '!node_modules/**',
    '!dist/**',
    '!**/*.d.ts',
  ];

  console.log('Searching for files to process...');
  const files = await glob(patterns, { cwd: process.cwd(), absolute: true });
  console.log(`Found ${files.length} TypeScript files\n`);

  console.log('Processing files...');
  console.log('-'.repeat(80));

  for (const file of files) {
    processFile(file, replacements);
  }

  // Also check shell scripts for inline imports
  const shellScripts = await glob('tests/**/*.sh', { cwd: process.cwd(), absolute: true });

  if (shellScripts.length > 0) {
    console.log('\nProcessing shell scripts...');
    console.log('-'.repeat(80));

    for (const script of shellScripts) {
      processFile(script, replacements);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Files processed: ${filesProcessed}`);
  console.log(`Files modified: ${filesModified}`);
  console.log(`Imports updated: ${importsUpdated}`);
  console.log();

  if (modifiedFiles.length > 0) {
    console.log('Modified files by directory:');
    console.log('-'.repeat(80));

    // Group by directory
    const byDir: Record<string, string[]> = {};
    for (const file of modifiedFiles) {
      const relPath = path.relative(process.cwd(), file);
      const dir = path.dirname(relPath);
      if (!byDir[dir]) byDir[dir] = [];
      byDir[dir].push(path.basename(file));
    }

    for (const [dir, files] of Object.entries(byDir).sort()) {
      console.log(`\n${dir}/`);
      for (const file of files.sort()) {
        console.log(`  - ${file}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✓ Import update complete!');
  console.log('='.repeat(80));

  // Exit with appropriate code
  process.exit(importsUpdated > 0 ? 0 : 1);
}

// Run the script
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
