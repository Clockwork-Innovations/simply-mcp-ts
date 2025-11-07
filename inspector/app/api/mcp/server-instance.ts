// app/api/mcp/server-instance.ts
// Global MCP client instance shared across API routes (server-side only)

import { UniversalMCPClient, type ConnectionConfig, type ServerInfo } from './universal-mcp-client';

let mcpClient: UniversalMCPClient | null = null;
let connectionConfig: ConnectionConfig | null = null;
let serverInfo: ServerInfo | null = null;

/**
 * Set the active MCP client instance
 */
export function setMCPClient(client: UniversalMCPClient, config: ConnectionConfig, info: ServerInfo) {
  mcpClient = client;
  connectionConfig = config;
  serverInfo = info;
}

/**
 * Clear the MCP client instance (disconnect)
 */
export async function clearMCPClient() {
  if (mcpClient) {
    try {
      await mcpClient.disconnect();
    } catch (error) {
      console.error('Error disconnecting MCP client:', error);
    }
  }
  mcpClient = null;
  connectionConfig = null;
  serverInfo = null;
}

/**
 * Get the current MCP client instance
 */
export function getMCPClient(): UniversalMCPClient | null {
  return mcpClient;
}

/**
 * Get the current connection config
 */
export function getConnectionConfig(): ConnectionConfig | null {
  return connectionConfig;
}

/**
 * Get the current server info
 */
export function getServerInfo(): ServerInfo | null {
  return serverInfo;
}

/**
 * Check if currently connected to an MCP server
 */
export function isConnected(): boolean {
  return mcpClient !== null && mcpClient.isConnected();
}
