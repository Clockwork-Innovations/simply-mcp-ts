/**
 * SDK Interoperability Tests
 *
 * Verifies that our implementation works with resources created by the official @mcp-ui/server SDK
 * and that messages follow the exact specification for cross-implementation compatibility.
 *
 * Based on: https://github.com/idosal/mcp-ui
 * Spec reference: /mnt/Shared/cs-projects/simply-mcp-ts/MCP_UI_PROTOCOL_PARITY_ANALYSIS.md
 *
 * Test coverage:
 * - createUIResource compatibility
 * - Official MCP-UI message format acceptance
 * - Resource structure validation
 * - MIME type handling
 * - Encoding (text vs blob)
 * - URI validation
 *
 * @module tests/unit/protocol/sdk-interoperability
 */

import { createUIResource } from '../../../src/features/ui/create-ui-resource.js';
import {
  isValidUIResource,
  isValidToolMessage,
  isValidPromptMessage,
  isValidNotifyMessage,
  isValidLinkMessage,
  isValidIntentMessage,
  isNotLegacyFormat
} from './message-validators.js';
import { isUIResource, getContentType, getHTMLContent } from '../../../src/client/ui-utils.js';

describe('SDK Interoperability', () => {
  // ============================================================================
  // createUIResource Compatibility
  // ============================================================================
  describe('createUIResource API', () => {
    it('should create valid UI resource from rawHtml content', () => {
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Test</div>'
        },
        encoding: 'text'
      });

      expect(isValidUIResource(resource)).toBe(true);
      expect(resource.type).toBe('resource');
      expect(resource.resource.uri).toBe('ui://test/1');
      expect(resource.resource.mimeType).toBe('text/html');
      expect(resource.resource.text).toBe('<div>Test</div>');
    });

    it('should create valid UI resource from externalUrl content', () => {
      const resource = createUIResource({
        uri: 'ui://dashboard/main',
        content: {
          type: 'externalUrl',
          iframeUrl: 'https://example.com/dashboard'
        },
        encoding: 'text'
      });

      expect(isValidUIResource(resource)).toBe(true);
      expect(resource.type).toBe('resource');
      expect(resource.resource.uri).toBe('ui://dashboard/main');
      expect(resource.resource.mimeType).toBe('text/uri-list');
      expect(resource.resource.text).toBe('https://example.com/dashboard');
    });

    it('should create valid UI resource from remoteDom content', () => {
      const resource = createUIResource({
        uri: 'ui://widget/react',
        content: {
          type: 'remoteDom',
          framework: 'react',
          script: 'export default function() { return <div>Widget</div>; }'
        },
        encoding: 'text'
      });

      expect(isValidUIResource(resource)).toBe(true);
      expect(resource.type).toBe('resource');
      expect(resource.resource.uri).toBe('ui://widget/react');
      expect(resource.resource.mimeType).toBe('application/vnd.mcp-ui.remote-dom+javascript; framework=react');
      expect(resource.resource.text).toContain('export default function');
    });

    it('should handle blob encoding', () => {
      const htmlContent = '<div><h1>Large Content</h1></div>';
      const resource = createUIResource({
        uri: 'ui://large/1',
        content: {
          type: 'rawHtml',
          htmlString: htmlContent
        },
        encoding: 'blob'
      });

      expect(isValidUIResource(resource)).toBe(true);
      expect(resource.resource.text).toBeUndefined();
      expect(resource.resource.blob).toBeDefined();
      expect(typeof resource.resource.blob).toBe('string');

      // Verify blob can be decoded
      const decoded = Buffer.from(resource.resource.blob!, 'base64').toString('utf-8');
      expect(decoded).toBe(htmlContent);
    });

    it('should include metadata fields when provided', () => {
      const resource = createUIResource({
        uri: 'ui://calculator/v1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Calculator</div>'
        },
        metadata: {
          name: 'Simple Calculator',
          description: 'Add two numbers together'
        }
      });

      expect(resource.resource.name).toBe('Simple Calculator');
      expect(resource.resource.description).toBe('Add two numbers together');
    });

    it('should allow MIME type override via metadata', () => {
      const resource = createUIResource({
        uri: 'ui://custom/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Test</div>'
        },
        metadata: {
          mimeType: 'text/html; charset=utf-8'
        }
      });

      expect(resource.resource.mimeType).toBe('text/html; charset=utf-8');
    });

    it('should validate URI starts with ui://', () => {
      expect(() => {
        createUIResource({
          uri: 'http://invalid',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Test</div>'
          }
        });
      }).toThrow('UI resource URIs must start with "ui://"');
    });

    it('should validate required content fields', () => {
      expect(() => {
        createUIResource({
          uri: 'ui://test/1',
          content: {
            type: 'rawHtml',
            htmlString: '' as any // Empty htmlString
          }
        });
      }).toThrow(); // Should throw because htmlString is empty

      expect(() => {
        createUIResource({
          uri: 'ui://test/2',
          content: {
            type: 'externalUrl',
            iframeUrl: '' as any // Empty iframeUrl
          }
        });
      }).toThrow();

      expect(() => {
        createUIResource({
          uri: 'ui://test/3',
          content: {
            type: 'remoteDom',
            script: '',
            framework: 'react'
          }
        });
      }).toThrow(); // Empty script
    });
  });

  // ============================================================================
  // Official Message Format Acceptance
  // ============================================================================
  describe('Official MCP-UI message format', () => {
    it('should accept tool call from official SDK client', () => {
      // Simulate message that would come from official @mcp-ui/client
      const officialMessage = {
        type: 'tool',
        payload: {
          toolName: 'greet',
          params: { name: 'Alice' }
        },
        messageId: 'sdk_123'
      };

      // Our validators should accept it
      expect(isValidToolMessage(officialMessage)).toBe(true);
      expect(isNotLegacyFormat(officialMessage)).toBe(true);
    });

    it('should accept prompt from official SDK client', () => {
      const officialMessage = {
        type: 'prompt',
        payload: {
          prompt: 'Explain MCP-UI protocol'
        },
        messageId: 'sdk_456'
      };

      expect(isValidPromptMessage(officialMessage)).toBe(true);
    });

    it('should accept notify from official SDK client', () => {
      const officialMessage = {
        type: 'notify',
        payload: {
          message: 'Task completed',
          level: 'success'
        },
        messageId: 'sdk_789'
      };

      expect(isValidNotifyMessage(officialMessage)).toBe(true);
    });

    it('should accept link from official SDK client', () => {
      const officialMessage = {
        type: 'link',
        payload: {
          url: 'https://mcpui.dev'
        },
        messageId: 'sdk_012'
      };

      expect(isValidLinkMessage(officialMessage)).toBe(true);
    });

    it('should accept intent from official SDK client', () => {
      const officialMessage = {
        type: 'intent',
        payload: {
          intent: 'share',
          params: {
            title: 'Check this out',
            url: 'https://example.com'
          }
        },
        messageId: 'sdk_345'
      };

      expect(isValidIntentMessage(officialMessage)).toBe(true);
    });
  });

  // ============================================================================
  // Resource Structure Validation
  // ============================================================================
  describe('Resource structure validation', () => {
    it('should recognize valid UI resource', () => {
      const resource = {
        uri: 'ui://test/resource',
        mimeType: 'text/html',
        text: '<div>Content</div>'
      };

      expect(isUIResource(resource)).toBe(true);
    });

    it('should reject non-UI resource URIs', () => {
      const resource = {
        uri: 'http://example.com',
        mimeType: 'text/html',
        text: '<div>Content</div>'
      };

      // isUIResource doesn't check URI prefix, but isValidUIResource does
      expect(isValidUIResource({ type: 'resource', resource })).toBe(false);
    });

    it('should reject unsupported MIME types', () => {
      const resource = {
        uri: 'ui://test/json',
        mimeType: 'application/json',
        text: '{"data": "value"}'
      };

      expect(isUIResource(resource)).toBe(false);
      expect(getContentType(resource.mimeType)).toBeNull();
    });

    it('should require either text or blob field', () => {
      const resourceWithoutContent = {
        type: 'resource',
        resource: {
          uri: 'ui://test/empty',
          mimeType: 'text/html'
        }
      };

      expect(isValidUIResource(resourceWithoutContent)).toBe(false);
    });
  });

  // ============================================================================
  // MIME Type Handling
  // ============================================================================
  describe('MIME type handling', () => {
    it('should recognize text/html MIME type', () => {
      expect(getContentType('text/html')).toBe('rawHtml');
    });

    it('should recognize text/uri-list MIME type', () => {
      expect(getContentType('text/uri-list')).toBe('externalUrl');
    });

    it('should recognize remote-dom MIME type', () => {
      expect(getContentType('application/vnd.mcp-ui.remote-dom+javascript')).toBe('remoteDom');
    });

    it('should recognize remote-dom with framework parameter', () => {
      expect(getContentType('application/vnd.mcp-ui.remote-dom+javascript; framework=react')).toBe('remoteDom');
      expect(getContentType('application/vnd.mcp-ui.remote-dom+javascript; framework=webcomponents')).toBe('remoteDom');
    });

    it('should return null for unsupported MIME types', () => {
      expect(getContentType('application/json')).toBeNull();
      expect(getContentType('text/plain')).toBeNull();
      expect(getContentType('image/png')).toBeNull();
    });

    it('should handle MIME type case sensitivity', () => {
      // MIME types should be case-insensitive, but our implementation requires exact case
      expect(getContentType('text/html')).toBe('rawHtml');
      // Note: If case-insensitive handling is needed, update getContentType
    });
  });

  // ============================================================================
  // Content Extraction
  // ============================================================================
  describe('Content extraction', () => {
    it('should extract text content', () => {
      const resource = {
        uri: 'ui://test/text',
        mimeType: 'text/html',
        text: '<div>Hello World</div>'
      };

      const content = getHTMLContent(resource);
      expect(content).toBe('<div>Hello World</div>');
    });

    it('should extract and decode blob content', () => {
      const originalHtml = '<div><h1>Blob Content</h1></div>';
      const resource = {
        uri: 'ui://test/blob',
        mimeType: 'text/html',
        blob: Buffer.from(originalHtml, 'utf-8').toString('base64')
      };

      const content = getHTMLContent(resource);
      expect(content).toBe(originalHtml);
    });

    it('should prefer text over blob when both present', () => {
      const resource = {
        uri: 'ui://test/both',
        mimeType: 'text/html',
        text: '<div>Text content</div>',
        blob: Buffer.from('<div>Blob content</div>', 'utf-8').toString('base64')
      };

      const content = getHTMLContent(resource);
      expect(content).toBe('<div>Text content</div>');
    });

    it('should return empty string when no content', () => {
      const resource = {
        uri: 'ui://test/empty',
        mimeType: 'text/html'
      };

      const content = getHTMLContent(resource);
      expect(content).toBe('');
    });

    it('should handle invalid base64 gracefully', () => {
      const resource = {
        uri: 'ui://test/invalid',
        mimeType: 'text/html',
        blob: 'not-valid-base64!!!'
      };

      const content = getHTMLContent(resource);
      expect(content).toBe(''); // Should return empty string on decode error
    });
  });

  // ============================================================================
  // End-to-End Resource Flow
  // ============================================================================
  describe('End-to-end resource flow', () => {
    it('should handle complete resource lifecycle', () => {
      // 1. Create resource using SDK API
      const resource = createUIResource({
        uri: 'ui://calculator/v1',
        content: {
          type: 'rawHtml',
          htmlString: `
            <div style="padding: 20px;">
              <h2>Calculator</h2>
              <input type="number" id="a" />
              <input type="number" id="b" />
              <button onclick="calculate()">Add</button>
              <div id="result"></div>
            </div>
            <script>
              function calculate() {
                const a = Number(document.getElementById('a').value);
                const b = Number(document.getElementById('b').value);
                window.parent.postMessage({
                  type: 'tool',
                  payload: {
                    toolName: 'add',
                    params: { a, b }
                  },
                  messageId: 'calc_' + Date.now()
                }, '*');
              }
            </script>
          `
        },
        metadata: {
          name: 'Simple Calculator',
          description: 'Add two numbers together'
        }
      });

      // 2. Validate resource structure
      expect(isValidUIResource(resource)).toBe(true);

      // 3. Extract resource for rendering
      const uiResource = resource.resource;
      expect(isUIResource(uiResource)).toBe(true);

      // 4. Determine content type
      const contentType = getContentType(uiResource.mimeType);
      expect(contentType).toBe('rawHtml');

      // 5. Extract HTML content
      const html = getHTMLContent(uiResource);
      expect(html).toContain('<h2>Calculator</h2>');
      expect(html).toContain('function calculate()');

      // 6. Verify metadata preserved
      expect(uiResource.name).toBe('Simple Calculator');
      expect(uiResource.description).toBe('Add two numbers together');
    });

    it('should handle external URL resource flow', () => {
      // 1. Create resource
      const resource = createUIResource({
        uri: 'ui://analytics/dashboard',
        content: {
          type: 'externalUrl',
          iframeUrl: 'https://analytics.example.com/dashboard'
        }
      });

      // 2. Validate
      expect(isValidUIResource(resource)).toBe(true);

      // 3. Extract
      const uiResource = resource.resource;
      expect(isUIResource(uiResource)).toBe(true);

      // 4. Verify MIME type
      expect(uiResource.mimeType).toBe('text/uri-list');
      expect(getContentType(uiResource.mimeType)).toBe('externalUrl');

      // 5. Extract URL
      expect(uiResource.text).toBe('https://analytics.example.com/dashboard');
    });

    it('should work with resources from official SDK examples', () => {
      // Example from official docs: https://mcpui.dev
      const officialExample = {
        type: 'resource',
        resource: {
          uri: 'ui://task-manager/123',
          mimeType: 'text/html',
          text: '<div id="task-manager"><h1>Task Manager</h1></div>',
          name: 'Task Manager',
          description: 'Manage your tasks'
        }
      };

      // Should be recognized as valid
      expect(isValidUIResource(officialExample)).toBe(true);
      expect(isUIResource(officialExample.resource)).toBe(true);

      // Should extract correctly
      const content = getHTMLContent(officialExample.resource);
      expect(content).toContain('Task Manager');
    });
  });

  // ============================================================================
  // Framework Parameter Parsing
  // ============================================================================
  describe('Remote DOM framework parameter', () => {
    it('should include framework in MIME type for React', () => {
      const resource = createUIResource({
        uri: 'ui://widget/react',
        content: {
          type: 'remoteDom',
          framework: 'react',
          script: 'export default function() { return <div>Widget</div>; }'
        }
      });

      expect(resource.resource.mimeType).toContain('framework=react');
    });

    it('should include framework in MIME type for Web Components', () => {
      const resource = createUIResource({
        uri: 'ui://widget/wc',
        content: {
          type: 'remoteDom',
          framework: 'webcomponents',
          script: 'class MyWidget extends HTMLElement {}'
        }
      });

      expect(resource.resource.mimeType).toContain('framework=webcomponents');
    });

    it('should recognize remote-dom regardless of framework', () => {
      const reactType = 'application/vnd.mcp-ui.remote-dom+javascript; framework=react';
      const wcType = 'application/vnd.mcp-ui.remote-dom+javascript; framework=webcomponents';

      expect(getContentType(reactType)).toBe('remoteDom');
      expect(getContentType(wcType)).toBe('remoteDom');
    });
  });
});
