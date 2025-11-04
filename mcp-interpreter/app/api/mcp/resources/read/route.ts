// app/api/mcp/resources/read/route.ts
// POST /api/mcp/resources/read - Read content from a resource (server-side)

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

    const result = await mcpClient.readResource(uri);

    return NextResponse.json({ success: true, data: result.contents?.[0] || { uri, text: '' } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to read resource' },
      { status: 500 }
    );
  }
}
