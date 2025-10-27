/**
 * Weather MCP Server - Bundle Test Fixture
 * Uses functional API
 */

export default {
  name: 'weather-server',
  version: '2.0.0',
  description: 'Weather forecast server with bin field',
  tools: [
    {
      name: 'get-current-weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Location name' }
        },
        required: ['location']
      },
      execute: async (args: any) => {
        const temps = [72, 65, 80, 55, 90];
        const conditions = ['sunny', 'cloudy', 'rainy', 'windy', 'stormy'];

        const temp = temps[args.location.length % temps.length];
        const condition = conditions[args.location.length % conditions.length];

        return `Weather in ${args.location}: ${temp}°F, ${condition}`;
      }
    },
    {
      name: 'get-forecast',
      description: 'Get 3-day forecast for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Location name' },
          days: { type: 'number', description: 'Number of days', default: 3 }
        },
        required: ['location']
      },
      execute: async (args: any) => {
        const days = args.days || 3;
        const forecasts = [];
        for (let i = 0; i < Math.min(days, 7); i++) {
          forecasts.push(`Day ${i + 1}: ${65 + i * 2}°F`);
        }
        return `Forecast for ${args.location}:\n${forecasts.join('\n')}`;
      }
    }
  ]
};
