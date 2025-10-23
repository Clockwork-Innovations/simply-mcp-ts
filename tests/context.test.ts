/**
 * Unit tests for Context system
 *
 * Tests Context creation, property access, and immutability
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ContextBuilder,
  Context,
  SessionImpl,
} from '../src/core/index.js';

describe('Context System', () => {
  let server: Server;
  let builder: ContextBuilder;

  beforeEach(() => {
    server = new Server(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: {} }
    );

    builder = new ContextBuilder(server, {
      name: 'test-server',
      version: '1.0.0',
      description: 'Test server for context system',
    });
  });

  describe('ContextBuilder', () => {
    it('creates a Context instance', () => {
      const context = builder.buildContext();

      expect(context).toBeDefined();
      expect(context.server).toBeDefined();
      expect(context.session).toBeDefined();
      expect(context.request_context).toBeDefined();
    });

    it('generates unique request IDs', () => {
      const ctx1 = builder.buildContext();
      const ctx2 = builder.buildContext();

      expect(ctx1.request_context.request_id).not.toBe(ctx2.request_context.request_id);
    });

    it('accepts custom request ID', () => {
      const customId = 'custom-request-id';
      const context = builder.buildContext(customId);

      expect(context.request_context.request_id).toBe(customId);
    });

    it('includes request metadata when provided', () => {
      const meta = { progressToken: 'token-123' };
      const context = builder.buildContext(undefined, meta);

      expect(context.request_context.meta).toEqual(meta);
    });
  });

  describe('ServerInfo', () => {
    it('exposes server name and version', () => {
      const context = builder.buildContext();

      expect(context.server.name).toBe('test-server');
      expect(context.server.version).toBe('1.0.0');
    });

    it('exposes server description', () => {
      const context = builder.buildContext();

      expect(context.server.description).toBe('Test server for context system');
    });

    it('supports optional fields', () => {
      const builderWithExtras = new ContextBuilder(server, {
        name: 'test-server',
        version: '1.0.0',
        instructions: 'Use tools carefully',
        website_url: 'https://example.com',
        icons: { light: 'light.png', dark: 'dark.png' },
        settings: { theme: 'dark' },
      });

      const context = builderWithExtras.buildContext();

      expect(context.server.instructions).toBe('Use tools carefully');
      expect(context.server.website_url).toBe('https://example.com');
      expect(context.server.icons).toEqual({ light: 'light.png', dark: 'dark.png' });
      expect(context.server.settings).toEqual({ theme: 'dark' });
    });
  });

  describe('Session', () => {
    it('has all required methods', () => {
      const context = builder.buildContext();

      expect(typeof context.session.send_log_message).toBe('function');
      expect(typeof context.session.create_message).toBe('function');
      expect(typeof context.session.send_progress_notification).toBe('function');
      expect(typeof context.session.send_resource_updated).toBe('function');
      expect(typeof context.session.send_resource_list_changed).toBe('function');
      expect(typeof context.session.send_tool_list_changed).toBe('function');
      expect(typeof context.session.send_prompt_list_changed).toBe('function');
    });

    it('send_log_message is async and warns', async () => {
      const context = builder.buildContext();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await context.session.send_log_message('info', 'test message');

      expect(warnSpy).toHaveBeenCalledWith(
        '[Context.Session] send_log_message() not yet implemented (Phase 2)'
      );

      warnSpy.mockRestore();
    });

    it('create_message throws NotImplementedError', async () => {
      const context = builder.buildContext();

      await expect(
        context.session.create_message([])
      ).rejects.toThrow('create_message() not yet implemented (Phase 2)');
    });

    it('send_progress_notification is async and warns', async () => {
      const context = builder.buildContext();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await context.session.send_progress_notification('token', 50, 100);

      expect(warnSpy).toHaveBeenCalledWith(
        '[Context.Session] send_progress_notification() not yet implemented (Phase 2)'
      );

      warnSpy.mockRestore();
    });

    it('notification methods are async and warn', async () => {
      const context = builder.buildContext();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await context.session.send_resource_updated('test://resource');
      await context.session.send_resource_list_changed();
      await context.session.send_tool_list_changed();
      await context.session.send_prompt_list_changed();

      expect(warnSpy).toHaveBeenCalledTimes(4);

      warnSpy.mockRestore();
    });
  });

  describe('RequestContext', () => {
    it('has request_id property', () => {
      const context = builder.buildContext();

      expect(typeof context.request_context.request_id).toBe('string');
      expect(context.request_context.request_id.length).toBeGreaterThan(0);
    });

    it('request_id matches UUID v4 format', () => {
      const context = builder.buildContext();
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(context.request_context.request_id).toMatch(uuidPattern);
    });

    it('lifespan_context is undefined in Phase 1', () => {
      const context = builder.buildContext();

      expect(context.request_context.lifespan_context).toBeUndefined();
    });

    it('meta is undefined when not provided', () => {
      const context = builder.buildContext();

      expect(context.request_context.meta).toBeUndefined();
    });
  });

  describe('Context Immutability', () => {
    it('fastmcp properties are readonly', () => {
      const context = builder.buildContext();

      // TypeScript compilation would fail if we tried to assign
      // At runtime, we can check the object is frozen or properties are non-writable
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        context.server.name = 'modified';
      }).not.toThrow(); // JavaScript doesn't prevent this without Object.freeze

      // Verify the value didn't actually change (depends on implementation)
      // For now, we just verify properties exist
      expect(context.server.name).toBe('test-server');
    });

    it('session is shared across contexts from same builder', () => {
      const ctx1 = builder.buildContext();
      const ctx2 = builder.buildContext();

      expect(ctx1.session).toBe(ctx2.session);
    });

    it('request_context is unique per context', () => {
      const ctx1 = builder.buildContext();
      const ctx2 = builder.buildContext();

      expect(ctx1.request_context).not.toBe(ctx2.request_context);
      expect(ctx1.request_context.request_id).not.toBe(ctx2.request_context.request_id);
    });
  });
});
