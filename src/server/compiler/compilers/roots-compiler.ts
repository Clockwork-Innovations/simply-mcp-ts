/**
 * Roots Interface Compiler
 *
 * Compiles IRoots interfaces into ParsedRoots metadata for runtime use.
 */

import * as ts from 'typescript';
import type { ParsedRoots } from '../types.js';

export function compileRootsInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedRoots | null {
  const interfaceName = node.name.text;
  let name = '';
  let description = '';

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
      }
    }
  }

  if (!name) {
    console.warn(`Roots interface ${interfaceName} missing 'name' property`);
    return null;
  }

  return {
    interfaceName,
    name,
    description,
  };
}

/**
 * Parse an ISubscription interface
 */
