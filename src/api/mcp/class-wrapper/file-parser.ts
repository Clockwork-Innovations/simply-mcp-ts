/**
 * File Parser for Class Wrapper Wizard
 *
 * Parses TypeScript class files and extracts method information
 * using the existing type-parser infrastructure.
 */

import * as ts from 'typescript';
import { readFileSync, existsSync } from 'fs';
import { resolve, extname, basename, dirname } from 'path';
import { parseTypeScriptFileWithCache, getMethodParameterTypes } from '../../../type-parser.js';
import type { ParsedClass, ParsedMethod } from './state.js';

/**
 * Parse a TypeScript class file for the wizard
 *
 * This function:
 * 1. Validates the file exists and is .ts
 * 2. Reads the source code
 * 3. Uses the existing type-parser to extract class info
 * 4. Extracts JSDoc comments
 * 5. Determines which methods are public
 */
export async function parseClassForWizard(filePath: string): Promise<ParsedClass> {
  // Resolve to absolute path
  const absolutePath = resolve(filePath);

  // Validate file exists
  if (!existsSync(absolutePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Validate .ts extension
  if (extname(absolutePath) !== '.ts') {
    throw new Error(`Not a TypeScript file: ${filePath}`);
  }

  // Read file content
  const fileContent = readFileSync(absolutePath, 'utf-8');

  // Parse with existing type-parser
  const parsed = parseTypeScriptFileWithCache(absolutePath);

  if (!parsed) {
    throw new Error(`Failed to parse file: ${filePath}`);
  }

  // Create TypeScript source file for detailed analysis
  const sourceFile = ts.createSourceFile(
    absolutePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true
  );

  // Extract additional information
  let isExported = false;
  let classNode: ts.ClassDeclaration | undefined;
  const existingImports: string[] = [];
  let hasExistingDecorators = false;

  // Visit nodes to find class and imports
  function visit(node: ts.Node) {
    // Check for imports
    if (ts.isImportDeclaration(node)) {
      existingImports.push(node.getText(sourceFile));
    }

    // Find the class
    if (ts.isClassDeclaration(node) && node.name?.text === parsed.className) {
      classNode = node;

      // Check if exported
      if (node.modifiers) {
        isExported = node.modifiers.some(
          mod => mod.kind === ts.SyntaxKind.ExportKeyword
        );
      }

      // Check for existing decorators
      const decorators = ts.getDecorators?.(node) || (node as any).decorators;
      if (decorators && decorators.length > 0) {
        hasExistingDecorators = true;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (!classNode) {
    throw new Error(`No exported class found in: ${filePath}`);
  }

  // Extract method information with JSDoc
  const methods: ParsedMethod[] = [];

  classNode.members.forEach(member => {
    if (ts.isMethodDeclaration(member) && member.name) {
      const methodName = member.name.getText(sourceFile);

      // Check if public (not private, not starting with _, not constructor)
      const isPrivate = member.modifiers?.some(
        mod => mod.kind === ts.SyntaxKind.PrivateKeyword
      );
      const isProtected = member.modifiers?.some(
        mod => mod.kind === ts.SyntaxKind.ProtectedKeyword
      );
      const isConstructor = methodName === 'constructor';
      const startsWithUnderscore = methodName.startsWith('_');

      const isPublic = !isPrivate && !isProtected && !isConstructor && !startsWithUnderscore;

      // Get parameters from type-parser
      const params = getMethodParameterTypes(parsed, methodName);

      // Extract parameters with type information
      const parameters = params.map(p => ({
        name: p.name,
        type: mapRuntimeTypeToString(p.type),
        optional: p.optional,
        hasDefault: p.hasDefault,
        defaultValue: p.defaultValue,
      }));

      // Extract return type
      let returnType = 'any';
      if (member.type) {
        returnType = member.type.getText(sourceFile);
      }

      // Extract JSDoc
      const jsdoc = extractJSDoc(member, sourceFile);

      methods.push({
        name: methodName,
        parameters,
        returnType,
        jsdoc,
        isPublic,
      });
    }
  });

  // Filter to only public methods
  const publicMethods = methods.filter(m => m.isPublic);

  if (publicMethods.length === 0) {
    throw new Error(`No public methods found in class: ${parsed.className}`);
  }

  return {
    className: parsed.className,
    isExported,
    methods: publicMethods,
    filePath: absolutePath,
    fileContent,
    existingImports,
    hasExistingDecorators,
  };
}

/**
 * Map runtime constructor to string type
 */
function mapRuntimeTypeToString(type: any): string {
  if (type === String) return 'string';
  if (type === Number) return 'number';
  if (type === Boolean) return 'boolean';
  if (type === Array) return 'array';
  if (type === Object) return 'object';
  if (type === Date) return 'Date';
  return 'any';
}

/**
 * Extract JSDoc comment from a method
 */
function extractJSDoc(
  node: ts.MethodDeclaration,
  sourceFile: ts.SourceFile
): ParsedMethod['jsdoc'] | undefined {
  const jsDocTags = ts.getJSDocTags(node);
  const jsDocComments = ts.getJSDocCommentsAndTags(node);

  if (jsDocComments.length === 0) {
    return undefined;
  }

  let description: string | undefined;
  const params = new Map<string, string>();

  // Extract description and param tags
  for (const comment of jsDocComments) {
    if (ts.isJSDoc(comment)) {
      // Get main description
      if (comment.comment) {
        description = typeof comment.comment === 'string'
          ? comment.comment
          : comment.comment.map(c => c.text).join('');
      }

      // Get param descriptions
      if (comment.tags) {
        for (const tag of comment.tags) {
          if (ts.isJSDocParameterTag(tag) && tag.name) {
            const paramName = tag.name.getText(sourceFile);
            const paramDesc = typeof tag.comment === 'string'
              ? tag.comment
              : tag.comment?.map(c => c.text).join('') || '';
            params.set(paramName, paramDesc);
          }
        }
      }
    }
  }

  if (!description && params.size === 0) {
    return undefined;
  }

  return {
    description,
    params: params.size > 0 ? params : undefined,
  };
}

/**
 * Generate suggested metadata from class name
 */
export function generateSuggestedMetadata(className: string): {
  name: string;
  version: string;
  description: string;
} {
  // Convert PascalCase to kebab-case
  const kebabName = className
    .replace(/([A-Z])/g, (match, p1, offset) =>
      offset > 0 ? `-${p1.toLowerCase()}` : p1.toLowerCase()
    );

  return {
    name: kebabName,
    version: '1.0.0',
    description: `${className} MCP server`,
  };
}
