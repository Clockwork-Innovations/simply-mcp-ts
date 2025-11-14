/**
 * Validation Type Definitions
 *
 * Type definitions for the skill validation system that warns developers
 * about orphaned hidden items, invalid skill references, and progressive
 * disclosure issues during compilation.
 */

import type { ParsedTool, ParsedResource, ParsedPrompt, ParsedSkill } from '../types.js';
import * as ts from 'typescript';

/**
 * Severity level for validation warnings
 */
export type ValidationSeverity = 'warning' | 'error';

/**
 * Rule severity configuration
 */
export type RuleSeverity = 'warn' | 'error' | 'off';

/**
 * Structured validation warning with all metadata
 */
export interface ValidationWarning {
  /** Rule identifier (e.g., 'orphaned-hidden-tool') */
  rule: string;

  /** Severity level */
  severity: ValidationSeverity;

  /** Source file path (optional) */
  file?: string;

  /** Line number in source file (optional) */
  line?: number;

  /** Human-readable warning message */
  message: string;

  /** Actionable suggestion for fixing the issue (optional) */
  suggestion?: string;

  /** Related items for context (e.g., available skills) */
  relatedItems?: string[];
}

/**
 * Skill validation configuration
 */
export interface SkillValidationConfig {
  /**
   * Enable/disable skill validation
   * @default true
   */
  enabled?: boolean;

  /**
   * Validation rule configuration
   */
  rules?: {
    /**
     * Orphaned hidden items
     * @default 'warn'
     */
    orphanedHidden?: RuleSeverity;

    /**
     * Invalid component references
     * @default 'error'
     */
    invalidReferences?: RuleSeverity;

    /**
     * Non-hidden components in skills
     * @default 'warn'
     */
    nonHiddenComponents?: RuleSeverity;

    /**
     * Empty skill components
     * @default 'warn'
     */
    emptySkills?: RuleSeverity;

    /**
     * Orphaned skill membership references
     * @default 'warn'
     * @since v4.4.0 (PL-1)
     */
    orphanedSkillMembership?: RuleSeverity;
  };

  /**
   * Strict mode - treat all warnings as errors
   * @default false
   */
  strict?: boolean;
}

/**
 * Complete validation context passed to all validators
 * Contains all parsed interfaces and metadata needed for validation
 */
export interface ValidationContext {
  /** All parsed tools indexed by name */
  tools: Map<string, ParsedTool>;

  /** All parsed resources indexed by URI */
  resources: Map<string, ParsedResource>;

  /** All parsed prompts indexed by name */
  prompts: Map<string, ParsedPrompt>;

  /** All parsed skills indexed by name */
  skills: Map<string, ParsedSkill>;

  /** Source file path for location info */
  sourceFile: string;

  /** TypeScript source file node (for line numbers) */
  sourceFileNode?: ts.SourceFile;

  /** Loaded validation configuration */
  config: SkillValidationConfig;
}

/**
 * Rule checker function signature
 */
export type RuleChecker = (context: ValidationContext) => ValidationWarning[];

/**
 * Reference maps for fast lookup
 */
export interface ReferenceMaps {
  /** Forward map: component → skills that reference it */
  componentToSkills: Map<string, Set<string>>;

  /** Reverse map: skill → components it references */
  skillToComponents: Map<string, Set<string>>;
}
