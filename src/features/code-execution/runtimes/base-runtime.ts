/**
 * Base Runtime Interface
 *
 * Defines the contract for language runtimes that prepare code for execution.
 * Runtimes handle language-specific compilation and sandbox preparation.
 */

/**
 * Runtime environment prepared by a language runtime
 *
 * Contains everything the executor needs to run the code:
 * - Compiled JavaScript ready for VM execution
 * - Sandbox object with injected functions/values
 * - Optional type declarations used during compilation
 */
export interface RuntimeEnvironment {
  /**
   * Compiled JavaScript code ready for VM execution
   *
   * This is the final code that will be executed in the sandbox.
   * For TypeScript, this is the transpiled JavaScript.
   * For JavaScript, this may be the original code with minimal wrapping.
   */
  compiledCode: string;

  /**
   * Sandbox object to inject into VM
   *
   * Contains functions and values available to the executed code.
   * Examples: console, injected tools, utility functions.
   */
  sandbox: Record<string, any>;

  /**
   * Optional type declarations used during compilation
   *
   * For TypeScript runtimes, this contains the .d.ts declarations
   * that were available during compilation (e.g., for injected tools).
   */
  declarations?: string;
}

/**
 * Result of code compilation
 *
 * Indicates success or failure with detailed error information.
 */
export interface CompilationResult {
  /**
   * Whether compilation succeeded
   */
  success: boolean;

  /**
   * Compiled JavaScript (if success)
   *
   * The transpiled/transformed code ready for execution.
   */
  javascript?: string;

  /**
   * Compilation errors (if failure)
   *
   * Array of errors with location information for debugging.
   */
  errors?: CompilationError[];
}

/**
 * Compilation error with location information
 *
 * Provides LLM-friendly error messages with precise location data.
 */
export interface CompilationError {
  /**
   * Line number (1-indexed)
   *
   * The line where the error occurred.
   * 1-indexed for consistency with editor line numbers.
   */
  line: number;

  /**
   * Column number (1-indexed)
   *
   * The column where the error occurred.
   * 1-indexed for consistency with editor column numbers.
   */
  column: number;

  /**
   * Error message
   *
   * Human-readable description of the error.
   */
  message: string;

  /**
   * Error code (e.g., TS2304)
   *
   * Language-specific error code for reference.
   */
  code?: string;
}

/**
 * Configuration for a language runtime
 *
 * Passed to runtime constructors to configure behavior.
 */
export interface IRuntimeConfig {
  /**
   * Language mode
   *
   * Determines which runtime implementation to use.
   */
  language: 'javascript' | 'typescript';

  /**
   * Timeout in milliseconds
   *
   * Maximum time allowed for code execution.
   * Runtime may use this for compilation timeout as well.
   */
  timeout?: number;

  /**
   * Whether to capture console output
   *
   * When true, console.log/error/warn output is captured.
   */
  captureOutput?: boolean;

  /**
   * Whether to inject available tools
   *
   * When true, all registered server tools are available as
   * callable functions in the execution environment.
   */
  introspectTools?: boolean;
}

/**
 * Abstract interface for language runtimes
 *
 * Language runtimes are responsible for:
 * 1. Compiling code to JavaScript (if needed)
 * 2. Preparing the sandbox environment
 * 3. Injecting tools and utilities
 * 4. Providing type declarations (for TypeScript)
 *
 * @example TypeScript Runtime
 * ```typescript
 * const runtime = new TypeScriptRuntime({
 *   language: 'typescript',
 *   timeout: 5000,
 *   introspectTools: true
 * });
 *
 * const env = await runtime.prepare('const x: number = 42; return x * 2;');
 * // env.compiledCode contains the transpiled JavaScript
 * // env.sandbox contains injected tools (Layer 2.2)
 * ```
 */
export interface IRuntime {
  /**
   * Prepare code for execution
   *
   * This is the main entry point for the runtime.
   * It compiles the code (if needed) and prepares the sandbox.
   *
   * @param code - Source code to prepare
   * @param context - Optional execution context (for tool injection in Layer 2.2)
   * @returns Runtime environment ready for executor
   * @throws Error if compilation fails
   *
   * @example
   * ```typescript
   * const env = await runtime.prepare('return 42;');
   * const result = await executor.execute({
   *   ...options,
   *   code: env.compiledCode,
   *   sandbox: env.sandbox
   * });
   * ```
   */
  prepare(code: string, context?: any): Promise<RuntimeEnvironment>;

  /**
   * Compile code and return result
   *
   * Separate method for testing compilation without execution.
   * Used primarily for:
   * - Testing compilation errors
   * - Validating code before execution
   * - Development/debugging
   *
   * @param code - Source code to compile
   * @returns Compilation result with success status and errors
   *
   * @example
   * ```typescript
   * const result = await runtime.compile('const x: number = "string";');
   * if (!result.success) {
   *   console.error('Compilation errors:', result.errors);
   * }
   * ```
   */
  compile(code: string): Promise<CompilationResult>;
}
