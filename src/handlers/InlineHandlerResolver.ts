/**
 * Inline Handler Resolver - Executes JavaScript code strings in a sandboxed environment
 */

import vm from 'node:vm';
import {
  HandlerResolver,
  HandlerConfig,
  InlineHandlerConfig,
  ToolHandler,
  HandlerContext,
  HandlerResult,
} from '../types/handler.js';
import {
  HandlerSyntaxError,
  HandlerTimeoutError,
  HandlerConfigError,
} from '../core/errors.js';

/**
 * Resolver for inline code handlers
 * Executes JavaScript code strings in a sandboxed VM context
 */
export class InlineHandlerResolver implements HandlerResolver {
  private defaultTimeout: number;

  /**
   * Create a new InlineHandlerResolver
   * @param defaultTimeout Default execution timeout in milliseconds
   */
  constructor(defaultTimeout = 5000) {
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Check if this resolver can handle the given configuration
   */
  canResolve(config: HandlerConfig): boolean {
    return config.type === 'inline';
  }

  /**
   * Resolve an inline handler configuration to an executable function
   */
  async resolve(config: HandlerConfig): Promise<ToolHandler> {
    if (!this.canResolve(config)) {
      throw new HandlerConfigError(
        `InlineHandlerResolver cannot resolve handler of type: ${config.type}`
      );
    }

    const inlineConfig = config as InlineHandlerConfig;
    const timeout = inlineConfig.timeout || this.defaultTimeout;

    // Pre-compile the code to catch syntax errors early
    let compiledScript: vm.Script;
    try {
      // If the code is already a function expression (starts with 'async' or 'function'),
      // use it directly. Otherwise, wrap it in a function body with return statement.
      const trimmedCode = inlineConfig.code.trim();
      const isFunctionExpression =
        trimmedCode.startsWith('async ') ||
        trimmedCode.startsWith('function') ||
        trimmedCode.startsWith('(');

      const wrappedCode = isFunctionExpression
        ? `(${inlineConfig.code})`
        : `(async function handler(args, context) { ${inlineConfig.code} })`;

      compiledScript = new vm.Script(wrappedCode, {
        filename: 'inline-handler.js',
      });
    } catch (error) {
      throw new HandlerSyntaxError(
        `Syntax error in inline handler code: ${error instanceof Error ? error.message : String(error)}`,
        { code: inlineConfig.code, error: String(error) }
      );
    }

    // Return wrapped handler
    return async (
      args: Record<string, unknown>,
      context: HandlerContext
    ): Promise<HandlerResult> => {
      context.logger.debug('Executing inline handler');

      try {
        // Create sandboxed context
        const sandbox = this.createSandbox(args, context);

        // Execute with timeout
        const handlerFunc = compiledScript.runInNewContext(sandbox, {
          timeout,
          displayErrors: true,
        });

        // Run the handler function
        const result = await Promise.race([
          handlerFunc(args, context),
          this.createTimeoutPromise(timeout),
        ]);

        // Normalize result
        return this.normalizeResult(result);
      } catch (error) {
        if (error instanceof HandlerTimeoutError) {
          context.logger.error('Inline handler execution timed out');
          throw error;
        }

        if (error instanceof HandlerSyntaxError) {
          context.logger.error('Inline handler syntax error', error);
          throw error;
        }

        context.logger.error('Error executing inline handler', error);
        throw new HandlerSyntaxError(
          `Runtime error in inline handler: ${error instanceof Error ? error.message : String(error)}`,
          { code: inlineConfig.code, error: String(error) }
        );
      }
    };
  }

  /**
   * Create a sandboxed context for code execution
   * Provides limited access to globals for security
   */
  private createSandbox(
    args: Record<string, unknown>,
    context: HandlerContext
  ): vm.Context {
    // Limited globals for safety
    const sandbox = {
      // Basic JavaScript globals
      console: {
        log: context.logger.info.bind(context.logger),
        error: context.logger.error.bind(context.logger),
        warn: context.logger.warn.bind(context.logger),
        debug: context.logger.debug.bind(context.logger),
      },
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Promise,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,

      // Handler-specific context
      args,
      context,

      // Utility functions
      encodeURIComponent,
      decodeURIComponent,
      encodeURI,
      decodeURI,
    };

    return vm.createContext(sandbox);
  }

  /**
   * Create a promise that rejects after timeout
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new HandlerTimeoutError(`Handler execution exceeded timeout of ${timeout}ms`, {
            timeout,
          })
        );
      }, timeout);
    });
  }

  /**
   * Normalize handler result to conform to HandlerResult format
   */
  private normalizeResult(result: unknown): HandlerResult {
    // If result is already in correct format
    if (
      result &&
      typeof result === 'object' &&
      'content' in result &&
      Array.isArray((result as HandlerResult).content)
    ) {
      return result as HandlerResult;
    }

    // If result is a string, wrap it
    if (typeof result === 'string') {
      return {
        content: [{ type: 'text', text: result }],
      };
    }

    // If result is an object, stringify it
    if (result && typeof result === 'object') {
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    // Default case
    return {
      content: [{ type: 'text', text: String(result) }],
    };
  }
}
