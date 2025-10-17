/**
 * PostMessage Protocol Definition
 *
 * This module defines the postMessage protocol for secure communication
 * between sandboxed iframes and the host application. It provides type-safe
 * message definitions, validators, and security utilities.
 *
 * Layer 2 Phase 1: Foundation for interactive UI resources.
 *
 * @module lib/postMessage
 */

/**
 * Action Message
 *
 * The root message structure sent via postMessage from iframe to host.
 * All messages must conform to this structure for validation.
 */
export interface ActionMessage {
  /**
   * Action type - determines how the message is processed
   */
  type: 'tool' | 'notify' | 'link' | 'prompt' | 'intent';

  /**
   * Action payload - type-specific data
   */
  payload: Record<string, any>;
}

/**
 * Tool Call Action
 *
 * Triggers execution of an MCP tool with specified parameters.
 * This is the most common action type for interactive UIs.
 */
export interface ToolCallAction extends ActionMessage {
  type: 'tool';
  payload: {
    toolName: string;
    params?: Record<string, any>;
  };
}

/**
 * Notify Action
 *
 * Displays a notification to the user with specified severity level.
 */
export interface NotifyAction extends ActionMessage {
  type: 'notify';
  payload: {
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
  };
}

/**
 * Link Action
 *
 * Navigates to a URL, either in the current window or a new tab.
 */
export interface LinkAction extends ActionMessage {
  type: 'link';
  payload: {
    url: string;
    target?: '_blank' | '_self';
  };
}

/**
 * Prompt Action
 *
 * Triggers an MCP prompt with specified arguments.
 */
export interface PromptAction extends ActionMessage {
  type: 'prompt';
  payload: {
    text: string;
    defaultValue?: string;
  };
}

/**
 * Intent Action
 *
 * Platform-specific intent handling for deep integration.
 */
export interface IntentAction extends ActionMessage {
  type: 'intent';
  payload: {
    intent: string;
    data?: Record<string, any>;
  };
}

/**
 * Action Result
 *
 * Result returned after processing an action.
 * Can be sent back to the iframe or used by the host application.
 */
export interface ActionResult {
  /**
   * Whether the action succeeded
   */
  success: boolean;

  /**
   * Result data (if successful)
   */
  data?: Record<string, any>;

  /**
   * Error message (if failed)
   */
  error?: string;
}

/**
 * Type guard for ActionMessage
 *
 * Validates that an unknown value conforms to the ActionMessage structure.
 * This is the first line of defense in message validation.
 *
 * @param value - Unknown value to validate
 * @returns True if value is a valid ActionMessage
 */
export function isActionMessage(value: unknown): value is ActionMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, any>;

  // Check required fields
  if (typeof obj.type !== 'string') {
    return false;
  }

  if (!obj.payload || typeof obj.payload !== 'object') {
    return false;
  }

  // Check valid action types
  const validTypes = ['tool', 'notify', 'link', 'prompt', 'intent'];
  if (!validTypes.includes(obj.type)) {
    return false;
  }

  return true;
}

/**
 * Type guard for ToolCallAction
 *
 * Validates that an ActionMessage is specifically a tool call action.
 *
 * @param action - ActionMessage to validate
 * @returns True if action is a ToolCallAction
 */
export function isToolCallAction(action: ActionMessage): action is ToolCallAction {
  if (action.type !== 'tool') {
    return false;
  }

  const payload = action.payload;
  if (typeof payload.toolName !== 'string') {
    return false;
  }

  // params is optional, but if present must be an object
  if (payload.params !== undefined && (typeof payload.params !== 'object' || payload.params === null)) {
    return false;
  }

  return true;
}

/**
 * Type guard for NotifyAction
 *
 * Validates that an ActionMessage is specifically a notify action.
 *
 * @param action - ActionMessage to validate
 * @returns True if action is a NotifyAction
 */
export function isNotifyAction(action: ActionMessage): action is NotifyAction {
  if (action.type !== 'notify') {
    return false;
  }

  const payload = action.payload;
  if (typeof payload.message !== 'string') {
    return false;
  }

  const validLevels = ['info', 'warning', 'error', 'success'];
  if (!validLevels.includes(payload.level)) {
    return false;
  }

  return true;
}

/**
 * Type guard for LinkAction
 *
 * Validates that an ActionMessage is specifically a link action.
 *
 * @param action - ActionMessage to validate
 * @returns True if action is a LinkAction
 */
