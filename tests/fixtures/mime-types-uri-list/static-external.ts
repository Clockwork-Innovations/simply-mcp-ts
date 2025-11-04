import type { IUI, IServer } from '../../../src/index.js';

interface StaticExternal extends IUI {
  uri: 'ui://test/static';
  name: 'Static External';
  description: 'Static external URL';
  externalUrl: 'https://static.example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
  description: 'Test server for MIME type tests';
}

export default class TestServerImpl implements TestServer { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }