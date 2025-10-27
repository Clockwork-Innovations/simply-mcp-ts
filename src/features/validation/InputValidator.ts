/**
 * InputValidator.ts
 * Comprehensive validation system using Zod schemas converted from JSON Schema
 *
 * Usage:
 * ```typescript
 * const validator = new InputValidator();
 * const result = validator.validateToolArguments(args, schema);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */

import { ZodError, ZodTypeAny } from 'zod';
import { jsonSchemaToZod, JsonSchemaDefinition } from './JsonSchemaToZod.js';
import { SchemaValidationError, ValidationError, ValidationErrorDetail } from './ValidationError.js';

/**
 * Validation result
 */
export interface ValidationResult<T = any> {
  /** Whether validation succeeded */
  valid: boolean;
  /** Validated and typed data (only if valid) */
  data?: T;
  /** Validation errors (only if invalid) */
  errors?: ValidationErrorDetail[];
  /** Original error (for debugging) */
  error?: Error;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Allow unknown properties in objects (default: true) */
  allowUnknown?: boolean;
  /** Coerce types when possible (default: false) */
  coerce?: boolean;
  /** Strip unknown properties (default: false, only valid if allowUnknown is false) */
  stripUnknown?: boolean;
  /** Custom error messages */
  errorMessages?: {
    required?: string;
    invalid_type?: string;
  };
}

/**
 * Input validator class
 */
export class InputValidator {
  private schemaCache: Map<string, ZodTypeAny>;
  private options: ValidationOptions;

  constructor(options: ValidationOptions = {}) {
    this.schemaCache = new Map();
    this.options = {
      allowUnknown: options.allowUnknown !== false,
      coerce: options.coerce ?? false,
      stripUnknown: options.stripUnknown ?? false,
      errorMessages: options.errorMessages,
    };
  }

