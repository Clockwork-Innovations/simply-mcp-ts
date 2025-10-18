/**
 * SimplyMCP - Model Context Protocol Server Framework
 *
 * A comprehensive MCP server framework with support for multiple API styles:
 * - Decorator-based class API
 * - Functional single-file API
 * - Programmatic API
 * - Interface-driven API (v2.5.0+)
 * - MCP Builder API (v2.5.0+) - Build MCP servers using MCP itself
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
 *
 * @example MCP Builder API (v2.5.0+)
 * ```typescript
 * import { defineMCPBuilder, ValidationToolsPreset, WorkflowPromptsPreset } from 'simply-mcp';
 *
 * export default defineMCPBuilder({
 *   name: 'mcp-dev',
 *   version: '1.0.0',
 *   toolPresets: [ValidationToolsPreset],
 *   promptPresets: [WorkflowPromptsPreset]
 * });
 * ```
 */

// ============================================================================
// Programmatic API
// ============================================================================
// BuildMCPServer - Programmatic API for building MCP servers
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
  Router,
  type ServerConfig,
  type JSDocInfo,
  type ToolMetadata,
  type PromptMetadata,
  type ResourceMetadata,
  type RouterMetadata,
} from './decorators.js';

// ============================================================================
// Single-File Functional API
// ============================================================================
export {
  defineMCP,
  defineTool,
  definePrompt,
  defineResource,
  defineUIResource,
  defineRouter,
  createMCP,
  MCPBuilder,
  Schema,
  type SingleFileTool,
  type SingleFilePrompt,
  type SingleFileResource,
  type SingleFileUIResource,
  type SingleFileRouter,
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
// MCP Builder API (v2.5.0+)
// ============================================================================
/**
 * MCP Builder API - Build MCP servers using MCP itself
 *
 * A specialized API for creating MCP servers that help build other MCP servers.
 * Uses sampling-based validation to leverage your LLM for intelligent feedback.
 *
 * Layer 1: Foundation - Basic design tools
 * Layer 2: Feature - Sampling-based validation, workflow guidance
 *
 * @example Basic usage
 * ```typescript
 * import { defineMCPBuilder, DesignToolsPreset } from 'simply-mcp';
 *
 * export default defineMCPBuilder({
 *   name: 'mcp-dev',
 *   version: '1.0.0',
 *   toolPresets: [DesignToolsPreset]
 * });
 * ```
 *
 * @example Advanced usage with sampling
 * ```typescript
 * import {
 *   createMCPBuilder,
 *   ValidationToolsPreset,
 *   WorkflowPromptsPreset
 * } from 'simply-mcp';
 *
 * export default createMCPBuilder({
 *   name: 'mcp-dev-complete',
 *   version: '1.0.0'
 * })
 *   .useToolPreset(ValidationToolsPreset)
 *   .usePromptPreset(WorkflowPromptsPreset)
 *   .build();
 * ```
 */

// Builder functions
export {
  defineMCPBuilder,
  createMCPBuilder,
  MCPBuilderBuilder,
} from './api/mcp/builders.js';

// Adapter functions
export {
  createServerFromMCPBuilder,
  loadMCPBuilderServer,
  isMCPBuilderFile,
} from './api/mcp/adapter.js';

// Presets
export {
  DesignToolsPreset,                    // Layer 1: Basic design tools
  ValidationToolsPreset,                 // Layer 2: Sampling-based validation
  InteractiveValidationToolsPreset,     // Layer 2: Interactive validation (no sampling - works with Claude Code CLI!)
  CodeGenerationToolsPreset,            // Layer 2: Code generation (complete the workflow!)
  WorkflowPromptsPreset,                 // Layer 2: Workflow guidance
} from './api/mcp/presets/index.js';

// Wizard Servers
export {
  WizardServer,                         // Foundation: Interactive wizard for building MCP servers
} from './api/mcp/wizard-server.js';

export {
  ClassWrapperWizard,                   // Foundation: Interactive wizard for wrapping TypeScript classes
} from './api/mcp/class-wrapper-wizard.js';

// Types
export type {
  MCPBuilderConfig,
  MCPBuilderTool,
  ToolPreset,
  PromptPreset,
  ResourcePreset,
} from './api/mcp/types.js';

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
