import { SimplyMCP } from '../dist/src/SimplyMCP.js';
import { z } from 'zod';

async function main() {
  const server = new SimplyMCP({
    name: 'stateless-test-server',
    version: '1.0.0',
  });

  server.addTool({
    name: 'echo',
    description: 'Echo a message',
    parameters: z.object({
      message: z.string(),
    }),
    execute: async (args) => {
      return `Stateless Echo: ${args.message}`;
    },
  });

  server.addTool({
    name: 'add',
    description: 'Add two numbers',
    parameters: z.object({
      a: z.number(),
      b: z.number(),
    }),
    execute: async (args) => {
      return `${args.a} + ${args.b} = ${args.a + args.b}`;
    },
  });

  await server.start({
    transport: 'http',
    port: 3201,
    stateful: false,
  });
}

main().catch(console.error);
