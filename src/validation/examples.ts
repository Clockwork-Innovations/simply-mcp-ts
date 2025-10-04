/**
 * examples.ts
 * Comprehensive examples demonstrating the validation system
 *
 * Run with: npx tsx mcp/validation/examples.ts
 */

import {
  validateAndSanitize,
  validateOnly,
  sanitizeOnly,
  validateOrThrow,
  createValidator,
  validateBatch,
  isValidBatch,
  getBatchErrors,
  InputValidator,
  InputSanitizer,
  jsonSchemaToZod,
  ValidationError,
  SchemaValidationError,
  SanitizationError,
} from './index.js';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

// Example 1: Basic validation and sanitization
section('Example 1: Basic Validation and Sanitization');

const basicSchema = {
  type: 'object' as const,
  properties: {
    username: { type: 'string' as const, minLength: 3, maxLength: 20 },
    email: { type: 'string' as const, format: 'email' },
    age: { type: 'number' as const, minimum: 0, maximum: 120 },
  },
  required: ['username', 'email'],
};

const validInput = {
  username: 'john_doe',
  email: 'john@example.com',
  age: 30,
};

const result1 = validateAndSanitize(validInput, basicSchema);
log(`✓ Valid input: ${result1.valid}`, 'green');
console.log('Data:', result1.data);

// Example 2: Invalid input
section('Example 2: Invalid Input - Validation Errors');

const invalidInput = {
  username: 'jo', // Too short
  email: 'not-an-email',
  age: 150, // Too high
};

const result2 = validateAndSanitize(invalidInput, basicSchema);
log(`✗ Valid: ${result2.valid}`, 'red');
log('Errors:', 'red');
result2.errors?.forEach(e => {
  console.log(`  - ${e.field}: ${e.message}`);
});

// Example 3: SQL Injection detection
section('Example 3: SQL Injection Detection');

const dangerousInput = {
  username: 'admin',
  email: 'admin@example.com',
  query: "SELECT * FROM users WHERE id='1' OR '1'='1';",
};

const querySchema = {
  type: 'object' as const,
  properties: {
    username: { type: 'string' as const },
    email: { type: 'string' as const, format: 'email' },
    query: { type: 'string' as const },
  },
};

const result3 = validateAndSanitize(dangerousInput, querySchema);
log(`✓ Valid: ${result3.valid}`, 'green');
if (result3.warnings && result3.warnings.length > 0) {
  log('⚠ Security Warnings:', 'yellow');
  result3.warnings.forEach(w => console.log(`  - ${w}`));
}

// Example 4: XSS Prevention
section('Example 4: XSS Prevention');

const xssInput = {
  username: 'hacker',
  bio: '<script>alert("XSS")</script>',
};

const bioSchema = {
  type: 'object' as const,
  properties: {
    username: { type: 'string' as const },
    bio: { type: 'string' as const },
  },
};

const result4 = validateAndSanitize(xssInput, bioSchema);
log(`✓ Valid: ${result4.valid}`, 'green');
log('Original bio:', 'blue');
console.log(' ', xssInput.bio);
log('Sanitized bio:', 'green');
console.log(' ', result4.data?.bio);
if (result4.warnings && result4.warnings.length > 0) {
  log('⚠ Warnings:', 'yellow');
  result4.warnings.forEach(w => console.log(`  - ${w}`));
}

// Example 5: Strict Mode
section('Example 5: Strict Mode - Throws on Dangerous Input');

const strictSanitizer = new InputSanitizer({ strictMode: true });

try {
  strictSanitizer.sanitizeString('DROP TABLE users;');
  log('✗ Should have thrown error', 'red');
} catch (error) {
  if (error instanceof SanitizationError) {
    log(`✓ Caught SanitizationError: ${error.message}`, 'green');
  }
}

// Example 6: Deep Object Sanitization
section('Example 6: Deep Object Sanitization with Depth Limit');

