/**
 * Integration Tests for Bare Interface Detection
 *
 * Tests full compilation of TypeScript server files using
 * mixed bare interface and ToolHelper patterns.
 */

import { describe, it, expect } from '@jest/globals';
import * as ts from 'typescript';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseInterfaceFile } from '../../parser.js';
import { linkImplementationsToInterfaces } from '../discovery.js';
import { validateImplementations } from '../validation-compiler.js';

/**
 * Helper to parse TypeScript code by creating a temp file
 */
function parseCode(code: string) {
  // Create temp directory
  const tempDir = mkdtempSync(join(tmpdir(), 'simply-mcp-test-'));
  const tempFile = join(tempDir, 'test.ts');

  try {
    // Write code to temp file
    writeFileSync(tempFile, code, 'utf-8');

    // Parse the file
    return parseInterfaceFile(tempFile);
  } finally {
    // Clean up
    try {
      unlinkSync(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

describe('Bare Interface Integration Tests', () => {
  describe('Test 14: Full Server Compilation - Bare Interface Only', () => {
    it('should successfully compile server using only bare interfaces', () => {
      const code = `
        import type { IServer, ITool, IPrompt, IResource } from 'simply-mcp';

        interface GreetTool extends ITool {
          name: 'greet';
          description: 'Greet the user';
          params: {};
          result: string;
        }

        interface WelcomePrompt extends IPrompt {
          name: 'welcome';
          description: 'Welcome prompt';
          args: {};
        }

        interface UsersResource extends IResource {
          uri: 'users://list';
          name: 'users';
          description: 'User list';
          mimeType: 'application/json';
        }

        interface MyServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          description: 'Test server';
        }

        const server: IServer = {} as MyServer;

        const greet: GreetTool = async (params) => {
          return "Hello!";
        };

        const welcome: WelcomePrompt = async (args) => {
          return { messages: [] };
        };

        const users: UsersResource = async () => {
          return { contents: [] };
        };
      `;

      const result = parseCode(code);

      // Check that all interfaces were discovered
      expect(result.tools).toHaveLength(1);
      expect(result.prompts).toHaveLength(1);
      expect(result.resources).toHaveLength(1);

      // Check that all implementations were discovered
      expect(result.implementations).toBeDefined();
      expect(result.implementations).toHaveLength(3);

      // Check that all implementations are marked as bare interfaces
      const greetImpl = result.implementations!.find(i => i.name === 'greet');
      expect(greetImpl?.isBareInterface).toBe(true);

      const welcomeImpl = result.implementations!.find(i => i.name === 'welcome');
      expect(welcomeImpl?.isBareInterface).toBe(true);

      const usersImpl = result.implementations!.find(i => i.name === 'users');
      expect(usersImpl?.isBareInterface).toBe(true);

      // Link and validate
      linkImplementationsToInterfaces(result);
      validateImplementations(result);

      // Should have no validation errors (or empty array)
      expect(result.validationErrors).toEqual([]);
    });
  });

  describe('Test 15: Full Server Compilation - ToolHelper Only', () => {
    it('should successfully compile server using only ToolHelper wrappers', () => {
      const code = `
        import type { IServer, ITool, IPrompt, IResource, ToolHelper, PromptHelper, ResourceHelper } from 'simply-mcp';

        interface GreetTool extends ITool {
          name: 'greet';
          description: 'Greet the user';
          params: {};
          result: string;
        }

        interface WelcomePrompt extends IPrompt {
          name: 'welcome';
          description: 'Welcome prompt';
          args: {};
        }

        interface UsersResource extends IResource {
          uri: 'users://list';
          name: 'users';
          description: 'User list';
          mimeType: 'application/json';
        }

        interface MyServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          description: 'Test server';
        }

        const server: IServer = {} as MyServer;

        const greet: ToolHelper<GreetTool> = async (params) => {
          return "Hello!";
        };

        const welcome: PromptHelper<WelcomePrompt> = async (args) => {
          return { messages: [] };
        };

        const users: ResourceHelper<UsersResource> = async () => {
          return { contents: [] };
        };
      `;

      const result = parseCode(code);

      // Check implementations
      expect(result.implementations).toHaveLength(3);

      // Check that none are marked as bare interfaces
      result.implementations!.forEach(impl => {
        expect(impl.isBareInterface).toBeUndefined();
      });

      // Link and validate
      linkImplementationsToInterfaces(result);
      validateImplementations(result);

      // Should have no validation errors (or empty array)
      expect(result.validationErrors).toEqual([]);
    });
  });

  describe('Test 16: Full Server Compilation - Mixed Patterns', () => {
    it('should successfully compile server using mixed bare and ToolHelper patterns', () => {
      const code = `
        import type { IServer, ITool, IPrompt, IResource, ToolHelper, ResourceHelper } from 'simply-mcp';

        interface AddTool extends ITool {
          name: 'add';
          description: 'Add numbers';
          params: {};
          result: number;
        }

        interface SubtractTool extends ITool {
          name: 'subtract';
          description: 'Subtract numbers';
          params: {};
          result: number;
        }

        interface GreetingPrompt extends IPrompt {
          name: 'greeting';
          description: 'Greeting';
          args: {};
        }

        interface StatsResource extends IResource {
          uri: 'stats://data';
          name: 'stats';
          description: 'Statistics';
          mimeType: 'application/json';
        }

        interface MyServer extends IServer {
          name: 'mixed-server';
          version: '1.0.0';
          description: 'Server with mixed patterns';
        }

        const server: IServer = {} as MyServer;

        // Bare interface pattern
        const add: AddTool = async (params) => {
          return 42;
        };

        // ToolHelper pattern
        const subtract: ToolHelper<SubtractTool> = async (params) => {
          return 42;
        };

        // Bare interface pattern
        const greeting: GreetingPrompt = async (args) => {
          return { messages: [] };
        };

        // ResourceHelper pattern
        const stats: ResourceHelper<StatsResource> = async () => {
          return { contents: [] };
        };
      `;

      const result = parseCode(code);

      // Check all interfaces discovered
      expect(result.tools).toHaveLength(2);
      expect(result.prompts).toHaveLength(1);
      expect(result.resources).toHaveLength(1);

      // Check all implementations discovered
      expect(result.implementations).toHaveLength(4);

      // Check bare interface flags
      const addImpl = result.implementations!.find(i => i.name === 'add');
      expect(addImpl?.isBareInterface).toBe(true);

      const subtractImpl = result.implementations!.find(i => i.name === 'subtract');
      expect(subtractImpl?.isBareInterface).toBeUndefined();

      const greetingImpl = result.implementations!.find(i => i.name === 'greeting');
      expect(greetingImpl?.isBareInterface).toBe(true);

      const statsImpl = result.implementations!.find(i => i.name === 'stats');
      expect(statsImpl?.isBareInterface).toBeUndefined();

      // Link and validate
      linkImplementationsToInterfaces(result);
      validateImplementations(result);

      // Should have no validation errors (or empty array)
      expect(result.validationErrors).toEqual([]);
    });
  });

  describe('Test 17: Class-Based Server with Mixed Patterns', () => {
    it('should compile class-based server with bare and ToolHelper patterns', () => {
      const code = `
        import type { IServer, ITool, IPrompt, ToolHelper } from 'simply-mcp';

        interface CalculateTool extends ITool {
          name: 'calculate';
          description: 'Calculate';
          params: {};
          result: number;
        }

        interface ProcessTool extends ITool {
          name: 'process';
          description: 'Process';
          params: {};
          result: string;
        }

        interface InfoPrompt extends IPrompt {
          name: 'info';
          description: 'Info';
          args: {};
        }

        interface MyServer extends IServer {
          name: 'class-server';
          version: '1.0.0';
          description: 'Class-based server';
        }

        const server: IServer = {} as MyServer;

        class ServerClass {
          calculate: CalculateTool = async (params) => {
            return 42;
          };

          process: ToolHelper<ProcessTool> = async (params) => {
            return "processed";
          };

          info: InfoPrompt = async (args) => {
            return { messages: [] };
          };
        }

        const serverInstance = new ServerClass();
      `;

      const result = parseCode(code);

      // Check implementations
      expect(result.implementations).toHaveLength(3);

      // Check flags
      const calcImpl = result.implementations!.find(i => i.name === 'calculate');
      expect(calcImpl?.isBareInterface).toBe(true);
      expect(calcImpl?.kind).toBe('class-property');

      const processImpl = result.implementations!.find(i => i.name === 'process');
      expect(processImpl?.isBareInterface).toBeUndefined();
      expect(processImpl?.kind).toBe('class-property');

      const infoImpl = result.implementations!.find(i => i.name === 'info');
      expect(infoImpl?.isBareInterface).toBe(true);
      expect(infoImpl?.kind).toBe('class-property');

      // Check instance
      expect(result.instances).toHaveLength(1);
      expect(result.instances![0].className).toBe('ServerClass');

      // Link and validate
      linkImplementationsToInterfaces(result);
      validateImplementations(result);

      // Should have no validation errors (or empty array)
      expect(result.validationErrors).toEqual([]);
    });
  });

  describe('Test 18: Validation Failures', () => {
    it('should fail validation when bare interface is defined but not implemented', () => {
      const code = `
        import type { IServer, ITool } from 'simply-mcp';

        interface GreetTool extends ITool {
          name: 'greet';
          description: 'Greet';
          params: {};
          result: string;
        }

        interface MyServer extends IServer {
          name: 'incomplete-server';
          version: '1.0.0';
          description: 'Incomplete';
        }

        const server: IServer = {} as MyServer;

        // Missing implementation for GreetTool
      `;

      const result = parseCode(code);

      linkImplementationsToInterfaces(result);
      validateImplementations(result);

      // Should have validation error
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors!.length).toBeGreaterThan(0);

      const error = result.validationErrors![0];
      expect(error).toContain('GreetTool');
      expect(error).toContain('defined but not implemented');
    });

    it('should fail validation when implementation references non-existent interface', () => {
      const code = `
        import type { IServer } from 'simply-mcp';

        interface MyServer extends IServer {
          name: 'bad-server';
          version: '1.0.0';
          description: 'Bad';
        }

        const server: IServer = {} as MyServer;

        // Implementation without interface
        const mystery: MysteryTool = async () => {
          return "?";
        };
      `;

      const result = parseCode(code);

      linkImplementationsToInterfaces(result);
      validateImplementations(result);

      // Should have validation error
      expect(result.validationErrors).toBeDefined();

      const error = result.validationErrors!.find(e => e.includes('MysteryTool'));
      expect(error).toBeDefined();
      expect(error).toContain('references unknown tool interface');
    });
  });

  describe('Test 19: Edge Cases', () => {
    it('should handle empty server (no tools/prompts/resources)', () => {
      const code = `
        import type { IServer } from 'simply-mcp';

        interface MyServer extends IServer {
          name: 'empty-server';
          version: '1.0.0';
          description: 'Empty';
        }

        const server: IServer = {} as MyServer;
      `;

      const result = parseCode(code);

      expect(result.tools).toHaveLength(0);
      expect(result.prompts).toHaveLength(0);
      expect(result.resources).toHaveLength(0);
      expect(result.implementations).toHaveLength(0);

      linkImplementationsToInterfaces(result);
      validateImplementations(result);

      // No errors (empty array)
      expect(result.validationErrors).toEqual([]);
    });

    it('should handle multiple implementations of same interface (duplicate)', () => {
      const code = `
        import type { IServer, ITool } from 'simply-mcp';

        interface GreetTool extends ITool {
          name: 'greet';
          description: 'Greet';
          params: {};
          result: string;
        }

        interface MyServer extends IServer {
          name: 'dup-server';
          version: '1.0.0';
          description: 'Duplicate';
        }

        const server: IServer = {} as MyServer;

        const greet: GreetTool = async () => "Hello";
        const greet2: GreetTool = async () => "Hi";
      `;

      const result = parseCode(code);

      expect(result.implementations).toHaveLength(2);

      // Both should be marked as bare interface
      result.implementations!.forEach(impl => {
        expect(impl.interfaceName).toBe('GreetTool');
        expect(impl.isBareInterface).toBe(true);
      });

      // Validation should pass (first match wins)
      linkImplementationsToInterfaces(result);
      validateImplementations(result);

      expect(result.validationErrors).toEqual([]);
    });
  });

  describe('Test 20: All Three Types in One Server', () => {
    it('should handle server with all three types using bare interfaces', () => {
      const code = `
        import type { IServer, ITool, IPrompt, IResource } from 'simply-mcp';

        interface MathTool extends ITool {
          name: 'math';
          description: 'Math operation';
          params: {};
          result: number;
        }

        interface HelpPrompt extends IPrompt {
          name: 'help';
          description: 'Help prompt';
          args: {};
        }

        interface DataResource extends IResource {
          uri: 'data://values';
          name: 'data';
          description: 'Data resource';
          mimeType: 'application/json';
        }

        interface FullServer extends IServer {
          name: 'full-server';
          version: '1.0.0';
          description: 'Full server with all types';
        }

        const server: IServer = {} as FullServer;

        const math: MathTool = async (params) => {
          return 42;
        };

        const help: HelpPrompt = async (args) => {
          return { messages: [] };
        };

        const data: DataResource = async () => {
          return { contents: [] };
        };
      `;

      const result = parseCode(code);

      // All types discovered
      expect(result.tools).toHaveLength(1);
      expect(result.prompts).toHaveLength(1);
      expect(result.resources).toHaveLength(1);

      // All implementations discovered
      expect(result.implementations).toHaveLength(3);

      // Check each type
      const mathImpl = result.implementations!.find(i => i.name === 'math');
      expect(mathImpl?.helperType).toBe('ToolHelper');
      expect(mathImpl?.isBareInterface).toBe(true);

      const helpImpl = result.implementations!.find(i => i.name === 'help');
      expect(helpImpl?.helperType).toBe('PromptHelper');
      expect(helpImpl?.isBareInterface).toBe(true);

      const dataImpl = result.implementations!.find(i => i.name === 'data');
      expect(dataImpl?.helperType).toBe('ResourceHelper');
      expect(dataImpl?.isBareInterface).toBe(true);

      // Validation
      linkImplementationsToInterfaces(result);
      validateImplementations(result);

      expect(result.validationErrors).toEqual([]);
    });
  });
});
