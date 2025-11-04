/**
 * Configuration Loader for Simply-MCP v4.0
 *
 * Zero-config by default - uses smart defaults based on NODE_ENV.
 * Optional config file overrides: simply-mcp.config.{ts,js,json}
 *
 * @module config-loader
 */

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { pathToFileURL } from 'url';
import type { SimplyMCPConfig } from './config-schema.js';
import {
  DEFAULT_CONFIG,
  mergeConfig,
  validateConfig,
} from './config-schema.js';

/**
 * Config file search order (highest priority first)
 */
const CONFIG_FILE_NAMES = [
  'simply-mcp.config.ts',
  'simply-mcp.config.js',
  'simply-mcp.config.mjs',
  'simply-mcp.config.json',
];

/**
 * Loaded configuration cache
 * Keyed by base path to support multiple projects
 */
const configCache = new Map<string, Required<SimplyMCPConfig>>();

/**
 * Load configuration from file system or use defaults
 *
 * Search order:
 * 1. Look for config file in basePath
 * 2. If found, load and merge with defaults
 * 3. If not found, use defaults
 * 4. Cache result for performance
 *
 * @param options - Load options
 * @returns Merged configuration
 *
 * @example
 * ```typescript
 * const config = await loadConfig({
 *   basePath: process.cwd()
 * });
 * console.log(config.build.bundle); // true (default)
 * ```
 */
export async function loadConfig(options: {
  /**
   * Base path to search for config file
   * @default process.cwd()
   */
  basePath?: string;

  /**
   * Whether to use cache
   * @default true
   */
  cache?: boolean;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
}): Promise<Required<SimplyMCPConfig>> {
  const { basePath = process.cwd(), cache = true, verbose = false } = options;

  // Check cache first
  if (cache && configCache.has(basePath)) {
    if (verbose) {
      console.log(`[ConfigLoader] Using cached config for ${basePath}`);
    }
    return configCache.get(basePath)!;
  }

  if (verbose) {
    console.log(`[ConfigLoader] Loading config from ${basePath}`);
  }

  // Search for config file
  const configPath = findConfigFile(basePath, verbose);

  let userConfig: SimplyMCPConfig = {};

  if (configPath) {
    if (verbose) {
      console.log(`[ConfigLoader] Found config file: ${configPath}`);
    }

    try {
      userConfig = await loadConfigFile(configPath, verbose);
      validateConfig(userConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load config from ${configPath}: ${message}`);
    }
  } else {
    if (verbose) {
      console.log('[ConfigLoader] No config file found, using defaults');
    }
  }

  // Merge with defaults
  const mergedConfig = mergeConfig(userConfig);

  if (verbose) {
    console.log('[ConfigLoader] Final config:', JSON.stringify(mergedConfig, null, 2));
  }

  // Cache for future use
  if (cache) {
    configCache.set(basePath, mergedConfig);
  }

  return mergedConfig;
}

/**
 * Find config file in base path
 *
 * Searches for config files in priority order.
 *
 * @param basePath - Base directory to search
 * @param verbose - Enable logging
 * @returns Config file path or null if not found
 */
function findConfigFile(basePath: string, verbose: boolean): string | null {
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = resolve(basePath, fileName);

    if (verbose) {
      console.log(`[ConfigLoader] Checking for ${filePath}`);
    }

    if (existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

/**
 * Load and parse config file
 *
 * Supports:
 * - TypeScript (.ts) - uses dynamic import
 * - JavaScript (.js, .mjs) - uses dynamic import
 * - JSON (.json) - uses dynamic import (Node supports JSON modules)
 *
 * @param configPath - Absolute path to config file
 * @param verbose - Enable logging
 * @returns Parsed configuration
 */
async function loadConfigFile(
  configPath: string,
  verbose: boolean
): Promise<SimplyMCPConfig> {
  try {
    // Convert file path to URL for dynamic import
    const configUrl = pathToFileURL(configPath).href;

    if (verbose) {
      console.log(`[ConfigLoader] Importing ${configUrl}`);
    }

    // Dynamic import works for .ts, .js, .mjs
    const module = await import(configUrl);

    // Handle default export or named export
    const config = module.default || module;

    if (typeof config === 'function') {
      // Config can be a function that returns config
      return config();
    }

    return config;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load config file: ${message}`);
  }
}

/**
 * Clear configuration cache
 *
 * Useful for testing or when config file changes at runtime.
 *
 * @param basePath - Optional base path to clear (clears all if omitted)
 */
export function clearConfigCache(basePath?: string): void {
  if (basePath) {
    configCache.delete(basePath);
  } else {
    configCache.clear();
  }
}

/**
 * Get default configuration
 *
 * Returns the default config without loading from file system.
 * Useful for testing or when you want to know the defaults.
 *
 * @returns Default configuration
 */
export function getDefaultConfig(): Required<SimplyMCPConfig> {
  return { ...DEFAULT_CONFIG };
}

/**
 * Load configuration synchronously (for CLI usage)
 *
 * Only supports .json files for synchronous loading.
 * For .ts/.js files, use loadConfig() instead.
 *
 * @param options - Load options
 * @returns Merged configuration
 * @throws {Error} If config file is not JSON
 */
export function loadConfigSync(options: {
  basePath?: string;
  cache?: boolean;
  verbose?: boolean;
}): Required<SimplyMCPConfig> {
  const { basePath = process.cwd(), cache = true, verbose = false } = options;

  // Check cache first
  if (cache && configCache.has(basePath)) {
    return configCache.get(basePath)!;
  }

  // Find JSON config file only
  const jsonConfigPath = resolve(basePath, 'simply-mcp.config.json');

  let userConfig: SimplyMCPConfig = {};

  if (existsSync(jsonConfigPath)) {
    if (verbose) {
      console.log(`[ConfigLoader] Found JSON config: ${jsonConfigPath}`);
    }

    try {
      const fs = require('fs');
      const content = fs.readFileSync(jsonConfigPath, 'utf-8');
      userConfig = JSON.parse(content);
      validateConfig(userConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load JSON config: ${message}`);
    }
  } else {
    if (verbose) {
      console.log('[ConfigLoader] No JSON config found, using defaults');
    }
  }

  const mergedConfig = mergeConfig(userConfig);

  if (cache) {
    configCache.set(basePath, mergedConfig);
  }

  return mergedConfig;
}
