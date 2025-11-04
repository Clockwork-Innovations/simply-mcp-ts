#!/usr/bin/env node

import { Command } from 'commander';
import { launchTestHarness } from './server.js';
import { resolve } from 'path';
import open from 'open';

const program = new Command();

program
  .name('simply-mcp-test')
  .description('Interactive web-based test harness for Simply MCP servers')
  .version('1.0.0')
  .argument('<server-file>', 'Path to the MCP server file to test')
  .option('-p, --port <port>', 'Port for test harness UI', '8080')
  .option('-m, --mcp-port <port>', 'Port for MCP server', '3100')
  .option('--mock', 'Enable mock sampling and elicitation by default', false)
  .option('--no-open', 'Do not automatically open browser', false)
  .option('-v, --verbose', 'Enable verbose logging', false)
  .action(async (serverFile: string, options: {
    port: string;
    mcpPort: string;
    mock: boolean;
    open: boolean;
    verbose: boolean;
  }) => {
    try {
      // Resolve the server file path to absolute
      const absolutePath = resolve(process.cwd(), serverFile);

      if (options.verbose) {
        console.log('Starting test harness with configuration:');
        console.log(`  Server file: ${absolutePath}`);
        console.log(`  UI port: ${options.port}`);
        console.log(`  MCP port: ${options.mcpPort}`);
        console.log(`  Mock context: ${options.mock ? 'enabled' : 'disabled'}`);
      }

      // Start the test harness server
      const urls = await launchTestHarness({
        serverFile: absolutePath,
        uiPort: parseInt(options.port, 10),
        mcpPort: parseInt(options.mcpPort, 10),
        mockContext: options.mock,
        verbose: options.verbose,
      });

      console.log('\nTest Harness Started Successfully!');
      console.log(`  UI: ${urls.ui}`);
      console.log(`  MCP Server: ${urls.mcp}`);
      console.log('\nPress Ctrl+C to stop the server\n');

      // Open browser if requested
      if (options.open) {
        await open(urls.ui);
      }
    } catch (error) {
      console.error('Failed to start test harness:', error);
      process.exit(1);
    }
  });

program.parse();
