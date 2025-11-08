/**
 * Resource Params Handler Tests
 *
 * Tests for the new resource parameter pattern where params are passed as the first argument
 * to resource handlers (matching the tool pattern).
 *
 * Test Coverage:
 * 1. Resources with params field - params passed as first argument
 * 2. Resources without params field - context only (backward compatible)
 * 3. Resources with params AND context
 * 4. Type inference for params
 */

import { describe, expect, test } from '@jest/globals';
import type { IResource, IParam } from '../../src/server/interface-types.js';
import type { ResourceHelper } from '../../src/server/types/helpers.js';

describe('Resource Params Handler - Type Inference', () => {
  test('ResourceHelper infers params type for resources with params field', () => {
    interface UserResource extends IResource {
      uri: 'api://users/{userId}';
      name: 'User by ID';
      description: 'Get user by ID';
      mimeType: 'application/json';
      params: {
        userId: IParam & { type: 'string'; required: true };
      };
      returns: { id: string; name: string };
    }

    // This should compile without errors - params should be inferred as { userId: string }
    const handler: ResourceHelper<UserResource> = async (params) => {
      // TypeScript should infer params.userId as string
      const userId: string = params.userId;
      return { id: userId, name: 'Test User' };
    };

    expect(handler).toBeDefined();
  });

  test('ResourceHelper allows context as second parameter', () => {
    interface UserResource extends IResource {
      uri: 'api://users/{userId}';
      params: {
        userId: IParam & { type: 'string'; required: true };
      };
      returns: { id: string; name: string };
    }

    // Should compile with both params and context
    const handler: ResourceHelper<UserResource> = async (params, context) => {
      const userId: string = params.userId;
      context?.logger?.info(`Getting user: ${userId}`);
      return { id: userId, name: 'Test User' };
    };

    expect(handler).toBeDefined();
  });

  test('ResourceHelper allows just context for resources without params', () => {
    interface StatsResource extends IResource {
      uri: 'stats://server';
      returns: { uptime: number };
    }

    // Should compile with just context (no params field in interface)
    const handler: ResourceHelper<StatsResource> = async (context) => {
      context?.logger?.info('Getting stats');
      return { uptime: process.uptime() };
    };

    expect(handler).toBeDefined();
  });

  test('ResourceHelper allows no parameters for resources without params', () => {
    interface StatsResource extends IResource {
      uri: 'stats://server';
      returns: { uptime: number };
    }

    // Should also compile with no parameters (backward compatible)
    const handler: ResourceHelper<StatsResource> = async () => {
      return { uptime: process.uptime() };
    };

    expect(handler).toBeDefined();
  });

  test('Multiple params are properly typed', () => {
    interface ApiResource extends IResource {
      uri: 'api://v{version}/users/{userId}';
      params: {
        version: IParam & { type: 'string'; required: true };
        userId: IParam & { type: 'string'; required: true };
      };
      returns: { version: string; userId: string; data: string };
    }

    const handler: ResourceHelper<ApiResource> = async (params) => {
      // Both params should be properly typed
      const version: string = params.version;
      const userId: string = params.userId;
      return { version, userId, data: 'test' };
    };

    expect(handler).toBeDefined();
  });

  test('Optional params are properly typed', () => {
    interface SearchResource extends IResource {
      uri: 'search://query';
      params: {
        q: IParam & { type: 'string'; required: true };
        limit: IParam & { type: 'number'; required: false };
      };
      returns: { results: string[] };
    }

    const handler: ResourceHelper<SearchResource> = async (params) => {
      const query: string = params.q;
      const limit: number | undefined = params.limit; // Optional
      return { results: [`Result for ${query}`, `Limit: ${limit || 10}`] };
    };

    expect(handler).toBeDefined();
  });
});

describe('Resource Params Handler - Runtime Behavior', () => {
  test('params are extracted from URI and passed as first argument', async () => {
    // This test verifies the runtime behavior via a mock
    const mockParams = { userId: '123' };

    interface UserResource extends IResource {
      uri: 'api://users/{userId}';
      params: {
        userId: IParam & { type: 'string'; required: true };
      };
      returns: { id: string };
    }

    const handler: ResourceHelper<UserResource> = async (params) => {
      // Verify params are received correctly
      expect(params).toEqual(mockParams);
      return { id: params.userId };
    };

    const result = await handler(mockParams);
    expect(result.id).toBe('123');
  });

  test('context is passed as second argument when resource has params', async () => {
    const mockParams = { userId: '456' };
    const mockContext = {
      logger: { info: jest.fn() },
      mcp: { server: { name: 'test' } },
    };

    interface UserResource extends IResource {
      uri: 'api://users/{userId}';
      params: {
        userId: IParam & { type: 'string'; required: true };
      };
      returns: { id: string };
    }

    const handler: ResourceHelper<UserResource> = async (params, context) => {
      expect(params).toEqual(mockParams);
      expect(context?.logger).toBeDefined();
      expect(context?.mcp?.server?.name).toBe('test');
      return { id: params.userId };
    };

    const result = await handler(mockParams, mockContext as any);
    expect(result.id).toBe('456');
  });

  test('backward compatibility - resources without params get context only', async () => {
    const mockContext = {
      logger: { info: jest.fn() },
    };

    interface StatsResource extends IResource {
      uri: 'stats://server';
      returns: { uptime: number };
    }

    const handler: ResourceHelper<StatsResource> = async (context) => {
      expect(context?.logger).toBeDefined();
      return { uptime: 100 };
    };

    const result = await handler(mockContext as any);
    expect(result.uptime).toBe(100);
  });
});

describe('Resource Params Handler - Pattern Comparison', () => {
  test('NEW PATTERN: params as first argument (clean)', () => {
    interface PokemonResource extends IResource {
      uri: 'pokemon://{name}';
      params: {
        name: IParam & { type: 'string'; required: true };
      };
      returns: { name: string; type: string };
    }

    // NEW: Clean, typed access to params
    const newPattern: ResourceHelper<PokemonResource> = async (params) => {
      const name = params.name; // Direct access, fully typed!
      return { name, type: 'electric' };
    };

    expect(newPattern).toBeDefined();
  });

  test('OLD PATTERN: params via context metadata (deprecated but still works)', () => {
    interface PokemonResource extends IResource {
      uri: 'pokemon://{name}';
      returns: { name: string; type: string };
    }

    // OLD: Janky nested access (still works for backward compat)
    const oldPattern: ResourceHelper<PokemonResource> = async (context) => {
      const params = context?.metadata?.['params'] as Record<string, string> | undefined;
      const name = params?.name || 'unknown'; // Nested optional chaining
      return { name, type: 'electric' };
    };

    expect(oldPattern).toBeDefined();
  });
});
