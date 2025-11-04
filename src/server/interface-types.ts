/**
 * Interface-Driven API Type Definitions
 *
 * The cleanest, most TypeScript-native way to define MCP servers.
 * Define pure TypeScript interfaces that extend base types, and the framework
 * handles everything else via AST parsing.
 *
 * @example
 * ```typescript
 * import type { ITool, IServer } from 'simply-mcp';
 *
 * interface GetWeatherTool extends ITool {
 *   name: 'get_weather';
 *   description: 'Get current weather';
 *   params: { location: string; units?: 'celsius' | 'fahrenheit' };
 *   result: { temperature: number; conditions: string };
 * }
 *
 * interface WeatherServer extends IServer {
 *   name: 'weather-service';
 *   version: '1.0.0';
 * }
 *
 * export default class WeatherService implements WeatherServer {
 *   getWeather: GetWeatherTool = async (params) => {
 *     // Full type safety on params and return value
 *     return {
 *       temperature: 72,
 *       conditions: 'Sunny'
 *     };
 *   }
 * }
 * ```
 */

// Import router types from programmatic API
import type { RouterToolDefinition as ProgrammaticRouterToolDefinition } from './builder-types.js';
// Import MCP SDK types for prompt messages
import type { PromptMessage } from '@modelcontextprotocol/sdk/types.js';

/**
 * Enhanced parameter definition with validation constraints
 *
 * IParam provides a single unified interface for all parameter types with a required
 * type discriminant field. This improves LLM accuracy when calling tools by providing
 * richer parameter metadata in the generated JSON Schema.
 *
 * The `type` field acts as a discriminant to determine which validation constraints
 * apply to the parameter. All constraint fields are optional and type-specific
 * (e.g., minLength only applies to strings, min/max only apply to numbers).
 *
 * @example Basic String
 * ```typescript
 * interface NameParam extends IParam {
 *   type: 'string';
 *   description: 'User full name';
 *   minLength: 1;
 *   maxLength: 100;
 * }
 * ```
 *
 * @example Email Format
 * ```typescript
 * interface EmailParam extends IParam {
 *   type: 'string';
 *   description: 'User email address';
 *   format: 'email';
 * }
 * ```
 *
 * @example Pattern Validation
 * ```typescript
 * interface UsernameParam extends IParam {
 *   type: 'string';
 *   description: 'Username (alphanumeric only)';
 *   pattern: '^[a-zA-Z0-9]+$';
 *   minLength: 3;
 *   maxLength: 20;
 * }
 * ```
 *
 * @example Integer Age
 * ```typescript
 * interface AgeParam extends IParam {
 *   type: 'integer';
 *   description: 'User age in years';
 *   min: 0;
 *   max: 150;
 * }
 * ```
 *
 * @example Float Temperature
 * ```typescript
 * interface TemperatureParam extends IParam {
 *   type: 'number';
 *   description: 'Temperature in Celsius';
 *   min: -273.15;
 *   max: 1000;
 * }
 * ```
 *
 * @example Port Number
 * ```typescript
 * interface PortParam extends IParam {
 *   type: 'integer';
 *   description: 'Network port';
 *   min: 1;
 *   max: 65535;
 * }
 * ```
 *
 * @example Boolean
 * ```typescript
 * interface EnabledParam extends IParam {
 *   type: 'boolean';
 *   description: 'Whether the feature is enabled';
 * }
 * ```
 *
 * @example String Array
 * ```typescript
 * interface TagsParam extends IParam {
 *   type: 'array';
 *   description: 'User tags';
 *   items: {
 *     type: 'string';
 *     description: 'A single tag';
 *     minLength: 1;
 *   };
 *   minItems: 0;
 *   maxItems: 10;
 * }
 * ```
 *
 * @example Number Array
 * ```typescript
 * interface ScoresParam extends IParam {
 *   type: 'array';
 *   description: 'Test scores';
 *   items: {
 *     type: 'integer';
 *     description: 'Individual score';
 *     min: 0;
 *     max: 100;
 *   };
 *   minItems: 1;
 * }
 * ```
 *
 * @example Nested Object Array
 * ```typescript
 * interface UsersParam extends IParam {
 *   type: 'array';
 *   description: 'List of users';
 *   items: {
 *     type: 'object';
 *     description: 'User object';
 *     properties: {
 *       name: { type: 'string'; description: 'User name' };
 *       age: { type: 'integer'; description: 'User age'; min: 0 };
 *     };
 *     requiredProperties: ['name'];
 *   };
 * }
 * ```
 *
 * @example User Object
 * ```typescript
 * interface UserParam extends IParam {
 *   type: 'object';
 *   description: 'User information';
 *   properties: {
 *     name: {
 *       type: 'string';
 *       description: 'User name';
 *       minLength: 1;
 *     };
 *     age: {
 *       type: 'integer';
 *       description: 'User age';
 *       min: 0;
 *     };
 *     email: {
 *       type: 'string';
 *       description: 'Email address';
 *       format: 'email';
 *     };
 *   };
 *   requiredProperties: ['name'];
 * }
 * ```
 *
 * @example Nested Objects
 * ```typescript
 * interface AddressParam extends IParam {
 *   type: 'object';
 *   description: 'Mailing address';
 *   properties: {
 *     street: { type: 'string'; description: 'Street address' };
 *     city: { type: 'string'; description: 'City' };
 *     country: { type: 'string'; description: 'Country code'; pattern: '^[A-Z]{2}$' };
 *   };
 *   requiredProperties: ['street', 'city', 'country'];
 * }
 * ```
 *
 * @example Null Parameter
 * ```typescript
 * interface NullParam extends IParam {
 *   type: 'null';
 *   description: 'Explicitly null value';
 * }
 * ```
 */
export interface IParam {
  /**
   * The JSON Schema type discriminant
   *
   * This required field determines which validation constraints apply:
   * - 'string': Use minLength, maxLength, format, pattern, enum
   * - 'number' | 'integer': Use min, max, exclusiveMin, exclusiveMax, multipleOf
   * - 'boolean': No additional constraints
   * - 'array': Use items, minItems, maxItems, uniqueItems
   * - 'object': Use properties, requiredProperties, additionalProperties
   * - 'null': No additional constraints
   */
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';

  /**
   * Human-readable description of this parameter
   * Included in JSON Schema to help LLMs understand parameter purpose
   */
  description: string;

  /**
   * Whether this parameter is required
   * Default: true
   */
  required?: boolean;

  // String constraints (type: 'string')

  /**
   * Minimum length for string values
   */
  minLength?: number;

  /**
   * Maximum length for string values
   */
  maxLength?: number;

  /**
   * String format validation
   */
  format?: 'email' | 'url' | 'uuid' | 'date-time' | 'uri' | 'ipv4' | 'ipv6';

  /**
   * Regex pattern for string validation
   */
  pattern?: string;

  /**
   * Enum values - restrict to specific allowed strings
   */
  enum?: string[];

  // Number constraints (type: 'number' | 'integer')

  /**
   * Minimum value (inclusive)
   */
  min?: number;

  /**
   * Maximum value (inclusive)
   */
  max?: number;

  /**
   * Number must be a multiple of this value
   */
  multipleOf?: number;

  /**
   * Exclusive minimum (value must be greater than this)
   */
  exclusiveMin?: number;

  /**
   * Exclusive maximum (value must be less than this)
   */
  exclusiveMax?: number;

  // Array constraints (type: 'array')

  /**
   * Schema for array items (can be any IParam type)
   */
  items?: IParam;

  /**
   * Minimum number of items in array
   */
  minItems?: number;

  /**
   * Maximum number of items in array
   */
  maxItems?: number;

  /**
   * Whether array items must be unique
   */
  uniqueItems?: boolean;

  // Object constraints (type: 'object')

  /**
   * Object properties (each is an IParam)
   */
  properties?: Record<string, IParam>;

  /**
   * Array of required property names
   */
  requiredProperties?: string[];

  /**
   * Whether additional properties are allowed
   */
  additionalProperties?: boolean;
}

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
  (params: TParams, context?: import('../types/handler.js').HandlerContext): TResult | Promise<TResult>;
}

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
 * Base Resource interface
 *
 * Resources are static data defined entirely in the interface.
 * No implementation needed - the framework extracts the data.
 *
 * For resources requiring dynamic logic, set `dynamic: true` and implement
 * as a method.
 *
 * @template TData - Resource data type
 *
 * @example Static Resource
 * ```typescript
 * interface ConfigResource extends IResource {
 *   uri: 'config://server';
 *   name: 'Server Configuration';
 *   description: 'Server settings and metadata';
 *   mimeType: 'application/json';
 *   data: {
 *     apiVersion: '2.0';
 *     features: ['tools', 'prompts', 'resources'];
 *   };
 * }
 * ```
 *
 * @example Dynamic Resource
 * ```typescript
 * interface StatsResource extends IResource {
 *   uri: 'stats://current';
 *   name: 'Current Statistics';
 *   description: 'Real-time server statistics';
 *   mimeType: 'application/json';
 *   dynamic: true;
 *   data: {
 *     requestCount: number;
 *     uptime: number;
 *   };
 * }
 *
 * class MyServer implements IServer {
 *   'stats://current': StatsResource = async () => ({
 *     requestCount: await getCount(),
 *     uptime: process.uptime()
 *   })
 * }
 * ```
 */
