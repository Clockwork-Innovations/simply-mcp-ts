/**
 * Phase 2 Layer 2 Tests
 *
 * Tests for:
 * - send_resource_updated(uri: string)
 * - send_resource_list_changed()
 * - send_tool_list_changed()
 * - send_prompt_list_changed()
 *
 * Phase 2 - FastMCP Parity
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';
import { SessionImpl } from '../src/core/SessionImpl.js';
import { ContextBuilder } from '../src/core/ContextBuilder.js';
import { z } from 'zod';
import type { HandlerContext } from '../src/core/types/handlers.js';

describe('Phase 2 Layer 2: List Changed Notifications', () => {
  describe('SessionImpl - Resource Notifications', () => {
    let mockServer: any;
    let session: SessionImpl;

    beforeEach(() => {
      // Create mock MCP Server with notification methods
      mockServer = {
        sendLoggingMessage: jest.fn(),
        sendResourceUpdated: jest.fn(),
        sendResourceListChanged: jest.fn(),
        sendToolListChanged: jest.fn(),
        sendPromptListChanged: jest.fn(),
      } as any;

      session = new SessionImpl(mockServer, undefined);
    });

    it('should send resource updated notification with URI', async () => {
      const testUri = 'file:///path/to/resource.txt';
      await session.send_resource_updated(testUri);

      expect(mockServer.sendResourceUpdated).toHaveBeenCalledWith({
        uri: testUri
      });
      expect(mockServer.sendResourceUpdated).toHaveBeenCalledTimes(1);
    });

    it('should send resource list changed notification', async () => {
      await session.send_resource_list_changed();

      expect(mockServer.sendResourceListChanged).toHaveBeenCalledWith();
      expect(mockServer.sendResourceListChanged).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple resource URIs', async () => {
      const uris = [
        'file:///resource1.txt',
        'file:///resource2.txt',
        'https://example.com/api/data',
        'resource://internal/state'
      ];

      for (const uri of uris) {
        await session.send_resource_updated(uri);
      }

      expect(mockServer.sendResourceUpdated).toHaveBeenCalledTimes(4);
      uris.forEach(uri => {
        expect(mockServer.sendResourceUpdated).toHaveBeenCalledWith({ uri });
      });
    });

    it('should handle special characters in URIs', async () => {
      const specialUris = [
        'file:///path/with spaces/resource.txt',
        'file:///path/with%20encoding/resource.txt',
        'https://example.com/resource?param=value&other=123',
        'resource://internal/état/données'
      ];

      for (const uri of specialUris) {
        await session.send_resource_updated(uri);
      }

      expect(mockServer.sendResourceUpdated).toHaveBeenCalledTimes(4);
    });

    it('should not throw when resource updated fails (graceful degradation)', async () => {
      mockServer.sendResourceUpdated.mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(async () => {
        await session.send_resource_updated('file:///test.txt');
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SessionImpl] Failed to send resource updated notification:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should not throw when resource list changed fails (graceful degradation)', async () => {
      mockServer.sendResourceListChanged.mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(async () => {
        await session.send_resource_list_changed();
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SessionImpl] Failed to send resource list changed notification:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing server for resource notifications', async () => {
      const sessionNoServer = new SessionImpl(null as any, undefined);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await sessionNoServer.send_resource_updated('file:///test.txt');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SessionImpl] send_resource_updated: No MCP server available'
      );

      await sessionNoServer.send_resource_list_changed();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SessionImpl] send_resource_list_changed: No MCP server available'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('SessionImpl - Tool Notifications', () => {
    let mockServer: any;
    let session: SessionImpl;

    beforeEach(() => {
      mockServer = {
        sendLoggingMessage: jest.fn(),
        sendToolListChanged: jest.fn(),
      } as any;

      session = new SessionImpl(mockServer, undefined);
    });

    it('should send tool list changed notification', async () => {
      await session.send_tool_list_changed();

      expect(mockServer.sendToolListChanged).toHaveBeenCalledWith();
      expect(mockServer.sendToolListChanged).toHaveBeenCalledTimes(1);
    });

    it('should send multiple tool list changed notifications', async () => {
      await session.send_tool_list_changed();
      await session.send_tool_list_changed();
      await session.send_tool_list_changed();

      expect(mockServer.sendToolListChanged).toHaveBeenCalledTimes(3);
    });

    it('should not throw when tool list changed fails (graceful degradation)', async () => {
      mockServer.sendToolListChanged.mockRejectedValue(new Error('Connection lost'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(async () => {
        await session.send_tool_list_changed();
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SessionImpl] Failed to send tool list changed notification:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing server for tool notifications', async () => {
      const sessionNoServer = new SessionImpl(null as any, undefined);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await sessionNoServer.send_tool_list_changed();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SessionImpl] send_tool_list_changed: No MCP server available'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('SessionImpl - Prompt Notifications', () => {
    let mockServer: any;
    let session: SessionImpl;

    beforeEach(() => {
      mockServer = {
        sendLoggingMessage: jest.fn(),
        sendPromptListChanged: jest.fn(),
      } as any;

      session = new SessionImpl(mockServer, undefined);
    });

    it('should send prompt list changed notification', async () => {
      await session.send_prompt_list_changed();

      expect(mockServer.sendPromptListChanged).toHaveBeenCalledWith();
      expect(mockServer.sendPromptListChanged).toHaveBeenCalledTimes(1);
    });

    it('should send multiple prompt list changed notifications', async () => {
      await session.send_prompt_list_changed();
      await session.send_prompt_list_changed();

      expect(mockServer.sendPromptListChanged).toHaveBeenCalledTimes(2);
    });

    it('should not throw when prompt list changed fails (graceful degradation)', async () => {
      mockServer.sendPromptListChanged.mockRejectedValue(new Error('Timeout'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(async () => {
        await session.send_prompt_list_changed();
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SessionImpl] Failed to send prompt list changed notification:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing server for prompt notifications', async () => {
      const sessionNoServer = new SessionImpl(null as any, undefined);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await sessionNoServer.send_prompt_list_changed();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SessionImpl] send_prompt_list_changed: No MCP server available'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Integration: All Notifications Together', () => {
    let mockServer: any;
    let session: SessionImpl;

    beforeEach(() => {
      mockServer = {
        sendLoggingMessage: jest.fn(),
        sendResourceUpdated: jest.fn(),
        sendResourceListChanged: jest.fn(),
        sendToolListChanged: jest.fn(),
        sendPromptListChanged: jest.fn(),
      } as any;

      session = new SessionImpl(mockServer, undefined);
    });

    it('should send all notification types successfully', async () => {
      await session.send_resource_updated('file:///test.txt');
      await session.send_resource_list_changed();
      await session.send_tool_list_changed();
      await session.send_prompt_list_changed();

      expect(mockServer.sendResourceUpdated).toHaveBeenCalledTimes(1);
      expect(mockServer.sendResourceListChanged).toHaveBeenCalledTimes(1);
      expect(mockServer.sendToolListChanged).toHaveBeenCalledTimes(1);
      expect(mockServer.sendPromptListChanged).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed success and failure gracefully', async () => {
      // Make some succeed and some fail
      mockServer.sendResourceUpdated.mockResolvedValue(undefined);
      mockServer.sendResourceListChanged.mockRejectedValue(new Error('Fail 1'));
      mockServer.sendToolListChanged.mockResolvedValue(undefined);
      mockServer.sendPromptListChanged.mockRejectedValue(new Error('Fail 2'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await session.send_resource_updated('file:///test.txt');
      await session.send_resource_list_changed();
      await session.send_tool_list_changed();
      await session.send_prompt_list_changed();

      // All should complete without throwing
      expect(mockServer.sendResourceUpdated).toHaveBeenCalledTimes(1);
      expect(mockServer.sendResourceListChanged).toHaveBeenCalledTimes(1);
      expect(mockServer.sendToolListChanged).toHaveBeenCalledTimes(1);
      expect(mockServer.sendPromptListChanged).toHaveBeenCalledTimes(1);

      // Failures should be logged
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it('should maintain independent error handling for each notification type', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Test each notification type failing independently
      mockServer.sendResourceUpdated.mockRejectedValue(new Error('Resource error'));
      await session.send_resource_updated('file:///test.txt');
      expect(consoleSpy).toHaveBeenLastCalledWith(
        '[SessionImpl] Failed to send resource updated notification:',
        expect.any(Error)
      );

      mockServer.sendResourceListChanged.mockRejectedValue(new Error('Resource list error'));
      await session.send_resource_list_changed();
      expect(consoleSpy).toHaveBeenLastCalledWith(
        '[SessionImpl] Failed to send resource list changed notification:',
        expect.any(Error)
      );

      mockServer.sendToolListChanged.mockRejectedValue(new Error('Tool error'));
      await session.send_tool_list_changed();
      expect(consoleSpy).toHaveBeenLastCalledWith(
        '[SessionImpl] Failed to send tool list changed notification:',
        expect.any(Error)
      );

      mockServer.sendPromptListChanged.mockRejectedValue(new Error('Prompt error'));
      await session.send_prompt_list_changed();
      expect(consoleSpy).toHaveBeenLastCalledWith(
        '[SessionImpl] Failed to send prompt list changed notification:',
        expect.any(Error)
      );

      expect(consoleSpy).toHaveBeenCalledTimes(4);
      consoleSpy.mockRestore();
    });
  });

  describe('BuildMCPServer Integration', () => {
    let server: BuildMCPServer;

    afterEach(async () => {
      if (server) {
        await server.stop();
      }
    });

    it('should allow tools to send resource notifications', async () => {
      server = new BuildMCPServer({
        name: 'test-resource-notification-server',
        version: '1.0.0'
      });

      let resourceUpdateSent = false;
      let resourceListChangeSent = false;

      server.addTool({
        name: 'notify-resource',
        description: 'Tool that sends resource notifications',
        parameters: z.object({ uri: z.string() }),
        execute: async (args, context) => {
          if (context?.mcp?.session) {
            try {
              await context.mcp.session.send_resource_updated(args.uri);
              resourceUpdateSent = true;

              await context.mcp.session.send_resource_list_changed();
              resourceListChangeSent = true;
            } catch (error) {
              // Should not throw
            }
          }
          return { content: [{ type: 'text', text: 'notified' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('notify-resource', { uri: 'file:///test.txt' });

      expect(resourceUpdateSent).toBe(true);
      expect(resourceListChangeSent).toBe(true);
    });

    it('should allow tools to send tool list changed notifications', async () => {
      server = new BuildMCPServer({
        name: 'test-tool-notification-server',
        version: '1.0.0'
      });

      let toolListChangeSent = false;

      server.addTool({
        name: 'notify-tool',
        description: 'Tool that sends tool notifications',
        parameters: z.object({}),
        execute: async (args, context) => {
          if (context?.mcp?.session) {
            try {
              await context.mcp.session.send_tool_list_changed();
              toolListChangeSent = true;
            } catch (error) {
              // Should not throw
            }
          }
          return { content: [{ type: 'text', text: 'notified' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('notify-tool', {});

      expect(toolListChangeSent).toBe(true);
    });

    it('should allow tools to send prompt list changed notifications', async () => {
      server = new BuildMCPServer({
        name: 'test-prompt-notification-server',
        version: '1.0.0'
      });

      let promptListChangeSent = false;

      server.addTool({
        name: 'notify-prompt',
        description: 'Tool that sends prompt notifications',
        parameters: z.object({}),
        execute: async (args, context) => {
          if (context?.mcp?.session) {
            try {
              await context.mcp.session.send_prompt_list_changed();
              promptListChangeSent = true;
            } catch (error) {
              // Should not throw
            }
          }
          return { content: [{ type: 'text', text: 'notified' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('notify-prompt', {});

      expect(promptListChangeSent).toBe(true);
    });

    it('should allow tools to send all notification types', async () => {
      server = new BuildMCPServer({
        name: 'test-all-notifications-server',
        version: '1.0.0'
      });

      const sentNotifications: string[] = [];

      server.addTool({
        name: 'notify-all',
        description: 'Tool that sends all notifications',
        parameters: z.object({}),
        execute: async (args, context) => {
          if (context?.mcp?.session) {
            await context.mcp.session.send_resource_updated('file:///dynamic.txt');
            sentNotifications.push('resource_updated');

            await context.mcp.session.send_resource_list_changed();
            sentNotifications.push('resource_list_changed');

            await context.mcp.session.send_tool_list_changed();
            sentNotifications.push('tool_list_changed');

            await context.mcp.session.send_prompt_list_changed();
            sentNotifications.push('prompt_list_changed');
          }
          return { content: [{ type: 'text', text: 'all sent' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('notify-all', {});

      expect(sentNotifications).toEqual([
        'resource_updated',
        'resource_list_changed',
        'tool_list_changed',
        'prompt_list_changed'
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty URI string', async () => {
      const mockServer = {
        sendResourceUpdated: jest.fn(),
      } as any;

      const session = new SessionImpl(mockServer, undefined);
      await session.send_resource_updated('');

      expect(mockServer.sendResourceUpdated).toHaveBeenCalledWith({ uri: '' });
    });

    it('should handle very long URIs', async () => {
      const mockServer = {
        sendResourceUpdated: jest.fn(),
      } as any;

      const session = new SessionImpl(mockServer, undefined);
      const longUri = 'file:///' + 'a'.repeat(10000) + '.txt';

      await session.send_resource_updated(longUri);

      expect(mockServer.sendResourceUpdated).toHaveBeenCalledWith({ uri: longUri });
    });

    it('should handle concurrent notifications', async () => {
      const mockServer = {
        sendResourceUpdated: jest.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 10))
        ),
        sendResourceListChanged: jest.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 10))
        ),
        sendToolListChanged: jest.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 10))
        ),
        sendPromptListChanged: jest.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 10))
        ),
      } as any;

      const session = new SessionImpl(mockServer, undefined);

      // Send all notifications concurrently
      await Promise.all([
        session.send_resource_updated('file:///test1.txt'),
        session.send_resource_updated('file:///test2.txt'),
        session.send_resource_list_changed(),
        session.send_tool_list_changed(),
        session.send_prompt_list_changed()
      ]);

      expect(mockServer.sendResourceUpdated).toHaveBeenCalledTimes(2);
      expect(mockServer.sendResourceListChanged).toHaveBeenCalledTimes(1);
      expect(mockServer.sendToolListChanged).toHaveBeenCalledTimes(1);
      expect(mockServer.sendPromptListChanged).toHaveBeenCalledTimes(1);
    });
  });
});
