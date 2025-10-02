#!/usr/bin/env npx tsx
// /// dependencies
// zod@^3.22.0
// ///

import { SimpleMCP } from '../../../SimpleMCP.js';
import { z } from 'zod';

const server = new SimpleMCP({
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
