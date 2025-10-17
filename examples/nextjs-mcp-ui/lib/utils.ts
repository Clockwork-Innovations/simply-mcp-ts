/**
 * Utility Functions for MCP-UI Layer 1 Demo
 *
 * Helper functions for resource validation, creation, and network simulation.
 *
 * @module lib/utils
 */

import type { UIResourceContent } from '../../../src/client/ui-types.js';

/**
 * Validate that an object is a valid UIResourceContent
 *
 * Checks for required fields and proper structure according to MCP-UI spec.
 *
 * @param obj - Object to validate
 * @returns true if valid UIResourceContent, false otherwise
 *
 * @example
 * ```typescript
 * const resource = { uri: 'ui://test', mimeType: 'text/html', text: '<div>Test</div>' };
 * if (isValidUIResource(resource)) {
 *   // Safe to use as UIResourceContent
 * }
 * ```
 */
export function isValidUIResource(obj: any): obj is UIResourceContent {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Required fields
  if (typeof obj.uri !== 'string' || !obj.uri) {
    return false;
  }

  if (typeof obj.mimeType !== 'string' || !obj.mimeType) {
    return false;
  }

  // Must have either text or blob content
  if (typeof obj.text !== 'string' && typeof obj.blob !== 'string') {
    return false;
  }

  // _meta is optional but must be an object if present
  if (obj._meta !== undefined && (typeof obj._meta !== 'object' || obj._meta === null)) {
    return false;
  }

  return true;
}

/**
 * Create a valid HTML UIResourceContent object
 *
 * Helper function to create properly structured HTML resources for demos.
 *
 * @param uri - Resource URI (must start with 'ui://')
 * @param name - Display name for the resource
 * @param description - Description of the resource
 * @param html - HTML content to render
 * @param meta - Optional metadata (e.g., preferred frame size)
 * @returns Valid UIResourceContent object
 *
 * @example
 * ```typescript
 * const resource = createHTMLResource(
 *   'ui://my-card',
 *   'My Card',
 *   'A simple card',
 *   '<div>Hello World</div>',
 *   { 'mcpui.dev/ui-preferred-frame-size': { width: 400, height: 300 } }
 * );
 * ```
 */
