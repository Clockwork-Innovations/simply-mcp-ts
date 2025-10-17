/**
 * Remote DOM Types for MCP-UI Layer 3
 *
 * Type definitions for Remote DOM resources that execute JavaScript
 * in a Web Worker sandbox to produce native-looking React components.
 */

import type { UIResource, UIResourcePayload } from '../types/ui.js';

/**
 * Framework type for Remote DOM script
 *
 * - javascript: Plain JavaScript that uses remoteDOM API
 * - react: React components (future)
 * - web-components: Web Components (future)
 */
export type RemoteDOMFramework = 'javascript' | 'react' | 'web-components';

/**
 * Remote DOM Resource Payload
 *
 * Resource payload specific to Remote DOM, with MIME type indicating
 * the framework used for the script.
 */
export interface RemoteDOMResourcePayload extends UIResourcePayload {
  /**
   * MIME type for Remote DOM resources
   * Format: application/vnd.mcp-ui.remote-dom+{framework}
   * Example: application/vnd.mcp-ui.remote-dom+javascript
   */
  mimeType: `application/vnd.mcp-ui.remote-dom+${string}`;
}

/**
 * Remote DOM Resource
 *
 * Complete Remote DOM resource object with MCP resource envelope.
 * Contains JavaScript code that will be executed in a Web Worker sandbox.
 */
export interface RemoteDOMResource extends UIResource {
  resource: RemoteDOMResourcePayload;
}
