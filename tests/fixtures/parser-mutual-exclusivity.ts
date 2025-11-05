/**
 * Test Fixture: Parser Mutual Exclusivity Validation
 *
 * This fixture tests the parser's validation that `value` and `returns` fields
 * are mutually exclusive - resources should have one or the other, not both.
 *
 * IMPORTANT: These interfaces should trigger parser errors!
 */

import type { IServer, IResource } from '../../src/index.js';

// =============================================================================
// SERVER INTERFACE
// =============================================================================

const server: IServer = {
  name: 'parser-mutual-exclusivity-test',
  version: '1.0.0',
  description: 'Test server for parser mutual exclusivity validation'
}

// =============================================================================
// TEST CASES: Resources with BOTH `value` AND `returns` (should error)
// =============================================================================

/**
 * ERROR TEST CASE 1: Resource with both value and returns (string)
 * This should throw an error during parsing
 */
interface BothValueAndReturnsString extends IResource {
  uri: 'test://error-both-string';
  name: 'Error: Both Fields (String)';
  description: 'Resource with both value and returns - should error';
  mimeType: 'text/plain';
  value: 'static value';
  returns: string;
}

/**
 * ERROR TEST CASE 2: Resource with both value and returns (object)
 * This should throw an error during parsing
 */
interface BothValueAndReturnsObject extends IResource {
  uri: 'test://error-both-object';
  name: 'Error: Both Fields (Object)';
  description: 'Resource with both value and returns - should error';
  mimeType: 'application/json';
  value: { static: 'data' };
  returns: { dynamic: string };
}

/**
 * ERROR TEST CASE 3: Resource with both value and returns (complex)
 * This should throw an error during parsing
 */
interface BothValueAndReturnsComplex extends IResource {
  uri: 'test://error-both-complex';
  name: 'Error: Both Fields (Complex)';
  description: 'Resource with both value and returns - should error';
  mimeType: 'application/json';
  value: {
    name: 'Pikachu';
    type: 'Electric';
    level: 25;
  };
  returns: {
    name: string;
    type: string;
    level: number;
  };
}

/**
 * ERROR TEST CASE 4: Resource with both value (number) and returns (number type)
 * This should throw an error during parsing
 */
interface BothValueAndReturnsNumber extends IResource {
  uri: 'test://error-both-number';
  name: 'Error: Both Fields (Number)';
  description: 'Resource with both value and returns - should error';
  mimeType: 'application/json';
  value: 42;
  returns: number;
}

/**
 * ERROR TEST CASE 5: Resource with both value (array) and returns (array type)
 * This should throw an error during parsing
 */
interface BothValueAndReturnsArray extends IResource {
  uri: 'test://error-both-array';
  name: 'Error: Both Fields (Array)';
  description: 'Resource with both value and returns - should error';
  mimeType: 'application/json';
  value: ['Bulbasaur', 'Charmander', 'Squirtle'];
  returns: string[];
}

// =============================================================================
// TEST CASES: Valid resources (for comparison)
// =============================================================================

/**
 * VALID TEST CASE: Resource with only value (no returns)
 */
interface OnlyValueResource extends IResource {
  uri: 'test://valid-only-value';
  name: 'Valid: Only Value';
  description: 'Resource with only value field';
  mimeType: 'application/json';
  value: { data: 'static' };
}

/**
 * VALID TEST CASE: Resource with only returns (no value)
 */
interface OnlyReturnsResource extends IResource {
  uri: 'test://valid-only-returns';
  name: 'Valid: Only Returns';
  description: 'Resource with only returns field';
  mimeType: 'application/json';
  returns: { data: string };
}

/**
 * VALID TEST CASE: Resource with neither value nor returns
 * Should default to dynamic behavior
 */
interface NeitherValueNorReturnsResource extends IResource {
  uri: 'test://valid-neither';
  name: 'Valid: Neither Field';
  description: 'Resource with neither value nor returns';
  mimeType: 'application/json';
}

// =============================================================================
// SERVER IMPLEMENTATION (minimal, for completeness)
// =============================================================================

export default class ParserMutualExclusivityTestServer {
  // Implementation not needed for parser tests
}
