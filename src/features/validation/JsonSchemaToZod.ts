/**
 * JsonSchemaToZod.ts
 * Converts JSON Schema 7 to Zod schemas for runtime validation
 *
 * Usage:
 * ```typescript
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string', minLength: 1 },
 *     age: { type: 'number', minimum: 0, maximum: 120 }
 *   },
 *   required: ['name']
 * };
 * const zodSchema = jsonSchemaToZod(schema);
 * const result = zodSchema.parse({ name: 'John', age: 30 });
 * ```
 */

import { z, ZodTypeAny } from 'zod';

/**
 * Supported JSON Schema types
 */
type JsonSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'null'
  | 'object'
  | 'array';

/**
 * JSON Schema definition interface
 */
export interface JsonSchemaDefinition {
  type?: JsonSchemaType | JsonSchemaType[];
  properties?: Record<string, JsonSchemaDefinition>;
  items?: JsonSchemaDefinition;
  required?: string[];
  enum?: any[];

  // Number constraints
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;

  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;

  // Array constraints
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // Object constraints
  minProperties?: number;
  maxProperties?: number;
  additionalProperties?: boolean | JsonSchemaDefinition;

  // Advanced validation
  const?: any;
  oneOf?: JsonSchemaDefinition[];
  anyOf?: JsonSchemaDefinition[];
  allOf?: JsonSchemaDefinition[];
  not?: JsonSchemaDefinition;

  description?: string;
  default?: any;
}

/**
 * Conversion options
 */
export interface ConversionOptions {
  /** Allow unknown properties in objects (default: true) */
  allowUnknown?: boolean;
  /** Default error messages */
  errorMessages?: {
    required?: string;
    invalid_type?: string;
  };
}

/**
 * Cache for converted schemas to improve performance
 */
const schemaCache = new Map<string, ZodTypeAny>();

/**
 * Generate a cache key from a JSON Schema
 */
function getCacheKey(schema: JsonSchemaDefinition): string {
  return JSON.stringify(schema);
}

/**
 * Convert JSON Schema to Zod schema
 * @param schema - JSON Schema definition
 * @param options - Conversion options
 * @returns Zod schema
 */
export function jsonSchemaToZod(
  schema: JsonSchemaDefinition,
  options: ConversionOptions = {}
): ZodTypeAny {
  const cacheKey = getCacheKey(schema);
  const cached = schemaCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const zodSchema = convertSchema(schema, options);
  schemaCache.set(cacheKey, zodSchema);
  return zodSchema;
}

/**
 * Internal conversion function
 */
