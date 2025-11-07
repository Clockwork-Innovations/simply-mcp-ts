// app/api/mcp/prompts/route.ts
// GET /api/mcp/prompts - List all available prompts (server-side)

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

    const result = await mcpClient.listPrompts();

    return NextResponse.json({ success: true, data: result.prompts || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list prompts' },
      { status: 500 }
    );
  }
}
