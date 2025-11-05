import type { IUI, IServer } from '../../../src/index.js';

interface QueryUI extends IUI {
  uri: 'ui://test/query';
  name: 'Query UI';
  description: 'URL with query params';
  source: 'https://example.com/dashboard?user=123&view=analytics';
}

const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server for MIME type tests'
}

export default class TestServerImpl { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }