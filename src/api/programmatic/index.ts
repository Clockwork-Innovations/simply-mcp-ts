/**
 * Programmatic API
 *
 * The BuildMCPServer class provides a programmatic API for building MCP servers.
 * Use this when you want explicit control over server configuration and
 * tool/prompt/resource registration.
 *
 * @example
 * ```typescript
 * import { BuildMCPServer } from 'simply-mcp';
 * import { z } from 'zod';
 *
 * const server = new BuildMCPServer({
 *   name: 'my-server',
 *   version: '1.0.0'
 * });
 *
 * server.addTool({
 *   name: 'greet',
 *   description: 'Greet a user',
 *   parameters: z.object({ name: z.string() }),
 *   execute: async (args) => {
 *     return `Hello, ${args.name}!`;
 *   }
 * });
 *
 * await server.start();
 * ```
 */

// Main class
export { BuildMCPServer } from './BuildMCPServer.js';

// Type definitions
export type {
  ExecuteFunction,
  ToolDefinition,
  PromptDefinition,
  ResourceDefinition,
  BuildMCPServerOptions,
  TransportType,
  StartOptions,
  InternalTool,
} from './types.js';
