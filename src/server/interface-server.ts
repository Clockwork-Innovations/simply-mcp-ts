/**
 * InterfaceServer - Wrapper for BuildMCPServer with MCP Protocol Methods
 *
 * Bridges interface-based server definitions to the MCP protocol.
 * Provides public methods for MCP operations: listTools, executeTool, listPrompts, etc.
 */

import { BuildMCPServer } from './builder-server.js';
import type { StartOptions, RouterToolDefinition } from './builder-types.js';
import { authConfigFromParsed } from '../features/auth/adapter.js';
import type { SecurityConfig } from '../features/auth/security/types.js';

/**
 * Runtime configuration for interface-driven servers
 * Populated by the adapter from parsed IServer interface
 */
export interface RuntimeConfig {
  transport?: 'stdio' | 'http' | 'websocket';
  port?: number;
  stateful?: boolean;
  websocket?: {
    port?: number;
    heartbeatInterval?: number;
    heartbeatTimeout?: number;
    maxMessageSize?: number;
  };
  auth?: any; // ParsedAuth type, but we avoid circular dependency
  capabilities?: {
    sampling?: boolean;
    elicitation?: boolean;
    roots?: boolean;
    completions?: boolean;
    resources?: {
      subscribe?: boolean;
    };
  };
}

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
  private runtimeConfig?: RuntimeConfig;

  /**
   * Create a new InterfaceServer wrapper
   * @param buildServer The underlying BuildMCPServer instance
   */
  constructor(buildServer: BuildMCPServer) {
    this.buildServer = buildServer;
  }

  /**
   * Set runtime configuration (called by adapter)
   * @internal
   */
  setRuntimeConfig(config: RuntimeConfig): void {
    this.runtimeConfig = config;
  }

  /**
   * Get runtime configuration
   * @internal
   */
  getRuntimeConfig(): RuntimeConfig | undefined {
    return this.runtimeConfig;
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
    const toolsList = Array.from(tools.values()).map((tool) => ({
      name: tool.definition.name,
      description: tool.definition.description,
      inputSchema: tool.jsonSchema,
    }));

    // Apply flattenRouters filtering (same logic as MCP tools/list handler)
    const options = this.buildServer.getOptions();
    if (!options.flattenRouters) {
      // Hide tools that are assigned to routers
      const toolToRouters = this.buildServer.getToolToRouters();
      return toolsList.filter((tool) => !toolToRouters.has(tool.name));
    }

    return toolsList;
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

  // ===== MCP Protocol Methods - Elicitation =====

  /**
   * Request user input from the client
   *
   * Elicitation allows servers to request structured input from users through
   * the MCP client. This is useful for collecting configuration, API keys,
   * confirmations, or any other user data needed during tool execution.
   *
   * The client will display a UI prompting the user to provide the requested
   * information based on the provided schema.
   *
   * @param prompt The message to show the user explaining what input is needed
   * @param args Input field schema defining what data to collect (JSON Schema format)
   * @returns Promise resolving to ElicitResult with action and content
   *
   * @example Simple text input
   * ```typescript
   * const result = await server.elicitInput(
   *   'Please enter your API key',
   *   {
   *     apiKey: {
   *       type: 'string',
   *       title: 'API Key',
   *       description: 'Your OpenAI API key',
   *       minLength: 10
   *     }
   *   }
   * );
   *
   * if (result.action === 'accept') {
   *   const apiKey = result.content.apiKey;
   *   // Use the API key
   * }
   * ```
   *
   * @example Form with multiple fields
   * ```typescript
   * const result = await server.elicitInput(
   *   'Configure database connection',
   *   {
   *     host: {
   *       type: 'string',
   *       title: 'Database Host',
   *       default: 'localhost'
   *     },
   *     port: {
   *       type: 'integer',
   *       title: 'Port',
   *       default: 5432,
   *       min: 1,
   *       max: 65535
   *     },
   *     useSSL: {
   *       type: 'boolean',
   *       title: 'Use SSL',
   *       default: true
   *     }
   *   }
   * );
   * ```
   */
  async elicitInput(prompt: string, args: Record<string, any>): Promise<any> {
    // Forward to BuildMCPServer's requestElicitation method
    // This method is private, so we'll need to expose it or call through context
    throw new Error(
      'Elicitation is only available within tool handlers via context.elicitInput().\n\n' +
      'To use elicitation:\n' +
      '1. Enable elicitation capability in server options\n' +
      '2. Use context.elicitInput() within a tool handler\n' +
      '3. Ensure the client supports elicitation capability\n\n' +
      'Example:\n' +
      'execute: async (params, context) => {\n' +
      '  const result = await context.elicitInput(\n' +
      '    "Enter API key",\n' +
      '    { apiKey: { type: "string" } }\n' +
      '  );\n' +
      '  return result;\n' +
      '}'
    );
  }

  /**
   * Request the list of root directories from the client
   *
   * Roots represent the client's working directories or context scopes.
   * This helps servers understand the file system context for operations.
   *
   * @returns Array of root objects with URI and optional name
   *
   * @example
   * ```typescript
   * const roots = await server.listRoots();
   * console.log(roots);
   * // [
   * //   { uri: 'file:///home/user/project', name: 'My Project' },
   * //   { uri: 'file:///home/user/workspace', name: 'Workspace' }
   * // ]
   * ```
   *
   * @throws Error if server not initialized or client doesn't support roots
   */
  async listRoots(): Promise<Array<{ uri: string; name?: string }>> {
    const result = await this.buildServer.requestRoots();
    // Map SDK roots to simplified format
    return (result.roots || []).map(root => ({
      uri: root.uri || '',
      name: root.name,
    }));
  }

  /**
   * Get completion suggestions for a prompt argument
   *
   * Completions provide autocomplete as users type prompt argument values.
   *
   * @param promptName - Name of the prompt
   * @param argName - Name of the argument being completed
   * @param value - Current partial value typed by user
   * @returns Array of completion suggestions
   *
   * @example
   * ```typescript
   * const suggestions = await server.complete('weather_report', 'city', 'New');
   * console.log(suggestions);
   * // ['New York', 'New Orleans', 'Newark']
   * ```
   *
   * Note: Foundation layer returns empty array. Full implementation in Feature Layer.
   */
  async complete(promptName: string, argName: string, value: string): Promise<string[]> {
    // Foundation layer: return empty completions
    // Feature layer will implement actual completion logic
    return [];
  }

  // ===== MCP Protocol Methods - Subscriptions =====

  /**
   * Notify subscribers that a resource has been updated
   *
   * When a resource changes, call this method to send notifications to all
   * clients that have subscribed to the resource URI.
   *
   * The server will send a notifications/resources/updated message to
   * subscribed clients, prompting them to re-read the resource.
   *
   * @param uri URI of the resource that was updated
   *
   * @example
   * ```typescript
   * // After updating a dynamic resource
   * server.notifyResourceUpdate('stats://current');
   * ```
   *
   * @example
   * ```typescript
   * // After configuration change
   * updateConfig(newConfig);
   * server.notifyResourceUpdate('config://server');
   * ```
   */
  notifyResourceUpdate(uri: string): void {
    this.buildServer.notifyResourceUpdate(uri);
  }

  // ===== MCP Protocol Methods - Sampling =====

  /**
   * Request LLM sampling/completion from the client
   *
   * This method sends a sampling request to the MCP client, asking the client's
   * LLM to generate a completion based on the provided messages.
   *
   * @param messages Array of messages for the conversation
   * @param options Optional sampling parameters (maxTokens, temperature, etc.)
   * @returns LLM response from the client
   *
   * @throws {Error} If server is not initialized
   * @throws {Error} If client does not support sampling capability
   *
   * @example Simple Text Request
   * ```typescript
   * const result = await server.createMessage([
   *   {
   *     role: 'user',
   *     content: { type: 'text', text: 'What is TypeScript?' }
   *   }
   * ]);
   * console.log(result.content.text);
   * ```
   *
   * @example With Sampling Options
   * ```typescript
   * const result = await server.createMessage(
   *   [
   *     {
   *       role: 'user',
   *       content: { type: 'text', text: 'Explain MCP protocol' }
   *     }
   *   ],
   *   {
   *     maxTokens: 500,
   *     temperature: 0.7,
   *     topP: 0.9
   *   }
   * );
   * ```
   *
   * @example Multi-turn Conversation
   * ```typescript
   * const result = await server.createMessage([
   *   {
   *     role: 'user',
   *     content: { type: 'text', text: 'What is MCP?' }
   *   },
   *   {
   *     role: 'assistant',
   *     content: { type: 'text', text: 'MCP is Model Context Protocol...' }
   *   },
   *   {
   *     role: 'user',
   *     content: { type: 'text', text: 'Can you explain it simply?' }
   *   }
   * ]);
   * ```
   */
  async createMessage(
    messages: Array<{
      role: 'user' | 'assistant';
      content: {
        type: string;
        text?: string;
        data?: string;
        mimeType?: string;
        [key: string]: unknown;
      };
    }>,
    options?: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      topK?: number;
      stopSequences?: string[];
      metadata?: Record<string, unknown>;
      [key: string]: unknown;
    }
  ): Promise<any> {
    // Get the underlying BuildMCPServer instance
    const buildServer = this.buildServer as any;

    // Access the private server instance
    if (!buildServer.server) {
      throw new Error(
        'Server not initialized\n\n' +
        'What went wrong:\n' +
        '  The MCP server instance has not been created yet.\n\n' +
        'To fix:\n' +
        '  1. Call server.start() before using createMessage()\n' +
        '  2. Ensure the server has been properly initialized\n\n' +
        'Example:\n' +
        '  await server.start();\n' +
        '  const result = await server.createMessage([...]);'
      );
    }

    try {
      // Use the MCP SDK's createMessage method
      const result = await buildServer.server.createMessage({
        messages: messages as any,
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
        topP: options?.topP,
        stopSequences: options?.stopSequences,
        metadata: options?.metadata,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        'Sampling request failed\n\n' +
        'What went wrong:\n' +
        `  ${errorMessage}\n\n` +
        'Possible causes:\n' +
        '  - Client does not support sampling capability\n' +
        '  - Connection issue with the client\n' +
        '  - LLM service unavailable\n' +
        '  - Server not started yet (call server.start() first)\n\n' +
        'Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts#sampling'
      );
    }
  }

  // ===== Router Methods =====

  /**
   * Add a router tool to organize related tools
   *
   * Routers are special tools that group related tools together.
   * When called, they return a list of their assigned tools.
   *
   * @param definition Router definition with name, description, and optional tools
   * @returns this for method chaining
   *
   * @example
   * ```typescript
   * server
   *   .addRouterTool({
   *     name: 'weather_tools',
   *     description: 'Weather information tools',
   *     tools: ['get_weather', 'get_forecast']
   *   })
   *   .assignTools('weather_tools', ['get_weather', 'get_forecast']);
   * ```
   */
  addRouterTool(definition: RouterToolDefinition): this {
    this.buildServer.addRouterTool(definition);
    return this;
  }

  /**
   * Assign tools to a router
   *
   * Tools can be assigned to multiple routers.
   * Assigned tools are hidden from the main tools list (unless flattenRouters is enabled).
   *
   * @param routerName Name of the router
   * @param toolNames Array of tool names to assign
   * @returns this for method chaining
   *
   * @example
   * ```typescript
   * server
   *   .addRouterTool({ name: 'admin_tools', description: 'Admin tools' })
   *   .assignTools('admin_tools', ['reset_cache', 'clear_logs']);
   * ```
   */
  assignTools(routerName: string, toolNames: string[]): this {
    this.buildServer.assignTools(routerName, toolNames);
    return this;
  }

  // ===== Lifecycle Methods =====

  /**
   * Start the MCP server
   * @param options Start options (transport, port, stateful)
   *
   * If no options are provided, uses runtime configuration from the adapter.
   * Runtime config comes from parsed IServer interface (file-based config).
   * Provided options override runtime config (CLI flags take precedence).
   */
  async start(options?: StartOptions): Promise<void> {
    // Merge runtime config with provided options (options take precedence)
    const finalOptions: StartOptions = {
      transport: options?.transport ?? this.runtimeConfig?.transport,
      port: options?.port ?? this.runtimeConfig?.port,
      stateful: options?.stateful ?? this.runtimeConfig?.stateful,
      websocket: options?.websocket ?? this.runtimeConfig?.websocket,
    };

    // Convert auth config if present and transport is HTTP
    if (this.runtimeConfig?.auth && finalOptions.transport === 'http') {
      const securityConfig = authConfigFromParsed(this.runtimeConfig.auth);
      if (securityConfig) {
        finalOptions.securityConfig = securityConfig;
      }
    }

    await this.buildServer.start(finalOptions);
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
   * @returns Stats with counts of tools, prompts, resources, and router information
   */
  getStats(): {
    tools: number;
    routers: number;
    assignedTools: number;
    unassignedTools: number;
    prompts: number;
    resources: number;
    flattenRouters: boolean;
  } {
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
