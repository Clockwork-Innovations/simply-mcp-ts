// app/api/mcp/subscriptions/unsubscribe/route.ts
// POST /api/mcp/subscriptions/unsubscribe - Unsubscribe from resource updates (server-side)

import { NextRequest, NextResponse } from 'next/server';
import { getMCPClient, isConnected } from '../../server-instance';

export async function POST(request: NextRequest) {
  try {
    if (!isConnected()) {
      return NextResponse.json(
        { success: false, error: 'Not connected to MCP server' },
        { status: 400 }
      );
    }

    const mcpClient = getMCPClient();
    if (!mcpClient) {
      return NextResponse.json(
        { success: false, error: 'MCP client not initialized' },
        { status: 500 }
      );
    }

    const { uri } = await request.json();

    if (!uri) {
      return NextResponse.json(
        { success: false, error: 'Resource URI is required' },
        { status: 400 }
      );
    }

    await mcpClient.unsubscribe(uri);

    return NextResponse.json({ success: true, data: { uri, subscribed: false } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}
