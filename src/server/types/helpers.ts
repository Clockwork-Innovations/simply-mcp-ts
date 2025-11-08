/**
 * Helper types for const-based server definitions (Phase 1)
 */

import type { IParam } from './params.js';
import type { PromptMessage, SimpleMessage } from './messages.js';
import type { ICompletion } from './completion.js';

/**
 * Helper type to infer TypeScript param types from IParam definitions
 * Extracts the actual TypeScript type from IParam constraint definitions
 *
 * This is used internally by ToolHelper to provide automatic type inference
 * for tool parameters based on their IParam definitions.
 *
 * @template T - The IParam definition to infer from
 *
 * @example
 * ```typescript
 * interface NameParam extends IParam {
 *   type: 'string';
 *   description: 'User name';
 *   minLength: 1;
 * }
 *
 * type InferredType = InferParamType<NameParam>; // string
 * ```
 *
 * @example Array Inference
 * ```typescript
 * interface TagsParam extends IParam {
 *   type: 'array';
 *   items: { type: 'string'; description: 'Tag' };
 * }
 *
 * type InferredType = InferParamType<TagsParam>; // string[]
 * ```
 *
 * @example Object Inference
 * ```typescript
 * interface UserParam extends IParam {
 *   type: 'object';
 *   properties: {
 *     name: { type: 'string'; description: 'Name' };
 *     age: { type: 'number'; description: 'Age' };
 *   };
 * }
 *
 * type InferredType = InferParamType<UserParam>; // { name: string; age: number }
 * ```
 */
export type InferParamType<T> =
  // If T has type field, use it to determine TypeScript type
  T extends { type: 'string' } ? string :
  T extends { type: 'number' } ? number :
  T extends { type: 'integer' } ? number :
  T extends { type: 'boolean' } ? boolean :
  T extends { type: 'null' } ? null :
  // Array: recursively infer item type
  T extends { type: 'array'; items: infer I } ? Array<InferParamType<I>> :
  // Object: map properties
  T extends { type: 'object'; properties: infer P } ?
    { [K in keyof P]: InferParamType<P[K]> } :
  // Enum: extract literal union (works with or without readonly)
  T extends { enum: ReadonlyArray<infer U> | Array<infer U> } ? U :
  // Fallback
  any;

/**
 * Infer params object type from tool interface params field
 * Handles required/optional fields based on IParam.required flag
 *
 * This helper type creates a properly typed params object where:
 * - Fields with `required: false` are optional (?)
 * - All other fields are required
 * - Types are inferred from IParam definitions
 *
 * @template T - Tool interface with params field
 *
 * @example
 * ```typescript
 * interface AddTool extends ITool {
 *   name: 'add';
 *   params: {
 *     a: { type: 'number'; description: 'First number' };
 *     b: { type: 'number'; description: 'Second number' };
 *     round: { type: 'boolean'; description: 'Round result'; required: false };
 *   };
 *   result: { sum: number };
 * }
 *
 * type Params = InferParams<AddTool>;
 * // { a: number; b: number; round?: boolean }
 * ```
 */
export type InferParams<T extends { params: any }> = {
  // Required params (required !== false)
  [K in keyof T['params'] as T['params'][K] extends { required: false } ? never : K]:
    InferParamType<T['params'][K]>
} & {
  // Optional params (required: false)
  [K in keyof T['params'] as T['params'][K] extends { required: false } ? K : never]?:
    InferParamType<T['params'][K]>
};

/**
 * Tool implementation helper type
 *
 * Use this type to create const-based tool implementations with full type safety.
 * It automatically infers parameter types from your tool interface and validates
 * the return type.
 *
 * @template T - Tool interface extending ITool with params and result
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
 * const add: ToolHelper<AddTool> = async (params) => {
 *   // params.a and params.b are number (inferred!)
 *   return { sum: params.a + params.b };
 * };
 * ```
 *
 * @example With Optional Parameters
 * ```typescript
 * interface GreetTool extends ITool {
 *   name: 'greet';
 *   params: {
 *     name: { type: 'string'; description: 'Name to greet' };
 *     formal: { type: 'boolean'; description: 'Use formal greeting'; required: false };
 *   };
 *   result: string;
 * }
 *
 * const greet: ToolHelper<GreetTool> = async (params) => {
 *   // params.name is required string
 *   // params.formal is optional boolean
 *   const greeting = params.formal ? 'Good day' : 'Hello';
 *   return `${greeting}, ${params.name}!`;
 * };
 * ```
 *
 * @example With Context
 * ```typescript
 * const myTool: ToolHelper<MyTool> = async (params, context) => {
 *   // context provides HandlerContext with logger, permissions, etc.
 *   context?.logger?.info(`Tool called with ${params}`);
 *   return result;
 * };
 * ```
 */
