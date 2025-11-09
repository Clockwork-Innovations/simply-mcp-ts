/**
 * Router Parser Unit Tests
 * Tests the parseRouterInterface function's ability to extract router metadata from interfaces
 */

import { describe, it, expect } from '@jest/globals';
import { parseInterfaceFile } from '../../../src/server/parser.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'unit', 'parser', 'temp-router-tests');

// Setup and teardown
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

describe('Router Parser', () => {
  beforeEach(() => {
    setupTempDir();
  });

  afterEach(() => {
    cleanupTempDir();
  });

  describe('Basic Router Parsing', () => {
    it('should parse a simple router with basic configuration', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface WeatherRouter extends IToolRouter<'get_weather' | 'get_forecast'> {
          name: 'weather_router';
          description: 'Weather information tools';
          tools: ['get_weather', 'get_forecast'];
        }
      `;

      const filePath = createTestFile('simple-router.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(1);
      expect(result.routers[0]).toMatchObject({
        interfaceName: 'WeatherRouter',
        name: 'weather_router',
        description: 'Weather information tools',
        tools: ['get_weather', 'get_forecast'],
        propertyName: 'weatherRouter',
      });
    });

    it('should infer router name from interface name if not specified', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface WeatherRouter extends IToolRouter<'get_weather'> {
          description: 'Weather tools';
          tools: ['get_weather'];
        }
      `;

      const filePath = createTestFile('inferred-name.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].name).toBeUndefined(); // Name is optional, inferred at runtime
      expect(result.routers[0].propertyName).toBe('weatherRouter');
    });

    it('should parse router with metadata', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface ApiRouter extends IToolRouter<'call_api' | 'list_endpoints'> {
          name: 'api_router';
          description: 'API interaction tools';
          tools: ['call_api', 'list_endpoints'];
          metadata: {
            category: 'api';
            tags: ['rest', 'http'];
            order: 1;
          };
        }
      `;

      const filePath = createTestFile('router-with-metadata.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].metadata).toEqual({
        category: 'api',
        tags: ['rest', 'http'],
        order: 1,
      });
    });

    it('should parse router with custom metadata fields', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface CustomRouter extends IToolRouter<'tool1'> {
          description: 'Custom router';
          tools: ['tool1'];
          metadata: {
            category: 'custom';
            version: '2.0';
            enabled: true;
            priority: 5;
          };
        }
      `;

      const filePath = createTestFile('custom-metadata.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].metadata).toEqual({
        category: 'custom',
        version: '2.0',
        enabled: true,
        priority: 5,
      });
    });
  });

  describe('Multiple Routers', () => {
    it('should parse multiple routers in same file', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface WeatherRouter extends IToolRouter<'get_weather'> {
          name: 'weather_router';
          description: 'Weather tools';
          tools: ['get_weather'];
        }

        interface ApiRouter extends IToolRouter<'call_api'> {
          name: 'api_router';
          description: 'API tools';
          tools: ['call_api'];
        }
      `;

      const filePath = createTestFile('multiple-routers.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(2);
      expect(result.routers[0].name).toBe('weather_router');
      expect(result.routers[1].name).toBe('api_router');
    });

    it('should handle routers with overlapping tools', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface AdminRouter extends IToolRouter<'view_logs' | 'delete_user'> {
          description: 'Admin tools';
          tools: ['view_logs', 'delete_user'];
        }

        interface DeveloperRouter extends IToolRouter<'view_logs' | 'run_query'> {
          description: 'Developer tools';
          tools: ['view_logs', 'run_query'];
        }
      `;

      const filePath = createTestFile('overlapping-tools.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(2);
      expect(result.routers[0].tools).toContain('view_logs');
      expect(result.routers[1].tools).toContain('view_logs');
    });
  });

  describe('Error Cases', () => {
    it('should return null for router without description', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface InvalidRouter extends IToolRouter<'tool1'> {
          name: 'invalid_router';
          tools: ['tool1'];
        }
      `;

      const filePath = createTestFile('no-description.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(0);
    });

    it('should allow router with empty tools array (placeholder routers)', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface EmptyRouter extends IToolRouter {
          name: 'empty_router';
          description: 'Empty router';
          tools: [];
        }
      `;

      const filePath = createTestFile('empty-tools.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].name).toBe('empty_router');
      expect(result.routers[0].tools).toEqual([]);
    });

    it('should handle router without generic type parameter', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface GenericRouter extends IToolRouter {
          description: 'Generic router';
          tools: ['tool1', 'tool2'];
        }
      `;

      const filePath = createTestFile('no-generic.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].tools).toEqual(['tool1', 'tool2']);
    });
  });

  describe('Property Name Generation', () => {
    it('should generate camelCase property name from interface name', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface WeatherRouter extends IToolRouter<'tool1'> {
          description: 'Router';
          tools: ['tool1'];
        }

        interface APIRouter extends IToolRouter<'tool2'> {
          description: 'Router';
          tools: ['tool2'];
        }

        interface MyCustomRouter extends IToolRouter<'tool3'> {
          description: 'Router';
          tools: ['tool3'];
        }
      `;

      const filePath = createTestFile('property-names.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(3);
      expect(result.routers[0].propertyName).toBe('weatherRouter');
      expect(result.routers[1].propertyName).toBe('aPIRouter'); // Preserves original casing
      expect(result.routers[2].propertyName).toBe('myCustomRouter');
    });
  });

  describe('Tool Array Parsing', () => {
    it('should parse single tool', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface SingleToolRouter extends IToolRouter<'only_tool'> {
          description: 'Router with one tool';
          tools: ['only_tool'];
        }
      `;

      const filePath = createTestFile('single-tool.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].tools).toEqual(['only_tool']);
    });

    it('should parse many tools', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface ManyToolsRouter extends IToolRouter<'t1' | 't2' | 't3' | 't4' | 't5'> {
          description: 'Router with many tools';
          tools: ['t1', 't2', 't3', 't4', 't5'];
        }
      `;

      const filePath = createTestFile('many-tools.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].tools).toHaveLength(5);
      expect(result.routers[0].tools).toEqual(['t1', 't2', 't3', 't4', 't5']);
    });
  });

  describe('Metadata Parsing', () => {
    it('should handle missing metadata', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface NoMetadataRouter extends IToolRouter<'tool1'> {
          description: 'Router without metadata';
          tools: ['tool1'];
        }
      `;

      const filePath = createTestFile('no-metadata.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].metadata).toBeUndefined();
    });

    it('should handle empty metadata object', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface EmptyMetadataRouter extends IToolRouter<'tool1'> {
          description: 'Router with empty metadata';
          tools: ['tool1'];
          metadata: {};
        }
      `;

      const filePath = createTestFile('empty-metadata.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].metadata).toEqual({});
    });

    it('should parse partial metadata', () => {
      const content = `
        import type { IToolRouter } from 'simply-mcp';

        interface PartialMetadataRouter extends IToolRouter<'tool1'> {
          description: 'Router with partial metadata';
          tools: ['tool1'];
          metadata: {
            category: 'test';
          };
        }
      `;

      const filePath = createTestFile('partial-metadata.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.routers).toHaveLength(1);
      expect(result.routers[0].metadata).toEqual({
        category: 'test',
      });
    });
  });

  describe('Integration with Other Interfaces', () => {
    it('should parse routers alongside tools and server', () => {
      const content = `
        import type { IServer, ITool, IToolRouter } from 'simply-mcp';

        interface GetWeatherTool extends ITool {
          name: 'get_weather';
          description: 'Get weather';
          params: { location: string };
          result: { temperature: number };
        }

        interface WeatherRouter extends IToolRouter<'get_weather'> {
          name: 'weather_router';
          description: 'Weather tools';
          tools: ['get_weather'];
        }

        const server: IServer = {
  name: 'weather-service',
  version: '1.0.0',
  description: 'Weather service'
        }
      `;

      const filePath = createTestFile('full-server.ts', content);
      const result = parseInterfaceFile(filePath);

      expect(result.tools).toHaveLength(1);
      expect(result.routers).toHaveLength(1);
      expect(result.server).toBeDefined();
      expect(result.server?.name).toBe('weather-service');
    });
  });
});
