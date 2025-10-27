import type { IUI, IServer } from '../../src/interface-types.js';

interface FragmentUI extends IUI {
  uri: 'ui://test/fragment';
  name: 'Fragment UI';
  description: 'URL with fragment';
  externalUrl: 'https://example.com/page#section';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}