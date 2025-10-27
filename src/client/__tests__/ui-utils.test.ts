/**
 * Tests for UI Utility Functions
 *
 * Comprehensive tests for client-side UI utilities including
 * content type detection, validation, and security functions.
 */

import { describe, it, expect } from '@jest/globals';
import {
  getContentType,
  isUIResource,
  getHTMLContent,
  validateOrigin,
  buildSandboxAttribute,
} from '../ui-utils.js';
import type { UIResourceContent } from '../ui-types.js';

describe('UI Utilities', () => {
  describe('getContentType', () => {
    it('should identify text/html as rawHtml', () => {
      expect(getContentType('text/html')).toBe('rawHtml');
    });

    it('should identify text/uri-list as externalUrl', () => {
      expect(getContentType('text/uri-list')).toBe('externalUrl');
    });

    it('should identify Remote DOM MIME types', () => {
      expect(
        getContentType('application/vnd.mcp-ui.remote-dom+javascript')
      ).toBe('remoteDom');
      expect(getContentType('application/vnd.mcp-ui.remote-dom+json')).toBe(
        'remoteDom'
      );
    });

    it('should return null for unsupported MIME types', () => {
      expect(getContentType('application/json')).toBeNull();
      expect(getContentType('text/plain')).toBeNull();
      expect(getContentType('image/png')).toBeNull();
    });
  });

  describe('isUIResource', () => {
    it('should validate valid UI resources', () => {
      const validResource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        text: '<div>Hello</div>',
      };

      expect(isUIResource(validResource)).toBe(true);
    });

    it('should reject resources without uri', () => {
      const invalidResource = {
        mimeType: 'text/html',
        text: '<div>Hello</div>',
      };

      expect(isUIResource(invalidResource)).toBe(false);
    });

    it('should reject resources without mimeType', () => {
      const invalidResource = {
        uri: 'ui://test',
        text: '<div>Hello</div>',
      };

      expect(isUIResource(invalidResource)).toBe(false);
    });

    it('should reject resources with unsupported MIME types', () => {
      const invalidResource = {
        uri: 'ui://test',
        mimeType: 'application/json',
        text: '{"hello": "world"}',
      };

      expect(isUIResource(invalidResource)).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(isUIResource(null)).toBe(false);
      expect(isUIResource(undefined)).toBe(false);
    });

    it('should reject non-objects', () => {
      expect(isUIResource('string')).toBe(false);
      expect(isUIResource(123)).toBe(false);
      expect(isUIResource(true)).toBe(false);
    });
  });

  describe('getHTMLContent', () => {
    it('should extract HTML from text field', () => {
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        text: '<div>Hello World</div>',
      };

      expect(getHTMLContent(resource)).toBe('<div>Hello World</div>');
    });

    it('should decode HTML from blob field', () => {
      const html = '<div>Hello World</div>';
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        blob: btoa(html),
      };

      expect(getHTMLContent(resource)).toBe(html);
    });

    it('should prefer text over blob', () => {
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        text: '<div>From text</div>',
        blob: btoa('<div>From blob</div>'),
      };

      expect(getHTMLContent(resource)).toBe('<div>From text</div>');
    });

    it('should return empty string if no content', () => {
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
      };

      expect(getHTMLContent(resource)).toBe('');
    });

    it('should return empty string on blob decode error', () => {
      const resource: UIResourceContent = {
        uri: 'ui://test',
        mimeType: 'text/html',
        blob: 'invalid-base64!!!',
      };

      expect(getHTMLContent(resource)).toBe('');
    });
  });

  describe('validateOrigin', () => {
    it('should accept null origin (srcdoc iframes)', () => {
      expect(validateOrigin('null')).toBe(true);
    });

    it('should accept HTTPS origins', () => {
      expect(validateOrigin('https://example.com')).toBe(true);
      expect(validateOrigin('https://subdomain.example.com')).toBe(true);
      expect(validateOrigin('https://example.com:443')).toBe(true);
    });

    it('should accept localhost HTTP in development', () => {
      expect(validateOrigin('http://localhost')).toBe(true);
      expect(validateOrigin('http://localhost:3000')).toBe(true);
      expect(validateOrigin('http://127.0.0.1')).toBe(true);
      expect(validateOrigin('http://127.0.0.1:8080')).toBe(true);
    });

    it('should reject HTTP origins (non-localhost)', () => {
      expect(validateOrigin('http://example.com')).toBe(false);
      expect(validateOrigin('http://192.168.1.1')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(validateOrigin('not-a-url')).toBe(false);
      expect(validateOrigin('javascript:alert(1)')).toBe(false);
      expect(validateOrigin('data:text/html,<script>alert(1)</script>')).toBe(
        false
      );
    });

    it('should reject file:// protocol', () => {
      expect(validateOrigin('file:///etc/passwd')).toBe(false);
    });

    it('should reject ftp:// protocol', () => {
      expect(validateOrigin('ftp://example.com')).toBe(false);
    });
  });

  describe('buildSandboxAttribute', () => {
    it('should return minimal permissions for inline HTML', () => {
      expect(buildSandboxAttribute(false)).toBe('allow-scripts');
    });

    it('should return extended permissions for external URLs', () => {
      expect(buildSandboxAttribute(true)).toBe(
        'allow-scripts allow-same-origin'
      );
    });

    it('should use custom permissions when provided', () => {
      expect(
        buildSandboxAttribute(false, 'allow-scripts allow-forms')
      ).toBe('allow-scripts allow-forms');
      expect(
        buildSandboxAttribute(true, 'allow-scripts allow-popups')
      ).toBe('allow-scripts allow-popups');
    });

    it('should not include dangerous permissions by default', () => {
      const inlineSandbox = buildSandboxAttribute(false);
      const externalSandbox = buildSandboxAttribute(true);

      // These should never be in default sandbox
      expect(inlineSandbox).not.toContain('allow-top-navigation');
      expect(inlineSandbox).not.toContain('allow-popups');
      expect(inlineSandbox).not.toContain('allow-forms');
      expect(externalSandbox).not.toContain('allow-top-navigation');
      expect(externalSandbox).not.toContain('allow-popups');
      expect(externalSandbox).not.toContain('allow-forms');
    });

    it('should not allow same-origin for inline HTML', () => {
      const inlineSandbox = buildSandboxAttribute(false);
      expect(inlineSandbox).not.toContain('allow-same-origin');
    });
  });
});
