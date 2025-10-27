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
   * Will be mapped to camelCase method name (e.g., getWeather)
   */
  name: string;

  /**
   * Human-readable description of what the tool does
   */
  description: string;

  /**
   * Parameter types
   * Use TypeScript types - they will be converted to JSON Schema/Zod
   */
  params: TParams;

  /**
   * Return value type
   */
  result: TResult;

  /**
   * Callable signature - the actual implementation
   */
  (params: TParams): TResult | Promise<TResult>;
}

/**
 * Base Prompt interface
 *
 * Prompts are static templates defined entirely in the interface.
 * No implementation needed - the framework extracts the template string.
 *
 * For prompts requiring dynamic logic, set `dynamic: true` and implement
 * as a method.
 *
 * @template TArgs - Template argument types
 *
 * @example Static Prompt
 * ```typescript
 * interface WeatherPrompt extends IPrompt {
 *   name: 'weather_report';
 *   description: 'Generate weather report';
 *   args: { location: string; style?: 'casual' | 'formal' };
 *   template: `Generate a {style} weather report for {location}.`;
 * }
 * ```
 *
 * @example Dynamic Prompt
 * ```typescript
 * interface DynamicPrompt extends IPrompt {
 *   name: 'dynamic_weather';
 *   description: 'Context-aware weather prompt';
 *   args: { location: string };
 *   dynamic: true;
 * }
 *
 * class MyServer implements IServer {
 *   dynamicWeather: DynamicPrompt = (args) => {
 *     const timeOfDay = new Date().getHours() < 12 ? 'morning' : 'evening';
 *     return `Good ${timeOfDay}! Weather for ${args.location}...`;
 *   }
 * }
 * ```
 */
export interface IPrompt<TArgs = any> {
  /**
   * Prompt name in snake_case
   */
  name: string;

  /**
   * Human-readable description
   */
  description: string;

  /**
   * Template argument types
   */
  args: TArgs;

  /**
   * Template string with {placeholder} syntax (for static prompts)
   * Optional if dynamic: true
   */
  template?: string;

  /**
   * Set to true if this prompt requires dynamic logic
   * When true, must be implemented as a method
   */
  dynamic?: boolean;

  /**
   * Callable signature - the actual implementation for dynamic prompts
   */
  (args: TArgs): string | Promise<string>;
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
export interface IResource<TData = any> {
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
   * Resource data (for static resources)
   * Optional if dynamic: true
   */
  data?: TData;

  /**
   * Set to true if this resource requires dynamic logic
   * When true, must be implemented as a method
   */
  dynamic?: boolean;

  /**
   * Callable signature - the actual implementation for dynamic resources
   */
  (): TData | Promise<TData>;
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
   */
  name: string;

  /**
   * Semantic version (e.g., '1.0.0')
   */
  version: string;

  /**
   * Optional server description
   */
  description?: string;

  /**
   * Transport type
   * - 'stdio': Standard input/output (default)
   * - 'http': HTTP server
   *
   * Default: 'stdio'
   */
  transport?: 'stdio' | 'http';

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
export type PromptArgs<T extends IPrompt> = T extends IPrompt<infer A> ? A : never;

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
 * Base UI interface for MCP-UI foundation layer
 *
 * UI resources enable interactive HTML interfaces in MCP clients.
 * Foundation layer supports inline HTML only - no file references or compilation.
 *
 * The interface defines metadata while implementation can be:
 * - Static: Inline HTML string in interface (no implementation needed)
 * - Dynamic: Method returning HTML (for server-generated UI)
 *
 * Tool Integration:
 * - Specify allowed tools via `tools` array
 * - Framework injects `callTool(name, params)` helper into UI
 * - Security: Only listed tools can be called from UI
 *
 * Subscription Support:
 * - Set `subscribable: true` to enable live updates
 * - Call `notifyResourceUpdate(uri)` to push updates to clients
 * - Client automatically refetches UI content on notification
 *
 * @template TData - Data type for dynamic UI (ignored for static)
 *
 * @example Static Inline HTML
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
   * Inline HTML content (for static UI)
   * Optional if dynamic: true
   *
   * Security: HTML is rendered in sandboxed iframe
   * Foundation layer: Use inline HTML only (no external files)
   */
  html?: string;

