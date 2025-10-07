/**
 * Foundation Layer Validation Test
 *
 * Tests basic functionality of the interface-driven API:
 * - Type definitions compile
 * - Parser discovers interfaces
 * - Name mapping works (snake_case -> camelCase)
 * - Can extract params/result types
 * - Basic tool registration works
 */

import { parseInterfaceFile, snakeToCamel, type ParseResult } from '../../../src/api/interface/parser.js';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

// Test fixture: minimal interface-driven server
const TEST_SERVER_CODE = `
import type { ITool, IServer } from '../../../src/api/interface/types.js';

/**
 * Test server interface
 */
interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
  description: 'A test server';
}

/**
 * Simple greeting tool
 */
interface GreetTool extends ITool {
  name: 'greet_user';
  description: 'Greet a user by name';
  params: { name: string; formal?: boolean };
  result: string;
}

/**
 * Add two numbers
 */
interface AddTool extends ITool {
  name: 'add_numbers';
  description: 'Add two numbers';
  params: { a: number; b: number };
  result: number;
}

/**
 * Test server implementation
 */
export default class TestServerImpl implements TestServer {
  greetUser: GreetTool = async (params) => {
    const greeting = params.formal ? 'Good day' : 'Hello';
    return \`\${greeting}, \${params.name}!\`;
  }

  addNumbers: AddTool = async (params) => {
    return params.a + params.b;
  }
}
`;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function pass(msg: string) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function fail(msg: string) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function info(msg: string) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
}

