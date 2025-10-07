#!/usr/bin/env tsx
/**
 * Verification Test for Bug Fixes
 *
 * BUG-1: Object Return Values Not JSON Stringified
 * BUG-2: Template Syntax Mismatch
 */

import { BuildMCPServer } from '../dist/src/api/programmatic/BuildMCPServer.js';
import { z } from 'zod';

async function runTests() {
  console.log('\n='.repeat(60));
  console.log('  Bug Fix Verification Tests');
  console.log('='.repeat(60));

  let passedTests = 0;
  let totalTests = 0;

  // BUG-1 Test: Object Return Values
  console.log('\n1️⃣  Testing BUG-1: Object Return Values');
  try {
    const server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
    });

    server.addTool({
      name: 'return-object',
      description: 'Returns a plain object',
      parameters: z.object({}),
      execute: async () => {
        return { message: 'Hello', count: 42, nested: { flag: true } };
      },
    });

    const result = await server.executeToolDirect('return-object', {});
    const textContent = result.content[0].text;

    // Should be JSON, not "[object Object]"
    if (textContent.includes('[object Object]')) {
      console.log('  ❌ FAIL: Object returned as "[object Object]"');
      console.log(`     Got: ${textContent}`);
    } else if (textContent.includes('"message"') && textContent.includes('"count"')) {
      console.log('  ✅ PASS: Object properly JSON stringified');
      console.log(`     Result: ${textContent.substring(0, 100)}...`);
      passedTests++;
    } else {
      console.log('  ❌ FAIL: Unexpected output');
      console.log(`     Got: ${textContent}`);
    }
    totalTests++;
  } catch (error) {
    console.log(`  ❌ FAIL: ${error instanceof Error ? error.message : error}`);
    totalTests++;
  }

  // BUG-2 Test: Template Syntax with Single Braces
  console.log('\n2️⃣  Testing BUG-2: Template Syntax (Single Braces)');
  try {
    const server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
    });

    server.addPrompt({
      name: 'test-prompt',
      description: 'Test prompt with single brace syntax',
      template: 'Hello {name}, welcome to {location}!',
      arguments: [
        { name: 'name', description: 'User name', required: true },
        { name: 'location', description: 'Location name', required: true },
      ],
    });

    const result = await server.getPromptDirect('test-prompt', {
      name: 'Alice',
      location: 'Wonderland',
    });

    const text = result.messages[0].content.text;

    if (text === 'Hello Alice, welcome to Wonderland!') {
      console.log('  ✅ PASS: Single brace template syntax works');
      console.log(`     Result: ${text}`);
      passedTests++;
    } else {
      console.log('  ❌ FAIL: Template not properly interpolated');
      console.log(`     Expected: Hello Alice, welcome to Wonderland!`);
      console.log(`     Got: ${text}`);
    }
    totalTests++;
  } catch (error) {
    console.log(`  ❌ FAIL: ${error instanceof Error ? error.message : error}`);
    totalTests++;
  }

  // BUG-2 Test: Template Syntax with Double Braces (backwards compatibility)
  console.log('\n3️⃣  Testing BUG-2: Template Syntax (Double Braces - Backwards Compatibility)');
  try {
    const server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
    });

    server.addPrompt({
      name: 'test-prompt-double',
      description: 'Test prompt with double brace syntax',
      template: 'Hello {{name}}, welcome to {{location}}!',
      arguments: [
        { name: 'name', description: 'User name', required: true },
        { name: 'location', description: 'Location name', required: true },
      ],
    });

    const result = await server.getPromptDirect('test-prompt-double', {
      name: 'Bob',
      location: 'Cyberia',
    });

    const text = result.messages[0].content.text;

    if (text === 'Hello Bob, welcome to Cyberia!') {
      console.log('  ✅ PASS: Double brace template syntax still works');
      console.log(`     Result: ${text}`);
      passedTests++;
    } else {
      console.log('  ❌ FAIL: Template not properly interpolated');
      console.log(`     Expected: Hello Bob, welcome to Cyberia!`);
      console.log(`     Got: ${text}`);
    }
    totalTests++;
  } catch (error) {
    console.log(`  ❌ FAIL: ${error instanceof Error ? error.message : error}`);
    totalTests++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  Test Results');
  console.log('='.repeat(60));
  console.log(`  Total:  ${totalTests}`);
  console.log(`  Passed: ${passedTests}`);
  console.log(`  Failed: ${totalTests - passedTests}`);
  console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (passedTests === totalTests) {
    console.log('\n✅ All bug fixes verified!\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed\n');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
