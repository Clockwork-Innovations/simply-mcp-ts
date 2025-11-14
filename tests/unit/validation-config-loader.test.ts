/**
 * Unit Tests: Configuration Loader
 *
 * Tests the configuration loading system that merges defaults with
 * CLI flags and config files.
 */

import { describe, it, expect } from '@jest/globals';
import { loadSkillValidationConfig } from '../../src/server/compiler/validators/config-loader.js';
import type { SkillValidationConfig } from '../../src/server/compiler/validators/types.js';

describe('Configuration Loader', () => {
  describe('Default Configuration', () => {
    it('should return default configuration when no flags provided', () => {
      const config = loadSkillValidationConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
      expect(config.rules).toBeDefined();
      expect(config.rules?.orphanedHidden).toBe('warn');
      expect(config.rules?.invalidReferences).toBe('error');
      expect(config.rules?.nonHiddenComponents).toBe('warn');
      expect(config.rules?.emptySkills).toBe('warn');
      expect(config.strict).toBe(false);
    });

    it('should have sensible defaults for all rules', () => {
      const config = loadSkillValidationConfig();

      // Correctness issues should be errors
      expect(config.rules?.invalidReferences).toBe('error');

      // Best practices should be warnings
      expect(config.rules?.orphanedHidden).toBe('warn');
      expect(config.rules?.nonHiddenComponents).toBe('warn');
      expect(config.rules?.emptySkills).toBe('warn');

      // Validation should be enabled by default
      expect(config.enabled).toBe(true);

      // Strict mode off by default
      expect(config.strict).toBe(false);
    });
  });

  describe('CLI Flag Overrides', () => {
    it('should override enabled flag', () => {
      const config = loadSkillValidationConfig({ enabled: false });

      expect(config.enabled).toBe(false);
      // Other defaults should remain
      expect(config.rules?.orphanedHidden).toBe('warn');
    });

    it('should override strict flag', () => {
      const config = loadSkillValidationConfig({ strict: true });

      expect(config.strict).toBe(true);
      // Other defaults should remain
      expect(config.enabled).toBe(true);
    });

    it('should override individual rule severities', () => {
      const config = loadSkillValidationConfig({
        rules: {
          orphanedHidden: 'error'
        }
      });

      expect(config.rules?.orphanedHidden).toBe('error');
      // Other rules should keep defaults
      expect(config.rules?.invalidReferences).toBe('error');
      expect(config.rules?.nonHiddenComponents).toBe('warn');
      expect(config.rules?.emptySkills).toBe('warn');
    });

    it('should allow disabling individual rules', () => {
      const config = loadSkillValidationConfig({
        rules: {
          orphanedHidden: 'off',
          nonHiddenComponents: 'off'
        }
      });

      expect(config.rules?.orphanedHidden).toBe('off');
      expect(config.rules?.nonHiddenComponents).toBe('off');
      // Other rules should keep defaults
      expect(config.rules?.invalidReferences).toBe('error');
      expect(config.rules?.emptySkills).toBe('warn');
    });

    it('should allow changing error to warning', () => {
      const config = loadSkillValidationConfig({
        rules: {
          invalidReferences: 'warn'
        }
      });

      expect(config.rules?.invalidReferences).toBe('warn');
    });

    it('should allow changing warning to error', () => {
      const config = loadSkillValidationConfig({
        rules: {
          orphanedHidden: 'error',
          nonHiddenComponents: 'error',
          emptySkills: 'error'
        }
      });

      expect(config.rules?.orphanedHidden).toBe('error');
      expect(config.rules?.nonHiddenComponents).toBe('error');
      expect(config.rules?.emptySkills).toBe('error');
    });
  });

  describe('Complete Override', () => {
    it('should handle complete configuration override', () => {
      const customConfig: SkillValidationConfig = {
        enabled: false,
        strict: true,
        rules: {
          orphanedHidden: 'off',
          invalidReferences: 'warn',
          nonHiddenComponents: 'error',
          emptySkills: 'off'
        }
      };

      const config = loadSkillValidationConfig(customConfig);

      expect(config.enabled).toBe(false);
      expect(config.strict).toBe(true);
      expect(config.rules?.orphanedHidden).toBe('off');
      expect(config.rules?.invalidReferences).toBe('warn');
      expect(config.rules?.nonHiddenComponents).toBe('error');
      expect(config.rules?.emptySkills).toBe('off');
    });
  });

  describe('Partial Overrides', () => {
    it('should merge partial rule configuration with defaults', () => {
      const config = loadSkillValidationConfig({
        rules: {
          orphanedHidden: 'error'
          // Other rules not specified - should use defaults
        }
      });

      expect(config.rules?.orphanedHidden).toBe('error');
      expect(config.rules?.invalidReferences).toBe('error'); // default
      expect(config.rules?.nonHiddenComponents).toBe('warn'); // default
      expect(config.rules?.emptySkills).toBe('warn'); // default
    });

    it('should handle empty rules object', () => {
      const config = loadSkillValidationConfig({
        rules: {}
      });

      // Should use all defaults
      expect(config.rules?.orphanedHidden).toBe('warn');
      expect(config.rules?.invalidReferences).toBe('error');
      expect(config.rules?.nonHiddenComponents).toBe('warn');
      expect(config.rules?.emptySkills).toBe('warn');
    });

    it('should handle undefined rules', () => {
      const config = loadSkillValidationConfig({
        enabled: false
        // rules not specified
      });

      expect(config.enabled).toBe(false);
      // Should have default rules
      expect(config.rules?.orphanedHidden).toBe('warn');
      expect(config.rules?.invalidReferences).toBe('error');
    });
  });

  describe('Type Safety', () => {
    it('should handle all valid severity values', () => {
      const validSeverities: Array<'warn' | 'error' | 'off'> = ['warn', 'error', 'off'];

      for (const severity of validSeverities) {
        const config = loadSkillValidationConfig({
          rules: {
            orphanedHidden: severity
          }
        });

        expect(config.rules?.orphanedHidden).toBe(severity);
      }
    });

    it('should handle boolean values for enabled and strict', () => {
      const config1 = loadSkillValidationConfig({ enabled: true, strict: true });
      expect(config1.enabled).toBe(true);
      expect(config1.strict).toBe(true);

      const config2 = loadSkillValidationConfig({ enabled: false, strict: false });
      expect(config2.enabled).toBe(false);
      expect(config2.strict).toBe(false);
    });
  });

  describe('Configuration Scenarios', () => {
    it('should support lenient development configuration', () => {
      const devConfig: SkillValidationConfig = {
        enabled: true,
        rules: {
          orphanedHidden: 'warn',
          invalidReferences: 'warn', // Lenient during dev
          nonHiddenComponents: 'off', // Allow mixing during prototyping
          emptySkills: 'warn'
        },
        strict: false
      };

      const config = loadSkillValidationConfig(devConfig);

      expect(config.enabled).toBe(true);
      expect(config.strict).toBe(false);
      expect(config.rules?.invalidReferences).toBe('warn');
      expect(config.rules?.nonHiddenComponents).toBe('off');
    });

    it('should support strict production configuration', () => {
      const prodConfig: SkillValidationConfig = {
        enabled: true,
        rules: {
          orphanedHidden: 'error',
          invalidReferences: 'error',
          nonHiddenComponents: 'error',
          emptySkills: 'error'
        },
        strict: true
      };

      const config = loadSkillValidationConfig(prodConfig);

      expect(config.enabled).toBe(true);
      expect(config.strict).toBe(true);
      expect(config.rules?.orphanedHidden).toBe('error');
      expect(config.rules?.invalidReferences).toBe('error');
      expect(config.rules?.nonHiddenComponents).toBe('error');
      expect(config.rules?.emptySkills).toBe('error');
    });

    it('should support disabled validation for migration', () => {
      const migrationConfig: SkillValidationConfig = {
        enabled: false
      };

      const config = loadSkillValidationConfig(migrationConfig);

      expect(config.enabled).toBe(false);
      // Rules should still be present (for when validation is re-enabled)
      expect(config.rules).toBeDefined();
    });

    it('should support selective rule enablement', () => {
      const selectiveConfig: SkillValidationConfig = {
        enabled: true,
        rules: {
          orphanedHidden: 'off',
          invalidReferences: 'error', // Only check this
          nonHiddenComponents: 'off',
          emptySkills: 'off'
        }
      };

      const config = loadSkillValidationConfig(selectiveConfig);

      expect(config.enabled).toBe(true);
      expect(config.rules?.invalidReferences).toBe('error');
      expect(config.rules?.orphanedHidden).toBe('off');
      expect(config.rules?.nonHiddenComponents).toBe('off');
      expect(config.rules?.emptySkills).toBe('off');
    });
  });

  describe('Merge Behavior', () => {
    it('should prioritize CLI flags over defaults', () => {
      const config = loadSkillValidationConfig({
        rules: {
          orphanedHidden: 'error'
        }
      });

      // CLI flag value
      expect(config.rules?.orphanedHidden).toBe('error');
      // Default values
      expect(config.rules?.invalidReferences).toBe('error');
    });

    it('should handle null/undefined gracefully', () => {
      const config = loadSkillValidationConfig(undefined);

      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
      expect(config.rules).toBeDefined();
    });
  });

  describe('Default Values Reference', () => {
    it('should document the complete default configuration', () => {
      const defaults = loadSkillValidationConfig();

      // This test serves as documentation of default values
      const expected = {
        enabled: true,
        rules: {
          orphanedHidden: 'warn',
          invalidReferences: 'error',
          nonHiddenComponents: 'warn',
          emptySkills: 'warn'
        },
        strict: false
      };

      expect(defaults.enabled).toBe(expected.enabled);
      expect(defaults.strict).toBe(expected.strict);
      expect(defaults.rules?.orphanedHidden).toBe(expected.rules.orphanedHidden);
      expect(defaults.rules?.invalidReferences).toBe(expected.rules.invalidReferences);
      expect(defaults.rules?.nonHiddenComponents).toBe(expected.rules.nonHiddenComponents);
      expect(defaults.rules?.emptySkills).toBe(expected.rules.emptySkills);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty object override', () => {
      const config = loadSkillValidationConfig({});

      expect(config.enabled).toBe(true);
      expect(config.strict).toBe(false);
      expect(config.rules?.orphanedHidden).toBe('warn');
    });

    it('should handle explicit undefined values in rules', () => {
      const config = loadSkillValidationConfig({
        rules: {
          orphanedHidden: undefined
          // Should fall back to default
        }
      });

      expect(config.rules?.orphanedHidden).toBe('warn');
    });
  });
});