export type ToolHelper<T extends { params: any; result: any }> =
  (params: InferParams<T>, context?: import('../../types/handler.js').HandlerContext) =>
    Promise<T['result']> | T['result'];

/**
 * Infer prompt args from IPrompt.args field
 *
 * Similar to InferParams but specifically for prompt arguments.
 * Handles required/optional arguments and type inference.
 *
 * @template T - Prompt interface with args field
 *
 * @example
 * ```typescript
 * interface GreetingPrompt extends IPrompt {
 *   name: 'greeting';
 *   args: {
 *     name: { description: 'Name'; required: true };
 *     title: { description: 'Title'; required: false };
 *   };
 * }
 *
 * type Args = InferPromptArgs<GreetingPrompt>;
 * // { name: string; title?: string }
 * ```
 */
export type InferPromptArgs<T extends { args: any }> = {
  [K in keyof T['args'] as T['args'][K] extends { required: false } ? never : K]:
    T['args'][K] extends { enum: ReadonlyArray<infer U> | Array<infer U> } ? U :
    T['args'][K] extends { type: 'number' } ? number :
    T['args'][K] extends { type: 'boolean' } ? boolean :
    string
} & {
  [K in keyof T['args'] as T['args'][K] extends { required: false } ? K : never]?:
    T['args'][K] extends { enum: ReadonlyArray<infer U> | Array<infer U> } ? U :
    T['args'][K] extends { type: 'number' } ? number :
    T['args'][K] extends { type: 'boolean' } ? boolean :
    string
};

/**
 * Prompt implementation helper type
 *
 * Use this type to create const-based prompt implementations with full type safety.
 * It automatically infers argument types from your prompt interface.
 *
 * **Context Parameter:** Optional HandlerContext provides access to logging, permissions,
 * and other runtime services. Consistent with ToolHelper and ResourceHelper patterns.
 *
 * @template T - Prompt interface with args field
 *
 * @example Simple Prompt
 * ```typescript
 * interface GreetingPrompt extends IPrompt {
 *   name: 'greeting';
 *   description: 'Generate a greeting';
 *   args: {
 *     name: { description: 'Person to greet'; required: true };
 *   };
 * }
 *
 * const greeting: PromptHelper<GreetingPrompt> = (args) => {
 *   // args.name is string (inferred!)
 *   return `Hello, ${args.name}!`;
 * };
 * ```
 *
 * @example With Context (Logging)
 * ```typescript
 * interface DiagnosticPrompt extends IPrompt {
 *   name: 'diagnose';
 *   description: 'Generate diagnostic prompt';
 *   args: {
 *     issue: { description: 'Issue description' };
 *   };
 * }
 *
 * const diagnose: PromptHelper<DiagnosticPrompt> = (args, context) => {
 *   // Use context for logging
 *   context?.logger?.info('Generating diagnostic prompt', { issue: args.issue });
 *   return `Diagnosing issue: ${args.issue}`;
 * };
 * ```
 *
 * @example With Enum Arguments
 * ```typescript
 * interface StylePrompt extends IPrompt {
 *   name: 'styled-greeting';
 *   args: {
 *     name: { description: 'Name' };
 *     style: { description: 'Style'; enum: ['formal', 'casual'] as const };
 *   };
 * }
 *
 * const styledGreeting: PromptHelper<StylePrompt> = (args) => {
 *   // args.style is 'formal' | 'casual' (literal union!)
 *   const greeting = args.style === 'formal' ? 'Good day' : 'Hey';
 *   return `${greeting}, ${args.name}!`;
 * };
 * ```
 *
 * @example Async Prompt
 * ```typescript
 * const asyncPrompt: PromptHelper<MyPrompt> = async (args, context) => {
 *   context?.logger?.info('Fetching data...');
 *   const data = await fetchData(args.query);
 *   return `Result: ${data}`;
 * };
 * ```
 *
 * @example With PromptMessage Array
 * ```typescript
 * const messagePrompt: PromptHelper<MyPrompt> = (args) => {
 *   return [
 *     { role: 'user', content: { type: 'text', text: args.query } }
 *   ];
 * };
 * ```
 */
