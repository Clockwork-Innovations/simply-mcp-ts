#!/usr/bin/env node
/**
 * Class-Based MCP Adapter
 *
 * @deprecated This adapter is deprecated. Use the new CLI commands instead:
 *   - `simplymcp run <file>` (auto-detect)
 *   - `simplymcp-class <file>` (explicit decorator API)
 *
 * This file will be removed in a future major version.
 *
 * OLD Usage (deprecated):
 *   npx tsx mcp/class-adapter.ts <class-file.ts> [options]
 *
 * NEW Usage (recommended):
 *   simplymcp run <class-file.ts> [options]
 *   simplymcp-class <class-file.ts> [options]
 *
 * Runs MCP servers defined as TypeScript classes with decorators.
 *
 * Example (deprecated):
 *   npx tsx mcp/class-adapter.ts mcp/examples/class-basic.ts --http --port 3000
 *
 * Example (recommended):
 *   simplymcp run mcp/examples/class-basic.ts --http --port 3000
 *   simplymcp-class mcp/examples/class-basic.ts --http --port 3000
 */

import 'reflect-metadata';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// Import types from source (compile-time only)
import type { SimplyMCP as SimplyMCPType } from './SimplyMCP.js';
import type {
  ToolMetadata,
  PromptMetadata,
  ResourceMetadata,
  ParameterInfo,
} from './decorators.js';
import { parseTypeScriptFileWithCache, getMethodParameterTypes, type ParsedClass } from './type-parser.js';

// Import runtime from compiled dist to match user imports from 'simply-mcp'
// This ensures decorator metadata is shared between class-adapter and user code
const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = resolve(__dirname, '../dist/mcp');

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

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Class-Based MCP Adapter

Usage:
  npx tsx mcp/class-adapter.ts <class-file.ts> [options]

Options:
  --http              Use HTTP transport instead of stdio
  --port <number>     Port for HTTP server (default: 3000)
  --help, -h          Show this help message

Example:
  npx tsx mcp/class-adapter.ts mcp/examples/class-basic.ts
  npx tsx mcp/class-adapter.ts mcp/examples/class-basic.ts --http --port 3000
