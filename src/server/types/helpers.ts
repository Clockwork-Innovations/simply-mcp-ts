/**
 * Helper types for const-based server definitions (Phase 1)
 */

import type { IParam } from './params.js';
import type { PromptMessage, SimpleMessage } from './messages.js';

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
  // Enum: extract literal union
  T extends { enum: readonly (infer U)[] } ? U :
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
    T['args'][K] extends { enum: readonly (infer U)[] } ? U :
    T['args'][K] extends { type: 'number' } ? number :
    T['args'][K] extends { type: 'boolean' } ? boolean :
    string
} & {
  [K in keyof T['args'] as T['args'][K] extends { required: false } ? K : never]?:
    T['args'][K] extends { enum: readonly (infer U)[] } ? U :
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
 * const asyncPrompt: PromptHelper<MyPrompt> = async (args) => {
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
  (args: InferPromptArgs<T>) =>
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
 */
export type ResourceHelper<T> =
  T extends { result: any }
    ? () => Promise<T['result']> | T['result']
    : () => Promise<any> | any;
