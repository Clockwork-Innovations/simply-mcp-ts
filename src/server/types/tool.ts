/**
 * Tool definition types
 */

import type { HiddenValue } from '../../types/hidden.js';

/**
 * Tool behavior annotations for safety and categorization
 *
 * Annotations provide metadata hints about tool behavior to help clients
 * make informed decisions about tool usage. All annotations are optional
 * and should be treated as hints, not guarantees.
 *
 * Aligns with MCP protocol ToolAnnotations spec with additional Simply-MCP extensions.
 *
 * @since v4.1.0
 *
 * @example Read-only Tool
 * ```typescript
 * interface GetUserTool extends ITool {
 *   name: 'get_user';
 *   description: 'Retrieve user information';
 *   params: { userId: { type: 'string'; description: 'User ID' } };
 *   result: User;
 *   annotations: {
 *     readOnlyHint: true;
 *     category: 'data';
 *   };
 * }
 *
 * const getUser: ToolHelper<GetUserTool> = async (params) => {
 *   return await fetchUser(params.userId);
 * };
 * ```
 *
 * @example Destructive Tool
 * ```typescript
 * interface DeleteUserTool extends ITool {
 *   name: 'delete_user';
 *   description: 'Permanently delete a user account';
 *   params: { userId: { type: 'string'; description: 'User ID' } };
 *   result: boolean;
 *   annotations: {
 *     destructiveHint: true;
 *     requiresConfirmation: true;
 *     category: 'system';
 *   };
 * }
 *
 * const deleteUser: ToolHelper<DeleteUserTool> = async (params) => {
 *   return await removeUser(params.userId);
 * };
 * ```
 */
export interface IToolAnnotations {
  /**
   * A human-readable title for the tool (used in UI display)
   * @example 'Get User Information'
   */
  title?: string;

  /**
   * Tool only reads data, makes no modifications to environment
   * @default false
   */
  readOnlyHint?: boolean;

  /**
   * Tool may perform destructive updates (delete/overwrite data)
   * Only meaningful when readOnlyHint is false
   * @default true
   */
  destructiveHint?: boolean;

  /**
   * Tool is idempotent - repeated calls with same args have no additional effect
   * Only meaningful when readOnlyHint is false
   * @default false
   */
  idempotentHint?: boolean;

  /**
   * Tool interacts with external "open world" entities
   * @default true
   * @example true for web search, false for memory/database tools
   */
  openWorldHint?: boolean;

  /**
   * Tool requires explicit user confirmation before execution (Simply-MCP extension)
   * Recommended for destructive operations
   * @default false
   */
  requiresConfirmation?: boolean;

  /**
   * Tool category for organization and filtering (Simply-MCP extension)
   * @example 'data', 'system', 'communication', 'analysis', 'file-management'
   */
  category?: string;

  /**
   * Expected execution duration (Simply-MCP extension)
   * @example 'fast' for <1s, 'medium' for 1-10s, 'slow' for >10s
   */
  estimatedDuration?: 'fast' | 'medium' | 'slow';

  /**
   * Custom metadata fields (passthrough for extensibility)
   */
  [key: string]: unknown;
}

