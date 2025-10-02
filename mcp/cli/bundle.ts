/**
 * Bundle command for SimpleMCP CLI
 * Bundles SimpleMCP servers into standalone distributions
 */

import type { CommandModule, ArgumentsCamelCase } from 'yargs';
import { bundle } from '../core/bundler.js';
import { loadConfig, mergeConfig, validateBundleOptions } from '../core/config-loader.js';
import { BundleFormat, SourceMapType } from '../core/bundle-types.js';

interface BundleArgs {
  entry?: string;
  output?: string;
  format?: BundleFormat;
  minify?: boolean;
  'no-minify'?: boolean;
  sourcemap?: boolean | string;
  platform?: 'node' | 'neutral';
  target?: string;
  external?: string;
  'tree-shake'?: boolean;
  'no-tree-shake'?: boolean;
  config?: string;
  watch?: boolean;
  'auto-install'?: boolean;
  verbose?: boolean;
}

/**
 * Bundle command definition
 */
export const bundleCommand: CommandModule<{}, BundleArgs> = {
  command: 'bundle [entry]',
  describe: 'Bundle a SimpleMCP server into a standalone distribution',

  builder: (yargs) => {
    return yargs
      .positional('entry', {
        describe: 'Entry point file (e.g., server.ts)',
        type: 'string',
      })
      .option('output', {
        alias: 'o',
        describe: 'Output file path',
        type: 'string',
      })
      .option('format', {
        alias: 'f',
        describe: 'Output format',
        choices: ['single-file', 'standalone', 'executable', 'esm', 'cjs'] as const,
        default: 'single-file' as const,
      })
      .option('minify', {
        alias: 'm',
        describe: 'Minify output',
        type: 'boolean',
      })
      .option('no-minify', {
        describe: 'Disable minification',
        type: 'boolean',
      })
      .option('sourcemap', {
        alias: 's',
        describe: 'Generate source maps',
        type: 'boolean',
      })
      .option('platform', {
        alias: 'p',
        describe: 'Target platform',
        choices: ['node', 'neutral'] as const,
        default: 'node' as const,
      })
      .option('target', {
        alias: 't',
        describe: 'Target Node.js version',
        choices: ['node18', 'node20', 'node22', 'esnext', 'es2020', 'es2021', 'es2022'] as const,
        default: 'node20' as const,
      })
      .option('external', {
        alias: 'e',
        describe: 'External packages (comma-separated)',
        type: 'string',
      })
      .option('tree-shake', {
        describe: 'Enable tree-shaking',
        type: 'boolean',
      })
      .option('no-tree-shake', {
        describe: 'Disable tree-shaking',
        type: 'boolean',
      })
      .option('config', {
        alias: 'c',
        describe: 'Config file path',
        type: 'string',
      })
      .option('watch', {
        alias: 'w',
        describe: 'Watch for changes',
        type: 'boolean',
        default: false,
      })
      .option('auto-install', {
        describe: 'Auto-install dependencies',
        type: 'boolean',
        default: false,
      })
      .option('verbose', {
        alias: 'v',
        describe: 'Verbose output',
        type: 'boolean',
        default: false,
      })
      .example('$0 bundle server.ts', 'Bundle server.ts to dist/bundle.js')
      .example('$0 bundle server.ts -o dist/server.js', 'Bundle with custom output')
      .example('$0 bundle server.ts -f standalone', 'Create standalone distribution')
      .example('$0 bundle server.ts -w', 'Watch mode for development');
  },

  handler: async (argv: ArgumentsCamelCase<BundleArgs>) => {
    try {
      // Load config file
      const config = await loadConfig(argv.config);

      // Parse external packages
      const external = argv.external
        ? argv.external.split(',').map(p => p.trim())
        : undefined;

      // Resolve minify option (handle --no-minify)
      let minify: boolean | undefined = undefined;
      if (argv['no-minify']) {
        minify = false;
      } else if (argv.minify !== undefined) {
        minify = argv.minify;
      }

      // Resolve tree-shake option (handle --no-tree-shake)
      let treeShake: boolean | undefined = undefined;
      if (argv['no-tree-shake']) {
        treeShake = false;
      } else if (argv['tree-shake'] !== undefined) {
        treeShake = argv['tree-shake'];
      }

      // Resolve sourcemap option
      let sourcemap: SourceMapType = false;
      if (argv.sourcemap === true) {
        sourcemap = 'external';
      } else if (typeof argv.sourcemap === 'string') {
        sourcemap = argv.sourcemap as SourceMapType;
      }

      // Merge config with CLI options
      const options = mergeConfig(config, {
        entry: argv.entry,
        output: argv.output,
        format: argv.format,
        minify,
        sourcemap,
        platform: argv.platform,
        target: argv.target as any, // Cast to avoid type error with yargs
        external,
        treeShake,
        watch: argv.watch,
        autoInstall: argv['auto-install'],
        onProgress: argv.verbose ? (msg: string) => console.log(`[INFO] ${msg}`) : undefined,
        onError: (err) => console.error(`[ERROR] ${err.message}`),
      });

      // Validate options
      validateBundleOptions(options);

      // Print configuration
      console.log('SimpleMCP Bundler');
      console.log('=================\n');
      console.log(`Entry:    ${options.entry}`);
      console.log(`Output:   ${options.output}`);
      console.log(`Format:   ${options.format}`);
      console.log(`Minify:   ${options.minify !== false ? 'Yes' : 'No'}`);
      console.log(`Platform: ${options.platform || 'node'}`);
      console.log(`Target:   ${options.target || 'node20'}`);
      if (options.external && options.external.length > 0) {
        console.log(`External: ${options.external.join(', ')}`);
      }
      console.log('');

      // Execute bundling
      const result = await bundle(options);

      // Display results
      if (result.success) {
        console.log('\u2713 Bundle created successfully!\n');
        console.log(`Output:   ${result.outputPath}`);
        console.log(`Size:     ${formatSize(result.size)}`);
        console.log(`Duration: ${result.duration}ms`);

        if (result.metadata) {
          console.log(`Modules:  ${result.metadata.moduleCount}`);
          if (result.metadata.nativeModules.length > 0) {
            console.log(`Native:   ${result.metadata.nativeModules.join(', ')}`);
          }
        }

        if (result.warnings.length > 0) {
          console.log(`\nWarnings (${result.warnings.length}):`);
          result.warnings.forEach(w => console.log(`  - ${w}`));
        }

        // Watch mode message
        if (options.watch) {
          console.log('\nWatching for changes... (press Ctrl+C to stop)');
        }
      } else {
        console.error('\u2717 Bundle failed!\n');
        result.errors.forEach(err => {
          console.error(`Error: ${err.message}`);
          if (err.location) {
            console.error(`  at ${err.location.file}:${err.location.line}:${err.location.column}`);
          }
        });

        if (result.warnings.length > 0) {
          console.log(`\nWarnings (${result.warnings.length}):`);
          result.warnings.forEach(w => console.log(`  - ${w}`));
        }

        process.exit(1);
      }
    } catch (error) {
      console.error('\n\u2717 Fatal error:', error instanceof Error ? error.message : String(error));
      if (argv.verbose && error instanceof Error && error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      process.exit(1);
    }
  },
};

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
