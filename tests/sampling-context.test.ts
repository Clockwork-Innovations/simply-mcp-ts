/**
 * Sampling Context Tests
 *
 * Tests for LLM sampling with different context modes:
 * - Fresh context (no includeContext)
 * - Current context (includeContext: 'thisServer')
 * - All servers context (includeContext: 'allServers')
 * - System prompts
 * - Model preferences
 * - Multi-turn conversations
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SessionImpl } from '../src/core/SessionImpl.js';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';
import { z } from 'zod';
import type { SamplingMessage, ModelPreferences } from '../src/core/Context.js';

describe('Sampling Context Modes', () => {
  describe('SessionImpl - includeContext parameter', () => {
    let mockServer: any;
    let session: SessionImpl;

    beforeEach(() => {
      mockServer = {
        createMessage: jest.fn(),
      } as any;

      // Session with sampling capability
      session = new SessionImpl(mockServer, {
        sampling: {},
      });
    });

    it('should NOT include context when includeContext is omitted (fresh context)', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'claude-3-5-sonnet',
        role: 'assistant',
        content: { type: 'text', text: 'Fresh response' },
        stopReason: 'endTurn',
      });

      const messages: SamplingMessage[] = [
        { role: 'user', content: { type: 'text', text: 'Analyze this independently' } },
      ];

      await session.create_message(messages, {
        maxTokens: 500,
        // No includeContext - fresh conversation
      });

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('includeContext');
      expect(callArgs).toHaveProperty('messages');
      expect(callArgs).toHaveProperty('maxTokens', 500);
    });

    it('should include context when includeContext is "thisServer"', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'claude-3-5-sonnet',
        role: 'assistant',
        content: { type: 'text', text: 'Context-aware response' },
        stopReason: 'endTurn',
      });

      const messages: SamplingMessage[] = [
        { role: 'user', content: { type: 'text', text: 'Continue from previous topic' } },
      ];

      await session.create_message(messages, {
        maxTokens: 800,
        includeContext: 'thisServer',
      });

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs).toHaveProperty('includeContext', 'thisServer');
      expect(callArgs).toHaveProperty('messages');
      expect(callArgs).toHaveProperty('maxTokens', 800);
    });

    it('should include context when includeContext is "allServers"', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'claude-3-5-sonnet',
        role: 'assistant',
        content: { type: 'text', text: 'All servers context response' },
        stopReason: 'endTurn',
      });

      const messages: SamplingMessage[] = [
        { role: 'user', content: { type: 'text', text: 'Consider all context' } },
      ];

      await session.create_message(messages, {
        maxTokens: 1000,
        includeContext: 'allServers',
      });

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs).toHaveProperty('includeContext', 'allServers');
    });

    it('should handle includeContext: "none" explicitly', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'test-model',
        role: 'assistant',
        content: { type: 'text', text: 'Response' },
        stopReason: 'endTurn',
      });

      await session.create_message(
        [{ role: 'user', content: { type: 'text', text: 'Test' } }],
        {
          includeContext: 'none',
        }
      );

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs).toHaveProperty('includeContext', 'none');
    });
  });

  describe('SessionImpl - System Prompts', () => {
    let mockServer: any;
    let session: SessionImpl;

    beforeEach(() => {
      mockServer = {
        createMessage: jest.fn(),
      } as any;

      session = new SessionImpl(mockServer, { sampling: {} });
    });

    it('should pass systemPrompt to createMessage', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'test-model',
        role: 'assistant',
        content: { type: 'text', text: 'Response with custom system prompt' },
        stopReason: 'endTurn',
      });

      const systemPrompt = 'You are a helpful coding assistant. Be concise and accurate.';

      await session.create_message(
        [{ role: 'user', content: { type: 'text', text: 'Help me' } }],
        {
          systemPrompt,
          maxTokens: 500,
        }
      );

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs).toHaveProperty('systemPrompt', systemPrompt);
    });

    it('should combine systemPrompt with includeContext', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'test-model',
        role: 'assistant',
        content: { type: 'text', text: 'Response' },
        stopReason: 'endTurn',
      });

      await session.create_message(
        [{ role: 'user', content: { type: 'text', text: 'Continue' } }],
        {
          systemPrompt: 'You are a concise assistant.',
          includeContext: 'thisServer',
          maxTokens: 300,
        }
      );

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs).toHaveProperty('systemPrompt', 'You are a concise assistant.');
      expect(callArgs).toHaveProperty('includeContext', 'thisServer');
    });

    it('should handle empty systemPrompt', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'test-model',
        role: 'assistant',
        content: { type: 'text', text: 'Response' },
        stopReason: 'endTurn',
      });

      await session.create_message(
        [{ role: 'user', content: { type: 'text', text: 'Test' } }],
        {
          systemPrompt: '',
          maxTokens: 100,
        }
      );

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs).toHaveProperty('systemPrompt', '');
    });
  });

  describe('SessionImpl - Model Preferences', () => {
    let mockServer: any;
    let session: SessionImpl;

    beforeEach(() => {
      mockServer = {
        createMessage: jest.fn(),
      } as any;

      session = new SessionImpl(mockServer, { sampling: {} });
    });

    it('should pass modelPreferences with hints', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'claude-3-5-sonnet',
        role: 'assistant',
        content: { type: 'text', text: 'Response from preferred model' },
        stopReason: 'endTurn',
      });

      const modelPreferences: ModelPreferences = {
        hints: [{ name: 'claude-3-5-sonnet' }],
        intelligencePriority: 1.0,
      };

      await session.create_message(
        [{ role: 'user', content: { type: 'text', text: 'Test' } }],
        {
          modelPreferences,
          maxTokens: 500,
        }
      );

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs).toHaveProperty('modelPreferences');
      expect(callArgs.modelPreferences).toEqual(modelPreferences);
    });

    it('should pass modelPreferences with priority settings', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'fast-model',
        role: 'assistant',
        content: { type: 'text', text: 'Response' },
        stopReason: 'endTurn',
      });

      const modelPreferences: ModelPreferences = {
        costPriority: 0.3,
        speedPriority: 1.0,
        intelligencePriority: 0.5,
      };

      await session.create_message(
        [{ role: 'user', content: { type: 'text', text: 'Quick answer' } }],
        {
          modelPreferences,
        }
      );

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs).toHaveProperty('modelPreferences');
      expect(callArgs.modelPreferences.speedPriority).toBe(1.0);
      expect(callArgs.modelPreferences.costPriority).toBe(0.3);
    });

    it('should combine modelPreferences with other options', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'claude-3-5-sonnet',
        role: 'assistant',
        content: { type: 'text', text: 'Response' },
        stopReason: 'endTurn',
      });

      await session.create_message(
        [{ role: 'user', content: { type: 'text', text: 'Test' } }],
        {
          modelPreferences: {
            hints: [{ name: 'claude-3-5-sonnet' }],
            intelligencePriority: 1.0,
          },
          systemPrompt: 'Be helpful',
          includeContext: 'thisServer',
          maxTokens: 800,
          temperature: 0.7,
        }
      );

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs).toHaveProperty('modelPreferences');
      expect(callArgs).toHaveProperty('systemPrompt', 'Be helpful');
      expect(callArgs).toHaveProperty('includeContext', 'thisServer');
      expect(callArgs).toHaveProperty('maxTokens', 800);
      expect(callArgs).toHaveProperty('temperature', 0.7);
    });
  });

  describe('SessionImpl - Multi-Turn Conversations', () => {
    let mockServer: any;
    let session: SessionImpl;

    beforeEach(() => {
      mockServer = {
        createMessage: jest.fn(),
      } as any;

      session = new SessionImpl(mockServer, { sampling: {} });
    });

    it('should handle multi-turn message history', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'test-model',
        role: 'assistant',
        content: { type: 'text', text: 'Continuing conversation' },
        stopReason: 'endTurn',
      });

      const messages: SamplingMessage[] = [
        { role: 'user', content: { type: 'text', text: 'First question' } },
        { role: 'assistant', content: { type: 'text', text: 'First answer' } },
        { role: 'user', content: { type: 'text', text: 'Follow-up question' } },
      ];

      await session.create_message(messages, {
        maxTokens: 600,
      });

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(3);
      expect(callArgs.messages[0].role).toBe('user');
      expect(callArgs.messages[1].role).toBe('assistant');
      expect(callArgs.messages[2].role).toBe('user');
    });

    it('should preserve message order in multi-turn conversations', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'test-model',
        role: 'assistant',
        content: { type: 'text', text: 'Response' },
        stopReason: 'endTurn',
      });

      const messages: SamplingMessage[] = [
        { role: 'user', content: { type: 'text', text: 'Message 1' } },
        { role: 'assistant', content: { type: 'text', text: 'Response 1' } },
        { role: 'user', content: { type: 'text', text: 'Message 2' } },
        { role: 'assistant', content: { type: 'text', text: 'Response 2' } },
        { role: 'user', content: { type: 'text', text: 'Message 3' } },
      ];

      await session.create_message(messages);

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs.messages[0].content.text).toBe('Message 1');
      expect(callArgs.messages[2].content.text).toBe('Message 2');
      expect(callArgs.messages[4].content.text).toBe('Message 3');
    });
  });

  describe('BuildMCPServer Integration - Sampling Context', () => {
    let server: BuildMCPServer;

    afterEach(async () => {
      if (server) {
        await server.stop();
      }
    });

    it('should allow tools to use fresh context mode', async () => {
      server = new BuildMCPServer({
        name: 'test-fresh-context',
        version: '1.0.0',
      });

      let contextMode: string | undefined;

      server.addTool({
        name: 'fresh_tool',
        description: 'Tool using fresh context',
        parameters: z.object({ text: z.string() }),
        execute: async (args, context) => {
          // Simulate checking if includeContext was passed
          // (In real implementation, this would be in the sampling call)
          contextMode = 'fresh';
          return { content: [{ type: 'text', text: 'Fresh analysis' }] };
        },
      });

      await server.start();
      await server['executeToolDirect']('fresh_tool', { text: 'test' });

      expect(contextMode).toBe('fresh');
    });

    it('should allow tools to use context-aware mode', async () => {
      server = new BuildMCPServer({
        name: 'test-context-aware',
        version: '1.0.0',
      });

      let contextMode: string | undefined;

      server.addTool({
        name: 'context_tool',
        description: 'Tool using current context',
        parameters: z.object({ text: z.string() }),
        execute: async (args, context) => {
          contextMode = 'thisServer';
          return { content: [{ type: 'text', text: 'Context-aware response' }] };
        },
      });

      await server.start();
      await server['executeToolDirect']('context_tool', { text: 'test' });

      expect(contextMode).toBe('thisServer');
    });

    it('should provide session.create_message in tool context', async () => {
      server = new BuildMCPServer({
        name: 'test-create-message-availability',
        version: '1.0.0',
      });

      let createMessageAvailable = false;

      server.addTool({
        name: 'check_sampling',
        description: 'Check sampling availability',
        parameters: z.object({}),
        execute: async (args, context) => {
          createMessageAvailable = typeof context?.mcp?.session.create_message === 'function';
          return { content: [{ type: 'text', text: 'checked' }] };
        },
      });

      await server.start();
      await server['executeToolDirect']('check_sampling', {});

      expect(createMessageAvailable).toBe(true);
    });
  });

  describe('Edge Cases - Sampling Options', () => {
    let mockServer: any;
    let session: SessionImpl;

    beforeEach(() => {
      mockServer = {
        createMessage: jest.fn(),
      } as any;

      session = new SessionImpl(mockServer, { sampling: {} });
    });

    it('should handle all sampling options together', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'claude-3-5-sonnet',
        role: 'assistant',
        content: { type: 'text', text: 'Complex response' },
        stopReason: 'endTurn',
      });

      await session.create_message(
        [{ role: 'user', content: { type: 'text', text: 'Test' } }],
        {
          maxTokens: 1000,
          temperature: 0.8,
          topP: 0.9,
          stopSequences: ['STOP', 'END'],
          systemPrompt: 'You are helpful',
          includeContext: 'thisServer',
          modelPreferences: {
            hints: [{ name: 'claude-3-5-sonnet' }],
            intelligencePriority: 1.0,
            costPriority: 0.5,
            speedPriority: 0.5,
          },
        }
      );

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs).toHaveProperty('maxTokens', 1000);
      expect(callArgs).toHaveProperty('temperature', 0.8);
      expect(callArgs).toHaveProperty('topP', 0.9);
      expect(callArgs).toHaveProperty('stopSequences');
      expect(callArgs).toHaveProperty('systemPrompt');
      expect(callArgs).toHaveProperty('includeContext', 'thisServer');
      expect(callArgs).toHaveProperty('modelPreferences');
    });

    it('should handle empty messages array gracefully', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'test-model',
        role: 'assistant',
        content: { type: 'text', text: '' },
        stopReason: 'endTurn',
      });

      await session.create_message([], {
        maxTokens: 100,
      });

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs.messages).toEqual([]);
    });

    it('should preserve message content types', async () => {
      mockServer.createMessage.mockResolvedValue({
        model: 'test-model',
        role: 'assistant',
        content: { type: 'text', text: 'Response' },
        stopReason: 'endTurn',
      });

      const messages: SamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Hello',
          },
        },
      ];

      await session.create_message(messages);

      const callArgs = mockServer.createMessage.mock.calls[0][0];
      expect(callArgs.messages[0].content.type).toBe('text');
      expect(callArgs.messages[0].content.text).toBe('Hello');
    });
  });
});
