/**
 * Run command for SimplyMCP CLI
 * Auto-detects API style and runs the appropriate adapter
 */

import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import type { CommandModule } from 'yargs';
import {
  loadCLIConfig,
  mergeRunConfig,
  mergeServerConfig,
  getConfigFilePath,
  resolveServerConfig,
  listServers,
  type RunConfig,
  type CLIConfig,
} from './cli-config-loader.js';

/**
 * API style types
 */
export type APIStyle = 'interface';

/**
 * Dynamically load TypeScript file
 * If tsx is loaded as Node loader, use direct import for decorator support
 * Otherwise use tsImport API
 */
export async function loadTypeScriptFile(absolutePath: string): Promise<any> {
  // Check if tsx is loaded as Node loader (via --import tsx)
  const tsxLoaded = process.execArgv.some(arg => arg.includes('tsx') || arg.includes('--import tsx'));

  if (tsxLoaded) {
    // tsx is loaded as loader, use direct import for full decorator support
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
 * Detect the API style from a server file
 * @param filePath Path to the server file
 * @returns Detected API style
 */
export async function detectAPIStyle(filePath: string): Promise<APIStyle> {
  try {
    const content = await readFile(filePath, 'utf-8');

    // Check for interface API
    // Look for ITool, IPrompt, IResource, or IServer interface extensions or implementations
    if (/(extends|implements)\s+(ITool|IPrompt|IResource|IServer)/.test(content)) {
      return 'interface';
    }

    // Default to interface API
    return 'interface';
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.error(`Error: Server file not found: ${filePath}`);
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Run a server file with the interface API adapter
 */
async function runInterfaceAdapter(
  filePath: string,
  useHttp: boolean,
  useHttpStateless: boolean,
  port: number,
  verbose: boolean = false,
  uiWatch: boolean = false,
  useWebSocket: boolean = false
): Promise<void> {
  // Import interface adapter
  const { loadInterfaceServer } = await import('../server/adapter.js');
  const { startServer, displayServerInfo } = await import('./adapter-utils.js');

  // Load the interface server
  const absolutePath = resolve(process.cwd(), filePath);

  if (verbose) {
    console.error(`[RunCommand] Loading interface server from: ${filePath}`);
  }

  try {
    const server = await loadInterfaceServer({
      filePath: absolutePath,
      verbose: verbose || false,
      uiWatch: uiWatch ? { enabled: true, verbose } : undefined,
    });

    displayServerInfo(server);

    // Determine transport type for startServer
    if (useWebSocket) {
      // Start with WebSocket transport
      await server.start({
        transport: 'websocket',
        port,
        stateful: true, // WebSocket is always stateful
      });

      console.error(`[Adapter] Server running with WebSocket transport on ws://localhost:${port}`);
      if (verbose) {
        console.error('[Adapter] Transport: WebSocket');
        console.error(`[Adapter] Port: ${port}`);
      }
    } else {
      // Use existing HTTP/stdio logic
      await startServer(server, { useHttp: useHttp || useHttpStateless, port, verbose, stateful: !useHttpStateless });
    }
  } catch (error) {
    console.error('[RunCommand] Failed to run interface server:', error);
    if (error instanceof Error && error.stack && verbose) {
      console.error('[RunCommand] Stack:', error.stack);
    }
    process.exit(2);
  }
}


/**
 * Scan current directory for potential MCP server files
 * Looks for .ts and .js files containing interface patterns
 */
async function discoverServers(cwd: string = process.cwd()): Promise<string[]> {
  console.error('[DEBUG:DISCOVER] Discovering servers in:', cwd);
  try {
    const files = await readdir(cwd);
    console.error('[DEBUG:DISCOVER] Found files:', files.length, 'files');
    const potentialServers: string[] = [];

    for (const file of files) {
      const ext = extname(file);
      if (ext !== '.ts' && ext !== '.js') {
        continue;
      }

      try {
        const filePath = resolve(cwd, file);
        const content = await readFile(filePath, 'utf-8');

        // Check for MCP server patterns
        if (
          /(extends|implements)\s+(ITool|IPrompt|IResource|IServer)/.test(content)
        ) {
          potentialServers.push(file);
        }
      } catch {
        // Skip files we can't read
        continue;
      }
    }

    console.error('[DEBUG:DISCOVER] Potential servers found:', JSON.stringify(potentialServers));
    return potentialServers;
  } catch (error) {
    console.error('[DEBUG:DISCOVER] Error during discovery:', error);
    return [];
  }
}

/**
 * Parse config file content as text to extract server names and entries
 * This is a fallback when the config file can't be imported
 */
async function parseConfigAsText(configPath: string): Promise<{ servers: Record<string, { entry: string }> } | null> {
  try {
    const content = await readFile(configPath, 'utf-8');
    const servers: Record<string, { entry: string }> = {};

    // Try to extract server definitions using regex
    // Match patterns like: 'server-name': { entry: './path/to/file.ts', ... }
    const serverPattern = /['"]([^'"]+)['"]\s*:\s*\{[^}]*entry\s*:\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = serverPattern.exec(content)) !== null) {
      const [, serverName, entryPath] = match;
      servers[serverName] = { entry: entryPath };
    }

    if (Object.keys(servers).length > 0) {
      return { servers };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Display server discovery help when no files are provided
 */
async function showServerDiscovery(config: CLIConfig | null, configFilePath: string | null): Promise<void> {
  // Try to get server info from config or parse as text
  let serversToShow: Array<{ name: string; entry: string }> = [];

  if (config && config.servers && Object.keys(config.servers).length > 0) {
    serversToShow = listServers(config);
  } else if (configFilePath) {
    // Try parsing as text as a fallback
    const parsedConfig = await parseConfigAsText(configFilePath);
    if (parsedConfig && parsedConfig.servers) {
      serversToShow = Object.entries(parsedConfig.servers).map(([name, cfg]) => ({
        name,
        entry: cfg.entry,
        config: cfg as any,
      }));
    }
  }

  if (serversToShow.length > 0) {
    // Scenario A: Config file exists with servers
    console.error('');
    console.error('Available servers in config:');
    console.error('');

    for (const server of serversToShow) {
      console.error(`  ${server.name}`);
      console.error(`    Entry: ${server.entry}`);
      console.error('');
    }

    console.error('Run a specific server with:');
    console.error(`  simplymcp run <server-name>`);
    console.error('');
    console.error('Example:');
    console.error(`  simplymcp run ${serversToShow[0].name}`);
    console.error('');
  } else {
    // Scenario B: No config file or no servers in config
    const potentialServers = await discoverServers();

    if (potentialServers.length > 0) {
      console.error('');
      console.error('Found potential MCP server files in current directory:');
      console.error('');
      for (const file of potentialServers) {
        console.error(`  ${file}`);
      }
      console.error('');
      console.error('Run a server with:');
      console.error(`  simplymcp run <file>`);
      console.error('');
      console.error('Example:');
      console.error(`  simplymcp run ${potentialServers[0]}`);
      console.error('');
    } else {
      console.error('');
      console.error('No MCP servers found in current directory.');
      console.error('');
      console.error('Quick start:');
      console.error('  1. Create a server file (e.g., my-server.ts)');
      console.error('  2. Use Interface API (ITool, IServer, etc.)');
      console.error('  3. Run with: simplymcp run my-server.ts');
      console.error('');
      console.error('See documentation: https://github.com/QuantGeekDev/simple-mcp');
      console.error('');
    }
  }
}

/**
 * Spawn a child process with Node.js inspector enabled
 * This allows developers to debug their MCP servers using Chrome DevTools or VS Code
 */
async function spawnWithInspector(
  inspectFlag: string,
  inspectPort: number,
  argv: any
): Promise<void> {
  // Get the current CLI script path
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const cliPath = resolve(__dirname, 'index.js');

  // Build the command arguments
  const nodeArgs = [`${inspectFlag}=${inspectPort}`];

  // Check if we need TypeScript support
  const files = Array.isArray(argv.file) ? argv.file : [argv.file];
  const needsTypeScript = files.some((f: string) => f.endsWith('.ts'));

  // If TypeScript files are used, use tsx with --import (Node 20.6.0+)
  if (needsTypeScript) {
    nodeArgs.push('--import', 'tsx');
  }

  const scriptArgs = [cliPath, 'run'];

  // Add all relevant flags back
  scriptArgs.push(...files);

  if (argv.config) scriptArgs.push('--config', argv.config);
  if (argv.transport) scriptArgs.push('--transport', argv.transport);
  if (argv.http) scriptArgs.push('--http');
  if (argv['http-stateless']) scriptArgs.push('--http-stateless');
  if (argv.port) scriptArgs.push('--port', String(argv.port));
  if (argv.style) scriptArgs.push('--style', argv.style);
  if (argv.verbose) scriptArgs.push('--verbose');
  if (argv['dry-run']) scriptArgs.push('--dry-run');
  if (argv.watch) scriptArgs.push('--watch');
  if (argv['watch-poll']) scriptArgs.push('--watch-poll');
  if (argv['watch-interval']) scriptArgs.push('--watch-interval', String(argv['watch-interval']));
  if (argv['ui-watch']) scriptArgs.push('--ui-watch');

  console.error('[Debug] Starting server with Node.js inspector...');
  console.error(`[Debug] Inspector will listen on port ${inspectPort}`);
  if (needsTypeScript) {
    console.error('[Debug] TypeScript support enabled (using tsx loader)');
  }
  console.error('[Debug] Waiting for debugger to attach...\n');

  // Spawn the child process
  const child = spawn('node', [...nodeArgs, ...scriptArgs], {
    stdio: ['inherit', 'inherit', 'pipe'],
    env: process.env,
  });

  let inspectorUrlShown = false;

  // Listen for inspector URL in stderr
  child.stderr?.on('data', (data) => {
    const output = data.toString();

    // Forward stderr to parent process
    process.stderr.write(output);

    // Extract and highlight inspector URL
    if (!inspectorUrlShown) {
      const urlMatch = output.match(/ws:\/\/[^\s]+/);
      if (urlMatch) {
        console.error(`\n[Debug] Inspector URL: ${urlMatch[0]}`);
        console.error('[Debug] Open chrome://inspect in Chrome to debug');
        console.error('[Debug] Or connect your IDE debugger to port', inspectPort);
        if (inspectFlag === '--inspect-brk') {
          console.error('[Debug] Execution paused. Attach debugger to continue.\n');
        } else {
          console.error('[Debug] Debugger attached. Server starting...\n');
        }
        inspectorUrlShown = true;
      }
    }
  });

  // Handle child process exit
  return new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      if (signal) {
        console.error(`\n[Debug] Process killed with signal: ${signal}`);
        process.exit(1);
      } else {
        process.exit(code || 0);
      }
    });

    child.on('error', (error) => {
      console.error('[Debug] Failed to start child process:', error);
      process.exit(1);
    });
  });
}

/**
 * Yargs command definition for the run command
 */
export const runCommand: CommandModule = {
  command: 'run [file..]',
  describe: 'Auto-detect and run MCP server(s)',
  builder: (yargs) => {
    return yargs
      .positional('file', {
        describe: 'Path to the server file(s)',
        type: 'string',
        demandOption: false,
      })
      .option('config', {
        describe: 'Path to config file (auto-detected if not specified)',
        type: 'string',
      })
      .option('http', {
        describe: 'Use HTTP transport instead of stdio (deprecated: use --transport http)',
        type: 'boolean',
      })
      .option('http-stateless', {
        describe: 'Use HTTP transport in stateless mode (no session management) (deprecated: use --transport http-stateless)',
        type: 'boolean',
      })
      .option('transport', {
        describe: 'Specify transport mode (stdio is default, http for stateful, http-stateless for stateless, ws for WebSocket)',
        type: 'string',
        choices: ['stdio', 'http', 'http-stateless', 'ws'] as const,
      })
      .option('port', {
        describe: 'Port for HTTP server',
        type: 'number',
      })
      .option('style', {
        describe: 'Force specific API style',
        choices: ['interface'] as const,
        type: 'string',
      })
      .option('verbose', {
        describe: 'Show detection details and config info',
        type: 'boolean',
      })
      .option('inspect', {
        describe: 'Enable Node.js inspector for debugging',
        type: 'boolean',
        default: false,
      })
      .option('inspect-brk', {
        describe: 'Enable Node.js inspector and break on first line',
        type: 'boolean',
        default: false,
      })
      .option('inspect-port', {
        describe: 'Port for Node.js inspector',
        type: 'number',
        default: 9229,
      })
      .option('dry-run', {
        describe: 'Validate configuration without starting server',
        type: 'boolean',
        default: false,
      })
      .option('json', {
        describe: 'Output as JSON (with --dry-run)',
        type: 'boolean',
        default: false,
      })
      .option('watch', {
        describe: 'Watch for file changes and auto-restart',
        type: 'boolean',
      })
      .option('watch-poll', {
        describe: 'Use polling mode for file watching (useful for network drives)',
        type: 'boolean',
      })
      .option('watch-interval', {
        describe: 'Polling interval in milliseconds',
        type: 'number',
      })
      .option('ui-watch', {
        describe: 'Enable UI file watching and hot reload for UI resources',
        type: 'boolean',
        default: false,
      })
      .option('auto-install', {
        describe: 'Auto-install dependencies for package bundles (default: true)',
        type: 'boolean',
        default: true,
      })
      .option('package-manager', {
        describe: 'Specify package manager (npm, pnpm, yarn, bun)',
        type: 'string',
        choices: ['npm', 'pnpm', 'yarn', 'bun'] as const,
      })
      .option('force-install', {
        describe: 'Force reinstall dependencies even if already installed',
        type: 'boolean',
        default: false,
      });
  },
  handler: async (argv: any) => {
    // DEBUG: Log all invocations to detect unexpected file execution
    console.error('[DEBUG:RUN] ========== RUN COMMAND INVOKED ==========');
    console.error('[DEBUG:RUN] timestamp:', new Date().toISOString());
    console.error('[DEBUG:RUN] process.argv:', JSON.stringify(process.argv));
    console.error('[DEBUG:RUN] cwd:', process.cwd());
    console.error('[DEBUG:RUN] argv.file:', JSON.stringify(argv.file));
    console.error('[DEBUG:RUN] ==========================================');

    const files = argv.file ? (Array.isArray(argv.file) ? argv.file : [argv.file]) : [];
    const configPath = argv.config as string | undefined;

    console.error('[DEBUG:RUN] Parsed files array:', JSON.stringify(files));

    // Validate file extensions - reject non-code files
    const invalidFiles = files.filter((f: string) => {
      const ext = extname(f).toLowerCase();
      return !['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'].includes(ext);
    });

    if (invalidFiles.length > 0) {
      console.error('[RunCommand] Error: Invalid file type(s) provided');
      console.error('');
      console.error('Unsupported file(s):');
      invalidFiles.forEach((f: string) => {
        console.error(`  - ${f} (${extname(f)})`);
      });
      console.error('');
      console.error('Simply MCP only supports TypeScript and JavaScript files:');
      console.error('  - TypeScript: .ts, .mts, .cts');
      console.error('  - JavaScript: .js, .mjs, .cjs');
      console.error('');
      console.error('If you\'re trying to run examples from documentation:');
      console.error('  1. Extract the code from the markdown file');
      console.error('  2. Save it as a .ts file');
      console.error('  3. Run: simply-mcp run your-server.ts');
      console.error('');
      process.exit(1);
    }

    // If no files provided, show server discovery help
    if (files.length === 0) {
      let config: CLIConfig | null = null;
      let configFilePath: string | null = null;

      try {
        configFilePath = await getConfigFilePath(configPath);
        if (configFilePath) {
          config = await loadCLIConfig(configPath);
        }
      } catch (error) {
        // Config loading failed, but we might still have the config file path
        // We'll try to parse it as text in showServerDiscovery
      }

      await showServerDiscovery(config, configFilePath);
      process.exit(1);
    }

    // Check if we need TypeScript support and tsx is not already loaded
    const needsTypeScript = files.some((f: string) => f.endsWith('.ts'));
    const tsxLoaded = process.execArgv.some(arg => arg.includes('tsx') || arg.includes('--import tsx'));

    if (needsTypeScript && !tsxLoaded) {
      // Re-exec with tsx loader for proper decorator support
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const cliPath = resolve(__dirname, 'index.js');

      const nodeArgs = ['--import', 'tsx'];
      const scriptArgs = [cliPath, 'run', ...files];

      // Pass through all flags
      if (argv.config) scriptArgs.push('--config', argv.config);
      if (argv.transport) scriptArgs.push('--transport', argv.transport);
      if (argv.http) scriptArgs.push('--http');
      if (argv['http-stateless']) scriptArgs.push('--http-stateless');
      if (argv.port) scriptArgs.push('--port', String(argv.port));
      if (argv.style) scriptArgs.push('--style', argv.style);
      if (argv.verbose) scriptArgs.push('--verbose');
      if (argv['dry-run']) scriptArgs.push('--dry-run');
      if (argv.watch) scriptArgs.push('--watch');
      if (argv['watch-poll']) scriptArgs.push('--watch-poll');
      if (argv['watch-interval']) scriptArgs.push('--watch-interval', String(argv['watch-interval']));
      if (argv['ui-watch']) scriptArgs.push('--ui-watch');
      if (argv.inspect) scriptArgs.push('--inspect');
      if (argv['inspect-brk']) scriptArgs.push('--inspect-brk');
      if (argv['inspect-port']) scriptArgs.push('--inspect-port', String(argv['inspect-port']));

      const child = spawn('node', [...nodeArgs, ...scriptArgs], {
        stdio: [0, 1, 2],  // Use raw file descriptors for proper redirection
        env: process.env,
      });

      return new Promise((resolve) => {
        child.on('exit', (code) => {
          process.exit(code || 0);
        });
        child.on('error', (error) => {
          console.error('[RunCommand] Failed to start with tsx:', error);
          process.exit(1);
        });
      });
    }

    try {
      // Load config file (if exists)
      const config = await loadCLIConfig(configPath);
      const configFilePath = await getConfigFilePath(configPath);

      // CLI options passed directly
      const cliOptions: Partial<RunConfig> = {
        http: argv.http,
        port: argv.port,
        style: argv.style,
        verbose: argv.verbose,
        watch: argv.watch,
        watchPoll: argv['watch-poll'],
        watchInterval: argv['watch-interval'],
      };

      // Check if the file is a named server in config
      let resolvedFiles = [...files];
      let serverConfigs: Array<{ entry: string; merged: RunConfig }> = [];

      // Resolve each file (could be file path, server name, or package bundle)
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // First, check if this is a package bundle
        const { isPackageBundle } = await import('./package-detector.js');
        const isBundle = await isPackageBundle(file);

        if (isBundle) {
          // This is a package bundle - will be handled specially later
          const merged = mergeRunConfig(config, cliOptions);
          serverConfigs.push({ entry: file, merged });
          continue;
        }

        const serverConfig = resolveServerConfig(file, config);

        if (serverConfig) {
          // Named server found
          const merged = mergeServerConfig(
            serverConfig.config,
            config?.defaults || null,
            cliOptions
          );
          serverConfigs.push({ entry: serverConfig.entry, merged });
          resolvedFiles[i] = serverConfig.entry;

          if (cliOptions.verbose !== false) {
            console.error(`[Config] Resolved server "${file}" to: ${serverConfig.entry}`);
          }
        } else {
          // Regular file path
          const merged = mergeRunConfig(config, cliOptions);
          serverConfigs.push({ entry: file, merged });
        }
      }

      // Use the first server's config for single-server mode
      const mergedOptions = serverConfigs[0]?.merged || mergeRunConfig(config, cliOptions);

      // Extract merged values
      let useHttp = mergedOptions.http ?? false;
      let useHttpStateless = argv['http-stateless'] as boolean;

      // Handle --transport flag (new recommended way)
      const transport = argv.transport as string | undefined;
      let useWebSocket = false;
      if (transport) {
        // Validate transport value (yargs should handle this, but double-check)
        if (transport !== 'stdio' && transport !== 'http' && transport !== 'http-stateless' && transport !== 'ws') {
          console.error('[RunCommand] Error: Invalid transport value');
          console.error('');
          console.error('Valid transport options:');
          console.error('  --transport stdio           Use stdio transport (default)');
          console.error('  --transport http            Use HTTP transport (stateful)');
          console.error('  --transport http-stateless  Use HTTP transport (stateless)');
          console.error('  --transport ws              Use WebSocket transport');
          console.error('');
          process.exit(1);
        }

        // Set flags based on transport value
        if (transport === 'stdio') {
          useHttp = false;
          useHttpStateless = false;
          useWebSocket = false;
        } else if (transport === 'http') {
          useHttp = true;
          useHttpStateless = false;
          useWebSocket = false;
        } else if (transport === 'http-stateless') {
          useHttp = true;
          useHttpStateless = true;
          useWebSocket = false;
        } else if (transport === 'ws') {
          useHttp = false;
          useHttpStateless = false;
          useWebSocket = true;
        }

        // Warn if conflicting flags are used
        if (argv.http || argv['http-stateless']) {
          console.error('[RunCommand] Warning: Both --transport and --http/--http-stateless flags provided');
          console.error('[RunCommand] Using --transport value, ignoring --http/--http-stateless');
          console.error('');
        }
      }

      // Determine port: CLI flag > environment variable > default
      let port = mergedOptions.port ?? 3000;
      if (!mergedOptions.port && process.env.PORT) {
        port = parseInt(process.env.PORT, 10);
        if (mergedOptions.verbose) {
          console.error(`[RunCommand] Using port from environment: ${port}`);
        }
      }

      // Validate mutually exclusive flags (only when using old flags, not --transport)
      if (!transport && argv.http && argv['http-stateless']) {
        console.error('[RunCommand] Error: Cannot use both --http and --http-stateless');
        console.error('[RunCommand] Use --http for stateful mode or --http-stateless for stateless mode');
        console.error('[RunCommand] Or use the new --transport flag: --transport http or --transport http-stateless');
        process.exit(1);
      }

      // If stateless is specified, enable HTTP transport
      if (useHttpStateless) {
        useHttp = true;
      }
      const forceStyle = mergedOptions.style;
      const verbose = mergedOptions.verbose ?? false;
      const watch = mergedOptions.watch ?? false;
      const watchPoll = mergedOptions.watchPoll ?? false;
      const watchInterval = mergedOptions.watchInterval ?? 100;
      const uiWatch = argv['ui-watch'] as boolean ?? false;
      const dryRun = argv['dry-run'] as boolean;
      const inspect = argv.inspect as boolean;
      const inspectBrk = argv['inspect-brk'] as boolean;
      const inspectPort = argv['inspect-port'] as number;

      // Multi-server mode requires HTTP transport (not WebSocket or stdio)
      if (files.length > 1 && !useHttp && !useWebSocket) {
        console.error('[RunCommand] Multi-server mode detected, enabling HTTP transport automatically');
        useHttp = true;
      }

      // WebSocket doesn't support multi-server mode yet
      if (files.length > 1 && useWebSocket) {
        console.error('[RunCommand] Error: WebSocket transport is not yet supported with multi-server mode');
        console.error('[RunCommand] Please use HTTP transport for multi-server mode');
        process.exit(1);
      }

      // Show config info in verbose mode
      if (verbose) {
        if (configFilePath) {
          console.error(`[Config] Loaded from: ${configFilePath}`);
          console.error(`[Config] Run options:`, config?.run || {});
        } else {
          console.error(`[Config] No config file found (using CLI args and defaults)`);
        }
      }

      // Multi-server mode
      if (files.length > 1) {
        if (verbose) {
          console.error(`[RunCommand] Multi-server mode: running ${files.length} servers`);
        }

        // Watch mode not supported with multi-server yet
        if (watch) {
          console.error('[RunCommand] Error: Watch mode is not yet supported with multi-server');
          process.exit(1);
        }

        // Dry-run not supported with multi-server
        if (dryRun) {
          console.error('[RunCommand] Error: Dry-run mode is not supported with multi-server');
          process.exit(1);
        }

        // Run multi-server
        const { runMultipleServers } = await import('./multi-server-runner.js');
        await runMultipleServers({
          files,
          useHttp,
          useHttpStateless,
          startPort: port,
          verbose,
          forceStyle,
        });
        return;
      }

      // Single server mode
      const filePath = resolvedFiles[0];

      // Check if this is a package bundle
      const { isPackageBundle, runPackageBundle } = await import('./package-detector.js').then(async (m) => ({
        isPackageBundle: m.isPackageBundle,
        runPackageBundle: (await import('./bundle-runner.js')).runPackageBundle
      }));

      const isBundle = await isPackageBundle(filePath);

      if (isBundle) {
        // Run as package bundle (always interface style)
        await runPackageBundle(filePath, {
          http: useHttp,
          httpStateless: useHttpStateless,
          port,
          style: 'interface',
          verbose,
          autoInstall: argv['auto-install'] ?? true,
          packageManager: argv['package-manager'] as any,
          forceInstall: argv['force-install'] ?? false,
        });
        return;
      }

      // Detect or use forced style (always interface now)
      const style: APIStyle = 'interface';

      if (verbose) {
        console.error(`[RunCommand] Detected API style: ${style}`);
        if (forceStyle) {
          console.error(`[RunCommand] Style was forced via --style flag`);
        }
        // Output loading message early so it appears even if respawn happens
        const absolutePath = resolve(process.cwd(), filePath);
        console.error('[Adapter] Loading interface server from:', filePath);
        // Also output transport info early
        const transportType = useWebSocket ? 'WebSocket' : (useHttp ? 'HTTP' : 'STDIO');
        console.error(`[Adapter] Transport: ${transportType}`);
        if (useHttp || useWebSocket) {
          console.error(`[Adapter] Port: ${port}`);
        }
      }

      // If watch mode is enabled, start watch mode manager
      if (watch) {
        const { startWatchMode } = await import('./watch-mode.js');
        await startWatchMode({
          file: filePath,
          style: 'interface',
          http: useHttp,
          httpStateless: useHttpStateless,
          port,
          poll: watchPoll,
          interval: watchInterval,
          verbose,
        });
        return;
      }

      // If dry-run mode is enabled, validate without starting server
      if (dryRun) {
        const jsonOutput = argv.json as boolean;
        const { runDryRun } = await import('./dry-run.js');
        await runDryRun(filePath, 'interface', useHttp, port, jsonOutput, useWebSocket);
        return;
      }

      // If inspect mode is enabled, spawn a child process with inspector
      if (inspect || inspectBrk) {
        const inspectFlag = inspectBrk ? '--inspect-brk' : '--inspect';
        await spawnWithInspector(inspectFlag, inspectPort, argv);
        return; // Never reached, spawnWithInspector exits the process
      }

      // Run interface adapter
      await runInterfaceAdapter(filePath, useHttp, useHttpStateless, port, verbose, uiWatch, useWebSocket);
    } catch (error) {
      console.error('[RunCommand] Error:', error);
      process.exit(2);
    }
  },
};
