/**
 * Core exports for the Handler Execution Framework
 */

export * from '../types/handler.js';
export * from './errors.js';
export * from './logger.js';
export * from './HandlerManager.js';

// Export content helpers runtime functions
export {
  createImageContent,
  createAudioContent,
  createBlobContent,
} from './content-helpers.js';

// Export content helper types separately (type-only)
export type {
  ImageInput,
  AudioInput,
  BinaryInput,
} from './content-helpers.js';

// Inline dependency management (Phase 2, Feature 2)
export * from '../features/dependencies/dependency-types.js';
export * from '../features/dependencies/dependency-parser.js';
export * from '../features/dependencies/dependency-validator.js';

// Export dependency-utils, avoiding conflicts with dependency-resolver
export {
  mergeDependencies,
  filterDependencies,
} from '../features/dependencies/dependency-utils.js';

// Auto-installation (Phase 2, Feature 3)
export * from '../features/dependencies/installation-types.js';
export * from '../features/dependencies/dependency-installer.js';
export * from '../features/dependencies/dependency-checker.js';
export * from '../features/dependencies/package-manager-detector.js';

// Bundling (Phase 2, Feature 4)
export * from '../features/dependencies/bundle-types.js';
export * from './bundler.js';
export * from './entry-detector.js';

// Export dependency-resolver exports except the conflicting ones
export {
  resolveDependencies,
} from '../features/dependencies/dependency-resolver.js';

export * from './output-formatter.js';

// UI resource helpers (MCP-UI Foundation Layer)
export {
  createInlineHTMLResource,
  isUIResource,
} from '../features/ui/ui-resource.js';

// UI React compiler (MCP-UI Feature Layer)
export {
  compileReactComponent,
  validateComponentCode,
  invalidateReactCache,
  clearReactCache,
  getReactCacheStats,
} from '../features/ui/ui-react-compiler.js';
export type {
  CompiledReactComponent,
  ReactCompilerOptions,
} from '../features/ui/ui-react-compiler.js';

// UI file resolver (MCP-UI Foundation Layer)
export {
  resolveUIFile,
  invalidateFileCache,
  clearFileCache,
  getFileCacheStats,
} from '../features/ui/ui-file-resolver.js';
export type {
  ResolvedFile,
  FileResolverOptions,
} from '../features/ui/ui-file-resolver.js';

// UI watch manager (MCP-UI Feature Layer - Hot Reload)
export {
  UIWatchManager,
  createWatchManager,
} from '../features/ui/ui-watch-manager.js';
export type {
  WatchModeConfig,
  FileChangeEvent,
  UIWatchManagerEvents,
} from '../features/ui/ui-watch-manager.js';