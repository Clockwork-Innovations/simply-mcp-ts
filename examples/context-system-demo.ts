#!/usr/bin/env node
/**
 * Simply-MCP Context System Demo
 *
 * This example demonstrates Simply-MCP's context system for accessing
 * server metadata and session operations.
 *
 * The context system provides three main property groups:
 * - context.server: Server metadata and configuration
 * - context.session: Session methods (notifications, logging, sampling)
 * - context.request_context: Request-specific data (request_id, lifespan_context)
 *
 * Usage:
 *   npx simply-mcp run examples/context-system-demo.ts
 */

import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

// Create server with metadata
const server = new BuildMCPServer({
  name: 'context-demo-server',
  version: '1.0.0',
  description: 'Demonstrates Simply-MCP context system',

  // Server instructions for LLMs
  instructions: 'This server demonstrates how to access server metadata and session methods via the context system.',

  // Server website
  website_url: 'https://github.com/simply-mcp/simply-mcp',

  // Server icons
  icons: {
    light: 'https://example.com/icon-light.png',
    dark: 'https://example.com/icon-dark.png',
  },

  // Custom server settings
  settings: {
    maxRetries: 3,
    timeout: 5000,
    enableDebug: true,
  },
});

/**
 * Tool 1: Get Server Information
 * Demonstrates accessing server metadata via context.server
 */
server.addTool({
  name: 'get_server_info',
  description: 'Get server metadata and configuration',
  parameters: z.object({}),
  execute: async (args, context) => {
    // Access server metadata through context
    const serverInfo = {
      name: context?.server.name,
      version: context?.server.version,
      description: context?.server.description,
      instructions: context?.server.instructions,
      website_url: context?.server.website_url,
      icons: context?.server.icons,
      settings: context?.server.settings,
    };

    return {
      content: [
        {
          type: 'text',
          text: `Server Information:\n${JSON.stringify(serverInfo, null, 2)}`,
        },
      ],
    };
  },
});

/**
 * Tool 2: Log with Request ID
 * Demonstrates logging with request tracking via context.request_context
 */
server.addTool({
  name: 'log_with_request_id',
  description: 'Log a message with request ID for tracking',
  parameters: z.object({
    message: z.string().describe('Message to log'),
    level: z.enum(['debug', 'info', 'notice', 'warning', 'error']).default('info').describe('Log level'),
  }),
  execute: async (args, context) => {
    const requestId = context?.request_context.request_id;
    const logMessage = `[Request ${requestId}] ${args.message}`;

    // Send log to client using session methods
    if (context?.session.send_log_message) {
      await context.session.send_log_message(
        args.level as any,
        logMessage,
        context.server.name
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: `Logged message with request ID: ${requestId}\nLevel: ${args.level}\nMessage: ${args.message}`,
        },
      ],
    };
  },
});

/**
 * Tool 3: Check Settings
 * Demonstrates accessing custom server settings
 */
