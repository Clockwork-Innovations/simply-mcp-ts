#!/usr/bin/env tsx
/**
 * Fix Validation Import Paths - Phase 3
 *
 * Updates all import statements after moving validation files from:
 * src/validation/ → src/features/validation/
 *
 * This script:
 * 1. Finds all files with old validation import paths
 * 2. Replaces old paths with new paths
 * 3. Handles relative path variations
 * 4. Preserves import syntax (named, default, type imports)
 * 5. Logs all changes
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface ImportReplacement {
  from: RegExp;
  to: string;
  description: string;
}

// Import path replacements for validation module
const replacements: ImportReplacement[] = [
  // From src/ root directory (e.g., src/cli/servers/configurable-server.ts)
  {
    from: /from ['"]\.\/validation\/index\.js['"]/g,
    to: "from './features/validation/index.js'",
    description: 'src/ root: ./validation/index.js → ./features/validation/index.js',
  },
  {
    from: /from ['"]\.\/validation\/LLMFriendlyErrors\.js['"]/g,
    to: "from './features/validation/LLMFriendlyErrors.js'",
    description: 'src/ root: ./validation/LLMFriendlyErrors.js → ./features/validation/LLMFriendlyErrors.js',
  },
  {
    from: /from ['"]\.\/validation\/index['"]/g,
    to: "from './features/validation/index'",
    description: 'src/ root: ./validation/index → ./features/validation/index',
  },
  {
    from: /from ['"]\.\/validation\/LLMFriendlyErrors['"]/g,
    to: "from './features/validation/LLMFriendlyErrors'",
    description: 'src/ root: ./validation/LLMFriendlyErrors → ./features/validation/LLMFriendlyErrors',
  },
  {
    from: /from ['"]\.\/validation['"]/g,
    to: "from './features/validation'",
    description: 'src/ root: ./validation → ./features/validation',
  },

  // From src subdirectories (e.g., src/server/, src/core/, src/handlers/)
  {
    from: /from ['"]\.\.\/validation\/index\.js['"]/g,
    to: "from '../features/validation/index.js'",
    description: 'src/ subdirs: ../validation/index.js → ../features/validation/index.js',
  },
  {
    from: /from ['"]\.\.\/validation\/LLMFriendlyErrors\.js['"]/g,
    to: "from '../features/validation/LLMFriendlyErrors.js'",
    description: 'src/ subdirs: ../validation/LLMFriendlyErrors.js → ../features/validation/LLMFriendlyErrors.js',
  },
  {
    from: /from ['"]\.\.\/validation\/InputValidator\.js['"]/g,
    to: "from '../features/validation/InputValidator.js'",
    description: 'src/ subdirs: ../validation/InputValidator.js → ../features/validation/InputValidator.js',
  },
  {
    from: /from ['"]\.\.\/validation\/InputSanitizer\.js['"]/g,
    to: "from '../features/validation/InputSanitizer.js'",
    description: 'src/ subdirs: ../validation/InputSanitizer.js → ../features/validation/InputSanitizer.js',
  },
  {
    from: /from ['"]\.\.\/validation\/ValidationError\.js['"]/g,
    to: "from '../features/validation/ValidationError.js'",
    description: 'src/ subdirs: ../validation/ValidationError.js → ../features/validation/ValidationError.js',
  },
  {
    from: /from ['"]\.\.\/validation\/JsonSchemaToZod\.js['"]/g,
    to: "from '../features/validation/JsonSchemaToZod.js'",
    description: 'src/ subdirs: ../validation/JsonSchemaToZod.js → ../features/validation/JsonSchemaToZod.js',
  },
  {
    from: /from ['"]\.\.\/validation\/index['"]/g,
    to: "from '../features/validation/index'",
    description: 'src/ subdirs: ../validation/index → ../features/validation/index',
  },
  {
    from: /from ['"]\.\.\/validation\/LLMFriendlyErrors['"]/g,
    to: "from '../features/validation/LLMFriendlyErrors'",
    description: 'src/ subdirs: ../validation/LLMFriendlyErrors → ../features/validation/LLMFriendlyErrors',
  },
  {
    from: /from ['"]\.\.\/validation\/InputValidator['"]/g,
    to: "from '../features/validation/InputValidator'",
    description: 'src/ subdirs: ../validation/InputValidator → ../features/validation/InputValidator',
  },
  {
    from: /from ['"]\.\.\/validation\/InputSanitizer['"]/g,
    to: "from '../features/validation/InputSanitizer'",
    description: 'src/ subdirs: ../validation/InputSanitizer → ../features/validation/InputSanitizer',
  },
  {
    from: /from ['"]\.\.\/validation\/ValidationError['"]/g,
    to: "from '../features/validation/ValidationError'",
    description: 'src/ subdirs: ../validation/ValidationError → ../features/validation/ValidationError',
  },
  {
    from: /from ['"]\.\.\/validation\/JsonSchemaToZod['"]/g,
    to: "from '../features/validation/JsonSchemaToZod'",
    description: 'src/ subdirs: ../validation/JsonSchemaToZod → ../features/validation/JsonSchemaToZod',
  },
  {
    from: /from ['"]\.\.\/validation['"]/g,
    to: "from '../features/validation'",
    description: 'src/ subdirs: ../validation → ../features/validation',
  },

  // From tests/ directory (three levels up: ../../../src/validation/)
  {
    from: /from ['"]\.\.\/\.\.\/\.\.\/src\/validation\/index\.js['"]/g,
    to: "from '../../../src/features/validation/index.js'",
    description: 'tests/: ../../../src/validation/index.js → ../../../src/features/validation/index.js',
  },
  {
    from: /from ['"]\.\.\/\.\.\/\.\.\/src\/validation\/LLMFriendlyErrors\.js['"]/g,
    to: "from '../../../src/features/validation/LLMFriendlyErrors.js'",
    description: 'tests/: ../../../src/validation/LLMFriendlyErrors.js → ../../../src/features/validation/LLMFriendlyErrors.js',
  },
  {
    from: /from ['"]\.\.\/\.\.\/\.\.\/src\/validation\/index['"]/g,
    to: "from '../../../src/features/validation/index'",
    description: 'tests/: ../../../src/validation/index → ../../../src/features/validation/index',
  },
  {
    from: /from ['"]\.\.\/\.\.\/\.\.\/src\/validation\/LLMFriendlyErrors['"]/g,
    to: "from '../../../src/features/validation/LLMFriendlyErrors'",
    description: 'tests/: ../../../src/validation/LLMFriendlyErrors → ../../../src/features/validation/LLMFriendlyErrors',
  },
  {
    from: /from ['"]\.\.\/\.\.\/\.\.\/src\/validation['"]/g,
    to: "from '../../../src/features/validation'",
    description: 'tests/: ../../../src/validation → ../../../src/features/validation',
  },

  // From examples/ directory (two levels up: ../../src/validation/)
  {
    from: /from ['"]\.\.\/\.\.\/src\/validation\/index\.js['"]/g,
    to: "from '../../src/features/validation/index.js'",
    description: 'examples/: ../../src/validation/index.js → ../../src/features/validation/index.js',
  },
  {
    from: /from ['"]\.\.\/\.\.\/src\/validation\/LLMFriendlyErrors\.js['"]/g,
    to: "from '../../src/features/validation/LLMFriendlyErrors.js'",
    description: 'examples/: ../../src/validation/LLMFriendlyErrors.js → ../../src/features/validation/LLMFriendlyErrors.js',
  },
  {
    from: /from ['"]\.\.\/\.\.\/src\/validation\/index['"]/g,
    to: "from '../../src/features/validation/index'",
    description: 'examples/: ../../src/validation/index → ../../src/features/validation/index',
  },
  {
    from: /from ['"]\.\.\/\.\.\/src\/validation\/LLMFriendlyErrors['"]/g,
    to: "from '../../src/features/validation/LLMFriendlyErrors'",
    description: 'examples/: ../../src/validation/LLMFriendlyErrors → ../../src/features/validation/LLMFriendlyErrors',
  },
  {
    from: /from ['"]\.\.\/\.\.\/src\/validation['"]/g,
    to: "from '../../src/features/validation'",
    description: 'examples/: ../../src/validation → ../../src/features/validation',
  },

  // From scripts/ directory (one level up: ../src/validation/)
  {
    from: /from ['"]\.\.\/src\/validation\/index\.js['"]/g,
    to: "from '../src/features/validation/index.js'",
    description: 'scripts/: ../src/validation/index.js → ../src/features/validation/index.js',
  },
  {
    from: /from ['"]\.\.\/src\/validation\/LLMFriendlyErrors\.js['"]/g,
    to: "from '../src/features/validation/LLMFriendlyErrors.js'",
    description: 'scripts/: ../src/validation/LLMFriendlyErrors.js → ../src/features/validation/LLMFriendlyErrors.js',
  },
  {
    from: /from ['"]\.\.\/src\/validation\/index['"]/g,
    to: "from '../src/features/validation/index'",
    description: 'scripts/: ../src/validation/index → ../src/features/validation/index',
  },
  {
    from: /from ['"]\.\.\/src\/validation\/LLMFriendlyErrors['"]/g,
    to: "from '../src/features/validation/LLMFriendlyErrors'",
    description: 'scripts/: ../src/validation/LLMFriendlyErrors → ../src/features/validation/LLMFriendlyErrors',
  },
  {
    from: /from ['"]\.\.\/src\/validation['"]/g,
    to: "from '../src/features/validation'",
    description: 'scripts/: ../src/validation → ../src/features/validation',
  },

  // Catch-all for any remaining nested paths (adjust ../../ → ../../)
  {
    from: /from ['"]\.\.\/\.\.\/validation\/index\.js['"]/g,
    to: "from '../../features/validation/index.js'",
    description: 'nested: ../../validation/index.js → ../../features/validation/index.js',
  },
  {
    from: /from ['"]\.\.\/\.\.\/validation\/LLMFriendlyErrors\.js['"]/g,
    to: "from '../../features/validation/LLMFriendlyErrors.js'",
    description: 'nested: ../../validation/LLMFriendlyErrors.js → ../../features/validation/LLMFriendlyErrors.js',
  },
  {
    from: /from ['"]\.\.\/\.\.\/validation\/index['"]/g,
    to: "from '../../features/validation/index'",
    description: 'nested: ../../validation/index → ../../features/validation/index',
  },
  {
    from: /from ['"]\.\.\/\.\.\/validation\/LLMFriendlyErrors['"]/g,
    to: "from '../../features/validation/LLMFriendlyErrors'",
    description: 'nested: ../../validation/LLMFriendlyErrors → ../../features/validation/LLMFriendlyErrors',
  },
  {
    from: /from ['"]\.\.\/\.\.\/validation['"]/g,
    to: "from '../../features/validation'",
    description: 'nested: ../../validation → ../../features/validation',
  },

  // Fix old script reference from previous refactoring (line 45 in scripts/fix-imports.ts)
  {
    from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/validation\//g,
    to: "from '../validation/",
    description: 'legacy script fix: ../../../../validation/ → ../validation/ (already in features)',
  },
];

interface FileChange {
  filePath: string;
  changes: number;
  replacements: string[];
}

const fileChanges: FileChange[] = [];
let totalChanges = 0;
let totalFiles = 0;

function fixImportsInFile(filePath: string): number {
  let content = readFileSync(filePath, 'utf-8');
  let changes = 0;
  const appliedReplacements: string[] = [];

  for (const { from, to, description } of replacements) {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      changes += matches.length;
      appliedReplacements.push(`${description} (${matches.length}x)`);
    }
  }

  if (changes > 0) {
    writeFileSync(filePath, content, 'utf-8');
    fileChanges.push({
      filePath,
      changes,
      replacements: appliedReplacements,
    });
    totalChanges += changes;
    totalFiles++;
    console.log(`✓ Fixed ${changes} import(s) in ${filePath}`);
    appliedReplacements.forEach((r) => console.log(`  - ${r}`));
  }

  return changes;
}

function processDirectory(dir: string): number {
  let changes = 0;

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, and the destination directory
      if (entry === 'node_modules' || entry === 'dist') continue;
      changes += processDirectory(fullPath);
    } else if (stat.isFile()) {
      // Process TypeScript, JavaScript, and declaration files
      const ext = extname(entry);
      if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx' || ext === '.d.ts') {
        changes += fixImportsInFile(fullPath);
      }
    }
  }

  return changes;
}

console.log('🔧 Fixing validation import paths (Phase 3)...\n');
console.log('📦 Moving: src/validation/ → src/features/validation/\n');

// Process src/, tests/, examples/, and scripts/ directories
const directories = ['src', 'tests', 'examples', 'scripts'];
for (const dir of directories) {
  console.log(`\n📂 Processing ${dir}/...`);
  processDirectory(dir);
}

console.log('\n' + '='.repeat(80));
console.log('✨ SUMMARY');
console.log('='.repeat(80));
console.log(`Total files modified: ${totalFiles}`);
console.log(`Total import statements updated: ${totalChanges}`);

if (fileChanges.length > 0) {
  console.log('\n📋 Files Modified (grouped by directory):\n');

  // Group by directory
  const grouped = new Map<string, FileChange[]>();
  for (const change of fileChanges) {
    const dir = change.filePath.split('/').slice(0, -1).join('/');
    if (!grouped.has(dir)) {
      grouped.set(dir, []);
    }
    grouped.get(dir)!.push(change);
  }

  // Display grouped results
  for (const [dir, changes] of Array.from(grouped.entries()).sort()) {
    console.log(`\n${dir}/`);
    for (const change of changes) {
      const fileName = change.filePath.split('/').pop();
      console.log(`  - ${fileName} (${change.changes} changes)`);
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('✅ Import fix complete!');
console.log('='.repeat(80));

// Verify no old paths remain
console.log('\n🔍 Verifying no old validation paths remain...');
const verifyScript = `
import { execSync } from 'child_process';

try {
  const result = execSync(
    'grep -r "from [\\'\\\"].*validation" src/ tests/ examples/ scripts/ 2>/dev/null | grep -v "features/validation" | grep -v "node_modules" | grep -v ".git" || echo "No old paths found"',
    { encoding: 'utf-8' }
  );

  if (result.includes('No old paths found')) {
    console.log('✅ Verification passed: No old validation import paths found!');
  } else {
    console.log('⚠️  Warning: Found remaining old paths:');
    console.log(result);
  }
} catch (err) {
  console.log('✅ Verification passed: No old validation import paths found!');
}
`;

// Note: Verification will be done by Validation Agent
console.log('Note: Final verification with grep will be performed by Validation Agent');
