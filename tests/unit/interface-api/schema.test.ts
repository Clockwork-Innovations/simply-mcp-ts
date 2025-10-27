/**
 * Schema Generation Test
 *
 * Tests TypeScript type -> Zod schema conversion with various types
 */

import { describe, it, expect } from '@jest/globals';
import ts from 'typescript';
import { typeNodeToZodSchema } from '../../../src/core/schema-generator.js';
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

describe('Schema Generation Tests', () => {
  describe('Primitive Types', () => {
    it('should convert string type to z.string()', () => {
      const { typeNode, sourceFile } = createTypeNode('string');
      const schema = typeNodeToZodSchema(typeNode, sourceFile);
      expect(schema).toBeDefined();
      expect(schema).toContain('z.string()');
    });

    it('should convert number type to z.number()', () => {
      const { typeNode, sourceFile } = createTypeNode('number');
      const schema = typeNodeToZodSchema(typeNode, sourceFile);
      expect(schema).toBeDefined();
      expect(schema).toContain('z.number()');
    });

    it('should convert boolean type to z.boolean()', () => {
      const { typeNode, sourceFile } = createTypeNode('boolean');
      const schema = typeNodeToZodSchema(typeNode, sourceFile);
      expect(schema).toBeDefined();
      expect(schema).toContain('z.boolean()');
    });
  });

  describe('Optional Types', () => {
    it('should convert string | undefined to z.string().optional()', () => {
      const { typeNode, sourceFile } = createTypeNode('string | undefined');
      const schema = typeNodeToZodSchema(typeNode, sourceFile);
      expect(schema).toBeDefined();
      expect(schema).toContain('z.string()');
      expect(schema).toContain('optional()');
    });
  });

  describe('Object Types', () => {
    it('should convert object literal to z.object()', () => {
      const { typeNode, sourceFile } = createTypeNode('{ name: string; age: number }');
      const schema = typeNodeToZodSchema(typeNode, sourceFile);
      expect(schema).toBeDefined();
      expect(schema).toContain('z.object(');
      expect(schema).toContain('name');
      expect(schema).toContain('age');
    });
  });

  describe('Array Types', () => {
    it('should convert string[] to z.array(z.string())', () => {
      const { typeNode, sourceFile } = createTypeNode('string[]');
      const schema = typeNodeToZodSchema(typeNode, sourceFile);
      expect(schema).toBeDefined();
      expect(schema).toContain('z.array(');
      expect(schema).toContain('z.string()');
    });
  });

  describe('Enum Types', () => {
    it('should convert union literals to z.enum()', () => {
      const { typeNode, sourceFile } = createTypeNode("'celsius' | 'fahrenheit'");
      const schema = typeNodeToZodSchema(typeNode, sourceFile);
      expect(schema).toBeDefined();
      expect(schema).toContain('z.enum(');
      expect(schema).toContain('celsius');
      expect(schema).toContain('fahrenheit');
    });
  });
});
