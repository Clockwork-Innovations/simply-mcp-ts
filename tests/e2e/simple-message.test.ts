/**
 * E2E Tests for SimpleMessage Format
 *
 * These tests run an actual MCP server via stdio transport and test
 * the SimpleMessage format through the full protocol stack.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('SimpleMessage E2E Tests', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    // Start MCP server via stdio transport
    transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', 'tests/fixtures/simple-message-server.ts'],
    });

    client = new Client(
      {
        name: 'simple-message-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    await client.close();
  }, 30000);

  describe('Protocol Integration', () => {
    it('should connect to server successfully', async () => {
      // Connection established in beforeAll
      expect(client).toBeDefined();
    });

    it('should list all prompts via prompts/list', async () => {
      const result = await client.listPrompts();

      expect(result.prompts).toBeDefined();
      expect(Array.isArray(result.prompts)).toBe(true);
      expect(result.prompts.length).toBeGreaterThanOrEqual(5);

      // Verify SimpleMessage prompts are discoverable
      const promptNames = result.prompts.map(p => p.name);
      expect(promptNames).toContain('simple_greeting');
      expect(promptNames).toContain('tutorial_conversation');
      expect(promptNames).toContain('multi_turn_chat');
      expect(promptNames).toContain('async_simple_messages');
      expect(promptNames).toContain('advanced_prompt');
    });
  });

  describe('Pattern 1: String Return (Backward Compatibility)', () => {
    it('should handle string return prompts', async () => {
      const result = await client.getPrompt({
        name: 'simple_greeting',
        args: { name: 'TestUser' },
      });

      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages.length).toBe(1);

      const message = result.messages[0];
      expect(message.role).toBe('user');
      expect(message.content.type).toBe('text');
      expect(message.content.text).toContain('Hello TestUser');
      expect(message.content.text).toContain('SimpleMessage testing');
    });
  });

  describe('Pattern 2: SimpleMessage[] Format', () => {
    it('should convert SimpleMessage[] to PromptMessage[] with arguments', async () => {
      const result = await client.getPrompt({
        name: 'tutorial_conversation',
        args: { topic: 'TypeScript' },
      });

      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages.length).toBe(4);

      // Verify first message (user)
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.type).toBe('text');
      expect(result.messages[0].content.text).toContain('TypeScript');
      expect(result.messages[0].content.text).toContain('I want to learn');

      // Verify second message (assistant)
      expect(result.messages[1].role).toBe('assistant');
      expect(result.messages[1].content.type).toBe('text');
      expect(result.messages[1].content.text).toContain('TypeScript');
      expect(result.messages[1].content.text).toContain('fascinating');

      // Verify third message (user)
      expect(result.messages[2].role).toBe('user');
      expect(result.messages[2].content.type).toBe('text');
      expect(result.messages[2].content.text).toContain('example');

      // Verify fourth message (assistant)
      expect(result.messages[3].role).toBe('assistant');
      expect(result.messages[3].content.type).toBe('text');
      expect(result.messages[3].content.text).toContain('practical example');
    });

    it('should handle multi-turn SimpleMessage conversations', async () => {
      const result = await client.getPrompt({
        name: 'multi_turn_chat',
        args: { question: 'How does async/await work?' },
      });

      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBe(6);

      // Verify alternating roles
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[1].role).toBe('assistant');
      expect(result.messages[2].role).toBe('user');
      expect(result.messages[3].role).toBe('assistant');
      expect(result.messages[4].role).toBe('user');
      expect(result.messages[5].role).toBe('assistant');

      // Verify first message contains the question
      expect(result.messages[0].content.text).toBe('How does async/await work?');
    });

    it('should handle async SimpleMessage[] returns', async () => {
      const result = await client.getPrompt({
        name: 'async_simple_messages',
        args: { delay: '50' },
      });

      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBe(4);

      // Verify conversion happened correctly
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.text).toBe('This is an async request');

      expect(result.messages[1].role).toBe('assistant');
      expect(result.messages[1].content.text).toContain('50ms delay');

      expect(result.messages[2].role).toBe('user');
      expect(result.messages[3].role).toBe('assistant');
      expect(result.messages[3].content.text).toContain('Async SimpleMessage[]');
    });
  });

  describe('Pattern 3: PromptMessage[] Format (Comparison)', () => {
    it('should still support full PromptMessage[] format', async () => {
      const result = await client.getPrompt({
        name: 'advanced_prompt',
        args: { query: 'Advanced query test' },
      });

      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBe(2);

      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.type).toBe('text');
      expect(result.messages[0].content.text).toBe('Advanced query test');

      expect(result.messages[1].role).toBe('assistant');
      expect(result.messages[1].content.text).toContain('full PromptMessage format');
    });
  });

  describe('Conversion Accuracy', () => {
    it('should convert { user: string } to correct PromptMessage structure', async () => {
      const result = await client.getPrompt({
        name: 'tutorial_conversation',
        args: { topic: 'Testing' },
      });

      const userMessage = result.messages[0];

      // Verify exact structure matches MCP spec
      expect(userMessage).toMatchObject({
        role: 'user',
        content: {
          type: 'text',
          text: expect.any(String),
        },
      });
    });

    it('should convert { assistant: string } to correct PromptMessage structure', async () => {
      const result = await client.getPrompt({
        name: 'tutorial_conversation',
        args: { topic: 'Testing' },
      });

      const assistantMessage = result.messages[1];

      // Verify exact structure matches MCP spec
      expect(assistantMessage).toMatchObject({
        role: 'assistant',
        content: {
          type: 'text',
          text: expect.any(String),
        },
      });
    });
  });

  describe('Mixed Usage', () => {
    it('should handle multiple pattern types in the same server', async () => {
      // Test Pattern 1 (string)
      const stringResult = await client.getPrompt({
        name: 'simple_greeting',
        args: { name: 'User1' },
      });
      expect(stringResult.messages.length).toBe(1);

      // Test Pattern 2 (SimpleMessage[])
      const simpleResult = await client.getPrompt({
        name: 'tutorial_conversation',
        args: { topic: 'MCP' },
      });
      expect(simpleResult.messages.length).toBe(4);

      // Test Pattern 3 (PromptMessage[])
      const advancedResult = await client.getPrompt({
        name: 'advanced_prompt',
        args: { query: 'Test' },
      });
      expect(advancedResult.messages.length).toBe(2);

      // All should work correctly in the same server
      expect(stringResult.messages[0].role).toBe('user');
      expect(simpleResult.messages[0].role).toBe('user');
      expect(advancedResult.messages[0].role).toBe('user');
    });
  });

  describe('Edge Cases', () => {
    it('should handle prompts with empty string arguments', async () => {
      const result = await client.getPrompt({
        name: 'simple_greeting',
        args: { name: '' },
      });

      expect(result.messages).toBeDefined();
      expect(result.messages[0].content.text).toContain('Hello ');
    });

    it('should handle prompts with special characters', async () => {
      const result = await client.getPrompt({
        name: 'tutorial_conversation',
        args: { topic: 'C++ & TypeScript: A <Comparison>' },
      });

      expect(result.messages).toBeDefined();
      expect(result.messages[0].content.text).toContain('C++ & TypeScript: A <Comparison>');
    });

    it('should handle prompts with Unicode characters', async () => {
      const result = await client.getPrompt({
        name: 'tutorial_conversation',
        args: { topic: '日本語 (Japanese) 🎌' },
      });

      expect(result.messages).toBeDefined();
      expect(result.messages[0].content.text).toContain('日本語 (Japanese) 🎌');
    });
  });
});
