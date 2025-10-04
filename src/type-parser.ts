/**
 * TypeScript Source File Parser
 *
 * Extracts method signatures and parameter types from TypeScript source files
 * using the TypeScript Compiler API. This enables automatic type inference
 * for decorator-based MCP servers even when using tsx (which strips types at runtime).
 */

import * as ts from 'typescript';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface MethodParameter {
  name: string;
  type: any; // Runtime constructor: String, Number, Boolean, Array, Object, Date
  optional: boolean;
  hasDefault: boolean;
  defaultValue?: any;
}

export interface MethodSignature {
  methodName: string;
  parameters: MethodParameter[];
}

export interface ParsedClass {
  className: string;
  methods: Map<string, MethodSignature>;
}

/**
 * Map TypeScript type to runtime constructor
 */
function mapTypeToConstructor(typeNode: ts.TypeNode | undefined): any {
  if (!typeNode) return undefined;

  switch (typeNode.kind) {
    case ts.SyntaxKind.StringKeyword:
      return String;
    case ts.SyntaxKind.NumberKeyword:
      return Number;
    case ts.SyntaxKind.BooleanKeyword:
      return Boolean;
    case ts.SyntaxKind.ArrayType:
      return Array;
    case ts.SyntaxKind.TypeReference:
      const typeName = (typeNode as ts.TypeReferenceNode).typeName.getText();
      if (typeName === 'Array') return Array;
      if (typeName === 'Date') return Date;
      return Object;
    case ts.SyntaxKind.ObjectKeyword:
    case ts.SyntaxKind.TypeLiteral:
      return Object;
    default:
      return undefined;
  }
}

/**
 * Extract default value from parameter initializer
 */
function extractDefaultValue(initializer: ts.Expression | undefined): any {
  if (!initializer) return undefined;

  switch (initializer.kind) {
    case ts.SyntaxKind.StringLiteral:
      return (initializer as ts.StringLiteral).text;
    case ts.SyntaxKind.NumericLiteral:
      return Number((initializer as ts.NumericLiteral).text);
    case ts.SyntaxKind.TrueKeyword:
      return true;
    case ts.SyntaxKind.FalseKeyword:
      return false;
    case ts.SyntaxKind.NullKeyword:
      return null;
    default:
      // For complex expressions, return the text representation
      return initializer.getText();
  }
}

/**
 * Parse a TypeScript source file and extract class method signatures
 */
export function parseTypeScriptFile(filePath: string): ParsedClass | null {
  const absolutePath = resolve(filePath);
  const sourceCode = readFileSync(absolutePath, 'utf-8');

  // Create a source file
  const sourceFile = ts.createSourceFile(
    absolutePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  let parsedClass: ParsedClass | null = null;

  // Visit each node in the AST
  function visit(node: ts.Node) {
    // Look for class declarations
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      const methods = new Map<string, MethodSignature>();

      // Iterate through class members
      node.members.forEach(member => {
        // Look for method declarations
        if (ts.isMethodDeclaration(member) && member.name) {
          const methodName = member.name.getText();
          const parameters: MethodParameter[] = [];

          // Extract parameter information
          member.parameters.forEach(param => {
            const paramName = param.name.getText();
            const optional = !!param.questionToken;
            const hasDefault = !!param.initializer;
            const type = mapTypeToConstructor(param.type);
            const defaultValue = extractDefaultValue(param.initializer);

            parameters.push({
              name: paramName,
              type,
              optional: optional || hasDefault,
              hasDefault,
              defaultValue,
            });
          });

          methods.set(methodName, {
            methodName,
            parameters,
          });
        }
      });

      parsedClass = {
        className,
        methods,
      };
    }

    // Continue visiting child nodes
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return parsedClass;
}

/**
 * Cache for parsed files to avoid re-parsing
 */
const parseCache = new Map<string, ParsedClass | null>();

/**
 * Parse a TypeScript file with caching
 */
export function parseTypeScriptFileWithCache(filePath: string): ParsedClass | null {
  const absolutePath = resolve(filePath);

  if (parseCache.has(absolutePath)) {
    return parseCache.get(absolutePath) || null;
  }

  const result = parseTypeScriptFile(absolutePath);
  parseCache.set(absolutePath, result);
  return result;
}

/**
 * Get method parameter types from parsed class
 */
export function getMethodParameterTypes(
  parsedClass: ParsedClass | null,
  methodName: string
): MethodParameter[] {
  if (!parsedClass) return [];

  const method = parsedClass.methods.get(methodName);
  return method ? method.parameters : [];
}
