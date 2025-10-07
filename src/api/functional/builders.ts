/**
 * Functional API Builders
 *
 * Builder functions and classes for creating MCP server configurations.
 *
 * Inspired by FastMCP - allows defining MCP servers using a declarative configuration
 * with tools, prompts, and resources.
 *
 * @example
 * ```typescript
 * import { defineMCP } from 'simply-mcp';
 * import { z } from 'zod';
 *
 * export default defineMCP({
 *   name: 'my-server',
 *   version: '1.0.0',
 *   tools: [
 *     {
 *       name: 'greet',
 *       description: 'Greet a user',
 *       parameters: z.object({ name: z.string() }),
 *       execute: async (args) => `Hello, ${args.name}!`
 *     }
 *   ]
 * });
 * ```
 */

import type {
  SingleFileMCPConfig,
  SingleFileTool,
  SingleFilePrompt,
  SingleFileResource,
  ServerOptions,
} from './types.js';
import { Schema } from '../../schema-builder.js';

// Re-export Schema builder for convenience
export { Schema };

/**
 * Helper function to define an MCP configuration with type safety
 * This function doesn't do anything at runtime - it just provides type checking
 */
export function defineMCP(config: SingleFileMCPConfig): SingleFileMCPConfig {
  return config;
}

/**
 * Helper function to define a tool with type safety
 */
export function defineTool<T = any>(tool: SingleFileTool<T>): SingleFileTool<T> {
  return tool;
}

/**
 * Helper function to define a prompt with type safety
 */
export function definePrompt(prompt: SingleFilePrompt): SingleFilePrompt {
  return prompt;
}

/**
 * Helper function to define a resource with type safety
 */
export function defineResource(resource: SingleFileResource): SingleFileResource {
  return resource;
}

/**
 * Builder pattern for creating MCP configs (alternative to defineMCP)
 * Inspired by FastMCP's decorator pattern
 */
export class MCPBuilder {
  private config: SingleFileMCPConfig;

  constructor(options: ServerOptions) {
    this.config = {
      name: options.name,
      version: options.version,
      port: options.port,
      basePath: options.basePath,
      defaultTimeout: options.defaultTimeout,
      tools: [],
      prompts: [],
      resources: [],
    };
  }

  /**
   * Add a tool to the server
   */
  tool<T = any>(tool: SingleFileTool<T>): this {
    this.config.tools = this.config.tools || [];
    this.config.tools.push(tool);
    return this;
  }

  /**
   * Add a prompt to the server
   */
  prompt(prompt: SingleFilePrompt): this {
    this.config.prompts = this.config.prompts || [];
    this.config.prompts.push(prompt);
    return this;
  }

  /**
   * Add a resource to the server
   */
  resource(resource: SingleFileResource): this {
    this.config.resources = this.config.resources || [];
    this.config.resources.push(resource);
    return this;
  }

  /**
   * Build and return the config
   */
  build(): SingleFileMCPConfig {
    return this.config;
  }
}

/**
 * Create a new MCP builder
 */
export function createMCP(options: ServerOptions): MCPBuilder {
  return new MCPBuilder(options);
}
