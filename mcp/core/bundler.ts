/**
 * Main bundler implementation using esbuild
 * Feature 4: Bundling Command
 */

import * as esbuild from 'esbuild';
import { stat } from 'fs/promises';
import { BundleOptions, BundleResult, BundleError, BundleMetadata } from './bundle-types.js';
import { detectEntryPoint } from './entry-detector.js';
import { resolveDependencies, getBuiltinModules } from './dependency-resolver.js';
import { formatOutput } from './output-formatter.js';

/**
 * Bundle a SimpleMCP server using esbuild
 *
 * @param options - Bundle options
 * @returns Bundle result
 *
 * @example
 * ```typescript
 * const result = await bundle({
 *   entry: './server.ts',
 *   output: './dist/server.js',
 *   format: 'single-file',
 *   minify: true
 * });
 *
 * if (result.success) {
 *   console.log(`Bundled to ${result.outputPath} (${result.size} bytes)`);
 * }
 * ```
 */
export async function bundle(options: BundleOptions): Promise<BundleResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: BundleError[] = [];

  try {
    // 1. Detect and validate entry point
    const basePath = options.basePath || process.cwd();
    if (options.onProgress) {
      options.onProgress('Detecting entry point...');
    }

    const entry = await detectEntryPoint(options.entry, basePath);

    if (options.onProgress) {
      options.onProgress(`Entry point: ${entry}`);
    }

    // 2. Resolve dependencies
    if (options.onProgress) {
      options.onProgress('Resolving dependencies...');
    }

    const deps = await resolveDependencies({
      entryPoint: entry,
      autoInstall: options.autoInstall,
      basePath,
    });

    // Add warnings from inline dependencies
    if (deps.inlineDependencies.warnings.length > 0) {
      warnings.push(...deps.inlineDependencies.warnings);
    }

    if (deps.inlineDependencies.errors.length > 0) {
      deps.inlineDependencies.errors.forEach(err => {
        warnings.push(`Inline dependency error: ${err.message}`);
      });
    }

    // 3. Build esbuild configuration
    if (options.onProgress) {
      options.onProgress('Building bundle configuration...');
    }

    const esbuildConfig = buildEsbuildConfig(options, entry, deps);

    // 4. Handle watch mode
    if (options.watch) {
      return await bundleWatch(options, esbuildConfig);
    }

    // 5. Run esbuild
    if (options.onProgress) {
      options.onProgress('Running esbuild...');
    }

    const result = await esbuild.build(esbuildConfig);

    // 6. Format output (for standalone/executable formats)
    if (options.format && ['standalone', 'executable'].includes(options.format)) {
      if (options.onProgress) {
        options.onProgress('Formatting output...');
      }
      await formatOutput(options, result, deps);
    }

    // 7. Get output size
    const size = await getOutputSize(options.output);

    // 8. Extract warnings
    if (result.warnings.length > 0) {
      warnings.push(...result.warnings.map(w => formatEsbuildMessage(w)));
    }

    // 9. Build metadata
    const metadata: BundleMetadata = {
      entry,
      moduleCount: result.metafile ? Object.keys(result.metafile.inputs).length : 0,
      dependencies: Object.keys(deps.dependencies),
      external: [
        ...deps.nativeModules,
        ...(options.external || []),
      ],
      nativeModules: deps.nativeModules,
    };

    // 10. Return successful result
    const duration = Date.now() - startTime;
    if (options.onProgress) {
      options.onProgress(`Bundle complete in ${duration}ms (${formatSize(size)})`);
    }

    return {
      success: true,
      outputPath: options.output,
      format: options.format || 'single-file',
      size,
      duration,
      warnings,
      errors: [],
      metadata,
    };
  } catch (error) {
    // Handle bundling error
    const bundleError: BundleError = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };

    errors.push(bundleError);

    if (options.onError) {
      options.onError(bundleError);
    }

    return {
      success: false,
      outputPath: options.output,
      format: options.format || 'single-file',
      size: 0,
      duration: Date.now() - startTime,
      warnings,
      errors,
    };
  }
}

/**
 * Build esbuild configuration from bundle options
 */
function buildEsbuildConfig(
  options: BundleOptions,
  entry: string,
  deps: any
): esbuild.BuildOptions {
  const format = options.format || 'single-file';
  const external = [
    ...getBuiltinModules(), // Always external
    ...deps.nativeModules,  // Native modules must be external
    ...(options.external || []),
  ];

  return {
    entryPoints: [entry],
    bundle: true,
    platform: options.platform || 'node',
    target: options.target || 'node20',
    format: getEsbuildFormat(format),
    outfile: options.output,
    minify: options.minify !== false, // Default to true
    sourcemap: options.sourcemap || false,
    external: external,
    treeShaking: options.treeShake !== false, // Default to true
    metafile: true,
    logLevel: 'warning',
    mainFields: ['module', 'main'],
    conditions: ['node', 'import', 'require'],
    banner: options.banner ? { js: options.banner } : undefined,
    footer: options.footer ? { js: options.footer } : undefined,
  };
}

/**
 * Convert bundle format to esbuild format
 */
function getEsbuildFormat(format: string): esbuild.Format {
  switch (format) {
    case 'esm':
      return 'esm';
    case 'cjs':
      return 'cjs';
    case 'single-file':
    case 'standalone':
    case 'executable':
    default:
      return 'cjs'; // Default to CJS for compatibility
  }
}

/**
 * Bundle in watch mode
 */
async function bundleWatch(
  options: BundleOptions,
  esbuildConfig: esbuild.BuildOptions
): Promise<BundleResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    let isFirstBuild = true;

    const context = esbuild.context({
      ...esbuildConfig,
      plugins: [
        ...(esbuildConfig.plugins || []),
        {
          name: 'watch-plugin',
          setup(build) {
            build.onEnd((result) => {
              const warnings = result.warnings.map(w => formatEsbuildMessage(w));
              const errors = result.errors.map(e => ({
                message: formatEsbuildMessage(e),
                location: e.location ? {
                  file: e.location.file,
                  line: e.location.line,
                  column: e.location.column,
                } : undefined,
              }));

              if (options.onProgress) {
                if (errors.length > 0) {
                  options.onProgress(`Build failed with ${errors.length} error(s)`);
                } else {
                  options.onProgress(`Build successful (${warnings.length} warning(s))`);
                }
              }

              if (isFirstBuild) {
                isFirstBuild = false;
                resolve({
                  success: errors.length === 0,
                  outputPath: options.output,
                  format: options.format || 'single-file',
                  size: 0,
                  duration: Date.now() - startTime,
                  warnings,
                  errors,
                });
              }
            });
          },
        },
      ],
    });

    context.then(ctx => {
      ctx.watch();
      if (options.onProgress) {
        options.onProgress('Watching for changes...');
      }
    });
  });
}

/**
 * Get output file size
 */
async function getOutputSize(outputPath: string): Promise<number> {
  try {
    const stats = await stat(outputPath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Format esbuild message (warning or error)
 */
function formatEsbuildMessage(msg: esbuild.Message): string {
  let formatted = msg.text;

  if (msg.location) {
    formatted = `${msg.location.file}:${msg.location.line}:${msg.location.column}: ${formatted}`;
  }

  if (msg.notes && msg.notes.length > 0) {
    formatted += '\n' + msg.notes.map(note => `  Note: ${note.text}`).join('\n');
  }

  return formatted;
}

/**
 * Format bytes to human-readable size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Stop watching (for watch mode)
 * Note: This would need to be exposed via a context object
 */
export async function stopWatch(context: esbuild.BuildContext): Promise<void> {
  await context.dispose();
}
