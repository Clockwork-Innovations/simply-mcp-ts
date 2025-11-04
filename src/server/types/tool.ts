/**
 * Tool definition types
 */

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
 *   params: { userId: string };
 *   result: User;
 *   annotations: {
 *     readOnlyHint: true;
 *     category: 'data';
 *   };
 * }
 * ```
 *
 * @example Destructive Tool
 * ```typescript
 * interface DeleteUserTool extends ITool {
 *   name: 'delete_user';
 *   description: 'Permanently delete a user account';
 *   params: { userId: string };
 *   result: boolean;
 *   annotations: {
 *     destructiveHint: true;
 *     requiresConfirmation: true;
 *     category: 'system';
 *   };
 * }
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
 * Base Tool interface
 *
 * Tools require implementation as class methods because they contain dynamic logic.
 * Extend this interface to define a tool with full type safety.
 *
 * The interface must include:
 * - `name`: Tool name (snake_case, will map to camelCase method)
 * - `description`: Human-readable description
 * - `params`: Parameter types (TypeScript types, converted to Zod schema)
 * - `result`: Return type
 *
 * Parameters can be:
 * - Simple TypeScript types (string, number, boolean, etc.)
 * - IParam interfaces for richer validation and documentation
 * - Complex nested objects
 *
 * @template TParams - Parameter object type
 * @template TResult - Return value type
 *
 * @example Simple Parameters
 * ```typescript
 * interface GreetTool extends ITool {
 *   name: 'greet_user';
 *   description: 'Greet a user by name';
 *   params: { name: string; formal?: boolean };
 *   result: string;
 * }
 * ```
 *
 * @example IParam Parameters
 * ```typescript
 * interface NameParam extends IParam {
 *   type: 'string';
 *   description: 'User full name';
 *   minLength: 1;
 *   maxLength: 100;
 * }
 *
 * interface GreetTool extends ITool {
 *   name: 'greet_user';
 *   description: 'Greet a user by name';
 *   params: { name: NameParam };
 *   result: string;
 * }
 * ```
 *
 * @example Implementation
 * ```typescript
 * class MyServer implements IServer {
 *   // Method name is camelCase version of tool name
 *   greetUser: GreetTool = async (params) => {
 *     const greeting = params.formal ? 'Good day' : 'Hello';
 *     return `${greeting}, ${params.name}!`;
 *   }
 * }
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
   * Callable signature - the actual implementation
   *
   * @param params - Validated and type-coerced parameters from the MCP request
   * @param context - Optional handler context with MCP capabilities (sample, reportProgress, etc.)
   * @returns The tool result or a Promise resolving to the result
   *
   * @example Without context
   * ```typescript
   * add: AddTool = async (params) => {
   *   return { sum: params.a + params.b };
   * };
   * ```
   *
   * @example With context for progress reporting
   * ```typescript
   * processFiles: ProcessFilesTool = async (params, context) => {
   *   for (let i = 0; i < params.files.length; i++) {
   *     await context?.reportProgress(i + 1, params.files.length, `Processing file ${i + 1}`);
   *     // ... process file
   *   }
   *   return { success: true };
   * };
   * ```
   *
   * @example With context for sampling (AI assistance)
   * ```typescript
   * analyzeCode: AnalyzeTool = async (params, context) => {
   *   if (!context?.sample) {
   *     return { analysis: 'Sampling not available' };
   *   }
   *   const result = await context.sample([
   *     { role: 'user', content: { type: 'text', text: `Analyze: ${params.code}` } }
   *   ]);
   *   return { analysis: result.content.text };
   * };
   * ```
   */
  (params: TParams, context?: import('../../types/handler.js').HandlerContext): TResult | Promise<TResult>;
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
