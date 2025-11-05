import type { IUI, IServer } from '../../../src/index.js';

interface EncodedUI extends IUI {
  uri: 'ui://test/encoded';
  name: 'Encoded UI';
  description: 'URL with encoded chars';
  source: 'https://example.com/search?q=hello%20world&lang=en';
}

const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server for MIME type tests'
}

export default class TestServerImpl { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }