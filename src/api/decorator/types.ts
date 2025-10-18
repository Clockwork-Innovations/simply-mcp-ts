/**
 * Type definitions for the Decorator API
 *
 * This module contains all TypeScript interfaces and types used by the
 * decorator-based MCP server framework.
 */

/**
 * Server configuration for @MCPServer decorator
 *
 * Defines the configuration options for an MCP server decorated class.
 * All options are optional and use sensible defaults.
 *
 * @example
 * ```typescript
 * import { MCPServer, type ServerConfig } from 'simply-mcp';
 *
 * // Minimal configuration (uses defaults)
 * @MCPServer()
 * class MyServer { }
 *
 * // Full configuration
 * @MCPServer({
 *   name: 'my-server',
 *   version: '2.0.0',
 *   description: 'My custom MCP server',
 *   transport: { type: 'http', port: 3001, stateful: true },
 *   capabilities: { sampling: true, logging: true }
 * })
 * class FullServer { }
 * ```
 */
export interface ServerConfig {
  /**
   * Server name
   * @default kebab-case of class name (e.g., WeatherService -> weather-service)
   */
  name?: string;

  /**
   * Server version
   * @default Version from package.json or '1.0.0'
   */
  version?: string;

  /**
   * Optional server description
   */
  description?: string;

  /**
   * Transport configuration
   */
  transport?: {
    /**
     * Transport type
     * @default 'stdio'
     */
    type?: 'stdio' | 'http';

    /**
     * HTTP server port
     * @default 3000
     */
    port?: number;

    /**
     * HTTP stateful mode (maintains session state)
     * @default true
     */
    stateful?: boolean;
  };

  /**
   * Server capabilities
   */
  capabilities?: {
    /**
     * Enable LLM sampling capability
     * @default false
     */
    sampling?: boolean;

    /**
     * Enable logging notifications
     * @default false
     */
    logging?: boolean;
  };
}

import type { JSDocInfo } from '../../decorators.js';
export type { JSDocInfo };

/**
 * Tool metadata
 *
 * Metadata extracted from @tool decorated methods.
 * Contains all information needed to register and execute a tool.
 *
 * @example
 * ```typescript
 * import { getTools } from 'simply-mcp';
 *
 * @MCPServer()
 * class MyServer {
 *   @tool('Greet a user')
 *   greet(name: string) {
 *     return `Hello, ${name}!`;
 *   }
 * }
 *
 * const tools = getTools(MyServer);
 * console.log(tools[0].methodName); // "greet"
 * console.log(tools[0].description); // "Greet a user"
 * ```
 */
export interface ToolMetadata {
  /**
   * Name of the decorated method
   */
  methodName: string;

  /**
   * Tool description (from decorator parameter or JSDoc)
   */
  description?: string;

  /**
   * Runtime parameter types from reflect-metadata
   */
  paramTypes?: any[];

  /**
   * Parsed JSDoc information
   */
  jsdoc?: JSDocInfo;
}

/**
 * Prompt metadata
 *
 * Metadata extracted from @prompt decorated methods.
 * Contains information needed to register and execute a prompt generator.
 *
 * @example
 * ```typescript
 * import { getPrompts } from 'simply-mcp';
 *
 * @MCPServer()
 * class MyServer {
 *   @prompt('Generate a greeting')
 *   greetPrompt(name: string) {
 *     return {
 *       messages: [{
 *         role: 'user',
 *         content: { type: 'text', text: `Say hello to ${name}` }
 *       }]
 *     };
 *   }
 * }
 *
 * const prompts = getPrompts(MyServer);
 * console.log(prompts[0].methodName); // "greetPrompt"
 * ```
 */
export interface PromptMetadata {
  /**
   * Name of the decorated method
   */
  methodName: string;

  /**
   * Prompt description (from decorator parameter or JSDoc)
   */
  description?: string;

  /**
   * Prompt arguments with name and required status
   */
  arguments?: Array<{ name: string; required: boolean }>;
}

/**
 * Resource metadata
 *
 * Metadata extracted from @resource decorated methods.
 * Contains information needed to register and provide a resource.
 *
 * @example
 * ```typescript
 * import { getResources } from 'simply-mcp';
 *
 * @MCPServer()
 * class MyServer {
 *   @resource('config://server', { mimeType: 'application/json' })
 *   serverConfig() {
 *     return { contents: [{ uri: 'config://server', text: '{}' }] };
 *   }
 * }
 *
 * const resources = getResources(MyServer);
 * console.log(resources[0].uri); // "config://server"
 * console.log(resources[0].mimeType); // "application/json"
 * ```
 */
export interface ResourceMetadata {
  /**
   * Name of the decorated method
   */
  methodName: string;

  /**
   * Resource URI (e.g., 'file://config', 'doc://readme')
   */
  uri: string;

  /**
   * Display name (defaults to method name)
   */
  name: string;

  /**
   * Resource description (from JSDoc or decorator)
   */
  description?: string;

  /**
   * MIME type of the resource content
   * @default 'text/plain'
   */
  mimeType: string;
}

/**
 * Parameter information including optionality and default values
 *
 * Detailed information about a function parameter extracted from its signature.
 * Used for type inference and schema generation.
 *
 * @example
 * ```typescript
 * import { getParameterInfo } from 'simply-mcp';
 *
 * function greet(name: string, formal: boolean = false) {
 *   return formal ? `Good day, ${name}` : `Hi, ${name}!`;
 * }
 *
 * const params = getParameterInfo(greet);
 * console.log(params[0]); // { name: 'name', optional: false, hasDefault: false }
 * console.log(params[1]); // { name: 'formal', optional: true, hasDefault: true, defaultValue: false }
 * ```
 */
export interface ParameterInfo {
  /**
   * Parameter name
   */
  name: string;

  /**
   * Whether the parameter is optional (has ? or default value)
   */
  optional: boolean;

  /**
   * Whether the parameter has a default value
   */
  hasDefault: boolean;

  /**
   * The default value (if hasDefault is true)
   */
  defaultValue?: any;

  /**
   * Runtime type constructor (String, Number, Boolean, Array, Object, Date, etc.)
   */
  type?: any;
}

/**
 * Router metadata
 *
 * Metadata extracted from @Router decorated classes.
 * Contains information needed to register and configure a router tool.
 *
 * @example
 * ```typescript
 * import { getRouters } from 'simply-mcp';
 *
 * @MCPServer()
 * @Router({
 *   name: 'weather-tools',
 *   description: 'Weather-related operations',
 *   tools: ['getWeather', 'getForecast']
 * })
 * class MyServer {
 *   @tool('Get current weather')
 *   getWeather(city: string) {
 *     return `Weather in ${city}`;
 *   }
 *
 *   @tool('Get weather forecast')
 *   getForecast(city: string) {
 *     return `Forecast for ${city}`;
 *   }
 * }
 *
 * const routers = getRouters(MyServer);
 * console.log(routers[0].name); // 'weather-tools'
 * console.log(routers[0].tools); // ['getWeather', 'getForecast']
 * ```
 */
export interface RouterMetadata {
  /**
   * Router name (used as the router tool name)
   */
  name: string;

  /**
   * Router description
   */
  description: string;

  /**
   * Array of method names to assign to this router
   */
  tools: string[];

  /**
   * Optional metadata for the router
   */
  metadata?: Record<string, unknown>;
}