  /**
   * Inline CSS styles (for static UI)
   * Optional - applied via <style> tag in iframe
   *
   * Foundation layer: Use inline CSS only (no external files)
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
   * Set to true if UI requires dynamic generation
   * When true, must implement as method returning HTML string
   *
   * @example
   * ```typescript
   * 'ui://stats': MyUI = async () => {
   *   return `<div>Stats: ${await getStats()}</div>`;
   * }
   * ```
   */
  dynamic?: boolean;

  /**
   * Data type hint (for dynamic UI)
   * Typically string (HTML) but can be typed for clarity
   */
  data?: TData;

  /**
   * Callable signature - implementation for dynamic UI
   * Returns HTML string (with optional CSS via <style> tag)
   */
  (): TData | Promise<TData>;

  // ============================================================================
  // FEATURE LAYER FIELDS
  // ============================================================================

  /**
   * Path to external HTML file (relative to server file)
   * Mutually exclusive with `html` and `component`
   *
   * File paths are resolved relative to the server file location.
   * Use for separating UI markup from server code.
   *
   * @example file: './ui/calculator.html'
   */
  file?: string;

  /**
   * Path to React component file (.tsx or .jsx)
   * Mutually exclusive with `html` and `file`
   *
   * Component will be compiled with Babel and bundled automatically.
   * Supports JSX, TypeScript, and modern JavaScript features.
   *
   * @example component: './components/Dashboard.tsx'
   */
  component?: string;

  /**
   * Path to external JavaScript file
   * Loaded after HTML/component rendering
   *
   * For single script files. Use `scripts` for multiple files.
   *
   * @example script: './ui/calculator.js'
   */
  script?: string;

  /**
   * Paths to external CSS files (relative to server file)
   * Loaded in order before rendering
   *
   * Multiple stylesheets are loaded in the order specified.
   * Useful for theme files, component styles, etc.
   *
   * @example stylesheets: ['./styles/theme.css', './styles/calculator.css']
   */
  stylesheets?: string[];

  /**
   * Paths to external JavaScript files
   * Loaded in order after rendering
   *
   * Multiple scripts are loaded in the order specified.
   * Loaded after HTML/component is rendered.
   *
   * @example scripts: ['./lib/charts.js', './ui/dashboard.js']
   */
  scripts?: string[];

  /**
   * NPM package dependencies for bundling
   * Used when bundling component with external dependencies
   *
   * Dependencies are bundled into the final component output.
   * Only needed when using `component` field.
   *
   * @example dependencies: ['lodash', 'date-fns', 'recharts']
   */
  dependencies?: string[];

  /**
   * Bundle configuration for React components
   *
   * When `true`, bundles the component with all dependencies (except externals).
   * When an object, provides fine-grained bundling control.
   *
   * Bundling benefits:
   * - Includes dependencies in output (no CDN required)
   * - Smaller file sizes with minification
   * - Faster load times (fewer network requests)
   * - Better offline support
   *
   * @example Enable bundling with defaults
   * ```typescript
   * bundle: true
   * ```
   *
   * @example Custom bundle configuration
   * ```typescript
   * bundle: {
   *   minify: true,
   *   sourcemap: true,
   *   external: ['react', 'react-dom'], // Load from CDN
   *   format: 'iife'
   * }
   * ```
   */
  bundle?:
    | boolean
    | {
        /**
         * Minify bundled output
         * @default false
         */
        minify?: boolean;

        /**
         * Generate source maps for debugging
         * @default false
         */
        sourcemap?: boolean;

        /**
         * External dependencies (don't bundle these)
         * These will be loaded from CDN or expected to be globally available
         * @default ['react', 'react-dom']
         */
        external?: string[];

        /**
         * Output format
         * - 'iife': Browser-friendly (default)
         * - 'esm': ES Modules (modern browsers)
         * @default 'iife'
         */
        format?: 'iife' | 'esm';
      };