function convertSchema(
  schema: JsonSchemaDefinition,
  options: ConversionOptions
): ZodTypeAny {
  // Handle const (exact value match)
  if (schema.const !== undefined) {
    return z.literal(schema.const);
  }

  // Handle oneOf (exactly one schema must match)
  if (schema.oneOf && schema.oneOf.length > 0) {
    const schemas = schema.oneOf.map(s => convertSchema(s, options));
    return z.union(schemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
  }

  // Handle anyOf (at least one schema must match)
  if (schema.anyOf && schema.anyOf.length > 0) {
    const schemas = schema.anyOf.map(s => convertSchema(s, options));
    return z.union(schemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
  }

  // Handle allOf (all schemas must match - intersection)
  if (schema.allOf && schema.allOf.length > 0) {
    let result = convertSchema(schema.allOf[0], options);
    for (let i = 1; i < schema.allOf.length; i++) {
      result = result.and(convertSchema(schema.allOf[i], options));
    }
    return result;
  }

  // Handle union types (type can be an array)
  if (Array.isArray(schema.type)) {
    const schemas = schema.type.map(type =>
      convertSchema({ ...schema, type }, options)
    );
    return z.union(schemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
  }

  const type = schema.type;

  switch (type) {
    case 'string':
      return convertString(schema);
    case 'number':
    case 'integer':
      return convertNumber(schema, type === 'integer');
    case 'boolean':
      return z.boolean();
    case 'null':
      return z.null();
    case 'object':
      return convertObject(schema, options);
    case 'array':
      return convertArray(schema, options);
    default:
      // If no type is specified, accept any value
      return z.any();
  }
}

/**
 * Convert string schema
 */
function convertString(schema: JsonSchemaDefinition): ZodTypeAny {
  let zodSchema: z.ZodString = z.string();

  // Handle enum
  if (schema.enum) {
    const enumValues = schema.enum.filter(v => typeof v === 'string');
    if (enumValues.length > 0) {
      return z.enum(enumValues as [string, ...string[]]);
    }
  }

  // Min/max length
  if (typeof schema.minLength === 'number') {
    zodSchema = zodSchema.min(schema.minLength, {
      message: `String must be at least ${schema.minLength} characters`,
    });
  }
  if (typeof schema.maxLength === 'number') {
    zodSchema = zodSchema.max(schema.maxLength, {
      message: `String must be at most ${schema.maxLength} characters`,
    });
  }

  // Pattern (regex)
  if (schema.pattern) {
    try {
      const regex = new RegExp(schema.pattern);
      zodSchema = zodSchema.regex(regex, {
        message: `String must match pattern: ${schema.pattern}`,
      });
    } catch (error) {
      console.warn(`Invalid regex pattern: ${schema.pattern}`, error);
    }
  }

  // Format validations
  if (schema.format) {
    zodSchema = applyStringFormat(zodSchema, schema.format);
  }

  return zodSchema;
}

/**
 * Apply format validation to string schema
 */
function applyStringFormat(zodSchema: z.ZodString, format: string): z.ZodString {
  switch (format) {
    case 'email':
      return zodSchema.email({ message: 'Invalid email format' });
    case 'uri':
    case 'url':
      return zodSchema.url({ message: 'Invalid URL format' });
    case 'uuid':
      return zodSchema.uuid({ message: 'Invalid UUID format' });
    case 'date-time':
      return zodSchema.datetime({ message: 'Invalid datetime format' });
    case 'date':
      return zodSchema.regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'Invalid date format (expected YYYY-MM-DD)',
      });
    case 'time':
      return zodSchema.regex(/^\d{2}:\d{2}:\d{2}$/, {
        message: 'Invalid time format (expected HH:MM:SS)',
      });
    default:
      // Unknown format, no additional validation
      return zodSchema;
  }
}

/**
 * Convert number schema
 */
function convertNumber(schema: JsonSchemaDefinition, isInteger: boolean): ZodTypeAny {
  let zodSchema: z.ZodNumber = isInteger ? z.number().int() : z.number();

  // Handle enum
  if (schema.enum) {
    const enumValues = schema.enum.filter(v => typeof v === 'number');
    if (enumValues.length > 0) {
      const literals = enumValues.map(v => z.literal(v));
      if (literals.length === 1) {
        return literals[0];
      }
      return z.union(literals as unknown as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
    }
  }

  // Min/max (inclusive)
  if (typeof schema.minimum === 'number') {
    zodSchema = zodSchema.min(schema.minimum, {
      message: `Number must be at least ${schema.minimum}`,
    });
  }
  if (typeof schema.maximum === 'number') {
    zodSchema = zodSchema.max(schema.maximum, {
      message: `Number must be at most ${schema.maximum}`,
    });
  }

  // Exclusive min/max
  if (typeof schema.exclusiveMinimum === 'number') {
    zodSchema = zodSchema.gt(schema.exclusiveMinimum, {
      message: `Number must be greater than ${schema.exclusiveMinimum}`,
    });
  }
  if (typeof schema.exclusiveMaximum === 'number') {
    zodSchema = zodSchema.lt(schema.exclusiveMaximum, {
      message: `Number must be less than ${schema.exclusiveMaximum}`,
    });
  }

  // Multiple of
  if (typeof schema.multipleOf === 'number') {
    zodSchema = zodSchema.multipleOf(schema.multipleOf, {
      message: `Number must be a multiple of ${schema.multipleOf}`,
    });
  }

  return zodSchema;
}

/**
 * Convert object schema
 */
function convertObject(
  schema: JsonSchemaDefinition,
  options: ConversionOptions
): ZodTypeAny {
  const properties = schema.properties || {};
  const required = new Set(schema.required || []);
  const allowUnknown = options.allowUnknown !== false;

  const zodProperties: Record<string, ZodTypeAny> = {};

  // Convert each property
  for (const [key, propSchema] of Object.entries(properties)) {
    let propZodSchema = convertSchema(propSchema, options);

    // Make optional if not in required array
    if (!required.has(key)) {
      propZodSchema = propZodSchema.optional();
    }

    zodProperties[key] = propZodSchema;
  }

  const baseSchema = z.object(zodProperties);

  // Handle additional properties and return appropriate type
  if (allowUnknown && schema.additionalProperties !== false) {
    return baseSchema.passthrough();
  } else if (schema.additionalProperties === false) {
    return baseSchema.strict();
  }

  return baseSchema;
}

/**
 * Convert array schema
 */
function convertArray(
  schema: JsonSchemaDefinition,
  options: ConversionOptions
): ZodTypeAny {
  if (!schema.items) {
    // Array with no items schema accepts any array
    return z.array(z.any());
  }

  const itemSchema = convertSchema(schema.items, options);
  let arraySchema = z.array(itemSchema);

  // Min/max items
  if (typeof schema.minItems === 'number') {
    arraySchema = arraySchema.min(schema.minItems, {
      message: `Array must contain at least ${schema.minItems} items`,
    });
  }
  if (typeof schema.maxItems === 'number') {
    arraySchema = arraySchema.max(schema.maxItems, {
      message: `Array must contain at most ${schema.maxItems} items`,
    });
  }

  // Unique items
  if (schema.uniqueItems === true) {
    return arraySchema.refine(
      (arr: any[]) => new Set(arr.map((item) => JSON.stringify(item))).size === arr.length,
      {
        message: 'Array items must be unique',
      }
    ) as ZodTypeAny;
  }

  return arraySchema as ZodTypeAny;
}

/**
 * Clear the schema cache (useful for testing)
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number } {
  return {
    size: schemaCache.size,
  };
}

// Example usage and tests (in comments)
/*
// Test 1: Simple object with required fields
const schema1 = {
  type: 'object' as const,
  properties: {
    name: { type: 'string' as const, minLength: 1 },
    age: { type: 'number' as const, minimum: 0, maximum: 120 }
  },
  required: ['name']
};
const zodSchema1 = jsonSchemaToZod(schema1);
console.log(zodSchema1.parse({ name: 'John', age: 30 })); // ✓
// console.log(zodSchema1.parse({ age: 30 })); // ✗ Missing name

// Test 2: String with pattern
const schema2 = {
  type: 'object' as const,
  properties: {
    username: {
      type: 'string' as const,
      pattern: '^[a-zA-Z0-9_]+$',
      minLength: 3,
      maxLength: 20
    }
  }
};
const zodSchema2 = jsonSchemaToZod(schema2);
console.log(zodSchema2.parse({ username: 'john_doe123' })); // ✓
// console.log(zodSchema2.parse({ username: 'john@doe' })); // ✗ Pattern mismatch

// Test 3: Enum
const schema3 = {
  type: 'object' as const,
  properties: {
    role: { type: 'string' as const, enum: ['admin', 'user', 'guest'] }
  }
};
const zodSchema3 = jsonSchemaToZod(schema3);
console.log(zodSchema3.parse({ role: 'admin' })); // ✓
// console.log(zodSchema3.parse({ role: 'superadmin' })); // ✗ Not in enum

// Test 4: Nested objects
const schema4 = {
  type: 'object' as const,
  properties: {
    user: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        email: { type: 'string' as const, format: 'email' }
      },
      required: ['name']
    }
  }
};
const zodSchema4 = jsonSchemaToZod(schema4);
console.log(zodSchema4.parse({
  user: { name: 'John', email: 'john@example.com' }
})); // ✓

// Test 5: Array
const schema5 = {
  type: 'object' as const,
  properties: {
    tags: {
      type: 'array' as const,
      items: { type: 'string' as const, minLength: 1 }
    }
  }
};
const zodSchema5 = jsonSchemaToZod(schema5);
console.log(zodSchema5.parse({ tags: ['tag1', 'tag2'] })); // ✓
// console.log(zodSchema5.parse({ tags: ['tag1', ''] })); // ✗ Empty string

// Test 6: Union types
const schema6 = {
  type: 'object' as const,
  properties: {
    value: {
      type: ['string', 'number'] as const[]
    }
  }
};
const zodSchema6 = jsonSchemaToZod(schema6);
console.log(zodSchema6.parse({ value: 'hello' })); // ✓
console.log(zodSchema6.parse({ value: 42 })); // ✓
// console.log(zodSchema6.parse({ value: true })); // ✗ Not string or number
*/