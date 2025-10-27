/**
 * UI Minifier - HTML/CSS/JS minification for production builds
 *
 * Provides minification capabilities for UI resources to reduce bundle sizes
 * and improve load times. Uses industry-standard minifiers for optimal compression.
 *
 * Features:
 * - HTML minification with html-minifier-terser
 * - CSS minification with cssnano (via postcss)
 * - JavaScript minification with terser
 * - Selective minification (enable/disable per type)
 * - Preservation of functionality and compatibility
 *
 * Zero-weight: Only loaded when minification is explicitly enabled.
 *
 * @module ui-minifier
 */

/**
 * Minification options for UI resources
 */
export interface MinifyOptions {
  /**
   * Enable HTML minification
   * @default true
   */
  html?: boolean;

  /**
   * Enable CSS minification
   * @default true
   */
  css?: boolean;

  /**
   * Enable JavaScript minification
   * @default true
   */
  js?: boolean;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
}

/**
 * Minification result with metrics
 */
export interface MinifyResult {
  /**
   * Minified output code
   */
  code: string;

  /**
   * Original size in bytes
   */
  originalSize: number;

  /**
   * Minified size in bytes
   */
  minifiedSize: number;

  /**
   * Savings in bytes
   */
  savings: number;

  /**
   * Savings as percentage (0-100)
   */
  savingsPercent: number;

  /**
   * Warnings from minifier (if any)
   */
  warnings: string[];
}

/**
 * Minify HTML content
 *
 * Uses html-minifier-terser to compress HTML while preserving functionality.
 * Optimizations include:
 * - Remove whitespace and comments
 * - Collapse boolean attributes
 * - Remove redundant attributes
 * - Minify inline CSS and JavaScript
 *
 * @param html - HTML content to minify
 * @param options - Minification options
 * @returns Minification result with metrics
 * @throws {Error} If html-minifier-terser is not installed
 *
 * @example
 * ```typescript
 * const result = await minifyHTML('<div>  <p>Hello</p>  </div>');
 * console.log(result.code); // '<div><p>Hello</p></div>'
 * console.log(`Saved ${result.savingsPercent}%`);
 * ```
 */
export async function minifyHTML(
  html: string,
  options: { verbose?: boolean } = {}
): Promise<MinifyResult> {
  const { verbose = false } = options;

  if (verbose) {
    console.log(`[UI Minifier] Minifying HTML (${html.length} bytes)...`);
  }

  // Lazy-load html-minifier-terser (zero-weight principle)
  let minify: any;
  try {
    const htmlMinifier = await import('html-minifier-terser');
    minify = htmlMinifier.minify;
  } catch (error: any) {
    throw new Error(
      'html-minifier-terser is required for HTML minification but not installed.\n' +
      'Install it with: npm install html-minifier-terser\n' +
      'Or disable HTML minification in your configuration'
    );
  }

  const originalSize = Buffer.byteLength(html, 'utf8');

  try {
    const minified = await minify(html, {
      // Remove whitespace
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,

      // Minify inline CSS and JS
      minifyCSS: true,
      minifyJS: true,

      // Preserve functionality
      caseSensitive: false,
      collapseBooleanAttributes: true,
      removeEmptyAttributes: false, // Keep empty attributes that might be needed
      removeOptionalTags: false, // Be conservative to preserve structure
    });

    const minifiedSize = Buffer.byteLength(minified, 'utf8');
    const savings = originalSize - minifiedSize;
    const savingsPercent = originalSize > 0 ? (savings / originalSize) * 100 : 0;

    if (verbose) {
      console.log(
        `[UI Minifier] HTML minified: ${originalSize} → ${minifiedSize} bytes (${savingsPercent.toFixed(1)}% saved)`
      );
    }

    return {
      code: minified,
      originalSize,
      minifiedSize,
      savings,
      savingsPercent,
      warnings: [],
    };
  } catch (error: any) {
    throw new Error(
      `Failed to minify HTML: ${error.message}\n` +
      'Hint: Check for malformed HTML or unsupported syntax'
    );
  }
}

/**
 * Minify CSS content
 *
 * Uses cssnano (via postcss) to compress CSS while preserving functionality.
 * Optimizations include:
 * - Remove whitespace and comments
 * - Merge duplicate rules
 * - Shorten color values and units
 * - Remove unused rules (when safe)
 *
 * @param css - CSS content to minify
 * @param options - Minification options
 * @returns Minification result with metrics
 * @throws {Error} If postcss or cssnano is not installed
 *
 * @example
 * ```typescript
 * const result = await minifyCSS('.button { color: #ffffff; }');
 * console.log(result.code); // '.button{color:#fff}'
 * console.log(`Saved ${result.savings} bytes`);
 * ```
 */