/**
 * Database Configuration Interface
 *
 * Defines database connection settings for resources that need to access
 * databases like SQLite, PostgreSQL, MySQL, etc.
 *
 * The `uri` field supports environment variable substitution using ${VAR_NAME} syntax.
 *
 * @example SQLite with Absolute Path
 * ```typescript
 * interface UsersResource extends IResource {
 *   database: {
 *     uri: 'sqlite:///data/users.db';
 *     readonly: true;
 *   };
 * }
 * ```
 *
 * @example SQLite with Environment Variable
 * ```typescript
 * interface UsersResource extends IResource {
 *   database: {
 *     uri: '${DATABASE_URL}';  // Reads from process.env.DATABASE_URL
 *     timeout: 5000;
 *   };
 * }
 * ```
 *
 * @example Relative Path
 * ```typescript
 * interface AnalyticsResource extends IResource {
 *   database: {
 *     uri: 'file:./analytics.sqlite';
 *     poolSize: 10;
 *   };
 * }
 * ```
 *
 * @example Future: PostgreSQL
 * ```typescript
 * interface UsersResource extends IResource {
 *   database: {
 *     uri: 'postgresql://user:pass@localhost:5432/mydb';
 *     ssl: true;
 *     poolSize: 20;
 *   };
 * }
 * ```
 */
export interface IDatabase {
  /**
   * Database connection URI
   *
   * Supported formats:
   * - SQLite: `sqlite:///absolute/path/to/db.sqlite`
   * - SQLite: `sqlite://./relative/path/to/db.sqlite`
   * - SQLite: `file:./data/app.db`
   * - PostgreSQL: `postgresql://user:pass@host:port/database` (future)
   * - MySQL: `mysql://user:pass@host:port/database` (future)
   * - Environment variable: `${DATABASE_URL}` (substituted at runtime)
   *
   * Security: Never hardcode credentials in URIs. Use environment variables instead.
   */
  uri: string;

  /**
   * Optional human-readable name for this database connection
   * Used for logging and debugging purposes
   *
   * @example 'users-db', 'analytics', 'primary'
   */
  name?: string;

  /**
   * Connection timeout in milliseconds
   * Default: 5000 (5 seconds)
   */
  timeout?: number;

  /**
   * Connection pool size (maximum number of concurrent connections)
   * Default: 5
   *
   * Note: Only applicable for databases that support connection pooling
   */
  poolSize?: number;

  /**
   * Enable SSL/TLS for the database connection
   * Default: false
   *
   * Note: Only applicable for network-based databases (Postgres, MySQL, etc.)
   */
  ssl?: boolean;

  /**
   * Open database in read-only mode
   * Default: false
   *
   * Resources are read-only by MCP protocol definition, but this provides
   * an additional layer of safety at the database level.
   */
  readonly?: boolean;
}

/**
 * Resource interface for v4.0
 *
 * Resources can be either static or dynamic:
 *
 * **Static Resources** - Use `value` field with literal data (no implementation needed):
 * @example
 * interface ConfigResource extends IResource {
 *   uri: 'config://app';
 *   name: 'Config';
 *   description: 'Application configuration';
 *   mimeType: 'application/json';
 *   value: { version: '1.0.0', env: 'production' }; // ← Literal data
 * }
 *
 * **Dynamic Function Resources** - Use `returns` field with type definition (implementation required):
 * @example
 * interface StatsResource extends IResource {
 *   uri: 'stats://users';
 *   name: 'User Stats';
 *   description: 'Real-time user statistics';
 *   mimeType: 'application/json';
 *   returns: { count: number; active: number }; // ← Type definition
 * }
 * // Implementation: 'stats://users' = async () => ({ count: 42, active: 10 })
 *
 * **Dynamic Object Resources** - Use `returns` field with type definition (object with data property):
 * @example
 * interface DocResource extends IResource {
 *   uri: 'doc://readme';
 *   name: 'README';
 *   description: 'Documentation';
 *   mimeType: 'text/markdown';
 *   returns: string; // ← Type definition
 * }
 * // Implementation: 'doc://readme' = { data: '# README...' }
 *
 * **Database Resources** - Use `database` field to access databases (v4.1):
 * @example
 * interface UsersResource extends IResource {
 *   uri: 'db://users';
 *   name: 'User Database';
 *   mimeType: 'application/json';
 *   database: {
 *     uri: '${DATABASE_URL}';
 *     readonly: true;
 *   };
 *   returns: { users: Array<{ id: number; username: string }> };
 * }
 * // Implementation: 'db://users' = async (context) => {
 * //   const db = context.db;
 * //   const users = db.prepare('SELECT * FROM users').all();
 * //   return { users };
 * // }
 *
 * @template T - The type of data returned by the resource
 */
export interface IResource<T = any> {
  /**
   * Resource URI (e.g., 'config://server', 'doc://readme')
   */
  uri: string;

  /**
   * Human-readable resource name
   */
  name: string;

  /**
   * Resource description
   */
  description: string;

  /**
   * MIME type (e.g., 'application/json', 'text/plain', 'text/markdown')
   */
  mimeType: string;

  /**
   * Static literal data for static resources.
   * Use this for resources that contain fixed data that doesn't change.
   * Cannot be used together with `returns`.
   */
  value?: T;

  /**
   * Type definition for dynamic resources.
   * Use this for resources that require runtime implementation.
   * Cannot be used together with `value`.
   */
  returns?: T;

  /**
   * Optional database configuration for resources that need database access.
   * When specified, the framework will establish a connection and provide it
   * to the resource implementation via the context parameter.
   *
   * @example
   * ```typescript
   * interface UsersResource extends IResource {
   *   uri: 'db://users';
   *   database: {
   *     uri: '${DATABASE_URL}';
   *     readonly: true;
   *   };
   *   returns: { users: User[] };
   * }
   * ```
   */
  database?: IDatabase;

  /**
   * Callable signature - the actual implementation for dynamic resources
   *
   * @param context - Optional context containing database connection (if database field is set)
   * @returns The resource data (can be async)
   */
  (context?: ResourceContext): T | Promise<T>;
}

/**
 * Resource Context
 *
 * Context object passed to dynamic resource implementations.
 * Provides access to database connections and other runtime information.
 *
 * **Type Inference**: TypeScript automatically infers the context type from your
 * resource interface - you don't need to annotate it manually!
 *
 * @example Basic Usage (Type Inferred Automatically)
 * ```typescript
 * interface UsersResource extends IResource {
 *   database: { uri: 'file:./users.db' };
 *   returns: { users: User[] };
 * }
 *
 * // ✅ TypeScript infers context type from UsersResource automatically
 * 'db://users': UsersResource = async (context) => {
 *   const db = context?.db;  // TypeScript knows this is ResourceContext
 *   if (!db) throw new Error('Database not configured');
 *
 *   const users = db.prepare('SELECT * FROM users').all();
 *   return { users };
 * };
 * ```
 *
 * @example With Explicit Database Type
 * ```typescript
 * import Database from 'better-sqlite3';
 *
 * 'db://users': UsersResource = async (context) => {
 *   // Cast db to specific driver type for better autocomplete
 *   const db = context?.db as Database.Database;
 *   const users = db.prepare('SELECT * FROM users').all() as User[];
 *   return { users };
 * };
 * ```
 */
export interface ResourceContext {
  /**
   * Database connection instance (if resource has database field configured)
   *
   * The type depends on the database driver:
   * - SQLite: better-sqlite3 Database instance
   * - PostgreSQL: pg Pool instance (future)
   * - MySQL: mysql2 Pool instance (future)
   *
   * Will be undefined if:
   * - Resource doesn't have database field
   * - Database connection failed to establish
   */
  db?: any;

  /**
   * Future: Security context for authentication/authorization
   * Planned for v4.2
   */
  // security?: SecurityContext;

  /**
   * Future: Session information
   * Planned for v4.2
   */
  // session?: string;
}

/**
 * Base Elicitation interface
 *
 * Elicitations are server-initiated requests for user input from the client.
 * This is NOT a declarative interface - it is only used for type definitions.
 * To request user input, use the context.elicitInput() method in tool handlers.
 *
 * The elicitation protocol allows servers to request structured input from users
 * through the MCP client, such as text fields, confirmations, or form data.
 *
 * @template TArgs - Input field schema type
 * @template TResult - Expected result type from user input
 *
 * @example Simple Text Input
 * ```typescript
 * // In a tool handler:
 * const result = await context.elicitInput(
 *   'Please enter your API key',
 *   {
 *     apiKey: {
 *       type: 'string',
 *       title: 'API Key',
 *       description: 'Your OpenAI API key',
 *       minLength: 10
 *     }
 *   }
 * );
 *
 * if (result.action === 'accept') {
 *   const apiKey = result.content.apiKey;
 *   // Use the API key
 * }
 * ```
 *
 * @example Form-like Input
 * ```typescript
 * const result = await context.elicitInput(
 *   'Configure database connection',
 *   {
 *     host: {
 *       type: 'string',
 *       title: 'Database Host',
 *       description: 'Hostname or IP address',
 *       default: 'localhost'
 *     },
 *     port: {
 *       type: 'integer',
 *       title: 'Port',
 *       description: 'Database port number',
 *       default: 5432,
 *       min: 1,
 *       max: 65535
 *     },
 *     useSSL: {
 *       type: 'boolean',
 *       title: 'Use SSL',
 *       description: 'Enable SSL connection',
 *       default: true
 *     }
 *   }
 * );
 *
 * if (result.action === 'accept') {
 *   const { host, port, useSSL } = result.content;
 *   // Configure database
 * }
 * ```
 *
 * @example Email Input with Validation
 * ```typescript
 * const result = await context.elicitInput(
 *   'Please provide your email address',
 *   {
 *     email: {
 *       type: 'string',
 *       title: 'Email',
 *       description: 'Your email address for notifications',
 *       format: 'email'
 *     }
 *   }
 * );
 * ```
 */
