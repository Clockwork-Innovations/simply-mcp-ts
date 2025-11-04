// app/api/mcp/disconnect/route.ts
// POST /api/mcp/disconnect - Disconnect from MCP server

import { NextResponse } from 'next/server';
import { clearMCPClient } from '../server-instance';

export async function POST() {
  try {
    await clearMCPClient();
    return NextResponse.json({ success: true, data: { status: 'disconnected' } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Disconnect failed' },
      { status: 500 }
    );
  }
}
