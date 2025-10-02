/**
 * Handler Manager - Coordinates all handler resolvers and executes handlers
 */

import {
  HandlerResolver,
  HandlerConfig,
  ToolHandler,
  HandlerContext,
  HandlerResult,
  HandlerExecutionOptions,
  Logger,
} from './types.js';
import {
  HandlerExecutionError,
  HandlerConfigError,
  HandlerTimeoutError,
} from './errors.js';
import { FileHandlerResolver } from '../handlers/FileHandlerResolver.js';
import { InlineHandlerResolver } from '../handlers/InlineHandlerResolver.js';
import { HttpHandlerResolver } from '../handlers/HttpHandlerResolver.js';
import { RegistryHandlerResolver } from '../handlers/RegistryHandlerResolver.js';
import { createDefaultLogger } from './logger.js';

/**
 * Options for creating a HandlerManager
 */
export interface HandlerManagerOptions {
  basePath?: string; // Base path for file handlers
  defaultTimeout?: number; // Default execution timeout
  logger?: Logger; // Logger instance
  silent?: boolean; // Disable console logging
}

/**
 * Manager for coordinating handler resolution and execution
 */
export class HandlerManager {
  private resolvers: HandlerResolver[];
  private logger: Logger;
  private defaultTimeout: number;
  private registryResolver: RegistryHandlerResolver;

  /**
   * Create a new HandlerManager
   */
  constructor(options: HandlerManagerOptions = {}) {
    // Check for environment variable to silence logger
    const silent = options.silent ?? (process.env.MCP_SILENT_LOGGER === 'true');
    this.logger = options.logger || createDefaultLogger('[HandlerManager]', undefined, silent);
    this.defaultTimeout = options.defaultTimeout || 5000;

    // Initialize resolvers
    this.registryResolver = new RegistryHandlerResolver();
    this.resolvers = [
      this.registryResolver,
      new FileHandlerResolver(options.basePath),
      new InlineHandlerResolver(this.defaultTimeout),
      new HttpHandlerResolver(this.defaultTimeout),
    ];

    this.logger.info('HandlerManager initialized with resolvers:', {
      resolvers: this.resolvers.map((r) => r.constructor.name),
    });
  }

  /**
   * Resolve a handler configuration to an executable function
   * @param config Handler configuration
   * @returns Executable tool handler function
   */
  async resolveHandler(config: HandlerConfig): Promise<ToolHandler> {
    this.logger.debug(`Resolving handler of type: ${config.type}`);

    // Find appropriate resolver
    const resolver = this.resolvers.find((r) => r.canResolve(config));

    if (!resolver) {
      throw new HandlerConfigError(
        `No resolver found for handler type: ${config.type}`,
        { type: config.type }
      );
    }

    try {
      const handler = await resolver.resolve(config);
      this.logger.debug(`Handler resolved successfully using ${resolver.constructor.name}`);
      return handler;
    } catch (error) {
      this.logger.error(`Failed to resolve handler:`, error);
      throw error;
    }
  }

  /**
   * Execute a handler with the given arguments and context
   * @param handler Tool handler function
   * @param args Arguments to pass to the handler
   * @param context Execution context
   * @param options Execution options
   * @returns Handler result
   */
  async executeHandler(
    handler: ToolHandler,
    args: Record<string, unknown>,
    context: HandlerContext,
    options: HandlerExecutionOptions = {}
  ): Promise<HandlerResult> {
    const timeout = options.timeout || this.defaultTimeout;
    const retries = options.retries || 0;

    this.logger.debug('Executing handler', {
      sessionId: context.sessionId,
      timeout,
      retries,
    });

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(
        handler,
        args,
        context,
        timeout,
        options.abortSignal
      );

      this.logger.debug('Handler execution completed successfully');
      return result;
    } catch (error) {
      // Handle retries
      if (retries > 0 && this.isRetryableError(error)) {
        this.logger.warn(`Handler execution failed, retrying... (${retries} retries left)`);
        return this.executeHandler(handler, args, context, {
          ...options,
          retries: retries - 1,
        });
      }

      // Wrap error with additional context
      this.logger.error('Handler execution failed:', error);
      throw this.wrapError(error, context);
    }
  }

  /**
   * Execute handler with timeout enforcement
   */
  private async executeWithTimeout(
    handler: ToolHandler,
    args: Record<string, unknown>,
    context: HandlerContext,
    timeout: number,
    abortSignal?: AbortSignal
  ): Promise<HandlerResult> {
    // Check if already aborted
    if (abortSignal?.aborted) {
      throw new HandlerTimeoutError('Execution aborted before starting', { timeout });
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new HandlerTimeoutError(`Handler execution exceeded timeout of ${timeout}ms`, {
            timeout,
          })
        );
      }, timeout);

      // Clear timeout if aborted
      abortSignal?.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new HandlerTimeoutError('Execution aborted', { timeout }));
      });
    });

    // Race between handler execution and timeout
    return Promise.race([handler(args, context), timeoutPromise]);
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    // Don't retry timeout, syntax, or config errors
    if (
      error instanceof HandlerTimeoutError ||
      error instanceof HandlerConfigError
    ) {
      return false;
    }

    // Retry network and execution errors
    return error instanceof HandlerExecutionError;
  }

  /**
   * Wrap error with additional context
   */
  private wrapError(error: unknown, context: HandlerContext): HandlerExecutionError {
    if (error instanceof HandlerExecutionError) {
      return error;
    }

    return new HandlerExecutionError(
      `Handler execution failed: ${error instanceof Error ? error.message : String(error)}`,
      'HANDLER_EXECUTION_ERROR',
      {
        sessionId: context.sessionId,
        originalError: String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }
    );
  }

  /**
   * Parse handler configuration from string or object
   * Supports both old string format and new structured format
   */
  parseHandlerConfig(handler: string | HandlerConfig): HandlerConfig {
    // If already a structured config, return as-is
    if (typeof handler === 'object') {
      return handler;
    }

    // Parse string-based handler config
    const handlerStr = handler.trim();

    // Check for inline code (starts with 'return' or contains '=>')
    if (handlerStr.startsWith('return') || handlerStr.includes('=>')) {
      return {
        type: 'inline',
        code: handlerStr,
      };
    }

    // Check for HTTP URL
    if (handlerStr.startsWith('http://') || handlerStr.startsWith('https://')) {
      return {
        type: 'http',
        url: handlerStr,
        method: 'POST', // Default to POST
      };
    }

    // Check for registry handler (format: "registry:handlerName")
    if (handlerStr.startsWith('registry:')) {
      return {
        type: 'registry',
        name: handlerStr.substring(9), // Remove "registry:" prefix
      };
    }

    // Default to file handler
    return {
      type: 'file',
      path: handlerStr,
    };
  }

  /**
   * Get the registry resolver for registering custom handlers
   */
  getRegistry(): RegistryHandlerResolver {
    return this.registryResolver;
  }

  /**
   * Add a custom resolver
   */
  addResolver(resolver: HandlerResolver): void {
    this.resolvers.unshift(resolver); // Add to front for priority
    this.logger.info(`Added custom resolver: ${resolver.constructor.name}`);
  }

  /**
   * Remove a resolver by type
   */
  removeResolver(resolverClass: new (...args: unknown[]) => HandlerResolver): boolean {
    const index = this.resolvers.findIndex((r) => r instanceof resolverClass);
    if (index !== -1) {
      this.resolvers.splice(index, 1);
      this.logger.info(`Removed resolver: ${resolverClass.name}`);
      return true;
    }
    return false;
  }
}