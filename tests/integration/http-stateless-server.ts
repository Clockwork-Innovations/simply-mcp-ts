import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'stateless-test-server',
  version: '1.0.0',
  description: 'Stateless HTTP Transport Test Server'
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}!`;
  },
});

server.addTool({
  name: 'status',
  description: 'Get server status',
  parameters: z.object({}),
  execute: async () => {
    return 'Stateless server is running';
  },
});

export default server;
