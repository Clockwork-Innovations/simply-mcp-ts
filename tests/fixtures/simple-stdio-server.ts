/**
 * Simple test server for Agent SDK stdio compatibility testing
 * This server is intentionally minimal to isolate stdio transport issues
 */

export interface IGreetTool {
  name: 'greet';
  description: 'Greet a person by name';
  params: {
    name: string;
  };
}

export interface IAddTool {
  name: 'add';
  description: 'Add two numbers';
  params: {
    a: number;
    b: number;
  };
}

export interface IServer {
  name: 'simple-stdio-test-server';
  version: '1.0.0';
  description: 'Simple server for testing stdio transport with Agent SDK';
}

export default class SimpleStdioServer {
  greet: IGreetTool = async (params) => {
    return `Hello, ${params.name}!`;
  };

  add: IAddTool = async (params) => {
    return `${params.a} + ${params.b} = ${params.a + params.b}`;
  };
}
