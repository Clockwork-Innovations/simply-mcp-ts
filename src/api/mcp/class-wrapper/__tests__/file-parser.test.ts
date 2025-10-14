/**
 * Comprehensive tests for file parser
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { parseClassForWizard, generateSuggestedMetadata } from '../file-parser.js';
import { writeFileSync, unlinkSync, mkdtempSync, existsSync, rmdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('File Parser', () => {
  describe('generateSuggestedMetadata', () => {
    it('should convert PascalCase to kebab-case', () => {
      const result = generateSuggestedMetadata('WeatherService');
      expect(result.name).toBe('weather-service');
      expect(result.version).toBe('1.0.0');
      expect(result.description).toBe('WeatherService MCP server');
    });

    it('should handle single word class names', () => {
      const result = generateSuggestedMetadata('Calculator');
      expect(result.name).toBe('calculator');
      expect(result.version).toBe('1.0.0');
    });

    it('should handle acronyms', () => {
      const result = generateSuggestedMetadata('HTTPClient');
      expect(result.name).toBe('h-t-t-p-client');
    });

    it('should handle complex class names', () => {
      const result = generateSuggestedMetadata('MyAPIService');
      expect(result.name).toBe('my-a-p-i-service');
    });
  });

  describe('parseClassForWizard', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'mcp-test-'));
    });

    afterEach(() => {
      // Clean up temp files
      try {
        const files = readdirSync(tempDir);
        for (const file of files) {
          unlinkSync(join(tempDir, file));
        }
        rmdirSync(tempDir);
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    it('should parse a simple class with one method', async () => {
      const filePath = join(tempDir, 'simple.ts');
      const code = `
export class SimpleClass {
  greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
}
`;
      writeFileSync(filePath, code);

      const result = await parseClassForWizard(filePath);

      expect(result.className).toBe('SimpleClass');
      expect(result.isExported).toBe(true);
      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].name).toBe('greet');
      expect(result.methods[0].parameters).toHaveLength(1);
      expect(result.methods[0].parameters[0].name).toBe('name');
      expect(result.methods[0].parameters[0].type).toBe('string');
      expect(result.methods[0].parameters[0].optional).toBe(false);
      expect(result.methods[0].returnType).toBe('string');
    });

    it('should parse class with multiple methods', async () => {
      const filePath = join(tempDir, 'multi.ts');
      const code = `
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }
}
`;
      writeFileSync(filePath, code);

      const result = await parseClassForWizard(filePath);

      expect(result.className).toBe('Calculator');
      expect(result.methods).toHaveLength(3);
      expect(result.methods[0].name).toBe('add');
      expect(result.methods[1].name).toBe('subtract');
      expect(result.methods[2].name).toBe('multiply');
    });

    it('should parse class with optional parameters', async () => {
      const filePath = join(tempDir, 'optional.ts');
      const code = `
export class Service {
  fetch(url: string, timeout?: number): Promise<string> {
    return Promise.resolve('data');
  }
}
`;
      writeFileSync(filePath, code);

      const result = await parseClassForWizard(filePath);

      expect(result.methods[0].parameters).toHaveLength(2);
      expect(result.methods[0].parameters[0].optional).toBe(false);
      expect(result.methods[0].parameters[1].optional).toBe(true);
      expect(result.methods[0].parameters[1].name).toBe('timeout');
    });

    it('should parse class with default values', async () => {
      const filePath = join(tempDir, 'defaults.ts');
      const code = `
export class Config {
  setup(port: number = 3000, host: string = 'localhost'): void {
    console.log(port, host);
  }
}
`;
      writeFileSync(filePath, code);

      const result = await parseClassForWizard(filePath);

      expect(result.methods[0].parameters[0].hasDefault).toBe(true);
      expect(result.methods[0].parameters[0].defaultValue).toBe(3000);
      expect(result.methods[0].parameters[1].hasDefault).toBe(true);
      expect(result.methods[0].parameters[1].defaultValue).toBe('localhost');
    });

    it('should parse class with various types', async () => {
      const filePath = join(tempDir, 'types.ts');
      const code = `
export class TypeTest {
  stringMethod(s: string): void {}
  numberMethod(n: number): void {}
  booleanMethod(b: boolean): void {}
  arrayMethod(a: string[]): void {}
  objectMethod(o: object): void {}
  dateMethod(d: Date): void {}
}
`;
      writeFileSync(filePath, code);

      const result = await parseClassForWizard(filePath);

      expect(result.methods).toHaveLength(6);
      expect(result.methods[0].parameters[0].type).toBe('string');
      expect(result.methods[1].parameters[0].type).toBe('number');
      expect(result.methods[2].parameters[0].type).toBe('boolean');
      // Note: Arrays and objects may be parsed as 'array' or specific types
    });

    it('should extract JSDoc comments', async () => {
      const filePath = join(tempDir, 'jsdoc.ts');
      const code = `
export class Greeter {
  /**
   * Greet a person
   * @param name The person's name
   */
  greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
}
`;
      writeFileSync(filePath, code);

      const result = await parseClassForWizard(filePath);

      expect(result.methods[0].jsdoc).toBeDefined();
      expect(result.methods[0].jsdoc?.description).toContain('Greet a person');
      expect(result.methods[0].jsdoc?.params).toBeDefined();
    });

    it('should detect exported classes', async () => {
      const filePath1 = join(tempDir, 'exported.ts');
      const code1 = `
