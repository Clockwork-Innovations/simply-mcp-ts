/**
 * Interface-Driven API Adapter
 *
 * Bridges interface definitions to BuildMCPServer core.
 * Loads TypeScript files, parses interfaces, and registers tools/prompts/resources.
 *
 * Note: Routers are an operational concern (not a type definition concern).
 * The adapter does not parse router definitions from interfaces.
 * Instead, users can add routers programmatically using the returned InterfaceServer instance.
 */

import { pathToFileURL } from 'url';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import ts from 'typescript';
import { BuildMCPServer } from './builder-server.js';
import { InterfaceServer } from './interface-server.js';
import { parseInterfaceFile, type ParseResult, type ParsedTool } from './parser.js';
import { typeNodeToZodSchema, generateSchemaFromTypeString } from '../core/schema-generator.js';
import { registerPrompts } from '../handlers/prompt-handler.js';
import { registerResources } from '../handlers/resource-handler.js';
import { registerCompletions } from '../handlers/completion-handler.js';
import type { UIWatchModeConfig } from '../types/config';
import { z } from 'zod';

/**
 * Options for loading an interface-driven server
 */
export interface InterfaceAdapterOptions {
  /** Path to the TypeScript file */
  filePath: string;
  /** Optional server name override */
  serverName?: string;
  /** Optional server version override */
  serverVersion?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Override transport type (CLI flags override file config) */
  http?: boolean;
  /** Override port number (CLI flags override file config) */
  port?: number;
  /** Override stateful mode (CLI flags override file config) */
  stateful?: boolean;
  /** UI watch mode configuration */
  uiWatch?: UIWatchModeConfig;
}

/**
 * Load and run an interface-driven MCP server
 */
