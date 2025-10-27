import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'bundle-test-decorator',
  version: '1.0.0',
  description: 'Minimal decorator server for bundle smoke testing'
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

export default server;
