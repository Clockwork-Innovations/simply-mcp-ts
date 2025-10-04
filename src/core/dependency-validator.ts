/**
 * Dependency validator
 * Validates package names and version specifiers according to npm rules and semver specification
 */

import {
  InlineDependencies,
  ValidationResult,
  DependencyError,
  ConflictReport,
} from './dependency-types.js';

/**
 * npm package name rules:
 * - Lowercase only
 * - Length 1-214 characters
 * - URL-safe characters: alphanumeric, hyphen, underscore, dot
 * - Cannot start with dot or underscore
 * - Scoped packages: @scope/package
 */
const PACKAGE_NAME_PATTERN = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

/**
 * Semver pattern (simplified - full semver is very complex)
 * Matches:
 * - Simple versions: 1.0.0, 1.2, 1
 * - With operators: ^1.0.0, ~1.2.3, >=1.0.0, <2.0.0
 * - Ranges: 1.0.0 - 2.0.0, >=1.0.0 <2.0.0
 * - Logical OR: 1.0.0 || 2.0.0
 * - Wildcards: 1.x, 1.*, *
 * - Pre-release: 1.0.0-alpha, 1.0.0-beta.1
 * - Build metadata: 1.0.0+20130313144700
 */
const SEMVER_SIMPLE = /^(\^|~|>=?|<=?|=)?\d+(\.\d+)?(\.\d+)?(-[a-z0-9.-]+)?(\+[a-z0-9.-]+)?$/i;
const SEMVER_RANGE = /^(>=?|<=?)\d+(\.\d+)?(\.\d+)?\s+(>=?|<=?)\d+(\.\d+)?(\.\d+)?$/i;
const SEMVER_OR = /^.+\s*\|\|\s*.+$/;
const SEMVER_WILDCARD = /^(\d+\.)?(x|\*)$/;

// Special keywords that are always valid
const VALID_KEYWORDS = ['latest', 'next', '*', 'x'];

