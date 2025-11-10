/**
 * Tool Runner Tool
 *
 * MCP tool for executing TypeScript code that orchestrates multiple tool calls.
 * Auto-registered when IServer.codeExecution is configured.
 */

import type { ICodeExecutionConfig, SupportedLanguage } from './types.js';
import { createExecutor, validateConfig } from './runtime-loader.js';
import type { IExecutor } from './executors/base-executor.js';

/**
 * Tool runner parameters
 */
export interface ToolRunnerParams {
  /**
   * Programming language
   */
  language: SupportedLanguage;

  /**
   * Code to execute
   */
  code: string;

  /**
   * Optional timeout override (ms)
   */
  timeout?: number;
}

/**
 * Tool runner result
 */
export interface ToolRunnerResult {
  /**
   * Whether execution was successful
   */
  success: boolean;

  /**
   * Return value (if any)
   */
  returnValue?: any;

  /**
   * Captured stdout
   */
  stdout?: string;

  /**
   * Captured stderr
   */
  stderr?: string;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Stack trace (if available)
   */
  stackTrace?: string;

  /**
   * Execution time in milliseconds
   */
  executionTime?: number;
}

/**
 * Create tool_runner tool handler
 *
 * Returns a tool handler function compatible with Simply-MCP's tool system.
 * Lazy loads the executor on first call.
 *
 * @param config - Code execution configuration
 * @returns Tool handler function
 *
 * @example
 * ```typescript
 * const handler = createToolRunnerTool({
 *   mode: 'vm',
 *   timeout: 5000,
 *   language: 'typescript'
 * });
 *
 * const result = await handler({
 *   language: 'typescript',
 *   code: 'const result = await getWeather({ city: "SF" }); return result;'
 * });
 * ```
 */
export function createToolRunnerTool(
  config: ICodeExecutionConfig
): (params: ToolRunnerParams) => Promise<ToolRunnerResult> {
  // Validate config once at creation time
  validateConfig(config);

  // Executor instance (lazy loaded)
  let executor: IExecutor | null = null;

  // Tool handler
  return async (params: ToolRunnerParams): Promise<ToolRunnerResult> => {
    // Validate language is allowed
    const allowedLanguages = config.allowedLanguages || ['javascript'];
    if (!allowedLanguages.includes(params.language)) {
      return {
        success: false,
        error: `Language '${params.language}' is not allowed. Allowed languages: ${allowedLanguages.join(', ')}`,
      };
    }

    // Validate code is provided
    if (!params.code || typeof params.code !== 'string') {
      return {
        success: false,
        error: 'Code parameter is required and must be a string',
      };
    }

    // Lazy load executor on first call
    if (!executor) {
      try {
        executor = await createExecutor(config);
      } catch (error: any) {
        return {
          success: false,
          error: `Failed to initialize executor: ${error.message}`,
        };
      }
    }

    // Determine timeout (param override > config > default)
    const timeout = params.timeout ?? config.timeout ?? 30000;

    // Execute the code
    try {
      const result = await executor.execute({
        language: params.language,
        code: params.code,
        timeout,
        captureOutput: config.captureOutput ?? true,
      });

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: `Execution failed: ${error.message}`,
        stackTrace: error.stack,
      };
    }
  };
}

/**
 * Get tool metadata for tool_runner tool
 *
 * Returns the ITool-compatible metadata for registration.
 * Includes proper annotations for safety.
 *
 * @param tools - Optional map of available tools for dynamic description generation
 * @param introspectTools - Whether tool introspection is enabled (default: true)
 */
export function getToolRunnerToolMetadata(tools?: Map<string, any>, introspectTools: boolean = true) {
  // Generate dynamic description based on available tools
  let description = 'Execute TypeScript code that orchestrates multiple tool calls in an isolated sandbox environment. Supports type-safe tool invocation with timeout and output capture.';

  if (tools && tools.size > 0 && introspectTools) {
    // Filter out tool_runner itself to avoid recursion in the description
    const availableTools = Array.from(tools.keys())
      .filter(name => name !== 'tool_runner' && name !== 'execute-code')
      .sort();

    if (availableTools.length > 0) {
      description += ` Available tools: ${availableTools.join(', ')}.`;
    }
  }

  return {
    name: 'tool_runner',
    description,
    annotations: {
      destructiveHint: true, // Code execution can have side effects
      requiresConfirmation: false, // Don't require confirmation (code is sandboxed)
      category: 'orchestration',
      estimatedDuration: 'fast' as const,
    },
  };
}
