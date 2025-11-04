/**
 * Message Validators for MCP-UI Protocol Compliance Testing
 *
 * These validators ensure our implementation matches the official MCP-UI specification exactly.
 * Based on: https://github.com/idosal/mcp-ui
 * Spec section: 1.3 PostMessage Protocol
 *
 * Message format must be:
 * - Tool: { type: 'tool', payload: { toolName, params }, messageId? }
 * - Prompt: { type: 'prompt', payload: { prompt }, messageId? }
 * - Notify: { type: 'notify', payload: { message, level? }, messageId? }
 * - Link: { type: 'link', payload: { url }, messageId? }
 * - Intent: { type: 'intent', payload: { intent, params }, messageId? }
 *
 * Response format must be:
 * - Ack: { type: 'ui-message-received', messageId }
 * - Response: { type: 'ui-message-response', messageId, result?, error? }
 *
 * @module tests/unit/protocol/message-validators
 */

/**
 * Valid MCP-UI action types per specification
 */
export const VALID_ACTION_TYPES = ['tool', 'prompt', 'notify', 'link', 'intent'] as const;
export type ActionType = (typeof VALID_ACTION_TYPES)[number];

/**
 * Valid MCP-UI response types per specification
 */
export const VALID_RESPONSE_TYPES = ['ui-message-received', 'ui-message-response'] as const;
export type ResponseType = (typeof VALID_RESPONSE_TYPES)[number];

/**
 * Validate tool call message format
 *
 * Spec-compliant format:
 * {
 *   type: 'tool',
 *   payload: { toolName: string, params: Record<string, any> },
 *   messageId?: string
 * }
 *
 * @param msg - Message to validate
 * @returns True if message is a valid tool call
 */
export function isValidToolMessage(msg: any): boolean {
  if (!msg || typeof msg !== 'object') return false;

  // Must have correct type
  if (msg.type !== 'tool') return false;

  // Must have payload object
  if (!msg.payload || typeof msg.payload !== 'object') return false;

  // Payload must have toolName (string)
  if (typeof msg.payload.toolName !== 'string') return false;

  // Payload must have params (object)
  if (!msg.payload.params || typeof msg.payload.params !== 'object') return false;

  // MessageId is optional but must be string if present
  if (msg.messageId !== undefined && typeof msg.messageId !== 'string') return false;

  // Must NOT have legacy fields
  if (msg.action !== undefined) return false; // No nested action
  if (msg.callbackId !== undefined) return false; // Use messageId instead

  return true;
}

/**
 * Validate prompt message format
 *
 * Spec-compliant format:
 * {
 *   type: 'prompt',
 *   payload: { prompt: string },
 *   messageId?: string
 * }
 *
 * @param msg - Message to validate
 * @returns True if message is a valid prompt
 */
export function isValidPromptMessage(msg: any): boolean {
  if (!msg || typeof msg !== 'object') return false;

  // Must have correct type
  if (msg.type !== 'prompt') return false;

  // Must have payload object
  if (!msg.payload || typeof msg.payload !== 'object') return false;

  // Payload must have prompt (string)
  if (typeof msg.payload.prompt !== 'string') return false;

  // MessageId is optional but must be string if present
  if (msg.messageId !== undefined && typeof msg.messageId !== 'string') return false;

  // Must NOT have legacy fields
  if (msg.action !== undefined) return false;

  return true;
}

/**
 * Validate notify message format
 *
 * Spec-compliant format:
 * {
 *   type: 'notify',
 *   payload: { message: string, level?: string },
 *   messageId?: string
 * }
 *
 * @param msg - Message to validate
 * @returns True if message is a valid notification
 */
export function isValidNotifyMessage(msg: any): boolean {
  if (!msg || typeof msg !== 'object') return false;

  // Must have correct type
  if (msg.type !== 'notify') return false;

  // Must have payload object
  if (!msg.payload || typeof msg.payload !== 'object') return false;

  // Payload must have message (string)
  if (typeof msg.payload.message !== 'string') return false;

  // Level is optional but must be string if present
  if (msg.payload.level !== undefined && typeof msg.payload.level !== 'string') return false;

  // MessageId is optional but must be string if present
  if (msg.messageId !== undefined && typeof msg.messageId !== 'string') return false;

  return true;
}

/**
 * Validate link message format
 *
 * Spec-compliant format:
 * {
 *   type: 'link',
 *   payload: { url: string },
 *   messageId?: string
 * }
 *
 * @param msg - Message to validate
 * @returns True if message is a valid link
 */
export function isValidLinkMessage(msg: any): boolean {
  if (!msg || typeof msg !== 'object') return false;

  // Must have correct type
  if (msg.type !== 'link') return false;

  // Must have payload object
  if (!msg.payload || typeof msg.payload !== 'object') return false;

  // Payload must have url (string)
  if (typeof msg.payload.url !== 'string') return false;

  // MessageId is optional but must be string if present
  if (msg.messageId !== undefined && typeof msg.messageId !== 'string') return false;

  return true;
}

/**
 * Validate intent message format
 *
 * Spec-compliant format:
 * {
 *   type: 'intent',
 *   payload: { intent: string, params: Record<string, any> },
 *   messageId?: string
 * }
 *
 * @param msg - Message to validate
 * @returns True if message is a valid intent
 */
export function isValidIntentMessage(msg: any): boolean {
  if (!msg || typeof msg !== 'object') return false;

  // Must have correct type
  if (msg.type !== 'intent') return false;

  // Must have payload object
  if (!msg.payload || typeof msg.payload !== 'object') return false;

  // Payload must have intent (string)
  if (typeof msg.payload.intent !== 'string') return false;

  // Payload must have params (object)
  if (!msg.payload.params || typeof msg.payload.params !== 'object') return false;

  // MessageId is optional but must be string if present
  if (msg.messageId !== undefined && typeof msg.messageId !== 'string') return false;

  return true;
}

