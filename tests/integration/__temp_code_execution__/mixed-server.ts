
import type { IServer, ITool, IParam } from '../../../src/index.js';

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { message: MessageParam };
  result: string;
}

export const server: IServer = {
  name: 'mixed-server',
  version: '1.0.0',
  description: 'Server with tools and code execution',
  codeExecution: {
    mode: 'vm',
    timeout: 5000,
  }
};

export default class TestServer {
  greet: GreetTool = async ({ message }) => `Hello, ${message}!`;
}
