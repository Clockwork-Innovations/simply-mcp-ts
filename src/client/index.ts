/**
 * MCP-UI Client Components
 *
 * React components and utilities for rendering MCP-UI resources.
 *
 * @module client
 *
 * @example
 * ```typescript
 * import { UIResourceRenderer } from 'simply-mcp/client';
 *
 * function MyApp() {
 *   const resource = {
 *     uri: 'ui://product-card',
 *     mimeType: 'text/html',
 *     text: '<div><h2>Product</h2></div>'
 *   };
 *
 *   return <UIResourceRenderer resource={resource} />;
 * }
 * ```
 */

// Components (Note: React components require React as a peer dependency)
export { HTMLResourceRenderer } from './HTMLResourceRenderer.js';
export type { HTMLResourceRendererProps } from './HTMLResourceRenderer.js';

export { UIResourceRenderer } from './UIResourceRenderer.js';
export type { UIResourceRendererProps } from './UIResourceRenderer.js';

export { RemoteDOMRenderer } from './RemoteDOMRenderer.js';
export type { RemoteDOMRendererProps } from './RemoteDOMRenderer.js';

// Types
export type {
  UIContentType,
  UIResourceContent,
  UIAction,
  UIActionResult,
  ToolCallAction,
} from './ui-types.js';

export { getPreferredFrameSize, getInitialRenderData } from './ui-types.js';

// Utilities
export {
  getContentType,
  isUIResource,
  getHTMLContent,
  validateOrigin,
  buildSandboxAttribute,
} from './ui-utils.js';
