"use client";

import { useState, useCallback } from 'react';
import { mcpClient } from '@/lib/mcp';

/**
 * UI Action Message Types
 *
 * Based on MCP-UI protocol specification for postMessage communication
 * between iframe UI resources and parent application.
 *
 * SPEC-COMPLIANT: Updated to match official MCP-UI specification
 * https://mcpui.dev
 */

/**
 * Spec-compliant UI action message (direct type field, no wrapper)
 */
interface UIActionMessage {
  type: 'tool' | 'prompt' | 'notify' | 'intent' | 'link';
  payload: Record<string, any>;
  messageId?: string;
}

/**
 * Legacy action message format (for backward compatibility)
 */
interface LegacyUIActionMessage {
  type: 'MCP_UI_ACTION';
  action: LegacyUIAction;
}

/**
 * Union type of all legacy UI actions
 */
type LegacyUIAction =
  | CallToolAction
  | SubmitPromptAction
  | NotifyAction
  | NavigateAction;

/**
 * Tool call action - execute an MCP tool (legacy format)
 */
interface CallToolAction {
  type: 'CALL_TOOL';
  toolName: string;
  args: Record<string, any>;
  callbackId?: string;
}

/**
 * Submit prompt action - send prompt to LLM (legacy format)
 */
interface SubmitPromptAction {
  type: 'SUBMIT_PROMPT';
  prompt: string;
  context?: any;
}

/**
 * Notification action - display user notification (legacy format)
 */
interface NotifyAction {
  type: 'NOTIFY';
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  title?: string;
}

/**
 * Navigate action - request URL navigation (legacy format)
 */
interface NavigateAction {
  type: 'NAVIGATE';
  url: string;
  target?: '_blank' | '_self';
}

/**
 * Spec-compliant response messages
 */
interface UIMessageReceived {
  type: 'ui-message-received';
  messageId: string;
}

interface UIMessageResponse {
  type: 'ui-message-response';
  messageId: string;
  result?: any;
  error?: string;
}

/**
 * Legacy tool result message (for backward compatibility)
 */
interface ToolResultMessage {
  type: 'TOOL_RESULT';
  callbackId: string;
  result?: any;
  error?: string;
}

/**
 * UI Action result returned from hook
 */
interface UIActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Hook return type
 */
export interface UseUIActionsReturn {
  handleUIAction: (message: UIActionMessage) => Promise<UIActionResult>;
  isProcessing: boolean;
  lastError: string | null;
}

/**
 * React hook for handling UI actions from MCP UI resources
 *
 * Processes postMessage actions from iframe-based UI resources and
 * executes corresponding MCP backend operations (tool calls, prompts, etc).
 *
 * @example
 * ```tsx
 * const { handleUIAction, isProcessing, lastError } = useUIActions();
 *
 * // Listen for postMessage from iframe
 * useEffect(() => {
 *   const handler = async (event: MessageEvent) => {
 *     if (event.data.type === 'MCP_UI_ACTION') {
 *       const result = await handleUIAction(event.data);
 *       if (result.success && event.data.action.callbackId) {
 *         // Send result back to iframe
 *         event.source.postMessage({
 *           type: 'TOOL_RESULT',
 *           callbackId: event.data.action.callbackId,
 *           result: result.data
 *         }, '*');
 *       }
 *     }
 *   };
 *   window.addEventListener('message', handler);
 *   return () => window.removeEventListener('message', handler);
 * }, [handleUIAction]);
 * ```
 */
