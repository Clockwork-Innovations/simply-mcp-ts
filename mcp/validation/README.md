# MCP Input Validation & Sanitization System

A comprehensive, security-first validation and sanitization system for the MCP (Model Context Protocol) configurable server.

## Overview

This system provides robust input validation and sanitization to protect against common attack vectors including:
- SQL Injection
- Shell Injection
- XSS (Cross-Site Scripting)
- Path Traversal
- DoS via deep object nesting
- Malformed data

## Architecture

The system consists of five main modules:

### 1. ValidationError.ts
Custom error classes for validation and sanitization failures with JSON-RPC compatible formatting.

**Classes:**
- `ValidationError` - Base validation error
- `SchemaValidationError` - Wraps Zod validation errors
- `SanitizationError` - Sanitization-specific errors

**Features:**
- Field-level error details
- JSON-RPC error formatting
- User-friendly error messages
- Stack traces for debugging

### 2. JsonSchemaToZod.ts
Converts JSON Schema 7 definitions to Zod runtime validation schemas.

**Supported Features:**
- All primitive types (string, number, integer, boolean, null)
- Objects with nested properties
- Arrays with item schemas
- Required fields
- Enums
- Min/max for numbers and strings
- Regex patterns for strings
- Format validation (email, URL, UUID, datetime, etc.)
- Union types
- Schema caching for performance

**Example:**
```typescript
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    age: { type: 'number', minimum: 0, maximum: 120 }
  },
  required: ['name']
};

const zodSchema = jsonSchemaToZod(schema);
const result = zodSchema.parse({ name: 'John', age: 30 });
```

### 3. InputSanitizer.ts
Sanitizes input to prevent common attack vectors.

**Features:**
- SQL injection detection
- Shell injection detection
- XSS prevention
- Path traversal detection
- Configurable strictness
- Depth limiting (DoS prevention)
- String length limiting
- Custom dangerous patterns

**Configuration:**
```typescript
const sanitizer = new InputSanitizer({
  strictMode: false,      // throw vs sanitize
  maxDepth: 10,          // max object nesting
  maxStringLength: 10000, // max string size
  maxArrayLength: 1000,   // max array size
  allowHtml: false,       // strip HTML tags
  customDangerousPatterns: [] // custom regex patterns
});
```

**Example:**
```typescript
// Detect SQL injection
const result = sanitizer.sanitizeString("admin' OR '1'='1");
// result.warnings: ['Potential SQL injection pattern detected']

// Strict mode throws
const strict = new InputSanitizer({ strictMode: true });
strict.sanitizeString("DROP TABLE users;"); // throws SanitizationError
```

### 4. InputValidator.ts
Comprehensive validation system using Zod schemas.

**Features:**
- Type-safe validation
- Field-level validation
- Batch validation
- Schema caching
- Custom error messages
- Integration with JSON Schema

**Example:**
```typescript
const validator = new InputValidator();

const result = validator.validateToolArguments(
  { name: 'John', age: 30 },
  schema
);

if (result.valid) {
  console.log(result.data); // typed and validated
} else {
  console.error(result.errors);
}
```

### 5. index.ts
Main integration module providing combined validation and sanitization.

**Key Function:**
```typescript
validateAndSanitize<T>(
  input: unknown,
  schema: JsonSchemaDefinition,
  options?: ValidateAndSanitizeOptions
): ValidateAndSanitizeResult<T>
```

**Options:**
- `sanitize` - Enable sanitization (default: true)
- `validate` - Enable validation (default: true)
- `sanitizeFirst` - Sanitize before validation (default: true)
- `validation` - Validation options
- `sanitization` - Sanitization options

## Usage

### Basic Usage

```typescript
import { validateAndSanitize } from './validation';

const schema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 3 },
    email: { type: 'string', format: 'email' }
  },
  required: ['username', 'email']
};

const result = validateAndSanitize(userInput, schema);

if (result.valid) {
  // Use result.data - it's validated and sanitized
  processUser(result.data);
} else {
  // Handle errors
  console.error(result.errors);
}

// Check for security warnings
if (result.warnings?.length > 0) {
  console.warn('Security warnings:', result.warnings);
}
```

### Validation Only

```typescript
import { validateOnly } from './validation';

const result = validateOnly(input, schema);
if (!result.valid) {
  console.error(result.errors);
}
```

### Sanitization Only

```typescript
import { sanitizeOnly } from './validation';

const result = sanitizeOnly(input, {
  strictMode: false,
  maxDepth: 5
});

console.log(result.warnings); // Security warnings
console.log(result.value);    // Sanitized data
```

### Validation with Throw

```typescript
import { validateOrThrow } from './validation';

try {
  const data = validateOrThrow(input, schema);
  // data is typed and validated
} catch (error) {
  // ValidationError with details
  console.error(error.message);
}
```

