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
   * Human-readable name for the resource
   * Optional - used for display purposes
   */
  name?: string;

  /**
   * Description of what the resource does
   * Optional - used for display purposes
   */
  description?: string;

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

/**
 * MCP UI Protocol Message Types
 *
 * Official MCP UI protocol message formats as specified in:
 * https://github.com/idosal/mcp-ui
 */

/**
 * Tool Call Message
 *
 * Sent from UI (iframe) to parent when calling an MCP tool.
 *
 * @example
 * ```javascript
 * window.parent.postMessage({
 *   type: 'tool',
 *   payload: {
 *     toolName: 'get_weather',
 *     params: { location: 'New York' }
 *   },
 *   messageId: 'req_123'
 * }, '*');
 * ```
 */
export interface UIToolCallMessage {
  /**
   * Message type - must be 'tool'
   */
  type: 'tool';

  /**
   * Tool call payload
   */
  payload: {
    /**
     * Name of the tool to call
     */
    toolName: string;

    /**
     * Tool parameters object
     */
    params: any;
  };

  /**
   * Optional message ID for async response correlation
   * If provided, response will include matching messageId
   */
  messageId?: string;
}

/**
 * Tool Response Message
 *
 * Sent from parent to UI (iframe) in response to a tool call.
 *
 * @example Success Response
 * ```javascript
 * window.postMessage({
 *   type: 'tool-response',
 *   messageId: 'req_123',
 *   payload: {
 *     result: { temperature: 72, conditions: 'Sunny' }
 *   }
 * }, '*');
 * ```
 *
 * @example Error Response
 * ```javascript
 * window.postMessage({
 *   type: 'tool-response',
 *   messageId: 'req_123',
 *   payload: {
 *     error: 'Tool not found'
 *   }
 * }, '*');
 * ```
 */
export interface UIToolResponseMessage {
  /**
   * Message type - must be 'tool-response'
   */
  type: 'tool-response';

  /**
   * Message ID matching the original request
   * Used to correlate async responses
   */
  messageId?: string;

  /**
   * Response payload
   */
  payload: {
    /**
     * Tool execution result (on success)
     */
    result?: any;

    /**
     * Error message (on failure)
     */
    error?: string;
  };
}

/**
 * Notification Message
 *
 * Sent from UI (iframe) to parent for user notifications.
 *
 * @example
 * ```javascript
 * window.parent.postMessage({
 *   type: 'notify',
 *   payload: {
 *     message: 'Operation completed successfully',
 *     level: 'info'
 *   }
 * }, '*');
 * ```
 */
export interface UINotificationMessage {
  /**
   * Message type - must be 'notify'
   */
  type: 'notify';

  /**
   * Notification payload
   */
  payload: {
    /**
     * Notification message text
     */
    message: string;

    /**
     * Optional notification level
     * Extension to base spec - may be ignored by clients
     */
    level?: 'info' | 'warning' | 'error';
  };
}

/**
 * Prompt Action Message
 *
 * Sent from UI (iframe) to parent to submit a prompt to the LLM.
 *
 * @example
 * ```javascript
 * window.parent.postMessage({
 *   type: 'prompt',
 *   payload: {
 *     prompt: 'Analyze this data and provide insights'
 *   }
 * }, '*');
 * ```
 */
export interface UIPromptMessage {
  /**
   * Message type - must be 'prompt'
   */
  type: 'prompt';

  /**
   * Prompt payload
   */
  payload: {
    /**
     * Text to submit to the LLM
     */
    prompt: string;
  };
}

/**
 * Intent Action Message
 *
 * Sent from UI (iframe) to parent to trigger an application-level intent.
 *
 * @example
 * ```javascript
 * window.parent.postMessage({
 *   type: 'intent',
 *   payload: {
 *     intent: 'open_file',
 *     params: { path: '/data.json' }
 *   }
 * }, '*');
 * ```
 */
export interface UIIntentMessage {
  /**
   * Message type - must be 'intent'
   */
  type: 'intent';

  /**
   * Intent payload
   */
  payload: {
    /**
     * Intent name (e.g., 'open_file', 'navigate')
     */
    intent: string;

    /**
     * Optional parameters for the intent
     */
    params?: any;
  };
}

/**
 * Link Action Message
 *
 * Sent from UI (iframe) to parent to request navigation to a URL.
 *
 * @example
 * ```javascript
 * window.parent.postMessage({
 *   type: 'link',
 *   payload: {
 *     url: 'https://example.com/dashboard'
 *   }
 * }, '*');
 * ```
 */
export interface UILinkMessage {
  /**
   * Message type - must be 'link'
   */
  type: 'link';

  /**
   * Link payload
   */
  payload: {
    /**
     * URL to navigate to
     */
    url: string;
  };
}

/**
 * Union type of all UI action messages sent from iframe to parent
 */
export type UIActionMessage =
  | UIToolCallMessage
  | UINotificationMessage
  | UIPromptMessage
  | UIIntentMessage
  | UILinkMessage;

/**
 * Union type of all MCP UI protocol messages
 */
export type UIProtocolMessage =
  | UIToolCallMessage
  | UIToolResponseMessage
  | UINotificationMessage
  | UIPromptMessage
  | UIIntentMessage
  | UILinkMessage;