export interface IElicit<TArgs = any, TResult = any> {
  /**
   * The prompt message to show the user
   * This explains what input is being requested and why
   */
  prompt: string;

  /**
   * Input field schema defining what data to collect
   * Uses JSON Schema format with field definitions
   *
   * Each field can be:
   * - string: Text input with optional format validation (email, uri, date, etc.)
   * - number/integer: Numeric input with optional min/max constraints
   * - boolean: Checkbox or toggle input
   */
  args: TArgs;

  /**
   * Expected result structure (for type checking)
   * This is the shape of the data returned when action is 'accept'
   */
  result: TResult;
}

/**
 * Base Server interface
 *
 * Defines server metadata and configuration. The implementation class discovers
 * and registers all tools/prompts/resources automatically via AST parsing.
 *
 * Transport Configuration:
 * - 'stdio': Standard input/output (default, for use with Claude Desktop, etc.)
 * - 'http': HTTP server (requires port configuration)
 *
 * @example Basic Server (stdio)
 * ```typescript
 * interface WeatherServer extends IServer {
 *   name: 'weather-service';
 *   version: '1.0.0';
 *   description: 'Weather information service';
 * }
 *
 * export default class WeatherService implements WeatherServer {
 *   // Tools, prompts, and resources auto-discovered
 * }
 * ```
 *
 * @example HTTP Server
 * ```typescript
 * interface HttpWeatherServer extends IServer {
 *   name: 'weather-service';
 *   version: '1.0.0';
 *   description: 'Weather information service';
 *   transport: 'http';
 *   port: 3000;
 * }
 * ```
 *
 * @example HTTP Server with Authentication
 * ```typescript
 * interface ApiKeyAuth extends IApiKeyAuth {
 *   type: 'apiKey';
 *   keys: [
 *     { name: 'admin', key: 'sk-admin-123', permissions: ['*'] },
 *     { name: 'readonly', key: 'sk-read-456', permissions: ['read:*'] }
 *   ];
 * }
 *
 * interface SecureServer extends IServer {
 *   name: 'secure-service';
 *   version: '1.0.0';
 *   transport: 'http';
 *   port: 3000;
 *   auth: ApiKeyAuth;
 * }
 * ```
 *
 * @example HTTP Server with Stateful Sessions
 * ```typescript
 * interface StatefulServer extends IServer {
 *   name: 'session-service';
 *   version: '1.0.0';
 *   transport: 'http';
 *   port: 3000;
 *   stateful: true; // Enables session-based state management
 * }
 * ```
 */
export interface IServer {
  /**
   * Server name (kebab-case recommended)
   * Required - should be meaningful and descriptive
   */
  name: string;

  /**
   * Semantic version (e.g., '1.0.0')
   * Optional - defaults to '1.0.0' if not specified
   */
  version?: string;

  /**
   * Server description
   * Required - provides documentation for your server
   */
  description: string;

  /**
   * Transport type (OPTIONAL - inferred from config presence)
   *
   * Transport is automatically determined by which config is present:
   * - If `websocket` config exists → WebSocket transport
   * - If `port` or `stateful` exists → HTTP transport
   * - Otherwise → stdio transport (default)
   *
   * You can explicitly set this to override auto-detection, but it's not recommended.
   *
   * @deprecated Prefer implicit transport via config fields
   */
  transport?: 'stdio' | 'http' | 'websocket';

  /**
   * Port number for HTTP transport
   * Required when transport is 'http'
   * Ignored for 'stdio' transport
   *
   * @example
   * ```typescript
   * interface MyServer extends IServer {
   *   transport: 'http';
   *   port: 3000;
   * }
   * ```
   */
  port?: number;

  /**
   * Enable stateful session management for HTTP transport
   * When true, the server maintains session state between requests
   * Ignored for 'stdio' transport
   *
   * Default: false
   *
   * @example
   * ```typescript
   * interface StatefulServer extends IServer {
   *   transport: 'http';
   *   port: 3000;
   *   stateful: true;
   * }
   * ```
   */
  stateful?: boolean;

  /**
   * WebSocket-specific configuration
   * Only applicable when transport is 'websocket'
   * Ignored for other transports
   *
   * @example
   * ```typescript
   * interface WebSocketServer extends IServer {
   *   transport: 'websocket';
   *   websocket: {
   *     port: 8080,
   *     heartbeatInterval: 30000,
   *     heartbeatTimeout: 60000,
   *     maxMessageSize: 10485760
   *   };
   * }
   * ```
   */
  websocket?: {
    /**
     * Port to listen on (default: 8080)
     */
    port?: number;

    /**
     * Heartbeat interval in milliseconds (default: 30000)
     */
    heartbeatInterval?: number;

    /**
     * Heartbeat timeout in milliseconds (default: 60000)
     */
    heartbeatTimeout?: number;

    /**
     * Maximum message size in bytes (default: 10MB)
     */
    maxMessageSize?: number;

    /**
     * WebSocket server options
     */
    wsOptions?: any;
  };

  /**
   * Authentication configuration
   * Only applicable to 'http' transport
   * Ignored for 'stdio' transport
   *
   * @example API Key Authentication
   * ```typescript
   * interface ApiKeyAuth extends IApiKeyAuth {
   *   type: 'apiKey';
   *   keys: [
   *     { name: 'admin', key: 'sk-admin-123', permissions: ['*'] }
   *   ];
   * }
   *
   * interface MyServer extends IServer {
   *   transport: 'http';
   *   port: 3000;
   *   auth: ApiKeyAuth;
   * }
   * ```
   */
  auth?: IAuth;

  /**
   * Control visibility of router-assigned tools in tools/list
   *
   * When false (production mode):
   * - tools/list returns: routers + non-assigned tools only
   * - Assigned tools are hidden from main list
   * - Tools must be called via namespace: `router_name__tool_name`
   * - Cleaner tool list for clients
   *
   * When true (development/testing mode):
   * - tools/list returns: ALL tools including assigned ones
   * - Useful for testing individual tools directly
   * - Tools can be called directly or via namespace
   *
   * Default: false (production mode)
   *
   * @example Production Mode (flattenRouters: false)
   * ```typescript
   * interface ProductionServer extends IServer {
   *   flattenRouters: false; // Or omit (default)
   * }
   *
   * // tools/list returns:
   * // - weather_router (router)
   * // - other_tool (non-assigned tool)
   * // Does NOT return: get_weather, get_forecast (assigned to weather_router)
   *
   * // Call via namespace:
   * // weather_router__get_weather
   * ```
   *
   * @example Development Mode (flattenRouters: true)
   * ```typescript
   * interface DevelopmentServer extends IServer {
   *   flattenRouters: true;
   * }
   *
   * // tools/list returns:
   * // - weather_router (router)
   * // - get_weather (assigned to router)
   * // - get_forecast (assigned to router)
   * // - other_tool (non-assigned tool)
   *
   * // Call directly or via namespace:
   * // get_weather (direct)
   * // weather_router__get_weather (namespaced)
   * ```
   *
   * @since v4.1.0
   */
  flattenRouters?: boolean;
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

/**
 * Type utility to extract argument types from a prompt interface
 */
export type PromptArgs<T extends IPrompt> = T extends { args: infer A } ? A : never;

/**
 * Type utility to extract data type from a resource interface
 */
export type ResourceData<T extends IResource> = T extends IResource<infer D> ? D : never;

/**
 * Base Sampling interface
 *
 * Sampling enables tools to request LLM completions from the client.
 * This is useful for AI-assisted tools that need LLM reasoning or generation.
 *
 * Note: Sampling is NOT defined in the interface layer - it's a runtime capability.
 * The ISampling interface is only for type documentation and convenience exports.
 * To use sampling, access it through the HandlerContext in your tool implementation.
 *
 * @template TMessages - Message array type
 * @template TOptions - Sampling options type
 *
 * @example Using Sampling in a Tool
 * ```typescript
 * interface AnalyzeTool extends ITool {
 *   name: 'analyze_code';
 *   description: 'Analyze code with AI assistance';
 *   params: { code: string };
 *   result: { analysis: string };
 * }
 *
 * export default class MyServer implements IServer {
 *   analyzeTool: AnalyzeTool = async (params, context) => {
 *     if (!context.sample) {
 *       return { analysis: 'Sampling not available' };
 *     }
 *
 *     const result = await context.sample(
 *       [
 *         {
 *           role: 'user',
 *           content: {
 *             type: 'text',
 *             text: `Analyze this code:\n${params.code}`
 *           }
 *         }
 *       ],
 *       { maxTokens: 500, temperature: 0.7 }
 *     );
 *
 *     return { analysis: result.content.text };
 *   }
 * }
 * ```
 *
 * @example Simple Text Request
 * ```typescript
 * const result = await context.sample([
 *   {
 *     role: 'user',
 *     content: { type: 'text', text: 'What is TypeScript?' }
 *   }
 * ]);
 * ```
 *
 * @example Multi-turn Conversation
 * ```typescript
 * const result = await context.sample([
 *   {
 *     role: 'user',
 *     content: { type: 'text', text: 'What is MCP?' }
 *   },
 *   {
 *     role: 'assistant',
 *     content: { type: 'text', text: 'MCP is Model Context Protocol...' }
 *   },
 *   {
 *     role: 'user',
 *     content: { type: 'text', text: 'Can you explain it simply?' }
 *   }
 * ], { maxTokens: 200, temperature: 0.5 });
 * ```
 *
 * @example With Sampling Options
 * ```typescript
 * const result = await context.sample(
 *   [{ role: 'user', content: { type: 'text', text: 'Hello' } }],
 *   {
 *     maxTokens: 1000,
 *     temperature: 0.7,
 *     topP: 0.9,
 *     stopSequences: ['\n\n']
 *   }
 * );
 * ```
 */
export interface ISampling<TMessages = any, TOptions = any> {
  /**
   * Array of messages for the LLM conversation
   * Each message has a role ('user' or 'assistant') and content
   */
  messages: TMessages;

