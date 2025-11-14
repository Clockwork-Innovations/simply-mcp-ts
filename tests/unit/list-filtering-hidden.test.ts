/**
 * Unit Tests: List Filtering Hidden Items
 *
 * Tests that list handlers correctly filter out items with `hidden: true`.
 * Validates that:
 * - tools/list filters hidden tools
 * - resources/list filters hidden resources
 * - prompts/list filters hidden prompts
 * - Items with hidden: false or undefined are included in lists
 */

import { describe, it, expect } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('List Filtering Hidden Items', () => {
  const testDir = join(tmpdir(), 'test-list-filtering-' + Date.now());

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  describe('tools/list filtering', () => {
    it('should filter out tools with hidden: true', async () => {
      const testFile = join(testDir, 'tools-filter-true.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface HiddenTool extends ITool {
          name: 'hidden_tool';
          description: 'This tool is hidden';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface VisibleTool extends ITool {
          name: 'visible_tool';
          description: 'This tool is visible';
          params: { name: NameParam };
          result: string;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          description: 'Test server for hidden tools';
          hiddenTool: HiddenTool;
          visibleTool: VisibleTool;
        }

        export default class TestService {
          hiddenTool: HiddenTool = async (params: { name: string }) => \`Hidden: \${params.name}\`;
          visibleTool: VisibleTool = async (params: { name: string }) => \`Visible: \${params.name}\`;
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const tools = await server.listTools();

      // Only visible_tool should appear in the list
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('visible_tool');
      expect(tools.find(t => t.name === 'hidden_tool')).toBeUndefined();
    });

    it('should include tools with hidden: false', async () => {
      const testFile = join(testDir, 'tools-filter-false.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface ExplicitlyVisibleTool extends ITool {
          name: 'explicitly_visible';
          description: 'Explicitly marked as visible';
          params: { name: NameParam };
          result: string;
          hidden: false;
        }

        interface TestServer extends IServer {
          description: 'Test server';
          name: 'test-server';
          version: '1.0.0';
          explicitlyVisibleTool: ExplicitlyVisibleTool;
        }

        export default class TestService {
          explicitlyVisible: ExplicitlyVisibleTool = async (params: { name: string }) => params.name;
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const tools = await server.listTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('explicitly_visible');
    });

    it('should include tools with undefined hidden (default behavior)', async () => {
      const testFile = join(testDir, 'tools-filter-undefined.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface DefaultVisibleTool extends ITool {
          name: 'default_visible';
          description: 'No hidden field specified';
          params: { name: NameParam };
          result: string;
        }

        interface TestServer extends IServer {
          description: 'Test server';
          name: 'test-server';
          version: '1.0.0';
          defaultVisibleTool: DefaultVisibleTool;
        }

        export default class TestService {
          defaultVisible: DefaultVisibleTool = async (params: { name: string }) => params.name;
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const tools = await server.listTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('default_visible');
    });

    it('should correctly filter mixed hidden values', async () => {
      const testFile = join(testDir, 'tools-filter-mixed.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface Tool1 extends ITool {
          name: 'tool_hidden_1';
          description: 'Hidden tool 1';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface Tool2 extends ITool {
          name: 'tool_visible_explicit';
          description: 'Explicitly visible tool';
          params: { name: NameParam };
          result: string;
          hidden: false;
        }

        interface Tool3 extends ITool {
          name: 'tool_hidden_2';
          description: 'Hidden tool 2';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface Tool4 extends ITool {
          name: 'tool_visible_default';
          description: 'Default visible tool';
          params: { name: NameParam };
          result: string;
        }

        interface TestServer extends IServer {
          description: 'Test server';
          name: 'test-server';
          version: '1.0.0';
          toolHidden1: Tool1;
          toolVisibleExplicit: Tool2;
          toolHidden2: Tool3;
          toolVisibleDefault: Tool4;
        }

        export default class TestService {
          toolHidden_1: Tool1 = async (params: { name: string }) => params.name;
          toolVisibleExplicit: Tool2 = async (params: { name: string }) => params.name;
          toolHidden_2: Tool3 = async (params: { name: string }) => params.name;
          toolVisibleDefault: Tool4 = async (params: { name: string }) => params.name;
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const tools = await server.listTools();

      // Should only show the 2 visible tools
      expect(tools).toHaveLength(2);
      const toolNames = tools.map(t => t.name).sort();
      expect(toolNames).toEqual(['tool_visible_default', 'tool_visible_explicit']);

      // Verify hidden tools are NOT in the list
      expect(tools.find(t => t.name === 'tool_hidden_1')).toBeUndefined();
      expect(tools.find(t => t.name === 'tool_hidden_2')).toBeUndefined();
    });
  });

  describe('resources/list filtering', () => {
    it('should filter out resources with hidden: true', async () => {
      const testFile = join(testDir, 'resources-filter-true.ts');
      const code = `
        import type { IResource, IServer } from 'simply-mcp';

        interface HiddenResource extends IResource {
          uri: 'secret://data';
          name: 'Secret Data';
          description: 'This resource is hidden';
          mimeType: 'application/json';
          value: { secret: true };
          hidden: true;
        }

        interface PublicResource extends IResource {
          uri: 'public://data';
          name: 'Public Data';
          description: 'This resource is visible';
          mimeType: 'application/json';
          value: { public: true };
        }

        interface TestServer extends IServer {
          description: 'Test server';
          name: 'test-server';
          version: '1.0.0';
        }

        export default class TestService {}
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const resources = await server.listResources();

      // Only public://data should appear
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('public://data');
      expect(resources.find(r => r.uri === 'secret://data')).toBeUndefined();
    });

    it('should include resources with hidden: false', async () => {
      const testFile = join(testDir, 'resources-filter-false.ts');
      const code = `
        import type { IResource, IServer } from 'simply-mcp';

        interface ExplicitlyVisibleResource extends IResource {
          uri: 'explicit://visible';
          name: 'Explicit Visible';
          description: 'Explicitly marked visible';
          mimeType: 'text/plain';
          value: 'content';
          hidden: false;
        }

        interface TestServer extends IServer {
          description: 'Test server';
          name: 'test-server';
          version: '1.0.0';
        }

        export default class TestService {}
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const resources = await server.listResources();

      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('explicit://visible');
    });

    it('should include resources with undefined hidden', async () => {
      const testFile = join(testDir, 'resources-filter-undefined.ts');
      const code = `
        import type { IResource, IServer } from 'simply-mcp';

        interface DefaultVisibleResource extends IResource {
          uri: 'default://visible';
          name: 'Default Visible';
          description: 'No hidden field';
          mimeType: 'text/plain';
          value: 'content';
        }

        interface TestServer extends IServer {
          description: 'Test server';
          name: 'test-server';
          version: '1.0.0';
        }

        export default class TestService {}
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const resources = await server.listResources();

      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('default://visible');
    });

    it('should correctly filter mixed hidden values', async () => {
      const testFile = join(testDir, 'resources-filter-mixed.ts');
      const code = `
        import type { IResource, IServer } from 'simply-mcp';

        interface Resource1 extends IResource {
          uri: 'res://hidden1';
          name: 'Hidden 1';
          description: 'Hidden';
          mimeType: 'text/plain';
          value: 'h1';
          hidden: true;
        }

        interface Resource2 extends IResource {
          uri: 'res://visible1';
          name: 'Visible 1';
          description: 'Visible';
          mimeType: 'text/plain';
          value: 'v1';
          hidden: false;
        }

        interface Resource3 extends IResource {
          uri: 'res://hidden2';
          name: 'Hidden 2';
          description: 'Hidden';
          mimeType: 'text/plain';
          value: 'h2';
          hidden: true;
        }

        interface Resource4 extends IResource {
          uri: 'res://visible2';
          name: 'Visible 2';
          description: 'Visible';
          mimeType: 'text/plain';
          value: 'v2';
        }

        interface TestServer extends IServer {
          description: 'Test server';
          name: 'test-server';
          version: '1.0.0';
        }

        export default class TestService {}
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const resources = await server.listResources();

      expect(resources).toHaveLength(2);
      const uris = resources.map(r => r.uri).sort();
      expect(uris).toEqual(['res://visible1', 'res://visible2']);
    });
  });

  describe('prompts/list filtering', () => {
    it('should filter out prompts with hidden: true', async () => {
      const testFile = join(testDir, 'prompts-filter-true.ts');
      const code = `
        import type { IPrompt, IServer } from 'simply-mcp';

        interface HiddenPrompt extends IPrompt {
          name: 'hidden_prompt';
          description: 'This prompt is hidden';
          args: {
            topic: { description: 'Topic' };
          };
          hidden: true;
        }

        interface VisiblePrompt extends IPrompt {
          name: 'visible_prompt';
          description: 'This prompt is visible';
          args: {
            topic: { description: 'Topic' };
          };
        }

        interface TestServer extends IServer {
          description: 'Test server';
          name: 'test-server';
          version: '1.0.0';
          hiddenPrompt: HiddenPrompt;
          visiblePrompt: VisiblePrompt;
        }

        export default class TestService {
          hiddenPrompt: HiddenPrompt = (args: { topic: string }) => \`Hidden: \${args.topic}\`;
          visiblePrompt: VisiblePrompt = (args: { topic: string }) => \`Visible: \${args.topic}\`;
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const prompts = await server.listPrompts();

      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('visible_prompt');
      expect(prompts.find(p => p.name === 'hidden_prompt')).toBeUndefined();
    });

    it('should include prompts with hidden: false', async () => {
      const testFile = join(testDir, 'prompts-filter-false.ts');
      const code = `
        import type { IPrompt, IServer } from 'simply-mcp';

        interface ExplicitPrompt extends IPrompt {
          name: 'explicit_prompt';
          description: 'Explicitly visible';
          args: {
            topic: { description: 'Topic' };
          };
          hidden: false;
        }

        interface TestServer extends IServer {
          description: 'Test server';
          name: 'test-server';
          version: '1.0.0';
          explicitPrompt: ExplicitPrompt;
        }

        export default class TestService {
          explicitPrompt: ExplicitPrompt = (args: { topic: string }) => args.topic;
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const prompts = await server.listPrompts();

      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('explicit_prompt');
    });

    it('should include prompts with undefined hidden', async () => {
      const testFile = join(testDir, 'prompts-filter-undefined.ts');
      const code = `
        import type { IPrompt, IServer } from 'simply-mcp';

        interface DefaultPrompt extends IPrompt {
          name: 'default_prompt';
          description: 'Default behavior';
          args: {
            topic: { description: 'Topic' };
          };
        }

        interface TestServer extends IServer {
          description: 'Test server';
          name: 'test-server';
          version: '1.0.0';
          defaultPrompt: DefaultPrompt;
        }

        export default class TestService {
          defaultPrompt: DefaultPrompt = (args: { topic: string }) => args.topic;
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const prompts = await server.listPrompts();

      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('default_prompt');
    });

    it('should correctly filter mixed hidden values', async () => {
      const testFile = join(testDir, 'prompts-filter-mixed.ts');
      const code = `
        import type { IPrompt, IServer } from 'simply-mcp';

        interface Prompt1 extends IPrompt {
          name: 'prompt_hidden_1';
          description: 'Hidden';
          args: { topic: { description: 'Topic' } };
          hidden: true;
        }

        interface Prompt2 extends IPrompt {
          name: 'prompt_visible_explicit';
          description: 'Visible';
          args: { topic: { description: 'Topic' } };
          hidden: false;
        }

        interface Prompt3 extends IPrompt {
          name: 'prompt_hidden_2';
          description: 'Hidden';
          args: { topic: { description: 'Topic' } };
          hidden: true;
        }

        interface Prompt4 extends IPrompt {
          name: 'prompt_visible_default';
          description: 'Visible';
          args: { topic: { description: 'Topic' } };
        }

        interface TestServer extends IServer {
          description: 'Test server';
          name: 'test-server';
          version: '1.0.0';
          promptHidden1: Prompt1;
          promptVisibleExplicit: Prompt2;
          promptHidden2: Prompt3;
          promptVisibleDefault: Prompt4;
        }

        export default class TestService {
          promptHidden_1: Prompt1 = (args: { topic: string }) => args.topic;
          promptVisibleExplicit: Prompt2 = (args: { topic: string }) => args.topic;
          promptHidden_2: Prompt3 = (args: { topic: string }) => args.topic;
          promptVisibleDefault: Prompt4 = (args: { topic: string }) => args.topic;
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      const prompts = await server.listPrompts();

      expect(prompts).toHaveLength(2);
      const names = prompts.map(p => p.name).sort();
      expect(names).toEqual(['prompt_visible_default', 'prompt_visible_explicit']);
    });
  });
});
