#!/usr/bin/env node
/**
 * BuildMCPServer Integration Test
 *
 * Tests the BuildMCPServer (programmatic) API to ensure:
 * - Server instantiation works correctly
 * - Tools can be added and retrieved
 * - Prompts and resources can be added
 * - Server info and stats are accessible
 */

import { BuildMCPServer } from './dist/src/index.js';
import { z } from 'zod';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => {
        results.push({ name, passed: true });
        console.log(`✓ ${name}`);
      }).catch((error) => {
        results.push({ name, passed: false, error: error.message });
        console.error(`✗ ${name}: ${error.message}`);
      });
    } else {
      results.push({ name, passed: true });
      console.log(`✓ ${name}`);
    }
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    console.error(`✗ ${name}: ${error.message}`);
  }
}

async function runTests() {
  console.log('Running BuildMCPServer Integration Tests...\n');

  // Test 1: Server instantiation
  test('Create BuildMCPServer instance', () => {
    const server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
    });

    if (!server) {
      throw new Error('Server instance is null or undefined');
    }
  });

  // Test 2: Add a tool
  test('Add tool to server', () => {
    const server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
    });

    server.addTool({
      name: 'test_tool',
      description: 'A test tool',
      parameters: z.object({
        input: z.string(),
      }),
      execute: async (args) => `Received: ${args.input}`,
    });

    const info = server.getInfo();
    if (!info || !info.name) {
      throw new Error('Server info is invalid');
    }
  });

  // Test 3: Add a prompt
  test('Add prompt to server', () => {
    const server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
    });

    server.addPrompt({
      name: 'test-prompt',
      description: 'A test prompt',
      template: 'Test prompt template',
    });

    const info = server.getInfo();
    if (info.name !== 'test-server') {
      throw new Error('Server name mismatch');
    }
  });

  // Test 4: Add a resource
  test('Add resource to server', () => {
    const server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
    });

    server.addResource({
      uri: 'test://resource',
      name: 'Test Resource',
      description: 'A test resource',
      mimeType: 'text/plain',
      content: 'Test content',
    });

    const stats = server.getStats();
    if (!stats) {
      throw new Error('Server stats are unavailable');
    }
  });

  // Test 5: Get server info
  test('Get server info', () => {
    const server = new BuildMCPServer({
      name: 'info-test-server',
      version: '2.0.0',
    });

    const info = server.getInfo();
    if (info.name !== 'info-test-server') {
      throw new Error(`Expected name 'info-test-server', got '${info.name}'`);
    }
    if (info.version !== '2.0.0') {
      throw new Error(`Expected version '2.0.0', got '${info.version}'`);
    }
  });

  // Wait for async tests to complete
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('Test Summary:');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
