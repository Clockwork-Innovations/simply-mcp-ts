#!/usr/bin/env node
/**
 * MCP Stdio Transport Server
 *
 * A configurable MCP server using standard input/output for communication.
 * Reads JSON-RPC requests from stdin and writes responses to stdout.
 *
 * Usage: node mcp/servers/stdioServer.ts [config.json]
 */

import { readFileSync } from 'fs';
import readline from 'readline';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ServerConfig, ToolConfig } from '../types.js';
import { validateAndSanitize } from '../validation/index.js';
import { HandlerManager } from '../core/HandlerManager.js';
import { createDefaultLogger } from '../core/logger.js';
import { HandlerExecutionError } from '../core/errors.js';

// Load configuration from file
const loadConfig = (configPath: string): ServerConfig => {
  try {
    const configFile = readFileSync(configPath, 'utf-8');
    return JSON.parse(configFile);
  } catch (error) {
    console.error(`Failed to load config from ${configPath}:`, error);
    process.exit(1);
  }
};

// Replace template variables like {{name}} with actual values
const renderTemplate = (template: string, variables: Record<string, any>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] ?? `{{${key}}}`;
  });
};

// Create dynamic tool handler using HandlerManager
const createToolHandler = (tool: ToolConfig, handlerManager: HandlerManager, sessionId?: string) => {
  return async (args: Record<string, any>): Promise<{ content: Array<{ type: string; text: string }> }> => {
    // Validate and sanitize tool arguments
    const validationResult = validateAndSanitize(args, tool.inputSchema, {
      sanitize: true,
      validate: true,
      sanitizeFirst: true,
      sanitization: {
        strictMode: false,
        maxDepth: 10,
        maxStringLength: 10000,
        allowHtml: false,
      },
    });

    // If validation failed, return error response
    if (!validationResult.valid) {
      const errorMessages = validationResult.errors?.map(e =>
        e.field ? `${e.field}: ${e.message}` : e.message
      ).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Validation Error:\n${errorMessages}`,
          },
        ],
      };
    }

    // Log warnings if any
    if (validationResult.warnings && validationResult.warnings.length > 0) {
      console.error(`[Security] Tool '${tool.name}' received potentially dangerous input:`);
      validationResult.warnings.forEach(warning => console.error(`  - ${warning}`));
    }

    // Use validated and sanitized arguments
    const validatedArgs = validationResult.data || args;

    try {
      // Parse handler configuration
      const handlerConfig = handlerManager.parseHandlerConfig(tool.handler);

      // Resolve handler function
      const handler = await handlerManager.resolveHandler(handlerConfig);

      // Create handler context
      const context = {
        sessionId,
        logger: createDefaultLogger(`[Tool:${tool.name}]`),
        metadata: {
          toolName: tool.name,
        },
      };

      // Execute handler
      const result = await handlerManager.executeHandler(handler, validatedArgs, context);

      return result;
    } catch (error) {
      // Handle handler execution errors
      if (error instanceof HandlerExecutionError) {
        console.error(`[Handler Error] ${error.code}: ${error.message}`, error.details);
        return {
          content: [
            {
              type: 'text',
              text: `Handler Error (${error.code}):\n${error.message}`,
            },
          ],
        };
      }

      // Generic error handling
      console.error(`[Tool Error] Unexpected error in tool '${tool.name}':`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  };
};

// Create MCP server from config
const createServerFromConfig = (config: ServerConfig) => {
  const server = new Server(
    {
      name: config.name,
      version: config.version,
    },
    {
      capabilities: {
        tools: config.tools ? {} : undefined,
        prompts: config.prompts ? {} : undefined,
        resources: config.resources ? {} : undefined,
      },
    }
  );

  // Initialize handler manager
  const handlerManager = new HandlerManager({
    basePath: process.cwd(),
    defaultTimeout: 5000,
  });

  // Register tools
  if (config.tools && config.tools.length > 0) {
    const toolHandlers = new Map<string, (args: any) => Promise<any>>();

    config.tools.forEach((tool) => {
      toolHandlers.set(tool.name, createToolHandler(tool, handlerManager));
    });

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: config.tools!.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const handler = toolHandlers.get(toolName);

      if (!handler) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      return await handler(request.params.arguments || {});
    });
  }

  // Register prompts
  if (config.prompts && config.prompts.length > 0) {
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: config.prompts!.map((prompt) => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments || [],
        })),
      };
    });

    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const promptName = request.params.name;
      const prompt = config.prompts!.find((p) => p.name === promptName);

      if (!prompt) {
        throw new Error(`Unknown prompt: ${promptName}`);
      }

      const renderedText = renderTemplate(prompt.template, request.params.arguments || {});

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: renderedText,
            },
          },
        ],
      };
    });
  }

  // Register resources
  if (config.resources && config.resources.length > 0) {
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: config.resources!.map((resource) => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        })),
      };
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const resourceUri = request.params.uri;
      const resource = config.resources!.find((r) => r.uri === resourceUri);

      if (!resource) {
        throw new Error(`Unknown resource: ${resourceUri}`);
      }

      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: typeof resource.content === 'string'
              ? resource.content
              : JSON.stringify(resource.content, null, 2),
          },
        ],
      };
    });
  }

  return server;
};

// Main entry point
const main = async () => {
  const configPath = process.argv[2] || './mcp/config-test.json';

  // Log to stderr to keep stdout clean for JSON-RPC
  console.error(`[Stdio Server] Loading configuration from: ${configPath}`);

  const config = loadConfig(configPath);
  console.error(`[Stdio Server] Starting '${config.name}' v${config.version}`);
  console.error(`[Stdio Server] Loaded: ${config.tools?.length || 0} tools, ${config.prompts?.length || 0} prompts, ${config.resources?.length || 0} resources`);

  const server = createServerFromConfig(config);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('[Stdio Server] Connected and ready for requests');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('[Stdio Server] Shutting down...');
    await server.close();
    process.exit(0);
  });
};

main().catch((error) => {
  console.error('[Stdio Server] Fatal error:', error);
  process.exit(1);
});