/**
 * Runtime Loader for Code Execution
 *
 * Factory for creating executor instances based on configuration.
 * Handles lazy loading for different execution modes with appropriate security isolation.
 * Supports language-specific runtimes (TypeScript, JavaScript).
 *
 * Execution Modes (by security level):
 * - isolated-vm: Default. Strong V8 isolate-based isolation, recommended for most use cases
 * - docker: Maximum isolation using ephemeral containers, best for production
 */

import type { IExecutor } from './executors/base-executor.js';
import type { IRuntime } from './runtimes/base-runtime.js';
import type { ICodeExecutionConfig } from './types.js';
import { IsolatedVmExecutor } from './executors/isolated-vm-executor.js';
import { DockerExecutor } from './executors/docker-executor.js';

/**
 * Create an executor instance based on configuration
 *
 * Lazy loads the appropriate executor implementation.
 * Creates language runtime if TypeScript is specified.
 *
 * @param config - Code execution configuration
 * @returns Executor instance ready to execute code
 *
 * @example TypeScript Mode with isolated-vm (default)
 * ```typescript
 * const executor = await createExecutor({
 *   language: 'typescript', // mode defaults to 'isolated-vm'
 *   timeout: 5000
 * });
 *
 * const result = await executor.execute({
 *   language: 'typescript',
 *   code: 'const x: number = 42; return x;',
 *   timeout: 5000
 * });
 * ```
 *
 * @example Docker Mode for Production
 * ```typescript
 * const executor = await createExecutor({
 *   mode: 'docker',
 *   language: 'typescript',
 *   timeout: 10000
 * });
 *
 * const result = await executor.execute({
 *   language: 'typescript',
 *   code: 'return await Promise.resolve(42);',
 *   timeout: 10000
 * });
 * ```
 */
export async function createExecutor(config: ICodeExecutionConfig): Promise<IExecutor> {
  validateConfig(config);

  const mode = config.mode || 'isolated-vm'; // Default to isolated-vm for security
  const timeout = config.timeout || 30000;
  const captureOutput = config.captureOutput ?? true;
  const language = config.language || 'typescript'; // Default to TypeScript

  // Create runtime if language is TypeScript
  let runtime: IRuntime | undefined;
  if (language === 'typescript') {
    const { TypeScriptRuntime } = await import('./runtimes/typescript-runtime.js');
    runtime = new TypeScriptRuntime({
      language: 'typescript',
      timeout,
      captureOutput,
      introspectTools: config.introspectTools,
    });
  }
  // For 'javascript', runtime is undefined (executor handles it directly - Layer 1 behavior)

  switch (mode) {
    case 'isolated-vm': {
      // Use isolated-vm for strong isolation
      try {
        return new IsolatedVmExecutor({ timeout, captureOutput, runtime });
      } catch (error: any) {
        throw new Error(
          `Failed to create isolated-vm executor: ${error.message}\n\n` +
          `Make sure isolated-vm is installed:\n` +
          `  npm install isolated-vm\n\n` +
          `Note: isolated-vm requires compilation and may take a few minutes to install.`
        );
      }
    }

    case 'docker': {
      // Use Docker containers for maximum isolation
      try {
        return new DockerExecutor({
          timeout,
          captureOutput,
          runtime,
          image: config.docker?.image,
          memoryLimit: config.docker?.memoryLimit,
          cpuLimit: config.docker?.cpuLimit,
        });
      } catch (error: any) {
        throw new Error(
          `Failed to create Docker executor: ${error.message}\n\n` +
          `Make sure:\n` +
          `  1. Docker is installed and running\n` +
          `  2. dockerode package is installed: npm install dockerode\n` +
          `  3. You have permission to access Docker daemon`
        );
      }
    }

    default: {
      throw new Error(
        `Unknown execution mode: ${mode}\n\n` +
        `Supported modes:\n` +
        `  - 'isolated-vm' (default, strong V8 isolate isolation)\n` +
        `  - 'docker' (maximum isolation using Docker containers)`
      );
    }
  }
}

/**
 * Validate code execution configuration
 *
 * Checks that the configuration is valid before creating an executor.
 *
 * @param config - Code execution configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateConfig(config: ICodeExecutionConfig): void {
  // Validate mode
  if (config.mode && !['isolated-vm', 'docker'].includes(config.mode)) {
    const mode = config.mode as string;
    throw new Error(
      `Invalid execution mode: ${mode}\n` +
      `Supported modes: 'isolated-vm', 'docker'`
    );
  }

  // Validate language
  if (config.language && !['javascript', 'typescript'].includes(config.language)) {
    throw new Error(
      `Invalid language: ${config.language}\n` +
      `Supported languages: 'javascript', 'typescript'`
    );
  }

  // Validate timeout
  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      throw new Error(
        `Invalid timeout: ${config.timeout}\n` +
        `Timeout must be a positive number (milliseconds)`
      );
    }
  }

  // Validate allowed languages (deprecated field)
  if (config.allowedLanguages !== undefined) {
    if (!Array.isArray(config.allowedLanguages) || config.allowedLanguages.length === 0) {
      throw new Error(
        `Invalid allowedLanguages: must be a non-empty array`
      );
    }

    const validLanguages = ['javascript', 'python', 'ruby', 'bash'];
    for (const lang of config.allowedLanguages) {
      if (!validLanguages.includes(lang)) {
        throw new Error(
          `Invalid language: ${lang}\n` +
          `Supported languages: ${validLanguages.join(', ')}`
        );
      }
    }

    // Phase 1: Only JavaScript is supported
    const unsupportedLanguages = config.allowedLanguages.filter(lang => lang !== 'javascript');
    if (unsupportedLanguages.length > 0) {
      throw new Error(
        `Unsupported languages in Phase 1: ${unsupportedLanguages.join(', ')}\n` +
        `Currently only 'javascript' is supported.\n` +
        `Coming soon: python, ruby, bash`
      );
    }
  }
}
