/**
 * Unit Tests for UI Resource Server-Side Functions
 *
 * Tests the core functions in src/core/ui-resource.ts that create and validate
 * UI resources on the server side. These tests ensure that:
 * - createInlineHTMLResource() creates valid UIResource objects
 * - URI validation works correctly (ui:// prefix required)
 * - Metadata building functions properly
 * - Type guards work correctly
 * - Error cases are handled properly
 *
 * Test Strategy:
 * - Test actual behavior, not just function existence
 * - Verify all validation rules are enforced
 * - Test edge cases and error conditions
 * - Ensure metadata is built correctly with namespaced keys
 */

import { describe, test, expect } from '@jest/globals';
import {
  createInlineHTMLResource,
  createExternalURLResource,
  isUIResource,
} from '../src/features/ui/ui-resource.js';
import type { UIResource, UIResourceOptions } from '../src/types/ui.js';

describe('UI Resource Creation', () => {
  describe('createInlineHTMLResource', () => {
    test('creates a valid UIResource with minimal parameters', () => {
      const resource = createInlineHTMLResource(
        'ui://test/simple',
        '<div>Hello</div>'
      );

      expect(resource).toBeDefined();
      expect(resource.type).toBe('resource');
      expect(resource.resource).toBeDefined();
      expect(resource.resource.uri).toBe('ui://test/simple');
      expect(resource.resource.mimeType).toBe('text/html');
      expect(resource.resource.text).toBe('<div>Hello</div>');
    });

    test('creates UIResource with complete HTML document', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body><h1>Test</h1></body>
        </html>
      `;

      const resource = createInlineHTMLResource('ui://test/complete', html);

      expect(resource.resource.text).toBe(html);
      expect(resource.resource.mimeType).toBe('text/html');
    });

    test('throws error for URI not starting with ui://', () => {
      expect(() => {
        createInlineHTMLResource('http://example.com', '<div>Test</div>');
      }).toThrow('Invalid UI resource URI');

      expect(() => {
        createInlineHTMLResource('resource://test', '<div>Test</div>');
      }).toThrow('UI resource URIs must start with "ui://"');
    });

    test('throws error for empty URI', () => {
      expect(() => {
        createInlineHTMLResource('', '<div>Test</div>');
      }).toThrow('Invalid UI resource URI');
    });

    test('accepts URI with only ui:// prefix (edge case)', () => {
      // Technically valid, though not recommended
      const resource = createInlineHTMLResource('ui://', '<div>Test</div>');
      expect(resource.resource.uri).toBe('ui://');
    });

    test('accepts empty HTML content (edge case)', () => {
      const resource = createInlineHTMLResource('ui://test/empty', '');

      expect(resource.resource.text).toBe('');
      expect(resource.resource.uri).toBe('ui://test/empty');
    });

    test('handles HTML with special characters', () => {
      const html = '<div>Test &amp; "quotes" and \'apostrophes\'</div>';
      const resource = createInlineHTMLResource('ui://test/special', html);

      expect(resource.resource.text).toBe(html);
    });

    test('handles multi-line HTML content', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
        </div>
      `;
      const resource = createInlineHTMLResource('ui://test/multiline', html);

      expect(resource.resource.text).toContain('<h1>Title</h1>');
      expect(resource.resource.text).toContain('<p>Paragraph</p>');
    });
  });

  describe('Metadata Building', () => {
    test('creates resource without metadata when options not provided', () => {
      const resource = createInlineHTMLResource(
        'ui://test/no-meta',
        '<div>Test</div>'
      );

      expect(resource.resource._meta).toBeUndefined();
    });

    test('includes preferredFrameSize in metadata', () => {
      const options: UIResourceOptions = {
        metadata: {
          preferredFrameSize: { width: 800, height: 600 },
        },
      };

      const resource = createInlineHTMLResource(
        'ui://test/with-size',
        '<div>Test</div>',
        options
      );

      expect(resource.resource._meta).toBeDefined();
      expect(resource.resource._meta!['mcpui.dev/ui-preferred-frame-size']).toEqual({
        width: 800,
        height: 600,
      });
    });

    test('includes initialRenderData in metadata', () => {
      const options: UIResourceOptions = {
        metadata: {
          initialRenderData: { userId: '123', userName: 'Alice' },
        },
      };

      const resource = createInlineHTMLResource(
        'ui://test/with-data',
        '<div>Test</div>',
        options
      );

      expect(resource.resource._meta).toBeDefined();
      expect(resource.resource._meta!['mcpui.dev/ui-initial-render-data']).toEqual({
        userId: '123',
        userName: 'Alice',
      });
    });

    test('includes custom annotations in metadata', () => {
      const options: UIResourceOptions = {
        annotations: {
          'myapp.com/custom-field': 'custom-value',
          'myapp.com/version': 2,
        },
      };

      const resource = createInlineHTMLResource(
        'ui://test/with-annotations',
        '<div>Test</div>',
        options
      );

      expect(resource.resource._meta).toBeDefined();
      expect(resource.resource._meta!['myapp.com/custom-field']).toBe('custom-value');
      expect(resource.resource._meta!['myapp.com/version']).toBe(2);
    });

    test('combines all metadata options together', () => {
      const options: UIResourceOptions = {
        metadata: {
          preferredFrameSize: { width: 1024, height: 768 },
          initialRenderData: { theme: 'dark' },
        },
        annotations: {
          'myapp.com/category': 'dashboard',
        },
      };

      const resource = createInlineHTMLResource(
        'ui://test/combined',
        '<div>Test</div>',
        options
      );

      expect(resource.resource._meta).toBeDefined();
      expect(resource.resource._meta!['mcpui.dev/ui-preferred-frame-size']).toEqual({
        width: 1024,
        height: 768,
      });
      expect(resource.resource._meta!['mcpui.dev/ui-initial-render-data']).toEqual({
        theme: 'dark',
      });
      expect(resource.resource._meta!['myapp.com/category']).toBe('dashboard');
    });

    test('handles empty metadata objects', () => {
      const options: UIResourceOptions = {
        metadata: {},
      };

      const resource = createInlineHTMLResource(
        'ui://test/empty-meta',
        '<div>Test</div>',
        options
      );

      // Empty metadata should not add _meta field
      expect(resource.resource._meta).toBeUndefined();
    });

    test('handles partial frame size (width only)', () => {
      const options: UIResourceOptions = {
        metadata: {
          preferredFrameSize: { width: 800 },
        },
      };

      const resource = createInlineHTMLResource(
        'ui://test/width-only',
        '<div>Test</div>',
        options
      );

      expect(resource.resource._meta!['mcpui.dev/ui-preferred-frame-size']).toEqual({
        width: 800,
      });
    });

    test('handles partial frame size (height only)', () => {
      const options: UIResourceOptions = {
        metadata: {
          preferredFrameSize: { height: 600 },
        },
      };

      const resource = createInlineHTMLResource(
        'ui://test/height-only',
        '<div>Test</div>',
        options
      );

      expect(resource.resource._meta!['mcpui.dev/ui-preferred-frame-size']).toEqual({
        height: 600,
      });
    });
  });
});