export function useUIActions(): UseUIActionsReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  /**
   * Handle a UI action message from an iframe
   *
   * Processes the action and executes the corresponding backend operation.
   * Returns a result that can be sent back to the iframe via postMessage.
   *
   * SPEC-COMPLIANT: Now supports both new spec-compliant format and legacy format
   *
   * @param message - UI action message from iframe (spec-compliant or legacy)
   * @returns Action result with success status and data/error
   */
  const handleUIAction = useCallback(async (message: UIActionMessage | LegacyUIActionMessage): Promise<UIActionResult> => {
    setIsProcessing(true);
    setLastError(null);

    try {
      // Detect format and normalize to spec-compliant format
      let actionType: string;
      let payload: Record<string, any>;

      if ('action' in message && message.type === 'MCP_UI_ACTION') {
        // Legacy format - convert to new format
        console.log('[useUIActions] Processing legacy action:', message.action.type);
        const legacyAction = message.action;

        switch (legacyAction.type) {
          case 'CALL_TOOL':
            actionType = 'tool';
            payload = { toolName: legacyAction.toolName, params: legacyAction.args };
            break;
          case 'SUBMIT_PROMPT':
            actionType = 'prompt';
            payload = { prompt: legacyAction.prompt, context: legacyAction.context };
            break;
          case 'NOTIFY':
            actionType = 'notify';
            payload = { level: legacyAction.level, message: legacyAction.message, title: legacyAction.title };
            break;
          case 'NAVIGATE':
            actionType = 'link';
            payload = { url: legacyAction.url, target: legacyAction.target };
            break;
          default:
            throw new Error(`Unknown legacy action type: ${(legacyAction as any).type}`);
        }
      } else if ('payload' in message) {
        // New spec-compliant format
        console.log('[useUIActions] Processing spec-compliant action:', message.type);
        actionType = message.type;
        payload = message.payload;
      } else {
        const error = 'Invalid UI action message format';
        console.error('[useUIActions]', error, message);
        setLastError(error);
        return {
          success: false,
          error,
        };
      }

      // Process action based on type
      switch (actionType) {
        case 'tool': {
          // Execute tool via MCP backend
          if (!mcpClient.isConnected()) {
            throw new Error('Not connected to MCP server');
          }

          const toolName = payload.toolName;
          const params = payload.params || {};

          console.log('[useUIActions] Executing tool:', toolName, params);

          const result = await mcpClient.executeTool(toolName, params);

          console.log('[useUIActions] Tool result:', result);

          return {
            success: true,
            data: result.content,
          };
        }

        case 'prompt': {
          // Handle prompt submission
          // For now, just log it - actual LLM integration would go here
          console.log('[useUIActions] Prompt submission:', payload.prompt, payload.context);

          // TODO: Implement actual LLM integration
          // This would typically send the prompt to an LLM API

          return {
            success: true,
            data: {
              message: 'Prompt received',
              prompt: payload.prompt,
              context: payload.context,
            },
          };
        }

        case 'notify': {
          // Handle notification
          console.log(`[useUIActions] Notification [${payload.level}]:`, payload.title || '', payload.message);

          // TODO: Integrate with toast/notification system
          // For now, just log to console

          return {
            success: true,
            data: {
              level: payload.level,
              message: payload.message,
              title: payload.title,
            },
          };
        }

        case 'link': {
          // Handle navigation request
          console.log('[useUIActions] Navigation request:', payload.url, payload.target);

          try {
            if (payload.target === '_blank') {
              window.open(payload.url, '_blank');
            } else {
              window.location.href = payload.url;
            }

            return {
              success: true,
              data: {
                url: payload.url,
                target: payload.target,
              },
            };
          } catch (navError) {
            const errorMessage = navError instanceof Error ? navError.message : 'Navigation failed';
            console.error('[useUIActions] Navigation error:', navError);
            throw new Error(`Navigation failed: ${errorMessage}`);
          }
        }

        case 'intent': {
          // Handle intent action
          console.log('[useUIActions] Intent action:', payload.intent, payload.params);

          // TODO: Implement intent handling
          // This is a platform-specific feature that may map to various application actions

          return {
            success: true,
            data: {
              intent: payload.intent,
              params: payload.params,
            },
          };
        }

        default: {
          throw new Error(`Unknown action type: ${actionType}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[useUIActions] Error processing action:', error);

      setLastError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    handleUIAction,
    isProcessing,
    lastError,
  };
}
