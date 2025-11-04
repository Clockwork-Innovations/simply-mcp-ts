#!/usr/bin/env tsx
/**
 * Batch Sequential Test Server
 *
 * Tests sequential batch processing with order preservation.
 * Server processes requests one at a time in the order received.
 */

import { BuildMCPServer } from '../../src/server/builder-server.js';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'batch-sequential-test',
  version: '1.0.0',
  description: 'Test server for sequential batch processing',
  batching: {
    enabled: true,
    parallel: false, // Sequential processing - one request at a time
  },
});

/**
 * Fast tool - completes in 50ms
 */
server.addTool({
  name: 'fast_task',
  description: 'Fast task that completes quickly',
  parameters: z.object({
    value: z.string(),
  }),
  execute: async (args, context) => {
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      value: args.value,
      completed: true,
      batchId: context?.batch?.batchId,
      batchIndex: context?.batch?.index,
      batchSize: context?.batch?.size,
      parallel: context?.batch?.parallel,
    };
  },
});

/**
 * Slow tool - completes in 100ms
 */
server.addTool({
  name: 'slow_task',
  description: 'Slow task that takes longer to complete',
  parameters: z.object({
    value: z.string(),
  }),
  execute: async (args, context) => {
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      value: args.value,
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
