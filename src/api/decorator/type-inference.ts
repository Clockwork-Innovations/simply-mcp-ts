/**
 * TypeScript Type Inference and Schema Generation
 *
 * This module extracts method signatures and parameter types from TypeScript
 * source files using the TypeScript Compiler API. This enables automatic type
 * inference for decorator-based MCP servers even when using tsx (which strips
 * types at runtime).
 *
 * It also provides Zod schema generation based on TypeScript types and JSDoc.
 */

import * as ts from 'typescript';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';
import type { ParameterInfo, JSDocInfo } from './types.js';

/**
 * Method parameter information extracted from TypeScript AST
 */
export interface MethodParameter {
  /** Parameter name */
  name: string;
  /** Runtime constructor: String, Number, Boolean, Array, Object, Date */
  type: any;
  /** Whether the parameter is optional */
  optional: boolean;
  /** Whether the parameter has a default value */
  hasDefault: boolean;
  /** The default value (if hasDefault is true) */
  defaultValue?: any;
}

/**
 * Method signature extracted from TypeScript AST
 */
export interface MethodSignature {
  /** Method name */
  methodName: string;
  /** Array of parameter information */
  parameters: MethodParameter[];
}

/**
 * Parsed class information from TypeScript AST
 */
export interface ParsedClass {
  /** Class name */
  className: string;
  /** Map of method name to method signature */
  methods: Map<string, MethodSignature>;
}

/**
 * Map TypeScript type to runtime constructor
 *
 * Converts TypeScript AST type nodes to JavaScript runtime constructors
 * for use in Zod schema generation.
 *
 * @param typeNode - TypeScript AST type node
 * @returns Runtime constructor (String, Number, Boolean, etc.) or undefined
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
 *
 * Extracts the default value from a TypeScript AST parameter initializer
 * and converts it to a JavaScript value.
 *
 * @param initializer - TypeScript AST expression node
 * @returns JavaScript value or undefined
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
 *
 * Uses the TypeScript Compiler API to parse a source file and extract
 * detailed information about class methods and their parameters.
 *
 * @param filePath - Path to the TypeScript source file
 * @returns Parsed class information or null if no class found
 *
 * @example
 * ```typescript
 * import { parseTypeScriptFile } from 'simply-mcp';
 *
 * const parsed = parseTypeScriptFile('./my-server.ts');
 * if (parsed) {
 *   console.log(parsed.className); // "MyServer"
 *   console.log(parsed.methods.size); // 3
 *
 *   const greetMethod = parsed.methods.get('greet');
 *   console.log(greetMethod?.parameters[0].name); // "name"
 *   console.log(greetMethod?.parameters[0].type); // String
 * }
 * ```
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
 *
 * Same as parseTypeScriptFile but caches results to avoid re-parsing
 * the same file multiple times.
 *
 * @param filePath - Path to the TypeScript source file
 * @returns Parsed class information or null if no class found
 *
 * @example
 * ```typescript
 * import { parseTypeScriptFileWithCache } from 'simply-mcp';
 *
 * // First call parses the file
 * const parsed1 = parseTypeScriptFileWithCache('./my-server.ts');
 *
 * // Second call returns cached result
 * const parsed2 = parseTypeScriptFileWithCache('./my-server.ts');
 *
 * console.log(parsed1 === parsed2); // true (same object reference)
 * ```
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
 *
 * Helper function to extract parameter information for a specific method
 * from a parsed class.
 *
 * @param parsedClass - Parsed class information
 * @param methodName - Name of the method
 * @returns Array of method parameters or empty array if method not found
 *
 * @example
 * ```typescript
 * import { parseTypeScriptFileWithCache, getMethodParameterTypes } from 'simply-mcp';
 *
 * const parsed = parseTypeScriptFileWithCache('./my-server.ts');
 * const params = getMethodParameterTypes(parsed, 'greet');
 *
 * console.log(params[0].name); // "name"
 * console.log(params[0].type); // String
 * console.log(params[0].optional); // false
 * ```
 */
export function getMethodParameterTypes(
  parsedClass: ParsedClass | null,
  methodName: string
): MethodParameter[] {
  if (!parsedClass) return [];

  const method = parsedClass.methods.get(methodName);
  return method ? method.parameters : [];
}

