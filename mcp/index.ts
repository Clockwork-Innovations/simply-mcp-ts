/**
 * SimpleMCP - Model Context Protocol Server Framework
 *
 * A comprehensive MCP server framework with support for multiple API styles:
 * - Decorator-based class API
 * - Functional single-file API
 * - Programmatic API
 *
 * @example Decorator API
 * ```typescript
 * import { MCPServer } from 'simple-mcp';
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
 * import { defineMCP } from 'simple-mcp';
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
 * import { SimpleMCP } from 'simple-mcp';
 * import { z } from 'zod';
 *
 * const server = new SimpleMCP({ name: 'my-server', version: '1.0.0' });
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
// Main SimpleMCP Class (Programmatic API)
// ============================================================================
export { SimpleMCP } from './SimpleMCP.js';

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
