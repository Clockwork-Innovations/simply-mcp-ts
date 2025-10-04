import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
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
import { ServerConfig, ToolConfig, PromptConfig, ResourceConfig } from './types.js';
import { validateAndSanitize, errorToJsonRpc, isValidationError, isSanitizationError } from './validation/index.js';
import { createLLMFriendlyValidationError, formatErrorForLLM } from './validation/LLMFriendlyErrors.js';
import { HandlerManager } from './core/HandlerManager.js';
import { createDefaultLogger } from './core/logger.js';
import { HandlerExecutionError } from './core/errors.js';
import {
  createSecuritySystem,
  mergeSecurityConfig,
  SecuritySystem,
  AuthenticatedRequest,
  checkPermission,
} from './security/index.js';

// Load configuration from file
const loadConfig = (configPath: string): ServerConfig => {
  const configFile = readFileSync(configPath, 'utf-8');
  return JSON.parse(configFile);
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
        strictMode: false, // Don't throw, just warn and sanitize
        maxDepth: 10,
        maxStringLength: 10000,
        allowHtml: false,
      },
    });

    // If validation failed, return LLM-friendly error response
    if (!validationResult.valid) {
      const llmError = createLLMFriendlyValidationError(
        tool.name,
        tool.description,
        tool.inputSchema,
        validationResult.errors?.map(e => ({
          field: e.field || 'root',
          message: e.message,
          expected: undefined,
          actual: undefined,
        })) || [],
        args
      );

      const formattedError = formatErrorForLLM(llmError);

      return {
        content: [
          {
            type: 'text',
            text: formattedError,
          },
        ],
        isError: true, // Flag for MCP SDK
        _meta: llmError.error, // Include structured data for programmatic access
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
          errors: [
            {
              code: error.code,
              message: error.message,
              details: error.details,
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

  // Register tools
  if (config.tools && config.tools.length > 0) {
    const handlerManager = new HandlerManager();
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

      try {
        return await handler(request.params.arguments || {});
      } catch (error) {
        // Handle validation and sanitization errors
        if (isValidationError(error) || isSanitizationError(error)) {
          const jsonRpcError = errorToJsonRpc(error);
          throw new Error(jsonRpcError.message);
        }
        // Re-throw other errors
        throw error;
      }
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
  const MCP_PORT = config.port || 3000;

  const app = express();
  app.use(express.json());
  app.use(cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id']
  }));

  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  const isInitializeRequest = (body: any): boolean => {
    return body?.method === 'initialize';
  };

  // MCP POST endpoint
  const mcpPostHandler = async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId) {
      console.log(`Received MCP request for session: ${sessionId}`);
    }

    try {
      let transport: StreamableHTTPServerTransport;
      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            console.log(`Session initialized with ID: ${sessionId}`);
            transports[sessionId] = transport;
          }
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            console.log(`Transport closed for session ${sid}`);
            delete transports[sid];
          }
        };

        const server = createServerFromConfig(config);
        await server.connect(transport);

        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
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

  // Handle GET requests for SSE streams
  const mcpGetHandler = async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const lastEventId = req.headers['last-event-id'] as string | undefined;
    if (lastEventId) {
      console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
    } else {
      console.log(`Establishing new SSE stream for session ${sessionId}`);
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  };

  app.get('/mcp', mcpGetHandler);

  // Handle DELETE requests for session termination
  const mcpDeleteHandler = async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    console.log(`Received session termination request for session ${sessionId}`);

    try {
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('Error handling session termination:', error);
      if (!res.headersSent) {
        res.status(500).send('Error processing session termination');
      }
    }
  };

  app.delete('/mcp', mcpDeleteHandler);

  app.listen(MCP_PORT, () => {
    console.log(`MCP Server '${config.name}' v${config.version} listening on port ${MCP_PORT}`);
    console.log(`Loaded: ${config.tools?.length || 0} tools, ${config.prompts?.length || 0} prompts, ${config.resources?.length || 0} resources`);
  });

  // Handle server shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down server...');

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
const configPath = process.argv[2] || './mcp/config.json';
console.log(`Loading configuration from: ${configPath}`);
startServer(configPath);