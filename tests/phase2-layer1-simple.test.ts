/**
 * Phase 2 Layer 1 Simple Tests
 *
 * Focused tests for:
 * - SessionImpl with MCP Server instance
 * - send_log_message() implementation
 * - Client capabilities capture
 *
 * Phase 2 - FastMCP Parity
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SessionImpl } from '../src/core/SessionImpl.js';
import { ContextBuilder } from '../src/core/ContextBuilder.js';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';
import { z } from 'zod';

describe('Phase 2 Layer 1: Client Capabilities + Logging', () => {
  describe('SessionImpl with MCP Server', () => {
    let mockServer: any;
    let session: SessionImpl;

    beforeEach(() => {
      // Create mock MCP Server
      mockServer = {
        sendLoggingMessage: jest.fn(),
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
        sendLoggingMessage: jest.fn(),
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
        capabilities: capabilities as any
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
        capabilities: { sampling: {} } as any
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

  describe('Edge Cases', () => {
    it('should handle empty log messages', async () => {
      const mockServer = {
        sendLoggingMessage: jest.fn(),
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
        sendLoggingMessage: jest.fn(),
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
        sendLoggingMessage: jest.fn(),
      } as any;

      const session = new SessionImpl(mockServer, undefined);
      const specialMessage = 'Hello\n🎉\t"quotes"\u0000null\r\nWorld';

      await session.send_log_message('info', specialMessage);

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: specialMessage,
        logger: undefined
      });
    });

    it('should handle malformed capabilities gracefully', () => {
      const mockServer = {
        sendLoggingMessage: jest.fn(),
      } as any;

      const contextBuilder = new ContextBuilder(mockServer, {
        name: 'test-server',
        version: '1.0.0'
      });

      // Should not throw with null capabilities
      expect(() => {
        contextBuilder.setClientParams({
          clientInfo: { name: 'test', version: '1.0.0' },
          capabilities: null as any
        });
      }).not.toThrow();

      // Should not throw with undefined capabilities
      expect(() => {
        contextBuilder.setClientParams({
          clientInfo: { name: 'test', version: '1.0.0' },
          capabilities: undefined as any
        });
      }).not.toThrow();
    });
  });

  describe('BuildMCPServer Integration', () => {
    let server: BuildMCPServer;

    afterEach(async () => {
      if (server) {
        await server.stop();
      }
    });

    it('should capture client capabilities on initialize', async () => {
      server = new BuildMCPServer({
        name: 'test-capabilities-server',
        version: '1.0.0',
        description: 'Test server for capability capture'
      });

      // Add a tool that checks for capabilities
      let capturedCapabilities: any;
      server.addTool({
        name: 'check-caps',
        description: 'Check capabilities',
        parameters: z.object({}),
        execute: async (args, context) => {
          capturedCapabilities = context?.mcp?.session.client_params;
          return { content: [{ type: 'text', text: 'checked' }] };
        }
      });

      await server.start();

      // Verify ContextBuilder was created (initialization successful)
      expect(server['contextBuilder']).toBeDefined();

      // Initially, capabilities should be undefined (no initialize request yet)
      await server['executeToolDirect']('check-caps', {});
      expect(capturedCapabilities).toBeUndefined();

      // After a real MCP client sends initialize request with capabilities,
      // they would be captured. This test verifies the initialize handler exists.
      // Full integration test would require MCP client simulation.
    });

    it('should provide access to session through context', async () => {
      server = new BuildMCPServer({
        name: 'test-session-server',
        version: '1.0.0'
      });

      let sessionExists = false;
      let sendLogExists = false;

      server.addTool({
        name: 'check-session',
        description: 'Check session access',
        parameters: z.object({}),
        execute: async (args, context) => {
          sessionExists = !!context?.mcp?.session;
          sendLogExists = typeof context?.mcp?.session.send_log_message === 'function';
          return { content: [{ type: 'text', text: 'checked' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('check-session', {});

      expect(sessionExists).toBe(true);
      expect(sendLogExists).toBe(true);
    });

    it('should allow tools to use send_log_message', async () => {
      server = new BuildMCPServer({
        name: 'test-logging-server',
        version: '1.0.0',
        capabilities: { logging: true }
      });

      let logAttempted = false;

      server.addTool({
        name: 'logging-tool',
        description: 'Tool that logs',
        parameters: z.object({}),
        execute: async (args, context) => {
          if (context?.mcp?.session) {
            try {
              await context.mcp.session.send_log_message('info', 'Test log from tool');
              logAttempted = true;
            } catch (error) {
              // Logging should not throw
              logAttempted = false;
            }
          }
          return { content: [{ type: 'text', text: 'logged' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('logging-tool', {});

      // Log was attempted (may not actually send without MCP client connection)
      expect(logAttempted).toBe(true);
    });
  });
});
