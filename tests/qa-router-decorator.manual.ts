/**
 * QA Test: @Router Decorator Foundation Layer
 *
 * This file contains comprehensive quality assurance tests for the @Router decorator.
 * It validates the foundation layer through practical, end-to-end scenarios that might
 * reveal issues not caught by unit tests.
 *
 * Test Scenarios:
 * 1. Decorator Application Works
 * 2. Metadata Storage/Retrieval Works
 * 3. Adapter Integration Works
 * 4. End-to-End Flow
 * 5. Error Handling Works
 * 6. Real BuildMCPServer Integration
 */

import { MCPServer, Router, tool } from '../src/index.js';
import { getRouters } from '../src/api/decorator/metadata.js';
import { getTools as getDecoratorTools } from '../src/api/decorator/metadata.js';
import { createServerFromClass } from '../src/api/decorator/adapter.js';
import { resolve } from 'node:path';
import { writeFileSync, unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

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
  throw new Error(msg);
}

function info(msg: string) {
  console.log(`${colors.cyan}  →${colors.reset} ${msg}`);
}

function section(msg: string) {
  console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`);
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}QA Test: @Router Decorator Foundation Layer${colors.reset}\n`);

  let allPassed = true;

  try {
    // ========================================================================
    // Test Scenario 1: Decorator Application Works
    // ========================================================================
    section('Test Scenario 1: Decorator Application Works');

    try {
      // Test 1.1: Apply @Router with all required fields
      info('Creating class with @Router decorator...');

      @MCPServer({ name: 'test-server', version: '1.0.0' })
      @Router({
        name: 'weather-router',
        description: 'Weather operations',
        tools: ['getWeather', 'getForecast']
      })
      class TestServer1 {
        @tool('Get current weather')
        getWeather(city: string) {
          return `Weather in ${city}`;
        }

        @tool('Get forecast')
        getForecast(city: string, days: number) {
          return `Forecast for ${city} for ${days} days`;
        }
      }

      pass('Decorator applied successfully with no errors');
      info('Class definition complete');
    } catch (error: any) {
      fail(`Decorator application failed: ${error.message}`);
      allPassed = false;
    }

    // Test 1.2: Export the class (verify no export errors)
    try {
      @MCPServer({ name: 'export-test', version: '1.0.0' })
      @Router({
        name: 'test-router',
        description: 'Test router',
        tools: ['testTool']
      })
      class ExportableServer {
        @tool('Test tool')
        testTool() {
          return 'test';
        }
      }

      const exported = ExportableServer;
      if (exported && typeof exported === 'function') {
        pass('Class can be exported without errors');
      } else {
        fail('Class export failed');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Export test failed: ${error.message}`);
      allPassed = false;
    }

    // Test 1.3: Multiple decorators on same class
    try {
      @MCPServer({ name: 'multi-decorator', version: '1.0.0' })
      @Router({
        name: 'router-1',
        description: 'First router',
        tools: ['tool1']
      })
      class MultiDecoratorServer {
        @tool('Tool 1')
        tool1() {
          return 'result1';
        }
      }

      pass('Multiple decorators (@MCPServer + @Router) work together');
    } catch (error: any) {
      fail(`Multiple decorators failed: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Scenario 2: Metadata Storage/Retrieval Works
    // ========================================================================
    section('Test Scenario 2: Metadata Storage/Retrieval Works');

    // Test 2.1: Call getRouters() and verify metadata
    try {
      @MCPServer({ name: 'metadata-test', version: '1.0.0' })
      @Router({
        name: 'test-router',
        description: 'Test router description',
        tools: ['tool1', 'tool2']
      })
      class MetadataTestServer {
        @tool('Tool 1')
        tool1() {
          return 'result1';
        }

        @tool('Tool 2')
        tool2() {
          return 'result2';
        }
      }

      const routers = getRouters(MetadataTestServer);

      if (!routers || routers.length === 0) {
        fail('getRouters() returned no routers');
        allPassed = false;
      } else if (routers.length !== 1) {
        fail(`Expected 1 router, got ${routers.length}`);
        allPassed = false;
      } else {
        pass('getRouters() retrieved router metadata');
        info(`Found ${routers.length} router(s)`);
      }
    } catch (error: any) {
      fail(`Metadata retrieval failed: ${error.message}`);
      allPassed = false;
    }

    // Test 2.2: Verify metadata contains correct values
    try {
      @MCPServer({ name: 'value-test', version: '1.0.0' })
      @Router({
        name: 'my-router',
        description: 'My router description',
        tools: ['methodA', 'methodB']
      })
      class ValueTestServer {
        @tool('Method A')
        methodA() {
          return 'A';
        }

        @tool('Method B')
        methodB() {
          return 'B';
        }
      }

      const routers = getRouters(ValueTestServer);
      const router = routers[0];

      let valuesCorrect = true;
      let errorMsg = '';

      if (router.name !== 'my-router') {
        valuesCorrect = false;
        errorMsg += `Expected name 'my-router', got '${router.name}'. `;
      }

      if (router.description !== 'My router description') {
        valuesCorrect = false;
        errorMsg += `Expected description 'My router description', got '${router.description}'. `;
      }

      if (!Array.isArray(router.tools) || router.tools.length !== 2) {
        valuesCorrect = false;
        errorMsg += `Expected tools array with 2 elements, got ${router.tools}. `;
      }

      if (router.tools[0] !== 'methodA' || router.tools[1] !== 'methodB') {
        valuesCorrect = false;
        errorMsg += `Expected tools ['methodA', 'methodB'], got ${JSON.stringify(router.tools)}. `;
      }

      if (valuesCorrect) {
        pass('Metadata contains exact values provided');
        info(`name: ${router.name}`);
        info(`description: ${router.description}`);
        info(`tools: ${router.tools.join(', ')}`);
      } else {
        fail(`Metadata values incorrect: ${errorMsg}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Metadata value verification failed: ${error.message}`);
      allPassed = false;
    }

    // Test 2.3: Verify optional metadata field
    try {
      @MCPServer({ name: 'optional-test', version: '1.0.0' })
      @Router({
        name: 'router-with-meta',
        description: 'Router with metadata',
        tools: ['tool1'],
        metadata: { category: 'weather', priority: 'high' }
      })
      class OptionalMetadataServer {
        @tool('Tool 1')
        tool1() {
          return 'result';
        }
      }

      const routers = getRouters(OptionalMetadataServer);
      const router = routers[0];

      if (router.metadata && router.metadata.category === 'weather' && router.metadata.priority === 'high') {
        pass('Optional metadata field works correctly');
        info(`metadata: ${JSON.stringify(router.metadata)}`);
      } else {
        fail(`Optional metadata not stored correctly: ${JSON.stringify(router.metadata)}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Optional metadata test failed: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Scenario 3: Adapter Integration Works
    // ========================================================================
    section('Test Scenario 3: Adapter Integration Works');

    // Test 3.1: Create a test file and load it via adapter
    try {
      info('Creating temporary test file...');

      const testFilePath = resolve(process.cwd(), 'tests/temp-router-test.ts');
      const testFileContent = `
import { MCPServer, Router, tool } from '../src/index.js';

@MCPServer({ name: 'adapter-test', version: '1.0.0' })
@Router({
  name: 'weather-ops',
  description: 'Weather operations',
  tools: ['getWeather', 'getForecast']
})
export default class WeatherServer {
  @tool('Get current weather')
  getWeather(city: string) {
    return \`Weather in \${city}\`;
  }

  @tool('Get forecast')
  getForecast(city: string, days: number) {
    return \`Forecast for \${city} for \${days} days\`;
  }
}
`;

      writeFileSync(testFilePath, testFileContent, 'utf-8');
      info('Test file created');

      // Load the class
      const { default: ServerClass } = await import(pathToFileURL(testFilePath).href);

      if (!ServerClass) {
        fail('Adapter failed to load decorated class');
        allPassed = false;
      } else {
        pass('Adapter successfully loaded decorated class');

        // Create server from class
        const server = createServerFromClass(ServerClass, testFilePath);

        if (!server) {
          fail('createServerFromClass failed to create server');
          allPassed = false;
        } else {
          pass('createServerFromClass created server successfully');

          // Verify server has tools
          const stats = server.getStats();
          info(`Server has ${stats.tools} tools, ${stats.routers} routers`);

          if (stats.routers === 1) {
            pass('Router tool registered in server');
          } else {
            fail(`Expected 1 router, got ${stats.routers}`);
            allPassed = false;
          }
        }
      }

      // Cleanup
      try {
        unlinkSync(testFilePath);
        info('Cleaned up temporary test file');
      } catch (e) {
        // Ignore cleanup errors
      }
    } catch (error: any) {
      fail(`Adapter integration test failed: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Scenario 4: End-to-End Flow
    // ========================================================================
    section('Test Scenario 4: End-to-End Flow');

    // Test 4.1: Complete workflow from decorator to tool execution
    try {
      info('Creating realistic weather server example...');

      // First write a temp file
      const tempFile = resolve(process.cwd(), 'tests/temp-e2e.ts');
      const tempContent = `
import { MCPServer, Router, tool } from '../src/index.js';

@MCPServer({ name: 'weather', version: '1.0.0' })
@Router({
  name: 'weather-tools',
  description: 'Weather operations',
  tools: ['getWeather', 'getForecast']
})
export default class WeatherServer {
  @tool('Get current weather')
  getWeather(city: string) {
    return \`Weather in \${city}: Sunny, 75°F\`;
  }

  @tool('Get forecast')
  getForecast(city: string, days: number) {
    return \`\${days}-day forecast for \${city}: Mostly sunny\`;
  }
}
`;

      writeFileSync(tempFile, tempContent, 'utf-8');

      // Load and create server
      const { default: WeatherServer } = await import(pathToFileURL(tempFile).href);
      const server = createServerFromClass(WeatherServer, tempFile);

      // List tools
      const tools = server.getTools();
      info(`Server has ${tools.size} total tools`);

      // Check for router tool
      const hasRouterTool = tools.has('weather-tools');
      if (hasRouterTool) {
        pass('Router tool appears in tools list');
      } else {
        fail('Router tool not found in tools list');
        allPassed = false;
      }

      // Check for regular tools
      const hasWeatherTool = tools.has('get-weather');
      const hasForecastTool = tools.has('get-forecast');

      if (hasWeatherTool && hasForecastTool) {
        pass('Regular tools registered correctly (kebab-case conversion)');
        info('Tools: get-weather, get-forecast');
      } else {
        fail(`Tools not found: hasWeatherTool=${hasWeatherTool}, hasForecastTool=${hasForecastTool}`);
        allPassed = false;
      }

      // Execute router tool (should return list of assigned tools)
      const routerResult = await server.executeToolDirect('weather-tools', {});

      if (routerResult && routerResult.content && routerResult.content[0]) {
        const parsedResult = JSON.parse(routerResult.content[0].text);

        if (parsedResult.tools && Array.isArray(parsedResult.tools)) {
          pass('Calling router returns tool list in MCP format');
          info(`Router returned ${parsedResult.tools.length} tools`);

          // Verify assigned tools are in the list
          const toolNames = parsedResult.tools.map((t: any) => t.name);
          if (toolNames.includes('get-weather') && toolNames.includes('get-forecast')) {
            pass('Assigned tools appear in router response');
            info(`Tools: ${toolNames.join(', ')}`);
          } else {
            fail(`Expected tools not in router response: ${toolNames.join(', ')}`);
            allPassed = false;
          }
        } else {
          fail(`Router didn't return correct format: ${JSON.stringify(parsedResult)}`);
          allPassed = false;
        }
      } else {
        fail('Router execution failed');
        allPassed = false;
      }

      // Execute regular tool
      const weatherResult = await server.executeToolDirect('get-weather', { city: 'NYC' });

      if (weatherResult && weatherResult.content && weatherResult.content[0]) {
        if (weatherResult.content[0].text.includes('NYC')) {
          pass('Regular tool execution works');
          info(`Result: ${weatherResult.content[0].text}`);
        } else {
          fail(`Tool execution returned unexpected result: ${weatherResult.content[0].text}`);
          allPassed = false;
        }
      } else {
        fail('Tool execution failed');
        allPassed = false;
      }

      // Cleanup
      try {
        unlinkSync(tempFile);
        info('Cleaned up E2E temp file');
      } catch (e) {
        // Ignore cleanup errors
      }

    } catch (error: any) {
      fail(`End-to-end flow failed: ${error.message}`);
      console.error(error.stack);
      allPassed = false;
    }

    // ========================================================================
    // Test Scenario 5: Error Handling Works
    // ========================================================================
    section('Test Scenario 5: Error Handling Works');

    // Test 5.1: Missing name field
    try {
      let errorCaught = false;
      let errorMessage = '';

      try {
        @MCPServer({ name: 'error-test-1', version: '1.0.0' })
        @Router({
          description: 'Missing name',
          tools: ['tool1']
        } as any)
        class ErrorServer1 {
          @tool('Tool 1')
          tool1() {
            return 'test';
          }
        }
      } catch (error: any) {
        errorCaught = true;
        errorMessage = error.message;
      }

      if (errorCaught && errorMessage.toLowerCase().includes('name')) {
        pass('Error thrown for missing name field');
        info(`Error: ${errorMessage.substring(0, 100)}...`);
      } else {
        fail(`Expected error for missing name, got: ${errorMessage || 'no error'}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Error handling test failed: ${error.message}`);
      allPassed = false;
    }

    // Test 5.2: Missing description field
    try {
      let errorCaught = false;
      let errorMessage = '';

      try {
        @MCPServer({ name: 'error-test-2', version: '1.0.0' })
        @Router({
          name: 'test-router',
          tools: ['tool1']
        } as any)
        class ErrorServer2 {
          @tool('Tool 1')
          tool1() {
            return 'test';
          }
        }
      } catch (error: any) {
        errorCaught = true;
        errorMessage = error.message;
      }

      if (errorCaught && errorMessage.toLowerCase().includes('description')) {
        pass('Error thrown for missing description field');
        info(`Error: ${errorMessage.substring(0, 100)}...`);
      } else {
        fail(`Expected error for missing description, got: ${errorMessage || 'no error'}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Error handling test failed: ${error.message}`);
      allPassed = false;
    }

    // Test 5.3: Tools not array
    try {
      let errorCaught = false;
      let errorMessage = '';

      try {
        @MCPServer({ name: 'error-test-3', version: '1.0.0' })
        @Router({
          name: 'test-router',
          description: 'Test',
          tools: 'not-an-array'
        } as any)
        class ErrorServer3 {
          @tool('Tool 1')
          tool1() {
            return 'test';
          }
        }
      } catch (error: any) {
        errorCaught = true;
        errorMessage = error.message;
      }

      if (errorCaught && errorMessage.toLowerCase().includes('array')) {
        pass('Error thrown when tools is not an array');
        info(`Error: ${errorMessage.substring(0, 100)}...`);
      } else {
        fail(`Expected error for tools not array, got: ${errorMessage || 'no error'}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Error handling test failed: ${error.message}`);
      allPassed = false;
    }

    // Test 5.4: Invalid config type
    try {
      let errorCaught = false;
      let errorMessage = '';

      try {
        @MCPServer({ name: 'error-test-4', version: '1.0.0' })
        @Router('invalid-config' as any)
        class ErrorServer4 {
          @tool('Tool 1')
          tool1() {
            return 'test';
          }
        }
      } catch (error: any) {
        errorCaught = true;
        errorMessage = error.message;
      }

      if (errorCaught && errorMessage.toLowerCase().includes('object')) {
        pass('Error thrown for invalid config type');
        info(`Error: ${errorMessage.substring(0, 100)}...`);
      } else {
        fail(`Expected error for invalid config, got: ${errorMessage || 'no error'}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Error handling test failed: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Scenario 6: Real BuildMCPServer Integration
    // ========================================================================
    section('Test Scenario 6: Real BuildMCPServer Integration');

    // Test 6.1: Router tool is actually registered in BuildMCPServer
    try {
      @MCPServer({ name: 'integration-test', version: '1.0.0' })
      @Router({
        name: 'ops-router',
        description: 'Operations router',
        tools: ['operation1', 'operation2']
      })
      class IntegrationServer {
        @tool('Operation 1')
        operation1() {
          return 'op1 result';
        }

        @tool('Operation 2')
        operation2() {
          return 'op2 result';
        }
      }

      const tempFile = resolve(process.cwd(), 'tests/temp-integration.ts');
      const server = createServerFromClass(IntegrationServer, tempFile);

      // Verify router is registered
      const stats = server.getStats();
      if (stats.routers === 1) {
        pass('Router tool is registered in BuildMCPServer');
      } else {
        fail(`Expected 1 router, got ${stats.routers}`);
        allPassed = false;
      }

      // Verify tools are assigned
      if (stats.assignedTools === 2) {
        pass('Tools are correctly assigned to router');
        info(`Assigned tools: ${stats.assignedTools}`);
      } else {
        fail(`Expected 2 assigned tools, got ${stats.assignedTools}`);
        allPassed = false;
      }

    } catch (error: any) {
      fail(`BuildMCPServer integration test failed: ${error.message}`);
      allPassed = false;
    }

    // Test 6.2: Calling router returns assigned tools
    try {
      @MCPServer({ name: 'call-test', version: '1.0.0' })
      @Router({
        name: 'my-ops',
        description: 'My operations',
        tools: ['func1', 'func2']
      })
      class CallTestServer {
        @tool('Function 1')
        func1() {
          return 'result1';
        }

        @tool('Function 2')
        func2() {
          return 'result2';
        }
      }

      const tempFile = resolve(process.cwd(), 'tests/temp-call-test.ts');
      const server = createServerFromClass(CallTestServer, tempFile);

      // Call router
      const result = await server.executeToolDirect('my-ops', {});

      if (result && result.content && result.content[0]) {
        const parsed = JSON.parse(result.content[0].text);

        if (parsed.tools && parsed.tools.length === 2) {
          pass('Router call returns assigned tools list');

          const toolNames = parsed.tools.map((t: any) => t.name);
          if (toolNames.includes('func-1') && toolNames.includes('func-2')) {
            pass('Assigned tools have correct names (kebab-case)');
          } else {
            fail(`Tool names incorrect: ${toolNames.join(', ')}`);
            allPassed = false;
          }
        } else {
          fail(`Expected 2 tools in router response, got ${parsed.tools?.length || 0}`);
          allPassed = false;
        }
      } else {
        fail('Router call failed');
        allPassed = false;
      }

    } catch (error: any) {
      fail(`Router call test failed: ${error.message}`);
      allPassed = false;
    }

    // Test 6.3: No unexpected side effects
    try {
      @MCPServer({ name: 'side-effect-test', version: '1.0.0' })
      @Router({
        name: 'router-test',
        description: 'Test router',
        tools: ['assigned1']
      })
      class SideEffectServer {
        @tool('Assigned 1')
        assigned1() {
          return 'assigned';
        }

        @tool('Unassigned')
        unassigned() {
          return 'not assigned';
        }
      }

      const tempFile = resolve(process.cwd(), 'tests/temp-side-effect.ts');
      const server = createServerFromClass(SideEffectServer, tempFile);

      // Verify both tools exist
      const tools = server.getTools();
      if (tools.has('assigned-1') && tools.has('unassigned')) {
        pass('No unexpected side effects on tool registration');
      } else {
        fail(`Tools missing: has assigned-1=${tools.has('assigned-1')}, has unassigned=${tools.has('unassigned')}`);
        allPassed = false;
      }

      // Verify router exists
      if (tools.has('router-test')) {
        pass('Router tool registered alongside regular tools');
      } else {
        fail('Router tool not found');
        allPassed = false;
      }

    } catch (error: any) {
      fail(`Side effects test failed: ${error.message}`);
      allPassed = false;
    }

  } catch (error: any) {
    console.error(`\n${colors.red}Fatal test error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    allPassed = false;
  }

  // ========================================================================
  // Final Report
  // ========================================================================
  console.log(`\n${colors.bold}${'='.repeat(70)}${colors.reset}`);
  if (allPassed) {
    console.log(`${colors.bold}${colors.green}All QA tests passed! ✓${colors.reset}`);
    console.log(`\n${colors.cyan}Foundation Layer Status:${colors.reset}`);
    console.log(`  ${colors.green}✓${colors.reset} Decorator application works`);
    console.log(`  ${colors.green}✓${colors.reset} Metadata storage/retrieval works`);
    console.log(`  ${colors.green}✓${colors.reset} Adapter integration works`);
    console.log(`  ${colors.green}✓${colors.reset} End-to-end flow works`);
    console.log(`  ${colors.green}✓${colors.reset} Error handling works`);
    console.log(`  ${colors.green}✓${colors.reset} BuildMCPServer integration works`);
    console.log(`\n${colors.cyan}Verdict:${colors.reset} ${colors.bold}${colors.green}Foundation layer ready for feature layer${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.bold}${colors.red}Some QA tests failed ✗${colors.reset}`);
    console.log(`\n${colors.yellow}Please review test output above for details.${colors.reset}`);
    process.exit(1);
  }
}

// pathToFileURL is now imported at the top

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
