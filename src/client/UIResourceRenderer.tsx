/**
 * Main UI Resource Renderer Component
 *
 * Router component that detects resource type and renders the appropriate
 * specialized renderer. This is the main entry point for rendering UI resources.
 *
 * Foundation Layer: Only supports inline HTML (text/html)
 * Layer 2: Will add external URL support (text/uri-list)
 * Layer 3: Will add Remote DOM support (application/vnd.mcp-ui.remote-dom+javascript)
 *
 * @module client/UIResourceRenderer
 */

import React from 'react';
import HTMLResourceRenderer from './HTMLResourceRenderer.js';
import RemoteDOMRenderer from './RemoteDOMRenderer.js';
import type { UIResourceContent, UIActionResult, UIAction } from './ui-types.js';
import { getContentType, getRemoteDOMFramework, isUIResource, type UIResourceRendererProps } from './ui-utils.js';

// Re-export props type for convenience
export type { UIResourceRendererProps } from './ui-utils.js';

/**
 * Main UI Resource Renderer
 *
 * Automatically detects resource type from MIME type and renders
 * the appropriate component. Validates resources before rendering
 * and provides helpful error messages for unsupported types.
 *
 * Layer 5 Enhancement: Comprehensive error handling with graceful degradation.
 * All rendering errors are caught and displayed with user-friendly messages
 * while logging technical details for debugging.
 *
 * Supported types in Foundation Layer:
 * - text/html: Inline HTML (rawHtml)
 *
 * Coming in later layers:
 * - text/uri-list: External URLs (Layer 2)
 * - application/vnd.mcp-ui.remote-dom+javascript: Remote DOM (Layer 3)
 *
 * @example
 * ```typescript
 * // Basic usage
 * const resource = {
 *   uri: 'ui://product-card',
 *   mimeType: 'text/html',
 *   text: '<div><h2>Product Card</h2></div>'
 * };
 *
 * <UIResourceRenderer resource={resource} />
 * ```
 *
 * @example
 * ```typescript
 * // With action handler (Layer 2+)
 * <UIResourceRenderer
 *   resource={resource}
 *   onUIAction={async (action) => {
 *     if (action.type === 'tool') {
 *       const result = await executeToolCall(action.payload);
 *       return result;
 *     }
 *   }}
 * />
 * ```
 *
 * @example
 * ```typescript
 * // With custom styling
 * <UIResourceRenderer
 *   resource={resource}
 *   style={{ height: '600px', maxWidth: '800px' }}
 * />
 * ```
 */
export const UIResourceRenderer: React.FC<UIResourceRendererProps> = (props) => {
  const {
    resource,
    onUIAction,
    htmlProps,
    remoteDomProps,
  } = props;
  // Layer 5: Error boundary - wrap all rendering logic in try-catch
  try {
    // Validate resource structure
    if (!isUIResource(resource)) {
      return (
        <div
          style={{
            color: '#d32f2f',
            padding: '16px',
            backgroundColor: '#ffebee',
            borderRadius: '4px',
            border: '1px solid #ef5350',
            fontFamily: 'monospace',
          }}
          role="alert"
          aria-live="assertive"
        >
          <strong>Invalid UI Resource</strong>
          <p style={{ marginTop: '8px', fontSize: '14px' }}>
            The resource does not have the required structure for UI rendering.
          </p>
          <details style={{ marginTop: '12px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
              Resource Details
            </summary>
            <pre style={{ marginTop: '8px', fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(resource, null, 2)}
            </pre>
          </details>
        </div>
      );
    }

    // Determine content type from MIME type
    const contentType = getContentType(resource.mimeType);

    // Foundation Layer: Inline HTML support (rawHtml)
    if (contentType === 'rawHtml') {
      return (
        <HTMLResourceRenderer
          resource={resource}
          onUIAction={onUIAction}
          isExternalUrl={false}
          htmlProps={htmlProps}
        />
      );
    }

    // Layer 2: External URLs (text/uri-list)
    if (contentType === 'externalUrl') {
      return (
        <HTMLResourceRenderer
          resource={resource}
          onUIAction={onUIAction}
          isExternalUrl={true}
          htmlProps={htmlProps}
        />
      );
    }

    // Layer 3: Remote DOM (application/vnd.mcp-ui.remote-dom+javascript)
    if (contentType === 'remoteDom') {
      // Extract framework parameter from MIME type
      const framework = getRemoteDOMFramework(resource.mimeType);

      // If framework is invalid (null), show error
      if (!framework) {
        return (
          <div
            style={{
              color: '#d32f2f',
              padding: '16px',
              backgroundColor: '#ffebee',
              borderRadius: '4px',
              border: '1px solid #ef5350',
            }}
            role="alert"
            aria-live="assertive"
          >
            <strong>Invalid Remote DOM Framework</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
              MIME type: <code>{resource.mimeType}</code>
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
              The framework parameter must be either 'react' or 'webcomponents'.
            </p>
          </div>
        );
      }

      return (
        <RemoteDOMRenderer
          resource={resource}
          onUIAction={onUIAction}
          framework={framework}
          remoteDomProps={remoteDomProps}
        />
      );
    }

    // Unsupported resource type
    return (
      <div
        style={{
          color: '#d32f2f',
          padding: '16px',
          backgroundColor: '#ffebee',
          borderRadius: '4px',
          border: '1px solid #ef5350',
          textAlign: 'center',
        }}
        role="alert"
        aria-live="assertive"
      >
        <strong>Unsupported UI Resource Type</strong>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
          MIME type: <code>{resource.mimeType}</code>
        </p>
        <details style={{ marginTop: '12px', textAlign: 'left' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
            Supported Types
          </summary>
          <ul style={{ fontSize: '14px', marginTop: '8px' }}>
            <li>
              <code>text/html</code> - Inline HTML (Foundation Layer)
            </li>
            <li>
              <code>text/uri-list</code> - External URLs (Layer 2)
            </li>
            <li>
              <code>application/vnd.mcp-ui.remote-dom+javascript</code> - Remote
              DOM (Layer 3)
            </li>
          </ul>
        </details>
      </div>
    );
  } catch (error) {
    // Layer 5: Graceful error handling
    // Log error to console for debugging
    console.error('[MCP-UI] Error rendering UI resource:', error);
    console.error('[MCP-UI] Resource that caused error:', resource);

    // Display user-friendly error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    return (
      <div
        style={{
          color: '#d32f2f',
          padding: '16px',
          backgroundColor: '#ffebee',
          borderRadius: '4px',
          border: '1px solid #ef5350',
        }}
        role="alert"
        aria-live="assertive"
      >
        <strong>UI Rendering Error</strong>
        <p style={{ marginTop: '8px', fontSize: '14px' }}>
          An error occurred while rendering this UI resource. Please check the console for details.
        </p>
        <details style={{ marginTop: '12px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
            Error Details
          </summary>
          <div style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>
              <strong>Resource URI:</strong> <code>{resource?.uri || 'unknown'}</code>
            </p>
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>
              <strong>Error:</strong> <code>{errorMessage}</code>
            </p>
            {errorStack && (
              <details style={{ marginTop: '8px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '12px' }}>
                  Stack Trace
                </summary>
                <pre style={{
                  fontSize: '11px',
                  overflow: 'auto',
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                }}>
                  {errorStack}
                </pre>
              </details>
            )}
          </div>
        </details>
      </div>
    );
  }
};

export default UIResourceRenderer;