/**
 * Base Tool interface - pure metadata definition
 *
 * Tools are implemented using the ToolHelper type with const-based pattern.
 * The interface defines metadata only - name, description, parameters, result type, and annotations.
 *
 * Parameters use IParam interfaces for rich validation and documentation.
 *
 * **⚠️ Troubleshooting TypeScript Errors:**
 * If you get "Type 'X' is not assignable" errors, use `ToolHelper<YourTool>` for automatic type inference.
 *
 * @template TParams - Parameter object type
 * @template TResult - Return value type
 *
 * @see {@link ToolHelper} - Type-safe implementation helper that provides full type inference
 * @see {@link https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/CONST_PATTERNS.md#troubleshooting-typescript-errors|Troubleshooting Guide}
 *
 * @example Simple Tool
 * ```typescript
 * interface AddTool extends ITool {
 *   name: 'add';
 *   description: 'Add two numbers';
 *   params: {
 *     a: { type: 'number'; description: 'First number' };
 *     b: { type: 'number'; description: 'Second number' };
 *   };
 *   result: { sum: number };
 * }
 *
 * // Implementation using ToolHelper
 * const add: ToolHelper<AddTool> = async (params) => ({
 *   sum: params.a + params.b
 * });
 * ```
 *
 * @example Tool with Optional Parameters
 * ```typescript
 * interface GreetTool extends ITool {
 *   name: 'greet_user';
 *   description: 'Greet a user by name';
 *   params: {
 *     name: { type: 'string'; description: 'User name' };
 *     formal: { type: 'boolean'; description: 'Use formal greeting'; required: false };
 *   };
 *   result: string;
 * }
 *
 * // Implementation
 * const greetUser: ToolHelper<GreetTool> = async (params) => {
 *   const greeting = params.formal ? 'Good day' : 'Hello';
 *   return `${greeting}, ${params.name}!`;
 * };
 * ```
 *
 * @example Tool with Context (Progress Reporting)
 * ```typescript
 * interface ProcessFilesTool extends ITool {
 *   name: 'process_files';
 *   description: 'Process multiple files';
 *   params: {
 *     files: { type: 'array'; items: { type: 'string' }; description: 'File paths' };
 *   };
 *   result: { success: boolean };
 * }
 *
 * // Implementation with progress reporting
 * const processFiles: ToolHelper<ProcessFilesTool> = async (params, context) => {
 *   for (let i = 0; i < params.files.length; i++) {
 *     await context?.reportProgress?.(i + 1, params.files.length, `Processing file ${i + 1}`);
 *     // ... process file
 *   }
 *   return { success: true };
 * };
 * ```
 */
export interface ITool<TParams = any, TResult = any> {
  /**
   * Tool name in snake_case (e.g., 'get_weather')
   * Optional - if omitted, will be inferred from method name
   * (e.g., method 'getWeather' → tool name 'get_weather')
   */
  name?: string;

  /**
   * Human-readable description of what the tool does
   */
  description: string;

  /**
   * Parameter types
   * MUST use IParam interfaces with type and description fields
   * @example
   * ```typescript
   * interface NameParam extends IParam {
   *   type: 'string';
   *   description: 'User full name';
   * }
   * params: { name: NameParam }
   * ```
   */
  params: TParams;

  /**
   * Return value type
   */
  result: TResult;

  /**
   * Tool annotations (optional)
   * Provides metadata hints about tool behavior for clients
   * @since v4.1.0
   */
  annotations?: IToolAnnotations;
  /**
   * Hide this tool from tools/list endpoint
   *
   * **Static (Foundation Layer):**
   * ```typescript
   * hidden: true  // Always hidden
   * hidden: false // Always visible
   * ```
   *
   * **Dynamic (Feature Layer FT-1):**
   * ```typescript
   * hidden: (ctx) => !ctx.metadata?.user?.isAdmin
   * hidden: async (ctx) => !(await checkPermission(ctx.metadata?.user, 'debug'))
   * ```
   *
   * When true (or predicate returns true), tool is hidden from list but remains callable.
   *
   * @default false (visible)
   * @since v4.4.0 Static boolean support
   * @since v4.5.0 Dynamic function support (FT-1)
   */
  hidden?: HiddenValue;

  /**
   * Skill membership - which skill(s) this tool belongs to
   *
   * Used for grouping related tools in auto-generated skill documentation.
   * Can reference a single skill or multiple skills.
   *
   * **Single skill:**
   * ```typescript
   * skill: 'database'
   * ```
   *
   * **Multiple skills:**
   * ```typescript
   * skill: ['database', 'admin']
   * ```
   *
   * When specified, auto-generated skills can use this metadata to automatically
   * include the tool without manually listing it in components.
   *
   * @default undefined (no explicit membership)
   * @since v4.4.0 (PL-1)
   */
  skill?: string | string[];
}

/**
 * Type utility to extract parameter types from a tool interface
 *
 * @example
 * ```typescript
 * interface MyTool extends ITool {
 *   params: { name: string; age: number };
 *   result: string;
 * }
 *
 * type Params = ToolParams<MyTool>;  // { name: string; age: number }
 * ```
 */
export type ToolParams<T extends ITool> = T extends ITool<infer P, any> ? P : never;

/**
 * Type utility to extract result type from a tool interface
 *
 * @example
 * ```typescript
 * interface MyTool extends ITool {
 *   params: { name: string };
 *   result: { greeting: string };
 * }
 *
 * type Result = ToolResult<MyTool>;  // { greeting: string }
 * ```
 */
export type ToolResult<T extends ITool> = T extends ITool<any, infer R> ? R : never;
