/**
 * Single-File MCP Basic Example
 *
 * This demonstrates the simplest way to define an MCP server in a single file.
 * Inspired by FastMCP's Python API.
 *
 * To run this server:
 *   npx tsx mcp/adapter.ts mcp/examples/single-file-basic.ts
 *
 * Or with HTTP transport:
 *   npx tsx mcp/adapter.ts mcp/examples/single-file-basic.ts --http --port 3000
 */

import { defineMCP } from '../single-file-types.js';
import { z } from 'zod';

export default defineMCP({
  name: 'basic-example',
  version: '1.0.0',

  // Define tools
  tools: [
    {
      name: 'greet',
      description: 'Greet a user with a personalized message',
      parameters: z.object({
        name: z.string().min(1).describe('The name of the person to greet'),
        formal: z.boolean().optional().describe('Use formal greeting'),
      }),
      execute: async (args) => {
        const greeting = args.formal ? 'Good day' : 'Hello';
        return `${greeting}, ${args.name}! Welcome!`;
      },
    },

    {
      name: 'add',
      description: 'Add two numbers together',
      parameters: z.object({
        a: z.number().describe('First number'),
        b: z.number().describe('Second number'),
      }),
      execute: async (args) => {
        const result = args.a + args.b;
        return `${args.a} + ${args.b} = ${result}`;
      },
    },

    {
      name: 'echo',
      description: 'Echo back a message',
      parameters: z.object({
        message: z.string().describe('Message to echo'),
        uppercase: z.boolean().optional().describe('Convert to uppercase'),
      }),
      execute: async (args) => {
        const message = args.uppercase ? args.message.toUpperCase() : args.message;
        return `Echo: ${message}`;
      },
    },

    {
      name: 'get_timestamp',
      description: 'Get the current timestamp',
      parameters: z.object({}),
      execute: async () => {
        return `Current timestamp: ${new Date().toISOString()}`;
      },
    },
  ],

  // Define prompts
  prompts: [
    {
      name: 'greeting',
      description: 'Generate a greeting prompt',
      arguments: [
        {
          name: 'name',
          description: 'Name of the person',
          required: true,
        },
      ],
      template: 'Hello {{name}}! How can I help you today?',
    },

    {
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
          description: 'What to focus on',
          required: false,
        },
      ],
      template: `Please review the following {{language}} code.
${(args: any) => (args.focus ? `Focus on: ${args.focus}` : 'Provide a general review.')}

Look for:
- Code quality
- Potential bugs
- Performance issues
- Best practices`,
    },
  ],

  // Define resources
  resources: [
    {
      uri: 'config://server',
      name: 'Server Configuration',
      description: 'Current server configuration',
      mimeType: 'application/json',
      content: {
        name: 'basic-example',
        version: '1.0.0',
        features: ['tools', 'prompts', 'resources'],
      },
    },

    {
      uri: 'doc://readme',
      name: 'README',
      description: 'Server documentation',
      mimeType: 'text/plain',
      content: `Basic Example MCP Server

This is a simple example demonstrating single-file MCP configuration.

Available Tools:
- greet: Greet a user
- add: Add two numbers
- echo: Echo a message
- get_timestamp: Get current timestamp

Available Prompts:
- greeting: Generate greeting
- code-review: Generate code review prompt

For more information, see the SimpleMCP documentation.`,
    },
  ],
});
