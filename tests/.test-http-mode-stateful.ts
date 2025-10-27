import { BuildMCPServer } from '../dist/src/server/builder-server.js';
import { z } from 'zod';

async function main() {
  const server = new BuildMCPServer({
    name: 'stateful-test-server',
    version: '1.0.0',
  });

  server.addTool({
    name: 'echo',
    description: 'Echo a message',
    parameters: z.object({
      message: z.string(),
    }),
    execute: async (args) => {
      return `Stateful Echo: ${args.message}`;
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
    port: 3200,
    stateful: true,
  });
}

main().catch(console.error);
