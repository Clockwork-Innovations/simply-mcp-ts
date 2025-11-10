/**
 * Docker Executor
 *
 * Executes JavaScript/TypeScript code in ephemeral Docker containers for maximum isolation.
 * Provides production-grade security for untrusted AI-generated code through container isolation,
 * resource limits, network isolation, and read-only filesystem.
 *
 * Security Features:
 * - Ephemeral containers (create -> execute -> destroy)
 * - Configurable memory limits (default 256MB)
 * - Network isolation (disabled by default)
 * - Read-only root filesystem with writable /tmp
 * - Non-root user (node)
 * - All capabilities dropped
 * - Timeout enforcement with forced cleanup
 * - Seccomp profile (restricts dangerous syscalls)
 * - No new privileges (prevents privilege escalation)
 * - PID limits (prevents fork bombs, max 100 processes)
 * - Output size limits (max 10MB to prevent memory exhaustion)
 * - File descriptor limits (max 64 open files)
 * - Process limits (max 50 via ulimit)
 *
 * @example
 * ```typescript
 * const executor = new DockerExecutor({
 *   timeout: 30000,
 *   memoryLimit: 512,
 *   image: 'node:20-alpine'
 * });
 *
 * const result = await executor.execute({
 *   language: 'javascript',
 *   code: 'console.log("Hello from Docker"); return 42;',
 *   timeout: 30000
 * });
 * ```
 */

import type { IExecutor, IExecutorConfig } from './base-executor.js';
import type { IExecutionResult, IExecutionOptions } from '../types.js';
import type { IRuntime } from '../runtimes/base-runtime.js';

/**
 * Docker-specific configuration
 */
interface DockerExecutorConfig extends IExecutorConfig {
  /**
   * Docker image to use (default: 'node:20-alpine')
   */
  image?: string;

  /**
   * Memory limit in MB (default: 256)
   */
  memoryLimit?: number;

  /**
   * CPU limit as fraction (0.5 = 50%, 1.0 = 100%)
   */
  cpuLimit?: number;

  /**
   * Enable network access (default: false)
   */
  enableNetwork?: boolean;

  /**
   * Optional runtime for TypeScript compilation
   */
  runtime?: IRuntime;
}

/**
 * Docker-based code executor using dockerode
 *
 * Creates ephemeral containers for each execution, providing the strongest isolation level.
 * Ideal for production deployments with untrusted AI-generated code.
 * Requires Docker daemon to be running and accessible.
 *
 * Container Lifecycle:
 * 1. Create container with security settings
 * 2. Start container and capture output streams
 * 3. Wait for container to finish or timeout
 * 4. Parse output and extract return value
 * 5. Always cleanup (even on error)
 *
 * @example Basic JavaScript
 * ```typescript
 * const executor = new DockerExecutor({ timeout: 5000 });
 * const result = await executor.execute({
 *   language: 'javascript',
 *   code: 'return Math.random();',
 *   timeout: 5000
 * });
 * ```
 *
 * @example TypeScript with Tools
 * ```typescript
 * const runtime = new TypeScriptRuntime({ language: 'typescript' }, tools);
 * const executor = new DockerExecutor({ timeout: 5000, runtime });
 * const result = await executor.execute({
 *   language: 'typescript',
 *   code: 'const x = await getTool({ id: "123" }); return x;',
 *   timeout: 5000,
 *   context: handlerContext
 * });
 * ```
 */
export class DockerExecutor implements IExecutor {
  private config: DockerExecutorConfig;
  private dockerModule: any = null;
  private docker: any = null;

  constructor(config: DockerExecutorConfig) {
    this.config = {
      timeout: config.timeout || 30000,
      captureOutput: config.captureOutput ?? true,
      runtime: config.runtime,
      image: config.image || 'node:20-alpine',
      memoryLimit: config.memoryLimit || 256,
      cpuLimit: config.cpuLimit,
      enableNetwork: config.enableNetwork || false,
    };
  }

