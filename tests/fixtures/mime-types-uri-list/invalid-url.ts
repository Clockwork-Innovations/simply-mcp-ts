import type { IUI, IServer } from '../../../src/index.js';

interface InvalidUI extends IUI {
  uri: 'ui://test/invalid';
  name: 'Invalid UI';
  description: 'Invalid URL';
  source: 'not-a-valid-url';
}

const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server for MIME type tests'
}

export default class TestServerImpl { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }