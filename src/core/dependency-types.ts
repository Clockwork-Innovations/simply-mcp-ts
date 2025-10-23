/**
 * Type definitions for inline dependency management
 * Based on PEP 723 specification adapted for TypeScript/Node.js
 */

/**
 * Inline dependencies as package name -> version map
 *
 * Example:
 * ```typescript
 * const deps: InlineDependencies = {
 *   'express': '^4.18.0',
 *   'zod': '^3.22.0',
 *   '@types/node': '^20.0.0'
 * };
 * ```
 */
export type InlineDependencies = Record<string, string>;

/**
 * Options for parsing inline dependencies
 */
export interface ParseOptions {
  /**
   * Throw on parse errors (default: false)
   * When false, errors are collected in ParseResult.errors
   */
  strict?: boolean;

  /**
   * Validate semver ranges (default: true)
   * When true, invalid version specifiers generate errors
   */
  validateSemver?: boolean;

  /**
   * Allow # comments in dependency blocks (default: true)
   */
  allowComments?: boolean;
}

/**
 * Result of parsing inline dependencies
 */
export interface ParseResult {
  /**
   * Parsed dependencies as package name -> version map
   */
  dependencies: InlineDependencies;

  /**
   * Validation and parsing errors
   */
  errors: DependencyError[];

  /**
   * Non-fatal warnings
   */
  warnings: string[];

  /**
   * Raw metadata block text (for debugging)
   */
  raw: string;
}

/**
 * Result of validating dependencies
 */
export interface ValidationResult {
  /**
   * Whether all dependencies are valid
   */
  valid: boolean;

  /**
   * Validation errors
   */
  errors: DependencyError[];

  /**
   * Non-fatal warnings
   */
  warnings: string[];
}

/**
 * Dependency validation or parsing error
 */
export interface DependencyError {
  /**
   * Error type category
   */
  type: 'INVALID_NAME' | 'INVALID_VERSION' | 'INVALID_FORMAT' | 'DUPLICATE' | 'CONFLICT' | 'SECURITY';

  /**
   * Package name associated with the error
   */
  package: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Line number in source (if applicable)
   */
  line?: number;

  /**
   * Additional error details
   */
  details?: Record<string, unknown>;
}

/**
 * Dependency specification with metadata
 */
export interface Dependency {
  /**
   * Package name (e.g., 'express', '@types/node')
   */
  name: string;

  /**
   * Version specifier (semver range or keyword)
   */
  version: string;

  /**
   * Resolved version after installation (populated by Feature 3)
   */
  resolved?: string;

  /**
   * Line number where declared (for error reporting)
   */
  line?: number;
}

/**
 * Parsed dependencies with detailed information
 */
export interface ParsedDependencies {
  /**
   * Array of dependency specifications
   */
  dependencies: Dependency[];

  /**
   * Raw dependency map (package -> version)
   */
  map: InlineDependencies;

  /**
   * Errors encountered during parsing
   */
  errors: DependencyError[];

  /**
   * Warnings (non-fatal issues)
   */
  warnings: string[];

  /**
   * Raw metadata block from source
   */
  raw: string;
}

/**
 * Conflict report for duplicate or incompatible dependencies
 */
export interface ConflictReport {
  /**
   * Whether conflicts were detected
   */
  hasConflicts: boolean;

  /**
   * List of conflicting package names
   */
  conflicts: Array<{
    package: string;
    versions: string[];
    message: string;
  }>;
}

/**
 * Package.json structure for dependency export
 */
export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: InlineDependencies;
  devDependencies?: InlineDependencies;
  peerDependencies?: InlineDependencies;
  [key: string]: unknown;
}
