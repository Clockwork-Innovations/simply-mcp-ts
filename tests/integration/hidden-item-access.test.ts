/**
 * Integration Tests: Execute/Read/Get Access to Hidden Items
 *
 * Tests that hidden items remain accessible via their direct access methods:
 * - Hidden tools can still be executed via tools/call (executeTool)
 * - Hidden resources can still be read via resources/read (readResource)
 * - Hidden prompts can still be accessed via prompts/get (getPrompt)
 *
 * This ensures progressive disclosure works correctly - items are hidden from
 * discovery but remain fully functional when accessed directly.
 */

import { describe, it, expect } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Hidden Item Access', () => {
  const testDir = join(tmpdir(), 'test-hidden-access-' + Date.now());

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  describe('Hidden Tool Execution', () => {
    it('should allow executing hidden tools via executeTool', async () => {
      const testFile = join(testDir, 'hidden-tool-execute.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'User name';
        }

        interface HiddenTool extends ITool {
          name: 'hidden_tool';
          description: 'A hidden but executable tool';
          params: { name: NameParam };
          result: { message: string };
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          hiddenTool: HiddenTool;
        }

        export const hiddenTool = async (params: { name: string }) => ({
          message: \`Hello from hidden tool, \${params.name}!\`
        });
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Verify it's not in the list
      const tools = await server.listTools();
      expect(tools.find(t => t.name === 'hidden_tool')).toBeUndefined();

      // But can still be executed
      const result = await server.executeTool('hidden_tool', { name: 'Alice' });
      expect(result).toEqual({ message: 'Hello from hidden tool, Alice!' });
    });

    it('should execute hidden tool with correct type validation', async () => {
      const testFile = join(testDir, 'hidden-tool-validation.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface AgeParam extends IParam {
          type: 'number';
          description: 'Age in years';
        }

        interface HiddenCalculator extends ITool {
          name: 'hidden_calc';
          description: 'Hidden calculator';
          params: { age: AgeParam };
          result: { years: number; months: number };
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          hiddenCalculator: HiddenCalculator;
        }

        export const hiddenCalculator = async (params: { age: number }) => ({
          years: params.age,
          months: params.age * 12
        });
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Execute with valid params
      const result = await server.executeTool('hidden_calc', { age: 25 });
      expect(result).toEqual({ years: 25, months: 300 });
    });

    it('should handle errors when executing non-existent hidden tools', async () => {
      const testFile = join(testDir, 'hidden-tool-not-found.ts');
      const code = `
        import type { IServer } from 'simply-mcp';

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Attempt to execute non-existent tool
      await expect(
        server.executeTool('non_existent_tool', {})
      ).rejects.toThrow();
    });
  });

  describe('Hidden Resource Reading', () => {
    it('should allow reading hidden resources via readResource', async () => {
      const testFile = join(testDir, 'hidden-resource-read.ts');
      const code = `
        import type { IResource, IServer } from 'simply-mcp';

        interface HiddenResource extends IResource {
          uri: 'secret://config';
          name: 'Secret Config';
          description: 'Hidden configuration';
          mimeType: 'application/json';
          value: { apiKey: 'secret-123', endpoint: 'https://api.example.com' };
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Verify it's not in the list
      const resources = await server.listResources();
      expect(resources.find(r => r.uri === 'secret://config')).toBeUndefined();

      // But can still be read
      const result = await server.readResource('secret://config');
      expect(result.contents[0].text).toContain('apiKey');
      expect(result.contents[0].text).toContain('secret-123');
    });

    it('should read hidden dynamic resources with correct data', async () => {
      const testFile = join(testDir, 'hidden-dynamic-resource.ts');
      const code = `
        import type { IResource, IServer, ResourceHelper } from 'simply-mcp';

        interface HiddenStats extends IResource {
          uri: 'stats://hidden';
          name: 'Hidden Stats';
          description: 'Hidden statistics';
          mimeType: 'application/json';
          returns: { count: number; timestamp: string };
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
        }

        export const resources = {
          'stats://hidden': (async () => ({
            count: 42,
            timestamp: '2024-01-01T00:00:00Z'
          })) as ResourceHelper<HiddenStats>
        };
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Not in list
      const resources = await server.listResources();
      expect(resources.find(r => r.uri === 'stats://hidden')).toBeUndefined();

      // But can be read
      const result = await server.readResource('stats://hidden');
      const data = JSON.parse(result.contents[0].text);
      expect(data.count).toBe(42);
      expect(data.timestamp).toBe('2024-01-01T00:00:00Z');
    });

    it('should handle errors when reading non-existent resources', async () => {
      const testFile = join(testDir, 'hidden-resource-not-found.ts');
      const code = `
        import type { IServer } from 'simply-mcp';

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Attempt to read non-existent resource
      await expect(
        server.readResource('non://existent')
      ).rejects.toThrow();
    });
  });

  describe('Hidden Prompt Access', () => {
    it('should allow accessing hidden prompts via getPrompt', async () => {
      const testFile = join(testDir, 'hidden-prompt-get.ts');
      const code = `
        import type { IPrompt, IServer } from 'simply-mcp';

        interface HiddenPrompt extends IPrompt {
          name: 'hidden_prompt';
          description: 'A hidden but accessible prompt';
          args: {
            topic: { description: 'Topic to discuss' };
          };
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          hiddenPrompt: HiddenPrompt;
        }

        export const hiddenPrompt = (args: { topic: string }) => {
          return \`Let's discuss \${args.topic} in detail.\`;
        };
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Verify it's not in the list
      const prompts = await server.listPrompts();
      expect(prompts.find(p => p.name === 'hidden_prompt')).toBeUndefined();

      // But can still be accessed
      const result = await server.getPrompt('hidden_prompt', { topic: 'AI' });
      expect(result.messages[0].content.text).toBe("Let's discuss AI in detail.");
    });

    it('should access hidden prompts with complex argument types', async () => {
      const testFile = join(testDir, 'hidden-prompt-complex.ts');
      const code = `
        import type { IPrompt, IServer } from 'simply-mcp';

        interface HiddenComplexPrompt extends IPrompt {
          name: 'hidden_complex';
          description: 'Hidden prompt with multiple args';
          args: {
            topic: { description: 'Topic' };
            style: { description: 'Style'; required: false };
            depth: { description: 'Depth level'; type: 'number' };
          };
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          hiddenComplexPrompt: HiddenComplexPrompt;
        }

        export const hiddenComplexPrompt = (args: { topic: string; style?: string; depth: number }) => {
          const style = args.style || 'casual';
          return \`Topic: \${args.topic}, Style: \${style}, Depth: \${args.depth}\`;
        };
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Access with full args
      const result1 = await server.getPrompt('hidden_complex', {
        topic: 'Testing',
        style: 'formal',
        depth: 3
      });
      expect(result1.messages[0].content.text).toBe('Topic: Testing, Style: formal, Depth: 3');

      // Access without optional arg
      const result2 = await server.getPrompt('hidden_complex', {
        topic: 'Testing',
        depth: 2
      });
      expect(result2.messages[0].content.text).toBe('Topic: Testing, Style: casual, Depth: 2');
    });

    it('should handle errors when accessing non-existent prompts', async () => {
      const testFile = join(testDir, 'hidden-prompt-not-found.ts');
      const code = `
        import type { IServer } from 'simply-mcp';

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Attempt to access non-existent prompt
      await expect(
        server.getPrompt('non_existent_prompt', {})
      ).rejects.toThrow();
    });
  });

  describe('Mixed Hidden and Visible Items', () => {
    it('should correctly handle access to both hidden and visible items', async () => {
      const testFile = join(testDir, 'mixed-access.ts');
      const code = `
        import type { ITool, IResource, IPrompt, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface HiddenTool extends ITool {
          name: 'tool_hidden';
          description: 'Hidden';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface VisibleTool extends ITool {
          name: 'tool_visible';
          description: 'Visible';
          params: { name: NameParam };
          result: string;
        }

        interface HiddenResource extends IResource {
          uri: 'res://hidden';
          name: 'Hidden Resource';
          description: 'Hidden';
          mimeType: 'text/plain';
          value: 'hidden content';
          hidden: true;
        }

        interface VisibleResource extends IResource {
          uri: 'res://visible';
          name: 'Visible Resource';
          description: 'Visible';
          mimeType: 'text/plain';
          value: 'visible content';
        }

        interface HiddenPrompt extends IPrompt {
          name: 'prompt_hidden';
          description: 'Hidden';
          args: { topic: { description: 'Topic' } };
          hidden: true;
        }

        interface VisiblePrompt extends IPrompt {
          name: 'prompt_visible';
          description: 'Visible';
          args: { topic: { description: 'Topic' } };
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          toolHidden: HiddenTool;
          toolVisible: VisibleTool;
          promptHidden: HiddenPrompt;
          promptVisible: VisiblePrompt;
        }

        export const toolHidden = async (params: { name: string }) => \`Hidden: \${params.name}\`;
        export const toolVisible = async (params: { name: string }) => \`Visible: \${params.name}\`;
        export const promptHidden = (args: { topic: string }) => \`Hidden: \${args.topic}\`;
        export const promptVisible = (args: { topic: string }) => \`Visible: \${args.topic}\`;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Verify lists only show visible items
      const tools = await server.listTools();
      const resources = await server.listResources();
      const prompts = await server.listPrompts();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('tool_visible');

      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('res://visible');

      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('prompt_visible');

      // But all items (hidden and visible) can be accessed
      const hiddenToolResult = await server.executeTool('tool_hidden', { name: 'Test' });
      expect(hiddenToolResult).toBe('Hidden: Test');

      const visibleToolResult = await server.executeTool('tool_visible', { name: 'Test' });
      expect(visibleToolResult).toBe('Visible: Test');

      const hiddenResResult = await server.readResource('res://hidden');
      expect(hiddenResResult.contents[0].text).toBe('hidden content');

      const visibleResResult = await server.readResource('res://visible');
      expect(visibleResResult.contents[0].text).toBe('visible content');

      const hiddenPromptResult = await server.getPrompt('prompt_hidden', { topic: 'Test' });
      expect(hiddenPromptResult.messages[0].content.text).toBe('Hidden: Test');

      const visiblePromptResult = await server.getPrompt('prompt_visible', { topic: 'Test' });
      expect(visiblePromptResult.messages[0].content.text).toBe('Visible: Test');
    });
  });

  describe('Error Distinction', () => {
    it('should provide clear error messages for missing vs hidden items', async () => {
      const testFile = join(testDir, 'error-distinction.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface HiddenTool extends ITool {
          name: 'existing_hidden';
          description: 'Exists but hidden';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          existingHidden: HiddenTool;
        }

        export const existingHidden = async (params: { name: string }) => params.name;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Hidden tool that exists - should execute successfully
      const result = await server.executeTool('existing_hidden', { name: 'Test' });
      expect(result).toBe('Test');

      // Truly non-existent tool - should throw error
      let errorThrown = false;
      try {
        await server.executeTool('truly_non_existent', { name: 'Test' });
      } catch (error) {
        errorThrown = true;
        expect(error).toBeDefined();
      }
      expect(errorThrown).toBe(true);
    });
  });
});
