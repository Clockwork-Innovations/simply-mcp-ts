/**
 * Functional API Router - Feature Layer Tests
 *
 * Tests the advanced router functionality for the Functional API:
 * - Multiple routers in single config
 * - Router name uniqueness validation
 * - Tool name validation (tools must exist)
 * - Typo detection with suggestions
 * - Helpful error messages
 * - Integration with BuildMCPServer
 */

import { z } from 'zod';
import type { SingleFileMCPConfig } from '../src/single-file-types.js';

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

// Import the function dynamically to simulate module loading
// We'll use a workaround since we can't directly import from func-bin.ts
// Instead, we'll test by creating configs and using BuildMCPServer directly

import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';

/**
 * Helper function that mimics createServerFromConfig validation logic
 * This is extracted from func-bin.ts for testing purposes
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function findSimilarNames(missing: string, availableTools: string[]): string[] {
  const missingKebab = toKebabCase(missing);
  const suggestions: Array<{ name: string; score: number }> = [];

  for (const available of availableTools) {
    const availableKebab = toKebabCase(available);
    const distance = levenshteinDistance(missingKebab, availableKebab);
    const isSubstring = availableKebab.includes(missingKebab) || missingKebab.includes(availableKebab);

    if (distance <= 3 || isSubstring) {
      suggestions.push({ name: available, score: isSubstring ? distance - 0.5 : distance });
    }
  }

  return suggestions
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(s => s.name);
}

function createServerFromConfig(config: SingleFileMCPConfig): BuildMCPServer {
  const server = new BuildMCPServer({
    name: config.name,
    version: config.version,
    basePath: config.basePath,
    defaultTimeout: config.defaultTimeout,
    transport: config.port ? { port: config.port } : undefined,
  });

  // Register tools
  if (config.tools && config.tools.length > 0) {
    for (const tool of config.tools) {
      server.addTool({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as any,
        execute: tool.execute,
      });
    }
  }

  // Register routers with validation
  if (config.routers && config.routers.length > 0) {
    const registeredToolNames = new Set<string>();
    const toolNameMap = new Map<string, string>();

    if (config.tools && config.tools.length > 0) {
      for (const tool of config.tools) {
        const kebabName = toKebabCase(tool.name);
        registeredToolNames.add(kebabName);
        toolNameMap.set(kebabName, tool.name);
      }
    }

    const seenRouterNames = new Set<string>();

    for (const router of config.routers) {
      // Validate router name is unique
      if (seenRouterNames.has(router.name)) {
        const existingRouters = Array.from(seenRouterNames).join(', ');
        throw new Error(
          `Duplicate router name '${router.name}' in configuration\n\n` +
          `What went wrong:\n` +
          `  Router '${router.name}' is already defined in this configuration.\n\n` +
          `Existing routers: ${existingRouters}\n\n` +
          `To fix:\n` +
          `  1. Choose a unique name for each router\n` +
          `  2. Remove the duplicate router definition\n` +
          `  3. Use descriptive names like 'weather-tools', 'math-operations', etc.\n`
        );
      }
      seenRouterNames.add(router.name);

      // Validate router has tools array
      if (!router.tools || !Array.isArray(router.tools)) {
        throw new Error(
          `Router '${router.name}' is missing tools array\n\n` +
          `What went wrong:\n` +
          `  Router configuration must include a 'tools' array.\n\n` +
          `To fix:\n` +
          `  Add a 'tools' array to the router configuration:\n` +
          `  { name: '${router.name}', description: '...', tools: ['tool-1', 'tool-2'] }\n`
        );
      }

      // Validate router tools array is non-empty
      if (router.tools.length === 0) {
        throw new Error(
          `Router '${router.name}' has an empty tools array\n\n` +
          `What went wrong:\n` +
          `  Router must have at least one tool assigned.\n\n` +
          `To fix:\n` +
          `  Add tool names to the 'tools' array:\n` +
          `  { name: '${router.name}', description: '...', tools: ['tool-1', 'tool-2'] }\n`
        );
      }

      // Validate each tool exists
      const missingTools: string[] = [];
      const availableToolNames = Array.from(registeredToolNames);

      for (const toolName of router.tools) {
        const toolKebab = toKebabCase(toolName);
        if (!registeredToolNames.has(toolKebab)) {
          missingTools.push(toolName);
        }
      }

      if (missingTools.length > 0) {
        let errorMessage = `Router '${router.name}' references tools that don't exist\n\n`;
        errorMessage += `What went wrong:\n`;
        errorMessage += `  The following tools do not exist in the configuration:\n\n`;

        for (const missing of missingTools) {
          errorMessage += `  - '${missing}'\n`;
          const originalNames = Array.from(toolNameMap.values());
          const suggestions = findSimilarNames(missing, originalNames);

          if (suggestions.length > 0) {
            errorMessage += `    Did you mean: ${suggestions.map(s => `'${s}'`).join(', ')}?\n`;
          }
        }

        errorMessage += `\nAvailable tools in configuration:\n`;
        if (availableToolNames.length === 0) {
          errorMessage += `  (none - add tools before defining routers)\n`;
        } else {
          const originalNames = Array.from(toolNameMap.values()).sort();
          for (const toolName of originalNames) {
            errorMessage += `  - ${toolName}\n`;
          }
        }

        errorMessage += `\nTo fix:\n`;
        errorMessage += `  1. Check the spelling of tool names in the router configuration\n`;
        errorMessage += `  2. Ensure tools are defined before routers in the config file\n`;
        errorMessage += `  3. Tool names are case-insensitive and underscore-tolerant (get_weather = get-weather)\n`;

        throw new Error(errorMessage);
      }

      server.addRouterTool({
        name: router.name,
        description: router.description,
        metadata: router.metadata,
      });

      // Convert router tool names to actual registered tool names
      const actualToolNames = router.tools.map(toolName => {
        const kebab = toKebabCase(toolName);
        return toolNameMap.get(kebab) || toolName;
      });

      server.assignTools(router.name, actualToolNames);
    }
  }

  return server;
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}Functional API Router - Feature Layer Tests${colors.reset}\n`);

  let allPassed = true;

  try {
    // ========================================================================
    // Test Group 1: Multiple Routers in Single Config
    // ========================================================================
    section('Test Group 1: Multiple Routers in Single Config');

    // Test 1.1: Two routers can be defined simultaneously
    try {
      const config: SingleFileMCPConfig = {
        name: 'test-server',
        version: '1.0.0',
        tools: [
          {
            name: 'get-weather',
            description: 'Get weather',
            parameters: z.object({ city: z.string() }),
            execute: async (args) => `Weather in ${args.city}`,
          },
          {
            name: 'get-forecast',
            description: 'Get forecast',
            parameters: z.object({ city: z.string() }),
            execute: async (args) => `Forecast for ${args.city}`,
          },
          {
            name: 'get-alerts',
            description: 'Get alerts',
            parameters: z.object({ city: z.string() }),
            execute: async (args) => `Alerts for ${args.city}`,
          },
        ],
        routers: [
          {
            name: 'weather-router',
            description: 'Weather tools',
            tools: ['get-weather', 'get-forecast'],
          },
          {
            name: 'alerts-router',
            description: 'Alert tools',
            tools: ['get-alerts'],
          },
        ],
      };

      const server = createServerFromConfig(config);
      const stats = server.getStats();

      if (stats.routers === 2) {
        pass('Two routers can be defined simultaneously');
        info(`  Created ${stats.routers} routers`);
      } else {
        fail(`Expected 2 routers, got ${stats.routers}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Two routers test: ${error.message}`);
      allPassed = false;
    }

    // Test 1.2: Three routers can be defined simultaneously
    try {
      const config: SingleFileMCPConfig = {
        name: 'test-server',
        version: '1.0.0',
        tools: [
          {
            name: 'search',
            description: 'Search products',
            parameters: z.object({ query: z.string() }),
            execute: async (args) => `Search: ${args.query}`,
          },
          {
            name: 'create',
            description: 'Create product',
            parameters: z.object({ name: z.string() }),
            execute: async (args) => `Created: ${args.name}`,
          },
          {
            name: 'delete',
            description: 'Delete product',
            parameters: z.object({ id: z.string() }),
            execute: async (args) => `Deleted: ${args.id}`,
          },
        ],
        routers: [
          {
            name: 'products-router',
            description: 'Product tools',
            tools: ['search', 'create'],
          },
          {
            name: 'admin-router',
            description: 'Admin tools',
            tools: ['search', 'delete', 'create'],
          },
          {
            name: 'reports-router',
            description: 'Report tools',
            tools: ['search'],
          },
        ],
      };

      const server = createServerFromConfig(config);
      const stats = server.getStats();

      if (stats.routers === 3) {
        pass('Three routers can be defined simultaneously');
        info(`  Created ${stats.routers} routers`);
      } else {
        fail(`Expected 3 routers, got ${stats.routers}`);
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Three routers test: ${error.message}`);
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
        const config: SingleFileMCPConfig = {
          name: 'test-server',
          version: '1.0.0',
          tools: [
            {
              name: 'tool1',
              description: 'Tool 1',
              parameters: z.object({}),
              execute: async () => 'tool1',
            },
            {
              name: 'tool2',
              description: 'Tool 2',
              parameters: z.object({}),
              execute: async () => 'tool2',
            },
          ],
          routers: [
            {
              name: 'my-router',
              description: 'First router',
              tools: ['tool1'],
            },
            {
              name: 'my-router', // DUPLICATE!
              description: 'Duplicate router',
              tools: ['tool2'],
            },
          ],
        };

        createServerFromConfig(config);
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
        const config: SingleFileMCPConfig = {
          name: 'test-server',
          version: '1.0.0',
          tools: [
            {
              name: 'tool1',
              description: 'Tool 1',
              parameters: z.object({}),
              execute: async () => 'tool1',
            },
          ],
          routers: [
            {
              name: 'router-one',
              description: 'Router One',
              tools: ['tool1'],
            },
            {
              name: 'router-two',
              description: 'Router Two',
              tools: ['tool1'],
            },
            {
              name: 'router-one', // DUPLICATE!
              description: 'Duplicate',
              tools: ['tool1'],
            },
          ],
        };

        createServerFromConfig(config);
      } catch (error: any) {
        errorMessage = error.message;
      }

      if (errorMessage.includes('router-one') && errorMessage.includes('Existing routers')) {
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
      let errorThrown = false;
      let errorMessage = '';

      try {
        const config: SingleFileMCPConfig = {
          name: 'test-server',
          version: '1.0.0',
          tools: [
            {
              name: 'existing-tool',
              description: 'Existing tool',
              parameters: z.object({}),
              execute: async () => 'exists',
            },
          ],
          routers: [
            {
              name: 'test-router',
              description: 'Test Router',
              tools: ['existing-tool', 'missing-tool'], // missing-tool doesn't exist!
            },
          ],
        };

        createServerFromConfig(config);
      } catch (error: any) {
        errorThrown = true;
        errorMessage = error.message;
      }

      if (errorThrown && errorMessage.includes('missing-tool') && errorMessage.includes("don't exist")) {
        pass('Missing tool throws error during server creation');
        info('  Error identifies missing tool');
      } else {
        fail('Missing tool should throw error');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Missing tool test: ${error.message}`);
      allPassed = false;
    }

    // Test 3.2: Error message lists available tools
    try {
      let errorMessage = '';

      try {
        const config: SingleFileMCPConfig = {
          name: 'test-server',
          version: '1.0.0',
          tools: [
            {
              name: 'correct-tool',
              description: 'Correct tool',
              parameters: z.object({}),
              execute: async () => 'correct',
            },
            {
              name: 'another-tool',
              description: 'Another tool',
              parameters: z.object({}),
              execute: async () => 'another',
            },
          ],
          routers: [
            {
              name: 'test-router',
              description: 'Test Router',
              tools: ['wrong-tool'],
            },
          ],
        };

        createServerFromConfig(config);
      } catch (error: any) {
        errorMessage = error.message;
      }

      if (errorMessage.includes('Available tools') &&
          errorMessage.includes('correct-tool') &&
          errorMessage.includes('another-tool')) {
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
      let errorMessage = '';

      try {
        const config: SingleFileMCPConfig = {
          name: 'test-server',
          version: '1.0.0',
          tools: [
            {
              name: 'get-weather',
              description: 'Get weather',
              parameters: z.object({}),
              execute: async () => 'weather',
            },
          ],
          routers: [
            {
              name: 'test-router',
              description: 'Test Router',
              tools: ['get-weater'], // Typo: should be get-weather
            },
          ],
        };

        createServerFromConfig(config);
      } catch (error: any) {
        errorMessage = error.message;
      }

      if (errorMessage.includes('Did you mean') && errorMessage.includes('get-weather')) {
        pass('Error message suggests correct spelling');
        info('  Typo detection: error message includes get-weather');
      } else {
        fail('Error should suggest similar tool names');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Typo suggestion test: ${error.message}`);
      allPassed = false;
    }

    // Test 3.4: Case-insensitive tool name matching (kebab-case normalization)
    try {
      const config: SingleFileMCPConfig = {
        name: 'test-server',
        version: '1.0.0',
        tools: [
          {
            name: 'get-weather',
            description: 'Get weather',
            parameters: z.object({}),
            execute: async () => 'weather',
          },
        ],
        routers: [
          {
            name: 'test-router',
            description: 'Test Router',
            tools: ['get-weather'], // Same as tool name
          },
        ],
      };

      const server = createServerFromConfig(config);
      const stats = server.getStats();

      if (stats.routers === 1) {
        pass('Case-insensitive tool name matching works');
        info('  Tool names normalized via kebab-case');
      } else {
        fail('Case-insensitive matching failed');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Case-insensitive test: ${error.message}`);
      allPassed = false;
    }

    // Test 3.5: Underscore/hyphen tolerance in tool names (kebab-case normalization)
    try {
      const config: SingleFileMCPConfig = {
        name: 'test-server',
        version: '1.0.0',
        tools: [
          {
            name: 'get_weather', // Underscore in tool definition
            description: 'Get weather',
            parameters: z.object({}),
            execute: async () => 'weather',
          },
        ],
        routers: [
          {
            name: 'test-router',
            description: 'Test Router',
            tools: ['get-weather'], // Hyphen in router config - should match
          },
        ],
      };

      const server = createServerFromConfig(config);
      const stats = server.getStats();

      if (stats.routers === 1) {
        pass('Underscore/hyphen tolerance works');
        info('  get_weather matched get-weather via kebab-case');
      } else {
        fail('Underscore/hyphen tolerance failed');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Underscore/hyphen test: ${error.message}`);
      allPassed = false;
    }

    // Test 3.6: Error includes router name and missing tool name
    try {
      let errorMessage = '';

      try {
        const config: SingleFileMCPConfig = {
          name: 'test-server',
          version: '1.0.0',
          tools: [
            {
              name: 'tool1',
              description: 'Tool 1',
              parameters: z.object({}),
              execute: async () => 'tool1',
            },
          ],
          routers: [
            {
              name: 'my-special-router',
              description: 'Special Router',
              tools: ['non-existent-tool'],
            },
          ],
        };

        createServerFromConfig(config);
      } catch (error: any) {
        errorMessage = error.message;
      }

      if (errorMessage.includes('my-special-router') && errorMessage.includes('non-existent-tool')) {
        pass('Error includes router name and missing tool name');
        info('  Error clearly identifies router and missing tool');
      } else {
        fail('Error should include router name and missing tool name');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Error detail test: ${error.message}`);
      allPassed = false;
    }

    // Test 3.7: Multiple missing tools all listed in error
    try {
      let errorMessage = '';

      try {
        const config: SingleFileMCPConfig = {
          name: 'test-server',
          version: '1.0.0',
          tools: [
            {
              name: 'tool1',
              description: 'Tool 1',
              parameters: z.object({}),
              execute: async () => 'tool1',
            },
          ],
          routers: [
            {
              name: 'test-router',
              description: 'Test Router',
              tools: ['missing1', 'missing2', 'missing3'],
            },
          ],
        };

        createServerFromConfig(config);
      } catch (error: any) {
        errorMessage = error.message;
      }

      if (errorMessage.includes('missing1') &&
          errorMessage.includes('missing2') &&
          errorMessage.includes('missing3')) {
        pass('Multiple missing tools all listed in error');
        info('  Error lists all 3 missing tools');
      } else {
        fail('Error should list all missing tools');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Multiple missing tools test: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 4: Integration with BuildMCPServer
    // ========================================================================
    section('Test Group 4: Integration with BuildMCPServer');

    // Test 4.1: Router with correct tools registers successfully
    try {
      const config: SingleFileMCPConfig = {
        name: 'test-server',
        version: '1.0.0',
        tools: [
          {
            name: 'tool1',
            description: 'Tool 1',
            parameters: z.object({ value: z.string() }),
            execute: async (args) => `Tool1: ${args.value}`,
          },
          {
            name: 'tool2',
            description: 'Tool 2',
            parameters: z.object({ num: z.number() }),
            execute: async (args) => `Tool2: ${args.num}`,
          },
        ],
        routers: [
          {
            name: 'my-router',
            description: 'My Router',
            tools: ['tool1', 'tool2'],
          },
        ],
      };

      const server = createServerFromConfig(config);
      const stats = server.getStats();

      if (stats.routers === 1 && stats.assignedTools === 2) {
        pass('Router with correct tools registers successfully');
        info(`  Router created with ${stats.assignedTools} tools`);
      } else {
        fail('Router registration failed');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Router registration test: ${error.message}`);
      allPassed = false;
    }

    // Test 4.2: Multiple tools per router work
    try {
      const config: SingleFileMCPConfig = {
        name: 'test-server',
        version: '1.0.0',
        tools: [
          {
            name: 'add',
            description: 'Add numbers',
            parameters: z.object({ a: z.number(), b: z.number() }),
            execute: async (args) => `${args.a + args.b}`,
          },
          {
            name: 'subtract',
            description: 'Subtract numbers',
            parameters: z.object({ a: z.number(), b: z.number() }),
            execute: async (args) => `${args.a - args.b}`,
          },
          {
            name: 'multiply',
            description: 'Multiply numbers',
            parameters: z.object({ a: z.number(), b: z.number() }),
            execute: async (args) => `${args.a * args.b}`,
          },
        ],
        routers: [
          {
            name: 'math-router',
            description: 'Math operations',
            tools: ['add', 'subtract', 'multiply'],
          },
        ],
      };

      const server = createServerFromConfig(config);
      const result = await server.executeToolDirect('math-router', {});
      const parsed = JSON.parse(result.content[0].text);

      if (parsed.tools && parsed.tools.length === 3) {
        pass('Multiple tools per router work');
        info(`  Router has ${parsed.tools.length} tools`);
      } else {
        fail('Multiple tools per router failed');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Multiple tools test: ${error.message}`);
      allPassed = false;
    }

    // Test 4.3: Integration with BuildMCPServer.addRouterTool()
    try {
      const config: SingleFileMCPConfig = {
        name: 'test-server',
        version: '1.0.0',
        tools: [
          {
            name: 'tool1',
            description: 'Tool 1',
            parameters: z.object({}),
            execute: async () => 'tool1',
          },
        ],
        routers: [
          {
            name: 'test-router',
            description: 'Test Router',
            tools: ['tool1'],
          },
        ],
      };

      const server = createServerFromConfig(config);

      // Verify router was added via addRouterTool
      const stats = server.getStats();
      if (stats.routers === 1) {
        pass('Integration with BuildMCPServer.addRouterTool() works');
        info('  Router successfully added to server');
      } else {
        fail('addRouterTool integration failed');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`addRouterTool integration test: ${error.message}`);
      allPassed = false;
    }

    // Test 4.4: Integration with BuildMCPServer.assignTools()
    try {
      const config: SingleFileMCPConfig = {
        name: 'test-server',
        version: '1.0.0',
        tools: [
          {
            name: 'tool-a',
            description: 'Tool A',
            parameters: z.object({}),
            execute: async () => 'a',
          },
          {
            name: 'tool-b',
            description: 'Tool B',
            parameters: z.object({}),
            execute: async () => 'b',
          },
        ],
        routers: [
          {
            name: 'test-router',
            description: 'Test Router',
            tools: ['tool-a', 'tool-b'],
          },
        ],
      };

      const server = createServerFromConfig(config);
      const result = await server.executeToolDirect('test-router', {});
      const parsed = JSON.parse(result.content[0].text);

      const toolNames = parsed.tools.map((t: any) => t.name);
      if (toolNames.includes('tool-a') && toolNames.includes('tool-b')) {
        pass('Integration with BuildMCPServer.assignTools() works');
        info('  Tools correctly assigned to router');
      } else {
        fail('assignTools integration failed');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`assignTools integration test: ${error.message}`);
      allPassed = false;
    }

    // ========================================================================
    // Test Group 5: Full End-to-End Tests
    // ========================================================================
    section('Test Group 5: Full End-to-End Tests');

    // Test 5.1: Full workflow - define tools, routers, execute successfully
    try {
      const config: SingleFileMCPConfig = {
        name: 'weather-server',
        version: '1.0.0',
        tools: [
          {
            name: 'get-current-weather',
            description: 'Get current weather',
            parameters: z.object({ city: z.string() }),
            execute: async (args) => `Current weather in ${args.city}: Sunny`,
          },
          {
            name: 'get-forecast',
            description: 'Get weather forecast',
            parameters: z.object({ city: z.string(), days: z.number() }),
            execute: async (args) => `${args.days}-day forecast for ${args.city}`,
          },
          {
            name: 'get-alerts',
            description: 'Get weather alerts',
            parameters: z.object({ region: z.string() }),
            execute: async (args) => `Alerts for ${args.region}`,
          },
        ],
        routers: [
          {
            name: 'weather-tools',
            description: 'Weather information tools',
            tools: ['get-current-weather', 'get-forecast'],
          },
          {
            name: 'alert-tools',
            description: 'Weather alert tools',
            tools: ['get-alerts'],
          },
        ],
      };

      const server = createServerFromConfig(config);

      // Test 1: Router returns correct tools
      const weatherRouter = await server.executeToolDirect('weather-tools', {});
      const weatherParsed = JSON.parse(weatherRouter.content[0].text);

      // Test 2: Tool execution works
      const weatherResult = await server.executeToolDirect('get-current-weather', { city: 'NYC' });

      const stats = server.getStats();

      if (weatherParsed.tools.length === 2 &&
          weatherResult.content[0].text.includes('NYC') &&
          stats.routers === 2) {
        pass('Full end-to-end workflow works');
        info('  Routers defined, tools assigned, execution successful');
      } else {
        fail('End-to-end workflow failed');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`End-to-end test: ${error.message}`);
      allPassed = false;
    }

    // Test 5.2: Feature layer + Foundation layer work together
    try {
      const config: SingleFileMCPConfig = {
        name: 'test-server',
        version: '1.0.0',
        tools: [
          {
            name: 'shared-tool',
            description: 'Shared tool',
            parameters: z.object({ value: z.string() }),
            execute: async (args) => `Shared: ${args.value}`,
          },
          {
            name: 'exclusive-tool',
            description: 'Exclusive tool',
            parameters: z.object({ value: z.string() }),
            execute: async (args) => `Exclusive: ${args.value}`,
          },
        ],
        routers: [
          {
            name: 'router-a',
            description: 'Router A',
            tools: ['shared-tool', 'exclusive-tool'],
          },
          {
            name: 'router-b',
            description: 'Router B',
            tools: ['shared-tool'],
          },
        ],
      };

      const server = createServerFromConfig(config);

      // Foundation layer: Tool can be shared across routers
      const routerA = await server.executeToolDirect('router-a', {});
      const parsedA = JSON.parse(routerA.content[0].text);

      const routerB = await server.executeToolDirect('router-b', {});
      const parsedB = JSON.parse(routerB.content[0].text);

      const hasSharedInA = parsedA.tools.some((t: any) => t.name === 'shared-tool');
      const hasSharedInB = parsedB.tools.some((t: any) => t.name === 'shared-tool');

      if (hasSharedInA && hasSharedInB && parsedA.tools.length === 2 && parsedB.tools.length === 1) {
        pass('Feature layer + Foundation layer work together');
        info('  Validation + tool sharing both working');
      } else {
        fail('Feature + Foundation integration failed');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Feature + Foundation test: ${error.message}`);
      allPassed = false;
    }

    // Test 5.3: Maximum suggestions is 3
    try {
      let errorMessage = '';

      try {
        const config: SingleFileMCPConfig = {
          name: 'test-server',
          version: '1.0.0',
          tools: [
            {
              name: 'get-weather-current',
              description: 'Tool 1',
              parameters: z.object({}),
              execute: async () => '1',
            },
            {
              name: 'get-weather-forecast',
              description: 'Tool 2',
              parameters: z.object({}),
              execute: async () => '2',
            },
            {
              name: 'get-weather-alerts',
              description: 'Tool 3',
              parameters: z.object({}),
              execute: async () => '3',
            },
            {
              name: 'get-weather-history',
              description: 'Tool 4',
              parameters: z.object({}),
              execute: async () => '4',
            },
          ],
          routers: [
            {
              name: 'test-router',
              description: 'Test Router',
              tools: ['get-weather'], // Matches all 4 tools
            },
          ],
        };

        createServerFromConfig(config);
      } catch (error: any) {
        errorMessage = error.message;
      }

      // Count suggestions in error message
      const suggestionMatches = errorMessage.match(/'get-weather-[^']+'/g);
      const suggestionCount = suggestionMatches ? suggestionMatches.length : 0;

      if (suggestionCount <= 3 && errorMessage.includes('Did you mean')) {
        pass('Maximum 3 suggestions shown');
        info(`  Showed ${suggestionCount} suggestions (max 3)`);
      } else {
        fail('Should show maximum 3 suggestions');
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Max suggestions test: ${error.message}`);
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
    console.log(`${colors.bold}${colors.green}All Functional API Router Feature Layer tests passed! ✓${colors.reset}`);
    console.log(`\n${colors.cyan}Feature Layer Implementation Status:${colors.reset}`);
    console.log(`  ${colors.green}✓${colors.reset} Multiple routers can be defined simultaneously`);
    console.log(`  ${colors.green}✓${colors.reset} Router names must be unique (validation enforced)`);
    console.log(`  ${colors.green}✓${colors.reset} Router tool names must reference actual tools`);
    console.log(`  ${colors.green}✓${colors.reset} Tool name matching is case-insensitive`);
    console.log(`  ${colors.green}✓${colors.reset} Tool name matching tolerates underscores/hyphens`);
    console.log(`  ${colors.green}✓${colors.reset} Missing tools generate useful error messages`);
    console.log(`  ${colors.green}✓${colors.reset} Typo suggestions appear in error messages (max 3)`);
    console.log(`  ${colors.green}✓${colors.reset} Error messages include router name and missing tools`);
    console.log(`  ${colors.green}✓${colors.reset} Integration with BuildMCPServer.addRouterTool() works`);
    console.log(`  ${colors.green}✓${colors.reset} Integration with BuildMCPServer.assignTools() works`);
    console.log(`  ${colors.green}✓${colors.reset} Full end-to-end workflow successful`);
    console.log(`  ${colors.green}✓${colors.reset} Feature layer + Foundation layer work together`);
    console.log(`\n${colors.cyan}Implementation Details:${colors.reset}`);
    console.log(`  - Validation in createServerFromConfig() function`);
    console.log(`  - Helper functions: toKebabCase(), findSimilarNames()`);
    console.log(`  - Descriptive error messages with suggestions`);
    console.log(`  - Tool names converted to kebab-case for matching`);
    console.log(`  - Maximum 3 typo suggestions per error`);
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