const deepObject = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            level6: {
              level7: {
                level8: {
                  level9: {
                    level10: {
                      level11: { dangerous: 'DROP TABLE users;' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

const result6 = sanitizeOnly(deepObject);
log(`✓ Sanitization completed`, 'green');
log(`Modified: ${result6.modified}`, result6.modified ? 'yellow' : 'green');

try {
  const strictResult = sanitizeOnly(deepObject, { maxDepth: 5 });
  log('✗ Should have thrown depth error', 'red');
} catch (error) {
  if (error instanceof SanitizationError) {
    log(`✓ Caught depth limit error: ${error.message}`, 'green');
  }
}

// Example 7: Validation-only mode
section('Example 7: Validation-Only Mode');

const result7 = validateOnly({ username: 'john', email: 'john@example.com' }, basicSchema);
log(`✓ Valid: ${result7.valid}`, 'green');

// Example 8: Batch validation
section('Example 8: Batch Validation');

const users = [
  { username: 'alice', email: 'alice@example.com', age: 25 },
  { username: 'bob', email: 'invalid-email', age: 30 },
  { username: 'charlie', email: 'charlie@example.com', age: 35 },
];

const batchResults = validateBatch(users, basicSchema);
log(`All valid: ${isValidBatch(batchResults)}`, isValidBatch(batchResults) ? 'green' : 'yellow');

const batchErrors = getBatchErrors(batchResults);
if (batchErrors.length > 0) {
  log('Errors found in:', 'yellow');
  batchErrors.forEach(({ index, errors }) => {
    console.log(`  User ${index}:`);
    errors?.forEach(e => console.log(`    - ${e.field || 'unknown'}: ${e.message}`));
  });
}

// Example 9: Reusable validator
section('Example 9: Reusable Validator');

const userValidator = createValidator(basicSchema, { sanitize: true });

const user1Result = userValidator({ username: 'user1', email: 'user1@example.com' });
const user2Result = userValidator({ username: 'user2', email: 'user2@example.com' });

log(`User 1 valid: ${user1Result.valid}`, user1Result.valid ? 'green' : 'red');
log(`User 2 valid: ${user2Result.valid}`, user2Result.valid ? 'green' : 'red');

// Example 10: Validation with throw
section('Example 10: Validation with Throw');

try {
  const data = validateOrThrow(
    { username: 'john', email: 'john@example.com', age: 30 },
    basicSchema
  );
  log('✓ Validation passed', 'green');
  console.log('Data:', data);
} catch (error) {
  if (error instanceof ValidationError) {
    log(`✗ Validation failed: ${error.message}`, 'red');
  }
}

try {
  const data = validateOrThrow(
    { username: 'x', email: 'invalid' },
    basicSchema
  );
  log('✗ Should have thrown', 'red');
} catch (error) {
  if (error instanceof ValidationError) {
    log(`✓ Caught ValidationError: ${error.message}`, 'green');
  }
}

// Example 11: Complex nested schema
section('Example 11: Complex Nested Schema');

const complexSchema = {
  type: 'object' as const,
  properties: {
    user: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, minLength: 1 },
        contacts: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              type: { type: 'string' as const, enum: ['email', 'phone', 'address'] },
              value: { type: 'string' as const, minLength: 1 },
            },
            required: ['type', 'value'],
          },
        },
      },
      required: ['name'],
    },
    metadata: {
      type: 'object' as const,
      properties: {
        created: { type: 'string' as const, format: 'date-time' },
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const },
        },
      },
    },
  },
  required: ['user'],
};

const complexInput = {
  user: {
    name: 'John Doe',
    contacts: [
      { type: 'email', value: 'john@example.com' },
      { type: 'phone', value: '555-1234' },
    ],
  },
  metadata: {
    created: '2025-01-15T10:30:00Z',
    tags: ['customer', 'premium'],
  },
};

