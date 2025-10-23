/**
 * TypeScript Type to Zod Schema Generator
 *
 * Converts TypeScript type nodes from the AST into Zod validation schemas.
 * Supports JSDoc validation tags (@min, @max, @minLength, @maxLength, @pattern, @format, etc.)
 */

import * as ts from 'typescript';
import { z, ZodTypeAny } from 'zod';

/**
 * JSDoc validation tags that can be applied to parameters
 */
export interface ValidationTags {
  /** Description of the parameter (from IParam or JSDoc) */
  description?: string;
  /** Whether the parameter is required (from IParam) */
  required?: boolean;
  /** Minimum value for numbers */
  min?: number;
  /** Maximum value for numbers */
  max?: number;
  /** Minimum length for strings/arrays */
  minLength?: number;
  /** Maximum length for strings/arrays */
  maxLength?: number;
  /** Regex pattern for string validation */
  pattern?: string;
  /** String format (email, url, uuid, etc.) */
  format?: 'email' | 'url' | 'uuid';
  /** Force integer validation for numbers */
  int?: boolean;
  /** Minimum items for arrays */
  minItems?: number;
  /** Maximum items for arrays */
  maxItems?: number;
  /** Multiple of value for numbers */
  multipleOf?: number;
  /** Unique items for arrays */
  uniqueItems?: boolean;
}

/**
 * Check if a type reference extends IParam and extract its properties
 *
 * @param typeNode - The type reference node to check
 * @param sourceFile - The source file containing the type
 * @param checker - Optional TypeChecker for resolving types
 * @returns ValidationTags if this extends IParam, null otherwise
 */
function extractIParamProperties(
  typeNode: ts.TypeReferenceNode,
  sourceFile: ts.SourceFile,
  checker?: ts.TypeChecker
): { tags: ValidationTags; baseType: ts.TypeNode } | null {
  if (!checker) {
    return null;
  }

  const type = checker.getTypeAtLocation(typeNode);
  const symbol = type.getSymbol();

  if (!symbol) {
    return null;
  }

  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) {
    return null;
  }

  const declaration = declarations[0];

  // Check if this is an interface declaration
  if (!ts.isInterfaceDeclaration(declaration)) {
    return null;
  }

  // Check if it has members
  if (!declaration.members || declaration.members.length === 0) {
    return null;
  }

  // Check if it extends IParam
  const heritageClauses = declaration.heritageClauses;
  if (!heritageClauses) {
    return null;
  }

  let extendsIParam = false;
  let baseTypeNode: ts.TypeNode | null = null;

  for (const clause of heritageClauses) {
    if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
      for (const type of clause.types) {
        const typeName = type.expression.getText(sourceFile);
        if (typeName === 'IParam') {
          extendsIParam = true;
          // Extract the generic type argument (e.g., <string> from IParam<string>)
          if (type.typeArguments && type.typeArguments.length > 0) {
            baseTypeNode = type.typeArguments[0];
          }
          break;
        }
      }
    }
  }

  if (!extendsIParam || !baseTypeNode) {
    return null;
  }

  // Extract IParam properties from the interface
  const tags: ValidationTags = {};

  for (const member of declaration.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const propertyName = member.name.getText(sourceFile);

      // Extract the literal value if present
      const propertyType = member.type;
      let value: any = undefined;

      if (propertyType) {
        if (ts.isLiteralTypeNode(propertyType)) {
          const literal = propertyType.literal;
          if (ts.isStringLiteral(literal)) {
            value = literal.text;
          } else if (ts.isNumericLiteral(literal)) {
            value = parseFloat(literal.text);
          } else if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            value = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            value = false;
          }
        } else if (propertyType.kind === ts.SyntaxKind.NumberKeyword) {
          // For number properties without literal value, skip
          continue;
        } else if (propertyType.kind === ts.SyntaxKind.StringKeyword) {
          // For string properties without literal value, skip
          continue;
        } else if (propertyType.kind === ts.SyntaxKind.BooleanKeyword) {
          // For boolean properties without literal value, skip
          continue;
        }
      }

      // Map IParam properties to ValidationTags
      switch (propertyName) {
        case 'description':
          if (typeof value === 'string') {
            tags.description = value;
          }
          break;
        case 'required':
          if (typeof value === 'boolean') {
            tags.required = value;
          }
          break;
        case 'min':
          if (typeof value === 'number') {
            tags.min = value;
          }
          break;
        case 'max':
          if (typeof value === 'number') {
            tags.max = value;
          }
          break;
        case 'minLength':
          if (typeof value === 'number') {
            tags.minLength = value;
          }
          break;
        case 'maxLength':
          if (typeof value === 'number') {
            tags.maxLength = value;
          }
          break;
        case 'minItems':
          if (typeof value === 'number') {
            tags.minItems = value;
          }
          break;
        case 'maxItems':
          if (typeof value === 'number') {
            tags.maxItems = value;
          }
          break;
        case 'pattern':
          if (typeof value === 'string') {
            tags.pattern = value;
          }
          break;
        case 'format':
          if (typeof value === 'string' && (value === 'email' || value === 'url' || value === 'uuid')) {
            tags.format = value as 'email' | 'url' | 'uuid';
          }
          break;
        case 'int':
          if (typeof value === 'boolean') {
            tags.int = value;
          }
          break;
        case 'multipleOf':
          if (typeof value === 'number') {
            tags.multipleOf = value;
          }
          break;
        case 'uniqueItems':
          if (typeof value === 'boolean') {
            tags.uniqueItems = value;
          }
          break;
      }
    }
  }

  return { tags, baseType: baseTypeNode };
}

