/**
 * Class-Based MCP Server with JSDoc Example
 *
 * Demonstrates automatic JSDoc parsing for descriptions and parameter info.
 * All JSDoc comments are automatically extracted and used in the MCP tools.
 *
 * Usage:
 *   simplymcp run mcp/examples/class-jsdoc.ts --http --port 3011
 *   simplymcp-class mcp/examples/class-jsdoc.ts --http --port 3011
 */

import { MCPServer } from '../decorators.js';

/**
 * Weather Service with JSDoc
 *
 * A comprehensive weather information service that demonstrates
 * automatic JSDoc parsing for tool descriptions and parameters.
 */
@MCPServer()
export default class WeatherServiceWithJSDoc {
  /**
   * Get the current temperature for a specific city
   *
   * @param city - Name of the city to get temperature for
   * @returns Temperature string in Fahrenheit
   */
  getTemperature(city: string): string {
    return `The temperature in ${city} is 72°F`;
  }

  /**
   * Get weather forecast for multiple days
   *
   * @param city - Name of the city to forecast
   * @param days - Number of days to include in forecast (1-14)
   * @returns Multi-day forecast description
   */
  getForecast(city: string, days: number): string {
    return `${days}-day forecast for ${city}: Sunny with occasional clouds`;
  }

  /**
   * Get current humidity percentage
   *
   * @param city - City name
   * @param includeFeelsLike - Whether to include "feels like" temperature
   * @returns Humidity percentage and optional feels-like info
   */
  getHumidity(city: string, includeFeelsLike: boolean): object {
    const result: any = {
      city,
      humidity: 65,
      unit: '%',
    };

    if (includeFeelsLike) {
      result.feelsLike = '75°F';
    }

    return result;
  }

  /**
   * Convert temperature between Celsius and Fahrenheit
   *
   * @param value - Temperature value to convert
   * @param fromUnit - Source unit ('C' or 'F')
   * @returns Converted temperature with both values
   */
  convertTemperature(value: number, fromUnit: string): string {
    if (fromUnit.toUpperCase() === 'C') {
      const fahrenheit = (value * 9 / 5) + 32;
      return `${value}°C = ${fahrenheit.toFixed(1)}°F`;
    } else {
      const celsius = (value - 32) * 5 / 9;
      return `${value}°F = ${celsius.toFixed(1)}°C`;
    }
  }

  /**
   * Get weather alerts for a city
   *
   * @param city - City to check for alerts
   * @param severity - Minimum alert severity ('info', 'warning', 'severe')
   * @returns Array of active weather alerts
   */
  getAlerts(city: string, severity: string): object {
    return {
      city,
      alerts: [
        {
          type: 'heat-advisory',
          severity: 'warning',
          message: 'High temperatures expected',
        },
      ],
    };
  }

  // Private helper method - not registered as tool
  _calculateWindChill(temp: number, windSpeed: number): number {
    return temp - windSpeed * 0.7;
  }
}
