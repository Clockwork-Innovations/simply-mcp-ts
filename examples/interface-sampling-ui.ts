/**
 * Task 24: Sampling Integration UI Example
 *
 * Demonstrates UI-driven LLM interaction using MCP sampling.
 * This example shows:
 * - React chat interface component
 * - MCP sampling integration for AI responses
 * - Message history management
 * - Loading states and error handling
 * - Real-time chat experience
 * - Tool integration with window.callTool()
 * - Subscribable UI for live updates
 *
 * File Structure:
 * - examples/interface-sampling-ui.ts (this file)
 * - examples/components/ChatAssistant.tsx (React component)
 *
 * Usage:
 *   npx simply-mcp run examples/interface-sampling-ui.ts
 *
 * To view the UI:
 *   1. Start the server with the command above
 *   2. Access via MCP client (Claude Desktop, etc.)
 *   3. Look for resource: ui://chat/assistant
 *
 * Note: This example demonstrates the integration pattern.
 * In production, the send_message tool would use context.sample()
 * to get actual AI responses from the client's LLM.
 */

import type { IServer, IUI, ITool } from '../src/index.js';

// ============================================================================
// Tool Interfaces
// ============================================================================

/**
 * Send Message Tool
 *
 * Sends a user message and receives an AI response.
 * In a production implementation, this would:
 * 1. Accept the user's message
 * 2. Use context.sample() to request LLM completion from the client
 * 3. Return the AI's response
 *
 * This example uses mock responses to demonstrate the pattern.
 */
interface SendMessageTool extends ITool {
  name: 'send_message';
  description: 'Send a message and receive AI response';
  params: {
    /** User's message text */
    message: string;
    /** Optional conversation history for context */
    history?: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>;
  };
  result: {
    /** AI's response message */
    message: string;
    /** Response timestamp */
    timestamp: string;
    /** Optional response metadata */
    metadata?: {
      tokensUsed?: number;
      model?: string;
    };
  };
}

/**
 * Clear History Tool
 *
 * Clears the conversation history on the server side.
 * Useful for starting fresh conversations.
 */
interface ClearHistoryTool extends ITool {
  name: 'clear_history';
  description: 'Clear conversation history';
  params: {};
  result: {
    success: boolean;
    message: string;
  };
}

// ============================================================================
// UI Interface - Chat Component
// ============================================================================

/**
 * Chat Assistant UI
 *
 * Comprehensive chat interface demonstrating:
 * - React chat component
 * - Message history management
 * - Real-time message display
 * - Loading indicators
 * - Error handling
 * - Auto-scroll to latest message
 * - Tool integration for sending messages
 * - MCP sampling integration pattern
 *
 * Component File:
 * - ./components/ChatAssistant.tsx
 */
interface ChatAssistantUI extends IUI {
  uri: 'ui://chat/assistant';
  name: 'AI Chat Assistant';
  description: 'Chat with AI using MCP sampling';

  /**
   * Path to React component file (relative to server file)
   */
  component: './components/ChatAssistant.tsx';

  /**
   * Tools this UI can call
   * Security: Only these tools are accessible via callTool()
   */
  tools: ['send_message', 'clear_history'];

  /**
   * Enable subscriptions for live updates
   * Allows server to push new messages to clients
   */
  subscribable: true;

  /**
   * Preferred UI size (rendering hint)
   */
  size: {
    width: 800;
    height: 600;
  };
}

// ============================================================================
// Server Interface
// ============================================================================

interface SamplingUIServer extends IServer {
  name: 'sampling-ui-example';
  version: '1.0.0';
  description: 'Chat UI example demonstrating MCP sampling integration';
}

// ============================================================================
// Server Implementation
// ============================================================================

/**
 * Mock AI responses for demonstration
 * In production, these would come from context.sample()
 */
const MOCK_RESPONSES = [
  "That's an interesting question! Let me help you with that.",
  "I understand what you're asking. Here's what I think...",
  "Based on what you've told me, I can suggest...",
  "That's a great point! Let me elaborate on that.",
  "I see where you're coming from. Let me explain...",
  "Interesting perspective! Here's my take on it...",
  "Thanks for sharing that. In my view...",
  "I appreciate the question. My response is...",
];

export default class SamplingUIServerImpl implements SamplingUIServer {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private messageCount: number = 0;

