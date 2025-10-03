/**
 * Single-File MCP Type Definitions
 *
 * Inspired by FastMCP - allows defining MCP servers in a single TypeScript file
 * with tools, prompts, and resources using a declarative configuration.
 *
 * Usage:
 * ```typescript
 * import { defineMCP } from './mcp/single-file-types';
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

import { ZodSchema } from 'zod';
import type { ExecuteFunction, PromptDefinition, ResourceDefinition } from './SimplyMCP.js';
import type { Schema as SchemaType } from './schema-builder.js';
import { schemaToZod, Schema } from './schema-builder.js';

// Re-export Schema builder for convenience
export { Schema };

/**
 * Single-file tool definition - simplified version of ToolDefinition
 * Supports both Zod schemas and our clean interface-based schemas
 */
export interface SingleFileTool<T = any> {
  name: string;
  description: string;
  parameters: ZodSchema<T> | SchemaType;
  execute: ExecuteFunction<T>;
}

/**
 * Single-file prompt definition
 */
export interface SingleFilePrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  template: string;
}

/**
 * Single-file resource definition
 */
export interface SingleFileResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  content: string | { [key: string]: any };
}

/**
 * Server configuration options
 */
export interface ServerOptions {
  name: string;
  version: string;
  port?: number;
  basePath?: string;
  defaultTimeout?: number;
}

/**
 * Complete single-file MCP configuration
 */
export interface SingleFileMCPConfig {
  name: string;
  version: string;
  port?: number;
  basePath?: string;
  defaultTimeout?: number;
  tools?: SingleFileTool[];
  prompts?: SingleFilePrompt[];
  resources?: SingleFileResource[];
}

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