  /**
   * Component imports from registry
   *
   * URIs of reusable components to import and make available.
   * Components must be registered in the component registry first.
   *
   * @example
   * ```typescript
   * imports: ['ui://components/Button', 'ui://components/Card']
   * ```
   */
  imports?: string[];

  /**
   * Theme for UI styling
   *
   * Can be:
   * - Theme name string: 'light', 'dark', or custom theme name
   * - Theme object: { name: string; variables: Record<string, string> }
   *
   * Themes use CSS custom properties (variables) for consistent styling.
   * Prebuilt themes (light, dark) are auto-registered.
   *
   * @example Using prebuilt theme
   * ```typescript
   * interface MyUI extends IUI {
   *   theme: 'light'; // or 'dark'
   * }
   * ```
   *
   * @example Using custom inline theme
   * ```typescript
   * interface MyUI extends IUI {
   *   theme: {
   *     name: 'custom';
   *     variables: {
   *       '--bg-primary': '#f0f0f0';
   *       '--text-primary': '#333333';
   *     };
   *   };
   * }
   * ```
   */
  theme?: string | { name: string; variables: Record<string, string> };

  /**
   * External URL for serving UI from external sources
   * Mutually exclusive with `html`, `file`, and `component`
   *
   * When set, the UI resource will use the `text/uri-list` MIME type
   * and return the URL as plain text. The MCP client is responsible for
   * loading the external URL (typically in an iframe).
   *
   * Use cases:
   * - Existing web dashboards
   * - Third-party hosted UIs
   * - Content management systems
   * - Analytics platforms
   *
   * Security: Ensure the external URL is trusted and uses HTTPS when appropriate.
   *
   * @example External Analytics Dashboard
   * ```typescript
   * interface AnalyticsDashboard extends IUI {
   *   uri: 'ui://analytics/dashboard';
   *   name: 'Analytics Dashboard';
   *   description: 'External analytics platform';
   *   externalUrl: 'https://analytics.example.com/dashboard';
   * }
   * ```
   *
   * @example External Documentation
   * ```typescript
   * interface Documentation extends IUI {
   *   uri: 'ui://docs/manual';
   *   name: 'User Manual';
   *   description: 'Online documentation';
   *   externalUrl: 'https://docs.example.com/user-manual';
   * }
   * ```
   */
  externalUrl?: string;

  /**
   * Remote DOM content for application/vnd.mcp-ui.remote-dom MIME type
   *
   * Remote DOM allows UI components to render in a parent window while executing
   * in a sandboxed iframe. Unlike HTML which transfers markup, Remote DOM transfers
   * component trees that can be dynamically updated.
   *
   * Mutually exclusive with `html`, `file`, `component`, and `externalUrl`.
   *
   * Accepts two formats:
   * 1. Pre-serialized Remote DOM JSON: `{"type": "div", "children": ["Hello"]}`
   * 2. Simple React component code (basic conversion)
   *
   * Phase 3B: Remote DOM MIME type support
   *
   * @example Pre-serialized Remote DOM
   * ```typescript
   * interface RemoteDOMUI extends IUI {
   *   uri: 'ui://remote/simple';
   *   name: 'Remote DOM Example';
   *   description: 'Simple Remote DOM UI';
   *   remoteDom: `{
   *     "type": "div",
   *     "properties": { "className": "container" },
   *     "children": [
   *       {
   *         "type": "h1",
   *         "children": ["Hello Remote DOM"]
   *       },
   *       {
   *         "type": "button",
   *         "properties": { "id": "myButton" },
   *         "children": ["Click Me"]
   *       }
   *     ]
   *   }`;
   * }
   * ```
   *
   * @example Simple React Component (basic conversion)
   * ```typescript
   * interface ReactRemoteDOMUI extends IUI {
   *   uri: 'ui://remote/react';
   *   name: 'React Remote DOM';
   *   description: 'React component converted to Remote DOM';
   *   remoteDom: `
   *     <div className="container">
   *       <h1>Hello from React</h1>
   *       <button id="myButton">Click Me</button>
   *     </div>
   *   `;
   * }
   * ```
   *
   * Note: Complex React components with state, hooks, or advanced features
   * should be pre-converted to Remote DOM JSON format using @remote-dom/core APIs.
   */
  remoteDom?: string;

