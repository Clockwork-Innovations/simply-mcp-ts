/**
 * Test script to generate sample .d.ts files
 */

import { parseInterfaceFile } from '../src/api/interface/parser.js';
import { generateDeclarationFile, writeDeclarationFile } from '../src/api/interface/type-generator.js';
import { resolve } from 'path';

// Generate for interface-minimal.ts
const minimalPath = resolve('examples/interface-minimal.ts');
console.log('Parsing:', minimalPath);

const parseResult = parseInterfaceFile(minimalPath);
console.log('\nParsed tools:');
parseResult.tools.forEach(tool => {
  console.log(`  - ${tool.interfaceName} -> ${tool.methodName}()`);
});

const dtsContent = generateDeclarationFile(parseResult, minimalPath);
console.log('\nGenerated .d.ts content:');
console.log('='.repeat(80));
console.log(dtsContent);
console.log('='.repeat(80));

writeDeclarationFile(minimalPath, dtsContent);
console.log('\nWritten to:', minimalPath.replace('.ts', '.d.ts'));
