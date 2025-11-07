// app/api/mcp/completions/route.ts
// POST /api/mcp/completions - Get autocomplete suggestions (server-side)

import { NextRequest, NextResponse } from 'next/server';
import { getMCPClient, isConnected } from '../server-instance';

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

    const completionRequest = await request.json();

    if (!completionRequest.ref || !completionRequest.argument) {
      return NextResponse.json(
        { success: false, error: 'Invalid completion request - ref and argument are required' },
        { status: 400 }
      );
    }

    const result = await mcpClient.complete(completionRequest.ref, completionRequest.argument);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get completions' },
      { status: 500 }
    );
  }
}
