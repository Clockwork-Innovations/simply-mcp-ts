import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, test } from '@jest/globals';
import { parseInterfaceFile } from '../../../src/server/parser.js';

describe('Inline IParam Validation', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const brokenFixturePath = path.resolve(__dirname, '../../fixtures/interface-inline-iparam-broken.ts');
  const correctFixturePath = path.resolve(__dirname, '../../fixtures/interface-inline-iparam-correct.ts');

  describe('Broken Pattern Detection', () => {
    test('detects inline IParam intersection and adds validation error', () => {
      const result = parseInterfaceFile(brokenFixturePath);

      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors).toHaveLength(2); // Two parameters with inline IParam
    });

    test('validation error contains critical error message', () => {
      const result = parseInterfaceFile(brokenFixturePath);

      expect(result.validationErrors).toBeDefined();
      const firstError = result.validationErrors![0];

      expect(firstError).toContain('CRITICAL ERROR');
      expect(firstError).toContain('inline IParam intersection');
    });

    test('validation error explains why pattern fails', () => {
      const result = parseInterfaceFile(brokenFixturePath);

      const firstError = result.validationErrors![0];

      expect(firstError).toContain('Why this fails');
      expect(firstError).toContain('schema generator does NOT support intersection types');
      expect(firstError).toContain('type coercion');
    });

    test('validation error provides fix instructions', () => {
      const result = parseInterfaceFile(brokenFixturePath);

      const firstError = result.validationErrors![0];

      expect(firstError).toContain('REQUIRED FIX');
      expect(firstError).toContain('extends IParam');
      expect(firstError).toContain('separate interface');
    });

    test('validation error references examples', () => {
      const result = parseInterfaceFile(brokenFixturePath);

      const firstError = result.validationErrors![0];

      expect(firstError).toContain('examples/interface-params.ts');
    });

    test('validation error shows current broken code', () => {
      const result = parseInterfaceFile(brokenFixturePath);

      const firstError = result.validationErrors![0];

      expect(firstError).toContain('Current (BROKEN');
      expect(firstError).toContain('& IParam');
    });

    test('validation error identifies specific parameter', () => {
      const result = parseInterfaceFile(brokenFixturePath);

      const errors = result.validationErrors!;

      // Should have errors for both 'a' and 'b' parameters
      expect(errors.some(err => err.includes("Parameter 'a'"))).toBe(true);
      expect(errors.some(err => err.includes("Parameter 'b'"))).toBe(true);
    });

    test('validation error identifies interface name', () => {
      const result = parseInterfaceFile(brokenFixturePath);

      const firstError = result.validationErrors![0];

      expect(firstError).toContain('BrokenTool');
    });
  });

  describe('Correct Pattern Validation', () => {
    test('passes validation with separate IParam interfaces', () => {
      const result = parseInterfaceFile(correctFixturePath);

      expect(result.validationErrors).toBeUndefined();
    });

    test('correctly parses tools when using proper pattern', () => {
      const result = parseInterfaceFile(correctFixturePath);

      expect(result.tools).toBeDefined();
      expect(result.tools.length).toBe(1);
      expect(result.tools[0].name).toBe('correct_add');
    });

    test('extracts tool parameters correctly', () => {
      const result = parseInterfaceFile(correctFixturePath);

      const tool = result.tools[0];
      expect(tool.parameters).toBeDefined();

      const params = tool.parameters as any;
      expect(params.a).toBeDefined();
      expect(params.b).toBeDefined();
    });
  });

  describe('Validation Error Format', () => {
    test('error has clear structure with sections', () => {
      const result = parseInterfaceFile(brokenFixturePath);
      const firstError = result.validationErrors![0];

      // Check for main sections
      expect(firstError).toContain('❌ CRITICAL ERROR:');
      expect(firstError).toContain('Current (BROKEN');
      expect(firstError).toContain('Why this fails:');
      expect(firstError).toContain('✅ REQUIRED FIX');
      expect(firstError).toContain('📚 See');
    });

    test('error uses bullet points for reasons', () => {
      const result = parseInterfaceFile(brokenFixturePath);
      const firstError = result.validationErrors![0];

      // Should have bullet points in "Why this fails" section
      const whySection = firstError.split('Why this fails:')[1];
      expect(whySection).toContain('•');
    });

    test('error provides code examples', () => {
      const result = parseInterfaceFile(brokenFixturePath);
      const firstError = result.validationErrors![0];

      // Should show TypeScript interface syntax
      expect(firstError).toContain('interface');
      expect(firstError).toContain('extends IParam');
      expect(firstError).toContain("type: 'number'");
    });
  });

  describe('Multiple Errors', () => {
    test('reports all parameters with inline IParam', () => {
      const result = parseInterfaceFile(brokenFixturePath);

      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors!.length).toBe(2);

      // Both parameters should have errors
      const allErrors = result.validationErrors!.join('\n');
      expect(allErrors).toContain("Parameter 'a'");
      expect(allErrors).toContain("Parameter 'b'");
    });

    test('each error is self-contained', () => {
      const result = parseInterfaceFile(brokenFixturePath);
      const errors = result.validationErrors!;

      // Each error should be a complete, standalone message
      for (const error of errors) {
        expect(error).toContain('CRITICAL ERROR');
        expect(error).toContain('Why this fails');
        expect(error).toContain('REQUIRED FIX');
      }
    });
  });
});
