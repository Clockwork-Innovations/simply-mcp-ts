/**
 * Real MCP Client for Layer 3
 *
 * This is a complete TypeScript MCP client that:
 * - Connects to HTTP/WebSocket MCP servers
 * - Manages connection lifecycle
 * - Handles request/response communication
 * - Supports streaming responses via Server-Sent Events (SSE)
 * - Implements proper error handling and reconnection logic
 *
 * Layer 3 Phase 3: Real MCP Client
 *
 * @module client/mcp-client
 */

import type { UIResourceContent, ToolResponse } from '../lib/types.js';

/**
 * MCP Client request types
 */
export interface MCPRequest {
  id: string;
  method: 'resource/list' | 'resource/read' | 'tool/execute';
  params?: Record<string, unknown>;
}

/**
 * MCP Client response types
 */
export interface MCPResponse {
  id: string;
  method: 'resource/list' | 'resource/read' | 'tool/execute';
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

/**
 * Connection configuration
 */
export interface MCPClientConfig {
  /** Server URL (http or https for HTTP, ws or wss for WebSocket) */
  url: string;

  /** Connection timeout in milliseconds (default: 5000) */
  connectTimeout?: number;

  /** Request timeout in milliseconds (default: 30000) */
  requestTimeout?: number;

  /** Whether to enable verbose logging (default: false) */
  verbose?: boolean;

  /** Maximum number of reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;

  /** Delay between reconnection attempts in milliseconds (default: 1000) */
  reconnectDelay?: number;

  /** Whether to automatically reconnect on connection loss (default: true) */
  autoReconnect?: boolean;
}

/**
 * Connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Streaming event types
 */
export interface StreamingEvent {
  type: 'data' | 'error' | 'complete';
  requestId: string;
  data?: unknown;
  error?: string;
}

/**
 * Real MCP Client Implementation
 */
export class MCPClient {
  private config: Required<MCPClientConfig>;
  private connectionState: ConnectionState = 'disconnected';
  private wsConnection: WebSocket | null = null;
  private httpClient: HTTPTransport | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private streamSubscribers: Map<string, Set<(event: StreamingEvent) => void>> = new Map();
  private requestCounter: number = 0;
  private reconnectAttempts: number = 0;
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(config: MCPClientConfig) {
    this.config = {
      connectTimeout: config.connectTimeout || 5000,
      requestTimeout: config.requestTimeout || 30000,
      verbose: config.verbose || false,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 1000,
      autoReconnect: config.autoReconnect !== false,
      url: config.url,
    };
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<void> {
    if (this.connectionState === 'connected') {
      this.log('Already connected');
      return;
    }

    if (this.connectionState === 'connecting') {
      this.log('Connection in progress');
      return;
    }

    this.connectionState = 'connecting';
    this.log(`Connecting to ${this.config.url}`);

    try {
      const url = new URL(this.config.url);

      if (url.protocol === 'ws:' || url.protocol === 'wss:') {
        // WebSocket connection
        await this.connectWebSocket();
      } else if (url.protocol === 'http:' || url.protocol === 'https:') {
        // HTTP connection (with SSE for streaming)
        this.connectHTTP();
      } else {
        throw new Error(`Unsupported protocol: ${url.protocol}`);
      }

      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.eventEmitter.emit('connected');
      this.log('Connected successfully');
    } catch (error) {
      this.connectionState = 'error';
      this.eventEmitter.emit('error', error);
      this.log(`Connection failed: ${error instanceof Error ? error.message : String(error)}`, 'error');

      if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      }

      throw error;
    }
  }

