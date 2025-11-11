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
import type ts from 'typescript';
import { BuildMCPServer } from './builder-server.js';
import { InterfaceServer } from './interface-server.js';
import { parseInterfaceFile, type ParseResult, type ParsedTool } from './parser.js';
import { typeNodeToZodSchema, generateSchemaFromTypeString } from '../core/schema-generator.js';

/**
 * Import TypeScript detection utility
 * Provides robust multi-method detection across package managers
 */
import { ensureTypeScript } from '../core/typescript-detector.js';

import { registerPrompts } from '../handlers/prompt-handler.js';
import { registerResources } from '../handlers/resource-handler.js';
import { registerCompletions } from '../handlers/completion-handler.js';
import { DatabaseManager } from '../core/database-manager.js';
import type { UIWatchModeConfig } from '../types/config';
import { z } from 'zod';
import { readManifest, type BundleManifest } from '../core/bundle-manifest.js';
import { dirname, join, basename } from 'path';
import { readFile } from 'fs/promises';

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

  // Step 0: Try to load bundle manifest or schemas file (for bundled servers with tool schemas)
  let bundleManifest: BundleManifest | undefined;
  try {
    // First try to load from bundle.json (archive bundles)
    const fileDir = dirname(resolve(filePath));
    bundleManifest = await readManifest(fileDir);
    if (verbose && bundleManifest.toolSchemas) {
      console.log(`[Interface Adapter] Loaded tool schemas for ${Object.keys(bundleManifest.toolSchemas).length} tool(s) from bundle manifest`);
    }
  } catch (error) {
    // No bundle.json found - try loading from .schemas.json sidecar (single-file bundles)
    try {
      const schemasPath = resolve(filePath).replace(/\.js$/, '.schemas.json');
      const schemasContent = await readFile(schemasPath, 'utf-8');
      const schemasData = JSON.parse(schemasContent);

      if (schemasData.toolSchemas) {
        // Create a minimal manifest-like object with just the schemas
        bundleManifest = { toolSchemas: schemasData.toolSchemas } as any;

        if (verbose) {
          console.log(`[Interface Adapter] Loaded tool schemas for ${Object.keys(schemasData.toolSchemas).length} tool(s) from ${basename(schemasPath)}`);
        }
      }
    } catch (schemasError) {
      // No schemas file found - this is normal for non-bundled servers
      // Silently continue without schemas
    }
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

  // DEBUG: Log file loading to detect unexpected .md execution
  console.error('[DEBUG:ADAPTER] ========== LOADING MODULE ==========');
  console.error('[DEBUG:ADAPTER] timestamp:', new Date().toISOString());
  console.error('[DEBUG:ADAPTER] filePath:', filePath);
  console.error('[DEBUG:ADAPTER] absolutePath:', absolutePath);
  console.error('[DEBUG:ADAPTER] fileUrl:', fileUrl);
  console.error('[DEBUG:ADAPTER] =======================================');

  // Add timestamp to avoid caching during development
  const moduleUrl = `${fileUrl}?t=${Date.now()}`;

  const module = await import(moduleUrl);
  let ServerClass = module.default;

  // Handle CommonJS bundles: When importing CommonJS as ESM, the actual export is at module.default.default
  // This happens because esbuild bundles to CommonJS format (module.exports = ...)
  // but the adapter uses ES module import() which wraps CommonJS exports
  if (ServerClass && typeof ServerClass === 'object' && ServerClass.default) {
    ServerClass = ServerClass.default;
  }

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

  // Step 3: Create server instance
  // Support two patterns:
  // 1. Class-based: export default class Server { ... }
  // 2. Bare interface: const greet: GreetTool = async () => { ... }
  let serverInstance: any;

  // Check if this is a bare interface pattern (no class, only const implementations)
  const hasConstImplementations = parseResult.implementations?.some(impl => impl.kind === 'const');
  const hasClassImplementations = parseResult.implementations?.some(impl => impl.kind === 'class-property');

  if (!ServerClass && hasConstImplementations && !hasClassImplementations) {
    // Bare interface pattern - use the module itself as the server instance
    if (verbose) {
      console.log('[Interface Adapter] Detected bare interface pattern (no class, const implementations)');
    }
    serverInstance = module;
  } else if (ServerClass) {
    // Class-based pattern - instantiate the class
    serverInstance = new ServerClass();
  } else {
    throw new Error(`No default export or class '${parseResult.className || 'unknown'}' found in ${filePath}`);
  }

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
    version: serverVersion || parseResult.server?.version || '1.0.0', // Parser defaults to '1.0.0'
    description: parseResult.server?.description, // Required by parser
    silent: !verbose, // Suppress HandlerManager logging unless verbose mode enabled
    capabilities,
    flattenRouters: parseResult.server?.flattenRouters, // Control router tool visibility
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
  } else if (toolsToRegister.length === 0) {
    // Second fallback: For bundled servers, do runtime reflection on instance properties
    // This catches cases where static analysis fails (JS bundles) and no tools array exists
    if (verbose) {
      console.log('[Interface Adapter] No tools found, trying runtime reflection on server instance properties');
    }

    const reflectedTools: any[] = [];
    const reservedProps = ['name', 'version', 'description', 'constructor', 'tools', 'prompts', 'resources'];

    for (const key of Object.keys(serverInstance)) {
      if (reservedProps.includes(key)) continue;

      const value = serverInstance[key];
      if (typeof value === 'function') {
        reflectedTools.push({
          name: key,
          methodName: key,
          description: `Tool: ${key}`,
          paramsType: 'any',
          paramsNode: undefined,
          interfaceName: 'ITool',
          isReflectedTool: true, // Flag to indicate this came from reflection (not isRuntimeTool!)
        });
      }
    }

    if (reflectedTools.length > 0) {
      toolsToRegister = reflectedTools;
      if (verbose) {
        console.log(`[Interface Adapter] Found ${reflectedTools.length} tool(s) via reflection: ${reflectedTools.map(t => t.name).join(', ')}`);
      }
    }
  } else if (verbose && toolsToRegister.length > 0) {
    console.log(`[Interface Adapter] Using ${toolsToRegister.length} statically analyzed tool(s)`);
  }

  // Register all tools (static or runtime)
  // Note: BuildMCPServer handles flattenRouters filtering in listTools()
  for (const tool of toolsToRegister) {
    await registerTool(buildServer, serverInstance, tool, filePath, verbose, bundleManifest);
  }

  // Step 6: Register prompts (all prompts now require implementation)
  if (parseResult.prompts.length > 0) {
    registerPrompts(buildServer, serverInstance, parseResult.prompts, verbose);
  }

  // Step 7: Register resources
  let dbManager: DatabaseManager | undefined;
  if (parseResult.resources.length > 0) {
    // Check if any resources have database configuration
    const hasDatabase = parseResult.resources.some(r => r.database !== undefined);

    if (hasDatabase) {
      dbManager = new DatabaseManager();

      if (verbose) {
        const dbResources = parseResult.resources.filter(r => r.database).length;
        console.log(`[Interface Adapter] Initializing DatabaseManager for ${dbResources} database resource(s)`);
      }
    }

    registerResources(buildServer, serverInstance, parseResult.resources, verbose, dbManager);
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

  // Step 7.6: Register routers
  if (parseResult.routers && parseResult.routers.length > 0) {
    // Build map from interface names to tool names for resolution
    const interfaceToToolName = new Map<string, string>();
    for (const tool of parseResult.tools) {
      interfaceToToolName.set(tool.interfaceName, tool.name || '');
    }

    for (const router of parseResult.routers) {
      // Infer router name from property name if not specified
      const routerName = router.name || router.propertyName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');

      // Resolve interface names to actual tool names
      const resolvedToolNames: string[] = [];
      const unresolvedInterfaces: string[] = [];

      for (const toolRef of router.tools) {
        // Check if it's already a tool name (string literal) or an interface name
        const actualToolName = interfaceToToolName.get(toolRef) || toolRef;

        // Verify tool exists
        if (toolsToRegister.some(t => t.name === actualToolName)) {
          resolvedToolNames.push(actualToolName);
        } else {
          unresolvedInterfaces.push(toolRef);
        }
      }

      if (unresolvedInterfaces.length > 0) {
        const allToolNames = toolsToRegister.map(t => t.name);
        const allInterfaceNames = Array.from(interfaceToToolName.keys());
        console.warn(`[Interface Adapter] Router "${routerName}" references non-existent tools: ${unresolvedInterfaces.join(', ')}`);
        console.warn(`[Interface Adapter] Available tool interfaces: ${allInterfaceNames.join(', ')}`);
        console.warn(`[Interface Adapter] Available tool names: ${allToolNames.join(', ')}`);
        continue; // Skip this router
      }

      // Register router with BuildMCPServer
      buildServer.addRouterTool({
        name: routerName,
        description: router.description,
        tools: resolvedToolNames,
        metadata: router.metadata,
      });

      if (verbose) {
        console.log(`[Interface Adapter] Registered router "${routerName}" with ${resolvedToolNames.length} tool(s): ${resolvedToolNames.join(', ')}`);
      }
    }
  }

  // Step 7.7: Register code execution tool (if configured)
  // Check both parsed server config and runtime server const
  const codeExecutionConfig = parseResult.server?.codeExecution || module.server?.codeExecution;

  if (codeExecutionConfig) {
    try {
      // Lazy import code execution feature
      const { createToolRunnerTool, getToolRunnerToolMetadata } = await import('../features/code-execution/tool-runner-tool.js');

      // Create tool handler
      const toolHandler = createToolRunnerTool(codeExecutionConfig);

      // Get tool metadata with dynamic description based on available tools
      const metadata = getToolRunnerToolMetadata(
        buildServer.getTools(),
        codeExecutionConfig.introspectTools ?? true
      );

      // Generate Zod schema for tool_runner params
      const toolRunnerSchema = z.object({
        language: z.enum(['javascript', 'typescript'], {
          description: 'Programming language to execute'
        }),
        code: z.string({
          description: 'Code to execute'
        }).min(1),
        timeout: z.number({
          description: 'Optional timeout in milliseconds (overrides server config)'
        }).int().positive().optional(),
      });

      // Register the tool
      buildServer.addTool({
        name: metadata.name,
        description: metadata.description,
        parameters: toolRunnerSchema,
        execute: async (args) => {
          // Call the tool handler
          const result = await toolHandler(args as any);
          // Return result as JSON string for MCP serialization
          return JSON.stringify(result, null, 2);
        },
        annotations: metadata.annotations,
      });

      if (verbose) {
        console.log(`[Interface Adapter] Registered code execution tool (mode: ${codeExecutionConfig.mode || 'vm'})`);
      }
    } catch (error: any) {
      console.warn(`[Interface Adapter] Failed to register code execution tool: ${error.message}`);
    }
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
    if (parseResult.routers && parseResult.routers.length > 0) {
      console.log(`[Interface Adapter] Detected ${parseResult.routers.length} router interface(s)`);
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
    websocket: parseResult.server?.websocket,
    auth: parseResult.server?.auth,
    capabilities, // Include auto-detected protocol capabilities
  });

  // Step 11: Setup database cleanup on process exit
  if (dbManager) {
    const cleanup = () => {
      if (verbose) {
        console.log('[Interface Adapter] Disconnecting from all databases...');
      }
      dbManager.disconnectAll();
    };

    // Handle graceful shutdown
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
  }

  return interfaceServer;
}

