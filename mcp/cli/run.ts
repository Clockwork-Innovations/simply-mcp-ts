/**
 * Run command for SimplyMCP CLI
 * Auto-detects API style and runs the appropriate adapter
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CommandModule } from 'yargs';

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
 * Yargs command definition for the run command
 */
export const runCommand: CommandModule = {
  command: 'run <file>',
  describe: 'Auto-detect and run an MCP server',
  builder: (yargs) => {
    return yargs
      .positional('file', {
        describe: 'Path to the server file',
        type: 'string',
        demandOption: true,
      })
      .option('http', {
        describe: 'Use HTTP transport instead of stdio',
        type: 'boolean',
        default: false,
      })
      .option('port', {
        describe: 'Port for HTTP server',
        type: 'number',
        default: 3000,
      })
      .option('style', {
        describe: 'Force specific API style',
        choices: ['decorator', 'functional', 'programmatic'] as const,
        type: 'string',
      })
      .option('verbose', {
        describe: 'Show detection details',
        type: 'boolean',
        default: false,
      });
  },
  handler: async (argv: any) => {
    const filePath = argv.file as string;
    const useHttp = argv.http as boolean;
    const port = argv.port as number;
    const forceStyle = argv.style as APIStyle | undefined;
    const verbose = argv.verbose as boolean;

    try {
      // Detect or use forced style
      const style = forceStyle || (await detectAPIStyle(filePath));

      if (verbose) {
        console.error(`[RunCommand] Detected API style: ${style}`);
        if (forceStyle) {
          console.error(`[RunCommand] Style was forced via --style flag`);
        }
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
