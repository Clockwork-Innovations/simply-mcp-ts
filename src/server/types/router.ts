/**
 * Tool router types for organizing tools
 */

// Import router types from programmatic API
import type { RouterToolDefinition as ProgrammaticRouterToolDefinition } from '../builder-types.js';
import type { ITool } from './tool.js';

/**
 * Tool Router Definition
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
   * Array of tool and/or router interface types to include in this router
   *
   * Reference ITool or IToolRouter interface types directly (not string names).
   * Tools and routers can be assigned to multiple parent routers.
   *
   * **Nested Routers (v4.1.2+):** You can include other routers in the tools array
   * for hierarchical organization. When a parent router is called, it returns all
   * tools from both direct tool references and nested child routers.
   *
   * The parser will automatically extract tool/router names from the interface types.
   *
   * @example Basic Router with Tools
   * ```typescript
   * interface WeatherRouter extends IToolRouter {
   *   description: 'Weather tools';
   *   tools: [GetWeatherTool, GetForecastTool];  // Reference tool interfaces
   * }
   * ```
   *
   * @example Nested Routers
   * ```typescript
   * // Child routers
   * interface CurrentWeatherRouter extends IToolRouter {
   *   description: 'Current weather tools';
   *   tools: [GetWeatherTool, GetConditionsTool];
   * }
   *
   * interface ForecastRouter extends IToolRouter {
   *   description: 'Forecast tools';
   *   tools: [GetForecastTool, GetHourlyTool];
   * }
   *
   * // Parent router nesting child routers
   * interface WeatherRouter extends IToolRouter {
   *   description: 'All weather tools';
   *   tools: [CurrentWeatherRouter, ForecastRouter, GetAlertsTool];  // Mix of routers and tools!
   * }
   * ```
   */
  tools: readonly (ITool | IToolRouter)[];

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
