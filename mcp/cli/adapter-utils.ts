/**
 * Shared utilities for MCP adapters
 * Common functionality used across different adapter implementations
 */

import type { SimplyMCP } from '../SimplyMCP.js';

/**
 * Common arguments parsed from CLI
 */
export interface CommonArgs {
  useHttp: boolean;
  port: number;
}

/**
 * Parse common command line arguments shared across adapters
 * @param argv Command line arguments (typically process.argv.slice(2))
 * @returns Parsed common arguments
 */
export function parseCommonArgs(argv: string[]): CommonArgs {
  const useHttp = argv.includes('--http');
  const portIndex = argv.indexOf('--port');
  const port = portIndex !== -1 ? parseInt(argv[portIndex + 1], 10) : 3000;

  // Validate port if HTTP is enabled
  if (useHttp && isNaN(port)) {
    console.error('Error: Invalid port number');
    process.exit(1);
  }

  return { useHttp, port };
}

/**
 * Start an MCP server with the specified transport options
 * @param server SimplyMCP instance to start
 * @param options Transport options
 */
export async function startServer(
  server: SimplyMCP,
  options: { useHttp: boolean; port?: number }
): Promise<void> {
  try {
    await server.start({
      transport: options.useHttp ? 'http' : 'stdio',
      port: options.useHttp ? options.port : undefined,
    });

    if (options.useHttp) {
      console.error(`[Adapter] Server running on http://localhost:${options.port}`);
    } else {
      console.error('[Adapter] Server running on stdio');
    }
  } catch (error) {
    console.error('[Adapter] Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Display server information to stderr
 * @param server SimplyMCP instance
 */
export function displayServerInfo(server: SimplyMCP): void {
  const info = server.getInfo();
  const stats = server.getStats();

  console.error(`[Adapter] Server: ${info.name} v${info.version}`);
  console.error(
    `[Adapter] Loaded: ${stats.tools} tools, ${stats.prompts} prompts, ${stats.resources} resources`
  );
}
