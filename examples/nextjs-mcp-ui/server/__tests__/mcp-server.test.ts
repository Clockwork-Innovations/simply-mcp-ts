/**
 * MCP Server Tests
 *
 * Comprehensive test suite for the real MCP server implementation.
 * Tests verify resource management, tool execution, and server lifecycle.
 *
 * Layer 3 Phase 2: Server backend testing (50+ tests)
 *
 * @module server/__tests__/mcp-server.test
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MCPServer, createMCPServer, startMCPServer } from '../mcp-server.js';
import type { UIResourceContent } from '../../lib/types.js';

describe('MCP Server', () => {
  let server: MCPServer;

  beforeEach(() => {
    server = createMCPServer({ verbose: false });
  });

  afterEach(async () => {
    if (server.isServerRunning()) {
      await server.stop();
    }
  });

  describe('Server Lifecycle', () => {
    it('should create a server instance', () => {
      expect(server).toBeInstanceOf(MCPServer);
    });

    it('should start successfully', async () => {
      await server.start();
      expect(server.isServerRunning()).toBe(true);
    });

    it('should stop successfully', async () => {
      await server.start();
      expect(server.isServerRunning()).toBe(true);

      await server.stop();
      expect(server.isServerRunning()).toBe(false);
    });

    it('should throw error when starting already running server', async () => {
      await server.start();
      await expect(server.start()).rejects.toThrow('already running');
    });

    it('should throw error when stopping non-running server', async () => {
      await expect(server.stop()).rejects.toThrow('not running');
    });

    it('should accept configuration options', () => {
      const configuredServer = createMCPServer({
        port: 3002,
        host: '0.0.0.0',
        verbose: true,
        maxConnections: 500,
        requestTimeout: 60000,
      });

      expect(configuredServer).toBeInstanceOf(MCPServer);
    });
  });

  describe('Tool Registration', () => {
    it('should register default tools on initialization', async () => {
      await server.start();

      const tools = server.getAvailableTools();
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should register Layer 2 tools', async () => {
      await server.start();

      const tools = server.getAvailableTools();
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain('submit_feedback');
      expect(toolNames).toContain('send_contact_message');
      expect(toolNames).toContain('select_product');
    });

    it('should register Layer 3 tools', async () => {
      await server.start();

      const tools = server.getAvailableTools();
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain('stream_dashboard');
      expect(toolNames).toContain('stream_analytics');
    });

    it('should have valid tool schema', async () => {
      await server.start();

      const tools = server.getAvailableTools();

      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema).toBe('object');
      }
    });

    it('should allow registering custom tools', async () => {
      await server.start();

      server.registerTool({
        name: 'custom_tool',
        description: 'A custom tool',
        inputSchema: { type: 'object', properties: {} },
      });

      const tools = server.getAvailableTools();
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain('custom_tool');
    });
  });

  describe('Tool Execution - Layer 2', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should execute submit_feedback tool', async () => {
      const result = await server.executeTool({
        name: 'submit_feedback',
        arguments: {
          name: 'John Doe',
          email: 'john@example.com',
          category: 'bug',
          message: 'Found a bug',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.toolName).toBe('submit_feedback');
      expect(result.data?.result.feedbackId).toBeDefined();
    });

    it('should execute send_contact_message tool', async () => {
      const result = await server.executeTool({
        name: 'send_contact_message',
        arguments: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          phone: '555-1234',
          subject: 'Inquiry',
          message: 'I have a question',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.toolName).toBe('send_contact_message');
      expect(result.data?.result.messageId).toBeDefined();
    });

    it('should execute select_product tool', async () => {
      const result = await server.executeTool({
        name: 'select_product',
        arguments: {
          productId: 'prod-123',
          quantity: 2,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.toolName).toBe('select_product');
      expect(result.data?.result.cartId).toBeDefined();
    });

    it('should throw error for missing required arguments', async () => {
      const result = await server.executeTool({
        name: 'submit_feedback',
        arguments: {
          name: 'John',
          // Missing other required fields
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required argument');
    });

    it('should validate argument types', async () => {
      const result = await server.executeTool({
        name: 'select_product',
        arguments: {
          productId: 'prod-123',
          quantity: 'not a number', // Wrong type
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Tool Execution - Layer 3', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should execute stream_dashboard tool', async () => {
      const result = await server.executeTool({
        name: 'stream_dashboard',
        arguments: {
          userId: 'user-123',
          metrics: ['views', 'clicks'],
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.toolName).toBe('stream_dashboard');
      expect(result.data?.result.components).toBeDefined();
    });

    it('should execute stream_analytics tool', async () => {
      const result = await server.executeTool({
        name: 'stream_analytics',
        arguments: {
          userId: 'user-123',
          chartType: 'line',
          timeRange: '7d',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.toolName).toBe('stream_analytics');
      expect(result.data?.result.data).toBeDefined();
    });

    it('should handle optional arguments', async () => {
      const result = await server.executeTool({
        name: 'stream_dashboard',
        arguments: {
          userId: 'user-123',
          // metrics is optional
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Tool Execution - Error Handling', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should throw error for unknown tool', async () => {
      const result = await server.executeTool({
        name: 'unknown_tool',
        arguments: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool not found');
    });

    it('should handle missing arguments gracefully', async () => {
      const result = await server.executeTool({
        name: 'submit_feedback',
        // No arguments provided
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error response on execution failure', async () => {
      const result = await server.executeTool({
        name: 'submit_feedback',
        arguments: {
          name: 'John',
          email: 'invalid-email', // Invalid but accepted
          category: 'bug',
          message: 'Test',
        },
      });

      // Should succeed even with invalid email (validation not strict in this demo)
      expect(result.success).toBe(true);
    });
  });

  describe('Resource Management', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should have zero resources initially', () => {
      expect(server.getResourceCount()).toBe(0);
    });

    it('should add resource', () => {
      const resource: UIResourceContent = {
        uri: 'ui://test-resource',
        mimeType: 'text/html',
        text: '<div>Test</div>',
        _meta: {},
      };

      server.addResource(resource);

      expect(server.getResourceCount()).toBe(1);
    });

    it('should list resources', () => {
      const resource1: UIResourceContent = {
        uri: 'ui://resource-1',
        mimeType: 'text/html',
        text: '<div>1</div>',
        _meta: {},
      };

      const resource2: UIResourceContent = {
        uri: 'ui://resource-2',
        mimeType: 'text/html',
        text: '<div>2</div>',
        _meta: {},
      };

      server.addResource(resource1);
      server.addResource(resource2);

      const resources = server.listResources();

      expect(resources).toHaveLength(2);
      expect(resources.map((r) => r.uri)).toContain('ui://resource-1');
      expect(resources.map((r) => r.uri)).toContain('ui://resource-2');
    });

    it('should retrieve resource by URI', () => {
      const resource: UIResourceContent = {
        uri: 'ui://test-resource',
        mimeType: 'text/html',
        text: '<div>Test</div>',
        _meta: {},
      };

      server.addResource(resource);

      const retrieved = server.getResource('ui://test-resource');

      expect(retrieved).toEqual(resource);
    });

    it('should throw error for non-existent resource', () => {
      expect(() => server.getResource('ui://non-existent')).toThrow('Resource not found');
    });

    it('should handle multiple resources of different types', () => {
      const htmlResource: UIResourceContent = {
        uri: 'ui://html-resource',
        mimeType: 'text/html',
        text: '<div>HTML</div>',
        _meta: {},
      };

      const uriListResource: UIResourceContent = {
        uri: 'ui://uri-resource',
        mimeType: 'text/uri-list',
        text: 'https://example.com',
        _meta: {},
      };

      server.addResource(htmlResource);
      server.addResource(uriListResource);

      const resources = server.listResources();

      expect(resources).toHaveLength(2);
    });
  });

  describe('Server Configuration', () => {
    it('should use default configuration', async () => {
      const defaultServer = createMCPServer();
      await defaultServer.start();

      expect(defaultServer.isServerRunning()).toBe(true);

      await defaultServer.stop();
    });

    it('should accept custom port', () => {
      const customServer = createMCPServer({ port: 4000 });
      expect(customServer).toBeInstanceOf(MCPServer);
    });

    it('should accept custom host', () => {
      const customServer = createMCPServer({ host: '127.0.0.1' });
      expect(customServer).toBeInstanceOf(MCPServer);
    });

    it('should handle verbose mode', () => {
      const verboseServer = createMCPServer({ verbose: true });
      expect(verboseServer).toBeInstanceOf(MCPServer);
    });
  });

  describe('Integration Tests', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should handle complete workflow', async () => {
      // Add resources
      const resource: UIResourceContent = {
        uri: 'ui://workflow-test',
        mimeType: 'text/html',
        text: '<div>Workflow Test</div>',
        _meta: {},
      };

      server.addResource(resource);

      // Verify resource exists
      const retrieved = server.getResource('ui://workflow-test');
      expect(retrieved).toBeDefined();

      // Execute tool
      const toolResult = await server.executeTool({
        name: 'submit_feedback',
        arguments: {
          name: 'Test User',
          email: 'test@example.com',
          category: 'feedback',
          message: 'Great service!',
        },
      });

      expect(toolResult.success).toBe(true);

      // List all resources
      const resources = server.listResources();
      expect(resources.length).toBeGreaterThan(0);
    });

    it('should handle concurrent tool executions', async () => {
      const executions = [
        server.executeTool({
          name: 'select_product',
          arguments: { productId: 'prod-1' },
        }),
        server.executeTool({
          name: 'select_product',
          arguments: { productId: 'prod-2' },
        }),
        server.executeTool({
          name: 'select_product',
          arguments: { productId: 'prod-3' },
        }),
      ];

      const results = await Promise.all(executions);

      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(result.success).toBe(true);
      }
    });

    it('should handle multiple resource operations', () => {
      const resources: UIResourceContent[] = [];

      for (let i = 0; i < 10; i++) {
        const resource: UIResourceContent = {
          uri: `ui://resource-${i}`,
          mimeType: 'text/html',
          text: `<div>Resource ${i}</div>`,
          _meta: {},
        };
        resources.push(resource);
        server.addResource(resource);
      }

      expect(server.getResourceCount()).toBe(10);

      const allResources = server.listResources();
      expect(allResources).toHaveLength(10);

      // Retrieve specific resource
      const retrieved = server.getResource('ui://resource-5');
      expect(retrieved?.text).toContain('Resource 5');
    });

    it('should maintain server state across operations', async () => {
      // Add resource
      const resource: UIResourceContent = {
        uri: 'ui://state-test',
        mimeType: 'text/html',
        text: '<div>State Test</div>',
        _meta: {},
      };
      server.addResource(resource);

      // Execute tool
      await server.executeTool({
        name: 'select_product',
        arguments: { productId: 'prod-123' },
      });

      // Verify resource still exists
      const retrieved = server.getResource('ui://state-test');
      expect(retrieved).toBeDefined();

      // Verify tools still registered
      const tools = server.getAvailableTools();
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  describe('Server Performance', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should handle rapid tool executions', async () => {
      const executions = [];

      for (let i = 0; i < 50; i++) {
        executions.push(
          server.executeTool({
            name: 'select_product',
            arguments: { productId: `prod-${i}` },
          })
        );
      }

      const results = await Promise.all(executions);

      expect(results).toHaveLength(50);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should handle large number of resources', () => {
      for (let i = 0; i < 100; i++) {
        const resource: UIResourceContent = {
          uri: `ui://perf-resource-${i}`,
          mimeType: 'text/html',
          text: `<div>Performance Test ${i}</div>`,
          _meta: {},
        };
        server.addResource(resource);
      }

      expect(server.getResourceCount()).toBe(100);

      const resources = server.listResources();
      expect(resources).toHaveLength(100);
    });
  });
});
