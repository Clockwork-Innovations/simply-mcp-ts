// app/api/mcp/resources/route.ts
// GET /api/mcp/resources - List all available resources (server-side)

import { NextResponse } from 'next/server';
import { getMCPClient, isConnected } from '../server-instance';

export async function GET() {
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

    const result = await mcpClient.listResources();

    return NextResponse.json({ success: true, data: result.resources || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list resources' },
      { status: 500 }
    );
  }
}
