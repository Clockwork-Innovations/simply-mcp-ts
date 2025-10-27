/**
 * Multi-Client Manager
 *
 * Orchestrates multiple MCP test clients for parallel testing scenarios.
 * Enables testing of multi-client synchronization, broadcast notifications,
 * and concurrent tool execution.
 *
 * Features:
 * - Create and manage multiple clients simultaneously
 * - Connect/disconnect all clients in parallel
 * - Subscribe all clients to the same resource
 * - Wait for notifications across all clients
 * - Execute tools from multiple clients
 *
 * Usage:
 *   const manager = new MultiClientManager();
 *   const clients = await manager.createClients(3, 'http://localhost:3001/mcp');
 *   await manager.connectAll();
 *   await manager.subscribeAll('ui://stats/live');
 *   const notifications = await manager.waitForAllNotifications('ui://stats/live');
 *   await manager.disconnectAll();
 */

import { MCPTestClient, type MCPClientOptions } from './mcp-test-client.js';

// ============================================================================
// Types
// ============================================================================

export interface MultiClientOptions extends MCPClientOptions {
  delayBetweenConnections?: number; // Delay in ms between client connections (default: 0)
}

export interface NotificationMap {
  clientIndex: number;
  uri: string;
  timestamp: number;
  notification: any;
}

// ============================================================================
// MultiClientManager Class
// ============================================================================

export class MultiClientManager {
  private clients: MCPTestClient[] = [];
  private serverUrl: string | null = null;
  private options: MultiClientOptions;

  constructor(options: MultiClientOptions = {}) {
    this.options = {
      timeout: options.timeout ?? 5000,
      verbose: options.verbose ?? false,
      delayBetweenConnections: options.delayBetweenConnections ?? 0,
    };
  }

  // ============================================================================
  // Client Lifecycle
  // ============================================================================

  /**
   * Create multiple test clients
   * @param count Number of clients to create
   * @param serverUrl MCP server URL
   * @returns Array of created clients
   */
  async createClients(count: number, serverUrl: string): Promise<MCPTestClient[]> {
    if (count < 1) {
      throw new Error('Client count must be at least 1');
    }

    if (this.clients.length > 0) {
      throw new Error('Clients already created. Call disconnectAll() first.');
    }

    this.serverUrl = serverUrl;
    this.log(`Creating ${count} clients for ${serverUrl}...`);

    for (let i = 0; i < count; i++) {
      const client = new MCPTestClient({
        timeout: this.options.timeout,
        verbose: this.options.verbose,
      });
      this.clients.push(client);
    }

    this.log(`Created ${count} clients`);
    return this.clients;
  }

  /**
   * Connect all clients to the server
   */
  async connectAll(): Promise<void> {
    if (this.clients.length === 0) {
      throw new Error('No clients created. Call createClients() first.');
    }

    if (!this.serverUrl) {
      throw new Error('No server URL set');
    }

    this.log(`Connecting ${this.clients.length} clients...`);

    const delay = this.options.delayBetweenConnections || 0;

    for (let i = 0; i < this.clients.length; i++) {
      if (i > 0 && delay > 0) {
        await this.sleep(delay);
      }
      await this.clients[i].connect(this.serverUrl);
      this.log(`Client ${i} connected`);
    }

    this.log(`All ${this.clients.length} clients connected`);
  }

  /**
   * Disconnect all clients
   */
  async disconnectAll(): Promise<void> {
    if (this.clients.length === 0) {
      return;
    }

    this.log(`Disconnecting ${this.clients.length} clients...`);

    await Promise.all(
      this.clients.map((client, i) => {
        this.log(`Disconnecting client ${i}...`);
        return client.disconnect();
      })
    );

    this.clients = [];
    this.serverUrl = null;

    this.log('All clients disconnected');
  }

  /**
   * Get all managed clients
   */
  getClients(): MCPTestClient[] {
    return [...this.clients];
  }

  /**
   * Get a specific client by index
   */
  getClient(index: number): MCPTestClient {
    if (index < 0 || index >= this.clients.length) {
      throw new Error(`Invalid client index: ${index}`);
    }
    return this.clients[index];
  }

  /**
   * Get number of clients
   */
  getClientCount(): number {
    return this.clients.length;
  }

  // ============================================================================
  // Subscription Operations
  // ============================================================================

  /**
   * Subscribe all clients to a resource
   */
  async subscribeAll(uri: string): Promise<void> {
    if (this.clients.length === 0) {
      throw new Error('No clients available');
    }

    this.log(`Subscribing all ${this.clients.length} clients to ${uri}...`);

    await Promise.all(
      this.clients.map((client, i) => {
        this.log(`Client ${i} subscribing to ${uri}...`);
        return client.subscribe(uri);
      })
    );

    this.log(`All clients subscribed to ${uri}`);
  }

  /**
   * Unsubscribe all clients from a resource
   */
  async unsubscribeAll(uri: string): Promise<void> {
    if (this.clients.length === 0) {
      throw new Error('No clients available');
    }

    this.log(`Unsubscribing all ${this.clients.length} clients from ${uri}...`);

    await Promise.all(
      this.clients.map((client, i) => {
        this.log(`Client ${i} unsubscribing from ${uri}...`);
        return client.unsubscribe(uri);
      })
    );

    this.log(`All clients unsubscribed from ${uri}`);
  }

