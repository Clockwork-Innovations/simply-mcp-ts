/**
 * Universal MCP Client - Transport-agnostic wrapper around MCP SDK Client
 *
 * Supports:
 * - stdio (local process via simply-mcp CLI)
 * - HTTP stateful (SSE-based, session management)
 * - HTTP stateless (REST-style, no sessions)
 * - Authentication (API key, OAuth)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import path from 'path';

// ============================================================================
// Connection Configuration Types
// ============================================================================

export interface StdioConnectionConfig {
  type: 'stdio';
  serverPath: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface HttpStatefulConnectionConfig {
  type: 'http-stateful';
  url: string;
  auth?: AuthConfig;
  sessionId?: string;
}

export interface HttpStatelessConnectionConfig {
  type: 'http-stateless';
  url: string;
  auth?: AuthConfig;
}

export interface AuthConfig {
  type: 'apiKey';
  key: string;
  headerName?: string; // Default: 'x-api-key'
}

export type ConnectionConfig =
  | StdioConnectionConfig
  | HttpStatefulConnectionConfig
  | HttpStatelessConnectionConfig;

export interface ServerInfo {
  name: string;
  version: string;
  capabilities: any;
  instructions?: string;
}

// ============================================================================
// Universal MCP Client
// ============================================================================

export class UniversalMCPClient {
  private client: Client;
  private transport: Transport | null = null;
  private config: ConnectionConfig;
  private connected: boolean = false;

  constructor(config: ConnectionConfig) {
    this.config = config;

    // Create MCP SDK client with full capabilities
    this.client = new Client(
      {
        name: 'MCP Interpreter',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: { subscribe: true, listChanged: true },
          roots: { listChanged: true },
          sampling: {},
          experimental: {},
        },
      }
    );
  }

  /**
   * Connect to MCP server with configured transport
   */
  async connect(): Promise<ServerInfo> {
    if (this.connected) {
      throw new Error('Already connected');
    }

    // Create appropriate transport based on config
    this.transport = await this.createTransport(this.config);

    // Connect the client to the transport
    await this.client.connect(this.transport);
    this.connected = true;

    // Get server info
    const serverVersion = this.client.getServerVersion();
    const capabilities = this.client.getServerCapabilities();
    const instructions = this.client.getInstructions();

    return {
      name: serverVersion?.name || 'Unknown Server',
      version: serverVersion?.version || '0.0.0',
      capabilities: capabilities || {},
      instructions,
    };
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.connected = false;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get current connection config
   */
  getConfig(): ConnectionConfig {
    return this.config;
  }

  // ============================================================================
  // MCP Protocol Methods
  // ============================================================================

  /**
   * List available tools
   */
  async listTools() {
    this.assertConnected();
    return await this.client.listTools();
  }

  /**
   * Call a tool with arguments
   */
  async callTool(name: string, args: Record<string, any>) {
    this.assertConnected();
    return await this.client.callTool({ name, arguments: args });
  }

  /**
   * List available resources
   */
  async listResources() {
    this.assertConnected();
    return await this.client.listResources();
  }

  /**
   * Read a resource by URI
   */
  async readResource(uri: string) {
    this.assertConnected();
    return await this.client.readResource({ uri });
  }

  /**
   * Subscribe to resource updates
   */
  async subscribe(uri: string) {
    this.assertConnected();
    return await this.client.subscribeResource({ uri });
  }

  /**
   * Unsubscribe from resource updates
   */
  async unsubscribe(uri: string) {
    this.assertConnected();
    return await this.client.unsubscribeResource({ uri });
  }

  /**
   * List available prompts
   */
  async listPrompts() {
    this.assertConnected();
    return await this.client.listPrompts();
  }

  /**
   * Get a prompt with arguments
   */
  async getPrompt(name: string, args?: Record<string, string>) {
    this.assertConnected();
    return await this.client.getPrompt({ name, arguments: args });
  }

  /**
   * List directory roots
   */
  async listRoots() {
    this.assertConnected();
    // Note: MCP SDK Client doesn't expose listRoots directly
    // Using generic request method
    return await (this.client as any).request({
      method: 'roots/list',
      params: {}
    });
  }

  /**
   * Get completions for a prompt or resource
   */
  async complete(ref: any, argument: { name: string; value: string }) {
    this.assertConnected();
    return await this.client.complete({ ref, argument });
  }

  /**
   * Set logging level
   */
  async setLoggingLevel(level: 'debug' | 'info' | 'warning' | 'error') {
    this.assertConnected();
    return await this.client.setLoggingLevel(level);
  }

  /**
   * Ping the server
   */
  async ping() {
    this.assertConnected();
    return await this.client.ping();
  }

  // ============================================================================
  // Transport Creation
  // ============================================================================

  private async createTransport(config: ConnectionConfig): Promise<Transport> {
    switch (config.type) {
      case 'stdio':
        return this.createStdioTransport(config);

      case 'http-stateful':
        return this.createHttpStatefulTransport(config);

      case 'http-stateless':
        return this.createHttpStatelessTransport(config);

      default:
        throw new Error(`Unknown transport type: ${(config as any).type}`);
    }
  }

  private createStdioTransport(config: StdioConnectionConfig): Transport {
    // Use local simply-mcp v4 CLI directly (not npm v3.4)
    // Direct node execution guarantees we use the local development version
    const command = 'node';
    const localCliPath = '/mnt/Shared/cs-projects/simply-mcp-ts/dist/src/cli/run-bin.js';
    const args = [localCliPath, 'run', config.serverPath, ...(config.args || [])];

    return new StdioClientTransport({
      command,
      args,
      env: config.env || process.env as Record<string, string>,
    });
  }

  private createHttpStatefulTransport(config: HttpStatefulConnectionConfig): Transport {
    const url = new URL(config.url);

    const options: any = {
      sessionId: config.sessionId,
    };

    // Add API key authentication via custom fetch if provided
    if (config.auth?.type === 'apiKey') {
      const headerName = config.auth.headerName || 'x-api-key';
      const apiKey = config.auth.key;

      options.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        headers.set(headerName, apiKey);

        return fetch(input, {
          ...init,
          headers,
        });
      };
    }

    return new StreamableHTTPClientTransport(url, options);
  }

  private createHttpStatelessTransport(config: HttpStatelessConnectionConfig): Transport {
    // For stateless HTTP, we use StreamableHTTPClientTransport without sessionId
    // Each request will be independent
    const url = new URL(config.url);

    const options: any = {};

    // Add API key authentication via custom fetch if provided
    if (config.auth?.type === 'apiKey') {
      const headerName = config.auth.headerName || 'x-api-key';
      const apiKey = config.auth.key;

      options.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        headers.set(headerName, apiKey);

        return fetch(input, {
          ...init,
          headers,
        });
      };
    }

    return new StreamableHTTPClientTransport(url, options);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private assertConnected(): void {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }
  }
}
