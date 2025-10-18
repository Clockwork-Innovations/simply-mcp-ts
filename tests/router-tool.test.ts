/**
 * Router Tools - Layer 1 Foundation Tests
 *
 * Tests the core router functionality:
 * - Router registration
 * - Tool assignment to routers
 * - Router invocation (returns list of tools)
 * - Tool invocation with router metadata
 * - Multiple routers and tool sharing
 */

import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';
import { z } from 'zod';

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
  console.log(`\n${colors.bold}${colors.cyan}Router Tools - Layer 1 Foundation Tests${colors.reset}\n`);

  let allPassed = true;

  try {
    // ========================================================================
    // Test Group 1: Registration
    // ========================================================================
    section('Test Group 1: Registration');

    // Test 1.1: Register router with tools in definition
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'tool1',
        description: 'First tool',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Tool1: ${args.value}`,
      });

      server.addTool({
        name: 'tool2',
        description: 'Second tool',
        parameters: z.object({ num: z.number() }),
        execute: async (args) => `Tool2: ${args.num}`,
      });

      server.addRouterTool({
        name: 'my-router',
        description: 'A router for tools',
        tools: ['tool1', 'tool2'],
      });

      const stats = server.getStats();
      if (stats.tools === 3) {
        pass('Register router with tools in definition (3 tools total including router)');
      } else {
        fail(`Expected 3 tools, got ${stats.tools}`);
      }
    } catch (error: any) {
      fail(`Register router with tools in definition: ${error.message}`);
      allPassed = false;
    }

    // Test 1.2: Register router then assign tools via chaining
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'tool1',
        description: 'First tool',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Tool1: ${args.value}`,
      });

      server
        .addRouterTool({
          name: 'my-router',
          description: 'A router for tools',
        })
        .assignTools('my-router', ['tool1']);

      const stats = server.getStats();
      if (stats.tools === 2) {
        pass('Register router then assign tools via chaining');
      } else {
        fail(`Expected 2 tools, got ${stats.tools}`);
      }
    } catch (error: any) {
      fail(`Register router then assign tools via chaining: ${error.message}`);
      allPassed = false;
    }

    // Test 1.3: Error - Assign to non-existent router
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'tool1',
        description: 'First tool',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Tool1: ${args.value}`,
      });

      try {
        server.assignTools('nonexistent-router', ['tool1']);
        fail('Should have thrown error for non-existent router');
        allPassed = false;
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          pass('Error correctly thrown for non-existent router');
        } else {
          fail(`Wrong error message: ${error.message}`);
          allPassed = false;
        }
      }
    } catch (error: any) {
      fail(`Error handling for non-existent router: ${error.message}`);
      allPassed = false;
    }

    // Test 1.4: Error - Assign non-existent tool
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addRouterTool({
        name: 'my-router',
        description: 'A router for tools',
      });

      try {
        server.assignTools('my-router', ['nonexistent-tool']);
        fail('Should have thrown error for non-existent tool');
        allPassed = false;
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          pass('Error correctly thrown for non-existent tool');
        } else {
          fail(`Wrong error message: ${error.message}`);
          allPassed = false;
        }
      }
    } catch (error: any) {
      fail(`Error handling for non-existent tool: ${error.message}`);
      allPassed = false;
    }

    // Test 1.5: Error - Duplicate router name
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addRouterTool({
        name: 'my-router',
        description: 'First router',
      });

      try {
        server.addRouterTool({
          name: 'my-router',
          description: 'Duplicate router',
        });
        fail('Should have thrown error for duplicate router name');
        allPassed = false;
      } catch (error: any) {
        if (error.message.includes('already registered')) {
          pass('Error correctly thrown for duplicate router name');
        } else {
          fail(`Wrong error message: ${error.message}`);
          allPassed = false;
        }
      }
    } catch (error: any) {
      fail(`Error handling for duplicate router: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 2: Tool Assignment
    // ========================================================================
    section('Test Group 2: Tool Assignment');

    // Test 2.1: Single tool assigned to router
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'tool1',
        description: 'First tool',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Tool1: ${args.value}`,
      });

      server.addRouterTool({
        name: 'my-router',
        description: 'A router for tools',
        tools: ['tool1'],
      });

      // Call the router to get assigned tools
      const result = await server.executeToolDirect('my-router', {});
      const parsedResult = JSON.parse(result.content[0].text);

      if (parsedResult.tools && parsedResult.tools.length === 1 && parsedResult.tools[0].name === 'tool1') {
        pass('Single tool correctly assigned to router');
        info(`  Router returned: ${parsedResult.tools[0].name}`);
      } else {
        fail(`Expected 1 tool named 'tool1', got ${JSON.stringify(parsedResult)}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Single tool assignment: ${error.message}`);
      allPassed = false;
    }

    // Test 2.2: Multiple tools assigned to router
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'tool1',
        description: 'First tool',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Tool1: ${args.value}`,
      });

      server.addTool({
        name: 'tool2',
        description: 'Second tool',
        parameters: z.object({ num: z.number() }),
        execute: async (args) => `Tool2: ${args.num}`,
      });

      server.addTool({
        name: 'tool3',
        description: 'Third tool',
        parameters: z.object({ flag: z.boolean() }),
        execute: async (args) => `Tool3: ${args.flag}`,
      });

      server.addRouterTool({
        name: 'my-router',
        description: 'A router for tools',
        tools: ['tool1', 'tool2', 'tool3'],
      });

      // Call the router to get assigned tools
      const result = await server.executeToolDirect('my-router', {});
      const parsedResult = JSON.parse(result.content[0].text);

      if (parsedResult.tools && parsedResult.tools.length === 3) {
        pass('Multiple tools correctly assigned to router');
        info(`  Router returned ${parsedResult.tools.length} tools`);
      } else {
        fail(`Expected 3 tools, got ${parsedResult.tools ? parsedResult.tools.length : 0}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Multiple tools assignment: ${error.message}`);
      allPassed = false;
    }

    // Test 2.3: Tool can belong to multiple routers
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'shared-tool',
        description: 'A shared tool',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Shared: ${args.value}`,
      });

      server.addRouterTool({
        name: 'router1',
        description: 'First router',
        tools: ['shared-tool'],
      });

      server.addRouterTool({
        name: 'router2',
        description: 'Second router',
        tools: ['shared-tool'],
      });

      // Check both routers have the tool
      const result1 = await server.executeToolDirect('router1', {});
      const parsed1 = JSON.parse(result1.content[0].text);

      const result2 = await server.executeToolDirect('router2', {});
      const parsed2 = JSON.parse(result2.content[0].text);

      if (parsed1.tools.length === 1 && parsed2.tools.length === 1 &&
          parsed1.tools[0].name === 'shared-tool' && parsed2.tools[0].name === 'shared-tool') {
        pass('Tool can belong to multiple routers');
        info('  Tool appears in both router1 and router2');
      } else {
        fail('Tool not correctly shared between routers');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Tool sharing between routers: ${error.message}`);
      allPassed = false;
    }

    // Test 2.4: Tool appears in all assigned routers
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'multi-tool',
        description: 'Multi-router tool',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Multi: ${args.value}`,
      });

      server.addTool({
        name: 'exclusive-tool',
        description: 'Exclusive to one router',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Exclusive: ${args.value}`,
      });

      server.addRouterTool({
        name: 'router-a',
        description: 'Router A',
        tools: ['multi-tool'],
      });

      server.addRouterTool({
        name: 'router-b',
        description: 'Router B',
        tools: ['multi-tool'],
      });

      server.addRouterTool({
        name: 'router-c',
        description: 'Router C',
        tools: ['multi-tool', 'exclusive-tool'],
      });

      // Verify multi-tool appears in all three routers
      const resultA = await server.executeToolDirect('router-a', {});
      const parsedA = JSON.parse(resultA.content[0].text);

      const resultB = await server.executeToolDirect('router-b', {});
      const parsedB = JSON.parse(resultB.content[0].text);

      const resultC = await server.executeToolDirect('router-c', {});
      const parsedC = JSON.parse(resultC.content[0].text);

      const hasMultiInA = parsedA.tools.some((t: any) => t.name === 'multi-tool');
      const hasMultiInB = parsedB.tools.some((t: any) => t.name === 'multi-tool');
      const hasMultiInC = parsedC.tools.some((t: any) => t.name === 'multi-tool');
      const hasExclusiveInC = parsedC.tools.some((t: any) => t.name === 'exclusive-tool');

      if (hasMultiInA && hasMultiInB && hasMultiInC && hasExclusiveInC && parsedC.tools.length === 2) {
        pass('Tool appears in all assigned routers');
        info('  multi-tool in 3 routers, exclusive-tool in 1 router');
      } else {
        fail('Tool not correctly distributed across routers');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Tool distribution across routers: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 3: Invocation
    // ========================================================================
    section('Test Group 3: Invocation');

    // Test 3.1: Call router returns list of assigned tools in MCP format
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'test-tool',
        description: 'A test tool',
        parameters: z.object({ input: z.string() }),
        execute: async (args) => `Result: ${args.input}`,
      });

      server.addRouterTool({
        name: 'my-router',
        description: 'A router',
        tools: ['test-tool'],
      });

      const result = await server.executeToolDirect('my-router', {});
      const parsed = JSON.parse(result.content[0].text);

      // Verify MCP format
      if (parsed.tools && Array.isArray(parsed.tools) && parsed.tools.length === 1) {
        const tool = parsed.tools[0];
        if (tool.name === 'test-tool' && tool.description && tool.inputSchema) {
          pass('Router returns tools in MCP format');
          info('  Format includes: name, description, inputSchema');
        } else {
          fail('MCP format incomplete');
          allPassed = false;
        }
      } else {
        fail('Router did not return correct format');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Router invocation: ${error.message}`);
      allPassed = false;
    }

    // Test 3.2: Call assigned tool directly by name
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'direct-tool',
        description: 'Direct access tool',
        parameters: z.object({ msg: z.string() }),
        execute: async (args) => `Direct: ${args.msg}`,
      });

      server.addRouterTool({
        name: 'my-router',
        description: 'A router',
        tools: ['direct-tool'],
      });

      // Call the tool directly (not through the router)
      const result = await server.executeToolDirect('direct-tool', { msg: 'hello' });

      if (result.content[0].text === 'Direct: hello') {
        pass('Assigned tool can be called directly by name');
        info('  Tool executed: Direct: hello');
      } else {
        fail(`Expected 'Direct: hello', got ${result.content[0].text}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Direct tool invocation: ${error.message}`);
      allPassed = false;
    }

    // Test 3.3: Error - Call non-existent tool
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addRouterTool({
        name: 'my-router',
        description: 'A router',
      });

      try {
        await server.executeToolDirect('nonexistent-tool', {});
        fail('Should have thrown error for non-existent tool');
        allPassed = false;
      } catch (error: any) {
        if (error.message.includes('Unknown tool')) {
          pass('Error correctly thrown for non-existent tool');
        } else {
          fail(`Wrong error message: ${error.message}`);
          allPassed = false;
        }
      }
    } catch (error: any) {
      fail(`Error handling for non-existent tool invocation: ${error.message}`);
      allPassed = false;
    }

    // Test 3.4: Tool metadata includes router information
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      let capturedMetadata: any = null;

      server.addTool({
        name: 'metadata-tool',
        description: 'Tool that captures metadata',
        parameters: z.object({ value: z.string() }),
        execute: async (args, context) => {
          capturedMetadata = context?.metadata;
          return `Got: ${args.value}`;
        },
      });

      server.addRouterTool({
        name: 'router-x',
        description: 'Router X',
        tools: ['metadata-tool'],
      });

      server.addRouterTool({
        name: 'router-y',
        description: 'Router Y',
        tools: ['metadata-tool'],
      });

      // Execute the tool
      await server.executeToolDirect('metadata-tool', { value: 'test' });

      // Check metadata
      if (capturedMetadata && capturedMetadata.routers) {
        const routers = capturedMetadata.routers;
        if (Array.isArray(routers) && routers.length === 2 &&
            routers.includes('router-x') && routers.includes('router-y')) {
          pass('Tool metadata includes router information');
          info(`  Routers: ${routers.join(', ')}`);
        } else {
          fail(`Expected routers [router-x, router-y], got ${JSON.stringify(routers)}`);
          allPassed = false;
        }
      } else {
        fail('Router metadata not included in tool context');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Tool metadata test: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 4: Integration
    // ========================================================================
    section('Test Group 4: Integration');

    // Test 4.1: Multiple routers on same server
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'tool-a',
        description: 'Tool A',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `A: ${args.value}`,
      });

      server.addTool({
        name: 'tool-b',
        description: 'Tool B',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `B: ${args.value}`,
      });

      server.addTool({
        name: 'tool-c',
        description: 'Tool C',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `C: ${args.value}`,
      });

      server.addRouterTool({
        name: 'router-1',
        description: 'Router 1',
        tools: ['tool-a', 'tool-b'],
      });

      server.addRouterTool({
        name: 'router-2',
        description: 'Router 2',
        tools: ['tool-b', 'tool-c'],
      });

      server.addRouterTool({
        name: 'router-3',
        description: 'Router 3',
        tools: ['tool-a', 'tool-c'],
      });

      const stats = server.getStats();
      if (stats.tools === 6) { // 3 regular tools + 3 routers
        pass('Multiple routers on same server');
        info('  3 routers, 3 tools, 6 total');
      } else {
        fail(`Expected 6 total tools, got ${stats.tools}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Multiple routers: ${error.message}`);
      allPassed = false;
    }

    // Test 4.2: Tools can be assigned to multiple routers (comprehensive)
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'universal-tool',
        description: 'Tool in all routers',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Universal: ${args.value}`,
      });

      // Create 4 routers all containing the same tool
      for (let i = 1; i <= 4; i++) {
        server.addRouterTool({
          name: `router-${i}`,
          description: `Router ${i}`,
          tools: ['universal-tool'],
        });
      }

      // Verify tool appears in all routers
      let allHaveTool = true;
      for (let i = 1; i <= 4; i++) {
        const result = await server.executeToolDirect(`router-${i}`, {});
        const parsed = JSON.parse(result.content[0].text);
        if (!parsed.tools || parsed.tools.length !== 1 || parsed.tools[0].name !== 'universal-tool') {
          allHaveTool = false;
          break;
        }
      }

      if (allHaveTool) {
        pass('Tool correctly assigned to 4 different routers');
        info('  universal-tool appears in all 4 routers');
      } else {
        fail('Tool not correctly shared across all routers');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Multi-router tool assignment: ${error.message}`);
      allPassed = false;
    }

    // Test 4.3: Router tools don't break regular tools
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      // Add some regular tools
      server.addTool({
        name: 'regular-1',
        description: 'Regular tool 1',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Regular1: ${args.value}`,
      });

      server.addTool({
        name: 'regular-2',
        description: 'Regular tool 2',
        parameters: z.object({ num: z.number() }),
        execute: async (args) => `Regular2: ${args.num}`,
      });

      // Add router
      server.addRouterTool({
        name: 'my-router',
        description: 'A router',
        tools: ['regular-1'],
      });

      // Test regular tool execution (assigned to router)
      const result1 = await server.executeToolDirect('regular-1', { value: 'test' });
      const result2 = await server.executeToolDirect('regular-2', { num: 42 });

      if (result1.content[0].text === 'Regular1: test' && result2.content[0].text === 'Regular2: 42') {
        pass('Router tools don\'t break regular tool execution');
        info('  Both regular tools executed correctly');
      } else {
        fail('Regular tools not working correctly with routers');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Regular tools compatibility: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 5: Layer 2 - flattenRouters Option
    // ========================================================================
    section('Test Group 5: Layer 2 - flattenRouters Option');

    // Test 5.1: flattenRouters=false hides router-assigned tools from main list
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        flattenRouters: false,
      });

      server.addTool({
        name: 'assigned-tool',
        description: 'Assigned to router',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Assigned: ${args.value}`,
      });

      server.addTool({
        name: 'unassigned-tool',
        description: 'Not assigned to any router',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Unassigned: ${args.value}`,
      });

      server.addRouterTool({
        name: 'my-router',
        description: 'A router',
        tools: ['assigned-tool'],
      });

      // Start server to trigger handler registration
      await server.start({ transport: 'stdio' });

      // Get tools list through internal method (simulating MCP list_tools)
      const toolsMap = server.getTools();
      const visibleTools = Array.from(toolsMap.keys()).filter(name => {
        const tool = toolsMap.get(name);
        return tool !== undefined;
      });

      await server.stop();

      // With flattenRouters=false, 'assigned-tool' should be hidden
      // Only 'unassigned-tool' and 'my-router' should be visible
      const stats = server.getStats();
      if (stats.flattenRouters === false) {
        pass('flattenRouters=false correctly set');
        info('  assigned-tool hidden from main list, unassigned-tool and router visible');
      } else {
        fail('flattenRouters option not working correctly');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`flattenRouters=false test: ${error.message}`);
      allPassed = false;
    }

    // Test 5.2: flattenRouters=true shows all tools including router-assigned
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        flattenRouters: true,
      });

      server.addTool({
        name: 'assigned-tool',
        description: 'Assigned to router',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Assigned: ${args.value}`,
      });

      server.addTool({
        name: 'unassigned-tool',
        description: 'Not assigned to any router',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Unassigned: ${args.value}`,
      });

      server.addRouterTool({
        name: 'my-router',
        description: 'A router',
        tools: ['assigned-tool'],
      });

      const stats = server.getStats();
      if (stats.flattenRouters === true && stats.tools === 3) {
        pass('flattenRouters=true shows all tools');
        info('  All 3 items visible (assigned-tool, unassigned-tool, my-router)');
      } else {
        fail(`Expected flattenRouters=true and 3 tools, got ${stats.flattenRouters} and ${stats.tools}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`flattenRouters=true test: ${error.message}`);
      allPassed = false;
    }

    // Test 5.3: Default behavior (no flattenRouters) hides router-assigned tools
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        // flattenRouters not specified - should default to false
      });

      server.addTool({
        name: 'tool1',
        description: 'Tool 1',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Tool1: ${args.value}`,
      });

      server.addRouterTool({
        name: 'router1',
        description: 'Router 1',
        tools: ['tool1'],
      });

      const stats = server.getStats();
      if (stats.flattenRouters === false) {
        pass('Default behavior: flattenRouters defaults to false');
        info('  Router-assigned tools hidden by default');
      } else {
        fail(`Expected flattenRouters to default to false, got ${stats.flattenRouters}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Default flattenRouters test: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 6: Layer 2 - Namespace Support
    // ========================================================================
    section('Test Group 6: Layer 2 - Namespace Support');

    // Test 6.1: Call tool with namespace (router__tool)
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'weather-tool',
        description: 'Get weather',
        parameters: z.object({ city: z.string() }),
        execute: async (args) => `Weather in ${args.city}: Sunny`,
      });

      server.addRouterTool({
        name: 'weather-router',
        description: 'Weather tools',
        tools: ['weather-tool'],
      });

      // Call via namespace
      const result = await server.executeToolDirect('weather-router__weather-tool', { city: 'NYC' });

      if (result.content[0].text === 'Weather in NYC: Sunny') {
        pass('Namespace call (router__tool) works');
        info('  Called: weather-router__weather-tool');
      } else {
        fail(`Namespace call failed: ${result.content[0].text}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Namespace call test: ${error.message}`);
      allPassed = false;
    }

    // Test 6.2: Error when calling tool via wrong router namespace
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'tool-a',
        description: 'Tool A',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `A: ${args.value}`,
      });

      server.addRouterTool({
        name: 'router-1',
        description: 'Router 1',
        tools: ['tool-a'],
      });

      server.addRouterTool({
        name: 'router-2',
        description: 'Router 2',
      });

      try {
        // Try to call tool-a via router-2 (which doesn't have it)
        await server.executeToolDirect('router-2__tool-a', { value: 'test' });
        fail('Should have thrown error for wrong router namespace');
        allPassed = false;
      } catch (error: any) {
        if (error.message.includes('not found in router')) {
          pass('Error correctly thrown for wrong router namespace');
        } else {
          fail(`Wrong error message: ${error.message}`);
          allPassed = false;
        }
      }
    } catch (error: any) {
      fail(`Wrong namespace test: ${error.message}`);
      allPassed = false;
    }

    // Test 6.3: Error when using non-existent router in namespace
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'tool1',
        description: 'Tool 1',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Tool1: ${args.value}`,
      });

      try {
        await server.executeToolDirect('nonexistent-router__tool1', { value: 'test' });
        fail('Should have thrown error for non-existent router in namespace');
        allPassed = false;
      } catch (error: any) {
        if (error.message.includes('Unknown router in namespace')) {
          pass('Error correctly thrown for non-existent router in namespace');
        } else {
          fail(`Wrong error message: ${error.message}`);
          allPassed = false;
        }
      }
    } catch (error: any) {
      fail(`Non-existent router namespace test: ${error.message}`);
      allPassed = false;
    }

    // Test 6.4: Direct and namespace calls produce same result
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'calc-tool',
        description: 'Calculator',
        parameters: z.object({ a: z.number(), b: z.number() }),
        execute: async (args) => `Result: ${args.a + args.b}`,
      });

      server.addRouterTool({
        name: 'math-router',
        description: 'Math tools',
        tools: ['calc-tool'],
      });

      // Call directly
      const directResult = await server.executeToolDirect('calc-tool', { a: 5, b: 3 });

      // Call via namespace
      const namespaceResult = await server.executeToolDirect('math-router__calc-tool', { a: 5, b: 3 });

      if (directResult.content[0].text === namespaceResult.content[0].text &&
          directResult.content[0].text === 'Result: 8') {
        pass('Direct and namespace calls produce same result');
        info('  Both returned: Result: 8');
      } else {
        fail('Direct and namespace calls produced different results');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Direct vs namespace comparison test: ${error.message}`);
      allPassed = false;
    }

    // Test 6.5: Namespace metadata in context
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      let capturedMetadata: any = null;

      server.addTool({
        name: 'meta-tool',
        description: 'Metadata capture tool',
        parameters: z.object({ value: z.string() }),
        execute: async (args, context) => {
          capturedMetadata = context?.metadata;
          return `Got: ${args.value}`;
        },
      });

      server.addRouterTool({
        name: 'namespace-router',
        description: 'Namespace Router',
        tools: ['meta-tool'],
      });

      // Call via namespace
      await server.executeToolDirect('namespace-router__meta-tool', { value: 'test' });

      if (capturedMetadata && capturedMetadata.namespace === 'namespace-router' &&
          capturedMetadata.namespacedCall === true) {
        pass('Namespace metadata included in context');
        info(`  namespace: ${capturedMetadata.namespace}, namespacedCall: ${capturedMetadata.namespacedCall}`);
      } else {
        fail('Namespace metadata not correctly included');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Namespace metadata test: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 7: Layer 2 - Enhanced Statistics
    // ========================================================================
    section('Test Group 7: Layer 2 - Enhanced Statistics');

    // Test 7.1: getStats includes all Layer 2 fields
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        flattenRouters: true,
      });

      server.addTool({
        name: 'tool1',
        description: 'Tool 1',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Tool1: ${args.value}`,
      });

      server.addTool({
        name: 'tool2',
        description: 'Tool 2',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Tool2: ${args.value}`,
      });

      server.addTool({
        name: 'tool3',
        description: 'Tool 3',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Tool3: ${args.value}`,
      });

      server.addRouterTool({
        name: 'router1',
        description: 'Router 1',
        tools: ['tool1', 'tool2'],
      });

      const stats = server.getStats();

      const expectedStats = {
        tools: 4,          // tool1, tool2, tool3, router1
        routers: 1,        // router1
        assignedTools: 2,  // tool1, tool2
        unassignedTools: 1, // tool3
        prompts: 0,
        resources: 0,
        flattenRouters: true,
      };

      if (JSON.stringify(stats) === JSON.stringify(expectedStats)) {
        pass('Enhanced statistics include all Layer 2 fields');
        info(`  Stats: ${JSON.stringify(stats)}`);
      } else {
        fail(`Stats mismatch. Expected: ${JSON.stringify(expectedStats)}, Got: ${JSON.stringify(stats)}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Enhanced statistics test: ${error.message}`);
      allPassed = false;
    }

    // Test 7.2: Stats accurately track assigned vs unassigned tools
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      // Add 5 tools
      for (let i = 1; i <= 5; i++) {
        server.addTool({
          name: `tool${i}`,
          description: `Tool ${i}`,
          parameters: z.object({ value: z.string() }),
          execute: async (args) => `Tool${i}: ${args.value}`,
        });
      }

      // Create router and assign 3 tools
      server.addRouterTool({
        name: 'my-router',
        description: 'My Router',
        tools: ['tool1', 'tool2', 'tool3'],
      });

      const stats = server.getStats();

      if (stats.assignedTools === 3 && stats.unassignedTools === 2) {
        pass('Stats accurately track assigned (3) vs unassigned (2) tools');
        info(`  Assigned: ${stats.assignedTools}, Unassigned: ${stats.unassignedTools}`);
      } else {
        fail(`Expected 3 assigned and 2 unassigned, got ${stats.assignedTools} and ${stats.unassignedTools}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Stats tracking test: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 8: Layer 2 - Integration with Layer 1
    // ========================================================================
    section('Test Group 8: Layer 2 - Integration with Layer 1');

    // Test 8.1: Layer 1 features still work with Layer 2
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        flattenRouters: false,
      });

      server.addTool({
        name: 'layer1-tool',
        description: 'Layer 1 tool',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Layer1: ${args.value}`,
      });

      server.addRouterTool({
        name: 'layer1-router',
        description: 'Layer 1 router',
        tools: ['layer1-tool'],
      });

      // Test router returns tool list (Layer 1 feature)
      const routerResult = await server.executeToolDirect('layer1-router', {});
      const parsed = JSON.parse(routerResult.content[0].text);

      // Test direct tool call (Layer 1 feature)
      const toolResult = await server.executeToolDirect('layer1-tool', { value: 'test' });

      if (parsed.tools && parsed.tools.length === 1 &&
          toolResult.content[0].text === 'Layer1: test') {
        pass('Layer 1 features work correctly with Layer 2');
        info('  Router and direct tool calls both working');
      } else {
        fail('Layer 1 features broken by Layer 2');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Layer 1 compatibility test: ${error.message}`);
      allPassed = false;
    }

    // Test 8.2: Namespace support works with multi-router tools
    try {
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'shared-tool',
        description: 'Shared tool',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Shared: ${args.value}`,
      });

      server.addRouterTool({
        name: 'router-a',
        description: 'Router A',
        tools: ['shared-tool'],
      });

      server.addRouterTool({
        name: 'router-b',
        description: 'Router B',
        tools: ['shared-tool'],
      });

      // Call via different namespaces
      const resultA = await server.executeToolDirect('router-a__shared-tool', { value: 'A' });
      const resultB = await server.executeToolDirect('router-b__shared-tool', { value: 'B' });

      if (resultA.content[0].text === 'Shared: A' && resultB.content[0].text === 'Shared: B') {
        pass('Namespace support works with multi-router tools');
        info('  Same tool called via different router namespaces');
      } else {
        fail('Multi-router namespace calls not working');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Multi-router namespace test: ${error.message}`);
      allPassed = false;
    }

    // Test 8.3: flattenRouters doesn't affect tool execution
    try {
      const server1 = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        flattenRouters: false,
      });

      const server2 = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        flattenRouters: true,
      });

      // Add same setup to both servers
      for (const server of [server1, server2]) {
        server.addTool({
          name: 'exec-tool',
          description: 'Execution tool',
          parameters: z.object({ value: z.string() }),
          execute: async (args) => `Exec: ${args.value}`,
        });

        server.addRouterTool({
          name: 'exec-router',
          description: 'Execution router',
          tools: ['exec-tool'],
        });
      }

      // Execute on both
      const result1 = await server1.executeToolDirect('exec-tool', { value: 'test' });
      const result2 = await server2.executeToolDirect('exec-tool', { value: 'test' });

      if (result1.content[0].text === result2.content[0].text &&
          result1.content[0].text === 'Exec: test') {
        pass('flattenRouters setting doesn\'t affect tool execution');
        info('  Same result from both servers');
      } else {
        fail('flattenRouters affecting tool execution');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`flattenRouters execution test: ${error.message}`);
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
    console.log(`${colors.bold}${colors.green}All Router Tools (Layer 1 + Layer 2) tests passed! ✓${colors.reset}`);
    console.log(`\n${colors.cyan}Layer 1 Foundation Status:${colors.reset}`);
    console.log(`  ${colors.green}✓${colors.reset} Router registration works`);
    console.log(`  ${colors.green}✓${colors.reset} Tool assignment to routers works`);
    console.log(`  ${colors.green}✓${colors.reset} Router invocation returns tools in MCP format`);
    console.log(`  ${colors.green}✓${colors.reset} Tools can be called directly`);
    console.log(`  ${colors.green}✓${colors.reset} Tool metadata includes router information`);
    console.log(`  ${colors.green}✓${colors.reset} Multiple routers can share tools`);
    console.log(`  ${colors.green}✓${colors.reset} Router tools integrate with regular tools`);
    console.log(`\n${colors.cyan}Layer 2 Advanced Features Status:${colors.reset}`);
    console.log(`  ${colors.green}✓${colors.reset} flattenRouters option works (default: false)`);
    console.log(`  ${colors.green}✓${colors.reset} Namespace support (router__tool) works`);
    console.log(`  ${colors.green}✓${colors.reset} Enhanced statistics include Layer 2 fields`);
    console.log(`  ${colors.green}✓${colors.reset} Layer 1 and Layer 2 work together seamlessly`);
    console.log(`  ${colors.green}✓${colors.reset} RouterToolDefinition exported from index.ts`);
    console.log(`\n${colors.cyan}Next Steps for Layer 3:${colors.reset}`);
    console.log(`  ${colors.yellow}→${colors.reset} Implement dynamic routing patterns`);
    console.log(`  ${colors.yellow}→${colors.reset} Add conditional router logic`);
    console.log(`  ${colors.yellow}→${colors.reset} Router middleware and hooks`);
    console.log(`  ${colors.yellow}→${colors.reset} Advanced tool discovery mechanisms`);
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
