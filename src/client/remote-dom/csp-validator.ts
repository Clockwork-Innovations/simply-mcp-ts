/**
 * Content Security Policy (CSP) Validator for Remote DOM
 *
 * Validates and enforces CSP directives to prevent XSS and code injection attacks.
 *
 * Security Targets:
 * - Validate script-src directives
 * - Block unsafe-inline and unsafe-eval
 * - Validate external resource URLs
 * - Enforce strict CSP policies
 *
 * CSP Specification:
 * - https://www.w3.org/TR/CSP/
 * - https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 *
 * @module client/remote-dom/csp-validator
 */

/**
 * CSP Directive Types
 */
export type CSPDirective =
  | 'default-src'
  | 'script-src'
  | 'style-src'
  | 'img-src'
  | 'font-src'
  | 'connect-src'
  | 'media-src'
  | 'object-src'
  | 'frame-src'
  | 'worker-src'
  | 'child-src'
  | 'form-action'
  | 'frame-ancestors'
  | 'base-uri';

/**
 * CSP Source Values
 */
export type CSPSource =
  | "'self'"
  | "'none'"
  | "'unsafe-inline'"
  | "'unsafe-eval'"
  | "'strict-dynamic'"
  | "'report-sample'"
  | string; // URL patterns

/**
 * CSP Policy Configuration
 */
export interface CSPPolicy {
  [directive: string]: CSPSource[];
}

/**
 * CSP Validation Result
 */
export interface CSPValidationResult {
  valid: boolean;
  violations: CSPViolation[];
  warnings: string[];
}

/**
 * CSP Violation
 */
export interface CSPViolation {
  directive: string;
  blockedValue: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
}

/**
 * CSP Validator Error
 */
export class CSPValidationError extends Error {
  constructor(
    public violations: CSPViolation[],
    message?: string
  ) {
    super(message || `CSP validation failed with ${violations.length} violation(s)`);
    this.name = 'CSPValidationError';
  }
}

/**
 * Default CSP Policy for Remote DOM
 *
 * Conservative default policy that blocks most dangerous operations.
 * Can be customized via CSPValidatorConfig.
 */
export const DEFAULT_CSP_POLICY: CSPPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'"], // No inline scripts, no eval
  'style-src': ["'self'", "'unsafe-inline'"], // Allow inline styles for convenience
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'data:', 'https:'],
  'connect-src': ["'self'"], // API calls only to same origin
  'media-src': ["'self'", 'https:'],
  'object-src': ["'none'"], // Block plugins
  'frame-src': ["'none'"], // Block iframes
  'worker-src': ["'self'", 'blob:'], // Allow Web Workers from blob URLs
  'child-src': ["'self'", 'blob:'],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"], // Prevent clickjacking
  'base-uri': ["'self'"],
};

/**
 * CSP Validator Configuration
 */
export interface CSPValidatorConfig {
  /**
   * CSP policy to enforce
   * @default DEFAULT_CSP_POLICY
   */
  policy?: CSPPolicy;

  /**
   * Throw error on violations
   * @default true
   */
  throwOnViolation?: boolean;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * CSP Validator
 *
 * Validates scripts, resources, and operations against CSP policies.
 */
export class CSPValidator {
  private policy: CSPPolicy;
  private config: Required<CSPValidatorConfig>;

  constructor(config: CSPValidatorConfig = {}) {
    this.config = {
      policy: config.policy ?? DEFAULT_CSP_POLICY,
      throwOnViolation: config.throwOnViolation ?? true,
      debug: config.debug ?? false,
    };
    this.policy = this.config.policy;
  }

