/**
 * LLMFriendlyErrors.ts
 * Enhanced error messages designed for LLM self-healing
 *
 * Provides:
 * - Clear schema expectations
 * - What was received vs expected
 * - Actionable fix instructions
 * - Valid examples
 */

import { JsonSchemaDefinition } from './JsonSchemaToZod.js';
import { ValidationErrorDetail } from './ValidationError.js';

/**
 * LLM-friendly error response format
 */
export interface LLMFriendlyErrorResponse {
  error: {
    type: 'validation' | 'handler' | 'system';
    summary: string;

    // What went wrong
    issues: Array<{
      field: string;
      problem: string;
      received: any;
      expected: string;
      fix: string; // Actionable instruction
    }>;

    // Help the LLM understand the schema
    schema: {
      description: string;
      properties: Record<string, PropertyHelp>;
      required: string[];
      examples?: any[];
    };

    // Quick fixes
    suggestions: string[];

    // Complete working example
    validExample: any;
  };
}

interface PropertyHelp {
  type: string;
  description: string;
  constraints: string[];
  examples: any[];
}

/**
 * Generate LLM-friendly validation error
 */
export function createLLMFriendlyValidationError(
  toolName: string,
  toolDescription: string,
  schema: JsonSchemaDefinition,
  errors: ValidationErrorDetail[],
  receivedInput: any
): LLMFriendlyErrorResponse {

  const issues = errors.map(error => ({
    field: error.field,
    problem: error.message,
    received: getFieldValue(receivedInput, error.field),
    expected: error.expected || extractExpectedFromMessage(error.message),
    fix: generateFixInstruction(error, schema),
  }));

  const schemaHelp = generateSchemaHelp(schema);
  const suggestions = generateSuggestions(errors, schema);
  const validExample = generateValidExample(schema);

  return {
    error: {
      type: 'validation',
      summary: `Tool '${toolName}' received invalid arguments. ${errors.length} validation error(s) found.`,
      issues,
      schema: {
        description: toolDescription,
        properties: schemaHelp,
        required: schema.required || [],
        examples: [validExample],
      },
      suggestions,
      validExample,
    },
  };
}

/**
 * Get value from nested object path
 */
function getFieldValue(obj: any, path: string): any {
  if (!path || path === 'root') return obj;

  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value === null || value === undefined) return undefined;
    value = value[key];
  }

  return value;
}

/**
 * Extract expected value from error message
 */
function extractExpectedFromMessage(message: string): string {
  // Try to extract useful info from common Zod messages
  const patterns = [
    /Expected (.+), received/i,
    /must be (.+)/i,
    /should be (.+)/i,
    /Invalid (.+) format/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return match[1];
  }

  return 'valid value';
}

/**
 * Generate actionable fix instruction
 */
function generateFixInstruction(
  error: ValidationErrorDetail,
  schema: JsonSchemaDefinition
): string {
  const field = error.field;
  const fieldSchema = getFieldSchema(schema, field);

  if (!fieldSchema) {
    return `Provide a valid value for '${field}'.`;
  }

  // String constraints
  if (fieldSchema.type === 'string') {
    const constraints: string[] = [];

    if (fieldSchema.minLength) {
      constraints.push(`at least ${fieldSchema.minLength} characters`);
    }
    if (fieldSchema.maxLength) {
      constraints.push(`at most ${fieldSchema.maxLength} characters`);
    }
    if (fieldSchema.pattern) {
      constraints.push(`matching pattern ${fieldSchema.pattern}`);
    }
    if (fieldSchema.format) {
      constraints.push(`in ${fieldSchema.format} format`);
    }
    if (fieldSchema.enum) {
      return `Use one of these values: ${fieldSchema.enum.map(v => `"${v}"`).join(', ')}`;
    }

    if (constraints.length > 0) {
      return `Provide a string with ${constraints.join(' and ')}.`;
    }
  }

  // Number constraints
  if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
    const constraints: string[] = [];

    if (fieldSchema.minimum !== undefined) {
      constraints.push(`>= ${fieldSchema.minimum}`);
    }
    if (fieldSchema.maximum !== undefined) {
      constraints.push(`<= ${fieldSchema.maximum}`);
    }
    if (fieldSchema.exclusiveMinimum !== undefined) {
      constraints.push(`> ${fieldSchema.exclusiveMinimum}`);
    }
    if (fieldSchema.exclusiveMaximum !== undefined) {
      constraints.push(`< ${fieldSchema.exclusiveMaximum}`);
    }
    if (fieldSchema.multipleOf) {
      constraints.push(`multiple of ${fieldSchema.multipleOf}`);
    }
    if (fieldSchema.enum) {
      return `Use one of these values: ${fieldSchema.enum.join(', ')}`;
    }

    if (constraints.length > 0) {
      return `Provide a ${fieldSchema.type} ${constraints.join(' and ')}.`;
    }
  }

  // Array constraints
  if (fieldSchema.type === 'array') {
    const constraints: string[] = [];

    if (fieldSchema.minItems) {
      constraints.push(`at least ${fieldSchema.minItems} items`);
    }
    if (fieldSchema.maxItems) {
      constraints.push(`at most ${fieldSchema.maxItems} items`);
    }
    if (fieldSchema.uniqueItems) {
      constraints.push('all items must be unique');
    }

    let itemType = 'any';
    if (fieldSchema.items?.type) {
      itemType = Array.isArray(fieldSchema.items.type)
        ? fieldSchema.items.type.join(' or ')
        : fieldSchema.items.type;
    }

    return `Provide an array of ${itemType}${constraints.length > 0 ? ' with ' + constraints.join(' and ') : ''}.`;
  }

  return `Provide a valid ${fieldSchema.type} value for '${field}'.`;
}

