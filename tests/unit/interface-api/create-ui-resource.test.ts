/**
 * Tests for createUIResource SDK helper
 *
 * Validates the SDK-compatible UI resource creation function
 * to ensure it produces spec-compliant UIResource objects.
 */

import { describe, it, expect } from '@jest/globals';
import { createUIResource } from '../../../src/features/ui/create-ui-resource.js';
import type { UIResource } from '../../../src/types/ui.js';

describe('createUIResource', () => {
  describe('URI validation', () => {
    it('should accept valid ui:// URIs', () => {
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Test</div>',
        },
      });

      expect(resource.resource.uri).toBe('ui://test/1');
    });

    it('should throw error for URIs not starting with ui://', () => {
      expect(() => {
        createUIResource({
          uri: 'http://invalid',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Test</div>',
          },
        });
      }).toThrow('UI resource URIs must start with "ui://"');
    });

    it('should throw error for empty URIs', () => {
      expect(() => {
        createUIResource({
          uri: '',
          content: {
            type: 'rawHtml',
            htmlString: '<div>Test</div>',
          },
        });
      }).toThrow('UI resource URIs must start with "ui://"');
    });
  });

  describe('rawHtml content type', () => {
    it('should create resource with text/html MIME type', () => {
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Hello World</div>',
        },
      });

      expect(resource.type).toBe('resource');
      expect(resource.resource.mimeType).toBe('text/html');
      expect(resource.resource.text).toBe('<div>Hello World</div>');
      expect(resource.resource.blob).toBeUndefined();
    });

    it('should handle complex HTML with styles and scripts', () => {
      const htmlContent = `
        <style>
          .container { padding: 20px; }
        </style>
        <div class="container">
          <h1>Test</h1>
        </div>
        <script>
          console.log('Loaded');
        </script>
      `;

      const resource = createUIResource({
        uri: 'ui://complex/1',
        content: {
          type: 'rawHtml',
          htmlString: htmlContent,
        },
      });

      expect(resource.resource.text).toBe(htmlContent);
      expect(resource.resource.mimeType).toBe('text/html');
    });

    it('should throw error if htmlString is missing', () => {
      expect(() => {
        createUIResource({
          uri: 'ui://test/1',
          content: {
            type: 'rawHtml',
            htmlString: '',
          },
        });
      }).toThrow('rawHtml content requires htmlString field');
    });
  });

  describe('externalUrl content type', () => {
    it('should create resource with text/uri-list MIME type', () => {
      const resource = createUIResource({
        uri: 'ui://dashboard/1',
        content: {
          type: 'externalUrl',
          iframeUrl: 'https://example.com/dashboard',
        },
      });

      expect(resource.type).toBe('resource');
      expect(resource.resource.mimeType).toBe('text/uri-list');
      expect(resource.resource.text).toBe('https://example.com/dashboard');
      expect(resource.resource.blob).toBeUndefined();
    });

    it('should handle localhost URLs for development', () => {
      const resource = createUIResource({
        uri: 'ui://dev/1',
        content: {
          type: 'externalUrl',
          iframeUrl: 'http://localhost:3000/widget',
        },
      });

      expect(resource.resource.text).toBe('http://localhost:3000/widget');
      expect(resource.resource.mimeType).toBe('text/uri-list');
    });

    it('should throw error if iframeUrl is missing', () => {
      expect(() => {
        createUIResource({
          uri: 'ui://test/1',
          content: {
            type: 'externalUrl',
            iframeUrl: '',
          },
        });
      }).toThrow('externalUrl content requires iframeUrl field');
    });
  });

  describe('remoteDom content type', () => {
    it('should create resource with remote-dom MIME type for React', () => {
      const script = `
        import { useState } from 'react';
        export default function Counter() {
          const [count, setCount] = useState(0);
          return <div>Count: {count}</div>;
        }
      `;

      const resource = createUIResource({
        uri: 'ui://remote/1',
        content: {
          type: 'remoteDom',
          framework: 'react',
          script,
        },
      });

      expect(resource.type).toBe('resource');
      expect(resource.resource.mimeType).toBe(
        'application/vnd.mcp-ui.remote-dom+javascript; framework=react'
      );
      expect(resource.resource.text).toBe(script);
      expect(resource.resource.blob).toBeUndefined();
    });

    it('should create resource with remote-dom MIME type for Web Components', () => {
      const script = `
        class MyWidget extends HTMLElement {
          connectedCallback() {
            this.innerHTML = '<div>Widget</div>';
          }
        }
        customElements.define('my-widget', MyWidget);
      `;

      const resource = createUIResource({
        uri: 'ui://webcomponent/1',
        content: {
          type: 'remoteDom',
          framework: 'webcomponents',
          script,
        },
      });

      expect(resource.resource.mimeType).toBe(
        'application/vnd.mcp-ui.remote-dom+javascript; framework=webcomponents'
      );
      expect(resource.resource.text).toBe(script);
    });

    it('should throw error if script is missing', () => {
      expect(() => {
        createUIResource({
          uri: 'ui://test/1',
          content: {
            type: 'remoteDom',
            framework: 'react',
            script: '',
          },
        });
      }).toThrow('remoteDom content requires script field');
    });

    it('should throw error if framework is missing', () => {
      expect(() => {
        createUIResource({
          uri: 'ui://test/1',
          content: {
            type: 'remoteDom',
            framework: undefined as any,
            script: 'export default function App() {}',
          },
        });
      }).toThrow('remoteDom content requires framework field');
    });
  });

  describe('encoding', () => {
    it('should default to text encoding', () => {
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Test</div>',
        },
      });

      expect(resource.resource.text).toBe('<div>Test</div>');
      expect(resource.resource.blob).toBeUndefined();
    });

    it('should support explicit text encoding', () => {
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Test</div>',
        },
        encoding: 'text',
      });

      expect(resource.resource.text).toBe('<div>Test</div>');
      expect(resource.resource.blob).toBeUndefined();
    });

    it('should support blob encoding with base64', () => {
      const htmlContent = '<div>Test Content</div>';
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: htmlContent,
        },
        encoding: 'blob',
      });

      expect(resource.resource.text).toBeUndefined();
      expect(resource.resource.blob).toBeDefined();

      // Verify base64 decoding works
      const decoded = Buffer.from(resource.resource.blob!, 'base64').toString('utf-8');
      expect(decoded).toBe(htmlContent);
    });

    it('should support blob encoding for external URLs', () => {
      const url = 'https://example.com/widget';
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'externalUrl',
          iframeUrl: url,
        },
        encoding: 'blob',
      });

      expect(resource.resource.text).toBeUndefined();
      expect(resource.resource.blob).toBeDefined();

      const decoded = Buffer.from(resource.resource.blob!, 'base64').toString('utf-8');
      expect(decoded).toBe(url);
    });

    it('should support blob encoding for remote-dom', () => {
      const script = 'export default function App() { return <div>Hi</div>; }';
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'remoteDom',
          framework: 'react',
          script,
        },
        encoding: 'blob',
      });

      expect(resource.resource.text).toBeUndefined();
      expect(resource.resource.blob).toBeDefined();

      const decoded = Buffer.from(resource.resource.blob!, 'base64').toString('utf-8');
      expect(decoded).toBe(script);
    });
  });

  describe('metadata', () => {
    it('should include name when provided', () => {
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Test</div>',
        },
        metadata: {
          name: 'Test Widget',
        },
      });

      expect(resource.resource.name).toBe('Test Widget');
    });

    it('should include description when provided', () => {
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Test</div>',
        },
        metadata: {
          description: 'A test widget for demonstration',
        },
      });

      expect(resource.resource.description).toBe('A test widget for demonstration');
    });

    it('should include both name and description', () => {
      const resource = createUIResource({
        uri: 'ui://calculator/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Calculator</div>',
        },
        metadata: {
          name: 'Simple Calculator',
          description: 'Add two numbers together',
        },
      });

      expect(resource.resource.name).toBe('Simple Calculator');
      expect(resource.resource.description).toBe('Add two numbers together');
    });

    it('should allow MIME type override', () => {
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Test</div>',
        },
        metadata: {
          mimeType: 'text/html; charset=utf-8',
        },
      });

      expect(resource.resource.mimeType).toBe('text/html; charset=utf-8');
    });

    it('should not include metadata fields if not provided', () => {
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Test</div>',
        },
      });

      expect(resource.resource.name).toBeUndefined();
      expect(resource.resource.description).toBeUndefined();
    });
  });

  describe('spec compliance', () => {
    it('should return object with type: "resource"', () => {
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Test</div>',
        },
      });

      expect(resource.type).toBe('resource');
    });

    it('should have nested resource object with required fields', () => {
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Test</div>',
        },
      });

      expect(resource.resource).toBeDefined();
      expect(resource.resource.uri).toBeDefined();
      expect(resource.resource.mimeType).toBeDefined();
      expect(typeof resource.resource.uri).toBe('string');
      expect(typeof resource.resource.mimeType).toBe('string');
    });

    it('should have either text or blob field (not both for text encoding)', () => {
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Test</div>',
        },
        encoding: 'text',
      });

      expect(resource.resource.text).toBeDefined();
      expect(resource.resource.blob).toBeUndefined();
    });

    it('should have either text or blob field (not both for blob encoding)', () => {
      const resource = createUIResource({
        uri: 'ui://test/1',
        content: {
          type: 'rawHtml',
          htmlString: '<div>Test</div>',
        },
        encoding: 'blob',
      });

      expect(resource.resource.text).toBeUndefined();
      expect(resource.resource.blob).toBeDefined();
    });

    it('should match official SDK output format for rawHtml', () => {
      const resource = createUIResource({
        uri: 'ui://greeting/1',
        content: {
          type: 'rawHtml',
          htmlString: '<p>Hello!</p>',
        },
        encoding: 'text',
      });

      // Should match this structure from official SDK:
      // {
      //   type: 'resource',
      //   resource: {
      //     uri: 'ui://greeting/1',
      //     mimeType: 'text/html',
      //     text: '<p>Hello!</p>'
      //   }
      // }

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://greeting/1',
          mimeType: 'text/html',
          text: '<p>Hello!</p>',
        },
      });
    });

    it('should match official SDK output format for externalUrl', () => {
      const resource = createUIResource({
        uri: 'ui://dashboard/1',
        content: {
          type: 'externalUrl',
          iframeUrl: 'https://example.com/dashboard',
        },
        encoding: 'text',
      });

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://dashboard/1',
          mimeType: 'text/uri-list',
          text: 'https://example.com/dashboard',
        },
      });
    });

    it('should match official SDK output format for remoteDom', () => {
      const script = 'export default function App() { return <div>Hi</div>; }';
      const resource = createUIResource({
        uri: 'ui://remote/1',
        content: {
          type: 'remoteDom',
          framework: 'react',
          script,
        },
        encoding: 'text',
      });

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://remote/1',
          mimeType: 'application/vnd.mcp-ui.remote-dom+javascript; framework=react',
          text: script,
        },
      });
    });
  });

  describe('real-world examples', () => {
    it('should create a calculator UI resource', () => {
      const resource = createUIResource({
        uri: 'ui://calculator/v1',
        content: {
          type: 'rawHtml',
          htmlString: `
            <style>
              .calculator { font-family: Arial; padding: 20px; }
              input { margin: 5px; padding: 8px; }
              button { padding: 8px 16px; background: #007bff; color: white; border: none; }
            </style>
            <div class="calculator">
              <h2>Calculator</h2>
              <input type="number" id="a" placeholder="First number" />
              <input type="number" id="b" placeholder="Second number" />
              <button onclick="calculate()">Calculate</button>
              <div id="result"></div>
            </div>
            <script>
              function calculate() {
                const a = Number(document.getElementById('a').value);
                const b = Number(document.getElementById('b').value);
                window.parent.postMessage({
                  type: 'tool',
                  payload: { toolName: 'add', params: { a, b } },
                  messageId: 'calc_' + Date.now()
                }, '*');
              }
              window.addEventListener('message', (event) => {
                if (event.data.type === 'tool-response') {
                  document.getElementById('result').textContent =
                    'Result: ' + event.data.payload.result;
                }
              });
            </script>
          `,
        },
        metadata: {
          name: 'Simple Calculator',
          description: 'Add two numbers using MCP tools',
        },
      });

      expect(resource.type).toBe('resource');
      expect(resource.resource.mimeType).toBe('text/html');
      expect(resource.resource.name).toBe('Simple Calculator');
      expect(resource.resource.description).toBe('Add two numbers using MCP tools');
      expect(resource.resource.text).toContain('calculate()');
    });

    it('should create an analytics dashboard resource', () => {
      const resource = createUIResource({
        uri: 'ui://analytics/dashboard',
        content: {
          type: 'externalUrl',
          iframeUrl: 'https://analytics.example.com/dashboard',
        },
        metadata: {
          name: 'Analytics Dashboard',
          description: 'Real-time business analytics',
        },
      });

      expect(resource.type).toBe('resource');
      expect(resource.resource.mimeType).toBe('text/uri-list');
      expect(resource.resource.text).toBe('https://analytics.example.com/dashboard');
      expect(resource.resource.name).toBe('Analytics Dashboard');
    });

    it('should create a React counter component resource', () => {
      const resource = createUIResource({
        uri: 'ui://counter/react',
        content: {
          type: 'remoteDom',
          framework: 'react',
          script: `
            import { useState } from 'react';

            export default function Counter() {
              const [count, setCount] = useState(0);

              const handleIncrement = () => {
                setCount(count + 1);
                // Notify parent of state change
                window.parent.postMessage({
                  type: 'notify',
                  payload: { message: 'Count increased to ' + (count + 1) }
                }, '*');
              };

              return (
                <div style={{ padding: '20px', fontFamily: 'Arial' }}>
                  <h2>Counter: {count}</h2>
                  <button onClick={handleIncrement}>Increment</button>
                  <button onClick={() => setCount(0)}>Reset</button>
                </div>
              );
            }
          `,
        },
        metadata: {
          name: 'React Counter',
          description: 'Interactive counter component with notifications',
        },
      });

      expect(resource.type).toBe('resource');
      expect(resource.resource.mimeType).toContain('remote-dom');
      expect(resource.resource.mimeType).toContain('framework=react');
      expect(resource.resource.text).toContain('useState');
      expect(resource.resource.name).toBe('React Counter');
    });
  });
});
