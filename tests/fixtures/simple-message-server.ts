#!/usr/bin/env tsx
/**
 * Simple Message E2E Test Server
 *
 * A minimal MCP server for testing SimpleMessage format through the protocol.
 * Uses interface-style API with SimpleMessage[] returns.
 */

import { BuildMCPServer } from '../../src/server/builder-server.js';
import { IServer, ITool, IPrompt, SimpleMessage } from '../../src/index.js';
import { z } from 'zod';

/**
 * Test server demonstrating SimpleMessage format
 */
interface SimpleMessageTestServer extends IServer {
  serverInfo: {
    name: 'simple-message-test-server';
    version: '1.0.0';
  };

  // Pattern 1: String return (backward compatibility)
  simpleGreeting: SimpleGreetingPrompt;

  // Pattern 2: SimpleMessage[] return (NEW - the main test target)
  tutorialConversation: TutorialPrompt;
  multiTurnChat: MultiTurnPrompt;
  asyncSimpleMessages: AsyncSimplePrompt;

  // Pattern 3: PromptMessage[] return (existing advanced pattern)
  advancedPrompt: AdvancedPrompt;
}

/**
 * Pattern 1: Simple string prompt (backward compatibility test)
 */
interface SimpleGreetingPrompt extends IPrompt {
  name: 'simple_greeting';
  description: 'Simple greeting that returns a string';
  args: {
    name: {};
  };
}

/**
 * Pattern 2a: SimpleMessage[] with arguments
 */
interface TutorialPrompt extends IPrompt {
  name: 'tutorial_conversation';
  description: 'Multi-turn tutorial using SimpleMessage format';
  args: {
    topic: {};
  };
}

/**
 * Pattern 2b: SimpleMessage[] multi-turn
 */
interface MultiTurnPrompt extends IPrompt {
  name: 'multi_turn_chat';
  description: 'Multi-turn conversation with user and assistant messages';
  args: {
    question: {};
  };
}

/**
 * Pattern 2c: Async SimpleMessage[]
 */
interface AsyncSimplePrompt extends IPrompt {
  name: 'async_simple_messages';
  description: 'Async prompt returning SimpleMessage[]';
  args: {
    delay: {};
  };
}

/**
 * Pattern 3: Advanced PromptMessage[] (for comparison)
 */
interface AdvancedPrompt extends IPrompt {
  name: 'advanced_prompt';
  description: 'Advanced prompt using full PromptMessage format';
  args: {
    query: {};
  };
}

/**
 * Server implementation
 */
class SimpleMessageTestServerImpl implements SimpleMessageTestServer {
  serverInfo = {
    name: 'simple-message-test-server' as const,
    version: '1.0.0' as const,
  };

  // Pattern 1: String return (backward compatibility)
  simpleGreeting = (args: { name: string }) => {
    return `Hello ${args.name}, welcome to SimpleMessage testing!`;
  };

  // Pattern 2a: SimpleMessage[] with dynamic arguments
  tutorialConversation = (args: { topic: string }): SimpleMessage[] => {
    return [
      { user: `I want to learn about ${args.topic}` },
      { assistant: `Great! ${args.topic} is a fascinating subject. Let me explain the basics...` },
      { user: 'Can you show me an example?' },
      { assistant: 'Of course! Here is a practical example you can try...' },
    ];
  };

  // Pattern 2b: SimpleMessage[] multi-turn
  multiTurnChat = (args: { question: string }): SimpleMessage[] => {
    return [
      { user: args.question },
      { assistant: 'That is an interesting question. Let me think about it...' },
      { user: 'Please provide details.' },
      { assistant: 'Here are the details you requested with comprehensive information.' },
      { user: 'Thank you!' },
      { assistant: 'You are welcome! Feel free to ask more questions anytime.' },
    ];
  };

  // Pattern 2c: Async SimpleMessage[]
  asyncSimpleMessages = async (args: { delay: string }): Promise<SimpleMessage[]> => {
    // Simulate async operation
    const delay = parseInt(args.delay) || 10;
    await new Promise(resolve => setTimeout(resolve, delay));
    return [
      { user: 'This is an async request' },
      { assistant: `Response after ${delay}ms delay` },
      { user: 'Did the async work correctly?' },
      { assistant: 'Yes! Async SimpleMessage[] works perfectly.' },
    ];
  };

  // Pattern 3: Advanced PromptMessage[] (for comparison)
  advancedPrompt = (args: { query: string }) => {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: args.query,
        },
      },
      {
        role: 'assistant' as const,
        content: {
          type: 'text' as const,
          text: 'This uses the full PromptMessage format for advanced control.',
        },
      },
    ];
  };
}

const server = new SimpleMessageTestServerImpl();

// Create and start the server
const mcpServer = new BuildMCPServer({
  name: server.serverInfo.name,
  version: server.serverInfo.version,
});

// Add all prompts
mcpServer.addPrompt({
  name: 'simple_greeting',
  description: 'Simple greeting that returns a string',
  arguments: [
    { name: 'name', description: 'Name to greet', required: true },
  ],
  template: server.simpleGreeting,
});

mcpServer.addPrompt({
  name: 'tutorial_conversation',
  description: 'Multi-turn tutorial using SimpleMessage format',
  arguments: [
    { name: 'topic', description: 'Topic to learn about', required: true },
  ],
  template: server.tutorialConversation,
});

mcpServer.addPrompt({
  name: 'multi_turn_chat',
  description: 'Multi-turn conversation with user and assistant messages',
  arguments: [
    { name: 'question', description: 'Question to ask', required: true },
  ],
  template: server.multiTurnChat,
});

mcpServer.addPrompt({
  name: 'async_simple_messages',
  description: 'Async prompt returning SimpleMessage[]',
  arguments: [
    { name: 'delay', description: 'Delay in milliseconds', required: false },
  ],
  template: server.asyncSimpleMessages,
});

mcpServer.addPrompt({
  name: 'advanced_prompt',
  description: 'Advanced prompt using full PromptMessage format',
  arguments: [
    { name: 'query', description: 'Query string', required: true },
  ],
  template: server.advancedPrompt,
});

// Start stdio transport
await mcpServer.start({ transport: 'stdio' });