/**
 * Get field schema from object schema
 */
function getFieldSchema(schema: JsonSchemaDefinition, field: string): JsonSchemaDefinition | null {
  if (!schema.properties) return null;

  const keys = field.split('.');
  let currentSchema = schema;

  for (const key of keys) {
    if (!currentSchema.properties || !currentSchema.properties[key]) {
      return null;
    }
    currentSchema = currentSchema.properties[key];
  }

  return currentSchema;
}

/**
 * Generate schema help for all properties
 */
function generateSchemaHelp(schema: JsonSchemaDefinition): Record<string, PropertyHelp> {
  const help: Record<string, PropertyHelp> = {};

  if (!schema.properties) return help;

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    help[key] = {
      type: Array.isArray(propSchema.type) ? propSchema.type.join(' | ') : (propSchema.type || 'any'),
      description: propSchema.description || '',
      constraints: extractConstraints(propSchema),
      examples: generatePropertyExamples(propSchema),
    };
  }

  return help;
}

/**
 * Extract human-readable constraints
 */
function extractConstraints(schema: JsonSchemaDefinition): string[] {
  const constraints: string[] = [];

  if (schema.enum) {
    constraints.push(`Must be one of: ${schema.enum.map(v => JSON.stringify(v)).join(', ')}`);
  }
  if (schema.minLength) constraints.push(`Min length: ${schema.minLength}`);
  if (schema.maxLength) constraints.push(`Max length: ${schema.maxLength}`);
  if (schema.minimum !== undefined) constraints.push(`Minimum: ${schema.minimum}`);
  if (schema.maximum !== undefined) constraints.push(`Maximum: ${schema.maximum}`);
  if (schema.exclusiveMinimum !== undefined) constraints.push(`Greater than: ${schema.exclusiveMinimum}`);
  if (schema.exclusiveMaximum !== undefined) constraints.push(`Less than: ${schema.exclusiveMaximum}`);
  if (schema.multipleOf) constraints.push(`Multiple of: ${schema.multipleOf}`);
  if (schema.pattern) constraints.push(`Pattern: ${schema.pattern}`);
  if (schema.format) constraints.push(`Format: ${schema.format}`);
  if (schema.minItems) constraints.push(`Min items: ${schema.minItems}`);
  if (schema.maxItems) constraints.push(`Max items: ${schema.maxItems}`);
  if (schema.uniqueItems) constraints.push('Items must be unique');

  return constraints;
}

/**
 * Generate example values for a property
 */
function generatePropertyExamples(schema: JsonSchemaDefinition): any[] {
  const examples: any[] = [];

  if (schema.default !== undefined) {
    examples.push(schema.default);
  }

  if (schema.enum) {
    return schema.enum.slice(0, 3); // First 3 enum values
  }

  switch (schema.type) {
    case 'string':
      if (schema.format === 'email') examples.push('user@example.com');
      else if (schema.format === 'url') examples.push('https://example.com');
      else if (schema.format === 'uuid') examples.push('123e4567-e89b-12d3-a456-426614174000');
      else if (schema.format === 'date') examples.push('2024-01-01');
      else if (schema.format === 'time') examples.push('12:30:00');
      else if (schema.pattern) examples.push('[match pattern]');
      else examples.push('example text');
      break;

    case 'number':
    case 'integer':
      const min = schema.minimum ?? schema.exclusiveMinimum ?? 0;
      const max = schema.maximum ?? schema.exclusiveMaximum ?? 100;
      examples.push(Math.floor((min + max) / 2));
      break;

    case 'boolean':
      examples.push(true, false);
      break;

    case 'array':
      if (schema.items) {
        const itemExamples = generatePropertyExamples(schema.items);
        if (itemExamples.length > 0) {
          examples.push([itemExamples[0]]);
        }
      }
      break;

    case 'object':
      examples.push({});
      break;
  }

  return examples;
}

/**
 * Generate suggestions for fixing errors
 */
