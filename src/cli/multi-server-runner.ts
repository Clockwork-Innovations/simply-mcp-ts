/**
 * Multi-server runner for SimplyMCP
 * Manages multiple MCP servers running simultaneously
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { resolve, basename } from 'node:path';
import { existsSync } from 'node:fs';
import {
  registerServer,
  unregisterServer,
  generateGroupId,
  findAvailablePort,
  type ServerInfo,
} from './server-tracker.js';
import { detectAPIStyle } from './run.js';

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

/**
 * Color palette for server outputs
 */
const SERVER_COLORS = [
  COLORS.blue,
  COLORS.green,
  COLORS.magenta,
  COLORS.cyan,
  COLORS.yellow,
  COLORS.red,
];

/**
 * Options for running a single server in multi-server mode
 */
export interface ServerRunOptions {
  filePath: string;
  port?: number;
  useHttp: boolean;
  useHttpStateless?: boolean;
  verbose: boolean;
  style?: string;
  color?: string;
  groupId: string;
}

/**
 * Running server instance
 */
export interface RunningServer {
  filePath: string;
  process: ChildProcess;
  port?: number;
  name: string;
  color: string;
  groupId: string;
}

/**
 * Options for multi-server run
 */
export interface MultiServerOptions {
  files: string[];
  useHttp: boolean;
  useHttpStateless?: boolean;
  startPort?: number;
  verbose: boolean;
  forceStyle?: string;
}

/**
 * Prefix a message with server label
 */
function prefixMessage(serverName: string, port: number | undefined, message: string, color: string): string {
  const portStr = port ? `:${port}` : '';
  const label = `[${serverName}${portStr}]`;
  return `${color}${label}${COLORS.reset} ${message}`;
}

/**
 * Start a single server as a child process
 */
