/**
 * Router Interface Compiler
 *
 * Compiles IRouter interfaces into ParsedRouter metadata for runtime use.
 */

import * as ts from 'typescript';
import type { ParsedRouter } from '../types.js';
import { normalizeToolName, camelToSnake } from '../utils.js';
import { extractStaticData } from '../compiler-helpers.js';

export function compileRouterInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedRouter | null {
  const interfaceName = node.name.text;
  let name: string | undefined;
  let description = '';
  const tools: string[] = [];
  let metadata: ParsedRouter['metadata'];

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
      } else if (memberName === 'tools' && member.type) {
        // Parse tools array: tools: [GetWeatherTool, GetForecastTool, ...]
        // The type can be:
        // - TupleTypeNode: [ToolA, ToolB] (expected format)
        // - ArrayTypeNode: ITool[] (generic, cannot extract names)

        if (ts.isTupleTypeNode(member.type)) {
          // Extract tool names from tuple of type references
          for (const element of member.type.elements) {
            const elementType = ts.isNamedTupleMember(element) ? element.type : element;

            // Handle type references (e.g., GetWeatherTool)
            if (ts.isTypeReferenceNode(elementType)) {
              const typeName = elementType.typeName.getText(sourceFile);
              // Convert interface name to tool name: GetWeatherTool -> get_weather_tool
              // We'll look up the actual tool name from the interface later in adapter
              // For now, store the interface name
              tools.push(typeName);
            }
            // Fallback: handle string literals (backward compatibility)
            else if (ts.isLiteralTypeNode(elementType)) {
              const literal = elementType.literal;
              if (ts.isStringLiteral(literal)) {
                tools.push(literal.text);
              }
            }
          }
        } else if (ts.isArrayTypeNode(member.type)) {
          // Array type without specific elements (tools: ITool[])
          // Cannot extract specific tools at compile time
          console.warn(`Router ${interfaceName}: tools must be specified as tuple [Tool1, Tool2], not generic array type`);
        }
      } else if (memberName === 'metadata' && member.type && ts.isTypeLiteralNode(member.type)) {
        // Parse metadata object
        metadata = {};
        for (const metaMember of member.type.members) {
          if (ts.isPropertySignature(metaMember) && metaMember.name && metaMember.type) {
            const metaKey = metaMember.name.getText(sourceFile);

            if (metaKey === 'category' && ts.isLiteralTypeNode(metaMember.type)) {
              const literal = metaMember.type.literal;
              if (ts.isStringLiteral(literal)) {
                metadata.category = literal.text;
              }
            } else if (metaKey === 'order' && ts.isLiteralTypeNode(metaMember.type)) {
              const literal = metaMember.type.literal;
              if (ts.isNumericLiteral(literal)) {
                metadata.order = parseInt(literal.text, 10);
              }
            } else if (metaKey === 'tags' && ts.isTupleTypeNode(metaMember.type)) {
              // Parse tags array
              metadata.tags = [];
              for (const tagElement of metaMember.type.elements) {
                const tagType = ts.isNamedTupleMember(tagElement) ? tagElement.type : tagElement;
                if (ts.isLiteralTypeNode(tagType)) {
                  const literal = tagType.literal;
                  if (ts.isStringLiteral(literal)) {
                    metadata.tags.push(literal.text);
                  }
                }
              }
            } else {
              // Handle other metadata fields (store as unknown)
              if (ts.isLiteralTypeNode(metaMember.type)) {
                const literal = metaMember.type.literal;
                if (ts.isStringLiteral(literal)) {
                  metadata[metaKey] = literal.text;
                } else if (ts.isNumericLiteral(literal)) {
                  metadata[metaKey] = parseInt(literal.text, 10);
                } else if (literal.kind === ts.SyntaxKind.TrueKeyword) {
                  metadata[metaKey] = true;
                } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
                  metadata[metaKey] = false;
                }
              }
            }
          }
        }
      }
    }
  }

  // Validation
  if (!description) {
    console.warn(`Router ${interfaceName}: description is required`);
    return null;
  }

  // Allow empty tools arrays (useful for placeholder/template routers)
  // Users may want to define router structure before adding tools

  // Generate property name from interface name
  // WeatherRouter -> weatherRouter
  const propertyName = interfaceName.charAt(0).toLowerCase() + interfaceName.slice(1);

  return {
    interfaceName,
    name,
    description,
    tools,
    propertyName,
    metadata,
  };
}

/**
 * Parse an IServer interface
 */
