/**
 * Basic Router Interface Test Fixture
 * Tests simple router with two tools
 */

import type { IServer, ITool, IToolRouter, ToolHelper } from '../../src/index.js';

// Define tools with proper IParam format
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather for a location';
  params: {
    location: { type: 'string'; description: 'Location to get weather for' };
  };
  result: { temperature: number; conditions: string };
}

interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get weather forecast for multiple days';
  params: {
    location: { type: 'string'; description: 'Location to get forecast for' };
    days: { type: 'number'; description: 'Number of days to forecast' };
  };
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

// Tool implementations
const getWeather: ToolHelper<GetWeatherTool> = async (params) => {
  return {
    temperature: 72,
    conditions: 'Sunny'
  };
};

const getForecast: ToolHelper<GetForecastTool> = async (params) => {
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

// Server implementation using v4 const-based pattern
const server: WeatherServer = {
  name: 'weather-service',
  version: '1.0.0',
  description: 'Weather information service',
  flattenRouters: false,
  getWeather,
  getForecast,
  // Router - NO implementation needed!
  weatherRouter: {
    name: 'weather_router',
    description: 'Weather information tools',
    tools: ['get_weather', 'get_forecast'] as any
  }
};

export default server;
