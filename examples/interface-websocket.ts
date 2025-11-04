/**
 * WebSocket Transport Example
 *
 * This example demonstrates how to use the WebSocket transport for real-time,
 * bidirectional communication with MCP clients.
 *
 * WebSocket provides lower latency compared to HTTP SSE and native browser support.
 *
 * To run this example:
 *   npx tsx examples/interface-websocket.ts
 *
 * To test with a WebSocket client:
 *   node -e "const { WebSocket } = require('ws'); const ws = new WebSocket('ws://localhost:8080'); ws.on('open', () => { ws.send(JSON.stringify({jsonrpc:'2.0',method:'tools/list',id:1})); }); ws.on('message', (data) => { console.log('Response:', data.toString()); ws.close(); });"
 */

import type { IServer, ITool } from '../src/index.js';

// ===== Tool Definitions =====

/**
 * Echo tool - returns the input message
 */
interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo back the provided message';
  params: {
    message: string;
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

// ===== Server Interface =====

interface WebSocketExampleServer extends IServer {
  name: 'websocket-example';
  version: '1.0.0';
  description: 'Example MCP server using WebSocket transport';

  // WebSocket transport configuration
  // Note: presence of 'websocket' field implies transport type
  websocket: {
    port: 8080;
    heartbeatInterval: 30000; // 30 seconds
    heartbeatTimeout: 60000;  // 60 seconds
    maxMessageSize: 10485760; // 10MB
  };
}

// ===== Server Implementation =====
// Zero boilerplate - only implement the actual tool logic!
// Config is parsed from interface, not repeated here.

export default class implements WebSocketExampleServer {

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
  get_time: GetTimeTool = async () => {
    return {
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  };
}
