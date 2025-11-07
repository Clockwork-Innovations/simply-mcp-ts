// lib/mcp/client.ts
// Fetch-based MCP Client Library - Pure client-side wrapper for API routes
// All server-side operations happen through /api/mcp/* endpoints

import {
  ConnectionInfo,
  ConnectionStatus,
  ServerCapabilities,
  Tool,
  ToolExecutionResult,
  Resource,
  ResourceContent,
  Prompt,
  PromptResult,
  Root,
  CompletionRequest,
  CompletionResult,
  ProtocolMessage,
  ElicitationRequest,
  ElicitationResponse,
  SamplingRequest,
  SamplingResponse,
  ResourceUpdatedNotification,
} from './types';

export class MCPClient {
  private connectionStatus: ConnectionStatus = 'disconnected';
  private serverInfo: { name?: string; version?: string } = {};
  private capabilities: ServerCapabilities = {};
  private messageListeners: Array<(message: ProtocolMessage) => void> = [];
  private messages: ProtocolMessage[] = [];
  private subscriptions: Map<string, Array<(content: ResourceContent) => void>> = new Map();
  private elicitationHandler: ((request: ElicitationRequest) => Promise<ElicitationResponse>) | null = null;
  private samplingHandler: ((request: SamplingRequest) => Promise<SamplingResponse>) | null = null;

  // ========================================
  // Connection Management
  // ========================================

  /**
   * Connect to an MCP server via API endpoint
   * @param config Connection configuration (transport type, server path/URL, auth)
   * @returns Connection information including status and server details
   */
  async connect(config: any): Promise<ConnectionInfo> {
    try {
      this.connectionStatus = 'connecting';

      const response = await fetch('/api/mcp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (!result.success) {
        this.connectionStatus = 'error';
        return {
          status: 'error',
          error: result.error || 'Connection failed',
        };
      }

      this.connectionStatus = 'connected';
      this.serverInfo = {
        name: result.data.serverName,
        version: result.data.serverVersion,
      };
      this.capabilities = result.data.capabilities || {};

      this.logMessage({
        timestamp: new Date(),
        direction: 'received',
        type: 'initialize',
        content: result.data,
      });

      // Return properly structured ConnectionInfo
      return {
        status: 'connected',
        serverName: result.data.serverName,
        serverVersion: result.data.serverVersion,
        transport: result.data.transport,
      };
    } catch (error) {
      this.connectionStatus = 'error';
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      return {
        status: 'error',
        error: errorMessage,
      };
    }
  }

