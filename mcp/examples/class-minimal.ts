/**
 * Minimal Class-Based MCP Server
 *
 * The absolute cleanest way - just a class with methods!
 * - No config needed (uses class name)
 * - No @tool decorators needed (auto-registers public methods)
 * - Methods starting with _ are private (not registered)
 *
 * Usage:
 *   npx tsx mcp/class-adapter.ts mcp/examples/class-minimal.ts --http --port 3000
 */

import { MCPServer } from '../decorators.js';

/**
 * Weather Service
 * A simple weather information service
 */
@MCPServer() // No config needed! Uses "weather-service" as name
export default class WeatherService {
  // Public methods are automatically registered as tools!

  getTemperature(city: string): string {
    return `The temperature in ${city} is 72°F`;
  }

  getForecast(city: string, days: number): string {
    return `${days}-day forecast for ${city}: Sunny with occasional clouds`;
  }

  getHumidity(city: string): number {
    return 65;
  }

  // Private method (starts with _) - NOT registered as a tool
  _calculateWindChill(temp: number, windSpeed: number): number {
    return temp - windSpeed * 0.7;
  }

  // Another public method - automatically a tool!
  convertTemp(celsius: number): string {
    const fahrenheit = (celsius * 9/5) + 32;
    return `${celsius}°C = ${fahrenheit}°F`;
  }
}