export type PromptHelper<T extends { args: any }> =
  (args: InferPromptArgs<T>, context?: import('../../types/handler.js').HandlerContext) =>
    string | PromptMessage[] | SimpleMessage[] | Promise<string | PromptMessage[] | SimpleMessage[]>;

/**
 * Resource implementation helper type
 *
 * Use this type to create const-based resource implementations with full type safety.
 * It validates the return type matches your resource interface.
 *
 * @template T - Resource interface
 *
 * @example Static Resource
 * ```typescript
 * interface StatsResource extends IResource {
 *   uri: 'stats://server';
 *   name: 'Server Stats';
 *   description: 'Current server statistics';
 *   result: { uptime: number; requests: number };
 * }
 *
 * const stats: ResourceHelper<StatsResource> = async () => {
 *   return {
 *     uptime: process.uptime(),
 *     requests: getRequestCount()
 *   };
 * };
 * ```
 *
 * @example Text Resource
 * ```typescript
 * interface ConfigResource extends IResource {
 *   uri: 'config://app';
 *   name: 'App Config';
 *   mimeType: 'application/json';
 *   result: string;
 * }
 *
 * const config: ResourceHelper<ConfigResource> = () => {
 *   return JSON.stringify({ version: '1.0.0' });
 * };
 * ```
 *
 * @example Image Resource
 * ```typescript
 * interface LogoResource extends IResource {
 *   uri: 'images://logo';
 *   name: 'Company Logo';
 *   mimeType: 'image/png';
 *   result: IImageContent;
 * }
 *
 * const logo: ResourceHelper<LogoResource> = async () => {
 *   const buffer = await fs.readFile('./logo.png');
 *   return {
 *     type: 'image',
 *     data: buffer.toString('base64'),
 *     mimeType: 'image/png'
 *   };
 * };
 * ```
 *
 * @example Parameterized Resource (v4.1+)
 * ```typescript
 * interface UserResource extends IResource {
 *   uri: 'api://users/{userId}';
 *   name: 'User by ID';
 *   mimeType: 'application/json';
 *   params: {
 *     userId: { type: 'string'; description: 'User ID'; required: true };
 *   };
 *   returns: { id: string; name: string };
 * }
 *
 * // Handler receives params as first argument (like tools!)
 * const apiUsersUserId: ResourceHelper<UserResource> = async (params) => {
 *   return { id: params.userId, name: 'John Doe' };
 * };
 * ```
 *
 * @example With Database Context
 * ```typescript
 * interface UserResource extends IResource {
 *   uri: 'db://users/{userId}';
 *   params: {
 *     userId: { type: 'string'; required: true };
 *   };
 *   database: { uri: 'file:./users.db' };
 *   returns: User;
 * }
 *
 * // Handler receives params first, context second
 * const dbUsersUserId: ResourceHelper<UserResource> = async (params, context) => {
 *   const db = context?.db;
 *   if (!db) throw new Error('Database not configured');
 *   const user = db.prepare('SELECT * FROM users WHERE id = ?').get(params.userId);
 *   return user;
 * };
 * ```
 */
export type ResourceHelper<T> =
  // Resources with params field - pass params as first argument, context as second (matches tool pattern)
  T extends { params: any; returns: any }
    ? (params: InferParams<T>, context?: import('../../types/handler.js').HandlerContext) =>
        Promise<T['returns']> | T['returns']
    // Resources with returns field but no params - just context optional
    : T extends { returns: any }
      ? (context?: import('../../types/handler.js').HandlerContext) =>
          Promise<T['returns']> | T['returns']
      // Legacy resources with result field (backward compatibility)
      : T extends { result: any }
        ? () => Promise<T['result']> | T['result']
        // Fallback
        : () => Promise<any> | any;

