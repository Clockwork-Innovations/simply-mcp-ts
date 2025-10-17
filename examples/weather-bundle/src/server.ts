/**
 * Weather MCP Server - Example Package Bundle
 *
 * This is a complete example of a SimpleMCP package bundle that provides
 * weather forecast and current weather information.
 *
 * Features:
 * - Get current weather for any location
 * - Get multi-day forecasts
 * - Uses functional API for simplicity
 * - Includes mock data for demonstration
 */

export default {
  name: 'weather-mcp-server',
  version: '1.0.0',
  description: 'Get weather forecasts and current conditions for any location',

  tools: [
    {
      name: 'get-current-weather',
      description: 'Get current weather conditions for a specific location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name, address, or coordinates (e.g., "San Francisco", "New York, NY", "40.7128,-74.0060")'
          },
          units: {
            type: 'string',
            description: 'Temperature units',
            enum: ['fahrenheit', 'celsius'],
            default: 'fahrenheit'
          }
        },
        required: ['location']
      },
      execute: async (args: any) => {
        const location = args.location;
        const units = args.units || 'fahrenheit';

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
      }
    },

    {
      name: 'get-forecast',
      description: 'Get multi-day weather forecast for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name or address'
          },
          days: {
            type: 'number',
            description: 'Number of days to forecast (1-7)',
            minimum: 1,
            maximum: 7,
            default: 3
          },
          units: {
            type: 'string',
            description: 'Temperature units',
            enum: ['fahrenheit', 'celsius'],
            default: 'fahrenheit'
          }
        },
        required: ['location']
      },
      execute: async (args: any) => {
        const location = args.location;
        const days = Math.min(Math.max(args.days || 3, 1), 7);
        const units = args.units || 'fahrenheit';

        // Generate mock forecast
        const forecasts = [];
        const hash = location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        for (let i = 0; i < days; i++) {
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

        return `${days}-Day Forecast for ${location}:

${forecasts.join('\n')}

Note: This is mock data for demonstration purposes.`;
      }
    },

    {
      name: 'get-weather-alerts',
      description: 'Get active weather alerts and warnings for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name or address'
          }
        },
        required: ['location']
      },
      execute: async (args: any) => {
        const location = args.location;
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
      }
    }
  ]
};
