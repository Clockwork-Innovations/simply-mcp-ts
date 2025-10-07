/**
 * Minimal Class-Based MCP Server
 *
 * The absolute cleanest way - just a class with methods!
 * - No config needed (uses class name)
 * - No @tool decorators needed (auto-registers public methods)
 * - Methods starting with _ are private (not registered)
 *
 * Usage:
 *   # Auto-detect and run
 *   simplymcp run mcp/examples/class-minimal.ts
 *
 *   # Development with auto-restart
 *   simplymcp run mcp/examples/class-minimal.ts --watch
 *
 *   # Debug with Chrome DevTools
 *   simplymcp run mcp/examples/class-minimal.ts --inspect
 *
 *   # Validate configuration
 *   simplymcp run mcp/examples/class-minimal.ts --dry-run
 *
 *   # HTTP transport
 *   simplymcp run mcp/examples/class-minimal.ts --http --port 3000
 *
 *   # Or explicit decorator command
 *   simplymcp-class mcp/examples/class-minimal.ts
 */

// Unified import pattern (v2.5.0+) - everything from one package
import { MCPServer } from 'simply-mcp';

/**
 * Weather Service
 * A simple weather information service
 *
 * Smart defaults in action:
 * - name: "weather-service" (kebab-case from class name)
 * - version: auto-detected from package.json
 * - No other configuration needed!
 */
@MCPServer() // Zero configuration needed!
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
