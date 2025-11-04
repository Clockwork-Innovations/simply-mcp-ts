/**
 * PostMessage Protocol Compliance Tests
 *
 * Verifies that our MCP-UI implementation matches the official specification exactly.
 * These tests ensure protocol-level compatibility with the official MCP-UI SDK.
 *
 * Based on: https://github.com/idosal/mcp-ui
 * Spec reference: /mnt/Shared/cs-projects/simply-mcp-ts/MCP_UI_PROTOCOL_PARITY_ANALYSIS.md section 1.3
 *
 * Test coverage:
 * - Tool call message format
 * - Prompt message format
 * - Notify message format
 * - Link message format
 * - Intent message format
 * - Response message format (acknowledgment + result)
 * - MessageId tracking and consistency
 * - Payload structure validation
 * - Legacy format rejection
 *
 * @module tests/unit/protocol/postmessage-compliance
 */

import {
  isValidToolMessage,
  isValidPromptMessage,
  isValidNotifyMessage,
  isValidLinkMessage,
  isValidIntentMessage,
  isValidAcknowledgment,
  isValidResponse,
  isNotLegacyFormat,
  createToolCallMessage,
  createPromptMessage,
  createNotifyMessage,
  createLinkMessage,
  createIntentMessage,
  createAcknowledgment,
  createResponseMessage,
  VALID_ACTION_TYPES,
  VALID_RESPONSE_TYPES
} from './message-validators.js';

