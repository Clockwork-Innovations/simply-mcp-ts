import type { IUI, IServer } from '../../../src/index.js';

interface QueryUI extends IUI {
  uri: 'ui://test/query';
  name: 'Query UI';
  description: 'URL with query params';
  externalUrl: 'https://example.com/dashboard?user=123&view=analytics';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
  description: 'Test server for MIME type tests';
}

export default class TestServerImpl implements TestServer { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }