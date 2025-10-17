/**
 * Action Handler
 *
 * This module provides the ActionHandler class that processes UI actions
 * received via postMessage. It routes actions to the appropriate handler
 * based on action type and executes the corresponding operation.
 *
 * Layer 2 Phase 1: Action processing and routing.
 *
 * @module lib/actionHandler
 */

import type { MockMcpClient } from './mockMcpClient';
import type {
  ActionMessage,
  ActionResult,
  ToolCallAction,
  NotifyAction,
  LinkAction,
  PromptAction,
  IntentAction,
} from './postMessage';
import {
  isValidAction,
  isToolCallAction,
  isNotifyAction,
  isLinkAction,
  isPromptAction,
  isIntentAction,
  sanitizeParams,
  createSuccessResult,
  createErrorResult,
} from './postMessage';

/**
 * Action Handler Configuration
 */
export interface ActionHandlerConfig {
  /**
   * MCP client for tool execution
   */
  mcpClient: MockMcpClient;

  /**
   * Whether to log actions to console
   */
  verbose?: boolean;

  /**
   * Custom notification handler
   */
  onNotify?: (level: string, message: string) => void;

  /**
   * Custom link handler
   */
  onLink?: (url: string, target?: string) => void;

  /**
   * Custom prompt handler
   */
  onPrompt?: (text: string, defaultValue?: string) => Promise<string | null>;

  /**
   * Custom intent handler
   */
  onIntent?: (intent: string, data?: Record<string, any>) => Promise<ActionResult>;
}

/**
 * Action Handler
 *
 * Processes UI actions and routes them to appropriate handlers.
 * Provides default implementations for all action types but allows
 * custom handlers to be specified.
 */
export class ActionHandler {
  private config: ActionHandlerConfig;

  constructor(config: ActionHandlerConfig) {
    this.config = config;
  }

