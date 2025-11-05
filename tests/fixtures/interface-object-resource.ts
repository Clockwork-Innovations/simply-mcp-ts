/**
 * Test Fixture: Object-with-data Resource Pattern (Pattern 3)
 *
 * This fixture tests the newly-supported pattern where resources are defined
 * as objects with inline `data` properties, rather than as functions or static literals.
 *
 * Pattern 3: Object with data property
 * ```typescript
 * interface ServerConfigResource extends IResource {
 *   uri: 'config://pokedex/server';
 *   returns: { totalPokemon: number };  // Type definition (use 'returns' for dynamic)
 * }
 * class Server {
 *   ['config://pokedex/server'] = {  // Object with data property
 *     uri: 'config://pokedex/server',
 *     name: 'Server Configuration',
 *     mimeType: 'application/json',
 *     data: { totalPokemon: 151 }  // Implementation still uses 'data'
 *   };
 * }
 * ```
 */

import type { IServer, ITool, IResource, ToolHelper } from '../../src/index.js';

// =============================================================================
// SERVER INTERFACE
// =============================================================================

const server: IServer = {
  name: 'object-resource-fixture',
  version: '1.0.0',
  description: 'Test server for object-with-data resource pattern'
  // version: '1.0.0';  // Optional (defaults to '1.0.0')
}

// =============================================================================
// TOOL INTERFACES (for completeness)
// =============================================================================

interface PingTool extends ITool {
  name: 'ping';
  description: 'Simple ping tool';
  params: {
    message: { type: 'string'; description: 'Message to echo back' };
  };
  result: {
    echoed: string;
  };
}

// =============================================================================
// RESOURCE INTERFACES - Pattern 3: Object with data
// =============================================================================

/**
 * Test Case 1: Simple object with inline data
 * The most basic Pattern 3 example
 */
interface ServerConfigResource extends IResource {
  uri: 'config://pokedex/server';
  name: 'Server Configuration';
  description: 'Pokedex server configuration';
  mimeType: 'application/json';
  returns: { totalPokemon: number; region: string };
}

/**
 * Test Case 2: Object with nested data structures
 * Tests that complex nested objects work correctly
 */
interface DatabaseConfigResource extends IResource {
  uri: 'config://database';
  name: 'Database Configuration';
  description: 'Database connection settings';
  mimeType: 'application/json';
  returns: {
    host: string;
    port: number;
    credentials: {
      username: string;
      password: string;
    };
    pools: Array<{ name: string; size: number }>;
  };
}

/**
 * Test Case 3: Object with array data
 * Tests that arrays in the data property work correctly
 */
interface PokemonListResource extends IResource {
  uri: 'data://pokemon/list';
  name: 'Pokemon List';
  description: 'List of Generation 1 Pokemon';
  mimeType: 'application/json';
  returns: Array<{ id: number; name: string; type: string }>;
}

/**
 * Test Case 4: Object with all IResource properties
 * Tests that uri, name, description, mimeType are all respected from the object
 */
interface DetailedResource extends IResource {
  uri: 'resource://detailed';
  name: 'Detailed Resource';
  description: 'Resource with all properties specified';
  mimeType: 'text/plain';
  returns: { value: string };
}

/**
 * Test Case 5: Multiple object resources
 * Tests that multiple Pattern 3 resources can coexist
 */
interface Region1Resource extends IResource {
  uri: 'region://kanto';
  name: 'Kanto Region';
  description: 'Information about Kanto region';
  mimeType: 'application/json';
  returns: { name: string; gymCount: number };
}

interface Region2Resource extends IResource {
  uri: 'region://johto';
  name: 'Johto Region';
  description: 'Information about Johto region';
  mimeType: 'application/json';
  returns: { name: string; gymCount: number };
}

// =============================================================================
// RESOURCE INTERFACE - Pattern 2: Function-based (for comparison)
// =============================================================================

/**
 * Pattern 2: Dynamic function resource (for testing mixed patterns)
 * This should work alongside Pattern 3 resources
 */
interface StatsResource extends IResource {
  uri: 'stats://server';
  name: 'Server Statistics';
  description: 'Runtime server statistics';
  mimeType: 'application/json';
  returns: {
    requestCount: number;
    uptime: number;
  };
}

// =============================================================================
// TOOL IMPLEMENTATION
// =============================================================================

const ping: ToolHelper<PingTool> = async (params) => ({
  echoed: params.message,
});

// =============================================================================
// SERVER IMPLEMENTATION
// =============================================================================

const server: ObjectResourceServer = {
  name: 'object-resource-fixture',
  description: 'Test server for object-with-data resource pattern',

  // Tool implementation
  ping,

  // =============================================================================
  // PATTERN 3: Object with data property
  // =============================================================================

  /**
   * Test Case 1: Simple object with inline data
   */
  'config://pokedex/server': {
    uri: 'config://pokedex/server',
    name: 'Server Configuration',
    description: 'Pokedex server configuration',
    mimeType: 'application/json',
    data: { totalPokemon: 151, region: 'Kanto' },
  },

  /**
   * Test Case 2: Object with nested data structures
   */
  'config://database': {
    uri: 'config://database',
    name: 'Database Configuration',
    description: 'Database connection settings',
    mimeType: 'application/json',
    data: {
      host: 'localhost',
      port: 5432,
      credentials: {
        username: 'admin',
        password: 'secret',
      },
      pools: [
        { name: 'main', size: 10 },
        { name: 'readonly', size: 5 },
      ],
    },
  },

  /**
   * Test Case 3: Object with array data
   */
  'data://pokemon/list': {
    uri: 'data://pokemon/list',
    name: 'Pokemon List',
    description: 'List of Generation 1 Pokemon',
    mimeType: 'application/json',
    data: [
      { id: 1, name: 'Bulbasaur', type: 'Grass' },
      { id: 4, name: 'Charmander', type: 'Fire' },
      { id: 7, name: 'Squirtle', type: 'Water' },
    ],
  },

  /**
   * Test Case 4: Object with all IResource properties
   * Note: The object properties should override interface defaults
   */
  'resource://detailed': {
    uri: 'resource://detailed',
    name: 'Detailed Resource Override',
    description: 'Description from object, not interface',
    mimeType: 'application/json', // Note: object says json, interface says text/plain
    data: { value: 'test-value' },
  },

  /**
   * Test Case 5: Multiple object resources
   */
  'region://kanto': {
    uri: 'region://kanto',
    name: 'Kanto Region',
    description: 'Information about Kanto region',
    mimeType: 'application/json',
    data: { name: 'Kanto', gymCount: 8 },
  },

  'region://johto': {
    uri: 'region://johto',
    name: 'Johto Region',
    description: 'Information about Johto region',
    mimeType: 'application/json',
    data: { name: 'Johto', gymCount: 8 },
  },

  // =============================================================================
  // PATTERN 2: Function-based dynamic resource (for mixed testing)
  // =============================================================================

  /**
   * Pattern 2: Function-based resource for comparison
   * This should work alongside Pattern 3 object resources
   */
  'stats://server': async () => ({
    requestCount: Math.floor(Math.random() * 1000),
    uptime: Date.now(),
  })
};

export default server;
