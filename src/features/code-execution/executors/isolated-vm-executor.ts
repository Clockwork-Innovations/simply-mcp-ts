/**
 * Isolated VM Executor
 *
 * Executes JavaScript code using isolated-vm library in a secure V8 isolate.
 * Provides strong isolation, memory limits, timeout enforcement, and error handling.
 * Supports runtime integration for TypeScript compilation and tool injection.
 *
 * Security Features:
 * - Separate V8 isolate per execution (true isolation)
 * - Configurable memory limits (default 128MB)
 * - Timeout enforcement with automatic cleanup
 * - No access to Node.js built-ins unless explicitly provided
 * - Proper serialization/deserialization across isolate boundary
 */

import type { IExecutor, IExecutorConfig } from './base-executor.js';
import type { IExecutionResult, IExecutionOptions } from '../types.js';
import type { IRuntime } from '../runtimes/base-runtime.js';

/**
 * isolated-vm based code executor
 *
 * Uses isolated-vm library to execute JavaScript in a separate V8 isolate.
 * Provides stronger isolation than vm2 with proper memory and timeout limits.
 * Captures console output by injecting console methods.
 * Integrates with runtime for TypeScript compilation and tool injection.
 *
 * @example Basic JavaScript execution
 * ```typescript
 * const executor = new IsolatedVmExecutor({ timeout: 5000 });
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
 * @example TypeScript with tools
 * ```typescript
 * const runtime = new TypeScriptRuntime({ language: 'typescript' }, tools);
 * const executor = new IsolatedVmExecutor({ timeout: 5000, runtime });
 * const result = await executor.execute({
 *   language: 'typescript',
 *   code: 'const x = await getTool({ id: "123" }); return x;',
 *   timeout: 5000,
 *   context: handlerContext
 * });
 * ```
 */
export class IsolatedVmExecutor implements IExecutor {
  private config: IExecutorConfig;
  private ivmModule: any = null;
  private runtime?: IRuntime;

  constructor(config: IExecutorConfig) {
    this.config = config;
    this.runtime = config.runtime;
  }

  /**
   * Lazy load isolated-vm module
   *
   * Defers loading until first use to avoid requiring it at startup.
   * Throws clear error with installation instructions if not available.
   */
  private async loadIsolatedVm(): Promise<any> {
    if (this.ivmModule) {
      return this.ivmModule;
    }

    try {
      // Dynamic import to avoid requiring isolated-vm at startup
      const ivm = await import('isolated-vm');
      this.ivmModule = ivm;
      return ivm;
    } catch (error: any) {
      throw new Error(
        `isolated-vm package is not installed.\n\n` +
        `To use code execution with isolated-vm mode, install it:\n` +
        `  npm install isolated-vm\n\n` +
        `Note: isolated-vm requires compilation and may take a few minutes to install.\n\n` +
        `Alternatively, you can use vm2 mode (less secure) or Docker mode (future).\n\n` +
        `Error: ${error.message}`
      );
    }
  }

