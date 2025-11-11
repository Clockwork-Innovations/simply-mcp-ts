/**
 * TypeScript Configuration Resolver
 *
 * Provides utilities for finding and loading tsconfig.json files.
 * Used by the TypeScript program builder to configure proper module resolution.
 */

import * as ts from 'typescript';
import { existsSync, readFileSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';

/**
 * Maximum number of directory levels to traverse when searching for tsconfig.json
 */
const MAX_TRAVERSE_DEPTH = 10;

/**
 * Configuration file names to search for, in order of preference
 */
const CONFIG_FILE_NAMES = ['tsconfig.json', 'jsconfig.json'];

/**
 * Find tsconfig.json by walking up the directory tree from a starting path.
 *
 * Searches for tsconfig.json or jsconfig.json files in the following locations:
 * 1. The directory containing the file (if startPath is a file)
 * 2. Parent directories up to MAX_TRAVERSE_DEPTH levels
 *
 * @param startPath - File or directory path to start searching from
 * @returns Absolute path to tsconfig.json/jsconfig.json if found, null otherwise
 *
 * @example
 * ```typescript
 * const configPath = findTsConfig('/path/to/project/src/server.ts');
 * // Returns: '/path/to/project/tsconfig.json' (if it exists)
 * ```
 */
export function findTsConfig(startPath: string): string | null {
  // Resolve to absolute path
  const absolutePath = resolve(startPath);

  // Determine starting directory
  // If the path is a file, start from its directory
  let currentDir = existsSync(absolutePath)
    ? (statSync(absolutePath).isDirectory()
        ? absolutePath
        : dirname(absolutePath))
    : dirname(absolutePath);

  // Walk up the directory tree
  for (let depth = 0; depth < MAX_TRAVERSE_DEPTH; depth++) {
    // Check for each config file name in order
    for (const configFileName of CONFIG_FILE_NAMES) {
      const configPath = join(currentDir, configFileName);
      if (existsSync(configPath)) {
        return configPath;
      }
    }

    // Move to parent directory
    const parentDir = dirname(currentDir);

    // Stop if we've reached the root (no parent change)
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  // No config found
  return null;
}

/**
 * Load and parse compiler options from a tsconfig.json file.
 *
 * Features:
 * - Parses tsconfig.json using TypeScript's official parser
 * - Handles extends (inheritance from base configs)
 * - Merges loaded options with provided defaults
 * - Returns sensible defaults if config file doesn't exist or is invalid
 *
 * @param configPath - Absolute path to tsconfig.json (or null to use defaults)
 * @param defaultOptions - Default compiler options to merge with loaded config
 * @returns Merged compiler options
 *
 * @example
 * ```typescript
 * const defaults = {
 *   target: ts.ScriptTarget.ES2020,
 *   module: ts.ModuleKind.CommonJS,
 *   moduleResolution: ts.ModuleResolutionKind.NodeJs
 * };
 *
 * const options = loadCompilerOptions('/path/to/tsconfig.json', defaults);
 * // Returns: merged options from tsconfig.json + defaults
 * ```
 */
export function loadCompilerOptions(
  configPath: string | null,
  defaultOptions: ts.CompilerOptions
): ts.CompilerOptions {
  // If no config path provided, return defaults
  if (!configPath || !existsSync(configPath)) {
    return { ...defaultOptions };
  }

  try {
    // Read and parse the config file
    const configFileText = readFileSync(configPath, 'utf-8');
    const configDir = dirname(configPath);

    // Parse the JSON with TypeScript's parser (handles comments, etc.)
    const parseResult = ts.parseConfigFileTextToJson(configPath, configFileText);

    if (parseResult.error) {
      // If parsing fails, log warning and return defaults
      console.warn(
        `Warning: Failed to parse ${configPath}: ${parseResult.error.messageText}`
      );
      return { ...defaultOptions };
    }

    // Parse the compiler options from the JSON
    const parsedConfig = ts.parseJsonConfigFileContent(
      parseResult.config,
      ts.sys,
      configDir,
      defaultOptions, // Base options to merge with
      configPath
    );

    if (parsedConfig.errors && parsedConfig.errors.length > 0) {
      // Log warnings for any config errors, but continue with what we got
      parsedConfig.errors.forEach((error) => {
        console.warn(
          `Warning in ${configPath}: ${ts.flattenDiagnosticMessageText(
            error.messageText,
            '\n'
          )}`
        );
      });
    }

    // Merge parsed options with defaults (parsed takes precedence)
    return {
      ...defaultOptions,
      ...parsedConfig.options
    };
  } catch (error) {
    // If anything goes wrong, log error and return defaults
    console.warn(
      `Warning: Error loading tsconfig from ${configPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { ...defaultOptions };
  }
}

/**
 * Get default compiler options for Simply-MCP TypeScript parsing.
 *
 * These defaults are designed to work out-of-the-box for ANY TypeScript MCP server,
 * regardless of the user's environment or tsconfig.json settings.
 *
 * Optimized for:
 * - Universal compatibility (works with CommonJS, ESM, React, etc.)
 * - Modern TypeScript features (ES2020+)
 * - Fast parsing (skip lib checks, no emit)
 * - Flexible module resolution (handles node_modules, relative imports, etc.)
 * - No user configuration required
 *
 * @param filePath - Optional file path to set baseUrl relative to
 * @returns Comprehensive TypeScript compiler options that work universally
 */
export function getDefaultCompilerOptions(filePath?: string): ts.CompilerOptions {
  // Determine baseUrl from file path if provided
  const baseUrl = filePath ? dirname(resolve(filePath)) : undefined;

  return {
    // Target & Module System
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'], // Support modern JS + DOM APIs

    // Module Resolution
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,

    // Paths & Resolution
    baseUrl,
    paths: baseUrl ? {
      '*': [
        join(baseUrl, 'node_modules/*'),
        join(baseUrl, '../node_modules/*'),
        join(baseUrl, '../../node_modules/*')
      ]
    } : undefined,

    // Type Checking (permissive for parsing)
    strict: false,
    noImplicitAny: false,
    strictNullChecks: false,
    strictFunctionTypes: false,
    strictPropertyInitialization: false,
    noImplicitThis: false,
    alwaysStrict: false,

    // Additional Checks (disabled for compatibility)
    noUnusedLocals: false,
    noUnusedParameters: false,
    noImplicitReturns: false,
    noFallthroughCasesInSwitch: false,

    // Emit (disabled - we only parse)
    noEmit: true,
    declaration: false,

    // Performance Optimizations
    skipLibCheck: true,
    skipDefaultLibCheck: true,

    // JavaScript & JSX Support
    allowJs: true,
    checkJs: false,
    jsx: ts.JsxEmit.React,

    // Interop & Compatibility
    allowUmdGlobalAccess: true,
    forceConsistentCasingInFileNames: false,

    // Experimental Features (enable all for maximum compatibility)
    experimentalDecorators: true,
    emitDecoratorMetadata: true,

    // Source Maps (for debugging, not emitting)
    sourceMap: false,

    // Type Roots
    typeRoots: baseUrl ? [
      join(baseUrl, 'node_modules/@types'),
      join(baseUrl, '../node_modules/@types'),
      join(baseUrl, '../../node_modules/@types')
    ] : undefined
  };
}
