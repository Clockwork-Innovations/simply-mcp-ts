import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { WebSocket, WebSocketServer, ServerOptions, RawData } from 'ws';
import { IncomingMessage } from 'http';

export interface WebSocketServerTransportOptions {
  /**
   * Port to listen on (default: 8080)
   */
  port?: number;

  /**
   * WebSocket server options
   */
  wsOptions?: ServerOptions;

  /**
   * Heartbeat interval in ms (default: 30000)
   */
  heartbeatInterval?: number;

  /**
   * Heartbeat timeout in ms (default: 60000)
   */
  heartbeatTimeout?: number;

  /**
   * Maximum message size in bytes (default: 10MB)
   */
  maxMessageSize?: number;
}

export class WebSocketServerTransport implements Transport {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private options: Required<WebSocketServerTransportOptions>;

  constructor(options: WebSocketServerTransportOptions = {}) {
    this.options = {
      port: options.port ?? 8080,
      wsOptions: options.wsOptions ?? {},
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      heartbeatTimeout: options.heartbeatTimeout ?? 60000,
      maxMessageSize: options.maxMessageSize ?? 10 * 1024 * 1024, // 10MB
    };

    this.wss = new WebSocketServer({
      port: this.options.port,
      ...this.options.wsOptions,
    });

    this.setupServerListeners();
  }

  private setupServerListeners(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);

      console.log(`[WebSocket] Client connected: ${clientId}`);

      // Setup client listeners
      this.setupClientListeners(clientId, ws);

      // Start heartbeat
      this.startHeartbeat(clientId, ws);
    });

    this.wss.on('error', (error: Error) => {
      console.error('[WebSocket] Server error:', error);
    });
  }

  private setupClientListeners(clientId: string, ws: WebSocket): void {
    ws.on('message', (data: RawData) => {
      try {
        // Check message size
        const size = Buffer.byteLength(data.toString());
        if (size > this.options.maxMessageSize) {
          this.sendError(ws, -32700, `Message size ${size} exceeds maximum ${this.options.maxMessageSize}`);
          return;
        }

        // Parse JSON-RPC message
        const message = JSON.parse(data.toString()) as JSONRPCMessage;

        // Emit message to handler
        this.onmessage?.(message);

        // Reset heartbeat timer on activity
        this.resetHeartbeat(clientId, ws);
      } catch (error) {
        console.error('[WebSocket] Message parse error:', error);
        this.sendError(ws, -32700, 'Parse error');
      }
    });

    ws.on('close', (code: number, reason: string) => {
      console.log(`[WebSocket] Client disconnected: ${clientId} (${code}: ${reason})`);
      this.cleanup(clientId);
      this.onclose?.();
    });

    ws.on('error', (error: Error) => {
      console.error(`[WebSocket] Client error (${clientId}):`, error);
      this.onerror?.(error);
    });

    ws.on('pong', () => {
      // Client is alive, reset heartbeat
      this.resetHeartbeat(clientId, ws);
    });
  }

  private startHeartbeat(clientId: string, ws: WebSocket): void {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();

        // Set timeout to close connection if no pong received
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log(`[WebSocket] Heartbeat timeout for ${clientId}`);
            ws.terminate();
          }
        }, this.options.heartbeatTimeout);
      }
    }, this.options.heartbeatInterval);

    this.heartbeatIntervals.set(clientId, interval);
  }

  private resetHeartbeat(clientId: string, ws: WebSocket): void {
    // Heartbeat is handled by ping/pong, no need to reset
    // Just log activity if needed
  }

  private cleanup(clientId: string): void {
    const interval = this.heartbeatIntervals.get(clientId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(clientId);
    }
    this.clients.delete(clientId);
  }

  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private sendError(ws: WebSocket, code: number, message: string): void {
    const errorMessage = {
      jsonrpc: '2.0',
      error: { code, message },
      id: null,
    };
    ws.send(JSON.stringify(errorMessage));
  }

  // Transport interface implementation
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss.once('listening', () => {
        console.log(`[WebSocket] Server listening on port ${this.options.port}`);
        resolve();
      });
      this.wss.once('error', reject);
    });
  }

  async close(): Promise<void> {
    // Close all client connections
    const clientEntries = Array.from(this.clients.entries());
    for (const [clientId, ws] of clientEntries) {
      ws.close(1000, 'Server shutdown');
      this.cleanup(clientId);
    }

    // Close server
    return new Promise((resolve) => {
      this.wss.close(() => {
        console.log('[WebSocket] Server closed');
        resolve();
      });
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    const data = JSON.stringify(message);

    // Broadcast to all connected clients
    const clientList = Array.from(this.clients.values());
    for (const ws of clientList) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  // Transport interface callbacks
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
}