describe('PostMessage Protocol Compliance', () => {
  // ============================================================================
  // Tool Call Messages
  // ============================================================================
  describe('Tool call messages', () => {
    it('should accept spec-compliant tool call format', () => {
      const message = {
        type: 'tool',
        payload: {
          toolName: 'add',
          params: { a: 5, b: 3 }
        },
        messageId: 'test123'
      };
      expect(isValidToolMessage(message)).toBe(true);
    });

    it('should accept tool call without messageId', () => {
      const message = {
        type: 'tool',
        payload: {
          toolName: 'subtract',
          params: { x: 10, y: 4 }
        }
      };
      expect(isValidToolMessage(message)).toBe(true);
    });

    it('should accept tool call with empty params', () => {
      const message = {
        type: 'tool',
        payload: {
          toolName: 'reset',
          params: {}
        }
      };
      expect(isValidToolMessage(message)).toBe(true);
    });

    it('should reject tool call without payload', () => {
      const message = {
        type: 'tool',
        messageId: 'test123'
      };
      expect(isValidToolMessage(message)).toBe(false);
    });

    it('should reject tool call without toolName', () => {
      const message = {
        type: 'tool',
        payload: {
          params: { a: 5 }
        }
      };
      expect(isValidToolMessage(message)).toBe(false);
    });

    it('should reject tool call without params', () => {
      const message = {
        type: 'tool',
        payload: {
          toolName: 'add'
        }
      };
      expect(isValidToolMessage(message)).toBe(false);
    });

    it('should reject legacy MCP_UI_ACTION wrapper', () => {
      const legacy = {
        type: 'MCP_UI_ACTION',
        action: {
          type: 'CALL_TOOL',
          toolName: 'add',
          params: { a: 5, b: 3 }
        }
      };
      expect(isValidToolMessage(legacy)).toBe(false);
      expect(isNotLegacyFormat(legacy)).toBe(false);
    });

    it('should reject legacy CALL_TOOL type name', () => {
      const legacy = {
        type: 'CALL_TOOL',
        toolName: 'add',
        params: { a: 5, b: 3 }
      };
      expect(isValidToolMessage(legacy)).toBe(false);
      expect(isNotLegacyFormat(legacy)).toBe(false);
    });

    it('should reject tool call with callbackId instead of messageId', () => {
      const message = {
        type: 'tool',
        payload: {
          toolName: 'add',
          params: { a: 5, b: 3 }
        },
        callbackId: 'test123' // Wrong field name
      };
      expect(isValidToolMessage(message)).toBe(false);
    });

    it('should create spec-compliant tool call with helper', () => {
      const message = createToolCallMessage('multiply', { a: 3, b: 4 }, 'msg123');
      expect(isValidToolMessage(message)).toBe(true);
      expect(message.type).toBe('tool');
      expect(message.payload.toolName).toBe('multiply');
      expect(message.payload.params).toEqual({ a: 3, b: 4 });
      expect(message.messageId).toBe('msg123');
    });
  });

  // ============================================================================
  // Prompt Messages
  // ============================================================================
  describe('Prompt messages', () => {
    it('should accept spec-compliant prompt format', () => {
      const message = {
        type: 'prompt',
        payload: {
          prompt: 'Explain TypeScript interfaces'
        },
        messageId: 'prompt123'
      };
      expect(isValidPromptMessage(message)).toBe(true);
    });

    it('should accept prompt without messageId', () => {
      const message = {
        type: 'prompt',
        payload: {
          prompt: 'What is MCP?'
        }
      };
      expect(isValidPromptMessage(message)).toBe(true);
    });

    it('should reject prompt without payload', () => {
      const message = {
        type: 'prompt',
        messageId: 'prompt123'
      };
      expect(isValidPromptMessage(message)).toBe(false);
    });

    it('should reject prompt without prompt field', () => {
      const message = {
        type: 'prompt',
        payload: {}
      };
      expect(isValidPromptMessage(message)).toBe(false);
    });

    it('should reject legacy SUBMIT_PROMPT type name', () => {
      const legacy = {
        type: 'SUBMIT_PROMPT',
        prompt: 'Test prompt'
      };
      expect(isValidPromptMessage(legacy)).toBe(false);
      expect(isNotLegacyFormat(legacy)).toBe(false);
    });

    it('should create spec-compliant prompt with helper', () => {
      const message = createPromptMessage('Teach me about MCP-UI', 'prompt456');
      expect(isValidPromptMessage(message)).toBe(true);
      expect(message.type).toBe('prompt');
      expect(message.payload.prompt).toBe('Teach me about MCP-UI');
      expect(message.messageId).toBe('prompt456');
    });
  });

  // ============================================================================
  // Notify Messages
  // ============================================================================
  describe('Notify messages', () => {
    it('should accept spec-compliant notify format', () => {
      const message = {
        type: 'notify',
        payload: {
          message: 'Operation completed successfully',
          level: 'success'
        },
        messageId: 'notify123'
      };
      expect(isValidNotifyMessage(message)).toBe(true);
    });

    it('should accept notify without level', () => {
      const message = {
        type: 'notify',
        payload: {
          message: 'Something happened'
        }
      };
      expect(isValidNotifyMessage(message)).toBe(true);
    });

    it('should accept notify without messageId', () => {
      const message = {
        type: 'notify',
        payload: {
          message: 'Info message',
          level: 'info'
        }
      };
      expect(isValidNotifyMessage(message)).toBe(true);
    });

    it('should reject notify without payload', () => {
      const message = {
        type: 'notify',
        messageId: 'notify123'
      };
      expect(isValidNotifyMessage(message)).toBe(false);
    });

    it('should reject notify without message field', () => {
      const message = {
        type: 'notify',
        payload: {
          level: 'error'
        }
      };
      expect(isValidNotifyMessage(message)).toBe(false);
    });

    it('should reject legacy NOTIFY type name', () => {
      const legacy = {
        type: 'NOTIFY',
        message: 'Test notification'
      };
      expect(isValidNotifyMessage(legacy)).toBe(false);
      expect(isNotLegacyFormat(legacy)).toBe(false);
    });

    it('should create spec-compliant notify with helper', () => {
      const message = createNotifyMessage('Task completed', 'success', 'notify789');
      expect(isValidNotifyMessage(message)).toBe(true);
      expect(message.type).toBe('notify');
      expect(message.payload.message).toBe('Task completed');
      expect(message.payload.level).toBe('success');
      expect(message.messageId).toBe('notify789');
    });
  });

  // ============================================================================
  // Link Messages
  // ============================================================================
  describe('Link messages', () => {
    it('should accept spec-compliant link format', () => {
      const message = {
        type: 'link',
        payload: {
          url: 'https://example.com/docs'
        },
        messageId: 'link123'
      };
      expect(isValidLinkMessage(message)).toBe(true);
    });

    it('should accept link without messageId', () => {
      const message = {
        type: 'link',
        payload: {
          url: 'https://github.com/idosal/mcp-ui'
        }
      };
      expect(isValidLinkMessage(message)).toBe(true);
    });

    it('should reject link without payload', () => {
      const message = {
        type: 'link',
        messageId: 'link123'
      };
      expect(isValidLinkMessage(message)).toBe(false);
    });

    it('should reject link without url field', () => {
      const message = {
        type: 'link',
        payload: {}
      };
      expect(isValidLinkMessage(message)).toBe(false);
    });

    it('should reject legacy NAVIGATE type name', () => {
      const legacy = {
        type: 'NAVIGATE',
        url: 'https://example.com'
      };
      expect(isValidLinkMessage(legacy)).toBe(false);
      expect(isNotLegacyFormat(legacy)).toBe(false);
    });

    it('should create spec-compliant link with helper', () => {
      const message = createLinkMessage('https://docs.example.com', 'link456');
      expect(isValidLinkMessage(message)).toBe(true);
      expect(message.type).toBe('link');
      expect(message.payload.url).toBe('https://docs.example.com');
      expect(message.messageId).toBe('link456');
    });
  });

  // ============================================================================
  // Intent Messages
  // ============================================================================
  describe('Intent messages', () => {
    it('should accept spec-compliant intent format', () => {
      const message = {
        type: 'intent',
        payload: {
          intent: 'share',
          params: {
            title: 'Check this out',
            url: 'https://example.com'
          }
        },
        messageId: 'intent123'
      };
      expect(isValidIntentMessage(message)).toBe(true);
    });

    it('should accept intent with empty params', () => {
      const message = {
        type: 'intent',
        payload: {
          intent: 'refresh',
          params: {}
        }
      };
      expect(isValidIntentMessage(message)).toBe(true);
    });

    it('should accept intent without messageId', () => {
      const message = {
        type: 'intent',
        payload: {
          intent: 'copy',
          params: { text: 'Hello World' }
        }
      };
      expect(isValidIntentMessage(message)).toBe(true);
    });

    it('should reject intent without payload', () => {
      const message = {
        type: 'intent',
        messageId: 'intent123'
      };
      expect(isValidIntentMessage(message)).toBe(false);
    });

    it('should reject intent without intent field', () => {
      const message = {
        type: 'intent',
        payload: {
          params: { data: 'test' }
        }
      };
      expect(isValidIntentMessage(message)).toBe(false);
    });

    it('should reject intent without params field', () => {
      const message = {
        type: 'intent',
        payload: {
          intent: 'share'
        }
      };
      expect(isValidIntentMessage(message)).toBe(false);
    });

    it('should create spec-compliant intent with helper', () => {
      const message = createIntentMessage('open', { target: '_blank' }, 'intent789');
      expect(isValidIntentMessage(message)).toBe(true);
      expect(message.type).toBe('intent');
      expect(message.payload.intent).toBe('open');
      expect(message.payload.params).toEqual({ target: '_blank' });
      expect(message.messageId).toBe('intent789');
    });
  });

  // ============================================================================
  // Response Messages - Acknowledgment
  // ============================================================================
  describe('Response messages - Acknowledgment', () => {
    it('should accept spec-compliant acknowledgment format', () => {
      const ack = {
        type: 'ui-message-received',
        messageId: 'test123'
      };
      expect(isValidAcknowledgment(ack)).toBe(true);
    });

    it('should reject acknowledgment without messageId', () => {
      const ack = {
        type: 'ui-message-received'
      };
      expect(isValidAcknowledgment(ack)).toBe(false);
    });

    it('should reject acknowledgment with wrong type', () => {
      const ack = {
        type: 'message-received', // Wrong name
        messageId: 'test123'
      };
      expect(isValidAcknowledgment(ack)).toBe(false);
    });

    it('should reject acknowledgment with callbackId', () => {
      const ack = {
        type: 'ui-message-received',
        callbackId: 'test123' // Wrong field
      };
      expect(isValidAcknowledgment(ack)).toBe(false);
    });

    it('should create spec-compliant acknowledgment with helper', () => {
      const ack = createAcknowledgment('msg999');
      expect(isValidAcknowledgment(ack)).toBe(true);
      expect(ack.type).toBe('ui-message-received');
      expect(ack.messageId).toBe('msg999');
    });
  });

  // ============================================================================
  // Response Messages - Result
  // ============================================================================
  describe('Response messages - Result', () => {
    it('should accept spec-compliant response with result', () => {
      const response = {
        type: 'ui-message-response',
        messageId: 'test123',
        result: { value: 42 }
      };
      expect(isValidResponse(response)).toBe(true);
    });

    it('should accept response with error', () => {
      const response = {
        type: 'ui-message-response',
        messageId: 'test123',
        error: 'Tool not found'
      };
      expect(isValidResponse(response)).toBe(true);
    });

    it('should accept response with neither result nor error', () => {
      const response = {
        type: 'ui-message-response',
        messageId: 'test123'
      };
      expect(isValidResponse(response)).toBe(true);
    });

    it('should reject response with both result and error', () => {
      const response = {
        type: 'ui-message-response',
        messageId: 'test123',
        result: { value: 42 },
        error: 'This should not happen'
      };
      expect(isValidResponse(response)).toBe(false);
    });

    it('should reject response without messageId', () => {
      const response = {
        type: 'ui-message-response',
        result: { value: 42 }
      };
      expect(isValidResponse(response)).toBe(false);
    });

    it('should reject legacy TOOL_RESULT type', () => {
      const legacy = {
        type: 'TOOL_RESULT',
        callbackId: 'test123',
        result: { value: 42 }
      };
      expect(isValidResponse(legacy)).toBe(false);
      expect(isNotLegacyFormat(legacy)).toBe(false);
    });

    it('should reject response with callbackId instead of messageId', () => {
      const response = {
        type: 'ui-message-response',
        callbackId: 'test123', // Wrong field
        result: { value: 42 }
      };
      expect(isValidResponse(response)).toBe(false);
    });

    it('should create spec-compliant response with result using helper', () => {
      const response = createResponseMessage('msg888', { sum: 15 });
      expect(isValidResponse(response)).toBe(true);
      expect(response.type).toBe('ui-message-response');
      expect(response.messageId).toBe('msg888');
      expect(response.result).toEqual({ sum: 15 });
      expect(response.error).toBeUndefined();
    });

    it('should create spec-compliant response with error using helper', () => {
      const response = createResponseMessage('msg777', undefined, 'Operation failed');
      expect(isValidResponse(response)).toBe(true);
      expect(response.type).toBe('ui-message-response');
      expect(response.messageId).toBe('msg777');
      expect(response.result).toBeUndefined();
      expect(response.error).toBe('Operation failed');
    });
  });

  // ============================================================================
  // MessageId Tracking and Consistency
  // ============================================================================
  describe('MessageId tracking', () => {
    it('should use messageId field consistently', () => {
      const message = createToolCallMessage('add', { a: 1, b: 2 }, 'msg123');
      expect(message).toHaveProperty('messageId');
      expect(message.messageId).toBe('msg123');
      expect(message).not.toHaveProperty('callbackId');
    });

    it('should preserve messageId in acknowledgment', () => {
      const requestId = 'abc123';
      const request = createToolCallMessage('test', {}, requestId);
      const ack = createAcknowledgment(requestId);

      expect(request.messageId).toBe(requestId);
      expect(ack.messageId).toBe(requestId);
      expect(ack.messageId).toBe(request.messageId);
    });

    it('should preserve messageId in response', () => {
      const requestId = 'xyz789';
      const request = createToolCallMessage('multiply', { a: 5, b: 3 }, requestId);
      const response = createResponseMessage(requestId, { result: 15 });

      expect(request.messageId).toBe(requestId);
      expect(response.messageId).toBe(requestId);
      expect(response.messageId).toBe(request.messageId);
    });

    it('should allow missing messageId for fire-and-forget actions', () => {
      const notify = createNotifyMessage('Update complete');
      expect(notify.messageId).toBeUndefined();
      expect(isValidNotifyMessage(notify)).toBe(true);
    });

    it('should require messageId for response messages', () => {
      const responseWithoutId = {
        type: 'ui-message-response',
        result: { value: 42 }
      };
      expect(isValidResponse(responseWithoutId)).toBe(false);

      const ackWithoutId = {
        type: 'ui-message-received'
      };
      expect(isValidAcknowledgment(ackWithoutId)).toBe(false);
    });
  });

  // ============================================================================
  // Payload Structure Validation
  // ============================================================================
  describe('Payload structure', () => {
    it('should use payload object for tool calls', () => {
      const message = createToolCallMessage('test', { x: 1 });
      expect(message).toHaveProperty('payload');
      expect(message.payload).toBeInstanceOf(Object);
      expect(message.payload).toHaveProperty('toolName');
      expect(message.payload).toHaveProperty('params');
    });

    it('should not have top-level toolName field', () => {
      const message = createToolCallMessage('test', { x: 1 });
      expect(message).not.toHaveProperty('toolName');
      expect(message.payload).toHaveProperty('toolName');
    });

    it('should not have top-level params field', () => {
      const message = createToolCallMessage('test', { x: 1 });
      expect(message).not.toHaveProperty('params');
      expect(message.payload).toHaveProperty('params');
    });

    it('should use payload object for all action types', () => {
      const tool = createToolCallMessage('test', {});
      const prompt = createPromptMessage('test');
      const notify = createNotifyMessage('test');
      const link = createLinkMessage('https://test.com');
      const intent = createIntentMessage('test', {});

      expect(tool).toHaveProperty('payload');
      expect(prompt).toHaveProperty('payload');
      expect(notify).toHaveProperty('payload');
      expect(link).toHaveProperty('payload');
      expect(intent).toHaveProperty('payload');
    });

    it('should reject flat structure without payload', () => {
      // Old format: flat structure
      const flat = {
        type: 'tool',
        toolName: 'add',
        params: { a: 1, b: 2 }
      };
      expect(isValidToolMessage(flat)).toBe(false);
    });
  });

  // ============================================================================
  // Legacy Format Detection and Rejection
  // ============================================================================
  describe('Legacy format detection', () => {
    it('should reject MCP_UI_ACTION wrapper', () => {
      const legacy = {
        type: 'MCP_UI_ACTION',
        action: {
          type: 'CALL_TOOL',
          toolName: 'add',
          params: { a: 5, b: 3 }
        }
      };
      expect(isNotLegacyFormat(legacy)).toBe(false);
    });

    it('should reject legacy type names', () => {
      const legacyTypes = ['CALL_TOOL', 'SUBMIT_PROMPT', 'NOTIFY', 'NAVIGATE', 'TOOL_RESULT'];

      legacyTypes.forEach(type => {
        const msg = { type, data: {} };
        expect(isNotLegacyFormat(msg)).toBe(false);
      });
    });

    it('should reject nested action object', () => {
      const legacy = {
        type: 'tool',
        action: {
          type: 'CALL_TOOL',
          toolName: 'test'
        }
      };
      expect(isNotLegacyFormat(legacy)).toBe(false);
    });

    it('should reject callbackId without messageId', () => {
      const legacy = {
        type: 'tool',
        payload: { toolName: 'test', params: {} },
        callbackId: 'old123'
      };
      expect(isNotLegacyFormat(legacy)).toBe(false);
    });

    it('should accept spec-compliant messages', () => {
      const valid = createToolCallMessage('test', { x: 1 }, 'msg123');
      expect(isNotLegacyFormat(valid)).toBe(true);
    });
  });

  // ============================================================================
  // Complete Protocol Validation
  // ============================================================================
  describe('Complete protocol validation', () => {
    it('should validate all action types are recognized', () => {
      expect(VALID_ACTION_TYPES).toContain('tool');
      expect(VALID_ACTION_TYPES).toContain('prompt');
      expect(VALID_ACTION_TYPES).toContain('notify');
      expect(VALID_ACTION_TYPES).toContain('link');
      expect(VALID_ACTION_TYPES).toContain('intent');
      expect(VALID_ACTION_TYPES).toHaveLength(5);
    });

    it('should validate all response types are recognized', () => {
      expect(VALID_RESPONSE_TYPES).toContain('ui-message-received');
      expect(VALID_RESPONSE_TYPES).toContain('ui-message-response');
      expect(VALID_RESPONSE_TYPES).toHaveLength(2);
    });

    it('should maintain protocol consistency across message types', () => {
      // All actions should have the same structure
      const tool = createToolCallMessage('test', {});
      const prompt = createPromptMessage('test');
      const notify = createNotifyMessage('test');
      const link = createLinkMessage('https://test.com');
      const intent = createIntentMessage('test', {});

      // All have type field
      expect(tool).toHaveProperty('type');
      expect(prompt).toHaveProperty('type');
      expect(notify).toHaveProperty('type');
      expect(link).toHaveProperty('type');
      expect(intent).toHaveProperty('type');

      // All have payload field
      expect(tool).toHaveProperty('payload');
      expect(prompt).toHaveProperty('payload');
      expect(notify).toHaveProperty('payload');
      expect(link).toHaveProperty('payload');
      expect(intent).toHaveProperty('payload');

      // None have action field
      expect(tool).not.toHaveProperty('action');
      expect(prompt).not.toHaveProperty('action');
      expect(notify).not.toHaveProperty('action');
      expect(link).not.toHaveProperty('action');
      expect(intent).not.toHaveProperty('action');
    });
  });
});
