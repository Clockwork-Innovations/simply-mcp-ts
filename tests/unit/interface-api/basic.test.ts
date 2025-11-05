/**
 * Foundation Layer Validation Test
 *
 * Tests basic functionality of the interface-driven API:
 * - Type definitions compile
 * - Parser discovers interfaces
 * - Name mapping works (snake_case -> camelCase)
 * - Can extract params/result types
 * - Basic tool registration works
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { parseInterfaceFile, snakeToCamel, type ParseResult } from '../../../src/server/parser.js';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

// Test fixture: minimal interface-driven server
const TEST_SERVER_CODE = `
import type { ITool, IServer } from '../../../src/index.js';

/**
 * Test server interface
 */
const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'A test server'
}

/**
 * Simple greeting tool
 */
interface GreetTool extends ITool {
  name: 'greet_user';
  description: 'Greet a user by name';
  params: { name: string; formal?: boolean };
  result: string;
}

/**
 * Add two numbers
 */
interface AddTool extends ITool {
  name: 'add_numbers';
  description: 'Add two numbers';
  params: { a: number; b: number };
  result: number;
}

/**
 * Test server implementation
 */
export default class TestServerImpl {
  greetUser: GreetTool = async (params) => {
    const greeting = params.formal ? 'Good day' : 'Hello';
    return \`\${greeting}, \${params.name}!\`;
  }

  addNumbers: AddTool = async (params) => {
    return params.a + params.b;
  }
}
`;

describe('Interface-Driven API - Foundation Layer', () => {
  let testFilePath: string;
  let parseResult: ParseResult;

  beforeAll(() => {
    // Create temporary test file
    testFilePath = resolve(process.cwd(), 'tests/unit/interface-api/__test-server.ts');
    writeFileSync(testFilePath, TEST_SERVER_CODE);

    // Parse the file once for all tests
    parseResult = parseInterfaceFile(testFilePath);
  });

  afterAll(() => {
    // Cleanup
    try {
      unlinkSync(testFilePath);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Name Mapping (snake_case -> camelCase)', () => {
    it('should convert greet_user to greetUser', () => {
      expect(snakeToCamel('greet_user')).toBe('greetUser');
    });

    it('should convert add_numbers to addNumbers', () => {
      expect(snakeToCamel('add_numbers')).toBe('addNumbers');
    });

    it('should convert get_weather_forecast to getWeatherForecast', () => {
      expect(snakeToCamel('get_weather_forecast')).toBe('getWeatherForecast');
    });

    it('should leave simple names unchanged', () => {
      expect(snakeToCamel('simple')).toBe('simple');
    });
  });

  describe('Parse Interface File', () => {
    it('should parse file successfully', () => {
      expect(parseResult).toBeDefined();
      expect(parseResult.server).toBeDefined();
      expect(parseResult.tools).toBeDefined();
    });
  });

  describe('Server Interface Discovery', () => {
    it('should discover server interface', () => {
      expect(parseResult.server).toBeDefined();
    });

    it('should extract server name', () => {
      expect(parseResult.server?.name).toBe('test-server');
    });

    it('should extract server version', () => {
      expect(parseResult.server?.version).toBe('1.0.0');
    });

    it('should extract server description', () => {
      expect(parseResult.server?.description).toBe('A test server');
    });
  });

  describe('Tool Interface Discovery', () => {
    it('should find exactly 2 tools', () => {
      expect(parseResult.tools).toHaveLength(2);
    });

    describe('greet_user tool', () => {
      let greetTool: any;

      beforeAll(() => {
        greetTool = parseResult.tools.find(t => t.name === 'greet_user');
      });

      it('should be discovered', () => {
        expect(greetTool).toBeDefined();
      });

      it('should have correct method name (camelCase)', () => {
        expect(greetTool?.methodName).toBe('greetUser');
      });

      it('should extract description', () => {
        expect(greetTool?.description).toBe('Greet a user by name');
      });

      it('should extract params type information', () => {
        const paramsType = greetTool?.paramsType || '';
        expect(paramsType).toContain('name');
        expect(paramsType).toContain('string');
        expect(paramsType).toContain('formal');
      });

      it('should extract result type', () => {
        expect(greetTool?.resultType).toBe('string');
      });
    });

    describe('add_numbers tool', () => {
      let addTool: any;

      beforeAll(() => {
        addTool = parseResult.tools.find(t => t.name === 'add_numbers');
      });

      it('should be discovered', () => {
        expect(addTool).toBeDefined();
      });

      it('should have correct method name (camelCase)', () => {
        expect(addTool?.methodName).toBe('addNumbers');
      });

      it('should extract description', () => {
        expect(addTool?.description).toBe('Add two numbers');
      });

      it('should extract params type information', () => {
        const paramsType = addTool?.paramsType || '';
        expect(paramsType).toContain('a');
        expect(paramsType).toContain('b');
        expect(paramsType).toContain('number');
      });

      it('should extract result type', () => {
        expect(addTool?.resultType).toBe('number');
      });
    });
  });
});
