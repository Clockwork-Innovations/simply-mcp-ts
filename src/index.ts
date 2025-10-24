/**
 * SimplyMCP - Model Context Protocol Server Framework
 *
 * A comprehensive MCP server framework with support for multiple API styles:
 * - Programmatic API
 * - Interface-driven API (v3.0.0+)
 *
 * @example Programmatic API (BuildMCPServer)
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
 * @example Interface-Driven API (v3.0.0+)
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
// Programmatic API
// ============================================================================
// BuildMCPServer - Programmatic API for building MCP servers
export { BuildMCPServer } from './api/programmatic/BuildMCPServer.js';
export { BuildMCPServer as SimplyMCP } from './api/programmatic/BuildMCPServer.js';
export type { BuildMCPServerOptions } from './api/programmatic/types.js';

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
  IParam,
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
export type {
  ToolDefinition,
  PromptDefinition,
  ResourceDefinition,
  ExecuteFunction,
  RouterToolDefinition,
} from './api/programmatic/types.js';

// Alias for backward compatibility
export type { BuildMCPServerOptions as SimplyMCPOptions } from './api/programmatic/types.js';

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
// Auto-Installation Types (Feature 3)
// ============================================================================
/**
 * Types for automatic dependency installation.
 * These types are useful for advanced users who want to customize
 * auto-installation behavior with progress tracking and error handling.
 *
 * @example
 * ```typescript
 * import { BuildMCPServer, InstallProgressEvent } from 'simply-mcp';
 *
 * const server = await BuildMCPServer.fromFile('server.ts', {
 *   autoInstall: {
 *     onProgress: (event: InstallProgressEvent) => {
 *       console.log(event.message);
 *     }
 *   }
 * });
 * ```
 */
export type {
  PackageManager,
  InstallOptions,
  InstallResult,
  InstallProgressEvent,
  InstallError,
  DependencyStatus,
  PackageManagerInfo,
} from './core/installation-types.js';

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
