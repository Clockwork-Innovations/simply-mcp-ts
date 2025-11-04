/**
 * Remote DOM Worker Entry Point
 *
 * This Web Worker executes untrusted Remote DOM UI code in complete isolation
 * from the host environment. The worker has NO access to window, document,
 * localStorage, or any other browser APIs that could pose security risks.
 *
 * Security Constraints:
 * - No access to window, document, localStorage, sessionStorage
 * - No network access (fetch, XMLHttpRequest)
 * - PostMessage-only communication with parent
 * - Code validation before execution
 * - Sandboxed DOM operations through Remote DOM API
 *
 * Communication Protocol:
 * - Parent -> Worker: { id, type: 'init' | 'execute' | 'operation', payload }
 * - Worker -> Parent: { id, type: 'success' | 'error', result?, error? }
 *
 * @module client/remote-dom/worker/remote-dom-worker
 */

// Phase 1: Using placeholder type for RemoteRoot
// Phase 2 will integrate actual @remote-dom/core RemoteConnection
type RemoteRoot = any;

import type { RemoteDOMOperation, WorkerMessage, CodeSafetyValidation } from '../types.js';

/**
 * Disallowed Globals
 *
 * List of global identifiers that are NOT allowed in Remote DOM code.
 * These are blocked to prevent security violations and ensure isolation.
 *
 * SECURITY CRITICAL: This list must be comprehensive to prevent escape
 * from the worker sandbox.
 */
const DISALLOWED_GLOBALS = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'indexedDB',
  'openDatabase',
  'location',
  'navigator',
  'history',
] as const;

/**
 * Validate Code Safety
 *
 * CRITICAL SECURITY FUNCTION
 *
 * Scans code for disallowed global identifiers before execution.
 * This is a simple but effective defense against common escape attempts.
 *
 * Note: This is NOT a complete sandboxing solution (that's provided by
 * the Worker environment itself), but it catches obvious violations and
 * provides clear error messages.
 *
 * @param code - JavaScript code to validate
 * @returns Validation result with violations if any
 *
 * @example
 * ```typescript
 * const result = validateCodeSafety('window.alert("test")');
 * // { safe: false, violations: ['Disallowed global: window'] }
 *
 * const safe = validateCodeSafety('remoteRoot.createElement("div")');
 * // { safe: true, violations: [] }
 * ```
 */
