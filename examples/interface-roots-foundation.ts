/**
 * IRoots Foundation Example
 *
 * Demonstrates requesting root directories from the MCP client.
 * Roots help servers understand the client's file system context.
 *
 * @example Run with roots capability
 * ```bash
 * # Using the interface-bin with roots capability enabled
 * npx simply-mcp examples/interface-roots-foundation.ts
 * ```
 */

import type { ITool, IServer } from '../src/index.js';

// Server configuration with roots capability
interface RootsExampleServer extends IServer {
  name: 'roots-example';
  version: '1.0.0';
  description: 'Foundation example for roots protocol';

  /**
   * Runtime configuration for server capabilities
   * This enables the roots capability so tools can request root directories
   */
  runtimeConfig?: {
    capabilities: {
      roots: true;
    };
  };
}

// Tool that uses roots to list project files
interface ListProjectFilesTool extends ITool {
  name: 'list_project_files';
  description: 'List files in project roots';
  params: {};
  result: { roots: Array<{ uri: string; name?: string }>; message: string };
}

// Tool that demonstrates handling missing roots capability
interface CheckRootsAvailabilityTool extends ITool {
  name: 'check_roots';
  description: 'Check if roots capability is available';
  params: {};
  result: { available: boolean; message: string };
}

// Tool that simulates using roots for file operations
interface GetWorkspaceSummaryTool extends ITool {
  name: 'workspace_summary';
  description: 'Get a summary of workspace roots';
  params: {};
  result: {
    totalRoots: number;
    roots: Array<{ uri: string; name?: string }>;
    message: string;
  };
}

export default class RootsExampleService implements RootsExampleServer {
  name = 'roots-example' as const;
  version = '1.0.0' as const;
  description = 'Foundation example for roots protocol';

  /**
   * List project roots from the client
   *
   * This tool demonstrates the basic roots request flow:
   * 1. Check if context.listRoots() is available
   * 2. Call context.listRoots() to fetch roots from client
   * 3. Handle the response
   */
  listProjectFiles: ListProjectFilesTool = async (params, context) => {
    // Check if roots capability is available
    if (!context?.listRoots) {
      return {
        roots: [],
        message:
          'Roots capability not available. Enable with: { capabilities: { roots: true } }',
      };
    }

    try {
      // Request roots from client
      const roots = await context.listRoots();

      return {
        roots,
        message: `Found ${roots.length} root director${roots.length === 1 ? 'y' : 'ies'}`,
      };
    } catch (error: any) {
      return {
        roots: [],
        message: `Error requesting roots: ${error.message}`,
      };
    }
  };

  /**
   * Check if roots capability is available
   *
   * This demonstrates how to detect capability availability
   * without triggering an error
   */
  check_roots: CheckRootsAvailabilityTool = async (params, context) => {
    const available = !!context?.listRoots;

    return {
      available,
      message: available
        ? 'Roots capability is available and ready to use'
        : 'Roots capability is not available. Enable it in server configuration.',
    };
  };

  /**
   * Get workspace summary from roots
   *
   * This demonstrates a practical use case for roots:
   * understanding the client's workspace structure
   */
  workspace_summary: GetWorkspaceSummaryTool = async (params, context) => {
    if (!context?.listRoots) {
      return {
        totalRoots: 0,
        roots: [],
        message: 'Roots capability not enabled',
      };
    }

    try {
      const roots = await context.listRoots();

      // Analyze the roots
      const fileRoots = roots.filter((r) => r.uri.startsWith('file://'));
      const namedRoots = roots.filter((r) => r.name);

      let message = `Workspace has ${roots.length} root${roots.length === 1 ? '' : 's'}`;
      if (fileRoots.length > 0) {
        message += `\n- ${fileRoots.length} file system root${fileRoots.length === 1 ? '' : 's'}`;
      }
      if (namedRoots.length > 0) {
        message += `\n- ${namedRoots.length} named root${namedRoots.length === 1 ? '' : 's'}`;
      }

      return {
        totalRoots: roots.length,
        roots,
        message,
      };
    } catch (error: any) {
      return {
        totalRoots: 0,
        roots: [],
        message: `Error getting workspace summary: ${error.message}`,
      };
    }
  };
}
