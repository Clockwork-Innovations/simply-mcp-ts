/**
 * Schema Metadata Extractor
 *
 * Extracts schema metadata from TypeScript AST nodes and converts to JSON format
 * suitable for embedding in bundle manifests. This allows bundled servers to have
 * proper parameter validation at runtime.
 */

import type * as ts from 'typescript';
import { ensureTypeScript } from './typescript-detector.js';
import type { ParameterSchema, ToolSchema } from './bundle-manifest.js';
import type { ParsedTool } from '../server/compiler/types.js';
import { resolve } from 'path';

/**
 * Extract schema metadata for all tools from parsed AST
 *
 * @param tools - Array of parsed tools from AST parsing
 * @param filePath - Path to the source file (for creating TypeChecker)
 * @returns Map of tool names to schema metadata
 */
export function extractToolSchemas(
  tools: ParsedTool[],
  filePath: string
): Record<string, ToolSchema> {
  const schemas: Record<string, ToolSchema> = {};

  // Lazy-load TypeScript
  const ts = ensureTypeScript();

  // Create a TypeChecker for resolving types
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
  };

  const compilerHost = ts.createCompilerHost(compilerOptions);
  const program = ts.createProgram([resolve(filePath)], compilerOptions, compilerHost);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(resolve(filePath));

  if (!sourceFile) {
    console.warn('[Schema Metadata] Failed to load source file for schema extraction');
    return schemas;
  }

  for (const tool of tools) {
    // Skip tools without params node (shouldn't happen, but be safe)
    if (!tool.paramsNode) {
      continue;
    }

    try {
      // Re-find the tool interface in the program's AST
      const paramsTypeNode = findParamsTypeNode(tool.interfaceName, sourceFile, ts);

      if (!paramsTypeNode) {
        console.warn(`[Schema Metadata] Could not find params type for ${tool.interfaceName}`);
        continue;
      }

      // Extract parameter schemas from the type node
      const parameters = extractParametersFromTypeNode(paramsTypeNode, sourceFile, checker, ts);

      // Use tool.name if available, otherwise infer from methodName
      const toolName = tool.name || camelToSnake(tool.methodName);

      schemas[toolName] = {
        description: tool.description,
        parameters,
      };
    } catch (error) {
      console.warn(
        `[Schema Metadata] Failed to extract schema for ${tool.interfaceName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return schemas;
}

/**
 * Find the params type node for a given tool interface
 */
function findParamsTypeNode(
  interfaceName: string,
  sourceFile: ts.SourceFile,
  ts: typeof import('typescript')
): ts.TypeNode | undefined {
  let paramsTypeNode: ts.TypeNode | undefined;

  function findInterface(node: ts.Node): void {
    if (ts.isInterfaceDeclaration(node)) {
      const nodeName = node.name.text;

      if (nodeName === interfaceName) {
        // Found the interface, now extract the params property type
        for (const member of node.members) {
          if (ts.isPropertySignature(member) && member.name) {
            const memberName = member.name.getText(sourceFile);
            if (memberName === 'params' && member.type) {
              paramsTypeNode = member.type;
              return;
            }
          }
        }
      }
    }

    ts.forEachChild(node, findInterface);
  }

  findInterface(sourceFile);
  return paramsTypeNode;
}

/**
 * Extract parameter schemas from a TypeScript type node
 *
 * Converts TypeScript type definitions to simple JSON metadata format
 */
function extractParametersFromTypeNode(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  ts: typeof import('typescript')
): Record<string, ParameterSchema> {
  const parameters: Record<string, ParameterSchema> = {};

  // Handle type literal (inline object definition)
  if (ts.isTypeLiteralNode(typeNode)) {
    for (const member of typeNode.members) {
      if (ts.isPropertySignature(member) && member.name && member.type) {
        const paramName = member.name.getText(sourceFile);
        const paramSchema = extractParameterSchema(member.type, sourceFile, checker, ts, member);

        // Check if parameter is optional (has ? modifier)
        const isOptional = !!member.questionToken;
        paramSchema.required = !isOptional;

        parameters[paramName] = paramSchema;
      }
    }
  }
  // Handle type reference (interface reference like MyParams)
  else if (ts.isTypeReferenceNode(typeNode)) {
    const type = checker.getTypeAtLocation(typeNode);
    const properties = type.getProperties();

    for (const prop of properties) {
      const paramName = prop.getName();
      const propType = checker.getTypeOfSymbolAtLocation(prop, typeNode);
      const propDecl = prop.valueDeclaration;

      if (propDecl && ts.isPropertySignature(propDecl) && propDecl.type) {
        const paramSchema = extractParameterSchema(propDecl.type, sourceFile, checker, ts, propDecl as ts.PropertySignature);

        // Check if parameter is optional
        const isOptional = !!(propDecl as ts.PropertySignature).questionToken;
        paramSchema.required = !isOptional;

        parameters[paramName] = paramSchema;
      }
    }
  }

  return parameters;
}

/**
 * Extract schema metadata for a single parameter
 */
function extractParameterSchema(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  ts: typeof import('typescript'),
  propertySignature?: ts.PropertySignature
): ParameterSchema {
  const schema: ParameterSchema = {
    type: 'string', // Default fallback
  };

  // Extract JSDoc description if available
  if (propertySignature) {
    const jsDocComment = extractJsDocDescription(propertySignature, ts);
    if (jsDocComment) {
      schema.description = jsDocComment;
    }
  }

  // Check if this is an IParam extension with metadata
  if (ts.isTypeLiteralNode(typeNode)) {
    const iparamData = extractIParamMetadata(typeNode, sourceFile, checker, ts);
    if (iparamData) {
      // Merge JSDoc description if not already set in IParam
      if (!iparamData.description && schema.description) {
        iparamData.description = schema.description;
      }
      return iparamData;
    }

    // Not an IParam - extract as nested object
    schema.type = 'object';
    schema.properties = extractPropertiesFromTypeLiteral(typeNode, sourceFile, checker, ts);
    return schema;
  }

  // Handle type references (interfaces, type aliases, Array<T>)
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName.getText(sourceFile);

    // Handle Array<T> syntax
    if (typeName === 'Array' && typeNode.typeArguments && typeNode.typeArguments.length === 1) {
      schema.type = 'array';
      schema.items = extractParameterSchema(typeNode.typeArguments[0], sourceFile, checker, ts);
      return schema;
    }

    // Try to resolve the type to check if it extends IParam
    try {
      const type = checker.getTypeAtLocation(typeNode);
      const properties = type.getProperties();

      // Check if this looks like an IParam (has 'type' and 'description' fields)
      const hasTypeField = properties.some(p => p.getName() === 'type');
      const hasDescriptionField = properties.some(p => p.getName() === 'description');

      if (hasTypeField || hasDescriptionField) {
        // This is likely an IParam interface - extract its metadata
        const iparamSchema: ParameterSchema = { type: 'string' };

        for (const prop of properties) {
          const propName = prop.getName();
          const propDecl = prop.valueDeclaration;

          if (propDecl && ts.isPropertySignature(propDecl) && propDecl.type) {
            const value = extractLiteralValue(propDecl.type, ts);

            switch (propName) {
              case 'type':
                if (typeof value === 'string') {
                  iparamSchema.type = value;
                }
                break;
              case 'description':
                if (typeof value === 'string') {
                  iparamSchema.description = value;
                }
                break;
              case 'required':
                if (typeof value === 'boolean') {
                  iparamSchema.required = value;
                }
                break;
              case 'min':
                if (typeof value === 'number') {
                  iparamSchema.min = value;
                }
                break;
              case 'max':
                if (typeof value === 'number') {
                  iparamSchema.max = value;
                }
                break;
              case 'minLength':
                if (typeof value === 'number') {
                  iparamSchema.minLength = value;
                }
                break;
              case 'maxLength':
                if (typeof value === 'number') {
                  iparamSchema.maxLength = value;
                }
                break;
              case 'pattern':
                if (typeof value === 'string') {
                  iparamSchema.pattern = value;
                }
                break;
              case 'enum':
                // Handle enum as array
                if (Array.isArray(value)) {
                  iparamSchema.enum = value;
                }
                break;
            }
          }
        }

        return iparamSchema;
      }
    } catch (error) {
      // Type resolution failed, fall back to basic type inference
    }

    // Fallback type inference based on type name
    if (typeName.toLowerCase().includes('number') || typeName.toLowerCase().includes('int')) {
      schema.type = 'number';
    } else if (typeName.toLowerCase().includes('boolean') || typeName.toLowerCase().includes('bool')) {
      schema.type = 'boolean';
    } else if (typeName.toLowerCase().includes('array')) {
      schema.type = 'array';
    } else if (typeName.toLowerCase().includes('object')) {
      schema.type = 'object';
    }
  }

  // Handle union types (e.g., 'a' | 'b' | 'c')
  if (ts.isUnionTypeNode(typeNode)) {
    const enumValues = extractEnumFromUnion(typeNode, ts);
    if (enumValues) {
      schema.type = 'string';
      schema.enum = enumValues;
      return schema;
    }
  }

  // Handle array types
  if (ts.isArrayTypeNode(typeNode)) {
    schema.type = 'array';
    // Extract the item type
    schema.items = extractParameterSchema(typeNode.elementType, sourceFile, checker, ts);
    return schema;
  }

  // Handle basic TypeScript types
  if (ts.isTypeReferenceNode(typeNode) === false) {
    switch (typeNode.kind) {
      case ts.SyntaxKind.StringKeyword:
        schema.type = 'string';
        break;
      case ts.SyntaxKind.NumberKeyword:
        schema.type = 'number';
        break;
      case ts.SyntaxKind.BooleanKeyword:
        schema.type = 'boolean';
        break;
      case ts.SyntaxKind.ArrayType:
        schema.type = 'array';
        break;
      case ts.SyntaxKind.TypeLiteral:
        schema.type = 'object';
        break;
    }
  }

  return schema;
}

/**
 * Extract IParam metadata from a type literal node
 */
function extractIParamMetadata(
  typeNode: ts.TypeLiteralNode,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  ts: typeof import('typescript')
): ParameterSchema | null {
  let hasTypeField = false;
  const schema: ParameterSchema = { type: 'string' };

  for (const member of typeNode.members) {
    if (ts.isPropertySignature(member) && member.name && member.type) {
      const propName = member.name.getText(sourceFile);
      const value = extractLiteralValue(member.type, ts);

      switch (propName) {
        case 'type':
          hasTypeField = true;
          if (typeof value === 'string') {
            schema.type = value;
          }
          break;
        case 'description':
          if (typeof value === 'string') {
            schema.description = value;
          }
          break;
        case 'required':
          if (typeof value === 'boolean') {
            schema.required = value;
          }
          break;
        case 'min':
          if (typeof value === 'number') {
            schema.min = value;
          }
          break;
        case 'max':
          if (typeof value === 'number') {
            schema.max = value;
          }
          break;
        case 'minLength':
          if (typeof value === 'number') {
            schema.minLength = value;
          }
          break;
        case 'maxLength':
          if (typeof value === 'number') {
            schema.maxLength = value;
          }
          break;
        case 'pattern':
          if (typeof value === 'string') {
            schema.pattern = value;
          }
          break;
      }
    }
  }

  // Only return if this looks like an IParam (has type field)
  return hasTypeField ? schema : null;
}

/**
 * Extract literal value from a type node
 */
function extractLiteralValue(
  typeNode: ts.TypeNode,
  ts: typeof import('typescript')
): string | number | boolean | any[] | undefined {
  if (ts.isLiteralTypeNode(typeNode)) {
    const literal = typeNode.literal;
    if (ts.isStringLiteral(literal)) {
      return literal.text;
    } else if (ts.isNumericLiteral(literal)) {
      return parseFloat(literal.text);
    } else if (literal.kind === ts.SyntaxKind.TrueKeyword) {
      return true;
    } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
      return false;
    }
  }

  return undefined;
}

/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

/**
 * Extract JSDoc description from a property signature
 */
function extractJsDocDescription(
  node: ts.PropertySignature,
  ts: typeof import('typescript')
): string | undefined {
  const jsDocTags = ts.getJSDocTags(node);

  // Check for @description tag
  for (const tag of jsDocTags) {
    if (tag.comment && typeof tag.comment === 'string') {
      return tag.comment;
    }
  }

  // Fall back to general JSDoc comment
  const jsDoc = ts.getJSDocCommentsAndTags(node);
  for (const doc of jsDoc) {
    if (ts.isJSDoc(doc) && doc.comment) {
      if (typeof doc.comment === 'string') {
        return doc.comment;
      }
    }
  }

  return undefined;
}

/**
 * Extract properties from a type literal node (for nested objects)
 */
function extractPropertiesFromTypeLiteral(
  typeNode: ts.TypeLiteralNode,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  ts: typeof import('typescript')
): Record<string, ParameterSchema> {
  const properties: Record<string, ParameterSchema> = {};

  for (const member of typeNode.members) {
    if (ts.isPropertySignature(member) && member.name && member.type) {
      const propName = member.name.getText(sourceFile);
      const propSchema = extractParameterSchema(member.type, sourceFile, checker, ts, member);

      // Check if property is optional
      const isOptional = !!member.questionToken;
      propSchema.required = !isOptional;

      properties[propName] = propSchema;
    }
  }

  return properties;
}

/**
 * Extract enum values from a union type (e.g., 'a' | 'b' | 'c')
 */
function extractEnumFromUnion(
  unionType: ts.UnionTypeNode,
  ts: typeof import('typescript')
): string[] | null {
  const enumValues: string[] = [];

  for (const typeNode of unionType.types) {
    // Only support string literal unions
    if (ts.isLiteralTypeNode(typeNode) && ts.isStringLiteral(typeNode.literal)) {
      enumValues.push(typeNode.literal.text);
    } else {
      // Not a pure string literal union - return null
      return null;
    }
  }

  return enumValues.length > 0 ? enumValues : null;
}
