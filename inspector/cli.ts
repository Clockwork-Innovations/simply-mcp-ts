#!/usr/bin/env node
/**
 * SimplyMCP Inspector CLI
 * Launch a web-based inspector for exploring MCP servers
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createServer as createNetServer } from 'net';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createNetServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

/**
 * Find the next available port starting from the given port
 */
async function findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`Could not find available port in range ${startPort}-${startPort + maxAttempts - 1}`);
}

/**
 * Start the Next.js inspector server using standalone build
 */
async function startInspector(port?: number) {
  const defaultPort = 3000;
  const targetPort = port || defaultPort;

  // Find available port
  let finalPort: number;
  if (port) {
    // User specified a port, use it or fail
    if (!(await isPortAvailable(targetPort))) {
      console.error(`❌ Port ${targetPort} is already in use`);
      process.exit(1);
    }
    finalPort = targetPort;
  } else {
    // Auto-detect available port
    finalPort = await findAvailablePort(defaultPort);
    if (finalPort !== defaultPort) {
      console.log(`ℹ️  Port ${defaultPort} in use, using port ${finalPort} instead`);
    }
  }

  console.log(`🚀 Starting SimplyMCP Inspector on port ${finalPort}...`);
  console.log(`📍 Open http://localhost:${finalPort} in your browser`);
  console.log('');

  // The standalone server is in .next/standalone/inspector/
  // __dirname is dist/ after build, so go up one level to find .next
  const standaloneDir = join(__dirname, '..', '.next', 'standalone', 'inspector');
  const serverPath = join(standaloneDir, 'server.js');

  // Set environment variables for Next.js standalone server
  process.env.PORT = String(finalPort);
  process.env.HOSTNAME = '0.0.0.0';

  try {
    // Import and run the standalone server
    const server = await import(serverPath);

    console.log(`✅ Inspector running at http://localhost:${finalPort}`);
    console.log('Press Ctrl+C to stop\n');
  } catch (err: any) {
    console.error('❌ Failed to start inspector:', err.message);
    console.error('\nMake sure the inspector package was built correctly.');
    process.exit(1);
  }

  // Handle termination signals
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down inspector...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    process.exit(0);
  });
}

// Parse CLI arguments
const argv = await yargs(hideBin(process.argv))
  .scriptName('simply-mcp-inspector')
  .usage('$0 [options]')
  .option('port', {
    alias: 'p',
    type: 'number',
    description: 'Port to run the inspector on (default: 3000, auto-increments if unavailable)',
  })
  .help('h')
  .alias('h', 'help')
  .version('0.1.0')
  .alias('v', 'version')
  .example('$0', 'Start inspector on port 3000 (or next available)')
  .example('$0 --port 8080', 'Start inspector on port 8080')
  .example('$0 -p 3001', 'Start inspector on port 3001')
  .strict()
  .parseAsync();

// Start the inspector
startInspector(argv.port).catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
