import type { IUI, IServer } from '../../src/interface-types.js';

interface InternalUI extends IUI {
  uri: 'ui://internal/ui';
  name: 'Internal UI';
  description: 'Inline HTML UI';
  html: '<div>Hello World</div>';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}