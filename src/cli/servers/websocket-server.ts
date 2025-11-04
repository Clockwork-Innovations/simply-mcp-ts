import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebSocketServerTransport } from '../../transports/websocket-server.js';
import type { IServer } from '../../server/interface-types.js';

/**
 * Start a WebSocket MCP server
 * @param server MCP Server instance
 * @param config Server configuration from IServer interface
 */
export async function startWebSocketServer(
  server: Server,
  config: IServer
): Promise<void> {
  const transport = new WebSocketServerTransport({
    port: config.websocket?.port ?? config.port ?? 8080,
    heartbeatInterval: config.websocket?.heartbeatInterval,
    heartbeatTimeout: config.websocket?.heartbeatTimeout,
    maxMessageSize: config.websocket?.maxMessageSize,
    wsOptions: config.websocket?.wsOptions,
  });

  await transport.start();
  await server.connect(transport);

  const port = config.websocket?.port ?? config.port ?? 8080;
  console.log(`MCP server '${config.name}' running on WebSocket port ${port}`);

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down WebSocket server...');
    try {
      await server.close();
      await transport.close();
      console.log('WebSocket server closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
