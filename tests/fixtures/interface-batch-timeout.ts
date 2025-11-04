#!/usr/bin/env tsx
/**
 * Batch Timeout Test Server
 *
 * Tests timeout enforcement in batch processing.
 * Server has 100ms timeout - tools that exceed this should fail.
 */

import { BuildMCPServer } from '../../src/server/builder-server.js';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'batch-timeout-test',
  version: '1.0.0',
  description: 'Test server for batch timeout enforcement',
  batching: {
    enabled: true,
    parallel: true, // Parallel processing for speed
    timeout: 100, // 100ms timeout - slow tasks should fail
  },
});

/**
 * Fast tool - completes in 10ms (well under timeout)
 */
server.addTool({
  name: 'fast_task',
  description: 'Fast task that completes quickly',
  parameters: z.object({
    value: z.string(),
  }),
  execute: async (args, context) => {
    await new Promise(resolve => setTimeout(resolve, 10));

    return {
      value: args.value,
      timing: 'fast',
      completed: true,
      batchId: context?.batch?.batchId,
      batchIndex: context?.batch?.index,
      batchSize: context?.batch?.size,
    };
  },
});

/**
 * Medium tool - completes in 80ms (just under timeout)
 */
server.addTool({
  name: 'medium_task',
  description: 'Medium task that completes near timeout',
  parameters: z.object({
    value: z.string(),
  }),
  execute: async (args, context) => {
    await new Promise(resolve => setTimeout(resolve, 80));

    return {
      value: args.value,
      timing: 'medium',
      completed: true,
      batchId: context?.batch?.batchId,
      batchIndex: context?.batch?.index,
      batchSize: context?.batch?.size,
    };
  },
});

/**
 * Slow tool - completes in 200ms (exceeds timeout)
 */
server.addTool({
  name: 'slow_task',
  description: 'Slow task that exceeds timeout',
  parameters: z.object({
    value: z.string(),
  }),
  execute: async (args, context) => {
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      value: args.value,
      timing: 'slow',
      completed: true,
      batchId: context?.batch?.batchId,
      batchIndex: context?.batch?.index,
      batchSize: context?.batch?.size,
    };
  },
});

// Start stdio transport
await server.start({ transport: 'stdio' });