### Reusable Validator

```typescript
import { createValidator } from './validation';

const userValidator = createValidator(userSchema, {
  sanitize: true,
  sanitization: { strictMode: true }
});

// Reuse for multiple inputs
const user1 = userValidator(input1);
const user2 = userValidator(input2);
```

### Batch Validation

```typescript
import { validateBatch, isValidBatch, getBatchErrors } from './validation';

const inputs = [input1, input2, input3];
const results = validateBatch(inputs, schema);

if (isValidBatch(results)) {
  // All valid
  const validatedData = results.map(r => r.data);
} else {
  // Get errors
  const errors = getBatchErrors(results);
  // [{ index: 1, errors: [...] }]
}
```

## Integration with configurableServer.ts

The validation system is integrated into the tool handler:

```typescript
const createToolHandler = (tool: ToolConfig) => {
  return async (args: Record<string, any>) => {
    // Validate and sanitize
    const result = validateAndSanitize(args, tool.inputSchema, {
      sanitize: true,
      validate: true,
      sanitizeFirst: true,
      sanitization: {
        strictMode: false,
        maxDepth: 10,
        maxStringLength: 10000,
        allowHtml: false,
      },
    });

    // Return error if validation failed
    if (!result.valid) {
      return {
        content: [{
          type: 'text',
          text: `Validation Error:\n${formatErrors(result.errors)}`
        }]
      };
    }

    // Log security warnings
    if (result.warnings?.length > 0) {
      console.warn(`[Security] Tool received dangerous input:`, result.warnings);
    }

    // Use validated and sanitized data
    return handler(result.data);
  };
};
```

## Security Patterns Detected

### SQL Injection
- SQL keywords (SELECT, INSERT, UPDATE, DELETE, DROP, etc.)
- SQL operators (--, ;, /*, */)
- SQL string delimiters (', ", escapes)

### Shell Injection
- Shell operators ($(), `, &&, ||, ;, >, <, |)
- Dangerous commands (rm -rf, curl, wget, bash, eval, exec)

### XSS
- Script tags
- Iframe tags
- Event handlers (onclick=, onload=, etc.)
- JavaScript URLs (javascript:)
- Inline images with suspicious sources

### Path Traversal
- Directory traversal sequences (../, ..\)
- Relative path exploits

## Performance

- **Schema Caching**: Converted Zod schemas are cached to avoid re-conversion
- **Minimal Overhead**: Validation adds ~1-5ms for typical inputs
- **Configurable Limits**: Prevent DoS via depth/length limits

**Cache Statistics:**
```typescript
import { getCacheStats } from './validation/JsonSchemaToZod';
console.log(getCacheStats()); // { size: 10 }
```

## Error Handling

All errors are compatible with JSON-RPC error format:

```typescript
try {
  const result = validateOrThrow(input, schema);
} catch (error) {
  if (isValidationError(error)) {
    const jsonRpc = error.toJsonRpc();
    // {
    //   code: -32602,
    //   message: "Validation failed",
    //   data: { validationErrors: [...] }
    // }
  }
}
```

## Configuration Best Practices

### Development
```typescript
{
  sanitize: true,
  validate: true,
  sanitization: {
    strictMode: false,  // Log warnings, don't throw
    maxDepth: 10,
    allowHtml: false
  }
}
```

### Production
```typescript
{
  sanitize: true,
  validate: true,
  sanitization: {
    strictMode: true,   // Throw on dangerous input
    maxDepth: 5,        // Stricter limits
    maxStringLength: 5000,
    allowHtml: false
  }
}
```

### Testing
```typescript
{
  sanitize: false,  // Test validation logic separately
  validate: true
}
```

## Testing

Each module includes extensive test examples in comments. To run tests:

```typescript
// See comments in each file for test examples
// Example from InputValidator.ts:
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 }
  },
  required: ['name']
};

const result = validator.validateToolArguments({ name: 'John' }, schema);
assert(result.valid === true);
assert(result.data.name === 'John');
```

## Extension

### Custom Sanitization Patterns

```typescript
const sanitizer = new InputSanitizer({
  customDangerousPatterns: [
    /forbidden-word/gi,
    /dangerous-pattern/gi
  ]
});
```

### Custom Validation Rules

Zod schemas support custom refinements:

```typescript
const schema = jsonSchemaToZod(baseSchema)
  .refine(
    data => data.startDate < data.endDate,
    { message: 'End date must be after start date' }
  );
```

## Dependencies

- **zod** (^4.1.11) - Runtime type validation
- Standard Node.js libraries

## License

See project root LICENSE file.

## Support

For issues or questions, please refer to the main project documentation or create an issue in the project repository.