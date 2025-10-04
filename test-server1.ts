import { defineMCP } from './mcp/index.js';
import { z } from 'zod';

export default defineMCP({
  name: 'test-server-1',
  version: '1.0.0',

  tools: [
    {
      name: 'greet',
      description: 'Greet someone',
      parameters: z.object({
        name: z.string().describe('Name to greet'),
      }),
      execute: async ({ name }) => {
        return `Hello, ${name}!`;
      },
    },
  ],
});
