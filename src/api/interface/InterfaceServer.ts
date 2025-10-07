/**
 * InterfaceServer - Wrapper for BuildMCPServer with MCP Protocol Methods
 *
 * Bridges interface-based server definitions to the MCP protocol.
 * Provides public methods for MCP operations: listTools, executeTool, listPrompts, etc.
 */

import { BuildMCPServer } from '../programmatic/BuildMCPServer.js';
import type { StartOptions } from '../programmatic/types.js';

/**
 * InterfaceServer - MCP Protocol Wrapper
 *
 * Wraps BuildMCPServer to provide public MCP protocol methods.
 * This allows interface-driven servers to expose the same API as class-based servers.
 *
 * @example
 * ```typescript
 * import { loadInterfaceServer } from 'simply-mcp';
 *
 * const server = await loadInterfaceServer({ filePath: './server.ts' });
 *
 * // List all tools
 * const tools = server.listTools();
 *
 * // Execute a tool
 * const result = await server.executeTool('greet', { name: 'Alice' });
 *
 * // Read a resource
 * const data = await server.readResource('config://server');
 *
 * // Start the server
 * await server.start();
 * ```
 */
export class InterfaceServer {
  private buildServer: BuildMCPServer;

  /**
   * Create a new InterfaceServer wrapper
   * @param buildServer The underlying BuildMCPServer instance
   */
  constructor(buildServer: BuildMCPServer) {
    this.buildServer = buildServer;
  }

  // ===== Metadata Getters =====

  /**
   * Get the server name
   */
  get name(): string {
    return this.buildServer.name;
  }

  /**
   * Get the server version
   */
  get version(): string {
    return this.buildServer.version;
  }

  /**
   * Get the server description
   */
  get description(): string | undefined {
    return this.buildServer.description;
  }

  // ===== MCP Protocol Methods - Tools =====

  /**
   * List all registered tools
   * @returns Array of tool definitions with name, description, and input schema
   */
  listTools(): Array<{
    name: string;
    description: string;
    inputSchema: any;
  }> {
    const tools = this.buildServer.getTools();
    return Array.from(tools.values()).map((tool) => ({
      name: tool.definition.name,
      description: tool.definition.description,
      inputSchema: tool.jsonSchema,
    }));
  }

  /**
   * Execute a tool by name
   * @param toolName Name of the tool to execute
   * @param args Arguments for the tool
   * @returns Tool execution result
   */
  async executeTool(toolName: string, args: any): Promise<any> {
    return await this.buildServer.executeToolDirect(toolName, args);
  }

  // ===== MCP Protocol Methods - Prompts =====

  /**
   * List all registered prompts
   * @returns Array of prompt definitions with name, description, and arguments
   */
  listPrompts(): Array<{
    name: string;
    description: string;
    arguments?: Array<{
      name: string;
      description: string;
      required: boolean;
    }>;
  }> {
    const prompts = this.buildServer.getPrompts();
    return Array.from(prompts.values()).map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments,
    }));
  }

  /**
   * Get a prompt by name with rendered template
   * @param promptName Name of the prompt
   * @param args Arguments for template interpolation
   * @returns Prompt result with rendered messages
   */
  async getPrompt(promptName: string, args: any = {}): Promise<any> {
    return await this.buildServer.getPromptDirect(promptName, args);
  }

  // ===== MCP Protocol Methods - Resources =====

  /**
   * List all registered resources
   * @returns Array of resource definitions with uri, name, description, and mimeType
   */
  listResources(): Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }> {
    const resources = this.buildServer.getResources();
    return Array.from(resources.values()).map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    }));
  }

  /**
   * Read a resource by URI
   * @param uri URI of the resource to read
   * @returns Resource contents
   */
  async readResource(uri: string): Promise<any> {
    return await this.buildServer.readResourceDirect(uri);
  }

  // ===== Lifecycle Methods =====

  /**
   * Start the MCP server
   * @param options Start options (transport, port, stateful)
   */
  async start(options?: StartOptions): Promise<void> {
    await this.buildServer.start(options);
  }

  /**
   * Stop the MCP server gracefully
   */
  async stop(): Promise<void> {
    await this.buildServer.stop();
  }

  /**
   * Get server information
   * @returns Server info with name, version, and running status
   */
  getInfo(): { name: string; version: string; isRunning: boolean } {
    return this.buildServer.getInfo();
  }

  /**
   * Get statistics about registered items
   * @returns Stats with counts of tools, prompts, and resources
   */
  getStats(): { tools: number; prompts: number; resources: number } {
    return this.buildServer.getStats();
  }

  // ===== Direct Access to BuildMCPServer =====

  /**
   * Get the underlying BuildMCPServer instance
   * For advanced use cases that need direct access
   * @returns The wrapped BuildMCPServer instance
   */
  getBuildServer(): BuildMCPServer {
    return this.buildServer;
  }
}
