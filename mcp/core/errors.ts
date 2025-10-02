/**
 * Custom error classes for handler execution
 */

/**
 * Base error class for all handler-related errors
 */
export class HandlerExecutionError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'HandlerExecutionError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a handler file cannot be found or loaded
 */
export class HandlerLoadError extends HandlerExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'HANDLER_LOAD_ERROR', details);
    this.name = 'HandlerLoadError';
  }
}

/**
 * Error thrown when handler code has syntax or execution errors
 */
export class HandlerSyntaxError extends HandlerExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'HANDLER_SYNTAX_ERROR', details);
    this.name = 'HandlerSyntaxError';
  }
}

/**
 * Error thrown when handler execution times out
 */
export class HandlerTimeoutError extends HandlerExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'HANDLER_TIMEOUT_ERROR', details);
    this.name = 'HandlerTimeoutError';
  }
}

/**
 * Error thrown when a network request fails
 */
export class HandlerNetworkError extends HandlerExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'HANDLER_NETWORK_ERROR', details);
    this.name = 'HandlerNetworkError';
  }
}

/**
 * Error thrown when a registry handler is not found
 */
export class HandlerNotFoundError extends HandlerExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'HANDLER_NOT_FOUND', details);
    this.name = 'HandlerNotFoundError';
  }
}

/**
 * Error thrown when handler configuration is invalid
 */
export class HandlerConfigError extends HandlerExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'HANDLER_CONFIG_ERROR', details);
    this.name = 'HandlerConfigError';
  }
}

/**
 * Error thrown when a handler violates permission constraints
 */
export class HandlerPermissionError extends HandlerExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'HANDLER_PERMISSION_ERROR', details);
    this.name = 'HandlerPermissionError';
  }
}
