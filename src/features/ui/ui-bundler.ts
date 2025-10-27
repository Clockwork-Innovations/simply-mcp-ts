/**
 * UI Bundler - esbuild-based bundling for React components
 *
 * Bundles React components with their dependencies into single-file artifacts.
 * Uses esbuild for fast, efficient bundling with minimal configuration.
 *
 * Features:
 * - Bundle React components with external dependencies
 * - Minification support
 * - Source map generation
 * - External dependency configuration
 * - IIFE and ESM output formats
 *
 * @module ui-bundler
 */

import type { BuildOptions, BuildResult } from 'esbuild';

/**
 * Bundle configuration options
 */
export interface BundleOptions {
  /**
   * Entry point file path (absolute)
   * This is the React component to bundle
   */
  entryPoint: string;

  /**
   * Entry point code (if not loading from file)
   * Alternative to reading from entryPoint path
   */
  entryCode?: string;

  /**
   * Output file path (optional)
   * If not specified, returns code in-memory
   */
  outfile?: string;

  /**
   * Minify output code
   * @default false
   */
  minify?: boolean;

  /**
   * Generate source maps
   * @default false
   */
  sourcemap?: boolean;

  /**
   * External dependencies (don't bundle these)
   * Example: ['react', 'react-dom']
   * @default ['react', 'react-dom']
   */
  external?: string[];

  /**
   * Output format
   * - 'iife': Immediately Invoked Function Expression (browser-friendly)
   * - 'esm': ES Module (for modern browsers)
   * @default 'iife'
   */
  format?: 'iife' | 'esm';

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
}

/**
 * Bundle result
 */
export interface BundleResult {
  /**
   * Bundled JavaScript code
   */
  code: string;

  /**
   * Source map (if sourcemap: true)
   */
  map?: string;

  /**
   * Warnings from bundler
   */
  warnings: string[];

  /**
   * Bundle size in bytes
   */
  size: number;

  /**
   * Build metadata from esbuild
   */
  metadata?: any;
}

/**
 * Bundle a React component with dependencies
 *
 * Uses esbuild to bundle React components and their dependencies
 * into a single JavaScript file ready for browser execution.
 *
 * This function:
 * 1. Lazy-loads esbuild (zero-weight if not used)
 * 2. Configures esbuild for React/JSX compilation
 * 3. Bundles component with dependencies
 * 4. Optionally minifies and generates source maps
 * 5. Returns bundled code and metadata
 *
 * @param options - Bundle configuration
 * @returns Bundle result with code, source maps, and metadata
 * @throws {Error} If bundling fails or esbuild is not installed
 *
 * @example Bundle with CDN externals
 * ```typescript
 * const result = await bundleComponent({
 *   entryPoint: '/path/to/Counter.tsx',
 *   minify: true,
 *   sourcemap: true,
 *   external: ['react', 'react-dom'], // Load from CDN
 *   format: 'iife'
 * });
 * console.log('Bundled:', result.size, 'bytes');
 * ```
 *
 * @example Bundle with dependencies included
 * ```typescript
 * const result = await bundleComponent({
 *   entryPoint: '/path/to/Dashboard.tsx',
 *   minify: true,
 *   external: ['react', 'react-dom'], // Only exclude React
 *   // Includes: recharts, date-fns, etc.
 * });
 * ```
 */
