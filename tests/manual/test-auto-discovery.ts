/**
 * Test file for v4 auto-discovery patterns
 */

import type { IServer, ITool, IResource, IPrompt, ToolHelper, ResourceHelper, PromptHelper } from './src/server/interface-types.js';

// Pattern 1: Const server
const server: IServer = {
  name: 'auto-discovery-test',
  version: '1.0.0',
  description: 'Testing auto-discovery features'
};

// Tool interfaces
interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: {
    a: number;
    b: number;
  };
  result: {
    sum: number;
  };
}

interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get weather for a location';
  params: {
    location: string;
  };
  result: {
    temperature: number;
    conditions: string;
  };
}

// Resource interface
interface UsersResource extends IResource {
  uri: 'users://list';
  name: 'Users List';
  description: 'List of all users';
  mimeType: 'application/json';
  data: Array<{ id: string; name: string }>;
}

// Prompt interface
interface GreetPrompt extends IPrompt {
  name: 'greet';
  description: 'Generate a greeting';
  args: {
    name: string;
  };
  template: string;
}

// Pattern 2: Const tool implementation
const add: ToolHelper<AddTool> = async (params) => {
  return { sum: params.a + params.b };
};

// Pattern 3: Const resource implementation
const usersResource: ResourceHelper<UsersResource> = async () => {
  return [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' }
  ];
};

// Pattern 4: Const prompt implementation
const greetPrompt: PromptHelper<GreetPrompt> = (args) => {
  return `Hello ${args.name}! Welcome to our service.`;
};

// Pattern 5: Class with tool properties
class WeatherService {
  private cache = new Map<string, any>();

  getWeather: ToolHelper<GetWeatherTool> = async (params) => {
    if (this.cache.has(params.location)) {
      return this.cache.get(params.location);
    }

    const result = {
      temperature: 72,
      conditions: 'Sunny'
    };

    this.cache.set(params.location, result);
    return result;
  };
}

// Pattern 6: Class instantiation
const weatherService = new WeatherService();
