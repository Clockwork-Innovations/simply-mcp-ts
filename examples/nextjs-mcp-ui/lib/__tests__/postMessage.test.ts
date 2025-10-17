/**
 * PostMessage Protocol Tests
 *
 * Comprehensive test suite for the postMessage protocol implementation.
 * Tests all message types, validation functions, and security features.
 *
 * Layer 2 Phase 1: Foundation testing (20+ tests required).
 *
 * @module lib/__tests__/postMessage.test
 */

import { describe, test, expect } from '@jest/globals';
import {
  isActionMessage,
  isToolCallAction,
  isNotifyAction,
  isLinkAction,
  isPromptAction,
  isIntentAction,
  isValidAction,
  validateOrigin,
  sanitizeParams,
  createSuccessResult,
  createErrorResult,
  type ActionMessage,
  type ToolCallAction,
  type NotifyAction,
  type LinkAction,
  type PromptAction,
  type IntentAction,
} from '../postMessage';

describe('PostMessage Protocol', () => {
  describe('isActionMessage', () => {
    test('accepts valid action message', () => {
      const message = {
        type: 'tool',
        payload: { toolName: 'test' },
      };
      expect(isActionMessage(message)).toBe(true);
    });

    test('rejects null', () => {
      expect(isActionMessage(null)).toBe(false);
    });

    test('rejects undefined', () => {
      expect(isActionMessage(undefined)).toBe(false);
    });

    test('rejects non-object', () => {
      expect(isActionMessage('string')).toBe(false);
      expect(isActionMessage(123)).toBe(false);
      expect(isActionMessage(true)).toBe(false);
    });

    test('rejects message without type', () => {
      const message = {
        payload: { toolName: 'test' },
      };
      expect(isActionMessage(message)).toBe(false);
    });

    test('rejects message without payload', () => {
      const message = {
        type: 'tool',
      };
      expect(isActionMessage(message)).toBe(false);
    });

    test('rejects message with invalid type', () => {
      const message = {
        type: 'invalid',
        payload: {},
      };
      expect(isActionMessage(message)).toBe(false);
    });

    test('rejects message with non-object payload', () => {
      const message = {
        type: 'tool',
        payload: 'not an object',
      };
      expect(isActionMessage(message)).toBe(false);
    });
  });

  describe('isToolCallAction', () => {
    test('accepts valid tool call action', () => {
      const action: ToolCallAction = {
        type: 'tool',
        payload: {
          toolName: 'submit_feedback',
          params: { name: 'Alice' },
        },
      };
      expect(isToolCallAction(action)).toBe(true);
    });

    test('accepts tool call without params', () => {
      const action: ToolCallAction = {
        type: 'tool',
        payload: {
          toolName: 'refresh_data',
        },
      };
      expect(isToolCallAction(action)).toBe(true);
    });

    test('rejects tool call without toolName', () => {
      const action = {
        type: 'tool',
        payload: {
          params: { name: 'Alice' },
        },
      } as any;
      expect(isToolCallAction(action)).toBe(false);
    });

    test('rejects tool call with non-string toolName', () => {
      const action = {
        type: 'tool',
        payload: {
          toolName: 123,
          params: {},
        },
      } as any;
      expect(isToolCallAction(action)).toBe(false);
    });

    test('rejects non-tool action', () => {
      const action: NotifyAction = {
        type: 'notify',
        payload: {
          level: 'info',
          message: 'test',
        },
      };
      expect(isToolCallAction(action)).toBe(false);
    });
  });

  describe('isNotifyAction', () => {
    test('accepts valid notify action', () => {
      const action: NotifyAction = {
        type: 'notify',
        payload: {
          level: 'success',
          message: 'Operation completed',
        },
      };
      expect(isNotifyAction(action)).toBe(true);
    });

    test('accepts all valid levels', () => {
      const levels = ['info', 'warning', 'error', 'success'] as const;
      levels.forEach((level) => {
        const action: NotifyAction = {
          type: 'notify',
          payload: { level, message: 'test' },
        };
        expect(isNotifyAction(action)).toBe(true);
      });
    });

    test('rejects invalid level', () => {
      const action = {
        type: 'notify',
        payload: {
          level: 'invalid',
          message: 'test',
        },
      } as any;
      expect(isNotifyAction(action)).toBe(false);
    });

    test('rejects notify without message', () => {
      const action = {
        type: 'notify',
        payload: {
          level: 'info',
        },
      } as any;
      expect(isNotifyAction(action)).toBe(false);
    });
  });

  describe('isLinkAction', () => {
    test('accepts valid link action', () => {
      const action: LinkAction = {
        type: 'link',
        payload: {
          url: 'https://example.com',
          target: '_blank',
        },
      };
      expect(isLinkAction(action)).toBe(true);
    });

    test('accepts link without target', () => {
      const action: LinkAction = {
        type: 'link',
        payload: {
          url: 'https://example.com',
        },
      };
      expect(isLinkAction(action)).toBe(true);
    });

    test('rejects link without url', () => {
      const action = {
        type: 'link',
        payload: {
          target: '_blank',
        },
      } as any;
      expect(isLinkAction(action)).toBe(false);
    });

    test('rejects link with invalid target', () => {
      const action = {
        type: 'link',
        payload: {
          url: 'https://example.com',
          target: 'invalid',
        },
      } as any;
      expect(isLinkAction(action)).toBe(false);
    });
  });

  describe('isPromptAction', () => {
    test('accepts valid prompt action', () => {
      const action: PromptAction = {
        type: 'prompt',
        payload: {
          text: 'Enter your name',
          defaultValue: 'Alice',
        },
      };
      expect(isPromptAction(action)).toBe(true);
    });

    test('accepts prompt without defaultValue', () => {
      const action: PromptAction = {
        type: 'prompt',
        payload: {
          text: 'Enter your name',
        },
      };
      expect(isPromptAction(action)).toBe(true);
    });

    test('rejects prompt without text', () => {
      const action = {
        type: 'prompt',
        payload: {
          defaultValue: 'Alice',
        },
      } as any;
      expect(isPromptAction(action)).toBe(false);
    });

    test('rejects prompt with non-string defaultValue', () => {
      const action = {
        type: 'prompt',
        payload: {
          text: 'Enter your name',
          defaultValue: 123,
        },
      } as any;
      expect(isPromptAction(action)).toBe(false);
    });
  });

  describe('isIntentAction', () => {
    test('accepts valid intent action', () => {
      const action: IntentAction = {
        type: 'intent',
        payload: {
          intent: 'share',
          data: { url: 'https://example.com' },
        },
      };
      expect(isIntentAction(action)).toBe(true);
    });

    test('accepts intent without data', () => {
      const action: IntentAction = {
        type: 'intent',
        payload: {
          intent: 'share',
        },
      };
      expect(isIntentAction(action)).toBe(true);
    });

    test('rejects intent without intent name', () => {
      const action = {
        type: 'intent',
        payload: {
          data: {},
        },
      } as any;
      expect(isIntentAction(action)).toBe(false);
    });

    test('rejects intent with non-object data', () => {
      const action = {
        type: 'intent',
        payload: {
          intent: 'share',
          data: 'not an object',
        },
      } as any;
      expect(isIntentAction(action)).toBe(false);
    });
  });

  describe('isValidAction', () => {
    test('validates all action types', () => {
      const actions: ActionMessage[] = [
        {
          type: 'tool',
          payload: { toolName: 'test' },
        },
        {
          type: 'notify',
          payload: { level: 'info', message: 'test' },
        },
        {
          type: 'link',
          payload: { url: 'https://example.com' },
        },
        {
          type: 'prompt',
          payload: { text: 'Enter value' },
        },
        {
          type: 'intent',
          payload: { intent: 'share' },
        },
      ];

      actions.forEach((action) => {
        expect(isValidAction(action)).toBe(true);
      });
    });

    test('rejects malformed actions', () => {
      const invalid = [
        null,
        undefined,
        {},
        { type: 'tool' },
        { type: 'tool', payload: { params: {} } }, // missing toolName
        { type: 'notify', payload: { level: 'info' } }, // missing message
        { type: 'link', payload: {} }, // missing url
      ];

      invalid.forEach((action) => {
        expect(isValidAction(action)).toBe(false);
      });
    });
  });

  describe('validateOrigin - Security Critical', () => {
    test('accepts null origin (srcdoc iframes)', () => {
      expect(validateOrigin('null')).toBe(true);
    });

    test('accepts HTTPS origins', () => {
      expect(validateOrigin('https://example.com')).toBe(true);
      expect(validateOrigin('https://app.example.com')).toBe(true);
      expect(validateOrigin('https://example.com:8443')).toBe(true);
    });

    test('accepts localhost HTTP', () => {
      expect(validateOrigin('http://localhost')).toBe(true);
      expect(validateOrigin('http://localhost:3000')).toBe(true);
      expect(validateOrigin('http://localhost:8080')).toBe(true);
    });

    test('accepts localhost HTTPS', () => {
      expect(validateOrigin('https://localhost')).toBe(true);
      expect(validateOrigin('https://localhost:3000')).toBe(true);
    });

    test('accepts 127.0.0.1 HTTP', () => {
      expect(validateOrigin('http://127.0.0.1')).toBe(true);
      expect(validateOrigin('http://127.0.0.1:3000')).toBe(true);
    });

    test('accepts 127.0.0.1 HTTPS', () => {
      expect(validateOrigin('https://127.0.0.1')).toBe(true);
      expect(validateOrigin('https://127.0.0.1:3000')).toBe(true);
    });

    test('rejects HTTP non-localhost', () => {
      expect(validateOrigin('http://example.com')).toBe(false);
      expect(validateOrigin('http://evil.com')).toBe(false);
      expect(validateOrigin('http://192.168.1.1')).toBe(false);
    });

    test('rejects file:// protocol', () => {
      expect(validateOrigin('file:///etc/passwd')).toBe(false);
      expect(validateOrigin('file:///C:/Windows/System32')).toBe(false);
    });

    test('rejects javascript: protocol', () => {
      expect(validateOrigin('javascript:alert(1)')).toBe(false);
    });

    test('rejects data: protocol', () => {
      expect(validateOrigin('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    test('rejects invalid URLs', () => {
      expect(validateOrigin('not a url')).toBe(false);
      expect(validateOrigin('')).toBe(false);
      expect(validateOrigin('://invalid')).toBe(false);
    });
  });

  describe('sanitizeParams', () => {
    test('allows primitive types', () => {
      const params = {
        string: 'value',
        number: 42,
        boolean: true,
        nullValue: null,
      };

      const sanitized = sanitizeParams(params);
      expect(sanitized).toEqual(params);
    });

    test('filters out objects', () => {
      const params = {
        valid: 'string',
        invalid: { nested: 'object' },
      };

      const sanitized = sanitizeParams(params);
      expect(sanitized).toEqual({ valid: 'string' });
    });

    test('filters out arrays', () => {
      const params = {
        valid: 'string',
        invalid: [1, 2, 3],
      };

      const sanitized = sanitizeParams(params);
      expect(sanitized).toEqual({ valid: 'string' });
    });

    test('filters out functions', () => {
      const params = {
        valid: 'string',
        invalid: () => {},
      };

      const sanitized = sanitizeParams(params);
      expect(sanitized).toEqual({ valid: 'string' });
    });

    test('skips undefined values', () => {
      const params = {
        valid: 'string',
        undefined: undefined,
      };

      const sanitized = sanitizeParams(params);
      expect(sanitized).toEqual({ valid: 'string' });
    });

    test('handles empty object', () => {
      const sanitized = sanitizeParams({});
      expect(sanitized).toEqual({});
    });
  });

  describe('createSuccessResult', () => {
    test('creates success result with data', () => {
      const data = { value: 42 };
      const result = createSuccessResult(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.error).toBeUndefined();
    });

    test('creates success result without data', () => {
      const result = createSuccessResult();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(result.error).toBeUndefined();
    });
  });

  describe('createErrorResult', () => {
    test('creates error result with message', () => {
      const error = 'Something went wrong';
      const result = createErrorResult(error);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.data).toBeUndefined();
    });
  });
});
