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
 * @template TParams - Parameter object type
 * @template TResult - Return value type
 *
 * @example
 * ```typescript
 * interface GreetTool extends ITool {
 *   name: 'greet_user';
 *   description: 'Greet a user by name';
 *   params: { name: string; formal?: boolean };
 *   result: string;
 * }
 *
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
 *   dynamicWeather = (args) => {
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
 *   stats = async () => ({
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
}

/**
 * Base Server interface
 *
 * Defines server metadata. The implementation class discovers and registers
 * all tools/prompts/resources automatically via AST parsing.
 *
 * @example
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
