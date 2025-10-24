/**
 * Package Bundle Runner
 *
 * This module provides functionality to run npm package bundles as MCP servers.
 * It delegates to existing API style detection and execution logic after resolving
 * the bundle's entry point.
 *
 * Feature Layer: Includes auto-install functionality for dependencies.
 * Automatically detects package manager and installs dependencies if needed.
 */

import { resolve } from 'node:path';
import { readPackageJson, resolveEntryPointWithFallback } from './package-detector.js';
import { detectAPIStyle, type APIStyle } from './run.js';
import {
  areDependenciesInstalled,
  detectPackageManager,
  installDependencies,
  type PackageManager,
} from './dependency-manager.js';

/**
 * Options for running a package bundle
 * These match the existing run command options
 */
export interface RunOptions {
  /** Use HTTP transport instead of stdio */
  http?: boolean;
  /** Use HTTP transport in stateless mode */
  httpStateless?: boolean;
  /** Port for HTTP server */
  port?: number;
  /** Force specific API style */
  style?: APIStyle;
  /** Show detection details and config info */
  verbose?: boolean;
  /** Auto-install dependencies if not present (default: true) */
  autoInstall?: boolean;
  /** Specify package manager (auto-detect if not specified) */
  packageManager?: PackageManager;
  /** Force reinstall dependencies even if already installed */
  forceInstall?: boolean;
}

/**
 * Run a package bundle as an MCP server
 *
 * This function:
 * 1. Reads and validates package.json
 * 2. Resolves the entry point file
 * 3. Detects the API style (or uses forced style)
 * 4. Delegates to the appropriate adapter for execution
 *
 * @param bundlePath - Path to the package bundle directory
 * @param options - Run options (transport, port, style, etc.)
 * @throws Error if package.json is invalid or entry point cannot be resolved
 *
 * @example
 * ```typescript
 * await runPackageBundle('./my-mcp-server', {
 *   http: true,
 *   port: 3000,
 *   verbose: true
 * });
 * ```
 */