  /**
   * Optional sampling parameters to control LLM generation
   */
  options?: TOptions;
}

/**
 * Sampling message structure
 * Used in LLM completion requests via context.sample()
 */
export interface ISamplingMessage {
  /**
   * Message role - who is speaking
   */
  role: 'user' | 'assistant';

  /**
   * Message content - what is being said
   */
  content: {
    /**
     * Content type - typically 'text'
     */
    type: string;

    /**
     * Text content of the message
     */
    text?: string;

    /**
     * Base64-encoded data (for images, audio, etc.)
     */
    data?: string;

    /**
     * MIME type of the data
     */
    mimeType?: string;

    /**
     * Additional fields
     */
    [key: string]: unknown;
  };
}

/**
 * Sampling options for controlling LLM generation
 */
export interface ISamplingOptions {
  /**
   * Maximum number of tokens to generate
   */
  maxTokens?: number;

  /**
   * Temperature for sampling (0.0 = deterministic, 1.0 = creative)
   * Higher values make output more random
   */
  temperature?: number;

  /**
   * Top-p nucleus sampling threshold
   * Only consider tokens with cumulative probability up to this value
   */
  topP?: number;

  /**
   * Top-k sampling - only consider top k tokens
   */
  topK?: number;

  /**
   * Stop sequences - generation stops when any sequence is encountered
   */
  stopSequences?: string[];

  /**
   * Additional metadata for the sampling request
   */
  metadata?: Record<string, unknown>;

  /**
   * Additional options
   */
  [key: string]: unknown;
}

/**
 * UI Resource Definition
 *
 * Defines a UI resource that can be rendered as an interactive UI element.
 * Used with IUIResourceProvider interface for class-based UI resource definitions.
 */
export interface UIResourceDefinition {
  /**
   * UI resource URI (must start with "ui://")
   */
  uri: string;

  /**
   * Display name for the UI resource
   */
  name: string;

  /**
   * Description of what this UI resource does
   */
  description: string;

  /**
   * MIME type indicating rendering method:
   * - text/html: Inline HTML content
   * - text/uri-list: External URL
   * - application/vnd.mcp-ui.remote-dom+javascript: Remote DOM
   */
  mimeType: 'text/html' | 'text/uri-list' | 'application/vnd.mcp-ui.remote-dom+javascript';

  /**
   * Content - can be static string or dynamic function
   */
  content: string | (() => string | Promise<string>);
}

/**
 * UI Resource Provider Interface
 *
 * Implement this interface in your server class to provide UI resources
 * that can be rendered as interactive UI elements in MCP clients.
 *
 * The getUIResources() method is called during server initialization to
 * register all UI resources automatically.
 *
 * @example
 * ```typescript
 * import type { IServer, IUIResourceProvider, UIResourceDefinition } from 'simply-mcp';
 *
 * interface MyServer extends IServer {
 *   name: 'my-server';
 *   version: '1.0.0';
 * }
 *
 * export default class MyServerImpl implements MyServer, IUIResourceProvider {
 *   // Static HTML UI resource
 *   getUIResources(): UIResourceDefinition[] {
 *     return [
 *       {
 *         uri: 'ui://form/feedback',
 *         name: 'Feedback Form',
 *         description: 'User feedback form',
 *         mimeType: 'text/html',
 *         content: '<form><h2>Feedback</h2><textarea></textarea></form>'
 *       },
 *       {
 *         uri: 'ui://dashboard/stats',
 *         name: 'Stats Dashboard',
 *         description: 'Live statistics',
 *         mimeType: 'text/html',
 *         content: async () => {
 *           const stats = await this.getStats();
 *           return `<div><h1>Users: ${stats.users}</h1></div>`;
 *         }
 *       },
 *       {
 *         uri: 'ui://analytics/dashboard',
 *         name: 'Analytics Dashboard',
 *         description: 'External analytics',
 *         mimeType: 'text/uri-list',
 *         content: 'https://analytics.example.com/dashboard'
 *       },
 *       {
 *         uri: 'ui://counter/v1',
 *         name: 'Interactive Counter',
 *         description: 'Counter component',
 *         mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
 *         content: `
 *           const card = remoteDOM.createElement('div', { style: { padding: '20px' } });
 *           const title = remoteDOM.createElement('h2');
 *           remoteDOM.setTextContent(title, 'Counter');
 *           remoteDOM.appendChild(card, title);
 *         `
 *       }
 *     ];
 *   }
 *
 *   private async getStats() {
 *     return { users: 42 };
 *   }
 * }
 * ```
 *
 * @note The server implementation automatically validates UI resource URIs
 *       and MIME types during registration.
 */
export interface IUIResourceProvider {
  /**
   * Return array of UI resource definitions
   *
   * This method is called during server initialization to register
   * all UI resources. Each definition is validated to ensure:
   * - URI starts with "ui://"
   * - MIME type is one of the valid UI resource types
   * - Content is provided (static or dynamic)
   */
  getUIResources(): UIResourceDefinition[];
}

/**
 * Base Subscription interface
 *
 * Subscriptions allow clients to subscribe to resource updates and receive
 * notifications when subscribed resources change.
 *
 * The subscription pattern works as follows:
 * 1. Client sends resources/subscribe request with a resource URI
 * 2. Server tracks the subscription (stores which URIs are subscribed)
 * 3. When a resource changes, server sends notifications/resources/updated
 * 4. Client can unsubscribe with resources/unsubscribe request
 *
 * For the foundation layer, we support exact URI matching only.
 * Future layers may add pattern matching (e.g., "file://**\/*.ts").
 *
 * @example Static Subscription (no handler needed)
 * ```typescript
 * interface ConfigSubscription extends ISubscription {
 *   uri: 'config://server';
 *   description: 'Server configuration changes';
 * }
 * ```
 *
 * @example Dynamic Subscription with Handler
 * ```typescript
 * interface LogSubscription extends ISubscription {
 *   uri: 'log://events';
 *   description: 'Real-time log events';
 *   handler: () => void;  // Called when subscription is activated
 * }
 *
 * class MyServer implements IServer {
 *   'log://events': LogSubscription = () => {
 *     // Start monitoring logs, emit updates via notifyResourceUpdate
 *   }
 * }
 * ```
 */
export interface ISubscription {
  /**
   * Resource URI pattern to subscribe to
   *
   * Foundation layer supports exact URI matching only.
   * The URI should match a resource registered with IResource.
   *
   * Examples:
   * - 'config://server'
   * - 'stats://current'
   * - 'log://events'
   */
  uri: string;

  /**
   * Human-readable description of what changes trigger updates
   */
  description: string;