  /**
   * Validate script content against CSP
   *
   * Checks for dangerous patterns like eval, Function constructor, etc.
   *
   * @param script - Script content to validate
   * @returns Validation result
   * @throws CSPValidationError if violations found and throwOnViolation is true
   */
  validateScript(script: string): CSPValidationResult {
    const violations: CSPViolation[] = [];
    const warnings: string[] = [];

    // Check for eval usage (various forms)
    // Matches: eval(), window.eval(), window["eval"](), this.eval(), self.eval()
    if (/\beval\s*\(|[\w.]+\[["']eval["']\]\s*\(|(window|self|this|globalThis)\.eval\s*\(/.test(script)) {
      violations.push({
        directive: 'script-src',
        blockedValue: 'eval()',
        reason: "eval() is blocked by CSP. Use safer alternatives or enable 'unsafe-eval' (not recommended).",
        severity: 'high',
      });
    }

    // Check for Function constructor (various forms)
    // Matches: new Function(), Function(), new window.Function(), window.Function()
    if (/\b(new\s+)?Function\s*\(|\b(new\s+)?(window|self|this|globalThis)\.Function\s*\(/.test(script)) {
      violations.push({
        directive: 'script-src',
        blockedValue: 'new Function()',
        reason: "Function() constructor is blocked by CSP. Use safer alternatives or enable 'unsafe-eval' (not recommended).",
        severity: 'high',
      });
    }

    // Check for setTimeout/setInterval with string arguments
    if (/setTimeout\s*\(\s*['"`]/.test(script) || /setInterval\s*\(\s*['"`]/.test(script)) {
      violations.push({
        directive: 'script-src',
        blockedValue: 'setTimeout/setInterval with string',
        reason: "setTimeout/setInterval with string arguments is blocked by CSP. Use function references instead.",
        severity: 'high',
      });
    }

    // Check for inline event handlers (onerror, onclick, etc.)
    if (/\bon\w+\s*=\s*['"`]/.test(script)) {
      warnings.push(
        "Inline event handlers detected. While not strictly CSP violations in worker context, consider using addEventListener instead."
      );
    }

    // Check for document.write (not available in worker but still dangerous pattern)
    if (/document\.write/.test(script)) {
      warnings.push(
        "document.write() detected. This is not available in Web Worker context and may indicate ported code that needs review."
      );
    }

    const result: CSPValidationResult = {
      valid: violations.length === 0,
      violations,
      warnings,
    };

    if (this.config.debug) {
      if (violations.length > 0) {
        console.error('[CSPValidator] Script validation failed:', violations);
      }
      if (warnings.length > 0) {
        console.warn('[CSPValidator] Script validation warnings:', warnings);
      }
    }

    if (!result.valid && this.config.throwOnViolation) {
      throw new CSPValidationError(violations);
    }

    return result;
  }

  /**
   * Validate URL against CSP directive
   *
   * Checks if a URL is allowed by the specified CSP directive.
   *
   * @param url - URL to validate
   * @param directive - CSP directive to check against
   * @returns Validation result
   */
  validateURL(url: string, directive: CSPDirective): CSPValidationResult {
    const violations: CSPViolation[] = [];
    const warnings: string[] = [];

    const sources = this.policy[directive] || this.policy['default-src'] || ["'none'"];

    // Parse URL
    let urlObj: URL;
    try {
      // For data: and blob: URLs, we need to handle them specially
      // because they may not have a proper base URL
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        urlObj = new URL(url);
      } else if (typeof window !== 'undefined' && window.location) {
        urlObj = new URL(url, window.location.href);
      } else {
        // In test environment without window, try to parse directly
        urlObj = new URL(url);
      }
    } catch (error) {
      violations.push({
        directive,
        blockedValue: url,
        reason: `Invalid URL format: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'high',
      });
      return { valid: false, violations, warnings };
    }

    // Check against each source in the directive
    let allowed = false;
    for (const source of sources) {
      if (this.matchesSource(urlObj, source)) {
        allowed = true;
        break;
      }
    }

    if (!allowed) {
      violations.push({
        directive,
        blockedValue: url,
        reason: `URL not allowed by ${directive}. Allowed sources: ${sources.join(', ')}`,
        severity: 'high',
      });
    }

    const result: CSPValidationResult = {
      valid: violations.length === 0,
      violations,
      warnings,
    };

    if (this.config.debug && !result.valid) {
      console.error('[CSPValidator] URL validation failed:', violations);
    }

    if (!result.valid && this.config.throwOnViolation) {
      throw new CSPValidationError(violations);
    }

    return result;
  }

  /**
   * Check if URL matches a CSP source
   *
   * @private
   */
  private matchesSource(url: URL, source: CSPSource): boolean {
    // Get URL protocol
    const protocol = url.protocol;

    // Special keywords
    if (source === "'self'") {
      // In Node.js/test environment, window might not be defined
      if (typeof window !== 'undefined' && window.location) {
        return url.origin === window.location.origin;
      }
      // In test environment, be conservative - only match localhost
      return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    }
    if (source === "'none'") {
      return false;
    }

    // Protocol matches (data:, blob:, https:, http:, etc.)
    if (source.endsWith(':')) {
      return protocol === source;
    }

    // Wildcard
    if (source === '*') {
      return true;
    }

    // Exact match or pattern match
    if (typeof source === 'string' && !source.startsWith("'")) {
      // Parse source as URL or pattern
      try {
        const sourceUrl = new URL(source);
        return url.origin === sourceUrl.origin;
      } catch {
        // Pattern matching (simplified - full CSP pattern matching is complex)
        const pattern = source.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(url.href);
      }
    }

    return false;
  }

  /**
   * Validate inline style
   *
   * Checks if inline styles are allowed by style-src directive.
   *
   * @param style - Inline style content
   * @returns Validation result
   */
  validateInlineStyle(style: string): CSPValidationResult {
    const violations: CSPViolation[] = [];
    const warnings: string[] = [];

    const sources = this.policy['style-src'] || this.policy['default-src'] || ["'none'"];

    if (!sources.includes("'unsafe-inline'")) {
      violations.push({
        directive: 'style-src',
        blockedValue: 'inline style',
        reason: "Inline styles are blocked by CSP. Add 'unsafe-inline' to style-src or use external stylesheets.",
        severity: 'medium',
      });
    }

    // Check for dangerous style patterns
    if (/expression\s*\(/.test(style)) {
      violations.push({
        directive: 'style-src',
        blockedValue: 'CSS expression()',
        reason: 'CSS expressions are dangerous and blocked by CSP (IE-specific vulnerability).',
        severity: 'high',
      });
    }

    if (/@import\s+url\s*\(/.test(style)) {
      warnings.push('CSS @import detected. Ensure imported stylesheets comply with CSP.');
    }

    const result: CSPValidationResult = {
      valid: violations.length === 0,
      violations,
      warnings,
    };

    if (this.config.debug && !result.valid) {
      console.error('[CSPValidator] Inline style validation failed:', violations);
    }

    if (!result.valid && this.config.throwOnViolation) {
      throw new CSPValidationError(violations);
    }

    return result;
  }

  /**
   * Get current CSP policy
   *
   * @returns Current policy
   */
  getPolicy(): Readonly<CSPPolicy> {
    return this.policy;
  }

  /**
   * Get CSP policy as string (for HTTP header)
   *
   * @returns CSP header value
   */
  getPolicyString(): string {
    const directives: string[] = [];
    for (const [directive, sources] of Object.entries(this.policy)) {
      directives.push(`${directive} ${sources.join(' ')}`);
    }
    return directives.join('; ');
  }

  /**
   * Check if CSP allows unsafe operations
   *
   * @returns Whether policy allows unsafe-eval or unsafe-inline
   */
  hasUnsafeDirectives(): boolean {
    for (const sources of Object.values(this.policy)) {
      if (sources.includes("'unsafe-eval'") || sources.includes("'unsafe-inline'")) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Create CSP validator helper
 *
 * Convenience function for creating a CSP validator.
 *
 * @param config - Validator configuration
 * @returns CSPValidator instance
 *
 * @example
 * ```typescript
 * const validator = createCSPValidator({
 *   policy: {
 *     'script-src': ["'self'"],
 *     'img-src': ["'self'", 'https:'],
 *   },
 *   throwOnViolation: true,
 * });
 *
 * // Validate script
 * validator.validateScript(scriptContent);
 *
 * // Validate URL
 * validator.validateURL('https://example.com/api', 'connect-src');
 * ```
 */
export function createCSPValidator(config?: CSPValidatorConfig): CSPValidator {
  return new CSPValidator(config);
}