/**
 * Completion implementation helper type
 *
 * Use this type to create const-based completion implementations with full type safety.
 * It automatically infers the suggestions type from your completion interface.
 *
 * @template T - Completion interface extending ICompletion
 *
 * @example String Array Completions
 * ```typescript
 * interface CityCompletion extends ICompletion<string[]> {
 *   name: 'city_autocomplete';
 *   description: 'Autocomplete city names';
 *   ref: { type: 'argument'; name: 'city' };
 * }
 *
 * const cityAutocomplete: CompletionHelper<CityCompletion> = async (value) => {
 *   const cities = ['New York', 'Los Angeles', 'London'];
 *   return cities.filter(c => c.toLowerCase().startsWith(value.toLowerCase()));
 * };
 * ```
 *
 * @example With Context
 * ```typescript
 * interface SmartCompletion extends ICompletion<string[]> {
 *   name: 'smart_suggestions';
 *   description: 'Context-aware suggestions';
 *   ref: { type: 'argument'; name: 'query' };
 * }
 *
 * const smartSuggestions: CompletionHelper<SmartCompletion> = async (value, context) => {
 *   // Use context for smarter completions
 *   const history = context?.history || [];
 *   return generateSuggestions(value, history);
 * };
 * ```
 *
 * @example Object Completions
 * ```typescript
 * interface FileCompletion extends ICompletion<Array<{ path: string; type: string }>> {
 *   name: 'file_suggestions';
 *   description: 'File path completions with metadata';
 *   ref: { type: 'argument'; name: 'filepath' };
 * }
 *
 * const fileSuggestions: CompletionHelper<FileCompletion> = (value) => {
 *   return [
 *     { path: '/home/user/file1.txt', type: 'file' },
 *     { path: '/home/user/dir/', type: 'directory' }
 *   ];
 * };
 * ```
 */
export type CompletionHelper<T extends { name: string; description: string }> =
  (value: string, context?: any) => T extends ICompletion<infer TSuggestions>
    ? Promise<TSuggestions> | TSuggestions
    : Promise<any> | any;

/**
 * Roots implementation helper type
 *
 * Use this type to create const-based roots implementations with full type safety.
 * It validates the return type matches the expected roots array structure.
 *
 * @template T - Roots interface extending IRoots
 *
 * @example Basic Roots
 * ```typescript
 * interface ProjectRoots extends IRoots {
 *   name: 'project_roots';
 *   description: 'Get project root directories';
 * }
 *
 * const projectRoots: RootsHelper<ProjectRoots> = () => {
 *   return [
 *     { uri: 'file:///home/user/project', name: 'My Project' },
 *     { uri: 'file:///home/user/workspace', name: 'Workspace' }
 *   ];
 * };
 * ```
 *
 * @example Async Roots
 * ```typescript
 * interface DynamicRoots extends IRoots {
 *   name: 'workspace_roots';
 *   description: 'Dynamically discover workspace roots';
 * }
 *
 * const workspaceRoots: RootsHelper<DynamicRoots> = async () => {
 *   const roots = await discoverWorkspaceRoots();
 *   return roots.map(r => ({
 *     uri: `file://${r.path}`,
 *     name: r.name
 *   }));
 * };
 * ```
 *
 * @example With Environment Variables
 * ```typescript
 * interface EnvRoots extends IRoots {
 *   name: 'env_roots';
 *   description: 'Roots from environment configuration';
 * }
 *
 * const envRoots: RootsHelper<EnvRoots> = () => {
 *   const rootPath = process.env.PROJECT_ROOT || process.cwd();
 *   return [{ uri: `file://${rootPath}`, name: 'Project Root' }];
 * };
 * ```
 */
export type RootsHelper<T extends { name: string; description: string }> =
  () => Promise<Array<{ uri: string; name?: string }>> | Array<{ uri: string; name?: string }>;