/**
 * Extract JSDoc validation tags from a TypeScript node
 */
export function extractValidationTags(node: ts.Node, sourceFile: ts.SourceFile): ValidationTags {
  const tags: ValidationTags = {};
  const jsDocTags = ts.getJSDocTags(node);

  for (const tag of jsDocTags) {
    const tagName = tag.tagName.text;
    const comment = tag.comment;
    const value = typeof comment === 'string' ? comment.trim() : '';

    switch (tagName) {
      case 'min':
        tags.min = parseFloat(value);
        break;
      case 'max':
        tags.max = parseFloat(value);
        break;
      case 'minLength':
        tags.minLength = parseInt(value, 10);
        break;
      case 'maxLength':
        tags.maxLength = parseInt(value, 10);
        break;
      case 'minItems':
        tags.minItems = parseInt(value, 10);
        break;
      case 'maxItems':
        tags.maxItems = parseInt(value, 10);
        break;
      case 'pattern':
        tags.pattern = value;
        break;
      case 'format':
        if (value === 'email' || value === 'url' || value === 'uuid') {
          tags.format = value;
        }
        break;
      case 'int':
        tags.int = true;
        break;
    }
  }

  return tags;
}

/**
 * Convert a TypeScript type node to a Zod schema
 */
export function typeNodeToZodSchema(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile,
  validationTags?: ValidationTags,
  checker?: ts.TypeChecker
): ZodTypeAny {
  const tags = validationTags || {};

  // Handle union types with undefined (optional types like `string | undefined`)
  if (ts.isUnionTypeNode(typeNode)) {
    // Check if it's an optional type (Type | undefined)
    const hasUndefined = typeNode.types.some(
      t => t.kind === ts.SyntaxKind.UndefinedKeyword
    );

    if (hasUndefined && typeNode.types.length === 2) {
      // It's an optional type - process the non-undefined type
      const nonUndefinedType = typeNode.types.find(
        t => t.kind !== ts.SyntaxKind.UndefinedKeyword
      );
      if (nonUndefinedType) {
        const baseSchema = typeNodeToZodSchema(nonUndefinedType, sourceFile, tags, checker);
        return baseSchema.optional();
      }
    }

    // Handle union of literal types (enums)
    if (typeNode.types.every(t => ts.isLiteralTypeNode(t))) {
      const values = typeNode.types
        .filter(ts.isLiteralTypeNode)
        .map(t => {
          const literal = t.literal;
          if (ts.isStringLiteral(literal)) {
            return literal.text;
          }
          return null;
        })
        .filter((v): v is string => v !== null);

      if (values.length > 0) {
        return z.enum(values as [string, ...string[]]);
      }
    }

    // For other unions, use z.union()
    const schemas = typeNode.types.map(t => typeNodeToZodSchema(t, sourceFile, tags, checker));
    return z.union(schemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
  }

  // Handle array types
  if (ts.isArrayTypeNode(typeNode)) {
    const elementSchema = typeNodeToZodSchema(typeNode.elementType, sourceFile, undefined, checker);
    let arraySchema = z.array(elementSchema);

    if (tags.minItems !== undefined) {
      arraySchema = arraySchema.min(tags.minItems);
    }
    if (tags.maxItems !== undefined) {
      arraySchema = arraySchema.max(tags.maxItems);
    }

    return arraySchema;
  }

  // Handle type literals (object types like { name: string; age: number })
  if (ts.isTypeLiteralNode(typeNode)) {
    return typeLiteralToZodSchema(typeNode, sourceFile, checker);
  }

  // Handle type references (like Date, Array<string>, IParam interfaces, etc.)
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName.getText(sourceFile);

    if (typeName === 'Date') {
      return z.date();
    }

    if (typeName === 'Array') {
      const typeArgs = typeNode.typeArguments;
      if (typeArgs && typeArgs.length > 0) {
        const elementSchema = typeNodeToZodSchema(typeArgs[0], sourceFile, undefined, checker);
        let arraySchema = z.array(elementSchema);

        if (tags.minItems !== undefined) {
          arraySchema = arraySchema.min(tags.minItems);
        }
        if (tags.maxItems !== undefined) {
          arraySchema = arraySchema.max(tags.maxItems);
        }

        return arraySchema;
      }
      return z.array(z.any());
    }

    // Check if this type extends IParam
    const iparamInfo = extractIParamProperties(typeNode, sourceFile, checker);
    if (iparamInfo) {
      // Merge IParam tags with existing tags (IParam takes precedence)
      const mergedTags = { ...tags, ...iparamInfo.tags };

      // Recursively process the base type with IParam constraints
      let baseSchema = typeNodeToZodSchema(iparamInfo.baseType, sourceFile, mergedTags, checker);

      // Apply description if present
      if (mergedTags.description) {
        baseSchema = baseSchema.describe(mergedTags.description);
      }

      // Make optional if required: false
      if (mergedTags.required === false) {
        baseSchema = baseSchema.optional();
      }

      return baseSchema;
    }

    // Default: treat as object
    return z.object({}).passthrough();
  }

  // Handle primitive types
  switch (typeNode.kind) {
    case ts.SyntaxKind.StringKeyword: {
      let stringSchema = z.string();

      // Apply format validations first
      if (tags.format === 'email') {
        stringSchema = stringSchema.email() as z.ZodString;
      } else if (tags.format === 'url') {
        stringSchema = stringSchema.url() as z.ZodString;
      } else if (tags.format === 'uuid') {
        stringSchema = stringSchema.uuid() as z.ZodString;
      }

      // Apply length validations
      if (tags.minLength !== undefined) {
        stringSchema = stringSchema.min(tags.minLength);
      }
      if (tags.maxLength !== undefined) {
        stringSchema = stringSchema.max(tags.maxLength);
      }

      // Apply pattern validation
      if (tags.pattern) {
        stringSchema = stringSchema.regex(new RegExp(tags.pattern));
      }

      return stringSchema;
    }

    case ts.SyntaxKind.NumberKeyword: {
      let numberSchema = z.number();

      if (tags.int) {
        numberSchema = numberSchema.int();
      }
      if (tags.min !== undefined) {
        numberSchema = numberSchema.min(tags.min);
      }
      if (tags.max !== undefined) {
        numberSchema = numberSchema.max(tags.max);
      }
      if (tags.multipleOf !== undefined) {
        numberSchema = numberSchema.multipleOf(tags.multipleOf);
      }

      return numberSchema;
    }

    case ts.SyntaxKind.BooleanKeyword:
      return z.boolean();

    case ts.SyntaxKind.AnyKeyword:
      return z.any();

    case ts.SyntaxKind.UnknownKeyword:
      return z.unknown();

    case ts.SyntaxKind.VoidKeyword:
    case ts.SyntaxKind.UndefinedKeyword:
      return z.undefined();

    case ts.SyntaxKind.NullKeyword:
      return z.null();

    default:
      // Fallback to any for unsupported types
      console.warn(`Unsupported TypeScript type: ${ts.SyntaxKind[typeNode.kind]}`);
      return z.any();
  }
}

