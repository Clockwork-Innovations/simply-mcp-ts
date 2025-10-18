
import { MCPServer, Router, tool } from '../src/index.js';

@MCPServer({ name: 'adapter-test', version: '1.0.0' })
@Router({
  name: 'weather-ops',
  description: 'Weather operations',
  tools: ['getWeather', 'getForecast']
})
export default class WeatherServer {
  @tool('Get current weather')
  getWeather(city: string) {
    return `Weather in ${city}`;
  }

  @tool('Get forecast')
  getForecast(city: string, days: number) {
    return `Forecast for ${city} for ${days} days`;
  }
}
