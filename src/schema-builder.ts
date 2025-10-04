/**
 * Schema Builder - Convert TypeScript-like schema definitions to Zod
 *
 * This provides a cleaner, more declarative way to define parameter schemas
 * without directly using Zod syntax in config files.
 */

import { z, ZodSchema, ZodTypeAny } from 'zod';

/**
 * Schema type definitions (TypeScript-like)
 */
export type SchemaType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'date'
  | 'email'
  | 'url'
  | 'uuid'
  | 'enum';

/**
 * Base schema definition
 */
export interface BaseSchema {
  type: SchemaType;
  description?: string;
  optional?: boolean;
  default?: any;
}

/**
 * String schema with validation rules
 */
export interface StringSchema extends BaseSchema {
  type: 'string' | 'email' | 'url' | 'uuid';
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
}

/**
 * Number schema with validation rules
 */
export interface NumberSchema extends BaseSchema {
  type: 'number';
  min?: number;
  max?: number;
  int?: boolean;
}

/**
 * Boolean schema
 */
export interface BooleanSchema extends BaseSchema {
  type: 'boolean';
}

/**
 * Enum schema
 */
export interface EnumSchema extends BaseSchema {
  type: 'enum';
  values: readonly string[];
}

/**
 * Array schema
 */
export interface ArraySchema extends BaseSchema {
  type: 'array';
  items: Schema;
  minItems?: number;
  maxItems?: number;
}

/**
 * Object schema with properties
 */
export interface ObjectSchema extends BaseSchema {
  type: 'object';
  properties: Record<string, Schema>;
  required?: string[];
}

/**
 * Date schema
 */
export interface DateSchema extends BaseSchema {
  type: 'date';
}

/**
 * Union type for all schema types
 */
export type Schema =
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | EnumSchema
  | ArraySchema
  | ObjectSchema
  | DateSchema;

/**
 * Convert a schema definition to a Zod schema
 */
export function schemaToZod(schema: Schema): ZodTypeAny {
  let zodSchema: ZodTypeAny;

  switch (schema.type) {
    case 'string':
      zodSchema = z.string();
      if ((schema as StringSchema).minLength !== undefined) {
        zodSchema = (zodSchema as z.ZodString).min((schema as StringSchema).minLength!);
      }
      if ((schema as StringSchema).maxLength !== undefined) {
        zodSchema = (zodSchema as z.ZodString).max((schema as StringSchema).maxLength!);
      }
      if ((schema as StringSchema).pattern) {
        const pattern = (schema as StringSchema).pattern!;
        zodSchema = (zodSchema as z.ZodString).regex(
          pattern instanceof RegExp ? pattern : new RegExp(pattern)
        );
      }
      break;

    case 'email':
      zodSchema = z.string().email();
      break;

    case 'url':
      zodSchema = z.string().url();
      break;

    case 'uuid':
      zodSchema = z.string().uuid();
      break;

    case 'number':
      zodSchema = z.number();
      if ((schema as NumberSchema).int) {
        zodSchema = (zodSchema as z.ZodNumber).int();
      }
      if ((schema as NumberSchema).min !== undefined) {
        zodSchema = (zodSchema as z.ZodNumber).min((schema as NumberSchema).min!);
      }
      if ((schema as NumberSchema).max !== undefined) {
        zodSchema = (zodSchema as z.ZodNumber).max((schema as NumberSchema).max!);
      }
      break;

    case 'boolean':
      zodSchema = z.boolean();
      break;

    case 'enum':
      const enumValues = (schema as EnumSchema).values as [string, ...string[]];
      zodSchema = z.enum(enumValues);
      break;

    case 'array':
      const arraySchema = schema as ArraySchema;
      const itemSchema = schemaToZod(arraySchema.items);
      zodSchema = z.array(itemSchema);
      if (arraySchema.minItems !== undefined) {
        zodSchema = (zodSchema as z.ZodArray<any>).min(arraySchema.minItems);
      }
      if (arraySchema.maxItems !== undefined) {
        zodSchema = (zodSchema as z.ZodArray<any>).max(arraySchema.maxItems);
      }
      break;

    case 'object':
      const objSchema = schema as ObjectSchema;
      const shape: Record<string, ZodTypeAny> = {};

      for (const [key, propSchema] of Object.entries(objSchema.properties)) {
        shape[key] = schemaToZod(propSchema);
      }

      zodSchema = z.object(shape);
      break;

    case 'date':
      zodSchema = z.date();
      break;

    default:
      throw new Error(`Unsupported schema type: ${(schema as any).type}`);
  }

  // Add description if provided
  if (schema.description) {
    zodSchema = zodSchema.describe(schema.description);
  }

  // Make optional if specified
  if (schema.optional) {
    zodSchema = zodSchema.optional();
  }

  // Add default value if specified
  if (schema.default !== undefined) {
    zodSchema = zodSchema.default(schema.default);
  }

  return zodSchema;
}

/**
 * Helper function to create a schema object from properties
 */
export function createSchema(properties: Record<string, Schema>, required?: string[]): ObjectSchema {
  return {
    type: 'object',
    properties,
    required,
  };
}

/**
 * Shorthand builders for common types
 */
export const Schema = {
  string: (options?: Partial<StringSchema>): StringSchema => ({
    type: 'string',
    ...options,
  }),

  email: (options?: Partial<Omit<StringSchema, 'type'>>): StringSchema => ({
    type: 'email',
    ...options,
  }),

  url: (options?: Partial<Omit<StringSchema, 'type'>>): StringSchema => ({
    type: 'url',
    ...options,
  }),

  uuid: (options?: Partial<Omit<StringSchema, 'type'>>): StringSchema => ({
    type: 'uuid',
    ...options,
  }),

  number: (options?: Partial<NumberSchema>): NumberSchema => ({
    type: 'number',
    ...options,
  }),

  int: (options?: Partial<Omit<NumberSchema, 'int'>>): NumberSchema => ({
    type: 'number',
    int: true,
    ...options,
  }),

  boolean: (options?: Partial<BooleanSchema>): BooleanSchema => ({
    type: 'boolean',
    ...options,
  }),

  enum: (values: readonly string[], options?: Partial<Omit<EnumSchema, 'values'>>): EnumSchema => ({
    type: 'enum',
    values,
    ...options,
  }),

  array: (items: Schema, options?: Partial<Omit<ArraySchema, 'items'>>): ArraySchema => ({
    type: 'array',
    items,
    ...options,
  }),

  object: (properties: Record<string, Schema>, options?: Partial<Omit<ObjectSchema, 'properties'>>): ObjectSchema => ({
    type: 'object',
    properties,
    ...options,
  }),

  date: (options?: Partial<DateSchema>): DateSchema => ({
    type: 'date',
    ...options,
  }),
};
