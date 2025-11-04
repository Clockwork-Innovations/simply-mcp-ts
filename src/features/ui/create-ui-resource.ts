/**
 * SDK-Compatible UI Resource Creation Helper
 *
 * This module provides a helper function that matches the official @mcp-ui/server API
 * signature, allowing developers to create UI resources using the SDK approach
 * alongside our interface-based approach.
 *
 * Based on the official MCP-UI specification:
 * https://github.com/idosal/mcp-ui
 *
 * Both the interface-based approach and this SDK helper can coexist,
 * providing flexibility for developers familiar with different patterns.
 *
 * @example Interface-based approach (Simply-MCP style)
 * ```typescript
 * interface MyUI extends IUI {
 *   uri: 'ui://calculator/v1';
 *   html: string;
 * }
 * ```
 *
 * @example SDK approach (Official MCP-UI style)
 * ```typescript
 * import { createUIResource } from 'simply-mcp';
 *
 * const resource = createUIResource({
 *   uri: 'ui://calculator/v1',
 *   content: {
 *     type: 'rawHtml',
 *     htmlString: '<div>Calculator</div>'
 *   }
 * });
 * ```
 */

import type { UIResource } from '../../types/ui.js';

/**
 * Content configuration for raw HTML UI resources
 */
export interface RawHtmlContent {
  /**
   * Content type identifier
   */
  type: 'rawHtml';

  /**
   * HTML string to render in sandboxed iframe
   */
  htmlString: string;
}

/**
 * Content configuration for external URL UI resources
 */
export interface ExternalUrlContent {
  /**
   * Content type identifier
   */
  type: 'externalUrl';

  /**
   * HTTPS URL to embed in iframe
   */
  iframeUrl: string;
}

/**
 * Content configuration for Remote DOM UI resources
 */
export interface RemoteDomContent {
  /**
   * Content type identifier
   */
  type: 'remoteDom';

  /**
   * JavaScript code to execute in Web Worker sandbox
   */
  script: string;

  /**
   * Framework type for Remote DOM script
   * - 'react': React components (compiled to remote-dom API)
   * - 'webcomponents': Web Components
   */
  framework: 'react' | 'webcomponents';
}

/**
 * Union type of all supported content configurations
 */
export type UIResourceContent = RawHtmlContent | ExternalUrlContent | RemoteDomContent;

/**
 * Encoding format for resource content
 * - 'text': Return content in the `text` field (default)
 * - 'blob': Base64-encode content and return in the `blob` field
 */
export type UIResourceEncoding = 'text' | 'blob';

/**
 * Optional metadata for UI resources
 */
export interface UIResourceMetadata {
  /**
   * Human-readable name for the UI resource
   */
  name?: string;

  /**
   * Description of what the UI resource does
   */
  description?: string;

  /**
   * Override the auto-detected MIME type
   * Use with caution - incorrect MIME types will cause rendering failures
   */
  mimeType?: string;
}

/**
 * Options for creating a UI resource
 *
 * Provides complete configuration for UI resource creation,
 * including content, encoding, and optional metadata.
 */
export interface UIResourceOptions {
  /**
   * Unique identifier for the UI resource
   * Must start with "ui://"
   *
   * @example 'ui://calculator/v1'
   * @example 'ui://dashboard/main'
   */
  uri: string;

  /**
   * Content configuration
   * Determines what will be rendered and how
   */
  content: UIResourceContent;

  /**
   * Encoding format for the content
   * Default: 'text'
   */
  encoding?: UIResourceEncoding;

  /**
   * Optional metadata
   * Provides additional context about the UI resource
   */
  metadata?: UIResourceMetadata;
}

