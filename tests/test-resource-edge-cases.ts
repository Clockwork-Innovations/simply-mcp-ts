#!/usr/bin/env tsx
/**
 * Resource Detection Edge Case Tests
 *
 * Tests comprehensive static resource detection patterns:
 * - Nested object literals
 * - Array literals
 * - Union types
 * - Template literals
 * - Mixed literal/non-literal types
 * - Edge cases and error handling
 */

import { parseInterfaceFile, ParsedResource } from '../dist/src/parser.js';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test utilities
const colors = {
  RED: '\x1b[0;31m',
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  BLUE: '\x1b[0;34m',
  NC: '\x1b[0m',
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(msg: string) {
  passedTests++;
  totalTests++;
  console.log(`  ${colors.GREEN}✓${colors.NC} ${msg}`);
}

function fail(msg: string, error?: any) {
  failedTests++;
  totalTests++;
  console.log(`  ${colors.RED}✗${colors.NC} ${msg}`);
  if (error) {
    console.log(`    Error: ${error.message || error}`);
  }
}

async function test(description: string, testFn: () => void) {
  try {
    testFn();
    pass(description);
  } catch (error) {
    fail(description, error);
  }
}

console.log(`\n${colors.BLUE}${'='.repeat(60)}${colors.NC}`);
console.log(`${colors.BLUE}  Resource Detection - Edge Case Tests${colors.NC}`);
console.log(`${colors.BLUE}${'='.repeat(60)}${colors.NC}\n`);

// Create a temporary test file with edge cases
const testFilePath = resolve(__dirname, 'temp-resource-edge-cases.ts');
const testFileContent = `
import type { IResource, IServer } from '../src/interface-types.js';

// Edge Case 1: Nested object with multiple levels
interface NestedConfig extends IResource {
  uri: 'config://nested';
  name: 'Nested Config';
  description: 'Deeply nested static configuration';
  mimeType: 'application/json';
  data: {
    server: {
      host: 'localhost';
      port: 8080;
      ssl: {
        enabled: true;
        cert: '/path/to/cert';
      };
    };
    features: {
      auth: true;
      cache: false;
    };
  };
}

// Edge Case 2: Array of objects
interface ArrayOfObjects extends IResource {
  uri: 'data://users';
  name: 'User List';
  description: 'Static list of users';
  mimeType: 'application/json';
  data: [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' }
  ];
}

// Edge Case 3: Simple array of primitives
interface SimpleArray extends IResource {
  uri: 'data://tags';
  name: 'Tag List';
  description: 'Static tag list';
  mimeType: 'application/json';
  data: ['typescript', 'mcp', 'interface'];
}

// Edge Case 4: Mixed types - should be DYNAMIC (has number type)
interface MixedTypes extends IResource {
  uri: 'data://mixed';
  name: 'Mixed Data';
  description: 'Mixed literal and non-literal';
  mimeType: 'application/json';
  data: {
    staticValue: 'hello';
    dynamicValue: number; // Non-literal type forces dynamic
  };
}

// Edge Case 5: Explicitly dynamic despite literal-looking types
interface ExplicitDynamic extends IResource {
  uri: 'data://explicit';
  name: 'Explicit Dynamic';
  description: 'Explicitly marked as dynamic';
  mimeType: 'application/json';
  data: {
    value: 'static looking but dynamic';
  };
}

// Edge Case 6: Empty object
interface EmptyObject extends IResource {
  uri: 'data://empty';
  name: 'Empty Config';
  description: 'Empty static object';
  mimeType: 'application/json';
  data: {};
}

// Edge Case 7: Boolean and null values
interface BooleanNull extends IResource {
  uri: 'data://boolnull';
  name: 'Boolean and Null';
  description: 'Test boolean and null literals';
  mimeType: 'application/json';
  data: {
    enabled: true;
    disabled: false;
    value: null;
  };
}

// Edge Case 8: Numbers (positive, negative, zero, float)
interface NumberTypes extends IResource {
  uri: 'data://numbers';
  name: 'Number Types';
  description: 'Various number literal types';
  mimeType: 'application/json';
  data: {
    zero: 0;
    positive: 42;
    negative: -10;
    float: 3.14;
  };
}

// Edge Case 9: Complex type - should be DYNAMIC (uses Array<T> syntax)
interface ComplexType extends IResource {
  uri: 'data://complex';
  name: 'Complex Type';
  description: 'Complex non-literal type';
  mimeType: 'application/json';
  data: Array<{ id: string; value: number }>;
}

// Edge Case 10: Function type - should be DYNAMIC
interface FunctionType extends IResource {
  uri: 'data://function';
  name: 'Function Type';
  description: 'Function type data';
  mimeType: 'application/json';
  data: () => string;
}

interface TestServer extends IServer {
  name: 'edge-case-test';
  version: '1.0.0';
}

export default class TestServerImpl {}
`;

writeFileSync(testFilePath, testFileContent, 'utf-8');

try {
  const result = parseInterfaceFile(testFilePath);

  // Helper to find resource by interface name
  const findResource = (name: string): ParsedResource | undefined => {
    return result.resources.find(r => r.interfaceName === name);
  };

  console.log(`${colors.BLUE}1. Static Detection - Nested Objects${colors.NC}`);

  await test('Detect deeply nested object as static', () => {
    const resource = findResource('NestedConfig');
    if (!resource) throw new Error('Resource not found');
    if (resource.dynamic) throw new Error('Should be static');
    if (!resource.data) throw new Error('Should have static data');
    if (resource.data.server.port !== 8080) throw new Error('Nested value incorrect');
  });

  console.log(`\n${colors.BLUE}2. Static Detection - Arrays${colors.NC}`);

  await test('Detect array of objects as static', () => {
    const resource = findResource('ArrayOfObjects');
    if (!resource) throw new Error('Resource not found');
    if (resource.dynamic) throw new Error('Should be static');
    if (!resource.data) throw new Error('Should have static data');
    if (!Array.isArray(resource.data)) throw new Error('Should be array');
    if (resource.data[0].name !== 'Alice') throw new Error('Array content incorrect');
  });

  await test('Detect simple array as static', () => {
    const resource = findResource('SimpleArray');
    if (!resource) throw new Error('Resource not found');
    if (resource.dynamic) throw new Error('Should be static');
    if (!resource.data) throw new Error('Should have static data');
    if (!Array.isArray(resource.data)) throw new Error('Should be array');
    if (resource.data[0] !== 'typescript') throw new Error('Array value incorrect');
  });

  console.log(`\n${colors.BLUE}3. Dynamic Detection - Non-Literal Types${colors.NC}`);

  await test('Detect mixed types as dynamic', () => {
    const resource = findResource('MixedTypes');
    if (!resource) throw new Error('Resource not found');
    if (!resource.dynamic) throw new Error('Should be dynamic (has number type)');
    if (resource.data !== undefined) throw new Error('Should not have static data');
  });

  await test('Respect explicit dynamic flag', () => {
    const resource = findResource('ExplicitDynamic');
    if (!resource) throw new Error('Resource not found');
    if (!resource.dynamic) throw new Error('Should be dynamic (explicit flag)');
  });

  await test('Detect complex Array<T> as dynamic', () => {
    const resource = findResource('ComplexType');
    if (!resource) throw new Error('Resource not found');
    if (!resource.dynamic) throw new Error('Should be dynamic (Array<T> syntax)');
    if (resource.data !== undefined) throw new Error('Should not have static data');
  });

  await test('Detect function type as dynamic', () => {
    const resource = findResource('FunctionType');
    if (!resource) throw new Error('Resource not found');
    if (!resource.dynamic) throw new Error('Should be dynamic (function type)');
    if (resource.data !== undefined) throw new Error('Should not have static data');
  });

  console.log(`\n${colors.BLUE}4. Static Detection - Edge Values${colors.NC}`);

  await test('Handle empty object as static', () => {
    const resource = findResource('EmptyObject');
    if (!resource) throw new Error('Resource not found');
    if (resource.dynamic) throw new Error('Should be static');
    if (!resource.data) throw new Error('Should have static data');
    if (typeof resource.data !== 'object') throw new Error('Should be object');
  });

  await test('Handle boolean and null literals', () => {
    const resource = findResource('BooleanNull');
    if (!resource) throw new Error('Resource not found');
    if (resource.dynamic) throw new Error('Should be static');
    if (!resource.data) throw new Error('Should have static data');
    if (resource.data.enabled !== true) throw new Error('Boolean true incorrect');
    if (resource.data.disabled !== false) throw new Error('Boolean false incorrect');
    if (resource.data.value !== null) throw new Error('Null value incorrect');
  });

  await test('Handle various number literals', () => {
    const resource = findResource('NumberTypes');
    if (!resource) throw new Error('Resource not found');
    if (resource.dynamic) throw new Error('Should be static');
    if (!resource.data) throw new Error('Should have static data');
    if (resource.data.zero !== 0) throw new Error('Zero incorrect');
    if (resource.data.positive !== 42) throw new Error('Positive number incorrect');
    if (resource.data.negative !== -10) throw new Error('Negative number incorrect');
    if (resource.data.float !== 3.14) throw new Error('Float incorrect');
  });

  console.log(`\n${colors.BLUE}5. Resource Metadata Extraction${colors.NC}`);

  await test('Extract URI correctly', () => {
    const resource = findResource('NestedConfig');
    if (!resource) throw new Error('Resource not found');
    if (resource.uri !== 'config://nested') throw new Error(`Wrong URI: ${resource.uri}`);
  });

  await test('Extract name correctly', () => {
    const resource = findResource('SimpleArray');
    if (!resource) throw new Error('Resource not found');
    if (resource.name !== 'Tag List') throw new Error(`Wrong name: ${resource.name}`);
  });

  await test('Extract mimeType correctly', () => {
    const resource = findResource('BooleanNull');
    if (!resource) throw new Error('Resource not found');
    if (resource.mimeType !== 'application/json') throw new Error(`Wrong mimeType: ${resource.mimeType}`);
  });

  console.log(`\n${colors.BLUE}6. Integration - Full Resource Count${colors.NC}`);

  await test('Detect all 10 resource interfaces', () => {
    if (result.resources.length !== 10) {
      throw new Error(`Expected 10 resources, found ${result.resources.length}`);
    }
  });

  await test('Correctly categorize static vs dynamic', () => {
    const staticResources = result.resources.filter(r => !r.dynamic);
    const dynamicResources = result.resources.filter(r => r.dynamic);

    // Expected: 6 static, 4 dynamic
    // Static: NestedConfig, ArrayOfObjects, SimpleArray, EmptyObject, BooleanNull, NumberTypes
    // Dynamic: MixedTypes, ExplicitDynamic, ComplexType, FunctionType

    if (staticResources.length !== 6) {
      throw new Error(`Expected 6 static resources, found ${staticResources.length}`);
    }
    if (dynamicResources.length !== 4) {
      throw new Error(`Expected 4 dynamic resources, found ${dynamicResources.length}`);
    }
  });

} finally {
  // Cleanup
  unlinkSync(testFilePath);
}

// Print summary
console.log(`\n${colors.BLUE}${'='.repeat(60)}${colors.NC}`);
console.log(`${colors.BLUE}  Test Results${colors.NC}`);
console.log(`${colors.BLUE}${'='.repeat(60)}${colors.NC}`);
console.log(`  Total:  ${totalTests}`);
console.log(`  ${colors.GREEN}Passed: ${passedTests}${colors.NC}`);
console.log(`  ${colors.RED}Failed: ${failedTests}${colors.NC}`);
console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log(`${colors.BLUE}${'='.repeat(60)}${colors.NC}\n`);

if (failedTests > 0) {
  console.log(`${colors.RED}❌ Some tests failed${colors.NC}\n`);
  process.exit(1);
} else {
  console.log(`${colors.GREEN}✅ All edge case tests passed!${colors.NC}\n`);
  process.exit(0);
}