  /**
   * Optional handler called when subscription is activated
   * Use this for subscriptions that need to start monitoring or polling
   * when a client subscribes.
   */
  handler?: () => void | Promise<void>;
}

/**
 * IUI v4.0 - Ultra-Minimal UI Interface
 *
 * Radical simplification: 30+ fields → 6 fields
 *
 * Key changes in v4.0:
 * - Single `source` field replaces html, file, component, externalUrl, remoteDom
 * - Auto-infer dependencies from imports (no manual declaration)
 * - Build config moved to simply-mcp.config.ts (zero-config defaults)
 * - Removed: dependencies, stylesheets, scripts, bundle, minify, cdn, performance, theme
 *
 * The compiler auto-detects source type and infers all dependencies.
 * Just specify WHAT to render, not HOW to build it.
 *
 * @template TData - Data type for dynamic UI (ignored for static)
 *
 * @example Inline HTML
 * ```typescript
 * interface ProductSelectorUI extends IUI {
 *   uri: 'ui://products/selector';
 *   name: 'Product Selector';
 *   description: 'Select a product from the catalog';
 *   html: `
 *     <div style="padding: 20px;">
 *       <h2>Choose a Product</h2>
 *       <button onclick="callTool('select_product', { id: 'widget-a' })">
 *         Widget A - $99
 *       </button>
 *       <button onclick="callTool('select_product', { id: 'widget-b' })">
 *         Widget B - $149
 *       </button>
 *     </div>
 *   `;
 *   tools: ['select_product'];
 * }
 * ```
 *
 * @example Static with Inline CSS
 * ```typescript
 * interface DashboardUI extends IUI {
 *   uri: 'ui://dashboard/main';
 *   name: 'Main Dashboard';
 *   description: 'Server statistics dashboard';
 *   html: '<div class="dashboard">...</div>';
 *   css: `
 *     .dashboard { display: grid; gap: 20px; }
 *     .card { padding: 16px; border-radius: 8px; }
 *   `;
 *   tools: ['get_stats', 'refresh_data'];
 * }
 * ```
 *
 * @example Dynamic UI (Server-Generated)
 * ```typescript
 * interface StatsUI extends IUI {
 *   uri: 'ui://stats/live';
 *   name: 'Live Statistics';
 *   description: 'Real-time server stats';
 *   dynamic: true;
 *   tools: ['reset_counter'];
 *   data: string; // Type hint for return value
 * }
 *
 * export default class MyServer implements IServer {
 *   'ui://stats/live': StatsUI = async () => {
 *     const stats = await this.getStats();
 *     return `
 *       <div>
 *         <h1>Server Stats</h1>
 *         <p>Requests: ${stats.requestCount}</p>
 *         <button onclick="callTool('reset_counter', {})">Reset</button>
 *       </div>
 *     `;
 *   }
 * }
 * ```
 *
 * @example Subscribable UI (Live Updates)
 * ```typescript
 * interface LiveChartUI extends IUI {
 *   uri: 'ui://charts/live';
 *   name: 'Live Chart';
 *   description: 'Real-time data chart';
 *   dynamic: true;
 *   subscribable: true;
 *   tools: ['pause_updates', 'resume_updates'];
 *   data: string;
 * }
 *
 * export default class MyServer implements IServer {
 *   'ui://charts/live': LiveChartUI = async () => {
 *     const data = await this.fetchLiveData();
 *     return `<div id="chart">${this.renderChart(data)}</div>`;
 *   }
 *
 *   // Trigger update from anywhere in your code
 *   async onDataUpdate() {
 *     await this.notifyResourceUpdate('ui://charts/live');
 *   }
 * }
 * ```
 *
 * @example Size Hints
 * ```typescript
 * interface MapUI extends IUI {
 *   uri: 'ui://map/viewer';
 *   name: 'Map Viewer';
 *   description: 'Interactive map';
 *   html: '<div id="map">...</div>';
 *   size: { width: 800, height: 600 };
 *   tools: ['zoom_in', 'zoom_out', 'set_marker'];
 * }
 * ```
 *
 * @example File-based UI with external HTML/CSS/JS (Feature Layer)
 * ```typescript
 * interface ProductCatalog extends IUI {
 *   uri: 'ui://products/catalog';
 *   name: 'Product Catalog';
 *   description: 'Browse and filter products with advanced search';
 *   file: './ui/catalog.html';
 *   stylesheets: ['./styles/theme.css', './styles/catalog.css'];
 *   scripts: ['./ui/catalog.js'];
 *   tools: ['search_products', 'filter_by_category', 'add_to_cart'];
 *   size: { width: 1024, height: 768 };
 * }
 * ```
 *
 * @example React Component UI (Feature Layer)
 * ```typescript
 * interface Dashboard extends IUI {
 *   uri: 'ui://dashboard/v1';
 *   name: 'Analytics Dashboard';
 *   description: 'Real-time analytics with interactive charts';
 *   component: './components/Dashboard.tsx';
 *   dependencies: ['recharts', 'date-fns'];
 *   stylesheets: ['./styles/dashboard.css'];
 *   tools: ['fetch_analytics', 'export_report', 'filter_data'];
 *   subscribable: true;
 *   size: { width: 1280, height: 900 };
 * }
 * ```
 *
 * @example Combined External Resources (Feature Layer)
 * ```typescript
 * interface VideoEditor extends IUI {
 *   uri: 'ui://video/editor';
 *   name: 'Video Editor';
 *   description: 'Timeline-based video editing interface';
 *   file: './ui/editor.html';
 *   stylesheets: [
 *     './styles/reset.css',
 *     './styles/theme.css',
 *     './styles/editor.css'
 *   ];
 *   scripts: [
 *     './lib/video-player.js',
 *     './lib/timeline.js',
 *     './ui/editor-controls.js'
 *   ];
 *   tools: ['trim_video', 'add_effect', 'export_video'];
 *   size: { width: 1600, height: 1000 };
 * }
 * ```
 *
 * Field Validation Rules:
 * - `html`, `file`, and `component` are mutually exclusive (only one allowed)
 * - If `component` is set, React compiler will be loaded automatically
 * - If `file` is set, file resolver will be loaded
 * - All file paths must be relative (no absolute paths)
 * - File paths are resolved relative to the server file location
 * - `dependencies` only applies when using `component`
 * - `script` and `scripts` can be used together (script loads first)
 * - `css` and `stylesheets` can be used together (stylesheets load first)
 */
export interface IUI<TData = any> {
  /**
   * UI resource URI (must start with "ui://")
   *
   * Convention: ui://category/name
   * Examples: ui://dashboard/main, ui://forms/feedback
   */
  uri: string;

  /**
   * Human-readable UI name
   */
  name: string;

  /**
   * UI description (what it does)
   */
  description: string;

  /**
   * UI source - auto-detected type based on content
   *
   * Can be:
   * - External URL: 'https://example.com/dashboard'
   * - Inline HTML: '<div>Hello World</div>'
   * - Inline Remote DOM JSON: '{"type":"div","children":["Hello"]}'
   * - HTML file: './pages/dashboard.html'
   * - React component: './components/Dashboard.tsx'
   * - Folder: './ui/dashboard/' (looks for index.html)
   *
   * The compiler auto-detects the type and handles accordingly.
   * Dependencies, stylesheets, scripts are auto-inferred from imports.
   *
   * @example External URL
   * ```typescript
   * source: 'https://analytics.example.com/dashboard'
   * ```
   *
   * @example Inline HTML
   * ```typescript
   * source: '<div><h1>Hello</h1><button>Click</button></div>'
   * ```
   *
   * @example React Component
   * ```typescript
   * source: './components/Dashboard.tsx'
   * // Dependencies auto-inferred from imports in Dashboard.tsx
   * ```
   *
   * @example Folder
   * ```typescript
   * source: './ui/dashboard/'
   * // Loads index.html and bundles all assets
   * ```
   */
  source?: string;

  /**
   * Inline CSS styles (only for inline HTML)
   * Optional - applied via <style> tag in iframe
   *
   * For file-based sources, use CSS imports in the file instead.
   */
  css?: string;

  /**
   * Array of tool names this UI can call
   *
   * Security: Only these tools are accessible via callTool()
   * Tool names must match registered ITool names exactly
   *
   * @example ['get_weather', 'set_location', 'refresh_data']
   */
  tools?: string[];

  /**
   * Preferred UI size (rendering hint)
   * Client may adjust based on available space
   */
  size?: {
    width?: number;
    height?: number;
  };

  /**
   * Whether this UI resource supports subscriptions
   * When true, client can subscribe to updates via resources/subscribe
   *
   * Server triggers updates by calling notifyResourceUpdate(uri)
   * Client automatically refetches UI content on notification
   */
  subscribable?: boolean;

  /**
   * Callable signature - implementation for dynamic UI
   * Returns content string (HTML, URL, Remote DOM JSON, or file path)
   */
  (): TData | Promise<TData>;
}

/**
 * Router Tool Definition
 *
 * Routers are organizational tools that group related tools together.
 * They appear as special tools in the MCP tools list, but when called,
 * they return a list of their assigned tools.
 *
 * Note: Routers are an operational concern (not a type definition concern).
 * Use the Interface API's programmatic methods to add routers after loading
 * your server definition.
 *
 * @example
 * ```typescript
 * import { loadInterfaceServer } from 'simply-mcp';
 *
 * const server = await loadInterfaceServer({ filePath: './server.ts' });
 *
 * // Add routers programmatically (after tools are loaded)
 * server
 *   .addRouterTool({
 *     name: 'weather_tools',
 *     description: 'Weather information tools',
 *     tools: ['get_weather', 'get_forecast']
 *   })
 *   .assignTools('weather_tools', ['get_weather', 'get_forecast']);
 *
 * await server.start();
 * ```
 */
export type RouterToolDefinition = ProgrammaticRouterToolDefinition;

/**
 * Base Authentication Configuration Interface
 *
 * Base interface for all authentication configurations using the discriminated
 * union pattern. The `type` field determines which authentication strategy is used.
 *
 * Extend this interface to create specific authentication configurations:
 * - 'apiKey': API key-based authentication (see IApiKeyAuth)
 * - 'oauth2': OAuth 2.0 authentication (future)
 * - 'database': Database-backed authentication (future)
 * - 'custom': Custom authentication strategy (future)
 *
 * @example API Key Authentication
 * ```typescript
 * interface MyAuth extends IApiKeyAuth {
 *   type: 'apiKey';
 *   keys: [
 *     { name: 'admin', key: 'sk-admin-123', permissions: ['*'] },
 *     { name: 'readonly', key: 'sk-read-456', permissions: ['read:*'] }
 *   ];
 * }
 *
 * interface MyServer extends IServer {
 *   name: 'my-server';
 *   version: '1.0.0';
 *   transport: 'http';
 *   port: 3000;
 *   auth: MyAuth;
 * }
 * ```
 *
 * @example Future OAuth2 (for reference)
 * ```typescript
 * // This will be supported in future versions
 * interface OAuth2Auth extends IAuth {
 *   type: 'oauth2';
 *   clientId: string;
 *   clientSecret: string;
 *   authorizationUrl: string;
 *   tokenUrl: string;
 * }
 * ```
 */
export interface IAuth {
  /**
   * Authentication type discriminator
   *
   * Determines which authentication strategy is used:
   * - 'apiKey': API key-based authentication
   * - 'oauth2': OAuth 2.0 (future)
   * - 'database': Database authentication (future)
   * - 'custom': Custom strategy (future)
   */
  type: 'apiKey' | 'oauth2' | 'database' | 'custom';
}

/**
 * API Key Configuration for a single key
 */
export interface IApiKeyConfig {
  /**
   * Human-readable name for this API key
   * Used for identification in logs and audit trails
   */
  name: string;

