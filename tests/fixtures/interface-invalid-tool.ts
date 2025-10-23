import type { ITool, IServer } from '../../src/index.js';

interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo a string';
  params: {
    message: string;
  };
  result: {
    echoed: string;
  };
}

interface EchoServer extends IServer {
  name: 'invalid-echo-server';
  version: '1.0.0';
}

export default class InvalidEchoServer {
  // Intentionally incorrect parameter type to exercise loader validation.
  echo = async (params: { value: number }) => ({
    echoed: String(params.value),
  });
}
