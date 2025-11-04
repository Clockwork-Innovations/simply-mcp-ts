/**
 * Remote DOM Type Definitions
 *
 * Complete type system for Remote DOM operations, components, and protocol.
 * This file consolidates all Remote DOM types for the Web Worker sandbox system.
 *
 * Architecture Overview:
 * - DOM Operations: Actions sent from worker to host
 * - Node & Tree Types: Virtual DOM representation
 * - Configuration: Remote DOM setup options
 * - Error Types: Specialized error classes
 *
 * @module client/remote-dom/types
 */

/**
 * DOM Operation Types
 *
 * All possible operations that can be sent from the Web Worker
 * to the host for processing.
 */
export type RemoteDOMOperationType =
  | 'createElement'
  | 'createTextNode'
  | 'setAttribute'
  | 'removeAttribute'
  | 'appendChild'
  | 'removeChild'
  | 'insertBefore'
  | 'setTextContent'
  | 'addEventListener'
  | 'removeEventListener';

/**
 * DOM Operation Structure
 *
 * Base structure for all DOM operations. Each operation type
 * will have different required fields based on its purpose.
 */
export interface RemoteDOMOperation {
  /**
   * Operation type identifier
   */
  type: RemoteDOMOperationType;

  /**
   * Node ID (for operations targeting a specific node)
   */
  nodeId?: string;

  /**
   * Parent node ID (for tree operations)
   */
  parentId?: string;

  /**
   * Child node ID (for tree operations)
   */
  childId?: string;

  /**
   * Reference node ID (for insertBefore)
   */
  beforeId?: string;

  /**
   * Tag name (for createElement)
   */
  tagName?: string;

  /**
   * Attribute name (for setAttribute/removeAttribute)
   */
  attributeName?: string;

  /**
   * Attribute value (for setAttribute)
   */
  attributeValue?: any;

  /**
   * Text content (for setTextContent/createTextNode)
   */
  textContent?: string;

  /**
   * Event type (for addEventListener/removeEventListener)
   */
  eventType?: string;

  /**
   * Event listener identifier (for addEventListener/removeEventListener)
   */
  eventListener?: string;
}

/**
 * Remote DOM Node
 *
 * Represents a node in the Remote DOM virtual tree.
 * Can be either an element node or a text node.
 */
export interface RemoteDOMNode {
  /**
   * Unique node identifier
   */
  id: string;

  /**
   * Node type (element or text)
   */
  type: 'element' | 'text';

  /**
   * Element tag name (only for element nodes)
   */
  tagName?: string;

  /**
   * Element attributes (only for element nodes)
   */
  attributes?: Record<string, any>;

  /**
   * Text content (for text nodes or element text content)
   */
  textContent?: string;

  /**
   * Child nodes
   */
  children?: RemoteDOMNode[];

  /**
   * Registered event listeners (event type -> handler ID)
   */
  events?: Record<string, string>;
}

/**
 * Remote DOM Tree
 *
 * Complete virtual DOM tree structure maintained by the worker.
 * The host mirrors this tree in React components.
 */
export interface RemoteDOMTree {
  /**
   * Root node of the tree
   */
  root: RemoteDOMNode;

  /**
   * Flat map of all nodes by ID for fast lookup
   */
  nodes: Map<string, RemoteDOMNode>;
}

/**
 * Component Props
 *
 * Standard props structure for Remote DOM components.
 * Extends React component props with Remote DOM-specific fields.
 */
export interface RemoteDOMComponentProps {
  /**
   * Dynamic props (attribute name -> value)
   */
  [key: string]: any;

  /**
   * Child elements
   */
  children?: React.ReactNode;

  /**
   * Inline styles
   */
  style?: React.CSSProperties;

  /**
   * CSS class name
   */
  className?: string;
}

/**
 * Remote DOM Configuration
 *
 * Configuration options for the Remote DOM system.
 * Controls security, performance, and debugging behavior.
 */
export interface RemoteDOMConfig {
  /**
   * Framework type (react, preact, etc.)
   * @default 'react'
   */
  framework?: string;

  /**
   * Enable strict security mode
   * When enabled, additional security checks are performed
   * @default true
   */
  strictSecurity?: boolean;

  /**
   * Maximum number of DOM nodes allowed
   * Prevents DoS attacks from creating excessive nodes
   * @default 1000
   */
  maxNodes?: number;

  /**
   * Operation batching interval (milliseconds)
   * Groups multiple operations for efficiency
   * @default 16 (one frame at 60fps)
   */
  batchInterval?: number;

  /**
   * Enable debug logging
   * Logs all operations and state changes
   * @default false
   */
  debug?: boolean;
}

/**
 * Worker Message Types
 *
 * All message types that can be sent between worker and host.
 */
export type WorkerMessageType =
  | 'init'
  | 'init-success'
  | 'init-error'
  | 'execute'
  | 'execute-success'
  | 'execute-error'
  | 'operation'
  | 'operation-success'
  | 'operation-error'
  | 'batch'
  | 'batch-success'
  | 'batch-error';

/**
 * Worker Message Structure
 *
 * Base structure for all worker messages.
 */
export interface WorkerMessage {
  /**
   * Unique message identifier for matching requests/responses
   */
  id?: number;

  /**
   * Message type
   */
  type: WorkerMessageType;

  /**
   * Message payload (varies by type)
   */
  payload?: any;

  /**
   * Result data (for success responses)
   */
  result?: any;

  /**
   * Error message (for error responses)
   */
  error?: string;

  /**
   * Detailed error information
   */
  details?: any;
}

/**
 * Remote DOM Error Base Class
 *
 * Base class for all Remote DOM errors.
 * Includes error code and optional details for debugging.
 */
export class RemoteDOMError extends Error {
  /**
   * Error code for programmatic handling
   */
  public readonly code: string;

  /**
   * Optional error details
   */
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'RemoteDOMError';
    this.code = code;
    this.details = details;

    // Maintain proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RemoteDOMError);
    }
  }
}

/**
 * Remote DOM Security Error
 *
 * Thrown when security violations are detected.
 * Examples:
 * - Code accessing disallowed globals (window, document, etc.)
 * - Unsafe operation attempts
 * - CSP violations
 */
export class RemoteDOMSecurityError extends RemoteDOMError {
  constructor(message: string, details?: any) {
    super(message, 'SECURITY_ERROR', details);
    this.name = 'RemoteDOMSecurityError';
  }
}

/**
 * Remote DOM Operation Error
 *
 * Thrown when DOM operations fail.
 * Examples:
 * - Invalid operation structure
 * - Missing required fields
 * - Operations on non-existent nodes
 */
export class RemoteDOMOperationError extends RemoteDOMError {
  constructor(message: string, details?: any) {
    super(message, 'OPERATION_ERROR', details);
    this.name = 'RemoteDOMOperationError';
  }
}

/**
 * Remote DOM Timeout Error
 *
 * Thrown when operations or execution timeout.
 * Examples:
 * - Worker initialization timeout
 * - Script execution timeout
 * - Operation response timeout
 */
export class RemoteDOMTimeoutError extends RemoteDOMError {
  constructor(message: string, details?: any) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'RemoteDOMTimeoutError';
  }
}

/**
 * Code Safety Validation Result
 *
 * Result of validating code for security issues.
 */
export interface CodeSafetyValidation {
  /**
   * Whether the code is safe to execute
   */
  safe: boolean;

  /**
   * List of security violations found
   */
  violations: string[];
}
