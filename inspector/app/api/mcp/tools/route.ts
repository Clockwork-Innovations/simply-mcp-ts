// app/api/mcp/tools/route.ts
// GET /api/mcp/tools - List all available tools (server-side)

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

    const result = await mcpClient.listTools();

    return NextResponse.json({ success: true, data: result.tools || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list tools' },
      { status: 500 }
    );
  }
}
