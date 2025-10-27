/**
 * Parser Large Template Literal Tests
 *
 * Tests parser's ability to extract HTML from large template literals (~16-20KB)
 * This test isolates the root cause of UI resources not being accessible via CLI stdio.
 *
 * Issue: Clockwork test server has ~16KB HTML in template literal, not accessible via CLI
 * Hypothesis: Parser doesn't extract large template literals correctly
 */

import { describe, it, expect } from '@jest/globals';
import { parseInterfaceFile } from '../../src/server/parser.js';
import path from 'path';

describe('Parser Large Template Literal Extraction', () => {
  describe('Small HTML Baseline', () => {
    it('should extract UI interface with small inline HTML (< 200 bytes)', () => {
      const testFile = path.join(process.cwd(), 'tests/fixtures/ui-parser-test-minimal.ts');

      const result = parseInterfaceFile(testFile);

      // Should find exactly 1 UI
      expect(result.uis).toBeDefined();
      expect(result.uis.length).toBe(1);

      const ui = result.uis[0];

      // Validate interface structure
      expect(ui.interfaceName).toBe('MinimalTestUI');
      expect(ui.uri).toBe('ui://test/minimal');
      expect(ui.name).toBe('Minimal Test UI');
      expect(ui.description).toBe('Small HTML fixture for parser testing');

      // Validate HTML extraction
      expect(ui.html).toBeDefined();
      expect(ui.html!.length).toBeGreaterThan(0);
      expect(ui.html!.length).toBeLessThan(300);
      expect(ui.html).toContain('<!DOCTYPE html>');
      expect(ui.html).toContain('Minimal UI');

      // Validate tools
      expect(ui.tools).toBeDefined();
      expect(ui.tools).toEqual(['test_tool']);

      // Should be static (not dynamic)
      expect(ui.dynamic).toBe(false);
    });
  });

  describe('Large HTML Template Literal', () => {
    it('should extract UI interface with large inline HTML (~20KB)', () => {
      const testFile = path.join(process.cwd(), 'tests/fixtures/ui-parser-test-large.ts');

      const result = parseInterfaceFile(testFile);

      // Should find exactly 1 UI
      expect(result.uis).toBeDefined();
      expect(result.uis.length).toBe(1);

      const ui = result.uis[0];

      // Validate interface structure
      expect(ui.interfaceName).toBe('LargeTestUI');
      expect(ui.uri).toBe('ui://test/large');
      expect(ui.name).toBe('Large Test UI Dashboard');
      expect(ui.description).toBe('Large HTML fixture (~16KB) for parser testing with realistic dashboard content');

      // Validate HTML extraction - THIS IS THE CRITICAL TEST
      expect(ui.html).toBeDefined();
      expect(ui.html!.length).toBeGreaterThan(15000); // At least 15KB

      // Verify content is complete (not truncated)
      expect(ui.html).toContain('<!DOCTYPE html>');
      expect(ui.html).toContain('<html lang="en">');
      expect(ui.html).toContain('</html>'); // Should have closing tag

      // Verify CSS section is present
      expect(ui.html).toContain(':root {'); // CSS variables
      expect(ui.html).toContain('linear-gradient'); // Complex CSS
      expect(ui.html).toContain('@media (max-width: 768px)'); // Media queries

      // Verify JavaScript section is present
      expect(ui.html).toContain('function initializeDashboard()'); // JS functions
      expect(ui.html).toContain('function generateMockUsers('); // JS data structures
      expect(ui.html).toContain('addEventListener('); // Event listeners

      // Validate tools
      expect(ui.tools).toBeDefined();
      expect(ui.tools).toEqual(['dashboard_refresh', 'export_data', 'clear_cache']);

      // Should be static (not dynamic)
      expect(ui.dynamic).toBe(false);
    });

    it('should preserve exact HTML content without truncation', () => {
      const testFile = path.join(process.cwd(), 'tests/fixtures/ui-parser-test-large.ts');

      const result = parseInterfaceFile(testFile);
      const ui = result.uis[0];

      // Count specific markers to ensure nothing was truncated
      const cssVarMatches = (ui.html || '').match(/--/g);
      expect(cssVarMatches).toBeTruthy();
      expect(cssVarMatches!.length).toBeGreaterThan(10); // CSS has many variables

      const functionMatches = (ui.html || '').match(/function /g);
      expect(functionMatches).toBeTruthy();
      expect(functionMatches!.length).toBeGreaterThan(5); // JS has multiple functions

      const divMatches = (ui.html || '').match(/<div/g);
      expect(divMatches).toBeTruthy();
      expect(divMatches!.length).toBeGreaterThan(20); // HTML has many divs
    });
  });

  describe('Size Comparison', () => {
    it('should handle HTML of different sizes correctly', () => {
      const minimalFile = path.join(process.cwd(), 'tests/fixtures/ui-parser-test-minimal.ts');
      const largeFile = path.join(process.cwd(), 'tests/fixtures/ui-parser-test-large.ts');

      const minimalResult = parseInterfaceFile(minimalFile);
      const largeResult = parseInterfaceFile(largeFile);

      expect(minimalResult.uis.length).toBe(1);
      expect(largeResult.uis.length).toBe(1);

      const minimalHtmlSize = minimalResult.uis[0].html!.length;
      const largeHtmlSize = largeResult.uis[0].html!.length;

      // Large should be significantly bigger
      expect(largeHtmlSize).toBeGreaterThan(minimalHtmlSize * 50);

      // Log sizes for diagnostic purposes
      console.log(`Minimal HTML size: ${minimalHtmlSize} bytes`);
      console.log(`Large HTML size: ${largeHtmlSize} bytes`);
      console.log(`Ratio: ${(largeHtmlSize / minimalHtmlSize).toFixed(1)}x`);
    });
  });

  describe('Clockwork Test Server Pattern', () => {
    it('should handle HTML similar to Clockwork test server (~16-20KB)', () => {
      const testFile = path.join(process.cwd(), 'tests/fixtures/ui-parser-test-large.ts');

      const result = parseInterfaceFile(testFile);
      const ui = result.uis[0];

      // This mimics the Clockwork test server structure
      expect(ui.html).toBeDefined();

      // Clockwork server has ~16KB, our test has ~20KB
      // Both should be handled equally
      expect(ui.html!.length).toBeGreaterThan(15000);
      expect(ui.html!.length).toBeLessThan(25000);

      // Verify it's a complete HTML document
      expect(ui.html).toMatch(/^[\s\n]*<!DOCTYPE html>/);
      expect(ui.html).toMatch(/<\/html>[\s\n]*$/);
    });
  });
});
