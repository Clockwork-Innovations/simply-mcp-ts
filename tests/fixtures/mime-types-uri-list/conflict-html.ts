import type { IUI, IServer } from '../../../src/index.js';

// This should fail during parsing due to mutual exclusivity
interface ConflictUI extends IUI {
  uri: 'ui://test/conflict';
  name: 'Conflict UI';
  description: 'Should fail';
  source: 'https://example.com';
  // html: '<div>Hello</div>'; // Cannot add both in TypeScript interface
}

const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server for MIME type tests'
}

export default class TestServerImpl { name = 'test-server' as const; version = '1.0.0' as const; description = 'Test server for MIME type tests' as const; }