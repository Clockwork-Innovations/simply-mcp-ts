/**
 * Schema Builder Type Definitions
 *
 * Type definitions for the schema builder system.
 * Provides TypeScript-like schema definitions for parameter validation.
 *
 * @module types/schema
 *
 * @deprecated These types were previously exported from 'src/schema-builder.ts'.
 * Import from 'simply-mcp' or 'simply-mcp/types' instead.
 */

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
