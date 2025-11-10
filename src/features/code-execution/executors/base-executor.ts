/**
 * Base Executor Interface
 *
 * Defines the contract for all code execution engines.
 * Executors are responsible for running code in isolated environments.
 */

import type { IExecutionResult, IExecutionOptions } from '../types.js';

/**
 * Base interface for code executors
 *
 * All execution engines (VM, isolated-vm, Docker) implement this interface.
 * Provides a uniform API for executing code regardless of the underlying engine.
 *
 * @example
 * ```typescript
 * const executor = new VmExecutor({ timeout: 5000 });
 * const result = await executor.execute({
 *   language: 'javascript',
 *   code: 'console.log("Hello"); return 42;',
 *   timeout: 5000,
 *   captureOutput: true
 * });
 * ```
 */
export interface IExecutor {
  /**
   * Execute code in the isolated environment
   *
   * @param options - Execution options including code, language, and timeout
   * @returns Execution result with output and return value
   */
  execute(options: IExecutionOptions): Promise<IExecutionResult>;

  /**
   * Cleanup resources
   *
   * Called when the executor is no longer needed.
   * Should release any resources (sandboxes, containers, etc.)
   */
  cleanup(): Promise<void>;
}

/**
 * Configuration for executor instances
 */
export interface IExecutorConfig {
  /**
   * Default timeout in milliseconds
   */
  timeout: number;

  /**
   * Whether to capture stdout/stderr by default
   */
  captureOutput?: boolean;

  /**
   * Optional runtime for language-specific code preparation
   *
   * When provided, the runtime handles compilation and sandbox setup
   * before execution (e.g., TypeScript compilation).
   *
   * When undefined, the executor handles code directly (JavaScript mode).
   */
  runtime?: any; // IRuntime - avoiding circular import
}
