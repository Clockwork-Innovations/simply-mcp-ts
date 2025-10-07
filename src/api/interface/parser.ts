/**
 * Interface-Driven API Parser
 *
 * Parses TypeScript files to discover interfaces extending ITool, IPrompt, IResource, IServer.
 * Extracts metadata and type information for schema generation.
 */

import ts from 'typescript';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Parsed tool interface metadata
 */
export interface ParsedTool {
  /** Original interface name */
  interfaceName: string;
  /** Tool name from interface (snake_case) */
  name: string;
  /** Tool description */
  description: string;
  /** Expected method name (camelCase) */
  methodName: string;
  /** Parameter type information */
  paramsType: string;
  /** Result type information */
  resultType: string;
  /** Raw TypeScript node for params */
  paramsNode?: ts.TypeNode;
  /** Raw TypeScript node for result */
  resultNode?: ts.TypeNode;
}

/**
 * Parsed prompt interface metadata
 */
export interface ParsedPrompt {
  /** Original interface name */
  interfaceName: string;
  /** Prompt name from interface (snake_case) */
  name: string;
  /** Prompt description */
  description: string;
  /** Expected method name (camelCase) if dynamic */
  methodName: string;
  /** Template string (for static prompts) */
  template?: string;
  /** Whether this requires dynamic implementation */
  dynamic: boolean;
  /** Argument type information */
  argsType: string;
}

/**
 * Parsed resource interface metadata
 */
export interface ParsedResource {
  /** Original interface name */
  interfaceName: string;
  /** Resource URI */
  uri: string;
  /** Resource name */
  name: string;
  /** Resource description */
  description: string;
  /** Expected method name (camelCase) if dynamic */
  methodName: string;
  /** MIME type */
  mimeType: string;
  /** Static data (for static resources) */
  data?: any;
  /** Whether this requires dynamic implementation */
  dynamic: boolean;
  /** Data type information */
  dataType: string;
}

/**
 * Parsed server interface metadata
 */
export interface ParsedServer {
  /** Original interface name */
  interfaceName: string;
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Server description */
  description?: string;
  /** Class name that implements this interface */
  className?: string;
}

/**
 * Complete parsing result
 */
export interface ParseResult {
  server?: ParsedServer;
  tools: ParsedTool[];
  prompts: ParsedPrompt[];
  resources: ParsedResource[];
  className?: string;
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Parse a TypeScript file to discover interface-driven API definitions
 */
export function parseInterfaceFile(filePath: string): ParseResult {
  const absolutePath = resolve(filePath);
  const sourceCode = readFileSync(absolutePath, 'utf-8');

  // Create a TypeScript program
  const sourceFile = ts.createSourceFile(
    absolutePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const result: ParseResult = {
    tools: [],
    prompts: [],
    resources: [],
  };

  // Visit all nodes in the source file
  function visit(node: ts.Node) {
    // Check for interface declarations
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text;

      // Check if it extends ITool, IPrompt, IResource, or IServer
      if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          for (const type of clause.types) {
            const typeName = type.expression.getText(sourceFile);

            if (typeName === 'ITool') {
              const tool = parseToolInterface(node, sourceFile);
              if (tool) result.tools.push(tool);
            } else if (typeName === 'IPrompt') {
              const prompt = parsePromptInterface(node, sourceFile);
              if (prompt) result.prompts.push(prompt);
            } else if (typeName === 'IResource') {
              const resource = parseResourceInterface(node, sourceFile);
              if (resource) result.resources.push(resource);
            } else if (typeName === 'IServer') {
              const server = parseServerInterface(node, sourceFile);
              if (server) result.server = server;
            }
          }
        }
      }
    }

    // Check for class declarations implementing IServer
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;

      if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
            for (const type of clause.types) {
              const typeName = type.expression.getText(sourceFile);
              // Check if this class implements a server interface
              if (result.server && typeName === result.server.interfaceName) {
                result.server.className = className;
                result.className = className;
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return result;
}

/**
 * Parse an ITool interface
 */
function parseToolInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedTool | null {
  const interfaceName = node.name.text;
  let name = '';
  let description = '';
  let paramsType = 'any';
  let resultType = 'any';
  let paramsNode: ts.TypeNode | undefined;
  let resultNode: ts.TypeNode | undefined;

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
          name = literal.text;
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
      }
    }
  }

  if (!name) {
    console.warn(`Tool interface ${interfaceName} missing 'name' property`);
    return null;
  }

  return {
    interfaceName,
    name,
    description,
    methodName: snakeToCamel(name),
    paramsType,
    resultType,
    paramsNode,
    resultNode,
  };
}

/**
 * Parse an IPrompt interface
 */
function parsePromptInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedPrompt | null {
  const interfaceName = node.name.text;
  let name = '';
  let description = '';
  let template: string | undefined;
  let dynamic = false;
  let argsType = 'any';

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
      } else if (memberName === 'template' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal)) {
          template = literal.text;
        }
      } else if (memberName === 'dynamic' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (literal.kind === ts.SyntaxKind.TrueKeyword) {
          dynamic = true;
        }
      } else if (memberName === 'args' && member.type) {
        argsType = member.type.getText(sourceFile);
      }
    }
  }

  if (!name) {
    console.warn(`Prompt interface ${interfaceName} missing 'name' property`);
    return null;
  }

  // Auto-infer dynamic flag:
  // If template was extracted, it's static
  // If no template and not marked dynamic, infer dynamic
  const isDynamic = dynamic || (template === undefined);

  return {
    interfaceName,
    name,
    description,
    methodName: snakeToCamel(name),
    template,
    dynamic: isDynamic,
    argsType,
  };
}

/**
 * Extract static data from literal type nodes
 * Handles simple cases: string literals, number literals, booleans, null
 * For complex objects, returns undefined (requires dynamic: true)
 */
function extractStaticData(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): any {
  // String literal: 'hello', numbers, booleans, null
  if (ts.isLiteralTypeNode(typeNode)) {
    const literal = typeNode.literal;
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

/**
 * Parse an IResource interface
 */
function parseResourceInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedResource | null {
  const interfaceName = node.name.text;
  let uri = '';
  let name = '';
  let description = '';
  let mimeType = '';
  let data: any = undefined;
  let dynamic = false;
  let dataType = 'any';

  // Parse interface members
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
      } else if (memberName === 'dynamic' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (literal.kind === ts.SyntaxKind.TrueKeyword) {
          dynamic = true;
        }
      } else if (memberName === 'data' && member.type) {
        dataType = member.type.getText(sourceFile);
        // Try to extract static data from simple literal types
        data = extractStaticData(member.type, sourceFile);
      }
    }
  }

  if (!uri) {
    console.warn(`Resource interface ${interfaceName} missing 'uri' property`);
    return null;
  }

  // Auto-infer dynamic flag if not explicitly set:
  // If data extraction failed (undefined) but developer didn't mark as dynamic, infer it
  // If data was extracted successfully, it's static (even if marked dynamic: false)
  const isDynamic = dynamic || (data === undefined);

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
  };
}

/**
 * Parse an IServer interface
 */
function parseServerInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedServer | null {
  const interfaceName = node.name.text;
  let name = '';
  let version = '';
  let description: string | undefined;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = literal.text;
        }
      } else if (memberName === 'version' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          version = literal.text;
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      }
    }
  }

  if (!name || !version) {
    console.warn(`Server interface ${interfaceName} missing required properties`);
    return null;
  }

  return {
    interfaceName,
    name,
    version,
    description,
  };
}