  /**
   * Wait for all clients to receive a notification on a specific URI
   * @param uri Resource URI to wait for
   * @param timeout Timeout in milliseconds (default: 5000)
   * @returns Map of client index to notification
   */
  async waitForAllNotifications(
    uri: string,
    timeout: number = 5000
  ): Promise<Map<number, NotificationMap>> {
    if (this.clients.length === 0) {
      throw new Error('No clients available');
    }

    this.log(`Waiting for all ${this.clients.length} clients to receive notification on ${uri}...`);

    const promises = this.clients.map(async (client, index) => {
      const notification = await client.waitForNotification(uri, timeout);
      return {
        clientIndex: index,
        uri: notification.uri,
        timestamp: notification.timestamp,
        notification: notification.notification,
      };
    });

    const results = await Promise.all(promises);

    const notificationMap = new Map<number, NotificationMap>();
    results.forEach(result => {
      notificationMap.set(result.clientIndex, result);
    });

    this.log(`All clients received notification on ${uri}`);
    return notificationMap;
  }

  /**
   * Check if all clients have received a notification for a URI
   */
  haveAllClientsReceivedNotification(uri: string): boolean {
    return this.clients.every(client => {
      const notifications = client.getNotifications(uri);
      return notifications.length > 0;
    });
  }

  /**
   * Clear notifications on all clients
   */
  clearAllNotifications(): void {
    this.clients.forEach(client => client.clearNotifications());
  }

  // ============================================================================
  // Resource Operations
  // ============================================================================

  /**
   * List resources from first client
   */
  async listResources(): Promise<any[]> {
    if (this.clients.length === 0) {
      throw new Error('No clients available');
    }

    return this.clients[0].listResources();
  }

  /**
   * Read resource from first client
   */
  async readResource(uri: string): Promise<string> {
    if (this.clients.length === 0) {
      throw new Error('No clients available');
    }

    return this.clients[0].readResource(uri);
  }

  // ============================================================================
  // Tool Operations
  // ============================================================================

  /**
   * List tools from first client
   */
  async listTools(): Promise<any[]> {
    if (this.clients.length === 0) {
      throw new Error('No clients available');
    }

    return this.clients[0].listTools();
  }

  /**
   * Call a tool from a specific client
   */
  async callTool(clientIndex: number, toolName: string, args: Record<string, any> = {}): Promise<any> {
    if (clientIndex < 0 || clientIndex >= this.clients.length) {
      throw new Error(`Invalid client index: ${clientIndex}`);
    }

    return this.clients[clientIndex].callTool(toolName, args);
  }

  /**
   * Call a tool from all clients in parallel
   */
  async callToolFromAllClients(toolName: string, args: Record<string, any> = {}): Promise<Map<number, any>> {
    if (this.clients.length === 0) {
      throw new Error('No clients available');
    }

    this.log(`Calling tool ${toolName} from all ${this.clients.length} clients...`);

    const promises = this.clients.map(async (client, index) => {
      const result = await client.callTool(toolName, args);
      return { index, result };
    });

    const results = await Promise.all(promises);

    const resultMap = new Map<number, any>();
    results.forEach(({ index, result }) => {
      resultMap.set(index, result);
    });

    this.log(`All clients completed tool call ${toolName}`);
    return resultMap;
  }

  /**
   * Call a tool from all clients sequentially
   */
  async callToolFromAllClientsSequential(
    toolName: string,
    args: Record<string, any> = {}
  ): Promise<Map<number, any>> {
    if (this.clients.length === 0) {
      throw new Error('No clients available');
    }

    this.log(`Calling tool ${toolName} from all ${this.clients.length} clients (sequential)...`);

    const resultMap = new Map<number, any>();

    for (let i = 0; i < this.clients.length; i++) {
      const result = await this.clients[i].callTool(toolName, args);
      resultMap.set(i, result);
      this.log(`Client ${i} completed tool call ${toolName}`);
    }

    this.log(`All clients completed tool call ${toolName} (sequential)`);
    return resultMap;
  }

  // ============================================================================
  // Connection Status
  // ============================================================================

  /**
   * Check if all clients are connected
   */
  areAllConnected(): boolean {
    return this.clients.length > 0 && this.clients.every(client => client.isConnected());
  }

  /**
   * Get connection status for all clients
   */
  getConnectionStatus(): Map<number, boolean> {
    const statusMap = new Map<number, boolean>();
    this.clients.forEach((client, index) => {
      statusMap.set(index, client.isConnected());
    });
    return statusMap;
  }

  /**
   * Get session IDs for all clients
   */
  getSessionIds(): Map<number, string | null> {
    const sessionMap = new Map<number, string | null>();
    this.clients.forEach((client, index) => {
      sessionMap.set(index, client.getSessionId());
    });
    return sessionMap;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log debug message
   */
  private log(message: string, ...args: any[]): void {
    if (this.options.verbose) {
      console.log(`[MultiClientManager] ${message}`, ...args);
    }
  }
}
