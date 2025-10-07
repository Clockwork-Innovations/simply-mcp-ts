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
 * import { defineMCP } from 'simply-mcp';
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
import { BuildMCPServer } from '../programmatic/BuildMCPServer.js';
import type { SingleFileMCPConfig } from './types.js';
import { schemaToZod } from '../../schema-builder.js';
import type { ZodSchema } from 'zod';

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
 * Create BuildMCPServer from config
 * @param config - The validated config object
 * @returns BuildMCPServer instance
 */
export function createServerFromConfig(config: SingleFileMCPConfig): BuildMCPServer {
  // Create BuildMCPServer instance
  const server = new BuildMCPServer({
    name: config.name,
    version: config.version,
    basePath: config.basePath,
    defaultTimeout: config.defaultTimeout,
    transport: config.port ? {
      type: 'http',
      port: config.port,
    } : undefined,
  });

  // Register tools
  if (config.tools && config.tools.length > 0) {
    for (const tool of config.tools) {
      // Convert schema to Zod if it's not already a Zod schema
      // Check if it's a Zod schema by looking for _def property
      const isZodSchema = tool.parameters && typeof tool.parameters === 'object' && '_def' in tool.parameters;
      const parameters = isZodSchema
        ? (tool.parameters as ZodSchema)
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