`);
    process.exit(0);
  }

  const classFile = args[0];
  const useHttp = args.includes('--http');
  const portIndex = args.indexOf('--port');
  const port = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : 3000;

  if (!classFile) {
    console.error('Error: Class file path is required');
    process.exit(1);
  }

  return { classFile, useHttp, port };
}

/**
 * Load class from file
 * @param classFile - Path to the class file (relative or absolute)
 * @returns Promise resolving to the loaded class
 */
export async function loadClass(classFile: string): Promise<any> {
  const absolutePath = resolve(process.cwd(), classFile);
  const fileUrl = pathToFileURL(absolutePath).href;
  const module = await import(fileUrl);

  // Get the default export or first exported class
  const ServerClass = module.default || Object.values(module).find(
    (exp: any) => typeof exp === 'function' && exp.prototype
  );

  if (!ServerClass) {
    throw new Error('No class found in module');
  }

  return ServerClass;
}

/**
 * Convert method name to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Get all public methods from a class instance
 */
function getPublicMethods(instance: any): string[] {
  const methods: string[] = [];
  const proto = Object.getPrototypeOf(instance);

  // Get all property names from prototype
  Object.getOwnPropertyNames(proto).forEach(name => {
    // Skip constructor and private methods (starting with _)
    if (name === 'constructor' || name.startsWith('_')) return;

    // Check if it's a function
    if (typeof proto[name] === 'function') {
      methods.push(name);
    }
  });

  return methods;
}

/**
 * Merge parsed types from AST with runtime ParameterInfo
 */
function mergeParameterTypes(
  runtimeParams: ParameterInfo[],
  parsedParams: Array<{name: string; type: any; optional: boolean; hasDefault: boolean; defaultValue?: any}>
): ParameterInfo[] {
  return runtimeParams.map((param, index) => {
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
}

/**
 * Create SimplyMCP server from decorated class
 * @param ServerClass - The class decorated with @MCPServer
 * @param sourceFilePath - Absolute path to the source file (for type parsing)
 * @returns SimplyMCP server instance
 */
export function createServerFromClass(ServerClass: any, sourceFilePath: string): SimplyMCPType {
  const config = getServerConfig(ServerClass);

  if (!config) {
    throw new Error('Class must be decorated with @MCPServer');
  }

  // Parse the source file to extract types
  console.log(`[ClassAdapter] Parsing source file: ${sourceFilePath}`);
  const parsedClass = parseTypeScriptFileWithCache(sourceFilePath);
  console.log(`[ClassAdapter] Parsed class:`, parsedClass ? `${parsedClass.className} with ${parsedClass.methods.size} methods` : 'null');

  const server = new SimplyMCP({
    name: config.name!,
    version: config.version!,
    port: config.port,
  });

  const instance = new ServerClass();

  // Get explicitly decorated tools
  const decoratedTools = new Set(getTools(ServerClass).map(t => t.methodName));
  const decoratedPrompts = new Set(getPrompts(ServerClass).map(p => p.methodName));
  const decoratedResources = new Set(getResources(ServerClass).map(r => r.methodName));

  // Get all public methods
  const publicMethods = getPublicMethods(instance);

  // Register explicitly decorated tools
  const tools = getTools(ServerClass);
  for (const tool of tools) {
    const method = instance[tool.methodName];
    if (!method) continue;

    const runtimeParamInfo = getParameterInfo(method);
    const parsedParams = getMethodParameterTypes(parsedClass, tool.methodName);
    const paramInfo = mergeParameterTypes(runtimeParamInfo, parsedParams);
    const paramTypes = paramInfo.map(p => p.type).filter(Boolean);
    console.log(`[ClassAdapter] Tool ${tool.methodName}: paramTypes=`, paramTypes, 'paramInfo=', paramInfo);
    const jsdoc = tool.jsdoc || extractJSDoc(method);
    const zodSchema = inferZodSchema(paramTypes, tool.methodName, paramInfo, jsdoc);
    const toolName = toKebabCase(tool.methodName);

    server.addTool({
      name: toolName,
      description: tool.description || jsdoc?.description || `Execute ${tool.methodName}`,
      parameters: zodSchema,
      execute: async (args: any) => {
        const params = paramInfo.map(p => args[p.name]);
        const result = await method.apply(instance, params);
        return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      },
    });
  }

  // Auto-register public methods that aren't decorated as tools
  for (const methodName of publicMethods) {
    // Skip if already registered as tool, prompt, or resource
    if (decoratedTools.has(methodName) ||
        decoratedPrompts.has(methodName) ||
        decoratedResources.has(methodName)) {
      continue;
    }

    const method = instance[methodName];
    if (!method) continue;

    const runtimeParamInfo = getParameterInfo(method);
    const parsedParams = getMethodParameterTypes(parsedClass, methodName);
    const paramInfo = mergeParameterTypes(runtimeParamInfo, parsedParams);
    const paramTypes = paramInfo.map(p => p.type).filter(Boolean);
    const jsdoc = extractJSDoc(method);
    const zodSchema = inferZodSchema(paramTypes, methodName, paramInfo, jsdoc);
    const toolName = toKebabCase(methodName);

    server.addTool({
      name: toolName,
      description: jsdoc?.description || `Execute ${methodName}`,
      parameters: zodSchema,
      execute: async (args: any) => {
        const params = paramInfo.map(p => args[p.name]);
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
      arguments: paramNames.map(name => ({
        name,
        description: `Parameter ${name}`,
        required: true, // Could be inferred from TypeScript optional params
      })),
      template: '{{__dynamic__}}', // Will be replaced by method execution
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

  return server;
}

/**
 * Main entry point
 */
async function main() {
  // Deprecation warning on startup
  console.warn('\n⚠️  WARNING: This adapter is DEPRECATED and will be removed in a future version.');
  console.warn('   Please use the new CLI commands instead:');
  console.warn('   - simplymcp run <file>       (auto-detect)');
  console.warn('   - simplymcp-class <file>     (explicit decorator API)\n');

  const { classFile, useHttp, port } = parseArgs();

  console.error('[ClassAdapter] Loading class from:', classFile);
  let ServerClass: any;
  try {
    ServerClass = await loadClass(classFile);
  } catch (error) {
    console.error('Error loading class:', error);
    process.exit(1);
  }

  const config = getServerConfig(ServerClass);
  console.error(`[ClassAdapter] Creating server: ${config?.name} v${config?.version}`);

  const server = createServerFromClass(ServerClass, classFile);

  const stats = server.getStats();
  console.error(
    `[ClassAdapter] Loaded: ${stats.tools} tools, ${stats.prompts} prompts, ${stats.resources} resources`
  );

  try {
    await server.start({
      transport: useHttp ? 'http' : 'stdio',
      port: useHttp ? port : undefined,
    });

    if (useHttp) {
      console.error(`[ClassAdapter] Server running on http://localhost:${port}`);
    } else {
      console.error('[ClassAdapter] Server running on stdio');
    }
  } catch (error) {
    console.error('[ClassAdapter] Failed to start server:', error);
    process.exit(1);
  }
}

// Run the adapter only when executed as a script (not when imported as a module)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('[ClassAdapter] Fatal error:', error);
    process.exit(1);
  });
}
