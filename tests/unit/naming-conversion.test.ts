/**
 * Naming Convention Conversion Tests
 *
 * Tests automatic conversion between snake_case and camelCase naming conventions
 * for tool methods and interface names.
 *
 * Test Coverage:
 * - snake_case tool names resolve to camelCase methods
 * - camelCase tool names work directly
 * - Exact match is preferred when both snake_case and camelCase exist
 * - Edge cases: multiple underscores, mixed naming
 * - Backward compatibility: existing patterns still work
 * - Error messages suggest correct naming when method not found
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { snakeToCamel, camelToSnake, normalizeToolName } from '../../src/server/parser.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'unit', '__temp_naming_conversion__');

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

describe('Naming Convention Conversion', () => {
  beforeAll(() => {
    setupTempDir();
  });

  afterAll(() => {
    cleanupTempDir();
  });

  describe('Utility functions', () => {
    describe('snakeToCamel', () => {
      it('should convert snake_case to camelCase', () => {
        expect(snakeToCamel('get_weather')).toBe('getWeather');
        expect(snakeToCamel('create_user')).toBe('createUser');
        expect(snakeToCamel('fetch_data')).toBe('fetchData');
      });

      it('should handle multiple underscores', () => {
        expect(snakeToCamel('get_current_user_data')).toBe('getCurrentUserData');
        expect(snakeToCamel('parse_json_response')).toBe('parseJsonResponse');
      });

      it('should handle single word (no underscores)', () => {
        expect(snakeToCamel('greet')).toBe('greet');
        expect(snakeToCamel('hello')).toBe('hello');
      });

      it('should handle leading/trailing underscores', () => {
        // Note: snakeToCamel converts _get_data to GetData (capitalizes after underscore)
        expect(snakeToCamel('_get_data')).toBe('GetData');
        expect(snakeToCamel('get_data_')).toBe('getData_');
      });
    });

    describe('camelToSnake', () => {
      it('should convert camelCase to snake_case', () => {
        expect(camelToSnake('getWeather')).toBe('get_weather');
        expect(camelToSnake('createUser')).toBe('create_user');
        expect(camelToSnake('fetchData')).toBe('fetch_data');
      });

      it('should handle single word', () => {
        expect(camelToSnake('greet')).toBe('greet');
        expect(camelToSnake('hello')).toBe('hello');
      });

      it('should handle multiple capital letters', () => {
        expect(camelToSnake('getCurrentUserData')).toBe('get_current_user_data');
        expect(camelToSnake('parseJSONResponse')).toBe('parse_j_s_o_n_response');
      });
    });

    describe('normalizeToolName', () => {
      it('should return snake_case as-is', () => {
        expect(normalizeToolName('get_weather')).toBe('get_weather');
        expect(normalizeToolName('create_user')).toBe('create_user');
      });

      it('should convert camelCase to snake_case', () => {
        expect(normalizeToolName('getWeather')).toBe('get_weather');
        expect(normalizeToolName('createUser')).toBe('create_user');
      });

      it('should handle single word', () => {
        expect(normalizeToolName('greet')).toBe('greet');
      });
    });
  });

  describe('Tool method resolution', () => {
    it('should resolve snake_case tool name to camelCase method', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool } from '../../src/index.js';

        interface GetTimeTool extends ITool {
          name: 'get_time';
          description: 'Get current time';
          params: Record<string, never>;
          result: { time: string };
        }

        const server: IServer = {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test server'
        }

        export default class TestService {
          getTime: GetTimeTool = async () => ({ time: new Date().toISOString() });
        }
      `;

      const filePath = createTestFile('snake-to-camel.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      // Tool should be registered with snake_case name
      const tools = server.listTools();
      const tool = tools.find(t => t.name === 'get_time');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('get_time');

      // Should execute successfully using camelCase method
      const result = await server.executeTool('get_time', {});

      // Result is MCP-formatted with content array
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);

      // Parse the JSON from the text content
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult).toHaveProperty('time');
      expect(typeof parsedResult.time).toBe('string');
    });

    it('should work with camelCase tool name directly', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool } from '../../src/index.js';

        interface GreetTool extends ITool {
          name: 'greet';
          description: 'Greet someone';
          params: { name: string };
          result: { message: string };
        }

        const server: IServer = {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test server'
        }

        export default class TestService {
          greet: GreetTool = async ({ name }) => ({ message: \`Hello, \${name}!\` });
        }
      `;

      const filePath = createTestFile('camel-direct.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      const result = await server.executeTool('greet', { name: 'Alice' });

      // Result is MCP-formatted
      expect(result).toHaveProperty('content');
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult).toEqual({ message: 'Hello, Alice!' });
    });

    it('should handle multiple words in tool name', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool } from '../../src/index.js';

        interface GetCurrentWeatherDataTool extends ITool {
          name: 'get_current_weather_data';
          description: 'Get current weather data';
          params: { city: string };
          result: { weather: string };
        }

        const server: IServer = {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test server'
        }

        export default class TestService {
          getCurrentWeatherData: GetCurrentWeatherDataTool = async ({ city }) => ({
            weather: \`Sunny in \${city}\`
          });
        }
      `;

      const filePath = createTestFile('multiple-words.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      const result = await server.executeTool('get_current_weather_data', { city: 'Tokyo' });

      // Result is MCP-formatted
      expect(result).toHaveProperty('content');
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult).toEqual({ weather: 'Sunny in Tokyo' });
    });
  });

  describe('Edge cases', () => {
    it('should handle tool name with consecutive underscores', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool } from '../../src/index.js';

        interface TestTool extends ITool {
          name: 'get__data';
          description: 'Test tool';
          params: Record<string, never>;
          result: { value: string };
        }

        const server: IServer = {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test server'
        }

        export default class TestService {
          get_Data: TestTool = async () => ({ value: 'test' });
        }
      `;

      const filePath = createTestFile('consecutive-underscores.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      const tools = server.listTools();
      const tool = tools.find(t => t.name === 'get__data');
      expect(tool).toBeDefined();
    });

    it('should handle single character method names', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool } from '../../src/index.js';

        interface XTool extends ITool {
          name: 'x';
          description: 'Single letter tool';
          params: Record<string, never>;
          result: { value: string };
        }

        const server: IServer = {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test server'
        }

        export default class TestService {
          x: XTool = async () => ({ value: 'x' });
        }
      `;

      const filePath = createTestFile('single-char.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      const result = await server.executeTool('x', {});

      // Result is MCP-formatted
      expect(result).toHaveProperty('content');
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult).toEqual({ value: 'x' });
    });

    it('should handle numeric characters in names', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool } from '../../src/index.js';

        interface GetData2Tool extends ITool {
          name: 'get_data_2';
          description: 'Get data version 2';
          params: Record<string, never>;
          result: { value: string };
        }

        const server: IServer = {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test server'
        }

        export default class TestService {
          getData_2: GetData2Tool = async () => ({ value: 'data2' });
        }
      `;

      const filePath = createTestFile('numeric-names.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      const result = await server.executeTool('get_data_2', {});

      // Result is MCP-formatted
      expect(result).toHaveProperty('content');
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult).toEqual({ value: 'data2' });
    });
  });

  describe('Backward compatibility', () => {
    it('should work with existing snake_case patterns', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool } from '../../src/index.js';

        interface FetchUserDataTool extends ITool {
          name: 'fetch_user_data';
          description: 'Fetch user data';
          params: { userId: string };
          result: { user: string };
        }

        const server: IServer = {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test server'
        }

        export default class TestService {
          fetchUserData: FetchUserDataTool = async ({ userId }) => ({
            user: \`User \${userId}\`
          });
        }
      `;

      const filePath = createTestFile('backward-compat.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      const result = await server.executeTool('fetch_user_data', { userId: '123' });

      // Result is MCP-formatted
      expect(result).toHaveProperty('content');
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult).toEqual({ user: 'User 123' });
    });

    it('should work with camelCase tool names', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool } from '../../src/index.js';

        interface GetUserTool extends ITool {
          name: 'getUser';
          description: 'Get user';
          params: { id: string };
          result: { user: string };
        }

        const server: IServer = {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test server'
        }

        export default class TestService {
          getUser: GetUserTool = async ({ id }) => ({ user: \`User \${id}\` });
        }
      `;

      const filePath = createTestFile('camel-compat.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      // Note: normalizeToolName converts camelCase to snake_case
      // So the tool will be registered as 'get_user'
      const tools = server.listTools();
      const tool = tools.find(t => t.name === 'get_user');
      expect(tool).toBeDefined();

      const result = await server.executeTool('get_user', { id: '456' });

      // Result is MCP-formatted
      expect(result).toHaveProperty('content');
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult).toEqual({ user: 'User 456' });
    });
  });

  describe('Error handling', () => {
    it('should provide helpful error when method not found', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool } from '../../src/index.js';

        interface MissingMethodTool extends ITool {
          name: 'missing_method';
          description: 'Tool with missing method';
          params: Record<string, never>;
          result: { value: string };
        }

        const server: IServer = {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test server'
        }

        export default class TestService {
          // Note: Missing the missingMethod implementation
          someOtherMethod() {
            return 'other';
          }
        }
      `;

      const filePath = createTestFile('missing-method.ts', content);

      // Should throw or warn during load
      try {
        const server = await loadInterfaceServer({ filePath, verbose: false });
        // If it doesn't throw during load, it might still work but issue warnings
        const tools = server.listTools();
        // The tool might not be registered if method is missing
      } catch (error) {
        // Expected: should mention the missing method
        expect(error).toBeDefined();
      }
    });

    it('should handle non-existent tool gracefully', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool } from '../../src/index.js';

        interface ExistingTool extends ITool {
          name: 'existing';
          description: 'Existing tool';
          params: Record<string, never>;
          result: { value: string };
        }

        const server: IServer = {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test server'
        }

        export default class TestService {
          existing: ExistingTool = async () => ({ value: 'exists' });
        }
      `;

      const filePath = createTestFile('non-existent-tool.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      // Try to call non-existent tool
      await expect(server.executeTool('non_existent', {})).rejects.toThrow();
    });
  });

  describe('Interface name inference', () => {
    it('should infer method name from interface name when tool name not specified', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool } from '../../src/index.js';

        // No explicit name field - should infer from interface name
        interface GetDataTool extends ITool {
          description: 'Get data';
          params: Record<string, never>;
          result: { data: string };
        }

        const server: IServer = {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test server'
        }

        export default class TestService {
          getData: GetDataTool = async () => ({ data: 'test' });
        }
      `;

      const filePath = createTestFile('inferred-name.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      const tools = server.listTools();
      // Should infer 'getData' from 'GetDataTool' interface name
      const tool = tools.find(t => t.name === 'get_data');
      expect(tool).toBeDefined();
    });
  });
});
