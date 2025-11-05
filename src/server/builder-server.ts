/**
 * BuildMCPServer - Programmatic API for building MCP servers
 *
 * A builder-pattern class for creating MCP servers programmatically.
 * Use this when you want explicit control over server configuration.
 *
 * @example
 * ```typescript
 * import { BuildMCPServer } from 'simply-mcp';
 * import { z } from 'zod';
 *
 * const server = new BuildMCPServer({
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

import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { completable } from '@modelcontextprotocol/sdk/server/completable.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CreateMessageRequestSchema,
  CreateMessageResult,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  ListRootsRequestSchema,
  ListRootsResult,
  ElicitRequest,
  ElicitResult,
  CompleteRequestSchema,
  PromptMessage,
} from '@modelcontextprotocol/sdk/types.js';
import type { SimpleMessage } from './interface-types.js';
import { z, ZodSchema, ZodError } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { HandlerManager } from '../core/HandlerManager.js';
import { HandlerContext, HandlerResult, ToolHandler, SamplingMessage, SamplingOptions, ResourceContents, ElicitResult as CoreElicitResult, MCPContext, BatchContext } from '../types/handler.js';
import { validateAndSanitize } from '../features/validation/index.js';
import { parseInlineDependencies, ParsedDependencies, InlineDependencies } from '../core/index.js';
import { createDefaultLogger, LogLevel, LogNotificationCallback } from '../core/logger.js';
import { HandlerExecutionError } from '../core/errors.js';
import { InstallOptions, InstallResult, DependencyStatus } from '../features/dependencies/installation-types.js';
import { checkDependencies } from '../features/dependencies/dependency-checker.js';
import { installDependencies } from '../features/dependencies/dependency-installer.js';
import { createLLMFriendlyValidationError, formatErrorForLLM } from '../features/validation/LLMFriendlyErrors.js';
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
} from '../core/content-helpers.js';
import { createSecurityMiddleware, type SecurityConfig } from '../features/auth/security/index.js';
import { createOAuthRouter, createOAuthMiddleware } from '../features/auth/oauth/router.js';
import type {
  ExecuteFunction,
  ToolDefinition,
  PromptDefinition,
  ResourceDefinition,
  BuildMCPServerOptions,
  TransportType,
  StartOptions,
  InternalTool,
  RouterToolDefinition,
  BatchingConfig,
} from './builder-types';

/**
 * Transport type - union of supported transport classes
 */
type Transport = StdioServerTransport | StreamableHTTPServerTransport;

/**
 * Global AsyncLocalStorage for batch context propagation.
 * Allows handlers to access batch information without explicit parameter threading.
 */
const batchContextStorage = new AsyncLocalStorage<BatchContext>();

// Export for testing
export {
  batchContextStorage,
  generateBatchId,
  validateNoDuplicateIds,
  validateBatch,
  detectBatch,
  processMessageWithContext,
  processBatch,
  hasExceededTimeout,
  createTimeoutError,
  getElapsedMs
};

/**
 * Generates a unique batch ID for correlation and logging.
 */
function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validates that batch has no duplicate request IDs.
 * JSON-RPC 2.0 spec is ambiguous on duplicates - we reject them.
 */
function validateNoDuplicateIds(messages: JSONRPCMessage[]): void {
  const ids = new Set<string | number>();

  for (const message of messages) {
    // Type guard: check if message is a request (has id field)
    if ('id' in message && message.id !== null && message.id !== undefined) {
      if (ids.has(message.id)) {
        throw new Error(`Duplicate request ID in batch: ${message.id}`);
      }
      ids.add(message.id);
    }
  }
}

/**
 * Validates batch structure and enforces size limits.
 * Throws error for invalid batches (empty, oversized, duplicates).
 */
function validateBatch(messages: unknown, config: BatchingConfig): void {
  // Must be array
  if (!Array.isArray(messages)) {
    throw new Error('Batch request must be an array');
  }

  // Empty batch (invalid per JSON-RPC 2.0)
  if (messages.length === 0) {
    throw new Error('Batch request cannot be empty');
  }

  // Size limit (DoS prevention)
  const maxSize = config.maxBatchSize ?? 100;
  if (messages.length > maxSize) {
    throw new Error(
      `Batch size ${messages.length} exceeds limit ${maxSize}`
    );
  }

  // Duplicate IDs
  validateNoDuplicateIds(messages);
}

/**
 * Detects if message is a batch (array) and returns batch metadata.
 * Returns null for single requests.
 */
function detectBatch(
  message: unknown,
  config: BatchingConfig
): { size: number; batchId: string } | null {
  if (!Array.isArray(message)) {
    return null; // Single request
  }

  // Validate batch
  validateBatch(message, config);

  // Return batch metadata
  return {
    size: message.length,
    batchId: generateBatchId()
  };
}

/**
 * Processes a single message with batch context.
 * Runs the original handler within AsyncLocalStorage context.
 */
async function processMessageWithContext(
  message: JSONRPCMessage,
  batchContext: BatchContext,
  originalHandler: (msg: JSONRPCMessage) => void | Promise<void>
): Promise<void> {
  return batchContextStorage.run(batchContext, async () => {
    await originalHandler(message);
  });
}

/**
 * Creates a JSON-RPC 2.0 error response for timeout exceeded.
 */
function createTimeoutError(requestId: any, timeoutMs: number, elapsedMs: number): any {
  return {
    jsonrpc: '2.0',
    id: requestId,
    error: {
      code: -32000,
      message: 'Batch timeout exceeded',
      data: { timeoutMs, elapsedMs }
    }
  };
}

/**
 * Checks if the batch has exceeded its configured timeout.
 * Returns false if no timeout is configured or not yet exceeded.
 */
function hasExceededTimeout(startTime: number | undefined, timeout: number | undefined): boolean {
  if (startTime === undefined || timeout === undefined) return false;
  return (Date.now() - startTime) >= timeout;
}

/**
 * Calculates elapsed time since batch start.
 * Returns undefined if no start time is available.
 */
function getElapsedMs(startTime: number | undefined): number | undefined {
  return startTime !== undefined ? Date.now() - startTime : undefined;
}

/**
 * Processes batch messages with context (sequential or parallel mode).
 * Each message gets batch context injected via AsyncLocalStorage.
 */
