/**
 * MCP Test Client
 *
 * Custom MCP client with full subscription support for testing simply-mcp UI features.
 * Enables automated testing of subscription lifecycle, tool execution, and multi-client scenarios.
 *
 * Features:
 * - Stateful HTTP transport with session management
 * - SSE notification handling for subscriptions
 * - Resource operations (list, read, subscribe, unsubscribe)
 * - Tool execution with error handling
 * - Notification queue for testing
 * - Connection lifecycle management
 *
 * Usage:
 *   const client = new MCPTestClient();
 *   await client.connect('http://localhost:3001/mcp');
 *   await client.subscribe('ui://stats/live');
 *   const notification = await client.waitForNotification('ui://stats/live');
 *   await client.disconnect();
 */

import type {
  Resource,
  Tool,
  ResourceUpdatedNotification,
  ReadResourceResult,
  CallToolResult,
  ListResourcesResult,
  ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * JSON-RPC 2.0 request structure
 */
interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, any>;
}

/**
 * JSON-RPC 2.0 response structure
 */
interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * SSE message structure
 */
interface SSEMessage {
  event?: string;
  data: string;
}

/**
 * Notification with metadata
 */
export interface NotificationRecord {
  uri: string;
  notification: ResourceUpdatedNotification;
  timestamp: number;
}

/**
 * Client connection options
 */
export interface MCPClientOptions {
  timeout?: number; // Request timeout in ms (default: 5000)
  verbose?: boolean; // Log debug info
}

// ============================================================================
// MCPTestClient Class
// ============================================================================

export class MCPTestClient {
  private serverUrl: string | null = null;
  private sessionId: string | null = null;
  private requestIdCounter = 1;
  private subscriptions = new Set<string>();
  private notifications: NotificationRecord[] = [];
  private notificationListeners: Map<string, ((notification: NotificationRecord) => void)[]> = new Map();
  private sseController: AbortController | null = null;
  private sseConnected = false;
  private options: Required<MCPClientOptions>;

