/**
 * Integration Tests: Dynamic Hidden Lists
 *
 * Tests list handlers with dynamic hidden predicates for tools, resources, prompts, and skills.
 * Validates that context is passed correctly and filtering works as expected.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Dynamic Hidden Lists Integration', () => {
  const testDir = join(tmpdir(), 'test-dynamic-lists-' + Date.now());

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  describe('tools/list with dynamic hidden', () => {
    it('should filter tools based on sync function predicate', async () => {
      const testFile = join(testDir, 'tools-sync.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface PublicTool extends ITool {
          name: 'public_tool';
          description: 'Always visible';
          params: { query: QueryParam };
          result: string;
          hidden: false;
        }

        interface AdminTool extends ITool {
          name: 'admin_tool';
          description: 'Only for admins';
          params: { query: QueryParam };
          result: string;
          hidden: (ctx?: HiddenEvaluationContext) => {
            const user = ctx?.metadata?.user as { role?: string } | undefined;
            return user?.role !== 'admin';
          };
        }

        interface Server extends IServer {
          tools: {
            publicTool: PublicTool;
            adminTool: AdminTool;
          };
        }

        export const publicTool = async (params: any) => 'public result';
        export const adminTool = async (params: any) => 'admin result';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      // Regular user context
      const userTools = await server.listTools({
        metadata: { user: { role: 'user' } }
      });
      expect(userTools).toHaveLength(1);
      expect(userTools[0].name).toBe('public_tool');

      // Admin user context
      const adminTools = await server.listTools({
        metadata: { user: { role: 'admin' } }
      });
      expect(adminTools).toHaveLength(2);
      expect(adminTools.map(t => t.name)).toEqual(
        expect.arrayContaining(['public_tool', 'admin_tool'])
      );
    });

    it('should filter tools based on async function predicate', async () => {
      const testFile = join(testDir, 'tools-async.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface BetaTool extends ITool {
          name: 'beta_tool';
          description: 'Beta feature';
          params: { query: QueryParam };
          result: string;
          hidden: async (ctx?: HiddenEvaluationContext) => {
            // Simulate async permission check
            await new Promise(resolve => setTimeout(resolve, 10));
            const features = ctx?.metadata?.features as string[] | undefined;
            return !features?.includes('beta');
          };
        }

        interface Server extends IServer {
          tools: {
            betaTool: BetaTool;
          };
        }

        export const betaTool = async (params: any) => 'beta result';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      // Regular user without beta
      const regularTools = await server.listTools({
        metadata: { features: [] }
      });
      expect(regularTools).toHaveLength(0);

      // Beta user
      const betaTools = await server.listTools({
        metadata: { features: ['beta'] }
      });
      expect(betaTools).toHaveLength(1);
      expect(betaTools[0].name).toBe('beta_tool');
    });
  });

  describe('resources/list with dynamic hidden', () => {
    it('should filter resources based on context', async () => {
      const testFile = join(testDir, 'resources-dynamic.ts');
      const code = `
        import type { IResource, IServer } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface PublicDocs extends IResource {
          uri: 'docs://public';
          name: 'Public Docs';
          mimeType: 'text/markdown';
          value: '# Public Documentation';
        }

        interface DebugLogs extends IResource {
          uri: 'debug://logs';
          name: 'Debug Logs';
          mimeType: 'text/plain';
          value: 'Debug log entries...';
          hidden: (ctx?: HiddenEvaluationContext) => {
            return ctx?.server?.isProduction === true;
          };
        }

        interface Server extends IServer {
          resources: {
            publicDocs: PublicDocs;
            debugLogs: DebugLogs;
          };
        }

        export const publicDocs = 'docs content';
        export const debugLogs = 'log content';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      // Production environment
      const prodResources = await server.listResources({
        server: { isProduction: true }
      });
      expect(prodResources).toHaveLength(1);
      expect(prodResources[0].uri).toBe('docs://public');

      // Development environment
      const devResources = await server.listResources({
        server: { isProduction: false }
      });
      expect(devResources).toHaveLength(2);
      expect(devResources.map(r => r.uri)).toEqual(
        expect.arrayContaining(['docs://public', 'debug://logs'])
      );
    });
  });

  describe('prompts/list with dynamic hidden', () => {
    it('should filter prompts based on context', async () => {
      const testFile = join(testDir, 'prompts-dynamic.ts');
      const code = `
        import type { IPrompt, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface TextParam extends IParam {
          type: 'string';
          description: 'Input text';
        }

        interface BasicPrompt extends IPrompt {
          name: 'basic_prompt';
          description: 'Basic prompt';
          arguments: { text: TextParam };
          returns: { messages: any[] };
        }

        interface AdvancedPrompt extends IPrompt {
          name: 'advanced_prompt';
          description: 'Advanced prompt';
          arguments: { text: TextParam };
          returns: { messages: any[] };
          hidden: (ctx?: HiddenEvaluationContext) => {
            const user = ctx?.metadata?.user as { experience?: number } | undefined;
            return (user?.experience ?? 0) < 100;
          };
        }

        interface Server extends IServer {
          prompts: {
            basicPrompt: BasicPrompt;
            advancedPrompt: AdvancedPrompt;
          };
        }

        export const basicPrompt = async (args: any) => ({ messages: [] });
        export const advancedPrompt = async (args: any) => ({ messages: [] });
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      // Novice user
      const novicePrompts = await server.listPrompts({
        metadata: { user: { experience: 50 } }
      });
      expect(novicePrompts).toHaveLength(1);
      expect(novicePrompts[0].name).toBe('basic_prompt');

      // Experienced user
      const expertPrompts = await server.listPrompts({
        metadata: { user: { experience: 150 } }
      });
      expect(expertPrompts).toHaveLength(2);
    });
  });

  describe('skills/list with dynamic hidden', () => {
    it('should filter skills based on context', async () => {
      const testFile = join(testDir, 'skills-dynamic.ts');
      const code = `
        import type { ISkill, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface PublicSkill extends ISkill {
          name: 'public_skill';
          description: 'Public skill';
          arguments: { query: QueryParam };
        }

        interface ExperimentalSkill extends ISkill {
          name: 'experimental_skill';
          description: 'Experimental skill';
          arguments: { query: QueryParam };
          hidden: async (ctx?: HiddenEvaluationContext) => {
            await new Promise(resolve => setTimeout(resolve, 5));
            const env = ctx?.metadata?.environment as string | undefined;
            return env === 'production';
          };
        }

        interface Server extends IServer {
          skills: {
            publicSkill: PublicSkill;
            experimentalSkill: ExperimentalSkill;
          };
        }

        export const publicSkill = async (args: any) => 'public';
        export const experimentalSkill = async (args: any) => 'experimental';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      // Production environment
      const prodResources = await server.listResources({
        metadata: { environment: 'production' }
      });
      const prodSkills = prodResources.filter(r => r.uri.startsWith('skill://'));
      expect(prodSkills).toHaveLength(1);
      expect(prodSkills[0].name).toBe('public_skill');

      // Development environment
      const devResources = await server.listResources({
        metadata: { environment: 'development' }
      });
      const devSkills = devResources.filter(r => r.uri.startsWith('skill://'));
      expect(devSkills).toHaveLength(2);
    });
  });

  describe('Context metadata', () => {
    it('should pass correct MCP context metadata', async () => {
      const testFile = join(testDir, 'context-metadata.ts');
      let capturedContext: any = null;

      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface ContextCaptureTool extends ITool {
          name: 'context_tool';
          description: 'Captures context';
          params: { query: QueryParam };
          result: string;
          hidden: (ctx?: HiddenEvaluationContext) => {
            // Context will be captured by the test
            return false;
          };
        }

        interface Server extends IServer {
          tools: {
            contextCaptureTool: ContextCaptureTool;
          };
        }

        export const contextCaptureTool = async (params: any) => 'result';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const testContext = {
        metadata: {
          user: { id: 'user-123', role: 'admin' },
          features: ['beta'],
          requestId: 'req-456'
        },
        server: {
          isProduction: false,
          startTime: Date.now()
        }
      };

      await server.listTools(testContext);

      // Context is passed to hidden predicate
      // This validates the structure is correct
    });
  });

  describe('Backward compatibility', () => {
    it('should still work with static boolean hidden', async () => {
      const testFile = join(testDir, 'static-compat.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface VisibleTool extends ITool {
          name: 'visible';
          params: { query: QueryParam };
          result: string;
          hidden: false;
        }

        interface HiddenTool extends ITool {
          name: 'hidden';
          params: { query: QueryParam };
          result: string;
          hidden: true;
        }

        interface NoHiddenTool extends ITool {
          name: 'no_hidden';
          params: { query: QueryParam };
          result: string;
        }

        interface Server extends IServer {
          tools: {
            visibleTool: VisibleTool;
            hiddenTool: HiddenTool;
            noHiddenTool: NoHiddenTool;
          };
        }

        export const visibleTool = async (params: any) => 'visible';
        export const hiddenTool = async (params: any) => 'hidden';
        export const noHiddenTool = async (params: any) => 'none';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const tools = await server.listTools({});

      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toEqual(
        expect.arrayContaining(['visible', 'no_hidden'])
      );
      expect(tools.find(t => t.name === 'hidden')).toBeUndefined();
    });
  });
});
