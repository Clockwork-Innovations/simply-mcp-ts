/**
 * index.ts
 * Main export file for the validation system
 * Provides a unified interface for validation and sanitization
 *
 * Usage:
 * ```typescript
 * import { validateAndSanitize } from './validation';
 *
 * const result = validateAndSanitize(args, schema, {
 *   sanitize: true,
 *   strictMode: false
 * });
 * ```
 */

// Export all modules
export * from './ValidationError.js';
export * from './JsonSchemaToZod.js';
export * from './InputValidator.js';
export * from './InputSanitizer.js';

// Import for combined functionality
import { InputValidator, ValidationResult, ValidationOptions } from './InputValidator.js';
import { InputSanitizer, SanitizationResult, SanitizerConfig } from './InputSanitizer.js';
import { JsonSchemaDefinition } from './JsonSchemaToZod.js';
import { ValidationError, SchemaValidationError, SanitizationError } from './ValidationError.js';

/**
 * Combined validation and sanitization options
 */
export interface ValidateAndSanitizeOptions {
  /** Validation options */
  validation?: ValidationOptions;
  /** Sanitization options */
  sanitization?: SanitizerConfig;
  /** Enable sanitization (default: true) */
  sanitize?: boolean;
  /** Enable validation (default: true) */
  validate?: boolean;
  /** Sanitize before validation (default: true) */
  sanitizeFirst?: boolean;
}

/**
 * Combined validation and sanitization result
 */
export interface ValidateAndSanitizeResult<T = any> {
  /** Whether validation succeeded */
  valid: boolean;
  /** Final validated and sanitized data */
  data?: T;
  /** Original data before any processing */
  original: any;
  /** Data after sanitization but before validation */
  sanitized?: any;
  /** Validation result */
  validation?: ValidationResult<T>;
  /** Sanitization result */
  sanitization?: SanitizationResult<any>;
  /** Combined errors from both validation and sanitization */
  errors?: Array<{ type: 'validation' | 'sanitization'; message: string; field?: string }>;
  /** Combined warnings */
  warnings?: string[];
}

/**
 * Combined validation and sanitization function
 * This is the main entry point for most use cases
 */
