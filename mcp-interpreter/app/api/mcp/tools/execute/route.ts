// app/api/mcp/tools/execute/route.ts
// POST /api/mcp/tools/execute - Execute a tool with parameters (server-side)

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

    const { name, parameters } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Tool name is required' },
        { status: 400 }
      );
    }

    const result = await mcpClient.callTool(name, parameters || {});

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Tool execution failed' },
      { status: 500 }
    );
  }
}
