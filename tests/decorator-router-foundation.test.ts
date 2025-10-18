/**
 * Decorator Router - Foundation Layer Tests
 *
 * Tests the core @Router decorator functionality:
 * - @Router decorator metadata storage
 * - getRouters() metadata extraction
 * - Adapter integration with BuildMCPServer
 * - Router tool registration and assignment
 * - Single router per class (foundation layer)
 * - Validation and error handling
 */

import 'reflect-metadata';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { MCPServer, Router, tool, getRouters, getTools, createServerFromClass } from '../src/api/decorator/index.js';
import type { RouterMetadata } from '../src/api/decorator/types.js';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

function section(msg: string) {
  console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`);
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}Decorator Router - Foundation Layer Tests${colors.reset}\n`);

  let allPassed = true;

  try {
    // ========================================================================
    // Test Group 1: Basic Decorator Application
    // ========================================================================
    section('Test Group 1: Basic Decorator Application');

    // Test 1.1: Can apply @Router decorator
    try {
      @MCPServer()
      @Router({
        name: 'test-router',
        description: 'Test router description',
        tools: ['tool1', 'tool2']
      })
      class TestServer {
        @tool('Test tool 1')
        tool1(value: string) {
          return `Tool1: ${value}`;
        }

        @tool('Test tool 2')
        tool2(num: number) {
          return `Tool2: ${num}`;
        }
      }

      pass('Can apply @Router decorator to class');
    } catch (error: any) {
      fail(`Cannot apply @Router decorator: ${error.message}`);
      allPassed = false;
    }

    // Test 1.2: Router decorator stores metadata
    try {
      @MCPServer()
      @Router({
        name: 'metadata-router',
        description: 'Router for testing metadata',
        tools: ['methodA', 'methodB']
      })
      class MetadataServer {
        @tool('Method A')
        methodA(x: string) {
          return x;
        }

        @tool('Method B')
        methodB(y: number) {
          return y;
        }
      }

      const routers = getRouters(MetadataServer);
      if (routers.length === 1) {
        pass('Router decorator stores metadata correctly');
      } else {
        fail(`Expected 1 router, got ${routers.length}`);
      }
    } catch (error: any) {
      fail(`Router metadata storage failed: ${error.message}`);
      allPassed = false;
    }

    // Test 1.3: getRouters() retrieves metadata
    try {
      @MCPServer()
      @Router({
        name: 'retrieval-router',
        description: 'Router for testing retrieval',
        tools: ['alpha', 'beta', 'gamma']
      })
      class RetrievalServer {
        @tool()
        alpha() { return 'a'; }

        @tool()
        beta() { return 'b'; }

        @tool()
        gamma() { return 'c'; }
      }

      const routers = getRouters(RetrievalServer);
      if (routers.length === 1 &&
          routers[0].name === 'retrieval-router' &&
          routers[0].description === 'Router for testing retrieval' &&
          routers[0].tools.length === 3 &&
          routers[0].tools[0] === 'alpha' &&
          routers[0].tools[1] === 'beta' &&
          routers[0].tools[2] === 'gamma') {
        pass('getRouters() retrieves correct metadata');
      } else {
        fail('getRouters() metadata mismatch');
      }
    } catch (error: any) {
      fail(`getRouters() retrieval failed: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 2: Validation and Error Handling
    // ========================================================================
    section('Test Group 2: Validation and Error Handling');

    // Test 2.1: Error when router name missing
    try {
      let errorThrown = false;
      try {
        @MCPServer()
        // @ts-expect-error - Testing missing name
        @Router({
          description: 'Router without name',
          tools: ['tool1']
        })
        class NoNameServer {
          @tool()
          tool1() { return 'test'; }
        }
      } catch (error: any) {
        if (error.message.includes('name') && error.message.includes('required')) {
          errorThrown = true;
        }
      }

      if (errorThrown) {
        pass('Error thrown when router name missing');
      } else {
        fail('Expected error for missing router name');
      }
    } catch (error: any) {
      fail(`Name validation test failed: ${error.message}`);
      allPassed = false;
    }

    // Test 2.2: Error when description missing
    try {
      let errorThrown = false;
      try {
        @MCPServer()
        // @ts-expect-error - Testing missing description
        @Router({
          name: 'no-desc-router',
          tools: ['tool1']
        })
        class NoDescServer {
          @tool()
          tool1() { return 'test'; }
        }
      } catch (error: any) {
        if (error.message.includes('description') && error.message.includes('required')) {
          errorThrown = true;
        }
      }

      if (errorThrown) {
        pass('Error thrown when router description missing');
      } else {
        fail('Expected error for missing router description');
      }
    } catch (error: any) {
      fail(`Description validation test failed: ${error.message}`);
      allPassed = false;
    }

    // Test 2.3: Error when tools not an array
    try {
      let errorThrown = false;
      try {
        @MCPServer()
        // @ts-expect-error - Testing invalid tools type
        @Router({
          name: 'bad-tools-router',
          description: 'Router with bad tools',
          tools: 'tool1,tool2'
        })
        class BadToolsServer {
          @tool()
          tool1() { return 'test'; }
        }
      } catch (error: any) {
        if (error.message.includes('tools') && error.message.includes('array')) {
          errorThrown = true;
        }
      }

      if (errorThrown) {
        pass('Error thrown when tools field is not an array');
      } else {
        fail('Expected error for non-array tools field');
      }
    } catch (error: any) {
      fail(`Tools validation test failed: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 3: Adapter Integration
    // ========================================================================
    section('Test Group 3: Adapter Integration');

    // Test 3.1: Adapter integrates with BuildMCPServer
    try {
      @MCPServer({ name: 'adapter-test', version: '1.0.0' })
      @Router({
        name: 'weather-router',
        description: 'Weather-related tools',
        tools: ['getWeather', 'getForecast']
      })
      class WeatherServer {
        @tool('Get current weather')
        getWeather(city: string) {
          return `Weather in ${city}`;
        }

        @tool('Get weather forecast')
        getForecast(city: string) {
          return `Forecast for ${city}`;
        }
      }

      // Create server from class (adapter should register router)
      const server = createServerFromClass(WeatherServer, __filename);
      const stats = server.getStats();

      // Should have 3 tools: weather-router (router tool), get-weather, get-forecast
      if (stats.tools === 3) {
        pass('Adapter integrates router with BuildMCPServer (3 tools total)');
      } else {
        fail(`Expected 3 tools (router + 2 assigned tools), got ${stats.tools}`);
      }
    } catch (error: any) {
      fail(`Adapter integration failed: ${error.message}`);
      allPassed = false;
    }

    // Test 3.2: Router tool is registered correctly
    try {
      @MCPServer({ name: 'router-reg-test', version: '1.0.0' })
      @Router({
        name: 'calc-router',
        description: 'Calculator operations',
        tools: ['add', 'subtract']
      })
      class CalcServer {
        @tool('Add two numbers')
        add(a: number, b: number) {
          return a + b;
        }

        @tool('Subtract two numbers')
        subtract(a: number, b: number) {
          return a - b;
        }
      }

      const server = createServerFromClass(CalcServer, __filename);
      const tools = Array.from((server as any).tools.keys());

      // Check that calc-router is in the tools list
      if (tools.includes('calc-router')) {
        pass('Router tool is registered with correct name');
      } else {
        fail(`Router 'calc-router' not found in tools: ${tools.join(', ')}`);
      }
    } catch (error: any) {
      fail(`Router tool registration failed: ${error.message}`);
      allPassed = false;
    }

    // Test 3.3: Tools are assigned to router (kebab-case conversion)
    try {
      @MCPServer({ name: 'kebab-test', version: '1.0.0' })
      @Router({
        name: 'data-router',
        description: 'Data operations',
        tools: ['getUserData', 'setUserData']
      })
      class DataServer {
        @tool('Get user data')
        getUserData(userId: string) {
          return `Data for ${userId}`;
        }

        @tool('Set user data')
        setUserData(userId: string, data: string) {
          return `Set data for ${userId}`;
        }
      }

      const server = createServerFromClass(DataServer, __filename);
      const routerToTools = (server as any).routerToTools;

      // Check that tools are assigned to router with kebab-case names
      if (routerToTools && routerToTools.has('data-router')) {
        const assignedTools = routerToTools.get('data-router');
        if (assignedTools.has('get-user-data') && assignedTools.has('set-user-data')) {
          pass('Tools assigned to router with kebab-case conversion');
        } else {
          fail(`Expected get-user-data and set-user-data, got: ${Array.from(assignedTools).join(', ')}`);
        }
      } else {
        fail('Router assignments not found');
      }
    } catch (error: any) {
      fail(`Tool assignment failed: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 4: Metadata Properties
    // ========================================================================
    section('Test Group 4: Metadata Properties');

    // Test 4.1: Router metadata includes optional metadata field
    try {
      @MCPServer()
      @Router({
        name: 'meta-router',
        description: 'Router with metadata',
        tools: ['tool1'],
        metadata: { version: '1.0', tags: ['test', 'demo'] }
      })
      class MetaServer {
        @tool()
        tool1() { return 'test'; }
      }

      const routers = getRouters(MetaServer);
      if (routers[0].metadata &&
          routers[0].metadata.version === '1.0' &&
          Array.isArray(routers[0].metadata.tags) &&
          routers[0].metadata.tags.length === 2) {
        pass('Router metadata includes optional metadata field');
      } else {
        fail('Router metadata field not stored correctly');
      }
    } catch (error: any) {
      fail(`Metadata field test failed: ${error.message}`);
      allPassed = false;
    }

    // Test 4.2: Empty tools array is valid
    try {
      @MCPServer()
      @Router({
        name: 'empty-router',
        description: 'Router with no tools yet',
        tools: []
      })
      class EmptyServer {
        @tool()
        tool1() { return 'test'; }
      }

      const routers = getRouters(EmptyServer);
      if (routers.length === 1 && routers[0].tools.length === 0) {
        pass('Empty tools array is valid');
      } else {
        fail('Empty tools array not handled correctly');
      }
    } catch (error: any) {
      fail(`Empty tools array test failed: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 5: Integration with Tools
    // ========================================================================
    section('Test Group 5: Integration with Tools');

    // Test 5.1: Works alongside @tool decorators
    try {
      @MCPServer()
      @Router({
        name: 'mixed-router',
        description: 'Router with decorated tools',
        tools: ['decorated1', 'decorated2']
      })
      class MixedServer {
        @tool('First decorated tool')
        decorated1(x: string) {
          return `D1: ${x}`;
        }

        @tool('Second decorated tool')
        decorated2(y: number) {
          return `D2: ${y}`;
        }

        @tool('Standalone tool')
        standalone() {
          return 'standalone';
        }
      }

      const routers = getRouters(MixedServer);

      // Router decorator works alongside tool decorators if router metadata is present
      if (routers.length === 1) {
        pass('Router works alongside @tool decorators');
      } else {
        fail(`Expected 1 router, got ${routers.length} routers`);
      }
    } catch (error: any) {
      fail(`Tool integration test failed: ${error.message}`);
      allPassed = false;
    }

    // Test 5.2: Router can reference auto-registered methods
    try {
      @MCPServer()
      @Router({
        name: 'auto-router',
        description: 'Router with auto-registered tools',
        tools: ['autoTool1', 'autoTool2']
      })
      class AutoServer {
        // Public methods auto-registered as tools
        autoTool1(x: string) {
          return `Auto1: ${x}`;
        }

        autoTool2(y: number) {
          return `Auto2: ${y}`;
        }
      }

      const routers = getRouters(AutoServer);
      if (routers.length === 1 && routers[0].tools.includes('autoTool1')) {
        pass('Router can reference auto-registered methods');
      } else {
        fail('Router cannot reference auto-registered methods');
      }
    } catch (error: any) {
      fail(`Auto-registration integration test failed: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Final Results
    // ========================================================================
    console.log(`\n${colors.bold}${allPassed ? colors.green : colors.red}All Tests ${allPassed ? 'Passed' : 'Failed'}${colors.reset}\n`);

    if (!allPassed) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n${colors.red}${colors.bold}Test Suite Error:${colors.reset} ${error.message}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`\n${colors.red}${colors.bold}Fatal Error:${colors.reset} ${error.message}\n`);
  process.exit(1);
});
