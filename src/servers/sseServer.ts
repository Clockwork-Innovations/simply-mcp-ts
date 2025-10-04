#!/usr/bin/env node
/**
 * MCP SSE Transport Server (Legacy)
 *
 * A server using Server-Sent Events for streaming responses.
 * This is a legacy transport type maintained for backwards compatibility.
 *
 * Endpoints:
 * - GET /mcp - Establishes SSE stream
 * - POST /messages?sessionId=xxx - Send JSON-RPC requests
 *
 * Usage: node mcp/servers/sseServer.ts [config.json]
 */

import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
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

// Main server setup
const startServer = (configPath: string) => {
  const config = loadConfig(configPath);
  const MCP_PORT = config.port || 3004;

  const app = express();
  app.use(express.json());
  app.use(cors({
    origin: '*',
  }));

  // Store transports by session ID
  const transports: { [sessionId: string]: SSEServerTransport } = {};

  // GET /mcp - Establish SSE stream
  app.get('/mcp', async (req: Request, res: Response) => {
    console.log('New SSE connection request');

    try {
      // Create SSE transport
      // Note: The endpoint will have sessionId appended by the transport's start() method
      const transport = new SSEServerTransport('/messages', res);
      const sessionId = transport.sessionId;

      console.log(`Created session: ${sessionId}`);
      transports[sessionId] = transport;

      // Handle client disconnect - register this before connecting
      req.on('close', () => {
        console.log(`SSE connection closed for session ${sessionId}`);
        delete transports[sessionId];
        // Close the transport
        transport.close().catch((err) => {
          console.error(`Error closing transport for session ${sessionId}:`, err);
        });
      });

      // Create server and connect to transport
      // Note: server.connect() automatically calls transport.start()
      const server = createServerFromConfig(config);
      await server.connect(transport);

      console.log(`SSE stream established for session ${sessionId}`);

      // Keep the connection alive - don't return from this handler
      // The response is now managed by the SSE transport and will stay open

    } catch (error) {
      console.error('Error establishing SSE connection:', error);
      if (!res.headersSent) {
        res.status(500).send('Failed to establish SSE connection');
      }
    }
  });

  // POST /messages - Handle JSON-RPC requests
  app.post('/messages', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string | undefined;

    if (!sessionId || !transports[sessionId]) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Invalid or missing session ID',
        },
        id: null,
      });
      return;
    }

    console.log(`Received message for session ${sessionId}:`, req.body.method);

    try {
      const transport = transports[sessionId];
      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error('Error handling message:', error);
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
  });

  app.listen(MCP_PORT, () => {
    console.log(`MCP SSE Server '${config.name}' v${config.version} listening on port ${MCP_PORT}`);
    console.log(`Loaded: ${config.tools?.length || 0} tools, ${config.prompts?.length || 0} prompts, ${config.resources?.length || 0} resources`);
    console.log('Endpoints:');
    console.log(`  GET  /mcp - Establish SSE stream`);
    console.log(`  POST /messages?sessionId=xxx - Send messages`);
  });

  // Handle server shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down SSE server...');

    for (const sessionId in transports) {
      try {
        console.log(`Closing transport for session ${sessionId}`);
        await transports[sessionId].close();
        delete transports[sessionId];
      } catch (error) {
        console.error(`Error closing transport for session ${sessionId}:`, error);
      }
    }
    console.log('Server shutdown complete');
    process.exit(0);
  });
};

// CLI entry point
const configPath = process.argv[2] || './mcp/config-test.json';
console.log(`Loading configuration from: ${configPath}`);
startServer(configPath);