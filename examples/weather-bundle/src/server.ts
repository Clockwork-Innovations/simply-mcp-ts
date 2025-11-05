/**
 * Weather MCP Server - Interface API Bundle Example
 *
 * This is a comprehensive example of a SimpleMCP bundle using the Interface API.
 * It demonstrates weather information services with proper error handling and mock data.
 *
 * Features:
 * - Get current weather for any location
 * - Get multi-day forecasts (1-7 days)
 * - Get active weather alerts
 * - Unit conversion (Fahrenheit/Celsius)
 * - Mock data for demonstration
 * - IParam validation with optional parameters
 *
 * Usage:
 *   # From bundle directory
 *   npx simply-mcp run .
 *
 *   # HTTP mode
 *   npx simply-mcp run . --http --port 3000
 *
 *   # Dry-run validation
 *   npx simply-mcp run . --dry-run
 */

import type { ITool, IParam, IServer } from 'simply-mcp';

// ============================================================================
// Server Configuration
// ============================================================================

const server: IServer = {
  name: 'weather-mcp-server',
  version: '1.0.0',
  description: 'Get weather forecasts and current conditions for any location'
};

// ============================================================================
// Parameter Interfaces (using IParam for validation)
// ============================================================================

interface LocationParam extends IParam {
  type: 'string';
  description: 'City name, address, or coordinates';
  minLength: 1;
}

interface UnitsParam extends IParam {
  type: 'string';
  description: 'Temperature units';
  enum: ['fahrenheit', 'celsius'];
  required: false;
}

interface DaysParam extends IParam {
  type: 'integer';
  description: 'Number of days to forecast';
  min: 1;
  max: 7;
  required: false;
}

// ============================================================================
// Tool Interfaces
// ============================================================================

interface GetCurrentWeatherTool extends ITool {
  name: 'get_current_weather';
  description: 'Get current weather conditions for a specific location';
  params: {
    location: LocationParam;
    units: UnitsParam;
  };
  result: string;
}

interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get multi-day weather forecast for a location';
  params: {
    location: LocationParam;
    days: DaysParam;
    units: UnitsParam;
  };
  result: string;
}

interface GetWeatherAlertsTool extends ITool {
  name: 'get_weather_alerts';
  description: 'Get active weather alerts and warnings for a location';
  params: {
    location: LocationParam;
  };
  result: string;
}

// ============================================================================
// Server Implementation
// ============================================================================

export default class WeatherServer {
  /**
   * Get current weather conditions
   *
   * Returns mock weather data based on location hash for consistency.
   */
  getCurrentWeather: GetCurrentWeatherTool = async (params) => {
    const location = params.location;
    const units = params.units || 'fahrenheit';

    // Mock weather data based on location hash
    const temps = [72, 65, 80, 55, 90, 68, 75, 82, 60, 70];
    const conditions = ['sunny', 'cloudy', 'rainy', 'windy', 'stormy', 'partly cloudy', 'foggy', 'clear', 'overcast', 'drizzle'];
    const humidity = [45, 60, 75, 50, 80, 55, 65, 40, 70, 58];
    const windSpeed = [5, 10, 15, 8, 20, 12, 7, 6, 18, 9];

    // Simple hash to get consistent results for same location
    const hash = location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % temps.length;

    const temp = temps[index];
    const condition = conditions[index];
    const hum = humidity[index];
    const wind = windSpeed[index];

    // Convert to celsius if requested
    const displayTemp = units === 'celsius'
      ? Math.round((temp - 32) * 5/9)
      : temp;
    const tempUnit = units === 'celsius' ? '°C' : '°F';

    return `Current Weather for ${location}:
Temperature: ${displayTemp}${tempUnit}
Condition: ${condition}
Humidity: ${hum}%
Wind Speed: ${wind} mph

Note: This is mock data for demonstration purposes.`;
  };

  /**
   * Get multi-day forecast
   *
   * Generates consistent forecast data based on location and days requested.
   */
  getForecast: GetForecastTool = async (params) => {
    const location = params.location;
    const days = params.days || 3;
    const units = params.units || 'fahrenheit';

    // Validate days range
    const forecastDays = Math.min(Math.max(days, 1), 7);

    // Generate mock forecast
    const forecasts: string[] = [];
    const hash = location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = 0; i < forecastDays; i++) {
      const dayHash = (hash + i * 17) % 100;
      const baseTemp = 65 + (dayHash % 25);
      const high = baseTemp + 5;
      const low = baseTemp - 5;

      const conditions = ['sunny', 'partly cloudy', 'cloudy', 'rainy', 'stormy'];
      const condition = conditions[(dayHash + i) % conditions.length];

      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

      // Convert to celsius if requested
      const displayHigh = units === 'celsius'
        ? Math.round((high - 32) * 5/9)
        : high;
      const displayLow = units === 'celsius'
        ? Math.round((low - 32) * 5/9)
        : low;
      const tempUnit = units === 'celsius' ? '°C' : '°F';

      forecasts.push(`${dayName}: ${condition}, High: ${displayHigh}${tempUnit}, Low: ${displayLow}${tempUnit}`);
    }

    return `${forecastDays}-Day Forecast for ${location}:

${forecasts.join('\n')}

Note: This is mock data for demonstration purposes.`;
  };

  /**
   * Get active weather alerts
   *
   * Returns mock alerts for some locations based on hash.
   */
  getWeatherAlerts: GetWeatherAlertsTool = async (params) => {
    const location = params.location;
    const hash = location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Mock alerts based on location
    const hasAlert = hash % 3 === 0;

    if (!hasAlert) {
      return `No active weather alerts for ${location}.`;
    }

    const alertTypes = [
      {
        type: 'Severe Thunderstorm Warning',
        severity: 'Warning',
        description: 'Severe thunderstorms with heavy rain and strong winds expected in the area.'
      },
      {
        type: 'Heat Advisory',
        severity: 'Advisory',
        description: 'Dangerously hot conditions expected. Stay hydrated and avoid prolonged outdoor exposure.'
      },
      {
        type: 'Winter Storm Watch',
        severity: 'Watch',
        description: 'Heavy snow and ice possible. Conditions may impact travel.'
      }
    ];

    const alert = alertTypes[hash % alertTypes.length];

    return `Weather Alert for ${location}:

Type: ${alert.type}
Severity: ${alert.severity}
Description: ${alert.description}

This is a mock alert for demonstration purposes.`;
  };
}