export async function loadInterfaceServer(options: InterfaceAdapterOptions): Promise<InterfaceServer> {
  const { filePath, serverName, serverVersion, verbose } = options;

  if (verbose) {
    console.log(`[Interface Adapter] Parsing file: ${filePath}`);
  }

  // Step 1: Parse the TypeScript file to discover interfaces
  const parseResult = parseInterfaceFile(filePath);

  // DEBUG: Log UI parsing results
  console.error(`[DEBUG:UI-PARSER] Parsed ${parseResult.uis?.length || 0} UI interface(s) from ${filePath}`);
  if (parseResult.uis && parseResult.uis.length > 0) {
    parseResult.uis.forEach((ui, idx) => {
      console.error(`[DEBUG:UI-PARSER] UI[${idx}]: uri="${ui.uri}", html length=${ui.html?.length || 'none'}, file="${ui.file || 'none'}", component="${ui.component || 'none'}"`);
    });
  }

  if (verbose) {
    console.log(`[Interface Adapter] Parse results:`);
    console.log(`  - Server: ${parseResult.server?.name || 'none'}`);
    console.log(`  - Tools: ${parseResult.tools.length}`);
    console.log(`  - Prompts: ${parseResult.prompts.length}`);
    console.log(`  - Resources: ${parseResult.resources.length}`);
  }

  // Step 2: Load the module to get the implementation class
  const absolutePath = resolve(filePath);
  const fileUrl = pathToFileURL(absolutePath).href;

  // Add timestamp to avoid caching during development
  const moduleUrl = `${fileUrl}?t=${Date.now()}`;

  const module = await import(moduleUrl);
  let ServerClass = module.default;

  // If no default export, try named exports
  if (!ServerClass && parseResult.className) {
    if (verbose) {
      console.log(`[Interface Adapter] No default export found, checking for named export: ${parseResult.className}`);
    }
    ServerClass = module[parseResult.className];

    if (ServerClass) {
      if (verbose) {
        console.log(`[Interface Adapter] Found class '${parseResult.className}' as named export`);
      }
    }
  }

  if (!ServerClass) {
    throw new Error(`No default export or class '${parseResult.className || 'unknown'}' found in ${filePath}`);
  }

  // Step 3: Create server instance
  const serverInstance = new ServerClass();

  // Step 3.5: Auto-detect capabilities from parsed protocol features
  const capabilities: any = {};

  // Auto-enable sampling capability
  if (parseResult.samplings.length > 0) {
    capabilities.sampling = true;
  }

  // Auto-enable elicitation capability
  if (parseResult.elicitations.length > 0) {
    capabilities.elicitation = true;
  }

  // Auto-enable roots capability
  if (parseResult.roots.length > 0) {
    capabilities.roots = true;
  }

  // Auto-enable subscription capability for resources
  // Note: BuildMCPServer auto-enables resources.subscribe when resources exist
  // But we also track it here for subscriptions interfaces
  if (parseResult.subscriptions.length > 0) {
    // Subscriptions are part of resources capability
    // BuildMCPServer will handle the actual subscription logic
    // We just track that subscriptions were detected
  }

  // Auto-enable completions capability
  if (parseResult.completions.length > 0) {
    capabilities.completions = true;
  }

  // Step 4: Create BuildMCPServer instance with auto-detected capabilities
  const buildServer = new BuildMCPServer({
    name: serverName || parseResult.server?.name || 'interface-server',
    version: serverVersion || parseResult.server?.version || '1.0.0',
    description: parseResult.server?.description,
    silent: !verbose, // Suppress HandlerManager logging unless verbose mode enabled
    capabilities,
  });

  // Step 4.5: Inject BuildMCPServer reference into user's server instance
  // This allows user code to call this.server.notifyResourceUpdate() etc.
  if (serverInstance && typeof serverInstance === 'object') {
    (serverInstance as any).server = buildServer;
  }

  // Step 5: Register tools (with hybrid approach)
  let toolsToRegister = parseResult.tools;

  // Fallback: If no tools found via static analysis, try runtime inspection
  if (toolsToRegister.length === 0 && serverInstance.tools && Array.isArray(serverInstance.tools)) {
    if (verbose) {
      console.log('[Interface Adapter] No tools found via static analysis, using runtime tool instances');
    }

    // Extract tool information from runtime instances
    toolsToRegister = serverInstance.tools.map((toolInstance: any) => ({
      name: toolInstance.name,
      methodName: toolInstance.name, // Use tool name as method name for execute()
      description: toolInstance.description || `Tool: ${toolInstance.name}`,
      paramsType: 'any', // Runtime tools don't have TypeScript type info
      paramsNode: undefined, // No AST node available
      interfaceName: 'ITool', // Generic interface name
      isRuntimeTool: true, // Flag to indicate this came from runtime
      runtimeInstance: toolInstance, // Keep reference to actual instance
    }));

    if (verbose) {
      console.log(`[Interface Adapter] Found ${toolsToRegister.length} runtime tool(s): ${toolsToRegister.map(t => t.name).join(', ')}`);
    }
  } else if (verbose && toolsToRegister.length > 0) {
    console.log(`[Interface Adapter] Using ${toolsToRegister.length} statically analyzed tool(s)`);
  }

  // Register all tools (static or runtime)
  for (const tool of toolsToRegister) {
    await registerTool(buildServer, serverInstance, tool, filePath, verbose);
  }

  // Step 6: Register prompts
  if (parseResult.prompts.length > 0) {
    registerPrompts(buildServer, serverInstance, parseResult.prompts, verbose);
  }

  // Step 7: Register resources
  if (parseResult.resources.length > 0) {
    registerResources(buildServer, serverInstance, parseResult.resources, verbose);
  }

  // Step 7.1: Register UI resources (lazy-loaded)
  const hasUIResources = parseResult.uis && parseResult.uis.length > 0;
  if (hasUIResources) {
    const { registerUIResources } = await import('../adapters/ui-adapter.js');
    await registerUIResources(buildServer, parseResult.uis!, serverInstance, absolutePath);
    if (verbose) {
      console.log(`[Interface Adapter] Registered ${parseResult.uis!.length} UI resource(s)`);
    }
  }

  // Step 7.2: Initialize UI watch manager (if enabled and UI resources exist)
  if (options.uiWatch?.enabled && hasUIResources) {
    const { UIWatchManager } = await import('../features/ui/ui-watch-manager.js');
    const { invalidateReactCache } = await import('../features/ui/ui-react-compiler.js');
    const { invalidateFileCache } = await import('../features/ui/ui-file-resolver.js');

    const watchManager = new UIWatchManager({
      serverFilePath: filePath,
      enabled: true,
      debounceMs: options.uiWatch.debounceMs || 300,
      verbose: options.uiWatch.verbose || verbose || false,
      patterns: options.uiWatch.patterns,
      ignored: options.uiWatch.ignored,
    });

    // Event: Component changed → invalidate React cache + notify
    watchManager.on('componentChange', async (event) => {
      if (verbose || options.uiWatch?.verbose) {
        console.log(`[UI Watch] Component changed: ${event.filePath}`);
      }

      try {
        // Step 1: Invalidate cache
        invalidateReactCache(event.absolutePath);

        // Step 2: Get subscribable URIs for this file
        const { getSubscribableURIsForFile } = await import('../adapters/ui-adapter.js');
        const uris = getSubscribableURIsForFile(event.absolutePath);

        // Step 3: Notify all subscribers
        for (const uri of uris) {
          buildServer.notifyResourceUpdate(uri);
          if (verbose || options.uiWatch?.verbose) {
            console.log(`[UI Watch] Notified subscribers of ${uri}`);
          }
        }
      } catch (error) {
        console.error(`[UI Watch] Error handling component change:`, error);
        watchManager.emit('error', error instanceof Error ? error : new Error(String(error)));
      }
    });

    // Event: File changed → invalidate file cache
    watchManager.on('fileChange', async (event) => {
      if (verbose || options.uiWatch?.verbose) {
        console.log(`[UI Watch] File changed: ${event.filePath}`);
      }

      try {
        // Step 1: Invalidate cache
        invalidateFileCache(event.absolutePath);

        // Step 2: Get subscribable URIs for this file
        const { getSubscribableURIsForFile } = await import('../adapters/ui-adapter.js');
        const uris = getSubscribableURIsForFile(event.absolutePath);

        // Step 3: Notify all subscribers
        for (const uri of uris) {
          buildServer.notifyResourceUpdate(uri);
          if (verbose || options.uiWatch?.verbose) {
            console.log(`[UI Watch] Notified subscribers of ${uri}`);
          }
        }
      } catch (error) {
        console.error(`[UI Watch] Error handling file change:`, error);
        watchManager.emit('error', error instanceof Error ? error : new Error(String(error)));
      }
    });

    // Event: Script changed → invalidate file cache
    watchManager.on('scriptChange', async (event) => {
      if (verbose || options.uiWatch?.verbose) {
        console.log(`[UI Watch] Script changed: ${event.filePath}`);
      }

      try {
        // Step 1: Invalidate cache
        invalidateFileCache(event.absolutePath);

        // Step 2: Get subscribable URIs for this file
        const { getSubscribableURIsForFile } = await import('../adapters/ui-adapter.js');
        const uris = getSubscribableURIsForFile(event.absolutePath);

        // Step 3: Notify all subscribers
        for (const uri of uris) {
          buildServer.notifyResourceUpdate(uri);
          if (verbose || options.uiWatch?.verbose) {
            console.log(`[UI Watch] Notified subscribers of ${uri}`);
          }
        }
      } catch (error) {
        console.error(`[UI Watch] Error handling script change:`, error);
        watchManager.emit('error', error instanceof Error ? error : new Error(String(error)));
      }
    });

    // Event: Stylesheet changed → invalidate file cache
    watchManager.on('stylesheetChange', async (event) => {
      if (verbose || options.uiWatch?.verbose) {
        console.log(`[UI Watch] Stylesheet changed: ${event.filePath}`);
      }

      try {
        // Step 1: Invalidate cache
        invalidateFileCache(event.absolutePath);

        // Step 2: Get subscribable URIs for this file
        const { getSubscribableURIsForFile } = await import('../adapters/ui-adapter.js');
        const uris = getSubscribableURIsForFile(event.absolutePath);

        // Step 3: Notify all subscribers
        for (const uri of uris) {
          buildServer.notifyResourceUpdate(uri);
          if (verbose || options.uiWatch?.verbose) {
            console.log(`[UI Watch] Notified subscribers of ${uri}`);
          }
        }
      } catch (error) {
        console.error(`[UI Watch] Error handling stylesheet change:`, error);
        watchManager.emit('error', error instanceof Error ? error : new Error(String(error)));
      }
    });

    // Event: HTML changed → invalidate file cache
    watchManager.on('htmlChange', async (event) => {
      if (verbose || options.uiWatch?.verbose) {
        console.log(`[UI Watch] HTML changed: ${event.filePath}`);
      }

      try {
        // Step 1: Invalidate cache
        invalidateFileCache(event.absolutePath);

        // Step 2: Get subscribable URIs for this file
        const { getSubscribableURIsForFile } = await import('../adapters/ui-adapter.js');
        const uris = getSubscribableURIsForFile(event.absolutePath);

        // Step 3: Notify all subscribers
        for (const uri of uris) {
          buildServer.notifyResourceUpdate(uri);
          if (verbose || options.uiWatch?.verbose) {
            console.log(`[UI Watch] Notified subscribers of ${uri}`);
          }
        }
      } catch (error) {
        console.error(`[UI Watch] Error handling HTML change:`, error);
        watchManager.emit('error', error instanceof Error ? error : new Error(String(error)));
      }
    });

    // Event: Error occurred
    watchManager.on('error', (error) => {
      console.error('[UI Watch] Error:', error.message);
    });

    // Start the watch manager
    await watchManager.start();

    if (verbose) {
      console.log('[Interface Adapter] UI watch mode enabled');
    }

    // Graceful shutdown handling
    const shutdown = async () => {
      if (verbose) {
        console.log('[Interface Adapter] Shutting down UI watch manager...');
      }
      await watchManager.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  // Step 7.5: Register completion handlers
  if (parseResult.completions.length > 0) {
    registerCompletions(buildServer, serverInstance, parseResult.completions, verbose);
  }

  // Step 8: Log detected protocol features (when not silent)
  if (verbose) {
    if (parseResult.samplings.length > 0) {
      console.log(`[Interface Adapter] Detected ${parseResult.samplings.length} sampling interface(s)`);
    }
    if (parseResult.elicitations.length > 0) {
      console.log(`[Interface Adapter] Detected ${parseResult.elicitations.length} elicitation interface(s)`);
    }
    if (parseResult.roots.length > 0) {
      console.log(`[Interface Adapter] Detected ${parseResult.roots.length} roots interface(s)`);
    }
    if (parseResult.subscriptions.length > 0) {
      console.log(`[Interface Adapter] Detected ${parseResult.subscriptions.length} subscription interface(s)`);
    }
    if (parseResult.completions.length > 0) {
      console.log(`[Interface Adapter] Detected ${parseResult.completions.length} completion interface(s)`);
    }
  }

  if (verbose) {
    console.log(`[Interface Adapter] Server loaded successfully`);
  }

  // Step 9: Resolve final configuration (CLI flags override file config)
  // Transport: CLI --http flag > file transport > default 'stdio'
  const transport = options.http ? 'http' : (parseResult.server?.transport || 'stdio');

  // Port: CLI --port > file port > default 3000
  const port = options.port ?? parseResult.server?.port ?? 3000;

  // Stateful: CLI --stateful > file stateful > default true
  const stateful = options.stateful ?? parseResult.server?.stateful ?? true;

  if (verbose) {
    console.log(`[Interface Adapter] Configuration resolved:`);
    console.log(`  - Transport: ${transport} (from ${options.http ? 'CLI flag' : parseResult.server?.transport ? 'file' : 'default'})`);
    console.log(`  - Port: ${port} (from ${options.port !== undefined ? 'CLI flag' : parseResult.server?.port ? 'file' : 'default'})`);
    console.log(`  - Stateful: ${stateful} (from ${options.stateful !== undefined ? 'CLI flag' : parseResult.server?.stateful !== undefined ? 'file' : 'default'})`);
    if (parseResult.server?.auth) {
      console.log(`  - Auth: ${parseResult.server.auth.type} (configured in file, ready for wiring)`);
    }
  }

  // Step 10: Wrap BuildMCPServer in InterfaceServer to expose MCP protocol methods
  const interfaceServer = new InterfaceServer(buildServer);

  // Store the resolved configuration on the server instance for runtime access
  // This allows start() to use file-based config when no options are provided
  interfaceServer.setRuntimeConfig({
    transport,
    port,
    stateful,
    auth: parseResult.server?.auth,
    capabilities, // Include auto-detected protocol capabilities
  });

  return interfaceServer;
}

/**
 * Register a tool with the MCP server
 */
async function registerTool(
  server: BuildMCPServer,
  serverInstance: any,
  tool: ParsedTool | any, // Allow runtime tool objects
  filePath: string,
  verbose?: boolean
): Promise<void> {
  const { name, methodName, description, paramsNode } = tool;

  // Handle runtime tools (from serverInstance.tools array)
  if (tool.isRuntimeTool && tool.runtimeInstance) {
    if (verbose) {
      console.log(`[Interface Adapter] Registering runtime tool: ${name}`);
    }

    const runtimeTool = tool.runtimeInstance;

    // Check if runtime tool has execute method
    if (typeof runtimeTool.execute !== 'function') {
      throw new Error(
        `Runtime tool "${name}" must have an execute() method`
      );
    }

    // For runtime tools, use a permissive schema since we don't have TypeScript type info
    const schema = z.object({}).passthrough(); // Accept any properties

    // Register the tool using the runtime instance's execute method
    server.addTool({
      name,
      description: description || `Tool: ${name}`,
      parameters: schema,
      execute: async (args) => {
        // Call execute on the runtime tool instance
        return await runtimeTool.execute.call(runtimeTool, args);
      },
    });

    return;
  }

  // Handle statically analyzed tools (original behavior)
  // Check if method exists on server instance
  const method = serverInstance[methodName];

  if (!method) {
    // Get available methods for helpful error message
    const availableMethods = Object.keys(serverInstance)
      .filter(key => typeof serverInstance[key] === 'function')
      .map(key => `  - ${key}`)
      .join('\n');

    // Check if there's a snake_case version that might be the issue
    const snakeCaseMethodName = name.replace(/-/g, '_');
    const hasSnakeCaseMethod = serverInstance[snakeCaseMethodName];

    let errorMessage =
      `❌ Tool "${name}" requires method "${methodName}" but it was not found on server class.\n\n` +
      `Expected pattern:\n` +
      `  interface ${tool.interfaceName} extends ITool {\n` +
      `    name: '${name}';  // ← Tool name (snake_case)\n` +
      `    // ...\n` +
      `  }\n\n` +
      `  export default class YourServer {\n` +
      `    ${methodName}: ${tool.interfaceName} = async (params) => { ... };  // ← Method (camelCase)\n` +
      `  }\n\n`;

    if (hasSnakeCaseMethod) {
      errorMessage +=
        `⚠️  Common Mistake: Found method "${snakeCaseMethodName}" but expected "${methodName}"\n` +
        `   Tool names use snake_case, but method names must use camelCase!\n\n`;
    }

    if (availableMethods) {
      errorMessage += `Available methods on your class:\n${availableMethods}\n\n`;
    }

    errorMessage +=
      `📚 Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/INTERFACE_API_REFERENCE.md`;

    throw new Error(errorMessage);
  }

  if (typeof method !== 'function') {
    throw new Error(
      `❌ Tool "${name}" method "${methodName}" is not a function (found: ${typeof method})\n\n` +
      `Expected: ${methodName}: ${tool.interfaceName} = async (params) => { ... };\n\n` +
      `📚 Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/INTERFACE_API_REFERENCE.md`
    );
  }

  if (verbose) {
    console.log(`[Interface Adapter] Registering static tool: ${name} -> ${methodName}()`);
  }

  // Generate Zod schema from TypeScript type
  const schema = generateSchema(tool, filePath);

  // Register the tool
  server.addTool({
    name,
    description: description || `Tool: ${name}`,
    parameters: schema,
    execute: async (args) => {
      // Call the method on the server instance
      return await method.call(serverInstance, args);
    },
  });
}

/**
 * Generate Zod schema from tool parameter type
 */
function generateSchema(tool: ParsedTool, filePath: string): z.ZodTypeAny {
  // If we have the AST node, use it for accurate schema generation
  if (tool.paramsNode) {
    try {
      // Create a TypeChecker for resolving IParam interfaces
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        strict: true,
      };

      const compilerHost = ts.createCompilerHost(compilerOptions);
      const program = ts.createProgram([resolve(filePath)], compilerOptions, compilerHost);
      const checker = program.getTypeChecker();

      // Get the source file from the program (so types are resolved)
      const sourceFile = program.getSourceFile(resolve(filePath));
      if (!sourceFile) {
        throw new Error('Failed to get source file from program');
      }

      // Re-find the tool interface in the new program's AST
      // We need to do this because tool.paramsNode is from a different program/sourceFile
      let paramsTypeNode: ts.TypeNode | undefined;

      function findToolInterface(node: ts.Node): void {
        if (ts.isInterfaceDeclaration(node)) {
          const interfaceName = node.name.text;

          // Check if this is our tool interface
          if (interfaceName === tool.interfaceName) {
            // Found the interface, now extract the params property type
            for (const member of node.members) {
              if (ts.isPropertySignature(member) && member.name) {
                const memberName = member.name.getText(sourceFile);
                if (memberName === 'params' && member.type) {
                  paramsTypeNode = member.type;
                  return;
                }
              }
            }
          }
        }

        ts.forEachChild(node, findToolInterface);
      }

      findToolInterface(sourceFile);

      if (!paramsTypeNode) {
        throw new Error(`Could not find params type for ${tool.interfaceName}`);
      }

      return typeNodeToZodSchema(paramsTypeNode, sourceFile, undefined, checker);
    } catch (error: any) {
      console.warn(
        `[Interface Adapter] Failed to generate schema for ${tool.name}: ${error.message}`
      );
      // Fallback to simple schema
    }
  }

  // Fallback: use string-based generation
  return generateSchemaFromTypeString(tool.paramsType, tool.paramsNode);
}

/**
 * Validate that a file uses the interface-driven API
 */
export function isInterfaceFile(filePath: string): boolean {
  try {
    const parseResult = parseInterfaceFile(filePath);
    // Must have a server interface and at least one tool
    return !!parseResult.server && parseResult.tools.length > 0;
  } catch (error) {
    return false;
  }
}
