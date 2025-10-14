import { MCPServer, tool } from 'simply-mcp';
/**
 * Example Weather Service
 *
 * This is a sample class that can be transformed into an MCP server
 * using the Class Wrapper Wizard.
 */

@MCPServer({
  name: 'weather-service',
  version: '1.0.0',
  description: 'Weather information service with forecasts'
})
export class WeatherService {
  private apiKey: string;

  constructor(apiKey: string = 'demo-key') {
    this.apiKey = apiKey;
  }

  /**
   * Get current weather conditions for a city
   * @param city City name
   * @param country Optional country code
   */
  @tool('Get current weather conditions for a city with optional country code')
  async getCurrentWeather(city: string, country?: string): Promise<{ temperature: number; conditions: string; city: string }> {
    // Simulated weather data
    return {
      temperature: Math.floor(Math.random() * 30) + 10,
      conditions: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)],
      city: country ? `${city}, ${country}` : city,
    };
  }

  /**
   * Get weather forecast for specified days
   * @param city City name
   * @param days Number of days (default: 7)
   */
  @tool('Get weather forecast for a city for the specified number of upcoming days')
  async getForecast(city: string, days: number = 7): Promise<Array<{ day: number; temperature: number; conditions: string }>> {
    // Simulated forecast data
    const forecast = [];
    for (let i = 1; i <= days; i++) {
      forecast.push({
        day: i,
        temperature: Math.floor(Math.random() * 30) + 10,
        conditions: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)],
      });
    }
    return forecast;
  }

  /**
   * Get historical weather data
   * @param city City name
   * @param startDate Start date (YYYY-MM-DD)
   * @param endDate End date (YYYY-MM-DD)
   */
  @tool('Get historical weather data for a city between start and end dates')
  async getHistoricalWeather(city: string, startDate: string, endDate: string): Promise<any> {
    // Simulated historical data
    return {
      city,
      period: { start: startDate, end: endDate },
      averageTemperature: Math.floor(Math.random() * 30) + 10,
      records: [],
    };
  }

  // Private helper method - won't be exposed as MCP tool
  private async makeRequest(url: string): Promise<any> {
    // Simulated API request
    return { data: 'mock data' };
  }

  // Protected method - won't be exposed
  protected validateCity(city: string): boolean {
    return city.length > 0;
  }
}

// Example usage (not part of MCP server)
if (require.main === module) {
  const service = new WeatherService();
  service.getCurrentWeather('London').then(console.log);
}
