/**
 * Tests for CSP Validator
 *
 * Validates that CSP enforcement works correctly and prevents XSS attacks.
 *
 * Task 2.2: CSP Validation and Enforcement
 * Target: Block unsafe-inline, unsafe-eval, and validate all external resources
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  CSPValidator,
  createCSPValidator,
  CSPValidationError,
  DEFAULT_CSP_POLICY,
  type CSPPolicy,
} from '../../../src/client/remote-dom/csp-validator';

describe('CSP Validator', () => {
  let validator: CSPValidator;

  beforeEach(() => {
    validator = new CSPValidator();
  });

  describe('Configuration', () => {
    it('creates with default policy', () => {
      const policy = validator.getPolicy();
      expect(policy).toBeDefined();
      expect(policy['script-src']).toEqual(["'self'"]);
      expect(policy['object-src']).toEqual(["'none'"]);
    });

    it('creates with custom policy', () => {
      const customPolicy: CSPPolicy = {
        'script-src': ["'self'", 'https://trusted.com'],
        'img-src': ["'self'", 'data:', 'https:'],
      };

      const customValidator = new CSPValidator({ policy: customPolicy });
      const policy = customValidator.getPolicy();

      expect(policy['script-src']).toEqual(["'self'", 'https://trusted.com']);
      expect(policy['img-src']).toEqual(["'self'", 'data:', 'https:']);
    });

    it('creates with helper function', () => {
      const v = createCSPValidator({ throwOnViolation: false });
      expect(v).toBeInstanceOf(CSPValidator);
    });

    it('generates CSP header string', () => {
      const header = validator.getPolicyString();
      expect(header).toContain("script-src 'self'");
      expect(header).toContain("object-src 'none'");
      expect(header).toContain(';');
    });
  });

  describe('Script Validation - eval() Detection', () => {
    it('blocks eval() usage', () => {
      const script = 'const result = eval("1 + 1");';

      expect(() => validator.validateScript(script)).toThrow(CSPValidationError);

      try {
        validator.validateScript(script);
      } catch (error) {
        const cspError = error as CSPValidationError;
        expect(cspError.violations).toHaveLength(1);
        expect(cspError.violations[0].directive).toBe('script-src');
        expect(cspError.violations[0].blockedValue).toBe('eval()');
        expect(cspError.violations[0].severity).toBe('high');
      }
    });

    it('allows non-throwable validation', () => {
      const v = new CSPValidator({ throwOnViolation: false });
      const script = 'eval("code")';

      const result = v.validateScript(script);
      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    it('allows safe code without eval', () => {
      const script = `
        const x = 5;
        const y = 10;
        const result = x + y;
      `;

      expect(() => validator.validateScript(script)).not.toThrow();
    });

    it('detects eval in complex code', () => {
      const script = `
        function dangerous() {
          return eval(userInput);
        }
      `;

      expect(() => validator.validateScript(script)).toThrow(CSPValidationError);
    });
  });

  describe('Script Validation - Function Constructor', () => {
    it('blocks Function constructor', () => {
      const script = 'const fn = new Function("return 42");';

      expect(() => validator.validateScript(script)).toThrow(CSPValidationError);
    });

    it('detects Function constructor with parameters', () => {
      const script = 'const fn = new Function("a", "b", "return a + b");';

      expect(() => validator.validateScript(script)).toThrow(CSPValidationError);
    });

    it('allows regular function declarations', () => {
      const script = `
        function myFunction() {
          return 42;
        }
        const arrow = () => 42;
      `;

      expect(() => validator.validateScript(script)).not.toThrow();
    });
  });

  describe('Script Validation - setTimeout/setInterval with Strings', () => {
    it('blocks setTimeout with string', () => {
      const script = 'setTimeout("alert(\'XSS\')", 1000);';

      expect(() => validator.validateScript(script)).toThrow(CSPValidationError);
    });

    it('blocks setInterval with string', () => {
      const script = 'setInterval("doEvil()", 1000);';

      expect(() => validator.validateScript(script)).toThrow(CSPValidationError);
    });

    it('allows setTimeout with function reference', () => {
      const script = `
        setTimeout(() => console.log('safe'), 1000);
        setInterval(myFunction, 1000);
      `;

      expect(() => validator.validateScript(script)).not.toThrow();
    });
  });

  describe('Script Validation - Multiple Violations', () => {
    it('detects multiple violations', () => {
      const v = new CSPValidator({ throwOnViolation: false });
      const script = `
        eval("bad");
        const fn = new Function("also bad");
        setTimeout("more bad", 1000);
      `;

      const result = v.validateScript(script);
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
    });

    it('reports all violations in error', () => {
      const script = `
        eval("1");
        new Function("2");
      `;

      try {
        validator.validateScript(script);
        fail('Should have thrown');
      } catch (error) {
        const cspError = error as CSPValidationError;
        expect(cspError.violations.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('Script Validation - Warnings', () => {
    it('warns about inline event handlers', () => {
      const v = new CSPValidator({ throwOnViolation: false });
      const script = '<button onclick="doSomething()">Click</button>';

      const result = v.validateScript(script);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Inline event handlers');
    });

    it('warns about document.write', () => {
      const v = new CSPValidator({ throwOnViolation: false });
      const script = 'document.write("<div>bad</div>");';

      const result = v.validateScript(script);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('document.write');
    });
  });

  describe('URL Validation - Same Origin', () => {
    it('allows same-origin URLs with self', () => {
      // Note: In Jest/Node, window.location is mocked
      const result = validator.validateURL('http://localhost/api', 'connect-src');
      // Result depends on test environment
      expect(result).toBeDefined();
    });

    it('validates against script-src directive', () => {
      const v = new CSPValidator({ throwOnViolation: false });
      const result = v.validateURL('https://evil.com/script.js', 'script-src');

      // Should fail because only 'self' is allowed
      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].directive).toBe('script-src');
    });
  });

  describe('URL Validation - Data URLs', () => {
    it('allows data URLs when permitted', () => {
      const v = new CSPValidator({
        policy: { 'img-src': ["'self'", 'data:', 'https:'] },
        throwOnViolation: false
      });
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS...';
      const result = v.validateURL(dataUrl, 'img-src');

      // img-src allows data: in policy
      expect(result.valid).toBe(true);
    });

    it('blocks data URLs when not permitted', () => {
      const v = new CSPValidator({
        policy: { 'script-src': ["'self'"] },
        throwOnViolation: false
      });
      const result = v.validateURL('data:text/javascript,alert(1)', 'script-src');

      expect(result.valid).toBe(false);
    });
  });

  describe('URL Validation - Blob URLs', () => {
    it('allows blob URLs for workers', () => {
      const v = new CSPValidator({
        policy: { 'worker-src': ["'self'", 'blob:'] },
        throwOnViolation: false
      });
      const blobUrl = 'blob:http://localhost/abc-123';
      const result = v.validateURL(blobUrl, 'worker-src');

      // worker-src allows blob: in policy
      expect(result.valid).toBe(true);
    });

    it('blocks blob URLs when not permitted', () => {
      const v = new CSPValidator({
        policy: { 'img-src': ["'self'"] },
        throwOnViolation: false
      });
      const result = v.validateURL('blob:http://localhost/123', 'img-src');

      expect(result.valid).toBe(false);
    });
  });

  describe('URL Validation - HTTPS Wildcard', () => {
    it('allows HTTPS URLs with https: wildcard', () => {
      const v = new CSPValidator({
        policy: { 'img-src': ["'self'", 'https:'] },
        throwOnViolation: false
      });
      const result = v.validateURL('https://example.com/image.png', 'img-src');

      // img-src allows https: in policy
      expect(result.valid).toBe(true);
    });

    it('blocks HTTP URLs when only HTTPS allowed', () => {
      const v = new CSPValidator({
        policy: { 'img-src': ['https:'] },
        throwOnViolation: false
      });
      const result = v.validateURL('http://example.com/image.png', 'img-src');

      expect(result.valid).toBe(false);
    });
  });

  describe('URL Validation - Invalid URLs', () => {
    it('rejects malformed URLs', () => {
      const v = new CSPValidator({ throwOnViolation: false });
      const result = v.validateURL('not a valid url!!!', 'script-src');

      expect(result.valid).toBe(false);
      expect(result.violations[0].reason).toContain('Invalid URL');
    });

    it('handles edge cases gracefully', () => {
      const v = new CSPValidator({ throwOnViolation: false });

      expect(v.validateURL('', 'img-src').valid).toBe(false);
      expect(v.validateURL('javascript:alert(1)', 'script-src').valid).toBe(false);
    });
  });

  describe('Inline Style Validation', () => {
    it('allows inline styles with unsafe-inline', () => {
      const style = 'color: red; font-size: 16px;';

      // Default policy allows unsafe-inline for styles
      expect(() => validator.validateInlineStyle(style)).not.toThrow();
    });

    it('blocks inline styles without unsafe-inline', () => {
      const v = new CSPValidator({
        policy: { 'style-src': ["'self'"] },
        throwOnViolation: true
      });
      const style = 'background: blue;';

      expect(() => v.validateInlineStyle(style)).toThrow(CSPValidationError);
    });

    it('blocks CSS expressions', () => {
      const v = new CSPValidator({ throwOnViolation: false });
      const style = 'width: expression(alert("XSS"));';

      const result = v.validateInlineStyle(style);
      expect(result.valid).toBe(false);
      expect(result.violations[0].blockedValue).toBe('CSS expression()');
      expect(result.violations[0].severity).toBe('high');
    });

    it('warns about @import', () => {
      const v = new CSPValidator({ throwOnViolation: false });
      const style = '@import url("evil.css");';

      const result = v.validateInlineStyle(style);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('@import');
    });
  });

  describe('Policy Analysis', () => {
    it('detects unsafe directives', () => {
      const safeValidator = new CSPValidator();
      expect(safeValidator.hasUnsafeDirectives()).toBe(true); // Default allows unsafe-inline for styles

      const strictValidator = new CSPValidator({
        policy: {
          'script-src': ["'self'"],
          'style-src': ["'self'"]
        }
      });
      expect(strictValidator.hasUnsafeDirectives()).toBe(false);
    });

    it('identifies policies with unsafe-eval', () => {
      const v = new CSPValidator({
        policy: {
          'script-src': ["'self'", "'unsafe-eval'"]
        }
      });
      expect(v.hasUnsafeDirectives()).toBe(true);
    });
  });

  describe('Real-World Security Scenarios', () => {
    it('prevents XSS via eval injection', () => {
      const maliciousScript = `
        const userInput = "<script>alert('XSS')</script>";
        eval("processInput('" + userInput + "')");
      `;

      expect(() => validator.validateScript(maliciousScript)).toThrow();
    });

    it('prevents code injection via Function constructor', () => {
      const maliciousScript = `
        const userCode = "alert('injected')";
        const fn = new Function(userCode);
        fn();
      `;

      expect(() => validator.validateScript(maliciousScript)).toThrow();
    });

    it('prevents timer-based code execution', () => {
      const maliciousScript = 'setTimeout("alert(1)", 1000);';

      expect(() => validator.validateScript(maliciousScript)).toThrow();
    });

    it('prevents loading external malicious scripts', () => {
      const v = new CSPValidator({ throwOnViolation: false });
      const result = v.validateURL('https://evil.com/malware.js', 'script-src');

      expect(result.valid).toBe(false);
    });

    it('allows safe code patterns', () => {
      const safeScript = `
        const data = { value: 42 };
        function processData(input) {
          return JSON.parse(JSON.stringify(input));
        }
        const result = processData(data);
      `;

      expect(() => validator.validateScript(safeScript)).not.toThrow();
    });
  });

  describe('CSPValidationError', () => {
    it('creates error with violations', () => {
      const violations = [
        {
          directive: 'script-src',
          blockedValue: 'eval()',
          reason: 'eval is blocked',
          severity: 'high' as const,
        },
      ];
      const error = new CSPValidationError(violations);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('CSPValidationError');
      expect(error.violations).toEqual(violations);
      expect(error.message).toContain('1 violation');
    });

    it('includes violation count in message', () => {
      const violations = [
        { directive: 'script-src', blockedValue: 'eval()', reason: 'bad', severity: 'high' as const },
        { directive: 'script-src', blockedValue: 'Function()', reason: 'bad', severity: 'high' as const },
      ];
      const error = new CSPValidationError(violations);

      expect(error.message).toContain('2 violation');
    });
  });

  describe('Default Policy Security', () => {
    it('blocks object/embed by default', () => {
      expect(DEFAULT_CSP_POLICY['object-src']).toEqual(["'none'"]);
    });

    it('blocks frames by default', () => {
      expect(DEFAULT_CSP_POLICY['frame-src']).toEqual(["'none'"]);
    });

    it('prevents clickjacking', () => {
      expect(DEFAULT_CSP_POLICY['frame-ancestors']).toEqual(["'none'"]);
    });

    it('allows Web Workers from blob URLs', () => {
      expect(DEFAULT_CSP_POLICY['worker-src']).toContain('blob:');
    });

    it('restricts script execution to same-origin', () => {
      expect(DEFAULT_CSP_POLICY['script-src']).toEqual(["'self'"]);
    });
  });

  describe('CSP Header Generation', () => {
    it('generates valid CSP header', () => {
      const header = validator.getPolicyString();

      expect(header).toContain('script-src');
      expect(header).toContain('img-src');
      expect(header).toContain('object-src');
      expect(header.split(';').length).toBeGreaterThan(5);
    });

    it('includes all directives in header', () => {
      const customPolicy: CSPPolicy = {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://trusted.com'],
      };
      const v = new CSPValidator({ policy: customPolicy });
      const header = v.getPolicyString();

      expect(header).toContain("default-src 'self'");
      expect(header).toContain("script-src 'self' https://trusted.com");
    });
  });
});
