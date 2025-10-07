#!/usr/bin/env node
/**
 * Binary entry point for simply-mcp-interface command
 * Runs interface-driven MCP servers
 */

import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { parseCommonArgs, startServer, displayServerInfo } from './adapter-utils.js';

/**
 * Dynamically load TypeScript file
 * If tsx is loaded as Node loader, use direct import for full support
 * Otherwise use tsImport API
 */
async function loadTypeScriptFile(absolutePath: string): Promise<any> {
  // Check if tsx is loaded as Node loader (via --import tsx)
  const tsxLoaded = process.execArgv.some(arg => arg.includes('tsx') || arg.includes('--import tsx'));

  if (tsxLoaded) {
    // tsx is loaded as loader, use direct import
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
      console.error('  2. Use bundled output: simply-mcp bundle ' + absolutePath);
      console.error('  3. Compile to .js first: tsc ' + absolutePath);
      console.error('');
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Interface-Driven MCP Adapter

Usage:
  simply-mcp-interface <interface-file.ts> [options]
  simplymcp-interface <interface-file.ts> [options]

Options:
  --http              Use HTTP transport instead of stdio
  --port <number>     Port for HTTP server (default: 3000)
  --dry-run           Validate configuration without starting server
  --verbose, -v       Show detailed parsing and loading information
  --help, -h          Show this help message

Example:
  simply-mcp-interface server.ts
  simply-mcp-interface server.ts --http --port 3000
  simply-mcp-interface server.ts --dry-run
  simply-mcp-interface server.ts --verbose

What is the Interface-Driven API?
  The cleanest way to define MCP servers using pure TypeScript interfaces.
  No decorators, no manual schemas - just TypeScript types!

  Example:
    interface GreetTool extends ITool {
      name: 'greet';
      description: 'Greet a person';
      params: { name: string };
      result: string;
    }

    export default class MyServer implements IServer {
      name = 'my-server';
      version = '1.0.0';
      greet: GreetTool = async (params) => \`Hello, \${params.name}!\`;
    }

  See examples/interface-*.ts for more examples.
`);
    process.exit(0);
  }

  const interfaceFile = args[0];
  if (!interfaceFile) {
    console.error('Error: Interface file path is required');
    process.exit(1);
  }

  // Check if we need TypeScript support and tsx is not already loaded
  const needsTypeScript = interfaceFile.endsWith('.ts');
  const tsxLoaded = process.execArgv.some(arg => arg.includes('tsx') || arg.includes('--import tsx'));

  if (needsTypeScript && !tsxLoaded) {
    // Re-exec with tsx loader for proper TypeScript support
    const { spawn } = await import('node:child_process');
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
        console.error('[InterfaceAdapter] Failed to start with tsx:', error);
        process.exit(1);
      });
    });
  }

  const { useHttp, port, verbose } = parseCommonArgs(args);
  const dryRun = args.includes('--dry-run');

  // Import runtime from compiled dist
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const distPath = resolve(__dirname, '..');

  const { loadInterfaceServer } = await import(
    pathToFileURL(resolve(distPath, 'api/interface/index.js')).href
  );

  // Load the interface server
  console.error('[InterfaceAdapter] Loading interface server from:', interfaceFile);
  const absolutePath = resolve(process.cwd(), interfaceFile);

  try {
    const server = await loadInterfaceServer({
      filePath: absolutePath,
      verbose: verbose || false,
    });

    if (dryRun) {
      console.error('[InterfaceAdapter] Dry-run mode: Configuration validated successfully');
      console.error('');
      const info = server.getInfo();
      const stats = server.getStats();
      console.error(`Server: ${info.name} v${info.version}`);
      if (info.description) {
        console.error(`Description: ${info.description}`);
      }
      console.error('');
      console.error(`Tools: ${stats.tools}`);
      console.error(`Prompts: ${stats.prompts}`);
      console.error(`Resources: ${stats.resources}`);
      console.error('');
      console.error('Server is ready to run (use without --dry-run to start)');
      process.exit(0);
    }

    displayServerInfo(server);
    await startServer(server, { useHttp, port, verbose });
  } catch (error) {
    console.error('[InterfaceAdapter] Error:', error);
    if (error instanceof Error && error.stack && verbose) {
      console.error('[InterfaceAdapter] Stack:', error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[InterfaceAdapter] Fatal error:', error);
  process.exit(1);
});
