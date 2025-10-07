/**
 * Interface-Driven API Adapter
 *
 * Bridges interface definitions to BuildMCPServer core.
 * Loads TypeScript files, parses interfaces, and registers tools/prompts/resources.
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
  const ServerClass = module.default;

  if (!ServerClass) {
    throw new Error(`No default export found in ${filePath}`);
  }

  // Step 3: Create server instance
  const serverInstance = new ServerClass();

  // Step 4: Create BuildMCPServer instance
  const buildServer = new BuildMCPServer({
    name: serverName || parseResult.server?.name || 'interface-server',
    version: serverVersion || parseResult.server?.version || '1.0.0',
    description: parseResult.server?.description,
  });

  // Step 5: Register tools
  for (const tool of parseResult.tools) {
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
  tool: ParsedTool,
  filePath: string,
  verbose?: boolean
): Promise<void> {
  const { name, methodName, description, paramsNode } = tool;

  // Check if method exists on server instance
  const method = serverInstance[methodName];

  if (!method) {
    throw new Error(
      `Tool "${name}" requires method "${methodName}" but it was not found on server class.\n` +
      `Expected: class implements { ${methodName}: ${tool.interfaceName} }`
    );
  }

  if (typeof method !== 'function') {
    throw new Error(
      `Tool "${name}" method "${methodName}" is not a function (found: ${typeof method})`
    );
  }

  if (verbose) {
    console.log(`[Interface Adapter] Registering tool: ${name} -> ${methodName}()`);
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
      // Load source file for schema generation
      const sourceCode = readFileSync(resolve(filePath), 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      return typeNodeToZodSchema(tool.paramsNode, sourceFile);
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
