import type { IUI, IServer } from '../../src/interface-types.js';

interface EncodedUI extends IUI {
  uri: 'ui://test/encoded';
  name: 'Encoded UI';
  description: 'URL with encoded chars';
  externalUrl: 'https://example.com/search?q=hello%20world&lang=en';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}