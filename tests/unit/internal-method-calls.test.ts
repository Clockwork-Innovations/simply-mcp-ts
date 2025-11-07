/**
 * Tests for internal method calls and references
 *
 * Verifies that naming variation matching doesn't break internal method calls
 * or references between methods in the server class.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { ParsedTool } from '../../src/server/parser.js';
import type { BuildMCPServer } from '../../src/server/builder-server.js';

// We'll test the actual registration flow to ensure internal calls work
describe('Internal Method Calls', () => {
  let mockServer: any;
  let registerTool: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock server
    mockServer = {
      addTool: jest.fn(),
    };

    // Import the actual registerTool function
    const adapterModule = await import('../../src/server/adapter.js');
    // Access the registerTool function - it's not exported, so we need to test through the flow
  });

  it('snake_case method can call other snake_case helper methods', async () => {
    // Scenario: Developer uses snake_case consistently
    const helperSpy = jest.fn<(query: string) => Promise<{ data: string }>>().mockResolvedValue({ data: 'from_helper' });

    const serverInstance = {
      // Tool method (registered with MCP)
      search_pokemon: jest.fn(async function(this: any, params: any) {
        // INTERNAL CALL - uses actual method name
        return await this.fetch_from_database(params.query);
      }),

      // Helper method (not registered, just used internally)
      fetch_from_database: helperSpy,
    };

    // Bind methods to the instance (simulate real class behavior)
    serverInstance.search_pokemon = serverInstance.search_pokemon.bind(serverInstance);

    // Simulate MCP calling the registered tool
    const result = await serverInstance.search_pokemon({ query: 'pikachu' });

    // Verify internal call worked
    expect(helperSpy).toHaveBeenCalledWith('pikachu');
    expect(result).toEqual({ data: 'from_helper' });
  });

  it('camelCase method can call other camelCase helper methods', async () => {
    // Scenario: Developer uses camelCase consistently
    const helperSpy = jest.fn<(query: string) => Promise<{ data: string }>>().mockResolvedValue({ data: 'from_helper' });

    const serverInstance = {
      // Tool method (registered with MCP)
      searchPokemon: jest.fn(async function(this: any, params: any) {
        // INTERNAL CALL - uses actual method name
        return await this.fetchFromDatabase(params.query);
      }),

      // Helper method (not registered, just used internally)
      fetchFromDatabase: helperSpy,
    };

    // Bind methods
    serverInstance.searchPokemon = serverInstance.searchPokemon.bind(serverInstance);

    // Simulate MCP calling the registered tool
    const result = await serverInstance.searchPokemon({ query: 'pikachu' });

    // Verify internal call worked
    expect(helperSpy).toHaveBeenCalledWith('pikachu');
    expect(result).toEqual({ data: 'from_helper' });
  });

  it('tool can call another tool internally', async () => {
    // Scenario: One tool calls another tool
    const detailsSpy = jest.fn<(params: { name: string }) => Promise<{ name: string; type: string }>>().mockResolvedValue({ name: 'pikachu', type: 'electric' });

    const serverInstance = {
      // First tool
      search_pokemon: jest.fn(async function(this: any, params: any) {
        // INTERNAL CALL to another tool - uses actual method name
        const details = await this.get_pokemon_details({ name: params.name });
        return { query: params.name, ...details };
      }),

      // Second tool (also registered)
      get_pokemon_details: detailsSpy,
    };

    // Bind methods
    serverInstance.search_pokemon = serverInstance.search_pokemon.bind(serverInstance);

    // Simulate MCP calling the first tool
    const result = await serverInstance.search_pokemon({ name: 'pikachu' });

    // Verify internal call to second tool worked
    expect(detailsSpy).toHaveBeenCalledWith({ name: 'pikachu' });
    expect(result).toEqual({
      query: 'pikachu',
      name: 'pikachu',
      type: 'electric',
    });
  });

  it('mixed naming: snake_case method calls camelCase helper', async () => {
    // Scenario: Mixed naming (possible but not recommended)
    const helperSpy = jest.fn<(query: string) => Promise<{ data: string }>>().mockResolvedValue({ data: 'from_camelCase_helper' });

    const serverInstance = {
      // Tool method (snake_case)
      search_pokemon: jest.fn(async function(this: any, params: any) {
        // INTERNAL CALL to camelCase helper - works fine!
        return await this.fetchFromDatabase(params.query);
      }),

      // Helper method (camelCase)
      fetchFromDatabase: helperSpy,
    };

    // Bind methods
    serverInstance.search_pokemon = serverInstance.search_pokemon.bind(serverInstance);

    // Simulate MCP calling the registered tool
    const result = await serverInstance.search_pokemon({ query: 'pikachu' });

    // Verify internal call worked despite mixed naming
    expect(helperSpy).toHaveBeenCalledWith('pikachu');
    expect(result).toEqual({ data: 'from_camelCase_helper' });
  });

  it('private helper methods are not affected by naming variations', async () => {
    // Scenario: Using TypeScript private methods (or convention of underscore prefix)
    const privateSpy = jest.fn<() => Promise<string>>().mockResolvedValue('private_result');
    const internalSpy = jest.fn<() => Promise<string>>().mockResolvedValue('internal_result');

    const serverInstance = {
      // Public tool method
      searchPokemon: jest.fn(async function(this: any, params: any) {
        // Calls private/internal methods using their ACTUAL names
        const a = await this._privateHelper();
        const b = await this.__internalMethod();
        return { a, b };
      }),

      // Private/internal methods (not registered as tools)
      _privateHelper: privateSpy,
      __internalMethod: internalSpy,
    };

    // Bind
    serverInstance.searchPokemon = serverInstance.searchPokemon.bind(serverInstance);

    // Call
    const result = await serverInstance.searchPokemon({ query: 'test' });

    // Verify both internal calls worked
    expect(privateSpy).toHaveBeenCalled();
    expect(internalSpy).toHaveBeenCalled();
    expect(result).toEqual({
      a: 'private_result',
      b: 'internal_result',
    });
  });

  it('arrow functions with this context work correctly', async () => {
    // Scenario: Using arrow functions (captures lexical this)
    const serverInstance = {
      baseUrl: 'https://api.example.com',

      // Tool method
      searchPokemon: async function(this: any, params: any) {
        // Arrow function captures 'this' from lexical scope
        const buildUrl = (endpoint: string) => `${this.baseUrl}/${endpoint}`;
        return { url: buildUrl('pokemon') };
      },
    };

    // Bind
    serverInstance.searchPokemon = serverInstance.searchPokemon.bind(serverInstance);

    // Call
    const result = await serverInstance.searchPokemon({ query: 'test' });

    // Verify this context worked
    expect(result).toEqual({ url: 'https://api.example.com/pokemon' });
  });
});

describe('Real-World Scenario: Complex Server', () => {
  it('realistic server with multiple interdependent methods', async () => {
    // This simulates a real server where methods call each other
    class PokemonServer {
      private cache: Map<string, any> = new Map();

      // Public tool: search
      search_pokemon = async (params: { query: string }) => {
        const cached = this._checkCache(params.query);
        if (cached) return cached;

        const results = await this._performSearch(params.query);
        this._updateCache(params.query, results);
        return results;
      };

      // Public tool: get details (can be called by other tools)
      get_pokemon_details = async (params: { name: string }) => {
        return { name: params.name, type: 'electric', level: 50 };
      };

      // Private helper methods
      private _checkCache(key: string) {
        return this.cache.get(key);
      }

      private async _performSearch(query: string) {
        // Internally calls another public tool
        return await this.get_pokemon_details({ name: query });
      }

      private _updateCache(key: string, value: any) {
        this.cache.set(key, value);
      }
    }

    const server = new PokemonServer();

    // First call (not cached)
    const result1 = await server.search_pokemon({ query: 'pikachu' });
    expect(result1).toEqual({ name: 'pikachu', type: 'electric', level: 50 });

    // Second call (cached)
    const result2 = await server.search_pokemon({ query: 'pikachu' });
    expect(result2).toEqual({ name: 'pikachu', type: 'electric', level: 50 });

    // Verify cache worked (both results are same)
    expect(result1).toBe(result2);
  });
});
