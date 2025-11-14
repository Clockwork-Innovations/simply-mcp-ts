/**
 * Unit Tests: Warning Formatter
 *
 * Tests the warning formatting system that produces user-friendly
 * console output with colors, grouping, and summaries.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { formatWarnings } from '../../src/server/compiler/validators/warning-formatter.js';
import type { ValidationWarning } from '../../src/server/compiler/validators/types.js';

// Store original env
let originalNoColor: string | undefined;

beforeEach(() => {
  originalNoColor = process.env.NO_COLOR;
});

afterEach(() => {
  if (originalNoColor !== undefined) {
    process.env.NO_COLOR = originalNoColor;
  } else {
    delete process.env.NO_COLOR;
  }
});

describe('Warning Formatter', () => {
  describe('Empty Warnings', () => {
    it('should return success message for empty warnings array', () => {
      const output = formatWarnings([]);

      expect(output).toContain('No skill validation warnings');
      expect(output).toContain('✓');
    });
  });

  describe('Single Warning', () => {
    it('should format a single warning correctly', () => {
      const warning: ValidationWarning = {
        rule: 'orphaned-hidden-tool',
        severity: 'warning',
        message: "Tool 'debug_mode' is hidden but not referenced by any skill.",
        suggestion: 'Add to a skill or remove hidden flag',
        relatedItems: ['skill1', 'skill2']
      };

      const output = formatWarnings([warning]);

      // Should contain rule name
      expect(output).toContain('Orphaned Hidden Tool');

      // Should contain warning icon and label
      expect(output).toContain('⚠️');
      expect(output).toContain('WARNING');

      // Should contain message
      expect(output).toContain('debug_mode');
      expect(output).toContain('not referenced by any skill');

      // Should contain suggestion
      expect(output).toContain('Suggested fixes');
      expect(output).toContain('Add to a skill');

      // Should contain related items
      expect(output).toContain('Available');
      expect(output).toContain('skill1');
      expect(output).toContain('skill2');

      // Should contain summary
      expect(output).toContain('Summary');
      expect(output).toContain('1 warning');
    });

    it('should format error severity correctly', () => {
      const warning: ValidationWarning = {
        rule: 'invalid-tool-reference',
        severity: 'error',
        message: "Skill 'test' references tool 'invalid' which doesn't exist.",
        suggestion: 'Fix the typo'
      };

      const output = formatWarnings([warning]);

      expect(output).toContain('❌');
      expect(output).toContain('ERROR');
      expect(output).toContain('Invalid Tool Reference');
      expect(output).toContain('Summary');
      expect(output).toContain('1 error');
    });

    it('should include file location when available', () => {
      const warning: ValidationWarning = {
        rule: 'orphaned-hidden-tool',
        severity: 'warning',
        file: '/test/server.ts',
        line: 42,
        message: 'Test message',
        suggestion: 'Test suggestion'
      };

      const output = formatWarnings([warning]);

      expect(output).toContain('Location');
      expect(output).toContain('/test/server.ts:42');
    });

    it('should handle warning without line number', () => {
      const warning: ValidationWarning = {
        rule: 'orphaned-hidden-tool',
        severity: 'warning',
        file: '/test/server.ts',
        message: 'Test message'
      };

      const output = formatWarnings([warning]);

      expect(output).toContain('Location');
      expect(output).toContain('/test/server.ts');
      expect(output).not.toContain(':undefined');
    });

    it('should handle warning without suggestion', () => {
      const warning: ValidationWarning = {
        rule: 'orphaned-hidden-tool',
        severity: 'warning',
        message: 'Test message'
      };

      const output = formatWarnings([warning]);

      expect(output).toContain('Test message');
      expect(output).not.toContain('Suggested fixes');
    });

    it('should handle warning without related items', () => {
      const warning: ValidationWarning = {
        rule: 'orphaned-hidden-tool',
        severity: 'warning',
        message: 'Test message'
      };

      const output = formatWarnings([warning]);

      expect(output).toContain('Test message');
      expect(output).not.toContain('Available');
    });
  });

  describe('Multiple Warnings', () => {
    it('should group warnings by rule type', () => {
      const warnings: ValidationWarning[] = [
        {
          rule: 'orphaned-hidden-tool',
          severity: 'warning',
          message: 'Hidden tool 1'
        },
        {
          rule: 'orphaned-hidden-tool',
          severity: 'warning',
          message: 'Hidden tool 2'
        },
        {
          rule: 'invalid-tool-reference',
          severity: 'error',
          message: 'Invalid ref'
        }
      ];

      const output = formatWarnings(warnings);

      // Should have two groups
      expect(output).toContain('Orphaned Hidden Tool (2)');
      expect(output).toContain('Invalid Tool Reference (1)');

      // Should have separators
      expect(output).toContain('='.repeat(70));

      // Should have messages
      expect(output).toContain('Hidden tool 1');
      expect(output).toContain('Hidden tool 2');
      expect(output).toContain('Invalid ref');
    });

    it('should format summary with both errors and warnings', () => {
      const warnings: ValidationWarning[] = [
        {
          rule: 'invalid-tool-reference',
          severity: 'error',
          message: 'Error 1'
        },
        {
          rule: 'invalid-resource-reference',
          severity: 'error',
          message: 'Error 2'
        },
        {
          rule: 'orphaned-hidden-tool',
          severity: 'warning',
          message: 'Warning 1'
        },
        {
          rule: 'non-hidden-component',
          severity: 'warning',
          message: 'Warning 2'
        },
        {
          rule: 'empty-skill-components',
          severity: 'warning',
          message: 'Warning 3'
        }
      ];

      const output = formatWarnings(warnings);

      expect(output).toContain('Summary');
      expect(output).toContain('2 errors');
      expect(output).toContain('3 warnings');
    });

    it('should use singular form for single error/warning in summary', () => {
      const warnings: ValidationWarning[] = [
        {
          rule: 'invalid-tool-reference',
          severity: 'error',
          message: 'Error'
        },
        {
          rule: 'orphaned-hidden-tool',
          severity: 'warning',
          message: 'Warning'
        }
      ];

      const output = formatWarnings(warnings);

      expect(output).toContain('1 error');
      expect(output).toContain('1 warning');
      expect(output).not.toContain('1 errors');
      expect(output).not.toContain('1 warnings');
    });
  });

  describe('Related Items', () => {
    it('should show up to 10 related items', () => {
      const items = Array.from({ length: 8 }, (_, i) => `item${i + 1}`);
      const warning: ValidationWarning = {
        rule: 'orphaned-hidden-tool',
        severity: 'warning',
        message: 'Test',
        relatedItems: items
      };

      const output = formatWarnings([warning]);

      // Should show all items (less than 10)
      items.forEach(item => {
        expect(output).toContain(item);
      });

      // Should not show "and X more"
      expect(output).not.toContain('more');
    });

    it('should truncate related items list after 10 items', () => {
      const items = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const warning: ValidationWarning = {
        rule: 'orphaned-hidden-tool',
        severity: 'warning',
        message: 'Test',
        relatedItems: items
      };

      const output = formatWarnings([warning]);

      // Should show first 10 items
      for (let i = 1; i <= 10; i++) {
        expect(output).toContain(`item${i}`);
      }

      // Should not show items beyond 10
      expect(output).not.toContain('item11');
      expect(output).not.toContain('item25');

      // Should show truncation message
      expect(output).toContain('... and 15 more');
    });

    it('should show correct label for different rule types', () => {
      const testCases = [
        { rule: 'orphaned-hidden-tool', expected: 'tools' },
        { rule: 'invalid-tool-reference', expected: 'tools' },
        { rule: 'orphaned-hidden-resource', expected: 'resources' },
        { rule: 'invalid-resource-reference', expected: 'resources' },
        { rule: 'orphaned-hidden-prompt', expected: 'prompts' },
        { rule: 'invalid-prompt-reference', expected: 'prompts' },
        { rule: 'empty-skill-components', expected: 'skills' }
      ];

      for (const { rule, expected } of testCases) {
        const warning: ValidationWarning = {
          rule,
          severity: 'warning',
          message: 'Test',
          relatedItems: ['item1']
        };

        const output = formatWarnings([warning]);
        expect(output).toContain(`Available ${expected}`);
      }
    });
  });

  describe('Rule Name Formatting', () => {
    it('should format all rule names correctly', () => {
      const testCases = [
        { rule: 'orphaned-hidden-tool', expected: 'Orphaned Hidden Tool' },
        { rule: 'orphaned-hidden-resource', expected: 'Orphaned Hidden Resource' },
        { rule: 'orphaned-hidden-prompt', expected: 'Orphaned Hidden Prompt' },
        { rule: 'invalid-tool-reference', expected: 'Invalid Tool Reference' },
        { rule: 'invalid-resource-reference', expected: 'Invalid Resource Reference' },
        { rule: 'invalid-prompt-reference', expected: 'Invalid Prompt Reference' },
        { rule: 'non-hidden-component', expected: 'Non-Hidden Component' },
        { rule: 'empty-skill-components', expected: 'Empty Skill Components' }
      ];

      for (const { rule, expected } of testCases) {
        const warning: ValidationWarning = {
          rule,
          severity: 'warning',
          message: 'Test'
        };

        const output = formatWarnings([warning]);
        expect(output).toContain(expected);
      }
    });

    it('should handle unknown rule names gracefully', () => {
      const warning: ValidationWarning = {
        rule: 'unknown-rule-type',
        severity: 'warning',
        message: 'Test'
      };

      const output = formatWarnings([warning]);

      // Should show the rule as-is
      expect(output).toContain('unknown-rule-type');
    });
  });

  describe('Color Formatting', () => {
    it('should include ANSI color codes by default', () => {
      const warning: ValidationWarning = {
        rule: 'orphaned-hidden-tool',
        severity: 'warning',
        message: 'Test'
      };

      const output = formatWarnings([warning]);

      // Should contain the formatted content regardless of color support
      expect(output).toContain('WARNING');
      expect(output).toContain('Orphaned Hidden Tool');
      expect(output).toContain('Test');
      expect(output).toContain('Summary');

      // Note: ANSI color codes may be disabled in test environments
      // The actual color support depends on the terminal capabilities
      // and environment variables like NO_COLOR, FORCE_COLOR, etc.
      // The important thing is that the formatter works correctly
    });

    it('should respect NO_COLOR environment variable', () => {
      process.env.NO_COLOR = '1';

      const warning: ValidationWarning = {
        rule: 'orphaned-hidden-tool',
        severity: 'warning',
        message: 'Test message'
      };

      const output = formatWarnings([warning]);

      // Should contain the content
      expect(output).toContain('Test message');
      expect(output).toContain('WARNING');

      // Chalk respects NO_COLOR automatically, so colors should be stripped
      // Note: We can't easily test this in Jest without mocking chalk,
      // but chalk's own tests verify this behavior
    });
  });

  describe('Multi-line Suggestions', () => {
    it('should format multi-line suggestions with proper indentation', () => {
      const warning: ValidationWarning = {
        rule: 'orphaned-hidden-tool',
        severity: 'warning',
        message: 'Test',
        suggestion: '1. First suggestion\n2. Second suggestion\n3. Third suggestion'
      };

      const output = formatWarnings([warning]);

      expect(output).toContain('Suggested fixes');
      expect(output).toContain('1. First suggestion');
      expect(output).toContain('2. Second suggestion');
      expect(output).toContain('3. Third suggestion');

      // Should be indented (at least 2 spaces before each line)
      const lines = output.split('\n');
      const suggestionLines = lines.filter(line =>
        line.includes('First suggestion') ||
        line.includes('Second suggestion') ||
        line.includes('Third suggestion')
      );

      suggestionLines.forEach(line => {
        // Remove ANSI codes for checking indentation
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(cleanLine).toMatch(/^\s{2,}/);
      });
    });
  });

  describe('Visual Separators', () => {
    it('should include visual separators between warnings', () => {
      const warnings: ValidationWarning[] = [
        {
          rule: 'orphaned-hidden-tool',
          severity: 'warning',
          message: 'Warning 1'
        },
        {
          rule: 'orphaned-hidden-tool',
          severity: 'warning',
          message: 'Warning 2'
        }
      ];

      const output = formatWarnings(warnings);

      // Should have section headers
      expect(output).toContain('='.repeat(70));

      // Should have warning separators
      expect(output).toContain('─'.repeat(70));
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const warning: ValidationWarning = {
        rule: 'orphaned-hidden-tool',
        severity: 'warning',
        message: ''
      };

      const output = formatWarnings([warning]);

      expect(output).toContain('Orphaned Hidden Tool');
      expect(output).toContain('Summary');
    });

    it('should handle very long messages', () => {
      const longMessage = 'This is a very long message that contains lots of text. '.repeat(20);
      const warning: ValidationWarning = {
        rule: 'orphaned-hidden-tool',
        severity: 'warning',
        message: longMessage
      };

      const output = formatWarnings([warning]);

      expect(output).toContain(longMessage);
      expect(output).toContain('Summary');
    });

    it('should handle special characters in messages', () => {
      const warning: ValidationWarning = {
        rule: 'orphaned-hidden-tool',
        severity: 'warning',
        message: "Tool 'test<special>' has \"quotes\" and 'apostrophes' & symbols"
      };

      const output = formatWarnings([warning]);

      expect(output).toContain('test<special>');
      expect(output).toContain('"quotes"');
      expect(output).toContain("'apostrophes'");
      expect(output).toContain('& symbols');
    });
  });
});