/**
 * Validate acknowledgment message format
 *
 * Spec-compliant format:
 * {
 *   type: 'ui-message-received',
 *   messageId: string
 * }
 *
 * @param msg - Message to validate
 * @returns True if message is a valid acknowledgment
 */
export function isValidAcknowledgment(msg: any): boolean {
  if (!msg || typeof msg !== 'object') return false;

  // Must have correct type
  if (msg.type !== 'ui-message-received') return false;

  // Must have messageId (string)
  if (typeof msg.messageId !== 'string') return false;

  // Must NOT have legacy fields
  if (msg.callbackId !== undefined) return false;

  return true;
}

/**
 * Validate response message format
 *
 * Spec-compliant format:
 * {
 *   type: 'ui-message-response',
 *   messageId: string,
 *   result?: any,
 *   error?: string
 * }
 *
 * @param msg - Message to validate
 * @returns True if message is a valid response
 */
export function isValidResponse(msg: any): boolean {
  if (!msg || typeof msg !== 'object') return false;

  // Must have correct type
  if (msg.type !== 'ui-message-response') return false;

  // Must have messageId (string)
  if (typeof msg.messageId !== 'string') return false;

  // Result is optional (can be any type)
  // Error is optional but must be string if present
  if (msg.error !== undefined && typeof msg.error !== 'string') return false;

  // Must NOT have both result and error
  if (msg.result !== undefined && msg.error !== undefined) return false;

  // Must NOT have legacy fields
  if (msg.callbackId !== undefined) return false;

  return true;
}

/**
 * Validate UI resource structure
 *
 * Spec-compliant format:
 * {
 *   type: 'resource',
 *   resource: {
 *     uri: string,
 *     mimeType: string,
 *     text?: string,
 *     blob?: string
 *   }
 * }
 *
 * @param resource - Resource to validate
 * @returns True if resource is valid
 */
export function isValidUIResource(resource: any): boolean {
  if (!resource || typeof resource !== 'object') return false;

  // Must have type: 'resource'
  if (resource.type !== 'resource') return false;

  // Must have resource object
  if (!resource.resource || typeof resource.resource !== 'object') return false;

  const res = resource.resource;

  // Must have uri (string starting with ui://)
  if (typeof res.uri !== 'string' || !res.uri.startsWith('ui://')) return false;

  // Must have mimeType (string)
  if (typeof res.mimeType !== 'string') return false;

  // Must have either text or blob
  if (res.text === undefined && res.blob === undefined) return false;

  // text must be string if present
  if (res.text !== undefined && typeof res.text !== 'string') return false;

  // blob must be string if present
  if (res.blob !== undefined && typeof res.blob !== 'string') return false;

  return true;
}

/**
 * Validate that a message is NOT in legacy format
 *
 * Legacy format (should reject):
 * {
 *   type: 'MCP_UI_ACTION',
 *   action: { type: 'CALL_TOOL', ... }
 * }
 *
 * @param msg - Message to validate
 * @returns True if message is NOT legacy format
 */
export function isNotLegacyFormat(msg: any): boolean {
  if (!msg || typeof msg !== 'object') return true;

  // Reject legacy wrapper
  if (msg.type === 'MCP_UI_ACTION') return false;

  // Reject legacy nested action
  if (msg.action && typeof msg.action === 'object') return false;

  // Reject legacy action type names
  const legacyTypes = ['CALL_TOOL', 'SUBMIT_PROMPT', 'NOTIFY', 'NAVIGATE', 'TOOL_RESULT'];
  if (legacyTypes.includes(msg.type)) return false;

  // Reject legacy callbackId (should use messageId)
  if (msg.callbackId !== undefined && msg.messageId === undefined) return false;

  return true;
}

/**
 * Helper: Create a spec-compliant tool call message
 */
export function createToolCallMessage(toolName: string, params: Record<string, any>, messageId?: string): any {
  return {
    type: 'tool',
    payload: { toolName, params },
    ...(messageId && { messageId })
  };
}

/**
 * Helper: Create a spec-compliant prompt message
 */
export function createPromptMessage(prompt: string, messageId?: string): any {
  return {
    type: 'prompt',
    payload: { prompt },
    ...(messageId && { messageId })
  };
}

/**
 * Helper: Create a spec-compliant notify message
 */
export function createNotifyMessage(message: string, level?: string, messageId?: string): any {
  return {
    type: 'notify',
    payload: { message, ...(level && { level }) },
    ...(messageId && { messageId })
  };
}

/**
 * Helper: Create a spec-compliant link message
 */
export function createLinkMessage(url: string, messageId?: string): any {
  return {
    type: 'link',
    payload: { url },
    ...(messageId && { messageId })
  };
}

/**
 * Helper: Create a spec-compliant intent message
 */
export function createIntentMessage(intent: string, params: Record<string, any>, messageId?: string): any {
  return {
    type: 'intent',
    payload: { intent, params },
    ...(messageId && { messageId })
  };
}

/**
 * Helper: Create a spec-compliant acknowledgment message
 */
export function createAcknowledgment(messageId: string): any {
  return {
    type: 'ui-message-received',
    messageId
  };
}

/**
 * Helper: Create a spec-compliant response message
 */
export function createResponseMessage(messageId: string, result?: any, error?: string): any {
  return {
    type: 'ui-message-response',
    messageId,
    ...(result !== undefined && { result }),
    ...(error !== undefined && { error })
  };
}
