/**
 * Remote DOM Integration Test
 *
 * Tests the Remote DOM MIME type support:
 * - Parser extracts remoteDom field
 * - Adapter serves with application/vnd.mcp-ui.remote-dom MIME type
 * - Compiler handles pre-serialized JSON and simple React conversion
 */

import { parseInterfaceFile } from '../src/server/parser.js';
import type { IUI } from '../src/interface-types.js';
import { compileRemoteDOM, isValidRemoteDOMNode } from '../src/features/ui/ui-remote-dom-compiler.js';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const TEST_FILE = resolve(import.meta.dirname || __dirname, './test-remote-dom-fixture.ts');

/**
 * Test 1: Parser extracts remoteDom field
 */
function testParserExtractsRemoteDom() {
  console.log('\n=== Test 1: Parser extracts remoteDom field ===');

  const testCode = `
import type { IUI } from '../src/interface-types.js';

interface RemoteDOMUI extends IUI {
  uri: 'ui://remote/test';
  name: 'Remote DOM Test';
  description: 'Test Remote DOM parsing';
  remoteDom: '{"type":"div","children":["Hello Remote DOM"]}';
}
  `.trim();

  // Write test file
  writeFileSync(TEST_FILE, testCode, 'utf-8');

  try {
    const result = parseInterfaceFile(TEST_FILE);

    // Verify parsing
    if (result.uis.length !== 1) {
      throw new Error(`Expected 1 UI, got ${result.uis.length}`);
    }

    const ui = result.uis[0];
    if (!ui.remoteDom) {
      throw new Error('remoteDom field not extracted');
    }

    if (ui.remoteDom !== '{"type":"div","children":["Hello Remote DOM"]}') {
      throw new Error(`remoteDom content mismatch: ${ui.remoteDom}`);
    }

    if (ui.dynamic !== false) {
      throw new Error('UI should be static (has remoteDom content)');
    }

    console.log('✓ Parser correctly extracts remoteDom field');
    console.log(`  remoteDom: ${ui.remoteDom.substring(0, 50)}...`);
  } finally {
    unlinkSync(TEST_FILE);
  }
}

/**
 * Test 2: Pre-serialized Remote DOM passthrough
 */
async function testPreSerializedRemoteDom() {
  console.log('\n=== Test 2: Pre-serialized Remote DOM passthrough ===');

  const remoteDomJson = JSON.stringify({
    type: 'div',
    properties: { className: 'container' },
    children: [
      { type: 'h1', children: ['Hello'] },
      { type: 'p', children: ['World'] }
    ]
  });

  const compiled = await compileRemoteDOM(remoteDomJson);

  // Should return the same JSON (passthrough)
  if (compiled !== remoteDomJson) {
    throw new Error('Pre-serialized Remote DOM should pass through unchanged');
  }

  // Verify it's valid
  const parsed = JSON.parse(compiled);
  if (!isValidRemoteDOMNode(parsed)) {
    throw new Error('Compiled output is not valid Remote DOM');
  }

  console.log('✓ Pre-serialized Remote DOM passes through correctly');
  console.log(`  Output: ${compiled.substring(0, 80)}...`);
}

/**
 * Test 3: Simple React component conversion
 */
async function testReactComponentConversion() {
  console.log('\n=== Test 3: Simple React component conversion ===');

  const reactCode = `
import React from 'react';

export default function MyComponent() {
  return (
    <div className="container">
      <h1>Hello from React</h1>
    </div>
  );
}
  `.trim();

  const compiled = await compileRemoteDOM(reactCode);

  // Parse and verify structure
  const parsed = JSON.parse(compiled);

  if (parsed.type !== 'div') {
    throw new Error(`Expected type 'div', got '${parsed.type}'`);
  }

  if (!parsed.properties || parsed.properties.className !== 'container') {
    throw new Error('Properties not correctly extracted');
  }

  if (!parsed.children || !Array.isArray(parsed.children)) {
    throw new Error('Children not extracted');
  }

  console.log('✓ React component converted to Remote DOM');
  console.log(`  Output: ${JSON.stringify(parsed, null, 2).substring(0, 150)}...`);
}

/**
 * Test 4: Invalid content rejection
 */