  constructor(options: MCPClientOptions = {}) {
    this.options = {
      timeout: options.timeout ?? 5000,
      verbose: options.verbose ?? false,
    };
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to MCP server and initialize session
   */
  async connect(serverUrl: string): Promise<void> {
    if (this.serverUrl) {
      throw new Error('Client already connected. Call disconnect() first.');
    }

    this.serverUrl = serverUrl;
    this.log(`Connecting to ${serverUrl}...`);

    // Initialize session
    const initResult = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        resources: { subscribe: true },
        sampling: {},
      },
      clientInfo: {
        name: 'mcp-test-client',
        version: '1.0.0',
      },
    });

    if (initResult.error) {
      throw new Error(`Initialization failed: ${initResult.error.message}`);
    }

    // Try to set up SSE connection for notifications (may not be supported)
    try {
      await this.setupSSEConnection();
    } catch (err: any) {
      this.log(`SSE connection not available: ${err.message}`);
      // Continue without SSE - polling can still work
    }

    this.log('Connected successfully');
  }

  /**
   * Disconnect from server and cleanup
   */
  async disconnect(): Promise<void> {
    this.log('Disconnecting...');

    // Close SSE connection
    if (this.sseController) {
      this.sseController.abort();
      this.sseController = null;
    }

    // Clear state
    this.subscriptions.clear();
    this.notifications = [];
    this.notificationListeners.clear();
    this.serverUrl = null;
    this.sessionId = null;
    this.sseConnected = false;

    this.log('Disconnected');
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.serverUrl !== null && this.sessionId !== null;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  // ============================================================================
  // SSE Notification Handling
  // ============================================================================

  /**
   * Set up SSE connection for receiving notifications
   *
   * CRITICAL: StreamableHTTPServerTransport expects:
   * - GET request (not POST) to open SSE stream
   * - Accept: text/event-stream header
   * - Mcp-Session-Id header for session association
   */
  private async setupSSEConnection(): Promise<void> {
    if (!this.serverUrl || !this.sessionId) {
      throw new Error('Cannot setup SSE: Not connected');
    }

    this.sseController = new AbortController();

    try {
      this.log('Opening SSE stream with GET request...');

      // Build URL with session ID as query parameter (as per EventSource spec)
      const url = new URL(this.serverUrl);
      url.searchParams.set('sessionId', this.sessionId);

      this.log(`SSE URL: ${url.toString()}`);

      // IMPORTANT: Use GET request, not POST, to open SSE stream
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Mcp-Session-Id': this.sessionId, // Also include as header for compatibility
        },
        signal: this.sseController.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('SSE response has no body');
      }

      this.sseConnected = true;
      this.log('SSE stream opened successfully');

      // Process the SSE stream in the background
      this.processSSEStream(response.body);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        this.log(`SSE connection error: ${error.message}`);
      }
    }
  }

  /**
   * Process SSE stream and handle notifications
   */
  private async processSSEStream(stream: ReadableStream<Uint8Array>): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      this.log('Started processing SSE stream...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          this.log('SSE stream ended');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        this.log('SSE chunk received:', chunk.length, 'bytes');
        buffer += chunk;

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        let currentMessage: Partial<SSEMessage> = {};

        for (const line of lines) {
          this.log('SSE line:', line);

          if (line.startsWith('event:')) {
            currentMessage.event = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            currentMessage.data = line.substring(5).trim();
          } else if (line === '') {
            // Empty line = end of message
            if (currentMessage.data) {
              this.log('Complete SSE message:', currentMessage);
              this.handleSSEMessage(currentMessage as SSEMessage);
            }
            currentMessage = {};
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        this.log(`SSE stream error: ${error.message}`);
      }
    } finally {
      this.log('SSE stream processing ended');
      reader.releaseLock();
    }
  }

  /**
   * Handle incoming SSE message
   */
  private handleSSEMessage(message: SSEMessage): void {
    try {
      const data = JSON.parse(message.data);

      // Handle resource update notifications
      if (data.method === 'notifications/resources/updated') {
        const uri = data.params?.uri;
        if (uri) {
          const record: NotificationRecord = {
            uri,
            notification: data,
            timestamp: Date.now(),
          };

          this.notifications.push(record);
          this.log(`Received notification for ${uri}`);

          // Trigger listeners
          const listeners = this.notificationListeners.get(uri) || [];
          listeners.forEach(listener => listener(record));
        }
      }
    } catch (error: any) {
      this.log(`Failed to parse SSE message: ${error.message}`);
    }
  }

  // ============================================================================
  // Subscription Operations
  // ============================================================================

  /**
   * Subscribe to resource updates
   */
  async subscribe(uri: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Client not connected');
    }

    this.log(`Subscribing to ${uri}...`);

    const result = await this.request('resources/subscribe', { uri });

    if (result.error) {
      throw new Error(`Subscription failed: ${result.error.message}`);
    }

    this.subscriptions.add(uri);
    this.log(`Subscribed to ${uri}`);
  }

  /**
   * Unsubscribe from resource updates
   */
  async unsubscribe(uri: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Client not connected');
    }

    this.log(`Unsubscribing from ${uri}...`);

    const result = await this.request('resources/unsubscribe', { uri });

    if (result.error) {
      throw new Error(`Unsubscribe failed: ${result.error.message}`);
    }

    this.subscriptions.delete(uri);
    this.log(`Unsubscribed from ${uri}`);
  }

  /**
   * Get list of active subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Wait for a notification on a specific URI
   * @param uri Resource URI to wait for
   * @param timeout Timeout in milliseconds (default: 5000)
   * @returns Promise that resolves with the notification
   */
  async waitForNotification(uri: string, timeout: number = 5000): Promise<NotificationRecord> {
    return new Promise((resolve, reject) => {
      // Check if notification already received
      const existing = this.notifications.find(n => n.uri === uri);
      if (existing) {
        resolve(existing);
        return;
      }

      // Set up listener
      const listener = (notification: NotificationRecord) => {
        clearTimeout(timeoutId);
        resolve(notification);
      };

      if (!this.notificationListeners.has(uri)) {
        this.notificationListeners.set(uri, []);
      }
      this.notificationListeners.get(uri)!.push(listener);

      // Set up timeout
      const timeoutId = setTimeout(() => {
        const listeners = this.notificationListeners.get(uri) || [];
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
        reject(new Error(`Timeout waiting for notification on ${uri}`));
      }, timeout);
    });
  }

  /**
   * Get all notifications (optionally filtered by URI)
   */
  getNotifications(uri?: string): NotificationRecord[] {
    if (uri) {
      return this.notifications.filter(n => n.uri === uri);
    }
    return [...this.notifications];
  }

  /**
   * Clear notification history
   */
  clearNotifications(): void {
    this.notifications = [];
  }

  // ============================================================================
  // Resource Operations
  // ============================================================================

  /**
   * List all available resources
   */
  async listResources(): Promise<Resource[]> {
    if (!this.isConnected()) {
      throw new Error('Client not connected');
    }

    const result = await this.request('resources/list', {});

    if (result.error) {
      throw new Error(`resources/list failed: ${result.error.message}`);
    }

    return (result.result as ListResourcesResult)?.resources || [];
  }

  /**
   * Read a resource by URI
   */
  async readResource(uri: string): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Client not connected');
    }

    const result = await this.request('resources/read', { uri });

    if (result.error) {
      throw new Error(`resources/read failed: ${result.error.message}`);
    }

    const readResult = result.result as ReadResourceResult;
    const contents = readResult?.contents || [];

    if (contents.length === 0) {
      throw new Error(`No content returned for ${uri}`);
    }

    return contents[0].text || '';
  }

  // ============================================================================
  // Tool Operations
  // ============================================================================

  /**
   * List all available tools
   */
  async listTools(): Promise<Tool[]> {
    if (!this.isConnected()) {
      throw new Error('Client not connected');
    }

    const result = await this.request('tools/list', {});

    if (result.error) {
      throw new Error(`tools/list failed: ${result.error.message}`);
    }

    return (result.result as ListToolsResult)?.tools || [];
  }

  /**
   * Call a tool with arguments
   */
  async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Client not connected');
    }

    this.log(`Calling tool ${name} with args:`, args);

    const result = await this.request('tools/call', {
      name,
      arguments: args,
    });

    if (result.error) {
      throw new Error(`tools/call failed: ${result.error.message}`);
    }

    const toolResult = result.result as CallToolResult;
    return toolResult?.content || [];
  }

  // ============================================================================
  // Low-Level Request Handling
  // ============================================================================

  /**
   * Send a JSON-RPC request to the server
   */
  private async request(method: string, params: Record<string, any> = {}): Promise<JSONRPCResponse> {
    if (!this.serverUrl) {
      throw new Error('Not connected to server');
    }

    const requestId = this.nextRequestId();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    const requestBody: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    };

    this.log(`Request [${requestId}]: ${method}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

    try {
      const response = await fetch(this.serverUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Extract session ID from response headers
      const newSessionId = response.headers.get('mcp-session-id');
      if (newSessionId) {
        this.sessionId = newSessionId;
      }

      const text = await response.text();

      // Handle SSE format (event: message\ndata: {...})
      const lines = text.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonResponse = JSON.parse(line.substring(6));
          this.log(`Response [${requestId}]:`, jsonResponse);
          return jsonResponse;
        }
      }

      // Handle regular JSON
      const jsonResponse = JSON.parse(text);
      this.log(`Response [${requestId}]:`, jsonResponse);
      return jsonResponse;

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.options.timeout}ms`);
      }

      throw new Error(`Request failed: ${error.message}`);
    }
  }

  /**
   * Get next request ID
   */
  private nextRequestId(): number {
    return this.requestIdCounter++;
  }

  /**
   * Log debug message
   */
  private log(message: string, ...args: any[]): void {
    if (this.options.verbose) {
      console.log(`[MCPTestClient] ${message}`, ...args);
    }
  }
}