  /**
   * Execute code in isolated-vm with runtime support
   *
   * Creates a new V8 isolate for each execution, providing strong isolation.
   * Supports both JavaScript and TypeScript through runtime integration.
   * Handles timeout enforcement and memory limits.
   */
  async execute(options: IExecutionOptions): Promise<IExecutionResult> {
    const startTime = Date.now();

    // Validate language support
    if (options.language !== 'javascript' && options.language !== 'typescript') {
      return {
        success: false,
        error: `Isolated VM executor only supports JavaScript and TypeScript. Got: ${options.language}`,
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

    // Load isolated-vm
    let ivm;
    try {
      ivm = await this.loadIsolatedVm();
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

    // Create isolate with memory limit (default 128MB)
    const memoryLimitMB = 128;
    const isolate = new ivm.Isolate({ memoryLimit: memoryLimitMB });

    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      // Create context for execution
      const context = await isolate.createContext();

      // Get global object to inject variables
      const jail = context.global;

      // Set global reference for accessing globals
      await jail.set('global', jail.derefInto());

      // Inject console methods for output capture
      if (captureOutput) {
        // Create console log handler
        const logHandler = new ivm.Reference((message: string) => {
          stdoutLines.push(message);
        });
        await jail.set('_logHandler', logHandler);

        // Create console error handler
        const errorHandler = new ivm.Reference((message: string) => {
          stderrLines.push(message);
        });
        await jail.set('_errorHandler', errorHandler);

        // Create console object with methods
        await context.eval(`
          global.console = {
            log: function(...args) {
              global._logHandler.applySync(undefined, [args.map(String).join(' ')]);
            },
            error: function(...args) {
              global._errorHandler.applySync(undefined, [args.map(String).join(' ')]);
            },
            warn: function(...args) {
              global._errorHandler.applySync(undefined, [args.map(String).join(' ')]);
            },
            info: function(...args) {
              global._logHandler.applySync(undefined, [args.map(String).join(' ')]);
            },
            debug: function(...args) {
              global._logHandler.applySync(undefined, [args.map(String).join(' ')]);
            }
          };
        `);
      }

      // Inject runtime sandbox (tool wrappers)
      // For isolated-vm, we need to inject functions differently
      // Tool functions need to be wrapped in References that can call back to the main isolate
      for (const [key, value] of Object.entries(runtimeSandbox)) {
        if (typeof value === 'function') {
          // Wrap async tool functions to be callable from isolate
          const funcRef = new ivm.Reference(async (...args: any[]) => {
            try {
              const result = await value(...args);
              return result;
            } catch (error: any) {
              throw new Error(error.message || String(error));
            }
          });
          await jail.set(key, funcRef);
        } else {
          // Copy primitive values directly
          await jail.set(key, new ivm.ExternalCopy(value).copyInto());
        }
      }

      // Compile the code
      const script = await isolate.compileScript(preparedCode);

      // Setup timeout
      const timeout = options.timeout || this.config.timeout;
      timeoutHandle = setTimeout(() => {
        isolate.dispose();
      }, timeout);

      // Execute the script
      let resultReference = await script.run(context, {
        timeout,
        promise: true
      });

      // Clear timeout since execution completed
      clearTimeout(timeoutHandle);
      timeoutHandle = undefined;

      // Extract the result
      let returnValue: any;

      // If result is a Reference, we need to copy it out
      if (resultReference && typeof resultReference.typeof === 'function') {
        const resultType = await resultReference.typeof();

        if (resultType === 'object' || resultType === 'function') {
          // For objects and functions, try to copy them out
          try {
            returnValue = await resultReference.copy();
          } catch (error) {
            // If copy fails, try to serialize as JSON
            try {
              const jsonString = await resultReference.copy({ externalCopy: true });
              returnValue = JSON.parse(jsonString.toString());
            } catch {
              returnValue = '[Complex object - cannot serialize]';
            }
          }
        } else {
          // For primitives, copy directly
          returnValue = await resultReference.copy();
        }
      } else {
        // Already a primitive value
        returnValue = resultReference;
      }

      // Cleanup isolate
      isolate.dispose();

      return {
        success: true,
        returnValue,
        stdout: captureOutput && stdoutLines.length > 0 ? stdoutLines.join('\n') + '\n' : undefined,
        stderr: captureOutput && stderrLines.length > 0 ? stderrLines.join('\n') + '\n' : undefined,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      // Clear timeout if set
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      // Cleanup isolate
      try {
        isolate.dispose();
      } catch {
        // Ignore disposal errors
      }

      // Handle timeout errors
      if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        return {
          success: false,
          error: `Execution timed out after ${options.timeout}ms`,
          stdout: captureOutput && stdoutLines.length > 0 ? stdoutLines.join('\n') + '\n' : undefined,
          stderr: captureOutput && stderrLines.length > 0 ? stderrLines.join('\n') + '\n' : undefined,
          executionTime: Date.now() - startTime,
        };
      }

      // Handle out of memory errors
      if (error.message?.includes('memory') || error.message?.includes('allocation failed')) {
        return {
          success: false,
          error: `Execution exceeded memory limit (${memoryLimitMB}MB)`,
          stdout: captureOutput && stdoutLines.length > 0 ? stdoutLines.join('\n') + '\n' : undefined,
          stderr: captureOutput && stderrLines.length > 0 ? stderrLines.join('\n') + '\n' : undefined,
          executionTime: Date.now() - startTime,
        };
      }

      // Handle compilation errors
      if (error.message?.includes('SyntaxError') || error.message?.includes('compile')) {
        return {
          success: false,
          error: `Code compilation failed: ${error.message}`,
          stackTrace: error.stack,
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
   * isolated-vm isolates are disposed after each execution, so no global cleanup needed.
   */
  async cleanup(): Promise<void> {
    // No global cleanup needed - isolates are disposed per-execution
    this.ivmModule = null;
  }
}
