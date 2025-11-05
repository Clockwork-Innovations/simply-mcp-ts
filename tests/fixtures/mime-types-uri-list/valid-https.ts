import type { IUI, IServer } from '../../../src/index.js';

interface HttpsUI extends IUI {
  uri: 'ui://test/https';
  name: 'HTTPS UI';
  description: 'HTTPS URL';
  externalUrl: 'https://secure.example.com';
}

const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server for MIME type tests'
}

export default class TestServerImpl { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }