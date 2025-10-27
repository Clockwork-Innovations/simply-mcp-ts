import type { IUI, IServer } from '../../src/interface-types.js';

interface FileUI extends IUI {
  uri: 'ui://test/file';
  name: 'File UI';
  description: 'File URL';
  externalUrl: 'file:///home/user/dashboard.html';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}