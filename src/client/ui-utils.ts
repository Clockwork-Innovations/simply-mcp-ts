/**
 * UI Utility Functions for Client-Side Rendering
 *
 * Security-focused utilities for rendering UI resources safely.
 * These functions handle content type detection, validation,
 * and secure iframe configuration.
 *
 * @module client/ui-utils
 */

import type { UIResourceContent, UIContentType, UIAction } from './ui-types.js';
import type { RemoteDOMFramework } from '../core/remote-dom-types.js';

// Re-export UIAction for convenient access
export type { UIAction } from './ui-types.js';

/**
 * Determine content type from MIME type
 *
 * Maps MCP MIME types to UI content types for routing to
 * the appropriate renderer component.
 *
 * @param mimeType - MIME type from resource
 * @returns Content type or null if unsupported
 *
 * @example
 * ```typescript
 * getContentType('text/html') // 'rawHtml'
 * getContentType('text/uri-list') // 'externalUrl'
 * getContentType('application/vnd.mcp-ui.remote-dom+javascript') // 'remoteDom'
 * getContentType('application/json') // null
 * ```
 */
export function getContentType(mimeType: string): UIContentType | null {
  if (mimeType === 'text/html') return 'rawHtml';
  if (mimeType === 'text/uri-list') return 'externalUrl';
  if (mimeType.startsWith('application/vnd.mcp-ui.remote-dom')) return 'remoteDom';
  return null;
}

/**
 * Extract framework parameter from Remote DOM MIME type
 *
 * Parses the framework parameter from MIME types like:
 * - `application/vnd.mcp-ui.remote-dom+javascript; framework=react`
 * - `application/vnd.mcp-ui.remote-dom+javascript; framework=webcomponents`
 *
 * Per MCP UI specification, the framework parameter is required for Remote DOM resources.
 * For backward compatibility, defaults to 'react' if the parameter is missing.
 *
 * @param mimeType - MIME type from resource
 * @returns Framework type ('react' | 'webcomponents') or null if invalid
 *
 * @example
 * ```typescript
 * getRemoteDOMFramework('application/vnd.mcp-ui.remote-dom+javascript; framework=react')
 * // 'react'
 *
 * getRemoteDOMFramework('application/vnd.mcp-ui.remote-dom+javascript; framework=webcomponents')
 * // 'webcomponents'
 *
 * getRemoteDOMFramework('application/vnd.mcp-ui.remote-dom+javascript')
 * // 'react' (default for backward compatibility)
 *
 * getRemoteDOMFramework('text/html')
 * // null (not a Remote DOM MIME type)
 *
 * getRemoteDOMFramework('application/vnd.mcp-ui.remote-dom+javascript; framework=invalid')
 * // null (invalid framework value)
 * ```
 */
export function getRemoteDOMFramework(mimeType: string): RemoteDOMFramework | null {
  // Only process Remote DOM MIME types
  if (!mimeType.startsWith('application/vnd.mcp-ui.remote-dom')) {
    return null;
  }

  // Parse MIME type parameters
  // Format: application/vnd.mcp-ui.remote-dom+javascript; framework=react
  const parts = mimeType.split(';');

  if (parts.length === 1) {
    // No parameters - default to 'react' for backward compatibility
    return 'react';
  }

  // Extract framework parameter
  for (let i = 1; i < parts.length; i++) {
    const param = parts[i].trim();
    const [key, value] = param.split('=').map(s => s.trim());

    if (key === 'framework') {
      // Validate framework value
      if (value === 'react' || value === 'webcomponents') {
        return value;
      }

      // Invalid framework value
      console.warn(`Invalid Remote DOM framework: ${value}. Must be 'react' or 'webcomponents'.`);
      return null;
    }
  }

  // Parameter 'framework' not found - default to 'react' for backward compatibility
  return 'react';
}

