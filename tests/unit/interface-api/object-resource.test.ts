/**
 * Interface API - Object Resource Pattern Tests (Pattern 3)
 *
 * Tests for the "object-with-data" resource pattern where resources are
 * defined as objects with inline `data` properties.
 *
 * Pattern 3: Object with data property
 * ```typescript
 * interface ServerConfigResource extends IResource {
 *   uri: 'config://pokedex/server';
 *   data: { totalPokemon: number };  // Type definition
 * }
 * class Server {
 *   ['config://pokedex/server'] = {  // Object with data property
 *     uri: 'config://pokedex/server',
 *     name: 'Server Configuration',
 *     mimeType: 'application/json',
 *     data: { totalPokemon: 151 }  // Actual data
 *   };
 * }
 * ```
 *
 * This pattern was added to fix a bug where resources defined as objects
 * weren't being handled correctly by the resource handler.
 *
 * Test Coverage:
 * 1. Object with inline data property is registered correctly
 * 2. Object pattern works alongside function pattern (Pattern 2)
 * 3. Object with nested data structures
 * 4. Object with array data
 * 5. Object with all IResource properties
 * 6. Multiple object resources coexist
 * 7. Integration test with multiple patterns
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { loadInterfaceServer } from '../../../src/server/adapter.js';
import type { InterfaceServer } from '../../../src/server/interface-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePath = path.resolve(__dirname, '../../fixtures/interface-object-resource.ts');

describe('Interface API - Object Resource Pattern (Pattern 3)', () => {
  let server: InterfaceServer;

  beforeAll(async () => {
    server = await loadInterfaceServer({ filePath: fixturePath, verbose: false });
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  // ===========================================================================
  // TEST 1: Object with inline data property is registered correctly
  // ===========================================================================
  describe('Test 1: Basic object-with-data registration', () => {
    test('should register object resource with inline data', () => {
      const resources = await server.listResources();
      const serverConfig = resources.find((r) => r.uri === 'config://pokedex/server');

      expect(serverConfig).toBeDefined();
      expect(serverConfig?.name).toBe('Server Configuration');
      expect(serverConfig?.description).toBe('Pokedex server configuration');
      expect(serverConfig?.mimeType).toBe('application/json');
    });

    test('should serve data from object property', async () => {
      const result = await server.readResource('config://pokedex/server');

      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(result.contents.length).toBeGreaterThan(0);

      const textContent = result.contents.find((item: any) => 'text' in item);
      expect(textContent).toBeDefined();

      const data = JSON.parse((textContent as { text: string }).text);
      expect(data.totalPokemon).toBe(151);
      expect(data.region).toBe('Kanto');
    });

    test('should return correct URI in resource metadata', () => {
      const resources = await server.listResources();
      const serverConfig = resources.find((r) => r.uri === 'config://pokedex/server');

      expect(serverConfig?.uri).toBe('config://pokedex/server');
    });
  });

  // ===========================================================================
  // TEST 2: Object pattern works alongside function pattern
  // ===========================================================================
  describe('Test 2: Object pattern coexists with function pattern (Pattern 2)', () => {
    test('should register both object and function resources', () => {
      const resources = await server.listResources();

      const objectResource = resources.find((r) => r.uri === 'config://pokedex/server');
      const functionResource = resources.find((r) => r.uri === 'stats://server');

      expect(objectResource).toBeDefined();
      expect(functionResource).toBeDefined();
    });

    test('should serve data from object resource correctly', async () => {
      const result = await server.readResource('config://pokedex/server');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const data = JSON.parse((textContent as { text: string }).text);

      expect(data.totalPokemon).toBe(151);
    });

    test('should execute function resource correctly', async () => {
      const result = await server.readResource('stats://server');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const data = JSON.parse((textContent as { text: string }).text);

      // Function resource returns dynamic data
      expect(typeof data.requestCount).toBe('number');
      expect(typeof data.uptime).toBe('number');
    });

    test('should not interfere with each other', async () => {
      // Read object resource first
      const objectResult = await server.readResource('config://pokedex/server');
      const objectText = objectResult.contents.find((item: any) => 'text' in item);
      const objectData = JSON.parse((objectText as { text: string }).text);

      // Then read function resource
      const functionResult = await server.readResource('stats://server');
      const functionText = functionResult.contents.find((item: any) => 'text' in item);
      const functionData = JSON.parse((functionText as { text: string }).text);

      // Object resource should still return same data
      expect(objectData.totalPokemon).toBe(151);

      // Function resource should return different data each time (it's dynamic)
      expect(typeof functionData.requestCount).toBe('number');
    });
  });

  // ===========================================================================
  // TEST 3: Object with nested data structures
  // ===========================================================================
  describe('Test 3: Object with nested data structures', () => {
    test('should register object resource with nested data', () => {
      const resources = await server.listResources();
      const dbConfig = resources.find((r) => r.uri === 'config://database');

      expect(dbConfig).toBeDefined();
      expect(dbConfig?.name).toBe('Database Configuration');
    });

    test('should serve nested object data correctly', async () => {
      const result = await server.readResource('config://database');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const data = JSON.parse((textContent as { text: string }).text);

      // Test top-level properties
      expect(data.host).toBe('localhost');
      expect(data.port).toBe(5432);

      // Test nested object
      expect(data.credentials).toBeDefined();
      expect(data.credentials.username).toBe('admin');
      expect(data.credentials.password).toBe('secret');

      // Test nested array
      expect(Array.isArray(data.pools)).toBe(true);
      expect(data.pools.length).toBe(2);
      expect(data.pools[0].name).toBe('main');
      expect(data.pools[0].size).toBe(10);
    });

    test('should preserve data structure integrity', async () => {
      const result = await server.readResource('config://database');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const data = JSON.parse((textContent as { text: string }).text);

      // Verify the structure is complete
      expect(Object.keys(data)).toEqual(
        expect.arrayContaining(['host', 'port', 'credentials', 'pools'])
      );
      expect(Object.keys(data.credentials)).toEqual(
        expect.arrayContaining(['username', 'password'])
      );
    });
  });

  // ===========================================================================
  // TEST 4: Object with array data
  // ===========================================================================
  describe('Test 4: Object with array data', () => {
    test('should register object resource with array data', () => {
      const resources = await server.listResources();
      const pokemonList = resources.find((r) => r.uri === 'data://pokemon/list');

      expect(pokemonList).toBeDefined();
      expect(pokemonList?.name).toBe('Pokemon List');
    });

    test('should serve array data correctly', async () => {
      const result = await server.readResource('data://pokemon/list');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const data = JSON.parse((textContent as { text: string }).text);

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(3);
    });

    test('should preserve array element structure', async () => {
      const result = await server.readResource('data://pokemon/list');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const data = JSON.parse((textContent as { text: string }).text);

      // Verify first element
      expect(data[0].id).toBe(1);
      expect(data[0].name).toBe('Bulbasaur');
      expect(data[0].type).toBe('Grass');

      // Verify second element
      expect(data[1].id).toBe(4);
      expect(data[1].name).toBe('Charmander');
      expect(data[1].type).toBe('Fire');

      // Verify third element
      expect(data[2].id).toBe(7);
      expect(data[2].name).toBe('Squirtle');
      expect(data[2].type).toBe('Water');
    });
  });

  // ===========================================================================
  // TEST 5: Object with all IResource properties
  // ===========================================================================
  describe('Test 5: Object with all IResource properties', () => {
    test('should register object resource with all properties', () => {
      const resources = await server.listResources();
      const detailed = resources.find((r) => r.uri === 'resource://detailed');

      expect(detailed).toBeDefined();
    });

    test('should respect object properties over interface defaults', async () => {
      const resources = await server.listResources();
      const detailed = resources.find((r) => r.uri === 'resource://detailed');

      // The object definition should take precedence
      expect(detailed?.name).toBe('Detailed Resource Override');
      expect(detailed?.description).toBe('Description from object, not interface');
      expect(detailed?.mimeType).toBe('application/json');
    });

    test('should serve data from object with all properties', async () => {
      const result = await server.readResource('resource://detailed');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const data = JSON.parse((textContent as { text: string }).text);

      expect(data.value).toBe('test-value');
    });
  });

  // ===========================================================================
  // TEST 6: Multiple object resources coexist
  // ===========================================================================
  describe('Test 6: Multiple object resources coexist', () => {
    test('should register multiple object resources', () => {
      const resources = await server.listResources();

      const kanto = resources.find((r) => r.uri === 'region://kanto');
      const johto = resources.find((r) => r.uri === 'region://johto');

      expect(kanto).toBeDefined();
      expect(johto).toBeDefined();
    });

    test('should serve data from first object resource', async () => {
      const result = await server.readResource('region://kanto');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const data = JSON.parse((textContent as { text: string }).text);

      expect(data.name).toBe('Kanto');
      expect(data.gymCount).toBe(8);
    });

    test('should serve data from second object resource', async () => {
      const result = await server.readResource('region://johto');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const data = JSON.parse((textContent as { text: string }).text);

      expect(data.name).toBe('Johto');
      expect(data.gymCount).toBe(8);
    });

    test('should keep object resources independent', async () => {
      // Read both resources
      const kantoResult = await server.readResource('region://kanto');
      const johtoResult = await server.readResource('region://johto');

      const kantoText = kantoResult.contents.find((item: any) => 'text' in item);
      const johtoText = johtoResult.contents.find((item: any) => 'text' in item);

      const kantoData = JSON.parse((kantoText as { text: string }).text);
      const johtoData = JSON.parse((johtoText as { text: string }).text);

      // They should have different names
      expect(kantoData.name).toBe('Kanto');
      expect(johtoData.name).toBe('Johto');
      expect(kantoData.name).not.toBe(johtoData.name);
    });
  });

  // ===========================================================================
  // TEST 7: Integration test - All patterns work together
  // ===========================================================================
  describe('Test 7: Integration - Multiple patterns coexist', () => {
    test('should count all resources correctly', () => {
      const resources = await server.listResources();

      // We have 6 object resources + 1 function resource = 7 total
      expect(resources.length).toBe(7);
    });

    test('should list all resource URIs', () => {
      const resources = await server.listResources();
      const uris = resources.map((r) => r.uri).sort();

      expect(uris).toEqual([
        'config://database',
        'config://pokedex/server',
        'data://pokemon/list',
        'region://johto',
        'region://kanto',
        'resource://detailed',
        'stats://server',
      ]);
    });

    test('should serve all object resources correctly', async () => {
      const objectUris = [
        'config://pokedex/server',
        'config://database',
        'data://pokemon/list',
        'resource://detailed',
        'region://kanto',
        'region://johto',
      ];

      for (const uri of objectUris) {
        const result = await server.readResource(uri);
        expect(result).toBeDefined();
        expect(result.contents).toBeDefined();
        expect(result.contents.length).toBeGreaterThan(0);

        const textContent = result.contents.find((item: any) => 'text' in item);
        expect(textContent).toBeDefined();

        // Verify JSON is parseable
        const data = JSON.parse((textContent as { text: string }).text);
        expect(data).toBeDefined();
      }
    });

    test('should serve function resource correctly', async () => {
      const result = await server.readResource('stats://server');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const data = JSON.parse((textContent as { text: string }).text);

      expect(typeof data.requestCount).toBe('number');
      expect(typeof data.uptime).toBe('number');
    });

    test('should handle sequential resource reads', async () => {
      // Read multiple resources in sequence
      const uris = [
        'config://pokedex/server',
        'stats://server',
        'data://pokemon/list',
        'region://kanto',
      ];

      for (const uri of uris) {
        const result = await server.readResource(uri);
        expect(result).toBeDefined();
        expect(result.contents).toBeDefined();
        expect(result.contents.length).toBeGreaterThan(0);
      }
    });

    test('should handle parallel resource reads', async () => {
      // Read multiple resources in parallel
      const uris = [
        'config://pokedex/server',
        'config://database',
        'data://pokemon/list',
      ];

      const results = await Promise.all(
        uris.map((uri) => server.readResource(uri))
      );

      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.contents).toBeDefined();
        expect(result.contents.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // ADDITIONAL TESTS: Edge cases
  // ===========================================================================
  describe('Edge cases', () => {
    test('should throw error for non-existent resource', async () => {
      await expect(
        server.readResource('config://does-not-exist')
      ).rejects.toThrow();
    });

    test('should handle malformed URI gracefully', async () => {
      await expect(
        server.readResource('invalid-uri')
      ).rejects.toThrow();
    });
  });
});
