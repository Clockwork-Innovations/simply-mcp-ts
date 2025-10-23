/**
 * Phase 2 Layer 3 Tests
 *
 * Tests for:
 * - send_progress_notification() - Progress updates during long operations
 * - create_message() - LLM sampling for client interaction
 *
 * Phase 2 - FastMCP Parity
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';
import { SessionImpl } from '../src/core/SessionImpl.js';
import { ContextBuilder } from '../src/core/ContextBuilder.js';
import { z } from 'zod';
import type { HandlerContext } from '../src/core/types/handlers.js';

describe('Phase 2 Layer 3: Progress Notifications & Sampling', () => {
  describe('SessionImpl - Progress Notifications', () => {
    let mockServer: any;
    let session: SessionImpl;

    beforeEach(() => {
      mockServer = {
        notification: jest.fn(),
      } as any;

      session = new SessionImpl(mockServer, undefined);
    });

    it('should send progress notification with all parameters', async () => {
      await session.send_progress_notification('token-123', 50, 100, 'Processing...');

      expect(mockServer.notification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: 'token-123',
          progress: 50,
          total: 100,
          message: 'Processing...'
        }
      });
    });

    it('should send progress notification with numeric token', async () => {
      await session.send_progress_notification(42, 10, 20, 'Step 10/20');

      expect(mockServer.notification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: 42,
          progress: 10,
          total: 20,
          message: 'Step 10/20'
        }
      });
    });

    it('should send progress notification without total', async () => {
      await session.send_progress_notification('token-456', 75, undefined, 'Still working...');

      expect(mockServer.notification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: 'token-456',
          progress: 75,
          total: undefined,
          message: 'Still working...'
        }
      });
    });

    it('should send progress notification without message', async () => {
      await session.send_progress_notification('token-789', 25, 50);

      expect(mockServer.notification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: 'token-789',
          progress: 25,
          total: 50,
          message: undefined
        }
      });
    });

    it('should send progress notification with only required parameters', async () => {
      await session.send_progress_notification('minimal-token', 100);

      expect(mockServer.notification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: 'minimal-token',
          progress: 100,
          total: undefined,
          message: undefined
        }
      });
    });

    it('should send multiple progress updates sequentially', async () => {
      await session.send_progress_notification('seq-token', 0, 100, 'Starting');
      await session.send_progress_notification('seq-token', 50, 100, 'Halfway');
      await session.send_progress_notification('seq-token', 100, 100, 'Complete');

      expect(mockServer.notification).toHaveBeenCalledTimes(3);
      expect(mockServer.notification).toHaveBeenNthCalledWith(1, {
        method: 'notifications/progress',
        params: { progressToken: 'seq-token', progress: 0, total: 100, message: 'Starting' }
      });
      expect(mockServer.notification).toHaveBeenNthCalledWith(2, {
        method: 'notifications/progress',
        params: { progressToken: 'seq-token', progress: 50, total: 100, message: 'Halfway' }
      });
      expect(mockServer.notification).toHaveBeenNthCalledWith(3, {
        method: 'notifications/progress',
        params: { progressToken: 'seq-token', progress: 100, total: 100, message: 'Complete' }
      });
    });

    it('should not throw when progress notification fails (graceful degradation)', async () => {
      mockServer.notification.mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(async () => {
        await session.send_progress_notification('fail-token', 50, 100);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SessionImpl] Failed to send progress notification:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing server gracefully', async () => {
      const sessionNoServer = new SessionImpl(null as any, undefined);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await sessionNoServer.send_progress_notification('no-server', 50);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SessionImpl] send_progress_notification: No MCP server available'
      );

      consoleSpy.mockRestore();
    });

    it('should handle progress values at boundaries', async () => {
      // Zero progress
      await session.send_progress_notification('boundary-1', 0, 100);
      expect(mockServer.notification).toHaveBeenLastCalledWith({
        method: 'notifications/progress',
        params: { progressToken: 'boundary-1', progress: 0, total: 100, message: undefined }
      });

      // Maximum progress equals total
      await session.send_progress_notification('boundary-2', 100, 100);
      expect(mockServer.notification).toHaveBeenLastCalledWith({
        method: 'notifications/progress',
        params: { progressToken: 'boundary-2', progress: 100, total: 100, message: undefined }
      });

      // Large numbers
      await session.send_progress_notification('boundary-3', 999999, 1000000);
      expect(mockServer.notification).toHaveBeenLastCalledWith({
        method: 'notifications/progress',
        params: { progressToken: 'boundary-3', progress: 999999, total: 1000000, message: undefined }
      });
    });
  });

  describe('SessionImpl - LLM Sampling (create_message)', () => {
    let mockServer: any;
    let session: SessionImpl;

    beforeEach(() => {
      mockServer = {
        createMessage: jest.fn(),
      } as any;

      // Session with sampling capability
      session = new SessionImpl(mockServer, {
        sampling: {}
      });
    });

    it('should throw when server is not available', async () => {
      const sessionNoServer = new SessionImpl(null as any, { sampling: {} });

      await expect(async () => {
        await sessionNoServer.create_message([
          { role: 'user', content: { type: 'text', text: 'Hello' } }
        ]);
      }).rejects.toThrow('[SessionImpl] create_message: No MCP server available');
    });

    it('should throw when client does not support sampling', async () => {
      const sessionNoSampling = new SessionImpl(mockServer, undefined);

      await expect(async () => {
        await sessionNoSampling.create_message([
          { role: 'user', content: { type: 'text', text: 'Hello' } }
        ]);
      }).rejects.toThrow('create_message() requires client sampling capability');
    });

    it('should call createMessage with correct parameters', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'claude-3-5-sonnet',
        role: 'assistant',
        content: { type: 'text', text: 'Hello! How can I help you?' },
        stopReason: 'endTurn'
      });

      const messages = [
        { role: 'user' as const, content: { type: 'text' as const, text: 'Hello' } }
      ];

      const result = await session.create_message(messages);

      expect(mockServer.createMessage).toHaveBeenCalledWith({
        messages: [
          { role: 'user', content: { type: 'text', text: 'Hello' } }
        ]
      });

      expect(result).toEqual({
        model: 'claude-3-5-sonnet',
        role: 'assistant',
        content: { type: 'text', text: 'Hello! How can I help you?' },
        stopReason: 'endTurn'
      });
    });

    it('should pass all sampling options to createMessage', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'claude-3-5-sonnet',
        role: 'assistant',
        content: { type: 'text', text: 'Response with options' },
        stopReason: 'endTurn'
      });

      const messages = [
        { role: 'user' as const, content: { type: 'text' as const, text: 'Test' } }
      ];

      const options = {
        maxTokens: 1000,
        temperature: 0.7,
        stopSequences: ['STOP', 'END'],
        systemPrompt: 'You are a helpful assistant',
        includeContext: 'thisServer' as const,
        modelPreferences: {
          hints: [{ name: 'claude-3-5-sonnet' }],
          costPriority: 0.5,
          speedPriority: 0.5,
          intelligencePriority: 1.0
        }
      };

      await session.create_message(messages, options);

      expect(mockServer.createMessage).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: { type: 'text', text: 'Test' } }],
        maxTokens: 1000,
        temperature: 0.7,
        stopSequences: ['STOP', 'END'],
        systemPrompt: 'You are a helpful assistant',
        includeContext: 'thisServer',
        modelPreferences: {
          hints: [{ name: 'claude-3-5-sonnet' }],
          costPriority: 0.5,
          speedPriority: 0.5,
          intelligencePriority: 1.0
        }
      });
    });

    it('should handle multiple messages in conversation', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'claude-3-5-sonnet',
        role: 'assistant',
        content: { type: 'text', text: 'Continuing conversation' },
        stopReason: 'endTurn'
      });

      const messages = [
        { role: 'user' as const, content: { type: 'text' as const, text: 'First message' } },
        { role: 'assistant' as const, content: { type: 'text' as const, text: 'First response' } },
        { role: 'user' as const, content: { type: 'text' as const, text: 'Second message' } }
      ];

      await session.create_message(messages);

      expect(mockServer.createMessage).toHaveBeenCalledWith({
        messages: [
          { role: 'user', content: { type: 'text', text: 'First message' } },
          { role: 'assistant', content: { type: 'text', text: 'First response' } },
          { role: 'user', content: { type: 'text', text: 'Second message' } }
        ]
      });
    });

    it('should propagate errors from MCP SDK', async () => {
      mockServer.createMessage.mockRejectedValue(new Error('Sampling failed'));

      await expect(async () => {
        await session.create_message([
          { role: 'user' as const, content: { type: 'text' as const, text: 'Hello' } }
        ]);
      }).rejects.toThrow('Sampling failed');
    });

    it('should handle different stop reasons', async () => {
      const stopReasons = ['endTurn', 'stopSequence', 'maxTokens'] as const;

      for (const stopReason of stopReasons) {
        mockServer.createMessage.mockResolvedValue({
          model: 'test-model',
          role: 'assistant',
          content: { type: 'text', text: `Stopped by ${stopReason}` },
          stopReason
        });

        const result = await session.create_message([
          { role: 'user' as const, content: { type: 'text' as const, text: 'Test' } }
        ]);

        expect(result.stopReason).toBe(stopReason);
      }
    });

    it('should remove undefined options before calling MCP SDK', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'test-model',
        role: 'assistant',
        content: { type: 'text', text: 'Response' },
        stopReason: 'endTurn'
      });

      await session.create_message(
        [{ role: 'user' as const, content: { type: 'text' as const, text: 'Test' } }],
        { maxTokens: 100, temperature: undefined, stopSequences: undefined }
      );

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs).toHaveProperty('maxTokens', 100);
      expect(callArgs).not.toHaveProperty('temperature');
      expect(callArgs).not.toHaveProperty('stopSequences');
    });
  });

  describe('BuildMCPServer Integration - Progress', () => {
    let server: BuildMCPServer;

    afterEach(async () => {
      if (server) {
        await server.stop();
      }
    });

    it('should allow tools to send progress notifications', async () => {
      server = new BuildMCPServer({
        name: 'test-progress-server',
        version: '1.0.0'
      });

      let progressSent = false;

      server.addTool({
        name: 'long-running-tool',
        description: 'Tool that sends progress updates',
        parameters: z.object({ count: z.number() }),
        execute: async (args, context) => {
          if (context?.mcp?.session) {
            try {
              await context.mcp.session.send_progress_notification(
                'progress-token-1',
                args.count,
                100,
                `Processing ${args.count}/100`
              );
              progressSent = true;
            } catch (error) {
              // Should not throw
            }
          }
          return { content: [{ type: 'text', text: 'completed' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('long-running-tool', { count: 50 });

      expect(progressSent).toBe(true);
    });

    it('should allow tools to send multiple progress updates', async () => {
      server = new BuildMCPServer({
        name: 'test-multi-progress-server',
        version: '1.0.0'
      });

      const progressUpdates: number[] = [];

      server.addTool({
        name: 'incremental-tool',
        description: 'Tool with multiple progress steps',
        parameters: z.object({}),
        execute: async (args, context) => {
          if (context?.mcp?.session) {
            for (let i = 0; i <= 100; i += 25) {
              await context.mcp.session.send_progress_notification(
                'incremental',
                i,
                100,
                `Step ${i}%`
              );
              progressUpdates.push(i);
            }
          }
          return { content: [{ type: 'text', text: 'done' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('incremental-tool', {});

      expect(progressUpdates).toEqual([0, 25, 50, 75, 100]);
    });
  });

  describe('BuildMCPServer Integration - Sampling', () => {
    let server: BuildMCPServer;

    afterEach(async () => {
      if (server) {
        await server.stop();
      }
    });

    it('should provide create_message in tool context', async () => {
      server = new BuildMCPServer({
        name: 'test-sampling-server',
        version: '1.0.0'
      });

      let createMessageAvailable = false;

      server.addTool({
        name: 'check-sampling',
        description: 'Check if sampling is available',
        parameters: z.object({}),
        execute: async (args, context) => {
          createMessageAvailable = typeof context?.mcp?.session.create_message === 'function';
          return { content: [{ type: 'text', text: 'checked' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('check-sampling', {});

      expect(createMessageAvailable).toBe(true);
    });

    it('should throw when sampling capability not available', async () => {
      server = new BuildMCPServer({
        name: 'test-no-sampling-server',
        version: '1.0.0'
      });

      let errorThrown = false;

      server.addTool({
        name: 'try-sampling',
        description: 'Try to use sampling without capability',
        parameters: z.object({}),
        execute: async (args, context) => {
          try {
            await context?.mcp?.session.create_message([
              { role: 'user', content: { type: 'text', text: 'Test' } }
            ]);
          } catch (error) {
            errorThrown = true;
          }
          return { content: [{ type: 'text', text: 'attempted' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('try-sampling', {});

      expect(errorThrown).toBe(true);
    });
  });

  describe('Edge Cases - Progress Notifications', () => {
    it('should handle empty progress message', async () => {
      const mockServer = { notification: jest.fn() } as any;
      const session = new SessionImpl(mockServer, undefined);

      await session.send_progress_notification('token', 50, 100, '');

      expect(mockServer.notification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: 'token',
          progress: 50,
          total: 100,
          message: ''
        }
      });
    });

    it('should handle very long progress messages', async () => {
      const mockServer = { notification: jest.fn() } as any;
      const session = new SessionImpl(mockServer, undefined);

      const longMessage = 'Progress: ' + 'x'.repeat(10000);
      await session.send_progress_notification('token', 50, 100, longMessage);

      expect(mockServer.notification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: 'token',
          progress: 50,
          total: 100,
          message: longMessage
        }
      });
    });

    it('should handle special characters in progress token', async () => {
      const mockServer = { notification: jest.fn() } as any;
      const session = new SessionImpl(mockServer, undefined);

      const specialToken = 'token-with-🎉-emoji-and-spaces';
      await session.send_progress_notification(specialToken, 50);

      expect(mockServer.notification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: specialToken,
          progress: 50,
          total: undefined,
          message: undefined
        }
      });
    });
  });
});
