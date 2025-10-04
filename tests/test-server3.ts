import { defineMCP } from '../src/index.js';
import { z } from 'zod';

export default defineMCP({
  name: 'test-server-3',
  version: '1.0.0',

  tools: [
    {
      name: 'reverse',
      description: 'Reverse a string',
      parameters: z.object({
        text: z.string().describe('Text to reverse'),
      }),
      execute: async ({ text }) => {
        return text.split('').reverse().join('');
      },
    },
  ],
});
