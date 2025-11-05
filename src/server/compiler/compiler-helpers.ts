/**
 * Compiler Helper Functions
 *
 * Shared utilities used across multiple interface compilers.
 */

import * as ts from 'typescript';

/**
 * Extract static data from literal type nodes
 * Handles simple cases: string literals, number literals, booleans, null, objects, arrays
 * For complex types, returns undefined (requires dynamic: true)
 */
export function extractStaticData(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): any {
  // String literal: 'hello', numbers, booleans, null
  if (ts.isLiteralTypeNode(typeNode)) {
    const literal = typeNode.literal;
    // Template literal without substitutions: `hello world`
    if (ts.isNoSubstitutionTemplateLiteral(literal)) {
      return literal.text;
    }
    if (ts.isStringLiteral(literal)) {
      return literal.text;
    }
    if (ts.isNumericLiteral(literal)) {
      return Number(literal.text);
    }
    if (literal.kind === ts.SyntaxKind.TrueKeyword) {
      return true;
    }
    if (literal.kind === ts.SyntaxKind.FalseKeyword) {
      return false;
    }
    if (literal.kind === ts.SyntaxKind.NullKeyword) {
      return null;
    }
    // Handle negative numbers: -10, -3.14
    if (ts.isPrefixUnaryExpression(literal) && literal.operator === ts.SyntaxKind.MinusToken) {
      const operand = literal.operand;
      if (ts.isNumericLiteral(operand)) {
        return -Number(operand.text);
      }
    }
  }

  // Object literal: { key: 'value', num: 42 }
  if (ts.isTypeLiteralNode(typeNode)) {
    const obj: any = {};
    let hasNonLiteralValue = false;

    for (const member of typeNode.members) {
      if (ts.isPropertySignature(member) && member.name && member.type) {
        const key = member.name.getText(sourceFile);
        const value = extractStaticData(member.type, sourceFile);

        // Check if extraction failed (undefined returned, but it's not an UndefinedKeyword or NullKeyword)
        if (value === undefined &&
            member.type.kind !== ts.SyntaxKind.UndefinedKeyword) {
          // Complex type that we can't extract
          hasNonLiteralValue = true;
          break;
        }

        obj[key] = value;
      }
    }

    // Only return object if all values are simple literals
    return hasNonLiteralValue ? undefined : obj;
  }

  // Tuple type: ['a', 'b', 'c'] (readonly arrays with literal types)
  if (ts.isTupleTypeNode(typeNode)) {
    const arr: any[] = [];

    for (const element of typeNode.elements) {
      // Handle NamedTupleMember for labeled tuples
      const elementType = ts.isNamedTupleMember(element) ? element.type : element;
      const value = extractStaticData(elementType, sourceFile);

      if (value === undefined) {
        // Can't extract tuple with complex types
        return undefined;
      }

      arr.push(value);
    }

    return arr;
  }

  // Can't extract - requires dynamic implementation
  return undefined;
}
