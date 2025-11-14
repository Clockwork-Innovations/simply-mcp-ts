/**
 * Integration Tests: End-to-End Progressive Disclosure
 *
 * Tests the complete progressive disclosure workflow:
 * 1. Create a server with a mix of hidden and visible items
 * 2. Verify list endpoints only show visible items
 * 3. Verify execute/read/get work for both hidden and visible items
 * 4. Verify counts and filtering logic
 * 5. Verify backward compatibility (servers without hidden flag)
 */

import { describe, it, expect } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('End-to-End Progressive Disclosure', () => {
  const testDir = join(tmpdir(), 'test-progressive-' + Date.now());

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  describe('Complete Workflow', () => {
    it('should implement full progressive disclosure workflow', async () => {
      const testFile = join(testDir, 'full-workflow.ts');
      const code = `
        import type { ITool, IResource, IPrompt, IServer, IParam } from 'simply-mcp';

        // Define parameter interfaces
        interface QueryParam extends IParam {
          type: 'string';
          description: 'Search query';
        }

        interface IdParam extends IParam {
          type: 'string';
          description: 'Item ID';
        }

        // Public API Tools
        interface SearchTool extends ITool {
          name: 'search';
          description: 'Public search functionality';
          params: { query: QueryParam };
          result: { results: string[] };
        }

        interface GetItemTool extends ITool {
          name: 'get_item';
          description: 'Get item by ID';
          params: { id: IdParam };
          result: { id: string; name: string };
        }

        // Internal/Debug Tools (hidden)
        interface DebugTool extends ITool {
          name: 'debug_info';
          description: 'Internal debugging information';
          params: {};
          result: { memory: number; uptime: number };
          hidden: true;
        }

        interface ResetCacheTool extends ITool {
          name: 'reset_cache';
          description: 'Internal cache reset';
          params: {};
          result: { status: string };
          hidden: true;
        }

        // Public Resources
        interface DocsResource extends IResource {
          uri: 'docs://api';
          name: 'API Documentation';
          description: 'Public API docs';
          mimeType: 'text/markdown';
          value: '# API Documentation\\n\\nPublic API endpoints...';
        }

        // Internal Resources (hidden)
        interface InternalConfigResource extends IResource {
          uri: 'config://internal';
          name: 'Internal Configuration';
          description: 'Internal server config';
          mimeType: 'application/json';
          value: { debug: true, logLevel: 'verbose' };
          hidden: true;
        }

        interface MetricsResource extends IResource {
          uri: 'metrics://system';
          name: 'System Metrics';
          description: 'Internal system metrics';
          mimeType: 'application/json';
          value: { cpu: 45, memory: 78 };
          hidden: true;
        }

        // Public Prompts
        interface UserGuidePrompt extends IPrompt {
          name: 'user_guide';
          description: 'User guide prompt';
          args: {
            topic: { description: 'Help topic' };
          };
        }

        // Internal Prompts (hidden)
        interface AdminPrompt extends IPrompt {
          name: 'admin_guide';
          description: 'Admin guide for internal use';
          args: {
            task: { description: 'Admin task' };
          };
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'progressive-server';
          version: '1.0.0';
          search: SearchTool;
          getItem: GetItemTool;
          debugInfo: DebugTool;
          resetCache: ResetCacheTool;
          userGuide: UserGuidePrompt;
          adminGuide: AdminPrompt;
        }

        export const search = async (params: { query: string }) => ({
          results: [\`Result for: \${params.query}\`]
        });

        export const getItem = async (params: { id: string }) => ({
          id: params.id,
          name: \`Item \${params.id}\`
        });

        export const debugInfo = async () => ({
          memory: 1024,
          uptime: 3600
        });

        export const resetCache = async () => ({
          status: 'cache cleared'
        });

        export const userGuide = (args: { topic: string }) => {
          return \`User guide for: \${args.topic}\`;
        };

        export const adminGuide = (args: { task: string }) => {
          return \`Admin guide for: \${args.task}\`;
        };
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Step 1: Verify list endpoints only show visible items
      const tools = await server.listTools();
      const resources = await server.listResources();
      const prompts = await server.listPrompts();

      // Should only show 2 public tools
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name).sort()).toEqual(['get_item', 'search']);

      // Should only show 1 public resource
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('docs://api');

      // Should only show 1 public prompt
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('user_guide');

      // Step 2: Verify hidden items are NOT in lists
      expect(tools.find(t => t.name === 'debug_info')).toBeUndefined();
      expect(tools.find(t => t.name === 'reset_cache')).toBeUndefined();
      expect(resources.find(r => r.uri === 'config://internal')).toBeUndefined();
      expect(resources.find(r => r.uri === 'metrics://system')).toBeUndefined();
      expect(prompts.find(p => p.name === 'admin_guide')).toBeUndefined();

      // Step 3: Verify ALL tools can be executed (including hidden)
      const searchResult = await server.executeTool('search', { query: 'test' });
      expect(searchResult.results).toEqual(['Result for: test']);

      const debugResult = await server.executeTool('debug_info', {});
      expect(debugResult).toEqual({ memory: 1024, uptime: 3600 });

      const cacheResult = await server.executeTool('reset_cache', {});
      expect(cacheResult).toEqual({ status: 'cache cleared' });

      // Step 4: Verify ALL resources can be read (including hidden)
      const docsResult = await server.readResource('docs://api');
      expect(docsResult.contents[0].text).toContain('API Documentation');

      const configResult = await server.readResource('config://internal');
      const configData = JSON.parse(configResult.contents[0].text);
      expect(configData).toEqual({ debug: true, logLevel: 'verbose' });

      const metricsResult = await server.readResource('metrics://system');
      const metricsData = JSON.parse(metricsResult.contents[0].text);
      expect(metricsData).toEqual({ cpu: 45, memory: 78 });

      // Step 5: Verify ALL prompts can be accessed (including hidden)
      const userGuideResult = await server.getPrompt('user_guide', { topic: 'search' });
      expect(userGuideResult.messages[0].content.text).toBe('User guide for: search');

      const adminGuideResult = await server.getPrompt('admin_guide', { task: 'backup' });
      expect(adminGuideResult.messages[0].content.text).toBe('Admin guide for: backup');
    });

    it('should maintain correct counts of visible vs total items', async () => {
      const testFile = join(testDir, 'item-counts.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface Tool1 extends ITool {
          name: 't1';
          description: 'Visible 1';
          params: { name: NameParam };
          result: string;
        }

        interface Tool2 extends ITool {
          name: 't2';
          description: 'Hidden 1';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface Tool3 extends ITool {
          name: 't3';
          description: 'Visible 2';
          params: { name: NameParam };
          result: string;
        }

        interface Tool4 extends ITool {
          name: 't4';
          description: 'Hidden 2';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface Tool5 extends ITool {
          name: 't5';
          description: 'Hidden 3';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'count-server';
          version: '1.0.0';
          t1: Tool1;
          t2: Tool2;
          t3: Tool3;
          t4: Tool4;
          t5: Tool5;
        }

        export const t1 = async (params: { name: string }) => params.name;
        export const t2 = async (params: { name: string }) => params.name;
        export const t3 = async (params: { name: string }) => params.name;
        export const t4 = async (params: { name: string }) => params.name;
        export const t5 = async (params: { name: string }) => params.name;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Total tools: 5 (2 visible, 3 hidden)
      const tools = await server.listTools();
      expect(tools).toHaveLength(2); // Only visible ones

      // But all 5 should be executable
      await expect(server.executeTool('t1', { name: 'test' })).resolves.toBe('test');
      await expect(server.executeTool('t2', { name: 'test' })).resolves.toBe('test');
      await expect(server.executeTool('t3', { name: 'test' })).resolves.toBe('test');
      await expect(server.executeTool('t4', { name: 'test' })).resolves.toBe('test');
      await expect(server.executeTool('t5', { name: 'test' })).resolves.toBe('test');
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with servers that have no hidden flags (all visible)', async () => {
      const testFile = join(testDir, 'no-hidden-flags.ts');
      const code = `
        import type { ITool, IResource, IPrompt, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface LegacyTool extends ITool {
          name: 'legacy_tool';
          description: 'Old tool without hidden flag';
          params: { name: NameParam };
          result: string;
        }

        interface LegacyResource extends IResource {
          uri: 'legacy://resource';
          name: 'Legacy Resource';
          description: 'Old resource';
          mimeType: 'text/plain';
          value: 'legacy content';
        }

        interface LegacyPrompt extends IPrompt {
          name: 'legacy_prompt';
          description: 'Old prompt';
          args: {
            topic: { description: 'Topic' };
          };
        }

        interface TestServer extends IServer {
          name: 'legacy-server';
          version: '1.0.0';
          legacyTool: LegacyTool;
          legacyPrompt: LegacyPrompt;
        }

        export const legacyTool = async (params: { name: string }) => \`Legacy: \${params.name}\`;
        export const legacyPrompt = (args: { topic: string }) => \`Legacy: \${args.topic}\`;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // All items should be visible (backward compatible)
      const tools = await server.listTools();
      const resources = await server.listResources();
      const prompts = await server.listPrompts();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('legacy_tool');

      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('legacy://resource');

      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('legacy_prompt');

      // And all should be executable/readable
      await expect(server.executeTool('legacy_tool', { name: 'test' })).resolves.toBe('Legacy: test');
      await expect(server.readResource('legacy://resource')).resolves.toBeDefined();
      await expect(server.getPrompt('legacy_prompt', { topic: 'test' })).resolves.toBeDefined();
    });

    it('should handle mix of old (no hidden) and new (with hidden) items', async () => {
      const testFile = join(testDir, 'mixed-old-new.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface OldTool extends ITool {
          name: 'old_tool';
          description: 'Old tool without hidden field';
          params: { name: NameParam };
          result: string;
        }

        interface NewVisibleTool extends ITool {
          name: 'new_visible';
          description: 'New tool, explicitly visible';
          params: { name: NameParam };
          result: string;
          hidden: false;
        }

        interface NewHiddenTool extends ITool {
          name: 'new_hidden';
          description: 'New tool, hidden';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'mixed-server';
          version: '1.0.0';
          oldTool: OldTool;
          newVisibleTool: NewVisibleTool;
          newHiddenTool: NewHiddenTool;
        }

        export const oldTool = async (params: { name: string }) => \`Old: \${params.name}\`;
        export const newVisibleTool = async (params: { name: string }) => \`New Visible: \${params.name}\`;
        export const newHiddenTool = async (params: { name: string }) => \`New Hidden: \${params.name}\`;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // Should show 2 visible tools (old and new_visible)
      const tools = await server.listTools();
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name).sort()).toEqual(['new_visible', 'old_tool']);

      // But all 3 should be executable
      await expect(server.executeTool('old_tool', { name: 'test' })).resolves.toBe('Old: test');
      await expect(server.executeTool('new_visible', { name: 'test' })).resolves.toBe('New Visible: test');
      await expect(server.executeTool('new_hidden', { name: 'test' })).resolves.toBe('New Hidden: test');
    });
  });

  describe('Edge Cases', () => {
    it('should handle server with all items hidden', async () => {
      const testFile = join(testDir, 'all-hidden.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface Hidden1 extends ITool {
          name: 'h1';
          description: 'Hidden 1';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface Hidden2 extends ITool {
          name: 'h2';
          description: 'Hidden 2';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface TestServer extends IServer {
          name: 'all-hidden-server';
          version: '1.0.0';
          h1: Hidden1;
          h2: Hidden2;
        }

        export const h1 = async (params: { name: string }) => params.name;
        export const h2 = async (params: { name: string }) => params.name;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // List should be empty
      const tools = await server.listTools();
      expect(tools).toHaveLength(0);

      // But both should still be executable
      await expect(server.executeTool('h1', { name: 'test' })).resolves.toBe('test');
      await expect(server.executeTool('h2', { name: 'test' })).resolves.toBe('test');
    });

    it('should handle server with all items explicitly visible (hidden: false)', async () => {
      const testFile = join(testDir, 'all-explicit-visible.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface Visible1 extends ITool {
          name: 'v1';
          description: 'Visible 1';
          params: { name: NameParam };
          result: string;
          hidden: false;
        }

        interface Visible2 extends ITool {
          name: 'v2';
          description: 'Visible 2';
          params: { name: NameParam };
          result: string;
          hidden: false;
        }

        interface TestServer extends IServer {
          name: 'all-visible-server';
          version: '1.0.0';
          v1: Visible1;
          v2: Visible2;
        }

        export const v1 = async (params: { name: string }) => params.name;
        export const v2 = async (params: { name: string }) => params.name;
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // All should be in list
      const tools = await server.listTools();
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name).sort()).toEqual(['v1', 'v2']);

      // And all should be executable
      await expect(server.executeTool('v1', { name: 'test' })).resolves.toBe('test');
      await expect(server.executeTool('v2', { name: 'test' })).resolves.toBe('test');
    });

    it('should handle empty server (no items)', async () => {
      const testFile = join(testDir, 'empty-server.ts');
      const code = `
        import type { IServer } from 'simply-mcp';

        interface TestServer extends IServer {
          name: 'empty-server';
          version: '1.0.0';
        }
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer({ filePath: testFile });

      // All lists should be empty
      expect(await server.listTools()).toHaveLength(0);
      expect(await server.listResources()).toHaveLength(0);
      expect(await server.listPrompts()).toHaveLength(0);
    });
  });
});