  /**
   * The actual API key string
   * Should be a securely generated random string (e.g., 'sk-admin-abc123...')
   */
  key: string;

  /**
   * Permissions granted to this API key
   *
   * Use '*' for all permissions, or specify granular permissions:
   * - 'read:*': Read access to all resources
   * - 'write:*': Write access to all resources
   * - 'tool:weather': Access to specific tool
   * - 'resource:config': Access to specific resource
   */
  permissions: string[];
}

/**
 * API Key Authentication Configuration
 *
 * Provides API key-based authentication for HTTP transport.
 * Multiple API keys can be configured with different permission levels.
 *
 * @example Basic API Key Auth
 * ```typescript
 * interface ApiKeyAuth extends IApiKeyAuth {
 *   type: 'apiKey';
 *   keys: [
 *     { name: 'admin', key: 'sk-admin-123', permissions: ['*'] }
 *   ];
 * }
 *
 * interface MyServer extends IServer {
 *   name: 'my-server';
 *   version: '1.0.0';
 *   transport: 'http';
 *   port: 3000;
 *   auth: ApiKeyAuth;
 * }
 * ```
 *
 * @example Multiple Keys with Different Permissions
 * ```typescript
 * interface MultiKeyAuth extends IApiKeyAuth {
 *   type: 'apiKey';
 *   headerName: 'x-api-key';
 *   keys: [
 *     { name: 'admin', key: 'sk-admin-xyz', permissions: ['*'] },
 *     { name: 'readonly', key: 'sk-read-abc', permissions: ['read:*'] },
 *     { name: 'weather', key: 'sk-weather-def', permissions: ['tool:get_weather', 'tool:get_forecast'] }
 *   ];
 *   allowAnonymous: false;
 * }
 * ```
 *
 * @example Allow Anonymous Access
 * ```typescript
 * interface OptionalAuth extends IApiKeyAuth {
 *   type: 'apiKey';
 *   keys: [
 *     { name: 'premium', key: 'sk-premium-123', permissions: ['*'] }
 *   ];
 *   allowAnonymous: true; // Unauthenticated requests allowed with limited access
 * }
 * ```
 */
export interface IApiKeyAuth extends IAuth {
  /**
   * Authentication type - must be 'apiKey'
   */
  type: 'apiKey';

  /**
   * HTTP header name for the API key
   * Default: 'x-api-key'
   *
   * @example
   * - 'x-api-key' (default)
   * - 'Authorization' (if using Bearer token pattern)
   * - 'x-custom-auth-token'
   */
  headerName?: string;

  /**
   * Array of valid API keys with their permissions
   * At least one key must be configured
   */
  keys: IApiKeyConfig[];

  /**
   * Whether to allow anonymous (unauthenticated) requests
   * Default: false
   *
   * When true, requests without an API key are allowed but receive
   * limited permissions (typically read-only access to public resources).
   * When false, all requests must include a valid API key.
   */
  allowAnonymous?: boolean;
}

/**
 * OAuth Client Configuration
 *
 * Defines a registered OAuth 2.1 client that can authenticate with the server.
 * Each client has unique credentials, allowed redirect URIs, and scopes.
 *
 * @example Web Application Client
 * ```typescript
 * const webClient: IOAuthClient = {
 *   clientId: 'web-app-123',
 *   clientSecret: process.env.WEB_CLIENT_SECRET!,
 *   redirectUris: ['https://app.example.com/oauth/callback'],
 *   scopes: ['read', 'write', 'tools:execute'],
 *   name: 'Main Web Application'
 * };
 * ```
 *
 * @example CLI Tool Client
 * ```typescript
 * const cliClient: IOAuthClient = {
 *   clientId: 'cli-tool',
 *   clientSecret: process.env.CLI_CLIENT_SECRET!,
 *   redirectUris: ['http://localhost:3000/callback'],
 *   scopes: ['read', 'write'],
 *   name: 'CLI Tool'
 * };
 * ```
 */
export interface IOAuthClient {
  /**
   * OAuth client ID (unique identifier)
   *
   * This is a public identifier for the client application.
   * Use a descriptive, unique string (e.g., 'web-app-123', 'mobile-client').
   */
  clientId: string;

  /**
   * Client secret (will be hashed with bcrypt)
   *
   * SECURITY WARNING: In production, ALWAYS load from environment variables.
   * NEVER hardcode secrets in source code or commit them to version control.
   *
   * @example Good Practice
   * ```typescript
   * clientSecret: process.env.OAUTH_CLIENT_SECRET!
   * ```
   *
   * @example BAD - Never Do This
   * ```typescript
   * clientSecret: 'my-secret-123'  // ❌ DON'T hardcode!
   * ```
   */
  clientSecret: string;

  /**
   * Allowed redirect URIs for this client
   *
   * Authorization codes can ONLY be sent to URIs in this list.
   * This prevents authorization code interception attacks.
   *
   * @example Development and Production URIs
   * ```typescript
   * redirectUris: [
   *   'http://localhost:3000/callback',           // Dev
   *   'https://app.example.com/oauth/callback'    // Prod
   * ]
   * ```
   */
  redirectUris: string[];

  /**
   * Scopes this client is allowed to request
   *
   * Defines what permissions this client can request during authorization.
   * Use domain-specific scopes for fine-grained access control.
   *
   * @example Granular Scopes
   * ```typescript
   * scopes: [
   *   'read',              // Read access
   *   'write',             // Write access
   *   'tools:execute',     // Execute tools
   *   'admin:users'        // Admin user management
   * ]
   * ```
   */
  scopes: string[];

  /**
   * Optional: Client name for display purposes
   *
   * Human-readable name shown in logs, audit trails, and authorization screens.
   */
  name?: string;
}

/**
 * OAuth 2.1 Authentication Configuration
 *
 * Provides OAuth 2.1 authentication using the MCP SDK's OAuth infrastructure.
 * Supports multiple clients, PKCE (Proof Key for Code Exchange), and token refresh.
 *
 * OAuth 2.1 includes security best practices:
 * - PKCE required for all clients (prevents authorization code interception)
 * - No implicit flow (authorization code flow only)
 * - Refresh token rotation (enhances security)
 *
 * @example Basic OAuth Server
 * ```typescript
 * interface OAuthAuth extends IOAuth2Auth {
 *   type: 'oauth2';
 *   issuerUrl: 'https://auth.example.com';
 *   clients: [
 *     {
 *       clientId: 'web-app';
 *       clientSecret: process.env.WEB_CLIENT_SECRET!;
 *       redirectUris: ['https://app.example.com/callback'];
 *       scopes: ['read', 'write'];
 *     }
 *   ];
 * }
 *
 * interface MyServer extends IServer {
 *   name: 'oauth-server';
 *   transport: 'http';
 *   port: 3000;
 *   auth: OAuthAuth;
 * }
 * ```
 *
 * @example Multiple Clients with Custom Expirations
 * ```typescript
 * interface MultiClientAuth extends IOAuth2Auth {
 *   type: 'oauth2';
 *   issuerUrl: 'http://localhost:3000';
 *   clients: [
 *     {
 *       clientId: 'admin-dashboard';
 *       clientSecret: process.env.ADMIN_SECRET!;
 *       redirectUris: ['https://admin.example.com/oauth'];
 *       scopes: ['admin', 'read', 'write'];
 *       name: 'Admin Dashboard';
 *     },
 *     {
 *       clientId: 'mobile-app';
 *       clientSecret: process.env.MOBILE_SECRET!;
 *       redirectUris: ['myapp://oauth/callback'];
 *       scopes: ['read'];
 *       name: 'Mobile App';
 *     }
 *   ];
 *   tokenExpiration: 7200;        // 2 hours
 *   refreshTokenExpiration: 604800; // 7 days
 * }
 * ```
 */
export interface IOAuth2Auth extends IAuth {
  /**
   * Authentication type - must be 'oauth2'
   */
  type: 'oauth2';

  /**
   * OAuth issuer URL (e.g., 'https://auth.example.com' or 'http://localhost:3000')
   *
   * This URL is used in OAuth metadata and token claims (iss claim).
   * It should be the base URL of your OAuth authorization server.
   *
   * @example Production
   * ```typescript
   * issuerUrl: 'https://auth.example.com'
   * ```
   *
   * @example Development
   * ```typescript
   * issuerUrl: 'http://localhost:3000'
   * ```
   */
  issuerUrl: string;

  /**
   * Registered OAuth clients
   *
   * Each client represents an application that can authenticate users.
   * Configure multiple clients for different applications (web, mobile, CLI, etc.).
   */
  clients: IOAuthClient[];

  /**
   * Access token expiration in seconds
   *
   * Default: 3600 (1 hour)
   *
   * Access tokens are short-lived for security. When expired, clients use
   * the refresh token to obtain a new access token without re-authentication.
   *
   * @example Short-lived tokens (more secure)
   * ```typescript
   * tokenExpiration: 900  // 15 minutes
   * ```
   *
   * @example Long-lived tokens (less secure, more convenient)
   * ```typescript
   * tokenExpiration: 7200  // 2 hours
   * ```
   */
  tokenExpiration?: number;

  /**
   * Refresh token expiration in seconds
   *
   * Default: 86400 (24 hours)
   *
   * Refresh tokens are long-lived and used to obtain new access tokens.
   * They should expire eventually to require periodic re-authentication.
   *
   * @example 7 days
   * ```typescript
   * refreshTokenExpiration: 604800
   * ```
   */
  refreshTokenExpiration?: number;

