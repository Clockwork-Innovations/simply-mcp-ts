// app/api/mcp/browse/route.ts
// POST /api/mcp/browse - Browse server files

import { NextRequest, NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { path: dirPath } = await request.json();

    // Security: only allow browsing within project directory
    const projectRoot = '/mnt/Shared/cs-projects/simply-mcp-ts';
    const fullPath = dirPath ? join(projectRoot, dirPath) : projectRoot;

    if (!fullPath.startsWith(projectRoot)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const entries = readdirSync(fullPath).map(name => {
      const entryPath = join(fullPath, name);
      const stats = statSync(entryPath);
      return {
        name,
        path: entryPath,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        extension: stats.isFile() ? name.split('.').pop() : null,
      };
    });

    // Filter to show directories and .ts/.js files
    const filtered = entries.filter(e =>
      e.isDirectory ||
      (e.isFile && ['ts', 'js', 'mjs', 'cjs'].includes(e.extension || ''))
    );

    return NextResponse.json({
      success: true,
      data: {
        currentPath: fullPath,
        entries: filtered,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Browse failed' },
      { status: 500 }
    );
  }
}
