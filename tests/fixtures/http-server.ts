/**
 * Test Fixture: HTTP Server with File-Based Transport Config
 *
 * This server uses transport: 'http' and port: 4000 in the IServer interface.
 * Should start on HTTP without needing --http CLI flag.
 */

import type { ITool, IServer, ToolHelper } from '../../src/interface-types.js';

// Server configuration with HTTP transport
interface MyHttpServer extends IServer {
  name: 'http-test-server';
  version: '1.0.0';
  description: 'Test server with HTTP transport configured in file';
  transport: 'http';
  port: 4000;
  stateful: true;
}

// Simple greet tool with proper IParam format
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a user by name';
  params: {
    name: { type: 'string'; description: 'Name of the user to greet' };
  };
  result: string;
}

// Tool implementation
const greet: ToolHelper<GreetTool> = async (params) => {
  return `Hello, ${params.name}! This server is configured for HTTP transport.`;
};

// Server implementation using v4 const-based pattern
const server: MyHttpServer = {
  name: 'http-test-server',
  version: '1.0.0',
  description: 'Test server with HTTP transport configured in file',
  transport: 'http',
  port: 4000,
  stateful: true,
  greet
};

export default server;
