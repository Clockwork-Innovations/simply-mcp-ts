/**
 * Core exports for the Handler Execution Framework
 */

export * from './types.js';
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
export * from './dependency-types.js';
export * from './dependency-parser.js';
export * from './dependency-validator.js';

// Export dependency-utils, avoiding conflicts with dependency-resolver
export {
  mergeDependencies,
  filterDependencies,
} from './dependency-utils.js';

// Auto-installation (Phase 2, Feature 3)
export * from './installation-types.js';
export * from './dependency-installer.js';
export * from './dependency-checker.js';
export * from './package-manager-detector.js';

// Bundling (Phase 2, Feature 4)
export * from './bundle-types.js';
export * from './bundler.js';
export * from './entry-detector.js';

// Export dependency-resolver exports except the conflicting ones
export {
  resolveDependencies,
} from './dependency-resolver.js';

export * from './output-formatter.js';

// UI resource helpers (MCP-UI Foundation Layer)
export {
  createInlineHTMLResource,
  isUIResource,
} from './ui-resource.js';