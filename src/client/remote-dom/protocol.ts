/**
 * Protocol definitions for Remote DOM communication
 *
 * Defines the serializable message protocol between Web Worker sandbox
 * and host React application. All operations must be JSON-serializable
 * (no functions, only primitive types and plain objects).
 *
 * Security: Only whitelisted operations are allowed. The validateOperation
 * function enforces this whitelist before any operation is processed.
 *
 * @module client/remote-dom/protocol
 */

/**
 * DOM Operation Union Type
 *
 * Complete set of operations that can be sent from Web Worker to host.
 * All operations are serializable and validated before processing.
 */
export type DOMOperation =
  | CreateElementOp
  | SetAttributeOp
  | AppendChildOp
  | RemoveChildOp
  | SetTextContentOp
  | AddEventListenerOp
  | CallHostOp;

/**
 * Create Element Operation
 *
 * Creates a new element in the virtual DOM with optional props.
 * The host translates this to a React component.
 */
export interface CreateElementOp {
  type: 'createElement';
  /**
   * Unique identifier for the element
   */
  id: string;
  /**
   * Tag name (must be in component whitelist)
   */
  tagName: string;
  /**
   * Initial props for the element (must be serializable)
   */
  props?: Record<string, any>;
}

/**
 * Set Attribute Operation
 *
 * Updates an attribute/prop on an existing element.
 * Used for dynamic updates after initial creation.
 */
export interface SetAttributeOp {
  type: 'setAttribute';
  /**
   * ID of element to update
   */
  elementId: string;
  /**
   * Attribute/prop name
   */
  name: string;
  /**
   * New value (must be serializable)
   */
  value: any;
}

/**
 * Append Child Operation
 *
 * Adds a child element to a parent element.
 * Establishes parent-child relationships in the virtual DOM.
 */
export interface AppendChildOp {
  type: 'appendChild';
  /**
   * ID of parent element
   */
  parentId: string;
  /**
   * ID of child element to append
   */
  childId: string;
}

/**
 * Remove Child Operation
 *
 * Removes a child element from a parent element.
 * Used for dynamic DOM updates.
 */
export interface RemoveChildOp {
  type: 'removeChild';
  /**
   * ID of parent element
   */
  parentId: string;
  /**
   * ID of child element to remove
   */
  childId: string;
}

/**
 * Set Text Content Operation
 *
 * Sets the text content of an element.
 * This is the primary way to add text to elements.
 */
export interface SetTextContentOp {
  type: 'setTextContent';
  /**
   * ID of element to update
   */
  elementId: string;
  /**
   * Text content to set
   */
  text: string;
}

/**
 * Add Event Listener Operation
 *
 * Registers an event handler for an element.
 * The actual handler runs in the worker; host just routes events back.
 */
export interface AddEventListenerOp {
  type: 'addEventListener';
  /**
   * ID of element to attach listener to
   */
  elementId: string;
  /**
   * Event name (e.g., 'click', 'change')
   */
  event: string;
  /**
   * Unique identifier for the handler (registered in worker)
   */
  handlerId: string;
}

/**
 * Call Host Operation
 *
 * Triggers host-side actions like tool calls, navigation, or notifications.
 * This is the primary way for Remote DOM scripts to interact with the host.
 *
 * Security: Action types are whitelisted and validated before execution.
 */
export interface CallHostOp {
  type: 'callHost';
  /**
   * Action type (whitelisted)
   * - tool: Execute an MCP tool
   * - link: Navigate to a URL
   * - notify: Show a notification
   */
  action: 'tool' | 'link' | 'notify';
  /**
   * Action-specific payload
   */
  payload: Record<string, any>;
}

/**
 * Validate DOM Operation
 *
 * CRITICAL SECURITY FUNCTION
 *
 * Validates that an operation from the worker is safe to process.
 * Checks that:
 * 1. Operation has correct structure (object with type field)
 * 2. Operation type is in the whitelist
 * 3. Operation is serializable (enforced by postMessage, but we check type)
 *
 * This is the first line of defense against malicious or malformed operations.
 *
 * @param op - Operation to validate
 * @returns True if operation is valid and safe
 *
 * @example
 * ```typescript
 * worker.onmessage = (event) => {
 *   const op = event.data;
 *
 *   // Always validate before processing
 *   if (!validateOperation(op)) {
 *     console.warn('Invalid operation rejected:', op);
 *     return;
 *   }
 *
 *   // Safe to process
 *   hostReceiver.processOperation(op);
 * };
 * ```
 */
export function validateOperation(op: any): op is DOMOperation {
  // Check basic structure
  if (!op || typeof op !== 'object') {
    return false;
  }

  if (!op.type || typeof op.type !== 'string') {
    return false;
  }

  // Whitelist of allowed operations and their required fields
  // SECURITY: Only these operations can be processed by the host
  // Each operation type has specific required fields that must be present and have correct types
  switch (op.type) {
    case 'createElement':
      // Required: id (string), tagName (string)
      return typeof op.id === 'string' && typeof op.tagName === 'string';

    case 'setAttribute':
      // Required: elementId (string), name (string), value (any serializable value including null)
      // Value will be converted to string when applied to DOM
      // null is explicitly allowed to support clearing attributes
      return (
        typeof op.elementId === 'string' &&
        typeof op.name === 'string' &&
        op.value !== undefined
      );

    case 'appendChild':
      // Required: parentId (string), childId (string)
      return typeof op.parentId === 'string' && typeof op.childId === 'string';

    case 'removeChild':
      // Required: parentId (string), childId (string)
      return typeof op.parentId === 'string' && typeof op.childId === 'string';

    case 'setTextContent':
      // Required: elementId (string), text (string)
      return typeof op.elementId === 'string' && typeof op.text === 'string';

    case 'addEventListener':
      // Required: elementId (string), event (string), handlerId (string)
      return (
        typeof op.elementId === 'string' &&
        typeof op.event === 'string' &&
        typeof op.handlerId === 'string'
      );

    case 'callHost':
      // Required: action (string), payload (object)
      return (
        typeof op.action === 'string' &&
        typeof op.payload === 'object' &&
        op.payload !== null
      );

    default:
      // Unknown operation type - reject
      return false;
  }
}
