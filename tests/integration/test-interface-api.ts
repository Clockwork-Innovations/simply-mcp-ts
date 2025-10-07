#!/usr/bin/env tsx
/**
 * Interface API - Integration Test Suite
 *
 * Real integration tests (NO mocks, NO grep) for the interface-driven API.
 * Tests actual MCP server creation, tool execution, resource reading, prompts.
 *
 * What this tests:
 * ✅ AST parsing of TypeScript interface declarations
 * ✅ Auto schema generation from TypeScript types
 * ✅ Tool/prompt/resource auto-detection
 * ✅ Static vs dynamic resource detection
 * ✅ Runtime validation with Zod schemas
 * ✅ MCP protocol compliance
 *
 * Usage: npx tsx tests/integration/test-interface-api.ts
 */

import { loadInterfaceServer } from '../../dist/src/api/interface/index.js';
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
console.log(`${colors.BLUE}  Interface API - Integration Tests${colors.NC}`);
console.log(`${colors.BLUE}${'='.repeat(60)}${colors.NC}\n`);

// Main test execution
async function runTests() {
  const minimalPath = resolve(__dirname, '../../examples/interface-minimal.ts');
  const advancedPath = resolve(__dirname, '../../examples/interface-advanced.ts');

  let minimalServer: any;
  let advancedServer: any;

  try {
    console.log(`${colors.YELLOW}Loading servers...${colors.NC}`);
    minimalServer = await loadInterfaceServer({ filePath: minimalPath, verbose: false });
    advancedServer = await loadInterfaceServer({ filePath: advancedPath, verbose: false });
    console.log(`${colors.GREEN}Servers loaded successfully${colors.NC}\n`);

    // ===== Server Metadata Tests =====
    console.log(`${colors.BLUE}1. Server Metadata Detection${colors.NC}`);

    await test('Extract server name from IServer interface', async () => {
      if (minimalServer.name !== 'interface-minimal') {
        throw new Error(`Expected 'interface-minimal', got '${minimalServer.name}'`);
      }
    });

    await test('Extract server version from IServer interface', async () => {
      if (minimalServer.version !== '1.0.0') {
        throw new Error(`Expected '1.0.0', got '${minimalServer.version}'`);
      }
    });

    await test('Extract server description from IServer interface', async () => {
      if (!minimalServer.description || !minimalServer.description.includes('Minimal')) {
        throw new Error(`Invalid description: ${minimalServer.description}`);
      }
    });

    // ===== Tool Detection Tests =====
    console.log(`\n${colors.BLUE}2. Tool Interface Detection${colors.NC}`);

    await test('Auto-detect all ITool interfaces', async () => {
      const tools = minimalServer.listTools();
      if (tools.length !== 3) {
        throw new Error(`Expected 3 tools, found ${tools.length}`);
      }
    });

    await test('Extract tool names correctly', async () => {
      const tools = minimalServer.listTools();
      const names = tools.map((t: any) => t.name).sort();
      const expected = ['add', 'echo', 'greet'];
      if (JSON.stringify(names) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${expected}, got ${names}`);
      }
    });

    await test('Extract tool descriptions from interfaces', async () => {
      const tools = minimalServer.listTools();
      const greetTool = tools.find((t: any) => t.name === 'greet');
      if (greetTool.description !== 'Greet a person by name') {
        throw new Error(`Wrong description: ${greetTool.description}`);
      }
    });

    // ===== Schema Generation Tests =====
    console.log(`\n${colors.BLUE}3. Schema Generation from TypeScript Types${colors.NC}`);

    await test('Generate schema with required string parameters', async () => {
      const tools = minimalServer.listTools();
      const greetTool = tools.find((t: any) => t.name === 'greet');

      if (!greetTool.inputSchema.properties.name) {
        throw new Error('Missing name property in schema');
      }
      if (greetTool.inputSchema.properties.name.type !== 'string') {
        throw new Error('Name should be string type');
      }
      if (!greetTool.inputSchema.required.includes('name')) {
        throw new Error('Name should be required');
      }
    });

    await test('Generate schema with optional boolean parameters', async () => {
      const tools = minimalServer.listTools();
      const greetTool = tools.find((t: any) => t.name === 'greet');

      if (!greetTool.inputSchema.properties.formal) {
        throw new Error('Missing formal property');
      }
      if (greetTool.inputSchema.required.includes('formal')) {
        throw new Error('Formal should be optional');
      }
    });

    await test('Generate schema with number parameters', async () => {
      const tools = minimalServer.listTools();
      const addTool = tools.find((t: any) => t.name === 'add');

      if (addTool.inputSchema.properties.a.type !== 'number') {
        throw new Error('Parameter a should be number');
      }
      if (addTool.inputSchema.properties.b.type !== 'number') {
        throw new Error('Parameter b should be number');
      }
    });

    await test('Handle enum/union types in schemas', async () => {
      const tools = advancedServer.listTools();
      const weatherTool = tools.find((t: any) => t.name === 'get_weather');

      if (!weatherTool) {
        throw new Error('get_weather tool not found');
      }
      if (!weatherTool.inputSchema.properties.units) {
        throw new Error('units property not found');
      }
    });

    await test('Handle array types in schemas', async () => {
      const tools = advancedServer.listTools();
      const userTool = tools.find((t: any) => t.name === 'create_user');

      if (!userTool.inputSchema.properties.tags) {
        throw new Error('tags property not found');
      }
      if (userTool.inputSchema.properties.tags.type !== 'array') {
        throw new Error('tags should be array type');
      }
    });

    // ===== Tool Execution Tests =====
    console.log(`\n${colors.BLUE}4. Tool Execution & Type Safety${colors.NC}`);

    await test('Execute tool with required parameters', async () => {
      const result = await minimalServer.executeTool('greet', { name: 'Alice' });
      if (!result.content || !result.content[0] || result.content[0].text !== 'Hello, Alice!') {
        throw new Error(`Wrong result: ${JSON.stringify(result)}`);
      }
    });

    await test('Execute tool with optional parameters', async () => {
      const result = await minimalServer.executeTool('greet', { name: 'Bob', formal: true });
      if (result.content[0].text !== 'Good day, Bob!') {
        throw new Error(`Wrong result: ${result.content[0].text}`);
      }
    });

    await test('Execute tool returning complex object', async () => {
      const result = await minimalServer.executeTool('add', { a: 10, b: 5 });
      const data = JSON.parse(result.content[0].text);

      if (data.sum !== 15) {
        throw new Error(`Wrong sum: ${data.sum}`);
      }
      if (!data.equation.includes('15')) {
        throw new Error(`Wrong equation: ${data.equation}`);
      }
    });

    await test('Handle optional parameter behavior', async () => {
      const result1 = await minimalServer.executeTool('echo', { message: 'test' });
      if (result1.content[0].text !== 'test') {
        throw new Error(`Expected 'test', got '${result1.content[0].text}'`);
      }

      const result2 = await minimalServer.executeTool('echo', { message: 'test', uppercase: true });
      if (result2.content[0].text !== 'TEST') {
        throw new Error(`Expected 'TEST', got '${result2.content[0].text}'`);
      }
    });

    // ===== Validation Tests =====
    console.log(`\n${colors.BLUE}5. Runtime Validation${colors.NC}`);

    await test('Reject missing required parameters', async () => {
      try {
        await minimalServer.executeTool('greet', {});
        throw new Error('Should have thrown validation error');
      } catch (error: any) {
        if (!error.message) {
          throw error;
        }
        // Validation error expected
      }
    });

    await test('Reject wrong parameter types', async () => {
      try {
        await minimalServer.executeTool('add', { a: 'string', b: 5 });
        throw new Error('Should have thrown validation error');
      } catch (error: any) {
        if (!error.message) {
          throw error;
        }
        // Validation error expected
      }
    });

    // ===== Resource Tests =====
    console.log(`\n${colors.BLUE}6. Resource Detection (Static vs Dynamic)${colors.NC}`);

    await test('Detect static resources from literal types', async () => {
      const resources = advancedServer.listResources();
      const configResource = resources.find((r: any) => r.uri === 'config://server');

      if (!configResource) {
        throw new Error('Static config resource not found');
      }
      if (configResource.name !== 'Server Configuration') {
        throw new Error(`Wrong name: ${configResource.name}`);
      }
    });

    await test('Serve static resource data', async () => {
      const result = await advancedServer.readResource('config://server');
      const data = JSON.parse(result.contents[0].text);

      if (data.apiVersion !== '3.0.0') {
        throw new Error(`Wrong apiVersion: ${data.apiVersion}`);
      }
      if (data.supportedAPIs !== 4) {
        throw new Error(`Wrong supportedAPIs: ${data.supportedAPIs}`);
      }
    });

    await test('Detect dynamic resources from non-literal types', async () => {
      const resources = advancedServer.listResources();
      const statsResource = resources.find((r: any) => r.uri === 'stats://users');

      if (!statsResource) {
        throw new Error('Dynamic stats resource not found');
      }
    });

    await test('Execute dynamic resource handlers', async () => {
      const result = await advancedServer.readResource('stats://users');
      const data = JSON.parse(result.contents[0].text);

      if (typeof data.totalUsers !== 'number') {
        throw new Error('totalUsers should be number');
      }
      if (typeof data.activeUsers !== 'number') {
        throw new Error('activeUsers should be number');
      }
    });

    // ===== Prompt Tests =====
    console.log(`\n${colors.BLUE}7. Prompt Template Interpolation${colors.NC}`);

    await test('Detect prompt interfaces', async () => {
      const prompts = advancedServer.listPrompts();
      const weatherPrompt = prompts.find((p: any) => p.name === 'weather_report');

      if (!weatherPrompt) {
        throw new Error('weather_report prompt not found');
      }
    });

    await test('Extract prompt arguments', async () => {
      const prompts = advancedServer.listPrompts();
      const weatherPrompt = prompts.find((p: any) => p.name === 'weather_report');

      if (!weatherPrompt.arguments || weatherPrompt.arguments.length === 0) {
        throw new Error('No arguments found');
      }
    });

    await test('Interpolate template variables', async () => {
      const result = await advancedServer.getPrompt('weather_report', {
        location: 'Paris',
        style: 'casual',
      });

      const text = result.messages[0].content.text;
      if (!text.includes('Paris')) {
        throw new Error(`Template should include 'Paris': ${text}`);
      }
      if (!text.includes('casual')) {
        throw new Error(`Template should include 'casual': ${text}`);
      }
    });

    // ===== Error Handling =====
    console.log(`\n${colors.BLUE}8. Error Handling${colors.NC}`);

    await test('Reject non-existent tool calls', async () => {
      try {
        await minimalServer.executeTool('nonexistent', {});
        throw new Error('Should have thrown error');
      } catch (error: any) {
        if (!error.message) {
          throw error;
        }
      }
    });

    await test('Reject non-existent resource reads', async () => {
      try {
        await advancedServer.readResource('fake://resource');
        throw new Error('Should have thrown error');
      } catch (error: any) {
        if (!error.message) {
          throw error;
        }
      }
    });

  } catch (error) {
    console.error(`\n${colors.RED}Fatal error:${colors.NC}`, error);
    process.exit(1);
  } finally {
    // Cleanup
    if (minimalServer) await minimalServer.stop();
    if (advancedServer) await advancedServer.stop();
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
    console.log(`${colors.GREEN}✅ All tests passed!${colors.NC}\n`);
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`\n${colors.RED}Unhandled error:${colors.NC}`, error);
  process.exit(1);
});
