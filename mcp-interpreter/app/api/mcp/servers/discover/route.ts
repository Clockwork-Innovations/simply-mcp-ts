// app/api/mcp/servers/discover/route.ts
// GET /api/mcp/servers/discover - Discover running MCP servers on localhost

import { NextRequest, NextResponse } from 'next/server';

export interface DiscoveredServer {
  transport: 'http' | 'websocket';
  host: string;
  port: number;
  url: string;
  name?: string;
  version?: string;
  capabilities?: any;
}

/**
 * Check if a port has an HTTP MCP server running
 */
async function checkHttpPort(port: number, timeout: number = 1000): Promise<DiscoveredServer | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Try to connect to the MCP endpoint
    const response = await fetch(`http://localhost:${port}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'ping',
        params: {},
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      // Try to get server info with initialize request
      try {
        const initResponse = await fetch(`http://localhost:${port}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: {
                name: 'MCP Interpreter Discovery',
                version: '1.0.0',
              },
            },
            id: 2,
          }),
        });

        if (initResponse.ok) {
          const data = await initResponse.json();
          return {
            transport: 'http',
            host: 'localhost',
            port,
            url: `http://localhost:${port}/mcp`,
            name: data.result?.serverInfo?.name,
            version: data.result?.serverInfo?.version,
            capabilities: data.result?.capabilities,
          };
        }
      } catch {
        // If initialize fails, still return basic info
      }

      return {
        transport: 'http',
        host: 'localhost',
        port,
        url: `http://localhost:${port}/mcp`,
      };
    }

    return null;
  } catch (error) {
    // Port not responding or not an MCP server
    return null;
  }
}

/**
 * Check if a port has a WebSocket MCP server running
 */
async function checkWebSocketPort(port: number, timeout: number = 1000): Promise<DiscoveredServer | null> {
  // Note: WebSocket client detection from server-side is more complex
  // For now, we'll try to connect to common WebSocket endpoints
  // A full implementation would require a WebSocket client library

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Try HTTP upgrade request to WebSocket
    const response = await fetch(`http://localhost:${port}`, {
      method: 'GET',
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Key': Buffer.from(String(Date.now())).toString('base64'),
        'Sec-WebSocket-Version': '13',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // WebSocket server should return 101 Switching Protocols
    if (response.status === 101 || response.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      return {
        transport: 'websocket',
        host: 'localhost',
        port,
        url: `ws://localhost:${port}`,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Scan common ports for MCP servers
 */
async function scanPorts(
  ports: number[],
  checkHttp: boolean = true,
  checkWs: boolean = true
): Promise<DiscoveredServer[]> {
  const discovered: DiscoveredServer[] = [];
  const promises: Promise<void>[] = [];

  for (const port of ports) {
    if (checkHttp) {
      promises.push(
        checkHttpPort(port).then((server) => {
          if (server) {
            discovered.push(server);
          }
        })
      );
    }

    if (checkWs) {
      promises.push(
        checkWebSocketPort(port).then((server) => {
          if (server) {
            discovered.push(server);
          }
        })
      );
    }
  }

  await Promise.all(promises);

  return discovered;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse parameters
    const portsParam = searchParams.get('ports');
    const checkHttp = searchParams.get('http') !== 'false';
    const checkWs = searchParams.get('websocket') !== 'false';

    // Default common ports for MCP servers
    const defaultPorts = [
      3000, 3001, 3002, 3003, 3004, 3005, // Common dev ports
      8000, 8001, 8080, 8081, // Alt HTTP ports
      9000, 9001, // Alt ports
    ];

    const ports = portsParam
      ? portsParam.split(',').map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p) && p > 0 && p < 65536)
      : defaultPorts;

    // Scan for running servers
    const discoveredServers = await scanPorts(ports, checkHttp, checkWs);

    return NextResponse.json({
      success: true,
      data: {
        servers: discoveredServers,
        count: discoveredServers.length,
        scannedPorts: ports,
      },
    });
  } catch (error) {
    console.error('Error in /api/mcp/servers/discover:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to discover servers',
      },
      { status: 500 }
    );
  }
}
