// app/api/mcp/status/route.ts
// GET /api/mcp/status - Get connection status (server-side)

import { NextResponse } from 'next/server';
import { getMCPClient, getServerInfo, getConnectionConfig } from '../server-instance';

export async function GET() {
  try {
    const mcpClient = getMCPClient();
    const info = getServerInfo();
    const config = getConnectionConfig();

    return NextResponse.json({
      success: true,
      data: {
        status: mcpClient?.isConnected() ? 'connected' : 'disconnected',
        serverName: info?.name || 'Unknown Server',
        serverVersion: info?.version || '0.0.0',
        capabilities: info?.capabilities || {},
        transport: config?.type || 'unknown'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    );
  }
}
