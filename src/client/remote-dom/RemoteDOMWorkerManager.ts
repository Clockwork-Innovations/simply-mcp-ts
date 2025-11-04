/**
 * Remote DOM Worker Manager
 *
 * Manages the lifecycle of the Remote DOM Web Worker, including:
 * - Worker initialization and termination
 * - Message passing with request/response matching
 * - Timeout handling for operations
 * - Batch operation support
 * - Error propagation and handling
 *
 * This class provides a clean Promise-based API for interacting with
 * the Remote DOM worker, abstracting away the complexity of postMessage
 * communication and message ID tracking.
 *
 * @module client/remote-dom/RemoteDOMWorkerManager
 */

import type {
  RemoteDOMOperation,
  RemoteDOMConfig,
  WorkerMessage,
  RemoteDOMTimeoutError,
} from './types.js';

/**
 * Worker Manager Options
 *
 * Configuration for the RemoteDOMWorkerManager.
 */
export interface RemoteDOMWorkerManagerOptions {
  /**
   * Worker script URL (optional)
   *
   * If not provided, the worker will be created from inline code.
   * Use this option if you have a separate worker file.
   */
  workerURL?: string;

  /**
   * Timeout for worker operations (milliseconds)
   *
   * Operations that don't complete within this time will be rejected.
   * @default 5000
   */
  timeout?: number;

  /**
   * Enable verbose logging
   *
   * Logs all messages sent to and received from the worker.
   * Useful for debugging.
   * @default false
   */
  debug?: boolean;

  /**
   * Remote DOM configuration
   *
   * Passed to the worker during initialization.
   */
  config?: RemoteDOMConfig;
}

/**
 * Pending Message Tracker
 *
 * Tracks messages waiting for responses from the worker.
 */
interface PendingMessage {
  /**
   * Resolve the promise when response is received
   */
  resolve: (value: any) => void;

  /**
   * Reject the promise on error or timeout
   */
  reject: (error: Error) => void;

  /**
   * Timeout handle for cleanup
   */
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Remote DOM Worker Manager
 *
 * Manages Worker lifecycle and provides Promise-based API for communication.
 *
 * @example
 * ```typescript
 * // Create and initialize worker
 * const manager = new RemoteDOMWorkerManager({ debug: true });
 * await manager.init();
 *
 * // Execute Remote DOM code
 * await manager.execute(`
 *   const div = remoteRoot.createElement('div');
 *   console.log('Created div:', div);
 * `);
 *
 * // Send operation
 * await manager.sendOperation({
 *   type: 'createElement',
 *   tagName: 'button',
 *   nodeId: 'btn-1'
 * });
 *
 * // Cleanup
 * manager.terminate();
 * ```
 */
export class RemoteDOMWorkerManager {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingMessages = new Map<number, PendingMessage>();
  private options: Required<RemoteDOMWorkerManagerOptions>;

  /**
   * Create a new RemoteDOMWorkerManager
   *
   * @param options - Configuration options
   */
  constructor(options: RemoteDOMWorkerManagerOptions = {}) {
    // Set defaults
    this.options = {
      workerURL: options.workerURL ?? '',
      timeout: options.timeout ?? 5000,
      debug: options.debug ?? false,
      config: options.config ?? {},
    };
  }

  /**
   * Initialize the Worker
   *
   * Creates the worker, sets up message handlers, and sends initialization message.
   *
   * @throws Error if worker creation fails
   *
   * @example
   * ```typescript
   * const manager = new RemoteDOMWorkerManager();
   * await manager.init();
   * ```
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create worker from URL or inline script
        const workerURL = this.options.workerURL || this.createWorkerBlobURL();
        this.worker = new Worker(workerURL, { type: 'module' });

        if (this.options.debug) {
          console.log('[RemoteDOMWorkerManager] Worker created from:', workerURL);
        }

        // Setup message handler
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = this.handleWorkerError.bind(this);

        // Send init message and wait for response
        this.sendMessage('init', this.options.config)
          .then(() => {
            if (this.options.debug) {
              console.log('[RemoteDOMWorkerManager] Worker initialized successfully');
            }
            resolve();
          })
          .catch((error) => {
            if (this.options.debug) {
              console.error('[RemoteDOMWorkerManager] Initialization failed:', error);
            }
            reject(error);
          });
      } catch (error) {
        if (this.options.debug) {
          console.error('[RemoteDOMWorkerManager] Worker creation failed:', error);
        }
        reject(error);
      }
    });
  }

  /**
   * Execute Remote DOM Code
   *
   * Validates and executes JavaScript code in the worker sandbox.
   * The code has access to the remoteRoot API and console.
   *
   * @param code - JavaScript code to execute
   * @throws Error if execution fails or code is unsafe
   *
   * @example
   * ```typescript
   * await manager.execute(`
   *   const button = remoteRoot.createElement('button');
   *   button.textContent = 'Click me';
   * `);
   * ```
   */
  async execute(code: string): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not initialized. Call init() first.');
    }

