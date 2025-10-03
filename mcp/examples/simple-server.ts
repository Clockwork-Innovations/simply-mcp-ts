#!/usr/bin/env node
/**
 * SimplyMCP Example Server
 *
 * This example demonstrates how to use SimplyMCP to create a simple MCP server
 * with tools, prompts, and resources - all in a single file.
 *
 * Usage:
 *   # Run with stdio transport (default):
 *   node mcp/examples/simple-server.ts
 *
 *   # Run with HTTP transport:
 *   node mcp/examples/simple-server.ts --http --port 3000
 */

import { SimplyMCP } from '../SimplyMCP.js';
import { z } from 'zod';

// Create a new SimplyMCP server with optional enhanced capabilities
const server = new SimplyMCP({
  name: 'simple-example-server',
  version: '1.0.0',
  port: 3000, // Default port for HTTP transport

  // Optional: Enable Phase 1 features
  capabilities: {
    logging: true, // Enable logging notifications to client
    // sampling: true, // Enable LLM sampling (requires client support)
  },
});

// Add a simple greeting tool
server.addTool({
  name: 'greet',
  description: 'Greet a user with a personalized message',
  parameters: z.object({
    name: z.string().min(1).describe('The name of the person to greet'),
    formal: z.boolean().optional().describe('Whether to use formal greeting'),
  }),
  execute: async (args) => {
    const greeting = args.formal ? 'Good day' : 'Hello';
    return `${greeting}, ${args.name}! Welcome to SimplyMCP!`;
  },
});

// Add a calculator tool
server.addTool({
  name: 'calculate',
  description: 'Perform basic arithmetic operations',
  parameters: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The operation to perform'),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  execute: async (args) => {
    let result: number;

    switch (args.operation) {
      case 'add':
        result = args.a + args.b;
        break;
      case 'subtract':
        result = args.a - args.b;
        break;
      case 'multiply':
        result = args.a * args.b;
        break;
      case 'divide':
        if (args.b === 0) {
          return 'Error: Division by zero is not allowed';
        }
        result = args.a / args.b;
        break;
    }

    return `${args.a} ${args.operation} ${args.b} = ${result}`;
  },
});

// Add a tool that returns structured data
server.addTool({
  name: 'get_user_info',
  description: 'Get information about a user',
  parameters: z.object({
    userId: z.string().describe('User ID to look up'),
  }),
  execute: async (args) => {
    // Return structured HandlerResult
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            userId: args.userId,
            name: 'John Doe',
            email: 'john@example.com',
            createdAt: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  },
});

// Add a tool that uses context
server.addTool({
  name: 'log_message',
  description: 'Log a message (demonstrates context usage and logging to client)',
  parameters: z.object({
    message: z.string().describe('Message to log'),
    level: z.enum(['debug', 'info', 'warn', 'error']).optional().describe('Log level'),
  }),
  execute: async (args, context) => {
    const level = args.level || 'info';

    // Use the logger from context
    // If logging capability is enabled, this will send a notification to the client
    if (context) {
      context.logger[level](`User message: ${args.message}`);
    }

    return `Logged message at ${level} level: "${args.message}"\n(If logging capability is enabled, this was also sent to the client)`;
  },
});

// Add a tool that demonstrates progress reporting (Phase 1 feature)
server.addTool({
  name: 'count_with_progress',
  description: 'Count to a number with progress reporting (Phase 1 feature demo)',
  parameters: z.object({
    count: z.number().min(1).max(100).describe('Number to count to (1-100)'),
    delay: z.number().optional().describe('Delay in ms between counts (default: 100)'),
  }),
  execute: async (args, context) => {
    const count = args.count;
    const delay = args.delay || 100;

    // Report initial progress if available
    if (context?.reportProgress) {
      await context.reportProgress(0, count, 'Starting to count...');
    }

    const results: number[] = [];

    for (let i = 1; i <= count; i++) {
      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, delay));

      results.push(i);

      // Report progress if available (only if progressToken was provided by client)
      if (context?.reportProgress) {
        await context.reportProgress(i, count, `Counting: ${i}/${count}`);
      }

      // Also log progress
      if (context?.logger && i % 10 === 0) {
        context.logger.info(`Progress: ${i}/${count}`);
      }
    }

    if (context?.reportProgress) {
      await context.reportProgress(count, count, 'Counting complete!');
    }

    return `Successfully counted from 1 to ${count}. Final numbers: ${results.slice(-5).join(', ')}${count > 5 ? '...' : ''}`;
  },
});

// Add a prompt
server.addPrompt({
  name: 'code-review',
  description: 'Generate a code review prompt',
  arguments: [
    {
      name: 'language',
      description: 'Programming language',
      required: true,
    },
    {
      name: 'focus',
      description: 'What to focus on (e.g., performance, security)',
      required: false,
    },
  ],
  template: `Please review the following {{language}} code.
${(args: any) => args.focus ? `Focus on: ${args.focus}` : 'Provide a general review.'}

Look for:
- Code quality and readability
- Potential bugs or edge cases
- Performance issues
- Security vulnerabilities
- Best practices

Provide specific suggestions for improvement.`,
});

// Add a resource
server.addResource({
  uri: 'config://server',
  name: 'Server Configuration',
  description: 'Current server configuration',
  mimeType: 'application/json',
  content: {
    name: 'simple-example-server',
    version: '1.0.0',
    features: ['tools', 'prompts', 'resources'],
    supportedTransports: ['stdio', 'http'],
  },
});

// Add another resource (static text)
server.addResource({
  uri: 'doc://readme',
  name: 'README',
  description: 'SimplyMCP README document',
  mimeType: 'text/plain',
  content: `SimplyMCP Example Server

This is an example server demonstrating SimplyMCP capabilities.

Available Tools:
- greet: Greet a user
- calculate: Perform basic arithmetic
- get_user_info: Get user information
- log_message: Log a message

Available Prompts:
- code-review: Generate code review prompt

Available Resources:
- config://server: Server configuration
- doc://readme: This document

For more information, see the SimplyMCP documentation.`,
});

// Parse command line arguments
const args = process.argv.slice(2);
const useHttp = args.includes('--http');
const portIndex = args.indexOf('--port');
const port = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : 3000;

// Start the server
(async () => {
  try {
    await server.start({
      transport: useHttp ? 'http' : 'stdio',
      port: useHttp ? port : undefined,
    });

    // Log server info
    const info = server.getInfo();
    const stats = server.getStats();

    if (!useHttp) {
      console.error(`[Example] Server "${info.name}" v${info.version} is running`);
      console.error(`[Example] Stats:`, stats);
    }
  } catch (error) {
    console.error('[Example] Failed to start server:', error);
    process.exit(1);
  }
})();
