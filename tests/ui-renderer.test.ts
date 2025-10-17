/**
 * Unit Tests for UI Client-Side Utilities and Rendering Logic
 *
 * Tests the client-side functions that support UI resource rendering.
 * These tests ensure that:
 * - Content type detection works correctly
 * - HTML extraction from resources works
 * - Origin validation for postMessage security works
 * - Sandbox attribute building works correctly
 * - Type guards work on the client side
 *
 * Note: These tests focus on utility functions rather than React components
 * since React Testing Library is not configured in this project. Component
 * tests would require additional setup with jsdom or similar.
 *
 * Test Strategy:
 * - Test actual behavior with real data
 * - Verify security functions are strict
 * - Test all supported MIME types
 * - Test edge cases and invalid inputs
 */

import { describe, test, expect } from '@jest/globals';
import {
  getContentType,
  isUIResource,
  getHTMLContent,
  validateOrigin,
  buildSandboxAttribute,
} from '../src/client/ui-utils.js';
import {
  getPreferredFrameSize,
  getInitialRenderData,
} from '../src/client/ui-types.js';
import type { UIResourceContent } from '../src/client/ui-types.js';

describe('Content Type Detection', () => {
  describe('getContentType', () => {
    test('returns rawHtml for text/html MIME type', () => {
      expect(getContentType('text/html')).toBe('rawHtml');
    });

    test('returns externalUrl for text/uri-list MIME type', () => {
      expect(getContentType('text/uri-list')).toBe('externalUrl');
    });

    test('returns remoteDom for Remote DOM MIME type', () => {
      expect(getContentType('application/vnd.mcp-ui.remote-dom+javascript')).toBe(
        'remoteDom'
      );
    });

    test('returns remoteDom for Remote DOM with version', () => {
      expect(
        getContentType('application/vnd.mcp-ui.remote-dom+javascript;version=2')
      ).toBe('remoteDom');
    });

    test('returns null for unsupported MIME types', () => {
      expect(getContentType('application/json')).toBeNull();
      expect(getContentType('text/plain')).toBeNull();
      expect(getContentType('image/png')).toBeNull();
      expect(getContentType('video/mp4')).toBeNull();
    });

    test('returns null for empty string', () => {
      expect(getContentType('')).toBeNull();
    });

    test('is case-sensitive for MIME types', () => {
      // MIME types should be lowercase
      expect(getContentType('TEXT/HTML')).toBeNull();
      expect(getContentType('Text/Html')).toBeNull();
    });
  });
});

describe('Client-Side Type Guard', () => {
  describe('isUIResource (client)', () => {
    test('returns true for valid text/html resource', () => {
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        text: '<div>Test</div>',
      };
      expect(isUIResource(resource)).toBe(true);
    });

    test('returns true for text/uri-list resource', () => {
      const resource: UIResourceContent = {
        uri: 'ui://external',
        mimeType: 'text/uri-list',
        text: 'https://example.com',
      };
      expect(isUIResource(resource)).toBe(true);
    });

    test('returns true for Remote DOM resource', () => {
      const resource: UIResourceContent = {
        uri: 'ui://remote',
        mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
        text: 'code',
      };
      expect(isUIResource(resource)).toBe(true);
    });

    test('returns false for null', () => {
      expect(isUIResource(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isUIResource(undefined)).toBe(false);
    });

    test('returns false for object with invalid MIME type', () => {
      const resource = {
        uri: 'ui://test',
        mimeType: 'application/json',
        text: '{}',
      };
      expect(isUIResource(resource)).toBe(false);
    });

    test('returns false for object missing uri', () => {
      const resource = {
        mimeType: 'text/html',
        text: '<div>Test</div>',
      };
      expect(isUIResource(resource as any)).toBe(false);
    });

    test('returns false for object missing mimeType', () => {
      const resource = {
        uri: 'ui://test',
        text: '<div>Test</div>',
      };
      expect(isUIResource(resource as any)).toBe(false);
    });

    test('returns false for empty object', () => {
      expect(isUIResource({})).toBe(false);
    });

    test('returns false for string', () => {
      expect(isUIResource('not a resource')).toBe(false);
    });

    test('returns false for number', () => {
      expect(isUIResource(123)).toBe(false);
    });
  });
});

