/**
 * Integration Tests: Adapter Pass-Through of Hidden Flag
 *
 * Tests that the adapter correctly passes the `hidden` flag from parsed
 * interfaces through to the BuildMCPServer registration methods:
 * - registerTool passes hidden to server.addTool
 * - registerResource passes hidden to server.addResource
 * - registerPrompt passes hidden to server.addPrompt
 *
 * This ensures the hidden flag flows correctly through the entire pipeline.
 */

import { describe, it, expect } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { BuildMCPServer } from '../../src/server/builder-server.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Adapter Hidden Flag Pass-Through', () => {
  const testDir = join(tmpdir(), 'test-adapter-passthrough-' + Date.now());

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  describe('Tool Registration', () => {
    it('should pass hidden: true from ITool to addTool', async () => {
      const testFile = join(testDir, 'tool-hidden-true.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface HiddenTool extends ITool {
          name: 'hidden_tool';
          description: 'Hidden tool';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          hiddenTool: HiddenTool;
        }

        export const hiddenTool = async (params: { name: string }) => \`Hidden: \${params.name}\`;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Access internal BuildMCPServer to check registration
      const buildServer = (server as any).buildServer as BuildMCPServer;
      const tools = buildServer.getTools();
      const hiddenTool = tools.get('hidden_tool');

      expect(hiddenTool).toBeDefined();
      expect(hiddenTool?.definition.hidden).toBe(true);

      // Verify it's filtered from list
      const toolsList = await server.listTools();
      expect(toolsList.find(t => t.name === 'hidden_tool')).toBeUndefined();

      // But still executable
      const result = await server.executeTool('hidden_tool', { name: 'Test' });
      expect(result).toBe('Hidden: Test');
    });

    it('should pass hidden: false from ITool to addTool', async () => {
      const testFile = join(testDir, 'tool-hidden-false.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface VisibleTool extends ITool {
          name: 'visible_tool';
          description: 'Visible tool';
          params: { name: NameParam };
          result: string;
          hidden: false;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          visibleTool: VisibleTool;
        }

        export const visibleTool = async (params: { name: string }) => \`Visible: \${params.name}\`;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const buildServer = (server as any).buildServer as BuildMCPServer;
      const tools = buildServer.getTools();
      const visibleTool = tools.get('visible_tool');

      expect(visibleTool).toBeDefined();
      expect(visibleTool?.definition.hidden).toBe(false);

      // Should be in list
      const toolsList = await server.listTools();
      expect(toolsList.find(t => t.name === 'visible_tool')).toBeDefined();
    });

    it('should pass undefined hidden (default) from ITool to addTool', async () => {
      const testFile = join(testDir, 'tool-hidden-undefined.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface DefaultTool extends ITool {
          name: 'default_tool';
          description: 'Default tool';
          params: { name: NameParam };
          result: string;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          defaultTool: DefaultTool;
        }

        export const defaultTool = async (params: { name: string }) => \`Default: \${params.name}\`;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const buildServer = (server as any).buildServer as BuildMCPServer;
      const tools = buildServer.getTools();
      const defaultTool = tools.get('default_tool');

      expect(defaultTool).toBeDefined();
      expect(defaultTool?.definition.hidden).toBeUndefined();

      // Should be in list (default behavior)
      const toolsList = await server.listTools();
      expect(toolsList.find(t => t.name === 'default_tool')).toBeDefined();
    });
  });

  describe('Resource Registration', () => {
    it('should pass hidden: true from IResource to addResource', async () => {
      const testFile = join(testDir, 'resource-hidden-true.ts');
      const code = `
        import type { IResource, IServer } from 'simply-mcp';

        interface HiddenResource extends IResource {
          uri: 'hidden://resource';
          name: 'Hidden Resource';
          description: 'Hidden';
          mimeType: 'text/plain';
          value: 'hidden content';
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const buildServer = (server as any).buildServer as BuildMCPServer;
      const resources = buildServer.getResources();
      const hiddenResource = resources.get('hidden://resource');

      expect(hiddenResource).toBeDefined();
      expect(hiddenResource?.hidden).toBe(true);

      // Verify it's filtered from list
      const resourcesList = await server.listResources();
      expect(resourcesList.find(r => r.uri === 'hidden://resource')).toBeUndefined();

      // But still readable
      const result = await server.readResource('hidden://resource');
      expect(result.contents[0].text).toBe('hidden content');
    });

    it('should pass hidden: false from IResource to addResource', async () => {
      const testFile = join(testDir, 'resource-hidden-false.ts');
      const code = `
        import type { IResource, IServer } from 'simply-mcp';

        interface VisibleResource extends IResource {
          uri: 'visible://resource';
          name: 'Visible Resource';
          description: 'Visible';
          mimeType: 'text/plain';
          value: 'visible content';
          hidden: false;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const buildServer = (server as any).buildServer as BuildMCPServer;
      const resources = buildServer.getResources();
      const visibleResource = resources.get('visible://resource');

      expect(visibleResource).toBeDefined();
      expect(visibleResource?.hidden).toBe(false);

      // Should be in list
      const resourcesList = await server.listResources();
      expect(resourcesList.find(r => r.uri === 'visible://resource')).toBeDefined();
    });

    it('should pass undefined hidden from IResource to addResource', async () => {
      const testFile = join(testDir, 'resource-hidden-undefined.ts');
      const code = `
        import type { IResource, IServer } from 'simply-mcp';

        interface DefaultResource extends IResource {
          uri: 'default://resource';
          name: 'Default Resource';
          description: 'Default';
          mimeType: 'text/plain';
          value: 'default content';
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const buildServer = (server as any).buildServer as BuildMCPServer;
      const resources = buildServer.getResources();
      const defaultResource = resources.get('default://resource');

      expect(defaultResource).toBeDefined();
      expect(defaultResource?.hidden).toBeUndefined();

      // Should be in list (default behavior)
      const resourcesList = await server.listResources();
      expect(resourcesList.find(r => r.uri === 'default://resource')).toBeDefined();
    });
  });

  describe('Prompt Registration', () => {
    it('should pass hidden: true from IPrompt to addPrompt', async () => {
      const testFile = join(testDir, 'prompt-hidden-true.ts');
      const code = `
        import type { IPrompt, IServer } from 'simply-mcp';

        interface HiddenPrompt extends IPrompt {
          name: 'hidden_prompt';
          description: 'Hidden';
          args: {
            topic: { description: 'Topic' };
          };
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          hiddenPrompt: HiddenPrompt;
        }

        export const hiddenPrompt = (args: { topic: string }) => \`Hidden: \${args.topic}\`;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const buildServer = (server as any).buildServer as BuildMCPServer;
      const prompts = buildServer.getPrompts();
      const hiddenPrompt = prompts.get('hidden_prompt');

      expect(hiddenPrompt).toBeDefined();
      expect(hiddenPrompt?.hidden).toBe(true);

      // Verify it's filtered from list
      const promptsList = await server.listPrompts();
      expect(promptsList.find(p => p.name === 'hidden_prompt')).toBeUndefined();

      // But still accessible
      const result = await server.getPrompt('hidden_prompt', { topic: 'Test' });
      expect(result.messages[0].content.text).toBe('Hidden: Test');
    });

    it('should pass hidden: false from IPrompt to addPrompt', async () => {
      const testFile = join(testDir, 'prompt-hidden-false.ts');
      const code = `
        import type { IPrompt, IServer } from 'simply-mcp';

        interface VisiblePrompt extends IPrompt {
          name: 'visible_prompt';
          description: 'Visible';
          args: {
            topic: { description: 'Topic' };
          };
          hidden: false;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          visiblePrompt: VisiblePrompt;
        }

        export const visiblePrompt = (args: { topic: string }) => \`Visible: \${args.topic}\`;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const buildServer = (server as any).buildServer as BuildMCPServer;
      const prompts = buildServer.getPrompts();
      const visiblePrompt = prompts.get('visible_prompt');

      expect(visiblePrompt).toBeDefined();
      expect(visiblePrompt?.hidden).toBe(false);

      // Should be in list
      const promptsList = await server.listPrompts();
      expect(promptsList.find(p => p.name === 'visible_prompt')).toBeDefined();
    });

    it('should pass undefined hidden from IPrompt to addPrompt', async () => {
      const testFile = join(testDir, 'prompt-hidden-undefined.ts');
      const code = `
        import type { IPrompt, IServer } from 'simply-mcp';

        interface DefaultPrompt extends IPrompt {
          name: 'default_prompt';
          description: 'Default';
          args: {
            topic: { description: 'Topic' };
          };
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          defaultPrompt: DefaultPrompt;
        }

        export const defaultPrompt = (args: { topic: string }) => \`Default: \${args.topic}\`;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const buildServer = (server as any).buildServer as BuildMCPServer;
      const prompts = buildServer.getPrompts();
      const defaultPrompt = prompts.get('default_prompt');

      expect(defaultPrompt).toBeDefined();
      expect(defaultPrompt?.hidden).toBeUndefined();

      // Should be in list (default behavior)
      const promptsList = await server.listPrompts();
      expect(promptsList.find(p => p.name === 'default_prompt')).toBeDefined();
    });
  });

  describe('Complete Pipeline Pass-Through', () => {
    it('should correctly pass hidden flag through entire pipeline', async () => {
      const testFile = join(testDir, 'complete-pipeline.ts');
      const code = `
        import type { ITool, IResource, IPrompt, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        // Compiler extracts hidden: true
        interface Tool1 extends ITool {
          name: 't1';
          description: 'Hidden tool';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        // Compiler extracts hidden: false
        interface Tool2 extends ITool {
          name: 't2';
          description: 'Visible tool';
          params: { name: NameParam };
          result: string;
          hidden: false;
        }

        // Compiler extracts undefined
        interface Tool3 extends ITool {
          name: 't3';
          description: 'Default tool';
          params: { name: NameParam };
          result: string;
        }

        interface Resource1 extends IResource {
          uri: 'r1://test';
          name: 'R1';
          description: 'Hidden';
          mimeType: 'text/plain';
          value: 'r1';
          hidden: true;
        }

        interface Prompt1 extends IPrompt {
          name: 'p1';
          description: 'Hidden';
          args: { topic: { description: 'Topic' } };
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'pipeline-test';
          version: '1.0.0';
          t1: Tool1;
          t2: Tool2;
          t3: Tool3;
          p1: Prompt1;
        }

        export const t1 = async (params: { name: string }) => params.name;
        export const t2 = async (params: { name: string }) => params.name;
        export const t3 = async (params: { name: string }) => params.name;
        export const p1 = (args: { topic: string }) => args.topic;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Check BuildMCPServer internal state
      const buildServer = (server as any).buildServer as BuildMCPServer;

      const tools = buildServer.getTools();
      expect(tools.get('t1')?.definition.hidden).toBe(true);
      expect(tools.get('t2')?.definition.hidden).toBe(false);
      expect(tools.get('t3')?.definition.hidden).toBeUndefined();

      const resources = buildServer.getResources();
      expect(resources.get('r1://test')?.hidden).toBe(true);

      const prompts = buildServer.getPrompts();
      expect(prompts.get('p1')?.hidden).toBe(true);

      // Check InterfaceServer list filtering
      const toolsList = await server.listTools();
      expect(toolsList).toHaveLength(2); // t2 and t3
      expect(toolsList.find(t => t.name === 't1')).toBeUndefined();
      expect(toolsList.find(t => t.name === 't2')).toBeDefined();
      expect(toolsList.find(t => t.name === 't3')).toBeDefined();

      const resourcesList = await server.listResources();
      expect(resourcesList).toHaveLength(0); // r1 is hidden

      const promptsList = await server.listPrompts();
      expect(promptsList).toHaveLength(0); // p1 is hidden

      // Check all items are still accessible
      await expect(server.executeTool('t1', { name: 'test' })).resolves.toBe('test');
      await expect(server.executeTool('t2', { name: 'test' })).resolves.toBe('test');
      await expect(server.executeTool('t3', { name: 'test' })).resolves.toBe('test');
      await expect(server.readResource('r1://test')).resolves.toBeDefined();
      await expect(server.getPrompt('p1', { topic: 'test' })).resolves.toBeDefined();
    });
  });

  describe('Dynamic Resources with Hidden Flag', () => {
    it('should pass hidden flag through for dynamic resources', async () => {
      const testFile = join(testDir, 'dynamic-resource-hidden.ts');
      const code = `
        import type { IResource, IServer, ResourceHelper } from 'simply-mcp';

        interface HiddenDynamic extends IResource {
          uri: 'dynamic://hidden';
          name: 'Hidden Dynamic';
          description: 'Hidden dynamic resource';
          mimeType: 'application/json';
          returns: { timestamp: string };
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
        }

        export const resources = {
          'dynamic://hidden': (async () => ({
            timestamp: new Date().toISOString()
          })) as ResourceHelper<HiddenDynamic>
        };
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const buildServer = (server as any).buildServer as BuildMCPServer;
      const resources = buildServer.getResources();
      const hiddenDynamic = resources.get('dynamic://hidden');

      expect(hiddenDynamic).toBeDefined();
      expect(hiddenDynamic?.hidden).toBe(true);

      // Not in list
      const resourcesList = await server.listResources();
      expect(resourcesList.find(r => r.uri === 'dynamic://hidden')).toBeUndefined();

      // But readable
      const result = await server.readResource('dynamic://hidden');
      expect(result).toBeDefined();
      expect(JSON.parse(result.contents[0].text)).toHaveProperty('timestamp');
    });
  });
});
