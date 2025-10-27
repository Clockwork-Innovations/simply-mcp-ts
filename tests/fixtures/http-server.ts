/**
 * Test Fixture: HTTP Server with File-Based Transport Config
 *
 * This server uses transport: 'http' and port: 4000 in the IServer interface.
 * Should start on HTTP without needing --http CLI flag.
 */

import type { ITool, IServer } from '../../src/interface-types.js';

// Server configuration with HTTP transport
interface MyHttpServer extends IServer {
  name: 'http-test-server';
  version: '1.0.0';
  description: 'Test server with HTTP transport configured in file';
  transport: 'http';
  port: 4000;
  stateful: true;
}

// Simple greet tool
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a user by name';
  params: { name: string };
  result: string;
}

// Server implementation
export default class HttpTestServer implements MyHttpServer {
  greet: GreetTool = async ({ name }) => {
    return `Hello, ${name}! This server is configured for HTTP transport.`;
  };
}