export async function minifyCSS(
  css: string,
  options: { verbose?: boolean } = {}
): Promise<MinifyResult> {
  const { verbose = false } = options;

  if (verbose) {
    console.log(`[UI Minifier] Minifying CSS (${css.length} bytes)...`);
  }

  // Lazy-load postcss and cssnano (zero-weight principle)
  let postcss: any;
  let cssnano: any;
  try {
    postcss = (await import('postcss')).default;
    cssnano = (await import('cssnano')).default;
  } catch (error: any) {
    throw new Error(
      'postcss and cssnano are required for CSS minification but not installed.\n' +
      'Install them with: npm install postcss cssnano\n' +
      'Or disable CSS minification in your configuration'
    );
  }

  const originalSize = Buffer.byteLength(css, 'utf8');
  const warnings: string[] = [];

  try {
    const result = await postcss([cssnano({ preset: 'default' })]).process(css, {
      from: undefined, // No source file
    });

    // Collect warnings
    result.warnings().forEach((warning) => {
      warnings.push(warning.toString());
    });

    const minified = result.css;
    const minifiedSize = Buffer.byteLength(minified, 'utf8');
    const savings = originalSize - minifiedSize;
    const savingsPercent = originalSize > 0 ? (savings / originalSize) * 100 : 0;

    if (verbose) {
      console.log(
        `[UI Minifier] CSS minified: ${originalSize} → ${minifiedSize} bytes (${savingsPercent.toFixed(1)}% saved)`
      );
      if (warnings.length > 0) {
        console.warn(`[UI Minifier] CSS warnings:\n${warnings.join('\n')}`);
      }
    }

    return {
      code: minified,
      originalSize,
      minifiedSize,
      savings,
      savingsPercent,
      warnings,
    };
  } catch (error: any) {
    throw new Error(
      `Failed to minify CSS: ${error.message}\n` +
      'Hint: Check for malformed CSS or unsupported syntax'
    );
  }
}

/**
 * Minify JavaScript content
 *
 * Uses terser to compress JavaScript while preserving functionality.
 * Optimizations include:
 * - Remove whitespace and comments
 * - Mangle variable names (shorten identifiers)
 * - Dead code elimination
 * - Compress control flow
 *
 * @param js - JavaScript content to minify
 * @param options - Minification options
 * @returns Minification result with metrics
 * @throws {Error} If terser is not installed
 *
 * @example
 * ```typescript
 * const result = await minifyJS('function hello() { console.log("Hi"); }');
 * console.log(result.code); // 'function hello(){console.log("Hi")}'
 * console.log(`${result.savingsPercent.toFixed(1)}% smaller`);
 * ```
 */
export async function minifyJS(
  js: string,
  options: { verbose?: boolean } = {}
): Promise<MinifyResult> {
  const { verbose = false } = options;

  if (verbose) {
    console.log(`[UI Minifier] Minifying JavaScript (${js.length} bytes)...`);
  }

  // Lazy-load terser (zero-weight principle)
  let terser: any;
  try {
    terser = await import('terser');
  } catch (error: any) {
    throw new Error(
      'terser is required for JavaScript minification but not installed.\n' +
      'Install it with: npm install terser\n' +
      'Or disable JavaScript minification in your configuration'
    );
  }

  const originalSize = Buffer.byteLength(js, 'utf8');
  const warnings: string[] = [];

  try {
    const result = await terser.minify(js, {
      compress: {
        dead_code: true,
        drop_console: false, // Keep console statements for debugging
        drop_debugger: true,
        pure_funcs: [], // Don't remove any functions by default
      },
      mangle: {
        // Mangle variable names but preserve top-level names
        toplevel: false,
      },
      format: {
        comments: false, // Remove all comments
        ascii_only: false, // Allow unicode
      },
    });

    if (!result.code) {
      throw new Error('Terser produced no output');
    }

    // Collect warnings
    if (result.warnings) {
      warnings.push(...result.warnings);
    }

    const minified = result.code;
    const minifiedSize = Buffer.byteLength(minified, 'utf8');
    const savings = originalSize - minifiedSize;
    const savingsPercent = originalSize > 0 ? (savings / originalSize) * 100 : 0;

    if (verbose) {
      console.log(
        `[UI Minifier] JavaScript minified: ${originalSize} → ${minifiedSize} bytes (${savingsPercent.toFixed(1)}% saved)`
      );
      if (warnings.length > 0) {
        console.warn(`[UI Minifier] JavaScript warnings:\n${warnings.join('\n')}`);
      }
    }

    return {
      code: minified,
      originalSize,
      minifiedSize,
      savings,
      savingsPercent,
      warnings,
    };
  } catch (error: any) {
    throw new Error(
      `Failed to minify JavaScript: ${error.message}\n` +
      'Hint: Check for syntax errors or unsupported ES features'
    );
  }
}

