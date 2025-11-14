/**
 * Configuration Schema for Simply-MCP v4.0
 *
 * Zero-config by default with optional overrides via:
 * - simply-mcp.config.ts
 * - simply-mcp.config.js
 * - simply-mcp.config.json
 *
 * @module config-schema
 */

/**
 * Build configuration for UI compilation
 */
export interface BuildConfig {
  /**
   * Enable bundling for dependencies
   * @default true
   */
  bundle?: boolean;

  /**
   * Minify output (HTML, CSS, JS)
   * @default process.env.NODE_ENV === 'production'
   */
  minify?: boolean | {
    html?: boolean;
    css?: boolean;
    js?: boolean;
  };

  /**
   * Generate source maps for debugging
   * @default process.env.NODE_ENV !== 'production'
   */
  sourcemap?: boolean;

  /**
   * External dependencies (don't bundle these)
   * These will be loaded from CDN or expected globally
   * @default ['react', 'react-dom']
   */
  external?: string[];

  /**
   * Output format for bundled code
   * - 'iife': Browser-friendly (default)
   * - 'esm': ES Modules (modern browsers)
   * @default 'iife'
   */
  format?: 'iife' | 'esm';

  /**
   * Per-file override configurations
   * Allows specific files to have different build settings
   *
   * @example
   * ```typescript
   * overrides: {
   *   './DebugDashboard.tsx': {
   *     minify: false,
   *     sourcemap: true
   *   },
   *   './ProdWidget.tsx': {
   *     minify: true,
   *     sourcemap: false
   *   }
   * }
   * ```
   */
  overrides?: Record<string, Partial<BuildConfig>>;
}

/**
 * CDN configuration for hosting resources
 */
export interface CDNConfig {
  /**
   * CDN base URL for serving resources
   * @example 'https://cdn.example.com'
   */
  baseUrl?: string;

  /**
   * Enable Subresource Integrity (SRI) hashes
   * Can be boolean (use sha384) or specific algorithm
   * @default false
   */
  sri?: boolean | 'sha256' | 'sha384' | 'sha512';

  /**
   * Compression to apply to resources
   * - 'gzip': Good compatibility
   * - 'brotli': Better compression
   * - 'both': Generate both formats
   * @default 'none'
   */
  compression?: 'none' | 'gzip' | 'brotli' | 'both';
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  /**
   * Enable performance tracking
   * @default false
   */
  track?: boolean;

  /**
   * Enable performance reporting
   * @default false
   */
  report?: boolean;

  /**
   * Performance thresholds for warnings
   */
  thresholds?: {
    /**
     * Maximum bundle size in bytes
     * @default 500000 (500 KB)
     */
    maxBundleSize?: number;

    /**
     * Maximum compilation time in milliseconds
     * @default 5000 (5 seconds)
     */
    maxCompilationTime?: number;

    /**
     * Minimum cache hit rate (0-1)
     * @default 0.7 (70%)
     */
    minCacheHitRate?: number;

    /**
     * Minimum compression savings (0-1)
     * @default 0.2 (20%)
     */
    minCompressionSavings?: number;
  };
}

/**
 * Skill validation configuration
 * Controls compile-time validation of progressive disclosure patterns
 */
export interface SkillValidationConfig {
  /**
   * Enable/disable skill validation
   * @default true
   */
  enabled?: boolean;

  /**
   * Validation rule configuration
   * Each rule can be 'warn', 'error', or 'off'
   */
  rules?: {
    /**
     * Warn about hidden items not referenced by any skill
     * @default 'warn'
     */
    orphanedHidden?: 'warn' | 'error' | 'off';

    /**
     * Warn about skills referencing non-existent components
     * @default 'error'
     */
    invalidReferences?: 'warn' | 'error' | 'off';

    /**
     * Warn about skills referencing non-hidden components
     * @default 'warn'
     */
    nonHiddenComponents?: 'warn' | 'error' | 'off';

    /**
     * Warn about skills with empty components
     * @default 'warn'
     */
    emptySkills?: 'warn' | 'error' | 'off';
  };

  /**
   * Strict mode - treat all warnings as errors
   * @default false
   */
  strict?: boolean;
}

/**
 * Complete configuration schema
 */
export interface SimplyMCPConfig {
  /**
   * Build configuration
   */
  build?: BuildConfig;

  /**
   * CDN configuration
   */
  cdn?: CDNConfig;

  /**
   * Performance monitoring
   */
  performance?: PerformanceConfig;

