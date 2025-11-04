import type { IUI, IServer } from '../../../src/index.js';

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
  description: 'Test server for MIME type tests';
}

export default class TestServerImpl implements TestServer { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }