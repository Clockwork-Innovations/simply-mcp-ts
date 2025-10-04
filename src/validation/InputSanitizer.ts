/**
 * InputSanitizer.ts
 * Sanitization functions to prevent common attack vectors
 *
 * Usage:
 * ```typescript
 * const sanitizer = new InputSanitizer({ strictMode: true });
 * const safe = sanitizer.sanitizeString(userInput);
 * const safeObj = sanitizer.sanitizeObject(complexInput);
 * ```
 */

import { SanitizationError } from './ValidationError.js';

/**
 * Sanitization configuration
 */
export interface SanitizerConfig {
  /** Strict mode throws errors instead of sanitizing (default: false) */
  strictMode?: boolean;
  /** Maximum object depth to prevent DoS (default: 10) */
  maxDepth?: number;
  /** Maximum string length (default: 10000) */
  maxStringLength?: number;
  /** Maximum array length (default: 1000) */
  maxArrayLength?: number;
  /** Allow HTML tags (default: false) */
  allowHtml?: boolean;
  /** Custom dangerous patterns to check */
  customDangerousPatterns?: RegExp[];
}

/**
 * Sanitization result
 */
export interface SanitizationResult<T = any> {
  /** Sanitized value */
  value: T;
  /** Whether the value was modified */
  modified: boolean;
  /** Warnings about potentially dangerous content */
  warnings: string[];
}

/**
 * Input sanitizer class
 */
export class InputSanitizer {
  private config: Required<SanitizerConfig>;

  // Common dangerous patterns
  private static readonly SQL_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--|\;|\/\*|\*\/)/g,
    /('|(\\')|(\\x27)|(\\u0027))/g,
  ];

  private static readonly SHELL_PATTERNS = [
    /(\$\(|\`|&&|\|\||;|>|<|\|)/g,
    /(rm\s+-rf|curl|wget|bash|sh|eval|exec)/gi,
  ];

  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers like onclick=
    /javascript:/gi,
    /<img[^>]+src[^>]*>/gi,
  ];

  private static readonly PATH_TRAVERSAL_PATTERNS = [
    /\.\.[\/\\]/g, // ../ or ..\
    /[\/\\]\.\.$/g, // ends with /.. or \..
  ];

  constructor(config: SanitizerConfig = {}) {
    this.config = {
      strictMode: config.strictMode ?? false,
      maxDepth: config.maxDepth ?? 10,
      maxStringLength: config.maxStringLength ?? 10000,
      maxArrayLength: config.maxArrayLength ?? 1000,
      allowHtml: config.allowHtml ?? false,
      customDangerousPatterns: config.customDangerousPatterns ?? [],
    };
  }

  /**
   * Sanitize a string value
   */
  sanitizeString(input: string, field?: string): SanitizationResult<string> {
    const warnings: string[] = [];
    let value = input;
    let modified = false;

    // Check string length
    if (value.length > this.config.maxStringLength) {
      if (this.config.strictMode) {
        throw new SanitizationError(
          `String exceeds maximum length of ${this.config.maxStringLength}`,
          field,
          'STRING_TOO_LONG'
        );
      }
      value = value.substring(0, this.config.maxStringLength);
      modified = true;
      warnings.push(`String truncated to ${this.config.maxStringLength} characters`);
    }

    // Check for SQL injection patterns
    if (this.hasDangerousPattern(value, InputSanitizer.SQL_PATTERNS)) {
      if (this.config.strictMode) {
        throw new SanitizationError(
          'Potential SQL injection detected',
          field,
          'SQL_INJECTION',
          value
        );
      }
      warnings.push('Potential SQL injection pattern detected');
    }

    // Check for shell injection patterns
    if (this.hasDangerousPattern(value, InputSanitizer.SHELL_PATTERNS)) {
      if (this.config.strictMode) {
        throw new SanitizationError(
          'Potential shell injection detected',
          field,
          'SHELL_INJECTION',
          value
        );
      }
      warnings.push('Potential shell injection pattern detected');
    }

    // Check for XSS patterns
    if (!this.config.allowHtml && this.hasDangerousPattern(value, InputSanitizer.XSS_PATTERNS)) {
      if (this.config.strictMode) {
        throw new SanitizationError(
          'Potential XSS attack detected',
          field,
          'XSS_ATTACK',
          value
        );
      }
      // Strip dangerous HTML
      value = this.stripHtml(value);
      modified = true;
      warnings.push('HTML tags removed');
    }

    // Check for path traversal
    if (this.hasDangerousPattern(value, InputSanitizer.PATH_TRAVERSAL_PATTERNS)) {
      if (this.config.strictMode) {
        throw new SanitizationError(
          'Path traversal detected',
          field,
          'PATH_TRAVERSAL',
          value
        );
      }
      warnings.push('Path traversal pattern detected');
    }

    // Check custom patterns
    if (this.hasDangerousPattern(value, this.config.customDangerousPatterns)) {
      if (this.config.strictMode) {
        throw new SanitizationError(
          'Custom dangerous pattern detected',
          field,
          'CUSTOM_PATTERN',
          value
        );
      }
      warnings.push('Custom dangerous pattern detected');
    }

    // Remove null bytes
    if (value.includes('\0')) {
      value = value.replace(/\0/g, '');
      modified = true;
      warnings.push('Null bytes removed');
    }

    return { value, modified, warnings };
  }

  /**
   * Sanitize an object recursively
   */
  sanitizeObject(
    input: any,
    depth: number = 0,
    path: string = 'root'
  ): SanitizationResult<any> {
    const warnings: string[] = [];
    let modified = false;

    // Check depth limit
    if (depth > this.config.maxDepth) {
      throw new SanitizationError(
        `Object depth exceeds maximum of ${this.config.maxDepth}`,
        path,
        'MAX_DEPTH_EXCEEDED'
      );
    }

    // Handle null and undefined
    if (input === null || input === undefined) {
      return { value: input, modified: false, warnings: [] };
    }

    // Handle primitives
    if (typeof input === 'string') {
      return this.sanitizeString(input, path);
    }
    if (typeof input === 'number' || typeof input === 'boolean') {
      return { value: input, modified: false, warnings: [] };
    }

    // Handle arrays
    if (Array.isArray(input)) {
      if (input.length > this.config.maxArrayLength) {
        if (this.config.strictMode) {
          throw new SanitizationError(
            `Array exceeds maximum length of ${this.config.maxArrayLength}`,
            path,
            'ARRAY_TOO_LONG'
          );
        }
        input = input.slice(0, this.config.maxArrayLength);
        modified = true;
        warnings.push(`Array truncated to ${this.config.maxArrayLength} items`);
      }

      const sanitizedArray = input.map((item, index) => {
        const result = this.sanitizeObject(item, depth + 1, `${path}[${index}]`);
        if (result.modified) modified = true;
        warnings.push(...result.warnings);
        return result.value;
      });

      return { value: sanitizedArray, modified, warnings };
    }

    // Handle objects
    if (typeof input === 'object') {
      const sanitizedObject: any = {};

      for (const [key, value] of Object.entries(input)) {
        // Sanitize the key itself
        const keyResult = this.sanitizeString(key, `${path}.key`);
        if (keyResult.modified) modified = true;
        warnings.push(...keyResult.warnings);

        // Sanitize the value
        const valueResult = this.sanitizeObject(
          value,
          depth + 1,
          `${path}.${keyResult.value}`
        );
        if (valueResult.modified) modified = true;
        warnings.push(...valueResult.warnings);

        sanitizedObject[keyResult.value] = valueResult.value;
      }

      return { value: sanitizedObject, modified, warnings };
    }

    // Unknown type, return as-is
    return { value: input, modified: false, warnings: [] };
  }

  /**
   * Sanitize for SQL contexts (additional safety layer)
   */
  sanitizeForSql(input: string, field?: string): string {
    const result = this.sanitizeString(input, field);

    if (result.warnings.some(w => w.includes('SQL injection'))) {
      // Additional SQL-specific sanitization
      return result.value
        .replace(/'/g, "''") // Escape single quotes
        .replace(/"/g, '""') // Escape double quotes
        .replace(/\\/g, '\\\\'); // Escape backslashes
    }

    return result.value;
  }

  /**
   * Sanitize for shell contexts (additional safety layer)
   */
  sanitizeForShell(input: string, field?: string): string {
    const result = this.sanitizeString(input, field);

    // Always escape shell special characters
    return result.value
      .replace(/[\$\(\)`&|;<>\\]/g, '\\$&')
      .replace(/\n/g, ' ') // Replace newlines
      .replace(/\r/g, ''); // Remove carriage returns
  }

  /**
   * Sanitize HTML (strip dangerous tags and attributes)
   */
  sanitizeHtml(input: string, field?: string): string {
    if (this.config.allowHtml) {
      return input;
    }
    return this.stripHtml(input);
  }

  /**
   * Strip HTML tags from string
   */
  private stripHtml(input: string): string {
    return input
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'");
  }

  /**
   * Check if string matches dangerous patterns
   */
  private hasDangerousPattern(input: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(input));
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<SanitizerConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SanitizerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export a default instance for convenience
export const defaultSanitizer = new InputSanitizer();

