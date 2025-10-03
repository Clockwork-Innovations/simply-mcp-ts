/**
 * SimpleMCP - A simplified single-file MCP server framework
 * Inspired by FastMCP but built on the existing MCP infrastructure
 *
 * Usage:
 * ```typescript
 * import { SimpleMCP } from './SimpleMCP';
 * import { z } from 'zod';
 *
 * const server = new SimpleMCP({
 *   name: 'my-server',
 *   version: '1.0.0'
 * });
 *
 * server.addTool({
 *   name: 'greet',
 *   description: 'Greet a user',
 *   parameters: z.object({
 *     name: z.string(),
 *   }),
 *   execute: async (args) => {
 *     return `Hello, ${args.name}!`;
 *   },
 * });
 *
 * await server.start();
 * ```
 */

import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CreateMessageRequestSchema,
  CreateMessageResult,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z, ZodSchema, ZodError } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { HandlerManager } from './core/HandlerManager.js';
import { HandlerContext, HandlerResult, ToolHandler, SamplingMessage, SamplingOptions, ResourceContents } from './core/types.js';
import { validateAndSanitize } from './validation/index.js';
import { parseInlineDependencies, ParsedDependencies, InlineDependencies } from './core/index.js';
import { createDefaultLogger, LogLevel, LogNotificationCallback } from './core/logger.js';
import { HandlerExecutionError } from './core/errors.js';
import { InstallOptions, InstallResult, DependencyStatus } from './core/installation-types.js';
import { checkDependencies } from './core/dependency-checker.js';
import { installDependencies } from './core/dependency-installer.js';
import { createLLMFriendlyValidationError, formatErrorForLLM } from './validation/LLMFriendlyErrors.js';
import {
  ImageInput,
  BinaryInput,
  AudioInput,
  createImageContent,
  createAudioContent,
  createBlobContent,
  bufferToBase64,
  isBuffer,
  isUint8Array,
} from './core/content-helpers.js';

// Type definitions for SimpleMCP

export type ExecuteFunction<T = any> = (
  args: T,
  context?: HandlerContext
) =>
  | Promise<string | HandlerResult | ImageInput | BinaryInput | AudioInput>
  | string
  | HandlerResult
  | ImageInput
  | BinaryInput
  | AudioInput;

export interface ToolDefinition<T = any> {
  name: string;
  description: string;
  parameters: ZodSchema<T>;
  execute: ExecuteFunction<T>;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  template: string;
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  content: string | { [key: string]: any } | Buffer | Uint8Array;
}

export interface SimpleMCPOptions {
  name: string;
  version: string;
  port?: number;
  basePath?: string;
  defaultTimeout?: number;

  // Optional capability flags
  capabilities?: {
    sampling?: boolean; // Enable LLM sampling/completion requests
    logging?: boolean; // Enable logging notifications to client
  };

  // Inline dependencies support (Phase 2, Feature 2)
  dependencies?: ParsedDependencies; // Pre-parsed dependencies from source code

  // Auto-installation support (Phase 2, Feature 3)
  autoInstall?: boolean | InstallOptions; // Enable automatic dependency installation
}

export type TransportType = 'stdio' | 'http';

export interface StartOptions {
  transport?: TransportType;
  port?: number;
}

/**
 * Internal storage for registered items
 */
interface InternalTool {
  definition: ToolDefinition;
  jsonSchema: any;
}

/**
 * SimpleMCP Server - A simplified API for creating MCP servers
 */
export class SimpleMCP {
  private options: Required<SimpleMCPOptions>;
  private tools: Map<string, InternalTool> = new Map();
  private prompts: Map<string, PromptDefinition> = new Map();
  private resources: Map<string, ResourceDefinition> = new Map();
  private handlerManager: HandlerManager;
  private server?: Server;
  private httpServer?: any;
  private transports: Map<string, StreamableHTTPServerTransport> = new Map();
  private isRunning: boolean = false;
  private dependencies?: ParsedDependencies;

  /**
   * Create a new SimpleMCP server
   */
  constructor(options: SimpleMCPOptions) {
    this.options = {
      name: options.name,
      version: options.version,
      port: options.port || 3000,
      basePath: options.basePath || process.cwd(),
      defaultTimeout: options.defaultTimeout || 5000,
      capabilities: options.capabilities || {},
      dependencies: options.dependencies || undefined,
    } as Required<SimpleMCPOptions>;

    this.handlerManager = new HandlerManager({
      basePath: this.options.basePath,
      defaultTimeout: this.options.defaultTimeout,
    });

    // Store dependencies if provided
    if (options.dependencies) {
      this.dependencies = options.dependencies;
    }
  }

