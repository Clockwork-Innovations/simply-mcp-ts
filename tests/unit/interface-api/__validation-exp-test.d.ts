import type { GetWeatherTool } from './__validation-exp-test.js';

export default class WeatherService {
  getWeather(params: GetWeatherTool['params']): Promise<GetWeatherTool['result']>;
}