  /**
   * Skill validation configuration
   */
  skillValidation?: SkillValidationConfig;
}

/**
 * Default configuration based on environment
 */
export const DEFAULT_CONFIG: Required<SimplyMCPConfig> = {
  build: {
    bundle: true,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
    external: ['react', 'react-dom'],
    format: 'iife',
    overrides: {},
  },
  cdn: {
    sri: false,
    compression: 'none',
  },
  performance: {
    track: false,
    report: false,
    thresholds: {
      maxBundleSize: 500000, // 500 KB
      maxCompilationTime: 5000, // 5 seconds
      minCacheHitRate: 0.7, // 70%
      minCompressionSavings: 0.2, // 20%
    },
  },
  skillValidation: {
    enabled: true,
    rules: {
      orphanedHidden: 'warn',
      invalidReferences: 'error',
      nonHiddenComponents: 'warn',
      emptySkills: 'warn',
    },
    strict: false,
  },
};

/**
 * Merge user config with defaults
 *
 * Deep merges user configuration with smart defaults.
 * User config takes precedence over defaults.
 *
 * @param userConfig - User-provided configuration
 * @returns Merged configuration
 *
 * @example
 * ```typescript
 * const config = mergeConfig({
 *   build: {
 *     minify: true
 *   }
 * });
 * // Result: { build: { bundle: true, minify: true, ... }, cdn: { ... }, ... }
 * ```
 */
export function mergeConfig(
  userConfig: SimplyMCPConfig
): Required<SimplyMCPConfig> {
  return {
    build: {
      ...DEFAULT_CONFIG.build,
      ...userConfig.build,
      overrides: {
        ...DEFAULT_CONFIG.build.overrides,
        ...userConfig.build?.overrides,
      },
    },
    cdn: {
      ...DEFAULT_CONFIG.cdn,
      ...userConfig.cdn,
    },
    performance: {
      ...DEFAULT_CONFIG.performance,
      ...userConfig.performance,
      thresholds: {
        ...DEFAULT_CONFIG.performance.thresholds,
        ...userConfig.performance?.thresholds,
      },
    },
    skillValidation: {
      ...DEFAULT_CONFIG.skillValidation,
      ...userConfig.skillValidation,
      rules: {
        ...DEFAULT_CONFIG.skillValidation.rules,
        ...userConfig.skillValidation?.rules,
      },
    },
  };
}

/**
 * Validate configuration
 *
 * Ensures configuration values are valid.
 * Throws errors for invalid configurations.
 *
 * @param config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
export function validateConfig(config: SimplyMCPConfig): void {
  // Validate build config
  if (config.build) {
    if (config.build.format && !['iife', 'esm'].includes(config.build.format)) {
      throw new Error(`Invalid build.format: ${config.build.format}. Must be 'iife' or 'esm'.`);
    }

    if (config.build.external && !Array.isArray(config.build.external)) {
      throw new Error('build.external must be an array of package names');
    }
  }

  // Validate CDN config
  if (config.cdn) {
    if (config.cdn.sri && typeof config.cdn.sri === 'string') {
      if (!['sha256', 'sha384', 'sha512'].includes(config.cdn.sri)) {
        throw new Error(`Invalid cdn.sri: ${config.cdn.sri}. Must be 'sha256', 'sha384', or 'sha512'.`);
      }
    }

    if (config.cdn.compression) {
      if (!['none', 'gzip', 'brotli', 'both'].includes(config.cdn.compression)) {
        throw new Error(`Invalid cdn.compression: ${config.cdn.compression}`);
      }
    }
  }

  // Validate performance config
  if (config.performance?.thresholds) {
    const { thresholds } = config.performance;

    if (thresholds.maxBundleSize !== undefined && thresholds.maxBundleSize <= 0) {
      throw new Error('performance.thresholds.maxBundleSize must be positive');
    }

    if (thresholds.maxCompilationTime !== undefined && thresholds.maxCompilationTime <= 0) {
      throw new Error('performance.thresholds.maxCompilationTime must be positive');
    }

    if (thresholds.minCacheHitRate !== undefined) {
      if (thresholds.minCacheHitRate < 0 || thresholds.minCacheHitRate > 1) {
        throw new Error('performance.thresholds.minCacheHitRate must be between 0 and 1');
      }
    }

    if (thresholds.minCompressionSavings !== undefined) {
      if (thresholds.minCompressionSavings < 0 || thresholds.minCompressionSavings > 1) {
        throw new Error('performance.thresholds.minCompressionSavings must be between 0 and 1');
      }
    }
  }
}