/**
 * Helper: Calculate Levenshtein distance between two strings
 * Used for "did you mean" suggestions
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Helper: Generate all naming variations for a tool name
 * Returns variations in different naming conventions
 */
function getNamingVariations(toolName: string): string[] {
  const variations: string[] = [];

  // Original name
  variations.push(toolName);

  // snake_case (if not already)
  if (!toolName.includes('_')) {
    const snakeCase = toolName
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/-/g, '_');
    if (snakeCase !== toolName) {
      variations.push(snakeCase);
    }
  }

  // camelCase
  const camelCase = toolName
    .replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[A-Z]/, match => match.toLowerCase());
  if (camelCase !== toolName) {
    variations.push(camelCase);
  }

  // PascalCase
  const pascalCase = toolName
    .replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[a-z]/, match => match.toUpperCase());
  if (pascalCase !== toolName && pascalCase !== camelCase) {
    variations.push(pascalCase);
  }

  // kebab-case
  const kebabCase = toolName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
  if (kebabCase !== toolName) {
    variations.push(kebabCase);
  }

  // Remove duplicates
  return [...new Set(variations)];
}

/**
 * Helper: Find "did you mean" suggestions based on string similarity
 * Returns up to 3 suggestions sorted by similarity
 */
function findDidYouMeanSuggestions(
  targetMethod: string,
  availableMethods: string[],
  maxSuggestions: number = 3
): string[] {
  const suggestions = availableMethods
    .map(method => ({
      method,
      distance: levenshteinDistance(targetMethod.toLowerCase(), method.toLowerCase())
    }))
    .filter(({ distance }) => distance <= Math.max(5, targetMethod.length / 2)) // Only suggest if reasonably similar
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions)
    .map(({ method }) => method);

  return suggestions;
}

