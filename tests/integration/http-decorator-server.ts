import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'decorator-test-server',
  version: '1.0.0',
  description: 'Decorator API HTTP Transport Test Server'
});

server.addTool({
  name: 'echo',
  description: 'Echo a message',
  parameters: z.object({
    message: z.string().describe('Message to echo'),
  }),
  execute: async (args) => {
    return `Echo: ${args.message}`;
  },
});

server.addTool({
  name: 'calculate',
  description: 'Add two numbers',
  parameters: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  execute: async (args) => {
    return `${args.a} + ${args.b} = ${args.a + args.b}`;
  },
});

// When run via CLI with --http transport, start the server
// Note: This test file is meant to be used with: npx simply-mcp run http-decorator-server.ts --http --port PORT
//await server.start({ transport: 'http', port: process.env.PORT ? parseInt(process.env.PORT) : 3000 });

export default server;
