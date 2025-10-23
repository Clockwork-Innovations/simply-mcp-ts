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
import type { RouterToolDefinition as ProgrammaticRouterToolDefinition } from '../programmatic/types.js';

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
