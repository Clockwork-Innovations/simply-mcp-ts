import type { IUI, IServer } from '../../src/interface-types.js';

interface QueryUI extends IUI {
  uri: 'ui://test/query';
  name: 'Query UI';
  description: 'URL with query params';
  externalUrl: 'https://example.com/dashboard?user=123&view=analytics';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}