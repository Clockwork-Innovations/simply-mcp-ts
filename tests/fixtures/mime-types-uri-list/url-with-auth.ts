import type { IUI, IServer } from '../../src/interface-types.js';

interface AuthUI extends IUI {
  uri: 'ui://test/auth';
  name: 'Auth UI';
  description: 'URL with auth';
  externalUrl: 'https://user:pass@example.com/dashboard';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}