export function isLinkAction(action: ActionMessage): action is LinkAction {
  if (action.type !== 'link') {
    return false;
  }

  const payload = action.payload;
  if (typeof payload.url !== 'string') {
    return false;
  }

  // target is optional, but if present must be valid
  if (payload.target !== undefined) {
    const validTargets = ['_blank', '_self'];
    if (!validTargets.includes(payload.target)) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for PromptAction
 *
 * Validates that an ActionMessage is specifically a prompt action.
 *
 * @param action - ActionMessage to validate
 * @returns True if action is a PromptAction
 */
export function isPromptAction(action: ActionMessage): action is PromptAction {
  if (action.type !== 'prompt') {
    return false;
  }

  const payload = action.payload;
  if (typeof payload.text !== 'string') {
    return false;
  }

  // defaultValue is optional, but if present must be a string
  if (payload.defaultValue !== undefined && typeof payload.defaultValue !== 'string') {
    return false;
  }

  return true;
}

/**
 * Type guard for IntentAction
 *
 * Validates that an ActionMessage is specifically an intent action.
 *
 * @param action - ActionMessage to validate
 * @returns True if action is an IntentAction
 */
export function isIntentAction(action: ActionMessage): action is IntentAction {
  if (action.type !== 'intent') {
    return false;
  }

  const payload = action.payload;
  if (typeof payload.intent !== 'string') {
    return false;
  }

  // data is optional, but if present must be an object
  if (payload.data !== undefined && (typeof payload.data !== 'object' || payload.data === null)) {
    return false;
  }

  return true;
}

/**
 * Validate Action
 *
 * Comprehensive validation function that checks if an action is valid
 * and conforms to its specific type requirements.
 *
 * @param action - Action to validate
 * @returns True if action is valid
 */
export function isValidAction(action: unknown): action is ActionMessage {
  if (!isActionMessage(action)) {
    return false;
  }

  // Validate type-specific requirements
  switch (action.type) {
    case 'tool':
      return isToolCallAction(action);
    case 'notify':
      return isNotifyAction(action);
    case 'link':
      return isLinkAction(action);
    case 'prompt':
      return isPromptAction(action);
    case 'intent':
      return isIntentAction(action);
    default:
      return false;
  }
}

/**
 * Validate Origin
 *
 * SECURITY CRITICAL: Validates that a postMessage origin is trusted.
 *
 * Accepted origins:
 * - 'null' - srcdoc iframes (same-origin policy treats them as null)
 * - https://* - Any HTTPS origin (production)
 * - http://localhost:* - Local development
 * - http://127.0.0.1:* - Local development
 *
 * Rejected origins:
 * - http://* (except localhost/127.0.0.1) - Insecure
 * - file://* - Security risk
 * - javascript:* - XSS vector
 * - data:* - Security risk
 *
 * @param origin - Origin string from MessageEvent
 * @returns True if origin is trusted
 */
export function validateOrigin(origin: string): boolean {
  // srcdoc iframes have null origin - always accept
  if (origin === 'null') {
    return true;
  }

  // Try to parse as URL
  try {
    const url = new URL(origin);

    // Production: require HTTPS
    if (url.protocol === 'https:') {
      return true;
    }

    // Development: allow localhost/127.0.0.1 on HTTP or HTTPS
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return url.protocol === 'http:' || url.protocol === 'https:';
    }

    // Reject all others
    return false;
  } catch {
    // Invalid URL - reject
    return false;
  }
}

/**
 * Sanitize Parameters
 *
 * Sanitizes action payload parameters to prevent injection attacks.
 * Only allows primitive types (string, number, boolean, null).
 * Arrays and nested objects are rejected for security.
 *
 * @param params - Parameters to sanitize
 * @returns Sanitized parameters
 */
export function sanitizeParams(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    // Only allow primitive types
    const valueType = typeof value;
    if (
      valueType === 'string' ||
      valueType === 'number' ||
      valueType === 'boolean' ||
      value === null
    ) {
      sanitized[key] = value;
    } else if (valueType === 'undefined') {
      // Skip undefined values
      continue;
    } else {
      console.warn(`[PostMessage Security] Rejected non-primitive value for key: ${key}`, value);
    }
  }

  return sanitized;
}

/**
 * Create Success Result
 *
 * Helper function to create a successful ActionResult.
 *
 * @param data - Result data
 * @returns ActionResult with success=true
 */
export function createSuccessResult(data?: Record<string, any>): ActionResult {
  return {
    success: true,
    data: data || {},
  };
}

/**
 * Create Error Result
 *
 * Helper function to create a failed ActionResult.
 *
 * @param error - Error message
 * @returns ActionResult with success=false
 */
export function createErrorResult(error: string): ActionResult {
  return {
    success: false,
    error,
  };
}