// Export convenience functions
export function sanitizeString(input: string, field?: string): SanitizationResult<string> {
  return defaultSanitizer.sanitizeString(input, field);
}

export function sanitizeObject(input: any, depth?: number): SanitizationResult<any> {
  return defaultSanitizer.sanitizeObject(input, depth);
}

export function sanitizeForSql(input: string, field?: string): string {
  return defaultSanitizer.sanitizeForSql(input, field);
}

export function sanitizeForShell(input: string, field?: string): string {
  return defaultSanitizer.sanitizeForShell(input, field);
}

export function sanitizeHtml(input: string, field?: string): string {
  return defaultSanitizer.sanitizeHtml(input, field);
}

// Example usage and tests (in comments)
/*
// Test 1: Basic string sanitization
const sanitizer = new InputSanitizer();
const result1 = sanitizer.sanitizeString("Hello World");
console.log(result1); // { value: "Hello World", modified: false, warnings: [] }

// Test 2: SQL injection detection
const result2 = sanitizer.sanitizeString("admin' OR '1'='1");
console.log(result2); // { value: "admin' OR '1'='1", modified: false, warnings: ['Potential SQL injection pattern detected'] }

// Test 3: Strict mode
const strictSanitizer = new InputSanitizer({ strictMode: true });
try {
  strictSanitizer.sanitizeString("DROP TABLE users;");
} catch (error) {
  console.log(error.message); // "Potential SQL injection detected"
}

// Test 4: XSS prevention
const result4 = sanitizer.sanitizeString("<script>alert('xss')</script>");
console.log(result4); // HTML stripped, warnings added

// Test 5: Object sanitization
const result5 = sanitizer.sanitizeObject({
  username: "john_doe",
  query: "SELECT * FROM users",
  nested: {
    data: "test"
  }
});
console.log(result5.warnings); // Contains SQL injection warning

// Test 6: Shell injection
const shellResult = sanitizer.sanitizeForShell("test && rm -rf /");
console.log(shellResult); // Escaped: "test \\&\\& rm -rf /"

// Test 7: Depth limit
const deepObject = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: {} } } } } } } } } } } };
try {
  sanitizer.sanitizeObject(deepObject);
} catch (error) {
  console.log(error.message); // "Object depth exceeds maximum of 10"
}
*/