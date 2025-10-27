import type { IUI, IServer } from '../../src/interface-types.js';

interface HttpsUI extends IUI {
  uri: 'ui://test/https';
  name: 'HTTPS UI';
  description: 'HTTPS URL';
  externalUrl: 'https://secure.example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}