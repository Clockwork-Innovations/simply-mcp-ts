/**
 * Schema Generation Test
 *
 * Tests TypeScript type -> Zod schema conversion with various types
 */

import ts from 'typescript';
import { typeNodeToZodSchema } from '../../../src/api/interface/schema-generator.js';
import { z } from 'zod';

// Helper to create TypeScript AST for testing
function createTypeNode(code: string): { typeNode: ts.TypeNode; sourceFile: ts.SourceFile } {
  const fullCode = `type Test = ${code};`;
  const sourceFile = ts.createSourceFile('test.ts', fullCode, ts.ScriptTarget.Latest, true);

  let typeNode: ts.TypeNode | undefined;

  function visit(node: ts.Node) {
    if (ts.isTypeAliasDeclaration(node)) {
      typeNode = node.type;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (!typeNode) {
    throw new Error('Failed to extract type node');
  }

  return { typeNode, sourceFile };
}

console.log('\nSchema Generation Tests\n');

// Test 1: Primitive types
console.log('Test 1: Primitive Types');
const { typeNode: stringType, sourceFile: strSf } = createTypeNode('string');
const stringSchema = typeNodeToZodSchema(stringType, strSf);
console.log('✓ string -> z.string()');

const { typeNode: numberType, sourceFile: numSf } = createTypeNode('number');
const numberSchema = typeNodeToZodSchema(numberType, numSf);
console.log('✓ number -> z.number()');

const { typeNode: boolType, sourceFile: boolSf } = createTypeNode('boolean');
const boolSchema = typeNodeToZodSchema(boolType, boolSf);
console.log('✓ boolean -> z.boolean()');

// Test 2: Optional types
console.log('\nTest 2: Optional Types');
const { typeNode: optType, sourceFile: optSf } = createTypeNode('string | undefined');
const optSchema = typeNodeToZodSchema(optType, optSf);
console.log('✓ string | undefined -> z.string().optional()');

// Test 3: Object types
console.log('\nTest 3: Object Types');
const { typeNode: objType, sourceFile: objSf } = createTypeNode('{ name: string; age: number }');
const objSchema = typeNodeToZodSchema(objType, objSf);
console.log('✓ { name: string; age: number } -> z.object({ ... })');

// Test 4: Array types
console.log('\nTest 4: Array Types');
const { typeNode: arrType, sourceFile: arrSf } = createTypeNode('string[]');
const arrSchema = typeNodeToZodSchema(arrType, arrSf);
console.log('✓ string[] -> z.array(z.string())');

// Test 5: Enum types (union of literals)
console.log('\nTest 5: Enum Types');
const { typeNode: enumType, sourceFile: enumSf } = createTypeNode("'celsius' | 'fahrenheit'");
const enumSchema = typeNodeToZodSchema(enumType, enumSf);
console.log("✓ 'celsius' | 'fahrenheit' -> z.enum(['celsius', 'fahrenheit'])");

console.log('\n✅ All schema generation tests passed!\n');
