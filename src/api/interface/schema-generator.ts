/**
 * TypeScript Type to Zod Schema Generator
 *
 * Converts TypeScript type nodes from the AST into Zod validation schemas.
 * Supports JSDoc validation tags (@min, @max, @minLength, @maxLength, @pattern, @format, etc.)
 */

import ts from 'typescript';
import { z, ZodTypeAny } from 'zod';

/**
 * JSDoc validation tags that can be applied to parameters
 */
export interface ValidationTags {
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
  validationTags?: ValidationTags
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
        const baseSchema = typeNodeToZodSchema(nonUndefinedType, sourceFile, tags);
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
    const schemas = typeNode.types.map(t => typeNodeToZodSchema(t, sourceFile, tags));
    return z.union(schemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
  }

  // Handle array types
  if (ts.isArrayTypeNode(typeNode)) {
    const elementSchema = typeNodeToZodSchema(typeNode.elementType, sourceFile);
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
    return typeLiteralToZodSchema(typeNode, sourceFile);
  }

  // Handle type references (like Date, Array<string>, etc.)
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName.getText(sourceFile);

    if (typeName === 'Date') {
      return z.date();
    }

    if (typeName === 'Array') {
      const typeArgs = typeNode.typeArguments;
      if (typeArgs && typeArgs.length > 0) {
        const elementSchema = typeNodeToZodSchema(typeArgs[0], sourceFile);
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
  sourceFile: ts.SourceFile
): z.ZodObject<any> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const member of typeLiteral.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const propertyName = member.name.getText(sourceFile);
      const isOptional = !!member.questionToken;

      if (member.type) {
        // Extract validation tags from JSDoc
        const tags = extractValidationTags(member, sourceFile);

        let propertySchema = typeNodeToZodSchema(member.type, sourceFile, tags);

        // Make optional if it has a question token
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
