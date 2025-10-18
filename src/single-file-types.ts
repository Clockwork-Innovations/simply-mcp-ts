/**
 * Single-File MCP Type Definitions
 *
 * This module re-exports from the Functional API for backward compatibility.
 * The actual implementation is in src/api/functional/
 *
 * Inspired by FastMCP - allows defining MCP servers in a single TypeScript file
 * with tools, prompts, and resources using a declarative configuration.
 *
 * Usage:
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

// Re-export everything from the functional API
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
} from './api/functional/index.js';