/**
 * Create a UI resource using SDK-compatible API
 *
 * This function provides compatibility with the official @mcp-ui/server API,
 * allowing developers to create UI resources using a function-based approach
 * instead of the interface-based approach.
 *
 * Both approaches produce spec-compliant UIResource objects that work
 * with any MCP-UI client implementation.
 *
 * ## Features
 * - ✅ SDK API compatibility with official @mcp-ui/server
 * - ✅ Support for all three content types (rawHtml, externalUrl, remoteDom)
 * - ✅ URI validation (ensures "ui://" prefix)
 * - ✅ Automatic MIME type determination
 * - ✅ Text and blob encoding support
 * - ✅ Optional metadata (name, description, MIME override)
 *
 * ## Security
 * - Raw HTML is rendered in sandboxed iframes (no direct DOM access)
 * - External URLs must be HTTPS (enforced by client)
 * - Remote DOM scripts execute in Web Worker sandbox
 *
 * @param options - Configuration for the UI resource
 * @returns Spec-compliant UIResource object ready for MCP response
 *
 * @throws {Error} If URI doesn't start with "ui://"
 * @throws {Error} If required content fields are missing
 *
 * @example Raw HTML - Basic
 * ```typescript
 * const resource = createUIResource({
 *   uri: 'ui://greeting/1',
 *   content: {
 *     type: 'rawHtml',
 *     htmlString: '<div><h1>Hello World!</h1></div>'
 *   }
 * });
 * ```
 *
 * @example Raw HTML - With inline styles and scripts
 * ```typescript
 * const resource = createUIResource({
 *   uri: 'ui://calculator/v1',
 *   content: {
 *     type: 'rawHtml',
 *     htmlString: `
 *       <style>
 *         .calculator { padding: 20px; }
 *         button { margin: 5px; }
 *       </style>
 *       <div class="calculator">
 *         <input type="number" id="a" />
 *         <input type="number" id="b" />
 *         <button onclick="calculate()">Add</button>
 *         <div id="result"></div>
 *       </div>
 *       <script>
 *         function calculate() {
 *           const a = Number(document.getElementById('a').value);
 *           const b = Number(document.getElementById('b').value);
 *
 *           // Call MCP tool using postMessage protocol
 *           window.parent.postMessage({
 *             type: 'tool',
 *             payload: {
 *               toolName: 'add',
 *               params: { a, b }
 *             },
 *             messageId: 'calc_' + Date.now()
 *           }, '*');
 *         }
 *       </script>
 *     `
 *   },
 *   metadata: {
 *     name: 'Simple Calculator',
 *     description: 'Add two numbers together'
 *   }
 * });
 * ```
 *
 * @example External URL
 * ```typescript
 * const resource = createUIResource({
 *   uri: 'ui://analytics/dashboard',
 *   content: {
 *     type: 'externalUrl',
 *     iframeUrl: 'https://example.com/dashboard'
 *   },
 *   metadata: {
 *     name: 'Analytics Dashboard',
 *     description: 'Real-time analytics and metrics'
 *   }
 * });
 * ```
 *
 * @example Remote DOM - React
 * ```typescript
 * const resource = createUIResource({
 *   uri: 'ui://counter/react',
 *   content: {
 *     type: 'remoteDom',
 *     framework: 'react',
 *     script: `
 *       import { useState } from 'react';
 *
 *       export default function Counter() {
 *         const [count, setCount] = useState(0);
 *
 *         return (
 *           <div>
 *             <h2>Count: {count}</h2>
 *             <button onClick={() => setCount(count + 1)}>
 *               Increment
 *             </button>
 *             <button onClick={() => setCount(count - 1)}>
 *               Decrement
 *             </button>
 *           </div>
 *         );
 *       }
 *     `
 *   },
 *   encoding: 'text'
 * });
 * ```
 *
 * @example Remote DOM - Web Components
 * ```typescript
 * const resource = createUIResource({
 *   uri: 'ui://widget/webcomponent',
 *   content: {
 *     type: 'remoteDom',
 *     framework: 'webcomponents',
 *     script: `
 *       class CounterWidget extends HTMLElement {
 *         constructor() {
 *           super();
 *           this.count = 0;
 *         }
 *
 *         connectedCallback() {
 *           this.innerHTML = \`
 *             <div>
 *               <p>Count: <span id="count">0</span></p>
 *               <button id="inc">+</button>
 *               <button id="dec">-</button>
 *             </div>
 *           \`;
 *
 *           this.querySelector('#inc').addEventListener('click', () => {
 *             this.count++;
 *             this.querySelector('#count').textContent = this.count;
 *           });
 *         }
 *       }
 *
 *       customElements.define('counter-widget', CounterWidget);
 *     `
 *   }
 * });
 * ```
 *
 * @example Blob Encoding
 * ```typescript
 * // Useful for large HTML content or binary assets
 * const resource = createUIResource({
 *   uri: 'ui://report/large',
 *   content: {
 *     type: 'rawHtml',
 *     htmlString: largeHtmlReport  // Will be base64-encoded
 *   },
 *   encoding: 'blob'
 * });
 * ```
 *
 * @example MIME Type Override
 * ```typescript
 * // Advanced: Override MIME type detection
 * const resource = createUIResource({
 *   uri: 'ui://custom/type',
 *   content: {
 *     type: 'rawHtml',
 *     htmlString: '<div>Custom</div>'
 *   },
 *   metadata: {
 *     mimeType: 'text/html; charset=utf-8'
 *   }
 * });
 * ```
 */