/**
 * Type guard for UI resources
 *
 * Validates that an object is a valid UI resource with the required
 * structure and a supported MIME type. Use this before attempting
 * to render a resource.
 *
 * @param resource - Object to validate
 * @returns True if resource is valid UI resource
 *
 * @example
 * ```typescript
 * const resource = {
 *   uri: 'ui://test',
 *   mimeType: 'text/html',
 *   text: '<div>Hello</div>'
 * };
 *
 * if (isUIResource(resource)) {
 *   // Safe to render
 *   return <UIResourceRenderer resource={resource} />;
 * }
 * ```
 */
export function isUIResource(resource: any): boolean {
  // Explicitly check for null/undefined first
  if (resource === null || resource === undefined) {
    return false;
  }

  // Check object structure
  return (
    typeof resource === 'object' &&
    typeof resource.uri === 'string' &&
    typeof resource.mimeType === 'string' &&
    getContentType(resource.mimeType) !== null
  );
}

/**
 * Extract HTML content for iframe
 *
 * Extracts HTML content from a UI resource, handling both text
 * and base64-encoded blob formats. Returns empty string if no
 * content is available or decoding fails.
 *
 * @param resource - UI resource content
 * @returns HTML string ready for iframe rendering
 *
 * @example
 * ```typescript
 * // From text
 * const resource1 = {
 *   uri: 'ui://test',
 *   mimeType: 'text/html',
 *   text: '<div>Hello</div>'
 * };
 * getHTMLContent(resource1) // '<div>Hello</div>'
 *
 * // From blob
 * const resource2 = {
 *   uri: 'ui://test',
 *   mimeType: 'text/html',
 *   blob: btoa('<div>Hello</div>')
 * };
 * getHTMLContent(resource2) // '<div>Hello</div>'
 * ```
 */
export function getHTMLContent(resource: UIResourceContent): string {
  // Prefer text content (most common)
  if (resource.text) {
    return resource.text;
  }

  // Fall back to blob if present
  if (resource.blob) {
    try {
      return atob(resource.blob);
    } catch (e) {
      console.error('Failed to decode UI resource blob:', e);
      return '';
    }
  }

  return '';
}

/**
 * Validate iframe origin (for postMessage security)
 *
 * CRITICAL SECURITY FUNCTION
 *
 * Validates that a postMessage origin is from a trusted source.
 * This MUST be called for every postMessage event received from iframes.
 *
 * Security rules:
 * - Accepts 'null' origin (srcdoc iframes have null origin)
 * - Accepts HTTPS origins in production
 * - Accepts localhost/127.0.0.1 for development
 * - Rejects all other origins
 *
 * @param origin - Origin from MessageEvent.origin
 * @returns True if origin is trusted
 *
 * @example
 * ```typescript
 * window.addEventListener('message', (event) => {
 *   // ALWAYS validate origin first
 *   if (!validateOrigin(event.origin)) {
 *     console.warn('Rejected message from untrusted origin:', event.origin);
 *     return;
 *   }
 *
 *   // Safe to process message
 *   handleUIAction(event.data);
 * });
 * ```
 */
export function validateOrigin(origin: string): boolean {
  // srcdoc iframes have null origin - this is expected and safe
  // because srcdoc content is under our control
  if (origin === 'null') return true;

  // Validate external URLs
  try {
    const url = new URL(origin);

    // HTTPS is required in production
    if (url.protocol === 'https:') return true;

    // Allow HTTP only for localhost in development
    if (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    ) {
      return true;
    }

    // Reject everything else
    return false;
  } catch {
    // Invalid URL - reject
    return false;
  }
}

/**
 * Props for UIResourceRenderer component
 *
 * Matches the official MCP-UI client API specification.
 * Supports both direct callback handlers and HTML-specific configuration.
 *
 * @example
 * ```typescript
 * <UIResourceRenderer
 *   resource={uiResource}
 *   onUIAction={(action) => handleAction(action)}
 *   htmlProps={{
 *     style: { width: '100%', height: '600px' },
 *     autoResize: true,
 *     className: 'custom-ui-frame'
 *   }}
 * />
 * ```
 */
