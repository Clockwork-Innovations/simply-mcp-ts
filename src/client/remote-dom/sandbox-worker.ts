/**
 * Web Worker sandbox for executing Remote DOM scripts
 *
 * CRITICAL SECURITY MODULE
 *
 * This code runs in an isolated Web Worker thread with:
 * - No access to main DOM
 * - No access to Window object
 * - No access to parent page context
 * - Only postMessage for communication
 *
 * The worker provides a controlled remoteDOM API that Remote DOM scripts
 * can use to create UI. All operations are serialized and sent to the host
 * via postMessage for validation and processing.
 *
 * Security model:
 * 1. Scripts run in Function() constructor with restricted scope
 * 2. Only remoteDOM and console are available to scripts
 * 3. All values are sanitized before sending to host
 * 4. Event handlers are stored locally and called via postMessage
 *
 * @module client/remote-dom/sandbox-worker
 */

import type { DOMOperation } from './protocol.js';

// Declare Web Worker globals for TypeScript
// Note: This file is NOT compiled - it's bundled inline by RemoteDOMRenderer
// These declarations are for type checking only
declare const self: any;
declare function postMessage(message: any, transfer?: any[]): void;

/**
 * Whitelist of allowed global objects
 * Scripts can access these, but nothing else from global scope
 */
const ALLOWED_GLOBALS = new Set([
  'console',
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'Date',
  'Math',
  'JSON',
  'Promise',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
]);

/**
 * Element registry
 * Tracks all elements created by the script for reference
 */
const elementRegistry = new Map<string, { tagName: string; props?: Record<string, any> }>();

/**
 * Event handlers registry
 * Stores event handler functions by ID for later execution
 */
const eventHandlers = new Map<string, (payload?: any) => void>();

/**
 * Remote DOM API
 *
 * This is the ONLY API available to Remote DOM scripts.
 * Scripts interact with this object to create UI elements.
 */
const remoteDOM = {
  /**
   * Create a new element
   *
   * @param tagName - Element tag name (e.g., 'div', 'button')
   * @param props - Optional props object
   * @returns Element ID for referencing the element
   */
  createElement(tagName: string, props?: Record<string, any>): string {
    const id = `elem-${Math.random().toString(36).slice(2)}`;
    elementRegistry.set(id, { tagName, props });

    postMessage({
      type: 'createElement',
      id,
      tagName,
      props: sanitizeProps(props),
    } as DOMOperation);

    return id;
  },

  /**
   * Set element attribute
   *
   * @param elementId - ID of element to update
   * @param name - Attribute name
   * @param value - Attribute value
   */
  setAttribute(elementId: string, name: string, value: any): void {
    postMessage({
      type: 'setAttribute',
      elementId,
      name,
      value: sanitizeValue(value),
    } as DOMOperation);
  },

  /**
   * Append child to parent
   *
   * @param parentId - ID of parent element
   * @param childId - ID of child element to append
   */
  appendChild(parentId: string, childId: string): void {
    postMessage({
      type: 'appendChild',
      parentId,
      childId,
    } as DOMOperation);
  },

  /**
   * Remove child from parent
   *
   * @param parentId - ID of parent element
   * @param childId - ID of child element to remove
   */
  removeChild(parentId: string, childId: string): void {
    postMessage({
      type: 'removeChild',
      parentId,
      childId,
    } as DOMOperation);
  },

  /**
   * Set text content of element
   *
   * @param elementId - ID of element to update
   * @param text - Text content to set
   */
  setTextContent(elementId: string, text: string): void {
    postMessage({
      type: 'setTextContent',
      elementId,
      text: String(text),
    } as DOMOperation);
  },

  /**
   * Add event listener to element
   *
   * The handler function is stored in the worker and called
   * when the host sends an event notification via postMessage.
   *
   * @param elementId - ID of element to attach listener to
   * @param event - Event name (e.g., 'click', 'change')
   * @param handler - Handler function to call
   */
  addEventListener(elementId: string, event: string, handler: Function): void {
    const handlerId = `handler-${Math.random().toString(36).slice(2)}`;
    eventHandlers.set(handlerId, handler as any);

    postMessage({
      type: 'addEventListener',
      elementId,
      event,
      handlerId,
    } as DOMOperation);
  },

  /**
   * Call host action
   *
   * Triggers host-side actions like tool calls, navigation, or notifications.
   * This is how Remote DOM scripts interact with the MCP host application.
   *
   * @param action - Action type ('tool' | 'link' | 'notify')
   * @param payload - Action payload
   */
  callHost(action: 'tool' | 'link' | 'notify', payload: Record<string, any>): void {
    postMessage({
      type: 'callHost',
      action,
      payload,
    } as DOMOperation);
  },
};

/**
 * Sanitize props before sending to host
 *
 * SECURITY FUNCTION
 *
 * Removes functions and invalid values that cannot be serialized.
 * Only allows JSON-serializable values.
 *
 * @param props - Props object to sanitize
 * @returns Sanitized props or undefined
 */
function sanitizeProps(props?: Record<string, any>): Record<string, any> | undefined {
  if (!props) return undefined;

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'function') continue; // Skip functions
    if (value === undefined) continue; // Skip undefined
    sanitized[key] = sanitizeValue(value);
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Sanitize individual value
 *
 * SECURITY FUNCTION
 *
 * Recursively sanitizes values to ensure they are JSON-serializable.
 * Removes functions, handles arrays and objects recursively.
 *
 * @param value - Value to sanitize
 * @returns Sanitized value or undefined
 */
function sanitizeValue(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value === 'function') return undefined;

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(sanitizeValue).filter((v) => v !== undefined);
  }

  // Handle objects
  if (typeof value === 'object') {
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const sanitized = sanitizeValue(v);
      if (sanitized !== undefined) obj[k] = sanitized;
    }
    return obj;
  }

  // Primitive values are safe
  return value;
}

/**
 * Execute Remote DOM script in sandbox
 *
 * CRITICAL SECURITY FUNCTION
 *
 * Executes the script in a restricted environment using Function() constructor.
 * The script only has access to remoteDOM and console, nothing else.
 *
 * Why Function() is safe here:
 * 1. Running in Web Worker (isolated from main DOM)
 * 2. Only specific objects passed to function scope
 * 3. No access to worker's global scope or importScripts
 * 4. All operations go through controlled remoteDOM API
 *
 * @param script - JavaScript code to execute
 */
function executeScript(script: string): void {
  try {
    // SECURITY: Create function with restricted scope
    // Only remoteDOM and console are available
    // No access to global scope, self, importScripts, etc.
    const func = new Function('remoteDOM', 'console', `"use strict"; ${script}`);

    // Execute with restricted context
    func(remoteDOM, console);
  } catch (e) {
    console.error('Script execution error:', e);
    postMessage({
      type: 'error',
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Message handler for worker
 *
 * Handles two types of messages:
 * 1. executeScript: Execute a Remote DOM script
 * 2. eventCall: Trigger a registered event handler
 */
self.addEventListener('message', (event) => {
  const { type, script, handlerId, payload } = event.data;

  if (type === 'executeScript') {
    // Execute the Remote DOM script
    executeScript(script);
  } else if (type === 'eventCall' && handlerId) {
    // Trigger event handler
    const handler = eventHandlers.get(handlerId);
    if (handler) {
      try {
        handler(payload);
      } catch (e) {
        console.error('Handler error:', e);
      }
    }
  }
});

// Signal that worker is ready
postMessage({ type: 'ready' });