/**
 * Register a tool with the MCP server
 * Returns naming convention warning if snake_case method was used
 */
async function registerTool(
  server: BuildMCPServer,
  serverInstance: any,
  tool: ParsedTool | any, // Allow runtime tool objects
  filePath: string,
  verbose?: boolean,
  bundleManifest?: BundleManifest
): Promise<{ warning?: { toolName: string; foundMethod: string; suggestion: string } }> {
  let { name, methodName, description, paramsNode, annotations } = tool;

  // Phase 2.1: Tool name inference from method name
  // If name is not provided, infer it from the method name
  if (!name && !tool.isRuntimeTool && methodName) {
    // Import camelToSnake from parser
    const { camelToSnake } = await import('./parser.js');

    // Infer tool name from method name: getWeather → 'get_weather'
    name = camelToSnake(methodName);

    if (verbose) {
      console.log(`[Interface Adapter] Inferred tool name '${name}' from method '${methodName}'`);
    }
  }

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

    return {}; // No naming warnings for runtime tools
  }

  // Handle reflected tools (from bundled servers via runtime reflection)
  // These are interface-driven tools discovered via property enumeration
  if (tool.isReflectedTool) {
    if (verbose) {
      console.log(`[Interface Adapter] Registering reflected tool: ${name}`);
    }

    // Get the method from the server instance
    const method = serverInstance[methodName];

    if (!method || typeof method !== 'function') {
      throw new Error(
        `Reflected tool "${name}" method "${methodName}" is not a function`
      );
    }

    // Try to load schema from bundle manifest
    let schema: z.ZodTypeAny = z.object({}).passthrough(); // Default fallback

    if (bundleManifest?.toolSchemas && bundleManifest.toolSchemas[name]) {
      const toolSchema = bundleManifest.toolSchemas[name];

      if (verbose) {
        console.log(`[Interface Adapter] Loading schema for reflected tool "${name}" from bundle manifest`);
      }

      // Build Zod schema from manifest metadata
      schema = buildSchemaFromMetadata(toolSchema.parameters);

      // Use description from manifest if available
      if (toolSchema.description) {
        description = toolSchema.description;
      }
    } else if (verbose) {
      console.warn(
        `[Interface Adapter] No schema metadata for reflected tool "${name}", using passthrough`
      );
    }

    // Register the tool - interface-driven tools expect (params, helper) signature
    server.addTool({
      name,
      description: description || `Tool: ${name}`,
      parameters: schema,
      execute: async (args, context) => {
        // Call the method with both args and context (the "helper")
        // Interface-driven tools expect: async (params, helper) => { ... }
        return await method.call(serverInstance, args, context);
      },
    });

    return {}; // No naming warnings for reflected tools
  }

  // Handle statically analyzed tools (original behavior)
  // Check if method exists on server instance - try naming variations automatically

  // Generate all possible naming variations for the method name
  const possibleMethodNames = getNamingVariations(methodName);

  // Check for ambiguous naming collisions (both camelCase and snake_case exist)
  const existingVariations = possibleMethodNames.filter(v => typeof serverInstance[v] === 'function');
  if (existingVariations.length > 1) {
    throw new Error(
      `❌ Tool "${name}" has ambiguous method names - multiple naming variations exist:\n` +
      existingVariations.map(v => `  - ${v}`).join('\n') + '\n\n' +
      `This is ambiguous. Please keep only ONE of these methods.\n` +
      `Recommended: Use camelCase "${methodName}" and remove the others.\n\n` +
      `Why this matters: Having multiple naming variations causes confusion about which ` +
      `method will be called and makes the codebase harder to maintain.`
    );
  }

  // Try exact match first (prefer explicit naming)
  let method = serverInstance[methodName];
  let foundMethodName = methodName;

  // If exact match not found, try naming variations
  if (!method) {
    for (const variationName of possibleMethodNames) {
      if (variationName !== methodName && serverInstance[variationName]) {
        method = serverInstance[variationName];
        foundMethodName = variationName;
        break;
      }
    }
  }

  // If still not found after trying all variations, show enhanced error
  if (!method) {
    // Get available methods for helpful error message
    const availableMethodNames = Object.keys(serverInstance)
      .filter(key => typeof serverInstance[key] === 'function');

    const availableMethods = availableMethodNames
      .map(key => `  - ${key}`)
      .join('\n');

    // Find "did you mean" suggestions
    const didYouMeanSuggestions = findDidYouMeanSuggestions(methodName, availableMethodNames);

    // Check if there's a snake_case version that might be the issue
    const snakeCaseMethodName = name.replace(/-/g, '_');
    const hasSnakeCaseMethod = serverInstance[snakeCaseMethodName];

    // Build comprehensive error message
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

    // Show naming variations that were tried
    if (possibleMethodNames.length > 1) {
      errorMessage +=
        `🔤 Tried these naming variations automatically:\n` +
        possibleMethodNames.map(v => `  - ${v}`).join('\n') + '\n\n';
    }

    // Show "did you mean" suggestions
    if (didYouMeanSuggestions.length > 0) {
      errorMessage +=
        `💡 Did you mean one of these?\n` +
        didYouMeanSuggestions.map(s => `  - ${s}`).join('\n') + '\n\n';
    }

    // Show snake_case warning if applicable
    if (hasSnakeCaseMethod) {
      errorMessage +=
        `⚠️  Common Mistake: Found method "${snakeCaseMethodName}" but expected "${methodName}"\n\n` +
        `   Naming Convention Rules:\n` +
        `   • Tool/Prompt names (in interface): snake_case (e.g., 'get_weather')\n` +
        `   • Method names (in class): camelCase (e.g., getWeather)\n` +
        `   • Framework automatically converts between formats\n\n` +
        `   Fix: Rename your method:\n` +
        `   - Change: ${snakeCaseMethodName}: ${tool.interfaceName} = ...\n` +
        `   - To:     ${methodName}: ${tool.interfaceName} = ...\n\n`;
    }

    // Show all available methods
    if (availableMethods) {
      errorMessage += `📋 Available methods on your class:\n${availableMethods}\n\n`;
    }

    // Add troubleshooting link
    errorMessage +=
      `🔧 Troubleshooting Guide: https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/TROUBLESHOOTING.md#method-not-found\n` +
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
    execute: async (args, context) => {
      // Call the method on the server instance with both args and context
      // Interface-driven tools expect: async (params, helper) => { ... }
      return await method.call(serverInstance, args, context);
    },
    ...(annotations && { annotations }), // Include annotations if present
  });

  return {}; // No warnings needed - both naming conventions are valid
}

