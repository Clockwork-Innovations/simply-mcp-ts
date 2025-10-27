import type { IUI, IServer } from '../../src/interface-types.js';

interface CustomNameUI extends IUI {
  uri: 'ui://analytics/dashboard';
  name: 'Custom Analytics Dashboard';
  description: 'Custom name test';
  externalUrl: 'https://analytics.example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}