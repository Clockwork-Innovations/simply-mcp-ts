/**
 * Simple test to verify prompt bug fix
 */

import type { IServer, IPrompt } from '../src/index.js';

interface TestServer extends IServer {
  name: 'test-prompt';
  version: '1.0.0';
}

interface TestPrompt extends IPrompt {
  name: 'test_prompt';
  description: 'Test prompt';
  args: {
    input: { description: 'Input text' };
  };
}

export default class TestServerImpl implements TestServer {
  testPrompt: TestPrompt = async ({ input }) => {
    // Return messages array directly (not wrapped in { messages: [...] })
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Processing input: ${input}`,
        },
      },
    ];
  };
}
