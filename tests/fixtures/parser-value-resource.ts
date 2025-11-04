/**
 * Test Fixture: Parser Value Field Testing
 *
 * This fixture tests the parser's handling of the new `value` field pattern
 * for static resources with literal data.
 */

import type { IServer, IResource } from '../../src/index.js';

// =============================================================================
// SERVER INTERFACE
// =============================================================================

interface ParserValueTestServer extends IServer {
  name: 'parser-value-test';
  version: '1.0.0';
  description: 'Test server for parser value field detection';
}

// =============================================================================
// TEST CASES: Static Resources with `value` field
// =============================================================================

/**
 * Test Case 1: Simple string value
 */
interface SimpleStringResource extends IResource {
  uri: 'test://simple-string';
  name: 'Simple String';
  description: 'Resource with simple string value';
  mimeType: 'text/plain';
  value: 'Hello, World!';
}

/**
 * Test Case 2: Numeric value
 */
interface NumericResource extends IResource {
  uri: 'test://numeric';
  name: 'Numeric Value';
  description: 'Resource with numeric value';
  mimeType: 'application/json';
  value: 42;
}

/**
 * Test Case 3: Boolean value
 */
interface BooleanResource extends IResource {
  uri: 'test://boolean';
  name: 'Boolean Value';
  description: 'Resource with boolean value';
  mimeType: 'application/json';
  value: true;
}

/**
 * Test Case 4: Object value with nested properties
 */
interface ObjectResource extends IResource {
  uri: 'test://object';
  name: 'Object Value';
  description: 'Resource with nested object value';
  mimeType: 'application/json';
  value: {
    name: 'Pikachu';
    type: 'Electric';
    level: 25;
    moves: ['Thunder Shock', 'Quick Attack'];
    stats: {
      hp: 35;
      attack: 55;
      defense: 40;
    };
  };
}

/**
 * Test Case 5: Array value
 */
interface ArrayResource extends IResource {
  uri: 'test://array';
  name: 'Array Value';
  description: 'Resource with array value';
  mimeType: 'application/json';
  value: ['Bulbasaur', 'Charmander', 'Squirtle'];
}

/**
 * Test Case 6: Null value
 */
interface NullResource extends IResource {
  uri: 'test://null';
  name: 'Null Value';
  description: 'Resource with null value';
  mimeType: 'application/json';
  value: null;
}

/**
 * Test Case 7: Complex nested structure
 */
interface ComplexResource extends IResource {
  uri: 'test://complex';
  name: 'Complex Value';
  description: 'Resource with complex nested structure';
  mimeType: 'application/json';
  value: {
    pokedex: {
      version: '1.0';
      region: 'Kanto';
      totalEntries: 151;
    };
    featured: [
      { id: 1; name: 'Bulbasaur'; type: 'Grass' };
      { id: 4; name: 'Charmander'; type: 'Fire' };
      { id: 7; name: 'Squirtle'; type: 'Water' };
    ];
    metadata: {
      lastUpdated: '2024-01-01';
      format: 'json';
    };
  };
}

/**
 * Test Case 8: Empty object value
 */
interface EmptyObjectResource extends IResource {
  uri: 'test://empty-object';
  name: 'Empty Object';
  description: 'Resource with empty object value';
  mimeType: 'application/json';
  value: {};
}

/**
 * Test Case 9: Empty array value
 */
interface EmptyArrayResource extends IResource {
  uri: 'test://empty-array';
  name: 'Empty Array';
  description: 'Resource with empty array value';
  mimeType: 'application/json';
  value: [];
}

/**
 * Test Case 10: Negative number value
 */
interface NegativeNumberResource extends IResource {
  uri: 'test://negative';
  name: 'Negative Number';
  description: 'Resource with negative number value';
  mimeType: 'application/json';
  value: -42;
}

// =============================================================================
// SERVER IMPLEMENTATION (minimal, for completeness)
// =============================================================================

export default class ParserValueTestServer {
  // Implementation not needed for parser tests
}
