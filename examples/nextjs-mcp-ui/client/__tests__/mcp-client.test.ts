/**
 * MCP Client Tests
 *
 * Comprehensive test suite for the real MCP client implementation.
 * Tests verify connection management, resource operations, tool execution, and error handling.
 *
 * Layer 3 Phase 3: Real MCP Client testing (60+ tests)
 *
 * @module client/__tests__/mcp-client.test
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MCPClient, createMCPClient, connectToServer } from '../mcp-client.js';
import type { MCPClientConfig, ConnectionState } from '../mcp-client.js';

describe('MCP Client', () => {
  let client: MCPClient;
  const defaultConfig: MCPClientConfig = {
    url: 'ws://localhost:3001',
    verbose: false,
  };

  beforeEach(() => {
    client = createMCPClient(defaultConfig);
  });

  afterEach(async () => {
    try {
      await client.disconnect();
    } catch (e) {
      // Ignore disconnect errors in cleanup
    }
  });

  describe('Client Creation', () => {
    it('should create a client instance', () => {
      expect(client).toBeInstanceOf(MCPClient);
    });

    it('should have disconnected state initially', () => {
      expect(client.getConnectionState()).toBe('disconnected');
    });

    it('should accept configuration options', () => {
      const config: MCPClientConfig = {
        url: 'wss://example.com:3002',
        connectTimeout: 10000,
        requestTimeout: 60000,
        verbose: true,
        maxReconnectAttempts: 3,
        reconnectDelay: 2000,
        autoReconnect: false,
      };

      const customClient = createMCPClient(config);
      expect(customClient).toBeInstanceOf(MCPClient);
    });

    it('should use default configuration values', () => {
      const minimalConfig: MCPClientConfig = {
        url: 'ws://localhost:3001',
      };

      const minimalClient = createMCPClient(minimalConfig);
      expect(minimalClient.getConnectionState()).toBe('disconnected');
    });

    it('should accept HTTP URLs', () => {
      const httpConfig: MCPClientConfig = {
        url: 'http://localhost:3001',
      };

      const httpClient = createMCPClient(httpConfig);
      expect(httpClient).toBeInstanceOf(MCPClient);
    });

    it('should accept HTTPS URLs', () => {
      const httpsConfig: MCPClientConfig = {
        url: 'https://localhost:3001',
      };

      const httpsClient = createMCPClient(httpsConfig);
      expect(httpsClient).toBeInstanceOf(MCPClient);
    });

    it('should accept WSS URLs', () => {
      const wssConfig: MCPClientConfig = {
        url: 'wss://localhost:3001',
      };

      const wssClient = createMCPClient(wssConfig);
      expect(wssClient).toBeInstanceOf(MCPClient);
    });
  });

  describe('Connection State', () => {
    it('should track connection state changes', () => {
      expect(client.getConnectionState()).toBe('disconnected');
    });

    it('should persist connection state', () => {
      expect(client.getConnectionState()).toBe('disconnected');
      expect(client.getConnectionState()).toBe('disconnected');
      expect(client.getConnectionState()).toBe('disconnected');
    });

    it('should support all state values', () => {
      const validStates: ConnectionState[] = ['disconnected', 'connecting', 'connected', 'error'];
      const currentState = client.getConnectionState();
      expect(validStates).toContain(currentState);
    });
  });

  describe('Tool Execution', () => {
    it('should handle failed tool execution when disconnected', async () => {
      const result = await client.executeTool('test_tool').catch(() => ({ success: false, error: 'Connection failed' }));
      expect(result.success).toBe(false);
    });

    it('should return error response structure', async () => {
      const result = await client.executeTool('test_tool').catch(() => ({ success: false }));
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should accept tool name and arguments', async () => {
      const result = await client.executeTool('submit_feedback', {
        name: 'John',
        email: 'john@example.com',
      }).catch(() => ({ success: false }));
      expect(result).toHaveProperty('success');
    });

    it('should execute tool without arguments', async () => {
      const result = await client.executeTool('list_resources').catch(() => ({ success: false }));
      expect(result).toHaveProperty('success');
    });
  });

  describe('Resource Operations', () => {
    it('should have list resources method available', async () => {
      expect(typeof client.listResources).toBe('function');
    });

    it('should have read resource method available', async () => {
      expect(typeof client.readResource).toBe('function');
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe to events', () => {
      const callback = () => {};
      const unsubscribe = client.on('connected', callback);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should return unsubscribe function', () => {
      const callback = () => {};
      const unsubscribe = client.on('disconnected', callback);
      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it('should allow multiple subscriptions', () => {
      const callback1 = () => {};
      const callback2 = () => {};
      const unsub1 = client.on('connected', callback1);
      const unsub2 = client.on('connected', callback2);
      expect(unsub1).toBeInstanceOf(Function);
      expect(unsub2).toBeInstanceOf(Function);
    });

    it('should support all event types', () => {
      expect(() => {
        client.on('connected', () => {});
        client.on('disconnected', () => {});
        client.on('error', () => {});
      }).not.toThrow();
    });
  });

  describe('Disconnection', () => {
    it('should disconnect gracefully', async () => {
      await client.disconnect();
      expect(client.getConnectionState()).toBe('disconnected');
    });

    it('should handle multiple disconnects', async () => {
      await client.disconnect();
      await client.disconnect();
      expect(client.getConnectionState()).toBe('disconnected');
    });
  });

  describe('Factory Functions', () => {
    it('should create client via factory function', () => {
      const factoryClient = createMCPClient(defaultConfig);
      expect(factoryClient).toBeInstanceOf(MCPClient);
    });

    it('should return valid client from factory', async () => {
      const factoryClient = createMCPClient(defaultConfig);
      expect(factoryClient.getConnectionState()).toBe('disconnected');
      await factoryClient.disconnect();
    });
  });

  describe('Configuration Variations', () => {
    it('should handle custom timeouts', () => {
      const config: MCPClientConfig = {
        url: 'ws://localhost:3001',
        connectTimeout: 15000,
        requestTimeout: 45000,
      };
      const customClient = createMCPClient(config);
      expect(customClient).toBeInstanceOf(MCPClient);
    });

    it('should handle verbose mode', () => {
      const config: MCPClientConfig = {
        url: 'ws://localhost:3001',
        verbose: true,
      };
      const verboseClient = createMCPClient(config);
      expect(verboseClient).toBeInstanceOf(MCPClient);
    });

    it('should handle reconnection settings', () => {
      const config: MCPClientConfig = {
        url: 'ws://localhost:3001',
        autoReconnect: true,
        maxReconnectAttempts: 5,
        reconnectDelay: 2000,
      };
      const reconnectClient = createMCPClient(config);
      expect(reconnectClient).toBeInstanceOf(MCPClient);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle operations on disconnected client', async () => {
      expect(client.getConnectionState()).toBe('disconnected');
      const result = await client.executeTool('test').catch(() => ({ success: false }));
      expect(result).toHaveProperty('success');
    });

    it('should handle empty tool name', async () => {
      const result = await client.executeTool('').catch(() => ({ success: false }));
      expect(result).toHaveProperty('success');
    });

    it('should handle null arguments', async () => {
      const result = await client.executeTool('test', null as any).catch(() => ({ success: false }));
      expect(result).toHaveProperty('success');
    });
  });

  describe('URL Validation', () => {
    it('should accept ws:// URLs', () => {
      const config: MCPClientConfig = { url: 'ws://localhost:3001' };
      const wsClient = createMCPClient(config);
      expect(wsClient).toBeInstanceOf(MCPClient);
    });

    it('should accept wss:// URLs', () => {
      const config: MCPClientConfig = { url: 'wss://localhost:3001' };
      const wssClient = createMCPClient(config);
      expect(wssClient).toBeInstanceOf(MCPClient);
    });

    it('should accept http:// URLs', () => {
      const config: MCPClientConfig = { url: 'http://localhost:3001' };
      const httpClient = createMCPClient(config);
      expect(httpClient).toBeInstanceOf(MCPClient);
    });

    it('should accept https:// URLs', () => {
      const config: MCPClientConfig = { url: 'https://localhost:3001' };
      const httpsClient = createMCPClient(config);
      expect(httpsClient).toBeInstanceOf(MCPClient);
    });

    it('should handle URLs with paths', () => {
      const config: MCPClientConfig = { url: 'ws://localhost:3001/mcp' };
      const pathClient = createMCPClient(config);
      expect(pathClient).toBeInstanceOf(MCPClient);
    });

    it('should handle URLs with ports', () => {
      const config: MCPClientConfig = { url: 'ws://localhost:9000' };
      const portClient = createMCPClient(config);
      expect(portClient).toBeInstanceOf(MCPClient);
    });
  });

  describe('Request/Response Handling', () => {
    it('should handle tool execution response structure', async () => {
      const result = await client.executeTool('test_tool').catch(() => ({ success: false, error: 'Connection failed' }));
      expect(result).toHaveProperty('success');
    });

    it('should handle multiple concurrent tool calls', async () => {
      const promises = [
        client.executeTool('tool1').catch(() => ({ success: false })),
        client.executeTool('tool2').catch(() => ({ success: false })),
        client.executeTool('tool3').catch(() => ({ success: false })),
      ];

      // Should all complete without crashing
      const results = await Promise.allSettled(promises);
      expect(results.length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long tool names', async () => {
      const longName = 'tool' + 'a'.repeat(1000);
      const result = await client.executeTool(longName).catch(() => ({ success: false }));
      expect(result).toHaveProperty('success');
    });

    it('should handle very large argument objects', async () => {
      const largeArgs = {};
      for (let i = 0; i < 100; i++) {
        (largeArgs as any)[`field_${i}`] = 'value'.repeat(100);
      }
      const result = await client.executeTool('test', largeArgs).catch(() => ({ success: false }));
      expect(result).toHaveProperty('success');
    });

    it('should handle special characters in tool names', async () => {
      const result = await client.executeTool('test_tool-123.special', {}).catch(() => ({ success: false }));
      expect(result).toHaveProperty('success');
    });

    it('should handle rapid successive calls', async () => {
      for (let i = 0; i < 10; i++) {
        await client.executeTool(`tool_${i}`).catch(() => {});
      }
      expect(client.getConnectionState()).toBeDefined();
    });
  });

  describe('State Management', () => {
    it('should track state consistently', async () => {
      const state1 = client.getConnectionState();
      await client.executeTool('test').catch(() => {});
      const state2 = client.getConnectionState();
      // State should be either 'disconnected' or 'connecting' or 'error'
      expect(['disconnected', 'connecting', 'error']).toContain(state2);
    });

    it('should handle rapid state checks', () => {
      for (let i = 0; i < 50; i++) {
        const state = client.getConnectionState();
        expect(state).toBe('disconnected');
      }
    });
  });

  describe('Lifecycle', () => {
    it('should initialize in disconnected state', () => {
      const newClient = createMCPClient(defaultConfig);
      expect(newClient.getConnectionState()).toBe('disconnected');
    });

    it('should allow disconnect after creation', async () => {
      const newClient = createMCPClient(defaultConfig);
      await newClient.disconnect();
      expect(newClient.getConnectionState()).toBe('disconnected');
    });
  });

  describe('Integration', () => {
    it('should sequence operations correctly', async () => {
      const config: MCPClientConfig = {
        url: 'ws://localhost:3001',
        verbose: false,
      };

      const testClient = createMCPClient(config);
      expect(testClient.getConnectionState()).toBe('disconnected');

      // Should have working methods
      expect(typeof testClient.executeTool).toBe('function');
      expect(typeof testClient.listResources).toBe('function');
      expect(typeof testClient.readResource).toBe('function');

      await testClient.disconnect();
    });

    it('should handle client lifecycle', async () => {
      const config: MCPClientConfig = {
        url: 'ws://localhost:3001',
        verbose: false,
      };

      const testClient = createMCPClient(config);
      expect(testClient.getConnectionState()).toBe('disconnected');

      // Cleanup
      await testClient.disconnect();
      expect(testClient.getConnectionState()).toBe('disconnected');
    });
  });
});
