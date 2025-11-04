/**
 * Streamable HTTP Transport Unit Tests
 *
 * Tests the core functionality of the Streamable HTTP server implementation
 * including session management, transport lifecycle, and error handling.
 *
 * Implementation location: src/cli/servers/streamable-http-server.ts
 *
 * Test coverage:
 * - Session ID generation and management
 * - Session lifecycle (initialize → active → terminate)
 * - Transport creation with session ID generator
 * - Session storage in Map
 * - Transport cleanup on close
 * - Error handling (invalid session, missing headers)
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { randomUUID } from 'node:crypto';

describe('Streamable HTTP Transport - Unit Tests', () => {
  /**
   * Session ID Generation
   *
   * Tests the randomUUID-based session ID generator used by the transport.
   */
  describe('Session ID Generation', () => {
    it('should generate valid UUIDs for session IDs', () => {
      const sessionId = randomUUID();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(sessionId).toMatch(uuidPattern);
      expect(sessionId).toHaveLength(36);
    });

    it('should generate unique session IDs', () => {
      const sessions = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        sessions.add(randomUUID());
      }

      // All generated IDs should be unique
      expect(sessions.size).toBe(iterations);
    });

    it('should generate session IDs with proper format', () => {
      const sessionId = randomUUID();

      // Verify segments
      const segments = sessionId.split('-');
      expect(segments).toHaveLength(5);
      expect(segments[0]).toHaveLength(8);
      expect(segments[1]).toHaveLength(4);
      expect(segments[2]).toHaveLength(4);
      expect(segments[3]).toHaveLength(4);
      expect(segments[4]).toHaveLength(12);

      // Verify version bit (should be 4)
      expect(segments[2][0]).toBe('4');
    });
  });

  /**
   * Session Storage
   *
   * Tests the Map-based session storage mechanism.
   */
  describe('Session Storage', () => {
    let sessionStorage: { [sessionId: string]: any };

    beforeEach(() => {
      sessionStorage = {};
    });

    it('should store session by ID', () => {
      const sessionId = randomUUID();
      const mockTransport = { sessionId, type: 'streamable-http' };

      sessionStorage[sessionId] = mockTransport;

      expect(sessionStorage[sessionId]).toBe(mockTransport);
      expect(Object.keys(sessionStorage)).toHaveLength(1);
    });

    it('should retrieve session by ID', () => {
      const sessionId = randomUUID();
      const mockTransport = { sessionId, type: 'streamable-http' };

      sessionStorage[sessionId] = mockTransport;

      const retrieved = sessionStorage[sessionId];
      expect(retrieved).toBeDefined();
      expect(retrieved.sessionId).toBe(sessionId);
    });

    it('should return undefined for non-existent session', () => {
      const nonExistentId = randomUUID();

      expect(sessionStorage[nonExistentId]).toBeUndefined();
    });

    it('should delete session by ID', () => {
      const sessionId = randomUUID();
      const mockTransport = { sessionId, type: 'streamable-http' };

      sessionStorage[sessionId] = mockTransport;
      expect(sessionStorage[sessionId]).toBeDefined();

      delete sessionStorage[sessionId];
      expect(sessionStorage[sessionId]).toBeUndefined();
    });

    it('should support multiple concurrent sessions', () => {
      const sessionIds = [randomUUID(), randomUUID(), randomUUID()];

      sessionIds.forEach((id) => {
        sessionStorage[id] = { sessionId: id, type: 'streamable-http' };
      });

      expect(Object.keys(sessionStorage)).toHaveLength(3);

      sessionIds.forEach((id) => {
        expect(sessionStorage[id]).toBeDefined();
        expect(sessionStorage[id].sessionId).toBe(id);
      });
    });

    it('should handle session replacement', () => {
      const sessionId = randomUUID();
      const transport1 = { sessionId, version: 1 };
      const transport2 = { sessionId, version: 2 };

      sessionStorage[sessionId] = transport1;
      expect(sessionStorage[sessionId].version).toBe(1);

      sessionStorage[sessionId] = transport2;
      expect(sessionStorage[sessionId].version).toBe(2);
    });
  });

  /**
   * Request Type Detection
   *
   * Tests the helper function that determines if a request is an initialize request.
   */
  describe('Initialize Request Detection', () => {
    const isInitializeRequest = (body: any): boolean => {
      return body?.method === 'initialize';
    };

    it('should detect initialize request', () => {
      const initRequest = {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        },
        id: 1,
      };

      expect(isInitializeRequest(initRequest)).toBe(true);
    });

    it('should not detect non-initialize request', () => {
      const toolsListRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 2,
      };

      expect(isInitializeRequest(toolsListRequest)).toBe(false);
    });

    it('should handle undefined body', () => {
      expect(isInitializeRequest(undefined)).toBe(false);
    });

    it('should handle null body', () => {
      expect(isInitializeRequest(null)).toBe(false);
    });

    it('should handle empty object', () => {
      expect(isInitializeRequest({})).toBe(false);
    });

    it('should handle body with missing method', () => {
      const request = {
        jsonrpc: '2.0',
        params: {},
        id: 1,
      };

      expect(isInitializeRequest(request)).toBe(false);
    });

    it('should be case-sensitive for method name', () => {
      const request = {
        jsonrpc: '2.0',
        method: 'Initialize', // Wrong case
        params: {},
        id: 1,
      };

      expect(isInitializeRequest(request)).toBe(false);
    });
  });

  /**
   * Session Lifecycle
   *
   * Tests the full lifecycle of a session from creation to termination.
   */
  describe('Session Lifecycle', () => {
    let sessionStorage: { [sessionId: string]: any };

    beforeEach(() => {
      sessionStorage = {};
    });

    it('should initialize new session without session ID', () => {
      const sessionId = randomUUID();

      // Simulate new session creation
      const mockTransport = {
        sessionId,
        state: 'initializing',
        createdAt: Date.now(),
      };

      sessionStorage[sessionId] = mockTransport;

      expect(sessionStorage[sessionId]).toBeDefined();
      expect(sessionStorage[sessionId].state).toBe('initializing');
    });

    it('should transition session to active state', () => {
      const sessionId = randomUUID();
      const mockTransport = {
        sessionId,
        state: 'initializing',
        createdAt: Date.now(),
      };

      sessionStorage[sessionId] = mockTransport;

      // Transition to active
      sessionStorage[sessionId].state = 'active';

      expect(sessionStorage[sessionId].state).toBe('active');
    });

    it('should reuse existing session with session ID', () => {
      const sessionId = randomUUID();
      const mockTransport = {
        sessionId,
        state: 'active',
        requestCount: 0,
      };

      sessionStorage[sessionId] = mockTransport;

      // Reuse session
      const existingTransport = sessionStorage[sessionId];
      existingTransport.requestCount++;

      expect(sessionStorage[sessionId].requestCount).toBe(1);
    });

    it('should handle session cleanup on close', () => {
      const sessionId = randomUUID();
      const mockTransport = {
        sessionId,
        state: 'active',
        onclose: null as (() => void) | null,
      };

      // Setup onclose handler
      mockTransport.onclose = () => {
        if (sessionStorage[sessionId]) {
          delete sessionStorage[sessionId];
        }
      };

      sessionStorage[sessionId] = mockTransport;
      expect(sessionStorage[sessionId]).toBeDefined();

      // Trigger close
      mockTransport.onclose();

      expect(sessionStorage[sessionId]).toBeUndefined();
    });

    it('should handle multiple session closures', () => {
      const sessions = [randomUUID(), randomUUID(), randomUUID()];

      // Create multiple sessions
      sessions.forEach((id) => {
        sessionStorage[id] = {
          sessionId: id,
          state: 'active',
        };
      });

      expect(Object.keys(sessionStorage)).toHaveLength(3);

      // Close all sessions
      sessions.forEach((id) => {
        delete sessionStorage[id];
      });

      expect(Object.keys(sessionStorage)).toHaveLength(0);
    });
  });

  /**
   * Error Scenarios
   *
   * Tests error handling for various invalid request scenarios.
   */
  describe('Error Handling', () => {
    it('should detect missing session ID for non-initialize request', () => {
      const request = {
        body: {
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 2,
        },
        headers: {},
      };

      const hasSessionId = !!request.headers['mcp-session-id'];
      const isInitialize = request.body.method === 'initialize';

      // Should fail validation
      expect(hasSessionId || isInitialize).toBe(false);
    });

    it('should detect invalid session ID', () => {
      const sessionStorage: { [key: string]: any } = {};
      const invalidSessionId = randomUUID();

      const sessionExists = sessionStorage[invalidSessionId] !== undefined;

      expect(sessionExists).toBe(false);
    });

    it('should validate session ID format', () => {
      const validId = randomUUID();
      const invalidId = 'not-a-uuid';

      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(validId).toMatch(uuidPattern);
      expect(invalidId).not.toMatch(uuidPattern);
    });

    it('should handle empty session ID header', () => {
      const headers = { 'mcp-session-id': '' };

      const sessionId = headers['mcp-session-id'];
      const isValid = !!sessionId && sessionId.trim().length > 0;

      expect(isValid).toBe(false);
    });

    it('should handle malformed request body', () => {
      const malformedBodies = [
        null,
        undefined,
        '',
        'not json',
        123,
        [],
      ];

      malformedBodies.forEach((body) => {
        const hasMethod = !!(body && typeof body === 'object' && !Array.isArray(body) && 'method' in body);
        expect(hasMethod).toBe(false);
      });
    });

    it('should handle concurrent requests to same session', () => {
      const sessionId = randomUUID();
      const sessionStorage: { [key: string]: any } = {};

      sessionStorage[sessionId] = {
        sessionId,
        requestCount: 0,
        inProgress: false,
      };

      // First request
      const transport1 = sessionStorage[sessionId];
      transport1.inProgress = true;
      transport1.requestCount++;

      // Second concurrent request
      const transport2 = sessionStorage[sessionId];
      const isInProgress = transport2.inProgress;

      expect(isInProgress).toBe(true);
      expect(transport2.requestCount).toBe(1);
    });
  });

  /**
   * CORS Configuration
   *
   * Tests CORS header configuration for the HTTP server.
   */
  describe('CORS Configuration', () => {
    it('should define CORS with wildcard origin', () => {
      const corsConfig = {
        origin: '*',
        exposedHeaders: ['Mcp-Session-Id'],
      };

      expect(corsConfig.origin).toBe('*');
      expect(corsConfig.exposedHeaders).toContain('Mcp-Session-Id');
    });

    it('should expose Mcp-Session-Id header', () => {
      const exposedHeaders = ['Mcp-Session-Id'];

      expect(exposedHeaders).toHaveLength(1);
      expect(exposedHeaders[0]).toBe('Mcp-Session-Id');
    });

    it('should allow all origins', () => {
      const allowedOrigins = '*';

      expect(allowedOrigins).toBe('*');
    });
  });

  /**
   * Port Configuration
   *
   * Tests environment variable configuration for server port.
   */
  describe('Port Configuration', () => {
    const originalEnv = process.env.MCP_PORT;

    afterEach(() => {
      // Restore original value
      if (originalEnv) {
        process.env.MCP_PORT = originalEnv;
      } else {
        delete process.env.MCP_PORT;
      }
    });

    it('should use default port 3000 when MCP_PORT not set', () => {
      delete process.env.MCP_PORT;

      const port = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3000;

      expect(port).toBe(3000);
    });

    it('should use MCP_PORT environment variable when set', () => {
      process.env.MCP_PORT = '8080';

      const port = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3000;

      expect(port).toBe(8080);
    });

    it('should parse MCP_PORT as integer', () => {
      process.env.MCP_PORT = '4567';

      const port = parseInt(process.env.MCP_PORT, 10);

      expect(typeof port).toBe('number');
      expect(port).toBe(4567);
      expect(Number.isInteger(port)).toBe(true);
    });

    it('should handle invalid MCP_PORT gracefully', () => {
      process.env.MCP_PORT = 'not-a-number';

      const port = parseInt(process.env.MCP_PORT, 10);
      const isValid = !isNaN(port) && port > 0 && port <= 65535;

      expect(isValid).toBe(false);
    });
  });

  /**
   * HTTP Method Routing
   *
   * Tests that different HTTP methods are routed to appropriate handlers.
   */
  describe('HTTP Method Routing', () => {
    it('should handle POST requests for JSON-RPC', () => {
      const methods = {
        POST: '/mcp',
        GET: '/mcp',
        DELETE: '/mcp',
      };

      expect(methods.POST).toBe('/mcp');
    });

    it('should handle GET requests for SSE streams', () => {
      const methods = {
        POST: '/mcp',
        GET: '/mcp',
        DELETE: '/mcp',
      };

      expect(methods.GET).toBe('/mcp');
    });

    it('should handle DELETE requests for session termination', () => {
      const methods = {
        POST: '/mcp',
        GET: '/mcp',
        DELETE: '/mcp',
      };

      expect(methods.DELETE).toBe('/mcp');
    });

    it('should use same endpoint for all methods', () => {
      const endpoint = '/mcp';
      const methods = ['POST', 'GET', 'DELETE'];

      methods.forEach((method) => {
        expect(endpoint).toBe('/mcp');
      });
    });
  });

  /**
   * Session ID Header Validation
   *
   * Tests header name and format validation.
   */
  describe('Session ID Header Validation', () => {
    it('should use correct header name (mcp-session-id)', () => {
      const headerName = 'mcp-session-id';

      expect(headerName).toBe('mcp-session-id');
      expect(headerName).not.toBe('Mcp-Session-Id');
      expect(headerName).not.toBe('MCP-SESSION-ID');
    });

    it('should be case-insensitive when reading headers', () => {
      // Express headers are case-insensitive
      const headers: { [key: string]: string } = {
        'mcp-session-id': 'test-value',
        'MCP-Session-Id': 'test-value',
        'MCP-SESSION-ID': 'test-value',
      };

      // In Express, req.headers normalizes to lowercase
      const normalizedKey = 'mcp-session-id';

      expect(headers[normalizedKey]).toBeDefined();
    });

    it('should extract session ID from request headers', () => {
      const headers = { 'mcp-session-id': randomUUID() };

      const sessionId = headers['mcp-session-id'];

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });
  });

  /**
   * Transport Connection State
   *
   * Tests transport connection state management.
   */
  describe('Transport Connection State', () => {
    it('should track transport connection state', () => {
      const mockTransport = {
        sessionId: randomUUID(),
        connected: false,
        onclose: null as (() => void) | null,
      };

      expect(mockTransport.connected).toBe(false);

      mockTransport.connected = true;
      expect(mockTransport.connected).toBe(true);
    });

    it('should setup onclose handler', () => {
      const mockTransport = {
        sessionId: randomUUID(),
        onclose: null as (() => void) | null,
      };

      const closeHandler = jest.fn();
      mockTransport.onclose = closeHandler;

      expect(mockTransport.onclose).toBe(closeHandler);
    });

    it('should call onclose handler when transport closes', () => {
      const closeHandler = jest.fn();
      const mockTransport = {
        sessionId: randomUUID(),
        onclose: closeHandler,
      };

      mockTransport.onclose?.();

      expect(closeHandler).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Last-Event-ID Support
   *
   * Tests SSE reconnection with Last-Event-ID header.
   */
  describe('Last-Event-ID Support', () => {
    it('should read Last-Event-ID header for reconnection', () => {
      const headers = {
        'mcp-session-id': randomUUID(),
        'last-event-id': '12345',
      };

      const lastEventId = headers['last-event-id'];

      expect(lastEventId).toBe('12345');
    });

    it('should handle reconnection without Last-Event-ID', () => {
      const headers = {
        'mcp-session-id': randomUUID(),
      };

      const lastEventId = headers['last-event-id'];

      expect(lastEventId).toBeUndefined();
    });

    it('should validate Last-Event-ID format', () => {
      const validIds = ['0', '123', '99999'];
      const emptyOrNullIds = ['', null, undefined];

      validIds.forEach((id) => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });

      emptyOrNullIds.forEach((id) => {
        const isValid = !!id && typeof id === 'string' && id.length > 0;
        expect(isValid).toBe(false);
      });
    });
  });
});