const result11 = validateAndSanitize(complexInput, complexSchema);
log(`✓ Valid: ${result11.valid}`, 'green');
console.log('Data:', JSON.stringify(result11.data, null, 2));

// Example 12: Shell injection prevention
section('Example 12: Shell Injection Prevention');

const shellInput = 'test && rm -rf /';
const sanitizer = new InputSanitizer();
const shellSafe = sanitizer.sanitizeForShell(shellInput);

log('Original:', 'blue');
console.log(' ', shellInput);
log('Sanitized for shell:', 'green');
console.log(' ', shellSafe);

// Example 13: SQL sanitization
section('Example 13: SQL Sanitization');

const sqlInput = "admin' OR '1'='1";
const sqlSafe = sanitizer.sanitizeForSql(sqlInput);

log('Original:', 'blue');
console.log(' ', sqlInput);
log('Sanitized for SQL:', 'green');
console.log(' ', sqlSafe);

// Example 14: Enum validation
section('Example 14: Enum Validation');

const enumSchema = {
  type: 'object' as const,
  properties: {
    role: { type: 'string' as const, enum: ['admin', 'user', 'guest'] },
    status: { type: 'string' as const, enum: ['active', 'inactive', 'suspended'] },
  },
  required: ['role'],
};

const validEnum = validateAndSanitize(
  { role: 'admin', status: 'active' },
  enumSchema
);
log(`✓ Valid enum: ${validEnum.valid}`, 'green');

const invalidEnum = validateAndSanitize(
  { role: 'superadmin', status: 'active' },
  enumSchema
);
log(`✗ Invalid enum: ${invalidEnum.valid}`, 'red');
invalidEnum.errors?.forEach(e => {
  console.log(`  - ${e.field || 'unknown'}: ${e.message}`);
});

// Example 15: Pattern validation
section('Example 15: Pattern (Regex) Validation');

const patternSchema = {
  type: 'object' as const,
  properties: {
    username: {
      type: 'string' as const,
      pattern: '^[a-zA-Z0-9_]{3,20}$',
      minLength: 3,
      maxLength: 20,
    },
    zipcode: {
      type: 'string' as const,
      pattern: '^\\d{5}(-\\d{4})?$',
    },
  },
};

const validPattern = validateAndSanitize(
  { username: 'john_doe123', zipcode: '12345' },
  patternSchema
);
log(`✓ Valid pattern: ${validPattern.valid}`, 'green');

const invalidPattern = validateAndSanitize(
  { username: 'john@doe!', zipcode: '123' },
  patternSchema
);
log(`✗ Invalid pattern: ${invalidPattern.valid}`, 'red');
invalidPattern.errors?.forEach(e => {
  console.log(`  - ${e.field}: ${e.message}`);
});

// Example 16: Performance - Schema caching
section('Example 16: Performance - Schema Caching');

import { getCacheStats } from './JsonSchemaToZod.js';

console.log('Initial cache stats:', getCacheStats());

// Create multiple validators with the same schema
for (let i = 0; i < 5; i++) {
  validateAndSanitize({ username: `user${i}`, email: `user${i}@example.com` }, basicSchema);
}

console.log('After 5 validations with same schema:', getCacheStats());

// Summary
section('Summary');
log('✓ All examples completed successfully!', 'green');
log('\nKey Features Demonstrated:', 'cyan');
console.log('  ✓ Basic validation and sanitization');
console.log('  ✓ SQL injection detection');
console.log('  ✓ XSS prevention');
console.log('  ✓ Shell injection prevention');
console.log('  ✓ Deep object sanitization');
console.log('  ✓ Depth limiting (DoS prevention)');
console.log('  ✓ Batch validation');
console.log('  ✓ Reusable validators');
console.log('  ✓ Strict mode');
console.log('  ✓ Complex nested schemas');
console.log('  ✓ Enum validation');
console.log('  ✓ Pattern (regex) validation');
console.log('  ✓ Schema caching for performance');
console.log('');