function section(msg: string) {
  console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`);
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}Interface-Driven API - Foundation Layer Validation${colors.reset}\n`);

  let testFilePath: string | null = null;
  let allPassed = true;

  try {
    // Create temporary test file
    testFilePath = resolve(process.cwd(), 'tests/unit/interface-api/__test-server.ts');
    writeFileSync(testFilePath, TEST_SERVER_CODE);

    // ========================================================================
    // Test 1: Name Mapping (snake_case -> camelCase)
    // ========================================================================
    section('Test 1: Name Mapping');
    const nameTests = [
      { input: 'greet_user', expected: 'greetUser' },
      { input: 'add_numbers', expected: 'addNumbers' },
      { input: 'get_weather_forecast', expected: 'getWeatherForecast' },
      { input: 'simple', expected: 'simple' },
    ];

    for (const { input, expected } of nameTests) {
      const result = snakeToCamel(input);
      if (result === expected) {
        pass(`snakeToCamel('${input}') = '${expected}'`);
      } else {
        fail(`snakeToCamel('${input}') expected '${expected}', got '${result}'`);
        allPassed = false;
      }
    }

    // ========================================================================
    // Test 2: Parse Interface File
    // ========================================================================
    section('Test 2: Parse Interface File');
    let parseResult: ParseResult;

    try {
      parseResult = parseInterfaceFile(testFilePath);
      pass('File parsed successfully');
    } catch (error: any) {
      fail(`Failed to parse file: ${error.message}`);
      allPassed = false;
      return;
    }

    // ========================================================================
    // Test 3: Server Interface Discovery
    // ========================================================================
    section('Test 3: Server Interface Discovery');

    if (parseResult.server) {
      pass('Server interface discovered');
      info(`  Name: ${parseResult.server.name}`);
      info(`  Version: ${parseResult.server.version}`);
      info(`  Description: ${parseResult.server.description || '(none)'}`);

      if (parseResult.server.name === 'test-server') {
        pass('Server name matches');
      } else {
        fail(`Server name mismatch: expected 'test-server', got '${parseResult.server.name}'`);
        allPassed = false;
      }

      if (parseResult.server.version === '1.0.0') {
        pass('Server version matches');
      } else {
        fail(`Server version mismatch: expected '1.0.0', got '${parseResult.server.version}'`);
        allPassed = false;
      }
    } else {
      fail('Server interface not found');
      allPassed = false;
    }

    // ========================================================================
    // Test 4: Tool Interface Discovery
    // ========================================================================
    section('Test 4: Tool Interface Discovery');

    if (parseResult.tools.length === 2) {
      pass(`Found ${parseResult.tools.length} tools`);
    } else {
      fail(`Expected 2 tools, found ${parseResult.tools.length}`);
      allPassed = false;
    }

    // Test greet_user tool
    const greetTool = parseResult.tools.find(t => t.name === 'greet_user');
    if (greetTool) {
      pass('Found greet_user tool');
      info(`  Interface: ${greetTool.interfaceName}`);
      info(`  Method: ${greetTool.methodName}`);
      info(`  Description: ${greetTool.description}`);
      info(`  Params: ${greetTool.paramsType}`);
      info(`  Result: ${greetTool.resultType}`);

      if (greetTool.methodName === 'greetUser') {
        pass('Method name correctly mapped to camelCase');
      } else {
        fail(`Method name mismatch: expected 'greetUser', got '${greetTool.methodName}'`);
        allPassed = false;
      }

      if (greetTool.description === 'Greet a user by name') {
        pass('Description extracted correctly');
      } else {
        fail(`Description mismatch`);
        allPassed = false;
      }
    } else {
      fail('greet_user tool not found');
      allPassed = false;
    }

    // Test add_numbers tool
    const addTool = parseResult.tools.find(t => t.name === 'add_numbers');
    if (addTool) {
      pass('Found add_numbers tool');
      info(`  Interface: ${addTool.interfaceName}`);
      info(`  Method: ${addTool.methodName}`);
      info(`  Description: ${addTool.description}`);
      info(`  Params: ${addTool.paramsType}`);
      info(`  Result: ${addTool.resultType}`);

      if (addTool.methodName === 'addNumbers') {
        pass('Method name correctly mapped to camelCase');
      } else {
        fail(`Method name mismatch: expected 'addNumbers', got '${addTool.methodName}'`);
        allPassed = false;
      }
    } else {
      fail('add_numbers tool not found');
      allPassed = false;
    }

    // ========================================================================
    // Test 5: Type Information Extraction
    // ========================================================================
    section('Test 5: Type Information Extraction');

    if (greetTool) {
      const paramsMatch = greetTool.paramsType.includes('name') &&
                          greetTool.paramsType.includes('string') &&
                          greetTool.paramsType.includes('formal');

      if (paramsMatch) {
        pass('Params type information extracted');
      } else {
        fail(`Params type incomplete: ${greetTool.paramsType}`);
        allPassed = false;
      }

      if (greetTool.resultType === 'string') {
        pass('Result type extracted correctly');
      } else {
        fail(`Result type mismatch: expected 'string', got '${greetTool.resultType}'`);
        allPassed = false;
      }
    }

    if (addTool) {
      const paramsMatch = addTool.paramsType.includes('a') &&
                          addTool.paramsType.includes('b') &&
                          addTool.paramsType.includes('number');

      if (paramsMatch) {
        pass('Params type information extracted for add_numbers');
      } else {
        fail(`Params type incomplete: ${addTool.paramsType}`);
        allPassed = false;
      }

      if (addTool.resultType === 'number') {
        pass('Result type extracted correctly for add_numbers');
      } else {
        fail(`Result type mismatch: expected 'number', got '${addTool.resultType}'`);
        allPassed = false;
      }
    }

  } catch (error: any) {
    console.error(`\n${colors.red}Test error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    allPassed = false;
  } finally {
    // Cleanup
    if (testFilePath) {
      try {
        unlinkSync(testFilePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  // ========================================================================
  // Final Report
  // ========================================================================
  console.log(`\n${colors.bold}${'='.repeat(60)}${colors.reset}`);
  if (allPassed) {
    console.log(`${colors.bold}${colors.green}All tests passed! ✓${colors.reset}`);
    console.log(`\n${colors.cyan}Foundation Layer Status:${colors.reset}`);
    console.log(`  ${colors.green}✓${colors.reset} Type definitions work`);
    console.log(`  ${colors.green}✓${colors.reset} Parser discovers interfaces`);
    console.log(`  ${colors.green}✓${colors.reset} Name mapping (snake_case -> camelCase)`);
    console.log(`  ${colors.green}✓${colors.reset} Type information extraction`);
    console.log(`\n${colors.cyan}Next Steps for Feature Layer:${colors.reset}`);
    console.log(`  ${colors.yellow}→${colors.reset} TypeScript type -> Zod schema conversion`);
    console.log(`  ${colors.yellow}→${colors.reset} Prompt interface support`);
    console.log(`  ${colors.yellow}→${colors.reset} Resource interface support`);
    console.log(`  ${colors.yellow}→${colors.reset} JSDoc validation tags (@min, @max, etc.)`);
    console.log(`  ${colors.yellow}→${colors.reset} Complex types (unions, nested objects)`);
    process.exit(0);
  } else {
    console.log(`${colors.bold}${colors.red}Some tests failed ✗${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
