/**
 * Programmatic API Type Definitions
 *
 * Types for the BuildMCPServer class - the main programmatic API
 * for building MCP servers with explicit method calls.
 */

import type { ZodSchema } from 'zod';
import type { HandlerContext, HandlerResult } from '../../core/types.js';
import type { ParsedDependencies } from '../../core/index.js';
import type { InstallOptions } from '../../core/installation-types.js';
import type { ImageInput, BinaryInput, AudioInput } from '../../core/content-helpers.js';

/**
 * Execute function type for tools
 */
export type ExecuteFunction<T = any> = (
  args: T,
  context?: HandlerContext
) =>
  | Promise<string | HandlerResult | ImageInput | BinaryInput | AudioInput>
  | string
  | HandlerResult
  | ImageInput
  | BinaryInput
  | AudioInput;

/**
 * Tool definition interface
 */
export interface ToolDefinition<T = any> {
  name: string;
  description: string;
  parameters: ZodSchema<T>;
  execute: ExecuteFunction<T>;
}

/**
 * Prompt definition interface
 *
 * Supports both static templates (strings) and dynamic templates (functions).
 * Dynamic templates are called at runtime when prompts/get is requested.
 */
export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  /**
   * Template string or function that generates template dynamically
   * - string: Static template with {placeholder} syntax
   * - function: Called at runtime with arguments, returns template string
   */
  template: string | ((args: Record<string, any>) => string | Promise<string>);
}

/**
 * Resource definition interface
 *
 * Supports both static content (data) and dynamic content (functions).
 * Dynamic content functions are called at runtime when resources/read is requested.
 */
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  /**
   * Resource content or function that generates content dynamically
   * - string/object/Buffer/Uint8Array: Static content served as-is
   * - function: Called at runtime, returns content (supports async)
   */
  content:
    | string
    | { [key: string]: any }
    | Buffer
    | Uint8Array
    | (() => string | { [key: string]: any } | Buffer | Uint8Array | Promise<string | { [key: string]: any } | Buffer | Uint8Array>);
}

/**
 * BuildMCPServer Options
 * Consolidated configuration for creating an MCP server
 */
export interface BuildMCPServerOptions {
  // Required
  name: string;                  // Server name
  version: string;               // Server version

  // Optional base configuration
  description?: string;           // Server description
  basePath?: string;             // Base path for file operations (default: cwd)
  defaultTimeout?: number;       // Default timeout for handlers (ms, default: 5000)

  // Transport configuration (consolidated)
  transport?: {
    type?: 'stdio' | 'http';     // Transport type (default: stdio)
    port?: number;               // HTTP port (default: 3000)
    stateful?: boolean;          // HTTP stateful mode (default: true)
  };

  // Server capabilities
  capabilities?: {
    sampling?: boolean;          // Enable LLM sampling/completion requests
    logging?: boolean;           // Enable logging notifications to client
  };

  // Inline dependencies support (Phase 2, Feature 2)
  dependencies?: ParsedDependencies; // Pre-parsed dependencies from source code

  // Auto-installation support (Phase 2, Feature 3)
  autoInstall?: boolean | InstallOptions; // Enable automatic dependency installation
}

/**
 * Transport type
 */
export type TransportType = 'stdio' | 'http';

/**
 * Start Options
 * Options for starting the MCP server
 * These override any transport configuration set in BuildMCPServerOptions
 */
export interface StartOptions {
  transport?: TransportType;   // Override transport type
  port?: number;               // Override port (HTTP only)
  stateful?: boolean;          // Override stateful mode (HTTP only, default: true)
}

/**
 * Internal storage for registered items
 */
export interface InternalTool {
  definition: ToolDefinition;
  jsonSchema: any;
}
