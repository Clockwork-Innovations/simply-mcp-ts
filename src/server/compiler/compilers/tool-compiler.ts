/**
 * Tool Interface Compiler
 *
 * Compiles ITool interfaces into ParsedTool metadata for runtime use.
 */

import * as ts from 'typescript';
import type { ParsedTool } from '../types.js';
import { normalizeToolName, snakeToCamel } from '../utils.js';
import { extractAnnotationsFromType, validateParamsUseIParam } from '../validation-compiler.js';

/**
 * Compile an ITool interface into ParsedTool metadata
 */
export function compileToolInterface(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
  validationErrors: string[]
): ParsedTool | null {
  const interfaceName = node.name.text;
  let name = '';
  let description = '';
  let paramsType = 'any';
  let resultType = 'any';
  let paramsNode: ts.TypeNode | undefined;
  let resultNode: ts.TypeNode | undefined;
  let annotations: any | undefined;

  // Extract JSDoc description
  const jsDocTags = ts.getJSDocTags(node);
  const jsDocComments = ts.getJSDocCommentsAndTags(node);

  for (const comment of jsDocComments) {
    if (ts.isJSDoc(comment) && comment.comment) {
      description = typeof comment.comment === 'string' ? comment.comment : '';
    }
  }

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = normalizeToolName(literal.text);
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'params' && member.type) {
        paramsNode = member.type;
        paramsType = member.type.getText(sourceFile);
      } else if (memberName === 'result' && member.type) {
        resultNode = member.type;
        resultType = member.type.getText(sourceFile);
      } else if (memberName === 'annotations' && member.type) {
        // Extract annotations object literal
        annotations = extractAnnotationsFromType(member.type, sourceFile, interfaceName, validationErrors);
      }
    }
  }

  // Validate params use IParam (not direct types)
  // Note: This is now a warning, not an error, to maintain backward compatibility
  const validation = validateParamsUseIParam(paramsNode, sourceFile, interfaceName);
  if (!validation.valid) {
    // Print validation warnings (not errors) to encourage best practices
    for (const error of validation.errors) {
      console.warn('\n⚠️  WARNING: ' + error + '\n');
      // Add to validationErrors array for dry-run to report
      validationErrors.push(error);
    }
    // Don't return null - allow tool discovery to continue with warnings
  }

  // Phase 2.1: Tool name inference
  // If name is not provided, guess method name from interface name
  // e.g., "GetWeatherTool" → "getWeather", "MultiplyTool" → "multiply"
  let methodName: string;
  if (name) {
    methodName = snakeToCamel(name);
  } else {
    // Guess method name from interface name
    // Remove "Tool" suffix and lowercase first letter
    methodName = interfaceName
      .replace(/Tool$/, '')  // Remove "Tool" suffix
      .replace(/^([A-Z])/, (m: string) => m.toLowerCase()); // Lowercase first letter
  }

  return {
    interfaceName,
    name: name || undefined,  // Store undefined if not provided
    description,
    methodName,  // Guessed from interface if name not provided
    paramsType,
    resultType,
    paramsNode,
    resultNode,
    annotations,
  };
}
