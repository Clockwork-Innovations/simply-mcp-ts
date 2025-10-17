/**
 * Mock MCP Client for Layer 1 Demo
 *
 * This class simulates a real MCP client by returning REAL UIResourceContent objects
 * from the demo resources catalog. It provides:
 * - Resource loading with simulated network delay
 * - Tool execution (for future Layer 2 expansion)
 * - Error handling for invalid resources
 *
 * This is NOT a full MCP client implementation - it's a demo/testing utility
 * that returns pre-defined resources without any network calls.
 *
 * @module lib/mockMcpClient
 */

import type { UIResourceContent } from '../../../src/client/ui-types.js';
import type { ResourceId, Tool, ToolResponse, MockMcpClientOptions } from './types.js';
import { DEMO_RESOURCES, getDemoResource, getAllDemoResources } from './demoResources.js';
import { simulateNetworkDelay, isValidUIResource } from './utils.js';

/**
 * Mock MCP Client
 *
 * Simulates MCP protocol responses for demo purposes.
 * Returns real UIResourceContent objects with simulated network delay.
 */
export class MockMcpClient {
  private options: Required<MockMcpClientOptions>;
  private resourceCache: Map<string, UIResourceContent>;
  private actionLog: Array<{ timestamp: string; action: string; params: any; result: any }>;

  /**
   * Create a new mock MCP client
   *
   * @param options - Client configuration options
   */
  constructor(options: MockMcpClientOptions = {}) {
    this.options = {
      minDelay: options.minDelay ?? 200,
      maxDelay: options.maxDelay ?? 500,
      verbose: options.verbose ?? false,
    };

    this.resourceCache = new Map();
    this.actionLog = [];
    this.initializeCache();
  }

  /**
   * Initialize resource cache with all demo resources
   */
  private initializeCache(): void {
    Object.values(DEMO_RESOURCES).forEach((demoResource) => {
      const { id, resource } = demoResource;

      // Cache by ID (e.g., 'product-card')
      this.resourceCache.set(id, resource);

      // Cache by URI (e.g., 'ui://product-card/layer1')
      this.resourceCache.set(resource.uri, resource);
    });

    if (this.options.verbose) {
      console.log('[MockMcpClient] Initialized with', this.resourceCache.size / 2, 'resources');
    }
  }

  /**
   * Load a resource by URI or ID
   *
   * Simulates MCP resource read operation with network delay.
   *
   * @param uri - Resource URI (e.g., 'ui://product-card') or ID (e.g., 'product-card')
   * @returns Promise resolving to UIResourceContent
   * @throws Error if resource not found
   *
   * @example
   * ```typescript
   * const client = new MockMcpClient();
   * const resource = await client.loadResource('product-card');
   * ```
   */
  async loadResource(uri: string): Promise<UIResourceContent> {
    if (this.options.verbose) {
      console.log('[MockMcpClient] Loading resource:', uri);
    }

    // Simulate network delay
    await simulateNetworkDelay(this.options.minDelay, this.options.maxDelay);

    // Try to find resource by URI or ID
    let resource = this.resourceCache.get(uri);

    // If not found by URI, try by ID
    if (!resource) {
      const demoResource = getDemoResource(uri as ResourceId);
      resource = demoResource?.resource;
    }

    if (!resource) {
      const error = `Resource not found: ${uri}`;
      if (this.options.verbose) {
        console.error('[MockMcpClient]', error);
      }
      throw new Error(error);
    }

    // Validate resource structure
    if (!isValidUIResource(resource)) {
      const error = `Invalid resource structure: ${uri}`;
      if (this.options.verbose) {
        console.error('[MockMcpClient]', error);
      }
      throw new Error(error);
    }

    if (this.options.verbose) {
      console.log('[MockMcpClient] Resource loaded:', resource.uri);
    }

    return resource;
  }

  /**
   * List all available resources
   *
   * Simulates MCP list_resources operation.
   *
   * @returns Promise resolving to array of UIResourceContent objects
   *
   * @example
   * ```typescript
   * const client = new MockMcpClient();
   * const resources = await client.listResources();
   * console.log('Available resources:', resources.length);
   * ```
   */
  async listResources(): Promise<UIResourceContent[]> {
    if (this.options.verbose) {
      console.log('[MockMcpClient] Listing all resources');
    }

    // Simulate network delay
    await simulateNetworkDelay(this.options.minDelay, this.options.maxDelay);

    const resources = getAllDemoResources().map((demo) => demo.resource);

    if (this.options.verbose) {
      console.log('[MockMcpClient] Listed', resources.length, 'resources');
    }

    return resources;
  }

