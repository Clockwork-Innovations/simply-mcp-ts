import type { IUI, IServer } from '../../src/interface-types.js';

interface HttpUI extends IUI {
  uri: 'ui://test/http';
  name: 'HTTP UI';
  description: 'HTTP URL';
  externalUrl: 'http://example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}