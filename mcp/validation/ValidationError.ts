/**
 * ValidationError.ts
 * Custom error classes for validation and sanitization failures
 *
 * Usage:
 * ```typescript
 * throw new ValidationError('Invalid input', 'username', 'string', 123);
 * throw new SchemaValidationError(zodError);
 * throw new SanitizationError('SQL injection detected', 'query');
 * ```
 */

import { ZodError, ZodIssue } from 'zod';

/**
 * Field-level validation error details
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  expected?: string;
  actual?: any;
  code?: string;
}

/**
 * Base validation error class
 */
export class ValidationError extends Error {
  public readonly isValidationError = true;
  public readonly field?: string;
  public readonly expected?: string;
  public readonly actual?: any;
  public readonly details: ValidationErrorDetail[];

  constructor(
    message: string,
    field?: string,
    expected?: string,
    actual?: any,
    details?: ValidationErrorDetail[]
  ) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.expected = expected;
    this.actual = actual;
    this.details = details || (field ? [{
      field,
      message,
      expected,
      actual,
    }] : []);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  /**
   * Format error for JSON-RPC response
   */
  toJsonRpc(): { code: number; message: string; data?: any } {
    return {
      code: -32602, // Invalid params
      message: this.message,
      data: {
        validationErrors: this.details,
      },
    };
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    if (this.details.length === 1) {
      const detail = this.details[0];
      return `${detail.field}: ${detail.message}`;
    }
    return `${this.message} (${this.details.length} validation errors)`;
  }
}

/**
 * Schema validation error (wraps Zod errors)
 */
export class SchemaValidationError extends ValidationError {
  public readonly zodError?: ZodError;

  constructor(zodError: ZodError, context?: string) {
    const details = SchemaValidationError.parseZodError(zodError);
    const message = context
      ? `Schema validation failed for ${context}`
      : 'Schema validation failed';

    super(message, undefined, undefined, undefined, details);
    this.name = 'SchemaValidationError';
    this.zodError = zodError;
  }

  /**
   * Parse Zod error into our ValidationErrorDetail format
   */
  private static parseZodError(zodError: ZodError): ValidationErrorDetail[] {
    return zodError.issues.map((issue: ZodIssue) => {
      const field = issue.path.join('.');
      return {
        field: field || 'root',
        message: issue.message,
        code: issue.code,
        expected: this.getExpectedType(issue),
        actual: undefined, // Zod doesn't always provide the actual value
      };
    });
  }

  /**
   * Extract expected type from Zod issue
   */
  private static getExpectedType(issue: ZodIssue): string | undefined {
    switch (issue.code) {
      case 'invalid_type':
        return (issue as any).expected;
      case 'too_small':
        return `minimum ${(issue as any).minimum}`;
      case 'too_big':
        return `maximum ${(issue as any).maximum}`;
      default:
        // For other types, try to extract useful info
        if ('expected' in issue) {
          return String((issue as any).expected);
        }
        return undefined;
    }
  }
}

/**
 * Sanitization error
 */
export class SanitizationError extends Error {
  public readonly isSanitizationError = true;
  public readonly field?: string;
  public readonly reason: string;
  public readonly dangerous?: string;

  constructor(message: string, field?: string, reason?: string, dangerous?: string) {
    super(message);
    this.name = 'SanitizationError';
    this.field = field;
    this.reason = reason || message;
    this.dangerous = dangerous;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SanitizationError);
    }
  }

  /**
   * Format error for JSON-RPC response
   */
  toJsonRpc(): { code: number; message: string; data?: any } {
    return {
      code: -32602, // Invalid params
      message: this.message,
      data: {
        field: this.field,
        reason: this.reason,
        dangerous: this.dangerous ? '[REDACTED]' : undefined,
      },
    };
  }
}

/**
 * Type guard for ValidationError
 */
export function isValidationError(error: any): error is ValidationError {
  return error && error.isValidationError === true;
}

/**
 * Type guard for SanitizationError
 */
export function isSanitizationError(error: any): error is SanitizationError {
  return error && error.isSanitizationError === true;
}

/**
 * Convert any error to JSON-RPC format
 */
export function errorToJsonRpc(error: any): { code: number; message: string; data?: any } {
  if (isValidationError(error) || isSanitizationError(error)) {
    return error.toJsonRpc();
  }

  // Generic error
  return {
    code: -32603, // Internal error
    message: error.message || 'An unknown error occurred',
  };
}