  /**
   * Send message and receive AI response
   *
   * Production Implementation Pattern:
   * ```typescript
   * sendMessage: SendMessageTool = async ({ message, history }, context) => {
   *   if (!context.sample) {
   *     return { message: 'Sampling not available', timestamp: new Date().toISOString() };
   *   }
   *
   *   // Build conversation history for context
   *   const messages = [
   *     ...(history || []).map(msg => ({
   *       role: msg.role,
   *       content: { type: 'text', text: msg.content }
   *     })),
   *     {
   *       role: 'user',
   *       content: { type: 'text', text: message }
   *     }
   *   ];
   *
   *   // Request LLM completion from client
   *   const result = await context.sample(messages, {
   *     maxTokens: 500,
   *     temperature: 0.7,
   *   });
   *
   *   return {
   *     message: result.content.text,
   *     timestamp: new Date().toISOString(),
   *     metadata: {
   *       tokensUsed: result.tokensUsed,
   *       model: result.model,
   *     },
   *   };
   * };
   * ```
   */
  sendMessage: SendMessageTool = async ({ message, history }) => {
    console.log(`[Chat] Received message: ${message}`);

    // Store message in history
    this.conversationHistory.push({ role: 'user', content: message });
    this.messageCount++;

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Generate mock response
    // In production, this would use context.sample() to get actual AI response
    const responseIndex = this.messageCount % MOCK_RESPONSES.length;
    const aiResponse = `${MOCK_RESPONSES[responseIndex]} (Mock response #${this.messageCount}. In production, this would use MCP sampling to get an actual AI response from the client's LLM.)`;

    // Store response in history
    this.conversationHistory.push({ role: 'assistant', content: aiResponse });

    return {
      message: aiResponse,
      timestamp: new Date().toISOString(),
      metadata: {
        tokensUsed: Math.floor(Math.random() * 100) + 50,
        model: 'mock-llm-v1',
      },
    };
  };

  /**
   * Clear conversation history
   */
  clearHistory: ClearHistoryTool = async () => {
    console.log('[Chat] Clearing conversation history');

    const messageCount = this.conversationHistory.length;
    this.conversationHistory = [];
    this.messageCount = 0;

    return {
      success: true,
      message: `Cleared ${messageCount} message(s) from history`,
    };
  };
}

// ============================================================================
// Demo Runner (for standalone execution)
// ============================================================================

/**
 * Demo execution when file is run directly
 */
async function runDemo() {
  const { loadInterfaceServer } = await import('../src/index.js');
  const { fileURLToPath } = await import('url');

  console.log('=== Sampling UI Example (Task 24) ===\n');

  // Load the server
  const server = await loadInterfaceServer({
    filePath: fileURLToPath(import.meta.url),
    verbose: false,
  });

  console.log(`Server: ${server.name} v${server.version}`);
  console.log(`Description: ${server.description}\n`);

  // List UI resources
  console.log('UI Resources:');
  const resources = server.listResources();
  const uiResources = resources.filter((r) => r.uri.startsWith('ui://'));
  uiResources.forEach((resource) => {
    console.log(`  - ${resource.uri}: ${resource.name}`);
    console.log(`    ${resource.description}`);
  });
  console.log();

  // List tools
  console.log('Available Tools:');
  const tools = server.listTools();
  tools.forEach((tool) => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
  console.log();

  // Test chat interaction
  console.log('=== Testing Chat Interaction ===');

  // Send first message
  const msg1Result = await server.executeTool('send_message', {
    message: 'Hello! Can you help me?',
  });
  const msg1Data = JSON.parse(msg1Result.content[0].text);
  console.log('User: Hello! Can you help me?');
  console.log(`AI: ${msg1Data.message.substring(0, 100)}...`);

  // Send follow-up message
  const msg2Result = await server.executeTool('send_message', {
    message: 'What can you do?',
  });
  const msg2Data = JSON.parse(msg2Result.content[0].text);
  console.log('\nUser: What can you do?');
  console.log(`AI: ${msg2Data.message.substring(0, 100)}...`);

  // Clear history
  const clearResult = await server.executeTool('clear_history', {});
  const clearData = JSON.parse(clearResult.content[0].text);
  console.log(`\n✓ ${clearData.message}`);

  console.log();
  console.log('=== Demo Complete ===\n');
  console.log('Sampling UI Features Demonstrated:');
  console.log('  ✓ React chat interface');
  console.log('  ✓ Message history management');
  console.log('  ✓ Tool integration');
  console.log('  ✓ Loading and error states');
  console.log('  ✓ MCP sampling integration pattern');
  console.log('  ✓ Subscribable UI');
  console.log('\nProduction Implementation:');
  console.log('  - Use context.sample() in tool handler');
  console.log('  - Pass conversation history to LLM');
  console.log('  - Handle streaming responses (optional)');
  console.log('  - Implement token limits and error handling');
  console.log('\nTo run the MCP server:');
  console.log('  npx simply-mcp run examples/interface-sampling-ui.ts');

  await server.stop();
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}