server.addTool({
  name: 'check_settings',
  description: 'Check current server settings',
  parameters: z.object({
    setting_key: z.string().optional().describe('Specific setting key to check'),
  }),
  execute: async (args, context) => {
    const settings = context?.server.settings;

    if (args.setting_key) {
      const value = settings?.[args.setting_key];
      return {
        content: [
          {
            type: 'text',
            text: `Setting "${args.setting_key}": ${JSON.stringify(value)}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `All server settings:\n${JSON.stringify(settings, null, 2)}`,
        },
      ],
    };
  },
});

/**
 * Tool 4: Send Progress Notification
 * Demonstrates progress notifications using context.session
 */
server.addTool({
  name: 'process_with_progress',
  description: 'Process items with progress notifications',
  parameters: z.object({
    item_count: z.number().int().min(1).max(10).describe('Number of items to process'),
    delay_ms: z.number().int().min(100).max(2000).default(500).describe('Delay between items (ms)'),
  }),
  execute: async (args, context) => {
    const { item_count, delay_ms } = args;
    const results: string[] = [];

    // Get progress token from request metadata
    const progressToken = context?.request_context.meta?.progressToken;

    for (let i = 1; i <= item_count; i++) {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, delay_ms));

      const result = `Processed item ${i}`;
      results.push(result);

      // Send progress notification if supported
      if (progressToken && context?.session.send_progress_notification) {
        await context.session.send_progress_notification(
          progressToken,
          i,
          item_count,
          `Processing item ${i}/${item_count}`
        );
      }

      // Also log progress
      if (context?.session.send_log_message) {
        await context.session.send_log_message(
          'info',
          `[Request ${context.request_context.request_id}] Completed ${i}/${item_count}`,
          context.server.name
        );
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `Processed ${item_count} items:\n${results.join('\n')}`,
        },
      ],
    };
  },
});

/**
 * Tool 5: Context Structure Reference
 * Demonstrates the full context structure
 */
server.addTool({
  name: 'show_context_structure',
  description: 'Show the structure of the context object',
  parameters: z.object({}),
  execute: async (args, context) => {
    const structure = {
      'context.server': {
        name: context?.server.name,
        version: context?.server.version,
        description: context?.server.description,
        instructions: context?.server.instructions ? '(defined)' : undefined,
        website_url: context?.server.website_url,
        icons: context?.server.icons ? Object.keys(context.server.icons) : undefined,
        settings: context?.server.settings ? Object.keys(context.server.settings) : undefined,
      },
      'context.session': {
        send_log_message: typeof context?.session.send_log_message,
        create_message: typeof context?.session.create_message,
        send_progress_notification: typeof context?.session.send_progress_notification,
        send_resource_updated: typeof context?.session.send_resource_updated,
        send_resource_list_changed: typeof context?.session.send_resource_list_changed,
        send_tool_list_changed: typeof context?.session.send_tool_list_changed,
        send_prompt_list_changed: typeof context?.session.send_prompt_list_changed,
        client_params: context?.session.client_params ? '(defined)' : undefined,
      },
      'context.request_context': {
        request_id: context?.request_context.request_id,
        meta: context?.request_context.meta,
        lifespan_context: context?.request_context.lifespan_context ? '(available)' : undefined,
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `Context Structure:\n\n${JSON.stringify(structure, null, 2)}\n\n` +
                `This shows the three main parts of Simply-MCP's context system:\n` +
                `1. server - Server metadata and configuration\n` +
                `2. session - Methods for client interaction\n` +
                `3. request_context - Request-specific data`,
        },
      ],
    };
  },
});

// Add a resource demonstrating context usage
server.addResource({
  uri: 'doc://context-system',
  name: 'Context System Documentation',
  description: 'Documentation for Simply-MCP context system',
  mimeType: 'text/markdown',
  content: `# Simply-MCP Context System

The context object provides unified access to server information and capabilities.

## Structure

\`\`\`typescript
interface Context {
  server: ServerInfo;           // Server metadata
  session: Session;              // Session methods
  request_context: RequestContext; // Request data
}
\`\`\`

## Server Metadata (context.server)

Access server configuration and metadata:

- \`context.server.name\` - Server name
- \`context.server.version\` - Server version
- \`context.server.description\` - Server description
- \`context.server.instructions\` - Instructions for LLMs
- \`context.server.website_url\` - Server website URL
- \`context.server.icons\` - Server icon URIs
- \`context.server.settings\` - Custom server settings

## Session Methods (context.session)

Methods for interacting with the client:

- \`send_log_message(level, data, logger)\` - Send log to client
- \`create_message(messages, options)\` - Request LLM completion
- \`send_progress_notification(token, progress, total, message)\` - Report progress
- \`send_resource_updated(uri)\` - Notify resource update
- \`send_resource_list_changed()\` - Notify resource list change
- \`send_tool_list_changed()\` - Notify tool list change
- \`send_prompt_list_changed()\` - Notify prompt list change

## Request Context (context.request_context)

Request-specific information:

- \`context.request_context.request_id\` - Unique request ID (UUID)
- \`context.request_context.meta\` - Request metadata (e.g., progressToken)
- \`context.request_context.lifespan_context\` - Shared server-wide state

## Example Usage

\`\`\`typescript
server.addTool({
  name: 'example',
  execute: async (args, context) => {
    // Get server info
    const serverName = context.server.name;

    // Log with request ID
    await context.session.send_log_message(
      'info',
      \`Request \${context.request_context.request_id}: Processing...\`
    );

    // Check settings
    const maxRetries = context.server.settings?.maxRetries;

    return \`Processed on \${serverName}\`;
  }
});
\`\`\`
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

    console.error(`[ContextDemo] Server "${info.name}" v${info.version} started`);
    console.error(`[ContextDemo] Tools: ${stats.tools}, Prompts: ${stats.prompts}, Resources: ${stats.resources}`);
    console.error(`[ContextDemo] Context system available in all handlers`);
  } catch (error) {
    console.error('[ContextDemo] Failed to start server:', error);
    process.exit(1);
  }
})();