describe('UI Resource Type Guard', () => {
  describe('isUIResource', () => {
    test('returns true for valid text/html UIResource', () => {
      const resource = createInlineHTMLResource('ui://test', '<div>Test</div>');
      expect(isUIResource(resource)).toBe(true);
    });

    test('returns true for text/uri-list resource', () => {
      const resource: UIResource = {
        type: 'resource',
        resource: {
          uri: 'ui://external',
          mimeType: 'text/uri-list',
          text: 'https://example.com',
        },
      };
      expect(isUIResource(resource)).toBe(true);
    });

    test('returns true for Remote DOM resource', () => {
      const resource: UIResource = {
        type: 'resource',
        resource: {
          uri: 'ui://remote',
          mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
          text: 'function render() { return <div>Test</div>; }',
        },
      };
      expect(isUIResource(resource)).toBe(true);
    });

    test('returns false for null', () => {
      expect(isUIResource(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isUIResource(undefined)).toBe(false);
    });

    test('returns false for string', () => {
      expect(isUIResource('not a resource')).toBe(false);
    });

    test('returns false for number', () => {
      expect(isUIResource(42)).toBe(false);
    });

    test('returns false for empty object', () => {
      expect(isUIResource({})).toBe(false);
    });

    test('returns false for object with wrong type', () => {
      const notResource = {
        type: 'tool',
        resource: {
          uri: 'ui://test',
          mimeType: 'text/html',
        },
      };
      expect(isUIResource(notResource)).toBe(false);
    });

    test('returns false for object missing resource field', () => {
      const notResource = {
        type: 'resource',
      };
      expect(isUIResource(notResource)).toBe(false);
    });

    test('returns false for non-UI MIME type', () => {
      const notUIResource = {
        type: 'resource',
        resource: {
          uri: 'file://test.json',
          mimeType: 'application/json',
          text: '{"key": "value"}',
        },
      };
      expect(isUIResource(notUIResource)).toBe(false);
    });

    test('returns false for plain text MIME type', () => {
      const notUIResource = {
        type: 'resource',
        resource: {
          uri: 'file://test.txt',
          mimeType: 'text/plain',
          text: 'Plain text content',
        },
      };
      expect(isUIResource(notUIResource)).toBe(false);
    });

    test('returns true for Remote DOM with version suffix', () => {
      const resource: UIResource = {
        type: 'resource',
        resource: {
          uri: 'ui://remote/v2',
          mimeType: 'application/vnd.mcp-ui.remote-dom+javascript;version=2',
          text: 'code',
        },
      };
      expect(isUIResource(resource)).toBe(true);
    });
  });
});

describe('URI Format Validation', () => {
  test('accepts standard ui:// URIs', () => {
    const uris = [
      'ui://app/component',
      'ui://test',
      'ui://my-app/feature/v1',
      'ui://dashboard/stats',
    ];

    uris.forEach((uri) => {
      expect(() => {
        createInlineHTMLResource(uri, '<div>Test</div>');
      }).not.toThrow();
    });
  });

  test('rejects URIs with wrong protocol', () => {
    const invalidUris = [
      'http://example.com',
      'https://example.com',
      'file://path/to/file',
      'ftp://server.com',
      'ws://websocket',
      'resource://test',
    ];

    invalidUris.forEach((uri) => {
      expect(() => {
        createInlineHTMLResource(uri, '<div>Test</div>');
      }).toThrow('Invalid UI resource URI');
    });
  });

  test('rejects URIs with typos in protocol', () => {
    const typos = [
      'ui:/test',          // Missing slash
      'u://test',          // Missing 'i'
      'ui//test',          // Missing colon
      'UI://test',         // Uppercase (protocols are lowercase)
    ];

    typos.forEach((uri) => {
      expect(() => {
        createInlineHTMLResource(uri, '<div>Test</div>');
      }).toThrow();
    });
  });

  test('accepts URIs with special characters after ui://', () => {
    const uris = [
      'ui://app-name/component',
      'ui://app_name/component',
      'ui://app.name/component',
      'ui://app/component-v1',
      'ui://app/component_v1',
      'ui://app/component.v1',
    ];

    uris.forEach((uri) => {
      expect(() => {
        createInlineHTMLResource(uri, '<div>Test</div>');
      }).not.toThrow();
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  test('handles very long HTML content', () => {
    const longHtml = '<div>' + 'x'.repeat(10000) + '</div>';
    const resource = createInlineHTMLResource('ui://test/long', longHtml);

    expect(resource.resource.text).toBe(longHtml);
    expect(resource.resource.text?.length).toBe(longHtml.length);
  });

  test('handles HTML with embedded scripts', () => {
    const htmlWithScript = `
      <div>
        <script>console.log('test');</script>
        <p>Content</p>
      </div>
    `;
    const resource = createInlineHTMLResource('ui://test/script', htmlWithScript);

    expect(resource.resource.text).toContain('<script>');
    expect(resource.resource.text).toContain('console.log');
  });

  test('handles HTML with embedded styles', () => {
    const htmlWithStyle = `
      <div>
        <style>
          .test { color: red; }
        </style>
        <p class="test">Styled</p>
      </div>
    `;
    const resource = createInlineHTMLResource('ui://test/style', htmlWithStyle);

    expect(resource.resource.text).toContain('<style>');
    expect(resource.resource.text).toContain('.test { color: red; }');
  });

  test('preserves whitespace in HTML', () => {
    const htmlWithWhitespace = `
      <div>
        <p>Line 1</p>
        <p>Line 2</p>
      </div>
    `;
    const resource = createInlineHTMLResource('ui://test/whitespace', htmlWithWhitespace);

    expect(resource.resource.text).toBe(htmlWithWhitespace);
  });

  test('handles unicode characters in HTML', () => {
    const htmlWithUnicode = '<div>Hello 世界 🌍</div>';
    const resource = createInlineHTMLResource('ui://test/unicode', htmlWithUnicode);

    expect(resource.resource.text).toBe(htmlWithUnicode);
  });

  test('handles metadata with null values', () => {
    const options: UIResourceOptions = {
      annotations: {
        'myapp.com/nullable': null as any,
        'myapp.com/valid': 'value',
      },
    };

    const resource = createInlineHTMLResource(
      'ui://test/null-meta',
      '<div>Test</div>',
      options
    );

    expect(resource.resource._meta).toBeDefined();
    expect(resource.resource._meta!['myapp.com/nullable']).toBeNull();
    expect(resource.resource._meta!['myapp.com/valid']).toBe('value');
  });

  test('creates independent resources with same HTML', () => {
    const html = '<div>Shared content</div>';
    const resource1 = createInlineHTMLResource('ui://test/1', html);
    const resource2 = createInlineHTMLResource('ui://test/2', html);

    expect(resource1).not.toBe(resource2);
    expect(resource1.resource.uri).not.toBe(resource2.resource.uri);
    expect(resource1.resource.text).toBe(resource2.resource.text);
  });
});

describe('External URL Resource Creation (Layer 2)', () => {
  describe('createExternalURLResource', () => {
    test('creates a valid UIResource with HTTPS URL', () => {
      const resource = createExternalURLResource(
        'ui://dashboard/external',
        'https://example.com/dashboard'
      );

      expect(resource).toBeDefined();
      expect(resource.type).toBe('resource');
      expect(resource.resource).toBeDefined();
      expect(resource.resource.uri).toBe('ui://dashboard/external');
      expect(resource.resource.mimeType).toBe('text/uri-list');
      expect(resource.resource.text).toBe('https://example.com/dashboard');
    });

    test('accepts localhost HTTP for development', () => {
      const resource = createExternalURLResource(
        'ui://dev/local',
        'http://localhost:3000/widget'
      );

      expect(resource.resource.text).toBe('http://localhost:3000/widget');
      expect(resource.resource.mimeType).toBe('text/uri-list');
    });

    test('accepts 127.0.0.1 HTTP for development', () => {
      const resource = createExternalURLResource(
        'ui://dev/local',
        'http://127.0.0.1:8080/app'
      );

      expect(resource.resource.text).toBe('http://127.0.0.1:8080/app');
    });

    test('throws error for non-HTTPS URL (production)', () => {
      expect(() => {
        createExternalURLResource(
          'ui://test/url',
          'http://example.com/widget'
        );
      }).toThrow('Invalid external URL');
      expect(() => {
        createExternalURLResource(
          'ui://test/url',
          'http://example.com/widget'
        );
      }).toThrow('Must be HTTPS or localhost');
    });

    test('throws error for URI not starting with ui://', () => {
      expect(() => {
        createExternalURLResource(
          'http://example.com',
          'https://example.com'
        );
      }).toThrow('Invalid UI resource URI');
      expect(() => {
        createExternalURLResource(
          'resource://test',
          'https://example.com'
        );
      }).toThrow('UI resource URIs must start with "ui://"');
    });

    test('throws error for invalid URL format', () => {
      expect(() => {
        createExternalURLResource('ui://test', 'not-a-url');
      }).toThrow('Invalid URL');
    });

    test('throws error for empty URL', () => {
      expect(() => {
        createExternalURLResource('ui://test', '');
      }).toThrow('Invalid URL');
    });

    test('accepts URL with query parameters', () => {
      const resource = createExternalURLResource(
        'ui://widget/query',
        'https://example.com/widget?id=123&view=full'
      );

      expect(resource.resource.text).toBe('https://example.com/widget?id=123&view=full');
    });

    test('accepts URL with hash fragment', () => {
      const resource = createExternalURLResource(
        'ui://widget/hash',
        'https://example.com/widget#section1'
      );

      expect(resource.resource.text).toBe('https://example.com/widget#section1');
    });

    test('accepts URL with port number', () => {
      const resource = createExternalURLResource(
        'ui://widget/port',
        'https://example.com:8443/widget'
      );

      expect(resource.resource.text).toBe('https://example.com:8443/widget');
    });

    test('includes metadata when provided', () => {
      const options: UIResourceOptions = {
        metadata: {
          preferredFrameSize: { width: 1024, height: 768 },
        },
      };

      const resource = createExternalURLResource(
        'ui://widget/meta',
        'https://example.com/widget',
        options
      );

      expect(resource.resource._meta).toBeDefined();
      expect(resource.resource._meta!['mcpui.dev/ui-preferred-frame-size']).toEqual({
        width: 1024,
        height: 768,
      });
    });

    test('includes annotations when provided', () => {
      const options: UIResourceOptions = {
        annotations: {
          'myapp.com/external-source': 'third-party',
        },
      };

      const resource = createExternalURLResource(
        'ui://widget/annotated',
        'https://example.com/widget',
        options
      );

      expect(resource.resource._meta).toBeDefined();
      expect(resource.resource._meta!['myapp.com/external-source']).toBe('third-party');
    });

    test('creates resource without metadata when options not provided', () => {
      const resource = createExternalURLResource(
        'ui://widget/no-meta',
        'https://example.com/widget'
      );

      expect(resource.resource._meta).toBeUndefined();
    });
  });
});