  /**
   * Add a tool to the server
   * @param definition Tool definition with Zod schema and execute function
   * @returns this for chaining
   */
  addTool<T = any>(definition: ToolDefinition<T>): this {
    if (this.isRunning) {
      throw new Error('Cannot add tools after server has started');
    }

    if (this.tools.has(definition.name)) {
      throw new Error(`Tool '${definition.name}' is already registered`);
    }

    // Convert Zod schema to JSON Schema using zod-to-json-schema
    const jsonSchema = zodToJsonSchema(definition.parameters, {
      target: 'openApi3',
    });

    // Store the tool
    this.tools.set(definition.name, {
      definition,
      jsonSchema,
    });

    return this;
  }

  /**
   * Add a prompt to the server
   * @param definition Prompt definition
   * @returns this for chaining
   */
  addPrompt(definition: PromptDefinition): this {
    if (this.isRunning) {
      throw new Error('Cannot add prompts after server has started');
    }

    if (this.prompts.has(definition.name)) {
      throw new Error(`Prompt '${definition.name}' is already registered`);
    }

    this.prompts.set(definition.name, definition);
    return this;
  }

  /**
   * Add a resource to the server
   * @param definition Resource definition
   * @returns this for chaining
   */
  addResource(definition: ResourceDefinition): this {
    if (this.isRunning) {
      throw new Error('Cannot add resources after server has started');
    }

    if (this.resources.has(definition.uri)) {
      throw new Error(`Resource with URI '${definition.uri}' is already registered`);
    }

    this.resources.set(definition.uri, definition);
    return this;
  }

  /**
   * Start the server
   * @param options Start options (transport type, port)
   */
  async start(options: StartOptions = {}): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    const transport = options.transport || 'stdio';

    // Create the MCP server
    this.server = new Server(
      {
        name: this.options.name,
        version: this.options.version,
      },
      {
        capabilities: {
          tools: this.tools.size > 0 ? {} : undefined,
          prompts: this.prompts.size > 0 ? {} : undefined,
          resources: this.resources.size > 0 ? {} : undefined,
          logging: this.options.capabilities?.logging ? {} : undefined,
        },
      }
    );

    // Register handlers
    this.registerToolHandlers();
    this.registerPromptHandlers();
    this.registerResourceHandlers();

    // Start the appropriate transport
    if (transport === 'stdio') {
      await this.startStdio();
    } else {
      await this.startHttp(options.port || this.options.port);
    }

    this.isRunning = true;
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Shutting down SimpleMCP server...');

