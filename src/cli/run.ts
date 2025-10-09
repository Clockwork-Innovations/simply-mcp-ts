/**
 * Run command for SimplyMCP CLI
 * Auto-detects API style and runs the appropriate adapter
 */

import 'reflect-metadata';
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
export type APIStyle = 'interface' | 'decorator' | 'functional' | 'programmatic' | 'mcp-builder';

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

    // Check for interface API (highest priority)
    // Look for ITool, IPrompt, IResource, or IServer interface extensions
    if (/extends\s+(ITool|IPrompt|IResource|IServer)/.test(content)) {
      return 'interface';
    }

    // Check for decorator API (high priority)
    // Look for @MCPServer decorator
    if (/@MCPServer(\s*\()?/.test(content)) {
      return 'decorator';
    }

    // Check for MCP Builder API (high priority)
    // Look for defineMCPBuilder or createMCPBuilder
    if (/(defineMCPBuilder|createMCPBuilder|MCPBuilderConfig|ToolPreset)/.test(content)) {
      return 'mcp-builder';
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
  port: number,
  verbose: boolean = false
): Promise<void> {
  const { SimplyMCP } = await import('../SimplyMCP.js');
  const { schemaToZod } = await import('../schema-builder.js');
  const { startServer, displayServerInfo } = await import('./adapter-utils.js');

  // Load config
  const absolutePath = resolve(process.cwd(), filePath);
  const module = await loadTypeScriptFile(absolutePath);
  const config = module.default;

  if (!config) {
    console.error('Error: Config file must have a default export');
    process.exit(1);
  }

  if (!config.name || !config.version) {
    console.error('Error: Config must have "name" and "version" properties');
    process.exit(1);
  }

  console.error(`[RunCommand] Creating server: ${config.name} v${config.version}`);

  // Create server
  const server = new SimplyMCP({
    name: config.name,
    version: config.version,
    basePath: config.basePath,
    defaultTimeout: config.defaultTimeout,
    transport: config.port ? { port: config.port } : undefined,
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
  await startServer(server, { useHttp, port, verbose });
}

/**
 * Run a server file with the decorator API adapter
 */
async function runDecoratorAdapter(
  filePath: string,
  useHttp: boolean,
  port: number,
  verbose: boolean = false
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
  const module = await loadTypeScriptFile(absolutePath);

  const ServerClass =
    module.default ||
    Object.values(module).find((exp: any) => typeof exp === 'function' && exp.prototype);

  if (!ServerClass) {
    // Check if there's a decorated class that wasn't exported
    const source = await readFile(absolutePath, 'utf-8');
    const hasDecoratedClass = /@MCPServer(\s*\(\s*\))?/.test(source) && /class\s+\w+/.test(source);

    if (hasDecoratedClass) {
      console.error('Error: Found @MCPServer decorated class but it is not exported');
      console.error('');
      console.error('The class must be exported for the JavaScript module system to load it.');
      console.error('');
      console.error('Fix: Add "export default" to your class:');
      console.error('');
      console.error('  @MCPServer()');
      console.error('  export default class MyServer {');
      console.error('    // ...');
      console.error('  }');
      console.error('');
      console.error('Why? Non-exported classes are never evaluated by the JS engine,');
      console.error('so decorators never run. This is a JavaScript limitation, not a SimplyMCP one.');
    } else {
      console.error('Error: No class found in module');
      console.error('');
      console.error('Make sure your file exports a class decorated with @MCPServer()');
    }
    process.exit(1);
  }

  const config = getServerConfig(ServerClass);
  if (!config) {
    console.error('Error: Class must be decorated with @MCPServer');
    process.exit(1);
  }

  console.error(`[RunCommand] Creating server: ${config.name} v${config.version}`);

  // Parse the source file to extract types
  const parsedClass = parseTypeScriptFileWithCache(filePath);

  const server = new SimplyMCP({
    name: config.name!,
    version: config.version!,
    description: config.description,
    transport: config.transport,
    capabilities: config.capabilities,
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
  await startServer(server, { useHttp, port, verbose });
}

/**
 * Run a server file with the interface API adapter
 */
async function runInterfaceAdapter(
  filePath: string,
  useHttp: boolean,
  port: number,
  verbose: boolean = false
): Promise<void> {
  // Import interface adapter
  const { loadInterfaceServer } = await import('../api/interface/index.js');
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
    });

    displayServerInfo(server);
    await startServer(server, { useHttp, port, verbose });
  } catch (error) {
    console.error('[RunCommand] Failed to run interface server:', error);
    if (error instanceof Error && error.stack && verbose) {
      console.error('[RunCommand] Stack:', error.stack);
    }
    process.exit(2);
  }
}

/**
 * Run a server file with the programmatic API (direct execution)
 */
async function runProgrammaticAdapter(
  filePath: string,
  _useHttp: boolean,
  _port: number,
  verbose: boolean = false
): Promise<void> {
  console.error(
    '[RunCommand] Note: Programmatic servers manage their own transport configuration'
  );

  // For programmatic API, just import and execute the file
  // The file itself handles server creation and startup
  const absolutePath = resolve(process.cwd(), filePath);

  try {
    await loadTypeScriptFile(absolutePath);
  } catch (error) {
    console.error('[RunCommand] Failed to run server:', error);
    process.exit(2);
  }
}

/**
 * Run a server file with the MCP Builder API adapter
 */
async function runMCPBuilderAdapter(
  filePath: string,
  useHttp: boolean,
  port: number,
  verbose: boolean = false
): Promise<void> {
  // Import MCP Builder adapter
  const { loadMCPBuilderServer } = await import('../api/mcp/adapter.js');
  const { startServer, displayServerInfo } = await import('./adapter-utils.js');

  // Load the MCP Builder server
  const absolutePath = resolve(process.cwd(), filePath);

  if (verbose) {
    console.error(`[RunCommand] Loading MCP Builder server from: ${filePath}`);
  }

  try {
    const server = await loadMCPBuilderServer(absolutePath);

    displayServerInfo(server);
    await startServer(server, { useHttp, port, verbose });
  } catch (error) {
    console.error('[RunCommand] Failed to run MCP Builder server:', error);
    if (error instanceof Error && error.stack && verbose) {
      console.error('[RunCommand] Stack:', error.stack);
    }
    process.exit(2);
  }
}

/**
 * Scan current directory for potential MCP server files
 * Looks for .ts and .js files containing interface, @MCPServer, or defineMCP patterns
 */
async function discoverServers(cwd: string = process.cwd()): Promise<string[]> {
  try {
    const files = await readdir(cwd);
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
          /extends\s+(ITool|IPrompt|IResource|IServer)/.test(content) ||
          /@MCPServer(\s*\()?/.test(content) ||
          /defineMCP\s*\(/.test(content)
        ) {
          potentialServers.push(file);
        }
      } catch {
        // Skip files we can't read
        continue;
      }
    }

    return potentialServers;
  } catch {
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
      console.error('  2. Use @MCPServer decorator or defineMCP function');
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
        describe: 'Use HTTP transport instead of stdio',
        type: 'boolean',
      })
      .option('port', {
        describe: 'Port for HTTP server',
        type: 'number',
      })
      .option('style', {
        describe: 'Force specific API style',
        choices: ['interface', 'decorator', 'functional', 'programmatic', 'mcp-builder'] as const,
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
    const files = argv.file ? (Array.isArray(argv.file) ? argv.file : [argv.file]) : [];
    const configPath = argv.config as string | undefined;

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
      if (argv.http) scriptArgs.push('--http');
      if (argv.port) scriptArgs.push('--port', String(argv.port));
      if (argv.style) scriptArgs.push('--style', argv.style);
      if (argv.verbose) scriptArgs.push('--verbose');
      if (argv['dry-run']) scriptArgs.push('--dry-run');
      if (argv.watch) scriptArgs.push('--watch');
      if (argv['watch-poll']) scriptArgs.push('--watch-poll');
      if (argv['watch-interval']) scriptArgs.push('--watch-interval', String(argv['watch-interval']));

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
          console.error(`[RunCommand] Style was forced via --style flag`);
        }
        // Output loading message early so it appears even if respawn happens
        const absolutePath = resolve(process.cwd(), filePath);
        switch (style) {
          case 'interface':
            console.error('[Adapter] Loading interface server from:', filePath);
            break;
          case 'decorator':
            console.error('[Adapter] Loading class from:', filePath);
            break;
          case 'functional':
            console.error('[Adapter] Loading config from:', filePath);
            break;
          case 'mcp-builder':
            console.error('[Adapter] Loading MCP Builder config from:', filePath);
            break;
          case 'programmatic':
            console.error('[Adapter] Loading server from:', filePath);
            break;
        }
        // Also output transport info early
        // Note: For programmatic adapters, the server file manages its own transport,
        // but we still report what was requested via CLI flags
        console.error(`[Adapter] Transport: ${useHttp ? 'HTTP' : 'STDIO'}`);
        if (useHttp) {
          console.error(`[Adapter] Port: ${port}`);
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
        case 'interface':
          await runInterfaceAdapter(filePath, useHttp, port, verbose);
          break;
        case 'decorator':
          await runDecoratorAdapter(filePath, useHttp, port, verbose);
          break;
        case 'functional':
          await runFunctionalAdapter(filePath, useHttp, port, verbose);
          break;
        case 'mcp-builder':
          await runMCPBuilderAdapter(filePath, useHttp, port, verbose);
          break;
        case 'programmatic':
          await runProgrammaticAdapter(filePath, useHttp, port, verbose);
          break;
      }
    } catch (error) {
      console.error('[RunCommand] Error:', error);
      process.exit(2);
    }
  },
};