describe('HTML Content Extraction', () => {
  describe('getHTMLContent', () => {
    test('extracts HTML from text field', () => {
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        text: '<div>Hello World</div>',
      };
      expect(getHTMLContent(resource)).toBe('<div>Hello World</div>');
    });

    test('prefers text over blob when both present', () => {
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        text: '<div>From text</div>',
        blob: btoa('<div>From blob</div>'),
      };
      expect(getHTMLContent(resource)).toBe('<div>From text</div>');
    });

    test('decodes base64 blob when text not present', () => {
      const html = '<div>Hello from blob</div>';
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        blob: btoa(html),
      };
      expect(getHTMLContent(resource)).toBe(html);
    });

    test('returns empty string when neither text nor blob present', () => {
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
      };
      expect(getHTMLContent(resource)).toBe('');
    });

    test('handles empty text field', () => {
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        text: '',
      };
      expect(getHTMLContent(resource)).toBe('');
    });

    test('returns empty string for invalid base64 blob', () => {
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        blob: 'not-valid-base64!!!',
      };
      // Should return empty string and log error (error logged to console)
      const result = getHTMLContent(resource);
      expect(result).toBe('');
    });

    test('handles multi-line HTML in text field', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>Content</p>
        </div>
      `;
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        text: html,
      };
      expect(getHTMLContent(resource)).toBe(html);
    });

    test('handles unicode characters in text field', () => {
      const html = '<div>Hello 世界 🌍</div>';
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        text: html,
      };
      expect(getHTMLContent(resource)).toBe(html);
    });

    test('decodes blob with special characters', () => {
      const html = '<div>Test &amp; "quotes"</div>';
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        blob: btoa(html),
      };
      expect(getHTMLContent(resource)).toBe(html);
    });
  });
});

describe('Origin Validation for Security', () => {
  describe('validateOrigin', () => {
    test('accepts null origin (srcdoc iframes)', () => {
      // srcdoc iframes have null origin - this is safe
      expect(validateOrigin('null')).toBe(true);
    });

    test('accepts HTTPS origins', () => {
      expect(validateOrigin('https://example.com')).toBe(true);
      expect(validateOrigin('https://subdomain.example.com')).toBe(true);
      expect(validateOrigin('https://example.com:443')).toBe(true);
    });

    test('accepts localhost HTTP origins', () => {
      expect(validateOrigin('http://localhost')).toBe(true);
      expect(validateOrigin('http://localhost:3000')).toBe(true);
      expect(validateOrigin('http://127.0.0.1')).toBe(true);
      expect(validateOrigin('http://127.0.0.1:8080')).toBe(true);
    });

    test('rejects non-localhost HTTP origins', () => {
      expect(validateOrigin('http://example.com')).toBe(false);
      expect(validateOrigin('http://192.168.1.1')).toBe(false);
      expect(validateOrigin('http://10.0.0.1')).toBe(false);
    });

    test('rejects other protocols', () => {
      expect(validateOrigin('file:///path/to/file')).toBe(false);
      expect(validateOrigin('ftp://server.com')).toBe(false);
      expect(validateOrigin('ws://websocket.com')).toBe(false);
      expect(validateOrigin('wss://websocket.com')).toBe(false);
    });

    test('rejects invalid URLs', () => {
      expect(validateOrigin('not a url')).toBe(false);
      expect(validateOrigin('javascript:alert(1)')).toBe(false);
      expect(validateOrigin('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    test('rejects empty string', () => {
      expect(validateOrigin('')).toBe(false);
    });

    test('is case-sensitive for null origin', () => {
      expect(validateOrigin('null')).toBe(true);
      expect(validateOrigin('NULL')).toBe(false);
      expect(validateOrigin('Null')).toBe(false);
    });

    test('handles URLs with paths', () => {
      expect(validateOrigin('https://example.com/path')).toBe(true);
      expect(validateOrigin('http://localhost/path')).toBe(true);
    });

    test('handles URLs with query strings', () => {
      expect(validateOrigin('https://example.com?query=value')).toBe(true);
      expect(validateOrigin('http://localhost?query=value')).toBe(true);
    });

    test('handles URLs with fragments', () => {
      expect(validateOrigin('https://example.com#fragment')).toBe(true);
      expect(validateOrigin('http://localhost#fragment')).toBe(true);
    });
  });
});

describe('Sandbox Attribute Building', () => {
  describe('buildSandboxAttribute', () => {
    test('returns allow-scripts for inline HTML', () => {
      const sandbox = buildSandboxAttribute(false);
      expect(sandbox).toBe('allow-scripts');
    });

    test('returns allow-scripts allow-same-origin for external URLs', () => {
      const sandbox = buildSandboxAttribute(true);
      expect(sandbox).toBe('allow-scripts allow-same-origin');
    });

    test('returns custom permissions when provided for inline HTML', () => {
      const custom = 'allow-scripts allow-forms';
      const sandbox = buildSandboxAttribute(false, custom);
      expect(sandbox).toBe(custom);
    });

    test('returns custom permissions when provided for external URLs', () => {
      const custom = 'allow-scripts allow-popups';
      const sandbox = buildSandboxAttribute(true, custom);
      expect(sandbox).toBe(custom);
    });

    test('custom permissions override isExternalUrl flag', () => {
      const custom = 'allow-scripts';
      expect(buildSandboxAttribute(true, custom)).toBe(custom);
      expect(buildSandboxAttribute(false, custom)).toBe(custom);
    });

    test('empty string custom permissions defaults to standard sandbox', () => {
      // Empty string is falsy, so default sandbox is applied
      const sandbox = buildSandboxAttribute(false, '');
      expect(sandbox).toBe('allow-scripts');
    });

    test('does not add allow-same-origin for inline HTML by default', () => {
      // SECURITY: inline HTML should NEVER have allow-same-origin
      const sandbox = buildSandboxAttribute(false);
      expect(sandbox).not.toContain('allow-same-origin');
    });

    test('includes allow-same-origin for external URLs', () => {
      // External URLs need same-origin for XHR/fetch to their own domain
      const sandbox = buildSandboxAttribute(true);
      expect(sandbox).toContain('allow-same-origin');
    });

    test('does not include dangerous permissions by default', () => {
      const inlineSandbox = buildSandboxAttribute(false);
      const externalSandbox = buildSandboxAttribute(true);

      // These should never be in default sandbox
      expect(inlineSandbox).not.toContain('allow-top-navigation');
      expect(inlineSandbox).not.toContain('allow-popups');
      expect(inlineSandbox).not.toContain('allow-forms');
      expect(inlineSandbox).not.toContain('allow-modals');

      expect(externalSandbox).not.toContain('allow-top-navigation');
      expect(externalSandbox).not.toContain('allow-popups');
      expect(externalSandbox).not.toContain('allow-forms');
      expect(externalSandbox).not.toContain('allow-modals');
    });
  });
});

describe('Metadata Helpers', () => {
  describe('getPreferredFrameSize', () => {
    test('extracts frame size from metadata', () => {
      const meta = {
        'mcpui.dev/ui-preferred-frame-size': { width: 800, height: 600 },
      };
      const size = getPreferredFrameSize(meta);
      expect(size).toEqual({ width: 800, height: 600 });
    });

    test('returns null when metadata not present', () => {
      expect(getPreferredFrameSize(undefined)).toBeNull();
      expect(getPreferredFrameSize(null as any)).toBeNull();
    });

    test('returns null when frame size key not present', () => {
      const meta = {
        'other-key': 'value',
      };
      expect(getPreferredFrameSize(meta)).toBeNull();
    });

    test('handles partial frame size (width only)', () => {
      const meta = {
        'mcpui.dev/ui-preferred-frame-size': { width: 800 },
      };
      const size = getPreferredFrameSize(meta);
      expect(size).toEqual({ width: 800 });
      expect(size?.height).toBeUndefined();
    });

    test('handles partial frame size (height only)', () => {
      const meta = {
        'mcpui.dev/ui-preferred-frame-size': { height: 600 },
      };
      const size = getPreferredFrameSize(meta);
      expect(size).toEqual({ height: 600 });
      expect(size?.width).toBeUndefined();
    });

    test('returns null for invalid frame size value', () => {
      const meta = {
        'mcpui.dev/ui-preferred-frame-size': 'not an object',
      };
      expect(getPreferredFrameSize(meta)).toBeNull();
    });

    test('returns null for null frame size value', () => {
      const meta = {
        'mcpui.dev/ui-preferred-frame-size': null,
      };
      expect(getPreferredFrameSize(meta)).toBeNull();
    });

    test('returns null for empty object metadata', () => {
      expect(getPreferredFrameSize({})).toBeNull();
    });
  });

  describe('getInitialRenderData', () => {
    test('extracts initial data from metadata', () => {
      const meta = {
        'mcpui.dev/ui-initial-render-data': { userId: '123', theme: 'dark' },
      };
      const data = getInitialRenderData(meta);
      expect(data).toEqual({ userId: '123', theme: 'dark' });
    });

    test('returns null when metadata not present', () => {
      expect(getInitialRenderData(undefined)).toBeNull();
      expect(getInitialRenderData(null as any)).toBeNull();
    });

    test('returns null when initial data key not present', () => {
      const meta = {
        'other-key': 'value',
      };
      expect(getInitialRenderData(meta)).toBeNull();
    });

    test('handles empty initial data object', () => {
      const meta = {
        'mcpui.dev/ui-initial-render-data': {},
      };
      const data = getInitialRenderData(meta);
      expect(data).toEqual({});
    });

    test('handles nested data structures', () => {
      const meta = {
        'mcpui.dev/ui-initial-render-data': {
          user: {
            id: '123',
            name: 'Alice',
            preferences: {
              theme: 'dark',
            },
          },
        },
      };
      const data = getInitialRenderData(meta);
      expect(data?.user?.id).toBe('123');
      expect(data?.user?.preferences?.theme).toBe('dark');
    });

    test('returns null for invalid initial data value', () => {
      const meta = {
        'mcpui.dev/ui-initial-render-data': 'not an object',
      };
      expect(getInitialRenderData(meta)).toBeNull();
    });

    test('returns null for null initial data value', () => {
      const meta = {
        'mcpui.dev/ui-initial-render-data': null,
      };
      expect(getInitialRenderData(meta)).toBeNull();
    });

    test('handles data with various types', () => {
      const meta = {
        'mcpui.dev/ui-initial-render-data': {
          string: 'value',
          number: 42,
          boolean: true,
          array: [1, 2, 3],
          null: null,
        },
      };
      const data = getInitialRenderData(meta);
      expect(data).toEqual({
        string: 'value',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        null: null,
      });
    });

    test('returns null for empty object metadata', () => {
      expect(getInitialRenderData({})).toBeNull();
    });
  });
});

describe('Edge Cases and Security', () => {
  test('sandbox attribute never includes allow-top-navigation without custom override', () => {
    const inline = buildSandboxAttribute(false);
    const external = buildSandboxAttribute(true);

    expect(inline).not.toContain('allow-top-navigation');
    expect(external).not.toContain('allow-top-navigation');
  });

  test('validateOrigin is strict about protocol', () => {
    // Only HTTPS (or localhost HTTP) should be accepted
    expect(validateOrigin('https://trusted.com')).toBe(true);
    expect(validateOrigin('http://trusted.com')).toBe(false);
  });

  test('getHTMLContent does not execute JavaScript', () => {
    // This test ensures getHTMLContent just returns strings, doesn't execute
    const malicious = '<script>alert("XSS")</script>';
    const resource: UIResourceContent = {
      uri: 'ui://test',
      mimeType: 'text/html',
      text: malicious,
    };

    const result = getHTMLContent(resource);
    expect(result).toBe(malicious); // Just returned as string, not executed
  });

  test('isUIResource does not validate URI format', () => {
    // Client-side type guard doesn't validate UI:// prefix
    // That's a server-side concern
    const resource: UIResourceContent = {
      uri: 'http://not-a-ui-resource',
      mimeType: 'text/html',
      text: '<div>Test</div>',
    };
    expect(isUIResource(resource)).toBe(true); // Client trusts server
  });

  test('content type detection handles malformed MIME types gracefully', () => {
    expect(getContentType('text/')).toBeNull();
    expect(getContentType('/html')).toBeNull();
    expect(getContentType('texthtml')).toBeNull();
  });
});
