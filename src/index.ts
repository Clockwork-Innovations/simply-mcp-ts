/**
 * SimplyMCP - Model Context Protocol Server Framework
 *
 * A comprehensive MCP server framework with support for multiple API styles:
 * - Decorator-based class API
 * - Functional single-file API
 * - Programmatic API
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
 * import { SimplyMCP } from 'simply-mcp';
 * import { z } from 'zod';
 *
 * const server = new SimplyMCP({ name: 'my-server', version: '1.0.0' });
 * server.addTool({
 *   name: 'greet',
 *   description: 'Greet a user',
 *   parameters: z.object({ name: z.string() }),
 *   execute: async (args) => `Hello, ${args.name}!`
 * });
 * await server.start();
 * ```
 */

// ============================================================================
// Main SimplyMCP Class (Programmatic API)
// ============================================================================
export { SimplyMCP } from './SimplyMCP.js';

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
// Core Types
// ============================================================================

// Export MCP definition types (BUG-002 FIX)
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
