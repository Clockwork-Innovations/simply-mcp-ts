import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { WebSocket } from 'ws';

export interface WebSocketClientTransportOptions {
  /**
   * WebSocket URL (e.g., ws://localhost:8080)
   */
  url: string;

  /**
   * Reconnection options
   */
  reconnect?: {
    enabled: boolean;
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
  };
}

export class WebSocketClientTransport implements Transport {
  private ws: WebSocket | null = null;
  private messageQueue: JSONRPCMessage[] = [];
  private reconnectAttempts = 0;
  private options: Required<WebSocketClientTransportOptions>;

  constructor(options: WebSocketClientTransportOptions) {
    this.options = {
      url: options.url,
      reconnect: {
        enabled: options.reconnect?.enabled ?? true,
        maxAttempts: options.reconnect?.maxAttempts ?? 5,
        delayMs: options.reconnect?.delayMs ?? 1000,
        backoffMultiplier: options.reconnect?.backoffMultiplier ?? 2,
      },
    };
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.options.url);

      this.ws.on('open', () => {
        console.log('[WebSocket] Connected to', this.options.url);
        this.reconnectAttempts = 0;

        // Send queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift()!;
          this.send(message);
        }

        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as JSONRPCMessage;
          this.onmessage?.(message);
        } catch (error) {
          console.error('[WebSocket] Message parse error:', error);
          this.onerror?.(error as Error);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.log('[WebSocket] Disconnected:', code, reason.toString());
        this.handleReconnect();
        this.onclose?.();
      });

      this.ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
        this.onerror?.(error);
        reject(error);
      });
    });
  }

  async close(): Promise<void> {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  private async handleReconnect(): Promise<void> {
    if (!this.options.reconnect.enabled) {
      return;
    }

    if (this.reconnectAttempts >= this.options.reconnect.maxAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnect.delayMs *
      Math.pow(this.options.reconnect.backoffMultiplier, this.reconnectAttempts - 1);

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    setTimeout(() => {
      this.start().catch(console.error);
    }, delay);
  }

  // Transport interface callbacks
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
}

/**
 * Create a WebSocket MCP client
 * @param url WebSocket server URL (e.g., ws://localhost:8080)
 * @returns Connected MCP client
 */
export async function createWebSocketClient(url: string): Promise<Client> {
  const transport = new WebSocketClientTransport({ url });
  const client = new Client({
    name: 'websocket-client',
    version: '1.0.0',
  }, {
    capabilities: {},
  });

  await transport.start();
  await client.connect(transport);

  return client;
}