  /**
   * Validate tool arguments against a JSON Schema
   */
  validateToolArguments<T = any>(
    args: unknown,
    schema: JsonSchemaDefinition,
    options?: ValidationOptions
  ): ValidationResult<T> {
    const validationOptions = { ...this.options, ...options };

    try {
      // Convert JSON Schema to Zod
      const zodSchema = this.getZodSchema(schema, validationOptions);

      // Validate the arguments
      const validatedData = zodSchema.parse(args);

      return {
        valid: true,
        data: validatedData as T,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const schemaError = new SchemaValidationError(error, 'tool arguments');
        return {
          valid: false,
          errors: schemaError.details,
          error: schemaError,
        };
      }

      // Unexpected error
      return {
        valid: false,
        errors: [{
          field: 'root',
          message: error instanceof Error ? error.message : 'Unknown validation error',
        }],
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Validate a single field
   */
  validateField<T = any>(
    value: unknown,
    schema: JsonSchemaDefinition,
    fieldName?: string
  ): ValidationResult<T> {
    try {
      const zodSchema = this.getZodSchema(schema, this.options);
      const validatedData = zodSchema.parse(value);

      return {
        valid: true,
        data: validatedData as T,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const schemaError = new SchemaValidationError(error, fieldName);
        return {
          valid: false,
          errors: schemaError.details,
          error: schemaError,
        };
      }

      return {
        valid: false,
        errors: [{
          field: fieldName || 'root',
          message: error instanceof Error ? error.message : 'Unknown validation error',
        }],
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Safe parse that returns a result instead of throwing
   */
  safeParse<T = any>(
    value: unknown,
    schema: JsonSchemaDefinition
  ): ValidationResult<T> {
    return this.validateToolArguments<T>(value, schema);
  }

  /**
   * Parse and throw on error
   */
  parse<T = any>(
    value: unknown,
    schema: JsonSchemaDefinition
  ): T {
    const result = this.validateToolArguments<T>(value, schema);
    if (!result.valid) {
      throw result.error || new ValidationError('Validation failed', undefined, undefined, undefined, result.errors);
    }
    return result.data as T;
  }

  /**
   * Validate multiple fields
   */
  validateFields(
    values: Record<string, unknown>,
    schemas: Record<string, JsonSchemaDefinition>
  ): { valid: boolean; errors: Record<string, ValidationErrorDetail[]>; data: Record<string, any> } {
    const errors: Record<string, ValidationErrorDetail[]> = {};
    const data: Record<string, any> = {};
    let hasErrors = false;

    for (const [field, value] of Object.entries(values)) {
      const schema = schemas[field];
      if (!schema) {
        // No schema for this field, skip validation
        data[field] = value;
        continue;
      }

      const result = this.validateField(value, schema, field);
      if (result.valid) {
        data[field] = result.data;
      } else {
        errors[field] = result.errors || [];
        hasErrors = true;
      }
    }

    return {
      valid: !hasErrors,
      errors,
      data,
    };
  }

  /**
   * Get or create a Zod schema from JSON Schema
   */
  private getZodSchema(
    schema: JsonSchemaDefinition,
    options: ValidationOptions
  ): ZodTypeAny {
    const cacheKey = this.getSchemaCacheKey(schema, options);

    let zodSchema = this.schemaCache.get(cacheKey);
    if (!zodSchema) {
      zodSchema = jsonSchemaToZod(schema, {
        allowUnknown: options.allowUnknown,
        errorMessages: options.errorMessages,
      });
      this.schemaCache.set(cacheKey, zodSchema);
    }

    return zodSchema;
  }

  /**
   * Generate a cache key for a schema
   */
  private getSchemaCacheKey(
    schema: JsonSchemaDefinition,
    options: ValidationOptions
  ): string {
    return JSON.stringify({ schema, options });
  }

  /**
   * Clear the schema cache
   */
  clearCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number } {
    return {
      size: this.schemaCache.size,
    };
  }

  /**
   * Update default options
   */
  updateOptions(options: Partial<ValidationOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

// Export a default instance for convenience
export const defaultValidator = new InputValidator();

// Export convenience functions
export function validateToolArguments<T = any>(
  args: unknown,
  schema: JsonSchemaDefinition,
  options?: ValidationOptions
): ValidationResult<T> {
  return defaultValidator.validateToolArguments<T>(args, schema, options);
}

export function validateField<T = any>(
  value: unknown,
  schema: JsonSchemaDefinition,
  fieldName?: string
): ValidationResult<T> {
  return defaultValidator.validateField<T>(value, schema, fieldName);
}

export function safeParse<T = any>(
  value: unknown,
  schema: JsonSchemaDefinition
): ValidationResult<T> {
  return defaultValidator.safeParse<T>(value, schema);
}

export function parse<T = any>(
  value: unknown,
  schema: JsonSchemaDefinition
): T {
  return defaultValidator.parse<T>(value, schema);
}

// Example usage and tests (in comments)
/*
// Test 1: Valid tool arguments
const schema1 = {
  type: 'object' as const,
  properties: {
    name: { type: 'string' as const, minLength: 1 },
    age: { type: 'number' as const, minimum: 0, maximum: 120 }
  },
  required: ['name']
};

const validator = new InputValidator();
const result1 = validator.validateToolArguments(
  { name: 'John', age: 30 },
  schema1
);
console.log(result1.valid); // true
console.log(result1.data); // { name: 'John', age: 30 }

// Test 2: Invalid arguments (missing required field)
const result2 = validator.validateToolArguments(
  { age: 30 },
  schema1
);
console.log(result2.valid); // false
console.log(result2.errors); // [{ field: 'name', message: 'Required', ... }]

// Test 3: Invalid type
const result3 = validator.validateToolArguments(
  { name: 'John', age: 'thirty' },
  schema1
);
console.log(result3.valid); // false
console.log(result3.errors); // [{ field: 'age', message: 'Expected number, received string', ... }]

// Test 4: Validate single field
const emailSchema = {
  type: 'string' as const,
  format: 'email'
};
const result4 = validator.validateField('test@example.com', emailSchema, 'email');
console.log(result4.valid); // true

const result5 = validator.validateField('not-an-email', emailSchema, 'email');
console.log(result5.valid); // false

// Test 5: Parse with throw
try {
  const data = validator.parse({ name: 'John', age: 30 }, schema1);
  console.log(data); // { name: 'John', age: 30 }
} catch (error) {
  console.error(error);
}

// Test 6: Validate multiple fields
const result6 = validator.validateFields(
  {
    username: 'john_doe',
    email: 'john@example.com',
    age: 30
  },
  {
    username: { type: 'string' as const, minLength: 3 },
    email: { type: 'string' as const, format: 'email' },
    age: { type: 'number' as const, minimum: 0 }
  }
);
console.log(result6.valid); // true
console.log(result6.data); // { username: 'john_doe', email: 'john@example.com', age: 30 }

// Test 7: Complex nested schema
const complexSchema = {
  type: 'object' as const,
  properties: {
    user: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        contacts: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              type: { type: 'string' as const, enum: ['email', 'phone'] },
              value: { type: 'string' as const }
            },
            required: ['type', 'value']
          }
        }
      },
      required: ['name']
    }
  },
  required: ['user']
};

const result7 = validator.validateToolArguments(
  {
    user: {
      name: 'John',
      contacts: [
        { type: 'email', value: 'john@example.com' },
        { type: 'phone', value: '555-1234' }
      ]
    }
  },
  complexSchema
);
console.log(result7.valid); // true
*/