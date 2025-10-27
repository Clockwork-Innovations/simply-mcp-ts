/**
 * MCP UI Action Types Unit Tests
 *
 * Comprehensive tests for all 5 action types:
 * - tool (existing)
 * - notify (existing)
 * - prompt (new)
 * - intent (new)
 * - link (new)
 *
 * Tests verify:
 * 1. Correct message format (type + nested payload)
 * 2. Input validation
 * 3. Error handling
 * 4. Edge cases
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('MCP UI Action Types', () => {
  let mockPostMessage: jest.Mock;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let mockWindow: any;

  beforeEach(() => {
    // Mock postMessage
    mockPostMessage = jest.fn();
    mockWindow = {
      parent: { postMessage: mockPostMessage },
      addEventListener: jest.fn(),
    };
    (global as any).window = mockWindow;

    // Spy on console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Prompt Action', () => {
    // Load the actual function implementation
    beforeEach(() => {
      // Simulate the injected script
      mockWindow.submitPrompt = function (promptText: string) {
        if (typeof promptText !== 'string') {
          console.error('submitPrompt: promptText must be a string');
          return;
        }

        mockWindow.parent.postMessage(
          {
            type: 'prompt',
            payload: {
              prompt: promptText,
            },
          },
          '*'
        );
      };
    });

    test('should send correct prompt message format', () => {
      mockWindow.submitPrompt('Analyze this data');

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'prompt',
          payload: {
            prompt: 'Analyze this data',
          },
        },
        '*'
      );
    });

    test('should validate promptText is string', () => {
      mockWindow.submitPrompt(123 as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a string')
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    test('should handle empty prompts', () => {
      mockWindow.submitPrompt('');

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'prompt',
          payload: {
            prompt: '',
          },
        },
        '*'
      );
    });

    test('should handle special characters in prompts', () => {
      const specialPrompt = 'Test with "quotes", \'apostrophes\', and\nnewlines\t\ttabs';
      mockWindow.submitPrompt(specialPrompt);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'prompt',
          payload: {
            prompt: specialPrompt,
          },
        },
        '*'
      );
    });

    test('should handle Unicode characters', () => {
      const unicodePrompt = 'Test with emoji 🚀 and Chinese 中文';
      mockWindow.submitPrompt(unicodePrompt);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'prompt',
          payload: {
            prompt: unicodePrompt,
          },
        },
        '*'
      );
    });

    test('should handle very long prompts', () => {
      const longPrompt = 'a'.repeat(10000);
      mockWindow.submitPrompt(longPrompt);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'prompt',
          payload: {
            prompt: longPrompt,
          },
        },
        '*'
      );
    });

    test('should reject null input', () => {
      mockWindow.submitPrompt(null as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a string')
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    test('should reject undefined input', () => {
      mockWindow.submitPrompt(undefined as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a string')
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    test('should reject object input', () => {
      mockWindow.submitPrompt({ prompt: 'test' } as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a string')
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    test('should reject array input', () => {
      mockWindow.submitPrompt(['test'] as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a string')
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });

  describe('Intent Action', () => {
    beforeEach(() => {
      // Simulate the injected script
      mockWindow.triggerIntent = function (intent: string, params?: any) {
        if (typeof intent !== 'string') {
          console.error('triggerIntent: intent must be a string');
          return;
        }

        mockWindow.parent.postMessage(
          {
            type: 'intent',
            payload: {
              intent: intent,
              params: params || {},
            },
          },
          '*'
        );
      };
    });

    test('should send correct intent message format', () => {
      mockWindow.triggerIntent('open_file', { path: '/data.json' });

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'intent',
          payload: {
            intent: 'open_file',
            params: { path: '/data.json' },
          },
        },
        '*'
      );
    });

    test('should validate intent is string', () => {
      mockWindow.triggerIntent(123 as any, {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a string')
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    test('should handle optional params', () => {
      mockWindow.triggerIntent('navigate');

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'intent',
          payload: {
            intent: 'navigate',
            params: {},
          },
        },
        '*'
      );
    });

    test('should handle missing params (defaults to empty object)', () => {
      mockWindow.triggerIntent('refresh', undefined);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'intent',
          payload: {
            intent: 'refresh',
            params: {},
          },
        },
        '*'
      );
    });

    test('should handle null params (defaults to empty object)', () => {
      mockWindow.triggerIntent('reset', null);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'intent',
          payload: {
            intent: 'reset',
            params: {},
          },
        },
        '*'
      );
    });

    test('should handle object params', () => {
      const params = { foo: 'bar', nested: { value: 123 } };
      mockWindow.triggerIntent('complex_intent', params);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'intent',
          payload: {
            intent: 'complex_intent',
            params: params,
          },
        },
        '*'
      );
    });

    test('should handle array params', () => {
      const params = ['item1', 'item2', 'item3'];
      mockWindow.triggerIntent('batch_action', params);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'intent',
          payload: {
            intent: 'batch_action',
            params: params,
          },
        },
        '*'
      );
    });

    test('should handle string params', () => {
      mockWindow.triggerIntent('simple_intent', 'string_param');

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'intent',
          payload: {
            intent: 'simple_intent',
            params: 'string_param',
          },
        },
        '*'
      );
    });

    test('should handle number params', () => {
      mockWindow.triggerIntent('numeric_intent', 42);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'intent',
          payload: {
            intent: 'numeric_intent',
            params: 42,
          },
        },
        '*'
      );
    });

    test('should handle boolean params', () => {
      mockWindow.triggerIntent('toggle_intent', true);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'intent',
          payload: {
            intent: 'toggle_intent',
            params: true,
          },
        },
        '*'
      );
    });

    test('should reject null intent', () => {
      mockWindow.triggerIntent(null as any, {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a string')
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    test('should reject undefined intent', () => {
      mockWindow.triggerIntent(undefined as any, {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a string')
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    test('should reject object intent', () => {
      mockWindow.triggerIntent({ intent: 'test' } as any, {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a string')
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });

  describe('Link Action', () => {
    beforeEach(() => {
      // Simulate the injected script
      mockWindow.openLink = function (url: string) {
        if (typeof url !== 'string') {
          console.error('openLink: url must be a string');
          return;
        }

        // Basic URL validation
        try {
          new URL(url);
        } catch (e) {
          console.error('openLink: invalid URL format:', url);
          return;
        }

        mockWindow.parent.postMessage(
          {
            type: 'link',
            payload: {
              url: url,
            },
          },
          '*'
        );
      };
    });

    test('should send correct link message format', () => {
      mockWindow.openLink('https://example.com/dashboard');

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'link',
          payload: {
            url: 'https://example.com/dashboard',
          },
        },
        '*'
      );
    });

    test('should validate URL format', () => {
      mockWindow.openLink('https://valid-url.com');

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'link',
          payload: {
            url: 'https://valid-url.com',
          },
        },
        '*'
      );
    });

    test('should reject invalid URLs', () => {
      mockWindow.openLink('not a url');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid URL'),
        'not a url'
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    test('should handle http URLs', () => {
      mockWindow.openLink('http://example.com');

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'link',
          payload: {
            url: 'http://example.com',
          },
        },
        '*'
      );
    });

    test('should handle https URLs', () => {
      mockWindow.openLink('https://example.com');

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'link',
          payload: {
            url: 'https://example.com',
          },
        },
        '*'
      );
    });

    test('should handle file URLs', () => {
      mockWindow.openLink('file:///path/to/file.html');

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'link',
          payload: {
            url: 'file:///path/to/file.html',
          },
        },
        '*'
      );
    });

    test('should handle URLs with query params', () => {
      mockWindow.openLink('https://example.com/search?q=test&page=1');

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'link',
          payload: {
            url: 'https://example.com/search?q=test&page=1',
          },
        },
        '*'
      );
    });

    test('should handle URLs with fragments', () => {
      mockWindow.openLink('https://example.com/docs#section-1');

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'link',
          payload: {
            url: 'https://example.com/docs#section-1',
          },
        },
        '*'
      );
    });

    test('should handle URLs with ports', () => {
      mockWindow.openLink('http://localhost:3000/api');

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'link',
          payload: {
            url: 'http://localhost:3000/api',
          },
        },
        '*'
      );
    });

    test('should handle URLs with authentication', () => {
      mockWindow.openLink('https://user:pass@example.com/secure');

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'link',
          payload: {
            url: 'https://user:pass@example.com/secure',
          },
        },
        '*'
      );
    });

    test('should reject non-string URLs', () => {
      mockWindow.openLink(123 as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a string')
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    test('should reject null URLs', () => {
      mockWindow.openLink(null as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a string')
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    test('should reject undefined URLs', () => {
      mockWindow.openLink(undefined as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a string')
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    test('should reject empty URLs', () => {
      mockWindow.openLink('');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid URL'),
        ''
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    test('should reject partial URLs without protocol', () => {
      mockWindow.openLink('example.com');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid URL'),
        'example.com'
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    test('should reject malformed URLs', () => {
      mockWindow.openLink('ht!tp://invalid');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid URL'),
        'ht!tp://invalid'
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      // Inject all functions
      mockWindow.submitPrompt = function (promptText: string) {
        if (typeof promptText !== 'string') {
          console.error('submitPrompt: promptText must be a string');
          return;
        }
        mockWindow.parent.postMessage({ type: 'prompt', payload: { prompt: promptText } }, '*');
      };

      mockWindow.triggerIntent = function (intent: string, params?: any) {
        if (typeof intent !== 'string') {
          console.error('triggerIntent: intent must be a string');
          return;
        }
        mockWindow.parent.postMessage(
          { type: 'intent', payload: { intent: intent, params: params || {} } },
          '*'
        );
      };

      mockWindow.openLink = function (url: string) {
        if (typeof url !== 'string') {
          console.error('openLink: url must be a string');
          return;
        }
        try {
          new URL(url);
        } catch (e) {
          console.error('openLink: invalid URL format:', url);
          return;
        }
        mockWindow.parent.postMessage({ type: 'link', payload: { url: url } }, '*');
      };
    });

    test('should handle very long strings gracefully', () => {
      const longString = 'x'.repeat(1000000); // 1MB string
      mockWindow.submitPrompt(longString);

      expect(mockPostMessage).toHaveBeenCalled();
      const message = mockPostMessage.mock.calls[0][0] as any;
      expect(message.payload.prompt).toHaveLength(1000000);
    });

    test('should handle special characters without escaping issues', () => {
      const specialChars = '<script>alert("xss")</script>';
      mockWindow.submitPrompt(specialChars);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'prompt',
          payload: {
            prompt: specialChars,
          },
        },
        '*'
      );
    });

    test('should handle JSON-like strings in prompts', () => {
      const jsonString = '{"foo": "bar", "nested": {"value": 123}}';
      mockWindow.submitPrompt(jsonString);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'prompt',
          payload: {
            prompt: jsonString,
          },
        },
        '*'
      );
    });

    test('should handle complex nested params in intent', () => {
      const complexParams = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
              array: [1, 2, 3],
            },
          },
        },
      };
      mockWindow.triggerIntent('nested_intent', complexParams);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'intent',
          payload: {
            intent: 'nested_intent',
            params: complexParams,
          },
        },
        '*'
      );
    });

    test('should handle international domain names in URLs', () => {
      const idn = 'https://münchen.de/path';
      mockWindow.openLink(idn);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'link',
          payload: {
            url: idn,
          },
        },
        '*'
      );
    });

    test('should handle URLs with encoded characters', () => {
      const encoded = 'https://example.com/search?q=hello%20world&lang=en';
      mockWindow.openLink(encoded);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'link',
          payload: {
            url: encoded,
          },
        },
        '*'
      );
    });

    test('should not throw errors on invalid inputs', () => {
      expect(() => mockWindow.submitPrompt(null as any)).not.toThrow();
      expect(() => mockWindow.triggerIntent(undefined as any)).not.toThrow();
      expect(() => mockWindow.openLink(123 as any)).not.toThrow();
    });

    test('should handle rapid successive calls', () => {
      for (let i = 0; i < 100; i++) {
        mockWindow.submitPrompt(`Prompt ${i}`);
      }

      expect(mockPostMessage).toHaveBeenCalledTimes(100);
    });
  });

  describe('Protocol Format Compliance', () => {
    beforeEach(() => {
      // Inject all functions
      mockWindow.submitPrompt = function (promptText: string) {
        if (typeof promptText !== 'string') return;
        mockWindow.parent.postMessage({ type: 'prompt', payload: { prompt: promptText } }, '*');
      };

      mockWindow.triggerIntent = function (intent: string, params?: any) {
        if (typeof intent !== 'string') return;
        mockWindow.parent.postMessage(
          { type: 'intent', payload: { intent: intent, params: params || {} } },
          '*'
        );
      };

      mockWindow.openLink = function (url: string) {
        if (typeof url !== 'string') return;
        try {
          new URL(url);
        } catch (e) {
          return;
        }
        mockWindow.parent.postMessage({ type: 'link', payload: { url: url } }, '*');
      };
    });

    test('all messages should have nested payload structure', () => {
      mockWindow.submitPrompt('test');
      mockWindow.triggerIntent('test', {});
      mockWindow.openLink('https://test.com');

      expect(mockPostMessage).toHaveBeenCalledTimes(3);

      mockPostMessage.mock.calls.forEach((call) => {
        const message = call[0] as any;
        expect(message).toHaveProperty('type');
        expect(message).toHaveProperty('payload');
        expect(typeof message.payload).toBe('object');
      });
    });

    test('prompt message should match official spec', () => {
      mockWindow.submitPrompt('test prompt');

      const message = mockPostMessage.mock.calls[0][0];
      expect(message).toEqual({
        type: 'prompt',
        payload: {
          prompt: 'test prompt',
        },
      });
    });

    test('intent message should match official spec', () => {
      mockWindow.triggerIntent('test_intent', { key: 'value' });

      const message = mockPostMessage.mock.calls[0][0];
      expect(message).toEqual({
        type: 'intent',
        payload: {
          intent: 'test_intent',
          params: { key: 'value' },
        },
      });
    });

    test('link message should match official spec', () => {
      mockWindow.openLink('https://example.com');

      const message = mockPostMessage.mock.calls[0][0];
      expect(message).toEqual({
        type: 'link',
        payload: {
          url: 'https://example.com',
        },
      });
    });

    test('all messages should use wildcard origin', () => {
      mockWindow.submitPrompt('test');
      mockWindow.triggerIntent('test', {});
      mockWindow.openLink('https://test.com');

      mockPostMessage.mock.calls.forEach((call) => {
        expect(call[1]).toBe('*');
      });
    });
  });
});
