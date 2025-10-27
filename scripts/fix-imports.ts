#!/usr/bin/env tsx
/**
 * Fix Import Paths After Server Consolidation
 *
 * This script fixes all broken import paths after moving files to src/server/
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Import path replacements
const replacements: Array<{ from: RegExp; to: string }> = [
  // Fix doubly nested paths
  { from: /from ['"]\.\.\/\.\.\/api\/programmatic\/src\/server\/builder-server['"]/g, to: `from './builder-server.js'` },
  { from: /from ['"]\.\.\/\.\.\/api\/programmatic\/src\/server\/builder-types['"]/g, to: `from './builder-types.js'` },
  { from: /from ['"]\.\.\/api\/programmatic\/src\/server\/builder-server['"]/g, to: `from './server/builder-server.js'` },
  { from: /from ['"]\.\.\/api\/programmatic\/src\/server\/builder-types['"]/g, to: `from './server/builder-types.js'` },

  // Fix ../src/server/ references (from parent directories)
  { from: /from ['"]\.\.\/src\/server\/interface-server['"]/g, to: `from '../server/interface-server.js'` },
  { from: /from ['"]\.\.\/src\/server\/interface-types['"]/g, to: `from '../server/interface-types.js'` },
  { from: /from ['"]\.\.\/src\/server\/parser['"]/g, to: `from '../server/parser.js'` },
  { from: /from ['"]\.\.\/src\/server\/adapter['"]/g, to: `from '../server/adapter.js'` },
  { from: /from ['"]\.\.\/src\/server\/builder-server['"]/g, to: `from '../server/builder-server.js'` },
  { from: /from ['"]\.\.\/src\/server\/builder-types['"]/g, to: `from '../server/builder-types.js'` },

  // Fix ./src/server/ references (from src/ directory)
  { from: /from ['"]\.\/src\/server\/parser['"]/g, to: `from './server/parser.js'` },

  // Fix ./server/ to ../server/ for subdirectories in src/ (like src/adapters/, src/handlers/)
  { from: /from ['"]\.\/server\/builder-server\.js['"]/g, to: `from '../server/builder-server.js'` },
  { from: /from ['"]\.\/server\/builder-types\.js['"]/g, to: `from '../server/builder-types.js'` },

  // Fix remaining ../src/server/ in src/cli/
  { from: /from ['"]\.\.\/src\/server\/adapter['"]/g, to: `from '../server/adapter.js'` },

  // Fix ../../ to ../ in src/server/ files
  { from: /from ['"]\.\.\/\.\.\/adapters\/ui-adapter['"]/g, to: `from '../adapters/ui-adapter.js'` },
  { from: /from ['"]\.\.\/\.\.\/core\/ui-watch-manager['"]/g, to: `from '../src/features/ui/ui-watch-manager.js'` },
  { from: /from ['"]\.\.\/\.\.\/core\/ui-react-compiler['"]/g, to: `from '../src/features/ui/ui-react-compiler.js'` },
  { from: /from ['"]\.\.\/\.\.\/core\/ui-file-resolver['"]/g, to: `from '../src/features/ui/ui-file-resolver.js'` },

  // Fix excessive ../../../ paths in builder files (they were in src/api/programmatic/, now in src/server/)
  { from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/core\//g, to: `from '../core/` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/validation\//g, to: `from '../validation/` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/security\//g, to: `from '../security/` },

  // Fix ../../ to ../ for files now in src/server/
  { from: /from ['"]\.\.\/\.\.\/schema-generator['"]/g, to: `from '../schema-generator.js'` },
  { from: /from ['"]\.\.\/\.\.\/handlers\//g, to: `from '../handlers/` },
  { from: /from ['"]\.\.\/\.\.\/types\//g, to: `from '../types/` },
  { from: /from ['"]\.\.\/\.\.\/adapters\//g, to: `from '../adapters/` },
  { from: /from ['"]\.\.\/\.\.\/auth-adapter['"]/g, to: `from '../../features/auth/adapter.js'` },
  { from: /from ['"]\.\.\/\.\.\/security\/types['"]/g, to: `from '../../features/auth/security/types.js'` },
];

function fixImportsInFile(filePath: string): number {
  let content = readFileSync(filePath, 'utf-8');
  let changes = 0;

  for (const { from, to } of replacements) {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      changes += matches.length;
    }
  }

  if (changes > 0) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed ${changes} imports in ${filePath}`);
  }

  return changes;
}

function processDirectory(dir: string): number {
  let totalChanges = 0;

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules
      if (entry === 'node_modules' || entry === 'dist') continue;
      totalChanges += processDirectory(fullPath);
    } else if (stat.isFile() && extname(entry) === '.ts') {
      totalChanges += fixImportsInFile(fullPath);
    }
  }

  return totalChanges;
}

console.log('🔧 Fixing import paths...\n');

const totalChanges = processDirectory('src');

console.log(`\n✨ Fixed ${totalChanges} import statements total`);