  /**
   * Authorization code expiration in seconds
   *
   * Default: 600 (10 minutes)
   *
   * Authorization codes are single-use and should be short-lived.
   * They are exchanged for tokens immediately after authorization.
   *
   * @example Very short-lived (more secure)
   * ```typescript
   * codeExpiration: 300  // 5 minutes
   * ```
   */
  codeExpiration?: number;
}

/**
 * Base Completion interface
 *
 * Completions provide autocomplete suggestions for prompt arguments.
 * Servers implement completion handlers to suggest values as users type.
 *
 * @template TArg - Argument reference type
 * @template TSuggestions - Suggestion result type
 *
 * @example City Name Completion
 * ```typescript
 * interface CityCompletion extends ICompletion {
 *   name: 'city_autocomplete';
 *   description: 'Autocomplete city names';
 *   ref: { type: 'argument'; name: 'city' };  // Which argument to complete
 *   complete: (value: string) => Promise<string[]>;  // Generate suggestions
 * }
 *
 * // Returns: ['New York', 'New Orleans', 'Newark'] when value = 'New'
 * ```
 */
/**
 * Completion interface for providing autocomplete suggestions.
 *
 * The interface defines metadata (name, description, ref) while the implementation
 * can be just the completion function itself, following the ITool pattern.
 *
 * @example Function-Based Pattern (Recommended)
 * ```typescript
 * interface CityCompletion extends ICompletion<string[]> {
 *   name: 'city_autocomplete';
 *   description: 'Autocomplete city names';
 *   ref: { type: 'argument'; name: 'city' };
 * }
 *
 * export default class MyServer implements IServer {
 *   // Implementation is just the handler function
 *   cityAutocomplete: CityCompletion = async (value: string) => {
 *     const cities = ['New York', 'Los Angeles', 'London'];
 *     return cities.filter(c => c.toLowerCase().startsWith(value.toLowerCase()));
 *   };
 * }
 * ```
 *
 * @example Object Literal Pattern (Also Supported)
 * ```typescript
 * cityAutocomplete: CityCompletion = {
 *   name: 'city_autocomplete',
 *   description: 'Autocomplete city names',
 *   ref: { type: 'argument', name: 'city' },
 *   complete: async (value: string) => { ... }
 * };
 * ```
 */
export interface ICompletion<TSuggestions = any> {
  /**
   * Name identifier for this completion handler
   */
  name: string;

  /**
   * Description of what this completion provides
   */
  description: string;

  /**
   * Reference to what is being completed
   * - { type: 'argument', name: 'argName' } - For prompt arguments
   * - { type: 'resource', name: 'resourceUri' } - For resource URIs
   */
  ref: { type: 'argument' | 'resource'; name: string };

  /**
   * Completion function that generates suggestions
   * @param value - Current partial value being typed
   * @param context - Optional context (argument name, other argument values, etc.)
   * @returns Array of completion suggestions
   *
   * Note: When implementing ICompletion, you can assign just this function
   * directly to the property, and the framework will extract metadata from
   * the interface definition.
   */
  (value: string, context?: any): TSuggestions | Promise<TSuggestions>;
}

/**
 * Base Roots interface
 *
 * Roots allow servers to request the client's working directories/context scopes.
 * This helps servers understand the client's file system context for file-based operations.
 *
 * Note: The roots protocol is a server-to-client request capability.
 * Use context.listRoots() within tool handlers to fetch the client's roots.
 *
 * @example Simple Roots Request
 * ```typescript
 * interface ProjectRoots extends IRoots {
 *   name: 'project_roots';
 *   description: 'Get project root directories';
 * }
 *
 * // Usage in a tool
 * const roots = await context.listRoots();
 * // Returns: [{ uri: 'file:///home/user/project', name: 'My Project' }]
 * ```
 */
export interface IRoots {
  /**
   * Human-readable name for this roots request
   */
  name: string;

  /**
   * Description of what the roots are used for
   */
  description: string;

  /**
   * Callable signature for dynamic roots
   */
  (): Array<{ uri: string; name?: string }> | Promise<Array<{ uri: string; name?: string }>>;
}

/**
 * Re-export MCP PromptMessage type for user convenience
 *
 * Import this type when creating advanced prompts with multi-message conversations.
 *
 * @example
 * ```typescript
 * import type { IPrompt, PromptMessage } from 'simply-mcp';
 *
 * interface TutorialPrompt extends IPrompt {
 *   name: 'tutorial';
 *   args: { topic: { description: 'Topic to teach' } };
 * }
 *
 * tutorial: TutorialPrompt = (args): PromptMessage[] => {
 *   return [
 *     { role: 'user', content: { type: 'text', text: `Teach me ${args.topic}` } },
 *     { role: 'assistant', content: { type: 'text', text: 'Here is an example...' } }
 *   ];
 * };
 * ```
 */
/**
 * Simplified message format for easier prompt authoring
 *
 * Instead of writing full PromptMessage objects, use:
 * - { user: 'text' } for user messages
 * - { assistant: 'text' } for assistant messages
 *
 * The framework automatically converts these to the full PromptMessage format.
 *
 * @example
 * ```typescript
 * tutorial: TutorialPrompt = (args) => [
 *   { user: `Teach me about ${args.topic}` },
 *   { assistant: 'Here is an example...' },
 *   { user: 'Show me more!' }
 * ];
 * ```
 *
 * Future extensions may include: { image: url }, { audio: data }, etc.
 */
export type SimpleMessage =
  | { user: string }
  | { assistant: string };

export type { PromptMessage };

/**
 * Tool Router Interface - Groups related tools for better organization
 *
 * Routers are organizational structures that group related tools together,
 * providing a table of contents for tool discovery. Tools can be assigned
 * to multiple routers.
 *
 * **Key Features:**
 * - Simple, declarative syntax - no generic types needed
 * - Reference tools by their ITool interface types
 * - No implementation required (metadata-only)
 * - Tools callable via namespace: `router_name__tool_name`
 * - Visibility controlled by `flattenRouters` server option
 *
 * **Important:** Unlike ITool, routers do NOT require implementation.
 * Simply declare with definite assignment operator (!):
 * ```typescript
 * weatherRouter!: WeatherRouter;
 * ```
 *
 * @example Basic Router
 * ```typescript
 * import type { IServer, ITool, IToolRouter } from 'simply-mcp';
 *
 * // Define tools
 * interface GetWeatherTool extends ITool {
 *   name: 'get_weather';
 *   description: 'Get current weather';
 *   params: { location: string };
 *   result: { temperature: number };
 * }
 *
 * interface GetForecastTool extends ITool {
 *   name: 'get_forecast';
 *   description: 'Get weather forecast';
 *   params: { location: string; days: number };
 *   result: { forecast: string[] };
 * }
 *
 * // Define router - simple and clean!
 * interface WeatherRouter extends IToolRouter {
 *   name: 'weather_router';  // Optional - inferred from property name if omitted
 *   description: 'Weather information tools';
 *   tools: [GetWeatherTool, GetForecastTool];  // Reference the tool interfaces directly
 * }
 *
 * // Server implementation
 * export default class WeatherService implements IServer {
 *   name = 'weather-service';
 *   version = '1.0.0';
 *   description = 'Weather information service';
 *   flattenRouters = false; // Hide assigned tools from main list
 *
 *   // Tool implementations
 *   getWeather: GetWeatherTool = async (params) => {
 *     return { temperature: 72 };
 *   };
 *
 *   getForecast: GetForecastTool = async (params) => {
 *     return { forecast: ['Sunny', 'Cloudy', 'Rainy'] };
 *   };
 *
 *   // Router - NO implementation needed!
 *   weatherRouter!: WeatherRouter;
 * }
 * ```
 *
 * @example Router with Metadata
 * ```typescript
 * interface ApiRouter extends IToolRouter {
 *   name: 'api_router';
 *   description: 'API interaction tools';
 *   tools: [CallApiTool, ListEndpointsTool, GetSchemaTool];
 *   metadata: {
 *     category: 'api';
 *     tags: ['rest', 'http', 'endpoints'];
 *     order: 1;
 *   };
 * }
 * ```
 *
 * @example Multi-Router Assignment
 * ```typescript
 * // Same tool can be in multiple routers
 * interface AdminRouter extends IToolRouter {
 *   description: 'Admin tools';
 *   tools: [ViewLogsTool, DeleteUserTool];
 * }
 *
 * interface DeveloperRouter extends IToolRouter {
 *   description: 'Developer tools';
 *   tools: [ViewLogsTool, RunQueryTool];  // ViewLogsTool appears in both!
 * }
 * ```
 *
 * @see {@link https://github.com/your-repo/docs/guides/ROUTER_TOOLS.md} Router Tools Guide
 * @see {@link https://github.com/your-repo/docs/guides/ROUTER_MIGRATION.md} Migration Guide
 * @since v4.1.0
 */
export interface IToolRouter {
  /**
   * Router name (snake_case recommended)
   *
   * Optional - if omitted, inferred from property name by converting
   * camelCase → snake_case:
   * - `weatherRouter` → `weather_router`
   * - `apiRouter` → `api_router`
   *
   * @example Explicit Name
   * ```typescript
   * interface MyRouter extends IToolRouter<'tool1' | 'tool2'> {
   *   name: 'my_router';
   *   description: '...';
   *   tools: ['tool1', 'tool2'];
   * }
   * ```
   *
   * @example Inferred Name
   * ```typescript
   * // Property name: weatherRouter
   * // Inferred router name: weather_router
   * weatherRouter!: WeatherRouter;
   * ```
   */
  name?: string;

