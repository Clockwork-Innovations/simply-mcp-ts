/**
 * Test static data extraction from interface types
 */

import { parseInterfaceFile } from '../dist/src/server/parser.js';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const TEST_CODE = `
import type { IResource, IServer } from '../src/interface-types.js';

// Test 1: Simple string literal
interface SimpleResource extends IResource {
  uri: 'config://version';
  name: 'Version';
  description: 'API version';
  mimeType: 'text/plain';
  value: '1.0.0';
}

// Test 2: Object with literal properties
interface ConfigResource extends IResource {
  uri: 'config://settings';
  name: 'Settings';
  description: 'Server settings';
  mimeType: 'application/json';
  value: {
    maxConnections: 100;
    timeout: 5000;
    debug: false;
  };
}

// Test 3: Complex object (can't extract - has non-literal types)
interface ComplexResource extends IResource {
  uri: 'config://complex';
  name: 'Complex';
  description: 'Complex config';
  mimeType: 'application/json';
  returns: {
    version: string;  // Non-literal type
    features: string[];  // Non-literal array
  };
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl {}
`;

console.log('\n=== Testing Static Data Extraction ===\n');

const testFilePath = resolve(process.cwd(), 'tests/__test-static-data.ts');

try {
  // Write test file
  writeFileSync(testFilePath, TEST_CODE);

  // Parse it
  const result = parseInterfaceFile(testFilePath);

  console.log(`Found ${result.resources.length} resources\n`);

  // Test 1: Simple string literal
  const simpleResource = result.resources.find(r => r.uri === 'config://version');
  if (simpleResource) {
    console.log('✅ Test 1: Simple string literal');
    console.log(`   URI: ${simpleResource.uri}`);
    console.log(`   Data: ${JSON.stringify(simpleResource.data)}`);
    console.log(`   Expected: "1.0.0"`);
    if (simpleResource.data === '1.0.0') {
      console.log('   ✅ PASS: Data extracted correctly\n');
    } else {
      console.log('   ❌ FAIL: Data mismatch\n');
    }
  } else {
    console.log('❌ Test 1: Resource not found\n');
  }

  // Test 2: Object with literals
  const configResource = result.resources.find(r => r.uri === 'config://settings');
  if (configResource) {
    console.log('✅ Test 2: Object with literal properties');
    console.log(`   URI: ${configResource.uri}`);
    console.log(`   Data: ${JSON.stringify(configResource.data, null, 2)}`);
    const expected = { maxConnections: 100, timeout: 5000, debug: false };
    if (JSON.stringify(configResource.data) === JSON.stringify(expected)) {
      console.log('   ✅ PASS: Object data extracted correctly\n');
    } else {
      console.log('   ❌ FAIL: Object data mismatch\n');
    }
  } else {
    console.log('❌ Test 2: Resource not found\n');
  }

  // Test 3: Complex object (should NOT extract)
  const complexResource = result.resources.find(r => r.uri === 'config://complex');
  if (complexResource) {
    console.log('✅ Test 3: Complex object (non-literal types)');
    console.log(`   URI: ${complexResource.uri}`);
    console.log(`   Dynamic: ${complexResource.dynamic}`);
    console.log(`   Data: ${complexResource.data}`);
    if (complexResource.data === undefined && complexResource.dynamic === true) {
      console.log('   ✅ PASS: Correctly identified as dynamic, data not extracted\n');
    } else {
      console.log('   ❌ FAIL: Should be dynamic with no data extracted\n');
    }
  } else {
    console.log('❌ Test 3: Resource not found\n');
  }

  console.log('=== Summary ===');
  console.log('Static data extraction allows:');
  console.log('  ✅ Simple literals (strings, numbers, booleans)');
  console.log('  ✅ Object literals with all literal properties');
  console.log('  ❌ Non-literal types (string, number[], etc.) - require returns: field');

} catch (error: any) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
} finally {
  // Cleanup
  try {
    unlinkSync(testFilePath);
  } catch (e) {
    // Ignore
  }
}