/**
 * Convert a TypeScript type literal to a Zod object schema
 */
function typeLiteralToZodSchema(
  typeLiteral: ts.TypeLiteralNode,
  sourceFile: ts.SourceFile,
  checker?: ts.TypeChecker
): z.ZodObject<any> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const member of typeLiteral.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const propertyName = member.name.getText(sourceFile);
      const isOptional = !!member.questionToken;

      if (member.type) {
        // Extract validation tags from JSDoc
        const tags = extractValidationTags(member, sourceFile);

        let propertySchema = typeNodeToZodSchema(member.type, sourceFile, tags, checker);

        // Make optional if it has a question token (TypeScript optional syntax: field?: type)
        // Note: IParam's required: false is handled within typeNodeToZodSchema
        if (isOptional && !propertySchema._def.typeName?.includes('Optional')) {
          propertySchema = propertySchema.optional();
        }

        shape[propertyName] = propertySchema;
      }
    }
  }

  return z.object(shape);
}

/**
 * Generate Zod schema from a params type string representation
 * This is a helper for when we only have the string representation
 */
export function generateSchemaFromTypeString(
  typeString: string,
  paramsNode?: ts.TypeNode,
  sourceFile?: ts.SourceFile
): ZodTypeAny {
  // If we have the actual TypeNode, use it
  if (paramsNode && sourceFile) {
    return typeNodeToZodSchema(paramsNode, sourceFile);
  }

  // Fallback: basic parsing from string (less accurate but works)
  if (typeString === 'any' || typeString === '{}') {
    return z.object({}).passthrough();
  }

  // For simple object types like "{ name: string }"
  if (typeString.includes('{')) {
    // This is a simplified fallback - the AST version is much better
    return z.object({}).passthrough();
  }

  // Default to any
  return z.any();
}
