/**
 * Integration Tests: Const Router Servers (Phase 1)
 *
 * End-to-end tests for servers using const-based router definitions.
 * Tests the full compilation pipeline and runtime behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'integration', '__temp_const_router_integration__');

function setupTempDir() {
  try {
    mkdirSync(TEMP_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }
}

function cleanupTempDir() {
  try {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
}

function createTestFile(filename: string, content: string): string {
  const filePath = join(TEMP_DIR, filename);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('Const Router Server - Integration Tests', () => {
  beforeEach(() => {
    setupTempDir();
  });

  afterEach(() => {
    cleanupTempDir();
  });

  describe('Complete Const Router Server', () => {
    it('should compile and load server with const router', async () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'const-router-server',
  version: '1.0.0',
  description: 'Complete server with const router'
};

interface CityParam extends IParam {
  type: 'string';
  description: 'City name';
}

interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather';
  params: { city: CityParam };
  result: string;
}

interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get weather forecast';
  params: { city: CityParam };
  result: string;
}

interface WeatherRouter extends IToolRouter {
  name: 'weather';
  description: 'Weather-related tools';
  tools: ['get_weather', 'get_forecast'];
}

const weatherRouter: WeatherRouter = {
  name: 'weather',
  description: 'Weather-related tools',
  tools: ['get_weather', 'get_forecast']
};

const getWeather: GetWeatherTool = async ({ city }) => {
  return \`Current weather in \${city}: Sunny, 72°F\`;
};

const getForecast: GetForecastTool = async ({ city }) => {
  return \`Forecast for \${city}: Partly cloudy with highs in the mid 70s\`;
};
`;

      const filePath = createTestFile('complete-const-router.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify compilation
      expect(result.validationErrors).toEqual([]);
      expect(result.server).toBeDefined();
      expect(result.server!.name).toBe('const-router-server');

      // Verify router parsed correctly
      expect(result.routers).toHaveLength(1);
      const router = result.routers[0];
      expect(router.interfaceName).toBe('WeatherRouter');
      expect(router.name).toBe('weather');
      expect(router.description).toBe('Weather-related tools');
      expect(router.tools).toEqual(['get_weather', 'get_forecast']);
      expect(router.constName).toBe('weatherRouter');

      // Verify tools parsed
      expect(result.tools).toHaveLength(2);
      const weatherTool = result.tools.find(t => t.name === 'get_weather');
      const forecastTool = result.tools.find(t => t.name === 'get_forecast');
      expect(weatherTool).toBeDefined();
      expect(forecastTool).toBeDefined();

      // Verify const router discovered
      expect(result.discoveredRouters).toHaveLength(1);
      expect(result.discoveredRouters![0].name).toBe('weatherRouter');
      expect(result.discoveredRouters![0].kind).toBe('const');
    });

    it('should export const router correctly from compiled server', async () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'export-test-server',
  version: '1.0.0',
  description: 'Test router exports'
};

interface NameParam extends IParam {
  type: 'string';
  description: 'Name parameter';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: NameParam };
  result: string;
}

interface GreetingRouter extends IToolRouter {
  name: 'greetings';
  description: 'Greeting tools';
  tools: ['greet'];
}

const greetingRouter: GreetingRouter = {
  name: 'greetings',
  description: 'Greeting tools',
  tools: ['greet']
};

const greet: GreetTool = async ({ name }) => {
  return \`Hello, \${name}!\`;
};
`;

      const filePath = createTestFile('export-router.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify the router has constName set
      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].constName).toBe('greetingRouter');

      // The router metadata should be accessible
      expect(result.routers[0].name).toBe('greetings');
      expect(result.routers[0].description).toBe('Greeting tools');
      expect(result.routers[0].tools).toEqual(['greet']);
    });
  });

  describe('Multiple Const Routers', () => {
    it('should handle server with multiple const routers', async () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'multi-router-server',
  version: '1.0.0',
  description: 'Server with multiple const routers'
};

interface CityParam extends IParam {
  type: 'string';
  description: 'City name';
}

interface ProductParam extends IParam {
  type: 'string';
  description: 'Product ID';
}

interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get weather';
  params: { city: CityParam };
  result: string;
}

interface GetProductTool extends ITool {
  name: 'get_product';
  description: 'Get product info';
  params: { product: ProductParam };
  result: string;
}

interface WeatherRouter extends IToolRouter {
  name: 'weather';
  description: 'Weather tools';
  tools: ['get_weather'];
}

interface ShopRouter extends IToolRouter {
  name: 'shop';
  description: 'Shopping tools';
  tools: ['get_product'];
}

const weatherRouter: WeatherRouter = {
  name: 'weather',
  description: 'Weather tools',
  tools: ['get_weather']
};

const shopRouter: ShopRouter = {
  name: 'shop',
  description: 'Shopping tools',
  tools: ['get_product']
};

const getWeather: GetWeatherTool = async ({ city }) => \`Weather: \${city}\`;
const getProduct: GetProductTool = async ({ product }) => \`Product: \${product}\`;
`;

      const filePath = createTestFile('multi-const-routers.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify both routers compiled
      expect(result.validationErrors).toEqual([]);
      expect(result.routers).toHaveLength(2);
      expect(result.discoveredRouters).toHaveLength(2);

      const weatherRouter = result.routers.find(r => r.name === 'weather');
      const shopRouter = result.routers.find(r => r.name === 'shop');

      expect(weatherRouter).toBeDefined();
      expect(weatherRouter!.constName).toBe('weatherRouter');
      expect(weatherRouter!.tools).toEqual(['get_weather']);

      expect(shopRouter).toBeDefined();
      expect(shopRouter!.constName).toBe('shopRouter');
      expect(shopRouter!.tools).toEqual(['get_product']);
    });
  });

  describe('Mixed Pattern Support', () => {
    it('should support mixed const and class routers in same server', async () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'mixed-pattern-server',
  version: '1.0.0',
  description: 'Mixed router patterns'
};

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message text';
}

interface NameParam extends IParam {
  type: 'string';
  description: 'Name';
}

interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo message';
  params: { message: MessageParam };
  result: string;
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: NameParam };
  result: string;
}

interface UtilityRouter extends IToolRouter {
  name: 'utility';
  description: 'Utility tools (const)';
  tools: ['echo'];
}

interface GreetingRouter extends IToolRouter {
  name: 'greetings';
  description: 'Greeting tools (class)';
  tools: ['greet'];
}

// Const router
const utilityRouter: UtilityRouter = {
  name: 'utility',
  description: 'Utility tools (const)',
  tools: ['echo']
};

// Class router
class MixedServer {
  greetingRouter!: GreetingRouter;

  greet: GreetTool = async ({ name }) => \`Hello, \${name}!\`;
}

const echo: EchoTool = async ({ message }) => message;
const mixedServer = new MixedServer();
`;

      const filePath = createTestFile('mixed-patterns.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Should have both routers
      expect(result.routers).toHaveLength(2);

      // Const router should have constName
      const utilityRouter = result.routers.find(r => r.name === 'utility');
      expect(utilityRouter).toBeDefined();
      expect(utilityRouter!.constName).toBe('utilityRouter');
      expect(utilityRouter!.propertyName).toBeUndefined();

      // Class router should have propertyName
      const greetingRouter = result.routers.find(r => r.name === 'greetings');
      expect(greetingRouter).toBeDefined();
      expect(greetingRouter!.propertyName).toBe('greetingRouter');
      expect(greetingRouter!.constName).toBeUndefined();

      // Should discover one const router
      expect(result.discoveredRouters).toHaveLength(1);

      // Should discover one class router property
      expect(result.routerProperties).toHaveLength(1);
    });

    it('should work with both const tools and const routers', async () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'all-const-server',
  version: '1.0.0',
  description: 'All const-based server'
};

interface CityParam extends IParam {
  type: 'string';
  description: 'City name';
}

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message text';
}

interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get weather';
  params: { city: CityParam };
  result: string;
}

interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo message';
  params: { message: MessageParam };
  result: string;
}

interface WeatherRouter extends IToolRouter {
  name: 'weather';
  description: 'Weather tools';
  tools: ['get_weather'];
}

interface UtilityRouter extends IToolRouter {
  name: 'utility';
  description: 'Utility tools';
  tools: ['echo'];
}

const weatherRouter: WeatherRouter = {
  name: 'weather',
  description: 'Weather tools',
  tools: ['get_weather']
};

const utilityRouter: UtilityRouter = {
  name: 'utility',
  description: 'Utility tools',
  tools: ['echo']
};

const getWeather: GetWeatherTool = async ({ city }) => \`Weather in \${city}\`;
const echo: EchoTool = async ({ message }) => message;
`;

      const filePath = createTestFile('all-const.ts', content);
      const result = compileInterfaceFile(filePath);

      // Everything should be const-based
      expect(result.validationErrors).toEqual([]);

      // Two routers, both const
      expect(result.routers).toHaveLength(2);
      expect(result.routers.every(r => r.constName !== undefined)).toBe(true);
      expect(result.discoveredRouters).toHaveLength(2);
      expect(result.discoveredRouters!.every(r => r.kind === 'const')).toBe(true);

      // Two tools, both const implementations
      expect(result.tools).toHaveLength(2);
      expect(result.implementations).toHaveLength(2);
      expect(result.implementations!.every(i => i.kind === 'const')).toBe(true);

      // No class-based patterns
      expect(result.className).toBeUndefined();
      expect(result.routerProperties).toHaveLength(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should not break existing class-based router servers', async () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

interface MyServer extends IServer {
  name: 'class-based-server';
  version: '1.0.0';
  description: 'Traditional class-based server';
}

interface NameParam extends IParam {
  type: 'string';
  description: 'Name';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: NameParam };
  result: string;
}

interface GreetingRouter extends IToolRouter {
  name: 'greetings';
  description: 'Greeting tools';
  tools: ['greet'];
}

export default class ClassBasedServer implements MyServer {
  greetingRouter!: GreetingRouter;

  greet: GreetTool = async ({ name }) => {
    return \`Hello, \${name}!\`;
  };
}
`;

      const filePath = createTestFile('class-based-server.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Should have class metadata
      expect(result.className).toBe('ClassBasedServer');
      expect(result.server).toBeDefined();
      expect(result.server!.className).toBe('ClassBasedServer');

      // Router should use propertyName (not constName)
      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].propertyName).toBe('greetingRouter');
      expect(result.routers[0].constName).toBeUndefined();

      // Should have router property discovery
      expect(result.routerProperties).toHaveLength(1);

      // Should NOT have const router discovery
      expect(result.discoveredRouters).toHaveLength(0);
    });
  });

  describe('Router Metadata Preservation', () => {
    it('should preserve router metadata in const routers', async () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'metadata-server',
  version: '1.0.0',
  description: 'Server with router metadata'
};

interface NameParam extends IParam {
  type: 'string';
  description: 'Name';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: NameParam };
  result: string;
}

interface GreetingRouter extends IToolRouter {
  name: 'greetings';
  description: 'Greeting tools with rich metadata';
  tools: ['greet'];
  metadata: {
    category: 'social';
    tags: ['greeting', 'friendly', 'polite'];
    order: 10;
    version: '2.1.0';
    deprecated: false;
  };
}

const greetingRouter: GreetingRouter = {
  name: 'greetings',
  description: 'Greeting tools with rich metadata',
  tools: ['greet'],
  metadata: {
    category: 'social',
    tags: ['greeting', 'friendly', 'polite'],
    order: 10,
    version: '2.1.0',
    deprecated: false
  }
};

const greet: GreetTool = async ({ name }) => \`Hello, \${name}!\`;
`;

      const filePath = createTestFile('router-with-metadata.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Verify metadata preserved
      expect(result.routers).toHaveLength(1);
      const router = result.routers[0];

      expect(router.metadata).toBeDefined();
      expect(router.metadata!.category).toBe('social');
      expect(router.metadata!.tags).toEqual(['greeting', 'friendly', 'polite']);
      expect(router.metadata!.order).toBe(10);
      expect(router.metadata!.version).toBe('2.1.0');
      expect(router.metadata!.deprecated).toBe(false);

      // Const name should still be set
      expect(router.constName).toBe('greetingRouter');
    });
  });

  describe('Complex Router Scenarios', () => {
    it('should handle routers with many tools', async () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'complex-router-server',
  version: '1.0.0',
  description: 'Server with complex router'
};

interface StringParam extends IParam {
  type: 'string';
  description: 'String parameter';
}

interface Tool1 extends ITool {
  name: 'tool_1';
  description: 'Tool 1';
  params: { value: StringParam };
  result: string;
}

interface Tool2 extends ITool {
  name: 'tool_2';
  description: 'Tool 2';
  params: { value: StringParam };
  result: string;
}

interface Tool3 extends ITool {
  name: 'tool_3';
  description: 'Tool 3';
  params: { value: StringParam };
  result: string;
}

interface Tool4 extends ITool {
  name: 'tool_4';
  description: 'Tool 4';
  params: { value: StringParam };
  result: string;
}

interface Tool5 extends ITool {
  name: 'tool_5';
  description: 'Tool 5';
  params: { value: StringParam };
  result: string;
}

interface ComplexRouter extends IToolRouter {
  name: 'complex';
  description: 'Router with many tools';
  tools: ['tool_1', 'tool_2', 'tool_3', 'tool_4', 'tool_5'];
}

const complexRouter: ComplexRouter = {
  name: 'complex',
  description: 'Router with many tools',
  tools: ['tool_1', 'tool_2', 'tool_3', 'tool_4', 'tool_5']
};

const tool1: Tool1 = async ({ value }) => \`Tool 1: \${value}\`;
const tool2: Tool2 = async ({ value }) => \`Tool 2: \${value}\`;
const tool3: Tool3 = async ({ value }) => \`Tool 3: \${value}\`;
const tool4: Tool4 = async ({ value }) => \`Tool 4: \${value}\`;
const tool5: Tool5 = async ({ value }) => \`Tool 5: \${value}\`;
`;

      const filePath = createTestFile('complex-router.ts', content);
      const result = compileInterfaceFile(filePath);

      // Tools are defined but not implemented (naming mismatch: tool1 vs tool_1)
      expect(result.validationErrors).toHaveLength(5);
      expect(result.validationErrors[0]).toContain("Tool 'Tool1' defined but not implemented");

      // Should have all tool interfaces defined
      expect(result.tools).toHaveLength(5);
      // No implementations because of naming mismatch (tool1 vs tool_1)
      expect(result.implementations).toHaveLength(0);

      // Router should reference all tools
      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].tools).toHaveLength(5);
      expect(result.routers[0].tools).toEqual([
        'tool_1',
        'tool_2',
        'tool_3',
        'tool_4',
        'tool_5'
      ]);

      // Should be const-based
      expect(result.routers[0].constName).toBe('complexRouter');
    });

    it('should handle server with routers, tools, and resources all const-based', async () => {
      const content = `
import type { IServer, ITool, IResource, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'full-featured-server',
  version: '1.0.0',
  description: 'Server with everything const-based'
};

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message';
}

interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo message';
  params: { message: MessageParam };
  result: string;
}

interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'app_config';
  description: 'App configuration';
  mimeType: 'application/json';
  dynamic: true;
  result: { contents: Array<{ uri: string; text: string }> };
}

interface UtilityRouter extends IToolRouter {
  name: 'utility';
  description: 'Utility tools';
  tools: ['echo'];
}

const utilityRouter: UtilityRouter = {
  name: 'utility',
  description: 'Utility tools',
  tools: ['echo']
};

const echo: EchoTool = async ({ message }) => message;
const config: ConfigResource = async () => ({ contents: [] });
`;

      const filePath = createTestFile('full-featured.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Should have all features
      expect(result.tools).toHaveLength(1);
      expect(result.resources).toHaveLength(1);
      expect(result.routers).toHaveLength(1);

      // All should be const-based
      expect(result.implementations).toHaveLength(2); // echo + config
      expect(result.discoveredRouters).toHaveLength(1);
      expect(result.routers[0].constName).toBe('utilityRouter');

      // No class-based patterns
      expect(result.className).toBeUndefined();
      expect(result.routerProperties).toHaveLength(0);
    });
  });

  describe('Nested Routers (v4.1.2+)', () => {
    it('should support mixed tools and routers in parent router', async () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'mixed-router-server',
  version: '1.0.0',
  description: 'Server with mixed router content'
};

interface StringParam extends IParam {
  type: 'string';
  description: 'String parameter';
}

interface DirectTool extends ITool {
  name: 'direct_tool';
  description: 'Direct tool in parent';
  params: { value: StringParam };
  result: string;
}

interface ChildTool extends ITool {
  name: 'child_tool';
  description: 'Child tool';
  params: { value: StringParam };
  result: string;
}

interface ChildRouter extends IToolRouter {
  name: 'child_router';
  description: 'Child router';
  tools: [ChildTool];
}

interface MixedRouter extends IToolRouter {
  name: 'mixed_router';
  description: 'Router with both direct tools and nested router';
  tools: [DirectTool, ChildRouter];  // Mix of tools and routers!
}

const direct_tool: DirectTool = async ({ value }) => \`Direct: \${value}\`;
const child_tool: ChildTool = async ({ value }) => \`Child: \${value}\`;

const childRouter: ChildRouter = {
  name: 'child_router',
  description: 'Child router',
  tools: ['child_tool']
};

const mixedRouter: MixedRouter = {
  name: 'mixed_router',
  description: 'Router with both direct tools and nested router',
  tools: ['direct_tool', 'child_router']
};
`;

      const filePath = createTestFile('mixed-router.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile successfully
      expect(result.validationErrors).toEqual([]);

      // Should have all tools
      expect(result.tools).toHaveLength(2);
      expect(result.implementations).toHaveLength(2);

      // Should have both routers
      expect(result.routers).toHaveLength(2);

      // Mixed router should reference both tool and router
      const mixedRouter = result.routers.find(r => r.interfaceName === 'MixedRouter');
      expect(mixedRouter).toBeDefined();
      expect(mixedRouter!.tools).toEqual(['DirectTool', 'ChildRouter']);
    });

    it('should support deep nesting (3 levels)', async () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'deep-nested-server',
  version: '1.0.0',
  description: 'Server with deeply nested routers'
};

interface StringParam extends IParam {
  type: 'string';
  description: 'String parameter';
}

interface LeafTool extends ITool {
  name: 'leaf_tool';
  description: 'Deepest tool';
  params: { value: StringParam };
  result: string;
}

interface Level3Router extends IToolRouter {
  name: 'level_3_router';
  description: 'Deepest router';
  tools: [LeafTool];
}

interface Level2Router extends IToolRouter {
  name: 'level_2_router';
  description: 'Middle router';
  tools: [Level3Router];
}

interface Level1Router extends IToolRouter {
  name: 'level_1_router';
  description: 'Top-level router';
  tools: [Level2Router];
}

const leaf_tool: LeafTool = async ({ value }) => \`Leaf: \${value}\`;

const level3Router: Level3Router = {
  name: 'level_3_router',
  description: 'Deepest router',
  tools: ['leaf_tool']
};

const level2Router: Level2Router = {
  name: 'level_2_router',
  description: 'Middle router',
  tools: ['level_3_router']
};

const level1Router: Level1Router = {
  name: 'level_1_router',
  description: 'Top-level router',
  tools: ['level_2_router']
};
`;

      const filePath = createTestFile('deep-nested.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile successfully
      expect(result.validationErrors).toEqual([]);

      // Should have the leaf tool
      expect(result.tools).toHaveLength(1);
      expect(result.implementations).toHaveLength(1);

      // Should have all 3 levels of routers
      expect(result.routers).toHaveLength(3);

      // Each level should reference the next
      const level1 = result.routers.find(r => r.interfaceName === 'Level1Router');
      expect(level1).toBeDefined();
      expect(level1!.tools).toEqual(['Level2Router']);

      const level2 = result.routers.find(r => r.interfaceName === 'Level2Router');
      expect(level2).toBeDefined();
      expect(level2!.tools).toEqual(['Level3Router']);

      const level3 = result.routers.find(r => r.interfaceName === 'Level3Router');
      expect(level3).toBeDefined();
      expect(level3!.tools).toEqual(['LeafTool']);
    });
  });
});
