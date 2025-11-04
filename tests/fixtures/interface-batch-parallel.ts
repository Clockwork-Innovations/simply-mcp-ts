#!/usr/bin/env tsx
/**
 * Batch Parallel Test Server
 *
 * Tests parallel batch processing with concurrent execution.
 * Server processes all requests concurrently.
 */

import { BuildMCPServer } from '../../src/server/builder-server.js';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'batch-parallel-test',
  version: '1.0.0',
  description: 'Test server for parallel batch processing',
  batching: {
    enabled: true,
    parallel: true, // Parallel processing - execute all requests concurrently
  },
});

/**
 * Delayed tool - completes after specified delay
 */
server.addTool({
  name: 'delayed_task',
  description: 'Task with configurable delay',
  parameters: z.object({
    value: z.string(),
    delay: z.number().optional().default(50),
  }),
  execute: async (args, context) => {
    const delay = args.delay || 50;
    await new Promise(resolve => setTimeout(resolve, delay));

    return {
      value: args.value,
      delay,
      completed: true,
      batchId: context?.batch?.batchId,
      batchIndex: context?.batch?.index,
      batchSize: context?.batch?.size,
      parallel: context?.batch?.parallel,
    };
  },
});

// Start stdio transport
await server.start({ transport: 'stdio' });