export async function runPackageBundle(
  bundlePath: string,
  options: RunOptions
): Promise<void> {
  const absoluteBundlePath = resolve(process.cwd(), bundlePath);

  if (options.verbose) {
    console.error(`[BundleRunner] Detected package bundle: ${bundlePath}`);
  }

  try {
    // Read and validate package.json
    const pkg = await readPackageJson(absoluteBundlePath);

    if (options.verbose) {
      console.error(`[BundleRunner] Package: ${pkg.name}@${pkg.version}`);
      if (pkg.description) {
        console.error(`[BundleRunner] Description: ${pkg.description}`);
      }
    }

    // Check and install dependencies if needed
    const autoInstall = options.autoInstall ?? true;
    const forceInstall = options.forceInstall ?? false;
    const depsInstalled = await areDependenciesInstalled(absoluteBundlePath);

    if (!depsInstalled || forceInstall) {
      if (autoInstall) {
        const packageManager = options.packageManager || detectPackageManager(absoluteBundlePath);

        if (options.verbose) {
          console.error(`[BundleRunner] Dependencies ${forceInstall ? 'will be reinstalled' : 'not found'}`);
          console.error(`[BundleRunner] Using package manager: ${packageManager}`);
        }

        try {
          await installDependencies(absoluteBundlePath, {
            packageManager,
            silent: !options.verbose,
            force: forceInstall,
          });
        } catch (error) {
          if (error instanceof Error) {
            console.error(`[BundleRunner] Failed to install dependencies: ${error.message}`);
            if (options.verbose && error.stack) {
              console.error(`[BundleRunner] Stack: ${error.stack}`);
            }
          }
          throw new Error(`Dependency installation failed. Cannot run bundle without dependencies.`);
        }
      } else {
        console.error(`[BundleRunner] Warning: Dependencies not installed and auto-install is disabled`);
        console.error(`[BundleRunner] The bundle may not work correctly without dependencies`);
      }
    } else if (options.verbose) {
      console.error(`[BundleRunner] Dependencies already installed`);
    }

    // Resolve entry point
    const entryPoint = await resolveEntryPointWithFallback(pkg, absoluteBundlePath);

    if (options.verbose) {
      console.error(`[BundleRunner] Resolved entry point: ${entryPoint}`);
    }

    // Detect or use forced API style
    const style = options.style || (await detectAPIStyle(entryPoint));

    if (options.verbose) {
      console.error(`[BundleRunner] Detected API style: ${style}`);
      if (options.style) {
        console.error(`[BundleRunner] Style was forced via --style flag`);
      }
    }

    // Import adapter functions
    // We use dynamic imports to avoid circular dependencies
    const { runInterfaceAdapter } = await import('./run.js').then(mod => ({
      runInterfaceAdapter: async (
        filePath: string,
        useHttp: boolean,
        useHttpStateless: boolean,
        port: number,
        verbose: boolean
      ) => {
        await import('reflect-metadata');
        const { loadInterfaceServer } = await import('../api/interface/index.js');
        const { startServer, displayServerInfo } = await import('./adapter-utils.js');

        const server = await loadInterfaceServer({
          filePath: filePath,
          verbose: verbose || false,
        });

        displayServerInfo(server);
        await startServer(server, { useHttp: useHttp || useHttpStateless, port, verbose, stateful: !useHttpStateless });
      }
    }));

    const { runDecoratorAdapter } = await import('./run.js').then(mod => ({
      runDecoratorAdapter: async (
        filePath: string,
        useHttp: boolean,
        useHttpStateless: boolean,
        port: number,
        verbose: boolean
      ) => {
        // Import decorator adapter dependencies
        await import('reflect-metadata');
        const { dirname } = await import('node:path');
        const { fileURLToPath, pathToFileURL } = await import('node:url');
        const { readFile } = await import('node:fs/promises');

        // Import runtime from compiled dist
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const distPath = resolve(__dirname, '..');

        const { BuildMCPServer } = await import(pathToFileURL(resolve(distPath, 'api/programmatic/BuildMCPServer.js')).href);
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

        // Import loadTypeScriptFile helper
        const { loadTypeScriptFile } = await import('./run.js').then(m => ({ loadTypeScriptFile: m.loadTypeScriptFile }));

        // Load the class
        const absolutePath = resolve(process.cwd(), filePath);
        const module = await loadTypeScriptFile(absolutePath);

        const ServerClass =
          module.default ||
          Object.values(module).find((exp: any) => typeof exp === 'function' && exp.prototype);

        if (!ServerClass) {
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

        const server = new BuildMCPServer({
          name: config.name!,
          version: config.version!,
          description: config.description,
          transport: config.transport,
          capabilities: config.capabilities,
        });

        const instance = new ServerClass();

        // Helper functions
        const toKebabCase = (str: string): string =>
          str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();

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

        const decoratedTools = new Set(getTools(ServerClass).map((t: any) => t.methodName));
        const decoratedPrompts = new Set(getPrompts(ServerClass).map((p: any) => p.methodName));
        const decoratedResources = new Set(getResources(ServerClass).map((r: any) => r.methodName));

        const publicMethods = getPublicMethods(instance);

        // Register tools
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

        // Auto-register public methods
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
        await startServer(server, { useHttp: useHttp || useHttpStateless, port, verbose, stateful: !useHttpStateless });
      }
    }));

    const { runFunctionalAdapter } = await import('./run.js').then(mod => ({
      runFunctionalAdapter: async (
        filePath: string,
        useHttp: boolean,
        useHttpStateless: boolean,
        port: number,
        verbose: boolean
      ) => {
        const { BuildMCPServer } = await import('../api/programmatic/BuildMCPServer.js');
        const { schemaToZod } = await import('../schema-builder.js');
        const { startServer, displayServerInfo } = await import('./adapter-utils.js');

        // Import loadTypeScriptFile helper
        const { loadTypeScriptFile } = await import('./run.js').then(m => ({ loadTypeScriptFile: m.loadTypeScriptFile }));

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

        const server = new BuildMCPServer({
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
        await startServer(server, { useHttp: useHttp || useHttpStateless, port, verbose, stateful: !useHttpStateless });
      }
    }));

    const { runProgrammaticAdapter } = await import('./run.js').then(mod => ({
      runProgrammaticAdapter: async (
        filePath: string,
        useHttp: boolean,
        useHttpStateless: boolean,
        port: number,
        verbose: boolean
      ) => {
        const absolutePath = resolve(process.cwd(), filePath);

        try {
          // Import loadTypeScriptFile helper
          const { loadTypeScriptFile } = await import('./run.js').then(m => ({ loadTypeScriptFile: m.loadTypeScriptFile }));

          const module = await loadTypeScriptFile(absolutePath);

          // Check for isSimplyMCPInstance helper
          const isSimplyMCPInstance = (value: any): boolean => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return (
              typeof value.addTool === 'function' &&
              typeof value.addPrompt === 'function' &&
              typeof value.addResource === 'function' &&
              typeof value.start === 'function' &&
              typeof value.getInfo === 'function' &&
              typeof value.getStats === 'function'
            );
          };

          const serverInstance = module.default || module.server;

          if (serverInstance && isSimplyMCPInstance(serverInstance)) {
            if (verbose) {
              console.error('[RunCommand] Detected exported BuildMCPServer instance');
              console.error(`[RunCommand] Transport: ${useHttp ? 'HTTP' : 'STDIO'}`);
              if (useHttp) {
                console.error(`[RunCommand] Port: ${port}`);
              }
            }

            const { startServer, displayServerInfo } = await import('./adapter-utils.js');
            displayServerInfo(serverInstance);
            await startServer(serverInstance, { useHttp: useHttp || useHttpStateless, port, verbose, stateful: !useHttpStateless });
          } else {
            console.error(
              '[RunCommand] Note: Programmatic servers manage their own transport configuration'
            );
          }
        } catch (error) {
          console.error('[RunCommand] Failed to run server:', error);
          process.exit(2);
        }
      }
    }));

    // Execute the appropriate adapter based on detected style
    const useHttp = options.http ?? false;
    const useHttpStateless = options.httpStateless ?? false;
    const port = options.port ?? 3000;
    const verbose = options.verbose ?? false;

    switch (style) {
      case 'interface':
        await runInterfaceAdapter(entryPoint, useHttp, useHttpStateless, port, verbose);
        break;
      case 'programmatic':
        await runProgrammaticAdapter(entryPoint, useHttp, useHttpStateless, port, verbose);
        break;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[BundleRunner] Error: ${error.message}`);
      if (options.verbose && error.stack) {
        console.error(`[BundleRunner] Stack: ${error.stack}`);
      }
    } else {
      console.error(`[BundleRunner] Error:`, error);
    }
    process.exit(1);
  }
}
