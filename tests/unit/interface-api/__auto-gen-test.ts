
import type { ITool, IServer } from '../../../src/api/interface/types.js';

interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather';
  params: { location: string };
  result: { temperature: number };
}

interface WeatherServer extends IServer {
  name: 'weather-server';
  version: '1.0.0';
}

export default class WeatherService implements WeatherServer {
  getWeather = async (params: GetWeatherTool['params']): Promise<GetWeatherTool['result']> => {
    return { temperature: 72 };
  };
}