    // Close HTTP server if running
    if (this.httpServer) {
      await new Promise<void>((resolve, reject) => {
        this.httpServer.close((err: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Close all transports
    const transportEntries = Array.from(this.transports.entries());
    for (const [sessionId, transport] of transportEntries) {
      try {
        console.log(`Closing transport for session ${sessionId}`);
        await transport.close();
      } catch (error) {
        console.error(`Error closing transport for session ${sessionId}:`, error);
      }
    }
    this.transports.clear();

    // Close the server
    if (this.server) {
      await this.server.close();
    }

    this.isRunning = false;
    console.log('SimpleMCP server stopped');
  }

  /**
   * Register tool handlers with the MCP server
   */
  private registerToolHandlers(): void {
    if (!this.server || this.tools.size === 0) {
      return;
    }

    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const toolsList = Array.from(this.tools.values()).map((tool) => ({
        name: tool.definition.name,
        description: tool.definition.description,
        inputSchema: tool.jsonSchema,
      }));

      return { tools: toolsList };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const toolName = request.params.name;
      const tool = this.tools.get(toolName);

      if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      const args = request.params.arguments || {};
      const progressToken = request.params._meta?.progressToken;

      // Validate arguments using Zod
      try {
        const validatedArgs = tool.definition.parameters.parse(args);

        // Create logger with notification callback
        const logNotificationCallback: LogNotificationCallback | undefined =
          this.options.capabilities?.logging && this.server
            ? (level: LogLevel, message: string, data?: unknown) => {
                this.sendLoggingNotification(level, message, data);
              }
            : undefined;

        const logger = createDefaultLogger(`[Tool:${toolName}]`, logNotificationCallback);

        // Create handler context with enhanced capabilities
        const context: HandlerContext = {
          logger,
          metadata: {
            toolName,
            progressToken,
          },
        };

        // Add sampling capability if enabled
        if (this.options.capabilities?.sampling && this.server) {
          context.sample = async (messages: SamplingMessage[], options?: SamplingOptions) => {
            return this.requestSampling(messages, options);
          };
        }

        // Add progress reporting capability if progressToken is present
        if (progressToken !== undefined && this.server) {
          context.reportProgress = async (progress: number, total?: number, message?: string) => {
            this.sendProgressNotification(progressToken, progress, total, message);
          };
        }

        // Add resource reading capability if resources are available
        if (this.resources.size > 0) {
          context.readResource = async (uri: string) => {
            return this.readResourceByUri(uri);
          };
        }

        // Execute the tool
        const result = await tool.definition.execute(validatedArgs, context);

        // Normalize result
        return await this.normalizeResult(result, logger);
      } catch (error) {
        // Handle Zod validation errors
        if (error instanceof ZodError) {
          const errorMessages = error.issues.map((e) => {
            const path = e.path.join('.');
            return path ? `${path}: ${e.message}` : e.message;
          }).join('\n');

          return {
            content: [
              {
                type: 'text',
                text: `Validation Error:\n${errorMessages}`,
              },
            ],
            isError: true,
          };
        }

        // Handle execution errors
        if (error instanceof HandlerExecutionError) {
          return {
            content: [
              {
                type: 'text',
                text: `Handler Error (${error.code}):\n${error.message}`,
              },
            ],
            isError: true,
          };
        }

        // Generic error
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Register prompt handlers with the MCP server
   */
  private registerPromptHandlers(): void {
    if (!this.server || this.prompts.size === 0) {
      return;
    }

    // List prompts handler
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const promptsList = Array.from(this.prompts.values()).map((prompt) => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments || [],
      }));

      return { prompts: promptsList };
    });

    // Get prompt handler
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const promptName = request.params.name;
      const prompt = this.prompts.get(promptName);

      if (!prompt) {
        throw new Error(`Unknown prompt: ${promptName}`);
      }

      // Render template with variables
      const renderedText = this.renderTemplate(
        prompt.template,
        request.params.arguments || {}
      );

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

  /**
   * Register resource handlers with the MCP server
   */
  private registerResourceHandlers(): void {
    if (!this.server || this.resources.size === 0) {
      return;
    }

    // List resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resourcesList = Array.from(this.resources.values()).map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      }));

      return { resources: resourcesList };
    });

    // Read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const resourceUri = request.params.uri;
      const resource = this.resources.get(resourceUri);

      if (!resource) {
        throw new Error(`Unknown resource: ${resourceUri}`);
      }

      // Handle binary content (Buffer or Uint8Array)
      if (isBuffer(resource.content) || isUint8Array(resource.content)) {
        const base64Data = bufferToBase64(resource.content);
        return {
          contents: [
            {
              uri: resource.uri,
              mimeType: resource.mimeType,
              blob: base64Data,
            },
          ],
        };
      }

      // Handle text content
      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text:
              typeof resource.content === 'string'
                ? resource.content
                : JSON.stringify(resource.content, null, 2),
          },
        ],
      };
    });
  }

  /**
   * Start the server with stdio transport
   */
  private async startStdio(): Promise<void> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    console.error(
      `[SimpleMCP] Starting '${this.options.name}' v${this.options.version} (stdio transport)`
    );
    console.error(
      `[SimpleMCP] Registered: ${this.tools.size} tools, ${this.prompts.size} prompts, ${this.resources.size} resources`
    );

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('[SimpleMCP] Connected and ready for requests');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await this.stop();
      process.exit(0);
    });
  }

  /**
   * Start the server with HTTP transport
   */
  private async startHttp(port: number): Promise<void> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const app = express();
    app.use(express.json());
    app.use(
      cors({
        origin: '*',
        exposedHeaders: ['Mcp-Session-Id'],
      })
    );

    // Security: Origin header validation middleware
    app.use('/mcp', (req, res, next) => {
      const origin = req.headers.origin || req.headers.referer;

      // Allow requests from localhost/127.0.0.1 (development)
      // In production, you should configure allowed origins more strictly
      if (origin) {
        const url = new URL(origin);
        const allowedHosts = ['localhost', '127.0.0.1', '::1'];
        if (!allowedHosts.includes(url.hostname)) {
          console.warn(`[SimpleMCP] Blocked request from unauthorized origin: ${origin}`);
          res.status(403).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Forbidden: Invalid origin',
            },
            id: null,
          });
          return;
        }
      }
      next();
    });

    const isInitializeRequest = (body: any): boolean => {
      return body?.method === 'initialize';
    };

    // MCP POST endpoint
    app.post('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      try {
        let transport: StreamableHTTPServerTransport;

        if (sessionId && this.transports.has(sessionId)) {
          transport = this.transports.get(sessionId)!;
        } else if (!sessionId && isInitializeRequest(req.body)) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              console.log(`Session initialized with ID: ${sid}`);
              this.transports.set(sid, transport);
            },
          });

          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid && this.transports.has(sid)) {
              console.log(`Transport closed for session ${sid}`);
              this.transports.delete(sid);
            }
          };

          await this.server!.connect(transport);
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
    });

    // MCP GET endpoint (SSE)
    app.get('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (!sessionId || !this.transports.has(sessionId)) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }

      const transport = this.transports.get(sessionId)!;
      await transport.handleRequest(req, res);
    });

    // MCP DELETE endpoint (session termination)
    app.delete('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (!sessionId || !this.transports.has(sessionId)) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }

      try {
        const transport = this.transports.get(sessionId)!;
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error('Error handling session termination:', error);
        if (!res.headersSent) {
          res.status(500).send('Error processing session termination');
        }
      }
    });

    // Start HTTP server
    this.httpServer = app.listen(port, () => {
      console.log(
        `[SimpleMCP] Server '${this.options.name}' v${this.options.version} listening on port ${port}`
      );
      console.log(
        `[SimpleMCP] Registered: ${this.tools.size} tools, ${this.prompts.size} prompts, ${this.resources.size} resources`
      );
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await this.stop();
      process.exit(0);
    });
  }

  /**
   * Render a template string with variables
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return variables[key] ?? `{{${key}}}`;
    });
  }

  /**
   * Normalize result to HandlerResult format
   * Handles text, binary content (Buffer/Uint8Array), and structured objects
   */
  private async normalizeResult(
    result: string | HandlerResult | ImageInput | BinaryInput | AudioInput,
    logger?: { warn: (message: string) => void }
  ): Promise<HandlerResult> {
    // If already in correct HandlerResult format
    if (
      result &&
      typeof result === 'object' &&
      'content' in result &&
      Array.isArray(result.content)
    ) {
      return result;
    }

    // If result is a string, wrap it as text
    if (typeof result === 'string') {
      return {
        content: [{ type: 'text', text: result }],
      };
    }

    // If result is Buffer or Uint8Array, convert to image
    if (isBuffer(result) || isUint8Array(result)) {
      try {
        const imageContent = await createImageContent(
          result,
          undefined,
          this.options.basePath,
          logger
        );
        return { content: [imageContent] };
      } catch (error) {
        throw new HandlerExecutionError(
          `Failed to convert binary result to image: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'BINARY_CONVERSION_ERROR',
          { originalError: error }
        );
      }
    }

    // If result is an object with type hint
    if (result && typeof result === 'object') {
      if ('type' in result) {
        const resultType = result.type;

        try {
          if (resultType === 'image') {
            const imageContent = await createImageContent(
              result as ImageInput,
              undefined,
              this.options.basePath,
              logger
            );
            return { content: [imageContent] };
          }

          if (resultType === 'audio') {
            const audioContent = await createAudioContent(
              result as AudioInput,
              undefined,
              this.options.basePath,
              logger
            );
            return { content: [audioContent] };
          }

          if (resultType === 'binary') {
            const binaryContent = await createBlobContent(
              result as BinaryInput,
              undefined,
              this.options.basePath,
              logger
            );
            return { content: [binaryContent] };
          }

          if (resultType === 'file') {
            // File path - try to detect content type and convert
            if ('path' in result && typeof result.path === 'string') {
              const filePath = result.path;
              const mimeType = 'mimeType' in result ? (result.mimeType as string) : undefined;

              // Determine content type based on MIME type
              if (mimeType?.startsWith('image/')) {
                const imageContent = await createImageContent(
                  result as ImageInput,
                  mimeType,
                  this.options.basePath,
                  logger
                );
                return { content: [imageContent] };
              } else if (mimeType?.startsWith('audio/')) {
                const audioContent = await createAudioContent(
                  result as AudioInput,
                  mimeType,
                  this.options.basePath,
                  logger
                );
                return { content: [audioContent] };
              } else {
                // Default to binary content for other file types
                const binaryContent = await createBlobContent(
                  result as BinaryInput,
                  mimeType,
                  this.options.basePath,
                  logger
                );
                return { content: [binaryContent] };
              }
            }
          }
        } catch (error) {
          throw new HandlerExecutionError(
            `Failed to convert ${resultType} content: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'CONTENT_CONVERSION_ERROR',
            { type: resultType, originalError: error }
          );
        }
      }
    }

    // Default case (shouldn't happen with TypeScript)
    return {
      content: [{ type: 'text', text: String(result) }],
    };
  }

  /**
   * Get server info
   */
  getInfo(): { name: string; version: string; isRunning: boolean } {
    return {
      name: this.options.name,
      version: this.options.version,
      isRunning: this.isRunning,
    };
  }

  /**
   * Get statistics about registered items
   */
  getStats(): { tools: number; prompts: number; resources: number } {
    return {
      tools: this.tools.size,
      prompts: this.prompts.size,
      resources: this.resources.size,
    };
  }

  /**
   * Get inline dependencies
   * Returns parsed dependencies if available
   *
   * @returns Parsed dependencies or null if none declared
   *
   * @example
   * ```typescript
   * const deps = server.getDependencies();
   * if (deps) {
   *   console.log('Dependencies:', deps.map);
   * }
   * ```
   */
  getDependencies(): ParsedDependencies | null {
    return this.dependencies || null;
  }

  /**
   * Check if a specific dependency is declared
   *
   * @param packageName - Package name to check
   * @returns True if dependency is declared
   *
   * @example
   * ```typescript
   * if (server.hasDependency('axios')) {
   *   console.log('Server uses axios');
   * }
   * ```
   */
  hasDependency(packageName: string): boolean {
    return this.dependencies?.map[packageName] !== undefined;
  }

  /**
   * Get version specifier for a specific package
   *
   * @param packageName - Package name to lookup
   * @returns Version specifier or undefined if not declared
   *
   * @example
   * ```typescript
   * const version = server.getDependencyVersion('axios');
   * console.log(`axios version: ${version}`);
   * ```
   */
  getDependencyVersion(packageName: string): string | undefined {
    return this.dependencies?.map[packageName];
  }

  /**
   * Install missing dependencies
   *
   * @param options - Installation options
   * @returns Installation result
   *
   * @example
   * ```typescript
   * const result = await server.installDependencies({
   *   packageManager: 'npm',
   *   timeout: 10 * 60 * 1000, // 10 minutes
   *   onProgress: (event) => {
   *     console.log(`${event.type}: ${event.message}`);
   *   }
   * });
   *
   * if (result.success) {
   *   console.log(`Installed: ${result.installed.join(', ')}`);
   * } else {
   *   console.error(`Errors: ${result.errors.length}`);
   * }
   * ```
   */
  async installDependencies(options?: InstallOptions): Promise<InstallResult> {
    if (!this.dependencies || Object.keys(this.dependencies.map).length === 0) {
      return {
        success: true,
        installed: [],
        failed: [],
        skipped: [],
        packageManager: 'none',
        lockFile: null,
        duration: 0,
        errors: [],
        warnings: ['No dependencies to install'],
      };
    }

    const deps = this.dependencies.map;
    const installOpts = {
      cwd: this.options.basePath,
      ...options,
    };

    return installDependencies(deps, installOpts);
  }

  /**
   * Check dependency status (installed vs missing)
   *
   * @returns Dependency check result
   *
   * @example
   * ```typescript
   * const status = await server.checkDependencies();
   * console.log(`Missing: ${status.missing.join(', ')}`);
   * console.log(`Installed: ${status.installed.join(', ')}`);
   * ```
   */
  async checkDependencies(): Promise<DependencyStatus> {
    if (!this.dependencies || Object.keys(this.dependencies.map).length === 0) {
      return {
        installed: [],
        missing: [],
        outdated: [],
      };
    }

    return checkDependencies(this.dependencies.map, this.options.basePath);
  }

  /**
   * Create SimpleMCP server from file with inline dependencies
   * Parses the file content to extract inline dependency declarations
   *
   * @param filePath - Path to server file
   * @param options - Additional server options (will override parsed values)
   * @returns Promise resolving to SimpleMCP instance
   *
   * @example
   * ```typescript
   * // Without auto-install (default)
   * const server = await SimpleMCP.fromFile('./server.ts');
   *
   * // With auto-install
   * const server = await SimpleMCP.fromFile('./server.ts', {
   *   autoInstall: true
   * });
   *
   * // With custom install options
   * const server = await SimpleMCP.fromFile('./server.ts', {
   *   autoInstall: {
   *     packageManager: 'pnpm',
   *     onProgress: (event) => console.log(event.message)
   *   }
   * });
   * ```
   */
  static async fromFile(filePath: string, options?: Partial<SimpleMCPOptions>): Promise<SimpleMCP> {
    // Import fs/promises dynamically to avoid issues in browser environments
    const { readFile } = await import('fs/promises');
    const { resolve } = await import('path');

    // Read source file
    const absolutePath = resolve(filePath);
    const source = await readFile(absolutePath, 'utf-8');

    // Parse inline dependencies
    const parseResult = parseInlineDependencies(source, {
      strict: false,
      validateSemver: true,
      allowComments: true,
    });

    // Log warnings to stderr
    if (parseResult.warnings.length > 0) {
      console.error('[SimpleMCP] Inline dependency warnings:');
      parseResult.warnings.forEach(w => console.error(`  - ${w}`));
    }

    // Throw on errors
    if (parseResult.errors.length > 0) {
      const errorMessages = parseResult.errors
        .map(e => `  Line ${e.line || '?'}: ${e.message}`)
        .join('\n');
      throw new Error(
        `Failed to parse inline dependencies from ${filePath}:\n${errorMessages}`
      );
    }

    // Convert ParseResult to ParsedDependencies
    const dependencies: ParsedDependencies = {
      dependencies: Object.entries(parseResult.dependencies).map(([name, version]) => ({
        name,
        version,
      })),
      map: parseResult.dependencies,
      errors: parseResult.errors,
      warnings: parseResult.warnings,
      raw: parseResult.raw,
    };

    // Create server with parsed dependencies
    const server = new SimpleMCP({
      name: options?.name || 'server-from-file',
      version: options?.version || '1.0.0',
      ...options,
      dependencies,
    });

    // Auto-install if requested
    if (options?.autoInstall) {
      const installOptions = typeof options.autoInstall === 'boolean'
        ? {}
        : options.autoInstall;

      console.error('[SimpleMCP] Auto-installing dependencies...');
      const result = await server.installDependencies(installOptions);

      if (!result.success) {
        const errorMessages = result.errors
          .map(e => `  - ${e.packageName || 'unknown'}: ${e.message}`)
          .join('\n');
        throw new Error(
          `Failed to install dependencies:\n${errorMessages}`
        );
      }

      console.error(`[SimpleMCP] Successfully installed ${result.installed.length} packages`);
    }

    return server;
  }

  /**
   * Request LLM sampling/completion from the client
   * @private
   */
  private async requestSampling(
    messages: SamplingMessage[],
    options?: SamplingOptions
  ): Promise<any> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    // Send sampling request to client using the MCP protocol
    const request = {
      method: 'sampling/createMessage',
      params: {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
        topP: options?.topP,
        stopSequences: options?.stopSequences,
        metadata: options?.metadata,
      },
    };

    // Note: The SDK's Server class should handle this request through the client
    // For now, we'll throw an error indicating this needs client support
    throw new Error(
      'Sampling requires client-side implementation. The client must support the sampling/createMessage request.'
    );
  }

  /**
   * Send progress notification to the client
   * @private
   */
  private sendProgressNotification(
    progressToken: string | number,
    progress: number,
    total?: number,
    message?: string
  ): void {
    if (!this.server) {
      return;
    }

    const notification = {
      method: 'notifications/progress',
      params: {
        progressToken,
        progress,
        total,
      },
    };

    // Send notification using the server's notification mechanism
    try {
      this.server.notification(notification);
    } catch (error) {
      console.error('[SimpleMCP] Failed to send progress notification:', error);
    }
  }

  /**
   * Send logging notification to the client
   * @private
   */
  private sendLoggingNotification(level: LogLevel, message: string, data?: unknown): void {
    if (!this.server) {
      return;
    }

    const notification = {
      method: 'notifications/message',
      params: {
        level,
        logger: this.options.name,
        data: message,
      },
    };

    // Send notification using the server's notification mechanism
    try {
      this.server.notification(notification);
    } catch (error) {
      console.error('[SimpleMCP] Failed to send logging notification:', error);
    }
  }

  /**
   * Read a resource by URI (for use in handler context)
   * @private
   */
  private async readResourceByUri(uri: string): Promise<ResourceContents> {
    const resource = this.resources.get(uri);

    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    return {
      uri: resource.uri,
      mimeType: resource.mimeType,
      text: typeof resource.content === 'string' ? resource.content : JSON.stringify(resource.content, null, 2),
    };
  }
}
