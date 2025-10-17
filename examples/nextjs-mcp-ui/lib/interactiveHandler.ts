/**
 * Interactive Handler - Bridges iframe events to tool execution
 *
 * This module creates the complete interaction loop:
 * 1. Form submission in iframe
 * 2. PostMessage event to parent
 * 3. Tool call to MCP server
 * 4. Response returned to iframe
 * 5. UI updated with response
 *
 * Layer 2/3 Integration: Real Interactive Components
 *
 * @module lib/interactiveHandler
 */

import type { ToolResponse } from './types.js';

/**
 * UI Action from iframe
 */
export interface UIAction {
  type: 'tool' | 'notify' | 'link' | 'intent';
  toolName?: string;
  args?: Record<string, unknown>;
  message?: string;
  url?: string;
  intent?: string;
}

/**
 * Response to send back to iframe
 */
export interface UIActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  html?: string; // New HTML to render
  state?: Record<string, unknown>;
}

/**
 * Tool executor function (from server or mock client)
 */
export type ToolExecutor = (
  toolName: string,
  args?: Record<string, unknown>
) => Promise<ToolResponse>;

/**
 * Interactive Handler - manages iframe-to-server communication
 */
export class InteractiveHandler {
  private executor: ToolExecutor;
  private frameRef: HTMLIFrameElement | null = null;
  private responseMap: Map<string, (response: UIActionResponse) => void> = new Map();
  private requestId: number = 0;
  private verbose: boolean;

  constructor(executor: ToolExecutor, verbose: boolean = false) {
    this.executor = executor;
    this.verbose = verbose;
  }

  /**
   * Setup iframe message listener
   */
  setupIframe(iframe: HTMLIFrameElement): void {
    this.frameRef = iframe;
    window.addEventListener('message', (event) => this.handleMessage(event));
    this.log('Interactive handler attached to iframe');
  }

  /**
   * Handle postMessage from iframe
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    // Verify origin (in production, check against trusted domains)
    const action = event.data as UIAction & { requestId?: string };

    this.log(`Received action: ${action.type}`, action);

    try {
      let response: UIActionResponse;

      if (action.type === 'tool') {
        // Execute tool on server
        response = await this.executeTool(action.toolName!, action.args);
      } else if (action.type === 'notify') {
        // Handle notification
        response = this.handleNotify(action.message!);
      } else if (action.type === 'link') {
        // Handle link
        response = this.handleLink(action.url!);
      } else if (action.type === 'intent') {
        // Handle custom intent
        response = await this.handleIntent(action.intent!, action.args);
      } else {
        response = {
          success: false,
          error: `Unknown action type: ${action.type}`,
        };
      }

      // Send response back to iframe
      this.sendResponseToIframe(response, action.requestId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log(`Error handling action: ${errorMsg}`, 'error');
      this.sendResponseToIframe(
        {
          success: false,
          error: errorMsg,
        },
        action.requestId
      );
    }
  }

  /**
   * Execute tool via server
   */
  private async executeTool(
    toolName: string,
    args?: Record<string, unknown>
  ): Promise<UIActionResponse> {
    this.log(`Executing tool: ${toolName}`, args);

    try {
      const result = await this.executor(toolName, args);

      if (result.success) {
        return {
          success: true,
          data: result.data,
          state: result.state as Record<string, unknown>,
        };
      } else {
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Handle notify action
   */
  private handleNotify(message: string): UIActionResponse {
    this.log(`Notification: ${message}`);
    console.log(`[MCP-UI Notification] ${message}`);

    return {
      success: true,
      message,
    };
  }

  /**
   * Handle link navigation
   */
  private handleLink(url: string): UIActionResponse {
    this.log(`Link: ${url}`);

    // In production, validate URL before navigation
    // For now, just return success
    return {
      success: true,
      url,
    };
  }

  /**
   * Handle custom intent
   */
  private async handleIntent(
    intent: string,
    args?: Record<string, unknown>
  ): Promise<UIActionResponse> {
    this.log(`Intent: ${intent}`, args);

    // Handle custom intents
    // This is extensible for application-specific logic
    return {
      success: true,
      data: { intent, args },
    };
  }

  /**
   * Send response back to iframe
   */
  private sendResponseToIframe(
    response: UIActionResponse,
    requestId?: string
  ): void {
    if (!this.frameRef) {
      this.log('No iframe reference', 'warn');
      return;
    }

    const message = {
      type: 'response',
      requestId,
      ...response,
    };

    this.log(`Sending response to iframe:`, response);
    this.frameRef.contentWindow?.postMessage(message, '*');
  }

  /**
   * Logging utility
   */
  private log(message: string, data?: unknown, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (this.verbose) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [InteractiveHandler] [${level.toUpperCase()}] ${message}`, data);
    }
  }
}

/**
 * Helper to create an interactive component wrapper
 */
export function createInteractiveComponent(
  executor: ToolExecutor,
  verbose?: boolean
): InteractiveHandler {
  return new InteractiveHandler(executor, verbose);
}

/**
 * Hook for React components to use interactive handler
 * Note: Only import React when actually using this hook in React components
 */
export function useInteractiveHandler(
  executor: ToolExecutor,
  verbose?: boolean
): {
  handler: InteractiveHandler;
  setupRef: (iframe: HTMLIFrameElement | null) => void;
} {
  // Lazy load React.useRef pattern
  const handlers = new Map<ToolExecutor, InteractiveHandler>();

  let handler = handlers.get(executor);
  if (!handler) {
    handler = new InteractiveHandler(executor, verbose);
    handlers.set(executor, handler);
  }

  const setupRef = (iframe: HTMLIFrameElement | null) => {
    if (iframe) {
      handler.setupIframe(iframe);
    }
  };

  return {
    handler,
    setupRef,
  };
}

/**
 * Client-side code to inject into iframe (stringified for injection)
 */
export const IFRAME_CLIENT_CODE = `
(function() {
  const requestMap = new Map();
  let requestId = 0;

  // Expose API to iframe content
  window.UIInteractive = {
    /**
     * Execute a tool on the server
     */
    async executeTool(toolName, args = {}) {
      const reqId = String(++requestId);
      const promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          requestMap.delete(reqId);
          reject(new Error(\`Tool execution timeout: \${toolName}\`));
        }, 30000);

        requestMap.set(reqId, { resolve, reject, timeout });
      });

      window.parent.postMessage({
        type: 'tool',
        toolName,
        args,
        requestId: reqId,
      }, '*');

      return promise;
    },

    /**
     * Send notification to parent
     */
    notify(message) {
      window.parent.postMessage({
        type: 'notify',
        message,
      }, '*');
    },

    /**
     * Navigate to link
     */
    navigateTo(url) {
      window.parent.postMessage({
        type: 'link',
        url,
      }, '*');
    },

    /**
     * Trigger custom intent
     */
    intent(intentName, args = {}) {
      window.parent.postMessage({
        type: 'intent',
        intent: intentName,
        args,
      }, '*');
    },
  };

  // Listen for responses from parent
  window.addEventListener('message', (event) => {
    if (event.data.type === 'response') {
      const { requestId, ...response } = event.data;
      const handler = requestMap.get(requestId);
      if (handler) {
        requestMap.delete(requestId);
        clearTimeout(handler.timeout);

        if (response.success) {
          handler.resolve(response);
        } else {
          handler.reject(new Error(response.error));
        }
      }
    }
  });

  console.log('[MCP-UI] Interactive API available via window.UIInteractive');
})();
`;
