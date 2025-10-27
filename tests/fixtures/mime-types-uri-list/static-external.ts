import type { IUI, IServer } from '../../src/interface-types.js';

interface StaticExternal extends IUI {
  uri: 'ui://test/static';
  name: 'Static External';
  description: 'Static external URL';
  externalUrl: 'https://static.example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}