#!/usr/bin/env node
/**
 * MCP Stateless HTTP Server
 *
 * A stateless HTTP server that creates a new transport for each request.
 * No session tracking or persistence - each request is completely independent.
 *
 * Usage: node mcp/servers/statelessServer.ts [config.json]
 */

import express, { Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import cors from 'cors';
import { readFileSync } from 'fs';
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
const createToolHandler = (tool: ToolConfig, handlerManager: HandlerManager) => {
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
      console.warn(`[Security] Tool '${tool.name}' received potentially dangerous input:`);
      validationResult.warnings.forEach(warning => console.warn(`  - ${warning}`));
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
        sessionId: undefined, // No session in stateless mode
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

// Main server setup
const startServer = (configPath: string) => {
  const config = loadConfig(configPath);
  const MCP_PORT = config.port || 3003;

  const app = express();
  app.use(express.json());
  app.use(cors({
    origin: '*',
  }));

  // MCP POST endpoint - creates new transport for each request
  const mcpPostHandler = async (req: Request, res: Response) => {
    console.log('Received stateless MCP request (new transport will be created)');

    try {
      // Create a fresh transport for this request only
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => 'stateless', // Not used, but required
      });

      // Create a new server instance for this request
      const server = createServerFromConfig(config);
      await server.connect(transport);

      // Handle the request
      await transport.handleRequest(req, res, req.body);

      // Close the transport after handling (no persistence)
      setImmediate(async () => {
        try {
          await transport.close();
        } catch (error) {
          console.error('Error closing transport:', error);
        }
      });
    } catch (error) {
      console.error('Error handling stateless MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  };

  app.post('/mcp', mcpPostHandler);

  app.listen(MCP_PORT, () => {
    console.log(`MCP Stateless HTTP Server '${config.name}' v${config.version} listening on port ${MCP_PORT}`);
    console.log(`Loaded: ${config.tools?.length || 0} tools, ${config.prompts?.length || 0} prompts, ${config.resources?.length || 0} resources`);
    console.log('NOTE: This server is STATELESS - each request creates a new transport');
  });

  // Handle server shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down stateless server...');
    console.log('Server shutdown complete');
    process.exit(0);
  });
};

// CLI entry point
const configPath = process.argv[2] || './mcp/config-test.json';
console.log(`Loading configuration from: ${configPath}`);
startServer(configPath);