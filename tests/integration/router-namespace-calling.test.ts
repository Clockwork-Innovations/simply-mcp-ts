/**
 * Router Namespace Calling Verification
 *
 * CRITICAL TEST: Verifies that router-assigned tools:
 * 1. Are hidden from tools/list when flattenRouters: false
 * 2. Can STILL be called via namespace pattern (router__tool)
 *
 * This is essential for the router feature to work as documented.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'integration', 'temp-namespace-tests');

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

describe('Router Namespace Calling Verification', () => {
  beforeEach(() => {
    setupTempDir();
  });

  afterEach(() => {
    cleanupTempDir();
  });

  it('CRITICAL: should hide router tools from list BUT still allow calling via namespace', async () => {
    const content = `// @ts-nocheck
      import type { IServer, ITool, IToolRouter, IParam } from '../../src/index.js';

      interface LocationParam extends IParam {
        type: 'string';
        description: 'Location name';
      }

      interface GetWeatherTool extends ITool {
        name: 'get_weather';
        description: 'Get current weather';
        params: { location: LocationParam };
        result: { temperature: number; conditions: string };
      }

      interface GetForecastTool extends ITool {
        name: 'get_forecast';
        description: 'Get weather forecast';
        params: { location: LocationParam };
        result: { forecast: string };
      }

      interface UnrelatedTool extends ITool {
        name: 'unrelated_tool';
        description: 'Tool not in any router';
        params: Record<string, never>;
        result: { value: string };
      }

      interface WeatherRouter extends IToolRouter {
        name: 'weather_router';
        description: 'Weather information tools';
        tools: [GetWeatherTool, GetForecastTool];
      }

      const server: IServer = {
        name: 'namespace-test-server',
        version: '1.0.0',
        description: 'Namespace calling test server',
        flattenRouters: false  // CRITICAL: Hide router tools
      };

      export default class TestService {
        getWeather: GetWeatherTool = async (params) => {
          return {
            temperature: 72,
            conditions: \`Sunny in \${params.location}\`
          };
        };

        getForecast: GetForecastTool = async (params) => {
          return {
            forecast: \`5-day forecast for \${params.location}\`
          };
        };

        unrelatedTool: UnrelatedTool = async () => {
          return { value: 'unrelated' };
        };

        weatherRouter!: WeatherRouter;
      }
    `;

    const filePath = createTestFile('namespace-calling.ts', content);
    const server = await loadInterfaceServer({ filePath, verbose: false });

    // STEP 1: Verify tools are hidden from main list
    console.log('\n=== STEP 1: Checking tools/list ===');
    const tools = await server.listTools();
    const toolNames = tools.map(t => t.name);

    console.log('Tools in list:', toolNames);

    expect(toolNames).toContain('weather_router');
    expect(toolNames).toContain('unrelated_tool');
    expect(toolNames).not.toContain('get_weather');
    expect(toolNames).not.toContain('get_forecast');

    console.log('✓ Router tools are hidden from main list');

    // STEP 2: Call router to see available tools
    console.log('\n=== STEP 2: Calling weather_router ===');
    const routerResult = await server.executeTool('weather_router', {});
    console.log('Router result:', JSON.stringify(routerResult, null, 2));

    expect(routerResult).toBeDefined();
    expect(routerResult.content).toBeDefined();

    const textContent = routerResult.content.find((c: any) => c.type === 'text');
    expect(textContent).toBeDefined();
    if (textContent && textContent.type === 'text') {
      expect(textContent.text).toContain('get_weather');
      expect(textContent.text).toContain('get_forecast');
      console.log('✓ Router returns list of tools');
    }

    // STEP 3: CRITICAL - Call hidden tool via namespace
    console.log('\n=== STEP 3: Calling hidden tool via namespace ===');
    console.log('Attempting: weather_router__get_weather');

    const namespaceResult = await server.executeTool('weather_router__get_weather', {
      location: 'Seattle'
    });

    console.log('Namespace call result:', JSON.stringify(namespaceResult, null, 2));

    expect(namespaceResult).toBeDefined();
    expect(namespaceResult.content).toBeDefined();

    const namespaceTextContent = namespaceResult.content.find((c: any) => c.type === 'text');
    expect(namespaceTextContent).toBeDefined();
    if (namespaceTextContent && namespaceTextContent.type === 'text') {
      const resultText = namespaceTextContent.text;
      expect(resultText).toContain('72');
      expect(resultText).toContain('Sunny');
      expect(resultText).toContain('Seattle');
      console.log('✓ Hidden tool successfully called via namespace!');
    }

    // STEP 4: Verify second hidden tool also works
    console.log('\n=== STEP 4: Calling second hidden tool via namespace ===');
    console.log('Attempting: weather_router__get_forecast');

    const forecastResult = await server.executeTool('weather_router__get_forecast', {
      location: 'Portland'
    });

    console.log('Forecast result:', JSON.stringify(forecastResult, null, 2));

    expect(forecastResult).toBeDefined();
    const forecastTextContent = forecastResult.content.find((c: any) => c.type === 'text');
    expect(forecastTextContent).toBeDefined();
    if (forecastTextContent && forecastTextContent.type === 'text') {
      expect(forecastTextContent.text).toContain('5-day forecast');
      expect(forecastTextContent.text).toContain('Portland');
      console.log('✓ Second hidden tool also works via namespace!');
    }

    // STEP 5: Verify direct call ALSO works (hidden tools are still callable)
    console.log('\n=== STEP 5: Verifying direct call to hidden tool still works ===');
    console.log('Attempting: get_weather (without namespace)');

    const directResult = await server.executeTool('get_weather', { location: 'Denver' });

    expect(directResult).toBeDefined();
    const directTextContent = directResult.content.find((c: any) => c.type === 'text');
    expect(directTextContent).toBeDefined();
    if (directTextContent && directTextContent.type === 'text') {
      expect(directTextContent.text).toContain('72');
      expect(directTextContent.text).toContain('Denver');
      console.log('✓ Hidden tool is callable directly (correct behavior!)');
      console.log('  → Tools are hidden from list but remain fully callable');
    }
  });

  it('should allow calling tools both ways when flattenRouters: true', async () => {
    const content = `// @ts-nocheck
      import type { IServer, ITool, IToolRouter } from '../../src/index.js';

      interface TestTool extends ITool {
        name: 'test_tool';
        description: 'Test tool';
        params: Record<string, never>;
        result: { value: string };
      }

      interface TestRouter extends IToolRouter {
        name: 'test_router';
        description: 'Test router';
        tools: [TestTool];
      }

      const server: IServer = {
        name: 'flatten-true-server',
        version: '1.0.0',
        description: 'Flatten true server',
        flattenRouters: true  // Show all tools
      };

      export default class TestService {
        testTool: TestTool = async () => ({ value: 'success' });
        testRouter!: TestRouter;
      }
    `;

    const filePath = createTestFile('flatten-true-namespace.ts', content);
    const server = await loadInterfaceServer({ filePath, verbose: false });

    console.log('\n=== Testing flattenRouters: true ===');

    // Tools should be in list
    const tools = await server.listTools();
    const toolNames = tools.map(t => t.name);

    console.log('Tools in list:', toolNames);
    expect(toolNames).toContain('test_router');
    expect(toolNames).toContain('test_tool');
    console.log('✓ Both router and tool are in list');

    // Should be callable directly
    const directResult = await server.executeTool('test_tool', {});
    expect(directResult).toBeDefined();
    console.log('✓ Tool callable directly');

    // Should also be callable via namespace
    const namespaceResult = await server.executeTool('test_router__test_tool', {});
    expect(namespaceResult).toBeDefined();
    console.log('✓ Tool also callable via namespace');
  });
});