function generateSuggestions(
  errors: ValidationErrorDetail[],
  schema: JsonSchemaDefinition
): string[] {
  const suggestions: string[] = [];

  // Check for missing required fields
  const missingFields = errors
    .filter(e => e.message.includes('Required') || e.message.includes('required'))
    .map(e => e.field);

  if (missingFields.length > 0) {
    suggestions.push(`Add missing required fields: ${missingFields.join(', ')}`);
  }

  // Check for type errors
  const typeErrors = errors.filter(e => e.message.includes('type') || e.message.includes('Expected'));
  if (typeErrors.length > 0) {
    suggestions.push('Check that all fields have the correct data type (string, number, etc.)');
  }

  // Check for format errors
  const formatErrors = errors.filter(e => e.message.includes('format') || e.message.includes('Invalid'));
  if (formatErrors.length > 0) {
    suggestions.push('Ensure format-specific fields (email, URL, UUID, etc.) match the expected format');
  }

  // Check for range errors
  const rangeErrors = errors.filter(e =>
    e.message.includes('minimum') ||
    e.message.includes('maximum') ||
    e.message.includes('least') ||
    e.message.includes('most')
  );
  if (rangeErrors.length > 0) {
    suggestions.push('Check that numeric values and string lengths are within the allowed range');
  }

  // Check for enum errors
  const enumErrors = errors.filter(e => e.message.includes('enum') || e.message.includes('one of'));
  if (enumErrors.length > 0) {
    suggestions.push('Use only allowed enum values (see the schema for valid options)');
  }

  // General suggestion
  suggestions.push('Review the validExample below for a correctly formatted request');

  return suggestions;
}

/**
 * Generate a valid example based on schema
 */
function generateValidExample(schema: JsonSchemaDefinition): any {
  if (schema.type !== 'object' || !schema.properties) {
    return {};
  }

  const example: any = {};
  const required = new Set(schema.required || []);

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    // Always include required fields, optionally include others
    if (required.has(key) || Math.random() > 0.5) {
      example[key] = generateExampleValue(propSchema);
    }
  }

  return example;
}

/**
 * Generate example value for a schema
 */
function generateExampleValue(schema: JsonSchemaDefinition): any {
  if (schema.default !== undefined) return schema.default;
  if (schema.enum) return schema.enum[0];

  switch (schema.type) {
    case 'string':
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'url') return 'https://example.com';
      if (schema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
      if (schema.format === 'date') return '2024-01-01';
      if (schema.format === 'time') return '12:30:00';
      return 'example';

    case 'number':
      const numMin = schema.minimum ?? schema.exclusiveMinimum ?? 0;
      const numMax = schema.maximum ?? schema.exclusiveMaximum ?? 100;
      return (numMin + numMax) / 2;

    case 'integer':
      const intMin = schema.minimum ?? schema.exclusiveMinimum ?? 0;
      const intMax = schema.maximum ?? schema.exclusiveMaximum ?? 100;
      return Math.floor((intMin + intMax) / 2);

    case 'boolean':
      return true;

    case 'array':
      if (schema.items) {
        return [generateExampleValue(schema.items)];
      }
      return [];

    case 'object':
      if (schema.properties) {
        return generateValidExample(schema);
      }
      return {};

    default:
      return null;
  }
}

/**
 * Format error for LLM consumption
 */
export function formatErrorForLLM(response: LLMFriendlyErrorResponse): string {
  const { error } = response;

  let output = `❌ ${error.summary}\n\n`;

  // Issues section
  output += `## Issues Found:\n\n`;
  error.issues.forEach((issue, i) => {
    output += `${i + 1}. **${issue.field}**: ${issue.problem}\n`;
    output += `   - Received: ${JSON.stringify(issue.received)}\n`;
    output += `   - Expected: ${issue.expected}\n`;
    output += `   - Fix: ${issue.fix}\n\n`;
  });

  // Schema section
  output += `## Tool Schema:\n\n`;
  output += `**Description**: ${error.schema.description}\n\n`;
  output += `**Required fields**: ${error.schema.required.join(', ')}\n\n`;

  output += `**Properties**:\n`;
  for (const [key, prop] of Object.entries(error.schema.properties)) {
    output += `- **${key}** (${prop.type}): ${prop.description}\n`;
    if (prop.constraints.length > 0) {
      output += `  Constraints: ${prop.constraints.join(', ')}\n`;
    }
    if (prop.examples.length > 0) {
      output += `  Examples: ${prop.examples.map(e => JSON.stringify(e)).join(', ')}\n`;
    }
  }

  // Suggestions
  output += `\n## Suggestions:\n\n`;
  error.suggestions.forEach((suggestion, i) => {
    output += `${i + 1}. ${suggestion}\n`;
  });

  // Valid example
  output += `\n## Valid Example:\n\n`;
  output += '```json\n';
  output += JSON.stringify(error.validExample, null, 2);
  output += '\n```\n';

  return output;
}
