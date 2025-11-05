/**
 * Test Server with Authentication
 *
 * This is a fixture file for testing the auth adapter.
 */

import type { IServer, IApiKeyAuth, ITool, ToolHelper } from '../../src/index.js';

// Define API Key authentication configuration
interface AdminAuth extends IApiKeyAuth {
  type: 'apiKey';
  headerName: 'x-api-key';
  keys: [
    { name: 'admin', key: 'sk-admin-xyz123', permissions: ['*'] },
    { name: 'readonly', key: 'sk-read-abc456', permissions: ['read:*'] },
    { name: 'weather', key: 'sk-weather-def789', permissions: ['tool:get_weather', 'tool:get_forecast'] }
  ];
  allowAnonymous: false;
}

// Define server interface with authentication
const server: IServer = {
  name: 'test-auth-server',
  version: '1.0.0',
  description: 'Test server with authentication'
  transport: 'http';
  port: 3000;
  auth: AdminAuth;
}

// Define a simple tool with proper IParam format
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a user';
  params: {
    name: { type: 'string'; description: 'Name of the user to greet' };
  };
  result: string;
}

// Tool implementation
const greet: ToolHelper<GreetTool> = async (params) => {
  return `Hello, ${params.name}!`;
};

// Server implementation using v4 const-based pattern
const server: TestAuthServer = {
  name: 'test-auth-server',
  version: '1.0.0',
  description: 'Test server with authentication',
  transport: 'http',
  port: 3000,
  auth: {
    type: 'apiKey',
    headerName: 'x-api-key',
    keys: [
      { name: 'admin', key: 'sk-admin-xyz123', permissions: ['*'] },
      { name: 'readonly', key: 'sk-read-abc456', permissions: ['read:*'] },
      { name: 'weather', key: 'sk-weather-def789', permissions: ['tool:get_weather', 'tool:get_forecast'] }
    ],
    allowAnonymous: false
  },
  greet
};

export default server;