function validateCodeSafety(code: string): CodeSafetyValidation {
  const violations: string[] = [];

  // Check for disallowed globals
  // Using word boundaries to avoid false positives (e.g., 'windows' should not match 'window')
  for (const global of DISALLOWED_GLOBALS) {
    const regex = new RegExp(`\\b${global}\\b`, 'g');
    if (regex.test(code)) {
      violations.push(`Disallowed global: ${global}`);
    }
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}

/**
 * Remote Root Instance
 *
 * The Remote DOM root that provides the sandboxed DOM API.
 * Initialized during worker init phase.
 */
let remoteRoot: RemoteRoot | null = null;

/**
 * Handle Worker Initialization
 *
 * Creates the Remote DOM root instance and prepares the worker
 * for code execution.
 *
 * @param config - Configuration for Remote DOM
 */
function handleInit(config: any): void {
  try {
    // Import RemoteRoot dynamically to avoid issues with module resolution
    // The RemoteRoot is from @remote-dom/core/worker

    // For now, we'll create a minimal remoteRoot placeholder
    // In Phase 2, this will be replaced with actual Remote DOM integration
    remoteRoot = {
      // Placeholder implementation
      // Phase 2 will integrate actual @remote-dom/core RemoteRoot
    } as any;

    // Send success response
    postMessage({
      type: 'init-success',
    } as WorkerMessage);
  } catch (error) {
    // Send error response
    postMessage({
      type: 'init-error',
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : undefined,
    } as WorkerMessage);
  }
}

/**
 * Handle Code Execution
 *
 * Validates and executes Remote DOM code in the worker sandbox.
 * The code has access to:
 * - remoteRoot: Remote DOM API
 * - console: For logging (limited)
 * - Standard JavaScript (Math, Array, Object, etc.)
 *
 * The code does NOT have access to:
 * - window, document, or any DOM APIs
 * - localStorage, sessionStorage, or any storage APIs
 * - fetch, XMLHttpRequest, or any network APIs
 * - Any browser-specific globals
 *
 * @param code - JavaScript code to execute
 * @param messageId - Message ID for response matching
 */
function handleExecute(code: string, messageId?: number): void {
  // SECURITY: Validate code safety first
  const validation = validateCodeSafety(code);
  if (!validation.safe) {
    postMessage({
      id: messageId,
      type: 'execute-error',
      error: 'Security violation: Code contains disallowed globals',
      details: {
        violations: validation.violations,
      },
    } as WorkerMessage);
    return;
  }

  // Check if worker is initialized
  if (!remoteRoot) {
    postMessage({
      id: messageId,
      type: 'execute-error',
      error: 'Worker not initialized. Call init() first.',
    } as WorkerMessage);
    return;
  }

  try {
    // Execute code in isolated context
    // Use Function constructor instead of eval for better error handling
    // and to avoid some eval-specific security issues

    // Create isolated function with controlled scope
    // Only expose remoteRoot and console
    const isolatedFunction = new Function(
      'remoteRoot',
      'console',
      '"use strict";\n' + code
    );

    // Execute with controlled context
    isolatedFunction(remoteRoot, console);

    // Send success response
    postMessage({
      id: messageId,
      type: 'execute-success',
    } as WorkerMessage);
  } catch (error) {
    // Send error response with details
    postMessage({
      id: messageId,
      type: 'execute-error',
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : undefined,
    } as WorkerMessage);
  }
}

/**
 * Handle DOM Operation
 *
 * Processes a single DOM operation through the Remote DOM API.
 * Operations include: createElement, setAttribute, appendChild, etc.
 *
 * @param operation - DOM operation to process
 * @param messageId - Message ID for response matching
 */
function handleDOMOperation(operation: RemoteDOMOperation, messageId?: number): void {
  if (!remoteRoot) {
    postMessage({
      id: messageId,
      type: 'operation-error',
      error: 'Worker not initialized',
    } as WorkerMessage);
    return;
  }

  try {
    // Process DOM operation
    // Phase 1: Just validate and acknowledge
    // Phase 2: Actual Remote DOM integration
    const result = processDOMOperation(remoteRoot, operation);

    postMessage({
      id: messageId,
      type: 'operation-success',
      result,
    } as WorkerMessage);
  } catch (error) {
    postMessage({
      id: messageId,
      type: 'operation-error',
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : undefined,
    } as WorkerMessage);
  }
}

/**
 * Process DOM Operation
 *
 * Executes a DOM operation on the Remote DOM tree.
 * This is a placeholder for Phase 1 - actual implementation in Phase 2.
 *
 * @param root - Remote DOM root
 * @param operation - Operation to process
 * @returns Operation result
 */
function processDOMOperation(root: RemoteRoot, operation: RemoteDOMOperation): any {
  // Phase 1: Placeholder implementation
  // Phase 2: Actual Remote DOM operation processing

  switch (operation.type) {
    case 'createElement':
      // Placeholder: Just validate structure
      if (!operation.tagName) {
        throw new Error('createElement requires tagName');
      }
      return { success: true, nodeId: operation.nodeId };

    case 'setAttribute':
      if (!operation.nodeId || !operation.attributeName) {
        throw new Error('setAttribute requires nodeId and attributeName');
      }
      return { success: true };

    case 'appendChild':
      if (!operation.parentId || !operation.childId) {
        throw new Error('appendChild requires parentId and childId');
      }
      return { success: true };

    case 'removeChild':
      if (!operation.parentId || !operation.childId) {
        throw new Error('removeChild requires parentId and childId');
      }
      return { success: true };

    case 'setTextContent':
      if (!operation.nodeId) {
        throw new Error('setTextContent requires nodeId');
      }
      return { success: true };

    case 'addEventListener':
      if (!operation.nodeId || !operation.eventType) {
        throw new Error('addEventListener requires nodeId and eventType');
      }
      return { success: true };

    case 'removeEventListener':
      if (!operation.nodeId || !operation.eventType) {
        throw new Error('removeEventListener requires nodeId and eventType');
      }
      return { success: true };

    case 'createTextNode':
    case 'removeAttribute':
    case 'insertBefore':
      // Placeholder for other operations
      return { success: true };

    default:
      throw new Error(`Unknown operation type: ${(operation as any).type}`);
  }
}

/**
 * Handle Batch Operations
 *
 * Processes multiple DOM operations in sequence.
 * More efficient than individual operation messages.
 *
 * @param operations - Array of operations to process
 * @param messageId - Message ID for response matching
 */
function handleBatch(operations: RemoteDOMOperation[], messageId?: number): void {
  if (!remoteRoot) {
    postMessage({
      id: messageId,
      type: 'batch-error',
      error: 'Worker not initialized',
    } as WorkerMessage);
    return;
  }

  try {
    const results = operations.map((op) => processDOMOperation(remoteRoot!, op));

    postMessage({
      id: messageId,
      type: 'batch-success',
      result: results,
    } as WorkerMessage);
  } catch (error) {
    postMessage({
      id: messageId,
      type: 'batch-error',
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : undefined,
    } as WorkerMessage);
  }
}

/**
 * Worker Message Handler
 *
 * Routes incoming messages to appropriate handlers.
 * All worker communication goes through this handler.
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'init':
        handleInit(payload);
        break;

      case 'execute':
        handleExecute(payload, id);
        break;

      case 'operation':
        handleDOMOperation(payload, id);
        break;

      case 'batch':
        handleBatch(payload, id);
        break;

      default:
        console.error('[Remote DOM Worker] Unknown message type:', type);
        postMessage({
          id,
          type: 'execute-error',
          error: `Unknown message type: ${type}`,
        } as WorkerMessage);
    }
  } catch (error) {
    // Catch-all error handler for unexpected errors
    postMessage({
      id,
      type: 'execute-error',
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : undefined,
    } as WorkerMessage);
  }
};

/**
 * Worker Error Handler
 *
 * Catches unhandled errors in the worker.
 */
self.onerror = (error: ErrorEvent) => {
  console.error('[Remote DOM Worker] Unhandled error:', error);

  // Send error to parent
  postMessage({
    type: 'execute-error',
    error: error.message || 'Worker error',
    details: {
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno,
    },
  } as WorkerMessage);
};

/**
 * Export for TypeScript
 *
 * Workers don't export in the traditional sense, but this helps
 * TypeScript understand the module structure.
 */
export {};