  // ============================================================================
  // POLISH LAYER FIELDS - Production Optimizations
  // ============================================================================

  /**
   * Minification configuration for production builds
   *
   * Minifies HTML, CSS, and JavaScript to reduce bundle size.
   * Can be boolean (minify all) or object for selective minification.
   *
   * Benefits:
   * - Reduced file sizes (typically 20-50% savings)
   * - Faster load times
   * - Lower bandwidth usage
   *
   * @example Enable all minification
   * ```typescript
   * interface MyUI extends IUI {
   *   minify: true;
   * }
   * ```
   *
   * @example Selective minification
   * ```typescript
   * interface MyUI extends IUI {
   *   minify: {
   *     html: true,
   *     css: true,
   *     js: false  // Keep JavaScript readable for debugging
   *   };
   * }
   * ```
   */
  minify?:
    | boolean
    | {
        /**
         * Minify HTML content
         * @default true
         */
        html?: boolean;

        /**
         * Minify CSS content
         * @default true
         */
        css?: boolean;

        /**
         * Minify JavaScript content
         * @default true
         */
        js?: boolean;
      };

  /**
   * CDN configuration for hosting resources
   *
   * Configures CDN URL generation and Subresource Integrity (SRI) hashes
   * for secure CDN-hosted resources.
   *
   * Benefits:
   * - Faster global delivery via CDN
   * - Security with SRI verification
   * - Optional compression (gzip/brotli)
   *
   * @example Enable CDN with SRI
   * ```typescript
   * interface MyUI extends IUI {
   *   cdn: {
   *     baseUrl: 'https://cdn.example.com',
   *     sri: 'sha384',
   *     compression: 'both'
   *   };
   * }
   * ```
   *
   * @example Simple SRI only (no CDN URL)
   * ```typescript
   * interface MyUI extends IUI {
   *   cdn: { sri: true };  // Uses sha384 by default
   * }
   * ```
   */
  cdn?:
    | boolean
    | {
        /**
         * CDN base URL (e.g., 'https://cdn.example.com')
         */
        baseUrl?: string;

        /**
         * Enable Subresource Integrity (SRI) hashes
         * Can be boolean (use sha384) or specific algorithm
         * @default false
         */
        sri?: boolean | 'sha256' | 'sha384' | 'sha512';

        /**
         * Compression to apply
         * - 'gzip': gzip compression (good compatibility)
         * - 'brotli': brotli compression (better compression)
         * - 'both': generate both formats
         */
        compression?: 'gzip' | 'brotli' | 'both';
      };

  /**
   * Performance monitoring configuration
   *
   * Tracks compilation, bundling, and optimization metrics.
   * Useful for identifying performance bottlenecks and optimizing builds.
   *
   * @example Enable tracking and reporting
   * ```typescript
   * interface MyUI extends IUI {
   *   performance: {
   *     track: true,
   *     report: true,
   *     thresholds: {
   *       maxBundleSize: 500000,      // 500 KB
   *       maxCompilationTime: 5000,   // 5 seconds
   *     }
   *   };
   * }
   * ```
   *
   * @example Simple tracking
   * ```typescript
   * interface MyUI extends IUI {
   *   performance: true;  // Track and report
   * }
   * ```
   */
  performance?:
    | boolean
    | {
        /**
         * Enable performance tracking
         * @default true
         */
        track?: boolean;

        /**
         * Enable performance reporting
         * @default false
         */
        report?: boolean;

        /**
         * Performance thresholds for warnings
         */
        thresholds?: {
          /**
           * Maximum bundle size in bytes
           * @default 500000 (500 KB)
           */
          maxBundleSize?: number;

          /**
           * Maximum compilation time in milliseconds
           * @default 5000 (5 seconds)
           */
          maxCompilationTime?: number;

          /**
           * Minimum cache hit rate (0-1)
           * @default 0.7 (70%)
           */
          minCacheHitRate?: number;

          /**
           * Minimum compression savings (0-1)
           * @default 0.2 (20%)
           */
          minCompressionSavings?: number;
        };
      };
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
