/**
 * Prompt definition types
 */
import type { PromptMessage, SimpleMessage } from './messages.js';

/**
 * Prompt argument metadata (simpler than IParam for tools)
 *
 * Prompts use lightweight argument documentation. Arguments are optional metadata
 * for client UIs and LLM guidance - not for validation like tools.
 */
export interface IPromptArgument {
  /**
   * Human-readable description of this argument
   */
  description?: string;

  /**
   * Whether this argument is required
   * @default true
   */
  required?: boolean;

  /**
   * Argument type - defaults to 'string' if not specified
   * @default 'string'
   */
  type?: 'string' | 'number' | 'boolean';

  /**
   * Enum values - restrict to specific allowed strings
   * When present, creates a literal union type
   */
  enum?: readonly string[];
}

/**
 * Infer TypeScript type from IPromptArgument definition
 * Priority: enum > type > default to string
 */
export type InferArgType<T extends IPromptArgument> =
  T extends { enum: readonly (infer U)[] } ? U :
  T extends { type: 'number' } ? number :
  T extends { type: 'boolean' } ? boolean :
  string;  // Default to string

/**
 * Convert arguments metadata to TypeScript types
 * Handles required field - defaults to true
 */
export type InferArgs<TArguments extends Record<string, IPromptArgument>> = {
  // Required arguments (required: true OR required field omitted = default true)
  [K in keyof TArguments as TArguments[K] extends { required: false } ? never : K]: InferArgType<TArguments[K]>
} & {
  // Optional arguments (required: false explicitly set)
  [K in keyof TArguments as TArguments[K] extends { required: false } ? K : never]?: InferArgType<TArguments[K]>
};

/**
 * Base Prompt interface
 *
 * All prompts require implementation as methods - there are no static prompts.
 * Prompts return dynamic content based on their arguments.
 *
 * @template TArguments - Argument metadata record (single source of truth)
 *
 * @example Pattern 1: Simple String Return
 * ```typescript
 * interface GreetingPrompt extends IPrompt {
 *   name: 'greeting';
 *   description: 'Simple greeting message';
 *   args: {
 *     name: { description: 'User name' }  // required: true by default
 *   };
 * }
 *
 * class MyServer implements IServer {
 *   greeting: GreetingPrompt = (args) => {
 *     return `Hello ${args.name}! Welcome to MCP.`;
 *   }
 * }
 * // Returns: { role: 'user', content: { type: 'text', text: 'Hello ...' } }
 * ```
 *
 * @example Pattern 2: SimpleMessage[] Return (Recommended)
 * ```typescript
 * interface TutorialPrompt extends IPrompt {
 *   name: 'tutorial';
 *   description: 'Interactive tutorial conversation';
 *   args: {
 *     topic: { description: 'Topic to teach' }  // type: 'string', required: true by default
 *   };
 * }
 *
 * class MyServer implements IServer {
 *   tutorial: TutorialPrompt = (args): SimpleMessage[] => [
 *     { user: `Teach me about ${args.topic}` },
 *     { assistant: `Let me explain ${args.topic}...` },
 *     { user: 'Can you show an example?' },
 *     { assistant: 'Here is a practical example...' }
 *   ];
 * }
 * // Framework auto-converts to PromptMessage[] format
 * ```
 *
 * @example Pattern 3: PromptMessage[] Return (Advanced)
 * ```typescript
 * interface AdvancedPrompt extends IPrompt {
 *   name: 'advanced';
 *   description: 'Advanced prompt with images';
 *   args: {
 *     query: { description: 'User query' }
 *   };
 * }
 *
 * class MyServer implements IServer {
 *   advanced: AdvancedPrompt = (args): PromptMessage[] => [
 *     { role: 'user', content: { type: 'text', text: args.query } },
 *     { role: 'assistant', content: { type: 'image', data: '...', mimeType: 'image/png' } }
 *   ];
 * }
 * // Use this pattern for images, audio, or advanced content types
 * ```
 *
 * @example Optional Arguments
 * ```typescript
 * interface WeatherPrompt extends IPrompt {
 *   name: 'weather_report';
 *   description: 'Generate weather report';
 *   args: {
 *     location: { description: 'City name' },  // required by default
 *     style: { description: 'Report style', required: false }  // optional
 *   };
 * }
 *
 * class MyServer implements IServer {
 *   weatherReport: WeatherPrompt = (args) => {
 *     const style = args.style || 'casual';
 *     return `Generate a ${style} weather report for ${args.location}.`;
 *   }
 * }
 * ```
 *
 * @example Type Inference with type field
 * ```typescript
 * interface ConfigPrompt extends IPrompt {
 *   name: 'config';
 *   description: 'Configure settings';
 *   args: {
 *     port: { description: 'Port number', type: 'number' },
 *     debug: { description: 'Debug mode', type: 'boolean', required: false },
 *     env: { description: 'Environment', enum: ['dev', 'prod'] }
 *   };
 * }
 *
 * class MyServer implements IServer {
 *   config: ConfigPrompt = (args) => {
 *     // args.port is number (required)
 *     // args.debug is boolean | undefined (optional)
 *     // args.env is 'dev' | 'prod' (required, literal union)
 *     return `Configure port ${args.port} for ${args.env}`;
 *   }
 * }
 * ```
 */
export interface IPrompt {
  /**
   * Prompt name in snake_case
   */
  name: string;

  /**
   * Human-readable description
   */
  description: string;

  /**
   * Argument metadata - REQUIRED field (single source of truth)
   * Use empty object {} for prompts with no arguments
   */
  args: Record<string, IPromptArgument>;

  /**
   * Callable signature with automatic type inference
   *
   * The type of `args` is automatically inferred from the `args` field
   * defined in your interface extension. This means you get full type safety
   * without having to specify generic parameters!
   *
   * Can return either:
   * - string: Simple prompt (auto-wrapped as user message)
   * - SimpleMessage[]: Easy multi-turn conversations (recommended)
   * - PromptMessage[]: Advanced multi-message conversation (full control)
   */
  (args: InferArgs<this['args']>):
    | string
    | PromptMessage[]
    | SimpleMessage[]
    | Promise<string | PromptMessage[] | SimpleMessage[]>;
}

/**
 * Type utility to extract argument types from a prompt interface
 */
export type PromptArgs<T extends IPrompt> = T extends { args: infer A } ? A : never;
