/**
 * WebSocket Transport Example
 *
 * This example demonstrates how to use the WebSocket transport for real-time,
 * bidirectional communication with MCP clients.
 *
 * WebSocket provides lower latency compared to HTTP SSE and native browser support.
 *
 * To run this example:
 *   npm run build && node dist/src/cli/index.js run examples/interface-websocket.ts
 *
 * To test with a WebSocket client:
 *   node -e "const { WebSocket } = require('ws'); const ws = new WebSocket('ws://localhost:8080'); ws.on('open', () => { ws.send(JSON.stringify({jsonrpc:'2.0',method:'tools/list',id:1})); }); ws.on('message', (data) => { console.log('Response:', data.toString()); ws.close(); });"
 */

import type { IServer, ITool, IParam } from '../src/index.js';

// ===== Server Configuration =====

const server: IServer = {
  name: 'websocket-example',
  version: '1.0.0',
  description: 'Example MCP server using WebSocket transport',

  // WebSocket transport configuration
  websocket: {
    port: 8080,
    heartbeatInterval: 30000, // 30 seconds
    heartbeatTimeout: 60000,  // 60 seconds
    maxMessageSize: 10485760  // 10MB
  }
};

// ===== Parameter Interfaces =====

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message to echo back';
}

// ===== Tool Definitions =====

/**
 * Echo tool - returns the input message
 */
interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo back the provided message';
  params: {
    message: MessageParam;
  };
  result: {
    echo: string;
  };
}

/**
 * Get time tool - returns current server time
 */
interface GetTimeTool extends ITool {
  name: 'get_time';
  description: 'Get the current server time';
  params: {};
  result: {
    timestamp: string;
    timezone: string;
  };
}

// ===== Server Implementation =====

export default class WebSocketExample {
  /**
   * Echo tool implementation
   */
  echo: EchoTool = async (params) => {
    return {
      echo: params.message,
    };
  };

  /**
   * Get time tool implementation
   */
  getTime: GetTimeTool = async () => {
    return {
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  };
}
