export interface WeatherData {
  temperature: number;
  humidity: number;
  conditions: string;
}

export interface Forecast {
  date: string;
  temperature: number;
  conditions: string;
}

export class WeatherService {
  /**
   * Get current weather for a city
   * @param city The city name
   * @param country Optional country code
   */
  async getCurrentWeather(city: string, country?: string): Promise<WeatherData> {
    // Implementation
    return {
      temperature: 72,
      humidity: 65,
      conditions: 'sunny',
    };
  }

  /**
   * Get weather forecast for a city
   * @param city The city name
   * @param days Number of days to forecast
   */
  async getForecast(city: string, days: number = 7): Promise<Forecast[]> {
    // Implementation
    const forecasts: Forecast[] = [];
    for (let i = 0; i < days; i++) {
      forecasts.push({
        date: new Date(Date.now() + i * 86400000).toISOString(),
        temperature: 70 + Math.random() * 10,
        conditions: 'partly cloudy',
      });
    }
    return forecasts;
  }

  private helperMethod(): void {
    // Should not be exposed as tool
    console.log('This is a private helper method');
  }
}
