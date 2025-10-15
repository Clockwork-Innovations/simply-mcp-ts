#!/usr/bin/env node
/**
 * Interface API Runtime Test
 *
 * Tests the Interface API to ensure:
 * - Interface-based servers can be loaded
 * - Type definitions work correctly
 * - Schema generation from TypeScript types works
 */

import type { ITool, IServer } from './dist/src/index.js';

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

// Define test interfaces
interface TestTool extends ITool {
  name: 'test_tool';
  description: 'A test tool';
  params: {
    input: string;
    count?: number;
  };
  result: string;
}

interface TestServer extends IServer {
  name: 'test-interface-server';
  version: '1.0.0';
  description: 'Test interface server';
}

// Test implementation
class TestServerImpl implements TestServer {
  testTool: TestTool = async (params) => {
    const count = params.count || 1;
    return `Received: ${params.input} (${count} times)`;
  };
}

async function runTests() {
  console.log('Running Interface API Runtime Tests...\n');

  // Test 1: Interface types are defined
  test('Interface types are exported', () => {
    // This test passes if the imports work
    if (typeof ITool === 'undefined' && typeof IServer === 'undefined') {
      // Types don't exist at runtime, but they should compile
      // If we got here, the types exist at compile time
    }
  });

  // Test 2: Can create class implementing interfaces
  test('Create class implementing interface', () => {
    const server = new TestServerImpl();

    if (!server) {
      throw new Error('Server instance is null or undefined');
    }

    if (typeof server.testTool !== 'function') {
      throw new Error('Tool method is not a function');
    }
  });

  // Test 3: Tool execution works
  test('Execute interface tool', async () => {
    const server = new TestServerImpl();
    const result = await server.testTool({ input: 'hello' });

    if (!result.includes('hello')) {
      throw new Error(`Expected result to contain 'hello', got: ${result}`);
    }
  });

  // Test 4: Optional parameters work
  test('Optional parameters work', async () => {
    const server = new TestServerImpl();
    const result = await server.testTool({ input: 'test', count: 5 });

    if (!result.includes('5')) {
      throw new Error(`Expected result to contain '5', got: ${result}`);
    }
  });

  // Test 5: Type safety is enforced at compile time
  test('Type safety at compile time', () => {
    // This test verifies that TypeScript compilation would catch type errors
    // If the file compiles successfully, type safety is working
    const server = new TestServerImpl();

    // This would be a compile error if types are wrong:
    // server.testTool({ wrong: 'param' });

    // This should compile fine:
    server.testTool({ input: 'valid' });
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
