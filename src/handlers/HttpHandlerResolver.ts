/**
 * HTTP Handler Resolver - Makes HTTP requests to external services
 */

import vm from 'node:vm';
import {
  HandlerResolver,
  HandlerConfig,
  HttpHandlerConfig,
  ToolHandler,
  HandlerContext,
  HandlerResult,
} from '../types/handler.js';
import {
  HandlerNetworkError,
  HandlerConfigError,
  HandlerTimeoutError,
  HandlerSyntaxError,
} from '../core/errors.js';

/**
 * Resolver for HTTP-based handlers
 * Makes HTTP requests to external services and transforms responses
 */
export class HttpHandlerResolver implements HandlerResolver {
  private defaultTimeout: number;
  private defaultRetries: number;

  /**
   * Create a new HttpHandlerResolver
   * @param defaultTimeout Default request timeout in milliseconds
   * @param defaultRetries Default number of retry attempts
   */
  constructor(defaultTimeout = 5000, defaultRetries = 0) {
    this.defaultTimeout = defaultTimeout;
    this.defaultRetries = defaultRetries;
  }

  /**
   * Check if this resolver can handle the given configuration
   */
  canResolve(config: HandlerConfig): boolean {
    return config.type === 'http';
  }

  /**
   * Resolve an HTTP handler configuration to an executable function
   */
  async resolve(config: HandlerConfig): Promise<ToolHandler> {
    if (!this.canResolve(config)) {
      throw new HandlerConfigError(
        `HttpHandlerResolver cannot resolve handler of type: ${config.type}`
      );
    }

    const httpConfig = config as HttpHandlerConfig;
    const timeout = httpConfig.timeout || this.defaultTimeout;
    const retries = httpConfig.retries ?? this.defaultRetries;

    // Pre-compile transform functions if provided
    const requestTransform = httpConfig.requestTransform
      ? this.compileTransform(httpConfig.requestTransform, 'request')
      : null;
    const responseTransform = httpConfig.responseTransform
      ? this.compileTransform(httpConfig.responseTransform, 'response')
      : null;

    // Return wrapped handler
    return async (
      args: Record<string, unknown>,
      context: HandlerContext
    ): Promise<HandlerResult> => {
      context.logger.debug(`Making HTTP ${httpConfig.method} request to ${httpConfig.url}`);

      try {
        // Transform request if needed
        let requestData: Record<string, unknown> = args;
        if (requestTransform) {
          requestData = (await this.executeTransform(
            requestTransform,
            args,
            context,
            'request'
          )) as Record<string, unknown>;
        }

        // Make HTTP request with retries
        const response = await this.makeRequestWithRetries(
          httpConfig,
          requestData,
          timeout,
          retries,
          context
        );

        // Transform response if needed
        let result = response;
        if (responseTransform) {
          result = await this.executeTransform(
            responseTransform,
            response,
            context,
            'response'
          );
        }

        // Normalize result
        return this.normalizeResult(result);
      } catch (error) {
        context.logger.error(`HTTP handler error: ${error}`);
        if (
          error instanceof HandlerNetworkError ||
          error instanceof HandlerTimeoutError ||
          error instanceof HandlerSyntaxError
        ) {
          throw error;
        }

        throw new HandlerNetworkError(
          `HTTP request failed: ${error instanceof Error ? error.message : String(error)}`,
          {
            url: httpConfig.url,
            method: httpConfig.method,
            error: String(error),
          }
        );
      }
    };
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequestWithRetries(
    config: HttpHandlerConfig,
    data: unknown,
    timeout: number,
    retries: number,
    context: HandlerContext
  ): Promise<unknown> {
    let lastError: Error | null = null;
    const maxAttempts = retries + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          context.logger.warn(`Retry attempt ${attempt - 1} of ${retries}`);
          // Exponential backoff
          await this.sleep(Math.min(1000 * Math.pow(2, attempt - 2), 10000));
        }

        return await this.makeRequest(config, data, timeout);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors
        if (error instanceof HandlerTimeoutError || error instanceof HandlerSyntaxError) {
          throw error;
        }

        if (attempt === maxAttempts) {
          break; // No more retries
        }
      }
    }

    throw new HandlerNetworkError(
      `HTTP request failed after ${maxAttempts} attempts: ${lastError?.message}`,
      {
        url: config.url,
        method: config.method,
        attempts: maxAttempts,
        lastError: lastError?.message,
      }
    );
  }

  /**
   * Make a single HTTP request
   */
  private async makeRequest(
    config: HttpHandlerConfig,
    data: unknown,
    timeout: number
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.headers,
      };

      const options: RequestInit = {
        method: config.method,
        headers,
        signal: controller.signal,
      };

      // Add body for POST, PUT
      if (config.method === 'POST' || config.method === 'PUT') {
        options.body = JSON.stringify(data);
      }

      // Add query parameters for GET, DELETE
      let url = config.url;
      if (config.method === 'GET' || config.method === 'DELETE') {
        const params = new URLSearchParams();
        if (data && typeof data === 'object') {
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              params.append(key, String(value));
            }
          });
        }
        const queryString = params.toString();
        if (queryString) {
          url += (url.includes('?') ? '&' : '?') + queryString;
        }
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new HandlerNetworkError(
          `HTTP ${response.status} ${response.statusText}`,
          {
            url: config.url,
            method: config.method,
            status: response.status,
            statusText: response.statusText,
          }
        );
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new HandlerTimeoutError(
          `HTTP request timed out after ${timeout}ms`,
          { url: config.url, timeout }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Compile a transform function from code string
   */
  private compileTransform(code: string, type: 'request' | 'response'): vm.Script {
    try {
      return new vm.Script(
        `(async function transform(data, context) { ${code} })`,
        {
          filename: `${type}-transform.js`,
        }
      );
    } catch (error) {
      throw new HandlerSyntaxError(
        `Syntax error in ${type} transform: ${error instanceof Error ? error.message : String(error)}`,
        { code, type, error: String(error) }
      );
    }
  }

  /**
   * Execute a transform function
   */
  private async executeTransform(
    script: vm.Script,
    data: unknown,
    context: HandlerContext,
    type: 'request' | 'response'
  ): Promise<unknown> {
    try {
      const sandbox = this.createTransformSandbox(data, context);
      const transformFunc = script.runInNewContext(sandbox, {
        timeout: 5000,
        displayErrors: true,
      });

      return await transformFunc(data, context);
    } catch (error) {
      throw new HandlerSyntaxError(
        `Runtime error in ${type} transform: ${error instanceof Error ? error.message : String(error)}`,
        { type, error: String(error) }
      );
    }
  }

  /**
   * Create sandbox for transform execution
   */
  private createTransformSandbox(
    data: unknown,
    context: HandlerContext
  ): vm.Context {
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

      // Transform-specific data
      data,
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

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
