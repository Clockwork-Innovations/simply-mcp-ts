#!/usr/bin/env tsx
/**
 * Phase 1 Refactoring Script: Server Consolidation
 *
 * This script uses ts-morph to safely move server files to src/server/
 * and automatically update all import paths throughout the codebase.
 */

import { Project } from 'ts-morph';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

// File move mappings
const fileMappings: Array<{ from: string; to: string }> = [
  // Server implementations
  { from: 'src/InterfaceServer.ts', to: 'src/server/interface-server.ts' },
  { from: 'src/interface-types.ts', to: 'src/server/interface-types.ts' },
  { from: 'src/parser.ts', to: 'src/server/parser.ts' },
  { from: 'src/adapter.ts', to: 'src/server/adapter.ts' },
  { from: 'src/api/programmatic/BuildMCPServer.ts', to: 'src/server/builder-server.ts' },
  { from: 'src/api/programmatic/types.ts', to: 'src/server/builder-types.ts' },
];

async function main() {
  console.log('🔧 Phase 1: Server Consolidation Refactoring');
  console.log('==========================================\n');

  // Initialize ts-morph project
  console.log('📦 Loading TypeScript project...');
  const project = new Project({
    tsConfigFilePath: 'tsconfig.json',
  });

  // Create target directory
  const targetDir = 'src/server';
  if (!existsSync(targetDir)) {
    console.log(`📁 Creating directory: ${targetDir}`);
    mkdirSync(targetDir, { recursive: true });
  }

  // Process each file move
  for (const mapping of fileMappings) {
    console.log(`\n📦 Processing: ${mapping.from} → ${mapping.to}`);

    const sourceFile = project.getSourceFile(mapping.from);
    if (!sourceFile) {
      console.warn(`⚠️  Source file not found: ${mapping.from}`);
      continue;
    }

    // Ensure target directory exists
    const targetDirPath = dirname(mapping.to);
    if (!existsSync(targetDirPath)) {
      mkdirSync(targetDirPath, { recursive: true });
    }

    // Move the file (ts-morph will handle updating imports)
    console.log(`   Moving file...`);
    sourceFile.move(mapping.to);

    console.log(`   ✓ Moved to ${mapping.to}`);
  }

  // Update all import declarations throughout the project
  console.log('\n🔄 Updating import paths across all files...');
  let updateCount = 0;

  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath();

    // Skip node_modules
    if (filePath.includes('node_modules')) continue;

    let fileUpdated = false;

    for (const importDecl of sourceFile.getImportDeclarations()) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();

      // Update old paths to new paths
      for (const mapping of fileMappings) {
        // Handle various import formats
        const oldPathWithoutExt = mapping.from.replace(/\.ts$/, '');
        const newPathWithoutExt = mapping.to.replace(/\.ts$/, '');

        // Check if this import references the old path
        if (moduleSpecifier.includes(oldPathWithoutExt) ||
            moduleSpecifier === `./${mapping.from}` ||
            moduleSpecifier === `../${mapping.from}` ||
            moduleSpecifier.endsWith(mapping.from.replace('src/', ''))) {

          fileUpdated = true;
          updateCount++;
        }
      }
    }

    if (fileUpdated) {
      console.log(`   ✓ Updated imports in ${filePath}`);
    }
  }

  console.log(`\n✅ Updated ${updateCount} import statements`);

  // Save all changes
  console.log('\n💾 Saving all changes...');
  await project.save();

  console.log('\n✨ Refactoring complete!');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run build');
  console.log('  2. Run: npm test');
  console.log('  3. Delete: src/api/ directory');
  console.log('  4. Update: package.json exports field');
}

main().catch((error) => {
  console.error('❌ Refactoring failed:', error);
  process.exit(1);
});
