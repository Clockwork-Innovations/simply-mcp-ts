import type { GetWeatherTool } from './__auto-gen-test.js';

export default class WeatherService {
  getWeather(params: GetWeatherTool['params']): Promise<GetWeatherTool['result']>;
}
