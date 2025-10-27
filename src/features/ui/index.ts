/**
 * UI Features Module
 *
 * Comprehensive UI feature set extracted from core module for better organization.
 * This module provides all UI-related functionality including bundling, compilation,
 * minification, performance tracking, file resolution, and more.
 *
 * @module features/ui
 */

// ============================================================================
// BUNDLING
// ============================================================================

export {
  bundleComponent,
  invalidateBundleCache,
  clearBundleCache,
  getBundleCacheStats,
} from './ui-bundler.js';

export type {
  BundleOptions,
  BundleResult,
} from './ui-bundler.js';

// ============================================================================
// CDN & COMPRESSION
// ============================================================================

export {
  calculateSRI,
  compressGzip,
  compressBrotli,
  generateCDNUrl,
  prepareCDNResource,
  generateScriptTag,
  generateLinkTag,
  normalizeCDNOptions,
} from './ui-cdn.js';

export type {
  SRIAlgorithm,
  CompressionType,
  CDNOptions,
  SRIHash,
  CompressionResult,
  CDNResource,
} from './ui-cdn.js';

// ============================================================================
// FILE RESOLUTION
// ============================================================================

export {
  resolveUIFile,
  invalidateFileCache,
  clearFileCache,
  getFileCacheStats,
} from './ui-file-resolver.js';

export type {
  ResolvedFile,
  FileResolverOptions,
} from './ui-file-resolver.js';

// ============================================================================
// MINIFICATION
// ============================================================================

export {
  minifyHTML,
  minifyCSS,
  minifyJS,
  minifyDocument,
  normalizeMinifyOptions,
} from './ui-minifier.js';

export type {
  MinifyOptions,
  MinifyResult,
} from './ui-minifier.js';

// ============================================================================
// OPTIMIZATION
// ============================================================================

export {
  optimizeHTML,
  hasOptimizations,
} from './ui-optimizer.js';

export type {
  OptimizationResult,
} from './ui-optimizer.js';

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

export {
  getPerformanceTracker,
  trackPerformance,
  recordCacheAccess,
  normalizePerformanceOptions,
} from './ui-performance.js';

export type {
  MetricType,
  PerformanceMetric,
  PerformanceSummary,
  PerformanceThresholds,
  PerformanceOptions,
} from './ui-performance.js';

// ============================================================================
// PERFORMANCE REPORTING
// ============================================================================

export {
  generatePerformanceReport,
  formatConsoleReport,
  formatJSONReport,
  formatMarkdownReport,
  printPerformanceReport,
  writePerformanceReport,
} from './ui-performance-reporter.js';

export type {
  ReportFormat,
  ReportOptions,
  PerformanceReport,
} from './ui-performance-reporter.js';

// ============================================================================
// REACT COMPILATION
// ============================================================================

export {
  compileReactComponent,
  validateComponentCode,
  invalidateReactCache,
  clearReactCache,
  getReactCacheStats,
} from './ui-react-compiler.js';

export type {
  CompiledReactComponent,
  ReactCompilerOptions,
} from './ui-react-compiler.js';

// ============================================================================
// REMOTE DOM COMPILATION
// ============================================================================

export {
  compileRemoteDOM,
  isValidRemoteDOMNode,
} from './ui-remote-dom-compiler.js';

export type {
  RemoteDOMCompilerOptions,
} from './ui-remote-dom-compiler.js';

// ============================================================================
// UI RESOURCES
// ============================================================================

export {
  createInlineHTMLResource,
  createExternalURLResource,
  isUIResource,
  createRemoteDOMResource,
} from './ui-resource.js';

// Note: Types are imported from types/ui.js, not re-exported here
// to avoid circular dependencies. Import UIResource, UIResourceOptions
// directly from types/ui.js when needed.

// ============================================================================
// WATCH MODE
// ============================================================================

export {
  UIWatchManager,
  createWatchManager,
} from './ui-watch-manager.js';

export type {
  WatchModeConfig,
  FileChangeEvent,
  UIWatchManagerEvents,
} from './ui-watch-manager.js';

// ============================================================================
// COMPONENT REGISTRY
// ============================================================================

export {
  ComponentRegistry,
  registry,
} from './component-registry.js';

export type {
  ComponentMetadata,
} from './component-registry.js';

// ============================================================================
// THEME MANAGEMENT
// ============================================================================

export {
  ThemeManager,
  themeManager,
} from './theme-manager.js';

export type {
  Theme,
} from './theme-manager.js';

// ============================================================================
// PACKAGE RESOLUTION
// ============================================================================

export {
  PackageResolver,
  resolver,
} from './package-resolver.js';

export type {
  PackageResolution,
  ResolverOptions,
} from './package-resolver.js';
