/**
 * Class-Based MCP Adapter
 *
 * This module provides functions to load and create MCP servers from
 * TypeScript classes decorated with @MCPServer, @tool, @prompt, and @resource.
 *
 * The adapter handles:
 * - Loading classes from TypeScript files
 * - Extracting decorator metadata
 * - Type inference from TypeScript AST
 * - Creating BuildMCPServer instances
 */

import 'reflect-metadata';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BuildMCPServer } from '../programmatic/BuildMCPServer.js';
import type { BuildMCPServer as BuildMCPServerType } from '../programmatic/BuildMCPServer.js';
import { getServerConfig, getTools, getPrompts, getResources, getRouters, getParameterInfo, getParameterNames, extractJSDoc } from './metadata.js';
import { parseTypeScriptFileWithCache, getMethodParameterTypes, inferZodSchema } from './type-inference.js';
import type { ParameterInfo } from './types.js';
import type { ParsedClass } from './type-inference.js';

/**
 * Load class from file
 *
 * Dynamically imports a TypeScript/JavaScript file and extracts the MCP server class.
 * Looks for default export first, then any exported class.
 *
 * @param classFile - Path to the class file (relative or absolute)
 * @returns Promise resolving to the loaded class constructor
 * @throws Error if file cannot be loaded or no class is found
 *
 * @example
 * ```typescript
 * import { loadClass } from 'simply-mcp';
 *
 * // Load class from file
 * const ServerClass = await loadClass('./my-server.ts');
 *
 * // Check if it's properly decorated
 * const config = getServerConfig(ServerClass);
 * console.log(config?.name); // 'my-server'
 * ```
 */
export async function loadClass(classFile: string): Promise<any> {
  const absolutePath = resolve(process.cwd(), classFile);
  const fileUrl = pathToFileURL(absolutePath).href;

  let module;
  try {
    module = await import(fileUrl);
  } catch (error: any) {
    throw new Error(
      `Failed to load file: ${classFile}\n\n` +
      `Error: ${error.message}\n\n` +
      `Troubleshooting:\n` +
      `  1. Check the file path is correct\n` +
      `  2. Ensure the file has no syntax errors\n` +
      `  3. Verify all imports are valid and installed\n` +
      `  4. Try running: npx tsx ${classFile}\n\n` +
      `File path (resolved): ${absolutePath}\n\n` +
      `See: https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/IMPORT_STYLE_GUIDE.md`
    );
  }

  // Get the default export or first exported class
  const ServerClass = module.default || Object.values(module).find(
    (exp: any) => typeof exp === 'function' && exp.prototype
  );

  if (!ServerClass) {
    throw new Error(
      `No MCP server class found in: ${classFile}\n\n` +
      `Expected:\n` +
      `  - A class decorated with @MCPServer\n` +
      `  - Exported as default: export default class MyServer { }\n` +
      `  - Or as named export: export class MyServer { }\n\n` +
      `Example:\n` +
      `  import { MCPServer } from 'simply-mcp';\n\n` +
      `  @MCPServer()\n` +
      `  export default class MyServer {\n` +
      `    // Your tools here\n` +
      `  }\n\n` +
      `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts#decorator-api`
    );
  }

  return ServerClass;
}

/**
 * Convert method name to kebab-case
 *
 * @param str - String to convert
 * @returns Kebab-cased string
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Get all public methods from a class instance
 *
 * @param instance - Class instance
 * @returns Array of public method names
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
 *
 * Combines type information from TypeScript AST parsing with runtime
 * parameter information to get the most complete parameter metadata.
 *
 * @param runtimeParams - Parameter info from runtime reflection
 * @param parsedParams - Parameter info from AST parsing
 * @returns Merged parameter information
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
 * Create BuildMCPServer from decorated class
 *
 * Extracts all decorator metadata from a class and creates a fully configured
 * BuildMCPServer instance. Automatically registers:
 * - All @tool decorated methods
 * - All @prompt decorated methods
 * - All @resource decorated methods
 * - Public methods without decorators (as tools)
 *
 * @param ServerClass - The class decorated with @MCPServer
 * @param sourceFilePath - Absolute path to the source file (for type parsing)
 * @returns BuildMCPServer instance
 * @throws Error if class is not decorated with @MCPServer
 *
 * @example
 * ```typescript
 * import { loadClass, createServerFromClass } from 'simply-mcp';
 *
 * // Load the decorated class
 * const ServerClass = await loadClass('./my-server.ts');
 *
 * // Create server instance
 * const server = createServerFromClass(ServerClass, '/absolute/path/to/my-server.ts');
 *
 * // Start the server
 * await server.start({ transport: 'stdio' });
 * ```
 */