export function validateAndSanitize<T = any>(
  input: unknown,
  schema: JsonSchemaDefinition,
  options: ValidateAndSanitizeOptions = {}
): ValidateAndSanitizeResult<T> {
  const {
    validation: validationOpts,
    sanitization: sanitizationOpts,
    sanitize = true,
    validate = true,
    sanitizeFirst = true,
  } = options;

  const result: ValidateAndSanitizeResult<T> = {
    valid: false,
    original: input,
    errors: [],
    warnings: [],
  };

  let currentData = input;

  try {
    // Step 1: Sanitization (if enabled and sanitizeFirst)
    if (sanitize && sanitizeFirst) {
      const sanitizer = new InputSanitizer(sanitizationOpts);
      const sanitizationResult = sanitizer.sanitizeObject(currentData);

      result.sanitization = sanitizationResult;
      result.sanitized = sanitizationResult.value;
      result.warnings?.push(...sanitizationResult.warnings);

      currentData = sanitizationResult.value;
    }

    // Step 2: Validation (if enabled)
    if (validate) {
      const validator = new InputValidator(validationOpts);
      const validationResult = validator.validateToolArguments<T>(currentData, schema);

      result.validation = validationResult;

      if (!validationResult.valid) {
        result.valid = false;
        result.errors?.push(
          ...(validationResult.errors?.map(e => ({
            type: 'validation' as const,
            message: e.message,
            field: e.field,
          })) || [])
        );
        return result;
      }

      currentData = validationResult.data;
    }

    // Step 3: Sanitization (if enabled and not sanitizeFirst)
    if (sanitize && !sanitizeFirst) {
      const sanitizer = new InputSanitizer(sanitizationOpts);
      const sanitizationResult = sanitizer.sanitizeObject(currentData);

      result.sanitization = sanitizationResult;
      result.sanitized = sanitizationResult.value;
      result.warnings?.push(...sanitizationResult.warnings);

      currentData = sanitizationResult.value;
    }

    // Success
    result.valid = true;
    result.data = currentData as T;

    return result;
  } catch (error) {
    // Handle errors
    if (error instanceof ValidationError || error instanceof SchemaValidationError) {
      result.errors?.push({
        type: 'validation',
        message: error.message,
        field: error.field,
      });
    } else if (error instanceof SanitizationError) {
      result.errors?.push({
        type: 'sanitization',
        message: error.message,
        field: error.field,
      });
    } else {
      result.errors?.push({
        type: 'validation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    result.valid = false;
    return result;
  }
}

/**
 * Validation-only mode (no sanitization)
 */
export function validateOnly<T = any>(
  input: unknown,
  schema: JsonSchemaDefinition,
  options?: ValidationOptions
): ValidationResult<T> {
  const validator = new InputValidator(options);
  return validator.validateToolArguments<T>(input, schema);
}

/**
 * Sanitization-only mode (no validation)
 */
export function sanitizeOnly(
  input: any,
  options?: SanitizerConfig
): SanitizationResult<any> {
  const sanitizer = new InputSanitizer(options);
  return sanitizer.sanitizeObject(input);
}

/**
 * Quick validation helper that throws on error
 */
export function validateOrThrow<T = any>(
  input: unknown,
  schema: JsonSchemaDefinition,
  options?: ValidateAndSanitizeOptions
): T {
  const result = validateAndSanitize<T>(input, schema, options);

  if (!result.valid) {
    const errorMessages = result.errors?.map(e =>
      e.field ? `${e.field}: ${e.message}` : e.message
    ).join('; ');
    throw new ValidationError(
      `Validation failed: ${errorMessages}`,
      undefined,
      undefined,
      undefined,
      result.errors?.map(e => ({
        field: e.field || 'root',
        message: e.message,
      }))
    );
  }

  return result.data as T;
}

/**
 * Create a validator function from a schema
 * Useful for reusing the same schema multiple times
 */
export function createValidator<T = any>(
  schema: JsonSchemaDefinition,
  options?: ValidateAndSanitizeOptions
): (input: unknown) => ValidateAndSanitizeResult<T> {
  return (input: unknown) => validateAndSanitize<T>(input, schema, options);
}

/**
 * Batch validate multiple inputs against the same schema
 */
export function validateBatch<T = any>(
  inputs: unknown[],
  schema: JsonSchemaDefinition,
  options?: ValidateAndSanitizeOptions
): Array<ValidateAndSanitizeResult<T>> {
  return inputs.map(input => validateAndSanitize<T>(input, schema, options));
}

/**
 * Check if all results in a batch are valid
 */
export function isValidBatch(results: Array<ValidateAndSanitizeResult<any>>): boolean {
  return results.every(result => result.valid);
}

/**
 * Get all errors from a batch validation
 */
export function getBatchErrors(
  results: Array<ValidateAndSanitizeResult<any>>
): Array<{ index: number; errors: ValidateAndSanitizeResult['errors'] }> {
  return results
    .map((result, index) => ({ index, errors: result.errors }))
    .filter(item => item.errors && item.errors.length > 0);
}

// Example usage and tests (in comments)
/*
// Test 1: Combined validation and sanitization
const schema = {
  type: 'object' as const,
  properties: {
    username: { type: 'string' as const, minLength: 3, maxLength: 20 },
    email: { type: 'string' as const, format: 'email' },
    query: { type: 'string' as const }
  },
  required: ['username', 'email']
};

const result1 = validateAndSanitize(
  {
    username: 'john_doe',
    email: 'john@example.com',
    query: 'SELECT * FROM users'
  },
  schema,
  { sanitize: true, validate: true }
);

console.log(result1.valid); // true
console.log(result1.warnings); // ['Potential SQL injection pattern detected']
console.log(result1.data); // Validated and sanitized data

// Test 2: Validation-only mode
const result2 = validateOnly({ username: 'john', email: 'invalid' }, schema);
console.log(result2.valid); // false
console.log(result2.errors); // Email validation error

// Test 3: Sanitization-only mode
const result3 = sanitizeOnly({
  data: '<script>alert("xss")</script>',
  nested: { sql: 'DROP TABLE users;' }
});
console.log(result3.warnings); // XSS and SQL warnings

// Test 4: Validation with throw
try {
  const data = validateOrThrow(
    { username: 'john', email: 'john@example.com' },
    schema
  );
  console.log(data); // Valid data
} catch (error) {
  console.error(error.message);
}

// Test 5: Create reusable validator
const userValidator = createValidator(schema, { sanitize: true });
const user1 = userValidator({ username: 'alice', email: 'alice@example.com' });
const user2 = userValidator({ username: 'bob', email: 'bob@example.com' });
console.log(user1.valid, user2.valid); // true, true

// Test 6: Batch validation
const users = [
  { username: 'alice', email: 'alice@example.com' },
  { username: 'bob', email: 'invalid-email' },
  { username: 'charlie', email: 'charlie@example.com' }
];
const results = validateBatch(users, schema);
console.log(isValidBatch(results)); // false (bob has invalid email)
console.log(getBatchErrors(results)); // [{ index: 1, errors: [...] }]

// Test 7: Strict sanitization mode
const strictResult = validateAndSanitize(
  { username: 'admin', query: 'DROP TABLE users;' },
  schema,
  {
    sanitization: { strictMode: true },
    sanitize: true,
    validate: false
  }
);
console.log(strictResult.valid); // false (strict mode throws on dangerous patterns)
console.log(strictResult.errors); // Sanitization errors
*/