import type { IUI, IServer } from '../../src/interface-types.js';

interface PrecedenceUI extends IUI {
  uri: 'ui://test/precedence';
  name: 'Precedence UI';
  description: 'Test precedence';
  externalUrl: 'https://example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}