/**
 * Convert TypeScript parameter to Zod schema with JSDoc descriptions
 *
 * Generates a Zod object schema from TypeScript parameter types and JSDoc
 * information. Supports optional parameters, defaults, and type inference.
 *
 * @param paramTypes - Runtime parameter types from reflect-metadata
 * @param methodName - Name of the method (for debugging)
 * @param paramInfo - Parameter information with names, optionality, and defaults
 * @param jsdoc - Optional JSDoc information with parameter descriptions
 * @returns Zod object schema for the parameters
 *
 * @example
 * ```typescript
 * import { inferZodSchema } from 'simply-mcp';
 *
 * // Function with JSDoc
 * /**
 *  * Greet a user
 *  * @param name User's name
 *  * @param formal Use formal greeting
 *  *\/
 * function greet(name: string, formal: boolean = false) {
 *   return formal ? `Good day, ${name}` : `Hi, ${name}!`;
 * }
 *
 * const paramInfo = [
 *   { name: 'name', optional: false, hasDefault: false, type: String },
 *   { name: 'formal', optional: true, hasDefault: true, defaultValue: false, type: Boolean }
 * ];
 *
 * const jsdoc = {
 *   description: 'Greet a user',
 *   params: new Map([
 *     ['name', "User's name"],
 *     ['formal', 'Use formal greeting']
 *   ])
 * };
 *
 * const schema = inferZodSchema([String, Boolean], 'greet', paramInfo, jsdoc);
 *
 * // Validate input
 * schema.parse({ name: 'Alice', formal: true }); // OK
 * schema.parse({ name: 'Bob' }); // OK (formal defaults to false)
 * ```
 */
export function inferZodSchema(
  paramTypes: any[],
  methodName: string,
  paramInfo: ParameterInfo[] | string[],
  jsdoc?: JSDocInfo
): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  // Convert string[] to ParameterInfo[] for backward compatibility
  const params: ParameterInfo[] = Array.isArray(paramInfo) && typeof paramInfo[0] === 'string'
    ? (paramInfo as string[]).map(name => ({ name, optional: false, hasDefault: false }))
    : paramInfo as ParameterInfo[];

  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    // Try param.type first (from signature parsing), fall back to paramTypes[i] (from reflect-metadata)
    const paramType = param.type || paramTypes[i];

    // Basic type inference
    let zodType: z.ZodTypeAny;
    if (paramType === String) {
      zodType = z.string();
    } else if (paramType === Number) {
      zodType = z.number();
    } else if (paramType === Boolean) {
      zodType = z.boolean();
    } else if (paramType === Array) {
      zodType = z.array(z.any());
    } else if (paramType === Object) {
      zodType = z.object({}).passthrough();
    } else if (paramType === Date) {
      zodType = z.date();
    } else {
      // Default to any for unknown types
      zodType = z.any();
    }

    // Add description from JSDoc if available
    const paramDesc = jsdoc?.params.get(param.name);
    if (paramDesc) {
      zodType = zodType.describe(paramDesc);
    }

    // Handle optional parameters
    if (param.optional) {
      zodType = zodType.optional();
    }

    // Handle default values
    if (param.hasDefault && param.defaultValue !== undefined) {
      zodType = zodType.default(param.defaultValue);
    }

    shape[param.name] = zodType;
  }

  return z.object(shape);
}

/**
 * Extract parameter names from function (legacy support)
 *
 * Simple helper that returns just the parameter names from a function.
 * This is a legacy function maintained for backward compatibility.
 *
 * @param fn - Function to extract parameter names from
 * @returns Array of parameter names
 *
 * @example
 * ```typescript
 * import { getParameterNames } from 'simply-mcp';
 *
 * function greet(name: string, formal?: boolean) {
 *   return formal ? `Good day, ${name}` : `Hi, ${name}!`;
 * }
 *
 * const names = getParameterNames(greet);
 * console.log(names); // ['name', 'formal']
 * ```
 */
export function getParameterNames(fn: Function): string[] {
  const fnString = fn.toString();
  const match = fnString.match(/\(([^)]*)\)/);

  if (!match || !match[1]) return [];

  const params = match[1].split(',').map(p => p.trim()).filter(p => p);

  return params.map(param => {
    // Extract just the name, ignoring types and defaults
    const name = param.split(/[=:]/)[0].trim();
    return name.endsWith('?') ? name.slice(0, -1).trim() : name;
  });
}
