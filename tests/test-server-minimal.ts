import { defineMCP } from '../src/index.js';
import { z } from 'zod';

export default defineMCP({
  name: 'test-config-server',
  version: '1.0.0',

  tools: [
    {
      name: 'echo',
      description: 'Echo back a message',
      parameters: z.object({
        message: z.string().describe('Message to echo'),
      }),
      execute: async ({ message }) => {
        return `Echo: ${message}`;
      },
    },
  ],
});
