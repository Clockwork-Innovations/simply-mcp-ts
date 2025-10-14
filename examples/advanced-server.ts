#!/usr/bin/env node
/**
 * SimplyMCP Advanced Example
 *
 * This example demonstrates more advanced SimplyMCP features:
 * - Complex validation with Zod schemas
 * - Error handling
 * - Using HandlerContext
 * - Returning structured results
 * - Async operations
 *
 * Usage:
 *   node mcp/examples/advanced-server.ts
 */

import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const server = new BuildMCPServer({
  name: 'advanced-example-server',
  version: '1.0.0',
});

// Tool with complex nested validation
server.addTool({
  name: 'create_user',
  description: 'Create a new user with validation',
  parameters: z.object({
    username: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[a-zA-Z0-9_]+$/)
      .describe('Username (3-20 chars, alphanumeric and underscore only)'),
    email: z
      .string()
      .email()
      .describe('Valid email address'),
    age: z
      .number()
      .int()
      .min(13)
      .max(120)
      .optional()
      .describe('User age (must be 13 or older)'),
    profile: z
      .object({
        firstName: z.string().min(1).describe('First name'),
        lastName: z.string().min(1).describe('Last name'),
        bio: z.string().max(500).optional().describe('Bio (max 500 chars)'),
        interests: z.array(z.string()).optional().describe('List of interests'),
      })
      .describe('User profile information'),
    settings: z
      .object({
        emailNotifications: z.boolean().default(true),
        theme: z.enum(['light', 'dark', 'auto']).default('auto'),
      })
      .optional()
      .describe('User settings'),
  }),
  execute: async (args, context) => {
    context?.logger.info(`Creating user: ${args.username}`);

    // Simulate user creation
    const user = {
      id: Math.random().toString(36).substring(7),
      username: args.username,
      email: args.email,
      age: args.age,
      profile: args.profile,
      settings: args.settings || {
        emailNotifications: true,
        theme: 'auto',
      },
      createdAt: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: 'text',
          text: `User created successfully!\n\n${JSON.stringify(user, null, 2)}`,
        },
      ],
      metadata: {
        userId: user.id,
        timestamp: user.createdAt,
      },
    };
  },
});

// Tool with async operations (simulated API call)
server.addTool({
  name: 'fetch_weather',
  description: 'Fetch weather data for a location',
  parameters: z.object({
    city: z.string().describe('City name'),
    units: z.enum(['metric', 'imperial']).default('metric').describe('Temperature units'),
  }),
  execute: async (args, context) => {
    context?.logger.info(`Fetching weather for ${args.city}`);

    // Simulate async API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simulate weather data
    const temp = args.units === 'metric' ? 22 : 72;
    const unit = args.units === 'metric' ? '°C' : '°F';

    return {
      content: [
        {
          type: 'text',
          text: `Weather in ${args.city}:\nTemperature: ${temp}${unit}\nConditions: Partly cloudy\nHumidity: 65%\nWind: 10 km/h`,
        },
      ],
      metadata: {
        city: args.city,
        temperature: temp,
        units: args.units,
        fetchedAt: new Date().toISOString(),
      },
    };
  },
});

// Tool with error handling
server.addTool({
  name: 'divide_safe',
  description: 'Safely divide two numbers with error handling',
  parameters: z.object({
    numerator: z.number().describe('Number to divide'),
    denominator: z.number().describe('Number to divide by'),
  }),
  execute: async (args) => {
    if (args.denominator === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Cannot divide by zero. Please provide a non-zero denominator.',
          },
        ],
        errors: [
          {
            code: 'DIVISION_BY_ZERO',
            message: 'Denominator cannot be zero',
            details: {
              numerator: args.numerator,
              denominator: args.denominator,
            },
          },
        ],
      };
    }

    const result = args.numerator / args.denominator;

    return {
      content: [
        {
          type: 'text',
          text: `${args.numerator} ÷ ${args.denominator} = ${result}`,
        },
      ],
      metadata: {
        result,
        precision: result.toString().split('.')[1]?.length || 0,
      },
    };
  },
});

// Tool with file system access (read only, safe)
server.addTool({
  name: 'list_files',
  description: 'List files in a directory (read-only)',
  parameters: z.object({
    path: z.string().default('.').describe('Directory path to list'),
    pattern: z.string().optional().describe('Filter pattern (e.g., "*.ts")'),
  }),
  execute: async (args, context) => {
    try {
      const files = readdirSync(args.path);

      let filteredFiles = files;
      if (args.pattern) {
        const regex = new RegExp(
          args.pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
        );
        filteredFiles = files.filter((f) => regex.test(f));
      }

      context?.logger.info(`Listed ${filteredFiles.length} files in ${args.path}`);

      return {
        content: [
          {
            type: 'text',
            text: `Files in ${args.path}:\n${filteredFiles.map((f) => `- ${f}`).join('\n')}`,
          },
        ],
        metadata: {
          path: args.path,
          totalFiles: filteredFiles.length,
          pattern: args.pattern,
        },
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing files: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        errors: [
          {
            code: 'FILE_SYSTEM_ERROR',
            message: error instanceof Error ? error.message : String(error),
            details: { path: args.path },
          },
        ],
      };
    }
  },
});

// Tool demonstrating multiple output types
server.addTool({
  name: 'analyze_text',
  description: 'Analyze text and return statistics',
  parameters: z.object({
    text: z.string().min(1).describe('Text to analyze'),
    includeDetails: z.boolean().default(false).describe('Include detailed analysis'),
  }),
  execute: async (args) => {
    const words = args.text.trim().split(/\s+/);
    const chars = args.text.length;
    const lines = args.text.split('\n').length;
    const sentences = args.text.split(/[.!?]+/).filter((s) => s.trim()).length;

    const stats = {
      characters: chars,
      words: words.length,
      lines,
      sentences,
      avgWordLength: chars / words.length,
    };

    let output = `Text Analysis:\n`;
    output += `- Characters: ${stats.characters}\n`;
    output += `- Words: ${stats.words}\n`;
    output += `- Lines: ${stats.lines}\n`;
    output += `- Sentences: ${stats.sentences}\n`;
    output += `- Avg word length: ${stats.avgWordLength.toFixed(2)}\n`;

    if (args.includeDetails) {
      const wordFreq = words.reduce((acc, word) => {
        const lower = word.toLowerCase();
        acc[lower] = (acc[lower] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topWords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      output += `\nTop 5 words:\n`;
      topWords.forEach(([word, count]) => {
        output += `- "${word}": ${count} times\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
      metadata: stats,
    };
  },
});

// Dynamic prompt with conditional logic
server.addPrompt({
  name: 'task-breakdown',
  description: 'Break down a complex task into steps',
  arguments: [
    {
      name: 'task',
      description: 'The task to break down',
      required: true,
    },
    {
      name: 'complexity',
      description: 'Task complexity (simple, moderate, complex)',
      required: false,
    },
  ],
  template: `Please break down the following task into actionable steps:

Task: {{task}}
Complexity: {{complexity}}

Provide a clear, numbered list of steps to complete this task. Each step should be:
1. Specific and actionable
2. Measurable
3. Achievable
4. Time-bound (estimate effort)

Consider potential challenges and dependencies between steps.`,
});

// Start the server
(async () => {
  try {
    await server.start({ transport: 'stdio' });

    const info = server.getInfo();
    const stats = server.getStats();

    console.error(`[Advanced Example] Server "${info.name}" v${info.version} is running`);
    console.error(`[Advanced Example] Stats:`, stats);
  } catch (error) {
    console.error('[Advanced Example] Failed to start server:', error);
    process.exit(1);
  }
})();