export async function bundleComponent(
  options: BundleOptions
): Promise<BundleResult> {
  const {
    entryPoint,
    entryCode,
    outfile,
    minify = false,
    sourcemap = false,
    external = ['react', 'react-dom'],
    format = 'iife',
    verbose = false,
  } = options;

  if (verbose) {
    console.log(`[UI Bundler] Bundling: ${entryPoint}`);
    console.log(`[UI Bundler] Format: ${format}, Minify: ${minify}, Sourcemap: ${sourcemap}`);
    console.log(`[UI Bundler] External: ${external.join(', ')}`);
  }

  // Lazy-load esbuild (zero-weight principle)
  let esbuild: typeof import('esbuild');
  try {
    esbuild = await import('esbuild');
  } catch (error: any) {
    throw new Error(
      'esbuild is required for bundling but not installed.\n' +
      'Install it with: npm install esbuild\n' +
      'Or add to package.json peerDependencies'
    );
  }

  // Configure esbuild
  const buildOptions: BuildOptions = {
    entryPoints: entryCode
      ? undefined // Use stdin for in-memory code
      : [entryPoint],
    stdin: entryCode
      ? {
          contents: entryCode,
          loader: 'tsx',
          resolveDir: process.cwd(),
          sourcefile: entryPoint, // For source maps
        }
      : undefined,
    bundle: true,
    format: format,
    platform: 'browser',
    target: ['es2020'], // Modern browsers
    jsx: 'automatic', // React 17+ automatic JSX runtime
    jsxDev: false, // Production mode
    minify: minify,
    sourcemap: sourcemap,
    external: external,
    write: false, // Return code in-memory
    metafile: true, // For analysis
    logLevel: verbose ? 'info' : 'warning',
    // Global name for IIFE format
    globalName: format === 'iife' ? 'Component' : undefined,
  };

  // If outfile specified, enable file writing
  if (outfile) {
    buildOptions.outfile = outfile;
    buildOptions.write = true;
  }

  try {
    // Build with esbuild
    const result: BuildResult = await esbuild.build(buildOptions);

    // Extract warnings
    const warnings = result.warnings.map((w) => w.text);

    if (warnings.length > 0 && verbose) {
      console.warn(`[UI Bundler] Warnings:\n${warnings.join('\n')}`);
    }

    // Extract output code
    let code = '';
    let map: string | undefined;

    if (result.outputFiles && result.outputFiles.length > 0) {
      // Find JS output
      const jsFile = result.outputFiles.find(
        (f) => f.path.endsWith('.js') || !f.path.includes('.')
      );
      if (jsFile) {
        code = jsFile.text;
      }

      // Find source map
      if (sourcemap) {
        const mapFile = result.outputFiles.find((f) => f.path.endsWith('.js.map'));
        if (mapFile) {
          map = mapFile.text;
        }
      }
    } else if (!outfile) {
      // When write=false, esbuild may not populate outputFiles
      // This shouldn't happen but handle gracefully
      throw new Error('No output files generated from bundle. This may be an esbuild configuration issue.');
    }

    const size = code.length;

    if (verbose) {
      console.log(`[UI Bundler] Success: ${size} bytes`);
      if (result.metafile) {
        const inputs = Object.keys(result.metafile.inputs).length;
        console.log(`[UI Bundler] Inputs: ${inputs} files`);
      }
    }

    return {
      code,
      map,
      warnings,
      size,
      metadata: result.metafile,
    };
  } catch (error: any) {
    // Format esbuild errors nicely
    let errorMessage = `Failed to bundle component: ${entryPoint}\n`;

    if (error.errors && error.errors.length > 0) {
      errorMessage += 'Errors:\n';
      for (const err of error.errors) {
        errorMessage += `  - ${err.text}\n`;
        if (err.location) {
          errorMessage += `    at ${err.location.file}:${err.location.line}:${err.location.column}\n`;
        }
      }
    } else {
      errorMessage += `Error: ${error.message}\n`;
    }

    errorMessage += '\nHint: Check for:\n';
    errorMessage += '  - Missing dependencies (run npm install)\n';
    errorMessage += '  - Syntax errors in component code\n';
    errorMessage += '  - Unsupported import paths\n';

    throw new Error(errorMessage);
  }
}

/**
 * Bundle cache for compiled components
 * Keyed by entry point path
 */
const bundleCache = new Map<string, BundleResult>();

/**
 * Invalidate bundle cache for a specific file
 *
 * Used in watch mode when a component file changes.
 * Forces re-bundling on next access.
 *
 * @param entryPoint - Absolute path to component file
 */
export function invalidateBundleCache(entryPoint: string): void {
  bundleCache.delete(entryPoint);
}

/**
 * Clear entire bundle cache
 *
 * Removes all cached bundles. Useful for:
 * - Development mode restarts
 * - Memory management
 * - Testing scenarios
 */
export function clearBundleCache(): void {
  bundleCache.clear();
}

/**
 * Get bundle cache statistics
 *
 * @returns Cache statistics including size and entry points
 */
export function getBundleCacheStats(): {
  size: number;
  entryPoints: string[];
  totalSize: number;
} {
  let totalSize = 0;
  const entryPoints = Array.from(bundleCache.keys());

  for (const result of bundleCache.values()) {
    totalSize += result.size;
  }

  return {
    size: bundleCache.size,
    entryPoints,
    totalSize,
  };
}
