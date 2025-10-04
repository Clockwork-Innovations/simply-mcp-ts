/**
 * Run command for SimplyMCP CLI
 * Auto-detects API style and runs the appropriate adapter
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import type { CommandModule } from 'yargs';
import {
  loadCLIConfig,
  mergeRunConfig,
  mergeServerConfig,
  getConfigFilePath,
  resolveServerConfig,
  type RunConfig,
} from './cli-config-loader.js';

/**
 * API style types
 */
export type APIStyle = 'decorator' | 'functional' | 'programmatic';

/**
 * Detect the API style from a server file
 * @param filePath Path to the server file
 * @returns Detected API style
 */
export async function detectAPIStyle(filePath: string): Promise<APIStyle> {
  try {
    const content = await readFile(filePath, 'utf-8');

    // Check for decorator API (highest priority)
    // Look for @MCPServer decorator
    if (/@MCPServer\s*\(/.test(content)) {
      return 'decorator';
    }

    // Check for functional API (medium priority)
    // Look for defineMCP export
    if (/export\s+default\s+defineMCP\s*\(/.test(content)) {
      return 'functional';
    }

    // Default to programmatic API (fallback)
    return 'programmatic';
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.error(`Error: Server file not found: ${filePath}`);
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Run a server file with the functional API adapter
 */
async function runFunctionalAdapter(
  filePath: string,
  useHttp: boolean,
  port: number
): Promise<void> {
  const { SimplyMCP } = await import('../SimplyMCP.js');
  const { schemaToZod } = await import('../schema-builder.js');
  const { startServer, displayServerInfo } = await import('./adapter-utils.js');

  // Load config
  const absolutePath = resolve(process.cwd(), filePath);
  const fileUrl = pathToFileURL(absolutePath).href;
  const module = await import(fileUrl);
  const config = module.default;

  if (!config) {
    console.error('Error: Config file must have a default export');
    process.exit(1);
  }

  if (!config.name || !config.version) {
    console.error('Error: Config must have "name" and "version" properties');
    process.exit(1);
  }

  console.error('[RunCommand] Loading config from:', filePath);
  console.error(`[RunCommand] Creating server: ${config.name} v${config.version}`);

  // Create server
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
      const isZodSchema =
        tool.parameters && typeof tool.parameters === 'object' && '_def' in tool.parameters;
      const parameters = isZodSchema ? tool.parameters : schemaToZod(tool.parameters as any);

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

  displayServerInfo(server);
  await startServer(server, { useHttp, port });
}

/**
 * Run a server file with the decorator API adapter
 */
async function runDecoratorAdapter(
  filePath: string,
  useHttp: boolean,
  port: number
): Promise<void> {
  // Import decorator adapter dependencies
  const { default: reflectMetadata } = await import('reflect-metadata');
  const { dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  // Import runtime from compiled dist
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const distPath = resolve(__dirname, '..');

  const { SimplyMCP } = await import(pathToFileURL(resolve(distPath, 'SimplyMCP.js')).href);
  const {
    getServerConfig,
    getTools,
    getPrompts,
    getResources,
    getParameterNames,
    getParameterInfo,
    inferZodSchema,
    extractJSDoc,
  } = await import(pathToFileURL(resolve(distPath, 'decorators.js')).href);

  const { parseTypeScriptFileWithCache, getMethodParameterTypes } = await import(
    pathToFileURL(resolve(distPath, 'type-parser.js')).href
  );
  const { startServer, displayServerInfo } = await import('./adapter-utils.js');

  // Load the class
  const absolutePath = resolve(process.cwd(), filePath);
  const fileUrl = pathToFileURL(absolutePath).href;
  const module = await import(fileUrl);

  const ServerClass =
    module.default ||
    Object.values(module).find((exp: any) => typeof exp === 'function' && exp.prototype);

  if (!ServerClass) {
    console.error('Error: No class found in module');
    process.exit(1);
  }

  const config = getServerConfig(ServerClass);
  if (!config) {
    console.error('Error: Class must be decorated with @MCPServer');
    process.exit(1);
  }

  console.error('[RunCommand] Loading class from:', filePath);
  console.error(`[RunCommand] Creating server: ${config.name} v${config.version}`);

  // Parse the source file to extract types
  const parsedClass = parseTypeScriptFileWithCache(filePath);

  const server = new SimplyMCP({
    name: config.name!,
    version: config.version!,
    port: config.port,
  });

  const instance = new ServerClass();

  // Helper function to convert method name to kebab-case
  const toKebabCase = (str: string): string =>
    str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();

  // Helper function to get public methods
  const getPublicMethods = (instance: any): string[] => {
    const methods: string[] = [];
    const proto = Object.getPrototypeOf(instance);
    Object.getOwnPropertyNames(proto).forEach((name) => {
      if (name === 'constructor' || name.startsWith('_')) return;
      if (typeof proto[name] === 'function') {
        methods.push(name);
      }
    });
    return methods;
  };

  // Helper function to merge parameter types
  const mergeParameterTypes = (runtimeParams: any[], parsedParams: any[]): any[] => {
    return runtimeParams.map((param: any, index: number) => {
      const parsed = parsedParams[index];
      if (parsed && parsed.name === param.name) {
        return {
          ...param,
          type: parsed.type || param.type,
          optional: parsed.optional,
          hasDefault: parsed.hasDefault,
          defaultValue: parsed.defaultValue !== undefined ? parsed.defaultValue : param.defaultValue,
        };
      }
      return param;
    });
  };

  // Get explicitly decorated items
  const decoratedTools = new Set(getTools(ServerClass).map((t: any) => t.methodName));
  const decoratedPrompts = new Set(getPrompts(ServerClass).map((p: any) => p.methodName));
  const decoratedResources = new Set(getResources(ServerClass).map((r: any) => r.methodName));

  const publicMethods = getPublicMethods(instance);

  // Register explicitly decorated tools
  const tools = getTools(ServerClass);
  for (const tool of tools) {
    const method = instance[tool.methodName];
    if (!method) continue;

    const runtimeParamInfo = getParameterInfo(method);
    const parsedParams = getMethodParameterTypes(parsedClass, tool.methodName);
    const paramInfo = mergeParameterTypes(runtimeParamInfo, parsedParams);
    const paramTypes = paramInfo.map((p: any) => p.type).filter(Boolean);
    const jsdoc = tool.jsdoc || extractJSDoc(method);
    const zodSchema = inferZodSchema(paramTypes, tool.methodName, paramInfo, jsdoc);
    const toolName = toKebabCase(tool.methodName);

    server.addTool({
      name: toolName,
      description: tool.description || jsdoc?.description || `Execute ${tool.methodName}`,
      parameters: zodSchema,
      execute: async (args: any) => {
        const params = paramInfo.map((p: any) => args[p.name]);
        const result = await method.apply(instance, params);
        return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      },
    });
  }

  // Auto-register public methods that aren't decorated
  for (const methodName of publicMethods) {
    if (
      decoratedTools.has(methodName) ||
      decoratedPrompts.has(methodName) ||
      decoratedResources.has(methodName)
    ) {
      continue;
    }

    const method = instance[methodName];
    if (!method) continue;

    const runtimeParamInfo = getParameterInfo(method);
    const parsedParams = getMethodParameterTypes(parsedClass, methodName);
    const paramInfo = mergeParameterTypes(runtimeParamInfo, parsedParams);
    const paramTypes = paramInfo.map((p: any) => p.type).filter(Boolean);
    const jsdoc = extractJSDoc(method);
    const zodSchema = inferZodSchema(paramTypes, methodName, paramInfo, jsdoc);
    const toolName = toKebabCase(methodName);

    server.addTool({
      name: toolName,
      description: jsdoc?.description || `Execute ${methodName}`,
      parameters: zodSchema,
      execute: async (args: any) => {
        const params = paramInfo.map((p: any) => args[p.name]);
        const result = await method.apply(instance, params);
        return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      },
    });
  }

  // Register prompts
  const prompts = getPrompts(ServerClass);
  for (const promptMeta of prompts) {
    const method = instance[promptMeta.methodName];
    if (!method) continue;

    const paramNames = getParameterNames(method);

    server.addPrompt({
      name: promptMeta.methodName,
      description: promptMeta.description || `Generate ${promptMeta.methodName} prompt`,
      arguments: paramNames.map((name: string) => ({
        name,
        description: `Parameter ${name}`,
        required: true,
      })),
      template: '{{__dynamic__}}',
    });
  }

  // Register resources
  const resources = getResources(ServerClass);
  for (const resourceMeta of resources) {
    const method = instance[resourceMeta.methodName];
    if (!method) continue;

    const content = method.apply(instance);

    server.addResource({
      uri: resourceMeta.uri,
      name: resourceMeta.name,
      description: resourceMeta.description || `Resource ${resourceMeta.name}`,
      mimeType: resourceMeta.mimeType,
      content,
    });
  }

  displayServerInfo(server);
  await startServer(server, { useHttp, port });
}

/**
 * Run a server file with the programmatic API (direct execution)
 */
async function runProgrammaticAdapter(
  filePath: string,
  _useHttp: boolean,
  _port: number
): Promise<void> {
  console.error('[RunCommand] Running programmatic server from:', filePath);
  console.error(
    '[RunCommand] Note: Programmatic servers manage their own transport configuration'
  );

  // For programmatic API, just import and execute the file
  // The file itself handles server creation and startup
  const absolutePath = resolve(process.cwd(), filePath);
  const fileUrl = pathToFileURL(absolutePath).href;

  try {
    await import(fileUrl);
  } catch (error) {
    console.error('[RunCommand] Failed to run server:', error);
    process.exit(2);
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
  if (argv.http) scriptArgs.push('--http');
  if (argv.port) scriptArgs.push('--port', String(argv.port));
  if (argv.style) scriptArgs.push('--style', argv.style);
  if (argv.verbose) scriptArgs.push('--verbose');
  if (argv['dry-run']) scriptArgs.push('--dry-run');
  if (argv.watch) scriptArgs.push('--watch');
  if (argv['watch-poll']) scriptArgs.push('--watch-poll');
  if (argv['watch-interval']) scriptArgs.push('--watch-interval', String(argv['watch-interval']));

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
  command: 'run <file..>',
  describe: 'Auto-detect and run MCP server(s)',
  builder: (yargs) => {
    return yargs
      .positional('file', {
        describe: 'Path to the server file(s)',
        type: 'string',
        demandOption: true,
      })
      .option('config', {
        describe: 'Path to config file (auto-detected if not specified)',
        type: 'string',
      })
      .option('http', {
        describe: 'Use HTTP transport instead of stdio',
        type: 'boolean',
      })
      .option('port', {
        describe: 'Port for HTTP server',
        type: 'number',
      })
      .option('style', {
        describe: 'Force specific API style',
        choices: ['decorator', 'functional', 'programmatic'] as const,
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
      });
  },
  handler: async (argv: any) => {
    const files = Array.isArray(argv.file) ? argv.file : [argv.file];
    const configPath = argv.config as string | undefined;

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

      // Resolve each file (could be file path or server name)
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
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
      const port = mergedOptions.port ?? 3000;
      const forceStyle = mergedOptions.style;
      const verbose = mergedOptions.verbose ?? false;
      const watch = mergedOptions.watch ?? false;
      const watchPoll = mergedOptions.watchPoll ?? false;
      const watchInterval = mergedOptions.watchInterval ?? 100;
      const dryRun = argv['dry-run'] as boolean;
      const inspect = argv.inspect as boolean;
      const inspectBrk = argv['inspect-brk'] as boolean;
      const inspectPort = argv['inspect-port'] as number;

      // Multi-server mode requires HTTP transport
      if (files.length > 1 && !useHttp) {
        console.error('[RunCommand] Multi-server mode detected, enabling HTTP transport automatically');
        useHttp = true;
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
          startPort: port,
          verbose,
          forceStyle,
        });
        return;
      }

      // Single server mode
      const filePath = resolvedFiles[0];

      // Detect or use forced style
      const style = forceStyle || (await detectAPIStyle(filePath));

      if (verbose) {
        console.error(`[RunCommand] Detected API style: ${style}`);
        if (forceStyle) {
          console.error(`[RunCommand] Style was forced via ${configFilePath ? 'config or' : ''} --style flag`);
        }
      }

      // If watch mode is enabled, start watch mode manager
      if (watch) {
        const { startWatchMode } = await import('./watch-mode.js');
        await startWatchMode({
          file: filePath,
          style,
          http: useHttp,
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
        await runDryRun(filePath, style, useHttp, port, jsonOutput);
        return;
      }

      // If inspect mode is enabled, spawn a child process with inspector
      if (inspect || inspectBrk) {
        const inspectFlag = inspectBrk ? '--inspect-brk' : '--inspect';
        await spawnWithInspector(inspectFlag, inspectPort, argv);
        return; // Never reached, spawnWithInspector exits the process
      }

      // Run appropriate adapter
      switch (style) {
        case 'decorator':
          await runDecoratorAdapter(filePath, useHttp, port);
          break;
        case 'functional':
          await runFunctionalAdapter(filePath, useHttp, port);
          break;
        case 'programmatic':
          await runProgrammaticAdapter(filePath, useHttp, port);
          break;
      }
    } catch (error) {
      console.error('[RunCommand] Error:', error);
      process.exit(2);
    }
  },
};
