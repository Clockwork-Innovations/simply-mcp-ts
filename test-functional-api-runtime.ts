#!/usr/bin/env node
/**
 * Functional API Runtime Test
 *
 * Tests the Functional/MCP Builder API to ensure:
 * - defineMCPBuilder works correctly
 * - Tool presets can be used
 * - Functional API configuration works
 */

import { defineMCPBuilder, DesignToolsPreset } from './dist/src/api/mcp/index.js';

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
  console.log('Running Functional API Runtime Tests...\n');

  // Test 1: defineMCPBuilder is exported
  test('defineMCPBuilder is exported', () => {
    if (typeof defineMCPBuilder !== 'function') {
      throw new Error('defineMCPBuilder is not a function');
    }
  });

  // Test 2: Can create MCP Builder with preset
  test('Create MCP Builder with DesignToolsPreset', () => {
    const config = defineMCPBuilder({
      name: 'test-mcp-builder',
      version: '1.0.0',
      description: 'Test MCP builder',
      toolPresets: [DesignToolsPreset],
    });

    if (!config) {
      throw new Error('Config is null or undefined');
    }

    if (config.name !== 'test-mcp-builder') {
      throw new Error(`Expected name 'test-mcp-builder', got '${config.name}'`);
    }
  });

  // Test 3: Config has correct structure
  test('Config has correct structure', () => {
    const config = defineMCPBuilder({
      name: 'structure-test',
      version: '2.0.0',
      description: 'Structure test',
      toolPresets: [DesignToolsPreset],
    });

    if (!config.name) {
      throw new Error('Config missing name property');
    }

    if (!config.version) {
      throw new Error('Config missing version property');
    }

    if (!config.toolPresets || !Array.isArray(config.toolPresets)) {
      throw new Error('Config missing or invalid toolPresets array');
    }
  });

  // Test 4: DesignToolsPreset is available
  test('DesignToolsPreset is exported', () => {
    if (!DesignToolsPreset) {
      throw new Error('DesignToolsPreset is not exported');
    }

    if (!DesignToolsPreset.name) {
      throw new Error('DesignToolsPreset missing name property');
    }
  });

  // Test 5: Can create minimal config
  test('Create minimal MCP Builder config', () => {
    const config = defineMCPBuilder({
      name: 'minimal-test',
      version: '1.0.0',
      toolPresets: [],
    });

    if (!config) {
      throw new Error('Minimal config creation failed');
    }

    if (config.toolPresets.length !== 0) {
      throw new Error('Expected empty toolPresets array');
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
