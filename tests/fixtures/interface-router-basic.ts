/**
 * Basic Router Interface Test Fixture
 * Tests simple router with two tools
 */

import type { IServer, ITool, IToolRouter } from '../../src/index.js';

// Define tools
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather for a location';
  params: { location: string };
  result: { temperature: number; conditions: string };
}

interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get weather forecast for multiple days';
  params: { location: string; days: number };
  result: { forecast: Array<{ day: string; temperature: number; conditions: string }> };
}

// Define router - simple and clean!
interface WeatherRouter extends IToolRouter {
  name: 'weather_router';
  description: 'Weather information tools';
  tools: [GetWeatherTool, GetForecastTool];  // Reference tool interfaces directly
}

// Server interface
interface WeatherServer extends IServer {
  name: 'weather-service';
  version: '1.0.0';
  description: 'Weather information service';
  flattenRouters: false;
}

// Server implementation
export default class WeatherService implements WeatherServer {
  // Tool implementations
  getWeather: GetWeatherTool = async (params) => {
    return {
      temperature: 72,
      conditions: 'Sunny'
    };
  };

  getForecast: GetForecastTool = async (params) => {
    const forecast = [];
    for (let i = 0; i < params.days; i++) {
      forecast.push({
        day: `Day ${i + 1}`,
        temperature: 70 + i,
        conditions: i % 2 === 0 ? 'Sunny' : 'Cloudy'
      });
    }
    return { forecast };
  };

  // Router - NO implementation needed!
  weatherRouter!: WeatherRouter;
}