  /**
   * Handle Tool Call Action
   *
   * Executes an MCP tool with the specified parameters and returns the result.
   *
   * @param action - ToolCallAction to execute
   * @returns Action result with tool response
   */
  async handleToolCall(action: ToolCallAction): Promise<ActionResult> {
    try {
      const { toolName, params } = action.payload;

      if (this.config.verbose) {
        console.log('[ActionHandler] Executing tool:', toolName, params);
      }

      // Sanitize parameters for security
      const sanitizedParams = params ? sanitizeParams(params) : {};

      // Execute tool via MCP client
      const response = await this.config.mcpClient.executeTool(toolName, sanitizedParams);

      if (this.config.verbose) {
        console.log('[ActionHandler] Tool response:', response);
      }

      return createSuccessResult({
        toolName,
        response,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ActionHandler] Tool execution error:', error);
      return createErrorResult(
        error instanceof Error ? error.message : 'Unknown error executing tool'
      );
    }
  }

  /**
   * Handle Notify Action
   *
   * Displays a notification to the user with the specified level and message.
   *
   * @param action - NotifyAction to process
   * @returns Action result
   */
  async handleNotify(action: NotifyAction): Promise<ActionResult> {
    try {
      const { level, message } = action.payload;

      if (this.config.verbose) {
        console.log(`[ActionHandler] Notify [${level}]:`, message);
      }

      // Use custom handler if provided, otherwise use console
      if (this.config.onNotify) {
        this.config.onNotify(level, message);
      } else {
        // Default: log to console with appropriate method
        switch (level) {
          case 'error':
            console.error(`[Notify] ${message}`);
            break;
          case 'warning':
            console.warn(`[Notify] ${message}`);
            break;
          case 'info':
            console.info(`[Notify] ${message}`);
            break;
          case 'success':
            console.log(`[Notify] ${message}`);
            break;
        }
      }

      return createSuccessResult({
        level,
        message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ActionHandler] Notify error:', error);
      return createErrorResult(
        error instanceof Error ? error.message : 'Unknown error displaying notification'
      );
    }
  }

  /**
   * Handle Link Action
   *
   * Navigates to a URL in the specified target window.
   *
   * @param action - LinkAction to process
   * @returns Action result
   */
  async handleLink(action: LinkAction): Promise<ActionResult> {
    try {
      const { url, target = '_blank' } = action.payload;

      if (this.config.verbose) {
        console.log('[ActionHandler] Navigate:', url, 'target:', target);
      }

      // Validate URL for security
      try {
        new URL(url);
      } catch {
        return createErrorResult('Invalid URL');
      }

      // Use custom handler if provided, otherwise use window.open
      if (this.config.onLink) {
        this.config.onLink(url, target);
      } else {
        // Default: open URL
        window.open(url, target);
      }

      return createSuccessResult({
        url,
        target,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ActionHandler] Link error:', error);
      return createErrorResult(
        error instanceof Error ? error.message : 'Unknown error navigating to URL'
      );
    }
  }

  /**
   * Handle Prompt Action
   *
   * Shows a prompt dialog to the user and returns their input.
   *
   * @param action - PromptAction to process
   * @returns Action result with user input
   */
  async handlePrompt(action: PromptAction): Promise<ActionResult> {
    try {
      const { text, defaultValue } = action.payload;

      if (this.config.verbose) {
        console.log('[ActionHandler] Prompt:', text, 'default:', defaultValue);
      }

      let result: string | null;

      // Use custom handler if provided, otherwise use window.prompt
      if (this.config.onPrompt) {
        result = await this.config.onPrompt(text, defaultValue);
      } else {
        // Default: use browser prompt
        result = window.prompt(text, defaultValue);
      }

      if (result === null) {
        return createErrorResult('User cancelled prompt');
      }

      return createSuccessResult({
        text,
        value: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ActionHandler] Prompt error:', error);
      return createErrorResult(
        error instanceof Error ? error.message : 'Unknown error showing prompt'
      );
    }
  }

  /**
   * Handle Intent Action
   *
   * Processes a platform-specific intent with custom data.
   *
   * @param action - IntentAction to process
   * @returns Action result
   */
  async handleIntent(action: IntentAction): Promise<ActionResult> {
    try {
      const { intent, data } = action.payload;

      if (this.config.verbose) {
        console.log('[ActionHandler] Intent:', intent, 'data:', data);
      }

      // Use custom handler if provided
      if (this.config.onIntent) {
        return await this.config.onIntent(intent, data);
      } else {
        // Default: log warning that no handler is configured
        console.warn(`[ActionHandler] No intent handler configured for: ${intent}`);
        return createErrorResult(`No handler configured for intent: ${intent}`);
      }
    } catch (error) {
      console.error('[ActionHandler] Intent error:', error);
      return createErrorResult(
        error instanceof Error ? error.message : 'Unknown error processing intent'
      );
    }
  }

  /**
   * Execute Action
   *
   * Main entry point for processing actions. Validates the action,
   * routes it to the appropriate handler, and returns the result.
   *
   * @param message - Action message to process
   * @returns Action result
   */
  async executeAction(message: unknown): Promise<ActionResult> {
    // Validate message structure
    if (!isValidAction(message)) {
      console.error('[ActionHandler] Invalid action:', message);
      return createErrorResult('Invalid action format');
    }

    if (this.config.verbose) {
      console.log('[ActionHandler] Processing action:', message.type);
    }

    // Route to appropriate handler based on action type
    try {
      if (isToolCallAction(message)) {
        return await this.handleToolCall(message);
      } else if (isNotifyAction(message)) {
        return await this.handleNotify(message);
      } else if (isLinkAction(message)) {
        return await this.handleLink(message);
      } else if (isPromptAction(message)) {
        return await this.handlePrompt(message);
      } else if (isIntentAction(message)) {
        return await this.handleIntent(message);
      } else {
        return createErrorResult(`Unknown action type: ${message.type}`);
      }
    } catch (error) {
      console.error('[ActionHandler] Action execution error:', error);
      return createErrorResult(
        error instanceof Error ? error.message : 'Unknown error executing action'
      );
    }
  }
}

/**
 * Create Action Handler
 *
 * Factory function to create a new ActionHandler instance with the specified config.
 *
 * @param config - Action handler configuration
 * @returns New ActionHandler instance
 */
export function createActionHandler(config: ActionHandlerConfig): ActionHandler {
  return new ActionHandler(config);
}
