/**
 * Test to reproduce the [object Object] bug
 */

import type { IServer, IPrompt } from '../src/index.js';

interface TestServer extends IServer {
  name: 'test-prompt-broken';
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
    // WRONG: Wrapping messages in an object (this causes [object Object] bug)
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Processing input: ${input}`,
          },
        },
      ],
    };
  };
}
