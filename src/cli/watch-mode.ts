/**
 * Watch mode manager for SimplyMCP CLI
 * Watches for file changes and auto-restarts the server
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import type { APIStyle } from './run.js';

/**
 * Find TypeScript files in a directory
 * @param dir Directory to search
 * @param recursive Whether to search subdirectories
 * @returns Array of absolute paths to .ts files
 */
function findTypeScriptFiles(dir: string, recursive: boolean): string[] {
  const results: string[] = [];

  try {
    // Get all entries in directory
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip node_modules, dist, build, hidden dirs
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' ||
            entry.name === 'build' || entry.name.startsWith('.')) {
          continue;
        }
        if (recursive) {
          results.push(...findTypeScriptFiles(fullPath, true));
        }
      } else if (entry.isFile()) {
        // Include .ts files, exclude .test.ts and .spec.ts
        if (entry.name.endsWith('.ts') &&
            !entry.name.endsWith('.test.ts') &&
            !entry.name.endsWith('.spec.ts')) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Directory might not exist or be readable - silently skip
  }

  return results;
}

/**
 * Options for watch mode
 */
export interface WatchModeOptions {
  file: string;
  style: APIStyle;
  http: boolean;
  httpStateless?: boolean;
  port: number;
  poll: boolean;
  interval: number;
  verbose: boolean;
}

/**
 * Watch mode manager state
 */
interface WatchState {
  child?: ChildProcess;
  isRestarting: boolean;
  restartQueued: boolean;
  lastRestartTime: number;
  watcher?: any; // chokidar watcher
}

// Minimum time between restarts (debounce)
const RESTART_DEBOUNCE_MS = 300;

/**
 * Format timestamp for log messages
 */
function timestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
}

/**
 * Start the server as a child process
 */
function startServerProcess(options: WatchModeOptions, state: WatchState): void {
  if (state.child) {
    console.error('[Watch] Error: Child process already running');
    return;
  }

  const { file, style, http, httpStateless, port, verbose } = options;
  const absolutePath = resolve(process.cwd(), file);

  // Get the path to the CLI
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const cliPath = resolve(__dirname, 'index.js');

  // Build command arguments
  const args = ['run', absolutePath, '--style', style];
  if (httpStateless) {
    args.push('--http-stateless');
    args.push('--port', port.toString());
  } else if (http) {
    args.push('--http');
    args.push('--port', port.toString());
  }
  if (verbose) {
    args.push('--verbose');
  }

  if (verbose) {
    console.error(`[Watch] [${timestamp()}] Starting server process...`);
    console.error(`[Watch] Command: node ${cliPath} ${args.join(' ')}`);
  }

  // Spawn the child process
  const child = spawn('node', [cliPath, ...args], {
    stdio: 'inherit', // Forward stdio to parent
    env: process.env,
    cwd: process.cwd(),
  });

  state.child = child;

  // Handle child process exit
  child.on('exit', (code, signal) => {
    if (verbose) {
      if (signal) {
        console.error(`[Watch] [${timestamp()}] Server process killed by signal: ${signal}`);
      } else if (code !== null) {
        console.error(`[Watch] [${timestamp()}] Server process exited with code: ${code}`);
      }
    }

    state.child = undefined;
    state.isRestarting = false;

    // If a restart was queued during shutdown, start it now
    if (state.restartQueued) {
      state.restartQueued = false;
      setTimeout(() => restartServer(options, state), 100);
    }
  });

  // Handle child process errors
  child.on('error', (error) => {
    console.error(`[Watch] [${timestamp()}] Server process error:`, error);
    state.child = undefined;
    state.isRestarting = false;
  });

  console.error(`[Watch] [${timestamp()}] Server started (PID: ${child.pid})`);
}

/**
 * Stop the server process
 */
function stopServerProcess(state: WatchState, verbose: boolean): Promise<void> {
  return new Promise((resolve) => {
    if (!state.child) {
      resolve();
      return;
    }

    if (verbose) {
      console.error(`[Watch] [${timestamp()}] Stopping server process...`);
    }

    const child = state.child;

    // Set a timeout in case the process doesn't exit cleanly
    const timeout = setTimeout(() => {
      if (state.child === child && child.pid) {
        if (verbose) {
          console.error(`[Watch] [${timestamp()}] Force killing server process...`);
        }
        child.kill('SIGKILL');
      }
      resolve();
    }, 5000);

    // Listen for exit
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    // Send SIGTERM to child
    child.kill('SIGTERM');
  });
}

/**
 * Restart the server
 */
