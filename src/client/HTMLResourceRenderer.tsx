/**
 * HTML Resource Renderer Component
 *
 * React component for rendering HTML UI resources in sandboxed iframes.
 * Supports both inline HTML (via srcdoc) and external URLs (via src).
 *
 * Security:
 * - All content rendered in sandboxed iframes
 * - Inline HTML uses 'allow-scripts' only (no same-origin access)
 * - External URLs use 'allow-scripts allow-same-origin' (for API calls)
 * - All postMessage origins validated before processing
 *
 * Layer 5 Enhancement: Loading states and auto-resize documentation.
 * - Shows loading indicator for external URLs
 * - Documents auto-resize approach for future implementation
 *
 * @module client/HTMLResourceRenderer
 */

import React, { useRef, useEffect, useState } from 'react';
import type { UIResourceContent, UIActionResult, UIAction } from './ui-types.js';
import {
  getHTMLContent,
  buildSandboxAttribute,
  validateOrigin,
} from './ui-utils.js';

/**
 * Props for HTMLResourceRenderer component
 */
export interface HTMLResourceRendererProps {
  /**
   * UI resource to render
   */
  resource: UIResourceContent;

  /**
   * Callback for UI actions (Layer 2+)
   * Called when iframe sends postMessage with action.
   * Now accepts UIAction type to match official MCP-UI API.
   */
  onUIAction?: (action: UIAction | UIActionResult) => void | Promise<void>;

  /**
   * Whether this is an external URL (vs inline HTML)
   * Affects sandbox permissions
   */
  isExternalUrl?: boolean;

  /**
   * Custom sandbox permissions (advanced use cases)
   * Overrides default sandbox attribute
   */
  customSandboxPermissions?: string;

  /**
   * HTML-specific rendering configuration (official MCP-UI API)
   * Applied to iframe containers. Includes style, autoResize, and className.
   */
  htmlProps?: {
    style?: React.CSSProperties;
    autoResize?: boolean;
    className?: string;
    customCSP?: string;
    sandbox?: string;
    allowFullscreen?: boolean;
    referrerPolicy?: React.HTMLAttributeReferrerPolicy;
    loading?: 'lazy' | 'eager';
    title?: string;
    id?: string;
    minHeight?: number;
    maxHeight?: number;
  };

  /**
   * @deprecated Use htmlProps.autoResize instead
   * Enable auto-resize based on iframe content (Layer 2+)
   * Not implemented in Foundation Layer
   */
  autoResize?: boolean;

  /**
   * @deprecated Use htmlProps.style instead
   * Custom iframe styles
   * Merges with default styles
   */
  style?: React.CSSProperties;
}

/**
 * HTML Resource Renderer
 *
 * Renders HTML content in a sandboxed iframe with security controls.
 * Handles postMessage communication for interactive UIs (Layer 2+).
 *
 * @example
 * ```typescript
 * // Inline HTML
 * const resource = {
 *   uri: 'ui://product-card',
 *   mimeType: 'text/html',
 *   text: '<div><h2>Product Card</h2><button>Add to Cart</button></div>'
 * };
 *
 * <HTMLResourceRenderer
 *   resource={resource}
 *   onUIAction={(action) => {
 *     console.log('Action received:', action);
 *   }}
 * />
 * ```
 *
 * @example
 * ```typescript
 * // External URL
 * const resource = {
 *   uri: 'ui://external-widget',
 *   mimeType: 'text/uri-list',
 *   text: 'https://example.com/widget'
 * };
 *
 * <HTMLResourceRenderer
 *   resource={resource}
 *   isExternalUrl={true}
 *   onUIAction={(action) => {
 *     console.log('Action received:', action);
 *   }}
 * />
 * ```
 */
