/**
 * File Handler Resolver - Loads and executes JavaScript/TypeScript modules from filesystem
 */

import { pathToFileURL } from 'node:url';
import { resolve, isAbsolute } from 'node:path';
import { existsSync } from 'node:fs';
import {
  HandlerResolver,
  HandlerConfig,
  FileHandlerConfig,
  ToolHandler,
  HandlerContext,
  HandlerResult,
} from '../core/types.js';
import { HandlerLoadError, HandlerConfigError } from '../core/errors.js';

/**
 * Resolver for file-based handlers
 * Loads JavaScript/TypeScript modules from the filesystem and caches them
 */
export class FileHandlerResolver implements HandlerResolver {
  private moduleCache: Map<string, unknown> = new Map();
  private basePath: string;

  /**
   * Create a new FileHandlerResolver
   * @param basePath Base path for resolving relative file paths
   */
  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * Check if this resolver can handle the given configuration
   */
  canResolve(config: HandlerConfig): boolean {
    return config.type === 'file';
  }

  /**
   * Resolve a file handler configuration to an executable function
   */
  async resolve(config: HandlerConfig): Promise<ToolHandler> {
    if (!this.canResolve(config)) {
      throw new HandlerConfigError(
        `FileHandlerResolver cannot resolve handler of type: ${config.type}`
      );
    }

    const fileConfig = config as FileHandlerConfig;
    const resolvedPath = this.resolvePath(fileConfig.path);
    const exportName = fileConfig.export || 'default';

    // Load the module (with caching)
    const module = await this.loadModule(resolvedPath);

    // Extract the handler function
    const handler = this.extractHandler(module, exportName, resolvedPath);

    // Return wrapped handler that matches ToolHandler signature
    return async (
      args: Record<string, unknown>,
      context: HandlerContext
    ): Promise<HandlerResult> => {
      try {
        context.logger.debug(`Executing file handler: ${resolvedPath}`);

        // Call the handler function
        const result = await handler(args, context);

        // Ensure result conforms to HandlerResult format
        return this.normalizeResult(result);
      } catch (error) {
        context.logger.error(`Error executing file handler: ${resolvedPath}`, error);
        throw new HandlerLoadError(
          `Failed to execute handler from ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
          { path: resolvedPath, error: String(error) }
        );
      }
    };
  }

  /**
   * Resolve file path (absolute or relative to base path)
   */
  private resolvePath(filePath: string): string {
    if (isAbsolute(filePath)) {
      return filePath;
    }
    return resolve(this.basePath, filePath);
  }

  /**
   * Load a module from the filesystem with caching
   */
  private async loadModule(filePath: string): Promise<unknown> {
    // Check cache first
    if (this.moduleCache.has(filePath)) {
      return this.moduleCache.get(filePath);
    }

    // Verify file exists
    if (!existsSync(filePath)) {
      throw new HandlerLoadError(
        `Handler file not found: ${filePath}`,
        { path: filePath }
      );
    }

    try {
      // Convert to file URL for ES module import
      const fileUrl = pathToFileURL(filePath).href;

      // Dynamic import
      const module = await import(fileUrl);

      // Cache the loaded module
      this.moduleCache.set(filePath, module);

      return module;
    } catch (error) {
      throw new HandlerLoadError(
        `Failed to load handler module from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        { path: filePath, error: String(error) }
      );
    }
  }

  /**
   * Extract handler function from module
   */
  private extractHandler(
    module: unknown,
    exportName: string,
    filePath: string
  ): ToolHandler {
    if (typeof module !== 'object' || module === null) {
      throw new HandlerLoadError(
        `Handler module is not an object: ${filePath}`,
        { path: filePath, exportName }
      );
    }

    const moduleObj = module as Record<string, unknown>;
    const handler = moduleObj[exportName];

    if (typeof handler !== 'function') {
      const availableExports = Object.keys(moduleObj).join(', ');
      throw new HandlerLoadError(
        `Export '${exportName}' is not a function in ${filePath}. Available exports: ${availableExports}`,
        { path: filePath, exportName, availableExports }
      );
    }

    return handler as ToolHandler;
  }

  /**
   * Normalize handler result to conform to HandlerResult format
   */
  private normalizeResult(result: unknown): HandlerResult {
    // If result is already in correct format
    if (
      result &&
      typeof result === 'object' &&
      'content' in result &&
      Array.isArray((result as HandlerResult).content)
    ) {
      return result as HandlerResult;
    }

    // If result is a string, wrap it
    if (typeof result === 'string') {
      return {
        content: [{ type: 'text', text: result }],
      };
    }

    // If result is an object, stringify it
    if (result && typeof result === 'object') {
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    // Default case
    return {
      content: [{ type: 'text', text: String(result) }],
    };
  }

  /**
   * Clear the module cache (useful for testing or hot-reloading)
   */
  clearCache(): void {
    this.moduleCache.clear();
  }
}
