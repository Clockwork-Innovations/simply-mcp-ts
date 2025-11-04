import type { IUI, IServer } from '../../../src/index.js';

interface FileUI extends IUI {
  uri: 'ui://test/file';
  name: 'File UI';
  description: 'File URL';
  externalUrl: 'file:///home/user/dashboard.html';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
  description: 'Test server for MIME type tests';
}

export default class TestServerImpl implements TestServer { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }