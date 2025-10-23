/**
 * Generate .d.ts for advanced example
 */

import { parseInterfaceFile } from '../src/api/interface/parser.js';
import { generateDeclarationFile, writeDeclarationFile } from '../src/api/interface/type-generator.js';

const path = 'examples/interface-advanced.ts';
const result = parseInterfaceFile(path);
const dts = generateDeclarationFile(result, path);
console.log(dts);
writeDeclarationFile(path, dts);
console.log('\nGenerated: examples/interface-advanced.d.ts');
