/**
 * Const Router Discovery Tests (Phase 1)
 *
 * Tests the router discovery system for const-based router patterns:
 * - Pattern 1: const x: IToolRouter = { ... } (base interface)
 * - Pattern 2: const x: WeatherRouter = { ... } (extended interface)
 *
 * This validates the implementation in discovery.ts and main-compiler.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'unit', '__temp_const_router_discovery__');

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

describe('Const Router Discovery (Phase 1)', () => {
  beforeAll(() => {
    setupTempDir();
  });

  afterAll(() => {
    cleanupTempDir();
  });

  describe('Base IToolRouter Pattern', () => {
    it('should discover single const router with IToolRouter base interface', () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'router-test-server',
  version: '1.0.0',
  description: 'Test server with const router'
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

interface WeatherRouter extends IToolRouter {
  name: 'weather_router';
  description: 'Weather tools';
  tools: ['greet'];
}

const weatherRouter: IToolRouter = {
  name: 'weather_router',
  description: 'Weather tools',
  tools: ['greet']
};

const greet: GreetTool = async ({ name }) => {
  return \`Hello, \${name}!\`;
};
`;

      const filePath = createTestFile('base-itoolrouter.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse the router interface
      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].interfaceName).toBe('WeatherRouter');
      expect(result.routers[0].name).toBe('weather_router');
      expect(result.routers[0].description).toBe('Weather tools');
      expect(result.routers[0].tools).toEqual(['greet']);

      // Should discover the const router implementation
      expect(result.discoveredRouters).toHaveLength(1);
      expect(result.discoveredRouters![0].name).toBe('weatherRouter');
      expect(result.discoveredRouters![0].interfaceName).toBe('IToolRouter');
      expect(result.discoveredRouters![0].kind).toBe('const');

      // The router should NOT have constName yet (linking not done in discovery)
      // Linking happens in linkRoutersToInterfaces()
      // After linking, constName should be set
      expect(result.routers[0].constName).toBe('weatherRouter');
    });

    it('should discover const router with extended router interface', () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'extended-router-server',
  version: '1.0.0',
  description: 'Server with extended router interface'
};

interface CityParam extends IParam {
  type: 'string';
  description: 'City name';
}

interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get weather for a city';
  params: { city: CityParam };
  result: string;
}

interface WeatherRouter extends IToolRouter {
  name: 'weather';
  description: 'Weather tools collection';
  tools: ['get_weather'];
}

const weatherRouter: WeatherRouter = {
  name: 'weather',
  description: 'Weather tools collection',
  tools: ['get_weather']
};

const getWeather: GetWeatherTool = async ({ city }) => {
  return \`Weather in \${city}: Sunny\`;
};
`;

      const filePath = createTestFile('extended-router.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse the router interface
      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].interfaceName).toBe('WeatherRouter');
      expect(result.routers[0].name).toBe('weather');

      // Should discover the const router with extended interface name
      expect(result.discoveredRouters).toHaveLength(1);
      expect(result.discoveredRouters![0].name).toBe('weatherRouter');
      expect(result.discoveredRouters![0].interfaceName).toBe('WeatherRouter');
      expect(result.discoveredRouters![0].kind).toBe('const');

      // After linking, constName should be set
      expect(result.routers[0].constName).toBe('weatherRouter');
    });

    it('should discover multiple const routers in same file', () => {
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

interface ItemParam extends IParam {
  type: 'string';
  description: 'Item name';
}

interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get weather';
  params: { city: CityParam };
  result: string;
}

interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get forecast';
  params: { city: CityParam };
  result: string;
}

interface GetInventoryTool extends ITool {
  name: 'get_inventory';
  description: 'Get inventory';
  params: { item: ItemParam };
  result: string;
}

interface WeatherRouter extends IToolRouter {
  name: 'weather';
  description: 'Weather tools';
  tools: ['get_weather', 'get_forecast'];
}

interface InventoryRouter extends IToolRouter {
  name: 'inventory';
  description: 'Inventory tools';
  tools: ['get_inventory'];
}

const weatherRouter: WeatherRouter = {
  name: 'weather',
  description: 'Weather tools',
  tools: ['get_weather', 'get_forecast']
};

const inventoryRouter: InventoryRouter = {
  name: 'inventory',
  description: 'Inventory tools',
  tools: ['get_inventory']
};

const getWeather: GetWeatherTool = async ({ city }) => \`Weather in \${city}\`;
const getForecast: GetForecastTool = async ({ city }) => \`Forecast for \${city}\`;
const getInventory: GetInventoryTool = async ({ item }) => \`Inventory: \${item}\`;
`;

      const filePath = createTestFile('multi-routers.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse both router interfaces
      expect(result.routers).toHaveLength(2);
      const weatherRouter = result.routers.find(r => r.name === 'weather');
      const inventoryRouter = result.routers.find(r => r.name === 'inventory');

      expect(weatherRouter).toBeDefined();
      expect(weatherRouter!.interfaceName).toBe('WeatherRouter');
      expect(weatherRouter!.tools).toEqual(['get_weather', 'get_forecast']);

      expect(inventoryRouter).toBeDefined();
      expect(inventoryRouter!.interfaceName).toBe('InventoryRouter');
      expect(inventoryRouter!.tools).toEqual(['get_inventory']);

      // Should discover both const routers
      expect(result.discoveredRouters).toHaveLength(2);

      const discoveredWeather = result.discoveredRouters!.find(r => r.name === 'weatherRouter');
      expect(discoveredWeather).toBeDefined();
      expect(discoveredWeather!.interfaceName).toBe('WeatherRouter');
      expect(discoveredWeather!.kind).toBe('const');

      const discoveredInventory = result.discoveredRouters!.find(r => r.name === 'inventoryRouter');
      expect(discoveredInventory).toBeDefined();
      expect(discoveredInventory!.interfaceName).toBe('InventoryRouter');
      expect(discoveredInventory!.kind).toBe('const');

      // After linking, both should have constName
      expect(weatherRouter!.constName).toBe('weatherRouter');
      expect(inventoryRouter!.constName).toBe('inventoryRouter');
    });
  });

  describe('Router Linking', () => {
    it('should link discovered routers to parsed router interfaces', () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'linking-test-server',
  version: '1.0.0',
  description: 'Test router linking'
};

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message text';
}

interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo message';
  params: { message: MessageParam };
  result: string;
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
`;

      const filePath = createTestFile('router-linking.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Verify linkRoutersToInterfaces() worked correctly
      expect(result.routers).toHaveLength(1);
      expect(result.discoveredRouters).toHaveLength(1);

      // The parsed router should be linked to its const
      const parsedRouter = result.routers[0];
      expect(parsedRouter.constName).toBe('utilityRouter');

      // The discovered router should match
      const discoveredRouter = result.discoveredRouters![0];
      expect(discoveredRouter.name).toBe('utilityRouter');
      expect(discoveredRouter.interfaceName).toBe('UtilityRouter');
    });

    it('should properly set constName on ParsedRouter via linking', () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'constname-test-server',
  version: '1.0.0',
  description: 'Test constName field'
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
  description: 'Greeting tools';
  tools: ['greet'];
}

const greetingRouter: GreetingRouter = {
  name: 'greetings',
  description: 'Greeting tools',
  tools: ['greet']
};

const greet: GreetTool = async ({ name }) => \`Hello, \${name}!\`;
`;

      const filePath = createTestFile('constname-test.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify linking set constName
      expect(result.routers).toHaveLength(1);
      const router = result.routers[0];

      // constName should match the discovered const variable name
      expect(router.constName).toBe('greetingRouter');

      // Interface name should be from the interface declaration
      expect(router.interfaceName).toBe('GreetingRouter');

      // Router name should be from the interface metadata
      expect(router.name).toBe('greetings');
    });
  });

  describe('Backward Compatibility', () => {
    it('should still support class-based routers (no regression)', () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'class-router-server',
  version: '1.0.0',
  description: 'Class-based router server'
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
  description: 'Greeting tools';
  tools: ['greet'];
}

class RouterServer {
  greetingRouter!: GreetingRouter;

  greet: GreetTool = async ({ name }) => \`Hello, \${name}!\`;
}

const routerServer = new RouterServer();
`;

      const filePath = createTestFile('class-router.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse router interface
      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].interfaceName).toBe('GreetingRouter');

      // Should discover router property in class
      expect(result.routerProperties).toHaveLength(1);
      expect(result.routerProperties![0].propertyName).toBe('greetingRouter');
      expect(result.routerProperties![0].interfaceName).toBe('GreetingRouter');
      expect(result.routerProperties![0].className).toBe('RouterServer');

      // Router should have propertyName set (not constName)
      expect(result.routers[0].propertyName).toBe('greetingRouter');
      expect(result.routers[0].constName).toBeUndefined();

      // Should NOT discover const router (since it's a class property)
      expect(result.discoveredRouters).toHaveLength(0);
    });

    it('should support mixed const and class routers in same server', () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'mixed-router-server',
  version: '1.0.0',
  description: 'Mixed router patterns'
};

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message';
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

// Const-based router
const utilityRouter: UtilityRouter = {
  name: 'utility',
  description: 'Utility tools (const)',
  tools: ['echo']
};

// Class-based router
class MixedServer {
  greetingRouter!: GreetingRouter;

  greet: GreetTool = async ({ name }) => \`Hello, \${name}!\`;
}

const echo: EchoTool = async ({ message }) => message;
const mixedServer = new MixedServer();
`;

      const filePath = createTestFile('mixed-routers.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse both routers
      expect(result.routers).toHaveLength(2);

      const utilityRouter = result.routers.find(r => r.name === 'utility');
      const greetingRouter = result.routers.find(r => r.name === 'greetings');

      expect(utilityRouter).toBeDefined();
      expect(greetingRouter).toBeDefined();

      // Const router should have constName
      expect(utilityRouter!.constName).toBe('utilityRouter');
      expect(utilityRouter!.propertyName).toBeUndefined();

      // Class router should have propertyName
      expect(greetingRouter!.propertyName).toBe('greetingRouter');
      expect(greetingRouter!.constName).toBeUndefined();

      // Should discover one const router
      expect(result.discoveredRouters).toHaveLength(1);
      expect(result.discoveredRouters![0].name).toBe('utilityRouter');

      // Should discover one class router property
      expect(result.routerProperties).toHaveLength(1);
      expect(result.routerProperties![0].propertyName).toBe('greetingRouter');
    });
  });

  describe('Edge Cases', () => {
    it('should handle router with mismatched const name and interface name', () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'mismatch-server',
  version: '1.0.0',
  description: 'Test mismatched names'
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

interface UtilityRouter extends IToolRouter {
  name: 'utility';
  description: 'Utility tools';
  tools: ['echo'];
}

// Const name differs from interface name
const mainUtilityRouter: UtilityRouter = {
  name: 'utility',
  description: 'Utility tools',
  tools: ['echo']
};

const echo: EchoTool = async ({ message }) => message;
`;

      const filePath = createTestFile('mismatch-names.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should still link correctly
      expect(result.routers).toHaveLength(1);
      expect(result.discoveredRouters).toHaveLength(1);

      // Const name should be the actual variable name
      expect(result.routers[0].constName).toBe('mainUtilityRouter');
      expect(result.discoveredRouters![0].name).toBe('mainUtilityRouter');

      // Interface name should be from interface declaration
      expect(result.routers[0].interfaceName).toBe('UtilityRouter');
      expect(result.discoveredRouters![0].interfaceName).toBe('UtilityRouter');
    });

    it('should handle router with no tools array', () => {
      const content = `
import type { IServer, IToolRouter } from '../../../src/index.js';

const server: IServer = {
  name: 'empty-router-server',
  version: '1.0.0',
  description: 'Empty router test'
};

interface EmptyRouter extends IToolRouter {
  name: 'empty';
  description: 'Empty router';
  tools: [];
}

const emptyRouter: EmptyRouter = {
  name: 'empty',
  description: 'Empty router',
  tools: []
};
`;

      const filePath = createTestFile('empty-router.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should parse without errors
      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].tools).toEqual([]);
      expect(result.routers[0].constName).toBe('emptyRouter');
      expect(result.discoveredRouters).toHaveLength(1);
    });

    it('should not discover const with non-router interface type', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'non-router-server',
  version: '1.0.0',
  description: 'Non-router const test'
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

// This is a tool, not a router - should not be discovered as router
const echo: EchoTool = async ({ message }) => message;
`;

      const filePath = createTestFile('non-router.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should NOT discover any routers
      expect(result.routers).toHaveLength(0);
      expect(result.discoveredRouters).toHaveLength(0);

      // Should discover tool implementation instead
      expect(result.implementations).toHaveLength(1);
      expect(result.implementations![0].name).toBe('echo');
    });
  });

  describe('Router Metadata', () => {
    it('should preserve router metadata fields', () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'metadata-server',
  version: '1.0.0',
  description: 'Test router metadata'
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
  description: 'Greeting tools with metadata';
  tools: ['greet'];
  metadata: {
    category: 'social';
    tags: ['greeting', 'friendly'];
    order: 1;
    version: '2.0.0';
  };
}

const greetingRouter: GreetingRouter = {
  name: 'greetings',
  description: 'Greeting tools with metadata',
  tools: ['greet'],
  metadata: {
    category: 'social',
    tags: ['greeting', 'friendly'],
    order: 1,
    version: '2.0.0'
  }
};

const greet: GreetTool = async ({ name }) => \`Hello, \${name}!\`;
`;

      const filePath = createTestFile('router-metadata.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should parse without errors
      expect(result.validationErrors).toEqual([]);

      // Should parse router with metadata
      expect(result.routers).toHaveLength(1);
      const router = result.routers[0];

      expect(router.metadata).toBeDefined();
      expect(router.metadata!.category).toBe('social');
      expect(router.metadata!.tags).toEqual(['greeting', 'friendly']);
      expect(router.metadata!.order).toBe(1);
      expect(router.metadata!.version).toBe('2.0.0');

      // Should still link correctly
      expect(router.constName).toBe('greetingRouter');
    });
  });
});
