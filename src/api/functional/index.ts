/**
 * Functional API
 *
 * Configuration-based API for defining MCP servers using declarative configs.
 * Use this when you prefer a simple, configuration-driven approach.
 *
 * @example
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
 *
 * @example Builder Pattern
 * ```typescript
 * import { createMCP } from 'simply-mcp';
 * import { z } from 'zod';
 *
 * const server = createMCP({ name: 'my-server', version: '1.0.0' })
 *   .tool({
 *     name: 'greet',
 *     description: 'Greet a user',
 *     parameters: z.object({ name: z.string() }),
 *     execute: async (args) => `Hello, ${args.name}!`
 *   })
 *   .build();
 *
 * export default server;
 * ```
 */

// Type definitions
export type {
  SingleFileTool,
  SingleFilePrompt,
  SingleFileResource,
  ServerOptions,
  SingleFileMCPConfig,
} from './types.js';

// Builder functions
export {
  defineMCP,
  defineTool,
  definePrompt,
  defineResource,
  createMCP,
  MCPBuilder,
  Schema,
} from './builders.js';
