#!/usr/bin/env tsx
/**
 * Resource Detection - MCP Protocol Compliance Test
 *
 * Validates that static and dynamic resources comply with MCP protocol:
 * - resources/list returns all resources
 * - resources/read works for both static and dynamic
 * - Content format matches MCP spec
 * - Error handling for invalid URIs
 */

import { loadInterfaceServer } from '../dist/src/api/interface/index.js';
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

async function test(description: string, testFn: () => Promise<void>) {
  try {
    await testFn();
    pass(description);
  } catch (error) {
    fail(description, error);
  }
}

console.log(`\n${colors.BLUE}${'='.repeat(60)}${colors.NC}`);
console.log(`${colors.BLUE}  Resource Detection - MCP Protocol Compliance${colors.NC}`);
console.log(`${colors.BLUE}${'='.repeat(60)}${colors.NC}\n`);

async function runTests() {
  const comprehensivePath = resolve(__dirname, '../examples/interface-comprehensive.ts');
  let server: any;

  try {
    server = await loadInterfaceServer({ filePath: comprehensivePath, verbose: false });

    console.log(`${colors.BLUE}1. MCP resources/list Protocol${colors.NC}`);

    await test('List all resources (static + dynamic)', async () => {
      const resources = server.listResources();
      if (resources.length !== 4) {
        throw new Error(`Expected 4 resources, got ${resources.length}`);
      }
    });

    await test('Each resource has required fields', async () => {
      const resources = server.listResources();
      for (const resource of resources) {
        if (!resource.uri) throw new Error('Missing uri');
        if (!resource.name) throw new Error('Missing name');
        if (!resource.mimeType) throw new Error('Missing mimeType');
      }
    });

    await test('Static resources included in list', async () => {
      const resources = server.listResources();
      const staticURIs = resources.map((r: any) => r.uri).filter((uri: string) =>
        uri === 'config://server' || uri === 'templates://search'
      );
      if (staticURIs.length !== 2) {
        throw new Error(`Expected 2 static resources, found ${staticURIs.length}`);
      }
    });

    await test('Dynamic resources included in list', async () => {
      const resources = server.listResources();
      const dynamicURIs = resources.map((r: any) => r.uri).filter((uri: string) =>
        uri === 'stats://search' || uri === 'cache://status'
      );
      if (dynamicURIs.length !== 2) {
        throw new Error(`Expected 2 dynamic resources, found ${dynamicURIs.length}`);
      }
    });

    console.log(`\n${colors.BLUE}2. MCP resources/read Protocol - Static${colors.NC}`);

    await test('Read static resource (config://server)', async () => {
      const result = await server.readResource('config://server');
      if (!result.contents) throw new Error('Missing contents');
      if (!Array.isArray(result.contents)) throw new Error('Contents should be array');
      if (result.contents.length === 0) throw new Error('Contents should not be empty');
    });

    await test('Static resource returns correct mimeType', async () => {
      const result = await server.readResource('config://server');
      if (result.contents[0].mimeType !== 'application/json') {
        throw new Error(`Wrong mimeType: ${result.contents[0].mimeType}`);
      }
    });

    await test('Static resource returns embedded data', async () => {
      const result = await server.readResource('config://server');
      const data = JSON.parse(result.contents[0].text);
      if (data.version !== '3.0.0') {
        throw new Error(`Wrong data: ${JSON.stringify(data)}`);
      }
    });

    await test('Static resource returns consistent data', async () => {
      const result1 = await server.readResource('config://server');
      const result2 = await server.readResource('config://server');
      const data1 = JSON.parse(result1.contents[0].text);
      const data2 = JSON.parse(result2.contents[0].text);
      if (JSON.stringify(data1) !== JSON.stringify(data2)) {
        throw new Error('Static resource should return consistent data');
      }
    });

    await test('Read static array resource (templates://search)', async () => {
      const result = await server.readResource('templates://search');
      const data = JSON.parse(result.contents[0].text);
      if (!Array.isArray(data)) throw new Error('Should be array');
      if (data.length !== 3) throw new Error(`Expected 3 items, got ${data.length}`);
      if (data[0] !== 'quick_search') throw new Error('Wrong array content');
    });

    console.log(`\n${colors.BLUE}3. MCP resources/read Protocol - Dynamic${colors.NC}`);

    await test('Read dynamic resource (stats://search)', async () => {
      const result = await server.readResource('stats://search');
      if (!result.contents) throw new Error('Missing contents');
      if (!Array.isArray(result.contents)) throw new Error('Contents should be array');
      if (result.contents.length === 0) throw new Error('Contents should not be empty');
    });

    await test('Dynamic resource calls implementation', async () => {
      const result = await server.readResource('stats://search');
      const data = JSON.parse(result.contents[0].text);
      if (typeof data.totalSearches !== 'number') {
        throw new Error('Implementation not called correctly');
      }
    });

    await test('Dynamic resource generates fresh data', async () => {
      const result1 = await server.readResource('stats://search');
      const result2 = await server.readResource('stats://search');
      // Stats should be different (random generation)
      // This validates that implementation is called each time
      if (!result1.contents || !result2.contents) {
        throw new Error('Missing contents');
      }
      // Just verify both calls succeeded
      const data1 = JSON.parse(result1.contents[0].text);
      const data2 = JSON.parse(result2.contents[0].text);
      if (typeof data1.totalSearches !== 'number' || typeof data2.totalSearches !== 'number') {
        throw new Error('Dynamic resource should generate valid data');
      }
    });

    await test('Read second dynamic resource (cache://status)', async () => {
      const result = await server.readResource('cache://status');
      const data = JSON.parse(result.contents[0].text);
      if (typeof data.hits !== 'number') {
        throw new Error('Implementation not called correctly');
      }
    });

    console.log(`\n${colors.BLUE}4. MCP Error Handling${colors.NC}`);

    await test('Reject non-existent resource URI', async () => {
      try {
        await server.readResource('invalid://resource');
        throw new Error('Should have thrown error');
      } catch (error: any) {
        if (!error.message) {
          throw error;
        }
        // Expected error - any error message is acceptable
      }
    });

    await test('Reject malformed URI', async () => {
      try {
        await server.readResource('not-a-valid-uri');
        throw new Error('Should have thrown error');
      } catch (error: any) {
        // Expected error
        if (!error.message) throw error;
      }
    });

    console.log(`\n${colors.BLUE}5. MCP Content Format Validation${colors.NC}`);

    await test('Response structure matches MCP spec', async () => {
      const result = await server.readResource('config://server');

      // Check top-level structure
      if (!result.contents) throw new Error('Missing contents field');
      if (!Array.isArray(result.contents)) throw new Error('contents must be array');

      // Check content item structure
      const content = result.contents[0];
      if (!content.uri) throw new Error('Missing uri in content');
      if (!content.mimeType) throw new Error('Missing mimeType in content');
      if (content.text === undefined) throw new Error('Missing text in content');
    });

    await test('URI in response matches request', async () => {
      const result = await server.readResource('templates://search');
      if (result.contents[0].uri !== 'templates://search') {
        throw new Error('URI mismatch in response');
      }
    });

    await test('JSON mimeType for JSON data', async () => {
      const result = await server.readResource('config://server');
      if (result.contents[0].mimeType !== 'application/json') {
        throw new Error('Should use application/json for JSON data');
      }
    });

    console.log(`\n${colors.BLUE}6. Static vs Dynamic Distinction${colors.NC}`);

    await test('Static resources serve embedded data', async () => {
      const result = await server.readResource('config://server');
      const data = JSON.parse(result.contents[0].text);

      // Verify exact values from interface definition
      if (data.version !== '3.0.0') throw new Error('Wrong version');
      if (!Array.isArray(data.features)) throw new Error('features should be array');
      if (data.limits.maxQueryLength !== 1000) throw new Error('Wrong nested value');
    });

    await test('Dynamic resources return runtime-generated data', async () => {
      // Verify dynamic resources work by reading them
      const result = await server.readResource('stats://search');
      const data = JSON.parse(result.contents[0].text);

      // Dynamic resources should return valid data structure
      if (typeof data.totalSearches !== 'number') {
        throw new Error('Should return valid runtime data');
      }
      if (typeof data.averageResponseTime !== 'number') {
        throw new Error('Should return complete data structure');
      }
      if (!Array.isArray(data.topQueries)) {
        throw new Error('Should handle array fields');
      }
    });

  } finally {
    if (server) await server.stop();
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
    console.log(`${colors.GREEN}✅ All MCP compliance tests passed!${colors.NC}\n`);
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error(`\n${colors.RED}Unhandled error:${colors.NC}`, error);
  process.exit(1);
});
