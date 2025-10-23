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
import { BuildMCPServer } from '../programmatic/BuildMCPServer.js';
import { InterfaceServer } from './InterfaceServer.js';
import { parseInterfaceFile, type ParseResult, type ParsedTool } from './parser.js';
import { typeNodeToZodSchema, generateSchemaFromTypeString } from './schema-generator.js';
import { registerPrompts } from './prompt-handler.js';
import { registerResources } from './resource-handler.js';
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

  // Step 4: Create BuildMCPServer instance
  const buildServer = new BuildMCPServer({
    name: serverName || parseResult.server?.name || 'interface-server',
    version: serverVersion || parseResult.server?.version || '1.0.0',
    description: parseResult.server?.description,
    silent: !verbose, // Suppress HandlerManager logging unless verbose mode enabled
  });

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

  if (verbose) {
    console.log(`[Interface Adapter] Server loaded successfully`);
  }

  // Step 8: Wrap BuildMCPServer in InterfaceServer to expose MCP protocol methods
  const interfaceServer = new InterfaceServer(buildServer);

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