async function startServerProcess(options: ServerRunOptions): Promise<RunningServer> {
  const { filePath, port, useHttp, useHttpStateless, verbose, style, color, groupId } = options;

  // Validate file exists
  const absolutePath = resolve(process.cwd(), filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Server file not found: ${filePath}`);
  }

  // Get the server name (filename without extension)
  const serverName = basename(filePath, '.ts').replace(/\.js$/, '');

  // Build command arguments
  const args = [filePath];

  if (useHttpStateless) {
    args.push('--http-stateless');
  } else if (useHttp) {
    args.push('--http');
  }

  if (port) {
    args.push('--port', port.toString());
  }

  if (verbose) {
    args.push('--verbose');
  }

  if (style) {
    args.push('--style', style);
  }

  // Get the path to the CLI
  const __dirname = resolve(import.meta.url.replace('file://', ''), '..');
  const cliPath = resolve(__dirname, 'index.js');

  // Detect if we need TypeScript support
  const needsTypeScript = filePath.endsWith('.ts');
  const nodeArgs: string[] = [];

  if (needsTypeScript) {
    // Use tsx loader for TypeScript files (Node 20.6.0+)
    nodeArgs.push('--import', 'tsx');
  }

  // Spawn the server process
  const serverProcess = spawn('node', [...nodeArgs, cliPath, 'run', ...args], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...process.env,
      SIMPLYMCP_MULTI_SERVER: 'true',
      SIMPLYMCP_GROUP_ID: groupId,
    },
  });

  // Create running server object
  const runningServer: RunningServer = {
    filePath: absolutePath,
    process: serverProcess,
    port,
    name: serverName,
    color: color || COLORS.white,
    groupId,
  };

  // Handle process output
  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.log(prefixMessage(serverName, port, message, runningServer.color));
      }
    });
  }

  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.error(prefixMessage(serverName, port, message, runningServer.color));
      }
    });
  }

  // Handle process exit
  serverProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(
        prefixMessage(
          serverName,
          port,
          `Server exited with code ${code}`,
          COLORS.red
        )
      );
    }

    if (signal) {
      console.error(
        prefixMessage(
          serverName,
          port,
          `Server killed by signal ${signal}`,
          COLORS.red
        )
      );
    }

    // Unregister from tracking
    if (serverProcess.pid) {
      unregisterServer(serverProcess.pid).catch(() => {
        // Ignore errors during cleanup
      });
    }
  });

  serverProcess.on('error', (error) => {
    console.error(
      prefixMessage(
        serverName,
        port,
        `Error: ${error.message}`,
        COLORS.red
      )
    );
  });

  // Wait a bit for the server to start
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Register server in tracking system
  if (serverProcess.pid) {
    const serverInfo: ServerInfo = {
      name: serverName,
      pid: serverProcess.pid,
      filePath: absolutePath,
      transport: useHttp ? 'http' : 'stdio',
      port,
      startedAt: Date.now(),
      isMulti: true,
      groupId,
    };

    await registerServer(serverInfo);
  }

  return runningServer;
}

/**
 * Run multiple servers simultaneously
 */
export async function runMultipleServers(options: MultiServerOptions): Promise<void> {
  const { files, useHttp, useHttpStateless, startPort = 3000, verbose, forceStyle } = options;

  // Validate that we have files to run
  if (files.length === 0) {
    console.error('Error: No server files specified');
    process.exit(1);
  }

  // Validate files exist
  for (const file of files) {
    const absolutePath = resolve(process.cwd(), file);
    if (!existsSync(absolutePath)) {
      console.error(`Error: Server file not found: ${file}`);
      process.exit(1);
    }
  }

  // Check for stdio conflict
  if (!useHttp && files.length > 1) {
    console.error('Error: Cannot run multiple servers with stdio transport');
    console.error('Hint: Use --http flag to run servers with HTTP transport');
    process.exit(1);
  }

  // Generate group ID for this multi-server run
  const groupId = generateGroupId();

  // Determine ports for each server
  const serverConfigs: ServerRunOptions[] = [];
  let currentPort = startPort;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const color = SERVER_COLORS[i % SERVER_COLORS.length];

    let port: number | undefined;
    if (useHttp) {
      port = await findAvailablePort(currentPort);
      currentPort = port + 1;
    }

    // Detect API style for this server
    let style = forceStyle;
    if (!style) {
      try {
        style = await detectAPIStyle(file);
      } catch (error) {
        console.error(`Error detecting API style for ${file}:`, error);
        process.exit(1);
      }
    }

    serverConfigs.push({
      filePath: file,
      port,
      useHttp,
      useHttpStateless,
      verbose,
      style,
      color,
      groupId,
    });
  }

  // Start all servers
  console.error(`${COLORS.bright}Starting ${files.length} servers...${COLORS.reset}`);
  console.error('');

  const runningServers: RunningServer[] = [];

  for (const config of serverConfigs) {
    try {
      const server = await startServerProcess(config);
      runningServers.push(server);
    } catch (error) {
      console.error(`Failed to start server ${config.filePath}:`, error);

      // Clean up already started servers
      for (const runningServer of runningServers) {
        runningServer.process.kill();
      }

      process.exit(1);
    }
  }

  // Wait a bit for servers to initialize
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Display summary
  console.error('');
  console.error(`${COLORS.green}${COLORS.bright}All ${runningServers.length} servers running${COLORS.reset}`);

  if (useHttp) {
    console.error('');
    console.error(`${COLORS.dim}Server URLs:${COLORS.reset}`);
    for (const server of runningServers) {
      console.error(`  ${server.color}${server.name}${COLORS.reset}: http://localhost:${server.port}`);
    }
  }

  console.error('');
  console.error(`${COLORS.dim}Press Ctrl+C to stop all servers${COLORS.reset}`);
  console.error('');

  // Set up graceful shutdown
  const shutdown = async (signal: string) => {
    console.error('');
    console.error(`${COLORS.yellow}Received ${signal}, stopping all servers...${COLORS.reset}`);

    for (const server of runningServers) {
      server.process.kill('SIGTERM');
    }

    // Wait for processes to exit
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Force kill any remaining processes
    for (const server of runningServers) {
      if (server.process.exitCode === null) {
        server.process.kill('SIGKILL');
      }
    }

    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Keep the process running
  await new Promise(() => {
    // Never resolves - keep process alive until SIGINT/SIGTERM
  });
}
