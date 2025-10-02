/**
 * Type definitions for SimpleMCP bundling feature
 * Feature 4: Bundling Command
 */

/**
 * Supported bundle output formats
 */
export type BundleFormat = 'single-file' | 'standalone' | 'executable' | 'esm' | 'cjs';

/**
 * Target platform for bundle
 */
export type Platform = 'node' | 'neutral';

/**
 * Target Node.js version or ECMAScript standard
 */
export type Target = 'node18' | 'node20' | 'node22' | 'esnext' | 'es2020' | 'es2021' | 'es2022';

/**
 * Source map generation options
 */
export type SourceMapType = 'inline' | 'external' | 'both' | false;

/**
 * Options for bundling a SimpleMCP server
 */
export interface BundleOptions {
  /**
   * Entry point file path (required)
   * @example './server.ts'
   */
  entry: string;

  /**
   * Output file or directory path (required)
   * @example './dist/bundle.js'
   */
  output: string;

  /**
   * Output format
   * @default 'single-file'
   */
  format?: BundleFormat;

  /**
   * Minify output
   * @default true
   */
  minify?: boolean;

  /**
   * Generate source maps
   * @default false
   */
  sourcemap?: SourceMapType;

  /**
   * Target platform
   * @default 'node'
   */
  platform?: Platform;

  /**
   * Target Node.js version or ES standard
   * @default 'node20'
   */
  target?: Target;

  /**
   * External packages (not bundled)
   * @default []
   */
  external?: string[];

  /**
   * Watch mode for development
   * @default false
   */
  watch?: boolean;

  /**
   * Auto-install dependencies before bundling
   * @default false
   */
  autoInstall?: boolean;

  /**
   * Base path for resolving files
   * @default process.cwd()
   */
  basePath?: string;

  /**
   * Enable tree-shaking (dead code elimination)
   * @default true
   */
  treeShake?: boolean;

  /**
   * Banner to prepend to output
   */
  banner?: string;

  /**
   * Footer to append to output
   */
  footer?: string;

  /**
   * Progress callback
   */
  onProgress?: (message: string) => void;

  /**
   * Error callback
   */
  onError?: (error: BundleError) => void;
}

/**
 * Result of bundling operation
 */
export interface BundleResult {
  /**
   * Whether bundling succeeded
   */
  success: boolean;

  /**
   * Path to output file or directory
   */
  outputPath: string;

  /**
   * Output format used
   */
  format: BundleFormat;

  /**
   * Size of output in bytes
   */
  size: number;

  /**
   * Bundling duration in milliseconds
   */
  duration: number;

  /**
   * Non-fatal warnings
   */
  warnings: string[];

  /**
   * Errors encountered
   */
  errors: BundleError[];

  /**
   * Metadata about the bundle
   */
  metadata?: BundleMetadata;
}

/**
 * Bundle metadata
 */
export interface BundleMetadata {
  /**
   * Entry point file
   */
  entry: string;

  /**
   * Number of modules bundled
   */
  moduleCount: number;

  /**
   * Dependencies bundled
   */
  dependencies: string[];

  /**
   * External dependencies
   */
  external: string[];

  /**
   * Native modules detected
   */
  nativeModules: string[];
}

/**
 * Bundle error with location information
 */
export interface BundleError {
  /**
   * Error message
   */
  message: string;

  /**
   * Error code (optional)
   */
  code?: string;

  /**
   * Location in source (optional)
   */
  location?: {
    file: string;
    line: number;
    column: number;
  };

  /**
   * Stack trace (optional)
   */
  stack?: string;

  /**
   * Additional error details
   */
  details?: Record<string, unknown>;
}

/**
 * SimpleMCP configuration file schema
 */
export interface SimpleMCPConfig {
  /**
   * Entry point file
   */
  entry?: string;

  /**
   * Output configuration
   */
  output?: {
    /**
     * Output directory
     */
    dir?: string;

    /**
     * Output filename
     */
    filename?: string;

    /**
     * Output format
     */
    format?: BundleFormat;
  };

  /**
   * Bundle configuration
   */
  bundle?: {
    /**
     * Minify output
     */
    minify?: boolean;

    /**
     * Generate source maps
     */
    sourcemap?: SourceMapType;

    /**
     * Target platform
     */
    platform?: Platform;

    /**
     * Target Node.js version
     */
    target?: Target;

    /**
     * External packages
     */
    external?: string[];

    /**
     * Enable tree-shaking
     */
    treeShake?: boolean;

    /**
     * Banner to prepend
     */
    banner?: string;

    /**
     * Footer to append
     */
    footer?: string;
  };

  /**
   * Auto-install dependencies
   */
  autoInstall?: boolean;

  /**
   * Dependencies (inline or from package.json)
   */
  dependencies?: Record<string, string>;
}

/**
 * Resolved dependencies for bundling
 */
export interface ResolvedDependencies {
  /**
   * All dependencies (merged from all sources)
   */
  dependencies: Record<string, string>;

  /**
   * Native modules (must be external)
   */
  nativeModules: string[];

  /**
   * Inline dependencies from source
   */
  inlineDependencies: {
    map: Record<string, string>;
    errors: any[];
    warnings: string[];
  };
}

/**
 * Watch mode event
 */
export interface WatchEvent {
  /**
   * Event type
   */
  type: 'start' | 'change' | 'rebuild' | 'success' | 'error';

  /**
   * File that changed (for change events)
   */
  file?: string;

  /**
   * Bundle result (for success events)
   */
  result?: BundleResult;

  /**
   * Error (for error events)
   */
  error?: BundleError;

  /**
   * Timestamp
   */
  timestamp: number;
}
