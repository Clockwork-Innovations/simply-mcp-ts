/**
 * Code Execution Feature Types
 *
 * Provides code execution capabilities for MCP servers using isolated environments.
 * Supports isolated-vm and Docker execution modes for secure untrusted code execution.
 */

/**
 * Execution mode for code execution
 *
 * - 'isolated-vm': (default) Strong V8 isolate-based isolation, recommended for most use cases
 * - 'docker': Maximum container-based isolation, best for production environments with untrusted code
 */
export type ExecutionMode = 'isolated-vm' | 'docker';

/**
 * Language support for code execution
 *
 * Layer 1: JavaScript only
 * Layer 2: TypeScript with tool injection
 * Future: Python, Ruby, etc.
 */
export type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'ruby' | 'bash';

/**
 * Code execution configuration
 *
 * Configures the code execution meta-tool for an MCP server.
 * When present on IServer, automatically registers the tool_runner tool.
 *
 * @example Basic VM Mode (TypeScript)
 * ```typescript
 * const server: IServer = {
 *   name: 'my-server',
 *   description: 'Server with code execution',
 *   codeExecution: {
 *     mode: 'vm',
 *     timeout: 5000
 *   }
 * };
 * ```
 *
 * @example JavaScript Mode
 * ```typescript
 * const server: IServer = {
 *   name: 'my-server',
 *   description: 'Server with code execution',
 *   codeExecution: {
 *     mode: 'vm',
 *     language: 'javascript',
 *     timeout: 10000
 *   }
 * };
 * ```
 *
 * @example With Tool Injection
 * ```typescript
 * const server: IServer = {
 *   name: 'my-server',
 *   description: 'Server with code execution',
 *   codeExecution: {
 *     mode: 'vm',
 *     language: 'typescript',
 *     introspectTools: true // Default, enables tool injection
 *   }
 * };
 * ```
 */
export interface ICodeExecutionConfig {
  /**
   * Execution mode (default: 'vm')
   */
  mode?: ExecutionMode;

  /**
   * Language to execute (default: 'typescript')
   *
   * @remarks
   * - 'typescript': Compile TypeScript with type checking and tool injection
   * - 'javascript': Execute JavaScript directly (no compilation)
   *
   * @example
   * ```typescript
   * interface MyServer extends IServer {
   *   codeExecution: {
   *     mode: 'vm',
   *     language: 'typescript'
   *   }
   * }
   * ```
   */
  language?: 'javascript' | 'typescript';

  /**
   * Whether to introspect and inject available tools (default: true)
   *
   * @remarks
   * When enabled, all registered server tools are available as callable
   * functions in the TypeScript code execution environment.
   *
   * @example
   * ```typescript
   * // With introspectTools: true (default)
   * const weather = await getWeather({ city: 'SF' });
   *
   * // With introspectTools: false
   * // Tools are not available in the sandbox
   * ```
   */
  introspectTools?: boolean;

  /**
   * Timeout in milliseconds (default: 30000)
   * Maximum time allowed for code execution
   */
  timeout?: number;

  /**
   * Allowed languages (default: all supported for the mode)
   * Phase 1: Only 'javascript' is supported
   *
   * @deprecated Use 'language' field instead
   * @internal
   */
  allowedLanguages?: SupportedLanguage[];

  /**
   * Enable stdout/stderr capture (default: true)
   */
  captureOutput?: boolean;

  /**
   * Docker-specific configuration
   *
   * Used when mode is set to 'docker'. Configures container security and resource limits.
   *
   * @example
   * ```typescript
   * codeExecution: {
   *   mode: 'docker',
   *   docker: {
   *     image: 'node:20-alpine',
   *     memoryLimit: 512,
   *     cpuLimit: 0.5,
   *   }
   * }
   * ```
   */
  docker?: {
    /**
     * Docker image to use (default: 'node:20-alpine')
     *
     * Recommended images:
     * - node:20-alpine (lightweight, default)
     * - node:20-slim (smaller than full node, larger than alpine)
     * - node:20 (full node image with build tools)
     */
    image?: string;

    /**
     * Memory limit in MB (default: 256)
     *
     * Container will be terminated if memory usage exceeds this limit.
     * Prevents memory-based DoS attacks.
     */
    memoryLimit?: number;

    /**
     * CPU limit as fraction (default: unlimited)
     *
     * Examples:
     * - 0.5 = 50% of one CPU core
     * - 1.0 = 100% of one CPU core
     * - 2.0 = 200% (2 CPU cores)
     *
     * Prevents CPU-based DoS attacks.
     */
    cpuLimit?: number;

    /**
     * Enable network access (default: false)
     *
     * When false, container has no network access (most secure).
     * When true, container can make external network requests.
     */
    enableNetwork?: boolean;
  };
}

/**
 * Result of code execution
 *
 * Contains the output, return value, and any errors from code execution.
 */
export interface IExecutionResult {
  /**
   * Whether execution was successful
   */
  success: boolean;

  /**
   * Return value from the code (if any)
   * Serialized as JSON-compatible value
   */
  returnValue?: any;

  /**
   * Captured stdout output
   */
  stdout?: string;

  /**
   * Captured stderr output
   */
  stderr?: string;

  /**
   * Error message (if execution failed)
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
 * Options for executing code
 *
 * Runtime options passed to the executor.
 */
export interface IExecutionOptions {
  /**
   * Language to execute
   */
  language: SupportedLanguage;

  /**
   * Code to execute
   */
  code: string;

  /**
   * Timeout in milliseconds
   */
  timeout: number;

  /**
   * Whether to capture stdout/stderr
   */
  captureOutput?: boolean;

  /**
   * Execution context for tool injection (Layer 2.2)
   *
   * When provided, enables tool wrappers in the sandbox.
   * This is the HandlerContext from MCP tool execution.
   */
  context?: any; // HandlerContext - avoiding circular import
}