  /**
   * Human-readable description of router's purpose
   *
   * Required - describes what tools this router groups and why.
   * Shown to clients when they discover available routers.
   *
   * @example
   * ```typescript
   * description: 'Weather information tools including current conditions and forecasts';
   * ```
   */
  description: string;

  /**
   * Array of tool interface types to include in this router
   *
   * Reference the ITool interface types directly (not string names).
   * Tools can be assigned to multiple routers.
   *
   * The parser will automatically extract tool names from the interface types.
   *
   * @example
   * ```typescript
   * interface WeatherRouter extends IToolRouter {
   *   tools: [GetWeatherTool, GetForecastTool];  // Reference interfaces directly
   * }
   * ```
   */
  tools: readonly ITool[];

  /**
   * Optional metadata for router customization
   *
   * Can include:
   * - `category`: Logical grouping (e.g., 'weather', 'api', 'database')
   * - `tags`: Keywords for filtering/search
   * - `order`: Display order hint (lower numbers first)
   * - Custom fields: Any additional router-specific metadata
   *
   * @example
   * ```typescript
   * metadata: {
   *   category: 'weather',
   *   tags: ['forecast', 'conditions', 'alerts'],
   *   order: 1,
   *   icon: '🌤️',
   *   version: '2.0'
   * }
   * ```
   */
  metadata?: {
    category?: string;
    tags?: string[];
    order?: number;
    [key: string]: unknown;
  };
}

/**
 * Type utility to extract tool names from a router interface
 *
 * @template T - Router interface extending IToolRouter
 * @returns Union type of tool names in the router
 *
 * @example
 * ```typescript
 * interface WeatherRouter extends IToolRouter {
 *   tools: [GetWeatherTool, GetForecastTool];
 *   description: 'Weather tools';
 * }
 *
 * type Tools = RouterTools<WeatherRouter>; // Extracts tool names
 * ```
 *
 * @since v4.1.0
 */
export type RouterTools<T extends IToolRouter> = T extends { tools: readonly (infer Tool)[] }
  ? Tool extends ITool
    ? Tool['name']
    : never
  : never;

/**
 * Re-export HandlerContext for easier access
 *
 * HandlerContext provides access to MCP protocol capabilities within tool implementations:
 * - `sample`: Request LLM completions from the client
 * - `reportProgress`: Send progress notifications with optional messages
 * - `elicitInput`: Request user input from the client
 * - `readResource`: Read resources by URI
 * - `listRoots`: Get root directories from the client
 *
 * @example
 * ```typescript
 * import type { ITool, HandlerContext } from 'simply-mcp';
 *
 * interface MyTool extends ITool {
 *   name: 'my_tool';
 *   description: 'Tool with progress reporting';
 *   params: {};
 *   result: { success: boolean };
 * }
 *
 * export default class MyServer {
 *   myTool: MyTool = async (params, context?: HandlerContext) => {
 *     await context?.reportProgress(50, 100, "Halfway done");
 *     return { success: true };
 *   };
 * }
 * ```
 *
 * @since v4.1.0
 */
export type { HandlerContext } from '../types/handler.js';

// =============================================================================
// Content Types for Interface-Driven API
// =============================================================================

/**
 * Audio metadata for Interface-Driven API resources
 *
 * Optional metadata that can be included with audio content to provide
 * additional context about the audio file characteristics.
 *
 * @example
 * ```typescript
 * const metadata: IAudioMetadata = {
 *   duration: 120.5,
 *   sampleRate: 44100,
 *   channels: 2,
 *   bitrate: 320,
 *   codec: 'mp3',
 *   size: 5242880,
 *   originalPath: '/path/to/audio.mp3'
 * };
 * ```
 *
 * @since v4.2.0
 */
export interface IAudioMetadata {
  /**
   * Audio duration in seconds
   *
   * @example 120.5 // 2 minutes 0.5 seconds
   */
  duration?: number;

  /**
   * Sample rate in Hz
   *
   * Common values:
   * - 8000 (telephone quality)
   * - 22050 (radio quality)
   * - 44100 (CD quality)
   * - 48000 (professional audio)
   * - 96000 (high-resolution audio)
   *
   * @example 44100
   */
  sampleRate?: number;

  /**
   * Number of audio channels
   *
   * Common values:
   * - 1 (mono)
   * - 2 (stereo)
   * - 6 (5.1 surround)
   * - 8 (7.1 surround)
   *
   * @example 2
   */
  channels?: number;

  /**
   * Bitrate in kbps (kilobits per second)
   *
   * Common values:
   * - 128 (standard quality)
   * - 192 (high quality)
   * - 256 (very high quality)
   * - 320 (maximum MP3 quality)
   *
   * @example 320
   */
  bitrate?: number;

  /**
   * Audio codec identifier
   *
   * Common codecs:
   * - 'mp3' (MPEG Audio Layer 3)
   * - 'aac' (Advanced Audio Coding)
   * - 'opus' (Opus Interactive Audio Codec)
   * - 'flac' (Free Lossless Audio Codec)
   * - 'wav' (Waveform Audio File Format - uncompressed)
   * - 'vorbis' (Ogg Vorbis)
   *
   * @example 'mp3'
   */
  codec?: string;

  /**
   * File size in bytes
   *
   * @example 5242880 // 5 MB
   */
  size?: number;

  /**
   * Original file path (if loaded from file)
   *
   * Useful for debugging and tracking the source of the audio data.
   *
   * @example '/path/to/audio.mp3'
   */
  originalPath?: string;
}

/**
 * Audio content for Interface-Driven API resources
 *
 * Represents audio data in base64 encoding with MIME type information.
 * Use this interface as the `value` type for static audio resources or
 * the `returns` type for dynamic audio resources.
 *
 * The framework provides `createAudioContent()` helper from 'simply-mcp/core'
 * to simplify creating audio content from files or buffers.
 *
 * @example Static Audio Resource
 * ```typescript
 * interface AudioSampleResource extends IResource {
 *   uri: 'audio://sample';
 *   name: 'Audio Sample';
 *   description: 'Example audio file';
 *   mimeType: 'audio/wav';
 *   value: IAudioContent;
 * }
 *
 * export default class MyServer {
 *   'audio://sample': AudioSampleResource = {
 *     type: 'audio',
 *     data: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA...',
 *     mimeType: 'audio/wav',
 *     metadata: {
 *       duration: 5.0,
 *       sampleRate: 44100,
 *       channels: 2
 *     }
 *   };
 * }
 * ```
 *
 * @example Dynamic Audio Resource
 * ```typescript
 * import { createAudioContent } from 'simply-mcp/core';
 *
 * interface DynamicAudioResource extends IResource {
 *   uri: 'audio://dynamic';
 *   name: 'Dynamic Audio';
 *   description: 'Audio loaded from file';
 *   mimeType: 'audio/mp3';
 *   returns: IAudioContent;
 * }
 *
 * export default class MyServer {
 *   'audio://dynamic' = async () => {
 *     return await createAudioContent('./audio/sample.mp3');
 *   };
 * }
 * ```
 *
 * @example With Metadata
 * ```typescript
 * const audioContent: IAudioContent = {
 *   type: 'audio',
 *   data: 'base64-encoded-audio-data',
 *   mimeType: 'audio/mpeg',
 *   metadata: {
 *     duration: 180.5,
 *     sampleRate: 48000,
 *     channels: 2,
 *     bitrate: 320,
 *     codec: 'mp3'
 *   }
 * };
 * ```
 *
 * @since v4.2.0
 */
export interface IAudioContent {
  /**
   * Content type discriminator
   *
   * Must always be 'audio' to identify this as audio content.
   */
  type: 'audio';

  /**
   * Base64-encoded audio data
   *
   * The audio file content encoded as a base64 string. This allows
   * binary audio data to be transmitted as text in JSON.
   *
   * @example 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA...'
   */
  data: string;

  /**
   * Audio MIME type
   *
   * Specifies the format of the audio data. The framework supports
   * standard audio formats with specific literal types for common formats
   * and a fallback string type for custom or less common formats.
   *
   * Common MIME types:
   * - 'audio/mpeg' - MP3 audio
   * - 'audio/wav' - WAV audio (uncompressed)
   * - 'audio/ogg' - Ogg Vorbis audio
   * - 'audio/webm' - WebM audio
   * - 'audio/mp4' - M4A/MP4 audio
   * - 'audio/aac' - AAC audio
   * - 'audio/flac' - FLAC audio (lossless)
   *
   * Custom formats can use any valid audio MIME type string.
   *
   * @example 'audio/mpeg'
   * @example 'audio/wav'
   * @example 'audio/flac'
   */
  mimeType: 'audio/mpeg' | 'audio/wav' | 'audio/ogg' | 'audio/webm' | 'audio/mp4' | 'audio/aac' | 'audio/flac' | string;

  /**
   * Optional audio metadata
   *
   * Additional information about the audio content such as duration,
   * sample rate, channels, bitrate, codec, file size, and original path.
   *
   * The `createAudioContent()` helper automatically populates some
   * metadata fields like `size` and `originalPath`.
   *
   * @example
   * ```typescript
   * {
   *   duration: 120.5,
   *   sampleRate: 44100,
   *   channels: 2,
   *   bitrate: 320,
   *   codec: 'mp3',
   *   size: 5242880
   * }
   * ```
   */
  metadata?: IAudioMetadata;
}
