/**
 * UI Resource Helpers for MCP-UI Foundation Layer
 *
 * Helper functions for creating and validating UI resources.
 * UI resources are MCP resources with special MIME types that
 * indicate they should be rendered as interactive UI elements.
 */

import type { UIResource, UIResourceOptions } from '../../types/ui.js';
import type { RemoteDOMResource, RemoteDOMFramework } from '../../core/remote-dom-types.js';

/**
 * Create an inline HTML UI resource
 *
 * Creates a UIResource object with text/html MIME type for rendering
 * HTML content in a sandboxed iframe. The HTML should be complete and
 * self-contained (no external dependencies unless handled by Layer 2+).
 *
 * @param uri - Unique identifier (must start with "ui://")
 * @param htmlContent - HTML string to render
 * @param options - Optional metadata and annotations
 * @returns UIResource object ready for MCP response
 *
 * @throws {Error} If URI doesn't start with "ui://"
 *
 * @example
 * ```typescript
 * // Basic HTML card
 * const uiResource = createInlineHTMLResource(
 *   'ui://product-selector/v1',
 *   '<div><h2>Select a product</h2><button>Widget A</button></div>'
 * );
 * ```
 *
 * @example
 * ```typescript
 * // With metadata
 * const uiResource = createInlineHTMLResource(
 *   'ui://chart/quarterly-sales',
 *   '<div id="chart">...</div>',
 *   {
 *     metadata: {
 *       preferredFrameSize: { width: 800, height: 600 },
 *       initialRenderData: { quarter: 'Q4', year: 2024 }
 *     },
 *     annotations: {
 *       'myapp.com/chart-type': 'line-chart'
 *     }
 *   }
 * );
 * ```
 */
export function createInlineHTMLResource(
  uri: string,
  htmlContent: string,
  options?: UIResourceOptions
): UIResource {
  // Validate URI starts with ui://
  if (!uri.startsWith('ui://')) {
    throw new Error(
      `Invalid UI resource URI: "${uri}". UI resource URIs must start with "ui://"`
    );
  }

  // Build metadata if provided
  const metadata = buildMetadata(options);

  return {
    type: 'resource',
    resource: {
      uri,
      mimeType: 'text/html',
      text: htmlContent,
      ...(Object.keys(metadata).length > 0 && { _meta: metadata }),
    },
  };
}

/**
 * Helper function to build metadata object
 *
 * Merges user-provided metadata with MCP-UI conventions.
 * Converts structured metadata options into the flat _meta object
 * with namespaced keys following MCP-UI conventions.
 *
 * @param options - UI resource options containing metadata
 * @returns Flat metadata object with namespaced keys
 *
 * @internal
 */
function buildMetadata(options?: UIResourceOptions): Record<string, any> {
  const metadata: Record<string, any> = {};

  if (options?.metadata?.preferredFrameSize) {
    metadata['mcpui.dev/ui-preferred-frame-size'] =
      options.metadata.preferredFrameSize;
  }

  if (options?.metadata?.initialRenderData) {
    metadata['mcpui.dev/ui-initial-render-data'] =
      options.metadata.initialRenderData;
  }

  if (options?.annotations) {
    Object.assign(metadata, options.annotations);
  }

  return metadata;
}

/**
 * Create an external URL UI resource (Layer 2)
 *
 * Creates a UIResource object that points to an external URL to be
 * embedded in an iframe. The URL must be HTTPS (or localhost for dev).
 * External URLs are rendered with more permissive sandbox settings
 * to allow same-origin API calls.
 *
 * @param uri - Unique identifier (must start with "ui://")
 * @param url - HTTPS URL to embed in iframe
 * @param options - Optional metadata and annotations
 * @returns UIResource object ready for MCP response
 *
 * @throws {Error} If URI doesn't start with "ui://"
 * @throws {Error} If URL is not HTTPS or localhost
 *
 * @example
 * ```typescript
 * // External dashboard
 * const uiResource = createExternalURLResource(
 *   'ui://analytics/dashboard',
 *   'https://example.com/dashboard'
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Localhost for development
 * const uiResource = createExternalURLResource(
 *   'ui://dev/widget',
 *   'http://localhost:3000/widget'
 * );
 * ```
 */
