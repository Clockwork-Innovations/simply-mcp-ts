#!/usr/bin/env node
/**
 * SimplyMCP Phase 1 Features Example
 *
 * This example demonstrates the new Phase 1 features:
 * 1. Sampling/LLM Completion Support
 * 2. Progress Notifications
 * 3. Enhanced Context API
 * 4. Logging to Client
 *
 * Usage:
 *   node mcp/examples/phase1-features.ts
 */

import { SimplyMCP } from '../SimplyMCP.js';
import { z } from 'zod';

// Create a new SimplyMCP server with enhanced capabilities
const server = new SimplyMCP({
  name: 'phase1-features-server',
  version: '1.0.0',
  capabilities: {
    sampling: true, // Enable LLM sampling requests
    logging: true, // Enable logging notifications to client
  },
});

// Example 1: Tool with Progress Reporting
server.addTool({
  name: 'process_large_dataset',
  description: 'Process a large dataset with progress reporting',
  parameters: z.object({
    items: z.array(z.string()).describe('Items to process'),
    delay: z.number().optional().describe('Delay between items (ms)'),
  }),
  execute: async (args, context) => {
    const items = args.items;
    const delay = args.delay || 100;
    const results: string[] = [];

    // Use progress reporting if available
    if (context?.reportProgress) {
      await context.reportProgress(0, items.length, 'Starting processing...');
    }

    for (let i = 0; i < items.length; i++) {
      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, delay));

      const result = `Processed: ${items[i]}`;
      results.push(result);

      // Report progress
      if (context?.reportProgress) {
        await context.reportProgress(i + 1, items.length, `Processing item ${i + 1}/${items.length}`);
      }

      // Log progress using enhanced logger
      if (context?.logger) {
        context.logger.info(`Processed item ${i + 1}/${items.length}: ${items[i]}`);
      }
    }

    if (context?.reportProgress) {
      await context.reportProgress(items.length, items.length, 'Processing complete!');
    }

    return {
      content: [
        {
          type: 'text',
          text: `Successfully processed ${items.length} items:\n${results.join('\n')}`,
        },
      ],
    };
  },
});

// Example 2: Tool with Enhanced Logging
server.addTool({
  name: 'log_test',
  description: 'Test all logging levels (debug, info, notice, warning, error, critical, alert, emergency)',
  parameters: z.object({
    message: z.string().describe('Message to log'),
  }),
  execute: async (args, context) => {
    const msg = args.message;

    if (context?.logger) {
      // Test all log levels
      context.logger.debug(`Debug: ${msg}`);
      context.logger.info(`Info: ${msg}`);

      if (context.logger.notice) {
        context.logger.notice(`Notice: ${msg}`);
      }

      context.logger.warn(`Warning: ${msg}`);
      context.logger.error(`Error: ${msg}`);

      if (context.logger.critical) {
        context.logger.critical(`Critical: ${msg}`);
      }

      if (context.logger.alert) {
        context.logger.alert(`Alert: ${msg}`);
      }

      if (context.logger.emergency) {
        context.logger.emergency(`Emergency: ${msg}`);
      }
    }

    return `Logged message at all levels: "${msg}"`;
  },
});

// Example 3: Tool with Resource Reading
server.addTool({
  name: 'read_config',
  description: 'Read a configuration resource',
  parameters: z.object({
    resourceUri: z.string().describe('URI of the resource to read'),
  }),
  execute: async (args, context) => {
    if (!context?.readResource) {
      return 'Resource reading not available in this context';
    }

    try {
      const resource = await context.readResource(args.resourceUri);

      if (context.logger) {
        context.logger.info(`Successfully read resource: ${resource.uri}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Resource: ${resource.uri}\nMIME Type: ${resource.mimeType}\n\nContent:\n${resource.text || resource.blob || '(empty)'}`,
          },
        ],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (context.logger) {
        context.logger.error(`Failed to read resource: ${errorMsg}`);
      }

      return `Error reading resource: ${errorMsg}`;
    }
  },
});

// Example 4: Tool that would use Sampling (placeholder - requires client support)
server.addTool({
  name: 'ask_llm',
  description: 'Request an LLM completion (requires client with sampling support)',
  parameters: z.object({
    prompt: z.string().describe('Prompt for the LLM'),
    maxTokens: z.number().optional().describe('Maximum tokens to generate'),
  }),
  execute: async (args, context) => {
    if (!context?.sample) {
      return {
        content: [
          {
            type: 'text',
            text: 'Sampling is not available. This feature requires:\n1. Server started with sampling capability enabled\n2. Client that supports sampling/createMessage requests',
          },
        ],
      };
    }

    try {
      // Prepare sampling request
      const messages = [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: args.prompt,
          },
        },
      ];

      const options = {
        maxTokens: args.maxTokens || 1000,
      };

      // Request LLM completion from client
      const result = await context.sample(messages, options);

      if (context.logger) {
        context.logger.info(`LLM response received (model: ${result.model})`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `LLM Response (${result.model}):\n\n${result.content.text || '(no text)'}`,
          },
        ],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (context.logger) {
        context.logger.error(`Sampling failed: ${errorMsg}`);
      }

      return `Sampling error: ${errorMsg}`;
    }
  },
});

// Add some resources for testing
server.addResource({
  uri: 'config://app-settings',
  name: 'Application Settings',
  description: 'Application configuration settings',
  mimeType: 'application/json',
  content: {
    appName: 'Phase 1 Features Demo',
    version: '1.0.0',
    features: {
      progressNotifications: true,
      logging: true,
      sampling: true,
      resourceReading: true,
    },
    maxConcurrentRequests: 10,
    defaultTimeout: 30000,
  },
});

server.addResource({
  uri: 'doc://capabilities',
  name: 'Server Capabilities',
  description: 'Documentation of server capabilities',
  mimeType: 'text/markdown',
  content: `# Phase 1 Features Server

This server demonstrates the Phase 1: Core Protocol Completeness features:

## 1. Sampling/LLM Completion Support
- Servers can request LLM completions from clients
- Use \`ctx.sample(messages, options)\` in tool handlers
- Requires client with sampling support

## 2. Progress Notifications
- Report progress during long-running operations
- Use \`ctx.reportProgress(current, total, message)\`
- Client receives real-time progress updates

## 3. Enhanced Context API
- \`ctx.sample()\` - Request LLM completion
- \`ctx.reportProgress()\` - Send progress updates
- \`ctx.readResource(uri)\` - Read server resources
- Extended logger with all MCP log levels

## 4. Logging to Client
- Structured logging sent to client as notifications
- Support for 8 log levels: debug, info, notice, warning, error, critical, alert, emergency
- Enable with \`capabilities.logging: true\`

## Available Tools

1. **process_large_dataset** - Demonstrates progress reporting
2. **log_test** - Tests all logging levels
3. **read_config** - Demonstrates resource reading
4. **ask_llm** - Demonstrates sampling (requires client support)

## Available Resources

- \`config://app-settings\` - Application configuration
- \`doc://capabilities\` - This documentation
`,
});

// Start the server
(async () => {
  try {
    await server.start({
      transport: 'stdio',
    });

    const info = server.getInfo();
    const stats = server.getStats();

    console.error(`[Phase1Example] Server "${info.name}" v${info.version} is running`);
    console.error(`[Phase1Example] Stats:`, stats);
    console.error(`[Phase1Example] Capabilities: sampling, logging, progress, resources`);
  } catch (error) {
    console.error('[Phase1Example] Failed to start server:', error);
    process.exit(1);
  }
})();
