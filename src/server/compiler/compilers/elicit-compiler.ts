/**
 * Elicit Interface Compiler
 *
 * Compiles IElicit interfaces into ParsedElicit metadata for runtime use.
 */

import * as ts from 'typescript';
import type { ParsedElicit } from '../types.js';
import { extractStaticData } from '../compiler-helpers.js';

export function compileElicitInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedElicit | null {
  const interfaceName = node.name.text;
  let name = interfaceName; // Use interface name as identifier
  let prompt = '';
  let argsType = 'any';
  let resultType = 'any';
  let isStatic = false;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'prompt' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          prompt = literal.text;
          isStatic = true; // If prompt is a literal, it's static
        }
      } else if (memberName === 'args' && member.type) {
        argsType = member.type.getText(sourceFile);
      } else if (memberName === 'result' && member.type) {
        resultType = member.type.getText(sourceFile);
      }
    }
  }

  if (!prompt) {
    console.warn(`Elicit interface ${interfaceName} missing 'prompt' property`);
    return null;
  }

  return {
    interfaceName,
    name,
    prompt,
    argsType,
    resultType,
    isStatic,
  };
}

/**
 * Parse an IRoots interface
 */
