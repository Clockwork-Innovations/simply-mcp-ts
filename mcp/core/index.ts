/**
 * Core exports for the Handler Execution Framework
 */

export * from './types.js';
export * from './errors.js';
export * from './logger.js';
export * from './HandlerManager.js';
export * from './content-helpers.js';

// Inline dependency management (Phase 2, Feature 2)
export * from './dependency-types.js';
export * from './dependency-parser.js';
export * from './dependency-validator.js';
export * from './dependency-utils.js';

// Auto-installation (Phase 2, Feature 3)
export * from './installation-types.js';
export * from './dependency-installer.js';
export * from './dependency-checker.js';
export * from './package-manager-detector.js';

// Bundling (Phase 2, Feature 4)
export * from './bundle-types.js';
export * from './bundler.js';
export * from './entry-detector.js';
export * from './dependency-resolver.js';
export * from './output-formatter.js';
export * from './config-loader.js';