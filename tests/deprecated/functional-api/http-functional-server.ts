import { defineMCP } from 'simply-mcp';
import { z } from 'zod';

export default defineMCP({
  name: 'functional-test-server',
  version: '1.0.0',
  description: 'Functional API HTTP Transport Test Server',
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
