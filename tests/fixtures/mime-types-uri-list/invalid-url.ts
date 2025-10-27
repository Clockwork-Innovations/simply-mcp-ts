import type { IUI, IServer } from '../../src/interface-types.js';

interface InvalidUI extends IUI {
  uri: 'ui://test/invalid';
  name: 'Invalid UI';
  description: 'Invalid URL';
  externalUrl: 'not-a-valid-url';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}