async function restartServer(options: WatchModeOptions, state: WatchState): Promise<void> {
  const now = Date.now();
  const timeSinceLastRestart = now - state.lastRestartTime;

  // Debounce restarts
  if (timeSinceLastRestart < RESTART_DEBOUNCE_MS && state.lastRestartTime > 0) {
    if (!state.restartQueued) {
      state.restartQueued = true;
      setTimeout(() => {
        state.restartQueued = false;
        restartServer(options, state);
      }, RESTART_DEBOUNCE_MS - timeSinceLastRestart);
    }
    return;
  }

  // If already restarting, queue another restart
  if (state.isRestarting) {
    state.restartQueued = true;
    return;
  }

  state.isRestarting = true;
  state.lastRestartTime = now;
  const restartStartTime = Date.now();

  console.error(`\n[Watch] [${timestamp()}] File change detected, restarting server...`);

  // Stop the current process
  await stopServerProcess(state, options.verbose);

  // Start a new process
  startServerProcess(options, state);

  const restartDuration = Date.now() - restartStartTime;
  console.error(`[Watch] [${timestamp()}] ✓ Restart complete (${restartDuration}ms)\n`);

  state.isRestarting = false;
}

/**
 * Start watch mode
 */
export async function startWatchMode(options: WatchModeOptions): Promise<void> {
  const { file, poll, interval, verbose } = options;
  const absolutePath = resolve(process.cwd(), file);

  console.error(`[Watch] Starting watch mode...`);
  console.error(`[Watch] File: ${absolutePath}`);
  console.error(`[Watch] API Style: ${options.style}`);
  console.error(`[Watch] Transport: ${options.http ? `HTTP (port ${options.port})` : 'STDIO'}`);
  if (poll) {
    console.error(`[Watch] Polling mode enabled (interval: ${interval}ms)`);
  }
  console.error(`[Watch] Press Ctrl+C to stop\n`);

  // Import chokidar with error handling
  let chokidar: typeof import('chokidar');
  try {
    chokidar = await import('chokidar');
  } catch (error) {
    throw new Error(
      'Watch mode requires chokidar.\n' +
      'Install it with: npm install chokidar\n\n' +
      'Or run without --watch flag.'
    );
  }

  // Initialize state
  const state: WatchState = {
    isRestarting: false,
    restartQueued: false,
    lastRestartTime: 0,
  };

  // Start the initial server process
  startServerProcess(options, state);

  // Watch the file and its directory
  // Explicitly enumerate TypeScript files to ensure chokidar detects changes
  const fileDir = dirname(absolutePath);

  // Find all TypeScript files in same directory and subdirectories
  const sameDirFiles = findTypeScriptFiles(fileDir, false);  // Same directory
  const subDirFiles = findTypeScriptFiles(fileDir, true);    // Subdirectories

  // Combine all paths and remove duplicates
  const allTsFiles = [...new Set([absolutePath, ...sameDirFiles, ...subDirFiles])];

  const watchPaths = [
    ...allTsFiles,                    // All discovered TypeScript files
    `${fileDir}/package.json`,        // Package.json for dependency changes
  ];

  const watchOptions: any = {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
    ignored: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/.git/**',
      '**/.DS_Store',
      '**/coverage/**',
    ],
  };

  if (poll) {
    watchOptions.usePolling = true;
    watchOptions.interval = interval;
  }

  if (verbose) {
    console.error(`[Watch] Watching patterns:`);
    watchPaths.forEach(p => console.error(`[Watch]   - ${p}`));
  }

  const watcher = chokidar.watch(watchPaths, watchOptions);
  state.watcher = watcher;

  // Handle file changes
  watcher.on('change', (path) => {
    if (verbose) {
      console.error(`[Watch] [${timestamp()}] Changed: ${path}`);
    }
    restartServer(options, state);
  });

  watcher.on('add', (path) => {
    if (verbose) {
      console.error(`[Watch] [${timestamp()}] Added: ${path}`);
    }
    restartServer(options, state);
  });

  watcher.on('unlink', (path) => {
    if (verbose) {
      console.error(`[Watch] [${timestamp()}] Removed: ${path}`);
    }
    // Don't restart on file removal - just log it
  });

  watcher.on('error', (error) => {
    console.error(`[Watch] [${timestamp()}] Watcher error:`, error);
  });

  if (verbose) {
    watcher.on('ready', () => {
      console.error(`[Watch] [${timestamp()}] Watcher ready`);
    });
  }

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    // Log shutdown initiation
    console.error(`\n[Watch] [${timestamp()}] Received ${signal}, shutting down...`);

    // Close the watcher
    if (state.watcher) {
      await state.watcher.close();
    }

    // Stop the child process
    await stopServerProcess(state, verbose);

    // Ensure "Shutdown complete" message is written before exit
    // Using write() with callback guarantees completion
    await new Promise<void>((resolve) => {
      const message = `[Watch] [${timestamp()}] Shutdown complete\n`;
      process.stderr.write(message, () => {
        resolve();
      });
    });

    process.exit(0);
  };

  // Properly handle async shutdown in signal handlers
  process.on('SIGINT', () => {
    void shutdown('SIGINT').catch((err) => {
      console.error('[Watch] Error during shutdown:', err);
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM').catch((err) => {
      console.error('[Watch] Error during shutdown:', err);
      process.exit(1);
    });
  });

  // Keep the process alive
  return new Promise(() => {
    // This promise never resolves - the process runs until killed
  });
}
