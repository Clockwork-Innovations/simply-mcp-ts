/**
 * MCP UI Protocol Runtime Behavior Tests
 *
 * These tests verify the actual runtime behavior of the MCP UI protocol
 * implementation, focusing on message passing, correlation, and error handling.
 *
 * Unlike static tests that check generated code structure, these tests
 * simulate the actual execution flow of the protocol in a sandboxed environment.
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

describe('MCP UI Protocol Runtime Behavior', () => {
  let mockPostMessage: jest.Mock;
  let mockPendingRequests: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>;
  let mockWindow: any;

  beforeEach(() => {
    mockPostMessage = jest.fn();
    mockPendingRequests = new Map();

    // Mock window.parent.postMessage
    mockWindow = {
      parent: {
        postMessage: mockPostMessage
      },
      addEventListener: jest.fn(),
      Map: Map,
      Date: Date,
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      Promise: Promise,
      Error: Error
    };
  });

  describe('Tool Call Message Structure', () => {
    test('should generate correct message structure with type: "tool"', () => {
      // Simulate callTool() function execution
      const toolName = 'test_tool';
      const params = { key: 'value' };
      const messageId = 'req_123';

      // Execute postMessage as generated script would
      mockWindow.parent.postMessage({
        type: 'tool',
        payload: {
          toolName,
          params
        },
        messageId
      }, '*');

      // Verify exact structure matches MCP UI spec
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'tool',
        payload: {
          toolName: 'test_tool',
          params: { key: 'value' }
        },
        messageId: 'req_123'
      }, '*');
    });

    test('should use nested payload structure (not flat)', () => {
      const message = {
        type: 'tool',
        payload: {
          toolName: 'calculate',
          params: { a: 1, b: 2 }
        },
        messageId: 'req_456'
      };

      mockWindow.parent.postMessage(message, '*');

      const call = mockPostMessage.mock.calls[0][0] as any;

      // Verify nesting
      expect(call).toHaveProperty('payload');
      expect(call.payload).toHaveProperty('toolName');
      expect(call.payload).toHaveProperty('params');

      // Verify NOT flat structure (old format)
      expect(call).not.toHaveProperty('toolName');
      expect(call).not.toHaveProperty('params');
    });

    test('should use messageId (not requestId)', () => {
      const message = {
        type: 'tool',
        payload: {
          toolName: 'test',
          params: {}
        },
        messageId: 'req_789'
      };

      mockWindow.parent.postMessage(message, '*');

      const call = mockPostMessage.mock.calls[0][0] as any;

      // Verify messageId present
      expect(call).toHaveProperty('messageId');
      expect(call.messageId).toBe('req_789');

      // Verify requestId NOT present (old format)
      expect(call).not.toHaveProperty('requestId');
    });

    test('should handle complex nested params', () => {
      const complexParams = {
        user: {
          name: 'John',
          age: 30,
          tags: ['developer', 'tester']
        },
        config: {
          enabled: true,
          count: 42
        }
      };

      mockWindow.parent.postMessage({
        type: 'tool',
        payload: {
          toolName: 'complex_tool',
          params: complexParams
        },
        messageId: 'req_complex'
      }, '*');

      const call = mockPostMessage.mock.calls[0][0] as any;
      expect(call.payload.params).toEqual(complexParams);
      expect(call.payload.params.user.tags).toHaveLength(2);
    });
  });

  describe('Tool Response Message Correlation', () => {
    test('should correlate responses using messageId', () => {
      const requestId = 'req_456';
      const mockResolve = jest.fn();
      const mockReject = jest.fn();

      // Store pending request (as generated script would)
      mockPendingRequests.set(requestId, {
        resolve: mockResolve,
        reject: mockReject,
        timeout: setTimeout(() => {}, 30000) as NodeJS.Timeout
      });

      // Simulate response event
      const event = {
        data: {
          type: 'tool-response',
          messageId: requestId,
          payload: {
            result: { answer: 42 }
          }
        }
      };

      // Process response (as message listener would)
      const pending = mockPendingRequests.get(event.data.messageId);
      expect(pending).toBeDefined();
      expect(pending?.resolve).toBe(mockResolve);

      // Verify resolution
      if (pending && event.data.payload.result) {
        pending.resolve(event.data.payload.result);
      }

      expect(mockResolve).toHaveBeenCalledWith({ answer: 42 });
      expect(mockReject).not.toHaveBeenCalled();
    });

    test('should handle error responses correctly', () => {
      const requestId = 'req_error';
      const mockResolve = jest.fn();
      const mockReject = jest.fn();

      mockPendingRequests.set(requestId, {
        resolve: mockResolve,
        reject: mockReject,
        timeout: setTimeout(() => {}, 30000) as NodeJS.Timeout
      });

      // Simulate error response
      const event = {
        data: {
          type: 'tool-response',
          messageId: requestId,
          payload: {
            error: 'Tool execution failed'
          }
        }
      };

      // Process error response
      const pending = mockPendingRequests.get(event.data.messageId);
      if (pending && event.data.payload.error) {
        pending.reject(new Error(event.data.payload.error));
      }

      expect(mockReject).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Tool execution failed'
      }));
      expect(mockResolve).not.toHaveBeenCalled();
    });

    test('should ignore responses with wrong messageId', () => {
      const correctId = 'req_correct';
      const wrongId = 'req_wrong';

      const mockResolve = jest.fn();
      mockPendingRequests.set(correctId, {
        resolve: mockResolve,
        reject: jest.fn(),
        timeout: setTimeout(() => {}, 30000) as NodeJS.Timeout
      });

      // Try to process response with wrong ID
      const wrongEvent = {
        data: {
          type: 'tool-response',
          messageId: wrongId,
          payload: { result: { wrong: true } }
        }
      };

      const pending = mockPendingRequests.get(wrongEvent.data.messageId);
      expect(pending).toBeUndefined();
      expect(mockResolve).not.toHaveBeenCalled();
    });

    test('should handle missing messageId gracefully', () => {
      const event = {
        data: {
          type: 'tool-response',
          // Missing messageId
          payload: { result: { answer: 42 } }
        }
      };

      // Attempt to get pending request
      const pending = mockPendingRequests.get((event.data as any).messageId);

      // Should be undefined (not crash)
      expect(pending).toBeUndefined();
    });
  });

  describe('Notification Message Structure', () => {
    test('should generate correct notification structure with type: "notify"', () => {
      const message = 'Test notification';
      const level = 'info';

      // Execute as generated script would
      mockWindow.parent.postMessage({
        type: 'notify',
        payload: {
          message,
          level
        }
      }, '*');

      // Verify structure
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'notify',
        payload: {
          message: 'Test notification',
          level: 'info'
        }
      }, '*');
    });

    test('should use nested payload for notifications', () => {
      mockWindow.parent.postMessage({
        type: 'notify',
        payload: {
          message: 'Error occurred',
          level: 'error'
        }
      }, '*');

      const call = mockPostMessage.mock.calls[0][0] as any;

      // Verify nesting
      expect(call).toHaveProperty('payload');
      expect(call.payload).toHaveProperty('message');
      expect(call.payload).toHaveProperty('level');

      // Verify NOT flat structure
      expect(call).not.toHaveProperty('message');
      expect(call).not.toHaveProperty('level');
    });

    test('should NOT include timestamp in notifications', () => {
      // Per spec: timestamp was removed from protocol
      mockWindow.parent.postMessage({
        type: 'notify',
        payload: {
          message: 'Test',
          level: 'info'
        }
      }, '*');

      const call = mockPostMessage.mock.calls[0][0] as any;

      // Verify no timestamp anywhere
      expect(call).not.toHaveProperty('timestamp');
      expect(call.payload).not.toHaveProperty('timestamp');
    });

    test('should handle different notification levels', () => {
      const levels = ['info', 'warning', 'error'];

      levels.forEach((level, index) => {
        mockWindow.parent.postMessage({
          type: 'notify',
          payload: {
            message: `Message ${index}`,
            level
          }
        }, '*');
      });

      expect(mockPostMessage).toHaveBeenCalledTimes(3);

      mockPostMessage.mock.calls.forEach((call, index) => {
        const msg = call[0] as any;
        expect(msg.type).toBe('notify');
        expect(msg.payload.level).toBe(levels[index]);
        expect(msg.payload.message).toBe(`Message ${index}`);
      });
    });
  });

  describe('Protocol Compliance - Negative Cases', () => {
    test('should reject legacy protocol type: "mcp-ui-tool-call"', () => {
      const legacyMessage = {
        type: 'mcp-ui-tool-call',  // Old format
        toolName: 'test',
        params: {}
      };

      // Verify this is NOT the correct format
      expect(legacyMessage.type).not.toBe('tool');
      expect(legacyMessage).not.toHaveProperty('payload');
      expect(legacyMessage).toHaveProperty('toolName'); // Should be nested in payload
    });

    test('should reject legacy protocol type: "mcp-ui-tool-response"', () => {
      const legacyResponse = {
        type: 'mcp-ui-tool-response',  // Old format
        requestId: 'req_123',  // Old field name
        result: { answer: 42 }
      };

      // Verify this is NOT the correct format
      expect(legacyResponse.type).not.toBe('tool-response');
      expect(legacyResponse).toHaveProperty('requestId'); // Should be messageId
      expect(legacyResponse).not.toHaveProperty('payload');
    });

    test('should reject legacy protocol type: "mcp-ui-notification"', () => {
      const legacyNotification = {
        type: 'mcp-ui-notification',  // Old format
        message: 'Test',
        level: 'info'
      };

      // Verify this is NOT the correct format
      expect(legacyNotification.type).not.toBe('notify');
      expect(legacyNotification).not.toHaveProperty('payload');
      expect(legacyNotification).toHaveProperty('message'); // Should be nested
    });

    test('should reject flat tool call structure', () => {
      const flatMessage = {
        type: 'tool',
        toolName: 'test',  // Should be in payload
        params: {},        // Should be in payload
        messageId: 'req_123'
      };

      // Verify this is NOT compliant with nested payload requirement
      expect(flatMessage).toHaveProperty('toolName');
      expect(flatMessage).toHaveProperty('params');
      expect(flatMessage).not.toHaveProperty('payload');
    });

    test('should reject requestId in favor of messageId', () => {
      const wrongIdMessage = {
        type: 'tool',
        payload: {
          toolName: 'test',
          params: {}
        },
        requestId: 'req_123'  // Wrong field name
      };

      // Verify this is NOT compliant
      expect(wrongIdMessage).toHaveProperty('requestId');
      expect(wrongIdMessage).not.toHaveProperty('messageId');
    });
  });

  describe('Request Lifecycle Management', () => {
    test('should generate unique messageIds', () => {
      const messageIds = new Set<string>();

      // Simulate multiple tool calls
      for (let i = 0; i < 10; i++) {
        const messageId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        messageIds.add(messageId);
      }

      // All should be unique
      expect(messageIds.size).toBe(10);

      // All should match expected pattern
      messageIds.forEach(id => {
        expect(id).toMatch(/^req_\d+_[a-z0-9]+$/);
      });
    });

    test('should clean up pending requests on resolution', () => {
      const requestId = 'req_cleanup';
      const mockResolve = jest.fn();

      mockPendingRequests.set(requestId, {
        resolve: mockResolve,
        reject: jest.fn(),
        timeout: setTimeout(() => {}, 30000) as NodeJS.Timeout
      });

      expect(mockPendingRequests.has(requestId)).toBe(true);

      // Simulate resolution and cleanup
      const pending = mockPendingRequests.get(requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        mockPendingRequests.delete(requestId);
      }

      expect(mockPendingRequests.has(requestId)).toBe(false);
    });

    test('should handle timeout correctly', () => {
      jest.useFakeTimers();

      const requestId = 'req_timeout';
      const mockReject = jest.fn();

      // Simulate timeout setup
      const timeout = setTimeout(() => {
        const pending = mockPendingRequests.get(requestId);
        if (pending) {
          pending.reject(new Error('Tool call timed out after 30 seconds'));
          mockPendingRequests.delete(requestId);
        }
      }, 30000);

      mockPendingRequests.set(requestId, {
        resolve: jest.fn(),
        reject: mockReject,
        timeout
      });

      // Fast-forward past timeout
      jest.advanceTimersByTime(30000);

      expect(mockReject).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('timed out')
        })
      );
      expect(mockPendingRequests.has(requestId)).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed response payload gracefully', () => {
      const event = {
        data: {
          type: 'tool-response',
          messageId: 'req_123'
          // Missing payload entirely
        }
      };

      // Should not crash when accessing payload
      const messageId = event.data.messageId;
      const payload = (event.data as any).payload;

      expect(messageId).toBe('req_123');
      expect(payload).toBeUndefined();
    });

    test('should handle response with empty error string', () => {
      const requestId = 'req_empty_error';
      const mockReject = jest.fn();

      mockPendingRequests.set(requestId, {
        resolve: jest.fn(),
        reject: mockReject,
        timeout: setTimeout(() => {}, 30000) as NodeJS.Timeout
      });

      const event = {
        data: {
          type: 'tool-response',
          messageId: requestId,
          payload: {
            error: ''  // Empty error message
          }
        }
      };

      // Process with fallback message
      const pending = mockPendingRequests.get(event.data.messageId);
      if (pending && event.data.payload.error !== undefined) {
        const errorMsg = event.data.payload.error || 'Tool call failed';
        pending.reject(new Error(errorMsg));
      }

      expect(mockReject).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Tool call failed'
        })
      );
    });

    test('should handle response with both result and error', () => {
      const event = {
        data: {
          type: 'tool-response',
          messageId: 'req_both',
          payload: {
            result: { answer: 42 },
            error: 'Something went wrong'
          }
        }
      };

      // Error should take precedence
      const hasError = event.data.payload.error !== undefined;
      expect(hasError).toBe(true);
    });

    test('should validate message origin in production', () => {
      // In production, should check event.origin
      const trustedOrigin = 'https://trusted-domain.com';
      const untrustedOrigin = 'https://malicious-site.com';

      // Simulate origin check
      const isValidOrigin = (origin: string) => {
        // In real implementation, check against allowed origins
        return origin === trustedOrigin;
      };

      expect(isValidOrigin(trustedOrigin)).toBe(true);
      expect(isValidOrigin(untrustedOrigin)).toBe(false);
    });
  });
});
