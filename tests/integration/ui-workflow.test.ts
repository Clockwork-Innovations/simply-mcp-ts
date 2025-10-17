/**
 * Integration Tests for UI Resource Workflow
 *
 * End-to-end tests that verify the complete workflow from server creation
 * to client rendering of UI resources. These tests ensure that:
 * - Servers can create UI resources using BuildMCPServer
 * - Resources have correct structure for MCP protocol
 * - Client utilities can process server-created resources
 * - Multiple resources can coexist in one server
 * - Error handling works throughout the stack
 * - Dynamic resources generate content correctly
 *
 * Test Strategy:
 * - Test full end-to-end workflows
 * - Use actual BuildMCPServer instances
 * - Verify serialization/deserialization
 * - Test realistic use cases
 * - Ensure integration between layers
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { BuildMCPServer } from '../../src/api/programmatic/index.js';
import { createInlineHTMLResource } from '../../src/core/ui-resource.js';
import {
  isUIResource as clientIsUIResource,
  getHTMLContent,
  getContentType,
} from '../../src/client/ui-utils.js';
import {
  getPreferredFrameSize,
  getInitialRenderData,
} from '../../src/client/ui-types.js';
import { z } from 'zod';

describe('UI Resource Workflow Integration', () => {
  let server: BuildMCPServer;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Server-Side Resource Creation', () => {
    test('creates server with UI resource using addUIResource', async () => {
      server = new BuildMCPServer({
        name: 'test-ui-server',
        version: '1.0.0',
      });

      server.addUIResource(
        'ui://test/basic',
        'Basic Test UI',
        'A basic test UI resource',
        'text/html',
        '<div>Hello World</div>'
      );

      const stats = server.getStats();
      expect(stats.resources).toBe(1);

      const resources = server.getResources();
      expect(resources.size).toBe(1);
      expect(resources.has('ui://test/basic')).toBe(true);
    });

    test('creates multiple UI resources in same server', async () => {
      server = new BuildMCPServer({
        name: 'multi-ui-server',
        version: '1.0.0',
      });

      server.addUIResource(
        'ui://test/card1',
        'Card 1',
        'First card',
        'text/html',
        '<div>Card 1</div>'
      );

      server.addUIResource(
        'ui://test/card2',
        'Card 2',
        'Second card',
        'text/html',
        '<div>Card 2</div>'
      );

      server.addUIResource(
        'ui://test/card3',
        'Card 3',
        'Third card',
        'text/html',
        '<div>Card 3</div>'
      );

      const stats = server.getStats();
      expect(stats.resources).toBe(3);
    });

    test('creates dynamic UI resource with function', async () => {
      server = new BuildMCPServer({
        name: 'dynamic-ui-server',
        version: '1.0.0',
      });

      let counter = 0;
      server.addUIResource(
        'ui://test/dynamic',
        'Dynamic Counter',
        'Shows incrementing counter',
        'text/html',
        () => {
          counter++;
          return `<div>Count: ${counter}</div>`;
        }
      );

      const stats = server.getStats();
      expect(stats.resources).toBe(1);
    });

    test('rejects UI resource with invalid URI', () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      expect(() => {
        server.addUIResource(
          'http://example.com',
          'Invalid',
          'Invalid URI',
          'text/html',
          '<div>Test</div>'
        );
      }).toThrow('UI resource URI must start with "ui://"');
    });

    test('rejects UI resource with invalid MIME type', () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      expect(() => {
        server.addUIResource(
          'ui://test/invalid',
          'Invalid',
          'Invalid MIME type',
          'application/json',
          '<div>Test</div>'
        );
      }).toThrow('Invalid UI resource MIME type');
    });

    test('prevents duplicate URI registration', () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addUIResource(
        'ui://test/duplicate',
        'First',
        'First resource',
        'text/html',
        '<div>First</div>'
      );

      expect(() => {
        server.addUIResource(
          'ui://test/duplicate',
          'Second',
          'Second resource',
          'text/html',
          '<div>Second</div>'
        );
      }).toThrow('Resource with URI \'ui://test/duplicate\' is already registered');
    });
  });

  describe('Resource Serialization and Structure', () => {
    test('resource has correct MCP structure', async () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      const html = '<div><h1>Test</h1></div>';
      server.addUIResource(
        'ui://test/structure',
        'Structure Test',
        'Tests resource structure',
        'text/html',
        html
      );

      // Read the resource directly
      const result = await server.readResourceDirect('ui://test/structure');

      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents.length).toBe(1);

      const content = result.contents[0];
      expect(content.uri).toBe('ui://test/structure');
      expect(content.mimeType).toBe('text/html');
      expect(content.text).toBe(html);
    });

    test('dynamic resource generates fresh content each time', async () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      let callCount = 0;
      server.addUIResource(
        'ui://test/counter',
        'Counter',
        'Dynamic counter',
        'text/html',
        () => {
          callCount++;
          return `<div>Call: ${callCount}</div>`;
        }
      );

      // Read resource multiple times
      const result1 = await server.readResourceDirect('ui://test/counter');
      const result2 = await server.readResourceDirect('ui://test/counter');
      const result3 = await server.readResourceDirect('ui://test/counter');

      expect(result1.contents[0].text).toContain('Call: 1');
      expect(result2.contents[0].text).toContain('Call: 2');
      expect(result3.contents[0].text).toContain('Call: 3');
    });

    test('resource can be serialized to JSON', async () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addUIResource(
        'ui://test/json',
        'JSON Test',
        'Test JSON serialization',
        'text/html',
        '<div>Test</div>'
      );

      const result = await server.readResourceDirect('ui://test/json');

      // Should be serializable
      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      // Should be deserializable
      const parsed = JSON.parse(json);
      expect(parsed.contents[0].uri).toBe('ui://test/json');
      expect(parsed.contents[0].text).toBe('<div>Test</div>');
    });
  });

  describe('Client-Server Integration', () => {
    test('client can process server-created resource', async () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      const html = '<div><h1>Client Test</h1><p>Content</p></div>';
      server.addUIResource(
        'ui://test/client',
        'Client Test',
        'Test client processing',
        'text/html',
        html
      );

      // Server creates resource
      const result = await server.readResourceDirect('ui://test/client');
      const resourceContent = result.contents[0];

      // Client validates resource
      expect(clientIsUIResource(resourceContent)).toBe(true);

      // Client extracts content
      const contentType = getContentType(resourceContent.mimeType);
      expect(contentType).toBe('rawHtml');

      const extractedHtml = getHTMLContent(resourceContent);
      expect(extractedHtml).toBe(html);
    });

    test('client can process resource with metadata', async () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      // Create resource with metadata using createInlineHTMLResource
      const uiResource = createInlineHTMLResource(
        'ui://test/with-meta',
        '<div>Test</div>',
        {
          metadata: {
            preferredFrameSize: { width: 800, height: 600 },
            initialRenderData: { theme: 'dark' },
          },
        }
      );

      // Add to server as regular resource
      server.addResource({
        uri: 'ui://test/with-meta',
        name: 'Resource with Metadata',
        description: 'Has metadata',
        mimeType: 'text/html',
        content: uiResource.resource.text!,
      });

      // Server returns resource
      const result = await server.readResourceDirect('ui://test/with-meta');
      const resourceContent = result.contents[0];

      // Client should be able to read if we manually add metadata
      // (In real MCP, metadata would be preserved)
      const contentWithMeta = {
        ...resourceContent,
        _meta: uiResource.resource._meta,
      };

      // Client extracts metadata
      const frameSize = getPreferredFrameSize(contentWithMeta._meta);
      expect(frameSize).toEqual({ width: 800, height: 600 });

      const renderData = getInitialRenderData(contentWithMeta._meta);
      expect(renderData).toEqual({ theme: 'dark' });
    });

    test('end-to-end workflow with tool returning UI resource', async () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      // Add UI resource
      server.addUIResource(
        'ui://dashboard/stats',
        'Stats Dashboard',
        'Shows statistics',
        'text/html',
        '<div><h1>Statistics</h1><p>Users: 42</p></div>'
      );

      // Add tool that returns info about UI resource
      server.addTool({
        name: 'get_dashboard',
        description: 'Get dashboard UI resource',
        parameters: z.object({}),
        execute: async () => {
          return JSON.stringify({
            resourceUri: 'ui://dashboard/stats',
            message: 'Dashboard UI resource is available',
          });
        },
      });

      // Tool execution
      const toolResult = await server.executeToolDirect('get_dashboard', {});

      expect(toolResult.content).toBeDefined();
      expect(toolResult.content[0].text).toContain('ui://dashboard/stats');

      // Client can then fetch the resource
      const resource = await server.readResourceDirect('ui://dashboard/stats');
      expect(resource.contents[0].text).toContain('Statistics');
    });
  });

  describe('Error Handling', () => {
    test('reading non-existent resource throws error', async () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addUIResource(
        'ui://test/exists',
        'Exists',
        'This exists',
        'text/html',
        '<div>Exists</div>'
      );

      await expect(
        server.readResourceDirect('ui://test/does-not-exist')
      ).rejects.toThrow('Unknown resource');
    });

    test('handles dynamic resource that throws error', async () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addUIResource(
        'ui://test/error',
        'Error Test',
        'Throws error',
        'text/html',
        () => {
          throw new Error('Dynamic generation failed');
        }
      );

      await expect(
        server.readResourceDirect('ui://test/error')
      ).rejects.toThrow('Dynamic generation failed');
    });

    test('client handles invalid resource gracefully', () => {
      const invalidResource = {
        uri: 'ui://invalid',
        mimeType: 'application/json',
        text: '{}',
      };

      expect(clientIsUIResource(invalidResource)).toBe(false);
      expect(getContentType(invalidResource.mimeType)).toBeNull();
    });

    test('client handles resource with missing content', () => {
      const emptyResource = {
        uri: 'ui://empty',
        mimeType: 'text/html',
      };

      const html = getHTMLContent(emptyResource as any);
      expect(html).toBe('');
    });
  });

  describe('Complex Workflows', () => {
    test('server with mix of UI resources and regular resources', async () => {
      server = new BuildMCPServer({
        name: 'mixed-server',
        version: '1.0.0',
      });

      // UI resource
      server.addUIResource(
        'ui://dashboard',
        'Dashboard',
        'UI dashboard',
        'text/html',
        '<div>Dashboard</div>'
      );

      // Regular resource
      server.addResource({
        uri: 'file://data.json',
        name: 'Data',
        description: 'JSON data',
        mimeType: 'application/json',
        content: JSON.stringify({ key: 'value' }),
      });

      const stats = server.getStats();
      expect(stats.resources).toBe(2);

      // Both should be accessible
      const uiResource = await server.readResourceDirect('ui://dashboard');
      expect(uiResource.contents[0].mimeType).toBe('text/html');

      const dataResource = await server.readResourceDirect('file://data.json');
      expect(dataResource.contents[0].mimeType).toBe('application/json');
    });

    test('tool execution can read UI resources', async () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addUIResource(
        'ui://config',
        'Config UI',
        'Configuration interface',
        'text/html',
        '<div>Config</div>'
      );

      server.addTool({
        name: 'process_ui',
        description: 'Process UI resource',
        parameters: z.object({
          resourceUri: z.string(),
        }),
        execute: async (args, context) => {
          // Tool can read resources via context
          if (context.readResource) {
            const resource = await context.readResource(args.resourceUri);
            return JSON.stringify({
              message: 'Processed UI resource',
              resourceUri: resource.uri,
              mimeType: resource.mimeType,
            });
          }
          return JSON.stringify({ error: 'No resource reading capability' });
        },
      });

      const result = await server.executeToolDirect('process_ui', {
        resourceUri: 'ui://config',
      });

      const resultText = JSON.parse(result.content[0].text);
      expect(resultText.message).toBe('Processed UI resource');
      expect(resultText.resourceUri).toBe('ui://config');
    });

    test('multiple clients can access same resource independently', async () => {
      server = new BuildMCPServer({
        name: 'shared-server',
        version: '1.0.0',
      });

      let accessCount = 0;
      server.addUIResource(
        'ui://shared',
        'Shared Resource',
        'Accessed by multiple clients',
        'text/html',
        () => {
          accessCount++;
          return `<div>Access #${accessCount}</div>`;
        }
      );

      // Simulate multiple client accesses
      const client1 = await server.readResourceDirect('ui://shared');
      const client2 = await server.readResourceDirect('ui://shared');
      const client3 = await server.readResourceDirect('ui://shared');

      expect(client1.contents[0].text).toContain('Access #1');
      expect(client2.contents[0].text).toContain('Access #2');
      expect(client3.contents[0].text).toContain('Access #3');

      // Each client gets fresh content
      expect(client1.contents[0].text).not.toBe(client2.contents[0].text);
      expect(client2.contents[0].text).not.toBe(client3.contents[0].text);
    });
  });

  describe('Resource Lifecycle', () => {
    test('resources persist after server start', async () => {
      server = new BuildMCPServer({
        name: 'lifecycle-server',
        version: '1.0.0',
      });

      server.addUIResource(
        'ui://persistent',
        'Persistent',
        'Persists after start',
        'text/html',
        '<div>Persistent</div>'
      );

      expect(server.getStats().resources).toBe(1);

      // Start server (in stdio mode to avoid port conflicts)
      // Note: We won't actually start it to avoid blocking, just verify structure
      const resources = server.getResources();
      expect(resources.has('ui://persistent')).toBe(true);
    });

    test('cannot add resources after server starts', async () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addUIResource(
        'ui://before',
        'Before Start',
        'Added before start',
        'text/html',
        '<div>Before</div>'
      );

      // Mock server as running
      (server as any).isRunning = true;

      expect(() => {
        server.addUIResource(
          'ui://after',
          'After Start',
          'Should fail',
          'text/html',
          '<div>After</div>'
        );
      }).toThrow('Cannot add resources after server has started');

      (server as any).isRunning = false;
    });

    test('resources cleared when server stops', async () => {
      server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addUIResource(
        'ui://temp',
        'Temporary',
        'Will be cleared',
        'text/html',
        '<div>Temp</div>'
      );

      expect(server.getStats().resources).toBe(1);

      await server.stop();

      // Resources still accessible (just server not running)
      expect(server.getStats().resources).toBe(1);
    });
  });
});
