import type { IUI, IServer } from '../../src/interface-types.js';

// This should fail during parsing due to mutual exclusivity
interface ConflictUI extends IUI {
  uri: 'ui://test/conflict';
  name: 'Conflict UI';
  description: 'Should fail';
  externalUrl: 'https://example.com';
  // html: '<div>Hello</div>'; // Cannot add both in TypeScript interface
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}