/**
 * Generate Zod schema from tool parameter type
 */
function generateSchema(tool: ParsedTool, filePath: string): z.ZodTypeAny {
  // If we have the AST node, use it for accurate schema generation
  if (tool.paramsNode) {
    try {
      // Lazy-load TypeScript only when needed
      const ts = ensureTypeScript();

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
 * Build a Zod schema from bundle manifest metadata
 *
 * Converts simple JSON parameter schemas back into Zod validation schemas
 * Used for bundled servers where TypeScript type info is not available at runtime
 */
function buildSchemaFromMetadata(
  parameters: Record<string, import('../core/bundle-manifest.js').ParameterSchema>
): z.ZodTypeAny {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  for (const [paramName, paramSchema] of Object.entries(parameters)) {
    // Build the field schema with all constraints
    const fieldSchema = buildFieldSchema(paramSchema);
    schemaFields[paramName] = fieldSchema;
  }

  // Use .strict() instead of .passthrough() to enforce exact schema match
  return z.object(schemaFields).strict();
}

/**
 * Build a Zod schema for a single field from parameter metadata
 *
 * Handles all parameter types and applies validation constraints
 */
function buildFieldSchema(
  paramSchema: import('../core/bundle-manifest.js').ParameterSchema
): z.ZodTypeAny {
  let fieldSchema: z.ZodTypeAny;

  // Build base schema based on type
  switch (paramSchema.type) {
    case 'string':
      fieldSchema = z.string();

      // Add string validations
      if (paramSchema.minLength !== undefined) {
        fieldSchema = (fieldSchema as z.ZodString).min(paramSchema.minLength);
      }
      if (paramSchema.maxLength !== undefined) {
        fieldSchema = (fieldSchema as z.ZodString).max(paramSchema.maxLength);
      }
      if (paramSchema.pattern !== undefined) {
        try {
          fieldSchema = (fieldSchema as z.ZodString).regex(new RegExp(paramSchema.pattern));
        } catch (error) {
          console.warn(`[Schema Builder] Invalid regex pattern: ${paramSchema.pattern}`);
        }
      }
      if (paramSchema.enum !== undefined && Array.isArray(paramSchema.enum)) {
        // Handle enum as union of literals - ensure at least one value
        if (paramSchema.enum.length > 0) {
          fieldSchema = z.enum(paramSchema.enum as [string, ...string[]]);
        }
      }
      break;

    case 'number':
      fieldSchema = z.number();

      // Add number validations
      if (paramSchema.min !== undefined) {
        fieldSchema = (fieldSchema as z.ZodNumber).min(paramSchema.min);
      }
      if (paramSchema.max !== undefined) {
        fieldSchema = (fieldSchema as z.ZodNumber).max(paramSchema.max);
      }
      break;

    case 'integer':
      fieldSchema = z.number().int();

      // Add integer validations
      if (paramSchema.min !== undefined) {
        fieldSchema = (fieldSchema as z.ZodNumber).min(paramSchema.min);
      }
      if (paramSchema.max !== undefined) {
        fieldSchema = (fieldSchema as z.ZodNumber).max(paramSchema.max);
      }
      break;

    case 'boolean':
      fieldSchema = z.boolean();
      break;

    case 'array':
      // Support typed arrays with items schema
      if (paramSchema.items) {
        const itemSchema = buildFieldSchema(paramSchema.items);
        fieldSchema = z.array(itemSchema);
      } else {
        // Generic array without item type
        fieldSchema = z.array(z.any());
      }
      break;

    case 'object':
      // Support nested objects with properties
      if (paramSchema.properties) {
        const nestedFields: Record<string, z.ZodTypeAny> = {};
        for (const [propName, propSchema] of Object.entries(paramSchema.properties)) {
          nestedFields[propName] = buildFieldSchema(propSchema);
        }
        fieldSchema = z.object(nestedFields).strict();
      } else {
        // Generic object without properties
        fieldSchema = z.object({}).strict();
      }
      break;

    default:
      // Fallback to any for unknown types
      console.warn(`[Schema Builder] Unknown parameter type: ${paramSchema.type}, using z.any()`);
      fieldSchema = z.any();
      break;
  }

  // Add description if available (must be added before making optional)
  if (paramSchema.description) {
    fieldSchema = fieldSchema.describe(paramSchema.description);
  }

  // Handle optional/required logic
  // If required is explicitly false or undefined, make the field optional
  if (!paramSchema.required) {
    fieldSchema = fieldSchema.optional();
  }

  return fieldSchema;
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

// Export for testing
export { buildSchemaFromMetadata };