export function createUIResource(options: UIResourceOptions): UIResource {
  const { uri, content, encoding = 'text', metadata } = options;

  // ============================================================================
  // URI Validation
  // ============================================================================
  if (!uri.startsWith('ui://')) {
    throw new Error(
      `Invalid UI resource URI: "${uri}". UI resource URIs must start with "ui://"`
    );
  }

  // ============================================================================
  // MIME Type Determination
  // ============================================================================
  let mimeType: string;
  let resourceContent: string;

  switch (content.type) {
    case 'rawHtml':
      // Validate htmlString exists
      if (!content.htmlString) {
        throw new Error('rawHtml content requires htmlString field');
      }

      mimeType = 'text/html';
      resourceContent = content.htmlString;
      break;

    case 'externalUrl':
      // Validate iframeUrl exists
      if (!content.iframeUrl) {
        throw new Error('externalUrl content requires iframeUrl field');
      }

      mimeType = 'text/uri-list';
      resourceContent = content.iframeUrl;
      break;

    case 'remoteDom':
      // Validate script and framework exist
      if (!content.script) {
        throw new Error('remoteDom content requires script field');
      }
      if (!content.framework) {
        throw new Error('remoteDom content requires framework field');
      }

      // MIME type includes framework parameter
      // Format: application/vnd.mcp-ui.remote-dom+javascript; framework={framework}
      mimeType = `application/vnd.mcp-ui.remote-dom+javascript; framework=${content.framework}`;
      resourceContent = content.script;
      break;

    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = content;
      throw new Error(`Unknown content type: ${(_exhaustive as any).type}`);
  }

  // Allow metadata to override MIME type
  if (metadata?.mimeType) {
    mimeType = metadata.mimeType;
  }

  // ============================================================================
  // Encoding Handling
  // ============================================================================
  let text: string | undefined;
  let blob: string | undefined;

  if (encoding === 'text') {
    // Return content in text field
    text = resourceContent;
  } else if (encoding === 'blob') {
    // Base64-encode content and return in blob field
    blob = Buffer.from(resourceContent, 'utf-8').toString('base64');
  } else {
    // TypeScript exhaustiveness check
    const _exhaustive: never = encoding;
    throw new Error(`Unknown encoding: ${_exhaustive}`);
  }

  // ============================================================================
  // Build UIResource Object
  // ============================================================================
  return {
    type: 'resource',
    resource: {
      uri,
      mimeType,
      ...(metadata?.name && { name: metadata.name }),
      ...(metadata?.description && { description: metadata.description }),
      ...(text !== undefined && { text }),
      ...(blob !== undefined && { blob }),
    },
  };
}
