/**
 * VM Executor
 *
 * Executes JavaScript code using vm2 library in an isolated sandbox.
 * Provides timeout enforcement, stdout/stderr capture, and error handling.
 * Supports runtime integration for TypeScript compilation and tool injection.
 *
 * Layer 2.2: Adds runtime environment support with tool injection
 */

import type { IExecutor, IExecutorConfig } from './base-executor.js';
import type { IExecutionResult, IExecutionOptions } from '../types.js';
import type { IRuntime } from '../runtimes/base-runtime.js';

/**
 * VM2-based code executor
 *
 * Uses vm2 library to execute JavaScript in an isolated sandbox.
 * Captures console output by overriding console methods.
 * Integrates with runtime for compilation and tool injection.
 *
 * @example Layer 1 - JavaScript execution
 * ```typescript
 * const executor = new VmExecutor({ timeout: 5000 });
 * const result = await executor.execute({
 *   language: 'javascript',
 *   code: 'console.log("Hello"); return 42;',
 *   timeout: 5000,
 *   captureOutput: true
 * });
 * console.log(result.stdout); // "Hello\n"
 * console.log(result.returnValue); // 42
 * ```
 *
 * @example Layer 2.2 - TypeScript with tools
 * ```typescript
 * const runtime = new TypeScriptRuntime({ language: 'typescript' }, tools);
 * const executor = new VmExecutor({ timeout: 5000, runtime });
 * const result = await executor.execute({
 *   language: 'typescript',
 *   code: 'const x = await getTool({ id: "123" }); return x;',
 *   timeout: 5000,
 *   context: handlerContext
 * });
 * ```
 */
export class VmExecutor implements IExecutor {
  private config: IExecutorConfig;
  private vm2Module: any = null;
  private runtime?: IRuntime;

  constructor(config: IExecutorConfig) {
    this.config = config;
    this.runtime = config.runtime;
  }

  /**
   * Lazy load vm2 module
   *
   * Defers loading until first use to avoid requiring it at startup.
   * Throws clear error with installation instructions if not available.
   */
  private async loadVM2(): Promise<any> {
    if (this.vm2Module) {
      return this.vm2Module;
    }

    try {
      // Dynamic import to avoid requiring vm2 at startup
      const { VM } = await import('vm2');
      this.vm2Module = { VM };
      return this.vm2Module;
    } catch (error: any) {
      throw new Error(
        `vm2 package is not installed.\n\n` +
        `To use code execution with VM mode, install vm2:\n` +
        `  npm install vm2\n\n` +
        `Alternatively, you can use isolated-vm (future) or Docker mode (future).\n\n` +
        `Error: ${error.message}`
      );
    }
  }

  /**
   * Execute code in vm2 sandbox with runtime support
   *
   * Layer 2.2: Uses runtime to prepare code with tool injection
   */
  async execute(options: IExecutionOptions): Promise<IExecutionResult> {
    const startTime = Date.now();

    // Validate language support
    if (options.language !== 'javascript' && options.language !== 'typescript') {
      return {
        success: false,
        error: `VM executor only supports JavaScript and TypeScript. Got: ${options.language}`,
        executionTime: Date.now() - startTime,
      };
    }

    // TypeScript requires runtime
    if (options.language === 'typescript' && !this.runtime) {
      return {
        success: false,
        error: 'TypeScript execution requires a runtime. Please configure a TypeScript runtime.',
        executionTime: Date.now() - startTime,
      };
    }

    // Load vm2
    let vm2;
    try {
      vm2 = await this.loadVM2();
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }

    // Use runtime to prepare code if available
    let preparedCode = options.code;
    let runtimeSandbox: Record<string, any> = {};

    if (this.runtime && options.context && options.language === 'typescript') {
      // Use TypeScript runtime for TypeScript code with tool context
      try {
        const env = await this.runtime.prepare(options.code, options.context);
        preparedCode = env.compiledCode;
        runtimeSandbox = env.sandbox;
      } catch (error: any) {
        // Runtime preparation failed (e.g., compilation error)
        return {
          success: false,
          error: error.message || 'Code preparation failed',
          executionTime: Date.now() - startTime,
        };
      }
    } else if (options.language === 'javascript') {
      // JavaScript execution - wrap in async IIFE to allow return statements and async/await
      preparedCode = `(async () => {\n${options.code}\n})()`;
    } else if (options.language === 'typescript' && this.runtime) {
      // TypeScript without context - still compile but no tool injection
      try {
        const env = await this.runtime.prepare(options.code, undefined);
        preparedCode = env.compiledCode;
        runtimeSandbox = env.sandbox;
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Code preparation failed',
          executionTime: Date.now() - startTime,
        };
      }
    }

    // Setup output capture
    const captureOutput = options.captureOutput ?? this.config.captureOutput ?? true;
    const stdoutLines: string[] = [];
    const stderrLines: string[] = [];

    // Create sandbox (merge runtime sandbox with console capture)
    const sandbox: any = {
      ...runtimeSandbox, // Tool wrappers from runtime
      console: {
        log: (...args: any[]) => {
          if (captureOutput) {
            stdoutLines.push(args.map(String).join(' '));
          }
        },
        error: (...args: any[]) => {
          if (captureOutput) {
            stderrLines.push(args.map(String).join(' '));
          }
        },
        warn: (...args: any[]) => {
          if (captureOutput) {
            stderrLines.push(args.map(String).join(' '));
          }
        },
        info: (...args: any[]) => {
          if (captureOutput) {
            stdoutLines.push(args.map(String).join(' '));
          }
        },
        debug: (...args: any[]) => {
          if (captureOutput) {
            stdoutLines.push(args.map(String).join(' '));
          }
        },
      },
    };

    // Create VM instance with timeout
    const vm = new vm2.VM({
      timeout: options.timeout,
      sandbox,
      eval: false, // Disable eval for security
      wasm: false, // Disable WebAssembly
    });

    try {
      // Execute the code (already wrapped by runtime or above)
      let returnValue = vm.run(preparedCode);

      // If the result is a Promise (from async IIFE), await it
      if (returnValue && typeof returnValue.then === 'function') {
        returnValue = await returnValue;
      }

      return {
        success: true,
        returnValue,
        stdout: captureOutput && stdoutLines.length > 0 ? stdoutLines.join('\n') + '\n' : undefined,
        stderr: captureOutput && stderrLines.length > 0 ? stderrLines.join('\n') + '\n' : undefined,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      // Handle timeout errors
      if (error.message?.includes('timeout')) {
        return {
          success: false,
          error: `Execution timed out after ${options.timeout}ms`,
          stdout: captureOutput && stdoutLines.length > 0 ? stdoutLines.join('\n') + '\n' : undefined,
          stderr: captureOutput && stderrLines.length > 0 ? stderrLines.join('\n') + '\n' : undefined,
          executionTime: Date.now() - startTime,
        };
      }

      // Handle other errors
      return {
        success: false,
        error: error.message || String(error),
        stackTrace: error.stack,
        stdout: captureOutput && stdoutLines.length > 0 ? stdoutLines.join('\n') + '\n' : undefined,
        stderr: captureOutput && stderrLines.length > 0 ? stderrLines.join('\n') + '\n' : undefined,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Cleanup resources
   *
   * VM2 doesn't require explicit cleanup as sandboxes are GC'd.
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for vm2
    this.vm2Module = null;
  }
}
