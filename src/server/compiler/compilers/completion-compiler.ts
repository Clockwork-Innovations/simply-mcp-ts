/**
 * Completion Interface Compiler
 *
 * Compiles ICompletion interfaces into ParsedCompletion metadata for runtime use.
 */

import * as ts from 'typescript';
import type { ParsedCompletion } from '../types.js';
import { snakeToCamel } from '../utils.js';

export function compileCompletionInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedCompletion | null {
  const interfaceName = node.name.text;
  let name = '';
  let description = '';
  let refType = 'any';
  let hasCompleteFunction = false;
  let argType = 'any';
  let suggestionsType = 'any';

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = literal.text;
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'ref' && member.type) {
        refType = member.type.getText(sourceFile);
      } else if (memberName === 'complete' && member.type) {
        hasCompleteFunction = true;
        // Try to extract type parameters from the function type
        if (ts.isFunctionTypeNode(member.type)) {
          // Extract parameter types
          if (member.type.parameters.length > 0) {
            const firstParam = member.type.parameters[0];
            if (firstParam.type) {
              argType = firstParam.type.getText(sourceFile);
            }
          }
          // Extract return type
          if (member.type.type) {
            suggestionsType = member.type.type.getText(sourceFile);
          }
        }
      }
    }
  }

  if (!name) {
    console.warn(`Completion interface ${interfaceName} missing 'name' property`);
    return null;
  }

  return {
    interfaceName,
    name,
    refType,
    description,
    hasCompleteFunction,
    methodName: snakeToCamel(name),
    argType,
    suggestionsType,
  };
}

/**
 * Parse an IUI interface
 */
