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

// Re-export all types from modular files
export * from './params.js';
export * from './tool.js';
export * from './prompt.js';
export * from './skill.js';
export * from './messages.js';
export * from './resource.js';
export * from './server.js';
export * from './auth.js';
export * from './ui.js';
export * from './sampling.js';
export * from './elicit.js';
export * from './completion.js';
export * from './roots.js';
export * from './subscription.js';
export * from './router.js';
export * from './audio.js';
export * from './helpers.js';

// Re-export HandlerContext for easier access
export type { HandlerContext } from '../../types/handler.js';
