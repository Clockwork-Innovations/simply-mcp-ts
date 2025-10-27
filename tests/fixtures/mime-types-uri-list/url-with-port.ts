import type { IUI, IServer } from '../../src/interface-types.js';

interface PortUI extends IUI {
  uri: 'ui://test/port';
  name: 'Port UI';
  description: 'URL with port';
  externalUrl: 'https://example.com:8443/dashboard';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}