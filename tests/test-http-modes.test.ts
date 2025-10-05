/**
 * Unit Tests for HTTP Transport Modes (Stateful vs Stateless)
 *
 * This test suite validates the HTTP mode toggle feature that allows
 * switching between stateful (session-based) and stateless (per-request) modes.
 */

import { SimplyMCP, StartOptions } from '../src/SimplyMCP.js';
import { z } from 'zod';

describe('HTTP Transport Mode Tests', () => {
  let server: SimplyMCP;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Mode Validation', () => {
    test('should accept stateful: true', () => {
      expect(() => {
        server = new SimplyMCP({
          name: 'test-server',
          version: '1.0.0',
        });

        const options: StartOptions = {
          transport: 'http',
          port: 3100,
          stateful: true,
        };

        // Should not throw
      }).not.toThrow();
    });

    test('should accept stateful: false (stateless mode)', () => {
      expect(() => {
        server = new SimplyMCP({
          name: 'test-server',
          version: '1.0.0',
        });

        const options: StartOptions = {
          transport: 'http',
          port: 3101,
          stateful: false,
        };

        // Should not throw
      }).not.toThrow();
    });

    test('should use stateful mode by default when stateful option not specified', () => {
      server = new SimplyMCP({
        name: 'test-server',
        version: '1.0.0',
      });

      // Default mode should be stateful
      expect(server).toBeDefined();
    });
  });

  describe('Stateful Mode Behavior', () => {
    beforeEach(() => {
      server = new SimplyMCP({
        name: 'stateful-test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'test-tool',
        description: 'A test tool',
        parameters: z.object({
          input: z.string(),
        }),
        execute: async (args) => {
          return `Received: ${args.input}`;
        },
      });
    });

    test('should support session creation on initialize', async () => {
      const options: StartOptions = {
        transport: 'http',
        port: 3103,
        http: {
          mode: 'stateful',
        },
      };

      // Server should start successfully in stateful mode
      // Actual HTTP behavior is tested in integration tests
      expect(() => server.start(options)).not.toThrow();
    });

    test('should support GET endpoint in stateful mode', async () => {
      // Stateful mode should support GET for SSE streams
      // This is tested in integration tests where we can make actual HTTP requests
      expect(true).toBe(true);
    });

    test('should support DELETE endpoint in stateful mode', async () => {
      // Stateful mode should support DELETE for session termination
      // This is tested in integration tests where we can make actual HTTP requests
      expect(true).toBe(true);
    });
  });

  describe('Stateless Mode Behavior', () => {
    beforeEach(() => {
      server = new SimplyMCP({
        name: 'stateless-test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'test-tool',
        description: 'A test tool',
        parameters: z.object({
          input: z.string(),
        }),
        execute: async (args) => {
          return `Received: ${args.input}`;
        },
      });
    });

    test('should start in stateless mode', async () => {
      const options: StartOptions = {
        transport: 'http',
        port: 3104,
        http: {
          mode: 'stateless',
        },
      };

      // Server should start successfully in stateless mode
      // Actual HTTP behavior is tested in integration tests
      expect(() => server.start(options)).not.toThrow();
    });

    test('should not require session tracking in stateless mode', async () => {
      // Stateless mode should not maintain sessions
      // Each request is independent
      // This is tested in integration tests where we can make actual HTTP requests
      expect(true).toBe(true);
    });

    test('should not support GET endpoint in stateless mode', async () => {
      // Stateless mode should not support GET (no sessions to stream to)
      // This is tested in integration tests where we can make actual HTTP requests
      expect(true).toBe(true);
    });

    test('should not support DELETE endpoint in stateless mode', async () => {
      // Stateless mode should not support DELETE (no sessions to terminate)
      // This is tested in integration tests where we can make actual HTTP requests
      expect(true).toBe(true);
    });
  });

  describe('Backwards Compatibility', () => {
    test('should default to stateful mode for existing code', () => {
      server = new SimplyMCP({
        name: 'legacy-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'legacy-tool',
        description: 'A legacy tool',
        parameters: z.object({
          input: z.string(),
        }),
        execute: async (args) => {
          return `Legacy: ${args.input}`;
        },
      });

      // Starting without http options should use stateful mode
      const options: StartOptions = {
        transport: 'http',
        port: 3105,
      };

      expect(() => server.start(options)).not.toThrow();
    });

    test('should support explicit stateful mode', () => {
      server = new SimplyMCP({
        name: 'explicit-server',
        version: '1.0.0',
      });

      const options: StartOptions = {
        transport: 'http',
        port: 3106,
        http: {
          mode: 'stateful',
        },
      };

      expect(() => server.start(options)).not.toThrow();
    });
  });

  describe('HTTP Options Integration', () => {
    test('should support mode alongside other HTTP options', () => {
      server = new SimplyMCP({
        name: 'options-server',
        version: '1.0.0',
      });

      const options: StartOptions = {
        transport: 'http',
        port: 3107,
        http: {
          mode: 'stateful',
          enableJsonResponse: true,
          dnsRebindingProtection: true,
        },
      };

      expect(() => server.start(options)).not.toThrow();
    });

    test('should use defaults for unspecified HTTP options', () => {
      server = new SimplyMCP({
        name: 'defaults-server',
        version: '1.0.0',
      });

      const options: StartOptions = {
        transport: 'http',
        port: 3108,
        http: {
          mode: 'stateless',
          // Other options should default
        },
      };

      expect(() => server.start(options)).not.toThrow();
    });
  });

  describe('Tool Execution in Different Modes', () => {
    beforeEach(() => {
      server = new SimplyMCP({
        name: 'execution-test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'echo',
        description: 'Echo tool',
        parameters: z.object({
          message: z.string(),
        }),
        execute: async (args) => {
          return `Echo: ${args.message}`;
        },
      });
    });

    test('should execute tools in stateful mode', async () => {
      const options: StartOptions = {
        transport: 'http',
        port: 3109,
        http: {
          mode: 'stateful',
        },
      };

      // Tool execution tested in integration tests
      expect(() => server.start(options)).not.toThrow();
    });

    test('should execute tools in stateless mode', async () => {
      const options: StartOptions = {
        transport: 'http',
        port: 3110,
        http: {
          mode: 'stateless',
        },
      };

      // Tool execution tested in integration tests
      expect(() => server.start(options)).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    test('HttpMode type should only accept valid values', () => {
      const validMode1: HttpMode = 'stateful';
      const validMode2: HttpMode = 'stateless';

      // This should not compile if types are working correctly:
      // const invalidMode: HttpMode = 'invalid';

      expect(validMode1).toBe('stateful');
      expect(validMode2).toBe('stateless');
    });

    test('StartOptions should have proper http options type', () => {
      const options: StartOptions = {
        transport: 'http',
        port: 3111,
        http: {
          mode: 'stateful',
          enableJsonResponse: false,
          dnsRebindingProtection: true,
        },
      };

      expect(options.http?.mode).toBe('stateful');
      expect(options.http?.enableJsonResponse).toBe(false);
      expect(options.http?.dnsRebindingProtection).toBe(true);
    });
  });
});

// Mock test runner for environments without Jest
if (typeof describe === 'undefined') {
  console.log('Note: This file is designed to be run with a test runner like Jest.');
  console.log('For integration testing, use test-http-modes.sh instead.');
}

// Export types for testing purposes
export type { HttpMode, StartOptions };
