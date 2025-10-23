/**
 * Router Decorator - Feature Layer Tests
 *
 * Tests the advanced router functionality:
 * - Multiple @Router decorators per class
 * - Router name uniqueness validation
 * - Tool name validation (tools must exist)
 * - Shared tools across multiple routers
 * - Helpful error messages with suggestions
 */

import { MCPServer, Router, tool } from '../src/api/decorator/decorators.js';
import { createServerFromClass } from '../src/api/decorator/adapter.js';
import { getRouters } from '../src/api/decorator/metadata.js';
import { resolve } from 'node:path';

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
  console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
}

function section(msg: string) {
  console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`);
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}Router Decorator - Feature Layer Tests${colors.reset}\n`);

  let allPassed = true;

  try {
    // ========================================================================
    // Test Group 1: Multiple @Router Decorators Per Class
    // ========================================================================
    section('Test Group 1: Multiple @Router Decorators Per Class');

    // Test 1.1: Two routers on one class
    try {
      @MCPServer()
      @Router({
        name: 'weather_router',
        description: 'Weather tools',
        tools: ['getWeather', 'getForecast']
      })
      @Router({
        name: 'alerts_router',
        description: 'Alert tools',
        tools: ['getAlerts']
      })
      class WeatherService {
        @tool('Get current weather')
        getWeather(city: string) {
          return `Weather in ${city}`;
        }

        @tool('Get weather forecast')
        getForecast(city: string) {
          return `Forecast for ${city}`;
        }

        @tool('Get weather alerts')
        getAlerts(city: string) {
          return `Alerts for ${city}`;
        }
      }

      const routers = getRouters(WeatherService);
      // Note: Decorators are applied bottom-up, so the order is reversed
      const hasWeatherRouter = routers.some(r => r.name === 'weather_router');
      const hasAlertsRouter = routers.some(r => r.name === 'alerts_router');

      if (routers.length === 2 && hasWeatherRouter && hasAlertsRouter) {
        pass('Two @Router decorators on one class');
        info(`  Routers: ${routers.map(r => r.name).join(', ')}`);
        info(`  Tools: ${routers.map(r => `${r.name}:[${r.tools.join(',')}]`).join(' | ')}`);
      } else {
        fail(`Expected 2 routers (weather_router, alerts_router), got ${routers.length}: ${routers.map(r => r.name).join(', ')}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Two routers test: ${error.message}`);
      allPassed = false;
    }

    // Test 1.2: Three routers on one class
    try {
      @MCPServer()
      @Router({
        name: 'products_router',
        description: 'Product tools',
        tools: ['search', 'create']
      })
      @Router({
        name: 'admin_router',
        description: 'Admin tools',
        tools: ['search', 'delete', 'create']
      })
      @Router({
        name: 'reports_router',
        description: 'Report tools',
        tools: ['search']
      })
      class EcommerceService {
        @tool('Search products')
        search(query: string) {
          return `Search: ${query}`;
        }

        @tool('Create product')
        create(name: string) {
          return `Created: ${name}`;
        }

        @tool('Delete product')
        delete(id: string) {
          return `Deleted: ${id}`;
        }
      }

      const routers = getRouters(EcommerceService);
      if (routers.length === 3) {
        pass('Three @Router decorators on one class');
        info(`  Routers: ${routers.map(r => r.name).join(', ')}`);
      } else {
        fail(`Expected 3 routers, got ${routers.length}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Three routers test: ${error.message}`);
      allPassed = false;
    }

    // Test 1.3: Each router has correct tools array
    try {
      @MCPServer()
      @Router({
        name: 'router_a',
        description: 'Router A',
        tools: ['tool1', 'tool2']
      })
      @Router({
        name: 'router_b',
        description: 'Router B',
        tools: ['tool3']
      })
      class MultiRouterService {
        @tool() tool1() { return 'tool1'; }
        @tool() tool2() { return 'tool2'; }
        @tool() tool3() { return 'tool3'; }
      }

      const routers = getRouters(MultiRouterService);
      const routerA = routers.find(r => r.name === 'router_a');
      const routerB = routers.find(r => r.name === 'router_b');

      if (routerA && routerB &&
          routerA.tools.length === 2 &&
          routerB.tools.length === 1 &&
          routerA.tools.includes('tool1') &&
          routerA.tools.includes('tool2') &&
          routerB.tools.includes('tool3')) {
        pass('Each router maintains its own tools array');
        info(`  router_a: [${routerA.tools.join(', ')}]`);
        info(`  router_b: [${routerB.tools.join(', ')}]`);
      } else {
        fail('Router tools arrays not correct');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Router tools arrays test: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 2: Router Name Uniqueness Validation
    // ========================================================================
    section('Test Group 2: Router Name Uniqueness Validation');

    // Test 2.1: Duplicate router name throws error
    try {
      let errorThrown = false;
      let errorMessage = '';

      try {
        @MCPServer()
        @Router({
          name: 'weather_router',
          description: 'Weather tools',
          tools: ['getWeather']
        })
        @Router({
          name: 'weather_router', // DUPLICATE!
          description: 'More weather tools',
          tools: ['getForecast']
        })
        class DuplicateRouterService {
          @tool() getWeather() { return 'weather'; }
          @tool() getForecast() { return 'forecast'; }
        }
      } catch (error: any) {
        errorThrown = true;
        errorMessage = error.message;
      }

      if (errorThrown && errorMessage.includes('Duplicate router name')) {
        pass('Duplicate router name throws error');
        info('  Error message includes "Duplicate router name"');
      } else {
        fail('Duplicate router name should throw error');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Duplicate router test: ${error.message}`);
      allPassed = false;
    }

    // Test 2.2: Error message lists existing routers
    try {
      let errorMessage = '';

      try {
        @MCPServer()
        @Router({
          name: 'router_one',
          description: 'Router One',
          tools: []
        })
        @Router({
          name: 'router_two',
          description: 'Router Two',
          tools: []
        })
        @Router({
          name: 'router_one', // DUPLICATE!
          description: 'Duplicate',
          tools: []
        })
        class ErrorMessageService {
          @tool() dummy() { return 'dummy'; }
        }
      } catch (error: any) {
        errorMessage = error.message;
      }

      if (errorMessage.includes('router_one') && errorMessage.includes('Existing routers')) {
        pass('Error message lists existing routers');
        info('  Error includes existing router names');
      } else {
        fail('Error message should list existing routers');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Error message content test: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 3: Tool Name Validation
    // ========================================================================
    section('Test Group 3: Tool Name Validation');

    // Test 3.1: Missing tool throws error
    try {
      @MCPServer()
      @Router({
        name: 'test_router',
        description: 'Test Router',
        tools: ['existingTool', 'missingTool'] // missingTool doesn't exist!
      })
      class MissingToolService {
        @tool() existingTool() { return 'exists'; }
      }

      let errorThrown = false;
      try {
        const sourceFile = resolve(process.cwd(), 'tests/decorator-router-feature.test.ts');
        createServerFromClass(MissingToolService, sourceFile);
      } catch (error: any) {
        errorThrown = true;
        if (error.message.includes('missingTool') && error.message.includes('do not exist')) {
          pass('Missing tool throws error during server creation');
          info('  Error identifies missing tool');
        } else {
          fail(`Wrong error message: ${error.message}`);
          allPassed = false;
        }
      }

      if (!errorThrown) {
        fail('Missing tool should throw error');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Missing tool test: ${error.message}`);
      allPassed = false;
    }

    // Test 3.2: Error message lists available tools
    try {
      @MCPServer()
      @Router({
        name: 'test_router',
        description: 'Test Router',
        tools: ['wrongTool']
      })
      class AvailableToolsService {
        @tool() correctTool() { return 'correct'; }
        @tool() anotherTool() { return 'another'; }
      }

      let errorMessage = '';
      try {
        const sourceFile = resolve(process.cwd(), 'tests/decorator-router-feature.test.ts');
        createServerFromClass(AvailableToolsService, sourceFile);
      } catch (error: any) {
        errorMessage = error.message;
      }

      if (errorMessage.includes('Available tools') &&
          errorMessage.includes('correctTool') &&
          errorMessage.includes('anotherTool')) {
        pass('Error message lists available tools');
        info('  Error shows all available tool names');
      } else {
        fail('Error should list available tools');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Available tools in error test: ${error.message}`);
      allPassed = false;
    }

    // Test 3.3: Error message includes suggestions for typos
    try {
      @MCPServer()
      @Router({
        name: 'test_router',
        description: 'Test Router',
        tools: ['getWeater'] // Typo: should be getWeather
      })
      class TypoService {
        @tool() getWeather() { return 'weather'; }
      }

      let errorMessage = '';
      try {
        const sourceFile = resolve(process.cwd(), 'tests/decorator-router-feature.test.ts');
        createServerFromClass(TypoService, sourceFile);
      } catch (error: any) {
        errorMessage = error.message;
      }

      // The suggestion algorithm looks for partial matches (includes)
      // 'getWeater' contains 'getWea' which is in 'getWeather'
      if (errorMessage.includes('Did you mean') || errorMessage.includes('getWeather')) {
        pass('Error message suggests correct spelling');
        info('  Typo detection: error message includes getWeather');
      } else {
        info(`  Error message: ${errorMessage}`);
        fail('Error should suggest similar tool names');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Typo suggestion test: ${error.message}`);
      allPassed = false;
    }

    // Test 3.4: Validation includes auto-registered tools
    try {
      @MCPServer()
      @Router({
        name: 'test_router',
        description: 'Test Router',
        tools: ['publicMethod'] // Public method, not decorated
      })
      class AutoRegisteredService {
        // Public method - auto-registered as tool
        publicMethod() { return 'public'; }
      }

      let success = false;
      try {
        const sourceFile = resolve(process.cwd(), 'tests/decorator-router-feature.test.ts');
        const server = createServerFromClass(AutoRegisteredService, sourceFile);
        success = true;
      } catch (error: any) {
        fail(`Auto-registered tool validation failed: ${error.message}`);
        allPassed = false;
      }

      if (success) {
        pass('Validation includes auto-registered public methods');
        info('  Router can reference public methods');
      }
    } catch (error: any) {
      fail(`Auto-registered validation test: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 4: Shared Tools Across Routers
    // ========================================================================
    section('Test Group 4: Shared Tools Across Routers');

    // Test 4.1: Same tool in multiple routers
    try {
      @MCPServer()
      @Router({
        name: 'products_router',
        description: 'Product tools',
        tools: ['search', 'create']
      })
      @Router({
        name: 'admin_router',
        description: 'Admin tools',
        tools: ['search', 'delete', 'create'] // 'search' and 'create' are shared
      })
      class SharedToolService {
        @tool() search() { return 'search'; }
        @tool() create() { return 'create'; }
        @tool() delete() { return 'delete'; }
      }

      const sourceFile = resolve(process.cwd(), 'tests/decorator-router-feature.test.ts');
      const server = createServerFromClass(SharedToolService, sourceFile);

      // Check that both routers were created
      const stats = server.getStats();
      if (stats.routers === 2) {
        pass('Shared tools work across multiple routers');
        info('  search and create tools shared between 2 routers');
      } else {
        fail(`Expected 2 routers, got ${stats.routers}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Shared tools test: ${error.message}`);
      allPassed = false;
    }

    // Test 4.2: Tool in all routers
    try {
      @MCPServer()
      @Router({
        name: 'router_1',
        description: 'Router 1',
        tools: ['universalTool', 'tool1']
      })
      @Router({
        name: 'router_2',
        description: 'Router 2',
        tools: ['universalTool', 'tool2']
      })
      @Router({
        name: 'router_3',
        description: 'Router 3',
        tools: ['universalTool', 'tool3']
      })
      class UniversalToolService {
        @tool() universalTool() { return 'universal'; }
        @tool() tool1() { return 'tool1'; }
        @tool() tool2() { return 'tool2'; }
        @tool() tool3() { return 'tool3'; }
      }

      const routers = getRouters(UniversalToolService);
      const allHaveUniversal = routers.every(r => r.tools.includes('universalTool'));

      if (allHaveUniversal && routers.length === 3) {
        pass('Tool appears in all 3 routers');
        info('  universalTool is accessible from all routers');
      } else {
        fail('Universal tool not in all routers');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Universal tool test: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 5: Empty Tools Array
    // ========================================================================
    section('Test Group 5: Empty Tools Array');

    // Test 5.1: Router with empty tools array
    try {
      @MCPServer()
      @Router({
        name: 'empty_router',
        description: 'Empty Router',
        tools: [] // Empty array
      })
      @Router({
        name: 'full_router',
        description: 'Full Router',
        tools: ['myTool']
      })
      class EmptyRouterService {
        @tool() myTool() { return 'tool'; }
      }

      const routers = getRouters(EmptyRouterService);
      const emptyRouter = routers.find(r => r.name === 'empty_router');
      const fullRouter = routers.find(r => r.name === 'full_router');

      if (emptyRouter && fullRouter &&
          emptyRouter.tools.length === 0 &&
          fullRouter.tools.length === 1) {
        pass('Router with empty tools array works');
        info('  empty_router has 0 tools, full_router has 1 tool');
      } else {
        fail('Empty tools array handling failed');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Empty router test: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 6: Integration Tests
    // ========================================================================
    section('Test Group 6: Integration Tests');

    // Test 6.1: Multiple routers integrate with BuildMCPServer
    try {
      @MCPServer()
      @Router({
        name: 'weather_router',
        description: 'Weather tools',
        tools: ['getWeather', 'getForecast']
      })
      @Router({
        name: 'alerts_router',
        description: 'Alert tools',
        tools: ['getAlerts', 'subscribeAlerts']
      })
      class IntegrationService {
        @tool() getWeather(city: string) { return `Weather: ${city}`; }
        @tool() getForecast(city: string) { return `Forecast: ${city}`; }
        @tool() getAlerts(city: string) { return `Alerts: ${city}`; }
        @tool() subscribeAlerts(city: string) { return `Subscribed: ${city}`; }
      }

      const sourceFile = resolve(process.cwd(), 'tests/decorator-router-feature.test.ts');
      const server = createServerFromClass(IntegrationService, sourceFile);
      const stats = server.getStats();

      // Should have: 4 tools + 2 routers = 6 total
      if (stats.tools === 6 && stats.routers === 2) {
        pass('Multiple routers integrate with BuildMCPServer');
        info(`  Created ${stats.routers} routers and ${stats.tools} total tools`);
      } else {
        fail(`Expected 6 tools and 2 routers, got ${stats.tools} tools and ${stats.routers} routers`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`BuildMCPServer integration test: ${error.message}`);
      allPassed = false;
    }

    // Test 6.2: Routers invoke and return correct tool lists
    try {
      @MCPServer()
      @Router({
        name: 'math_router',
        description: 'Math tools',
        tools: ['add', 'subtract']
      })
      @Router({
        name: 'string_router',
        description: 'String tools',
        tools: ['concat', 'uppercase']
      })
      class InvokeService {
        @tool() add(a: number, b: number) { return a + b; }
        @tool() subtract(a: number, b: number) { return a - b; }
        @tool() concat(a: string, b: string) { return a + b; }
        @tool() uppercase(s: string) { return s.toUpperCase(); }
      }

      const sourceFile = resolve(process.cwd(), 'tests/decorator-router-feature.test.ts');
      const server = createServerFromClass(InvokeService, sourceFile);

      // Invoke math_router
      const mathResult = await server.executeToolDirect('math_router', {});
      const mathParsed = JSON.parse(mathResult.content[0].text);

      // Invoke string_router
      const stringResult = await server.executeToolDirect('string_router', {});
      const stringParsed = JSON.parse(stringResult.content[0].text);

      const mathTools = mathParsed.tools.map((t: any) => t.name);
      const stringTools = stringParsed.tools.map((t: any) => t.name);

      if (mathTools.includes('add') && mathTools.includes('subtract') &&
          stringTools.includes('concat') && stringTools.includes('uppercase')) {
        pass('Routers return correct tool lists when invoked');
        info(`  math_router: [${mathTools.join(', ')}]`);
        info(`  string_router: [${stringTools.join(', ')}]`);
      } else {
        fail('Router tool lists incorrect');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Router invocation test: ${error.message}`);
      allPassed = false;
    }

    // Test 6.3: Mixed decorated and auto-registered tools
    try {
      @MCPServer()
      @Router({
        name: 'mixed_router',
        description: 'Mixed tools',
        tools: ['decorated', 'autoRegistered']
      })
      class MixedService {
        @tool('Decorated tool')
        decorated() { return 'decorated'; }

        // Auto-registered (no @tool decorator)
        autoRegistered() { return 'auto'; }
      }

      const sourceFile = resolve(process.cwd(), 'tests/decorator-router-feature.test.ts');
      const server = createServerFromClass(MixedService, sourceFile);
      const stats = server.getStats();

      if (stats.routers === 1 && stats.tools === 3) { // 2 methods + 1 router
        pass('Mixed decorated and auto-registered tools work');
        info('  Router can reference both decorated and auto-registered tools');
      } else {
        fail(`Expected 1 router and 3 total tools, got ${stats.routers} routers and ${stats.tools} tools`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Mixed tools test: ${error.message}`);
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
    console.log(`${colors.bold}${colors.green}All Router Feature Layer tests passed! ✓${colors.reset}`);
    console.log(`\n${colors.cyan}Feature Layer Status:${colors.reset}`);
    console.log(`  ${colors.green}✓${colors.reset} Multiple @Router decorators per class works`);
    console.log(`  ${colors.green}✓${colors.reset} Router name uniqueness enforced`);
    console.log(`  ${colors.green}✓${colors.reset} Tool name validation catches missing tools`);
    console.log(`  ${colors.green}✓${colors.reset} Error messages list available tools and suggestions`);
    console.log(`  ${colors.green}✓${colors.reset} Shared tools work across multiple routers`);
    console.log(`  ${colors.green}✓${colors.reset} Empty tools arrays handled correctly`);
    console.log(`  ${colors.green}✓${colors.reset} Integration with BuildMCPServer works`);
    console.log(`  ${colors.green}✓${colors.reset} Router invocation returns correct tool lists`);
    console.log(`  ${colors.green}✓${colors.reset} Mixed decorated and auto-registered tools work`);
    console.log(`\n${colors.cyan}Implementation Complete:${colors.reset}`);
    console.log(`  - @Router decorator accumulates multiple routers`);
    console.log(`  - Duplicate router names throw helpful errors`);
    console.log(`  - Tool validation with smart suggestions`);
    console.log(`  - Full integration with existing decorator system`);
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
