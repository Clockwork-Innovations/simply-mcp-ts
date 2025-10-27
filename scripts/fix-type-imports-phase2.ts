#!/usr/bin/env tsx
/**
 * Phase 2: Fix Type Imports
 *
 * Updates all imports after type consolidation:
 * - src/core/types → types/handler
 * - src/types → types/core or types
 * - src/types-extended → types/extended or types
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const replacements: Array<{ pattern: RegExp; replacement: string; description: string }> = [
  // Handler type imports (from core/types → types/handler)
  {
    pattern: /from ['"]\.\.\/core\/types\.js['"]/g,
    replacement: `from '../types/handler.js'`,
    description: 'handlers/* files: ../core/types → ../types/handler'
  },
  {
    pattern: /from ['"]\.\/core\/types\.js['"]/g,
    replacement: `from './types/handler.js'`,
    description: 'src/index.ts: ./core/types → ./types/handler'
  },
  {
    pattern: /from ['"]\.\.\/core\/types['"]/g,
    replacement: `from '../types/handler.js'`,
    description: 'Missing .js extension: ../core/types → ../types/handler.js'
  },
  {
    pattern: /from ['"]\.\/core\/types['"]/g,
    replacement: `from './types/handler.js'`,
    description: 'Missing .js extension: ./core/types → ./types/handler.js'
  },

  // Core type imports within types/ directory itself
  {
    pattern: /from ['"]\.\.\/core\/types\.js['"]/g,
    replacement: `from './handler.js'`,
    description: 'types/*.ts files: ../core/types → ./handler'
  },

  // Server builder imports
  {
    pattern: /from ['"]\.\.\/core\/types['"]/g,
    replacement: `from '../types/handler.js'`,
    description: 'server/*.ts files: ../core/types → ../types/handler'
  },
];

async function fixImports() {
  const files = await glob('src/**/*.ts', { ignore: ['**/node_modules/**', '**/*.test.ts'] });

  let totalReplacements = 0;
  const filesChanged: string[] = [];

  for (const file of files) {
    let content = readFileSync(file, 'utf-8');
    const originalContent = content;
    let fileReplacements = 0;

    for (const { pattern, replacement, description } of replacements) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        fileReplacements += matches.length;
        console.log(`  ${file}: ${description} (${matches.length} replacements)`);
      }
    }

    if (content !== originalContent) {
      writeFileSync(file, content, 'utf-8');
      filesChanged.push(file);
      totalReplacements += fileReplacements;
    }
  }

  console.log(`\n✅ Fixed ${totalReplacements} import statements across ${filesChanged.length} files`);
  if (filesChanged.length > 0) {
    console.log('\nFiles changed:');
    filesChanged.forEach(f => console.log(`  - ${f}`));
  }
}

fixImports().catch(console.error);