/**
 * Minify complete HTML document with embedded CSS and JavaScript
 *
 * Intelligently minifies an HTML document by:
 * 1. Extracting inline <style> and <script> tags
 * 2. Minifying CSS and JavaScript separately
 * 3. Minifying HTML structure
 * 4. Combining everything back together
 *
 * This provides better compression than minifying HTML alone.
 *
 * @param html - Complete HTML document
 * @param options - Selective minification options
 * @returns Combined minification result
 *
 * @example
 * ```typescript
 * const doc = `
 *   <!DOCTYPE html>
 *   <html>
 *     <head><style>body { margin: 0; }</style></head>
 *     <body><script>console.log('test');</script></body>
 *   </html>
 * `;
 * const result = await minifyDocument(doc, { html: true, css: true, js: true });
 * console.log(`Total savings: ${result.savingsPercent.toFixed(1)}%`);
 * ```
 */
export async function minifyDocument(
  html: string,
  options: MinifyOptions = {}
): Promise<MinifyResult> {
  const {
    html: minifyHtml = true,
    css: minifyCss = true,
    js: minifyJs = true,
    verbose = false,
  } = options;

  if (verbose) {
    console.log('[UI Minifier] Minifying complete document...');
  }

  const originalSize = Buffer.byteLength(html, 'utf8');
  let processedHtml = html;
  let totalWarnings: string[] = [];

  // Step 1: Minify inline CSS (if enabled)
  if (minifyCss) {
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    const styleMatches = [...html.matchAll(styleRegex)];

    for (const match of styleMatches) {
      const originalCss = match[1];
      if (originalCss.trim()) {
        try {
          const cssResult = await minifyCSS(originalCss, { verbose });
          processedHtml = processedHtml.replace(match[0], `<style>${cssResult.code}</style>`);
          totalWarnings.push(...cssResult.warnings);
        } catch (error: any) {
          if (verbose) {
            console.warn(`[UI Minifier] Failed to minify inline CSS: ${error.message}`);
          }
          totalWarnings.push(`CSS minification failed: ${error.message}`);
        }
      }
    }
  }

  // Step 2: Minify inline JavaScript (if enabled)
  if (minifyJs) {
    const scriptRegex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    const scriptMatches = [...processedHtml.matchAll(scriptRegex)];

    for (const match of scriptMatches) {
      const originalJs = match[1];
      if (originalJs.trim()) {
        try {
          const jsResult = await minifyJS(originalJs, { verbose });
          processedHtml = processedHtml.replace(match[0], `<script>${jsResult.code}</script>`);
          totalWarnings.push(...jsResult.warnings);
        } catch (error: any) {
          if (verbose) {
            console.warn(`[UI Minifier] Failed to minify inline JavaScript: ${error.message}`);
          }
          totalWarnings.push(`JavaScript minification failed: ${error.message}`);
        }
      }
    }
  }

  // Step 3: Minify HTML structure (if enabled)
  if (minifyHtml) {
    try {
      const htmlResult = await minifyHTML(processedHtml, { verbose });
      processedHtml = htmlResult.code;
      totalWarnings.push(...htmlResult.warnings);
    } catch (error: any) {
      if (verbose) {
        console.warn(`[UI Minifier] Failed to minify HTML: ${error.message}`);
      }
      totalWarnings.push(`HTML minification failed: ${error.message}`);
    }
  }

  const minifiedSize = Buffer.byteLength(processedHtml, 'utf8');
  const savings = originalSize - minifiedSize;
  const savingsPercent = originalSize > 0 ? (savings / originalSize) * 100 : 0;

  if (verbose) {
    console.log(
      `[UI Minifier] Document minified: ${originalSize} → ${minifiedSize} bytes (${savingsPercent.toFixed(1)}% saved)`
    );
  }

  return {
    code: processedHtml,
    originalSize,
    minifiedSize,
    savings,
    savingsPercent,
    warnings: totalWarnings,
  };
}

/**
 * Normalize minify options
 *
 * Converts boolean or object minify configuration to full MinifyOptions.
 *
 * @param minify - Minify configuration from IUI interface
 * @returns Normalized MinifyOptions
 *
 * @example
 * ```typescript
 * normalizeMinifyOptions(true); // { html: true, css: true, js: true }
 * normalizeMinifyOptions({ html: false, css: true }); // { html: false, css: true, js: true }
 * normalizeMinifyOptions(false); // { html: false, css: false, js: false }
 * ```
 */
export function normalizeMinifyOptions(
  minify?: boolean | Partial<MinifyOptions>
): MinifyOptions {
  if (minify === true) {
    return { html: true, css: true, js: true };
  }
  if (minify === false || minify === undefined) {
    return { html: false, css: false, js: false };
  }
  return {
    html: minify.html ?? true,
    css: minify.css ?? true,
    js: minify.js ?? true,
    verbose: minify.verbose ?? false,
  };
}
