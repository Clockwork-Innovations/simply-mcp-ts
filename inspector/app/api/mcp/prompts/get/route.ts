// app/api/mcp/prompts/get/route.ts
// POST /api/mcp/prompts/get - Get prompt with arguments (server-side)

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

    const { name, arguments: args } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Prompt name is required' },
        { status: 400 }
      );
    }

    const result = await mcpClient.getPrompt(name, args || {});

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get prompt' },
      { status: 500 }
    );
  }
}
