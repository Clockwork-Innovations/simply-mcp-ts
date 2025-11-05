import type { IUI, IServer } from '../../../src/index.js';

interface PortUI extends IUI {
  uri: 'ui://test/port';
  name: 'Port UI';
  description: 'URL with port';
  source: 'https://example.com:8443/dashboard';
}

const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server for MIME type tests'
}

export default class TestServerImpl { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }