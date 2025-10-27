/**
 * Dependency Management Feature
 *
 * This module provides comprehensive dependency management for SimplyMCP:
 * - Inline dependency parsing (PEP 723 style)
 * - Package validation and version checking
 * - Auto-installation of dependencies
 * - Package manager detection
 * - Dependency resolution for bundling
 * - Native module detection
 */

// ============================================================================
// TYPES - Dependency Specifications
// ============================================================================

export type {
  InlineDependencies,
  ParseOptions,
  ParseResult,
  ValidationResult,
  DependencyError,
  Dependency,
  ParsedDependencies,
  ConflictReport,
  PackageJson,
} from './dependency-types.js';

// ============================================================================
// TYPES - Installation
// ============================================================================

export type {
  PackageManager,
  InstallOptions,
  InstallResult,
  InstallProgressEvent,
  InstallError,
  DependencyStatus,
  PackageManagerInfo,
} from './installation-types.js';

// ============================================================================
// TYPES - Bundling
// ============================================================================

export type {
  BundleFormat,
  Platform,
  Target,
  SourceMapType,
  BundleOptions,
  BundleResult,
  BundleMetadata,
  BundleError,
  SimplyMCPConfig,
  ResolvedDependencies,
  WatchOptions,
  WatchEvent,
} from './bundle-types.js';

// ============================================================================
// DEPENDENCY PARSER - Extract inline dependencies from source code
// ============================================================================

export {
  parseInlineDependencies,
  extractDependencyBlock,
  parseDependencyLine,
  parseInlineDependenciesDetailed,
} from './dependency-parser.js';

// ============================================================================
// DEPENDENCY VALIDATOR - Validate package names and versions
// ============================================================================

export {
  validateDependencies,
  validatePackageName,
  validateSemverRange,
  detectConflicts,
  areVersionsIncompatible,
} from './dependency-validator.js';

// ============================================================================
// DEPENDENCY CHECKER - Check installed dependencies and versions
// ============================================================================

export {
  checkDependencies,
  isPackageInstalled,
  getInstalledVersion,
  verifyVersion,
} from './dependency-checker.js';

// ============================================================================
// DEPENDENCY INSTALLER - Auto-install dependencies
// ============================================================================

export {
  installDependencies,
} from './dependency-installer.js';

// ============================================================================
// PACKAGE MANAGER DETECTOR - Auto-detect package manager
// ============================================================================

export {
  detectPackageManager,
  isPackageManagerAvailable,
  getPackageManagerVersion,
  getLockFileName,
} from './package-manager-detector.js';

// ============================================================================
// DEPENDENCY RESOLVER - Resolve dependencies for bundling
// ============================================================================

export {
  resolveDependencies,
  detectNativeModules,
  isNativeModule,
  mergeDependencies,
  filterDependencies,
  detectPeerDependencies,
  getBuiltinModules,
} from './dependency-resolver.js';

// ============================================================================
// DEPENDENCY UTILS - Utility functions for working with dependencies
// ============================================================================

export {
  generatePackageJson,
  mergeDependencies as mergeWithPackageJson,
  formatDependencyList,
  dependencyArrayToMap,
  dependencyMapToArray,
  sortDependencies,
  filterDependencies as filterByPattern,
  getDependencyStats,
} from './dependency-utils.js';
