#!/usr/bin/env npx tsx
/**
 * Inline Dependencies Demo Server
 *
 * This example demonstrates how to declare inline dependencies in a SimplyMCP server
 * using PEP 723-style comment-based metadata.
 *
 * To run this server:
 * 1. With stdio transport: npx tsx examples/inline-deps-demo.ts
 * 2. With HTTP transport: npx tsx examples/inline-deps-demo.ts --http
 *
 * The inline dependencies below are parsed automatically and can be:
 * - Listed using server.getDependencies()
 * - Installed automatically (Feature 3 - not yet implemented)
 * - Exported to package.json format
 */

// /// dependencies
// zod@^3.22.0
// ///

import { SimplyMCP } from '../SimplyMCP.js';
import { z } from 'zod';

/**
 * Create the SimplyMCP server
 */
const server = new SimplyMCP({
  name: 'inline-deps-demo',
  version: '1.0.0',
  capabilities: {
    logging: true,
  },
});

/**
 * Tool: Get Current Time
 * Returns the current time in ISO format
 */
server.addTool({
  name: 'get_current_time',
  description: 'Get the current time in ISO format',
  parameters: z.object({}),
  execute: async (args, context) => {
    context?.logger.info('Getting current time');

    const now = new Date();
    const isoTime = now.toISOString();
    const localTime = now.toLocaleString();

    return {
      content: [
        {
          type: 'text',
          text: `Current time:\n- ISO: ${isoTime}\n- Local: ${localTime}`,
        },
      ],
    };
  },
});

/**
 * Tool: Calculate Date Difference
 * Calculates the difference between two dates in milliseconds
 */
server.addTool({
  name: 'date_difference',
  description: 'Calculate the difference between two dates in days',
  parameters: z.object({
    date1: z.string().describe('First date (ISO format)'),
    date2: z.string().optional().describe('Second date (ISO format, default: now)'),
  }),
  execute: async (args, context) => {
    const date1 = new Date(args.date1);
    const date2 = args.date2 ? new Date(args.date2) : new Date();

    const diffMs = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    context?.logger.info(`Calculated difference: ${diffDays} days`);

    return {
      content: [
        {
          type: 'text',
          text: `Difference between dates:\n- Days: ${diffDays}\n- Hours: ${diffHours}\n- Milliseconds: ${diffMs}`,
        },
      ],
    };
  },
});

/**
 * Tool: Add Days to Date
 * Adds days to a given date
 */
server.addTool({
  name: 'add_days',
  description: 'Add a number of days to a date',
  parameters: z.object({
    date: z.string().describe('Starting date (ISO format)'),
    days: z.number().int().describe('Number of days to add'),
  }),
  execute: async (args, context) => {
    const startDate = new Date(args.date);
    const resultDate = new Date(startDate);
    resultDate.setDate(resultDate.getDate() + args.days);

    context?.logger.info(`Added ${args.days} days to ${args.date}`);

    return {
      content: [
        {
          type: 'text',
          text: `Result: ${resultDate.toISOString()} (${resultDate.toLocaleDateString()})`,
        },
      ],
    };
  },
});

/**
 * Tool: Validate Schema
 * Demonstrates Zod schema validation
 */
server.addTool({
  name: 'validate_user',
  description: 'Validate user data against a schema',
  parameters: z.object({
    name: z.string().min(1).describe('User name'),
    email: z.string().email().describe('User email'),
    age: z.number().int().min(0).max(150).describe('User age'),
  }),
  execute: async (args, context) => {
    context?.logger.info(`Validating user: ${args.name}`);

    return {
      content: [
        {
          type: 'text',
          text: `User validated successfully:\n- Name: ${args.name}\n- Email: ${args.email}\n- Age: ${args.age}`,
        },
      ],
    };
  },
});

/**
 * Tool: Show Dependencies
 * Demonstrates accessing inline dependencies from within the server
 */
server.addTool({
  name: 'show_dependencies',
  description: 'Show the inline dependencies declared in this server',
  parameters: z.object({}),
  execute: async (args, context) => {
    const deps = server.getDependencies();

    if (!deps || Object.keys(deps.map).length === 0) {
      return 'No inline dependencies declared';
    }

    const depList = Object.entries(deps.map)
      .map(([name, version]) => `- ${name}@${version}`)
      .join('\n');

    const statsText = [
      `This server has ${deps.dependencies.length} inline dependencies:\n`,
      depList,
      '',
      'These dependencies are declared using PEP 723-style inline metadata.',
      'They can be automatically installed using Feature 3 (coming soon).',
    ].join('\n');

    return {
      content: [
        {
          type: 'text',
          text: statsText,
        },
      ],
    };
  },
});

/**
 * Main function - start the server
 */
async function main() {
  const args = process.argv.slice(2);
  const useHttp = args.includes('--http');

  // Display server info
  console.error('[inline-deps-demo] Server Information:');
  console.error(`  Name: ${server.getInfo().name}`);
  console.error(`  Version: ${server.getInfo().version}`);

  // Display dependencies
  const deps = server.getDependencies();
  if (deps && Object.keys(deps.map).length > 0) {
    console.error('\n[inline-deps-demo] Inline Dependencies:');
    Object.entries(deps.map).forEach(([name, version]) => {
      console.error(`  - ${name}@${version}`);
    });
  } else {
    console.error('\n[inline-deps-demo] No inline dependencies declared');
  }

  // Display tools
  const stats = server.getStats();
  console.error(`\n[inline-deps-demo] Capabilities:`);
  console.error(`  - Tools: ${stats.tools}`);
  console.error(`  - Prompts: ${stats.prompts}`);
  console.error(`  - Resources: ${stats.resources}`);

  // Start server
  if (useHttp) {
    const port = 3000;
    console.error(`\n[inline-deps-demo] Starting HTTP transport on port ${port}...`);
    await server.start({ transport: 'http', port });
  } else {
    console.error(`\n[inline-deps-demo] Starting stdio transport...`);
    await server.start({ transport: 'stdio' });
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