export function createExternalURLResource(
  uri: string,
  url: string,
  options?: UIResourceOptions
): UIResource {
  // Validate URI starts with ui://
  if (!uri.startsWith('ui://')) {
    throw new Error(
      `Invalid UI resource URI: "${uri}". UI resource URIs must start with "ui://"`
    );
  }

  // Validate URL is HTTPS or localhost
  try {
    const urlObj = new URL(url);
    if (
      urlObj.protocol !== 'https:' &&
      urlObj.hostname !== 'localhost' &&
      urlObj.hostname !== '127.0.0.1'
    ) {
      throw new Error(
        `Invalid external URL: "${url}". Must be HTTPS or localhost (for development)`
      );
    }
  } catch (e) {
    throw new Error(
      `Invalid URL: "${url}". Error: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  // Build metadata if provided
  const metadata = buildMetadata(options);

  return {
    type: 'resource',
    resource: {
      uri,
      mimeType: 'text/uri-list',
      text: url,
      ...(Object.keys(metadata).length > 0 && { _meta: metadata }),
    },
  };
}

/**
 * Type guard to check if a resource is a UI resource
 *
 * Validates that a resource object has the correct structure and
 * MIME type to be considered a UI resource. Checks for:
 * - Correct object structure (type: 'resource')
 * - Valid UI MIME types (text/html, text/uri-list, or Remote DOM)
 *
 * @param resource - Object to check
 * @returns True if resource is a valid UI resource
 *
 * @example
 * ```typescript
 * const resource = createInlineHTMLResource('ui://test', '<div>Hello</div>');
 * if (isUIResource(resource)) {
 *   console.log('Valid UI resource:', resource.resource.uri);
 * }
 * ```
 */
export function isUIResource(resource: any): resource is UIResource {
  // Explicitly check for null and undefined
  if (resource === null || resource === undefined) {
    return false;
  }

  // Check object structure
  if (typeof resource !== 'object') {
    return false;
  }

  // Check type field
  if (resource.type !== 'resource') {
    return false;
  }

  // Check resource field exists
  if (!resource.resource || typeof resource.resource !== 'object') {
    return false;
  }

  // Check MIME type
  const mimeType = resource.resource.mimeType;
  if (typeof mimeType !== 'string') {
    return false;
  }

  // Check if it's a UI MIME type
  return (
    mimeType === 'text/html' ||
    mimeType === 'text/uri-list' ||
    mimeType.startsWith('application/vnd.mcp-ui.remote-dom')
  );
}

/**
 * Create a Remote DOM UI resource (Layer 3)
 *
 * Creates a UIResource object containing JavaScript that will be executed
 * in a Web Worker sandbox. The script uses the remoteDOM API to create
 * native-looking React components safely and securely.
 *
 * Security: The script runs in a Web Worker with no DOM access. It can only
 * communicate via a controlled postMessage protocol with whitelisted operations.
 *
 * @param uri - Unique identifier (must start with "ui://")
 * @param script - JavaScript code to execute in Web Worker sandbox
 * @param framework - Framework type (default: 'javascript')
 * @param options - Optional metadata and annotations
 * @returns RemoteDOMResource object ready for MCP response
 *
 * @throws {Error} If URI doesn't start with "ui://"
 *
 * @example
 * ```typescript
 * // Simple counter component
 * const script = `
 *   const card = remoteDOM.createElement('div', { style: { padding: '20px' } });
 *   const title = remoteDOM.createElement('h2');
 *   remoteDOM.setTextContent(title, 'Counter');
 *   remoteDOM.appendChild(card, title);
 *
 *   const display = remoteDOM.createElement('div', { id: 'count' });
 *   remoteDOM.setTextContent(display, '0');
 *   remoteDOM.appendChild(card, display);
 *
 *   const button = remoteDOM.createElement('button');
 *   remoteDOM.setTextContent(button, 'Increment');
 *   remoteDOM.addEventListener(button, 'click', () => {
 *     remoteDOM.callHost('notify', { level: 'info', message: 'Clicked!' });
 *   });
 *   remoteDOM.appendChild(card, button);
 * `;
 *
 * const resource = createRemoteDOMResource(
 *   'ui://counter/v1',
 *   script,
 *   'javascript'
 * );
 * ```
 *
 * @example
 * ```typescript
 * // With metadata for sizing hints
 * const resource = createRemoteDOMResource(
 *   'ui://dashboard/widget',
 *   dashboardScript,
 *   'javascript',
 *   {
 *     metadata: {
 *       preferredFrameSize: { width: 800, height: 600 }
 *     }
 *   }
 * );
 * ```
 */
export function createRemoteDOMResource(
  uri: string,
  script: string,
  framework: RemoteDOMFramework = 'javascript',
  options?: UIResourceOptions
): RemoteDOMResource {
  // Validate URI starts with ui://
  if (!uri.startsWith('ui://')) {
    throw new Error(
      `Invalid UI resource URI: "${uri}". UI resource URIs must start with "ui://"`
    );
  }

  // Build metadata if provided
  const metadata = buildMetadata(options);

  // Note: We do NOT validate script content here
  // Script is executed in Web Worker sandbox which is the security boundary
  // Invalid scripts will fail safely in the worker without crashing the host

  return {
    type: 'resource',
    resource: {
      uri,
      mimeType: `application/vnd.mcp-ui.remote-dom+${framework}`,
      text: script,
      ...(Object.keys(metadata).length > 0 && { _meta: metadata }),
    },
  };
}
