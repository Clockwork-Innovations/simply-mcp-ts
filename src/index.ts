/**
 * SimplyMCP - Model Context Protocol Server Framework
 *
 * A comprehensive MCP server framework with support for multiple API styles:
 * - Decorator-based class API
 * - Functional single-file API
 * - Programmatic API
 * - Interface-driven API (v3.0.0 - In Development)
 *
 * @example Decorator API
 * ```typescript
 * import { MCPServer } from 'simply-mcp';
 *
 * @MCPServer({ name: 'my-server', version: '1.0.0' })
 * class MyServer {
 *   greet(name: string): string {
 *     return `Hello, ${name}!`;
 *   }
 * }
 * ```
 *
 * @example Functional API
 * ```typescript
 * import { defineMCP } from 'simply-mcp';
 * import { z } from 'zod';
 *
 * export default defineMCP({
 *   name: 'my-server',
 *   version: '1.0.0',
 *   tools: [{
 *     name: 'greet',
 *     description: 'Greet a user',
 *     parameters: z.object({ name: z.string() }),
 *     execute: async (args) => `Hello, ${args.name}!`
 *   }]
 * });
 * ```
 *
 * @example Programmatic API
 * ```typescript
 * import { BuildMCPServer } from 'simply-mcp';
 * import { z } from 'zod';
 *
 * const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });
 * server.addTool({
 *   name: 'greet',
 *   description: 'Greet a user',
 *   parameters: z.object({ name: z.string() }),
 *   execute: async (args) => `Hello, ${args.name}!`
 * });
 * await server.start();
 * ```
 *
 * @example Interface-Driven API (v3.0.0 - In Development)
 * ```typescript
 * import type { ITool, IServer } from 'simply-mcp';
 *
 * interface GreetTool extends ITool {
 *   name: 'greet';
 *   description: 'Greet a user';
 *   params: { name: string };
 *   result: string;
 * }
 *
 * interface MyServerInterface extends IServer {
 *   name: 'my-server';
 *   version: '1.0.0';
 * }
 *
 * export default class MyServer implements MyServerInterface {
 *   greet: GreetTool = async (params) => `Hello, ${params.name}!`;
 * }
 * ```
 */

// ============================================================================
// Main SimplyMCP Class (Programmatic API - Legacy)
// ============================================================================
/**
 * @deprecated Use `BuildMCPServer` instead (renamed in v2.5.0+)
 * This export will be removed in v3.0.0.
 *
 * @example
 * ```typescript
 * // NEW: Use BuildMCPServer
 * import { BuildMCPServer } from 'simply-mcp';
 * const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });
 *
 * // OLD: SimplyMCP (deprecated)
 * import { SimplyMCP } from 'simply-mcp';
 * const server = new SimplyMCP({ name: 'my-server', version: '1.0.0' });
 * ```
 */
export { SimplyMCP } from './SimplyMCP.js';

// ============================================================================
// BuildMCPServer Class (Programmatic API - New)
// ============================================================================
// New programmatic API with improved naming
export { BuildMCPServer } from './api/programmatic/BuildMCPServer.js';
export type { BuildMCPServerOptions } from './api/programmatic/types.js';

// ============================================================================
// Decorator API
// ============================================================================
export {
  MCPServer,
  tool,
  prompt,
  resource,
  type ServerConfig,
  type JSDocInfo,
  type ToolMetadata,
  type PromptMetadata,
  type ResourceMetadata,
} from './decorators.js';

// ============================================================================
// Single-File Functional API
// ============================================================================
export {
  defineMCP,
  defineTool,
  definePrompt,
  defineResource,
  createMCP,
  MCPBuilder,
  Schema,
  type SingleFileTool,
  type SingleFilePrompt,
  type SingleFileResource,
  type ServerOptions,
  type SingleFileMCPConfig,
} from './single-file-types.js';

// ============================================================================
// Schema Builder
// ============================================================================
export {
  schemaToZod,
  type Schema as SchemaType,
} from './schema-builder.js';

// ============================================================================
// Interface-Driven API (v3.0.0 - In Development)
// ============================================================================
export type {
  ITool,
  IPrompt,
  IResource,
  IServer,
  ToolParams,
  ToolResult,
  PromptArgs,
  ResourceData,
} from './api/interface/index.js';

export {
  parseInterfaceFile,
  snakeToCamel,
  loadInterfaceServer,
  isInterfaceFile,
  type ParsedTool,
  type ParsedPrompt,
  type ParsedResource,
  type ParsedServer,
  type ParseResult,
  type InterfaceAdapterOptions,
} from './api/interface/index.js';

// ============================================================================
// Core Types
// ============================================================================

// Export MCP definition types (BUG-002 FIX)
/**
 * @deprecated These types are exported from the legacy SimplyMCP class.
 * Use BuildMCPServer types instead (v2.5.0+).
 * These exports will be removed in v3.0.0.
 */
export type {
  ToolDefinition,
  PromptDefinition,
  ResourceDefinition,
  SimplyMCPOptions,
  ExecuteFunction,
} from './SimplyMCP.js';

// Export handler types
export type {
  HandlerContext,
  HandlerResult,
  ToolHandler,
  SamplingMessage,
  SamplingOptions,
  ResourceContents,
  TextContent,
  ImageContent,
  AudioContent,
  BinaryContent,
  Logger,
  Permissions,
  HandlerError,
} from './core/types.js';

// ============================================================================
// Error Classes
// ============================================================================
export {
  HandlerExecutionError,
  HandlerLoadError,
  HandlerSyntaxError,
  HandlerTimeoutError,
  HandlerNetworkError,
  HandlerNotFoundError,
  HandlerConfigError,
  HandlerPermissionError,
} from './core/errors.js';

// ============================================================================
// Configuration Types (re-exported for convenience)
// ============================================================================
/**
 * Configuration types and utilities for SimpleMCP CLI.
 *
 * These are re-exported from the main package for convenience.
 * In v3.0.0, the unified import pattern will become the primary approach.
 *
 * @example
 * ```typescript
 * // New unified pattern (v2.5.0+)
 * import { defineConfig, type CLIConfig } from 'simply-mcp';
 *
 * // Old pattern (still works but deprecated)
 * import { defineConfig, type CLIConfig } from 'simply-mcp/config';
 * ```
 */
export type {
  CLIConfig,
  ServerConfig as CLIServerConfig,
  DefaultsConfig,
  RunConfig,
  BundleConfig,
  APIStyle,
  TransportType,
} from './config.js';

export { defineConfig } from './config.js';
