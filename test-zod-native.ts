#!/usr/bin/env node
/**
 * Test Zod v4's native z.toJSONSchema() function
 */

import { z } from 'zod';

// Test 1: Simple object schema
console.log('=== Test 1: Simple object schema ===');
const simpleSchema = z.object({
  name: z.string().describe('The name of the person'),
  age: z.number().describe('The age of the person'),
});

console.log('Zod schema:', simpleSchema);
console.log('\nJSON Schema (default):');
console.log(JSON.stringify(z.toJSONSchema(simpleSchema), null, 2));

console.log('\nJSON Schema (OpenAPI 3.0):');
console.log(JSON.stringify(z.toJSONSchema(simpleSchema, { target: 'openapi-3.0' }), null, 2));

// Test 2: Schema with optional and default values
console.log('\n\n=== Test 2: Optional and default values ===');
const optionalSchema = z.object({
  shape: z.string().describe('Shape type (circle, rectangle, triangle)'),
  dimension1: z.number().describe('First dimension'),
  dimension2: z.number().optional().describe('Second dimension (optional)'),
  precision: z.number().default(2).describe('Decimal precision for result'),
});

console.log('JSON Schema (default):');
console.log(JSON.stringify(z.toJSONSchema(optionalSchema), null, 2));

console.log('\nJSON Schema (OpenAPI 3.0):');
console.log(JSON.stringify(z.toJSONSchema(optionalSchema, { target: 'openapi-3.0' }), null, 2));

// Test 3: Complex schema with arrays and nested objects
console.log('\n\n=== Test 3: Complex nested schema ===');
const complexSchema = z.object({
  measurements: z.array(z.number()).describe('Array of measurements'),
  metadata: z.object({
    unit: z.string(),
    timestamp: z.date(),
  }).passthrough().describe('Measurement metadata'),
  isValid: z.boolean().describe('Whether the measurement is valid'),
});

console.log('JSON Schema (default):');
console.log(JSON.stringify(z.toJSONSchema(complexSchema), null, 2));

console.log('\n\n=== Test 4: Available options ===');
console.log('Checking available targets...');
const targets = ['draft-4', 'draft-7', 'draft-2020-12', 'openapi-3.0', 'openapi-3.1'];
for (const target of targets) {
  try {
    const result = z.toJSONSchema(simpleSchema, { target: target as any });
    console.log(`✓ Target '${target}' works`);
  } catch (err) {
    console.log(`✗ Target '${target}' failed:`, (err as Error).message);
  }
}
