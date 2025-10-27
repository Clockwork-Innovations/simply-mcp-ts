import type { IUI, IServer } from '../../src/interface-types.js';

interface IDNUI extends IUI {
  uri: 'ui://test/idn';
  name: 'IDN UI';
  description: 'International domain';
  externalUrl: 'https://münchen.example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}