import type { IUI, IServer } from '../../src/interface-types.js';

interface ParserUI extends IUI {
  uri: 'ui://test/parser';
  name: 'Parser Test';
  description: 'Parser integration';
  externalUrl: 'https://example.com/dashboard';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}