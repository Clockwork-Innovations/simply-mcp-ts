#!/usr/bin/env npx tsx
// /// dependencies
// zod@^3.22.0
// ///

import { MCPServer, tool } from '/mnt/Shared/cs-projects/simple-src/src/index.js';
import { z } from 'zod';

@MCPServer({ name: 'decorator-server', version: '1.0.0' })
class MyServer {
  @tool({
    description: 'Add numbers',
    parameters: z.object({
      a: z.number(),
      b: z.number()
    })
  })
  async add(args: { a: number; b: number }) {
    return { result: args.a + args.b };
  }
}

export default MyServer;
