/**
 * Unit tests for buildSchemaFromMetadata function
 *
 * Tests the conversion of bundle manifest parameter schemas to Zod schemas
 */

import { buildSchemaFromMetadata } from '../../src/server/adapter.js';
import type { ParameterSchema } from '../../src/core/bundle-manifest.js';
import { z } from 'zod';

describe('buildSchemaFromMetadata', () => {
  describe('Basic types', () => {
    it('should build string schema', () => {
      const params: Record<string, ParameterSchema> = {
        name: { type: 'string', required: true },
      };

      const schema = buildSchemaFromMetadata(params);

      // Test valid input
      expect(() => schema.parse({ name: 'Alice' })).not.toThrow();

      // Test invalid input (wrong type)
      expect(() => schema.parse({ name: 123 })).toThrow();

      // Test missing required field
      expect(() => schema.parse({})).toThrow();
    });

    it('should build number schema', () => {
      const params: Record<string, ParameterSchema> = {
        age: { type: 'number', required: true },
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({ age: 25 })).not.toThrow();
      expect(() => schema.parse({ age: 25.5 })).not.toThrow();
      expect(() => schema.parse({ age: '25' })).toThrow();
    });

    it('should build integer schema', () => {
      const params: Record<string, ParameterSchema> = {
        count: { type: 'integer', required: true },
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({ count: 5 })).not.toThrow();
      expect(() => schema.parse({ count: 5.5 })).toThrow(); // Not an integer
    });

    it('should build boolean schema', () => {
      const params: Record<string, ParameterSchema> = {
        active: { type: 'boolean', required: true },
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({ active: true })).not.toThrow();
      expect(() => schema.parse({ active: false })).not.toThrow();
      expect(() => schema.parse({ active: 'true' })).toThrow();
    });

    it('should build array schema', () => {
      const params: Record<string, ParameterSchema> = {
        tags: { type: 'array', required: true },
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({ tags: [] })).not.toThrow();
      expect(() => schema.parse({ tags: ['a', 'b'] })).not.toThrow();
      expect(() => schema.parse({ tags: 'not-array' })).toThrow();
    });

    it('should build object schema', () => {
      const params: Record<string, ParameterSchema> = {
        config: { type: 'object', required: true },
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({ config: {} })).not.toThrow();
      expect(() => schema.parse({ config: { key: 'value' } })).toThrow(); // strict mode
    });
  });

  describe('Optional fields', () => {
    it('should make fields optional when required is false', () => {
      const params: Record<string, ParameterSchema> = {
        name: { type: 'string', required: false },
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({})).not.toThrow(); // Missing optional field is OK
      expect(() => schema.parse({ name: 'Alice' })).not.toThrow();
    });

    it('should make fields optional when required is undefined', () => {
      const params: Record<string, ParameterSchema> = {
        name: { type: 'string' }, // required not specified
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({})).not.toThrow();
    });
  });

  describe('String constraints', () => {
    it('should enforce minLength', () => {
      const params: Record<string, ParameterSchema> = {
        name: { type: 'string', required: true, minLength: 3 },
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({ name: 'ab' })).toThrow();
      expect(() => schema.parse({ name: 'abc' })).not.toThrow();
    });

    it('should enforce maxLength', () => {
      const params: Record<string, ParameterSchema> = {
        name: { type: 'string', required: true, maxLength: 5 },
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({ name: 'abcdef' })).toThrow();
      expect(() => schema.parse({ name: 'abcde' })).not.toThrow();
    });

    it('should enforce pattern', () => {
      const params: Record<string, ParameterSchema> = {
        email: { type: 'string', required: true, pattern: '^[a-z]+@[a-z]+\\.[a-z]+$' },
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({ email: 'test@example.com' })).not.toThrow();
      expect(() => schema.parse({ email: 'invalid-email' })).toThrow();
    });

    it('should enforce enum', () => {
      const params: Record<string, ParameterSchema> = {
        status: { type: 'string', required: true, enum: ['active', 'inactive', 'pending'] },
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({ status: 'active' })).not.toThrow();
      expect(() => schema.parse({ status: 'invalid' })).toThrow();
    });
  });

  describe('Number constraints', () => {
    it('should enforce min for number', () => {
      const params: Record<string, ParameterSchema> = {
        age: { type: 'number', required: true, min: 0 },
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({ age: -1 })).toThrow();
      expect(() => schema.parse({ age: 0 })).not.toThrow();
    });

    it('should enforce max for number', () => {
      const params: Record<string, ParameterSchema> = {
        age: { type: 'number', required: true, max: 100 },
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({ age: 101 })).toThrow();
      expect(() => schema.parse({ age: 100 })).not.toThrow();
    });

    it('should enforce min and max for integer', () => {
      const params: Record<string, ParameterSchema> = {
        rating: { type: 'integer', required: true, min: 1, max: 5 },
      };

      const schema = buildSchemaFromMetadata(params);

      expect(() => schema.parse({ rating: 0 })).toThrow();
      expect(() => schema.parse({ rating: 3 })).not.toThrow();
      expect(() => schema.parse({ rating: 6 })).toThrow();
    });
  });

  describe('Descriptions', () => {
    it('should preserve description metadata', () => {
      const params: Record<string, ParameterSchema> = {
        name: { type: 'string', required: true, description: 'User name' },
      };

      const schema = buildSchemaFromMetadata(params);

      // Valid input should work regardless of description
      expect(() => schema.parse({ name: 'Alice' })).not.toThrow();
    });
  });

  describe('Strict mode', () => {
    it('should reject extra fields (strict mode)', () => {
      const params: Record<string, ParameterSchema> = {
        name: { type: 'string', required: true },
      };

      const schema = buildSchemaFromMetadata(params);

      // Extra field should be rejected
      expect(() => schema.parse({ name: 'Alice', extra: 'field' })).toThrow();
    });
  });

  describe('Complex schemas', () => {
    it('should build schema with multiple fields of different types', () => {
      const params: Record<string, ParameterSchema> = {
        name: { type: 'string', required: true, minLength: 2 },
        age: { type: 'integer', required: true, min: 0, max: 150 },
        email: { type: 'string', required: false, pattern: '^.+@.+\\..+$' },
        active: { type: 'boolean', required: false },
      };

      const schema = buildSchemaFromMetadata(params);

      // Valid input
      expect(() => schema.parse({
        name: 'Alice',
        age: 30,
        email: 'alice@example.com',
        active: true,
      })).not.toThrow();

      // Missing optional fields
      expect(() => schema.parse({
        name: 'Bob',
        age: 25,
      })).not.toThrow();

      // Invalid input
      expect(() => schema.parse({
        name: 'A', // Too short
        age: 30,
      })).toThrow();
    });
  });

  describe('Phase 2: Nested objects', () => {
    it('should build nested object schema with properties', () => {
      const params: Record<string, ParameterSchema> = {
        user: {
          type: 'object',
          required: true,
          properties: {
            name: { type: 'string', required: true },
            age: { type: 'number', required: false },
          },
        },
      };

      const schema = buildSchemaFromMetadata(params);

      // Valid nested object
      expect(() => schema.parse({
        user: { name: 'Alice', age: 30 },
      })).not.toThrow();

      // Missing optional nested field
      expect(() => schema.parse({
        user: { name: 'Bob' },
      })).not.toThrow();

      // Missing required nested field
      expect(() => schema.parse({
        user: { age: 25 },
      })).toThrow();

      // Extra field in nested object (strict mode)
      expect(() => schema.parse({
        user: { name: 'Charlie', extra: 'field' },
      })).toThrow();
    });

    it('should handle deeply nested objects', () => {
      const params: Record<string, ParameterSchema> = {
        config: {
          type: 'object',
          required: true,
          properties: {
            database: {
              type: 'object',
              required: true,
              properties: {
                host: { type: 'string', required: true },
                port: { type: 'integer', required: true, min: 1, max: 65535 },
              },
            },
          },
        },
      };

      const schema = buildSchemaFromMetadata(params);

      // Valid deeply nested object
      expect(() => schema.parse({
        config: {
          database: {
            host: 'localhost',
            port: 5432,
          },
        },
      })).not.toThrow();

      // Invalid port (out of range)
      expect(() => schema.parse({
        config: {
          database: {
            host: 'localhost',
            port: 99999,
          },
        },
      })).toThrow();
    });
  });

  describe('Phase 2: Typed arrays', () => {
    it('should build typed array schema with items', () => {
      const params: Record<string, ParameterSchema> = {
        tags: {
          type: 'array',
          required: true,
          items: { type: 'string', required: true },
        },
      };

      const schema = buildSchemaFromMetadata(params);

      // Valid string array
      expect(() => schema.parse({ tags: ['a', 'b', 'c'] })).not.toThrow();
      expect(() => schema.parse({ tags: [] })).not.toThrow();

      // Invalid: number in string array
      expect(() => schema.parse({ tags: ['a', 123, 'c'] })).toThrow();
    });

    it('should build array of objects', () => {
      const params: Record<string, ParameterSchema> = {
        users: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            required: true,
            properties: {
              name: { type: 'string', required: true },
              age: { type: 'number', required: false },
            },
          },
        },
      };

      const schema = buildSchemaFromMetadata(params);

      // Valid array of objects
      expect(() => schema.parse({
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob' },
        ],
      })).not.toThrow();

      // Invalid: missing required field in array item
      expect(() => schema.parse({
        users: [
          { age: 30 }, // Missing name
        ],
      })).toThrow();
    });

    it('should build array with constrained items', () => {
      const params: Record<string, ParameterSchema> = {
        scores: {
          type: 'array',
          required: true,
          items: {
            type: 'integer',
            required: true,
            min: 0,
            max: 100,
          },
        },
      };

      const schema = buildSchemaFromMetadata(params);

      // Valid scores
      expect(() => schema.parse({ scores: [85, 90, 75] })).not.toThrow();

      // Invalid: score out of range
      expect(() => schema.parse({ scores: [85, 150, 75] })).toThrow();

      // Invalid: float instead of integer
      expect(() => schema.parse({ scores: [85.5, 90, 75] })).toThrow();
    });
  });

  describe('Phase 2: Complex nested structures', () => {
    it('should handle array of nested objects with arrays', () => {
      const params: Record<string, ParameterSchema> = {
        projects: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            required: true,
            properties: {
              name: { type: 'string', required: true },
              tags: {
                type: 'array',
                required: false,
                items: { type: 'string', required: true },
              },
            },
          },
        },
      };

      const schema = buildSchemaFromMetadata(params);

      // Valid complex structure
      expect(() => schema.parse({
        projects: [
          { name: 'Project A', tags: ['urgent', 'backend'] },
          { name: 'Project B' }, // No tags
          { name: 'Project C', tags: [] }, // Empty tags
        ],
      })).not.toThrow();

      // Invalid: wrong type in nested array
      expect(() => schema.parse({
        projects: [
          { name: 'Project A', tags: ['urgent', 123] },
        ],
      })).toThrow();
    });
  });
});
