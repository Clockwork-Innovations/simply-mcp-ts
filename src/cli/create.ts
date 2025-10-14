/**
 * Create command - Launch MCP Builder Wizard
 *
 * Starts an interactive wizard server in STDIO mode that guides
 * users through creating MCP servers via natural conversation.
 */

import type { CommandModule } from 'yargs';

/**
 * Create command definition
 */
export const createCommand: CommandModule = {
  command: 'create',
  describe: 'Launch MCP builder wizard (interactive server creation)',

  builder: (yargs) => {
    return yargs
      .option('http', {
        describe: 'Use HTTP transport instead of stdio',
        type: 'boolean',
        default: false
      })
      .option('port', {
        describe: 'Port for HTTP server (default: 3000)',
        type: 'number',
        default: 3000
      })
      .example('$0 create', 'Start wizard in STDIO mode (connect with Claude Code CLI)')
      .example('$0 create --http', 'Start wizard as HTTP server');
  },

  handler: async (argv: any) => {
    const useHttp = argv.http as boolean;
    const port = argv.port as number;

    console.error('');
    console.error('MCP Class Wrapper Wizard');
    console.error('========================');
    console.error('');
    console.error('Starting interactive wizard server...');
    console.error('');

    if (useHttp) {
      console.error(`Mode: HTTP (port ${port})`);
      console.error(`Access: http://localhost:${port}`);
    } else {
      console.error('Mode: STDIO');
      console.error('Ready for Claude Code CLI connection');
      console.error('');
      console.error('Connect with:');
      console.error('  claude --mcp-config \'{"mcpServers":{"wizard":{"command":"npx","args":["simply-mcp","create"]}}}\'');
    }

    console.error('');
    console.error('Once connected, say: "Transform my TypeScript class into an MCP server"');
    console.error('');

    try {
      // Load wizard server configuration
      const { loadMCPBuilderServer } = await import('../api/mcp/adapter.js');
      const { startServer, displayServerInfo } = await import('./adapter-utils.js');
      const { fileURLToPath } = await import('url');
      const { dirname, resolve } = await import('path');

      // Get path to class wrapper wizard config
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const wizardConfigPath = resolve(__dirname, '../api/mcp/class-wrapper-wizard.js');

      // Load and start wizard server
      const server = await loadMCPBuilderServer(wizardConfigPath);

      displayServerInfo(server);
      await startServer(server, {
        useHttp,
        port,
        verbose: false,
        stateful: true
      });
    } catch (error) {
      console.error('');
      console.error('Error starting wizard server:', error);
      console.error('');
      process.exit(1);
    }
  }
};
