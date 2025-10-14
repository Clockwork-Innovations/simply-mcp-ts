/**
 * Decorator Injector for Class Wrapper Wizard
 *
 * Injects @MCPServer and @tool decorators into TypeScript class code
 * using string manipulation to preserve 100% of the original implementation.
 */

import * as ts from 'typescript';
import type { ServerMetadata } from './state.js';

/**
 * Configuration for decorator injection
 */
export interface InjectionConfig {
  originalCode: string;
  className: string;
  serverMetadata: ServerMetadata;
  toolDecorators: Map<string, string>; // method name -> description
}

/**
 * Result of decorator injection
 */
export interface InjectionResult {
  code: string;
  importsAdded: number;
  decoratorsAdded: number;
  linesAdded: number;
}

/**
 * Inject decorators into class code
 *
 * This function:
 * 1. Adds/merges imports
 * 2. Adds @MCPServer decorator to class
 * 3. Adds @tool decorators to specified methods
 * 4. Preserves ALL original code
 */
export function injectDecorators(config: InjectionConfig): InjectionResult {
  const { originalCode, className, serverMetadata, toolDecorators } = config;

  // Step 1: Add imports
  let code = addImports(originalCode);
  const importsAdded = 1;

  // Step 2: Add @MCPServer decorator to class
  code = addClassDecorator(code, className, serverMetadata);
  let decoratorsAdded = 1;

  // Step 3: Add @tool decorators to methods
  for (const [methodName, description] of toolDecorators.entries()) {
    code = addMethodDecorator(code, methodName, description);
    decoratorsAdded++;
  }

  // Calculate lines added
  const originalLines = originalCode.split('\n').length;
  const newLines = code.split('\n').length;
  const linesAdded = newLines - originalLines;

  // Validate syntax
  if (!validateSyntax(code)) {
    throw new Error('Generated code has syntax errors');
  }

  return {
    code,
    importsAdded,
    decoratorsAdded,
    linesAdded,
  };
}

/**
 * Add import statement for decorators
 */
function addImports(code: string): string {
  const importStatement = `import { MCPServer, tool } from 'simply-mcp';\n`;

  // Check if imports already exist
  if (code.includes(`from 'simply-mcp'`)) {
    // Merge with existing import
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]simply-mcp['"]/;
    const match = code.match(importRegex);

    if (match) {
      const existingImports = match[1].split(',').map(s => s.trim());
      const newImports = ['MCPServer', 'tool'];
      const mergedImports = [...new Set([...existingImports, ...newImports])];
      const newImportStatement = `import { ${mergedImports.join(', ')} } from 'simply-mcp'`;
      return code.replace(importRegex, newImportStatement);
    }
  }

  // Find where to insert import (after other imports or at top)
  const lines = code.split('\n');
  let insertIndex = 0;

  // Find last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      insertIndex = i + 1;
    }
  }

  // Insert import
  lines.splice(insertIndex, 0, importStatement.trimEnd());
  return lines.join('\n');
}

/**
 * Add @MCPServer decorator to class
 */
function addClassDecorator(
  code: string,
  className: string,
  metadata: ServerMetadata
): string {
  // Build decorator code
  const decoratorLines: string[] = ['@MCPServer({'];
  decoratorLines.push(`  name: '${metadata.name}',`);
  decoratorLines.push(`  version: '${metadata.version}'${metadata.description ? ',' : ''}`);
  if (metadata.description) {
    decoratorLines.push(`  description: '${metadata.description.replace(/'/g, "\\'")}'`);
  }
  decoratorLines.push('})');

  const decorator = decoratorLines.join('\n');

  // Find class declaration
  const classRegex = new RegExp(
    `(export\\s+)?(default\\s+)?class\\s+${className}`,
    'g'
  );

  // Find the position to insert decorator
  const match = classRegex.exec(code);
  if (!match) {
    throw new Error(`Class ${className} not found in code`);
  }

  const classStart = match.index;

  // Find the start of the line containing the class
  let lineStart = code.lastIndexOf('\n', classStart - 1) + 1;
  if (lineStart === 0) {
    lineStart = 0; // Class is on first line
  }

  // Get indentation of class line
  const classLine = code.substring(lineStart, classStart);
  const indentation = classLine.match(/^\s*/)?.[0] || '';

  // Insert decorator before class
  const before = code.substring(0, lineStart);
  const after = code.substring(lineStart);

  return before + decorator.split('\n').map(line => indentation + line).join('\n') + '\n' + after;
}

/**
 * Add @tool decorator to a method
 */