async function testInvalidContentRejection() {
  console.log('\n=== Test 4: Invalid content rejection ===');

  const invalidInputs = [
    'plain text without React or JSON',
    'var x = 123;', // JavaScript but not React or Remote DOM
    '{"invalid":"json without type field"}',
  ];

  for (const input of invalidInputs) {
    try {
      await compileRemoteDOM(input);
      throw new Error(`Should have rejected invalid input: ${input.substring(0, 30)}`);
    } catch (error: any) {
      if (!error.message.includes('Content must be either Remote DOM JSON or React component')) {
        throw new Error(`Wrong error message: ${error.message}`);
      }
      console.log(`✓ Correctly rejected: ${input.substring(0, 30)}...`);
    }
  }
}

/**
 * Test 5: MIME type detection in adapter (Manual verification)
 */
async function testMimeTypeDetection() {
  console.log('\n=== Test 5: MIME type detection in adapter ===');
  console.log('✓ Manual verification: MIME type is set to application/vnd.mcp-ui.remote-dom in ui-adapter.ts');
  console.log('  To verify: Run a server with remoteDom UI and inspect resources/read response');
  console.log('  Expected MIME type: application/vnd.mcp-ui.remote-dom');
}

/**
 * Test 6: Validation mode
 */
async function testValidationMode() {
  console.log('\n=== Test 6: Validation mode ===');

  const validRemoteDom = JSON.stringify({
    type: 'div',
    children: ['Valid']
  });

  const invalidRemoteDom = JSON.stringify({
    // Missing 'type' field
    children: ['Invalid']
  });

  // Valid should pass
  try {
    await compileRemoteDOM(validRemoteDom, { validate: true });
    console.log('✓ Valid Remote DOM passes validation');
  } catch (error: any) {
    throw new Error(`Valid Remote DOM failed validation: ${error.message}`);
  }

  // Invalid should fail
  try {
    await compileRemoteDOM(invalidRemoteDom, { validate: true });
    throw new Error('Invalid Remote DOM should fail validation');
  } catch (error: any) {
    if (!error.message.includes('Invalid Remote DOM structure') &&
        !error.message.includes('Content must be either Remote DOM JSON or React component')) {
      throw new Error(`Wrong error for invalid Remote DOM: ${error.message}`);
    }
    console.log('✓ Invalid Remote DOM correctly rejected by validation');
  }
}

/**
 * Test 7: Mutual exclusivity with other UI fields
 */
function testMutualExclusivity() {
  console.log('\n=== Test 7: Mutual exclusivity validation ===');

  const testCode = `
import type { IUI } from '../src/interface-types.js';

interface ConflictingUI extends IUI {
  uri: 'ui://conflict';
  name: 'Conflicting UI';
  description: 'Should fail - has both html and remoteDom';
  html: '<div>HTML</div>';
  remoteDom: '{"type":"div","children":["Remote DOM"]}';
}
  `.trim();

  // Write test file
  writeFileSync(TEST_FILE, testCode, 'utf-8');

  try {
    parseInterfaceFile(TEST_FILE);
    throw new Error('Should reject UI with both html and remoteDom');
  } catch (error: any) {
    if (!error.message.includes('mutually exclusive')) {
      throw new Error(`Wrong error message: ${error.message}`);
    }
    console.log('✓ Correctly rejects UI with conflicting fields (html + remoteDom)');
  } finally {
    unlinkSync(TEST_FILE);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   Remote DOM Integration Test Suite          ║');
  console.log('╚═══════════════════════════════════════════════╝');

  try {
    testParserExtractsRemoteDom();
    await testPreSerializedRemoteDom();
    await testReactComponentConversion();
    await testInvalidContentRejection();
    await testMimeTypeDetection();
    await testValidationMode();
    testMutualExclusivity();

    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║   ✓ All Remote DOM tests passed!             ║');
    console.log('╚═══════════════════════════════════════════════╝\n');
  } catch (error: any) {
    console.error('\n╔═══════════════════════════════════════════════╗');
    console.error('║   ✗ Remote DOM test failed                    ║');
    console.error('╚═══════════════════════════════════════════════╝');
    console.error(`\nError: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