  /**
   * Lazy load dockerode module and initialize Docker client
   *
   * Defers loading until first use to avoid requiring dockerode at startup.
   * Initializes connection to Docker daemon.
   *
   * @throws Error if dockerode is not installed or Docker daemon is not accessible
   */
  private async loadDocker(): Promise<any> {
    if (this.docker) {
      return this.docker;
    }

    try {
      // Dynamic import to avoid requiring dockerode at startup
      const dockerModule = await import('dockerode');
      this.dockerModule = dockerModule;
      // dockerode exports a class directly as default
      const Docker = (dockerModule as any).default || (dockerModule as any);

      // Initialize Docker client (connects to Docker daemon)
      this.docker = new Docker();

      // Verify Docker daemon is accessible
      try {
        await this.docker.ping();
      } catch (error: any) {
        throw new Error(
          `Docker daemon is not accessible.\n\n` +
          `Make sure Docker is installed and running:\n` +
          `  - Linux: sudo systemctl start docker\n` +
          `  - macOS: Start Docker Desktop\n` +
          `  - Windows: Start Docker Desktop\n\n` +
          `Error: ${error.message}`
        );
      }

      return this.docker;
    } catch (error: any) {
      // Check if error is due to missing package
      if (error.message?.includes('Cannot find') || error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          `dockerode package is not installed.\n\n` +
          `To use code execution with Docker mode, install it:\n` +
          `  npm install dockerode\n\n` +
          `Alternatively, you can use 'vm' or 'isolated-vm' mode.\n\n` +
          `Error: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Ensure Docker image is available
   *
   * Pulls the image if not already present locally.
   * Shows progress for long-running pulls.
   *
   * @param docker - Docker client instance
   * @param imageName - Image name to check/pull
   * @throws Error if image pull fails
   */
  private async ensureImage(docker: any, imageName: string): Promise<void> {
    try {
      // Check if image exists locally
      await docker.getImage(imageName).inspect();
    } catch (error) {
      // Image not found, pull it
      try {
        console.error(`Pulling Docker image: ${imageName}...`);
        await docker.pull(imageName);
        console.error(`Successfully pulled ${imageName}`);
      } catch (pullError: any) {
        throw new Error(
          `Failed to pull Docker image: ${imageName}\n\n` +
          `Make sure:\n` +
          `  1. You have internet connection\n` +
          `  2. The image name is correct\n` +
          `  3. You have permission to pull the image\n\n` +
          `Error: ${pullError.message}`
        );
      }
    }
  }

  /**
   * Parse Docker stream header to separate stdout/stderr
   *
   * Docker multiplexes stdout/stderr in a single stream with 8-byte headers:
   * [stream_type, 0, 0, 0, size_byte1, size_byte2, size_byte3, size_byte4, ...data]
   *
   * stream_type: 1 = stdout, 2 = stderr
   *
   * @param chunk - Raw chunk from Docker stream
   * @returns Object with stdout and stderr content
   */
  private parseDockerStream(chunk: Buffer): { stdout: string; stderr: string } {
    let stdout = '';
    let stderr = '';
    let offset = 0;

    while (offset < chunk.length) {
      if (chunk.length - offset < 8) {
        // Not enough data for header, treat as stdout
        stdout += chunk.slice(offset).toString('utf8');
        break;
      }

      const streamType = chunk[offset];
      const size = chunk.readUInt32BE(offset + 4);

      if (chunk.length - offset < 8 + size) {
        // Not enough data for complete message, treat remaining as stdout
        stdout += chunk.slice(offset).toString('utf8');
        break;
      }

      const data = chunk.slice(offset + 8, offset + 8 + size).toString('utf8');

      if (streamType === 1) {
        stdout += data;
      } else if (streamType === 2) {
        stderr += data;
      }

      offset += 8 + size;
    }

    return { stdout, stderr };
  }

  /**
   * Execute code in a Docker container with runtime support
   *
   * Creates ephemeral container, executes code, captures output, and cleans up.
   * Supports both JavaScript and TypeScript through runtime integration.
   * Enforces timeout and resource limits.
   */
  async execute(options: IExecutionOptions): Promise<IExecutionResult> {
    const startTime = Date.now();

    // Validate language support
    if (options.language !== 'javascript' && options.language !== 'typescript') {
      return {
        success: false,
        error: `Docker executor only supports JavaScript and TypeScript. Got: ${options.language}`,
        executionTime: Date.now() - startTime,
      };
    }

    // TypeScript requires runtime
    if (options.language === 'typescript' && !this.config.runtime) {
      return {
        success: false,
        error: 'TypeScript execution requires a runtime. Please configure a TypeScript runtime.',
        executionTime: Date.now() - startTime,
      };
    }

    // FIX #5: Check for tool injection early (cannot work in Docker)
    // Tools with function references cannot be serialized to containers
    if (this.config.runtime && options.context) {
      // Check if context would result in function injection
      const testEnv = await this.config.runtime.prepare('', options.context);
      const hasFunctions = Object.values(testEnv.sandbox).some(v => typeof v === 'function');
      if (hasFunctions) {
        return {
          success: false,
          error: 'Tool injection is not supported in Docker mode. Tools cannot be serialized to containers. ' +
                 'Use isolated-vm mode for TypeScript with tool injection, or implement an HTTP bridge for tool calls.',
          executionTime: Date.now() - startTime,
        };
      }
    }

    // Load Docker client
    let docker;
    try {
      docker = await this.loadDocker();
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }

    // Ensure image is available
    try {
      await this.ensureImage(docker, this.config.image!);
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }

    let container: any = undefined;
    let timeoutHandle: NodeJS.Timeout | undefined;
    const captureOutput = options.captureOutput ?? this.config.captureOutput ?? true;

    // FIX #4: Timeout race condition flags
    let timedOut = false;
    let cleanedUp = false;

    // FIX #3: Output size limiting
    const MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB
    let outputSize = 0;
    let outputTruncated = false;

    try {
      // Prepare code for execution
      let preparedCode = options.code;
      let runtimeSandbox: Record<string, any> = {};

      if (this.config.runtime && options.context && options.language === 'typescript') {
        // TypeScript with tool context - use runtime
        try {
          const env = await this.config.runtime.prepare(options.code, options.context);
          preparedCode = env.compiledCode;
          runtimeSandbox = env.sandbox;
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Code preparation failed',
            executionTime: Date.now() - startTime,
          };
        }
      } else if (options.language === 'javascript') {
        // JavaScript - wrap in async IIFE
        preparedCode = `(async () => {\n${options.code}\n})()`;
      } else if (options.language === 'typescript' && this.config.runtime) {
        // TypeScript without context - still compile
        try {
          const env = await this.config.runtime.prepare(options.code, undefined);
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

      // Inject runtime sandbox variables into code
      // For Docker, we need to serialize them since we can't pass function references
      let sandboxInjection = '';
      const sandboxValues: Record<string, any> = {};

      for (const [key, value] of Object.entries(runtimeSandbox)) {
        if (typeof value === 'function') {
          // Functions cannot be serialized - we need a different approach for Docker
          // For now, we'll skip function injection and note this limitation
          console.warn(`Warning: Function '${key}' cannot be injected into Docker container`);
        } else {
          sandboxValues[key] = value;
        }
      }

      if (Object.keys(sandboxValues).length > 0) {
        sandboxInjection = `const __sandbox = ${JSON.stringify(sandboxValues)};\n`;
        for (const key of Object.keys(sandboxValues)) {
          sandboxInjection += `const ${key} = __sandbox.${key};\n`;
        }
      }

      // Wrap code to capture return value
      // We'll use a special marker to identify the return value in stdout
      const wrappedCode = `
${sandboxInjection}
(async () => {
  try {
    const __result = await (${preparedCode});
    console.log('__RETURN_VALUE__' + JSON.stringify(__result));
  } catch (error) {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  }
})();
`.trim();

      // Create container configuration
      const hostConfig: any = {
        Memory: this.config.memoryLimit! * 1024 * 1024, // Convert MB to bytes
        ReadonlyRootfs: true,
        Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=64m' },
        AutoRemove: false, // Manual cleanup for better control
        CapDrop: ['ALL'],
        NetworkMode: this.config.enableNetwork ? 'bridge' : 'none',
        // FIX #1: Add seccomp profile and security options
        SecurityOpt: [
          'no-new-privileges=true',  // Prevent privilege escalation
          'seccomp=default',          // Restrict dangerous syscalls
        ],
        // FIX #2: Add PID limits to prevent fork bombs
        PidsLimit: 100,
        // Additional hardening: Resource ulimits
        Ulimits: [
          { Name: 'nofile', Soft: 64, Hard: 64 },  // File descriptors
          { Name: 'nproc', Soft: 50, Hard: 50 },   // Processes
        ],
      };

      // Add CPU limit if specified
      if (this.config.cpuLimit) {
        hostConfig.NanoCpus = Math.floor(this.config.cpuLimit * 1e9); // Convert to nanocpus
      }

      // Create container
      container = await docker.createContainer({
        Image: this.config.image,
        Cmd: ['node', '-e', wrappedCode],
        AttachStdout: true,
        AttachStderr: true,
        Tty: false, // Important: false to get proper stream separation
        HostConfig: hostConfig,
        User: 'node', // Run as non-root user
        WorkingDir: '/tmp',
      });

      // Set timeout to force-stop container
      const timeout = options.timeout || this.config.timeout;
      timeoutHandle = setTimeout(async () => {
        // FIX #4: Use flag to prevent race condition
        timedOut = true;
        if (container && !cleanedUp) {
          try {
            await container.stop({ t: 1 }); // Force stop after 1 second
          } catch (err) {
            // Container might already be stopped
            console.error(`[DockerExecutor] Timeout stop error: ${err}`);
          }
        }
      }, timeout);

      // Start container
      await container.start();

      // Attach to container to capture output
      const stream = await container.logs({
        stdout: true,
        stderr: true,
        follow: true,
      });

      // Collect output
      const stdoutLines: string[] = [];
      const stderrLines: string[] = [];

      // Process stream chunks
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => {
        // FIX #3: Limit output size to prevent memory exhaustion
        if (!outputTruncated) {
          const chunkSize = chunk.length;
          if (outputSize + chunkSize > MAX_OUTPUT_SIZE) {
            outputTruncated = true;
            // Add truncation marker to stderr
            const truncationMessage = Buffer.from('\n[Output truncated: exceeded 10MB limit]\n');
            chunks.push(truncationMessage);
          } else {
            outputSize += chunkSize;
            chunks.push(chunk);
          }
        }
      });

      // Wait for container to finish
      await container.wait();

      // Clear timeout since execution completed
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
      }

      // Parse all collected chunks
      for (const chunk of chunks) {
        const parsed = this.parseDockerStream(chunk);
        if (parsed.stdout && captureOutput) {
          stdoutLines.push(parsed.stdout);
        }
        if (parsed.stderr && captureOutput) {
          stderrLines.push(parsed.stderr);
        }
      }

      // Get container state for exit code
      const inspect = await container.inspect();
      const exitCode = inspect.State.ExitCode;

      // Parse return value from stdout
      let returnValue: any;
      let cleanStdout = '';

      if (stdoutLines.length > 0) {
        const fullStdout = stdoutLines.join('');
        const lines = fullStdout.split('\n');
        const filteredLines: string[] = [];

        for (const line of lines) {
          if (line.includes('__RETURN_VALUE__')) {
            // Extract return value
            const marker = '__RETURN_VALUE__';
            const startIdx = line.indexOf(marker);
            if (startIdx !== -1) {
              const jsonStr = line.substring(startIdx + marker.length);
              try {
                returnValue = JSON.parse(jsonStr);
              } catch (error) {
                // Could not parse return value
                returnValue = undefined;
              }
            }
          } else {
            filteredLines.push(line);
          }
        }

        cleanStdout = filteredLines.join('\n');
      }

      // FIX #4: Cleanup container with race condition protection
      if (container && !cleanedUp) {
        cleanedUp = true;
        try {
          await container.remove({ force: true });
        } catch (err) {
          console.error(`[DockerExecutor] Cleanup error: ${err}`);
        }
      }

      const executionTime = Date.now() - startTime;

      // Check if execution was successful
      if (exitCode === 0) {
        return {
          success: true,
          returnValue,
          stdout: captureOutput && cleanStdout ? cleanStdout.trimEnd() + '\n' : undefined,
          stderr: captureOutput && stderrLines.length > 0 ? stderrLines.join('').trimEnd() + '\n' : undefined,
          executionTime,
        };
      } else {
        // Non-zero exit code indicates error
        return {
          success: false,
          error: `Container exited with code ${exitCode}`,
          stdout: captureOutput && cleanStdout ? cleanStdout.trimEnd() + '\n' : undefined,
          stderr: captureOutput && stderrLines.length > 0 ? stderrLines.join('').trimEnd() + '\n' : undefined,
          executionTime,
        };
      }
    } catch (error: any) {
      // Clear timeout if set
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
      }

      // FIX #4: Cleanup container if it exists (with race protection)
      if (container && !cleanedUp) {
        cleanedUp = true;
        try {
          await container.remove({ force: true });
        } catch (err) {
          console.error(`[DockerExecutor] Cleanup error after exception: ${err}`);
        }
      }

      // Handle timeout errors
      if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        return {
          success: false,
          error: `Execution timed out after ${options.timeout}ms`,
          executionTime: Date.now() - startTime,
        };
      }

      // Handle container errors
      if (error.message?.includes('No such container')) {
        return {
          success: false,
          error: 'Container was terminated unexpectedly',
          executionTime: Date.now() - startTime,
        };
      }

      // Handle other errors
      return {
        success: false,
        error: error.message || String(error),
        stackTrace: error.stack,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Cleanup resources
   *
   * Containers are ephemeral and cleaned up after each execution.
   * This method can be used for any future global cleanup needs.
   */
  async cleanup(): Promise<void> {
    // No persistent state to cleanup
    // Containers are already removed after each execution
    this.docker = null;
    this.dockerModule = null;
  }
}