export function createHTMLResource(
  uri: string,
  name: string,
  description: string,
  html: string,
  meta?: Record<string, any>
): UIResourceContent {
  // Ensure URI starts with ui://
  if (!uri.startsWith('ui://')) {
    uri = `ui://${uri}`;
  }

  // Build complete HTML document if not already a full document
  let fullHtml = html.trim();
  if (!fullHtml.toLowerCase().includes('<!doctype html>')) {
    fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
</head>
<body>
  ${html}
</body>
</html>`;
  }

  return {
    uri,
    mimeType: 'text/html',
    text: fullHtml,
    _meta: meta || {},
  };
}

/**
 * Simulate network delay for realistic demo behavior
 *
 * Returns a promise that resolves after a random delay within the specified range.
 *
 * @param minMs - Minimum delay in milliseconds (default: 200)
 * @param maxMs - Maximum delay in milliseconds (default: 500)
 * @returns Promise that resolves after the delay
 *
 * @example
 * ```typescript
 * await simulateNetworkDelay(100, 300);
 * console.log('Delayed by 100-300ms');
 * ```
 */
export function simulateNetworkDelay(minMs: number = 200, maxMs: number = 500): Promise<void> {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Format a path string into a proper ui:// URI
 *
 * Ensures the path is formatted correctly for MCP-UI resources.
 *
 * @param path - Path string (with or without ui:// prefix)
 * @returns Formatted URI
 *
 * @example
 * ```typescript
 * formatResourceUri('product-card') // 'ui://product-card'
 * formatResourceUri('ui://product-card') // 'ui://product-card'
 * formatResourceUri('/product-card') // 'ui://product-card'
 * ```
 */
export function formatResourceUri(path: string): string {
  // Remove leading slashes
  path = path.replace(/^\/+/, '');

  // Return as-is if already formatted
  if (path.startsWith('ui://')) {
    return path;
  }

  return `ui://${path}`;
}

/**
 * Extract resource ID from URI
 *
 * Gets the resource identifier from a ui:// URI.
 *
 * @param uri - Resource URI
 * @returns Resource ID or null if invalid
 *
 * @example
 * ```typescript
 * extractResourceId('ui://product-card/v1') // 'product-card/v1'
 * extractResourceId('ui://simple-card') // 'simple-card'
 * extractResourceId('invalid') // null
 * ```
 */
export function extractResourceId(uri: string): string | null {
  if (!uri.startsWith('ui://')) {
    return null;
  }

  return uri.slice(5); // Remove 'ui://' prefix
}

/**
 * Sanitize HTML content
 *
 * Basic HTML sanitization for user-provided content.
 * Note: The iframe sandbox provides primary security, this is defense in depth.
 *
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML
 *
 * @example
 * ```typescript
 * const unsafe = '<script>alert("xss")</script><div>Hello</div>';
 * const safe = sanitizeHTML(unsafe); // '<div>Hello</div>'
 * ```
 */
export function sanitizeHTML(html: string): string {
  let sanitized = html;

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*"[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*'[^']*'/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  return sanitized;
}

/**
 * Get resource content size in bytes
 *
 * Calculates the approximate size of the resource content.
 *
 * @param resource - UIResourceContent object
 * @returns Size in bytes
 *
 * @example
 * ```typescript
 * const resource = { uri: 'ui://test', mimeType: 'text/html', text: '<div>Test</div>' };
 * const size = getResourceSize(resource); // ~15 bytes
 * ```
 */
export function getResourceSize(resource: UIResourceContent): number {
  let size = 0;

  if (resource.text) {
    size += new Blob([resource.text]).size;
  }

  if (resource.blob) {
    // Base64 encoded, approximate original size
    size += Math.ceil((resource.blob.length * 3) / 4);
  }

  return size;
}

/**
 * Format bytes to human-readable string
 *
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1.5 KB")
 *
 * @example
 * ```typescript
 * formatBytes(1024) // '1.00 KB'
 * formatBytes(1536, 1) // '1.5 KB'
 * formatBytes(1048576) // '1.00 MB'
 * ```
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Check if resource is HTML type
 *
 * @param resource - UIResourceContent object
 * @returns true if HTML resource, false otherwise
 */
export function isHTMLResource(resource: UIResourceContent): boolean {
  return resource.mimeType === 'text/html';
}

/**
 * Check if resource is external URL type
 *
 * @param resource - UIResourceContent object
 * @returns true if external URL resource, false otherwise
 */
export function isExternalURLResource(resource: UIResourceContent): boolean {
  return resource.mimeType === 'text/uri-list';
}

/**
 * Check if resource is Remote DOM type
 *
 * @param resource - UIResourceContent object
 * @returns true if Remote DOM resource, false otherwise
 */
export function isRemoteDOMResource(resource: UIResourceContent): boolean {
  return resource.mimeType === 'application/vnd.mcp-ui.remote-dom+javascript';
}

/**
 * Get preferred frame size from resource metadata
 *
 * @param resource - UIResourceContent object
 * @returns Frame size or default values
 */
export function getPreferredFrameSize(resource: UIResourceContent): {
  width: number;
  height: number;
} {
  const meta = resource._meta?.['mcpui.dev/ui-preferred-frame-size'];

  if (meta && typeof meta === 'object') {
    return {
      width: meta.width || 600,
      height: meta.height || 400,
    };
  }

  return { width: 600, height: 400 };
}

/**
 * Create a deep clone of a resource
 *
 * @param resource - UIResourceContent to clone
 * @returns Cloned resource
 */
export function cloneResource(resource: UIResourceContent): UIResourceContent {
  return JSON.parse(JSON.stringify(resource));
}
