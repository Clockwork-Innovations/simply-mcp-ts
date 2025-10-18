#!/usr/bin/env node
/**
 * Weather Router Example
 *
 * Demonstrates basic router usage with a familiar domain (weather service).
 * This example shows:
 * - Creating a router with multiple related tools
 * - Using flattenRouters=false (default) to hide tools from main list
 * - Namespace calling pattern (router__tool)
 * - Real-world router structure
 *
 * Router Pattern:
 * - The `weather_router` acts as a discovery mechanism
 * - Call the router to see available weather tools
 * - Tools are hidden from main list by default (flattenRouters=false)
 * - Call tools via namespace: weather_router__get_current_weather
 *
 * Usage:
 *   # Run with stdio transport:
 *   npx tsx examples/router-weather/server.ts
 *
 *   # Run with HTTP transport:
 *   npx tsx examples/router-weather/server.ts --http --port 3000
 */

import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

// Create server with default settings (flattenRouters=false)
const server = new BuildMCPServer({
  name: 'weather-server',
  version: '1.0.0',
  description: 'Weather service demonstrating router pattern',
  // flattenRouters: false is the default - hides router-assigned tools from main list
});

// ============================================================================
// Weather Tools
// ============================================================================

/**
 * Get Current Weather
 * Returns current weather conditions for a location
 */
server.addTool({
  name: 'get_current_weather',
  description: 'Get current weather conditions for a specific location',
  parameters: z.object({
    location: z.string().min(1).describe('City name or zip code (e.g., "New York" or "10001")'),
    units: z.enum(['celsius', 'fahrenheit']).optional().default('fahrenheit').describe('Temperature units'),
  }),
  execute: async (args) => {
    // Mock weather data - in production, this would call a real API
    const mockTemps = {
      celsius: Math.floor(Math.random() * 30) + 10, // 10-40°C
      fahrenheit: Math.floor(Math.random() * 60) + 50, // 50-110°F
    };

    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Stormy'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];

    const temp = mockTemps[args.units || 'fahrenheit'];
    const unit = args.units === 'celsius' ? '°C' : '°F';

    return `Current weather in ${args.location}:
  Condition: ${condition}
  Temperature: ${temp}${unit}
  Humidity: ${Math.floor(Math.random() * 40) + 40}%
  Wind: ${Math.floor(Math.random() * 20) + 5} mph`;
  },
});

/**
 * Get Weather Forecast
 * Returns multi-day weather forecast
 */
server.addTool({
  name: 'get_forecast',
  description: 'Get weather forecast for upcoming days',
  parameters: z.object({
    location: z.string().min(1).describe('City name or zip code'),
    days: z.number().min(1).max(10).default(3).describe('Number of days to forecast (1-10)'),
    units: z.enum(['celsius', 'fahrenheit']).optional().default('fahrenheit').describe('Temperature units'),
  }),
  execute: async (args) => {
    // Mock forecast data
    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Stormy'];
    const forecast: string[] = [];

    for (let i = 1; i <= args.days; i++) {
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      const highTemp = args.units === 'celsius'
        ? Math.floor(Math.random() * 15) + 20  // 20-35°C
        : Math.floor(Math.random() * 30) + 60;  // 60-90°F
      const lowTemp = args.units === 'celsius'
        ? Math.floor(Math.random() * 10) + 10   // 10-20°C
        : Math.floor(Math.random() * 20) + 40;  // 40-60°F
      const unit = args.units === 'celsius' ? '°C' : '°F';

      forecast.push(`Day ${i}: ${condition}, High: ${highTemp}${unit}, Low: ${lowTemp}${unit}`);
    }

    return `${args.days}-day forecast for ${args.location}:

${forecast.join('\n')}

Note: This is mock data for demonstration purposes.`;
  },
});

/**
 * Get Weather Alerts
 * Returns active weather alerts and warnings
 */
server.addTool({
  name: 'get_weather_alerts',
  description: 'Get active weather alerts and warnings for a location',
  parameters: z.object({
    location: z.string().min(1).describe('City name or zip code'),
  }),
  execute: async (args) => {
    // Mock alerts - randomly generate 0-2 alerts
    const alertTypes = [
      { type: 'Severe Thunderstorm Warning', severity: 'Warning', expires: '6:00 PM' },
      { type: 'Heat Advisory', severity: 'Advisory', expires: '9:00 PM' },
      { type: 'Winter Storm Watch', severity: 'Watch', expires: 'Tomorrow 12:00 PM' },
      { type: 'Flood Warning', severity: 'Warning', expires: '11:00 PM' },
      { type: 'Wind Advisory', severity: 'Advisory', expires: 'Tomorrow 6:00 AM' },
    ];

    const numAlerts = Math.floor(Math.random() * 3); // 0-2 alerts

    if (numAlerts === 0) {
      return `No active weather alerts for ${args.location}.

All clear! Check back later for updates.`;
    }

    const alerts = [];
    const selectedIndices = new Set<number>();

    // Pick random unique alerts
    while (selectedIndices.size < numAlerts) {
      selectedIndices.add(Math.floor(Math.random() * alertTypes.length));
    }

    Array.from(selectedIndices).forEach(idx => {
      const alert = alertTypes[idx];
      alerts.push(`• ${alert.type} (${alert.severity})
  Expires: ${alert.expires}`);
    });

    return `Active weather alerts for ${args.location}:

${alerts.join('\n\n')}

Stay safe and monitor conditions.`;
  },
});

// ============================================================================
// Weather Router
// ============================================================================

/**
 * Weather Router - Discovery Tool
 *
 * This router groups all weather-related tools together.
 * Calling this router returns a list of available weather tools in MCP format.
 *
 * Pattern Usage:
 * 1. Call weather_router to discover available tools
 * 2. Call specific tools via namespace: weather_router__get_current_weather
 * 3. Or call tools directly if you know their names: get_current_weather
 */
server.addRouterTool({
  name: 'weather_router',
  description: 'Discover and access weather-related tools. Call this to see available weather operations.',
  tools: [
    'get_current_weather',
    'get_forecast',
    'get_weather_alerts',
  ],
});

// ============================================================================
// Server Startup
// ============================================================================

// Parse command line arguments
const args = process.argv.slice(2);
const useHttp = args.includes('--http');
const portIndex = args.indexOf('--port');
const port = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : 3000;

// Start the server
(async () => {
  try {
    await server.start({
      transport: useHttp ? 'http' : 'stdio',
      port: useHttp ? port : undefined,
    });

    // Log server info
    const info = server.getInfo();
    const stats = server.getStats();

    if (!useHttp) {
      console.error(`\n[Weather Router Example] Server "${info.name}" v${info.version} is running`);
      console.error(`[Weather Router Example] Configuration:`);
      console.error(`  - Router: weather_router`);
      console.error(`  - Tools in router: 3 (get_current_weather, get_forecast, get_weather_alerts)`);
      console.error(`  - flattenRouters: ${stats.flattenRouters} (tools hidden from main list)`);
      console.error(`\n[Weather Router Example] How to use:`);
      console.error(`  1. Call "weather_router" to see available tools`);
      console.error(`  2. Call tools via namespace: "weather_router__get_current_weather"`);
      console.error(`  3. Or call directly (if client supports): "get_current_weather"`);
      console.error(`\n[Weather Router Example] Stats:`, stats);
    }
  } catch (error) {
    console.error('[Weather Router Example] Failed to start server:', error);
    process.exit(1);
  }
})();
