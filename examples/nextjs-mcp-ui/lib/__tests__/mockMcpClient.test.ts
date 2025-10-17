/**
 * Unit Tests for Mock MCP Client
 *
 * Tests verify that the mock MCP client correctly:
 * - Returns valid UIResourceContent objects
 * - Simulates async behavior with delays
 * - Handles errors for invalid resources
 * - Provides tool execution simulation
 * - Manages resource caching
 *
 * @module lib/__tests__/mockMcpClient.test
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MockMcpClient, createMockMcpClient } from '../mockMcpClient.js';
import { isValidUIResource } from '../utils.js';
import type { ResourceId } from '../types.js';

describe('MockMcpClient', () => {
  let client: MockMcpClient;

  beforeEach(() => {
    // Create a new client for each test with minimal delay for faster tests
    client = createMockMcpClient({
      minDelay: 10,
      maxDelay: 20,
      verbose: false,
    });
  });

  describe('initialization', () => {
    it('should create a client instance', () => {
      expect(client).toBeInstanceOf(MockMcpClient);
    });

    it('should initialize with demo resources', () => {
      const count = client.getResourceCount();
      // Exact count verification: DEMO_RESOURCES contains 10 resources (5 Layer 1 + 3 Phase 2 + 2 Phase 4 external)
      expect(count).toBe(10);
    });

    it('should accept custom options', () => {
      const customClient = createMockMcpClient({
        minDelay: 100,
        maxDelay: 200,
        verbose: true,
      });

      const options = customClient.getOptions();
      expect(options.minDelay).toBe(100);
      expect(options.maxDelay).toBe(200);
      expect(options.verbose).toBe(true);
    });
  });

  describe('loadResource', () => {
    it('should load resource by ID', async () => {
      const resource = await client.loadResource('product-card');

      expect(resource).toBeDefined();
      expect(resource.uri).toBe('ui://product-card/layer1');
      expect(resource.mimeType).toBe('text/html');
      expect(resource.text).toBeDefined();
    });

    it('should load resource by URI', async () => {
      const resource = await client.loadResource('ui://product-card/layer1');

      expect(resource).toBeDefined();
      expect(resource.uri).toBe('ui://product-card/layer1');
    });

    it('should return valid UIResourceContent objects', async () => {
      const resource = await client.loadResource('info-card');

      expect(isValidUIResource(resource)).toBe(true);
    });

    it('should throw error for invalid resource ID', async () => {
      await expect(client.loadResource('nonexistent-resource')).rejects.toThrow(
        'Resource not found'
      );
    });

    it('should simulate async behavior', async () => {
      const startTime = Date.now();
      await client.loadResource('product-card');
      const endTime = Date.now();

      // Should take at least minDelay milliseconds
      expect(endTime - startTime).toBeGreaterThanOrEqual(10);
    });

    it('should load all demo resources successfully', async () => {
      const resourceIds: ResourceId[] = [
        'product-card',
        'info-card',
        'feature-list',
        'statistics-display',
        'welcome-card',
      ];

      for (const id of resourceIds) {
        const resource = await client.loadResource(id);
        expect(isValidUIResource(resource)).toBe(true);
        expect(resource.mimeType).toBe('text/html');
        // Verify HTML content is complete and substantive
        expect(resource.text).toContain('<!DOCTYPE html>');
        expect(resource.text!.length).toBeGreaterThan(100);
      }
    });
  });

  describe('listResources', () => {
    it('should return array of resources', async () => {
      const resources = await client.listResources();

      expect(Array.isArray(resources)).toBe(true);
      // Exact count verification: should return all 10 demo resources (5 Layer 1 + 3 Phase 2 + 2 Phase 4 external)
      expect(resources.length).toBe(10);
    });

    it('should return valid UIResourceContent objects', async () => {
      const resources = await client.listResources();

      resources.forEach((resource) => {
        expect(isValidUIResource(resource)).toBe(true);
      });
    });

    it('should simulate async behavior', async () => {
      const startTime = Date.now();
      await client.listResources();
      const endTime = Date.now();

      // Should take at least minDelay milliseconds
      expect(endTime - startTime).toBeGreaterThanOrEqual(10);
    });
  });

  describe('executeTool', () => {
    it('should execute tool successfully', async () => {
      const response = await client.executeTool('add_to_cart', {
        productId: '123',
        quantity: 2,
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.toolName).toBe('add_to_cart');
      expect(response.data.params.productId).toBe('123');
    });

    it('should execute tool without parameters', async () => {
      const response = await client.executeTool('refresh_data');

      expect(response.success).toBe(true);
      expect(response.data.toolName).toBe('refresh_data');
    });

    it('should simulate async behavior', async () => {
      const startTime = Date.now();
      await client.executeTool('add_to_cart');
      const endTime = Date.now();

      // Should take at least minDelay milliseconds
      expect(endTime - startTime).toBeGreaterThanOrEqual(10);
    });

    it('should include timestamp in response', async () => {
      const response = await client.executeTool('submit_form', { data: 'test' });

      expect(response.data.timestamp).toBeDefined();
      expect(typeof response.data.timestamp).toBe('string');
    });

    it('should always succeed in Layer 1 (no failure validation)', async () => {
      // Layer 1: Tool execution always returns success
      // This is intentional for foundation layer - all tools succeed
      // Layer 2 will add proper validation and failure handling
      const response = await client.executeTool('nonexistent_tool', {
        invalid: 'params',
      });

      expect(response.success).toBe(true);
      expect(response.data.toolName).toBe('nonexistent_tool');
      expect(response.data.params.invalid).toBe('params');
    });
  });

  describe('getAvailableTools', () => {
    it('should return array of tools', () => {
      const tools = client.getAvailableTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should return tools with required fields', () => {
      const tools = client.getAvailableTools();

      tools.forEach((tool) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
      });
    });

    it('should include expected tools', () => {
      const tools = client.getAvailableTools();
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain('add_to_cart');
      expect(toolNames).toContain('refresh_data');
      expect(toolNames).toContain('submit_form');
    });
  });

  describe('hasResource', () => {
    it('should return true for existing resource by ID', () => {
      expect(client.hasResource('product-card')).toBe(true);
    });

    it('should return true for existing resource by URI', () => {
      expect(client.hasResource('ui://product-card/layer1')).toBe(true);
    });

    it('should return false for non-existent resource', () => {
      expect(client.hasResource('nonexistent')).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should cache loaded resources and return same reference', async () => {
      // Layer 1: Cache stores resource references for consistent object identity
      // Note: Layer 1 still simulates network delay on each load for realistic demo behavior
      // Layer 2+ may optimize to skip delays for cached resources

      // Load resource twice
      const resource1 = await client.loadResource('product-card');
      const resource2 = await client.loadResource('product-card');

      // Verify both resources are valid
      expect(isValidUIResource(resource1)).toBe(true);
      expect(isValidUIResource(resource2)).toBe(true);

      // Cache ensures same object reference (object identity preservation)
      expect(resource1).toBe(resource2);

      // Verify resource has expected properties
      expect(resource1.uri).toBe('ui://product-card/layer1');
      expect(resource1.mimeType).toBe('text/html');
      expect(resource1.text).toBeDefined();
      expect(resource1.text!.length).toBeGreaterThan(0);
    });

    it('should pre-populate cache on initialization', () => {
      // Cache should contain all demo resources from the start
      const resourceCount = client.getResourceCount();
      expect(resourceCount).toBe(10); // 10 demo resources (5 Layer 1 + 3 Phase 2 + 2 Phase 4 external)

      // All Layer 1 resources should be immediately available (no async needed for check)
      expect(client.hasResource('product-card')).toBe(true);
      expect(client.hasResource('info-card')).toBe(true);
      expect(client.hasResource('feature-list')).toBe(true);
      expect(client.hasResource('statistics-display')).toBe(true);
      expect(client.hasResource('welcome-card')).toBe(true);

      // All Phase 2 resources should also be immediately available
      expect(client.hasResource('feedback-form')).toBe(true);
      expect(client.hasResource('contact-form')).toBe(true);
      expect(client.hasResource('product-selector')).toBe(true);

      // All Phase 4 external resources should be immediately available
      expect(client.hasResource('external-demo')).toBe(true);
      expect(client.hasResource('external-docs')).toBe(true);
    });

    it('should clear cache on request', async () => {
      await client.loadResource('product-card');
      client.clearCache();

      // Should still be able to load after cache clear
      const resource = await client.loadResource('product-card');
      expect(resource).toBeDefined();
    });
  });

  describe('resource validation', () => {
    it('should ensure all resources have required fields', async () => {
      const resources = await client.listResources();

      resources.forEach((resource) => {
        expect(resource.uri).toBeDefined();
        expect(typeof resource.uri).toBe('string');
        expect(resource.uri).toMatch(/^ui:\/\//);

        expect(resource.mimeType).toBeDefined();
        // Resources can be either text/html (Layer 1-2) or text/uri-list (Phase 4 external)
        expect(['text/html', 'text/uri-list']).toContain(resource.mimeType);

        expect(resource.text).toBeDefined();
        expect(typeof resource.text).toBe('string');
        expect(resource.text!.length).toBeGreaterThan(0);
      });
    });

    it('should ensure all resources have metadata', async () => {
      const resources = await client.listResources();

      resources.forEach((resource) => {
        expect(resource._meta).toBeDefined();
        expect(typeof resource._meta).toBe('object');
      });
    });

    it('should ensure HTML is complete documents', async () => {
      const resource = await client.loadResource('product-card');

      expect(resource.text).toContain('<!DOCTYPE html>');
      expect(resource.text).toContain('<html');
      expect(resource.text).toContain('</html>');
    });
  });

  describe('error handling', () => {
    it('should provide descriptive error messages', async () => {
      try {
        await client.loadResource('invalid-resource-id');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Resource not found');
        expect((error as Error).message).toContain('invalid-resource-id');
      }
    });
  });

  describe('performance', () => {
    it('should load resources within reasonable time', async () => {
      const startTime = Date.now();
      await client.loadResource('product-card');
      const endTime = Date.now();

      // With minDelay=10 and maxDelay=20, should complete within 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle multiple concurrent requests', async () => {
      const promises = [
        client.loadResource('product-card'),
        client.loadResource('info-card'),
        client.loadResource('welcome-card'),
      ];

      const resources = await Promise.all(promises);

      expect(resources.length).toBe(3);
      resources.forEach((resource) => {
        expect(isValidUIResource(resource)).toBe(true);
      });
    });
  });
});

describe('Resource Content Validation', () => {
  let client: MockMcpClient;

  beforeEach(() => {
    client = createMockMcpClient({ minDelay: 10, maxDelay: 20 });
  });

  it('should have self-contained HTML (no external scripts)', async () => {
    const resources = await client.listResources();

    resources.forEach((resource) => {
      const text = resource.text;
      if (text && text.length > 0) {
        // Should not have external script tags
        expect(text).not.toMatch(/<script[^>]+src=/i);
      }
    });
  });

  it('should have inline styles in style tags', async () => {
    const resource = await client.loadResource('product-card');

    expect(resource.text).toContain('<style>');
    expect(resource.text).toContain('</style>');
  });

  it('should not contain dangerous patterns', async () => {
    const resources = await client.listResources();

    resources.forEach((resource) => {
      const text = resource.text;
      if (text && text.length > 0) {
        // Should not contain eval or Function constructor
        expect(text.toLowerCase()).not.toContain('eval(');
        expect(text).not.toContain('new Function');
      }
    });
  });
});
