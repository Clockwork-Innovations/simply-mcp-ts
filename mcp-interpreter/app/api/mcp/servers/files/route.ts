// app/api/mcp/servers/files/route.ts
// GET /api/mcp/servers/files - Scan for MCP server files and parse their transport config

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
// Import from local node_modules/simply-mcp
import { parseInterfaceFile } from '../../../../../node_modules/simply-mcp/dist/src/server/parser.js';
import type { ParsedServer } from '../../../../../node_modules/simply-mcp/dist/src/server/compiler/types.js';

export interface ServerFile {
  path: string;
  relativePath: string;
  name: string;
  transport: 'stdio' | 'http' | 'websocket';
  port?: number;
  websocketPort?: number;
  serverName?: string;
  version?: string;
  description?: string;
  size?: number;
  lastModified?: string;
}

/**
 * Auto-detect transport type from IServer configuration
 */
function detectTransport(server?: ParsedServer): 'stdio' | 'http' | 'websocket' {
  if (!server) {
    return 'stdio'; // Default
  }

  // WebSocket has highest priority (most specific config)
  if (server.websocket) {
    return 'websocket';
  }

  // HTTP if port is specified or transport explicitly set to http
  if (server.port || server.transport === 'http') {
    return 'http';
  }

  // Default to stdio
  return 'stdio';
}

/**
 * Recursively scan directory for .ts and .js files
 */
async function scanForServerFiles(
  directory: string,
  rootDir: string,
  maxDepth: number = 10,
  currentDepth: number = 0
): Promise<ServerFile[]> {
  const results: ServerFile[] = [];

  if (currentDepth > maxDepth) {
    return results;
  }

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      // Skip node_modules, .git, dist, and other build directories
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist' ||
          entry.name === 'build' ||
          entry.name === '.next' ||
          entry.name.startsWith('.')
        ) {
          continue;
        }

        // Recursively scan subdirectories
        const subResults = await scanForServerFiles(
          fullPath,
          rootDir,
          maxDepth,
          currentDepth + 1
        );
        results.push(...subResults);
      } else if (entry.isFile()) {
        // Only process .ts and .js files
        if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.js')) {
          continue;
        }

        // Skip test files and type definition files
        if (
          entry.name.endsWith('.test.ts') ||
          entry.name.endsWith('.spec.ts') ||
          entry.name.endsWith('.d.ts')
        ) {
          continue;
        }

        try {
          // Parse the file to extract IServer configuration
          const parseResult = parseInterfaceFile(fullPath);
          const serverConfig = parseResult.server;

          // Get file stats
          const stats = await fs.stat(fullPath);

          // Detect transport type
          const transport = detectTransport(serverConfig);

          const serverFile: ServerFile = {
            path: fullPath,
            relativePath: path.relative(rootDir, fullPath),
            name: entry.name,
            transport,
            serverName: serverConfig?.name,
            version: serverConfig?.version,
            description: serverConfig?.description,
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
          };

          // Add port info if available
          if (transport === 'http' && serverConfig?.port) {
            serverFile.port = serverConfig.port;
          }

          if (transport === 'websocket' && serverConfig?.websocket?.port) {
            serverFile.websocketPort = serverConfig.websocket.port;
          }

          results.push(serverFile);
        } catch (parseError) {
          // Skip files that can't be parsed (not MCP servers or syntax errors)
          // This is expected for regular TypeScript files
          continue;
        }
      }
    }
  } catch (error) {
    // Log error but continue scanning
    console.error(`Error scanning directory ${directory}:`, error);
  }

  return results;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const directory = searchParams.get('directory') || process.cwd();
    const maxDepth = parseInt(searchParams.get('maxDepth') || '10', 10);

    // Security: Validate that directory is within allowed paths
    const resolvedDir = path.resolve(directory);
    const projectRoot = process.cwd();

    // Only allow scanning within project directory or parent (for simply-mcp-ts examples)
    const allowedRoots = [
      projectRoot,
      path.resolve(projectRoot, '..'),
      path.resolve(projectRoot, '../..'),
    ];

    const isAllowed = allowedRoots.some((root) => resolvedDir.startsWith(root));

    if (!isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Directory access denied. Only project directories are allowed.',
        },
        { status: 403 }
      );
    }

    // Check if directory exists
    try {
      await fs.access(resolvedDir);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: `Directory not found: ${directory}`,
        },
        { status: 404 }
      );
    }

    // Scan for server files
    const serverFiles = await scanForServerFiles(resolvedDir, resolvedDir, maxDepth);

    return NextResponse.json({
      success: true,
      data: {
        directory: resolvedDir,
        serverFiles,
        count: serverFiles.length,
      },
    });
  } catch (error) {
    console.error('Error in /api/mcp/servers/files:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scan for server files',
      },
      { status: 500 }
    );
  }
}
