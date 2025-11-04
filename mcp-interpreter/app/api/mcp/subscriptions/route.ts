// app/api/mcp/subscriptions/route.ts
// GET /api/mcp/subscriptions - List active subscriptions (server-side)

import { NextResponse } from 'next/server';
import { isConnected } from '../server-instance';

export async function GET() {
  try {
    if (!isConnected()) {
      return NextResponse.json(
        { success: false, error: 'Not connected to MCP server' },
        { status: 400 }
      );
    }

    // TODO: Implement subscription tracking in UniversalMCPClient
    // For now, return empty list
    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list subscriptions' },
      { status: 500 }
    );
  }
}
