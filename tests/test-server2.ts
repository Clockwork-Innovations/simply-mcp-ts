import { defineMCP } from '../src/index.js';
import { z } from 'zod';

export default defineMCP({
  name: 'test-server-2',
  version: '1.0.0',

  tools: [
    {
      name: 'calculate',
      description: 'Add two numbers',
      parameters: z.object({
        a: z.number().describe('First number'),
        b: z.number().describe('Second number'),
      }),
      execute: async ({ a, b }) => {
        return `Result: ${a + b}`;
      },
    },
  ],
});
