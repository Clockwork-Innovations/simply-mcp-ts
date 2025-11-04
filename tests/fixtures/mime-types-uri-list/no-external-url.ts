import type { IUI, IServer } from '../../../src/index.js';

interface InternalUI extends IUI {
  uri: 'ui://internal/ui';
  name: 'Internal UI';
  description: 'Inline HTML UI';
  html: '<div>Hello World</div>';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
  description: 'Test server for MIME type tests';
}

export default class TestServerImpl implements TestServer { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }