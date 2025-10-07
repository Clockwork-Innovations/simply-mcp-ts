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
