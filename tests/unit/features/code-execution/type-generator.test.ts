/**
 * Tests for TypeScript Type Declaration Generator
 *
 * Validates type generation for all IParam types and edge cases.
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateTypeDeclarations,
  convertParamToTSType,
  snakeToCamel,
  camelToSnake,
  type InternalTool,
} from '../../../../src/features/code-execution/tool-injection/type-generator.js';
import type { IParam } from '../../../../src/server/types/params.js';
import { z } from 'zod';

describe('Type Generator', () => {
  describe('Name Transformation', () => {
    it('converts snake_case to camelCase', () => {
      expect(snakeToCamel('get_weather')).toBe('getWeather');
      expect(snakeToCamel('send_email')).toBe('sendEmail');
      expect(snakeToCamel('get_user_by_id')).toBe('getUserById');
    });

    it('handles single word', () => {
      expect(snakeToCamel('hello')).toBe('hello');
      expect(snakeToCamel('test')).toBe('test');
    });

    it('handles multiple underscores', () => {
      expect(snakeToCamel('get_user_by_email_address')).toBe('getUserByEmailAddress');
    });

    it('converts camelCase to snake_case', () => {
      expect(camelToSnake('getWeather')).toBe('get_weather');
      expect(camelToSnake('sendEmail')).toBe('send_email');
      expect(camelToSnake('getUserById')).toBe('get_user_by_id');
    });

    it('handles single word for camelToSnake', () => {
      expect(camelToSnake('hello')).toBe('hello');
      expect(camelToSnake('test')).toBe('test');
    });
  });

  describe('Primitive Types (IParam)', () => {
    it('converts string type', () => {
      const param: IParam = { type: 'string', description: 'A string' };
      expect(convertParamToTSType(param)).toBe('string');
    });

    it('converts number type', () => {
      const param: IParam = { type: 'number', description: 'A number' };
      expect(convertParamToTSType(param)).toBe('number');
    });

    it('converts integer type', () => {
      const param: IParam = { type: 'integer', description: 'An integer' };
      expect(convertParamToTSType(param)).toBe('number');
    });

    it('converts boolean type', () => {
      const param: IParam = { type: 'boolean', description: 'A boolean' };
      expect(convertParamToTSType(param)).toBe('boolean');
    });

    it('converts null type', () => {
      const param: IParam = { type: 'null', description: 'Null value' };
      expect(convertParamToTSType(param)).toBe('null');
    });

    it('handles unknown type with fallback to any', () => {
      const param: any = { type: 'unknown', description: 'Unknown' };
      expect(convertParamToTSType(param)).toBe('any');
    });
  });

  describe('Array Types (IParam)', () => {
    it('converts array of strings', () => {
      const param: IParam = {
        type: 'array',
        description: 'String array',
        items: { type: 'string', description: 'Item' },
      };
      expect(convertParamToTSType(param)).toBe('Array<string>');
    });

    it('converts array of numbers', () => {
      const param: IParam = {
        type: 'array',
        description: 'Number array',
        items: { type: 'number', description: 'Item' },
      };
      expect(convertParamToTSType(param)).toBe('Array<number>');
    });

    it('converts array of objects', () => {
      const param: IParam = {
        type: 'array',
        description: 'Object array',
        items: {
          type: 'object',
          description: 'Item',
          properties: {
            name: { type: 'string', description: 'Name' },
            age: { type: 'integer', description: 'Age' },
          },
        },
      };
      expect(convertParamToTSType(param)).toBe('Array<{ name: string; age: number }>');
    });

    it('converts nested arrays', () => {
      const param: IParam = {
        type: 'array',
        description: 'Nested array',
        items: {
          type: 'array',
          description: 'Inner array',
          items: { type: 'string', description: 'Item' },
        },
      };
      expect(convertParamToTSType(param)).toBe('Array<Array<string>>');
    });

    it('handles array without items as Array<any>', () => {
      const param: IParam = {
        type: 'array',
        description: 'Generic array',
      };
      expect(convertParamToTSType(param)).toBe('Array<any>');
    });
  });

  describe('Object Types (IParam)', () => {
    it('converts simple object', () => {
      const param: IParam = {
        type: 'object',
        description: 'User',
        properties: {
          name: { type: 'string', description: 'Name' },
          age: { type: 'number', description: 'Age' },
        },
      };
      expect(convertParamToTSType(param)).toBe('{ name: string; age: number }');
    });

    it('converts nested object', () => {
      const param: IParam = {
        type: 'object',
        description: 'Person',
        properties: {
          name: { type: 'string', description: 'Name' },
          address: {
            type: 'object',
            description: 'Address',
            properties: {
              street: { type: 'string', description: 'Street' },
              city: { type: 'string', description: 'City' },
            },
          },
        },
      };
      expect(convertParamToTSType(param)).toBe(
        '{ name: string; address: { street: string; city: string } }'
      );
    });

    it('handles optional fields', () => {
      const param: IParam = {
        type: 'object',
        description: 'User',
        properties: {
          name: { type: 'string', description: 'Name', required: true },
          email: { type: 'string', description: 'Email', required: false },
        },
      };
      expect(convertParamToTSType(param)).toBe('{ name: string; email?: string }');
    });

    it('handles object without properties as Record<string, any>', () => {
      const param: IParam = {
        type: 'object',
        description: 'Generic object',
      };
      expect(convertParamToTSType(param)).toBe('Record<string, any>');
    });

    it('handles object with mixed types', () => {
      const param: IParam = {
        type: 'object',
        description: 'Mixed',
        properties: {
          id: { type: 'integer', description: 'ID' },
          name: { type: 'string', description: 'Name' },
          active: { type: 'boolean', description: 'Active' },
          tags: {
            type: 'array',
            description: 'Tags',
            items: { type: 'string', description: 'Tag' },
          },
        },
      };
      expect(convertParamToTSType(param)).toBe(
        '{ id: number; name: string; active: boolean; tags: Array<string> }'
      );
    });
  });

  describe('Enum Types (IParam)', () => {
    it('converts string enum to literal union', () => {
      const param: IParam = {
        type: 'string',
        description: 'Status',
        enum: ['pending', 'active', 'completed'],
      };
      expect(convertParamToTSType(param)).toBe("'pending' | 'active' | 'completed'");
    });

    it('converts number enum to literal union', () => {
      const param: IParam = {
        type: 'integer',
        description: 'Level',
        enum: ['1', '2', '3'],
      };
      expect(convertParamToTSType(param)).toBe("'1' | '2' | '3'");
    });

    it('handles empty enum array', () => {
      const param: IParam = {
        type: 'string',
        description: 'Empty enum',
        enum: [],
      };
      // Should fall back to base type
      expect(convertParamToTSType(param)).toBe('string');
    });
  });

  describe('Function Generation (JSON Schema)', () => {
    it('generates declaration for simple tool', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('greet', {
        definition: {
          name: 'greet',
          description: 'Greet a user',
          parameters: z.object({ name: z.string() }),
          execute: async () => 'Hello',
        },
        jsonSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'User name' },
          },
          required: ['name'],
        },
      });

      const declarations = generateTypeDeclarations(tools);
      expect(declarations).toContain('declare function greet');
      expect(declarations).toContain('Promise<any>');
      expect(declarations).toContain('name: string');
    });

    it('generates declaration for tool with multiple params', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('add_numbers', {
        definition: {
          name: 'add_numbers',
          description: 'Add two numbers',
          parameters: z.object({ a: z.number(), b: z.number() }),
          execute: async () => ({ content: [{ type: 'text', text: '42' }] }),
        },
        jsonSchema: {
          type: 'object',
          properties: {
            a: { type: 'number', description: 'First number' },
            b: { type: 'number', description: 'Second number' },
          },
          required: ['a', 'b'],
        },
      });

      const declarations = generateTypeDeclarations(tools);
      expect(declarations).toContain('declare function addNumbers');
      expect(declarations).toContain('a: number');
      expect(declarations).toContain('b: number');
    });

    it('generates declaration for tool with no params', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('get_time', {
        definition: {
          name: 'get_time',
          description: 'Get current time',
          parameters: z.object({}),
          execute: async () => ({ content: [{ type: 'text', text: Date.now().toString() }] }),
        },
        jsonSchema: {
          type: 'object',
          properties: {},
        },
      });

      const declarations = generateTypeDeclarations(tools);
      expect(declarations).toContain('declare function getTime');
      expect(declarations).toContain('params: {}');
    });

    it('generates declaration for tool with optional params', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('send_email', {
        definition: {
          name: 'send_email',
          description: 'Send an email',
          parameters: z.object({
            to: z.string(),
            subject: z.string().optional(),
          }),
          execute: async () => ({ content: [{ type: 'text', text: 'Sent' }] }),
        },
        jsonSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient' },
            subject: { type: 'string', description: 'Email subject' },
          },
          required: ['to'],
        },
      });

      const declarations = generateTypeDeclarations(tools);
      expect(declarations).toContain('declare function sendEmail');
      expect(declarations).toContain('to: string');
      expect(declarations).toContain('subject?: string');
    });

    it('includes JSDoc comments with descriptions', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('calculate', {
        definition: {
          name: 'calculate',
          description: 'Perform a calculation',
          parameters: z.object({ value: z.number() }),
          execute: async () => ({ content: [{ type: 'text', text: '0' }] }),
        },
        jsonSchema: {
          type: 'object',
          properties: {
            value: { type: 'number', description: 'Input value' },
          },
        },
      });

      const declarations = generateTypeDeclarations(tools);
      expect(declarations).toContain('/**');
      expect(declarations).toContain('* Perform a calculation');
      expect(declarations).toContain('*/');
    });
  });

  describe('Security (Exclusion)', () => {
    it('excludes tool_runner by default', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('tool_runner', {
        definition: {
          name: 'tool_runner',
          description: 'Execute code',
          parameters: z.object({ code: z.string() }),
          execute: async () => null,
        },
        jsonSchema: { type: 'object', properties: {} },
      });
      tools.set('safe_tool', {
        definition: {
          name: 'safe_tool',
          description: 'A safe tool',
          parameters: z.object({}),
          execute: async () => null,
        },
        jsonSchema: { type: 'object', properties: {} },
      });

      const declarations = generateTypeDeclarations(tools);
      expect(declarations).not.toContain('toolRunner');
      expect(declarations).toContain('safeTool');
    });

    it('excludes execute-code by default', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('execute-code', {
        definition: {
          name: 'execute-code',
          description: 'Execute code',
          parameters: z.object({ code: z.string() }),
          execute: async () => null,
        },
        jsonSchema: { type: 'object', properties: {} },
      });
      tools.set('safe_tool', {
        definition: {
          name: 'safe_tool',
          description: 'A safe tool',
          parameters: z.object({}),
          execute: async () => null,
        },
        jsonSchema: { type: 'object', properties: {} },
      });

      const declarations = generateTypeDeclarations(tools);
      expect(declarations).not.toContain('executeCode');
      expect(declarations).toContain('safeTool');
    });

    it('includes tool_runner when exclusion disabled', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('tool_runner', {
        definition: {
          name: 'tool_runner',
          description: 'Execute code',
          parameters: z.object({ code: z.string() }),
          execute: async () => null,
        },
        jsonSchema: { type: 'object', properties: {} },
      });

      const declarations = generateTypeDeclarations(tools, false);
      expect(declarations).toContain('toolRunner');
    });
  });

  describe('Edge Cases', () => {
    it('returns empty string for empty tools Map', () => {
      const tools = new Map<string, InternalTool>();
      const declarations = generateTypeDeclarations(tools);
      expect(declarations).toBe('');
    });

    it('handles tool with no description', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('no_desc', {
        definition: {
          name: 'no_desc',
          description: '',
          parameters: z.object({}),
          execute: async () => null,
        },
        jsonSchema: { type: 'object', properties: {} },
      });

      const declarations = generateTypeDeclarations(tools);
      expect(declarations).toContain('declare function noDesc');
    });

    it('handles multiple tools', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('tool_one', {
        definition: {
          name: 'tool_one',
          description: 'First tool',
          parameters: z.object({}),
          execute: async () => null,
        },
        jsonSchema: { type: 'object', properties: {} },
      });
      tools.set('tool_two', {
        definition: {
          name: 'tool_two',
          description: 'Second tool',
          parameters: z.object({}),
          execute: async () => null,
        },
        jsonSchema: { type: 'object', properties: {} },
      });

      const declarations = generateTypeDeclarations(tools);
      expect(declarations).toContain('declare function toolOne');
      expect(declarations).toContain('declare function toolTwo');
    });
  });
});
