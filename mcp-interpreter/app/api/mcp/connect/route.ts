// app/api/mcp/connect/route.ts
// POST /api/mcp/connect - Connect to MCP server with universal transport support

import { NextRequest, NextResponse } from 'next/server';
import { setMCPClient, clearMCPClient, isConnected } from '../server-instance';
import { UniversalMCPClient, type ConnectionConfig } from '../universal-mcp-client';

export async function POST(request: NextRequest) {
  try {
    // Parse connection config from request body
    const config: ConnectionConfig = await request.json();

    // Validate config based on type
    if (!config.type) {
      return NextResponse.json(
        { success: false, error: 'Connection type is required (stdio, http-stateful, http-stateless)' },
        { status: 400 }
      );
    }

    // Type-specific validation
    if (config.type === 'stdio') {
      if (!config.serverPath) {
        return NextResponse.json(
          { success: false, error: 'serverPath is required for stdio transport' },
          { status: 400 }
        );
      }
    } else if (config.type === 'http-stateful' || config.type === 'http-stateless') {
      if (!config.url) {
        return NextResponse.json(
          { success: false, error: 'url is required for HTTP transport' },
          { status: 400 }
        );
      }
    }

    // Disconnect existing connection if any
    if (isConnected()) {
      await clearMCPClient();
    }

    // Create universal MCP client
    const mcpClient = new UniversalMCPClient(config);

    // Connect to the MCP server
    const serverInfo = await mcpClient.connect();

    // Store the client, config, and server info
    setMCPClient(mcpClient, config, serverInfo);

    return NextResponse.json({
      success: true,
      data: {
        status: 'connected',
        transport: config.type,
        serverName: serverInfo.name,
        serverVersion: serverInfo.version,
        capabilities: serverInfo.capabilities,
        instructions: serverInfo.instructions,
      },
    });
  } catch (error) {
    // Clean up on error
    await clearMCPClient();

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      },
      { status: 500 }
    );
  }
}