export const HTMLResourceRenderer: React.FC<HTMLResourceRendererProps> = ({
  resource,
  onUIAction,
  isExternalUrl = false,
  customSandboxPermissions,
  htmlProps,
  // Deprecated props (maintain backward compatibility)
  autoResize: deprecatedAutoResize = true,
  style: deprecatedStyle,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isExternalUrl);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(
    htmlProps?.minHeight ?? 500
  );

  // Merge htmlProps with deprecated props (htmlProps takes precedence)
  const finalAutoResize = htmlProps?.autoResize ?? deprecatedAutoResize;
  const finalStyle = htmlProps?.style ?? deprecatedStyle;
  const finalClassName = htmlProps?.className;

  // Layer 5: Handle iframe load events for external URLs
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !isExternalUrl) return;

    const handleLoad = () => {
      setIsLoading(false);
      setLoadError(null);
    };

    const handleError = () => {
      setIsLoading(false);
      setLoadError('Failed to load external URL');
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [isExternalUrl]);

  // Layer 5: Auto-resize implementation approach (documented for future enhancement)
  //
  // AUTO-RESIZE STRATEGY:
  // There are two main approaches to implement auto-resizing iframes:
  //
  // 1. ResizeObserver (Modern, Recommended):
  //    - Use postMessage from iframe to send content height
  //    - Inside iframe: Use ResizeObserver to detect size changes
  //    - Send message: window.parent.postMessage({ type: 'resize', height: ... })
  //    - Parent listens and updates iframe height
  //    - Pros: Accurate, works with dynamic content
  //    - Cons: Requires iframe cooperation, security considerations
  //
  // 2. Mutation Observer + Polling (Fallback):
  //    - Similar to ResizeObserver but polls periodically
  //    - Works with older browsers
  //    - Less performant but more compatible
  //
  // EXAMPLE IMPLEMENTATION:
  // ```typescript
  // // In iframe (injected script or provided by UI resource):
  // const observer = new ResizeObserver(entries => {
  //   const height = document.body.scrollHeight;
  //   window.parent.postMessage({
  //     type: 'mcp-ui-resize',
  //     height
  //   }, '*');
  // });
  // observer.observe(document.body);
  //
  // // In parent (HTMLResourceRenderer):
  // useEffect(() => {
  //   const handleResize = (event: MessageEvent) => {
  //     if (event.data?.type === 'mcp-ui-resize') {
  //       if (iframeRef.current) {
  //         iframeRef.current.style.height = `${event.data.height}px`;
  //       }
  //     }
  //   };
  //   window.addEventListener('message', handleResize);
  //   return () => window.removeEventListener('message', handleResize);
  // }, []);
  // ```
  //
  // SECURITY CONSIDERATIONS:
  // - Always validate message origin before processing
  // - Set reasonable min/max height limits (e.g., 100px - 2000px)
  // - Rate-limit resize events to prevent DoS
  // - Only process resize messages from trusted origins
  //
  // FUTURE ENHANCEMENT:
  // When implementing, add:
  // - `enableAutoResize` prop (default: false for security)
  // - `minHeight` and `maxHeight` props for constraints
  // - `resizeDebounce` prop to control update frequency
  // - Origin validation in resize message handler
  //
  // Implement auto-resize using postMessage
  useEffect(() => {
    if (!finalAutoResize) return;

    const handleResizeMessage = (event: MessageEvent) => {
      // Validate the message is from our iframe
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      // Handle resize message
      if (event.data?.type === 'ui-resize' && typeof event.data.height === 'number') {
        let newHeight = event.data.height;

        // Apply min/max constraints
        if (htmlProps?.minHeight && newHeight < htmlProps.minHeight) {
          newHeight = htmlProps.minHeight;
        }
        if (htmlProps?.maxHeight && newHeight > htmlProps.maxHeight) {
          newHeight = htmlProps.maxHeight;
        }

        setIframeHeight(newHeight);
      }
    };

    window.addEventListener('message', handleResizeMessage);
    return () => window.removeEventListener('message', handleResizeMessage);
  }, [finalAutoResize, htmlProps?.minHeight, htmlProps?.maxHeight]);

  // Set up postMessage listener for iframe communication (Layer 2 Enhanced)
  useEffect(() => {
    /**
     * Handle postMessage from iframe
     *
     * SECURITY CRITICAL: Always validate origin before processing
     *
     * Layer 2 Enhancement: Now handles multiple action types:
     * - tool: Execute MCP tool
     * - notify: Show notification
     * - link: Navigate to URL
     * - prompt: Trigger MCP prompt
     * - intent: Platform-specific intent
     */
    const handleMessage = (event: MessageEvent) => {
      // SECURITY: Validate origin first
      if (!validateOrigin(event.origin)) {
        console.warn(
          `[MCP-UI Security] Rejected postMessage from untrusted origin: ${event.origin}`
        );
        return;
      }

      // Validate message structure
      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }

      // Check if this is a UI action (has type field)
      if (!data.type || typeof data.type !== 'string') {
        return;
      }

      console.log('[MCP-UI] Action received:', data);

      // Extract messageId for response handling
      const messageId = data.messageId;
      const iframe = iframeRef.current;

      // Send acknowledgment immediately (spec-compliant)
      if (messageId && iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage(
            {
              type: 'ui-message-received',
              messageId: messageId,
            },
            '*'
          );
        } catch (error) {
          console.error('[MCP-UI] Error sending acknowledgment:', error);
        }
      }

      // Route action based on type
      if (onUIAction) {
        try {
          // Handle different action types
          let actionResult: any;

          switch (data.type) {
            case 'tool':
              // Tool call action: should trigger MCP tool execution
              actionResult = onUIAction({
                type: 'tool',
                payload: data.payload || {},
              });
              break;

            case 'notify':
              // Notification action: show user notification
              actionResult = onUIAction({
                type: 'notify',
                payload: data.payload || {},
              });
              break;

            case 'link':
              // Link navigation action
              actionResult = onUIAction({
                type: 'link',
                payload: data.payload || {},
              });
              break;

            case 'prompt':
              // Prompt action: trigger MCP prompt
              actionResult = onUIAction({
                type: 'prompt',
                payload: data.payload || {},
              });
              break;

            case 'intent':
              // Intent action: platform-specific handling
              actionResult = onUIAction({
                type: 'intent',
                payload: data.payload || {},
              });
              break;

            default:
              // Unknown action type - log warning but don't fail
              console.warn('[MCP-UI] Unknown action type:', data.type);
              // Still pass through in case client wants to handle it
              actionResult = onUIAction(data);
              break;
          }

          // Send response if messageId present and action returned a result
          if (messageId && iframe?.contentWindow) {
            // Handle both sync and async results
            Promise.resolve(actionResult)
              .then((result) => {
                iframe.contentWindow!.postMessage(
                  {
                    type: 'ui-message-response',
                    messageId: messageId,
                    result: result,
                  },
                  '*'
                );
              })
              .catch((error) => {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                iframe.contentWindow!.postMessage(
                  {
                    type: 'ui-message-response',
                    messageId: messageId,
                    error: errorMessage,
                  },
                  '*'
                );
              });
          }
        } catch (error) {
          console.error('[MCP-UI] Error handling UI action:', error);

          // Send error response if messageId present
          if (messageId && iframe?.contentWindow) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            try {
              iframe.contentWindow.postMessage(
                {
                  type: 'ui-message-response',
                  messageId: messageId,
                  error: errorMessage,
                },
                '*'
              );
            } catch (postError) {
              console.error('[MCP-UI] Error sending error response:', postError);
            }
          }
        }
      }
    };

    // Register listener
    window.addEventListener('message', handleMessage);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onUIAction]);

  // Build sandbox attribute based on content type
  const sandbox = buildSandboxAttribute(isExternalUrl, customSandboxPermissions);

  // Helper function to inject auto-resize script into HTML
  const injectAutoResizeScript = (html: string): string => {
    const script = `
      <script>
        (function() {
          let lastHeight = 0;

          function reportHeight() {
            const height = Math.max(
              document.body.scrollHeight,
              document.body.offsetHeight,
              document.documentElement.clientHeight,
              document.documentElement.scrollHeight,
              document.documentElement.offsetHeight
            );

            // Only send message if height changed
            if (height !== lastHeight) {
              lastHeight = height;
              window.parent.postMessage({ type: 'ui-resize', height }, '*');
            }
          }

          // Report on load
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', reportHeight);
          } else {
            reportHeight();
          }

          // Use ResizeObserver if available
          if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(reportHeight);
            observer.observe(document.body);
          } else {
            // Fallback: MutationObserver + polling
            const observer = new MutationObserver(reportHeight);
            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true,
            });

            // Periodic check as additional fallback
            setInterval(reportHeight, 500);
          }

          // Report on window resize
          window.addEventListener('resize', reportHeight);
        })();
      </script>
    `;

    // Inject before closing body tag, or at end if no body tag
    if (html.includes('</body>')) {
      return html.replace('</body>', `${script}</body>`);
    } else if (html.includes('</html>')) {
      return html.replace('</html>', `${script}</html>`);
    } else {
      return html + script;
    }
  };

  // Helper function to inject custom CSP
  const injectCustomCSP = (html: string, csp: string): string => {
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;

    // Try to inject in <head>
    if (html.includes('</head>')) {
      return html.replace('</head>', `${cspMeta}</head>`);
    } else if (html.includes('<html>')) {
      return html.replace('<html>', `<html><head>${cspMeta}</head>`);
    } else {
      // No proper HTML structure, prepend
      return cspMeta + html;
    }
  };

  // Default iframe styles
  const defaultStyle: React.CSSProperties = {
    width: '100%',
    height: finalAutoResize ? `${iframeHeight}px` : '500px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#fff',
  };

  // Merge custom styles (htmlProps.style takes precedence over deprecated style prop)
  const mergedStyle = { ...defaultStyle, ...finalStyle };

  // Layer 5: Show loading error if external URL failed
  if (loadError) {
    return (
      <div
        style={{
          padding: '16px',
          color: '#d32f2f',
          backgroundColor: '#ffebee',
          borderRadius: '4px',
          border: '1px solid #ef5350',
        }}
        role="alert"
        aria-live="assertive"
      >
        <strong>Loading Error:</strong> {loadError}
        <p style={{ marginTop: '8px', fontSize: '14px' }}>
          URL: <code>{resource.text}</code>
        </p>
      </div>
    );
  }

  // Render external URL iframe
  if (isExternalUrl && resource.text) {
    return (
      <div
        ref={containerRef}
        className={finalClassName}
        style={{ position: 'relative' }}
      >
        {/* Layer 5: Loading overlay for external URLs */}
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              gap: '12px',
              zIndex: 1,
            }}
            role="status"
            aria-live="polite"
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                border: '3px solid #e0e0e0',
                borderTop: '3px solid #1976d2',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div style={{ fontSize: '14px', color: '#666' }}>
              Loading external resource...
            </div>
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={resource.text}
          sandbox={sandbox as any}
          style={mergedStyle}
          title={resource.uri}
          aria-label={`UI Resource: ${resource.uri}`}
        />
      </div>
    );
  }

  // Render inline HTML iframe
  let htmlContent = getHTMLContent(resource);

  // Handle empty content
  if (!htmlContent) {
    return (
      <div
        style={{
          padding: '16px',
          color: '#666',
          textAlign: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
        }}
        role="alert"
      >
        No content available for {resource.uri}
      </div>
    );
  }

  // Process HTML content: inject auto-resize and custom CSP if needed
  if (finalAutoResize) {
    htmlContent = injectAutoResizeScript(htmlContent);
  }

  if (htmlProps?.customCSP) {
    htmlContent = injectCustomCSP(htmlContent, htmlProps.customCSP);
  }

  // Use htmlProps for additional attributes if provided
  const finalSandbox = htmlProps?.sandbox || customSandboxPermissions || sandbox;
  const finalTitle = htmlProps?.title || resource.uri;
  const finalId = htmlProps?.id;
  const finalLoading = htmlProps?.loading ?? 'lazy';
  const finalReferrerPolicy = htmlProps?.referrerPolicy ?? 'strict-origin-when-cross-origin';

  return (
    <div
      ref={containerRef}
      className={finalClassName}
      style={{ position: 'relative' }}
    >
      <iframe
        ref={iframeRef}
        sandbox={finalSandbox as any}
        srcDoc={htmlContent}
        style={mergedStyle}
        title={finalTitle}
        id={finalId}
        loading={finalLoading}
        referrerPolicy={finalReferrerPolicy}
        allowFullScreen={htmlProps?.allowFullscreen}
        aria-label={`UI Resource: ${resource.uri}`}
      />
    </div>
  );
};

export default HTMLResourceRenderer;
