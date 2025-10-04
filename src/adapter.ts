#!/usr/bin/env node
/**
 * Single-File MCP Adapter
 *
 * @deprecated This adapter is deprecated. Use the new CLI commands instead:
 *   - `simplymcp run <file>` (auto-detect)
 *   - `simplymcp-func <file>` (explicit functional API)
 *
 * This file will be removed in a future major version.
 *
 * OLD Usage (deprecated):
 *   npx tsx src/adapter.ts <config-file.ts> [options]
 *
 * NEW Usage (recommended):
 *   simplymcp run <config-file.ts> [options]
 *   simplymcp-func <config-file.ts> [options]
 *
 * Inspired by FastMCP - runs MCP servers from a single TypeScript configuration file.
 *
 * Options:
 *   --http              Use HTTP transport instead of stdio
 *   --port <number>     Port for HTTP server (default: 3000)
 *
 * Example (deprecated):
 *   npx tsx src/adapter.ts examples/single-file-basic.ts
 *   npx tsx src/adapter.ts examples/single-file-basic.ts --http --port 3000
 *
 * Example (recommended):
 *   simplymcp run examples/single-file-basic.ts
 *   simplymcp run examples/single-file-basic.ts --http --port 3000
 *
 * Config File Format:
 * ```typescript
 * import { defineMCP } from './mcp/single-file-types';
 * import { z } from 'zod';
 *
 * export default defineMCP({
 *   name: 'my-server',
 *   version: '1.0.0',
 *   tools: [
 *     {
 *       name: 'greet',
 *       description: 'Greet a user',
 *       parameters: z.object({ name: z.string() }),
 *       execute: async (args) => `Hello, ${args.name}!`
 *     }
 *   ]
 * });
 * ```
 */

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SimplyMCP } from './SimplyMCP.js';
import type { SingleFileMCPConfig } from './single-file-types.js';
import { schemaToZod } from './schema-builder.js';
import { ZodSchema } from 'zod';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Single-File MCP Adapter

Usage:
  npx tsx src/adapter.ts <config-file.ts> [options]

Options:
  --http              Use HTTP transport instead of stdio
  --port <number>     Port for HTTP server (default: 3000)
  --help, -h          Show this help message

Example:
  npx tsx src/adapter.ts examples/single-file-basic.ts
  npx tsx src/adapter.ts examples/single-file-basic.ts --http --port 3000

Config File Format:
  See examples/single-file-basic.ts for an example.
`);
    process.exit(0);
  }

  const configPath = args[0];
  const useHttp = args.includes('--http');
  const portIndex = args.indexOf('--port');
  const port = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : 3000;

  if (!configPath) {
    console.error('Error: Config file path is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  if (useHttp && isNaN(port)) {
    console.error('Error: Invalid port number');
    process.exit(1);
  }

  return { configPath, useHttp, port };
}

/**
 * Load and validate the config file
 * @param configPath - Path to the config file (relative or absolute)
 * @returns Promise resolving to the loaded and validated config
 */
export async function loadConfig(configPath: string): Promise<SingleFileMCPConfig> {
  // Resolve the config path to an absolute path
  const absolutePath = resolve(process.cwd(), configPath);

  // Convert to file URL for ESM import
  const fileUrl = pathToFileURL(absolutePath).href;

  // Dynamic import of the config file
  const module = await import(fileUrl);

  // Get the default export
  const config = module.default;

  if (!config) {
    throw new Error('Config file must have a default export');
  }

  // Validate config structure
  if (!config.name || !config.version) {
    throw new Error('Config must have "name" and "version" properties');
  }

  return config as SingleFileMCPConfig;
}

/**
 * Create SimplyMCP server from config
 * @param config - The validated config object
 * @returns SimplyMCP server instance
 */
export function createServerFromConfig(config: SingleFileMCPConfig): SimplyMCP {
  // Create SimplyMCP instance
  const server = new SimplyMCP({
    name: config.name,
    version: config.version,
    port: config.port,
    basePath: config.basePath,
    defaultTimeout: config.defaultTimeout,
  });

  // Register tools
  if (config.tools && config.tools.length > 0) {
    for (const tool of config.tools) {
      // Convert schema to Zod if it's not already a Zod schema
      // Check if it's a Zod schema by looking for _def property
      const isZodSchema = tool.parameters && typeof tool.parameters === 'object' && '_def' in tool.parameters;
      const parameters = isZodSchema
        ? tool.parameters
        : schemaToZod(tool.parameters as any);

      server.addTool({
        name: tool.name,
        description: tool.description,
        parameters,
        execute: tool.execute,
      });
    }
  }

  // Register prompts
  if (config.prompts && config.prompts.length > 0) {
    for (const prompt of config.prompts) {
      server.addPrompt({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
        template: prompt.template,
      });
    }
  }

  // Register resources
  if (config.resources && config.resources.length > 0) {
    for (const resource of config.resources) {
      server.addResource({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        content: resource.content,
      });
    }
  }

  return server;
}

/**
 * Main entry point
 */
async function main() {
  // Deprecation warning on startup
  console.warn('\n⚠️  WARNING: This adapter is DEPRECATED and will be removed in a future version.');
  console.warn('   Please use the new CLI commands instead:');
  console.warn('   - simplymcp run <file>       (auto-detect)');
  console.warn('   - simplymcp-func <file>      (explicit functional API)\n');

  const { configPath, useHttp, port } = parseArgs();

  console.error('[Adapter] Loading config from:', configPath);
  let config: SingleFileMCPConfig;
  try {
    config = await loadConfig(configPath);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error loading config file: ${error.message}`);
    } else {
      console.error('Error loading config file:', error);
    }
    process.exit(1);
  }

  console.error(`[Adapter] Creating server: ${config.name} v${config.version}`);
  const server = createServerFromConfig(config);

  const stats = server.getStats();
  console.error(
    `[Adapter] Loaded: ${stats.tools} tools, ${stats.prompts} prompts, ${stats.resources} resources`
  );

  // Start the server
  try {
    await server.start({
      transport: useHttp ? 'http' : 'stdio',
      port: useHttp ? port : undefined,
    });

    if (useHttp) {
      console.error(`[Adapter] Server running on http://localhost:${port}`);
    } else {
      console.error('[Adapter] Server running on stdio');
    }
  } catch (error) {
    console.error('[Adapter] Failed to start server:', error);
    process.exit(1);
  }
}

// Run the adapter only when executed as a script (not when imported as a module)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('[Adapter] Fatal error:', error);
    process.exit(1);
  });
}
