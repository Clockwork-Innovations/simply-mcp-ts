/**
 * Prompt Interface Compiler
 *
 * Compiles IPrompt interfaces into ParsedPrompt metadata for runtime use.
 */

import * as ts from 'typescript';
import type { ParsedPrompt } from '../types.js';
import { normalizeToolName, snakeToCamel } from '../utils.js';

/**
 * Compile an IPrompt interface into ParsedPrompt metadata
 */
export function compilePromptInterface(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile
): ParsedPrompt | null {
  const interfaceName = node.name.text;
  let name = '';
  let description = '';
  let argsType = 'any';
  let argsMetadata: Record<string, { description?: string; required?: boolean }> | undefined;

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
      } else if ((memberName === 'args' || memberName === 'arguments') && member.type && ts.isTypeLiteralNode(member.type)) {
        // Parse args/arguments metadata: Record<string, IPromptArgument>
        // Note: Accept both 'args' and 'arguments' for AI-friendliness
        // Note: Defaults are applied in the handler layer:
        //   - type defaults to 'string'
        //   - required defaults to true
        argsMetadata = {};
        for (const argMember of member.type.members) {
          if (ts.isPropertySignature(argMember) && argMember.name && argMember.type) {
            const argName = argMember.name.getText(sourceFile);
            const argMetadata: { description?: string; required?: boolean; type?: string; enum?: string[] } = {};

            // Check if the property is optional (has ? modifier)
            const isOptional = argMember.questionToken !== undefined;
            if (isOptional) {
              argMetadata.required = false;
            }

            // Parse IPromptArgument fields
            if (ts.isTypeLiteralNode(argMember.type)) {
              const argFieldCount = argMember.type.members.length;

              // Handle empty argument definition: { argName: {} }
              // Empty object means "use all defaults" (type='string', required=true)
              if (argFieldCount === 0) {
                // Store empty object to indicate all defaults should be applied
                argsMetadata[argName] = {};
                continue;
              }

              for (const argField of argMember.type.members) {
                if (ts.isPropertySignature(argField) && argField.name && argField.type) {
                  const fieldName = argField.name.getText(sourceFile);

                  if (fieldName === 'description' && ts.isLiteralTypeNode(argField.type)) {
                    const literal = argField.type.literal;
                    if (ts.isStringLiteral(literal)) {
                      argMetadata.description = literal.text;
                    }
                  } else if (fieldName === 'required' && ts.isLiteralTypeNode(argField.type)) {
                    const literal = argField.type.literal;
                    if (literal.kind === ts.SyntaxKind.TrueKeyword) {
                      argMetadata.required = true;
                    } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
                      argMetadata.required = false;
                    }
                  } else if (fieldName === 'type' && ts.isLiteralTypeNode(argField.type)) {
                    const literal = argField.type.literal;
                    if (ts.isStringLiteral(literal)) {
                      argMetadata.type = literal.text;
                    }
                  } else if (fieldName === 'enum') {
                    // Extract enum values from tuple type (interface literals) or array literal (runtime values)
                    // Handle `as const` assertion by unwrapping it
                    let enumType = argField.type;
                    if (ts.isAsExpression(enumType) || ts.isTypeAssertionExpression(enumType)) {
                      // Strip 'as const' or other type assertions to get the underlying array/tuple
                      enumType = (enumType as ts.AsExpression).expression as any;
                    }

                    if (ts.isTupleTypeNode(enumType)) {
                      // Tuple type: enum: ['a', 'b'] in interface
                      argMetadata.enum = enumType.elements
                        .map(elem => {
                          const elementType = ts.isNamedTupleMember(elem) ? elem.type : elem;
                          if (ts.isLiteralTypeNode(elementType)) {
                            const literal = elementType.literal;
                            if (ts.isStringLiteral(literal)) {
                              return literal.text;
                            }
                          }
                          return null;
                        })
                        .filter((val): val is string => val !== null);
                    } else if (ts.isArrayLiteralExpression(enumType)) {
                      // Array literal: enum: ['a', 'b'] (less common in interfaces)
                      argMetadata.enum = enumType.elements
                        .filter(ts.isStringLiteral)
                        .map(elem => elem.text);
                    }
                  }
                }
              }
            }

            argsMetadata[argName] = argMetadata;
          }
        }
      }
    }

    // Check for callable signature (method implementation)
    // CallSignatureDeclaration is a different node type
    if (ts.isCallSignatureDeclaration(member)) {
      // Extract parameter type from callable signature
      if (member.parameters.length > 0) {
        const firstParam = member.parameters[0];
        if (firstParam.type) {
          argsType = firstParam.type.getText(sourceFile);
        }
      }
    }
  }

  if (!name) {
    console.warn(`Prompt interface ${interfaceName} missing 'name' property`);
    return null;
  }

  return {
    interfaceName,
    name,
    description,
    methodName: snakeToCamel(name),
    argsMetadata,
    argsType,
  };
}
