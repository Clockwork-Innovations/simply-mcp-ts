import { defineMCP } from 'simply-mcp';
import { z } from 'zod';

export default defineMCP({
  name: 'bundle-test-functional',
  version: '1.0.0',
  description: 'Minimal functional server for bundle smoke testing',
  tools: [
    {
      name: 'greet',
      description: 'Greet a user',
      parameters: z.object({
        name: z.string(),
      }),
      execute: async ({ name }) => {
        return `Hello, ${name}!`;
      },
    },
    {
      name: 'status',
      description: 'Get server status',
      parameters: z.object({}),
      execute: async () => {
        return 'Server is running';
      },
    },
  ],
});
