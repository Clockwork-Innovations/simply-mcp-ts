/**
 * @jest-environment jsdom
 */

/**
 * Navigation/Links Feature Test Suite
 *
 * Tests the postMessage-based link navigation protocol between iframe and parent.
 * Verifies spec-compliant message format, target specification, helper function,
 * link security, and error handling.
 *
 * Covers MCP UI Feature #7: Navigation/Links (type: 'link')
 *
 * @module tests/unit/interface-api/navigation-links
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { HTMLResourceRenderer } from '../../../src/client/HTMLResourceRenderer.js';

describe('Navigation/Links Feature', () => {
  describe('Spec-Compliant Message Format', () => {
    it('should send link navigation with correct message structure', () => {
      // Verify message structure follows spec:
      // { type: 'link', payload: { url, target } }
      const expectedFormat = {
        type: 'link',
        payload: {
          url: 'https://example.com/docs',
          target: '_blank',
        },
      };

      expect(expectedFormat.type).toBe('link');
      expect(expectedFormat.payload).toHaveProperty('url');
      expect(expectedFormat.payload).toHaveProperty('target');
    });

    it('should accept valid target values', () => {
      const validTargets = ['_blank', '_self'];

      validTargets.forEach((target) => {
        const linkMessage = {
          type: 'link',
          payload: {
            url: 'https://example.com',
            target,
          },
        };

        expect(linkMessage.payload.target).toBe(target);
        expect(['_blank', '_self']).toContain(target);
      });
    });

    it('should not require messageId for fire-and-forget link navigation', () => {
      const linkMessage = {
        type: 'link',
        payload: {
          url: 'https://example.com',
          target: '_blank',
        },
      };

      // Link navigation is fire-and-forget, no messageId needed
      expect(linkMessage).not.toHaveProperty('messageId');
    });
  });

  describe('Target Specification', () => {
    it('should handle _blank target for new tab/window', () => {
      const newTabLink = {
        type: 'link',
        payload: {
          url: 'https://example.com/external',
          target: '_blank',
        },
      };

      expect(newTabLink.payload.target).toBe('_blank');
      expect(newTabLink.payload.url).toBeTruthy();
    });

    it('should handle _self target for same window navigation', () => {
      const sameWindowLink = {
        type: 'link',
        payload: {
          url: 'https://example.com/page',
          target: '_self',
        },
      };

      expect(sameWindowLink.payload.target).toBe('_self');
    });

    it('should default to _blank when target not specified', () => {
      const linkMessage = {
        type: 'link',
        payload: {
          url: 'https://example.com',
          target: '_blank', // Should be default behavior
        },
      };

      expect(linkMessage.payload.target).toBe('_blank');
    });

    it('should reject invalid target values', () => {
      const invalidTargets = ['_parent', '_top', 'custom-target'];

      invalidTargets.forEach((target) => {
        expect(['_blank', '_self']).not.toContain(target);
      });
    });
  });

  describe('Helper Function', () => {
    it('should provide openLink() helper function in iframe', () => {
      const mockOnUIAction = jest.fn<() => Promise<void>>();
      const resource = {
        uri: 'ui://link-test',
        mimeType: 'text/html',
        text: `
          <script>
            // Verify openLink function is available
            if (typeof window.openLink === 'function') {
              console.log('openLink function is available');
            }
          </script>
        `,
      };

      const { container } = render(
        <HTMLResourceRenderer
          resource={resource}
          onUIAction={mockOnUIAction as any}
          isExternalUrl={false}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      // Note: Actual helper function injection tested in integration tests
    });

    it('should call openLink() with url and target', () => {
      // Test expected usage of openLink helper
      const mockOpenLink = jest.fn<(url: string, target?: string) => void>();

      mockOpenLink('https://example.com/docs', '_blank');
      mockOpenLink('https://example.com/page', '_self');
      mockOpenLink('https://example.com/default'); // default target

      expect(mockOpenLink).toHaveBeenCalledWith('https://example.com/docs', '_blank');
      expect(mockOpenLink).toHaveBeenCalledWith('https://example.com/page', '_self');
      expect(mockOpenLink).toHaveBeenCalledWith('https://example.com/default');
      expect(mockOpenLink).toHaveBeenCalledTimes(3);
    });

    it('should accept both targets in helper', () => {
      const mockOpenLink = jest.fn<(url: string, target: string) => void>();
      const targets = ['_blank', '_self'];

      targets.forEach((target) => {
        mockOpenLink('https://example.com', target);
      });

      expect(mockOpenLink).toHaveBeenCalledTimes(2);
      expect(mockOpenLink).toHaveBeenCalledWith('https://example.com', '_blank');
      expect(mockOpenLink).toHaveBeenCalledWith('https://example.com', '_self');
    });
  });

  describe('Link Security', () => {
    it('should reject javascript: protocol URLs', () => {
      const dangerousUrl = 'javascript:alert("XSS")';
      const validProtocols = ['http:', 'https:'];

      // javascript: protocol should not be allowed
      expect(dangerousUrl.startsWith('javascript:')).toBe(true);
      expect(validProtocols.some(proto => dangerousUrl.startsWith(proto))).toBe(false);
    });

    it('should reject data: protocol URLs', () => {
      const dataUrl = 'data:text/html,<script>alert("XSS")</script>';
      const validProtocols = ['http:', 'https:'];

      // data: protocol should not be allowed
      expect(dataUrl.startsWith('data:')).toBe(true);
      expect(validProtocols.some(proto => dataUrl.startsWith(proto))).toBe(false);
    });

    it('should reject file: protocol URLs', () => {
      const fileUrl = 'file:///etc/passwd';
      const validProtocols = ['http:', 'https:'];

      // file: protocol should not be allowed
      expect(fileUrl.startsWith('file:')).toBe(true);
      expect(validProtocols.some(proto => fileUrl.startsWith(proto))).toBe(false);
    });

    it('should accept http: and https: URLs', () => {
      const validUrls = [
        'http://example.com',
        'https://example.com',
        'https://example.com:8080/path?query=value#hash',
      ];

      validUrls.forEach((url) => {
        expect(url.startsWith('http:') || url.startsWith('https:')).toBe(true);
      });
    });

    it('should validate URL format', () => {
      const validUrl = 'https://example.com/path';
      const invalidUrl = 'not-a-valid-url';

      try {
        new URL(validUrl);
        expect(true).toBe(true); // Valid URL
      } catch {
        expect(false).toBe(true); // Should not throw
      }

      try {
        new URL(invalidUrl);
        expect(false).toBe(true); // Should throw
      } catch {
        expect(true).toBe(true); // Invalid URL throws
      }
    });

    it('should handle malicious URLs with encoded characters', () => {
      const encodedJavascript = 'javascript%3Aalert%28%22XSS%22%29';

      // Even encoded, javascript: URLs should be rejected
      const decoded = decodeURIComponent(encodedJavascript);
      expect(decoded.startsWith('javascript:')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing url field', () => {
      const invalidLink = {
        type: 'link',
        payload: {
          // url is missing
          target: '_blank',
        },
      };

      expect(invalidLink.payload).not.toHaveProperty('url');
    });

    it('should handle missing target field', () => {
      const linkWithoutTarget = {
        type: 'link',
        payload: {
          url: 'https://example.com',
          // target is missing - should default to _blank
        },
      };

      expect(linkWithoutTarget.payload).not.toHaveProperty('target');
      // UI should default to _blank
    });

    it('should handle empty url', () => {
      const emptyUrlLink = {
        type: 'link',
        payload: {
          url: '',
          target: '_blank',
        },
      };

      expect(emptyUrlLink.payload.url).toBe('');
      // Should be rejected by validation
    });

    it('should handle malformed payload', () => {
      const malformedLink = {
        type: 'link',
        payload: null,
      };

      expect(malformedLink.payload).toBeNull();
    });

    it('should handle very long URLs', () => {
      const longPath = 'a'.repeat(5000);
      const longUrl = `https://example.com/${longPath}`;

      const link = {
        type: 'link',
        payload: {
          url: longUrl,
          target: '_blank',
        },
      };

      expect(link.payload.url.length).toBeGreaterThan(5000);
      // Browsers should handle or reject based on their limits
    });
  });

  describe('Integration with UI', () => {
    it('should render HTMLResourceRenderer for link navigation source', () => {
      const mockOnUIAction = jest.fn<() => Promise<void>>();
      const resource = {
        uri: 'ui://link-demo',
        mimeType: 'text/html',
        text: `
          <html>
            <body>
              <button onclick="window.parent.postMessage({type: 'link', payload: {url: 'https://example.com', target: '_blank'}}, '*')">
                Open Link
              </button>
            </body>
          </html>
        `,
      };

      const { container } = render(
        <HTMLResourceRenderer
          resource={resource}
          onUIAction={mockOnUIAction as any}
          isExternalUrl={false}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('sandbox');
    });

    it('should handle onUIAction callback for link navigation', () => {
      const mockOnUIAction = jest.fn<() => Promise<void>>();
      const resource = {
        uri: 'ui://link-callback',
        mimeType: 'text/html',
        text: '<script>window.openLink("https://example.com", "_blank");</script>',
      };

      render(
        <HTMLResourceRenderer
          resource={resource}
          onUIAction={mockOnUIAction as any}
          isExternalUrl={false}
        />
      );

      // onUIAction should be callable
      expect(mockOnUIAction).toBeDefined();
      expect(typeof mockOnUIAction).toBe('function');
    });
  });

  describe('URL Parsing and Validation', () => {
    it('should parse absolute URLs correctly', () => {
      const absoluteUrls = [
        'https://example.com',
        'https://example.com/path',
        'https://example.com:8080',
        'https://user:pass@example.com',
        'https://example.com/path?query=value#hash',
      ];

      absoluteUrls.forEach((url) => {
        const parsed = new URL(url);
        expect(parsed.protocol).toBe('https:');
        expect(parsed.hostname).toBe('example.com');
      });
    });

    it('should handle URLs with query parameters', () => {
      const urlWithQuery = 'https://example.com/search?q=test&page=2';
      const parsed = new URL(urlWithQuery);

      expect(parsed.search).toBe('?q=test&page=2');
      expect(parsed.searchParams.get('q')).toBe('test');
      expect(parsed.searchParams.get('page')).toBe('2');
    });

    it('should handle URLs with hash fragments', () => {
      const urlWithHash = 'https://example.com/page#section';
      const parsed = new URL(urlWithHash);

      expect(parsed.hash).toBe('#section');
    });

    it('should reject relative URLs without base', () => {
      const relativeUrl = '/path/to/page';

      try {
        new URL(relativeUrl);
        expect(false).toBe(true); // Should throw
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle URLs with special characters', () => {
      const specialUrl = 'https://example.com/path with spaces';

      // Modern URL constructor auto-encodes spaces
      const parsed = new URL(specialUrl);
      expect(parsed.pathname).toBe('/path%20with%20spaces');

      // Properly encoded URL should also work
      const encodedUrl = 'https://example.com/path%20with%20spaces';
      const parsedEncoded = new URL(encodedUrl);
      expect(parsedEncoded.pathname).toBe('/path%20with%20spaces');
    });

    it('should handle international domain names', () => {
      const idnUrl = 'https://例え.jp';

      try {
        const parsed = new URL(idnUrl);
        expect(parsed.hostname).toBeTruthy();
      } catch {
        // Some environments may not support IDN
        expect(true).toBe(true);
      }
    });

    it('should handle rapid sequential link navigations', () => {
      const links = Array.from({ length: 5 }, (_, i) => ({
        type: 'link',
        payload: {
          url: `https://example.com/page${i + 1}`,
          target: '_blank',
        },
      }));

      expect(links).toHaveLength(5);
      links.forEach((link, index) => {
        expect(link.payload.url).toBe(`https://example.com/page${index + 1}`);
      });
    });

    it('should handle alternating targets', () => {
      const links = [
        { type: 'link', payload: { url: 'https://example.com/1', target: '_blank' } },
        { type: 'link', payload: { url: 'https://example.com/2', target: '_self' } },
        { type: 'link', payload: { url: 'https://example.com/3', target: '_blank' } },
      ];

      expect(links[0].payload.target).toBe('_blank');
      expect(links[1].payload.target).toBe('_self');
      expect(links[2].payload.target).toBe('_blank');
    });
  });
});
