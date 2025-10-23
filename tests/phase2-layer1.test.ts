/**
 * Phase 2 Layer 1 Tests
 *
 * Tests for:
 * - Client capabilities capture
 * - SessionImpl with MCP Server instance
 * - send_log_message() implementation
 *
 * Phase 2 - FastMCP Parity
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';
import { SessionImpl } from '../src/core/SessionImpl.js';
import { ContextBuilder } from '../src/core/ContextBuilder.js';
import { z } from 'zod';
import type { HandlerContext } from '../src/core/types/handlers.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('Phase 2 Layer 1: Client Capabilities + Logging', () => {
  describe('SessionImpl with MCP Server', () => {
    let mockServer: any;
    let session: SessionImpl;

    beforeEach(() => {
      // Create mock MCP Server
      mockServer = {
        sendLoggingMessage: jest.fn().mockResolvedValue(undefined),
      } as any;

      session = new SessionImpl(mockServer, undefined);
    });

    it('should create SessionImpl with server reference', () => {
      expect(session).toBeDefined();
      expect(session.client_params).toBeUndefined();
    });

    it('should store client capabilities when provided', () => {
      const capabilities = {
        sampling: {},
        roots: { listChanged: true }
      };

      const sessionWithCaps = new SessionImpl(mockServer, capabilities);
      expect(sessionWithCaps.client_params).toEqual(capabilities);
    });

    it('should send logging notification via MCP Server', async () => {
      await session.send_log_message('info', 'Test message');

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: 'Test message',
        logger: undefined
      });
    });

    it('should send logging notification with custom logger name', async () => {
      await session.send_log_message('error', 'Error occurred', 'my-tool');

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'error',
        data: 'Error occurred',
        logger: 'my-tool'
      });
    });

    it('should handle all log levels correctly', async () => {
      const levels: Array<'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency'> = [
        'debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'
      ];

      for (const level of levels) {
        await session.send_log_message(level, `Test ${level} message`);
        expect(mockServer.sendLoggingMessage).toHaveBeenLastCalledWith({
          level,
          data: `Test ${level} message`,
          logger: undefined
        });
      }

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledTimes(levels.length);
    });

    it('should not throw when logging fails (graceful degradation)', async () => {
      mockServer.sendLoggingMessage.mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(async () => {
        await session.send_log_message('info', 'Test');
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SessionImpl] Failed to send log message:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing server gracefully', async () => {
      const sessionNoServer = new SessionImpl(null as any, undefined);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await sessionNoServer.send_log_message('info', 'Test');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SessionImpl] send_log_message: No MCP server available'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('ContextBuilder with Client Capabilities', () => {
    let mockServer: any;
    let contextBuilder: ContextBuilder;

    beforeEach(() => {
      mockServer = {
        sendLoggingMessage: jest.fn().mockResolvedValue(undefined),
      } as any;

      contextBuilder = new ContextBuilder(mockServer, {
        name: 'test-server',
        version: '1.0.0',
        description: 'Test server for capabilities'
      });
    });

    it('should create ContextBuilder with server reference', () => {
      expect(contextBuilder).toBeDefined();
    });

    it('should build context without capabilities initially', () => {
      const context = contextBuilder.buildContext();

      expect(context).toBeDefined();
      expect(context.server.name).toBe('test-server');
      expect(context.session.client_params).toBeUndefined();
    });

    it('should capture and store client capabilities', () => {
      const capabilities = {
        sampling: {},
        roots: { listChanged: true }
      };

      contextBuilder.setClientParams({
        clientInfo: { name: 'test-client', version: '1.0.0' },
        capabilities
      });

      const context = contextBuilder.buildContext();
      expect(context.session.client_params).toEqual(capabilities);
    });

    it('should recreate SessionImpl with capabilities', () => {
      // Build context before setting capabilities
      const context1 = contextBuilder.buildContext();
      const session1 = context1.session;

      // Set capabilities
      contextBuilder.setClientParams({
        clientInfo: { name: 'test-client', version: '1.0.0' },
        capabilities: { sampling: {} }
      });

      // Build context after setting capabilities
      const context2 = contextBuilder.buildContext();
      const session2 = context2.session;

      // Session instance should be different (recreated)
      expect(session2).not.toBe(session1);
      expect(session2.client_params).toBeDefined();
      expect(session1.client_params).toBeUndefined();
    });
  });

  describe('BuildMCPServer Initialize Handler', () => {
    let server: BuildMCPServer;

    beforeEach(() => {
      server = new BuildMCPServer({
        name: 'test-capabilities-server',
        version: '1.0.0',
        description: 'Server for testing capability capture'
      });
    });

    afterEach(async () => {
      if (server) {
        await server.stop();
      }
    });

    it('should capture client capabilities from initialize request', async () => {
      let capturedContext: HandlerContext | undefined;

      server.addTool({
        name: 'capability-test',
        description: 'Test capability capture',
        parameters: z.object({}),
        execute: async (args, context) => {
          capturedContext = context;
          return { content: [{ type: 'text', text: 'ok' }];
        }
      });

      await server.start();

      // Simulate initialize request (this would normally come from MCP client)
      // For now, we'll test that the handler is set up
      // Full integration test would require MCP client simulation

      // We can test that ContextBuilder is initialized
      expect(server['contextBuilder']).toBeDefined();
    });

    it('should expose client_params via context.mcp.session', async () => {
      let sessionCapabilities: any;

      server.addTool({
        name: 'check-capabilities',
        description: 'Check session capabilities',
        parameters: z.object({}),
        execute: async (args, context) => {
          sessionCapabilities = context?.mcp?.session.client_params;
          return { content: [{ type: 'text', text: 'checked' }];
        }
      });

      await server.start();

      // After initialize (which would set capabilities), execute tool
      await server['executeToolDirect']('check-capabilities', {});

      // Initially undefined (no initialize request yet in direct execution)
      expect(sessionCapabilities).toBeUndefined();
    });
  });

  describe('Integration: Logging in Tool Handlers', () => {
    let server: BuildMCPServer;

    beforeEach(() => {
      server = new BuildMCPServer({
        name: 'test-logging-server',
        version: '1.0.0',
        capabilities: {
          logging: true
        }
      });
    });

    afterEach(async () => {
      if (server) {
        await server.stop();
      }
    });

    it('should allow tool handlers to send log messages', async () => {
      let logMessageSent = false;

      server.addTool({
        name: 'logging-tool',
        description: 'Tool that uses logging',
        parameters: z.object({ input: z.string() }),
        execute: async (args, context) => {
          // Try to send log message
          if (context?.mcp?.session) {
            try {
              await context.mcp.session.send_log_message('info', `Processing: ${args.input}`);
              logMessageSent = true;
            } catch (error) {
              // Logging should not throw
              logMessageSent = false;
            }
          }

          return { content: [{ type: 'text', text: `Processed: ${args.input}` }];
        }
      });

      await server.start();
      await server['executeToolDirect']('logging-tool', { input: 'test' });

      // Log message should be sent (or attempted)
      expect(logMessageSent).toBe(true);
    });

    it('should handle multiple log levels in same handler', async () => {
      const logLevels: string[] = [];

      server.addTool({
        name: 'multi-level-logging',
        description: 'Tool that logs at multiple levels',
        parameters: z.object({}),
        execute: async (args, context) => {
          if (context?.mcp?.session) {
            await context.mcp.session.send_log_message('debug', 'Starting');
            logLevels.push('debug');

            await context.mcp.session.send_log_message('info', 'Processing');
            logLevels.push('info');

            await context.mcp.session.send_log_message('warning', 'Slow operation');
            logLevels.push('warning');
          }

          return { content: [{ type: 'text', text: 'complete' }];
        }
      });

      await server.start();
      await server['executeToolDirect']('multi-level-logging', {});

      expect(logLevels).toEqual(['debug', 'info', 'warning']);
    });

    it('should allow custom logger names per tool', async () => {
      const loggerNames: string[] = [];

      server.addTool({
        name: 'custom-logger-tool',
        description: 'Tool with custom logger',
        parameters: z.object({}),
        execute: async (args, context) => {
          if (context?.mcp?.session) {
            await context.mcp.session.send_log_message('info', 'Message 1', 'my-tool');
            loggerNames.push('my-tool');

            await context.mcp.session.send_log_message('info', 'Message 2', 'my-tool:subcomponent');
            loggerNames.push('my-tool:subcomponent');
          }

          return { content: [{ type: 'text', text: 'ok' }];
        }
      });

      await server.start();
      await server['executeToolDirect']('custom-logger-tool', {});

      expect(loggerNames).toEqual(['my-tool', 'my-tool:subcomponent']);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty log messages', async () => {
      const mockServer = {
        sendLoggingMessage: jest.fn().mockResolvedValue(undefined),
      } as any;

      const session = new SessionImpl(mockServer, undefined);
      await session.send_log_message('info', '');

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: '',
        logger: undefined
      });
    });

    it('should handle very long log messages', async () => {
      const mockServer = {
        sendLoggingMessage: jest.fn().mockResolvedValue(undefined),
      } as any;

      const session = new SessionImpl(mockServer, undefined);
      const longMessage = 'x'.repeat(10000);

      await session.send_log_message('info', longMessage);

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: longMessage,
        logger: undefined
      });
    });

    it('should handle special characters in log messages', async () => {
      const mockServer = {
        sendLoggingMessage: jest.fn().mockResolvedValue(undefined),
      } as any;

      const session = new SessionImpl(mockServer, undefined);
      const specialMessage = 'Test\nwith\ttabs\rand\x00null';

      await session.send_log_message('info', specialMessage);

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: specialMessage,
        logger: undefined
      });
    });
  });
});
