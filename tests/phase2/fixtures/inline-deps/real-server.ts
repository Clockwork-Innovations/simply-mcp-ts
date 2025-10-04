#!/usr/bin/env npx tsx
// /// dependencies
// zod@^3.22.0
// ///

import { SimplyMCP } from '../../../SimplyMCP.js';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'test-server',
  version: '1.0.0',
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => `Hello, ${args.name}!`,
});

export default server;
