import type { IUI, IServer } from '../../../src/index.js';

interface IDNUI extends IUI {
  uri: 'ui://test/idn';
  name: 'IDN UI';
  description: 'International domain';
  externalUrl: 'https://münchen.example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
  description: 'Test server for MIME type tests';
}

export default class TestServerImpl implements TestServer { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }