/**
 * Test Fixture: Parser Returns Field Testing
 *
 * This fixture tests the parser's handling of the new `returns` field pattern
 * for dynamic resources with type definitions.
 */

import type { IServer, IResource } from '../../src/index.js';

// =============================================================================
// SERVER INTERFACE
// =============================================================================

interface ParserReturnsTestServer extends IServer {
  name: 'parser-returns-test';
  version: '1.0.0';
  description: 'Test server for parser returns field detection';
}

// =============================================================================
// TEST CASES: Dynamic Resources with `returns` field
// =============================================================================

/**
 * Test Case 1: Simple string type
 */
interface SimpleStringResource extends IResource {
  uri: 'test://dynamic-string';
  name: 'Dynamic String';
  description: 'Resource with string return type';
  mimeType: 'text/plain';
  returns: string;
}

/**
 * Test Case 2: Object type definition
 */
interface ObjectTypeResource extends IResource {
  uri: 'test://dynamic-object';
  name: 'Dynamic Object';
  description: 'Resource with object return type';
  mimeType: 'application/json';
  returns: {
    name: string;
    type: string;
    level: number;
  };
}

/**
 * Test Case 3: Array type definition
 */
interface ArrayTypeResource extends IResource {
  uri: 'test://dynamic-array';
  name: 'Dynamic Array';
  description: 'Resource with array return type';
  mimeType: 'application/json';
  returns: Array<{ id: number; name: string }>;
}

/**
 * Test Case 4: Complex nested type definition
 */
interface ComplexTypeResource extends IResource {
  uri: 'test://dynamic-complex';
  name: 'Dynamic Complex';
  description: 'Resource with complex nested return type';
  mimeType: 'application/json';
  returns: {
    pokedex: {
      version: string;
      region: string;
      totalEntries: number;
    };
    featured: Array<{
      id: number;
      name: string;
      type: string;
    }>;
    metadata: {
      lastUpdated: string;
      format: string;
    };
  };
}

/**
 * Test Case 5: Union type
 */
interface UnionTypeResource extends IResource {
  uri: 'test://dynamic-union';
  name: 'Dynamic Union';
  description: 'Resource with union return type';
  mimeType: 'application/json';
  returns: string | number | boolean;
}

/**
 * Test Case 6: Optional properties
 */
interface OptionalPropertiesResource extends IResource {
  uri: 'test://dynamic-optional';
  name: 'Dynamic Optional';
  description: 'Resource with optional properties';
  mimeType: 'application/json';
  returns: {
    required: string;
    optional?: number;
  };
}

/**
 * Test Case 7: Tuple type
 */
interface TupleTypeResource extends IResource {
  uri: 'test://dynamic-tuple';
  name: 'Dynamic Tuple';
  description: 'Resource with tuple return type';
  mimeType: 'application/json';
  returns: [string, number, boolean];
}

/**
 * Test Case 8: Any type
 */
interface AnyTypeResource extends IResource {
  uri: 'test://dynamic-any';
  name: 'Dynamic Any';
  description: 'Resource with any return type';
  mimeType: 'application/json';
  returns: any;
}

/**
 * Test Case 9: Generic Record type
 */
interface RecordTypeResource extends IResource {
  uri: 'test://dynamic-record';
  name: 'Dynamic Record';
  description: 'Resource with Record return type';
  mimeType: 'application/json';
  returns: Record<string, number>;
}

/**
 * Test Case 10: Readonly array
 */
interface ReadonlyArrayResource extends IResource {
  uri: 'test://dynamic-readonly';
  name: 'Dynamic Readonly';
  description: 'Resource with readonly array return type';
  mimeType: 'application/json';
  returns: readonly string[];
}

// =============================================================================
// SERVER IMPLEMENTATION (minimal, for completeness)
// =============================================================================

export default class ParserReturnsTestServer {
  // Implementation not needed for parser tests
}
