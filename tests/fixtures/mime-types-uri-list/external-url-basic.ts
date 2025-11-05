import type { IUI, IServer } from '../../../src/index.js';

interface ExternalDashboard extends IUI {
  uri: 'ui://dashboard/external';
  name: 'External Dashboard';
  description: 'External analytics dashboard';
  source: 'https://dashboard.example.com';
}

const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server for MIME type tests'
}

export default class TestServerImpl { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }