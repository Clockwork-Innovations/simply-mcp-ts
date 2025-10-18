/**
 * Functional API Type Definitions
 *
 * Types for configuration-based MCP server definitions.
 * Use these when defining servers with declarative configs.
 *
 * @example
 * ```typescript
 * import type { SingleFileMCPConfig } from 'simply-mcp';
 *
 * const config: SingleFileMCPConfig = {
 *   name: 'my-server',
 *   version: '1.0.0',
 *   tools: [...]
 * };
 * ```
 */

import type { ZodSchema } from 'zod';
import type { ExecuteFunction } from '../programmatic/types.js';
import type { Schema as SchemaType } from '../../schema-builder.js';

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
  content: string | { [key: string]: any } | (() => string | Promise<string>);
}

/**
 * Single-file UI resource definition
 *
 * A specialized resource definition for UI resources that can be rendered
 * as interactive UI elements in MCP clients.
 *
 * UI resources must use the "ui://" URI scheme and support specific MIME types:
 * - text/html: Inline HTML content
 * - text/uri-list: External URL
 * - application/vnd.mcp-ui.remote-dom+javascript: Remote DOM
 */
export interface SingleFileUIResource {
  uri: string;
  name: string;
  description: string;
  mimeType: 'text/html' | 'text/uri-list' | 'application/vnd.mcp-ui.remote-dom+javascript';
  content: string | (() => string | Promise<string>);
}

/**
 * Single-file router definition
 *
 * Routers group related tools together, making them discoverable through a single
 * router tool. This is useful for organizing large APIs and improving discoverability.
 *
 * @example
 * ```typescript
 * import { defineRouter } from 'simply-mcp';
 *
 * const weatherRouter = defineRouter({
 *   name: 'weather-tools',
 *   description: 'Weather information tools',
 *   tools: ['get-weather', 'get-forecast']
 * });
 * ```
 */
export interface SingleFileRouter {
  /**
   * Router name (kebab-case recommended)
   * Used as the router tool name
   */
  name: string;

  /**
   * Router description
   * Explains what this group of tools does
   */
  description: string;

  /**
   * Array of tool names to include in this router
   * Tool names must match the names of tools defined in the tools array
   */
  tools: string[];

  /**
   * Optional metadata for the router
   */
  metadata?: Record<string, unknown>;
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
  uiResources?: SingleFileUIResource[];
  routers?: SingleFileRouter[];
}
