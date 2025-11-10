/**
 * Tests for Tool Wrapper System
 *
 * Validates wrapper creation, parameter validation, tool invocation,
 * result extraction, and security measures.
 */

import { describe, it, expect, jest } from '@jest/globals';
import {
  createToolWrappers,
} from '../../../../src/features/code-execution/tool-injection/tool-wrapper.js';
import type { InternalTool } from '../../../../src/features/code-execution/tool-injection/type-generator.js';
import { z } from 'zod';

describe('Tool Wrapper System', () => {
  describe('Wrapper Creation', () => {
    it('creates wrappers for single tool', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('greet', {
        definition: {
          name: 'greet',
          description: 'Greet user',
          parameters: z.object({ name: z.string() }),
          execute: async () => ({ content: [{ type: 'text', text: 'Hello' }] }),
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      expect(wrappers.greet).toBeDefined();
      expect(typeof wrappers.greet).toBe('function');
    });

    it('creates wrappers for multiple tools', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('get_weather', {
        definition: {
          name: 'get_weather',
          description: 'Get weather',
          parameters: z.object({ city: z.string() }),
          execute: async () => ({ content: [{ type: 'text', text: 'Sunny' }] }),
        },
        jsonSchema: {},
      });
      tools.set('send_email', {
        definition: {
          name: 'send_email',
          description: 'Send email',
          parameters: z.object({ to: z.string() }),
          execute: async () => ({ content: [{ type: 'text', text: 'Sent' }] }),
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      expect(wrappers.getWeather).toBeDefined();
      expect(wrappers.sendEmail).toBeDefined();
    });

    it('excludes tool_runner by default', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('tool_runner', {
        definition: {
          name: 'tool_runner',
          description: 'Run code',
          parameters: z.object({ code: z.string() }),
          execute: async () => null,
        },
        jsonSchema: {},
      });
      tools.set('safe_tool', {
        definition: {
          name: 'safe_tool',
          description: 'Safe',
          parameters: z.object({}),
          execute: async () => 'ok',
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      expect(wrappers.toolRunner).toBeUndefined();
      expect(wrappers.safeTool).toBeDefined();
    });

    it('excludes execute-code by default', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('execute-code', {
        definition: {
          name: 'execute-code',
          description: 'Run code',
          parameters: z.object({ code: z.string() }),
          execute: async () => null,
        },
        jsonSchema: {},
      });
      tools.set('safe_tool', {
        definition: {
          name: 'safe_tool',
          description: 'Safe',
          parameters: z.object({}),
          execute: async () => 'ok',
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      expect(wrappers.executeCode).toBeUndefined();
      expect(wrappers.safeTool).toBeDefined();
    });

    it('returns empty object for empty tools Map', () => {
      const tools = new Map<string, InternalTool>();
      const wrappers = createToolWrappers(tools, {});
      expect(Object.keys(wrappers).length).toBe(0);
    });
  });

  describe('Parameter Validation', () => {
    it('validates correct params successfully', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('greet', {
        definition: {
          name: 'greet',
          description: 'Greet user',
          parameters: z.object({ name: z.string() }),
          execute: async (params: any) => ({ content: [{ type: 'text', text: `Hello ${params.name}` }] }),
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      const result = await wrappers.greet({ name: 'Alice' });
      expect(result).toBe('Hello Alice');
    });

    it('throws error on invalid params', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('greet', {
        definition: {
          name: 'greet',
          description: 'Greet user',
          parameters: z.object({ name: z.string() }),
          execute: async () => 'Hello',
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      await expect(wrappers.greet({ name: 123 })).rejects.toThrow();
    });

    it('throws error on missing required param', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('greet', {
        definition: {
          name: 'greet',
          description: 'Greet user',
          parameters: z.object({ name: z.string() }),
          execute: async () => 'Hello',
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      await expect(wrappers.greet({})).rejects.toThrow();
    });

    it('allows extra params (Zod strips them)', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('greet', {
        definition: {
          name: 'greet',
          description: 'Greet user',
          parameters: z.object({ name: z.string() }),
          execute: async (params: any) => ({ content: [{ type: 'text', text: `Hello ${params.name}` }] }),
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      const result = await wrappers.greet({ name: 'Bob', extra: 'ignored' });
      expect(result).toBe('Hello Bob');
    });

    it('throws error on type mismatch', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('add', {
        definition: {
          name: 'add',
          description: 'Add numbers',
          parameters: z.object({ a: z.number(), b: z.number() }),
          execute: async () => ({ content: [{ type: 'text', text: '0' }] }),
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      await expect(wrappers.add({ a: 'not a number', b: 5 })).rejects.toThrow();
    });
  });

  describe('Tool Invocation', () => {
    it('successful tool call returns result', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('get_value', {
        definition: {
          name: 'get_value',
          description: 'Get value',
          parameters: z.object({}),
          execute: async () => ({ content: [{ type: 'text', text: '42' }] }),
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      const result = await wrappers.getValue({});
      expect(result).toBe('42');
    });

    it('tool handler receives validated params', async () => {
      let receivedParams: any = null;
      const tools = new Map<string, InternalTool>();
      tools.set('echo', {
        definition: {
          name: 'echo',
          description: 'Echo params',
          parameters: z.object({ message: z.string() }),
          execute: async (params: any) => {
            receivedParams = params;
            return { content: [{ type: 'text', text: params.message }] };
          },
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      await wrappers.echo({ message: 'test' });
      expect(receivedParams).toEqual({ message: 'test' });
    });

    it('tool handler receives context', async () => {
      let receivedContext: any = null;
      const mockContext = { sessionId: '123', metadata: {} };
      const tools = new Map<string, InternalTool>();
      tools.set('context_test', {
        definition: {
          name: 'context_test',
          description: 'Test context',
          parameters: z.object({}),
          execute: async (_params: any, context: any) => {
            receivedContext = context;
            return { content: [{ type: 'text', text: 'ok' }] };
          },
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, mockContext);
      await wrappers.contextTest({});
      expect(receivedContext).toBe(mockContext);
    });

    it('tool error is wrapped with tool name', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('fail_tool', {
        definition: {
          name: 'fail_tool',
          description: 'Fails',
          parameters: z.object({}),
          execute: async () => {
            throw new Error('Something went wrong');
          },
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      await expect(wrappers.failTool({})).rejects.toThrow("Tool 'fail_tool' failed");
      await expect(wrappers.failTool({})).rejects.toThrow('Something went wrong');
    });

    it('async tool completes correctly', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('async_tool', {
        definition: {
          name: 'async_tool',
          description: 'Async operation',
          parameters: z.object({}),
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return { content: [{ type: 'text', text: 'done' }] };
          },
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      const result = await wrappers.asyncTool({});
      expect(result).toBe('done');
    });
  });

  describe('Result Extraction', () => {
    it('extracts MCP text content', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('text_tool', {
        definition: {
          name: 'text_tool',
          description: 'Returns text',
          parameters: z.object({}),
          execute: async () => ({ content: [{ type: 'text', text: 'Hello World' }] }),
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      const result = await wrappers.textTool({});
      expect(result).toBe('Hello World');
    });

    it('parses MCP JSON text content', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('json_tool', {
        definition: {
          name: 'json_tool',
          description: 'Returns JSON',
          parameters: z.object({}),
          execute: async () => ({ content: [{ type: 'text', text: '{"value": 42}' }] }),
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      const result = await wrappers.jsonTool({});
      expect(result).toEqual({ value: 42 });
    });

    it('extracts MCP resource content', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('resource_tool', {
        definition: {
          name: 'resource_tool',
          description: 'Returns resource',
          parameters: z.object({}),
          execute: async () => ({
            content: [{ type: 'text', text: JSON.stringify({ uri: 'file://test', data: 'content' }) }],
          }),
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      const result = await wrappers.resourceTool({});
      expect(result).toEqual({ uri: 'file://test', data: 'content' }); // Parsed from JSON string
    });

    it('returns array for multiple content items', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('multi_tool', {
        definition: {
          name: 'multi_tool',
          description: 'Returns multiple items',
          parameters: z.object({}),
          execute: async () => ({
            content: [
              { type: 'text', text: 'First' },
              { type: 'text', text: 'Second' },
            ],
          }),
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      const result = await wrappers.multiTool({});
      expect(result).toEqual(['First', 'Second']);
    });
  });

  describe('Serialization', () => {
    it('allows JSON-serializable result', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('json_result', {
        definition: {
          name: 'json_result',
          description: 'Returns object',
          parameters: z.object({}),
          execute: async () => ({ content: [{ type: 'text', text: '{"a": 1, "b": "test"}' }] }),
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      const result = await wrappers.jsonResult({});
      expect(result).toEqual({ a: 1, b: 'test' });
    });

    it('throws error for non-serializable result (circular reference)', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('circular_tool', {
        definition: {
          name: 'circular_tool',
          description: 'Returns circular',
          parameters: z.object({}),
          execute: async () => {
            const obj: any = {};
            obj.self = obj; // circular reference
            return obj;
          },
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      await expect(wrappers.circularTool({})).rejects.toThrow('JSON-serializable');
    });

    it('handles primitive results', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('number_tool', {
        definition: {
          name: 'number_tool',
          description: 'Returns number',
          parameters: z.object({}),
          execute: async () => ({ content: [{ type: 'text', text: '42' }] }),
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      const result = await wrappers.numberTool({});
      expect(result).toBe('42');
    });
  });

  describe('Security', () => {
    it('wrapper functions are frozen', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('test_tool', {
        definition: {
          name: 'test_tool',
          description: 'Test',
          parameters: z.object({}),
          execute: async () => 'ok',
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      expect(Object.isFrozen(wrappers.testTool)).toBe(true);
    });

    it('cannot modify wrapper after creation', () => {
      const tools = new Map<string, InternalTool>();
      tools.set('test_tool', {
        definition: {
          name: 'test_tool',
          description: 'Test',
          parameters: z.object({}),
          execute: async () => 'ok',
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, {});
      expect(() => {
        (wrappers.testTool as any).malicious = 'code';
      }).toThrow();
    });

    it('context is not exposed in sandbox', () => {
      // This is implicit - we only pass context to execute, not to wrapper
      const tools = new Map<string, InternalTool>();
      tools.set('test_tool', {
        definition: {
          name: 'test_tool',
          description: 'Test',
          parameters: z.object({}),
          execute: async () => 'ok',
        },
        jsonSchema: {},
      });

      const wrappers = createToolWrappers(tools, { secret: 'hidden' });
      // Wrapper should not have access to context outside of execute call
      expect((wrappers.testTool as any).context).toBeUndefined();
    });
  });
});