async function processBatch(
  messages: JSONRPCMessage[],
  batchId: string,
  originalHandler: (msg: JSONRPCMessage) => void | Promise<void>,
  config: BatchingConfig,
  transport: Transport
): Promise<void> {
  const parallel = config.parallel ?? false; // Default to sequential
  const timeout = config.timeout;
  const startTime = timeout !== undefined ? Date.now() : undefined;

  if (parallel) {
    // Parallel mode: Process all messages concurrently using Promise.allSettled
    const messagePromises = messages.map((message, index) => {
      const batchContext: BatchContext = {
        size: messages.length,
        index,
        parallel: true,
        timeout,
        batchId,
        startTime,
        elapsedMs: getElapsedMs(startTime)
      };

      return processMessageWithContext(
        message,
        batchContext,
        originalHandler
      ).then(() => ({ success: true, index }))
      .catch((error) => {
        // Individual message errors are handled by MCP SDK
        // They become error responses in the batch
        // We just log for diagnostics
        console.error(
          `Batch ${batchId} message ${index} failed:`,
          error instanceof Error ? error.message : String(error)
        );
        return { success: true, index }; // Still counts as handled (error response was sent)
      });
    });

    // Add timeout enforcement with Promise.race if timeout is configured
    if (timeout !== undefined) {
      let timedOut = false;
      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => {
          timedOut = true;
          console.warn(
            `Batch ${batchId} timeout exceeded (${timeout}ms) - sending timeout errors for incomplete messages`
          );
          resolve('timeout');
        }, timeout);
      });

      const result = await Promise.race([
        Promise.allSettled(messagePromises).then(() => 'completed' as const),
        timeoutPromise
      ]);

      // If timeout occurred, send timeout errors for messages that didn't complete
      if (result === 'timeout') {
        const elapsedMs = getElapsedMs(startTime);
        const settledResults = await Promise.allSettled(
          messagePromises.map(p =>
            Promise.race([
              p,
              new Promise<{ success: false, index: number }>((resolve) =>
                setTimeout(() => resolve({ success: false, index: -1 }), 0)
              )
            ])
          )
        );

        // Send timeout errors for messages that didn't complete
        for (let index = 0; index < messages.length; index++) {
          const settled = settledResults[index];
          const completed = settled.status === 'fulfilled' && settled.value.success;

          if (!completed) {
            const message = messages[index];
            // Only send error responses for requests (messages with id field)
            if ('id' in message && message.id !== null && message.id !== undefined) {
              const timeoutError = createTimeoutError(
                message.id,
                timeout,
                elapsedMs ?? timeout
              );
              try {
                transport.send(timeoutError);
              } catch (error) {
                console.error(
                  `Batch ${batchId} failed to send timeout error for message ${index}:`,
                  error instanceof Error ? error.message : String(error)
                );
              }
            }
          }
        }
      }
    } else {
      await Promise.allSettled(messagePromises);
    }
  } else {
    // Sequential mode: Process messages one-by-one in order
    for (let index = 0; index < messages.length; index++) {
      // Check timeout before processing each message
      if (hasExceededTimeout(startTime, timeout)) {
        console.warn(
          `Batch ${batchId} timeout exceeded at message ${index}/${messages.length} - sending timeout errors for remaining messages`
        );

        // Generate timeout error responses for all remaining messages
        const elapsedMs = getElapsedMs(startTime);
        for (let remainingIndex = index; remainingIndex < messages.length; remainingIndex++) {
          const message = messages[remainingIndex];
          // Only send error responses for requests (messages with id field)
          if ('id' in message && message.id !== null && message.id !== undefined) {
            const timeoutError = createTimeoutError(
              message.id,
              timeout!,
              elapsedMs ?? timeout!
            );
            try {
              transport.send(timeoutError);
            } catch (error) {
              console.error(
                `Batch ${batchId} failed to send timeout error for message ${remainingIndex}:`,
                error instanceof Error ? error.message : String(error)
              );
            }
          }
        }
        break; // Stop processing remaining messages
      }

      const batchContext: BatchContext = {
        size: messages.length,
        index,
        parallel: false,
        timeout,
        batchId,
        startTime,
        elapsedMs: getElapsedMs(startTime)
      };

      try {
        await processMessageWithContext(
          messages[index],
          batchContext,
          originalHandler
        );
      } catch (error) {
        // Individual message errors are handled by MCP SDK
        // They become error responses in the batch
        // We just log for diagnostics
        console.error(
          `Batch ${batchId} message ${index} failed:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }
}

/**
 * Wraps stdio transport to handle batch requests.
 * Intercepts stdin data BEFORE SDK validation to detect and expand batch arrays.
 * MUST be called BEFORE server.connect(transport).
 */
function wrapStdioTransportForBatch(
  transport: any, // StdioServerTransport
  config: BatchingConfig
): void {
  console.error('[wrapStdioTransportForBatch] Setting up batch handler for stdio transport');

  // Get reference to the transport's stdin (usually process.stdin)
  const stdin = transport._stdin || process.stdin;
  const originalReadBuffer = transport._readBuffer;

  // Store original readMessage function
  const originalReadMessage = originalReadBuffer.readMessage.bind(originalReadBuffer);

  // Batch response tracker: Maps batchId -> collection state
  const batchResponses = new Map<string, {
    responses: any[];
    expectedCount: number;
    messageIdToBatchIndex: Map<string | number, number>;
    timer: NodeJS.Timeout;
  }>();

  // Map message ID to batch ID for correlation
  const messageIdToBatchId = new Map<string | number, string>();

  // Store original send function
  const originalSend = transport.send.bind(transport);

  // Wrap transport.send() to intercept and collect batch responses
  transport.send = async (message: any) => {
    // Check if this response is part of a batch
    const messageId = message.id;
    const batchId = messageIdToBatchId.get(messageId);

    if (batchId && batchResponses.has(batchId)) {
      const tracker = batchResponses.get(batchId)!;
      const batchIndex = tracker.messageIdToBatchIndex.get(messageId);

      if (batchIndex !== undefined) {
        console.error(`[wrapStdioTransportForBatch] Collecting response for batch ${batchId}, index ${batchIndex}`);

        // Store response at correct index
        tracker.responses[batchIndex] = message;

        // Check if all responses collected
        const collectedCount = tracker.responses.filter(r => r !== undefined).length;
        console.error(`[wrapStdioTransportForBatch] Collected ${collectedCount}/${tracker.expectedCount} responses`);

        if (collectedCount === tracker.expectedCount) {
          // All responses collected - send as batch array
          console.error(`[wrapStdioTransportForBatch] All responses collected, sending batch array`);
          clearTimeout(tracker.timer);

          // Send batch array as single response
          await originalSend(tracker.responses);

          // Clean up
          batchResponses.delete(batchId);
          tracker.messageIdToBatchIndex.forEach((_, msgId) => {
            messageIdToBatchId.delete(msgId);
          });
        }
        // Otherwise, wait for more responses
        return;
      }
    }

    // Non-batch response, send normally
    await originalSend(message);
  };

  // Replace readMessage to intercept and handle batch arrays
  originalReadBuffer.readMessage = function() {
    // First check if we have queued batch messages to return
    if (transport._batchQueue && transport._batchQueue.length > 0) {
      const batchItem = transport._batchQueue.shift()!;
      console.error(`[wrapStdioTransportForBatch] Returning queued batch message ${batchItem.batchIndex + 1}/${batchItem.batchSize}`);
      return batchItem.message;
    }

    if (!this._buffer) {
      return null;
    }

    const index = this._buffer.indexOf('\n');
    if (index === -1) {
      return null;
    }

    const line = this._buffer.toString('utf8', 0, index).replace(/\r$/, '');
    this._buffer = this._buffer.subarray(index + 1);

    // Parse the JSON to check if it's a batch array
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (e) {
      // Invalid JSON - let SDK handle the error
      console.error('[wrapStdioTransportForBatch] JSON parse error, passing to SDK');
      // Re-parse with SDK's deserializeMessage which will throw proper error
      return originalReadMessage.call(this);
    }

    // Check if it's a batch array
    if (Array.isArray(parsed)) {
      console.error('[wrapStdioTransportForBatch] Batch array detected, length:', parsed.length);

      if (parsed.length === 0) {
        throw new Error('Batch request cannot be empty');
      }

      // Store batch metadata in transport for later use
      if (!transport._batchQueue) {
        transport._batchQueue = [];
      }

      // Mark these messages as part of a batch
      const batchId = generateBatchId();

      // Initialize batch response tracker
      const messageIdToBatchIndex = new Map<string | number, number>();
      for (let i = 0; i < parsed.length; i++) {
        const messageId = parsed[i].id;
        messageIdToBatchIndex.set(messageId, i);
        messageIdToBatchId.set(messageId, batchId);

        const batchItem = {
          message: parsed[i],
          batchId,
          batchIndex: i,
          batchSize: parsed.length,
          parallel: config.parallel !== false // Default to true
        };

        transport._batchQueue.push(batchItem);

        // Store batch context for this message
        const batchContext: BatchContext = {
          size: parsed.length,
          index: i,
          parallel: config.parallel !== false,
          timeout: config.timeout,
          batchId,
          startTime: Date.now(),
          elapsedMs: 0
        };
        messageToBatchContext.set(messageId, batchContext);
      }

      // Create batch response tracker
      // Note: Response collection timeout is separate from request execution timeout
      // This timeout is just for collecting responses - if responses don't arrive within
      // a reasonable time, we send what we have. Request execution timeouts are handled
      // separately in the request handlers.
      const collectionTimeout = config.collectionTimeout ?? 60000; // Default: 60 seconds

      batchResponses.set(batchId, {
        responses: new Array(parsed.length),
        expectedCount: parsed.length,
        messageIdToBatchIndex,
        timer: setTimeout(() => {
          // Timeout: send partial responses if not all collected
          if (batchResponses.has(batchId)) {
            const partial = batchResponses.get(batchId)!;
            console.error(`[wrapStdioTransportForBatch] Batch ${batchId} collection timeout, sending partial responses`);

            // Filter out undefined responses (responses that never arrived)
            const validResponses = partial.responses.filter(r => r !== undefined);
            if (validResponses.length > 0) {
              originalSend(validResponses).catch((err) => {
                console.error(`[wrapStdioTransportForBatch] Error sending partial batch: ${err}`);
              });
            }

            // Clean up
            batchResponses.delete(batchId);
            partial.messageIdToBatchIndex.forEach((_, msgId) => {
              messageIdToBatchId.delete(msgId);
            });
          }
        }, collectionTimeout)
      });

      console.error(`[wrapStdioTransportForBatch] Batch ${batchId} registered with ${parsed.length} messages`);

      // Return first message from queue
      const first = transport._batchQueue.shift()!;
      console.error(`[wrapStdioTransportForBatch] Returning first batch message 1/${parsed.length}`);
      return first.message;
    }

    // Single message - return as-is (validated by SDK)
    return parsed;
  };

  // Store batch context for messages being processed
  const messageToBatchContext = new Map<string | number, BatchContext>();

  // Wrap onmessage to inject batch context
  let originalOnMessageHandler: any = null;
  Object.defineProperty(transport, 'onmessage', {
    get() {
      return originalOnMessageHandler;
    },
    set(handler) {
      originalOnMessageHandler = function(message: any) {
        const batchContext = messageToBatchContext.get(message.id);
        if (batchContext) {
          // This is a batch message - inject batch context
          console.error(`[wrapStdioTransportForBatch] Processing batch message with context: ${batchContext.batchId} [${batchContext.index}/${batchContext.size}]`);
          batchContextStorage.run(batchContext, () => {
            handler.call(transport, message);
          });
          // Clean up after processing
          messageToBatchContext.delete(message.id);
        } else {
          // Non-batch message
          handler.call(transport, message);
        }
      };
    },
    configurable: true
  });

  console.error('[wrapStdioTransportForBatch] Batch handler installed');
}

/**
 * BuildMCPServer - A programmatic API for creating MCP servers
 */
export class BuildMCPServer {
  private options: Required<BuildMCPServerOptions>;
  private tools: Map<string, InternalTool> = new Map();
  private prompts: Map<string, PromptDefinition> = new Map();
  private resources: Map<string, ResourceDefinition> = new Map();
  private handlerManager: HandlerManager;
  private server?: Server;
  private httpServer?: any;
  private transports: Map<string, StreamableHTTPServerTransport> = new Map();
  // Multi-client support: Store one Server instance per session
  // Each session gets its own Server+Transport pair to avoid blocking on connect()
  private servers: Map<string, Server> = new Map();
  private isRunning: boolean = false;
  private dependencies?: ParsedDependencies;

  // Router management
  private routers: Set<string> = new Set();
  private toolToRouters: Map<string, Set<string>> = new Map();
  private routerToTools: Map<string, Set<string>> = new Map();

  // Subscription management
  // Maps resource URI to set of session IDs that are subscribed to it
  private subscriptions: Map<string, Set<string>> = new Map();

  // Session context tracking (for HTTP requests)
  // AsyncLocalStorage allows us to track which session ID is making each request
  private sessionContext = new AsyncLocalStorage<string>();

  // Completion management
  // Maps completion handler name to completion function
  private completions: Map<string, {
    name: string;
    description: string;
    ref: { type: 'argument' | 'resource'; name: string };
    handler: (value: string, context?: any) => any | Promise<any>;
  }> = new Map();

  /**
   * Create a new BuildMCPServer
   */
  constructor(options: BuildMCPServerOptions) {
    this.options = {
      name: options.name,
      version: options.version,
      description: options.description,
      basePath: options.basePath || process.cwd(),
      defaultTimeout: options.defaultTimeout || 5000,
      silent: options.silent ?? false,
      transport: {
        type: options.transport?.type || 'stdio',
        port: options.transport?.port || 3000,
        stateful: options.transport?.stateful ?? true,
      },
      capabilities: options.capabilities || {},
      dependencies: options.dependencies || undefined,
      autoInstall: options.autoInstall,
      flattenRouters: options.flattenRouters ?? false, // Default to false (hide router-assigned tools)
      batching: options.batching, // FOUNDATION LAYER: Batch processing configuration
    } as Required<BuildMCPServerOptions>;

    this.handlerManager = new HandlerManager({
      basePath: this.options.basePath,
      defaultTimeout: this.options.defaultTimeout,
      silent: this.options.silent,
    });

    // Store dependencies if provided
    if (options.dependencies) {
      this.dependencies = options.dependencies;
    }
  }

  /**
   * Get the server name (BUG-004 FIX)
   */
  get name(): string {
    return this.options.name;
  }

  /**
   * Get the server version (BUG-004 FIX)
   */
  get version(): string {
    return this.options.version;
  }

  /**
   * Get the server description (additional getter)
   */
  get description(): string | undefined {
    return this.options.description;
  }

  /**
   * Add a tool to the server
   * @param definition Tool definition with Zod schema and execute function
   * @returns this for chaining
   */
  addTool<T = any>(definition: ToolDefinition<T>): this {
    if (this.isRunning) {
      throw new Error(
        `Cannot add tools after server has started\n\n` +
        `What went wrong:\n` +
        `  The server is already running and cannot accept new tools.\n\n` +
        `To fix:\n` +
        `  1. Add all tools before calling server.start()\n` +
        `  2. Or stop the server, add tools, then restart\n\n` +
        `Example:\n` +
        `  // Correct order:\n` +
        `  server.addTool({ ... });\n` +
        `  await server.start();\n\n` +
        `  // Incorrect order:\n` +
        `  await server.start();\n` +
        `  server.addTool({ ... }); // ERROR!`
      );
    }

    if (this.tools.has(definition.name)) {
      throw new Error(
        `Tool '${definition.name}' is already registered\n\n` +
        `What went wrong:\n` +
        `  You attempted to register a tool with a name that's already in use.\n\n` +
        `To fix:\n` +
        `  1. Choose a different name for the new tool\n` +
        `  2. Remove the duplicate registration\n` +
        `  3. Use namespacing if needed: 'category-tool-name'\n\n` +
        `Example:\n` +
        `  // Instead of multiple 'search' tools:\n` +
        `  server.addTool({ name: 'search-users', ... });\n` +
        `  server.addTool({ name: 'search-products', ... });\n\n` +
        `Tip: Tool names should be unique and descriptive.`
      );
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
   * Add a router tool to the server
   * Router tools are special tools that group other tools together.
   * When called, a router returns a list of its assigned tools in MCP format.
   *
   * @param definition Router tool definition
   * @returns this for chaining
   */
  addRouterTool(definition: RouterToolDefinition): this {
    if (this.isRunning) {
      throw new Error(
        `Cannot add router tools after server has started\n\n` +
        `What went wrong:\n` +
        `  The server is already running and cannot accept new router tools.\n\n` +
        `To fix:\n` +
        `  1. Add all router tools before calling server.start()\n` +
        `  2. Or stop the server, add router tools, then restart\n\n` +
        `Example:\n` +
        `  // Correct order:\n` +
        `  server.addRouterTool({ ... });\n` +
        `  await server.start();\n\n` +
        `  // Incorrect order:\n` +
        `  await server.start();\n` +
        `  server.addRouterTool({ ... }); // ERROR!`
      );
    }

    // Validate router name doesn't conflict with existing tools
    if (this.tools.has(definition.name)) {
      throw new Error(
        `Router '${definition.name}' conflicts with an existing tool\n\n` +
        `What went wrong:\n` +
        `  A tool with the name '${definition.name}' is already registered.\n\n` +
        `To fix:\n` +
        `  1. Choose a different name for the router\n` +
        `  2. Remove the conflicting tool first\n` +
        `  3. Use a naming convention like 'router-name' to avoid conflicts\n\n` +
        `Tip: Router names must be unique and not conflict with tool names.`
      );
    }

    // Validate router name is unique
    if (this.routers.has(definition.name)) {
      throw new Error(
        `Router '${definition.name}' is already registered\n\n` +
        `What went wrong:\n` +
        `  You attempted to register a router with a name that's already in use.\n\n` +
        `To fix:\n` +
        `  1. Choose a different name for the new router\n` +
        `  2. Remove the duplicate registration\n` +
        `  3. Use descriptive unique names for routers\n\n` +
        `Tip: Router names should be unique and descriptive.`
      );
    }

    // Create the router tool with auto-generated execute function
    const routerTool: ToolDefinition<{}> = {
      name: definition.name,
      description: definition.description,
      parameters: z.object({}), // Router tools take no parameters
      execute: async () => {
        // Return list of assigned tools in MCP format
        return this.listRouterTools(definition.name);
      },
    };

    // Convert Zod schema to JSON Schema
    const jsonSchema = zodToJsonSchema(routerTool.parameters, {
      target: 'openApi3',
    });

    // Store as a regular tool
    this.tools.set(definition.name, {
      definition: routerTool,
      jsonSchema,
    });

    // Register as a router
    this.routers.add(definition.name);
    this.routerToTools.set(definition.name, new Set());

    // If tools are provided in definition, assign them
    if (definition.tools && definition.tools.length > 0) {
      this.assignTools(definition.name, definition.tools);
    }

    return this;
  }

  /**
   * Assign tools to a router
   * Tools can be assigned to multiple routers.
   *
   * @param routerName Name of the router
   * @param toolNames Array of tool names to assign
   * @returns this for chaining
   */
  assignTools(routerName: string, toolNames: string[]): this {
    if (this.isRunning) {
      throw new Error(
        `Cannot assign tools after server has started\n\n` +
        `What went wrong:\n` +
        `  The server is already running and cannot accept tool assignments.\n\n` +
        `To fix:\n` +
        `  1. Assign all tools before calling server.start()\n` +
        `  2. Or stop the server, assign tools, then restart\n\n` +
        `Example:\n` +
        `  // Correct order:\n` +
        `  server.assignTools('router-name', ['tool1', 'tool2']);\n` +
        `  await server.start();\n\n` +
        `  // Incorrect order:\n` +
        `  await server.start();\n` +
        `  server.assignTools('router-name', ['tool1', 'tool2']); // ERROR!`
      );
    }

    // Validate router exists
    if (!this.routers.has(routerName)) {
      const availableRouters = Array.from(this.routers).join(', ') || 'none';
      throw new Error(
        `Router '${routerName}' does not exist\n\n` +
        `What went wrong:\n` +
        `  You attempted to assign tools to a router that hasn't been registered.\n\n` +
        `Available routers: ${availableRouters}\n\n` +
        `To fix:\n` +
        `  1. Register the router first with server.addRouterTool()\n` +
        `  2. Check the router name for typos\n` +
        `  3. Ensure the router was created before assigning tools\n\n` +
        `Example:\n` +
        `  server.addRouterTool({ name: '${routerName}', description: '...' });\n` +
        `  server.assignTools('${routerName}', ['tool1', 'tool2']);`
      );
    }

    // Validate all tools exist
    for (const toolName of toolNames) {
      if (!this.tools.has(toolName)) {
        const availableTools = Array.from(this.tools.keys())
          .filter(name => !this.routers.has(name))
          .join(', ') || 'none';
        throw new Error(
          `Tool '${toolName}' does not exist\n\n` +
          `What went wrong:\n` +
          `  You attempted to assign a tool that hasn't been registered.\n\n` +
          `Available tools: ${availableTools}\n\n` +
          `To fix:\n` +
          `  1. Register the tool first with server.addTool()\n` +
          `  2. Check the tool name for typos\n` +
          `  3. Ensure the tool was created before assigning it to routers\n\n` +
          `Example:\n` +
          `  server.addTool({ name: '${toolName}', ... });\n` +
          `  server.assignTools('${routerName}', ['${toolName}']);`
        );
      }

      // Don't allow assigning routers to routers
      if (this.routers.has(toolName)) {
        throw new Error(
          `Cannot assign router '${toolName}' to router '${routerName}'\n\n` +
          `What went wrong:\n` +
          `  You attempted to assign a router to another router.\n\n` +
          `To fix:\n` +
          `  Only assign regular tools to routers, not other routers.\n\n` +
          `Tip: Routers can only contain regular tools, not other routers.`
        );
      }
    }

    // Update mappings
    const routerTools = this.routerToTools.get(routerName)!;
    for (const toolName of toolNames) {
      // Add to routerToTools
      routerTools.add(toolName);

      // Add to toolToRouters
      if (!this.toolToRouters.has(toolName)) {
        this.toolToRouters.set(toolName, new Set());
      }
      this.toolToRouters.get(toolName)!.add(routerName);
    }

    return this;
  }

  /**
   * List tools assigned to a router in MCP format
   * @private
   */
  private listRouterTools(routerName: string): HandlerResult {
    const assignedToolNames = this.routerToTools.get(routerName);

    if (!assignedToolNames || assignedToolNames.size === 0) {
      // Return empty tools array if no tools assigned
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ tools: [] }, null, 2),
          },
        ],
      };
    }

    // Build MCP tools list
    const toolsList = Array.from(assignedToolNames)
      .map(toolName => {
        const tool = this.tools.get(toolName);
        if (!tool) return null;

        return {
          name: tool.definition.name,
          description: tool.definition.description,
          inputSchema: tool.jsonSchema,
          ...(tool.definition.annotations && { annotations: tool.definition.annotations }),
        };
      })
      .filter(tool => tool !== null);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ tools: toolsList }, null, 2),
        },
      ],
    };
  }

  /**
   * Add a prompt to the server
   * @param definition Prompt definition
   * @returns this for chaining
   */
  addPrompt(definition: PromptDefinition): this {
    if (this.isRunning) {
      throw new Error(
        `Cannot add prompts after server has started\n\n` +
        `What went wrong:\n` +
        `  The server is already running and cannot accept new prompts.\n\n` +
        `To fix:\n` +
        `  1. Add all prompts before calling server.start()\n` +
        `  2. Or stop the server, add prompts, then restart\n\n` +
        `Example:\n` +
        `  // Correct order:\n` +
        `  server.addPrompt({ ... });\n` +
        `  await server.start();\n\n` +
        `  // Incorrect order:\n` +
        `  await server.start();\n` +
        `  server.addPrompt({ ... }); // ERROR!`
      );
    }

    if (this.prompts.has(definition.name)) {
      throw new Error(
        `Prompt '${definition.name}' is already registered\n\n` +
        `What went wrong:\n` +
        `  You attempted to register a prompt with a name that's already in use.\n\n` +
        `To fix:\n` +
        `  1. Choose a different name for the new prompt\n` +
        `  2. Remove the duplicate registration\n` +
        `  3. Merge similar prompts if appropriate\n\n` +
        `Tip: Prompt names should be unique and descriptive.`
      );
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
      throw new Error(
        `Cannot add resources after server has started\n\n` +
        `What went wrong:\n` +
        `  The server is already running and cannot accept new resources.\n\n` +
        `To fix:\n` +
        `  1. Add all resources before calling server.start()\n` +
        `  2. Or stop the server, add resources, then restart\n\n` +
        `Example:\n` +
        `  // Correct order:\n` +
        `  server.addResource({ ... });\n` +
        `  await server.start();\n\n` +
        `  // Incorrect order:\n` +
        `  await server.start();\n` +
        `  server.addResource({ ... }); // ERROR!`
      );
    }

    if (this.resources.has(definition.uri)) {
      throw new Error(
        `Resource with URI '${definition.uri}' is already registered\n\n` +
        `What went wrong:\n` +
        `  You attempted to register a resource with a URI that's already in use.\n\n` +
        `To fix:\n` +
        `  1. Choose a different URI for the new resource\n` +
        `  2. Remove the duplicate registration\n` +
        `  3. Update the existing resource if needed\n\n` +
        `Tip: Resource URIs should be unique within the server.`
      );
    }

    this.resources.set(definition.uri, definition);
    return this;
  }

  /**
   * Add a completion handler to the server
   *
   * Completion handlers provide autocomplete suggestions for prompt arguments.
   *
   * @param name - Completion handler name
   * @param description - Description of what this completion provides
   * @param ref - Reference to what is being completed
   * @param handler - Function that generates suggestions
   * @returns this for chaining
   */
  addCompletion(
    name: string,
    description: string,
    ref: { type: 'argument' | 'resource'; name: string },
    handler: (value: string, context?: any) => any | Promise<any>
  ): this {
    if (this.isRunning) {
      throw new Error(
        `Cannot add completion handlers after server has started\n\n` +
        `What went wrong:\n` +
        `  The server is already running and cannot accept new completion handlers.\n\n` +
        `To fix:\n` +
        `  1. Add all completion handlers before calling server.start()\n` +
        `  2. Or stop the server, add handlers, then restart\n\n` +
        `Example:\n` +
        `  // Correct order:\n` +
        `  server.addCompletion(...);\n` +
        `  await server.start();\n\n` +
        `  // Incorrect order:\n` +
        `  await server.start();\n` +
        `  server.addCompletion(...); // ERROR!`
      );
    }

    if (this.completions.has(name)) {
      throw new Error(
        `Completion handler '${name}' is already registered\n\n` +
        `What went wrong:\n` +
        `  You attempted to register a completion handler with a name that's already in use.\n\n` +
        `To fix:\n` +
        `  1. Choose a different name for the new handler\n` +
        `  2. Remove the duplicate registration\n` +
        `  3. Update the existing handler if needed\n\n` +
        `Tip: Completion handler names should be unique within the server.`
      );
    }

    this.completions.set(name, { name, description, ref, handler });
    return this;
  }

  /**
   * Add a UI resource to the server (convenience method for MCP-UI)
   *
   * This is syntactic sugar for addResource() that automatically
   * validates UI resource URIs and MIME types according to MCP-UI specifications.
   *
   * UI resources are special resources that clients can render as interactive
   * UI elements. They must have URIs starting with "ui://" and use specific
   * MIME types to indicate the rendering method.
   *
   * @param uri - UI resource URI (must start with "ui://")
   * @param name - Display name for the UI resource
   * @param description - Description of what this UI resource does
   * @param mimeType - MIME type indicating rendering method
   * @param content - HTML content or function that generates content
   * @returns this for chaining
   *
   * @throws {Error} If URI doesn't start with "ui://"
   * @throws {Error} If MIME type is not a valid UI resource type
   *
   * @example
   * ```typescript
   * // Static HTML UI resource
   * server.addUIResource(
   *   'ui://product-card/v1',
   *   'Product Card',
   *   'Displays a product selector',
   *   'text/html',
   *   '<div><h2>Select a product</h2><button>Widget A</button></div>'
   * );
   * ```
   *
   * @example
   * ```typescript
   * // Dynamic HTML UI resource
   * server.addUIResource(
   *   'ui://dashboard/stats',
   *   'Stats Dashboard',
   *   'Live statistics dashboard',
   *   'text/html',
   *   () => {
   *     const stats = getCurrentStats();
   *     return `<div><h1>Active Users: ${stats.activeUsers}</h1></div>`;
   *   }
   * );
   * ```
   */
  addUIResource(
    uri: string,
    name: string,
    description: string,
    mimeType: string,
    content: string | (() => string | Promise<string>)
  ): this {
    // Validate UI resource URI
    if (!uri.startsWith('ui://')) {
      throw new Error(
        `UI resource URI must start with "ui://", got: "${uri}"\n\n` +
        `What went wrong:\n` +
        `  UI resources must use the "ui://" URI scheme to be recognized by MCP-UI clients.\n\n` +
        `To fix:\n` +
        `  Change the URI to start with "ui://"\n\n` +
        `Example:\n` +
        `  server.addUIResource(\n` +
        `    'ui://product-card/v1',  // Correct\n` +
        `    'Product Card',\n` +
        `    'Product selector',\n` +
        `    'text/html',\n` +
        `    '<div>...</div>'\n` +
        `  );\n\n` +
        `Tip: Use descriptive URIs like "ui://app-name/component-name/version"`
      );
    }

    // Validate UI resource MIME type
    const validMimeTypes = [
      'text/html',
      'text/uri-list',
      'application/vnd.mcp-ui.remote-dom+javascript'
    ];

    if (!validMimeTypes.includes(mimeType)) {
      throw new Error(
        `Invalid UI resource MIME type: "${mimeType}"\n\n` +
        `What went wrong:\n` +
        `  UI resources must use specific MIME types to indicate how they should be rendered.\n\n` +
        `Valid MIME types:\n` +
        `  - text/html: Inline HTML content (Foundation Layer)\n` +
        `  - text/uri-list: External URL (Feature Layer)\n` +
        `  - application/vnd.mcp-ui.remote-dom+javascript: Remote DOM (Layer 3)\n\n` +
        `To fix:\n` +
        `  Use one of the valid MIME types listed above\n\n` +
        `Example:\n` +
        `  server.addUIResource(\n` +
        `    'ui://product-card/v1',\n` +
        `    'Product Card',\n` +
        `    'Product selector',\n` +
        `    'text/html',  // Valid MIME type\n` +
        `    '<div>...</div>'\n` +
        `  );`
      );
    }

    // Delegate to addResource with validated parameters
    return this.addResource({
      uri,
      name,
      description,
      mimeType,
      content,
    });
  }

  /**
   * Start the server
   * @param options Start options (overrides configuration from constructor)
   */
  async start(options: StartOptions = {}): Promise<void> {
    if (this.isRunning) {
      throw new Error(
        `Server is already running\n\n` +
        `What went wrong:\n` +
        `  You attempted to start a server that's already started.\n\n` +
        `To fix:\n` +
        `  1. Check if server is running before calling start()\n` +
        `  2. Call server.stop() first if you need to restart\n\n` +
        `Example:\n` +
        `  if (!server.getInfo().isRunning) {\n` +
        `    await server.start();\n` +
        `  }`
      );
    }

    // Merge start options with constructor options (start options take precedence)
    const transport = options.transport || this.options.transport.type;
    const port = options.port || this.options.transport.port;
    const stateful = options.stateful ?? this.options.transport.stateful;
    const websocketConfig = options.websocket;
    const securityConfig = options.securityConfig as SecurityConfig | undefined;

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
          resources: this.resources.size > 0 ? {
            subscribe: true, // Enable subscription capability
          } : undefined,
          logging: this.options.capabilities?.logging ? {} : undefined,
          roots: this.options.capabilities?.roots ? {
            listChanged: true, // Enable roots capability
          } : undefined,
          completions: this.options.capabilities?.completions ? {} : undefined,
        },
      }
    );

    // Register handlers
    this.registerToolHandlers();
    this.registerPromptHandlers();
    this.registerResourceHandlers();
    this.registerSubscriptionHandlers();

    // Start the appropriate transport
    if (transport === 'stdio') {
      await this.startStdio();
    } else if (transport === 'websocket') {
      await this.startWebSocket(port, websocketConfig);
    } else {
      await this.startHttp(port, stateful, securityConfig);
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

    console.log('Shutting down BuildMCPServer...');

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

    // Multi-client fix: Close all session servers
    const serverEntries = Array.from(this.servers.entries());
    for (const [sessionId, sessionServer] of serverEntries) {
      try {
        console.log(`Closing server for session ${sessionId}`);
        await sessionServer.close();
      } catch (error) {
        console.error(`Error closing server for session ${sessionId}:`, error);
      }
    }
    this.servers.clear();

    // Close the main server (used for stdio mode)
    if (this.server) {
      await this.server.close();
    }

    this.isRunning = false;
    console.log('BuildMCPServer stopped');
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
      let toolsList = Array.from(this.tools.values()).map((tool) => ({
        name: tool.definition.name,
        description: tool.definition.description,
        inputSchema: tool.jsonSchema,
        ...(tool.definition.annotations && { annotations: tool.definition.annotations }),
      }));

      // Layer 2: Filter based on flattenRouters option
      if (!this.options.flattenRouters) {
        // Hide tools that are assigned to routers
        toolsList = toolsList.filter((tool) => !this.toolToRouters.has(tool.name));
      }

      return { tools: toolsList };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      let toolName = request.params.name;
      let namespaceRouter: string | undefined = undefined;

      // Layer 2: Check for namespace format (router__tool)
      if (toolName.includes('__')) {
        const parts = toolName.split('__');
        if (parts.length === 2) {
          const [routerName, subToolName] = parts;

          // Verify router exists
          if (!this.routers.has(routerName)) {
            throw new Error(
              `Unknown router in namespace: ${routerName}\n\n` +
              `What went wrong:\n` +
              `  The namespace '${toolName}' references a router '${routerName}' that doesn't exist.\n\n` +
              `Available routers: ${Array.from(this.routers).join(', ') || 'none'}\n\n` +
              `To fix:\n` +
              `  1. Check the router name in the namespace\n` +
              `  2. Use the format: router_name__tool_name\n` +
              `  3. Call the router first to see available tools\n\n` +
              `Tip: Namespace format uses double underscore (__)between router and tool names.`
            );
          }

          // Verify router owns this tool
          const routerTools = this.routerToTools.get(routerName);
          if (!routerTools || !routerTools.has(subToolName)) {
            const availableToolsInRouter = routerTools ? Array.from(routerTools).join(', ') : 'none';
            throw new Error(
              `Tool '${subToolName}' not found in router '${routerName}'\n\n` +
              `What went wrong:\n` +
              `  The router '${routerName}' does not have a tool named '${subToolName}'.\n\n` +
              `Available tools in ${routerName}: ${availableToolsInRouter}\n\n` +
              `To fix:\n` +
              `  1. Call the router '${routerName}' to see its available tools\n` +
              `  2. Use the correct tool name from the router's tool list\n` +
              `  3. Check for typos in the tool name\n\n` +
              `Tip: Call the router directly to get its full tool list.`
            );
          }

          // Set the actual tool name and track namespace
          toolName = subToolName;
          namespaceRouter = routerName;
        }
      }

      // Check if tool exists (either directly or as a sub-tool)
      let tool = this.tools.get(toolName);
      const routerOwners = this.toolToRouters.get(toolName);

      if (!tool) {
        // Tool not found - check if it might be a sub-tool
        const isSubTool = routerOwners && routerOwners.size > 0;
        const availableTools = Array.from(this.tools.keys()).join(', ') || 'none';

        throw new Error(
          `Unknown tool: ${toolName}\n\n` +
          `What went wrong:\n` +
          `  The requested tool '${toolName}' is not registered with this server.\n\n` +
          `Available tools: ${availableTools}\n\n` +
          `To fix:\n` +
          `  1. Check the tool name for typos\n` +
          `  2. Ensure the tool is registered before calling it\n` +
          `  3. Verify the tool was properly added with server.addTool()\n\n` +
          `Tip: Tool names are case-sensitive and should match exactly.`
        );
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

        // Retrieve batch context from AsyncLocalStorage
        const batch = batchContextStorage.getStore();

        // Create handler context with enhanced capabilities
        const context: HandlerContext = {
          logger,
          metadata: {
            toolName,
            progressToken,
            // Include router information if tool belongs to any routers
            ...(routerOwners && routerOwners.size > 0 ? {
              routers: Array.from(routerOwners),
            } : {}),
            // Layer 2: Include namespace information if called via namespace
            ...(namespaceRouter ? {
              namespace: namespaceRouter,
              namespacedCall: true,
            } : {}),
          },
          // Add MCP-specific context
          mcp: {
            server: {
              name: this.options.name,
              version: this.options.version,
              description: this.options.description,
            },
            session: this.server,
            request_context: {
              request_id: randomUUID(),
              meta: (request.params as any)._meta,
            },
          },
          // FOUNDATION LAYER: Add batch context if available
          batch,
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

        // Add elicitation capability if enabled
        if (this.options.capabilities?.elicitation && this.server) {
          context.elicitInput = async (prompt: string, args: Record<string, any>) => {
            return this.requestElicitation(prompt, args);
          };
        }

        // Add roots capability if enabled
        if (this.options.capabilities?.roots && this.server) {
          context.listRoots = async () => {
            const result = await this.requestRoots();
            // Map SDK roots to simplified format
            return (result.roots || []).map(root => ({
              uri: root.uri || '',
              name: root.name,
            }));
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
   * Type guard to check if result is a PromptMessage array
   */
  private isPromptMessageArray(value: any): value is PromptMessage[] {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === 'object' &&
      value[0] !== null &&
      'role' in value[0] &&
      'content' in value[0]
    );
  }

  /**
   * Type guard to check if result is a SimpleMessage array
   */
  private isSimpleMessageArray(value: any): value is SimpleMessage[] {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === 'object' &&
      value[0] !== null &&
      (('user' in value[0] && typeof value[0].user === 'string') ||
       ('assistant' in value[0] && typeof value[0].assistant === 'string'))
    );
  }

  /**
   * Convert SimpleMessage array to PromptMessage array
   *
   * Transforms:
   *   { user: 'text' } → { role: 'user', content: { type: 'text', text: 'text' } }
   *   { assistant: 'text' } → { role: 'assistant', content: { type: 'text', text: 'text' } }
   */
  private convertSimpleMessages(messages: SimpleMessage[]): PromptMessage[] {
    return messages.map(msg => {
      if ('user' in msg) {
        return {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: msg.user
          }
        };
      } else {
        return {
          role: 'assistant' as const,
          content: {
            type: 'text' as const,
            text: msg.assistant
          }
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
        const availablePrompts = Array.from(this.prompts.keys()).join(', ') || 'none';
        throw new Error(
          `Unknown prompt: ${promptName}\n\n` +
          `What went wrong:\n` +
          `  The requested prompt '${promptName}' is not registered with this server.\n\n` +
          `Available prompts: ${availablePrompts}\n\n` +
          `To fix:\n` +
          `  1. Check the prompt name for typos\n` +
          `  2. Ensure the prompt is registered before using it\n` +
          `  3. Verify the prompt was properly added with server.addPrompt()\n\n` +
          `Tip: Prompt names are case-sensitive and should match exactly.`
        );
      }

      // Extract arguments - MCP SDK uses 'arguments' in schema but 'args' in params
      // Support both for compatibility
      const args = (request.params as any).arguments || (request.params as any).args || {};

      // All prompts now require implementation (template is always a function)
      let result: string | PromptMessage[] | SimpleMessage[];
      if (typeof prompt.template !== 'function') {
        throw new Error(
          `Prompt "${promptName}" is missing implementation.\n\n` +
          `What went wrong:\n` +
          `  All prompts now require a method implementation.\n\n` +
          `To fix:\n` +
          `  1. Implement the prompt as a method in your server class\n` +
          `  2. The method should return either a string or an array of messages\n\n` +
          `Example:\n` +
          `  weatherForecast = async (args: { location: string }) => {\n` +
          `    return \`Weather forecast for \${args.location}\`;\n` +
          `  };`
        );
      }

      // Create context for prompt execution
      const logger = createDefaultLogger(`[Prompt:${promptName}]`, () => {});

      // Retrieve batch context from AsyncLocalStorage
      const batch = batchContextStorage.getStore();

      const context: HandlerContext = {
        logger,
        metadata: { promptName },
        mcp: {
          server: {
            name: this.options.name,
            version: this.options.version,
            description: this.options.description,
          },
          session: this.server,
          request_context: {
            request_id: randomUUID(),
            meta: (request.params as any)._meta,
          },
        },
        // FOUNDATION LAYER: Add batch context if available
        batch,
      };

      // Call the template function with context
      result = await Promise.resolve(prompt.template(args, context));

      // CRITICAL: Check SimpleMessage BEFORE PromptMessage
      // (SimpleMessage is more specific and would be missed if PromptMessage check comes first)
      if (this.isSimpleMessageArray(result)) {
        return { messages: this.convertSimpleMessages(result) };
      }

      // Detect if result is already a message array
      if (this.isPromptMessageArray(result)) {
        // Return message array directly (MCP format)
        return { messages: result };
      }

      // Backward compatibility: wrap string in message
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: String(result),
            },
          },
        ],
      };
    });

    // Completion handler (for prompt argument autocomplete)
    this.server.setRequestHandler(CompleteRequestSchema, async (request) => {
      const { ref, argument } = request.params;

      // Extract argument name and value from request
      // ref format: { type: 'ref/prompt', name: 'prompt_name' } or { type: 'ref/resource', uri: 'resource_uri' }
      // argument format: { name: 'arg_name', value: 'partial_value' }
      const argName = argument?.name;
      const argValue = argument?.value || '';

      if (!argName) {
        throw new Error('Completion request missing argument name');
      }

      // Find a matching completion handler
      // Look for handlers where ref.name matches the argument name
      let matchingHandler: {
        name: string;
        description: string;
        ref: { type: 'argument' | 'resource'; name: string };
        handler: (value: string, context?: any) => any | Promise<any>;
      } | undefined;

      for (const completion of this.completions.values()) {
        if (completion.ref.type === 'argument' && completion.ref.name === argName) {
          matchingHandler = completion;
          break;
        }
      }

      // If no handler found, return empty completions
      if (!matchingHandler) {
        return {
          completion: {
            values: [],
            total: 0,
            hasMore: false
          }
        };
      }

      // Call the completion handler
      try {
        const suggestions = await matchingHandler.handler(argValue);

        // Ensure suggestions is an array of strings
        const values = Array.isArray(suggestions) ? suggestions : [];

        return {
          completion: {
            values: values.filter(v => typeof v === 'string'),
            total: values.length,
            hasMore: false
          }
        };
      } catch (error) {
        // Log error but return empty completions rather than failing
        if (!this.options.silent) {
          console.error(`Error in completion handler '${matchingHandler.name}':`, error);
        }

        return {
          completion: {
            values: [],
            total: 0,
            hasMore: false
          }
        };
      }
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
        const availableResources = Array.from(this.resources.keys()).join(', ') || 'none';
        throw new Error(
          `Unknown resource: ${resourceUri}\n\n` +
          `What went wrong:\n` +
          `  The requested resource '${resourceUri}' is not registered with this server.\n\n` +
          `Available resources: ${availableResources}\n\n` +
          `To fix:\n` +
          `  1. Check the resource URI for typos\n` +
          `  2. Ensure the resource is registered before accessing it\n` +
          `  3. Verify the resource was properly added with server.addResource()\n\n` +
          `Tip: Resource URIs are case-sensitive and should match exactly.`
        );
      }

      // Check if content is a function (dynamic resource)
      let content: string | { [key: string]: any } | Buffer | Uint8Array;
      if (typeof resource.content === 'function') {
        // Call the dynamic content function
        content = await Promise.resolve(resource.content());
      } else {
        // Use static content
        content = resource.content;
      }

      // Handle binary content (Buffer or Uint8Array)
      if (isBuffer(content) || isUint8Array(content)) {
        const base64Data = bufferToBase64(content);
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
              typeof content === 'string'
                ? content
                : JSON.stringify(content, null, 2),
          },
        ],
      };
    });
  }

  /**
   * Register subscription handlers with the MCP server
   */
  private registerSubscriptionHandlers(): void {
    if (!this.server || this.resources.size === 0) {
      return;
    }

    // Subscribe handler
    this.server.setRequestHandler(SubscribeRequestSchema, async (request) => {
      const uri = request.params.uri;

      // Verify resource exists
      if (!this.resources.has(uri)) {
        const availableResources = Array.from(this.resources.keys()).join(', ') || 'none';
        throw new Error(
          `Cannot subscribe to unknown resource: ${uri}\n\n` +
          `What went wrong:\n` +
          `  The requested resource '${uri}' is not registered with this server.\n\n` +
          `Available resources: ${availableResources}\n\n` +
          `To fix:\n` +
          `  1. Check the resource URI for typos\n` +
          `  2. Ensure the resource is registered with server.addResource()\n` +
          `  3. Verify the URI matches exactly (case-sensitive)`
        );
      }

      // Verify resource is subscribable
      const resource = this.resources.get(uri)!;
      if (resource.subscribable !== true) {
        const subscribableResources = this.getSubscribableResources().join(', ') || 'none';
        throw new Error(
          `Cannot subscribe to non-subscribable resource: ${uri}\n\n` +
          `Available subscribable resources: ${subscribableResources}`
        );
      }

      // Get the session ID from AsyncLocalStorage context
      // This was set in the HTTP handler when processing the request
      const sessionId = this.sessionContext.getStore();

      if (!sessionId) {
        console.error('[BuildMCPServer] WARNING: No session context available for subscribe request');
        // Fallback for non-HTTP transports (stdio)
        // For stdio, we can use a default session since there's only one client
        const fallbackSessionId = 'stdio-client';
        if (!this.subscriptions.has(uri)) {
          this.subscriptions.set(uri, new Set());
        }
        this.subscriptions.get(uri)!.add(fallbackSessionId);
      } else {
        // Add subscription with the actual session ID
        if (!this.subscriptions.has(uri)) {
          this.subscriptions.set(uri, new Set());
        }
        this.subscriptions.get(uri)!.add(sessionId);
      }

      if (!this.options.silent) {
        console.error(`[BuildMCPServer] Subscribed to resource: ${uri} (session: ${sessionId || 'stdio-client'})`);
      }

      // Return empty success response
      return {};
    });

    // Unsubscribe handler
    this.server.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
      const uri = request.params.uri;

      // Get the session ID from AsyncLocalStorage context
      const sessionId = this.sessionContext.getStore() || 'stdio-client';

      // Remove subscription for THIS session only
      const subscribers = this.subscriptions.get(uri);
      if (subscribers) {
        subscribers.delete(sessionId);

        // Clean up the subscription entry if no subscribers remain
        if (subscribers.size === 0) {
          this.subscriptions.delete(uri);
        }

        if (!this.options.silent) {
          console.error(`[BuildMCPServer] Unsubscribed from resource: ${uri} (session: ${sessionId})`);
        }
      }

      // Return empty success response
      return {};
    });
  }

  /**
   * Create a new Server instance for a session
   * This enables multi-client support by giving each session its own Server+Transport pair
   *
   * Background: The MCP SDK's Server.connect() method can only be called once per Server instance.
   * Calling connect() a second time blocks because the server is already connected to a transport.
   * Solution: Create a new Server instance for each session and register all handlers on it.
   *
   * @returns A new Server instance with all handlers registered
   */
  private createSessionServer(): Server {
    // Create new server with same config as main server
    const sessionServer = new Server(
      {
        name: this.options.name,
        version: this.options.version,
      },
      {
        capabilities: {
          tools: this.tools.size > 0 ? {} : undefined,
          prompts: this.prompts.size > 0 ? {} : undefined,
          resources: this.resources.size > 0 ? {
            subscribe: true,
          } : undefined,
          logging: this.options.capabilities?.logging ? {} : undefined,
          roots: this.options.capabilities?.roots ? {
            listChanged: true,
          } : undefined,
          completions: this.options.capabilities?.completions ? {} : undefined,
        },
      }
    );

    // Register all handlers on the session server
    // We temporarily swap this.server to register handlers on the new server
    const originalServer = this.server;
    this.server = sessionServer;

    this.registerToolHandlers();
    this.registerPromptHandlers();
    this.registerResourceHandlers();
    this.registerSubscriptionHandlers();

    // Restore the original server
    this.server = originalServer;

    return sessionServer;
  }

  /**
   * Notify subscribers of a resource update
   * Sends notifications/resources/updated to all subscribed clients
   *
   * @param uri URI of the resource that was updated
   */
  public notifyResourceUpdate(uri: string): void {
    // DEBUG: Always log this to see if method is being called
    console.error('[BuildMCPServer] notifyResourceUpdate() called for:', uri);

    if (!this.server) {
      if (!this.options.silent) {
        console.error('[BuildMCPServer] Cannot notify: server not initialized');
      }
      return;
    }

    const subscribers = this.subscriptions.get(uri);
    console.error(`[BuildMCPServer] DEBUG: Found ${subscribers?.size || 0} subscribers for ${uri}`);

    if (!subscribers || subscribers.size === 0) {
      if (!this.options.silent) {
        console.error(`[BuildMCPServer] No subscribers for resource: ${uri}`);
      }
      return;
    }

    // Create the notification message (per MCP protocol spec)
    const notification = {
      jsonrpc: '2.0' as const,
      method: 'notifications/resources/updated',
      params: { uri },
    };

    // Broadcast to ALL subscribed transports (application-level broadcasting per MCP SDK docs)
    // The MCP SDK's Protocol class only supports ONE transport, so we must manually send
    // to each transport instance as documented in the StreamableHTTPServerTransport guide.
    let successCount = 0;
    let errorCount = 0;

    for (const sessionId of subscribers) {
      const transport = this.transports.get(sessionId);

      if (!transport) {
        if (!this.options.silent) {
          console.error(`[BuildMCPServer] No transport found for subscribed session: ${sessionId}`);
        }
        errorCount++;
        continue;
      }

      try {
        // Send notification directly to this transport's SSE stream
        transport.send(notification);
        successCount++;

        if (!this.options.silent) {
          console.error(`[BuildMCPServer] Sent notification to session ${sessionId} for resource: ${uri}`);
        }
      } catch (error) {
        errorCount++;
        if (!this.options.silent) {
          console.error(`[BuildMCPServer] Failed to send notification to session ${sessionId}:`, error);
        }
      }
    }

    if (!this.options.silent) {
      console.error(`[BuildMCPServer] Notification broadcast complete: ${successCount} succeeded, ${errorCount} failed`);
    }
  }

  /**
   * Get a resource definition by URI
   */
  public getResource(uri: string): ResourceDefinition | undefined {
    return this.resources.get(uri);
  }

  /**
   * Check if a resource is subscribable
   */
  public isResourceSubscribable(uri: string): boolean {
    const resource = this.resources.get(uri);
    return resource?.subscribable === true;
  }

  /**
   * Get all subscribable resource URIs
   */
  public getSubscribableResources(): string[] {
    const subscribable: string[] = [];
    for (const [uri, resource] of this.resources.entries()) {
      if (resource.subscribable === true) {
        subscribable.push(uri);
      }
    }
    return subscribable;
  }

  /**
   * Start the server with stdio transport
   */
  private async startStdio(): Promise<void> {
    if (!this.server) {
      throw new Error(
        `Server not initialized\n\n` +
        `What went wrong:\n` +
        `  Internal error: Server instance was not created properly.\n\n` +
        `This is likely a bug. Please report it with:\n` +
        `  - Your server configuration\n` +
        `  - Steps to reproduce\n\n` +
        `GitHub: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues`
      );
    }

    console.error(
      `[BuildMCPServer] Starting '${this.options.name}' v${this.options.version} (stdio transport)`
    );
    console.error(
      `[BuildMCPServer] Registered: ${this.tools.size} tools, ${this.prompts.size} prompts, ${this.resources.size} resources`
    );

    const transport = new StdioServerTransport();

    // FOUNDATION LAYER: Add batch context wrapper BEFORE connecting
    // CRITICAL: Intercept stdin to handle batch arrays before SDK validation
    if (this.options.batching?.enabled !== false) {
      wrapStdioTransportForBatch(transport, this.options.batching ?? {});
    }

    await this.server.connect(transport);

    console.error('[BuildMCPServer] Connected and ready for requests');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await this.stop();
      process.exit(0);
    });
  }

  /**
   * Start the server with HTTP transport
   */
  private async startHttp(port: number, stateful?: boolean, securityConfig?: SecurityConfig): Promise<void> {
    if (!this.server) {
      throw new Error(
        `Server not initialized\n\n` +
        `What went wrong:\n` +
        `  Internal error: Server instance was not created properly.\n\n` +
        `This is likely a bug. Please report it with:\n` +
        `  - Your server configuration\n` +
        `  - Steps to reproduce\n\n` +
        `GitHub: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues`
      );
    }

    // Dynamic import of HTTP dependencies
    let express: typeof import('express');
    let cors: typeof import('cors');

    try {
      const expressModule = await import('express');
      express = expressModule.default;

      const corsModule = await import('cors');
      cors = corsModule.default;
    } catch (error) {
      throw new Error(
        'HTTP transport requires express and cors.\n' +
        'Install them with: npm install express cors\n\n' +
        'Or use stdio transport (default) which works without them.'
      );
    }

    // Default to stateful mode (true) for backwards compatibility
    const isStateful = stateful ?? true;
    const isStateless = !isStateful;

    const app = express();
    app.use(express.json());
    app.use(
      cors({
        origin: '*',
        exposedHeaders: ['Mcp-Session-Id'],
      })
    );

    // Mount OAuth router if OAuth is configured (must be before other middleware)
    // OAuth endpoints are mounted at root level for /.well-known/* paths
    if (securityConfig?.authentication?.type === 'oauth2' && securityConfig.authentication.oauthProvider) {
      const issuerUrl = securityConfig.authentication.issuerUrl || `http://localhost:${port}`;

      // Apply stricter rate limiting to OAuth token endpoint (prevent brute force)
      // This is applied BEFORE the OAuth router to protect the token endpoint
      const tokenRateLimitMap = new Map<string, { count: number; resetTime: number }>();
      app.use('/oauth/token', (req, res, next) => {
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const window = 60000; // 1 minute
        const maxRequests = 10; // 10 requests per minute for token endpoint

        let limitInfo = tokenRateLimitMap.get(clientIp);

        // Reset if window has passed
        if (!limitInfo || now > limitInfo.resetTime) {
          limitInfo = { count: 0, resetTime: now + window };
          tokenRateLimitMap.set(clientIp, limitInfo);
        }

        // Check limit
        if (limitInfo.count >= maxRequests) {
          const retryAfter = Math.ceil((limitInfo.resetTime - now) / 1000);
          res.status(429).json({
            error: 'too_many_requests',
            error_description: 'Rate limit exceeded for token endpoint',
            retry_after: retryAfter,
          });
          return;
        }

        // Increment counter
        limitInfo.count++;

        next();
      });

      const oauthRouter = createOAuthRouter({
        provider: securityConfig.authentication.oauthProvider,
        issuerUrl,
      });

      app.use(oauthRouter);

      if (!this.options.silent) {
        console.error('[BuildMCPServer] OAuth 2.1 authentication enabled');
        console.error(`[BuildMCPServer] OAuth issuer URL: ${issuerUrl}`);
        console.error('[BuildMCPServer] OAuth endpoints:');
        console.error(`  - GET  /.well-known/oauth-authorization-server`);
        console.error(`  - GET  /oauth/authorize`);
        console.error(`  - POST /oauth/token (rate limited: 10 req/min)`);
        console.error(`  - POST /oauth/register`);
        console.error(`  - POST /oauth/revoke`);
      }
    }

    // Apply API key authentication middleware if configured
    // Note: API key and OAuth can coexist - API key is checked first, OAuth bearer second
    if (securityConfig?.authentication?.type === 'apiKey') {
      const { middleware } = createSecurityMiddleware(securityConfig);
      middleware.forEach(mw => app.use(mw));

      if (!this.options.silent) {
        console.error('[BuildMCPServer] API Key authentication enabled');
      }
    }

    // Health check endpoint (BUG-006 FIX)
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        server: {
          name: this.options.name,
          version: this.options.version,
          description: this.options.description,
        },
        transport: {
          type: 'http',
          mode: isStateful ? 'stateful' : 'stateless',
          sessions: this.transports.size,
          port: port,
        },
        capabilities: this.options.capabilities,
        resources: {
          tools: this.tools.size,
          prompts: this.prompts.size,
          resources: this.resources.size,
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    // Root endpoint with server info
    app.get('/', (req, res) => {
      res.json({
        message: `${this.options.name} v${this.options.version} - MCP Server`,
        description: this.options.description,
        endpoints: {
          mcp: '/mcp',
          health: '/health',
        },
        transport: {
          type: 'http',
          mode: isStateful ? 'stateful' : 'stateless',
        },
        documentation: 'https://github.com/Clockwork-Innovations/simply-mcp-ts',
      });
    });

    // Apply OAuth bearer middleware to /mcp endpoints if OAuth is configured
    if (securityConfig?.authentication?.type === 'oauth2' && securityConfig.authentication.oauthProvider) {
      const bearerMiddleware = createOAuthMiddleware({
        provider: securityConfig.authentication.oauthProvider
      });
      app.use('/mcp', bearerMiddleware);

      if (!this.options.silent) {
        console.error('[BuildMCPServer] Bearer token authentication enabled for /mcp endpoints');
      }
    }

    // Security: Origin header validation middleware (DNS rebinding protection)
    app.use('/mcp', (req, res, next) => {
      const origin = req.headers.origin || req.headers.referer;

      // Allow requests from localhost/127.0.0.1 (development)
      // In production, you should configure allowed origins more strictly
      if (origin) {
        const url = new URL(origin);
        const allowedHosts = ['localhost', '127.0.0.1', '::1'];
        if (!allowedHosts.includes(url.hostname)) {
          console.warn(`[BuildMCPServer] Blocked request from unauthorized origin: ${origin}`);
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

    if (isStateless) {
      // STATELESS MODE: Create and close transport per request
      // Note: SSE (Server-Sent Events) is incompatible with stateless mode because SSE
      // requires persistent connections. Stateless mode ALWAYS uses JSON-only responses.
      app.post('/mcp', async (req, res) => {
        // Create a new transport for this request without session management
        // Always use JSON-only mode for stateless (SSE requires persistent connections)
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // No session ID generation
          enableJsonResponse: true, // Always use JSON for stateless mode
        });

        try {
          // FOUNDATION LAYER: Add batch context wrapper BEFORE connecting
          // CRITICAL: Must wrap transport.onmessage BEFORE server.connect() sets it up
          // TODO: Implement wrapTransportForBatchContext for HTTP transport
          // if (this.options.batching?.enabled !== false) {
          //   wrapTransportForBatchContext(transport, this.options.batching ?? {});
          // }

          // Connect the server to the transport
          await this.server!.connect(transport);

          // Handle the request - this sends the response
          await transport.handleRequest(req, res, req.body);

          // Note: We don't explicitly close the transport in stateless mode.
          // The transport will close automatically after sending the JSON response.
          // Explicitly closing it causes the response body to be empty.
        } catch (error) {
          console.error('[BuildMCPServer] Error handling stateless MCP request:', error);
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

      // No GET or DELETE endpoints for stateless mode
    } else {
      // STATEFUL MODE: Existing session-based implementation
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
                console.log(`[BuildMCPServer] Session initialized with ID: ${sid}`);
                this.transports.set(sid, transport);
              },
            });

            transport.onclose = () => {
              const sid = transport.sessionId;
              if (sid && this.transports.has(sid)) {
                console.log(`[BuildMCPServer] Transport closed for session ${sid}`);
                this.transports.delete(sid);
                // Multi-client fix: Clean up the server instance for this session
                this.servers.delete(sid);

                // Clean up subscriptions for this session
                for (const [uri, subscribers] of this.subscriptions.entries()) {
                  subscribers.delete(sid);
                  // Remove the subscription entry if no subscribers remain
                  if (subscribers.size === 0) {
                    this.subscriptions.delete(uri);
                  }
                }
              }
            };

            // Multi-client fix: Create a NEW Server instance for this session
            // The MCP SDK's Server.connect() can only be called once per Server.
            // Calling connect() a second time on the same server blocks indefinitely.
            // Solution: Create one Server per session, each with its own Transport.
            const sessionServer = this.createSessionServer();

            // FOUNDATION LAYER: Add batch context wrapper BEFORE connecting
            // CRITICAL: Must wrap transport.onmessage BEFORE server.connect() sets it up
            // TODO: Implement wrapTransportForBatchContext for HTTP transport
            // if (this.options.batching?.enabled !== false) {
            //   wrapTransportForBatchContext(transport, this.options.batching ?? {});
            // }

            await sessionServer.connect(transport);

            // Store the server so we can clean it up on session close
            // Note: We store by sessionId which is set during connect()
            if (transport.sessionId) {
              this.servers.set(transport.sessionId, sessionServer);
            }

            // Use sessionContext to track session ID for this request
            // This allows subscribe handlers to know which session is subscribing
            await this.sessionContext.run(transport.sessionId || 'unknown', async () => {
              await transport.handleRequest(req, res, req.body);
            });
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

          // Use sessionContext to track session ID for this request
          await this.sessionContext.run(sessionId || 'unknown', async () => {
            await transport.handleRequest(req, res, req.body);
          });
        } catch (error) {
          console.error('[BuildMCPServer] Error handling MCP request:', error);
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

      // MCP GET endpoint (SSE) - only for stateful mode
      app.get('/mcp', async (req, res) => {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;

        if (!sessionId || !this.transports.has(sessionId)) {
          res.status(400).send('Invalid or missing session ID');
          return;
        }

        const transport = this.transports.get(sessionId)!;
        await transport.handleRequest(req, res);
      });

      // MCP DELETE endpoint (session termination) - only for stateful mode
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
          console.error('[BuildMCPServer] Error handling session termination:', error);
          if (!res.headersSent) {
            res.status(500).send('Error processing session termination');
          }
        }
      });
    }

    // Start HTTP server with proper error handling
    await new Promise<void>((resolve, reject) => {
      const server = app.listen(port);

      // Handle port conflict and other server errors BEFORE success callback
      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(
            `Port ${port} is already in use\n\n` +
            `What went wrong:\n` +
            `  Another process is already listening on port ${port}.\n\n` +
            `To fix:\n` +
            `  1. Stop the process using port ${port}\n` +
            `  2. Choose a different port with --port flag\n` +
            `  3. Find the process using: lsof -i :${port} (macOS/Linux) or netstat -ano | findstr :${port} (Windows)\n\n` +
            `Example:\n` +
            `  simply-mcp run server.ts --http --port ${port + 1}`
          ));
        } else {
          reject(error);
        }
      });

      server.on('listening', () => {
        console.log(
          `[BuildMCPServer] Server '${this.options.name}' v${this.options.version} listening on port ${port}`
        );
        console.log(
          `[BuildMCPServer] HTTP Mode: ${isStateful ? 'STATEFUL' : 'STATELESS'}`
        );
        console.log(
          `[BuildMCPServer] Registered: ${this.tools.size} tools, ${this.prompts.size} prompts, ${this.resources.size} resources`
        );
        resolve();
      });

      this.httpServer = server;
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await this.stop();
      process.exit(0);
    });
  }

  /**
   * Start the server with WebSocket transport
   */
  private async startWebSocket(
    port: number,
    wsConfig?: { port?: number; heartbeatInterval?: number; heartbeatTimeout?: number; maxMessageSize?: number }
  ): Promise<void> {
    if (!this.server) {
      throw new Error(
        `Server not initialized\n\n` +
        `What went wrong:\n` +
        `  Internal error: Server instance was not created properly.\n\n` +
        `This is likely a bug. Please report it with:\n` +
        `  - Your server configuration\n` +
        `  - Steps to reproduce\n\n` +
        `GitHub: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues`
      );
    }

    console.error(
      `[BuildMCPServer] Starting '${this.options.name}' v${this.options.version} (WebSocket transport)`
    );
    console.error(
      `[BuildMCPServer] Registered: ${this.tools.size} tools, ${this.prompts.size} prompts, ${this.resources.size} resources`
    );

    // Dynamic import of WebSocket transport
    let WebSocketServerTransport: any;

    try {
      const wsModule = await import('../transports/websocket-server.js');
      WebSocketServerTransport = wsModule.WebSocketServerTransport;
    } catch (error) {
      throw new Error(
        'WebSocket transport requires ws package.\n' +
        'Install it with: npm install ws @types/ws\n\n' +
        'Or use stdio transport (default) which works without it.'
      );
    }

    // Use config from runtime config if provided, otherwise use defaults
    const finalPort = wsConfig?.port ?? port ?? 8080;
    const transport = new WebSocketServerTransport({
      port: finalPort,
      heartbeatInterval: wsConfig?.heartbeatInterval ?? 30000,
      heartbeatTimeout: wsConfig?.heartbeatTimeout ?? 60000,
      maxMessageSize: wsConfig?.maxMessageSize ?? 10 * 1024 * 1024, // 10MB
    });

    await transport.start();
    await this.server.connect(transport);

    console.error(`[BuildMCPServer] WebSocket server listening on port ${finalPort}`);
    console.error('[BuildMCPServer] Connected and ready for requests');

    // Store transport for cleanup
    this.transports.set('websocket', transport);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await this.stop();
      process.exit(0);
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

    // Handle plain objects
    if (result && typeof result === 'object') {
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
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
  getStats(): {
    tools: number;
    routers: number;
    assignedTools: number;
    unassignedTools: number;
    prompts: number;
    resources: number;
    flattenRouters: boolean;
  } {
    // Calculate assigned and unassigned tools
    const assignedToolsCount = this.toolToRouters.size;
    const unassignedToolsCount = this.tools.size - this.routers.size - assignedToolsCount;

    return {
      tools: this.tools.size,
      routers: this.routers.size,
      assignedTools: assignedToolsCount,
      unassignedTools: unassignedToolsCount,
      prompts: this.prompts.size,
      resources: this.resources.size,
      flattenRouters: this.options.flattenRouters,
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
   * if (server.hasDependency('express')) {
   *   console.log('Server uses express');
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
   * const version = server.getDependencyVersion('express');
   * console.log(`express version: ${version}`);
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
   * Create BuildMCPServer from file with inline dependencies
   * Parses the file content to extract inline dependency declarations
   *
   * @param filePath - Path to server file
   * @param options - Additional server options (will override parsed values)
   * @returns Promise resolving to BuildMCPServer instance
   *
   * @example
   * ```typescript
   * // Without auto-install (default)
   * const server = await BuildMCPServer.fromFile('./server.ts');
   *
   * // With auto-install
   * const server = await BuildMCPServer.fromFile('./server.ts', {
   *   autoInstall: true
   * });
   *
   * // With custom install options
   * const server = await BuildMCPServer.fromFile('./server.ts', {
   *   autoInstall: {
   *     packageManager: 'pnpm',
   *     onProgress: (event) => console.log(event.message)
   *   }
   * });
   * ```
   */
  static async fromFile(filePath: string, options?: Partial<BuildMCPServerOptions>): Promise<BuildMCPServer> {
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
      console.error('[BuildMCPServer] Inline dependency warnings:');
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
    const server = new BuildMCPServer({
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

      console.error('[BuildMCPServer] Auto-installing dependencies...');
      const result = await server.installDependencies(installOptions);

      if (!result.success) {
        const errorMessages = result.errors
          .map(e => `  - ${e.packageName || 'unknown'}: ${e.message}`)
          .join('\n');
        throw new Error(
          `Failed to install dependencies:\n${errorMessages}`
        );
      }

      console.error(`[BuildMCPServer] Successfully installed ${result.installed.length} packages`);
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
      throw new Error(
        `Server not initialized\n\n` +
        `What went wrong:\n` +
        `  Internal error: Server instance was not created properly.\n\n` +
        `This is likely a bug. Please report it with:\n` +
        `  - Your server configuration\n` +
        `  - Steps to reproduce\n\n` +
        `GitHub: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues`
      );
    }

    try {
      // Send sampling request to client using the MCP protocol
      // Use the server's createMessage() method to request LLM sampling from the client
      const result: CreateMessageResult = await this.server.createMessage({
        messages: messages as any, // Cast needed - SamplingMessage format matches CreateMessageRequest
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
        topP: options?.topP,
        stopSequences: options?.stopSequences,
        metadata: options?.metadata,
      });

      return result;
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Sampling request failed\n\n` +
        `What went wrong:\n` +
        `  ${errorMessage}\n\n` +
        `Possible causes:\n` +
        `  - Client does not support sampling capability\n` +
        `  - Connection issue with the client\n` +
        `  - LLM service unavailable\n\n` +
        `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts#sampling`
      );
    }
  }

  /**
   * Request user input from the client via elicitation
   * @private
   */
  private async requestElicitation(
    prompt: string,
    args: Record<string, any>
  ): Promise<CoreElicitResult> {
    if (!this.server) {
      throw new Error(
        `Server not initialized\n\n` +
        `What went wrong:\n` +
        `  Internal error: Server instance was not created properly.\n\n` +
        `This is likely a bug. Please report it with:\n` +
        `  - Your server configuration\n` +
        `  - Steps to reproduce\n\n` +
        `GitHub: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues`
      );
    }

    try {
      // Send elicitation request to client using the MCP protocol
      // Use the server's elicitInput() method to request user input from the client
      const result: ElicitResult = await this.server.elicitInput({
        message: prompt,
        requestedSchema: {
          type: 'object',
          properties: args,
        },
      });

      return result as CoreElicitResult;
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Elicitation request failed\n\n` +
        `What went wrong:\n` +
        `  ${errorMessage}\n\n` +
        `Possible causes:\n` +
        `  - Client does not support elicitation capability\n` +
        `  - Connection issue with the client\n` +
        `  - User declined or cancelled the input request\n\n` +
        `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts#elicitation`
      );
    }
  }

  /**
   * Request roots list from the client
   */
  public async requestRoots(): Promise<ListRootsResult> {
    if (!this.server) {
      throw new Error(
        `Server not initialized\n\n` +
        `What went wrong:\n` +
        `  Internal error: Server instance was not created properly.\n\n` +
        `This is likely a bug. Please report it with:\n` +
        `  - Your server configuration\n` +
        `  - Steps to reproduce\n\n` +
        `GitHub: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues`
      );
    }

    try {
      // Send roots list request to client using the MCP protocol
      const result: ListRootsResult = await this.server.listRoots();
      return result;
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Roots request failed\n\n` +
        `What went wrong:\n` +
        `  ${errorMessage}\n\n` +
        `Possible causes:\n` +
        `  - Client does not support roots capability\n` +
        `  - Connection issue with the client\n` +
        `  - No roots configured in client\n\n` +
        `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts#roots`
      );
    }
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
        message,
      },
    };

    // Send notification using the server's notification mechanism
    try {
      this.server.notification(notification);
    } catch (error) {
      console.error('[BuildMCPServer] Failed to send progress notification:', error);
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
      console.error('[BuildMCPServer] Failed to send logging notification:', error);
    }
  }

  /**
   * Read a resource by URI (for use in handler context)
   * @private
   */
  private async readResourceByUri(uri: string): Promise<ResourceContents> {
    const resource = this.resources.get(uri);

    if (!resource) {
      const availableResources = Array.from(this.resources.keys()).join(', ') || 'none';
      throw new Error(
        `Resource not found: ${uri}\n\n` +
        `What went wrong:\n` +
        `  A tool attempted to read a resource that doesn't exist.\n\n` +
        `Available resources: ${availableResources}\n\n` +
        `To fix:\n` +
        `  1. Check the resource URI is correct\n` +
        `  2. Ensure the resource is registered with server.addResource()\n` +
        `  3. Verify the URI matches exactly (case-sensitive)`
      );
    }

    return {
      uri: resource.uri,
      mimeType: resource.mimeType,
      text: typeof resource.content === 'string' ? resource.content : JSON.stringify(resource.content, null, 2),
    };
  }

  // ===== Public Getters for Interface Wrapper =====

  /**
   * Get all registered tools
   * @returns Map of tool names to internal tool definitions
   */
  getTools(): Map<string, InternalTool> {
    return this.tools;
  }

  /**
   * Get all registered prompts
   * @returns Map of prompt names to prompt definitions
   */
  getPrompts(): Map<string, PromptDefinition> {
    return this.prompts;
  }

  /**
   * Get all registered resources
   * @returns Map of resource URIs to resource definitions
   */
  getResources(): Map<string, ResourceDefinition> {
    return this.resources;
  }

  /**
   * Get server options
   * @returns Server configuration options
   */
  getOptions() {
    return this.options;
  }

  /**
   * Get tool-to-routers mapping
   * @returns Map of tool names to sets of router names that contain them
   */
  getToolToRouters(): Map<string, Set<string>> {
    return this.toolToRouters;
  }

  // ===== Public Direct Execution Methods =====

  /**
   * Execute a tool directly (without going through MCP protocol)
   * @param toolName Name of the tool to execute
   * @param args Arguments for the tool
   * @returns Tool execution result
   */
  async executeToolDirect(toolName: string, args: any): Promise<any> {
    let actualToolName = toolName;
    let namespaceRouter: string | undefined = undefined;

    // Layer 2: Check for namespace format (router__tool)
    if (toolName.includes('__')) {
      const parts = toolName.split('__');
      if (parts.length === 2) {
        const [routerName, subToolName] = parts;

        // Verify router exists
        if (!this.routers.has(routerName)) {
          throw new Error(
            `Unknown router in namespace: ${routerName}\n\n` +
            `What went wrong:\n` +
            `  The namespace '${toolName}' references a router '${routerName}' that doesn't exist.\n\n` +
            `Available routers: ${Array.from(this.routers).join(', ') || 'none'}\n\n` +
            `To fix:\n` +
            `  1. Check the router name in the namespace\n` +
            `  2. Use the format: router_name__tool_name\n` +
            `  3. Call the router first to see available tools\n\n` +
            `Tip: Namespace format uses double underscore (__) between router and tool names.`
          );
        }

        // Verify router owns this tool
        const routerTools = this.routerToTools.get(routerName);
        if (!routerTools || !routerTools.has(subToolName)) {
          const availableToolsInRouter = routerTools ? Array.from(routerTools).join(', ') : 'none';
          throw new Error(
            `Tool '${subToolName}' not found in router '${routerName}'\n\n` +
            `What went wrong:\n` +
            `  The router '${routerName}' does not have a tool named '${subToolName}'.\n\n` +
            `Available tools in ${routerName}: ${availableToolsInRouter}\n\n` +
            `To fix:\n` +
            `  1. Call the router '${routerName}' to see its available tools\n` +
            `  2. Use the correct tool name from the router's tool list\n` +
            `  3. Check for typos in the tool name\n\n` +
            `Tip: Call the router directly to get its full tool list.`
          );
        }

        // Set the actual tool name and track namespace
        actualToolName = subToolName;
        namespaceRouter = routerName;
      }
    }

    const tool = this.tools.get(actualToolName);
    const routerOwners = this.toolToRouters.get(actualToolName);

    if (!tool) {
      const availableTools = Array.from(this.tools.keys()).join(', ') || 'none';
      throw new Error(
        `Unknown tool: ${actualToolName}\n\n` +
        `What went wrong:\n` +
        `  The requested tool '${actualToolName}' is not registered with this server.\n\n` +
        `Available tools: ${availableTools}\n\n` +
        `To fix:\n` +
        `  1. Check the tool name for typos\n` +
        `  2. Ensure the tool is registered before calling it\n` +
        `  3. Verify the tool was properly added with server.addTool()\n\n` +
        `Tip: Tool names are case-sensitive and should match exactly.`
      );
    }

    // Validate arguments using Zod
    const validatedArgs = tool.definition.parameters.parse(args);

    // Create logger with notification callback
    const logNotificationCallback: LogNotificationCallback | undefined =
      this.options.capabilities?.logging && this.server
        ? (level: LogLevel, message: string, data?: unknown) => {
            this.sendLoggingNotification(level, message, data);
          }
        : undefined;

    const logger = createDefaultLogger(`[Tool:${actualToolName}]`, logNotificationCallback);

    // Retrieve batch context from AsyncLocalStorage
    const batch = batchContextStorage.getStore();

    // Create handler context
    const context: HandlerContext = {
      logger,
      metadata: {
        toolName: actualToolName,
        // Include router information if tool belongs to any routers
        ...(routerOwners && routerOwners.size > 0 ? {
          routers: Array.from(routerOwners),
        } : {}),
        // Layer 2: Include namespace information if called via namespace
        ...(namespaceRouter ? {
          namespace: namespaceRouter,
          namespacedCall: true,
        } : {}),
      },
      // Add MCP-specific context
      mcp: {
        server: {
          name: this.options.name,
          version: this.options.version,
          description: this.options.description,
        },
        session: this.server,
        request_context: {
          request_id: randomUUID(),
          meta: undefined,
        },
      },
      // FOUNDATION LAYER: Add batch context if available
      batch,
    };

    // Add sampling capability if enabled
    if (this.options.capabilities?.sampling && this.server) {
      context.sample = async (messages: SamplingMessage[], options?: SamplingOptions) => {
        return this.requestSampling(messages, options);
      };
    }

    // Add resource reading capability if resources are available
    if (this.resources.size > 0) {
      context.readResource = async (uri: string) => {
        return this.readResourceByUri(uri);
      };
    }

    // Add elicitation capability if enabled
    if (this.options.capabilities?.elicitation && this.server) {
      context.elicitInput = async (prompt: string, args: Record<string, any>) => {
        return this.requestElicitation(prompt, args);
      };
    }

    // Execute the tool
    const result = await tool.definition.execute(validatedArgs, context);

    // Normalize result
    return await this.normalizeResult(result, logger);
  }

  /**
   * Get a prompt directly (without going through MCP protocol)
   * @param promptName Name of the prompt
   * @param args Arguments for the prompt
   * @returns Prompt result with rendered template
   */
  async getPromptDirect(promptName: string, args: any = {}): Promise<any> {
    const prompt = this.prompts.get(promptName);

    if (!prompt) {
      const availablePrompts = Array.from(this.prompts.keys()).join(', ') || 'none';
      throw new Error(
        `Unknown prompt: ${promptName}\n\n` +
        `What went wrong:\n` +
        `  The requested prompt '${promptName}' is not registered with this server.\n\n` +
        `Available prompts: ${availablePrompts}\n\n` +
        `To fix:\n` +
        `  1. Check the prompt name for typos\n` +
        `  2. Ensure the prompt is registered before using it\n` +
        `  3. Verify the prompt was properly added with server.addPrompt()\n\n` +
        `Tip: Prompt names are case-sensitive and should match exactly.`
      );
    }

    // All prompts now require implementation (template is always a function)
    let result: string | PromptMessage[] | SimpleMessage[];
    if (typeof prompt.template !== 'function') {
      throw new Error(
        `Prompt "${promptName}" is missing implementation.\n\n` +
        `What went wrong:\n` +
        `  All prompts now require a method implementation.\n\n` +
        `To fix:\n` +
        `  1. Implement the prompt as a method in your server class\n` +
        `  2. The method should return either a string or an array of messages\n\n` +
        `Example:\n` +
        `  weatherForecast = async (args: { location: string }) => {\n` +
        `    return \`Weather forecast for \${args.location}\`;\n` +
        `  };`
      );
    }

    // Create context for prompt execution
    const logger = createDefaultLogger(`[Prompt:${promptName}]`, () => {});

    // Retrieve batch context from AsyncLocalStorage
    const batch = batchContextStorage.getStore();

    const context: HandlerContext = {
      logger,
      metadata: { promptName },
      mcp: {
        server: {
          name: this.options.name,
          version: this.options.version,
          description: this.options.description,
        },
        session: this.server,
        request_context: {
          request_id: randomUUID(),
          meta: undefined,
        },
      },
      // FOUNDATION LAYER: Add batch context if available
      batch,
    };

    // Call the template function with context
    result = await Promise.resolve(prompt.template(args, context));

    // CRITICAL: Check SimpleMessage BEFORE PromptMessage
    // (SimpleMessage is more specific and would be missed if PromptMessage check comes first)
    if (this.isSimpleMessageArray(result)) {
      return { messages: this.convertSimpleMessages(result) };
    }

    // Detect if result is already a message array
    if (this.isPromptMessageArray(result)) {
      // Return message array directly (MCP format)
      return { messages: result };
    }

    // Backward compatibility: wrap string in message
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: String(result),
          },
        },
      ],
    };
  }

  /**
   * Read a resource directly (without going through MCP protocol)
   * @param uri URI of the resource
   * @returns Resource contents
   */
  async readResourceDirect(uri: string): Promise<any> {
    const resource = this.resources.get(uri);

    if (!resource) {
      const availableResources = Array.from(this.resources.keys()).join(', ') || 'none';
      throw new Error(
        `Unknown resource: ${uri}\n\n` +
        `What went wrong:\n` +
        `  The requested resource '${uri}' is not registered with this server.\n\n` +
        `Available resources: ${availableResources}\n\n` +
        `To fix:\n` +
        `  1. Check the resource URI for typos\n` +
        `  2. Ensure the resource is registered before accessing it\n` +
        `  3. Verify the resource was properly added with server.addResource()\n\n` +
        `Tip: Resource URIs are case-sensitive and should match exactly.`
      );
    }

    // Check if content is a function (dynamic resource)
    let content: string | { [key: string]: any } | Buffer | Uint8Array;
    if (typeof resource.content === 'function') {
      // Call the dynamic content function
      content = await Promise.resolve(resource.content());
    } else {
      // Use static content
      content = resource.content;
    }

    // Handle binary content (Buffer or Uint8Array)
    if (isBuffer(content) || isUint8Array(content)) {
      const base64Data = bufferToBase64(content);
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
            typeof content === 'string'
              ? content
              : JSON.stringify(content, null, 2),
        },
      ],
    };
  }
}
