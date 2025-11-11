/**
 * TypeScript Program Builder
 *
 * Creates and caches TypeScript programs with proper module resolution.
 * This replaces the simple createSourceFile() approach with a full program
 * that can resolve imports, types, and dependencies.
 */

import * as ts from 'typescript';
import { resolve } from 'path';
import { findTsConfig, loadCompilerOptions, getDefaultCompilerOptions } from './tsconfig-resolver.js';

/**
 * Context returned from creating a TypeScript program
 */
export interface ProgramContext {
  /** The TypeScript program instance */
  program: ts.Program;
  /** Type checker for semantic analysis */
  typeChecker: ts.TypeChecker;
  /** The requested source file */
  sourceFile: ts.SourceFile;
}

/**
 * Cache entry for a compiled program
 */
interface CacheEntry {
  /** The program context */
  context: ProgramContext;
  /** Timestamp when this entry was created */
  timestamp: number;
}

/**
 * TypeScript Program Builder with caching
 *
 * Features:
 * - Creates TypeScript programs with proper module resolution
 * - Finds and uses tsconfig.json from the project
 * - Caches programs to avoid re-parsing the same files
 * - Provides access to type checker for semantic analysis
 *
 * Usage:
 * ```typescript
 * const builder = new TypeScriptProgramBuilder();
 * const { program, typeChecker, sourceFile } = await builder.createProgram('/path/to/server.ts');
 * ```
 */
export class TypeScriptProgramBuilder {
  /**
   * Program cache: Maps absolute file path -> cache entry
   */
  private programCache: Map<string, CacheEntry> = new Map();

  /**
   * Create a TypeScript program for a file with proper module resolution.
   *
   * Process:
   * 1. Check cache for existing program
   * 2. Find tsconfig.json in project
   * 3. Load compiler options (or use defaults)
   * 4. Create TypeScript program
   * 5. Get type checker and source file
   * 6. Cache the result
   *
   * @param filePath - Path to TypeScript file to compile
   * @param compilerOptions - Optional compiler options to override defaults
   * @returns Program context with program, type checker, and source file
   * @throws Error if file cannot be parsed or program creation fails
   *
   * @example
   * ```typescript
   * const builder = new TypeScriptProgramBuilder();
   *
   * // Basic usage - auto-discovers tsconfig.json
   * const ctx = builder.createProgram('/path/to/server.ts');
   *
   * // With custom options
   * const ctx = builder.createProgram('/path/to/server.ts', {
   *   target: ts.ScriptTarget.ES2022,
   *   strict: true
   * });
   * ```
   */
  createProgram(
    filePath: string,
    compilerOptions?: ts.CompilerOptions
  ): ProgramContext {
    // Resolve to absolute path for cache key consistency
    const absolutePath = resolve(filePath);

    // Check cache first
    const cached = this.programCache.get(absolutePath);
    if (cached) {
      return cached.context;
    }

    try {
      // Step 1: Find tsconfig.json (optional - user doesn't need one)
      const tsconfigPath = findTsConfig(absolutePath);

      // Step 2: Load compiler options
      // Get robust defaults that work for ANY TypeScript file, regardless of user's environment
      const defaultOptions = getDefaultCompilerOptions(absolutePath);
      const mergedOptions = compilerOptions
        ? { ...defaultOptions, ...compilerOptions }
        : defaultOptions;

      // If user has a tsconfig, merge it with our defaults (user's settings take precedence)
      // If no tsconfig, our defaults are sufficient to parse any reasonable MCP server
      const finalOptions = tsconfigPath
        ? loadCompilerOptions(tsconfigPath, mergedOptions)
        : mergedOptions;

      // Step 3: Create the TypeScript program
      // The program includes the file and all its dependencies
      const program = ts.createProgram({
        rootNames: [absolutePath],
        options: finalOptions,
        // Use default host for file I/O
        host: ts.createCompilerHost(finalOptions)
      });

      // Step 4: Get the source file
      const sourceFile = program.getSourceFile(absolutePath);
      if (!sourceFile) {
        throw new Error(
          `Failed to get source file for ${absolutePath}. ` +
          `The file may not exist or may have syntax errors.`
        );
      }

      // Step 5: Get the type checker for semantic analysis
      const typeChecker = program.getTypeChecker();

      // Step 6: Create context and cache it
      const context: ProgramContext = {
        program,
        typeChecker,
        sourceFile
      };

      this.programCache.set(absolutePath, {
        context,
        timestamp: Date.now()
      });

      return context;
    } catch (error) {
      // Provide detailed error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to create TypeScript program for ${absolutePath}: ${errorMessage}`
      );
    }
  }

  /**
   * Clear the program cache.
   *
   * Use this to free memory or force re-parsing of files.
   *
   * @param filePath - Optional specific file to clear (clears all if omitted)
   *
   * @example
   * ```typescript
   * // Clear specific file
   * builder.clearCache('/path/to/server.ts');
   *
   * // Clear entire cache
   * builder.clearCache();
   * ```
   */
  clearCache(filePath?: string): void {
    if (filePath) {
      const absolutePath = resolve(filePath);
      this.programCache.delete(absolutePath);
    } else {
      this.programCache.clear();
    }
  }

  /**
   * Get cache statistics.
   *
   * Useful for debugging and monitoring cache performance.
   *
   * @returns Cache statistics object
   *
   * @example
   * ```typescript
   * const stats = builder.getCacheStats();
   * console.log(`Cache size: ${stats.size} entries`);
   * ```
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ path: string; timestamp: number }>;
  } {
    return {
      size: this.programCache.size,
      entries: Array.from(this.programCache.entries()).map(([path, entry]) => ({
        path,
        timestamp: entry.timestamp
      }))
    };
  }
}

/**
 * Singleton instance for convenience
 */
export const programBuilder = new TypeScriptProgramBuilder();