  /**
   * Disconnect from the current MCP server
   */
  async disconnect(): Promise<void> {
    try {
      await fetch('/api/mcp/disconnect', { method: 'POST' });
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }

    // Clean up client-side state
    this.subscriptions.clear();
    this.connectionStatus = 'disconnected';
    this.serverInfo = {};
    this.capabilities = {};
    this.messages = [];
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionInfo {
    return {
      status: this.connectionStatus,
      serverName: this.serverInfo.name,
      serverVersion: this.serverInfo.version,
    };
  }

  /**
   * Check if client is currently connected
   */
  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  // ========================================
  // Server Info & Capabilities
  // ========================================

  /**
   * Get server capabilities (which primitives are supported)
   */
  getCapabilities(): ServerCapabilities {
    return this.capabilities;
  }

  // ========================================
  // Tools Primitive
  // ========================================

  /**
   * List all available tools from the server
   */
  async listTools(): Promise<Tool[]> {
    if (!this.isConnected()) throw new Error('Not connected');

    try {
      this.logMessage({
        timestamp: new Date(),
        direction: 'sent',
        type: 'tools/list',
        content: {},
      });

      const response = await fetch('/api/mcp/tools', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Failed to list tools');

      this.logMessage({
        timestamp: new Date(),
        direction: 'received',
        type: 'tools/list',
        content: result.data,
      });

      return result.data || [];
    } catch (error) {
      console.error('Failed to list tools:', error);
      throw error;
    }
  }

  /**
   * Execute a tool with given parameters
   * @param name Tool name
   * @param parameters Tool input parameters
   */
  async executeTool(name: string, parameters: Record<string, any>): Promise<ToolExecutionResult> {
    if (!this.isConnected()) throw new Error('Not connected');

    try {
      this.logMessage({
        timestamp: new Date(),
        direction: 'sent',
        type: 'tools/call',
        content: { name, arguments: parameters },
      });

      const response = await fetch('/api/mcp/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parameters }),
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Failed to execute tool');

      this.logMessage({
        timestamp: new Date(),
        direction: 'received',
        type: 'tools/call_result',
        content: result.data,
      });

      return result.data;
    } catch (error) {
      console.error('Failed to execute tool:', error);
      throw error;
    }
  }

  // ========================================
  // Resources Primitive
  // ========================================

  /**
   * List all available resources from the server
   */
  async listResources(): Promise<Resource[]> {
    if (!this.isConnected()) throw new Error('Not connected');

    try {
      this.logMessage({
        timestamp: new Date(),
        direction: 'sent',
        type: 'resources/list',
        content: {},
      });

      const response = await fetch('/api/mcp/resources', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Failed to list resources');

      this.logMessage({
        timestamp: new Date(),
        direction: 'received',
        type: 'resources/list',
        content: result.data,
      });

      return result.data || [];
    } catch (error) {
      console.error('Failed to list resources:', error);
      throw error;
    }
  }

  /**
   * Read content from a specific resource
   * @param uri Resource URI
   */
  async readResource(uri: string): Promise<ResourceContent> {
    if (!this.isConnected()) throw new Error('Not connected');

    try {
      this.logMessage({
        timestamp: new Date(),
        direction: 'sent',
        type: 'resources/read',
        content: { uri },
      });

      const response = await fetch('/api/mcp/resources/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri }),
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Failed to read resource');

      this.logMessage({
        timestamp: new Date(),
        direction: 'received',
        type: 'resources/read_result',
        content: result.data,
      });

      return result.data || { uri, text: '' };
    } catch (error) {
      console.error('Failed to read resource:', error);
      throw error;
    }
  }

  // ========================================
  // Subscriptions Primitive
  // ========================================

  /**
   * Subscribe to resource updates
   * @param uri Resource URI to subscribe to
   * @param callback Function to call when resource updates
   */
  async subscribeToResource(uri: string, callback: (content: ResourceContent) => void): Promise<void> {
    if (!this.isConnected()) throw new Error('Not connected');

    try {
      this.logMessage({
        timestamp: new Date(),
        direction: 'sent',
        type: 'resources/subscribe',
        content: { uri },
      });

      const response = await fetch('/api/mcp/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri }),
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Failed to subscribe');

      // Store callback
      if (!this.subscriptions.has(uri)) {
        this.subscriptions.set(uri, []);
      }
      this.subscriptions.get(uri)!.push(callback);

      this.logMessage({
        timestamp: new Date(),
        direction: 'received',
        type: 'resources/subscribe_result',
        content: { success: true },
      });
    } catch (error) {
      console.error('Failed to subscribe to resource:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from resource updates
   * @param uri Resource URI to unsubscribe from
   */
  async unsubscribeFromResource(uri: string): Promise<void> {
    if (!this.isConnected()) throw new Error('Not connected');

    try {
      this.logMessage({
        timestamp: new Date(),
        direction: 'sent',
        type: 'resources/unsubscribe',
        content: { uri },
      });

      const response = await fetch('/api/mcp/subscriptions/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri }),
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Failed to unsubscribe');

      this.subscriptions.delete(uri);

      this.logMessage({
        timestamp: new Date(),
        direction: 'received',
        type: 'resources/unsubscribe_result',
        content: { success: true },
      });
    } catch (error) {
      console.error('Failed to unsubscribe from resource:', error);
      throw error;
    }
  }

  /**
   * Get list of active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  // ========================================
  // Prompts Primitive
  // ========================================

  /**
   * List all available prompts from the server
   */
  async listPrompts(): Promise<Prompt[]> {
    if (!this.isConnected()) throw new Error('Not connected');

    try {
      this.logMessage({
        timestamp: new Date(),
        direction: 'sent',
        type: 'prompts/list',
        content: {},
      });

      const response = await fetch('/api/mcp/prompts', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Failed to list prompts');

      this.logMessage({
        timestamp: new Date(),
        direction: 'received',
        type: 'prompts/list',
        content: result.data,
      });

      return result.data || [];
    } catch (error) {
      console.error('Failed to list prompts:', error);
      throw error;
    }
  }

  /**
   * Get prompt messages with arguments
   * @param name Prompt name
   * @param arguments_ Prompt arguments
   */
  async getPrompt(name: string, arguments_: Record<string, string> = {}): Promise<PromptResult> {
    if (!this.isConnected()) throw new Error('Not connected');

    try {
      this.logMessage({
        timestamp: new Date(),
        direction: 'sent',
        type: 'prompts/get',
        content: { name, arguments: arguments_ },
      });

      const response = await fetch('/api/mcp/prompts/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, arguments: arguments_ }),
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Failed to get prompt');

      this.logMessage({
        timestamp: new Date(),
        direction: 'received',
        type: 'prompts/get_result',
        content: result.data,
      });

      return result.data;
    } catch (error) {
      console.error('Failed to get prompt:', error);
      throw error;
    }
  }

  // ========================================
  // Completions Primitive
  // ========================================

  /**
   * Get autocomplete suggestions for prompt/resource arguments
   * @param request Completion request with ref and argument details
   */
  async getCompletions(request: CompletionRequest): Promise<CompletionResult> {
    if (!this.isConnected()) throw new Error('Not connected');

    try {
      this.logMessage({
        timestamp: new Date(),
        direction: 'sent',
        type: 'completion/complete',
        content: request,
      });

      const response = await fetch('/api/mcp/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Failed to get completions');

      this.logMessage({
        timestamp: new Date(),
        direction: 'received',
        type: 'completion/complete_result',
        content: result.data,
      });

      return result.data;
    } catch (error) {
      console.error('Failed to get completions:', error);
      throw error;
    }
  }

  // ========================================
  // Roots Primitive
  // ========================================

  /**
   * List all directory roots from the server
   */
  async listRoots(): Promise<Root[]> {
    if (!this.isConnected()) throw new Error('Not connected');

    try {
      this.logMessage({
        timestamp: new Date(),
        direction: 'sent',
        type: 'roots/list',
        content: {},
      });

      const response = await fetch('/api/mcp/roots', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Failed to list roots');

      this.logMessage({
        timestamp: new Date(),
        direction: 'received',
        type: 'roots/list',
        content: result.data,
      });

      return result.data || [];
    } catch (error) {
      console.error('Failed to list roots:', error);
      throw error;
    }
  }

  // ========================================
  // Elicitation Primitive (Client-Side)
  // ========================================

  /**
   * Set handler for elicitation requests from tools
   * @param handler Function to handle elicitation requests
   */
  setElicitationHandler(handler: (request: ElicitationRequest) => Promise<ElicitationResponse>): void {
    this.elicitationHandler = handler;
  }

  /**
   * Handle an elicitation request (called internally when tool requests input)
   * @param request Elicitation request from tool
   */
  async handleElicitation(request: ElicitationRequest): Promise<ElicitationResponse> {
    if (!this.elicitationHandler) {
      throw new Error('No elicitation handler registered');
    }

    this.logMessage({
      timestamp: new Date(),
      direction: 'received',
      type: 'elicitation/request',
      content: request,
    });

    const response = await this.elicitationHandler(request);

    this.logMessage({
      timestamp: new Date(),
      direction: 'sent',
      type: 'elicitation/response',
      content: response,
    });

    return response;
  }

  // ========================================
  // Sampling Primitive (Client-Side)
  // ========================================

  /**
   * Set handler for sampling requests from tools
   * @param handler Function to handle sampling requests
   */
  setSamplingHandler(handler: (request: SamplingRequest) => Promise<SamplingResponse>): void {
    this.samplingHandler = handler;
  }

  /**
   * Handle a sampling request (called internally when tool requests LLM completion)
   * @param request Sampling request from tool
   */
  async handleSampling(request: SamplingRequest): Promise<SamplingResponse> {
    if (!this.samplingHandler) {
      throw new Error('No sampling handler registered');
    }

    this.logMessage({
      timestamp: new Date(),
      direction: 'received',
      type: 'sampling/request',
      content: request,
    });

    const response = await this.samplingHandler(request);

    this.logMessage({
      timestamp: new Date(),
      direction: 'sent',
      type: 'sampling/response',
      content: response,
    });

    return response;
  }

  // ========================================
  // Logging & Protocol Messages
  // ========================================

  /**
   * Log a protocol message (internal method)
   */
  private logMessage(message: ProtocolMessage): void {
    this.messages.push(message);
    this.messageListeners.forEach(listener => listener(message));
  }

  /**
   * Register a listener for protocol messages
   * @param listener Function to call when messages are logged
   * @returns Unsubscribe function
   */
  onMessage(listener: (message: ProtocolMessage) => void): () => void {
    this.messageListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.messageListeners.indexOf(listener);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get all logged protocol messages
   */
  getMessages(): ProtocolMessage[] {
    return [...this.messages];
  }

  /**
   * Clear all logged messages
   */
  clearMessages(): void {
    this.messages = [];
  }

  /**
   * Get messages filtered by type
   * @param type Message type to filter by
   */
  getMessagesByType(type: string): ProtocolMessage[] {
    return this.messages.filter(msg => msg.type === type);
  }

  /**
   * Get messages filtered by direction
   * @param direction Direction to filter by ('sent' or 'received')
   */
  getMessagesByDirection(direction: 'sent' | 'received'): ProtocolMessage[] {
    return this.messages.filter(msg => msg.direction === direction);
  }
}

// ========================================
// Singleton Export
// ========================================

/**
 * Singleton instance of MCPClient for global use
 */
export const mcpClient = new MCPClient();
