/**
 * Shared utilities for MCP adapters
 * Common functionality used across different adapter implementations
 */

import type { SimplyMCP } from '../SimplyMCP.js';
import type { BuildMCPServer } from '../api/programmatic/BuildMCPServer.js';
import type { InterfaceServer } from '../api/interface/InterfaceServer.js';

/**
 * Union type for all MCP server implementations
 * Supports legacy SimplyMCP, BuildMCPServer, and InterfaceServer (used by interface API)
 */
type SimplyMCPInstance = SimplyMCP | BuildMCPServer | InterfaceServer;

/**
 * Adapter options parsed from command line arguments
 */
export interface AdapterOptions {
  http?: boolean;
  port?: number;
  verbose?: boolean;
}

/**
 * Options for starting the server
 */
export interface StartOptions extends AdapterOptions {
  useHttp?: boolean; // Backward compatibility alias for 'http'
}

/**
 * Options for displaying server information
 */
export interface DisplayOptions {
  transport: 'stdio' | 'http';
  port?: number;
  verbose?: boolean;
}

/**
 * Parse common command line arguments
 * Parses --http, --port, --verbose flags from argv
 *
 * @param argv Command line arguments (typically process.argv.slice(2))
 * @returns Structured options object with parsed flags
 *
 * @example
 * ```typescript
 * const args = process.argv.slice(2); // ['server.ts', '--http', '--port', '3000']
 * const options = parseCommonArgs(args);
 * // Returns: { http: true, port: 3000, verbose: false, file: 'server.ts' }
 * ```
 */
export function parseCommonArgs(argv: string[]): AdapterOptions & { file?: string; useHttp?: boolean } {
  const http = argv.includes('--http');
  const verbose = argv.includes('--verbose') || argv.includes('-v');

  // Parse port argument
  const portIndex = argv.indexOf('--port');
  let port: number | undefined = 3000;

  if (portIndex !== -1 && portIndex + 1 < argv.length) {
    const parsedPort = parseInt(argv[portIndex + 1], 10);
    if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      console.error('Error: Invalid port number. Must be between 1 and 65535.');
      process.exit(1);
    }
    port = parsedPort;
  }

  // Extract file path (first non-flag argument)
  const file = argv.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));

  return {
    http,
    port,
    verbose,
    file,
    useHttp: http, // Backward compatibility alias
  };
}

/**
 * Start an MCP server with the specified options
 * Handles transport selection (stdio vs HTTP), signal handlers, and error handling
 *
 * @param server SimplyMCP or BuildMCPServer instance to start
 * @param options Start options including transport type and port
 * @returns Promise that resolves when server is started
 *
 * @example
 * ```typescript
 * const server = new SimplyMCP({ name: 'my-server', version: '1.0.0' });
 * await startServer(server, { http: true, port: 3000 });
 * ```
 */
export async function startServer(
  server: SimplyMCPInstance,
  options: StartOptions
): Promise<void> {
  const useHttp = options.http ?? options.useHttp ?? false;
  const port = options.port ?? 3000;

  // Set up signal handlers for graceful shutdown
  const handleShutdown = async (signal: string) => {
    if (options.verbose) {
      console.error(`\n[Adapter] Received ${signal}, shutting down gracefully...`);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  try {
    // Start the server with selected transport
    await server.start({
      transport: useHttp ? 'http' : 'stdio',
      port: useHttp ? port : undefined,
    });

    // Display startup message
    if (useHttp) {
      console.error(`[Adapter] Server running on http://localhost:${port}`);
      if (options.verbose) {
        console.error('[Adapter] Transport: HTTP');
        console.error(`[Adapter] Port: ${port}`);
      }
    } else {
      console.error('[Adapter] Server running on stdio');
      if (options.verbose) {
        console.error('[Adapter] Transport: STDIO');
      }
    }
  } catch (error) {
    // Handle startup errors gracefully
    if (error instanceof Error) {
      console.error(`[Adapter] Failed to start server: ${error.message}`);
      if (options.verbose && error.stack) {
        console.error('[Adapter] Stack trace:', error.stack);
      }
    } else {
      console.error('[Adapter] Failed to start server:', error);
    }
    process.exit(1);
  }
}

/**
 * Display server information to stderr
 * Shows server name, version, transport info, and available resources count
 *
 * @param server SimplyMCP or BuildMCPServer instance
 * @param options Display options (optional)
 *
 * @example
 * ```typescript
 * const server = new SimplyMCP({ name: 'my-server', version: '1.0.0' });
 * displayServerInfo(server, { transport: 'http', port: 3000, verbose: true });
 * ```
 */
export function displayServerInfo(
  server: SimplyMCPInstance,
  options?: DisplayOptions
): void {
  const info = server.getInfo();
  const stats = server.getStats();

  console.error(`[Adapter] Server: ${info.name} v${info.version}`);
  console.error(
    `[Adapter] Loaded: ${stats.tools} tools, ${stats.prompts} prompts, ${stats.resources} resources`
  );

  // Display additional transport information if options provided
  if (options) {
    if (options.verbose) {
      console.error(`[Adapter] Transport: ${options.transport.toUpperCase()}`);
      if (options.transport === 'http' && options.port) {
        console.error(`[Adapter] HTTP Port: ${options.port}`);
      }
    }
  }
}

/**
 * Common arguments interface (backward compatibility)
 * @deprecated Use AdapterOptions instead
 */
export interface CommonArgs {
  useHttp: boolean;
  port: number;
}