  /**
   * Connect via WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wsConnection = new WebSocket(this.config.url);

        const timeout = setTimeout(() => {
          this.wsConnection?.close();
          reject(new Error('WebSocket connection timeout'));
        }, this.config.connectTimeout);

        this.wsConnection.onopen = () => {
          clearTimeout(timeout);
          this.log('WebSocket connected');
          resolve();
        };

        this.wsConnection.onmessage = (event) => {
          this.handleWebSocketMessage(event.data);
        };

        this.wsConnection.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error(`WebSocket error: ${error}`));
        };

        this.wsConnection.onclose = () => {
          this.log('WebSocket disconnected');
          this.connectionState = 'disconnected';

          if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Connect via HTTP
   */
  private connectHTTP(): void {
    this.httpClient = new HTTPTransport(this.config.url, {
      timeout: this.config.requestTimeout,
      verbose: this.config.verbose,
    });

    this.log('HTTP transport initialized');
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    this.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      this.connect().catch((error) => {
        this.log(`Reconnect failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
      });
    }, delay);
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleWebSocketMessage(data: string): void {
    try {
      const message = JSON.parse(data) as MCPResponse;
      this.log(`Received response for request ${message.id}`);

      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
        this.pendingRequests.delete(message.id);
        clearTimeout(pending.timeout);
      }
    } catch (error) {
      this.log(`Failed to parse WebSocket message: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  /**
   * Send request via WebSocket
   */
  private async sendWebSocketRequest(request: MCPRequest): Promise<unknown> {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Request timeout: ${request.id}`));
      }, this.config.requestTimeout);

      this.pendingRequests.set(request.id, { resolve, reject, timeout });
      this.wsConnection!.send(JSON.stringify(request));
    });
  }

  /**
   * List available resources
   */
  async listResources(): Promise<UIResourceContent[]> {
    await this.ensureConnected();

    const requestId = this.generateRequestId();
    const request: MCPRequest = {
      id: requestId,
      method: 'resource/list',
    };

    this.log(`Listing resources (request ${requestId})`);

    try {
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        const result = await this.sendWebSocketRequest(request);
        return (result as { resources: UIResourceContent[] }).resources || [];
      } else if (this.httpClient) {
        const result = await this.httpClient.request('GET', '/resources');
        return (result as { resources: UIResourceContent[] }).resources || [];
      }
      throw new Error('No transport available');
    } catch (error) {
      this.log(`Failed to list resources: ${error instanceof Error ? error.message : String(error)}`, 'error');
      throw error;
    }
  }

  /**
   * Read a specific resource
   */
  async readResource(uri: string): Promise<UIResourceContent> {
    await this.ensureConnected();

    const requestId = this.generateRequestId();
    const request: MCPRequest = {
      id: requestId,
      method: 'resource/read',
      params: { uri },
    };

    this.log(`Reading resource ${uri} (request ${requestId})`);

    try {
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        const result = await this.sendWebSocketRequest(request);
        return result as UIResourceContent;
      } else if (this.httpClient) {
        const result = await this.httpClient.request('GET', `/resources/${encodeURIComponent(uri)}`);
        return result as UIResourceContent;
      }
      throw new Error('No transport available');
    } catch (error) {
      this.log(`Failed to read resource: ${error instanceof Error ? error.message : String(error)}`, 'error');
      throw error;
    }
  }

  /**
   * Execute a tool
   */
  async executeTool(toolName: string, args?: Record<string, unknown>): Promise<ToolResponse> {
    await this.ensureConnected();

    const requestId = this.generateRequestId();
    const request: MCPRequest = {
      id: requestId,
      method: 'tool/execute',
      params: { name: toolName, arguments: args || {} },
    };

    this.log(`Executing tool ${toolName} (request ${requestId})`);

    try {
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        const result = await this.sendWebSocketRequest(request);
        return result as ToolResponse;
      } else if (this.httpClient) {
        const result = await this.httpClient.request('POST', '/tools/execute', {
          name: toolName,
          arguments: args || {},
        });
        return result as ToolResponse;
      }
      throw new Error('No transport available');
    } catch (error) {
      this.log(`Failed to execute tool: ${error instanceof Error ? error.message : String(error)}`, 'error');
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Tool execution failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Subscribe to streaming events
   */
  subscribeToStream(requestId: string, callback: (event: StreamingEvent) => void): () => void {
    if (!this.streamSubscribers.has(requestId)) {
      this.streamSubscribers.set(requestId, new Set());
    }

    this.streamSubscribers.get(requestId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.streamSubscribers.get(requestId);
      if (subscribers) {
        subscribers.delete(callback);
      }
    };
  }

  /**
   * Subscribe to client events
   */
  on(event: 'connected' | 'disconnected' | 'error', callback: (data?: unknown) => void): () => void {
    this.eventEmitter.on(event, callback);
    return () => this.eventEmitter.off(event, callback);
  }

  /**
   * Ensure client is connected
   */
  private async ensureConnected(): Promise<void> {
    if (this.connectionState === 'connected') {
      return;
    }

    await this.connect();
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    this.log('Disconnecting...');

    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    if (this.httpClient) {
      this.httpClient.close();
      this.httpClient = null;
    }

    this.connectionState = 'disconnected';
    this.pendingRequests.clear();
    this.eventEmitter.emit('disconnected');
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${++this.requestCounter}`;
  }

  /**
   * Logging utility
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (this.config.verbose) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [MCP Client] [${level.toUpperCase()}] ${message}`);
    }
  }
}

/**
 * HTTP Transport for MCP communication
 */
class HTTPTransport {
  private baseUrl: string;
  private config: { timeout: number; verbose: boolean };
  private eventSource: EventSource | null = null;

  constructor(baseUrl: string, config: { timeout: number; verbose: boolean }) {
    this.baseUrl = baseUrl;
    this.config = config;
  }

  /**
   * Make HTTP request
   */
  async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Close transport
   */
  close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

/**
 * Simple event emitter implementation
 */
class EventEmitter {
  private listeners: Map<string, Set<(data?: unknown) => void>> = new Map();

  on(event: string, callback: (data?: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data?: unknown) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  emit(event: string, data?: unknown): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        listener(data);
      }
    }
  }
}

/**
 * Interface for pending requests
 */
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Create and return a configured MCP client
 */
export function createMCPClient(config: MCPClientConfig): MCPClient {
  return new MCPClient(config);
}

/**
 * Helper to connect client and handle errors
 */
export async function connectToServer(config: MCPClientConfig): Promise<MCPClient> {
  const client = createMCPClient(config);
  await client.connect();
  return client;
}