  /**
   * Execute a tool (for Layer 2+ expansion)
   *
   * Currently returns a mock success response. Will be expanded in Layer 2
   * to simulate actual tool execution with callbacks.
   *
   * @param name - Tool name
   * @param params - Tool parameters
   * @returns Promise resolving to tool response
   *
   * @example
   * ```typescript
   * const client = new MockMcpClient();
   * const response = await client.executeTool('add_to_cart', { productId: '123' });
   * ```
   */
  async executeTool(name: string, params?: Record<string, any>): Promise<ToolResponse> {
    if (this.options.verbose) {
      console.log('[MockMcpClient] Executing tool:', name, params);
    }

    // Simulate network delay
    await simulateNetworkDelay(this.options.minDelay, this.options.maxDelay);

    // Mock tool execution - always succeeds in Layer 1
    const response: ToolResponse = {
      success: true,
      data: {
        toolName: name,
        params: params || {},
        message: `Tool '${name}' executed successfully (mock)`,
        timestamp: new Date().toISOString(),
      },
    };

    // Log action for debugging (Layer 2 enhancement)
    this.actionLog.push({
      timestamp: response.data.timestamp,
      action: name,
      params: params || {},
      result: response,
    });

    if (this.options.verbose) {
      console.log('[MockMcpClient] Tool executed:', response);
    }

    return response;
  }

  /**
   * Get available tools
   *
   * Returns list of available tools for Layer 2+ expansion.
   * Currently returns mock tool definitions.
   *
   * @returns Array of tool definitions
   *
   * @example
   * ```typescript
   * const client = new MockMcpClient();
   * const tools = client.getAvailableTools();
   * console.log('Available tools:', tools.map(t => t.name));
   * ```
   */
  getAvailableTools(): Tool[] {
    // Mock tools for Layer 2 expansion
    return [
      {
        name: 'add_to_cart',
        description: 'Add a product to the shopping cart',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Product ID' },
            quantity: { type: 'number', description: 'Quantity to add', default: 1 },
          },
          required: ['productId'],
        },
      },
      {
        name: 'refresh_data',
        description: 'Refresh resource data',
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: { type: 'string', description: 'Resource ID to refresh' },
          },
          required: ['resourceId'],
        },
      },
      {
        name: 'submit_form',
        description: 'Submit form data',
        inputSchema: {
          type: 'object',
          properties: {
            formData: { type: 'object', description: 'Form data to submit' },
          },
          required: ['formData'],
        },
      },
    ];
  }

  /**
   * Check if a resource exists
   *
   * @param uri - Resource URI or ID
   * @returns true if resource exists, false otherwise
   *
   * @example
   * ```typescript
   * const client = new MockMcpClient();
   * if (client.hasResource('product-card')) {
   *   const resource = await client.loadResource('product-card');
   * }
   * ```
   */
  hasResource(uri: string): boolean {
    if (this.resourceCache.has(uri)) {
      return true;
    }

    const demoResource = getDemoResource(uri as ResourceId);
    return !!demoResource;
  }

  /**
   * Get resource count
   *
   * @returns Number of available resources
   */
  getResourceCount(): number {
    return getAllDemoResources().length;
  }

  /**
   * Clear resource cache (for testing)
   */
  clearCache(): void {
    this.resourceCache.clear();
    this.initializeCache();

    if (this.options.verbose) {
      console.log('[MockMcpClient] Cache cleared and reinitialized');
    }
  }

  /**
   * Get client configuration
   *
   * @returns Current client options
   */
  getOptions(): Readonly<MockMcpClientOptions> {
    return { ...this.options };
  }

  /**
   * Get action log (Layer 2 enhancement)
   *
   * Returns all logged actions for debugging and display.
   *
   * @returns Array of logged actions
   */
  getActionLog(): ReadonlyArray<{ timestamp: string; action: string; params: any; result: any }> {
    return [...this.actionLog];
  }

  /**
   * Clear action log (Layer 2 enhancement)
   *
   * Clears all logged actions.
   */
  clearActionLog(): void {
    this.actionLog = [];
    if (this.options.verbose) {
      console.log('[MockMcpClient] Action log cleared');
    }
  }
}

/**
 * Default mock MCP client instance
 *
 * Pre-configured singleton for use across the demo application.
 */
export const mockMcpClient = new MockMcpClient({
  minDelay: 200,
  maxDelay: 500,
  verbose: false,
});

/**
 * Create a new mock MCP client with custom options
 *
 * @param options - Client configuration
 * @returns New MockMcpClient instance
 *
 * @example
 * ```typescript
 * const client = createMockMcpClient({ minDelay: 100, maxDelay: 200, verbose: true });
 * ```
 */
export function createMockMcpClient(options?: MockMcpClientOptions): MockMcpClient {
  return new MockMcpClient(options);
}
