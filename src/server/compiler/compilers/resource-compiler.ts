/**
 * Resource Interface Compiler
 *
 * Compiles IResource interfaces into ParsedResource metadata for runtime use.
 */

import * as ts from 'typescript';
import type { ParsedResource } from '../types.js';
import type { IDatabase } from '../../interface-types.js';
import { extractStaticData } from '../compiler-helpers.js';

export function compileResourceInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedResource | null {
  const interfaceName = node.name.text;
  let uri = '';
  let name = '';
  let description = '';
  let mimeType = '';
  let data: any = undefined;
  let dynamic = false;
  let dataType = 'any';
  let value: any = undefined;
  let returns: any = undefined;
  let hasValue = false;
  let hasReturns = false;
  let valueType = 'any';
  let returnsType = 'any';
  let database: IDatabase | undefined = undefined;

  // Parse interface members
  const invalidDataFields: string[] = [];

  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'uri' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          uri = literal.text;
        }
      } else if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = literal.text;
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'mimeType' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          mimeType = literal.text;
        }
      } else if (memberName === 'value' && member.type) {
        // Static literal data
        valueType = member.type.getText(sourceFile);
        value = extractStaticData(member.type, sourceFile);
        hasValue = true;
      } else if (memberName === 'returns' && member.type) {
        // Dynamic type definition
        returnsType = member.type.getText(sourceFile);
        returns = extractStaticData(member.type, sourceFile); // Try extraction (usually undefined for types)
        hasReturns = true;
      } else if (memberName === 'database' && member.type) {
        // Database configuration
        database = extractStaticData(member.type, sourceFile) as IDatabase | undefined;

        // Validate database configuration
        if (database && typeof database === 'object') {
          if (!database.uri || typeof database.uri !== 'string') {
            throw new Error(
              `Resource interface ${interfaceName} has invalid database configuration. ` +
              `The 'uri' field is required and must be a string.`
            );
          }
        }
      } else if (memberName === 'text' || memberName === 'data' || memberName === 'content') {
        // Track invalid fields that look like they should be 'value' or 'returns'
        invalidDataFields.push(memberName);
      }
    }
  }

  if (!uri) {
    console.warn(`Resource interface ${interfaceName} missing 'uri' property`);
    return null;
  }

  // Check for invalid data fields
  if (invalidDataFields.length > 0) {
    throw new Error(
      `Resource interface ${interfaceName} uses invalid field(s): ${invalidDataFields.join(', ')}.\n` +
      `\n` +
      `Resources must use one of these fields for data:\n` +
      `  - 'value' for static resources (literal data in the interface)\n` +
      `  - 'returns' for dynamic resources (type annotation, requires implementation)\n` +
      `\n` +
      `Examples:\n` +
      `\n` +
      `Static resource:\n` +
      `  interface ConfigResource extends IResource {\n` +
      `    uri: 'config://settings';\n` +
      `    value: { apiUrl: 'https://api.example.com' };  // Literal data\n` +
      `  }\n` +
      `\n` +
      `Dynamic resource:\n` +
      `  interface StatsResource extends IResource {\n` +
      `    uri: 'stats://current';\n` +
      `    returns: string;  // Type annotation\n` +
      `  }\n` +
      `  class MyServer {\n` +
      `    'stats://current': StatsResource = async () => { ... };  // Implementation\n` +
      `  }`
    );
  }

  // Validate mutual exclusivity of value and returns
  if (hasValue && hasReturns) {
    throw new Error(
      `Resource interface ${interfaceName} cannot have both 'value' and 'returns' fields. ` +
      `Use 'value' for static resources (literal data) or 'returns' for dynamic resources (type definitions).`
    );
  }

  // Determine if resource is dynamic based on which field is present
  const isDynamic = hasReturns;

  // Set data and dataType based on which field was used
  if (hasValue) {
    data = value;
    dataType = valueType;
  } else if (hasReturns) {
    data = returns;
    dataType = returnsType;
  }

  return {
    interfaceName,
    uri,
    name,
    description,
    // For dynamic resources, use the URI directly as the method/property name
    // JavaScript allows any string as a property key: server['config://server']
    methodName: uri,
    mimeType,
    data,
    dynamic: isDynamic,
    dataType,
    database,
  };
}