// Characters that should never appear in version strings (security check)
const DANGEROUS_CHARS = /[;<>&|`$(){}[\]\\'"]/;

/**
 * Validate dependency specifications
 *
 * @param deps - Dependencies to validate (package -> version map)
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const deps = {
 *   'axios': '^1.6.0',
 *   'INVALID': '1.0.0',  // Invalid: uppercase
 *   'zod': 'not-a-version'  // Invalid: bad version
 * };
 * const result = validateDependencies(deps);
 * console.log(result.valid); // false
 * console.log(result.errors); // Array of validation errors
 * ```
 */
export function validateDependencies(deps: InlineDependencies): ValidationResult {
  const errors: DependencyError[] = [];
  const warnings: string[] = [];

  for (const [packageName, versionSpec] of Object.entries(deps)) {
    // Validate package name
    const nameValidation = validatePackageName(packageName);
    if (!nameValidation.valid) {
      errors.push({
        type: 'INVALID_NAME',
        package: packageName,
        message: nameValidation.error || `Invalid package name: "${packageName}"`,
        details: { reason: nameValidation.reason },
      });
    }

    // Validate version specifier
    const versionValidation = validateSemverRange(versionSpec);
    if (!versionValidation.valid) {
      errors.push({
        type: 'INVALID_VERSION',
        package: packageName,
        message: versionValidation.error || `Invalid version specifier for ${packageName}: "${versionSpec}"`,
        details: { reason: versionValidation.reason },
      });
    }

    // Warn about wildcard versions (can lead to unpredictable builds)
    if (versionSpec === '*' || versionSpec === 'x' || versionSpec === 'latest') {
      warnings.push(`Using wildcard version for ${packageName}: "${versionSpec}" (may lead to unpredictable builds)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate npm package name
 *
 * @param name - Package name to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validatePackageName('axios'); // { valid: true }
 * validatePackageName('@types/node'); // { valid: true }
 * validatePackageName('UPPERCASE'); // { valid: false, reason: 'must be lowercase' }
 * ```
 */
export function validatePackageName(
  name: string
): { valid: boolean; error?: string; reason?: string } {
  // Empty name
  if (!name || name.length === 0) {
    return {
      valid: false,
      error: 'Package name cannot be empty',
      reason: 'empty',
    };
  }

  // Length check (npm limit is 214 characters)
  if (name.length > 214) {
    return {
      valid: false,
      error: `Package name too long (max 214 characters): ${name}`,
      reason: 'too_long',
    };
  }

  // Cannot start with dot or underscore (npm rule)
  if (name.startsWith('.') || name.startsWith('_')) {
    return {
      valid: false,
      error: `Package name cannot start with "." or "_": ${name}`,
      reason: 'invalid_start',
    };
  }

  // Must be lowercase (npm rule)
  if (name !== name.toLowerCase()) {
    return {
      valid: false,
      error: `Package name must be lowercase: ${name}`,
      reason: 'not_lowercase',
    };
  }

  // Check for dangerous characters (security)
  if (DANGEROUS_CHARS.test(name)) {
    return {
      valid: false,
      error: `Package name contains dangerous characters: ${name}`,
      reason: 'dangerous_chars',
    };
  }

  // Match npm package name pattern
  if (!PACKAGE_NAME_PATTERN.test(name)) {
    return {
      valid: false,
      error: `Package name contains invalid characters: ${name}`,
      reason: 'invalid_chars',
    };
  }

  return { valid: true };
}

/**
 * Validate semver range or version specifier
 *
 * @param version - Version specifier to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateSemverRange('^1.0.0'); // { valid: true }
 * validateSemverRange('latest'); // { valid: true }
 * validateSemverRange('not-a-version'); // { valid: false }
 * ```
 */
export function validateSemverRange(
  version: string
): { valid: boolean; error?: string; reason?: string } {
  // Empty version
  if (!version || version.length === 0) {
    return {
      valid: false,
      error: 'Version specifier cannot be empty',
      reason: 'empty',
    };
  }

  // Length check (prevent excessively long version strings)
  if (version.length > 100) {
    return {
      valid: false,
      error: `Version specifier too long (max 100 characters): ${version}`,
      reason: 'too_long',
    };
  }

  // Check for dangerous characters (security)
  if (DANGEROUS_CHARS.test(version)) {
    return {
      valid: false,
      error: `Version specifier contains dangerous characters: ${version}`,
      reason: 'dangerous_chars',
    };
  }

  // Allow special keywords
  if (VALID_KEYWORDS.includes(version)) {
    return { valid: true };
  }

  // Check various semver patterns
  if (
    SEMVER_SIMPLE.test(version) ||
    SEMVER_RANGE.test(version) ||
    SEMVER_OR.test(version) ||
    SEMVER_WILDCARD.test(version)
  ) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Invalid semver version specifier: ${version}`,
    reason: 'invalid_format',
  };
}

/**
 * Detect conflicts in dependencies (duplicate packages)
 *
 * @param deps - Dependencies to check
 * @returns Conflict report
 *
 * @example
 * ```typescript
 * const deps = {
 *   'axios': '^1.6.0',
 *   'AXIOS': '^1.5.0'  // Case-insensitive duplicate
 * };
 * const report = detectConflicts(deps);
 * console.log(report.hasConflicts); // true
 * ```
 */
export function detectConflicts(deps: InlineDependencies): ConflictReport {
  const seen = new Map<string, string[]>();
  const conflicts: Array<{ package: string; versions: string[]; message: string }> = [];

  for (const [packageName, version] of Object.entries(deps)) {
    const normalized = packageName.toLowerCase();

    if (seen.has(normalized)) {
      const versions = seen.get(normalized)!;
      versions.push(version);
    } else {
      seen.set(normalized, [version]);
    }
  }

  // Find conflicts (packages with multiple versions)
  for (const [normalized, versions] of seen.entries()) {
    if (versions.length > 1) {
      conflicts.push({
        package: normalized,
        versions,
        message: `Package "${normalized}" declared multiple times with different versions: ${versions.join(', ')}`,
      });
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Check if two semver ranges are potentially incompatible
 * This is a simplified check - full semver resolution is complex
 *
 * @param version1 - First version specifier
 * @param version2 - Second version specifier
 * @returns True if ranges might be incompatible
 */
export function areVersionsIncompatible(version1: string, version2: string): boolean {
  // If they're identical, definitely compatible
  if (version1 === version2) {
    return false;
  }

  // Wildcards are always considered compatible
  if (
    VALID_KEYWORDS.includes(version1) ||
    VALID_KEYWORDS.includes(version2)
  ) {
    return false;
  }

  // Extract major version if possible
  const getMajor = (v: string): number | null => {
    const match = v.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const major1 = getMajor(version1);
  const major2 = getMajor(version2);

  // Different major versions with caret are incompatible
  if (major1 !== null && major2 !== null && major1 !== major2) {
    if (version1.startsWith('^') || version2.startsWith('^')) {
      return true;
    }
  }

  // For now, assume other cases are potentially compatible
  // Full semver resolution would require a semver library
  return false;
}
