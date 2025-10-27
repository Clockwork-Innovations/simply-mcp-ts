import type { IUI, IServer } from '../../src/interface-types.js';

interface StructureUI extends IUI {
  uri: 'ui://test/structure';
  name: 'Structure Test';
  description: 'Test resource structure';
  externalUrl: 'https://example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}