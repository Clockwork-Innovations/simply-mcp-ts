/**
 * Configuration file loader for SimplyMCP bundling
 * Supports .js, .ts, .mjs, and .json config files
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import { pathToFileURL } from 'url';
import { SimplyMCPConfig, BundleOptions } from './bundle-types.js';

/**
 * Load SimplyMCP configuration from file
 *
 * Search order (if no config path provided):
 * 1. simplymcp.config.js
 * 2. simplymcp.config.ts
 * 3. simplymcp.config.mjs
 * 4. simplymcp.config.json
 * 5. mcp.config.js
 * 6. mcp.config.ts
 * 7. mcp.config.json
 *
 * @param configPath - Optional explicit config file path
 * @param basePath - Base directory for config search
 * @returns Loaded config or null if not found
 *
 * @example
 * ```typescript
 * const config = await loadConfig();
 * if (config) {
 *   console.log('Entry:', config.entry);
 * }
 * ```
 */
export async function loadConfig(
  configPath?: string,
  basePath: string = process.cwd()
): Promise<SimplyMCPConfig | null> {
  // 1. Determine config file path(s) to check
  const paths = configPath
    ? [configPath]
    : [
        'simplymcp.config.js',
        'simplymcp.config.ts',
        'simplymcp.config.mjs',
        'simplymcp.config.json',
        'mcp.config.js',
        'mcp.config.ts',
        'mcp.config.json',
      ];

  // 2. Try each path until one is found
  for (const path of paths) {
    const fullPath = join(basePath, path);
    if (existsSync(fullPath)) {
      try {
        const config = await loadConfigFile(fullPath);
        return validateConfig(config);
      } catch (error) {
        throw new Error(
          `Failed to load config from ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  return null;
}

/**
 * Load and parse a specific config file
 *
 * @param path - Absolute path to config file
 * @returns Parsed config
 */
async function loadConfigFile(path: string): Promise<SimplyMCPConfig> {
  const ext = extname(path);

  // JSON config
  if (ext === '.json') {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content);
  }

  // JavaScript/TypeScript config (ESM)
  if (ext === '.js' || ext === '.ts' || ext === '.mjs' || ext === '.mts') {
    // Use dynamic import for ESM modules
    const fileUrl = pathToFileURL(path).href;
    const module = await import(fileUrl);

    // Support both default export and named export
    return module.default || module.config || module;
  }

  throw new Error(`Unsupported config file format: ${ext}`);
}

/**
 * Validate and normalize config structure
 *
 * @param config - Raw config object
 * @returns Validated config
 */
function validateConfig(config: any): SimplyMCPConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be an object');
  }

  // Validate entry if provided
  if (config.entry !== undefined && typeof config.entry !== 'string') {
    throw new Error('config.entry must be a string');
  }

  // Validate output if provided
  if (config.output !== undefined) {
    if (typeof config.output !== 'object') {
      throw new Error('config.output must be an object');
    }

    const { dir, filename, format } = config.output;

    if (dir !== undefined && typeof dir !== 'string') {
      throw new Error('config.output.dir must be a string');
    }

    if (filename !== undefined && typeof filename !== 'string') {
      throw new Error('config.output.filename must be a string');
    }

    if (format !== undefined) {
      const validFormats = ['single-file', 'standalone', 'executable', 'esm', 'cjs'];
      if (!validFormats.includes(format)) {
        throw new Error(`config.output.format must be one of: ${validFormats.join(', ')}`);
      }
    }
  }

  // Validate bundle options if provided
  if (config.bundle !== undefined && typeof config.bundle !== 'object') {
    throw new Error('config.bundle must be an object');
  }

  // Validate autoInstall if provided
  if (config.autoInstall !== undefined && typeof config.autoInstall !== 'boolean') {
    throw new Error('config.autoInstall must be a boolean');
  }

  return config as SimplyMCPConfig;
}

/**
 * Merge config with CLI options
 * CLI options take precedence over config file
 *
 * @param config - Config from file
 * @param cliOptions - Options from CLI
 * @returns Merged bundle options
 *
 * @example
 * ```typescript
 * const config = await loadConfig();
 * const options = mergeConfig(config, {
 *   output: './dist/server.js',
 *   minify: true
 * });
 * ```
 */
export function mergeConfig(
  config: SimplyMCPConfig | null,
  cliOptions: Partial<BundleOptions>
): BundleOptions {
  if (!config) {
    // No config file - use CLI options directly
    return {
      entry: cliOptions.entry || '',
      output: cliOptions.output || '',
      ...cliOptions,
    };
  }

  // Merge config and CLI options
  const merged: BundleOptions = {
    // Entry point (CLI > config)
    entry: cliOptions.entry || config.entry || '',

    // Output (CLI > config)
    output: cliOptions.output || (config.output?.dir && config.output?.filename
      ? join(config.output.dir, config.output.filename)
      : config.output?.dir || ''),

    // Format (CLI > config)
    format: cliOptions.format || config.output?.format || 'single-file',

    // Bundle options (CLI > config)
    minify: cliOptions.minify !== undefined ? cliOptions.minify : config.bundle?.minify,
    sourcemap: cliOptions.sourcemap !== undefined ? cliOptions.sourcemap : config.bundle?.sourcemap,
    platform: cliOptions.platform || config.bundle?.platform,
    target: cliOptions.target || config.bundle?.target,
    external: cliOptions.external || config.bundle?.external,
    treeShake: cliOptions.treeShake !== undefined ? cliOptions.treeShake : config.bundle?.treeShake,
    banner: cliOptions.banner || config.bundle?.banner,
    footer: cliOptions.footer || config.bundle?.footer,

    // Other options
    watch: cliOptions.watch,
    autoInstall: cliOptions.autoInstall !== undefined ? cliOptions.autoInstall : config.autoInstall,
    basePath: cliOptions.basePath,
    onProgress: cliOptions.onProgress,
    onError: cliOptions.onError,
  };

  return merged;
}

/**
 * Create a default config object
 *
 * @returns Default SimplyMCP config
 */
export function createDefaultConfig(): SimplyMCPConfig {
  return {
    output: {
      dir: 'dist',
      format: 'single-file',
    },
    bundle: {
      minify: true,
      sourcemap: false,
      platform: 'node',
      target: 'node20',
      external: [],
      treeShake: true,
    },
    autoInstall: false,
  };
}

/**
 * Write a config file with given options
 *
 * @param config - Config to write
 * @param path - Output path
 * @param format - File format (js, ts, json)
 */
export async function writeConfig(
  config: SimplyMCPConfig,
  path: string,
  format: 'js' | 'ts' | 'json' = 'js'
): Promise<void> {
  let content: string;

  if (format === 'json') {
    content = JSON.stringify(config, null, 2);
  } else if (format === 'ts') {
    content = `import { SimplyMCPConfig } from 'simply-mcp';

export default ${JSON.stringify(config, null, 2)} satisfies SimplyMCPConfig;
`;
  } else {
    // JavaScript
    content = `export default ${JSON.stringify(config, null, 2)};
`;
  }

  await writeFile(path, content, 'utf-8');
}

/**
 * Validate that required options are present
 *
 * @param options - Bundle options to validate
 * @throws Error if validation fails
 */
export function validateBundleOptions(options: BundleOptions): void {
  if (!options.entry) {
    throw new Error('Entry point is required. Provide --entry or set entry in config file.');
  }

  if (!options.output) {
    throw new Error('Output path is required. Provide --output or set output in config file.');
  }

  // Validate format if specified
  if (options.format) {
    const validFormats = ['single-file', 'standalone', 'executable', 'esm', 'cjs'];
    if (!validFormats.includes(options.format)) {
      throw new Error(`Invalid format: ${options.format}. Must be one of: ${validFormats.join(', ')}`);
    }
  }

  // Validate platform if specified
  if (options.platform) {
    const validPlatforms = ['node', 'neutral'];
    if (!validPlatforms.includes(options.platform)) {
      throw new Error(`Invalid platform: ${options.platform}. Must be one of: ${validPlatforms.join(', ')}`);
    }
  }
}
