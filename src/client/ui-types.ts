/**
 * UI-related types for client-side rendering
 *
 * These types define the structure for UI resources that can be rendered
 * in React applications. They mirror the server-side types but are optimized
 * for client-side usage with additional helper functions.
 *
 * @module client/ui-types
 */

/**
 * UI content type - determines how content is rendered
 *
 * - rawHtml: Inline HTML content rendered in sandboxed iframes
 * - externalUrl: External URLs loaded in iframes (Layer 2)
 * - remoteDom: Remote DOM rendering (Layer 3)
 */
export type UIContentType = 'rawHtml' | 'externalUrl' | 'remoteDom';

/**
 * UI Resource Content
 *
 * The resource data received from the MCP server. This is typically
 * extracted from the MCP response and passed to the renderer components.
 *
 * @example
 * ```typescript
 * const resource: UIResourceContent = {
 *   uri: 'ui://product-card/v1',
 *   mimeType: 'text/html',
 *   text: '<div><h2>Product Card</h2></div>',
 *   _meta: {
 *     'mcpui.dev/ui-preferred-frame-size': { width: 400, height: 300 }
 *   }
 * };
 * ```
 */
export interface UIResourceContent {
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
 * UI Action
 *
 * Actions that can be triggered from UI resources (Layer 2+).
 * These are sent via postMessage from the iframe to the parent.
 *
 * @example
 * ```typescript
 * const action: UIAction = {
 *   type: 'tool',
 *   payload: {
 *     toolName: 'add_to_cart',
 *     params: { productId: '123', quantity: 1 }
 *   }
 * };
 * ```
 */
export interface UIAction {
  /**
   * Action type
   * - tool: Execute an MCP tool
   * - prompt: Trigger a prompt
   * - link: Navigate to a URL
   * - intent: Custom intent handling
   * - notify: Show notification
   */
  type: 'tool' | 'prompt' | 'link' | 'intent' | 'notify';

  /**
   * Action payload (type-specific data)
   */
  payload: Record<string, any>;
}

/**
 * UI Action Result
 *
 * Result returned after processing a UI action.
 * Sent back to the iframe via postMessage (Layer 2+).
 */
export interface UIActionResult {
  /**
   * Action type that was processed
   */
  type: UIAction['type'];

