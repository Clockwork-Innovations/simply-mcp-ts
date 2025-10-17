/**
 * UI Resource Types for MCP-UI Foundation Layer
 *
 * These types define the structure for UI resources that can be rendered
 * in MCP clients. UI resources support multiple content types:
 * - rawHtml: Inline HTML content rendered in sandboxed iframes
 * - externalUrl: External URLs loaded in iframes
 * - remoteDom: Remote DOM rendering (Layer 3)
 */

/**
 * UI content type - determines how content is rendered
 */
export type UIContentType = 'rawHtml' | 'externalUrl' | 'remoteDom';

/**
 * UI Resource Payload
 *
 * The actual resource data returned by the MCP server.
 * Contains the URI, MIME type, and content (text or blob).
 */
export interface UIResourcePayload {
  /**
   * Unique identifier for the UI resource
   * Must start with "ui://" for UI resources
   */
  uri: string;

  /**
   * MIME type indicating content type:
   * - text/html: Inline HTML content
   * - text/uri-list: External URL
   * - application/vnd.mcp-ui.remote-dom+javascript: Remote DOM
   */
  mimeType: string;

  /**
   * Text content (HTML or URL)
   */
  text?: string;

  /**
   * Base64-encoded blob content
   */
  blob?: string;

  /**
   * Metadata annotations
   * Convention: Use namespaced keys like "mcpui.dev/ui-preferred-frame-size"
   */
  _meta?: Record<string, any>;
}

/**
 * UI Resource
 *
 * Complete UI resource object with MCP resource envelope.
 * This is the format returned by resources/read requests.
 */
export interface UIResource {
  type: 'resource';
  resource: UIResourcePayload;
}

/**
 * UI Resource Options
 *
 * Optional configuration when creating UI resources.
 * Includes metadata for rendering hints and custom annotations.
 */
export interface UIResourceOptions {
  /**
   * Metadata for UI rendering
   */
  metadata?: {
    /**
     * Preferred iframe size (rendering hint)
     * Client may ignore or adjust based on available space
     */
    preferredFrameSize?: {
      width?: number;
      height?: number;
    };

    /**
     * Initial data passed to UI on first render
     * Available in Layer 2+ for interactive UIs
     */
    initialRenderData?: Record<string, any>;
  };

  /**
   * Custom annotations added to _meta
   * Use namespaced keys to avoid conflicts
   */
  annotations?: Record<string, any>;
}
