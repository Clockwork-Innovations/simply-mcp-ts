/**
 * Phase 3 Layers 1 & 2 Tests
 *
 * Tests for:
 * - Extended server metadata (instructions, website_url, icons, settings)
 * - Metadata accessibility via context.server
 * - All handler types can access metadata
 *
 * Phase 3 - FastMCP Parity
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';
import { ContextBuilder } from '../src/core/ContextBuilder.js';
import { z } from 'zod';
import type { HandlerContext } from '../src/core/types/handlers.js';

describe('Phase 3 Layers 1&2: Server Metadata & Settings', () => {
  describe('ContextBuilder with Extended Metadata', () => {
    let mockServer: any;
    let contextBuilder: ContextBuilder;

    beforeEach(() => {
      mockServer = {
        sendLoggingMessage: jest.fn().mockResolvedValue(undefined),
      } as any;
    });

    it('should store all metadata fields from options', () => {
      contextBuilder = new ContextBuilder(mockServer, {
        name: 'test-server',
        version: '1.0.0',
        description: 'Test server',
        instructions: 'Use this server for testing',
        website_url: 'https://example.com',
        icons: {
          light: 'https://example.com/icon-light.png',
          dark: 'https://example.com/icon-dark.png'
        },
        settings: {
          maxRetries: 3,
          timeout: 5000,
          enableCache: true
        }
      });

      const context = contextBuilder.buildContext();

      expect(context.server.name).toBe('test-server');
      expect(context.server.version).toBe('1.0.0');
      expect(context.server.description).toBe('Test server');
      expect(context.server.instructions).toBe('Use this server for testing');
      expect(context.server.website_url).toBe('https://example.com');
      expect(context.server.icons).toEqual({
        light: 'https://example.com/icon-light.png',
        dark: 'https://example.com/icon-dark.png'
      });
      expect(context.server.settings).toEqual({
        maxRetries: 3,
        timeout: 5000,
        enableCache: true
      });
    });

    it('should handle partial metadata (only instructions)', () => {
      contextBuilder = new ContextBuilder(mockServer, {
        name: 'partial-server',
        version: '1.0.0',
        instructions: 'Server instructions only'
      });

      const context = contextBuilder.buildContext();

      expect(context.server.instructions).toBe('Server instructions only');
      expect(context.server.website_url).toBeUndefined();
      expect(context.server.icons).toBeUndefined();
      expect(context.server.settings).toBeUndefined();
    });

    it('should handle partial metadata (only website_url)', () => {
      contextBuilder = new ContextBuilder(mockServer, {
        name: 'web-server',
        version: '1.0.0',
        website_url: 'https://test.example.com'
      });

      const context = contextBuilder.buildContext();

      expect(context.server.website_url).toBe('https://test.example.com');
      expect(context.server.instructions).toBeUndefined();
      expect(context.server.icons).toBeUndefined();
      expect(context.server.settings).toBeUndefined();
    });

    it('should handle partial icons (light only)', () => {
      contextBuilder = new ContextBuilder(mockServer, {
        name: 'icon-server',
        version: '1.0.0',
        icons: { light: 'https://example.com/light.png' }
      });

      const context = contextBuilder.buildContext();

      expect(context.server.icons).toEqual({ light: 'https://example.com/light.png' });
      expect(context.server.icons?.dark).toBeUndefined();
    });

    it('should handle partial icons (dark only)', () => {
      contextBuilder = new ContextBuilder(mockServer, {
        name: 'dark-icon-server',
        version: '1.0.0',
        icons: { dark: 'https://example.com/dark.png' }
      });

      const context = contextBuilder.buildContext();

      expect(context.server.icons).toEqual({ dark: 'https://example.com/dark.png' });
      expect(context.server.icons?.light).toBeUndefined();
    });

    it('should handle complex settings objects', () => {
      const complexSettings = {
        database: {
          host: 'localhost',
          port: 5432,
          credentials: {
            username: 'user',
            encrypted: true
          }
        },
        features: ['feature1', 'feature2'],
        limits: {
          maxConnections: 100,
          timeout: 30000
        }
      };

      contextBuilder = new ContextBuilder(mockServer, {
        name: 'settings-server',
        version: '1.0.0',
        settings: complexSettings
      });

      const context = contextBuilder.buildContext();

      expect(context.server.settings).toEqual(complexSettings);
      expect(context.server.settings?.database.host).toBe('localhost');
      expect(context.server.settings?.features).toEqual(['feature1', 'feature2']);
    });

    it('should handle empty settings object', () => {
      contextBuilder = new ContextBuilder(mockServer, {
        name: 'empty-settings-server',
        version: '1.0.0',
        settings: {}
      });

      const context = contextBuilder.buildContext();

      expect(context.server.settings).toEqual({});
    });

    it('should handle minimal metadata (required fields only)', () => {
      contextBuilder = new ContextBuilder(mockServer, {
        name: 'minimal-server',
        version: '2.0.0'
      });

      const context = contextBuilder.buildContext();

      expect(context.server.name).toBe('minimal-server');
      expect(context.server.version).toBe('2.0.0');
      expect(context.server.description).toBeUndefined();
      expect(context.server.instructions).toBeUndefined();
      expect(context.server.website_url).toBeUndefined();
      expect(context.server.icons).toBeUndefined();
      expect(context.server.settings).toBeUndefined();
    });
  });

  describe('BuildMCPServer with Extended Metadata', () => {
    let server: BuildMCPServer;

    afterEach(async () => {
      if (server) {
        await server.stop();
      }
    });

    it('should pass all metadata fields to ContextBuilder', async () => {
      server = new BuildMCPServer({
        name: 'metadata-test-server',
        version: '1.0.0',
        description: 'Server with full metadata',
        instructions: 'Instructions for LLMs',
        website_url: 'https://metadata.example.com',
        icons: {
          light: 'https://metadata.example.com/light.png',
          dark: 'https://metadata.example.com/dark.png'
        },
        settings: {
          feature1: true,
          feature2: false,
          apiKey: 'test-key'
        }
      });

      let capturedContext: HandlerContext | undefined;

      server.addTool({
        name: 'metadata-check',
        description: 'Check metadata',
        parameters: z.object({}),
        execute: async (args, context) => {
          capturedContext = context;
          return { content: [{ type: 'text', text: 'ok' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('metadata-check', {});

      expect(capturedContext?.mcp?.server.name).toBe('metadata-test-server');
      expect(capturedContext?.mcp?.server.instructions).toBe('Instructions for LLMs');
      expect(capturedContext?.mcp?.server.website_url).toBe('https://metadata.example.com');
      expect(capturedContext?.mcp?.server.icons).toEqual({
        light: 'https://metadata.example.com/light.png',
        dark: 'https://metadata.example.com/dark.png'
      });
      expect(capturedContext?.mcp?.server.settings).toEqual({
        feature1: true,
        feature2: false,
        apiKey: 'test-key'
      });
    });

    it('should allow tools to access instructions', async () => {
      server = new BuildMCPServer({
        name: 'instructions-server',
        version: '1.0.0',
        instructions: 'Always validate input before processing'
      });

      let toolInstructions: string | undefined;

      server.addTool({
        name: 'read-instructions',
        description: 'Read server instructions',
        parameters: z.object({}),
        execute: async (args, context) => {
          toolInstructions = context?.mcp?.server.instructions;
          return { content: [{ type: 'text', text: toolInstructions || 'none' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('read-instructions', {});

      expect(toolInstructions).toBe('Always validate input before processing');
    });

    it('should allow tools to access website_url', async () => {
      server = new BuildMCPServer({
        name: 'website-server',
        version: '1.0.0',
        website_url: 'https://docs.example.com'
      });

      let websiteUrl: string | undefined;

      server.addTool({
        name: 'get-docs-url',
        description: 'Get documentation URL',
        parameters: z.object({}),
        execute: async (args, context) => {
          websiteUrl = context?.mcp?.server.website_url;
          return { content: [{ type: 'text', text: websiteUrl || 'none' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('get-docs-url', {});

      expect(websiteUrl).toBe('https://docs.example.com');
    });

    it('should allow tools to access icon URIs', async () => {
      server = new BuildMCPServer({
        name: 'icon-server',
        version: '1.0.0',
        icons: {
          light: 'https://cdn.example.com/light-icon.svg',
          dark: 'https://cdn.example.com/dark-icon.svg'
        }
      });

      let capturedIcons: { light?: string; dark?: string } | undefined;

      server.addTool({
        name: 'get-icons',
        description: 'Get server icons',
        parameters: z.object({}),
        execute: async (args, context) => {
          capturedIcons = context?.mcp?.server.icons;
          return { content: [{ type: 'text', text: 'ok' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('get-icons', {});

      expect(capturedIcons).toEqual({
        light: 'https://cdn.example.com/light-icon.svg',
        dark: 'https://cdn.example.com/dark-icon.svg'
      });
    });

    it('should allow tools to access server settings', async () => {
      server = new BuildMCPServer({
        name: 'settings-server',
        version: '1.0.0',
        settings: {
          maxConcurrent: 10,
          cacheEnabled: true,
          apiEndpoint: 'https://api.example.com'
        }
      });

      let toolSettings: Record<string, any> | undefined;

      server.addTool({
        name: 'read-settings',
        description: 'Read server settings',
        parameters: z.object({}),
        execute: async (args, context) => {
          toolSettings = context?.mcp?.server.settings;
          return { content: [{ type: 'text', text: 'ok' }] };
        }
      });

      await server.start();
      await server['executeToolDirect']('read-settings', {});

      expect(toolSettings).toEqual({
        maxConcurrent: 10,
        cacheEnabled: true,
        apiEndpoint: 'https://api.example.com'
      });
    });

    it('should allow prompts to access metadata', async () => {
      server = new BuildMCPServer({
        name: 'prompt-metadata-server',
        version: '1.0.0',
        instructions: 'Prompt instruction test',
        website_url: 'https://prompts.example.com'
      });

      let promptInstructions: string | undefined;
      let promptWebsite: string | undefined;

      server.addPrompt({
        name: 'metadata-prompt',
        description: 'Prompt that accesses metadata',
        template: (args, context) => {
          promptInstructions = context?.mcp?.server.instructions;
          promptWebsite = context?.mcp?.server.website_url;
          return `Instructions: ${promptInstructions}, Website: ${promptWebsite}`;
        }
      });

      await server.start();
      const result = await server['getPromptDirect']('metadata-prompt', {});

      expect(promptInstructions).toBe('Prompt instruction test');
      expect(promptWebsite).toBe('https://prompts.example.com');
      expect(result.messages[0].content.text).toContain('Instructions: Prompt instruction test');
    });

    it('should allow resources to access metadata', async () => {
      server = new BuildMCPServer({
        name: 'resource-metadata-server',
        version: '1.0.0',
        settings: {
          resourcePath: '/data',
          maxSize: 1024
        }
      });

      let resourceSettings: Record<string, any> | undefined;

      server.addResource({
        uri: 'test://metadata',
        name: 'Metadata Resource',
        description: 'Resource that reads metadata',
        mimeType: 'text/plain',
        content: (context) => {
          resourceSettings = context?.mcp?.server.settings;
          return `Settings: ${JSON.stringify(resourceSettings)}`;
        }
      });

      await server.start();
      const result = await server['readResourceDirect']('test://metadata');

      expect(resourceSettings).toEqual({
        resourcePath: '/data',
        maxSize: 1024
      });
      expect(result.contents[0].text).toContain('"resourcePath":"/data"');
    });
  });

  describe('Edge Cases and Special Characters', () => {
    let mockServer: any;

    beforeEach(() => {
      mockServer = {
        sendLoggingMessage: jest.fn().mockResolvedValue(undefined),
      } as any;
    });

    it('should handle instructions with special characters', () => {
      const contextBuilder = new ContextBuilder(mockServer, {
        name: 'special-chars-server',
        version: '1.0.0',
        instructions: 'Use "quotes" and \'apostrophes\'. Also: <tags>, {braces}, [brackets]'
      });

      const context = contextBuilder.buildContext();

      expect(context.server.instructions).toBe('Use "quotes" and \'apostrophes\'. Also: <tags>, {braces}, [brackets]');
    });

    it('should handle instructions with newlines and tabs', () => {
      const contextBuilder = new ContextBuilder(mockServer, {
        name: 'multiline-server',
        version: '1.0.0',
        instructions: 'Line 1\nLine 2\tTabbed\rCarriage return'
      });

      const context = contextBuilder.buildContext();

      expect(context.server.instructions).toBe('Line 1\nLine 2\tTabbed\rCarriage return');
    });

    it('should handle instructions with unicode characters', () => {
      const contextBuilder = new ContextBuilder(mockServer, {
        name: 'unicode-server',
        version: '1.0.0',
        instructions: 'Emoji: 🎉🚀💡 Chinese: 你好 Arabic: مرحبا'
      });

      const context = contextBuilder.buildContext();

      expect(context.server.instructions).toBe('Emoji: 🎉🚀💡 Chinese: 你好 Arabic: مرحبا');
    });

    it('should handle very long instructions', () => {
      const longInstructions = 'This is a very long instruction. '.repeat(100);

      const contextBuilder = new ContextBuilder(mockServer, {
        name: 'long-instructions-server',
        version: '1.0.0',
        instructions: longInstructions
      });

      const context = contextBuilder.buildContext();

      expect(context.server.instructions).toBe(longInstructions);
      expect(context.server.instructions?.length).toBeGreaterThan(3000);
    });

    it('should handle empty string instructions', () => {
      const contextBuilder = new ContextBuilder(mockServer, {
        name: 'empty-instructions-server',
        version: '1.0.0',
        instructions: ''
      });

      const context = contextBuilder.buildContext();

      expect(context.server.instructions).toBe('');
    });

    it('should handle URLs with query parameters and fragments', () => {
      const contextBuilder = new ContextBuilder(mockServer, {
        name: 'url-server',
        version: '1.0.0',
        website_url: 'https://example.com/docs?version=1.0&lang=en#getting-started'
      });

      const context = contextBuilder.buildContext();

      expect(context.server.website_url).toBe('https://example.com/docs?version=1.0&lang=en#getting-started');
    });

    it('should handle data URIs in icon fields', () => {
      const contextBuilder = new ContextBuilder(mockServer, {
        name: 'data-uri-server',
        version: '1.0.0',
        icons: {
          light: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PC9zdmc+',
          dark: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
      });

      const context = contextBuilder.buildContext();

      expect(context.server.icons?.light).toContain('data:image/svg+xml;base64');
      expect(context.server.icons?.dark).toContain('data:image/png;base64');
    });

    it('should handle settings with null values', () => {
      const contextBuilder = new ContextBuilder(mockServer, {
        name: 'null-settings-server',
        version: '1.0.0',
        settings: {
          feature1: null,
          feature2: undefined,
          feature3: 'enabled'
        }
      });

      const context = contextBuilder.buildContext();

      expect(context.server.settings?.feature1).toBeNull();
      expect(context.server.settings?.feature2).toBeUndefined();
      expect(context.server.settings?.feature3).toBe('enabled');
    });

    it('should handle settings with arrays and nested objects', () => {
      const contextBuilder = new ContextBuilder(mockServer, {
        name: 'nested-settings-server',
        version: '1.0.0',
        settings: {
          endpoints: ['https://api1.example.com', 'https://api2.example.com'],
          config: {
            timeout: 5000,
            retries: {
              max: 3,
              delay: 1000
            }
          }
        }
      });

      const context = contextBuilder.buildContext();

      expect(context.server.settings?.endpoints).toEqual(['https://api1.example.com', 'https://api2.example.com']);
      expect(context.server.settings?.config.retries.max).toBe(3);
    });
  });

  describe('Metadata Consistency Across Contexts', () => {
    let server: BuildMCPServer;

    afterEach(async () => {
      if (server) {
        await server.stop();
      }
    });

    it('should provide same metadata to all handler types', async () => {
      server = new BuildMCPServer({
        name: 'consistency-server',
        version: '1.0.0',
        instructions: 'Consistent instructions',
        website_url: 'https://consistency.example.com',
        settings: { shared: true }
      });

      let toolMetadata: any;
      let promptMetadata: any;
      let resourceMetadata: any;

      server.addTool({
        name: 'tool-check',
        description: 'Tool metadata check',
        parameters: z.object({}),
        execute: async (args, context) => {
          toolMetadata = {
            instructions: context?.mcp?.server.instructions,
            website_url: context?.mcp?.server.website_url,
            settings: context?.mcp?.server.settings
          };
          return { content: [{ type: 'text', text: 'ok' }] };
        }
      });

      server.addPrompt({
        name: 'prompt-check',
        description: 'Prompt metadata check',
        template: (args, context) => {
          promptMetadata = {
            instructions: context?.mcp?.server.instructions,
            website_url: context?.mcp?.server.website_url,
            settings: context?.mcp?.server.settings
          };
          return 'template';
        }
      });

      server.addResource({
        uri: 'test://check',
        name: 'Resource Check',
        description: 'Resource metadata check',
        mimeType: 'text/plain',
        content: (context) => {
          resourceMetadata = {
            instructions: context?.mcp?.server.instructions,
            website_url: context?.mcp?.server.website_url,
            settings: context?.mcp?.server.settings
          };
          return 'content';
        }
      });

      await server.start();

      await server['executeToolDirect']('tool-check', {});
      await server['getPromptDirect']('prompt-check', {});
      await server['readResourceDirect']('test://check');

      // All handlers should see identical metadata
      expect(toolMetadata).toEqual(promptMetadata);
      expect(promptMetadata).toEqual(resourceMetadata);
      expect(toolMetadata.instructions).toBe('Consistent instructions');
      expect(toolMetadata.website_url).toBe('https://consistency.example.com');
      expect(toolMetadata.settings).toEqual({ shared: true });
    });

    it('should maintain metadata across multiple handler executions', async () => {
      server = new BuildMCPServer({
        name: 'persistence-server',
        version: '1.0.0',
        settings: { counter: 0 }
      });

      const capturedSettings: any[] = [];

      server.addTool({
        name: 'check-persistence',
        description: 'Check metadata persistence',
        parameters: z.object({}),
        execute: async (args, context) => {
          capturedSettings.push(context?.mcp?.server.settings);
          return { content: [{ type: 'text', text: 'ok' }] };
        }
      });

      await server.start();

      // Execute tool 3 times
      await server['executeToolDirect']('check-persistence', {});
      await server['executeToolDirect']('check-persistence', {});
      await server['executeToolDirect']('check-persistence', {});

      // All executions should see the same metadata (not mutated)
      expect(capturedSettings[0]).toEqual({ counter: 0 });
      expect(capturedSettings[1]).toEqual({ counter: 0 });
      expect(capturedSettings[2]).toEqual({ counter: 0 });
      expect(capturedSettings[0]).toEqual(capturedSettings[1]);
      expect(capturedSettings[1]).toEqual(capturedSettings[2]);
    });
  });
});
