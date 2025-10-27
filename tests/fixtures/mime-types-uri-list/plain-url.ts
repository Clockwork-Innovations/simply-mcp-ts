import type { IUI, IServer } from '../../src/interface-types.js';

interface PlainUI extends IUI {
  uri: 'ui://test/plain';
  name: 'Plain UI';
  description: 'Plain URL test';
  externalUrl: 'https://analytics.example.com/dashboard';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}