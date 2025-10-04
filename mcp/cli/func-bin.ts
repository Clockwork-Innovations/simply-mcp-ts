#!/usr/bin/env node
/**
 * Binary entry point for simplymcp-func command
 * Runs functional (defineMCP) MCP servers
 */

import { resolve } from 'node:path';
import { SimplyMCP } from '../SimplyMCP.js';
import type { SingleFileMCPConfig } from '../single-file-types.js';
import { schemaToZod } from '../schema-builder.js';
import { parseCommonArgs, startServer, displayServerInfo } from './adapter-utils.js';

/**
 * Dynamically load TypeScript file
 * If tsx is loaded as Node loader, use direct import for decorator support
 * Otherwise use tsImport API
 */
async function loadTypeScriptFile(absolutePath: string): Promise<any> {
  // Check if tsx is loaded as Node loader (via --import tsx)
  const tsxLoaded = process.execArgv.some(arg => arg.includes('tsx') || arg.includes('--import tsx'));

  if (tsxLoaded) {
    // tsx is loaded as loader, use direct import for full decorator support
    const { pathToFileURL } = await import('node:url');
    const fileUrl = pathToFileURL(absolutePath).href;
    return await import(fileUrl);
  }

  // Fallback to tsImport API (for backwards compatibility)
  try {
    const { tsImport } = await import('tsx/esm/api');
    return await tsImport(absolutePath, import.meta.url);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      console.error('Error: tsx package is required to load TypeScript files');
      console.error('');
      console.error('Solutions:');
      console.error('  1. Install tsx: npm install tsx');
      console.error('  2. Use bundled output: simplymcp bundle ' + absolutePath);
      console.error('  3. Compile to .js first: tsc ' + absolutePath);
      console.error('');
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Load and validate the config file
 */
async function loadConfig(configPath: string): Promise<SingleFileMCPConfig> {
  try {
    // Resolve the config path to an absolute path
    const absolutePath = resolve(process.cwd(), configPath);

    // Dynamic import of the config file using tsx for TypeScript support
    const module = await loadTypeScriptFile(absolutePath);

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
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error loading config file: ${error.message}`);
    } else {
      console.error('Error loading config file:', error);
    }
    process.exit(1);
  }
}

/**
 * Create SimplyMCP server from config
 */
function createServerFromConfig(config: SingleFileMCPConfig): SimplyMCP {
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
      const isZodSchema =
        tool.parameters && typeof tool.parameters === 'object' && '_def' in tool.parameters;
      const parameters: any = isZodSchema ? tool.parameters : schemaToZod(tool.parameters as any);

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
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Functional MCP Adapter

Usage:
  simplymcp-func <config-file.ts> [options]

Options:
  --http              Use HTTP transport instead of stdio
  --port <number>     Port for HTTP server (default: 3000)
  --help, -h          Show this help message

Example:
  simplymcp-func server.ts
  simplymcp-func server.ts --http --port 3000

Config File Format:
  See mcp/examples/single-file-basic.ts for an example.
`);
    process.exit(0);
  }

  const configPath = args[0];
  if (!configPath) {
    console.error('Error: Config file path is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  // Check if we need TypeScript support and tsx is not already loaded
  const needsTypeScript = configPath.endsWith('.ts');
  const tsxLoaded = process.execArgv.some(arg => arg.includes('tsx') || arg.includes('--import tsx'));

  if (needsTypeScript && !tsxLoaded) {
    // Re-exec with tsx loader for proper module loading
    const { spawn } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const nodeArgs = ['--import', 'tsx'];
    const scriptPath = fileURLToPath(import.meta.url);
    const scriptArgs = [scriptPath, ...args];

    const child = spawn('node', [...nodeArgs, ...scriptArgs], {
      stdio: 'inherit',
      env: process.env,
    });

    return new Promise((resolve) => {
      child.on('exit', (code) => {
        process.exit(code || 0);
      });
      child.on('error', (error) => {
        console.error('[FuncAdapter] Failed to start with tsx:', error);
        process.exit(1);
      });
    });
  }

  const { useHttp, port } = parseCommonArgs(args);

  console.error('[FuncAdapter] Loading config from:', configPath);
  const config = await loadConfig(configPath);

  console.error(`[FuncAdapter] Creating server: ${config.name} v${config.version}`);
  const server = createServerFromConfig(config);

  displayServerInfo(server);
  await startServer(server, { useHttp, port });
}

main().catch((error) => {
  console.error('[FuncAdapter] Fatal error:', error);
  process.exit(1);
});
