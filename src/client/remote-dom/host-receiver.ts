/**
 * Host-side receiver for Remote DOM operations
 *
 * Processes DOM operations from the Web Worker sandbox and translates
 * them into React component updates. This is the bridge between the
 * worker's virtual DOM operations and the actual React rendering.
 *
 * The HostReceiver maintains:
 * - Virtual DOM element tree
 * - Event handler registry
 * - Callbacks for updating React state
 *
 * @module client/remote-dom/host-receiver
 */

import type { DOMOperation } from './protocol.js';

/**
 * Host Receiver Options
 *
 * Callbacks that are invoked when operations are processed.
 * These callbacks typically update React state to trigger re-renders.
 */
export interface HostReceiverOptions {
  /**
   * Called when a new element is created
   *
   * @param id - Element ID
   * @param tagName - Element tag name
   * @param props - Initial props
   */
  onCreateElement?: (id: string, tagName: string, props?: Record<string, any>) => void;

  /**
   * Called when an element attribute is set
   *
   * @param elementId - Element ID
   * @param name - Attribute name
   * @param value - Attribute value
   */
  onSetAttribute?: (elementId: string, name: string, value: any) => void;

  /**
   * Called when a child is appended to a parent
   *
   * @param parentId - Parent element ID
   * @param childId - Child element ID
   */
  onAppendChild?: (parentId: string, childId: string) => void;

  /**
   * Called when a child is removed from a parent
   *
   * @param parentId - Parent element ID
   * @param childId - Child element ID
   */
  onRemoveChild?: (parentId: string, childId: string) => void;

  /**
   * Called when element text content is set
   *
   * @param elementId - Element ID
   * @param text - Text content
   */
  onSetTextContent?: (elementId: string, text: string) => void;

  /**
   * Called when an event listener is added
   *
   * @param elementId - Element ID
   * @param event - Event name
   * @param handlerId - Handler ID
   */
  onAddEventListener?: (elementId: string, event: string, handlerId: string) => void;

  /**
   * Called when host action is requested
   *
   * @param action - Action type
   * @param payload - Action payload
   */
  onCallHost?: (action: string, payload: Record<string, any>) => void;
}

/**
 * Host Receiver Class
 *
 * Processes DOM operations from the Web Worker and maintains
 * the virtual DOM state on the host side.
 *
 * @example
 * ```typescript
 * const receiver = new HostReceiver({
 *   onCreateElement: (id, tagName, props) => {
 *     elements.set(id, { id, tagName, props, children: [] });
 *   },
 *   onAppendChild: (parentId, childId) => {
 *     const parent = elements.get(parentId);
 *     if (parent) parent.children.push(childId);
 *   }
 * });
 *
 * // Process operations from worker
 * worker.onmessage = (event) => {
 *   receiver.processOperation(event.data);
 * };
 * ```
 */
export class HostReceiver {
  private options: HostReceiverOptions;
  private eventHandlers = new Map<string, Function>();

  /**
   * Create a new HostReceiver
   *
   * @param options - Callbacks for processing operations
   */
  constructor(options: HostReceiverOptions) {
    this.options = options;
  }

  /**
   * Process a DOM operation from the worker
   *
   * Routes the operation to the appropriate handler based on type.
   * All operations have been validated by validateOperation() before
   * reaching this point.
   *
   * @param op - DOM operation to process
   *
   * @example
   * ```typescript
   * worker.onmessage = (event) => {
   *   const op = event.data;
   *
   *   // Validate first (done in renderer)
   *   if (!validateOperation(op)) return;
   *
   *   // Process the operation
   *   receiver.processOperation(op);
   * };
   * ```
   */
  processOperation(op: DOMOperation): void {
    switch (op.type) {
      case 'createElement':
        this.options.onCreateElement?.(op.id, op.tagName, op.props);
        break;

      case 'setAttribute':
        this.options.onSetAttribute?.(op.elementId, op.name, op.value);
        break;

      case 'appendChild':
        this.options.onAppendChild?.(op.parentId, op.childId);
        break;

      case 'removeChild':
        this.options.onRemoveChild?.(op.parentId, op.childId);
        break;

      case 'setTextContent':
        this.options.onSetTextContent?.(op.elementId, op.text);
        break;

      case 'addEventListener':
        this.options.onAddEventListener?.(op.elementId, op.event, op.handlerId);
        break;

      case 'callHost':
        this.options.onCallHost?.(op.action, op.payload);
        break;

      default:
        // TypeScript ensures exhaustive checking
        // This should never be reached if validateOperation is used
        console.warn('Unknown operation type:', (op as any).type);
    }
  }

  /**
   * Register an event handler
   *
   * Stores a handler function that can be triggered later.
   * Used for connecting DOM events to worker event handlers.
   *
   * @param handlerId - Unique handler ID
   * @param handler - Handler function to call
   *
   * @example
   * ```typescript
   * receiver.registerEventHandler('handler-123', () => {
   *   worker.postMessage({
   *     type: 'eventCall',
   *     handlerId: 'handler-123'
   *   });
   * });
   * ```
   */
  registerEventHandler(handlerId: string, handler: Function): void {
    this.eventHandlers.set(handlerId, handler);
  }

  /**
   * Trigger an event handler
   *
   * Calls a registered handler function with optional payload.
   * Used when DOM events occur on rendered components.
   *
   * @param handlerId - Handler ID to trigger
   * @param payload - Optional payload to pass to handler
   *
   * @example
   * ```typescript
   * // When button is clicked in React
   * onClick={() => {
   *   receiver.triggerEventHandler('handler-123', { button: 1 });
   * }}
   * ```
   */
  triggerEventHandler(handlerId: string, payload?: any): void {
    const handler = this.eventHandlers.get(handlerId);
    if (handler) {
      try {
        handler(payload);
      } catch (e) {
        console.error('Error triggering event handler:', e);
      }
    } else {
      console.warn('Handler not found:', handlerId);
    }
  }

  /**
   * Clear all registered event handlers
   *
   * Useful for cleanup when component unmounts.
   */
  clearHandlers(): void {
    this.eventHandlers.clear();
  }

  /**
   * Get all registered handler IDs
   *
   * Useful for debugging and testing.
   *
   * @returns Array of handler IDs
   */
  getHandlerIds(): string[] {
    return Array.from(this.eventHandlers.keys());
  }
}
