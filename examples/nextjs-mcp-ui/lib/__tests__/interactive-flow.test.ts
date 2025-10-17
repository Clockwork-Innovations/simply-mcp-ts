/**
 * Interactive Flow Integration Test
 *
 * Tests the complete interaction loop:
 * 1. User fills form in iframe
 * 2. Form submits via postMessage
 * 3. Parent captures event and calls tool executor
 * 4. Tool executor calls MCP server
 * 5. Response bubbles back to iframe
 *
 * Layer 2/3 Integration: Real Interactive Components
 *
 * @module lib/__tests__/interactive-flow.test
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { InteractiveHandler, IFRAME_CLIENT_CODE } from '../interactiveHandler.js';
import type { ToolResponse } from '../types.js';

describe('Interactive Flow - Form to Tool Execution', () => {
  let handler: InteractiveHandler;
  let toolExecutorCalls: Array<{ toolName: string; args: Record<string, unknown> }> = [];
  let mockIframe: HTMLIFrameElement;

  beforeEach(() => {
    // Reset calls
    toolExecutorCalls = [];

    // Mock tool executor
    const executor = async (toolName: string, args?: Record<string, unknown>): Promise<ToolResponse> => {
      toolExecutorCalls.push({ toolName, args: args || {} });

      // Simulate different tool responses
      if (toolName === 'select_product') {
        return {
          success: true,
          data: {
            orderId: 'ORD-' + Date.now(),
            product: (args as any)?.product,
            status: 'confirmed',
          },
        };
      } else if (toolName === 'submit_feedback') {
        return {
          success: true,
          data: {
            feedbackId: 'FB-' + Date.now(),
            message: (args as any)?.message,
            status: 'received',
          },
        };
      }

      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
      };
    };

    handler = new InteractiveHandler(executor, false);

    // Create mock iframe
    mockIframe = document.createElement('iframe');
    document.body.appendChild(mockIframe);
    handler.setupIframe(mockIframe);
  });

  afterEach(() => {
    if (mockIframe && mockIframe.parentNode) {
      mockIframe.parentNode.removeChild(mockIframe);
    }
  });

  describe('Interactive Handler Setup', () => {
    it('should create handler instance', () => {
      expect(handler).toBeDefined();
      expect(handler instanceof InteractiveHandler).toBe(true);
    });

    it('should setup iframe listener', () => {
      expect(mockIframe).toBeDefined();
      // Handler is set up in beforeEach
    });
  });

  describe('Client Code Injection', () => {
    it('should have client code for iframe injection', () => {
      expect(IFRAME_CLIENT_CODE).toBeDefined();
      expect(typeof IFRAME_CLIENT_CODE).toBe('string');
    });

    it('should contain UIInteractive API in client code', () => {
      expect(IFRAME_CLIENT_CODE).toContain('window.UIInteractive');
      expect(IFRAME_CLIENT_CODE).toContain('executeTool');
      expect(IFRAME_CLIENT_CODE).toContain('notify');
      expect(IFRAME_CLIENT_CODE).toContain('navigateTo');
    });

    it('should handle postMessage responses in client code', () => {
      expect(IFRAME_CLIENT_CODE).toContain('message');
      expect(IFRAME_CLIENT_CODE).toContain('requestId');
      expect(IFRAME_CLIENT_CODE).toContain('requestMap');
    });
  });

  describe('Tool Execution Flow', () => {
    it('should handle select_product tool', async () => {
      const toolName = 'select_product';
      const args = {
        product: 'widget-pro',
        name: 'John Doe',
        email: 'john@example.com',
      };

      // Simulate postMessage from iframe
      const event = new MessageEvent('message', {
        data: {
          type: 'tool',
          toolName,
          args,
          requestId: 'req-1',
        },
      });

      handler['handleMessage'](event);

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(toolExecutorCalls).toHaveLength(1);
      expect(toolExecutorCalls[0].toolName).toBe(toolName);
      expect(toolExecutorCalls[0].args.product).toBe('widget-pro');
    });

    it('should handle submit_feedback tool', async () => {
      const toolName = 'submit_feedback';
      const args = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        category: 'feature',
        message: 'Great product!',
      };

      const event = new MessageEvent('message', {
        data: {
          type: 'tool',
          toolName,
          args,
          requestId: 'req-2',
        },
      });

      handler['handleMessage'](event);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(toolExecutorCalls).toHaveLength(1);
      expect(toolExecutorCalls[0].toolName).toBe(toolName);
      expect(toolExecutorCalls[0].args.category).toBe('feature');
    });

    it('should return success response for valid tool', async () => {
      const event = new MessageEvent('message', {
        data: {
          type: 'tool',
          toolName: 'select_product',
          args: { product: 'gadget-max', name: 'Test', email: 'test@test.com' },
          requestId: 'req-3',
        },
      });

      // Mock postMessage to capture response
      const responses: unknown[] = [];
      const originalPostMessage = mockIframe.contentWindow?.postMessage;
      if (mockIframe.contentWindow) {
        mockIframe.contentWindow.postMessage = (data: unknown) => {
          responses.push(data);
        };
      }

      handler['handleMessage'](event);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(responses).toHaveLength(1);
      const response = responses[0] as any;
      expect(response.type).toBe('response');
      expect(response.success).toBe(true);
      expect(response.requestId).toBe('req-3');
      expect(response.data?.orderId).toBeDefined();

      // Restore
      if (mockIframe.contentWindow && originalPostMessage) {
        mockIframe.contentWindow.postMessage = originalPostMessage;
      }
    });

    it('should return error response for unknown tool', async () => {
      const event = new MessageEvent('message', {
        data: {
          type: 'tool',
          toolName: 'unknown_tool',
          args: {},
          requestId: 'req-4',
        },
      });

      const responses: unknown[] = [];
      const originalPostMessage = mockIframe.contentWindow?.postMessage;
      if (mockIframe.contentWindow) {
        mockIframe.contentWindow.postMessage = (data: unknown) => {
          responses.push(data);
        };
      }

      handler['handleMessage'](event);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(responses).toHaveLength(1);
      const response = responses[0] as any;
      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown tool');

      // Restore
      if (mockIframe.contentWindow && originalPostMessage) {
        mockIframe.contentWindow.postMessage = originalPostMessage;
      }
    });
  });

  describe('Notification Handling', () => {
    it('should handle notify action', async () => {
      const event = new MessageEvent('message', {
        data: {
          type: 'notify',
          message: 'Order confirmed!',
        },
      });

      handler['handleMessage'](event);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not call tool executor
      expect(toolExecutorCalls).toHaveLength(0);
    });
  });

  describe('Link Navigation', () => {
    it('should handle link navigation', async () => {
      const event = new MessageEvent('message', {
        data: {
          type: 'link',
          url: 'https://example.com/products',
        },
      });

      handler['handleMessage'](event);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(toolExecutorCalls).toHaveLength(0);
    });
  });

  describe('Intent Handling', () => {
    it('should handle custom intent', async () => {
      const event = new MessageEvent('message', {
        data: {
          type: 'intent',
          intent: 'open_details',
          args: { productId: 'widget-pro' },
        },
      });

      handler['handleMessage'](event);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(toolExecutorCalls).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown action type', async () => {
      const event = new MessageEvent('message', {
        data: {
          type: 'unknown_type',
          data: 'something',
        },
      });

      const responses: unknown[] = [];
      const originalPostMessage = mockIframe.contentWindow?.postMessage;
      if (mockIframe.contentWindow) {
        mockIframe.contentWindow.postMessage = (data: unknown) => {
          responses.push(data);
        };
      }

      handler['handleMessage'](event);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(responses.length).toBeGreaterThan(0);
      const response = responses[responses.length - 1] as any;
      expect(response.success).toBe(false);

      // Restore
      if (mockIframe.contentWindow && originalPostMessage) {
        mockIframe.contentWindow.postMessage = originalPostMessage;
      }
    });

    it('should handle executor exceptions', async () => {
      // Create handler with error-throwing executor
      const errorExecutor = async () => {
        throw new Error('Executor error');
      };
      const errorHandler = new InteractiveHandler(errorExecutor, false);
      errorHandler.setupIframe(mockIframe);

      const event = new MessageEvent('message', {
        data: {
          type: 'tool',
          toolName: 'test_tool',
          args: {},
          requestId: 'req-error',
        },
      });

      const responses: unknown[] = [];
      const originalPostMessage = mockIframe.contentWindow?.postMessage;
      if (mockIframe.contentWindow) {
        mockIframe.contentWindow.postMessage = (data: unknown) => {
          responses.push(data);
        };
      }

      errorHandler['handleMessage'](event);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(responses.length).toBeGreaterThan(0);
      const response = responses[responses.length - 1] as any;
      expect(response.success).toBe(false);
      expect(response.error).toBe('Executor error');

      // Restore
      if (mockIframe.contentWindow && originalPostMessage) {
        mockIframe.contentWindow.postMessage = originalPostMessage;
      }
    });
  });

  describe('Multiple Tools Sequential', () => {
    it('should handle multiple tool calls sequentially', async () => {
      // First tool call
      const event1 = new MessageEvent('message', {
        data: {
          type: 'tool',
          toolName: 'select_product',
          args: { product: 'widget-pro', name: 'User1', email: 'user1@test.com' },
          requestId: 'req-a',
        },
      });

      // Second tool call
      const event2 = new MessageEvent('message', {
        data: {
          type: 'tool',
          toolName: 'submit_feedback',
          args: { name: 'User2', email: 'user2@test.com', category: 'bug', message: 'Bug found' },
          requestId: 'req-b',
        },
      });

      handler['handleMessage'](event1);
      await new Promise((resolve) => setTimeout(resolve, 100));

      handler['handleMessage'](event2);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(toolExecutorCalls).toHaveLength(2);
      expect(toolExecutorCalls[0].toolName).toBe('select_product');
      expect(toolExecutorCalls[1].toolName).toBe('submit_feedback');
    });
  });

  describe('Data Integrity', () => {
    it('should preserve form data through tool execution', async () => {
      const formData = {
        product: 'tool-elite',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        notes: 'Please ship ASAP',
      };

      const event = new MessageEvent('message', {
        data: {
          type: 'tool',
          toolName: 'select_product',
          args: formData,
          requestId: 'req-data',
        },
      });

      handler['handleMessage'](event);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(toolExecutorCalls[0].args.product).toBe(formData.product);
      expect(toolExecutorCalls[0].args.name).toBe(formData.name);
      expect(toolExecutorCalls[0].args.email).toBe(formData.email);
      expect(toolExecutorCalls[0].args.notes).toBe(formData.notes);
    });

    it('should handle complex nested data structures', async () => {
      const complexData = {
        user: {
          name: 'Bob',
          email: 'bob@test.com',
        },
        items: [
          { id: '1', qty: 2 },
          { id: '2', qty: 1 },
        ],
        metadata: {
          timestamp: Date.now(),
          source: 'web',
        },
      };

      const event = new MessageEvent('message', {
        data: {
          type: 'tool',
          toolName: 'select_product',
          args: complexData,
          requestId: 'req-complex',
        },
      });

      handler['handleMessage'](event);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(toolExecutorCalls[0].args).toEqual(complexData);
    });
  });
});