export class Exported {
  test(): void {}
}
`;
      writeFileSync(filePath1, code1);

      const result1 = await parseClassForWizard(filePath1);
      expect(result1.isExported).toBe(true);
      expect(result1.className).toBe('Exported');
    });

    it('should handle async methods', async () => {
      const filePath = join(tempDir, 'async.ts');
      const code = `
export class AsyncService {
  async fetchData(id: string): Promise<any> {
    return { id };
  }

  async processData(data: any): Promise<void> {
    console.log(data);
  }
}
`;
      writeFileSync(filePath, code);

      const result = await parseClassForWizard(filePath);

      expect(result.methods).toHaveLength(2);
      expect(result.methods[0].name).toBe('fetchData');
      expect(result.methods[1].name).toBe('processData');
    });

    it('should handle class with no public methods', async () => {
      const filePath = join(tempDir, 'nopublic.ts');
      const code = `
export class NoPublic {
  private privateMethod(): void {}
  protected protectedMethod(): void {}
}
`;
      writeFileSync(filePath, code);

      await expect(parseClassForWizard(filePath)).rejects.toThrow('No public methods');
    });

    it('should throw error for file not found', async () => {
      await expect(parseClassForWizard('/non/existent/file.ts')).rejects.toThrow('File not found');
    });

    it('should throw error for invalid TypeScript syntax', async () => {
      const filePath = join(tempDir, 'invalid.ts');
      const code = `
export class Invalid {
  broken method syntax here
}
`;
      writeFileSync(filePath, code);

      await expect(parseClassForWizard(filePath)).rejects.toThrow();
    });

    it('should throw error for no class in file', async () => {
      const filePath = join(tempDir, 'noclass.ts');
      const code = `
export function someFunction() {
  return 'not a class';
}
`;
      writeFileSync(filePath, code);

      await expect(parseClassForWizard(filePath)).rejects.toThrow();
    });

    it('should filter out private methods', async () => {
      const filePath = join(tempDir, 'privacy.ts');
      const code = `
export class Service {
  public publicMethod(): void {}
  private privateMethod(): void {}
  protected protectedMethod(): void {}
  _underscoreMethod(): void {}
}
`;
      writeFileSync(filePath, code);

      const result = await parseClassForWizard(filePath);

      expect(result.methods).toHaveLength(1);
      expect(result.methods[0].name).toBe('publicMethod');
    });

    it('should reject non-TypeScript files', async () => {
      const filePath = join(tempDir, 'test.js');
      writeFileSync(filePath, 'console.log("test");');

      await expect(parseClassForWizard(filePath)).rejects.toThrow('Not a TypeScript file');
    });

    it('should handle complex parameter types', async () => {
      const filePath = join(tempDir, 'complex.ts');
      const code = `
export class ComplexTypes {
  process(data: Record<string, any>): void {}
  handle(items: Array<{ id: number; name: string }>): void {}
}
`;
      writeFileSync(filePath, code);

      const result = await parseClassForWizard(filePath);

      expect(result.methods).toHaveLength(2);
      expect(result.methods[0].parameters).toHaveLength(1);
      expect(result.methods[1].parameters).toHaveLength(1);
    });
  });
});