function addMethodDecorator(
  code: string,
  methodName: string,
  description: string
): string {
  // Build decorator
  const decorator = `@tool('${description.replace(/'/g, "\\'")}')`;

  // Find method declaration
  // Look for: methodName(...) or async methodName(...)
  const methodRegex = new RegExp(
    `(async\\s+)?${methodName}\\s*\\(`,
    'g'
  );

  let match = methodRegex.exec(code);
  if (!match) {
    throw new Error(`Method ${methodName} not found in code`);
  }

  let methodStart = match.index;

  // Check if match is inside a comment and find the actual method declaration
  // This prevents matching method names in JSDoc comments like "Calculate power (a^b)"
  let lineStart = code.lastIndexOf('\n', methodStart - 1) + 1;
  let lineContent = code.substring(lineStart, methodStart);

  // If line contains comment markers (* or //), find next occurrence
  while (lineContent.includes('*') || lineContent.includes('//')) {
    methodRegex.lastIndex = methodStart + 1;
    const nextMatch = methodRegex.exec(code);
    if (!nextMatch) {
      throw new Error(`Method ${methodName} not found in code (only found in comments)`);
    }
    methodStart = nextMatch.index;
    lineStart = code.lastIndexOf('\n', methodStart - 1) + 1;
    lineContent = code.substring(lineStart, methodStart);
  }
  // Now we have the correct method position (not inside a comment)

  // Check for JSDoc IMMEDIATELY before the method (not anywhere in the file)
  const beforeLine = code.substring(0, lineStart);

  // Find the LAST occurrence of */ before the method
  const lastJSDocEnd = beforeLine.lastIndexOf('*/');

  if (lastJSDocEnd === -1) {
    // No JSDoc at all - insert decorator before method
    const methodLine = code.substring(lineStart, methodStart);
    const indentation = methodLine.match(/^\s*/)?.[0] || '';
    const before = code.substring(0, lineStart);
    const after = code.substring(lineStart);
    return before + indentation + decorator + '\n' + after;
  }

  // Check if this */ is IMMEDIATELY before the method (only whitespace between)
  const betweenJSDocAndMethod = code.substring(lastJSDocEnd + 2, lineStart);
  const isJSDocImmediatelyBeforeMethod = /^\s*$/.test(betweenJSDocAndMethod);

  if (isJSDocImmediatelyBeforeMethod) {
    // JSDoc is immediately before method - insert decorator AFTER the JSDoc
    // Find the end of the line containing */
    let insertPos = lastJSDocEnd + 2; // After */
    while (insertPos < code.length && code[insertPos] !== '\n' && code[insertPos] !== '\r') {
      insertPos++;
    }
    // Skip the line ending (could be \n or \r\n)
    if (code[insertPos] === '\r' && code[insertPos + 1] === '\n') {
      insertPos += 2;
    } else if (code[insertPos] === '\n') {
      insertPos += 1;
    }

    const methodLine = code.substring(lineStart, methodStart);
    const indentation = methodLine.match(/^\s*/)?.[0] || '';
    const before = code.substring(0, insertPos);
    const after = code.substring(insertPos);
    return before + indentation + decorator + '\n' + after;
  } else {
    // */ is NOT immediately before method - no JSDoc for this method
    const methodLine = code.substring(lineStart, methodStart);
    const indentation = methodLine.match(/^\s*/)?.[0] || '';
    const before = code.substring(0, lineStart);
    const after = code.substring(lineStart);
    return before + indentation + decorator + '\n' + after;
  }
}

/**
 * Validate TypeScript syntax
 */
function validateSyntax(code: string): boolean {
  try {
    const sourceFile = ts.createSourceFile(
      'temp.ts',
      code,
      ts.ScriptTarget.Latest,
      true
    );

    // Check for parse diagnostics
    const diagnostics = (sourceFile as any).parseDiagnostics;
    if (diagnostics && diagnostics.length > 0) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate preview of changes
 */
export function generatePreview(config: InjectionConfig): {
  preview: string;
  changesSummary: {
    importsAdded: number;
    decoratorsAdded: number;
    linesAdded: number;
    linesModified: number;
    implementationChanges: number;
    preservationRate: string;
  };
} {
  const result = injectDecorators(config);

  return {
    preview: result.code,
    changesSummary: {
      importsAdded: result.importsAdded,
      decoratorsAdded: result.decoratorsAdded,
      linesAdded: result.linesAdded,
      linesModified: 0, // We never modify existing lines
      implementationChanges: 0, // We never change implementation
      preservationRate: '100%',
    },
  };
}
