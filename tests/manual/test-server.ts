/**
 * Test MCP server for querying tools
 */

import type { IServer, ITool, IParam, ToolHelper } from './src/index.js';

const server: IServer = {
  name: 'test-mcp-server',
  version: '1.0.0',
  description: 'Test MCP server for querying tool list'
};

// ============================================================================
// Parameter Interfaces
// ============================================================================

interface NameParam extends IParam {
  type: 'string';
  description: 'Person name';
  minLength: 1;
}

interface AgeParam extends IParam {
  type: 'number';
  description: 'Person age in years';
  minimum: 0;
  maximum: 150;
}

interface CityParam extends IParam {
  type: 'string';
  description: 'City name';
  minLength: 1;
}

interface UnitsParam extends IParam {
  type: 'string';
  description: 'Temperature units';
  enum: ['celsius', 'fahrenheit'];
}

// ============================================================================
// Tool Interfaces
// ============================================================================

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Send a greeting to someone';
  params: {
    name: NameParam;
    age: AgeParam;
  };
  result: {
    message: string;
  };
}

interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather for a city';
  params: {
    city: CityParam;
    units: UnitsParam;
  };
  result: {
    temperature: number;
    units: string;
    description: string;
  };
}

interface CalculatorTool extends ITool {
  name: 'calculate';
  description: 'Perform basic arithmetic operations';
  params: {
    operation: IParam & {
      type: 'string';
      description: 'Operation to perform (add, subtract, multiply, divide)';
      enum: ['add', 'subtract', 'multiply', 'divide'];
    };
    a: IParam & {
      type: 'number';
      description: 'First number';
    };
    b: IParam & {
      type: 'number';
      description: 'Second number';
    };
  };
  result: {
    result: number;
    operation: string;
  };
}

// ============================================================================
// Tool Implementations
// ============================================================================

const greet: ToolHelper<GreetTool> = async (params) => {
  return {
    message: `Hello ${params.name}, you are ${params.age} years old!`
  };
};

const getWeather: ToolHelper<GetWeatherTool> = async (params) => {
  const temp = params.units === 'celsius' ? 22 : 72;
  return {
    temperature: temp,
    units: params.units,
    description: 'Sunny with clear skies'
  };
};

const calculate: ToolHelper<CalculatorTool> = async (params) => {
  let result = 0;
  switch (params.operation) {
    case 'add':
      result = params.a + params.b;
      break;
    case 'subtract':
      result = params.a - params.b;
      break;
    case 'multiply':
      result = params.a * params.b;
      break;
    case 'divide':
      result = params.a / params.b;
      break;
  }
  return {
    result,
    operation: params.operation
  };
};

export { server, greet, getWeather, calculate };
