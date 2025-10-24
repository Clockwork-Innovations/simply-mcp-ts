/**
 * UI Adapter Unit Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { registerUIResources, uriToMethodName } from '../../src/adapters/ui-adapter.js';
import { BuildMCPServer } from '../../src/api/programmatic/BuildMCPServer.js';
import type { ParsedUI } from '../../src/parser.js';

describe('UI Adapter', () => {
  describe('uriToMethodName', () => {
    it('should convert simple URI to camelCase', () => {
      expect(uriToMethodName('ui://form')).toBe('form');
    });

    it('should convert multi-part URI with slash separator', () => {
      expect(uriToMethodName('ui://stats/live')).toBe('statsLive');
    });

    it('should convert multi-part URI with dash separator', () => {
      expect(uriToMethodName('ui://product-selector')).toBe('productSelector');
    });

    it('should convert complex URI with multiple parts', () => {
      expect(uriToMethodName('ui://dashboard/main-view')).toBe('dashboardMainView');
    });
  });

  describe('registerUIResources', () => {
    let server: BuildMCPServer;
    let serverInstance: any;

    beforeEach(() => {
      server = new BuildMCPServer({
        name: 'test-ui-server',
        version: '1.0.0',
      });

      serverInstance = {
        statsLive: async () => '<div>Dynamic Stats</div>',
      };
    });

    it('should register static UI resource', async () => {
      const uis: ParsedUI[] = [
        {
          interfaceName: 'ProductSelectorUI',
          uri: 'ui://products/selector',
          name: 'Product Selector',
          description: 'Select a product',
          html: '<div>Choose a product</div>',
          tools: ['select_product'],
          dynamic: false,
          dataType: 'string',
        },
      ];

      await registerUIResources(server, uis, serverInstance, '/test/path.ts');

      // Verify resource was registered (check internal resources map)
      expect((server as any).resources.has('ui://products/selector')).toBe(true);
    });

    it('should register dynamic UI resource', async () => {
      const uis: ParsedUI[] = [
        {
          interfaceName: 'StatsUI',
          uri: 'ui://stats/live',
          name: 'Live Stats',
          description: 'Real-time stats',
          dynamic: true,
          methodName: 'statsLive',
          tools: ['refresh_stats'],
          dataType: 'string',
        },
      ];

      await registerUIResources(server, uis, serverInstance, '/test/path.ts');

      // Verify resource was registered
      expect((server as any).resources.has('ui://stats/live')).toBe(true);
    });

    it('should inject CSS into HTML', async () => {
      const uis: ParsedUI[] = [
        {
          interfaceName: 'StyledUI',
          uri: 'ui://styled/component',
          name: 'Styled Component',
          description: 'A styled UI',
          html: '<div>Content</div>',
          css: '.container { padding: 20px; }',
          dynamic: false,
          dataType: 'string',
        },
      ];

      await registerUIResources(server, uis, serverInstance, '/test/path.ts');

      const resource = (server as any).resources.get('ui://styled/component');
      expect(resource).toBeDefined();
      expect(resource.content).toContain('<style>');
      expect(resource.content).toContain('.container { padding: 20px; }');
    });

    it('should inject tool helper script', async () => {
      const uis: ParsedUI[] = [
        {
          interfaceName: 'InteractiveUI',
          uri: 'ui://interactive/form',
          name: 'Interactive Form',
          description: 'Form with tools',
          html: '<form><button>Submit</button></form>',
          tools: ['submit_form', 'validate_input'],
          dynamic: false,
          dataType: 'string',
        },
      ];

      await registerUIResources(server, uis, serverInstance, '/test/path.ts');

      const resource = (server as any).resources.get('ui://interactive/form');
      expect(resource).toBeDefined();
      expect(resource.content).toContain('window.callTool');
      expect(resource.content).toContain('window.notify');
      expect(resource.content).toContain('submit_form');
      expect(resource.content).toContain('validate_input');
    });

    it('should enforce tool allowlist in generated script', async () => {
      const uis: ParsedUI[] = [
        {
          interfaceName: 'SecureUI',
          uri: 'ui://secure/panel',
          name: 'Secure Panel',
          description: 'Panel with limited tools',
          html: '<div>Secure content</div>',
          tools: ['allowed_tool'],
          dynamic: false,
          dataType: 'string',
        },
      ];

      await registerUIResources(server, uis, serverInstance, '/test/path.ts');

      const resource = (server as any).resources.get('ui://secure/panel');
      expect(resource).toBeDefined();
      expect(resource.content).toContain('ALLOWED_TOOLS');
      expect(resource.content).toContain('["allowed_tool"]');
    });

    it('should throw error for dynamic UI without method', async () => {
      const uis: ParsedUI[] = [
        {
          interfaceName: 'MissingMethodUI',
          uri: 'ui://missing/method',
          name: 'Missing Method',
          description: 'UI with missing method',
          dynamic: true,
          methodName: 'nonExistentMethod',
          dataType: 'string',
        },
      ];

      await expect(
        registerUIResources(server, uis, serverInstance, '/test/path.ts')
      ).rejects.toThrow('nonExistentMethod');
    });

    it('should throw error for static UI without html', async () => {
      const uis: ParsedUI[] = [
        {
          interfaceName: 'MissingHtmlUI',
          uri: 'ui://missing/html',
          name: 'Missing HTML',
          description: 'UI without HTML',
          dynamic: false,
          dataType: 'string',
        },
      ];

      await expect(
        registerUIResources(server, uis, serverInstance, '/test/path.ts')
      ).rejects.toThrow("has no content source");
    });
  });
});
