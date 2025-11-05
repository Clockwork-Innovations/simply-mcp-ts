/**
 * Subscription Interface Compiler
 *
 * Compiles ISubscription interfaces into ParsedSubscription metadata for runtime use.
 */

import * as ts from 'typescript';
import type { ParsedSubscription } from '../types.js';
import { snakeToCamel } from '../utils.js';

export function compileSubscriptionInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedSubscription | null {
  const interfaceName = node.name.text;
  let name = interfaceName; // Use interface name as identifier
  let uri = '';
  let description = '';
  let hasHandler = false;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'uri' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          uri = literal.text;
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'handler' && member.type) {
        // Check if handler property exists
        hasHandler = true;
      }
    }
  }

  if (!uri) {
    console.warn(`Subscription interface ${interfaceName} missing 'uri' property`);
    return null;
  }

  return {
    interfaceName,
    name,
    uri,
    description,
    hasHandler,
    // Use URI as method name (like resources)
    methodName: uri,
  };
}

/**
 * Parse an ICompletion interface
 */
