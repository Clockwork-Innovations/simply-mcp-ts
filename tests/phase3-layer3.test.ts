/**
 * Phase 3 Layer 3: Lifecycle Hooks Tests
 *
 * Tests for onStartup/onShutdown hooks and lifespan context
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';
import { z } from 'zod';

describe('Phase 3 Layer 3: Lifecycle Hooks', () => {
  let server: BuildMCPServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  describe('Hook Invocation', () => {
    it('should call onStartup when server starts', async () => {
      let startupCalled = false;

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onStartup: async (ctx) => {
          startupCalled = true;
        }
      });

      await server.start({ transport: 'stdio' });
      expect(startupCalled).toBe(true);
    });

    it('should call onShutdown when server stops', async () => {
      let shutdownCalled = false;

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onShutdown: async (ctx) => {
          shutdownCalled = true;
        }
      });

      await server.start({ transport: 'stdio' });
      await server.stop();
      expect(shutdownCalled).toBe(true);
    });

    it('should pass lifespan context to hooks', async () => {
      let startupContext: any;
      let shutdownContext: any;

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onStartup: async (ctx) => {
          startupContext = ctx;
        },
        onShutdown: async (ctx) => {
          shutdownContext = ctx;
        }
      });

      await server.start({ transport: 'stdio' });
      await server.stop();

      expect(startupContext).toBeDefined();
      expect(shutdownContext).toBeDefined();
      expect(typeof startupContext).toBe('object');
      expect(typeof shutdownContext).toBe('object');
    });

    it('should support synchronous hooks', async () => {
      let syncCalled = false;

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onStartup: (ctx) => {
          syncCalled = true;
        }
      });

      await server.start({ transport: 'stdio' });
      expect(syncCalled).toBe(true);
    });

    it('should support asynchronous hooks', async () => {
      let asyncCalled = false;

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onStartup: async (ctx) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          asyncCalled = true;
        }
      });

      await server.start({ transport: 'stdio' });
      expect(asyncCalled).toBe(true);
    });
  });

  describe('Lifespan Context Access', () => {
    it('should allow tools to access lifespan context', async () => {
      let toolContext: any;

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onStartup: async (ctx) => {
          ctx.testData = 'from-startup';
        }
      });

      server.addTool({
        name: 'test_tool',
        description: 'Test tool',
        parameters: z.object({}),
        execute: async (args, context) => {
          toolContext = context?.mcp?.request_context?.lifespan_context;
          return 'ok';
        }
      });

      await server.start({ transport: 'stdio' });
      await server.executeToolDirect('test_tool', {});

      expect(toolContext).toBeDefined();
      expect(toolContext.testData).toBe('from-startup');
    });

    it('should allow prompts to access lifespan context', async () => {
      let promptContext: any;

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onStartup: async (ctx) => {
          ctx.promptData = 'available';
        }
      });

      server.addPrompt({
        name: 'test_prompt',
        description: 'Test prompt',
        template: (args, context) => {
          promptContext = context?.mcp?.request_context?.lifespan_context;
          return 'template';
        }
      });

      await server.start({ transport: 'stdio' });
      await server.getPromptDirect('test_prompt', {});

      expect(promptContext).toBeDefined();
      expect(promptContext.promptData).toBe('available');
    });

    it('should allow resources to access lifespan context', async () => {
      let resourceContext: any;

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onStartup: async (ctx) => {
          ctx.resourceData = 'initialized';
        }
      });

      server.addResource({
        uri: 'test://resource',
        name: 'Test Resource',
        description: 'Test',
        mimeType: 'text/plain',
        content: (context) => {
          resourceContext = context?.mcp?.request_context?.lifespan_context;
          return 'content';
        }
      });

      await server.start({ transport: 'stdio' });
      await server.readResourceDirect('test://resource');

      expect(resourceContext).toBeDefined();
      expect(resourceContext.resourceData).toBe('initialized');
    });

    it('should share context across all handler types', async () => {
      const contexts: any[] = [];

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onStartup: async (ctx) => {
          ctx.sharedValue = 'shared-across-all';
        }
      });

      server.addTool({
        name: 'tool',
        description: 'Tool',
        parameters: z.object({}),
        execute: async (args, context) => {
          contexts.push(context?.mcp?.request_context?.lifespan_context);
          return 'ok';
        }
      });

      server.addPrompt({
        name: 'prompt',
        description: 'Prompt',
        template: (args, context) => {
          contexts.push(context?.mcp?.request_context?.lifespan_context);
          return 'template';
        }
      });

      server.addResource({
        uri: 'test://resource',
        name: 'Resource',
        description: 'Resource',
        mimeType: 'text/plain',
        content: (context) => {
          contexts.push(context?.mcp?.request_context?.lifespan_context);
          return 'content';
        }
      });

      await server.start({ transport: 'stdio' });
      await server.executeToolDirect('tool', {});
      await server.getPromptDirect('prompt', {});
      await server.readResourceDirect('test://resource');

      expect(contexts).toHaveLength(3);
      expect(contexts[0].sharedValue).toBe('shared-across-all');
      expect(contexts[1].sharedValue).toBe('shared-across-all');
      expect(contexts[2].sharedValue).toBe('shared-across-all');
    });
  });

  describe('Resource Lifecycle Pattern', () => {
    it('should support resource initialization and cleanup', async () => {
      let dbConnection: any = null;
      let dbClosed = false;

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onStartup: async (ctx) => {
          // Simulate DB connection
          dbConnection = {
            connected: true,
            query: (sql: string) => 'result'
          };
          ctx.db = dbConnection;
        },
        onShutdown: async (ctx) => {
          // Simulate DB cleanup
          if (ctx.db) {
            ctx.db.connected = false;
            dbClosed = true;
          }
        }
      });

      server.addTool({
        name: 'query',
        description: 'Query DB',
        parameters: z.object({ sql: z.string() }),
        execute: async (args, context) => {
          const db = context?.mcp?.request_context?.lifespan_context?.db;
          return db ? db.query(args.sql) : 'no db';
        }
      });

      await server.start({ transport: 'stdio' });

      const result = await server.executeToolDirect('query', { sql: 'SELECT *' });
      expect(result.content[0].text).toBe('result');
      expect(dbConnection?.connected).toBe(true);

      await server.stop();
      expect(dbClosed).toBe(true);
      expect(dbConnection?.connected).toBe(false);
    });

    it('should support cache pattern', async () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onStartup: async (ctx) => {
          ctx.cache = new Map();
          ctx.cache.set('initialized', true);
        },
        onShutdown: async (ctx) => {
          ctx.cache?.clear();
        }
      });

      server.addTool({
        name: 'get_cache',
        description: 'Get cache value',
        parameters: z.object({ key: z.string() }),
        execute: async (args, context) => {
          const cache = context?.mcp?.request_context?.lifespan_context?.cache;
          return cache ? cache.get(args.key) : undefined;
        }
      });

      await server.start({ transport: 'stdio' });

      const value = await server.executeToolDirect('get_cache', { key: 'initialized' });
      expect(value.content[0].text).toBe('true');
    });
  });

  describe('Error Handling', () => {
    it('should start server even if onStartup fails', async () => {
      let errorThrown = false;

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onStartup: async (ctx) => {
          errorThrown = true;
          throw new Error('Startup failed');
        }
      });

      // Should not throw
      await expect(server.start({ transport: 'stdio' })).resolves.not.toThrow();
      expect(errorThrown).toBe(true);
    });

    it('should stop server even if onShutdown fails', async () => {
      let errorThrown = false;

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onShutdown: async (ctx) => {
          errorThrown = true;
          throw new Error('Shutdown failed');
        }
      });

      await server.start({ transport: 'stdio' });

      // Should not throw
      await expect(server.stop()).resolves.not.toThrow();
      expect(errorThrown).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without any hooks', async () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0'
      });

      await expect(server.start({ transport: 'stdio' })).resolves.not.toThrow();
      await expect(server.stop()).resolves.not.toThrow();
    });

    it('should work with only onStartup', async () => {
      let called = false;

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onStartup: async (ctx) => {
          called = true;
        }
      });

      await server.start({ transport: 'stdio' });
      expect(called).toBe(true);
      await expect(server.stop()).resolves.not.toThrow();
    });

    it('should work with only onShutdown', async () => {
      let called = false;

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onShutdown: async (ctx) => {
          called = true;
        }
      });

      await server.start({ transport: 'stdio' });
      await server.stop();
      expect(called).toBe(true);
    });

    it('should not break existing servers', async () => {
      // Test that old server code still works
      server = new BuildMCPServer({
        name: 'legacy-server',
        version: '1.0.0',
        description: 'Old server without hooks'
      });

      server.addTool({
        name: 'legacy_tool',
        description: 'Legacy tool',
        parameters: z.object({}),
        execute: async () => 'works'
      });

      await server.start({ transport: 'stdio' });
      const result = await server.executeToolDirect('legacy_tool', {});
      expect(result.content[0].text).toBe('works');
    });
  });

  describe('Hook Execution Order', () => {
    it('should execute hooks in correct order', async () => {
      const executionOrder: string[] = [];

      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
        onStartup: async (ctx) => {
          executionOrder.push('startup');
          ctx.initialized = true;
        },
        onShutdown: async (ctx) => {
          executionOrder.push('shutdown');
          expect(ctx.initialized).toBe(true);
        }
      });

      await server.start({ transport: 'stdio' });
      executionOrder.push('running');
      await server.stop();

      expect(executionOrder).toEqual(['startup', 'running', 'shutdown']);
    });
  });
});
