import type { IUI, IServer } from '../../src/interface-types.js';

interface ExternalDashboard extends IUI {
  uri: 'ui://dashboard/external';
  name: 'External Dashboard';
  description: 'External analytics dashboard';
  externalUrl: 'https://dashboard.example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}