  /**
   * Result payload (type-specific data)
   */
  payload: Record<string, any>;
}

/**
 * Tool Call Action
 *
 * Specialized action for calling MCP tools from UI.
 * This is the most common action type in interactive UIs.
 *
 * @example
 * ```typescript
 * const toolAction: ToolCallAction = {
 *   type: 'tool',
 *   payload: {
 *     toolName: 'get_product_details',
 *     params: { productId: '456' }
 *   }
 * };
 * ```
 */
export interface ToolCallAction extends UIActionResult {
  type: 'tool';
  payload: {
    /**
     * Name of the MCP tool to execute
     */
    toolName: string;

    /**
     * Parameters to pass to the tool
     */
    params: Record<string, any>;
  };
}

/**
 * Notification Action (Layer 2)
 *
 * Action for displaying notifications to the user.
 * Supports different notification levels for varying severity.
 *
 * @example
 * ```typescript
 * const notifyAction: NotifyAction = {
 *   type: 'notify',
 *   payload: {
 *     level: 'success',
 *     message: 'Form submitted successfully!'
 *   }
 * };
 * ```
 */
export interface NotifyAction extends UIActionResult {
  type: 'notify';
  payload: {
    /**
     * Notification severity level
     */
    level: 'info' | 'warning' | 'error' | 'success';

    /**
     * Message to display
     */
    message: string;
  };
}

/**
 * Link Action (Layer 2)
 *
 * Action for navigating to a URL. Can open in current window
 * or new tab depending on target.
 *
 * @example
 * ```typescript
 * const linkAction: LinkAction = {
 *   type: 'link',
 *   payload: {
 *     url: 'https://example.com/docs',
 *     target: '_blank'
 *   }
 * };
 * ```
 */
export interface LinkAction extends UIActionResult {
  type: 'link';
  payload: {
    /**
     * URL to navigate to
     */
    url: string;

    /**
     * Target window for navigation
     */
    target?: '_blank' | '_self';
  };
}

/**
 * Prompt Action (Layer 2)
 *
 * Action for triggering an MCP prompt with arguments.
 * Prompts are server-defined interactive flows.
 *
 * @example
 * ```typescript
 * const promptAction: PromptAction = {
 *   type: 'prompt',
 *   payload: {
 *     promptName: 'create_task',
 *     arguments: {
 *       projectId: '123',
 *       priority: 'high'
 *     }
 *   }
 * };
 * ```
 */
export interface PromptAction extends UIActionResult {
  type: 'prompt';
  payload: {
    /**
     * Name of the MCP prompt to trigger
     */
    promptName: string;

    /**
     * Arguments to pass to the prompt
     */
    arguments?: Record<string, any>;
  };
}

/**
 * Intent Action (Layer 2)
 *
 * Platform-specific intent handling for deep integration.
 * Allows UI to trigger platform-specific actions (mobile, desktop, etc.)
 *
 * @example
 * ```typescript
 * const intentAction: IntentAction = {
 *   type: 'intent',
 *   payload: {
 *     intentName: 'share',
 *     data: {
 *       title: 'Check this out',
 *       url: 'https://example.com'
 *     }
 *   }
 * };
 * ```
 */
export interface IntentAction extends UIActionResult {
  type: 'intent';
  payload: {
    /**
     * Platform-specific intent name
     */
    intentName: string;

    /**
     * Intent data (platform-specific)
     */
    data?: Record<string, any>;
  };
}

/**
 * Get preferred frame size from metadata
 *
 * Extracts the preferred iframe dimensions from the resource metadata.
 * Clients should use this as a hint but may adjust based on available space.
 *
 * @param meta - Resource metadata object
 * @returns Frame size object or null if not specified
 *
 * @example
 * ```typescript
 * const resource: UIResourceContent = {
 *   uri: 'ui://chart',
 *   mimeType: 'text/html',
 *   text: '<div>...</div>',
 *   _meta: {
 *     'mcpui.dev/ui-preferred-frame-size': { width: 800, height: 600 }
 *   }
 * };
 *
 * const size = getPreferredFrameSize(resource._meta);
 * console.log(size); // { width: 800, height: 600 }
 * ```
 */
export function getPreferredFrameSize(meta?: Record<string, any>): {
  width?: number;
  height?: number;
} | null {
  if (!meta) return null;
  const size = meta['mcpui.dev/ui-preferred-frame-size'];
  if (!size || typeof size !== 'object') return null;
  return size;
}

/**
 * Get initial render data from metadata
 *
 * Extracts initial data that should be passed to the UI on first render.
 * This is useful for seeding forms or providing context (Layer 2+).
 *
 * @param meta - Resource metadata object
 * @returns Initial data object or null if not specified
 *
 * @example
 * ```typescript
 * const resource: UIResourceContent = {
 *   uri: 'ui://form',
 *   mimeType: 'text/html',
 *   text: '<form>...</form>',
 *   _meta: {
 *     'mcpui.dev/ui-initial-render-data': {
 *       userId: '123',
 *       userName: 'Alice'
 *     }
 *   }
 * };
 *
 * const data = getInitialRenderData(resource._meta);
 * console.log(data); // { userId: '123', userName: 'Alice' }
 * ```
 */
export function getInitialRenderData(
  meta?: Record<string, any>
): Record<string, any> | null {
  if (!meta) return null;
  const data = meta['mcpui.dev/ui-initial-render-data'];
  if (!data || typeof data !== 'object') return null;
  return data;
}