    if (this.options.debug) {
      console.log('[RemoteDOMWorkerManager] Executing code:', code.substring(0, 100) + '...');
    }

    return this.sendMessage('execute', code);
  }

  /**
   * Send DOM Operation
   *
   * Sends a single DOM operation to the worker for processing.
   *
   * @param operation - DOM operation to send
   * @returns Operation result
   *
   * @example
   * ```typescript
   * const result = await manager.sendOperation({
   *   type: 'createElement',
   *   tagName: 'div',
   *   nodeId: 'my-div'
   * });
   * ```
   */
  async sendOperation(operation: RemoteDOMOperation): Promise<any> {
    if (!this.worker) {
      throw new Error('Worker not initialized. Call init() first.');
    }

    if (this.options.debug) {
      console.log('[RemoteDOMWorkerManager] Sending operation:', operation.type);
    }

    return this.sendMessage('operation', operation);
  }

  /**
   * Send Batch Operations
   *
   * Sends multiple DOM operations to the worker in a single message.
   * More efficient than sending individual operations.
   *
   * @param operations - Array of operations to send
   * @returns Array of operation results
   *
   * @example
   * ```typescript
   * const results = await manager.sendBatch([
   *   { type: 'createElement', tagName: 'div', nodeId: 'div1' },
   *   { type: 'createElement', tagName: 'span', nodeId: 'span1' },
   *   { type: 'appendChild', parentId: 'div1', childId: 'span1' }
   * ]);
   * ```
   */
  async sendBatch(operations: RemoteDOMOperation[]): Promise<any[]> {
    if (!this.worker) {
      throw new Error('Worker not initialized. Call init() first.');
    }

    if (this.options.debug) {
      console.log('[RemoteDOMWorkerManager] Sending batch:', operations.length, 'operations');
    }

    return this.sendMessage('batch', operations);
  }

  /**
   * Terminate the Worker
   *
   * Stops the worker and cleans up all pending messages.
   * After termination, the manager cannot be used until init() is called again.
   *
   * @example
   * ```typescript
   * manager.terminate();
   * // Manager is now unusable until init() is called again
   * ```
   */
  terminate(): void {
    if (this.worker) {
      if (this.options.debug) {
        console.log('[RemoteDOMWorkerManager] Terminating worker');
      }

      this.worker.terminate();
      this.worker = null;

      // Reject all pending messages
      Array.from(this.pendingMessages.entries()).forEach(([id, pending]) => {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Worker terminated'));
      });
      this.pendingMessages.clear();
    }
  }

  /**
   * Check if Worker is Active
   *
   * @returns True if worker is initialized and ready
   */
  isActive(): boolean {
    return this.worker !== null;
  }

  /**
   * Get Pending Message Count
   *
   * Useful for debugging and monitoring.
   *
   * @returns Number of messages waiting for responses
   */
  getPendingCount(): number {
    return this.pendingMessages.size;
  }

  // Private Methods

  /**
   * Send Message to Worker
   *
   * Internal method that handles message ID generation, timeout setup,
   * and promise management.
   *
   * @param type - Message type
   * @param payload - Message payload
   * @returns Promise that resolves with worker response
   */
  private sendMessage(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;

      // Setup timeout
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(id);
        const timeoutError = new Error(
          `Worker message timeout (${this.options.timeout}ms)`
        ) as Error & { code: string };
        timeoutError.code = 'TIMEOUT_ERROR';
        reject(timeoutError);
      }, this.options.timeout);

      // Track pending message
      this.pendingMessages.set(id, { resolve, reject, timeout });

      // Send message to worker
      const message: WorkerMessage = { id, type: type as any, payload };
      this.worker!.postMessage(message);

      if (this.options.debug) {
        console.log('[RemoteDOMWorkerManager] Sent message:', { id, type });
      }
    });
  }

  /**
   * Handle Worker Message
   *
   * Routes incoming messages from the worker to the appropriate
   * pending message handler.
   *
   * @param event - Message event from worker
   */
  private handleWorkerMessage(event: MessageEvent<WorkerMessage>): void {
    const { id, type, result, error, details } = event.data;

    if (this.options.debug) {
      console.log('[RemoteDOMWorkerManager] Received message:', { id, type });
    }

    // Handle messages without ID (broadcast messages)
    if (id === undefined) {
      if (this.options.debug) {
        console.log('[RemoteDOMWorkerManager] Received broadcast message:', type);
      }
      return;
    }

    // Find pending message
    const pending = this.pendingMessages.get(id);
    if (!pending) {
      console.warn('[RemoteDOMWorkerManager] Received response for unknown message ID:', id);
      return;
    }

    // Clear timeout
    clearTimeout(pending.timeout);
    this.pendingMessages.delete(id);

    // Handle response
    if (type.endsWith('-error')) {
      // Error response
      const errorObj = new Error(error || 'Worker error');
      if (details) {
        (errorObj as any).details = details;
      }
      pending.reject(errorObj);
    } else {
      // Success response
      pending.resolve(result);
    }
  }

  /**
   * Handle Worker Error
   *
   * Called when the worker encounters an unhandled error.
   * Rejects all pending messages and logs the error.
   *
   * @param error - Error event from worker
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('[RemoteDOMWorkerManager] Worker error:', error.message);

    if (this.options.debug) {
      console.error('[RemoteDOMWorkerManager] Worker error details:', {
        message: error.message,
        filename: error.filename,
        lineno: error.lineno,
        colno: error.colno,
      });
    }

    // Reject all pending messages
    const workerError = new Error(`Worker error: ${error.message}`);
    Array.from(this.pendingMessages.entries()).forEach(([id, pending]) => {
      clearTimeout(pending.timeout);
      pending.reject(workerError);
    });
    this.pendingMessages.clear();
  }

  /**
   * Create Worker Blob URL
   *
   * Creates an inline worker from the worker source code.
   * This avoids the need for a separate worker file.
   *
   * @returns Blob URL for the worker
   */
  private createWorkerBlobURL(): string {
    // Get worker code (from remote-dom-worker.ts)
    // In production, this would be bundled separately
    // For now, we'll create a minimal worker

    const workerCode = this.getWorkerCode();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }

  /**
   * Get Worker Code
   *
   * Returns the worker source code as a string.
   * In production, this would import from the built worker file.
   *
   * @returns Worker source code
   */
  private getWorkerCode(): string {
    // This is a simplified inline version for Phase 1
    // Phase 2 will load the actual compiled worker code
    return `
      // Simplified Remote DOM Worker (Phase 1)
      const DISALLOWED_GLOBALS = [
        'window', 'document', 'localStorage', 'sessionStorage', 'fetch',
        'XMLHttpRequest', 'WebSocket', 'indexedDB', 'openDatabase',
        'location', 'navigator', 'history'
      ];

      function validateCodeSafety(code) {
        const violations = [];
        for (const global of DISALLOWED_GLOBALS) {
          const regex = new RegExp('\\\\b' + global + '\\\\b', 'g');
          if (regex.test(code)) {
            violations.push('Disallowed global: ' + global);
          }
        }
        return { safe: violations.length === 0, violations };
      }

      let remoteRoot = null;

      function handleInit(id) {
        remoteRoot = {}; // Placeholder
        postMessage({ id, type: 'init-success' });
      }

      function handleExecute(code, id) {
        const validation = validateCodeSafety(code);
        if (!validation.safe) {
          postMessage({
            id,
            type: 'execute-error',
            error: 'Security violation',
            details: { violations: validation.violations }
          });
          return;
        }

        try {
          const func = new Function('remoteRoot', 'console', '"use strict";\\n' + code);
          func(remoteRoot, console);
          postMessage({ id, type: 'execute-success' });
        } catch (e) {
          postMessage({
            id,
            type: 'execute-error',
            error: e.message
          });
        }
      }

      function handleOperation(operation, id) {
        try {
          postMessage({ id, type: 'operation-success', result: { success: true } });
        } catch (e) {
          postMessage({ id, type: 'operation-error', error: e.message });
        }
      }

      function handleBatch(operations, id) {
        try {
          const results = operations.map(() => ({ success: true }));
          postMessage({ id, type: 'batch-success', result: results });
        } catch (e) {
          postMessage({ id, type: 'batch-error', error: e.message });
        }
      }

      self.onmessage = (event) => {
        const { id, type, payload } = event.data;

        switch (type) {
          case 'init':
            handleInit(id);
            break;
          case 'execute':
            handleExecute(payload, id);
            break;
          case 'operation':
            handleOperation(payload, id);
            break;
          case 'batch':
            handleBatch(payload, id);
            break;
          default:
            postMessage({ id, type: 'execute-error', error: 'Unknown message type: ' + type });
        }
      };

      self.onerror = (error) => {
        console.error('[Worker] Error:', error);
      };
    `;
  }
}
