import type { IUI, IServer } from '../../../src/index.js';

interface PortUI extends IUI {
  uri: 'ui://test/port';
  name: 'Port UI';
  description: 'URL with port';
  externalUrl: 'https://example.com:8443/dashboard';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
  description: 'Test server for MIME type tests';
}

export default class TestServerImpl implements TestServer { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }