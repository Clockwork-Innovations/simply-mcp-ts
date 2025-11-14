/**
 * Integration Tests: Async List Methods (Breaking Change)
 *
 * Tests that list methods are now async and return Promises.
 * Validates the breaking change from v4.4.0 (sync) to v4.5.0 (async).
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Async List Methods (Breaking Change)', () => {
  const testDir = join(tmpdir(), 'test-async-list-' + Date.now());

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  describe('listTools() is async', () => {
    it('should return a Promise', async () => {
      const testFile = join(testDir, 'list-tools-async.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface TestTool extends ITool {
          name: 'test_tool';
          params: { query: QueryParam };
          result: string;
        }

        interface Server extends IServer {
          tools: {
            testTool: TestTool;
          };
        }

        export const testTool = async (params: any) => 'result';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const result = server.listTools();

      // Should return a Promise
      expect(result).toBeInstanceOf(Promise);

      // Can await the result
      const tools = await result;
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test_tool');
    });

    it('should work with await', async () => {
      const testFile = join(testDir, 'list-tools-await.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface Tool1 extends ITool {
          name: 'tool_1';
          params: { query: QueryParam };
          result: string;
        }

        interface Tool2 extends ITool {
          name: 'tool_2';
          params: { query: QueryParam };
          result: string;
        }

        interface Server extends IServer {
          tools: {
            tool1: Tool1;
            tool2: Tool2;
          };
        }

        export const tool1 = async (params: any) => 'result1';
        export const tool2 = async (params: any) => 'result2';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const tools = await server.listTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(2);
    });
  });

  describe('listResources() is async', () => {
    it('should return a Promise', async () => {
      const testFile = join(testDir, 'list-resources-async.ts');
      const code = `
        import type { IResource, IServer } from 'simply-mcp';

        interface TestResource extends IResource {
          uri: 'test://resource';
          name: 'Test Resource';
          mimeType: 'text/plain';
          value: 'content';
        }

        interface Server extends IServer {
          resources: {
            testResource: TestResource;
          };
        }

        export const testResource = 'content';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const result = server.listResources();

      expect(result).toBeInstanceOf(Promise);

      const resources = await result;
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('test://resource');
    });

    it('should work with await', async () => {
      const testFile = join(testDir, 'list-resources-await.ts');
      const code = `
        import type { IResource, IServer } from 'simply-mcp';

        interface Resource1 extends IResource {
          uri: 'docs://1';
          mimeType: 'text/plain';
          value: 'content1';
        }

        interface Resource2 extends IResource {
          uri: 'docs://2';
          mimeType: 'text/plain';
          value: 'content2';
        }

        interface Server extends IServer {
          resources: {
            resource1: Resource1;
            resource2: Resource2;
          };
        }

        export const resource1 = 'content1';
        export const resource2 = 'content2';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const resources = await server.listResources();

      expect(Array.isArray(resources)).toBe(true);
      expect(resources).toHaveLength(2);
    });
  });

  describe('listPrompts() is async', () => {
    it('should return a Promise', async () => {
      const testFile = join(testDir, 'list-prompts-async.ts');
      const code = `
        import type { IPrompt, IServer, IParam } from 'simply-mcp';

        interface TextParam extends IParam {
          type: 'string';
          description: 'Text';
        }

        interface TestPrompt extends IPrompt {
          name: 'test_prompt';
          arguments: { text: TextParam };
          returns: { messages: any[] };
        }

        interface Server extends IServer {
          prompts: {
            testPrompt: TestPrompt;
          };
        }

        export const testPrompt = async (args: any) => ({ messages: [] });
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const result = server.listPrompts();

      expect(result).toBeInstanceOf(Promise);

      const prompts = await result;
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('test_prompt');
    });

    it('should work with await', async () => {
      const testFile = join(testDir, 'list-prompts-await.ts');
      const code = `
        import type { IPrompt, IServer, IParam } from 'simply-mcp';

        interface TextParam extends IParam {
          type: 'string';
          description: 'Text';
        }

        interface Prompt1 extends IPrompt {
          name: 'prompt_1';
          arguments: { text: TextParam };
          returns: { messages: any[] };
        }

        interface Prompt2 extends IPrompt {
          name: 'prompt_2';
          arguments: { text: TextParam };
          returns: { messages: any[] };
        }

        interface Server extends IServer {
          prompts: {
            prompt1: Prompt1;
            prompt2: Prompt2;
          };
        }

        export const prompt1 = async (args: any) => ({ messages: [] });
        export const prompt2 = async (args: any) => ({ messages: [] });
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const prompts = await server.listPrompts();

      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts).toHaveLength(2);
    });
  });

  describe('listResources() is async (skills via skill:// URIs)', () => {
    it('should return a Promise', async () => {
      const testFile = join(testDir, 'list-skills-async.ts');
      const code = `
        import type { ISkill, IServer, IParam } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface TestSkill extends ISkill {
          name: 'test_skill';
          arguments: { query: QueryParam };
        }

        interface Server extends IServer {
          skills: {
            testSkill: TestSkill;
          };
        }

        export const testSkill = async (args: any) => 'result';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const result = server.listResources();

      expect(result).toBeInstanceOf(Promise);

      const allResources = await result;
      const skills = allResources.filter(r => r.uri.startsWith('skill://'));
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('test_skill');
    });

    it('should work with await', async () => {
      const testFile = join(testDir, 'list-skills-await.ts');
      const code = `
        import type { ISkill, IServer, IParam } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface Skill1 extends ISkill {
          name: 'skill_1';
          arguments: { query: QueryParam };
        }

        interface Skill2 extends ISkill {
          name: 'skill_2';
          arguments: { query: QueryParam };
        }

        interface Server extends IServer {
          skills: {
            skill1: Skill1;
            skill2: Skill2;
          };
        }

        export const skill1 = async (args: any) => 'result1';
        export const skill2 = async (args: any) => 'result2';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const allResources = await server.listResources();
      const skills = allResources.filter(r => r.uri.startsWith('skill://'));

      expect(Array.isArray(skills)).toBe(true);
      expect(skills).toHaveLength(2);
    });
  });

  describe('All list methods with context', () => {
    it('should support context parameter on all list methods', async () => {
      const testFile = join(testDir, 'all-methods-context.ts');
      const code = `
        import type { ITool, IResource, IPrompt, ISkill, IServer, IParam } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface TestTool extends ITool {
          name: 'tool';
          params: { query: QueryParam };
          result: string;
        }

        interface TestResource extends IResource {
          uri: 'test://resource';
          mimeType: 'text/plain';
          value: 'content';
        }

        interface TestPrompt extends IPrompt {
          name: 'prompt';
          arguments: { query: QueryParam };
          returns: { messages: any[] };
        }

        interface TestSkill extends ISkill {
          name: 'skill';
          arguments: { query: QueryParam };
        }

        interface Server extends IServer {
          tools: { testTool: TestTool };
          resources: { testResource: TestResource };
          prompts: { testPrompt: TestPrompt };
          skills: { testSkill: TestSkill };
        }

        export const testTool = async (params: any) => 'result';
        export const testResource = 'content';
        export const testPrompt = async (args: any) => ({ messages: [] });
        export const testSkill = async (args: any) => 'result';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const context = {
        metadata: { user: { id: 'test-user' } }
      };

      // All methods accept context parameter
      const tools = await server.listTools(context);
      const allResources = await server.listResources(context);
      const prompts = await server.listPrompts(context);

      // Skills are accessed via resources with skill:// URIs
      const skills = allResources.filter(r => r.uri.startsWith('skill://'));
      const regularResources = allResources.filter(r => !r.uri.startsWith('skill://'));

      expect(tools).toHaveLength(1);
      expect(regularResources).toHaveLength(1);
      expect(prompts).toHaveLength(1);
      expect(skills).toHaveLength(1);
    });
  });

  describe('Backward compatibility concerns', () => {
    it('should still work without context parameter', async () => {
      const testFile = join(testDir, 'no-context.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface TestTool extends ITool {
          name: 'test';
          params: { query: QueryParam };
          result: string;
        }

        interface Server extends IServer {
          tools: {
            testTool: TestTool;
          };
        }

        export const testTool = async (params: any) => 'result';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      // Should work without context
      const tools = await server.listTools();
      expect(tools).toHaveLength(1);
    });

    it('should handle empty context', async () => {
      const testFile = join(testDir, 'empty-context.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface TestTool extends ITool {
          name: 'test';
          params: { query: QueryParam };
          result: string;
        }

        interface Server extends IServer {
          tools: {
            testTool: TestTool;
          };
        }

        export const testTool = async (params: any) => 'result';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      // Should work with empty context
      const tools = await server.listTools({});
      expect(tools).toHaveLength(1);
    });
  });
});
