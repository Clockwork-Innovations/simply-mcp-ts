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
  /** Exclusive minimum value for numbers (value must be greater than this) */
  exclusiveMin?: number;
  /** Exclusive maximum value for numbers (value must be less than this) */
  exclusiveMax?: number;
  /** Enum values for strings */
  enum?: string[];
  /** Additional properties allowed for objects */
  additionalProperties?: boolean;
  /** Required property names for objects */
  requiredProperties?: string[];
}

/**
 * Result of extracting IParam properties from an interface
 */
interface IParamExtractResult {
  tags: ValidationTags;
  baseType: ts.TypeNode;
  typeField: string;
  items?: ts.TypeNode;
  properties?: Record<string, ts.TypeNode>;
  requiredProperties?: string[];
}

/**
 * Check if a type reference extends IParam and extract its properties
 *
 * @param typeNode - The type reference node to check
 * @param sourceFile - The source file containing the type
 * @param checker - Optional TypeChecker for resolving types
 * @returns IParamExtractResult if this extends IParam, null otherwise
 */
function extractIParamProperties(
  typeNode: ts.TypeReferenceNode,
  sourceFile: ts.SourceFile,
  checker?: ts.TypeChecker
): IParamExtractResult | null {
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

  // Check if it extends any IParam variant
  const heritageClauses = declaration.heritageClauses;
  if (!heritageClauses) {
    return null;
  }

  const validIParamTypes = ['IParam'];

  let extendsIParam = false;

  for (const clause of heritageClauses) {
    if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
      for (const type of clause.types) {
        const typeName = type.expression.getText(sourceFile);
        if (validIParamTypes.includes(typeName)) {
          extendsIParam = true;
          break;
        }
      }
    }
  }

  if (!extendsIParam) {
    return null;
  }

  // Extract the 'type' field value to determine base type
  let typeFieldValue: string | null = null;
  let baseTypeNode: ts.TypeNode | null = null;

  for (const member of declaration.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const propertyName = member.name.getText(sourceFile);

      if (propertyName === 'type' && member.type) {
        // Extract the literal type value
        if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (ts.isStringLiteral(literal)) {
            typeFieldValue = literal.text;
          }
        } else if (ts.isUnionTypeNode(member.type)) {
          // Handle union types like 'number' | 'integer'
          // Take the first literal value
          for (const unionMember of member.type.types) {
            if (ts.isLiteralTypeNode(unionMember)) {
              const literal = unionMember.literal;
              if (ts.isStringLiteral(literal)) {
                typeFieldValue = literal.text;
                break;
              }
            }
          }
        }
        break;
      }
    }
  }

  if (!typeFieldValue) {
    // Check if they forgot to add the type field
    const interfaceName = declaration.name.text;
    const hasOtherIParamProperties = declaration.members.some(m => {
      if (ts.isPropertySignature(m) && m.name) {
        const propName = m.name.getText(sourceFile);
        return ['description', 'minLength', 'maxLength', 'min', 'max', 'items', 'properties'].includes(propName);
      }
      return false;
    });

    if (hasOtherIParamProperties) {
      throw new Error(
        `❌ IParam Error in interface '${interfaceName}':\n\n` +
        `Interface extends an IParam type but is missing the required 'type' field.\n\n` +
        `❌ INCORRECT (missing type field):\n` +
        `  interface ${interfaceName} extends IParam {\n` +
        `    description: 'Some description';\n` +
        `    minLength: 1;  // Has constraints but no type field\n` +
        `  }\n\n` +
        `✅ CORRECT (with type field):\n` +
        `  interface ${interfaceName} extends IParam {\n` +
        `    type: 'string';  // ✅ Required type field\n` +
        `    description: 'Some description';\n` +
        `    minLength: 1;\n` +
        `  }\n\n` +
        `💡 Tip: All IParam interfaces must specify a literal 'type' field.\n` +
        `   Valid types: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null'`
      );
    }

    return null;
  }

  // Create base type node based on the type field
  switch (typeFieldValue) {
    case 'string':
      baseTypeNode = ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
      break;
    case 'number':
    case 'integer':
      baseTypeNode = ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
      break;
    case 'boolean':
      baseTypeNode = ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
      break;
    case 'array':
      // For arrays, we need to process the items property separately
      baseTypeNode = ts.factory.createArrayTypeNode(
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
      );
      break;
    case 'object':
      // For objects, we'll return an object literal type node
      baseTypeNode = ts.factory.createTypeLiteralNode([]);
      break;
    case 'null':
      baseTypeNode = ts.factory.createLiteralTypeNode(
        ts.factory.createToken(ts.SyntaxKind.NullKeyword) as any
      );
      break;
    default:
      return null;
  }

  // Extract IParam properties from the interface
  const tags: ValidationTags = {};
  let itemsTypeNode: ts.TypeNode | undefined = undefined;
  let objectProperties: Record<string, ts.TypeNode> = {};
  let requiredPropertiesList: string[] = [];

  for (const member of declaration.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const propertyName = member.name.getText(sourceFile);

      // Skip the type field (already processed)
      if (propertyName === 'type') {
        continue;
      }

      // Handle array items property
      if (propertyName === 'items' && typeFieldValue === 'array') {
        if (member.type) {
          // Check if items is an inline object literal (common mistake)
          if (ts.isTypeLiteralNode(member.type)) {
            const interfaceName = declaration.name.text;
            throw new Error(
              `❌ IParam Error in interface '${interfaceName}':\n\n` +
              `The 'items' property uses an inline object literal, which won't parse correctly.\n\n` +
              `❌ INCORRECT (inline object literal):\n` +
              `  interface ${interfaceName} extends IParam {\n` +
              `    type: 'array';\n` +
              `    items: { type: 'string'; description: '...' };  // ❌ Inline literal\n` +
              `  }\n\n` +
              `✅ CORRECT (separate interface):\n` +
              `  interface ${interfaceName}Item extends IParam {\n` +
              `    type: 'string';\n` +
              `    description: '...';\n` +
              `  }\n\n` +
              `  interface ${interfaceName} extends IParam {\n` +
              `    type: 'array';\n` +
              `    items: ${interfaceName}Item;  // ✅ Reference to interface\n` +
              `  }\n\n` +
              `💡 Tip: Always define nested IParam structures as separate interfaces.`
            );
          }
          itemsTypeNode = member.type;
        }
        continue;
      }

      // Handle object properties property
      if (propertyName === 'properties' && typeFieldValue === 'object') {
        if (member.type && ts.isTypeLiteralNode(member.type)) {
          // Extract each property in the Record<string, IParam>
          for (const prop of member.type.members) {
            if (ts.isPropertySignature(prop) && prop.name && prop.type) {
              const propName = prop.name.getText(sourceFile);

              // Check if property value is an inline object literal (common mistake)
              if (ts.isTypeLiteralNode(prop.type)) {
                const interfaceName = declaration.name.text;
                throw new Error(
                  `❌ IParam Error in interface '${interfaceName}':\n\n` +
                  `Property '${propName}' in 'properties' uses an inline object literal, which won't parse correctly.\n\n` +
                  `❌ INCORRECT (inline object literal):\n` +
                  `  interface ${interfaceName} extends IParam {\n` +
                  `    type: 'object';\n` +
                  `    properties: {\n` +
                  `      ${propName}: { type: 'string'; description: '...' };  // ❌ Inline literal\n` +
                  `    };\n` +
                  `  }\n\n` +
                  `✅ CORRECT (separate interface):\n` +
                  `  interface ${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1)}Param extends IParam {\n` +
                  `    type: 'string';\n` +
                  `    description: '...';\n` +
                  `  }\n\n` +
                  `  interface ${interfaceName} extends IParam {\n` +
                  `    type: 'object';\n` +
                  `    properties: {\n` +
                  `      ${propName}: ${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1)}Param;  // ✅ Reference\n` +
                  `    };\n` +
                  `  }\n\n` +
                  `💡 Tip: Always define nested IParam structures as separate interfaces.`
                );
              }

              objectProperties[propName] = prop.type;
            }
          }
        }
        continue;
      }

      // Handle requiredProperties array (stored as ValidationTag for now)
      if (propertyName === 'requiredProperties' && typeFieldValue === 'object') {
        // Note: This is typically an array literal, which is complex to extract from types
        // We'll handle it in the tags for now
        continue;
      }

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
        case 'exclusiveMin':
          if (typeof value === 'number') {
            tags.exclusiveMin = value;
          }
          break;
        case 'exclusiveMax':
          if (typeof value === 'number') {
            tags.exclusiveMax = value;
          }
          break;
        case 'additionalProperties':
          if (typeof value === 'boolean') {
            tags.additionalProperties = value;
          }
          break;
      }
    }
  }

  // Validate array types have items
  if (typeFieldValue === 'array' && !itemsTypeNode) {
    const interfaceName = declaration.name.text;
    throw new Error(
      `❌ IParam Error in interface '${interfaceName}':\n\n` +
      `Array type is missing the required 'items' property.\n\n` +
      `❌ INCORRECT (missing items):\n` +
      `  interface ${interfaceName} extends IParam {\n` +
      `    type: 'array';\n` +
      `    description: 'Array of items';\n` +
      `    // ❌ Missing items property\n` +
      `  }\n\n` +
      `✅ CORRECT (with items):\n` +
      `  interface ${interfaceName}Item extends IParam {\n` +
      `    type: 'string';\n` +
      `    description: 'Single item';\n` +
      `  }\n\n` +
      `  interface ${interfaceName} extends IParam {\n` +
      `    type: 'array';\n` +
      `    description: 'Array of items';\n` +
      `    items: ${interfaceName}Item;  // ✅ Required for arrays\n` +
      `  }\n\n` +
      `💡 Tip: IParam with type 'array' requires an 'items' property to define the array element schema.`
    );
  }

  // Validate object types have properties
  if (typeFieldValue === 'object' && Object.keys(objectProperties).length === 0) {
    const interfaceName = declaration.name.text;
    throw new Error(
      `❌ IParam Error in interface '${interfaceName}':\n\n` +
      `Object type is missing the required 'properties' field.\n\n` +
      `❌ INCORRECT (missing properties):\n` +
      `  interface ${interfaceName} extends IParam {\n` +
      `    type: 'object';\n` +
      `    description: 'User data';\n` +
      `    // ❌ Missing properties field\n` +
      `  }\n\n` +
      `✅ CORRECT (with properties):\n` +
      `  interface NameParam extends IParam {\n` +
      `    type: 'string';\n` +
      `    description: 'User name';\n` +
      `  }\n\n` +
      `  interface ${interfaceName} extends IParam {\n` +
      `    type: 'object';\n` +
      `    description: 'User data';\n` +
      `    properties: {\n` +
      `      name: NameParam;  // ✅ Define object properties\n` +
      `    };\n` +
      `  }\n\n` +
      `💡 Tip: IParam with type 'object' requires a 'properties' field to define the object schema.`
    );
  }

  return {
    tags,
    baseType: baseTypeNode,
    typeField: typeFieldValue,
    items: itemsTypeNode,
    properties: Object.keys(objectProperties).length > 0 ? objectProperties : undefined,
    requiredProperties: requiredPropertiesList.length > 0 ? requiredPropertiesList : undefined
  };
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

      // Handle structured types (array, object) differently
      if (iparamInfo.typeField === 'array' && iparamInfo.items) {
        // Recursively process array items
        const itemSchema = typeNodeToZodSchema(iparamInfo.items, sourceFile, undefined, checker);
        let arraySchema = z.array(itemSchema);

        // Apply array constraints
        if (mergedTags.minItems !== undefined) {
          arraySchema = arraySchema.min(mergedTags.minItems);
        }
        if (mergedTags.maxItems !== undefined) {
          arraySchema = arraySchema.max(mergedTags.maxItems);
        }

        // Apply description
        let finalSchema: ZodTypeAny = arraySchema;
        if (mergedTags.description) {
          finalSchema = finalSchema.describe(mergedTags.description);
        }

        // Make optional if required: false
        if (mergedTags.required === false) {
          finalSchema = finalSchema.optional();
        }

        return finalSchema;
      }

      if (iparamInfo.typeField === 'object' && iparamInfo.properties) {
        // Recursively process object properties
        const shape: Record<string, ZodTypeAny> = {};

        for (const [propName, propTypeNode] of Object.entries(iparamInfo.properties)) {
          const propSchema = typeNodeToZodSchema(propTypeNode, sourceFile, undefined, checker);
          shape[propName] = propSchema;
        }

        // Create base object schema
        let objectSchema = z.object(shape);

        // Handle additionalProperties
        let finalObjectSchema: ZodTypeAny = objectSchema;
        if (mergedTags.additionalProperties === false) {
          finalObjectSchema = objectSchema.strict();
        } else if (mergedTags.additionalProperties === undefined || mergedTags.additionalProperties === true) {
          // Default to passthrough for compatibility
          finalObjectSchema = objectSchema.passthrough();
        }

        // Apply description
        if (mergedTags.description) {
          finalObjectSchema = finalObjectSchema.describe(mergedTags.description);
        }

        // Make optional if required: false
        if (mergedTags.required === false) {
          finalObjectSchema = finalObjectSchema.optional();
        }

        return finalObjectSchema;
      }

      // For primitive types, recursively process the base type
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
      // Check for enum constraint first
      if (tags.enum && Array.isArray(tags.enum) && tags.enum.length > 0) {
        return z.enum(tags.enum as [string, ...string[]]);
      }

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

      // Apply inclusive min/max
      if (tags.min !== undefined) {
        numberSchema = numberSchema.min(tags.min);
      }
      if (tags.max !== undefined) {
        numberSchema = numberSchema.max(tags.max);
      }

      // Apply exclusive min/max (uses gt/lt in Zod)
      if (tags.exclusiveMin !== undefined) {
        numberSchema = numberSchema.gt(tags.exclusiveMin);
      }
      if (tags.exclusiveMax !== undefined) {
        numberSchema = numberSchema.lt(tags.exclusiveMax);
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
