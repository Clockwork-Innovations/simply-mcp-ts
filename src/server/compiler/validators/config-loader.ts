/**
 * Configuration Loader
 *
 * Loads and merges skill validation configuration from config files and CLI flags.
 */

import type { SkillValidationConfig } from './types.js';
import { DEFAULT_CONFIG } from '../../../config/config-schema.js';

/**
 * Load skill validation config from simplemcp.config.js
 * Merges with defaults and CLI flags
 *
 * For now, we use the defaults from config-schema.
 * In the future, this can be enhanced to load from actual config files.
 */
export function loadSkillValidationConfig(
  cliFlags?: Partial<SkillValidationConfig>
): SkillValidationConfig {
  // Use defaults from config schema
  const defaults = DEFAULT_CONFIG.skillValidation;

  // If no CLI flags, return defaults
  if (!cliFlags) {
    return defaults;
  }

  // Merge: defaults < CLI flags
  return {
    enabled: cliFlags.enabled ?? defaults.enabled,
    rules: {
      orphanedHidden: cliFlags.rules?.orphanedHidden ?? defaults.rules?.orphanedHidden,
      invalidReferences: cliFlags.rules?.invalidReferences ?? defaults.rules?.invalidReferences,
      nonHiddenComponents: cliFlags.rules?.nonHiddenComponents ?? defaults.rules?.nonHiddenComponents,
      emptySkills: cliFlags.rules?.emptySkills ?? defaults.rules?.emptySkills,
    },
    strict: cliFlags.strict ?? defaults.strict,
  };
}
