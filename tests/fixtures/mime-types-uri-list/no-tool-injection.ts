import type { IUI, IServer } from '../../src/interface-types.js';

interface NoToolsUI extends IUI {
  uri: 'ui://test/no-tools';
  name: 'No Tools UI';
  description: 'External URL with no tool injection';
  externalUrl: 'https://example.com';
  tools: ['some_tool', 'another_tool'];
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}