export function createServerFromClass(ServerClass: any, sourceFilePath: string): BuildMCPServerType {
  const config = getServerConfig(ServerClass);

  if (!config) {
    const className = ServerClass.name || 'UnnamedClass';
    throw new Error(
      `Class '${className}' must be decorated with @MCPServer\n\n` +
      `What went wrong:\n` +
      `  The class was found but is missing the @MCPServer decorator.\n\n` +
      `Expected:\n` +
      `  @MCPServer()\n` +
      `  class ${className} { ... }\n\n` +
      `To fix:\n` +
      `  1. Import MCPServer: import { MCPServer } from 'simply-mcp';\n` +
      `  2. Add decorator: @MCPServer() above your class\n` +
      `  3. Configure server: @MCPServer({ name: 'my-server', version: '1.0.0' })\n\n` +
      `Example:\n` +
      `  import { MCPServer, tool } from 'simply-mcp';\n\n` +
      `  @MCPServer({ name: 'my-server', version: '1.0.0' })\n` +
      `  export default class ${className} {\n` +
      `    @tool()\n` +
      `    greet(name: string) {\n` +
      `      return \`Hello, \${name}!\`;\n` +
      `    }\n` +
      `  }\n\n` +
      `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts#decorator-api`
    );
  }

  // Parse the source file to extract types
  console.log(`[ClassAdapter] Parsing source file: ${sourceFilePath}`);
  const parsedClass = parseTypeScriptFileWithCache(sourceFilePath);
  console.log(`[ClassAdapter] Parsed class:`, parsedClass ? `${parsedClass.className} with ${parsedClass.methods.size} methods` : 'null');

  const server = new BuildMCPServer({
    name: config.name!,
    version: config.version!,
    description: config.description,
    transport: config.transport,
    capabilities: config.capabilities,
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
    const jsdoc = tool.jsdoc;
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

  // Register routers with validation
  const routers = getRouters(ServerClass);

  // Build a map of all registered tools (decorated + auto-registered)
  const registeredToolNames = new Set<string>();

  // Add decorated tools
  for (const tool of tools) {
    registeredToolNames.add(tool.methodName);
  }

  // Add auto-registered public methods
  for (const methodName of publicMethods) {
    if (!decoratedTools.has(methodName) &&
        !decoratedPrompts.has(methodName) &&
        !decoratedResources.has(methodName)) {
      registeredToolNames.add(methodName);
    }
  }

  // Validate and register routers
  for (const routerMeta of routers) {
    // Validate each tool exists
    const missingTools: string[] = [];
    const availableTools = Array.from(registeredToolNames).sort();

    for (const toolMethodName of routerMeta.tools) {
      if (!registeredToolNames.has(toolMethodName)) {
        missingTools.push(toolMethodName);
      }
    }

    if (missingTools.length > 0) {
      // Find closest matches for helpful suggestions
      const suggestions = new Map<string, string[]>();
      for (const missing of missingTools) {
        const matches = availableTools.filter(available => {
          const lower = available.toLowerCase();
          const missingLower = missing.toLowerCase();
          return lower.includes(missingLower) || missingLower.includes(lower);
        });
        if (matches.length > 0) {
          suggestions.set(missing, matches);
        }
      }

      let errorMessage = `Router '${routerMeta.name}' configuration error:\n\n`;
      errorMessage += `The following tools do not exist in class '${ServerClass.name}':\n`;

      for (const missing of missingTools) {
        errorMessage += `  - '${missing}'\n`;
        const matches = suggestions.get(missing);
        if (matches && matches.length > 0) {
          errorMessage += `    Did you mean: ${matches.map(m => `'${m}'`).join(', ')}?\n`;
        }
      }

      errorMessage += `\nAvailable tools in ${ServerClass.name}:\n`;
      if (availableTools.length === 0) {
        errorMessage += `  (none - add @tool decorators or public methods)\n`;
      } else {
        for (const toolName of availableTools) {
          const isDecorated = decoratedTools.has(toolName);
          const label = isDecorated ? '(from @tool decorator)' : '(auto-registered public method)';
          errorMessage += `  - ${toolName} ${label}\n`;
        }
      }

      errorMessage += `\nTo fix:\n`;
      errorMessage += `  1. Check the spelling of tool names in the router configuration\n`;
      errorMessage += `  2. Ensure the methods exist and are decorated with @tool or are public\n`;
      errorMessage += `  3. Method names are case-sensitive\n`;

      throw new Error(errorMessage);
    }

    // Convert method names to kebab-case tool names
    const toolNames = routerMeta.tools.map(methodName => toKebabCase(methodName));

    server.addRouterTool({
      name: routerMeta.name,
      description: routerMeta.description,
      tools: toolNames,
      metadata: routerMeta.metadata,
    });
  }

  return server;
}