export interface UIResourceRendererProps {
  /**
   * UI resource to render
   */
  resource: UIResourceContent;

  /**
   * Callback for UI actions
   * Provides direct prop-based action handling to match official MCP-UI API.
   * If not provided, falls back to context-based handling (backward compatible).
   *
   * @param action - UI action from iframe (tool call, notify, link, etc.)
   * @returns Result to send back to iframe, or Promise of result
   *
   * @example
   * ```typescript
   * onUIAction={(action) => {
   *   if (action.type === 'tool') {
   *     return executeToolCall(action.payload.toolName, action.payload.params);
   *   }
   * }}
   * ```
   */
  onUIAction?: (action: UIAction) => void | Promise<void>;

  /**
   * HTML-specific rendering configuration
   * Applied to iframe containers for text/html and text/uri-list resources.
   *
   * @example
   * ```typescript
   * htmlProps={{
   *   style: { width: '100%', height: '600px', border: '1px solid #ccc' },
   *   autoResize: true,
   *   className: 'ui-resource-iframe'
   * }}
   * ```
   */
  htmlProps?: {
    /**
     * Custom CSS styles for iframe container
     * Merged with default styles (defaults can be overridden)
     */
    style?: React.CSSProperties;

    /**
     * Enable automatic iframe height adjustment based on content
     * When true, uses ResizeObserver to detect content height changes.
     * Default: false for security and performance
     */
    autoResize?: boolean;

    /**
     * CSS class name for iframe container
     * Allows external styling via CSS
     */
    className?: string;
  };

  /**
   * Remote DOM configuration (Layer 3+)
   * Not yet implemented - reserved for future remote-dom support.
   *
   * Will support:
   * - Component library mapping
   * - Custom element definitions
   * - Framework selection (React, Web Components)
   */
  remoteDomProps?: {
    library?: any;
    elementDefinitions?: Record<string, any>;
  };
}

/**
 * Build iframe sandbox attribute
 *
 * CRITICAL SECURITY FUNCTION
 *
 * Constructs the sandbox attribute string for iframes based on content type.
 * The sandbox attribute restricts iframe capabilities to prevent malicious code.
 *
 * Sandbox policies:
 * - Inline HTML: 'allow-scripts' only (minimal permissions)
 * - External URLs: 'allow-scripts allow-same-origin' (needed for XHR/fetch)
 * - Custom: Use provided permissions (advanced use cases)
 *
 * Security notes:
 * - Never add 'allow-same-origin' for inline HTML (can escape sandbox)
 * - Never add 'allow-top-navigation' (prevents UI hijacking)
 * - Never add 'allow-popups' unless explicitly needed
 * - Never add 'allow-forms' unless forms are validated server-side
 *
 * @param isExternalUrl - True if iframe loads external URL
 * @param customPermissions - Optional custom sandbox permissions
 * @returns Sandbox attribute string
 *
 * @example
 * ```typescript
 * // For inline HTML (most restrictive)
 * buildSandboxAttribute(false) // 'allow-scripts'
 *
 * // For external URLs (needs same-origin for API calls)
 * buildSandboxAttribute(true) // 'allow-scripts allow-same-origin'
 *
 * // Custom permissions (advanced)
 * buildSandboxAttribute(false, 'allow-scripts allow-forms')
 * // 'allow-scripts allow-forms'
 * ```
 */
export function buildSandboxAttribute(
  isExternalUrl: boolean,
  customPermissions?: string
): string {
  // Custom permissions override everything (use with caution)
  if (customPermissions) {
    return customPermissions;
  }

  // For inline HTML: Minimal permissions
  // Only allow scripts to run, no same-origin access
  // This prevents the iframe from accessing parent DOM or making same-origin requests
  if (!isExternalUrl) {
    return 'allow-scripts';
  }

  // For external URLs: Need same-origin for XHR/fetch to own domain
  // External URLs might need to make API calls to their own origin
  // Still no forms, popups, or navigation to prevent abuse
  return 'allow-scripts allow-same-origin';
}
