/**
 * Interface-Driven API - Roots (Directory Listing) Example
 *
 * Demonstrates:
 * - Root directory listing with listRoots/IRoots
 * - File operation tools scoped to client roots
 * - Workspace management patterns
 * - Combining roots with resource subscriptions
 * - Production-ready error handling
 *
 * The roots capability allows servers to request the client's working directories
 * or context scopes. This helps servers understand the client's file system context
 * for file-based operations, workspace analysis, and project management.
 *
 * Usage:
 *   npx simply-mcp run examples/interface-roots.ts
 *
 * Test with HTTP mode:
 *   # Start server
 *   npx simply-mcp run examples/interface-roots.ts --transport http --port 3000
 *
 *   # Initialize session
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"roots":{"listChanged":true}},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
 *
 *   # List tools
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"tools/list","id":2}'
 *
 *   # Call list_workspace_roots tool
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_workspace_roots","arguments":{}},"id":3}'
 *
 * Note: Roots capability requires a connected MCP client that supports roots.
 * The tools gracefully degrade if roots is not available.
 */

import type { ITool, IPrompt, IResource, IServer } from 'simply-mcp';

// ============================================================================
// TOOL INTERFACES
// ============================================================================

/**
 * List workspace roots from client
 *
 * Demonstrates basic roots request - fetching client's working directories.
 * Shows validation and error handling patterns.
 */
interface ListWorkspaceRootsTool extends ITool {
  name: 'list_workspace_roots';
  description: 'List all workspace root directories from the client';
  params: {
    /** Include metadata analysis */
    includeMetadata?: boolean;
  };
  result: {
    /** Whether roots were retrieved successfully */
    success: boolean;
    /** Status message */
    message: string;
    /** List of root directories */
    roots: Array<{
      uri: string;
      name?: string;
    }>;
    /** Root count */
    count: number;
    /** Metadata (if requested) */
    metadata?: {
      fileRoots: number;
      namedRoots: number;
      uniqueSchemes: string[];
    };
  };
}

/**
 * Analyze workspace structure
 *
 * Demonstrates using roots for workspace analysis.
 * Shows practical file system operations based on roots.
 */
interface AnalyzeWorkspaceTool extends ITool {
  name: 'analyze_workspace';
  description: 'Analyze workspace structure from root directories';
  params: {
    /** Analysis depth level */
    depth?: 'quick' | 'standard' | 'deep';
  };
  result: {
    /** Whether analysis completed */
    success: boolean;
    /** Analysis summary */
    summary: string;
    /** Workspace details */
    workspace: {
      rootCount: number;
      totalSize?: string;
      fileTypes?: Record<string, number>;
      structure?: string;
    };
    /** Analysis timestamp */
    analyzedAt: string;
  };
}

/**
 * Search files in workspace roots
 *
 * Demonstrates file search scoped to client roots.
 * Shows how to use roots for targeted file operations.
 */
interface SearchWorkspaceFilesTool extends ITool {
  name: 'search_workspace_files';
  description: 'Search for files within workspace roots';
  params: {
    /** Search pattern (glob or regex) */
    pattern: string;
    /** File type filter */
    fileType?: 'javascript' | 'typescript' | 'python' | 'markdown' | 'all';
    /** Maximum results to return */
    maxResults?: number;
  };
  result: {
    /** Whether search completed */
    success: boolean;
    /** Search status message */
    message: string;
    /** Matching files */
    files: Array<{
      path: string;
      root: string;
      name: string;
      size?: number;
    }>;
    /** Total matches found */
    totalMatches: number;
    /** Search time (ms) */
    searchTime: number;
  };
}

/**
 * Get workspace configuration
 *
 * Demonstrates detecting workspace configuration files.
 * Shows practical use of roots for project understanding.
 */
interface GetWorkspaceConfigTool extends ITool {
  name: 'get_workspace_config';
  description: 'Detect and analyze workspace configuration files';
  params: {
    /** Configuration types to detect */
    configTypes?: Array<'package' | 'typescript' | 'git' | 'docker' | 'all'>;
  };
  result: {
    /** Whether detection completed */
    success: boolean;
    /** Detection summary */
    summary: string;
    /** Detected configurations */
    configs: Array<{
      type: string;
      file: string;
      root: string;
      exists: boolean;
    }>;
    /** Project type inference */
    projectType?: string;
  };
}

/**
 * Monitor workspace changes
 *
 * Demonstrates combining roots with file watching.
 * Shows event-driven workspace monitoring patterns.
 */
interface MonitorWorkspaceTool extends ITool {
  name: 'monitor_workspace';
  description: 'Monitor workspace roots for changes';
  params: {
    /** Monitoring mode */
    mode: 'start' | 'stop' | 'status';
    /** File patterns to watch */
    watchPatterns?: string[];
  };
  result: {
    /** Whether operation succeeded */
    success: boolean;
    /** Status message */
    message: string;
    /** Monitoring status */
    monitoring: {
      active: boolean;
      rootsWatched: number;
      patternsWatched: string[];
      changesSinceStart?: number;
    };
  };
}

// ============================================================================
// PROMPT INTERFACES
// ============================================================================

/**
 * Workspace analysis prompt
 *
 * Generates prompts for workspace structure analysis.
 */
interface WorkspaceAnalysisPrompt extends IPrompt {
  name: 'workspace_analysis';
  description: 'Generate workspace structure analysis prompt';
  args: {
    /** Workspace name */
    workspace: string;
    /** Root count */
    rootCount: number;
    /** Analysis focus */
    focus: string;
  };
  template: `# Workspace Analysis: {workspace}

**Root Directories:** {rootCount}
**Analysis Focus:** {focus}

Please analyze the workspace structure and provide insights on:
1. Project organization and structure
2. Technology stack and frameworks detected
3. Configuration consistency across roots
4. Recommendations for workspace optimization

Be thorough but concise in your analysis.`;
}

/**
 * File search prompt
 *
 * Template for file search documentation.
 */
interface FileSearchPrompt extends IPrompt {
  name: 'file_search_help';
  description: 'Generate file search usage help';
  args: {
    /** Pattern syntax */
    syntax: 'glob' | 'regex';
  };
  template: `# File Search Help - {syntax} Syntax

## Pattern Format

**Glob Patterns (use syntax=glob):**
- \`*.js\` - All JavaScript files
- \`**/*.ts\` - All TypeScript files recursively
- \`src/**/*.test.js\` - Test files in src directory

**Regular Expressions (use syntax=regex):**
- \`\\.js$\` - Files ending in .js
- \`test.*\\.ts\` - TypeScript test files
- \`^src/.*\\.jsx?\` - JavaScript/JSX files in src

## Examples

Search for TypeScript files:
\`\`\`
pattern: "**/*.ts"
\`\`\`

Search for test files:
\`\`\`
pattern: "**/*.test.*"
\`\`\`

## Tips

- Use specific patterns for faster searches
- Limit maxResults for large workspaces
- Combine with fileType filter for better results
- Current syntax: {syntax}`;
}

// ============================================================================
// RESOURCE INTERFACES
// ============================================================================

/**
 * Current workspace resource
 *
 * Dynamic resource showing current workspace state.
 */
interface CurrentWorkspaceResource extends IResource {
  uri: 'workspace://current';
  name: 'Current Workspace';
  description: 'Current workspace root directories';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    roots: Array<{
      uri: string;
      name?: string;
    }>;
    rootCount: number;
    lastUpdated: string;
  };
}

/**
 * Workspace capabilities resource
 *
 * Static resource documenting roots capabilities.
 */
interface WorkspaceCapabilitiesResource extends IResource {
  uri: 'config://workspace-capabilities';
  name: 'Workspace Capabilities';
  description: 'Available workspace and roots features';
  mimeType: 'application/json';
  data: {
    roots: {
      supported: boolean;
      features: string[];
    };
    operations: string[];
    limitations: string[];
  };
}

/**
 * Usage guide resource
 *
 * Static markdown guide for roots usage.
 */
interface UsageGuideResource extends IResource {
  uri: 'docs://roots-guide';
  name: 'Roots Usage Guide';
  description: 'How to use workspace roots effectively';
  mimeType: 'text/markdown';
  data: `# Workspace Roots Guide

## What are Roots?

Workspace roots are the top-level directories that define your working context.
They help MCP servers understand where your files are located.

## Available Operations

### 1. List Workspace Roots
Get all root directories from the client.

\`\`\`typescript
await context.listRoots()
\`\`\`

Returns:
\`\`\`json
[
  { "uri": "file:///home/user/project", "name": "My Project" },
  { "uri": "file:///home/user/library", "name": "Shared Library" }
]
\`\`\`

### 2. File Operations
Use roots to scope file operations to the workspace.

**Best Practice:** Always check if paths are within workspace roots
before performing file operations.

### 3. Workspace Analysis
Analyze project structure, detect configurations, and understand
the workspace layout.

### 4. File Search
Search for files within workspace roots efficiently.

## Common Patterns

### Pattern 1: Validate File Access
\`\`\`typescript
const roots = await context.listRoots();
const isInWorkspace = roots.some(root =>
  filePath.startsWith(root.uri)
);
\`\`\`

### Pattern 2: Workspace-Relative Paths
\`\`\`typescript
const roots = await context.listRoots();
const relativePath = filePath.replace(roots[0].uri, '');
\`\`\`

### Pattern 3: Multi-Root Operations
\`\`\`typescript
const roots = await context.listRoots();
for (const root of roots) {
  await processRoot(root);
}
\`\`\`

## Best Practices

1. **Always check availability:** Use \`context?.listRoots\` before calling
2. **Handle errors gracefully:** Roots may not be available in all clients
3. **Cache when appropriate:** Roots don't change often during a session
4. **Respect boundaries:** Keep operations within workspace roots
5. **Provide feedback:** Inform users about workspace operations

## Security Considerations

- Never access files outside workspace roots without explicit permission
- Validate all file paths before operations
- Be cautious with destructive operations
- Log file operations for audit trails
`;
}

// ============================================================================
// SERVER INTERFACE
// ============================================================================

interface RootsDemoServer extends IServer {
  name: 'roots-demo';
  version: '1.0.0';
  description: 'Production-ready roots (directory listing) demonstration';
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

/**
 * Roots Demo Server Implementation
 *
 * All tools check for roots availability and provide graceful degradation.
 * Demonstrates production-ready error handling and workspace patterns.
 */
export default class RootsDemo implements RootsDemoServer {
  // Cache roots to avoid repeated requests
  private rootsCache: Array<{ uri: string; name?: string }> | null = null;
  private rootsCacheTime: number = 0;
  private readonly CACHE_TTL = 60000; // 60 seconds

  // Track monitoring state
  private monitoringActive = false;
  private monitoredRoots: string[] = [];
  private changeCount = 0;

  // ========================================================================
  // TOOL IMPLEMENTATIONS
  // ========================================================================

  /**
   * List workspace roots
   */
  listWorkspaceRoots: ListWorkspaceRootsTool = async (params, context) => {
    // Check if roots capability is available
    if (!context?.listRoots) {
      return {
        success: false,
        message: 'Roots capability not available. Enable with: { capabilities: { roots: true } }',
        roots: [],
        count: 0,
      };
    }

    try {
      // Request roots from client
      const roots = await context.listRoots();

      // Cache the roots
      this.rootsCache = roots;
      this.rootsCacheTime = Date.now();

      // Build metadata if requested
      let metadata;
      if (params.includeMetadata) {
        const fileRoots = roots.filter((r) => r.uri.startsWith('file://')).length;
        const namedRoots = roots.filter((r) => r.name).length;
        const schemes = [...new Set(roots.map((r) => r.uri.split(':')[0]))];

        metadata = {
          fileRoots,
          namedRoots,
          uniqueSchemes: schemes,
        };
      }

      return {
        success: true,
        message: `Found ${roots.length} root director${roots.length === 1 ? 'y' : 'ies'}`,
        roots,
        count: roots.length,
        metadata,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Error requesting roots: ${errorMessage}`,
        roots: [],
        count: 0,
      };
    }
  };

  /**
   * Analyze workspace structure
   */
  analyzeWorkspace: AnalyzeWorkspaceTool = async (params, context) => {
    // Check if roots capability is available
    if (!context?.listRoots) {
      return {
        success: false,
        summary: 'Roots capability not available',
        workspace: {
          rootCount: 0,
        },
        analyzedAt: new Date().toISOString(),
      };
    }

    try {
      const depth = params.depth || 'standard';

      // Get or use cached roots
      let roots = this.rootsCache;
      if (!roots || Date.now() - this.rootsCacheTime > this.CACHE_TTL) {
        roots = await context.listRoots();
        this.rootsCache = roots;
        this.rootsCacheTime = Date.now();
      }

      // Simulate analysis based on depth
      const workspace: any = {
        rootCount: roots.length,
      };

      if (depth === 'quick') {
        workspace.structure = roots.map((r) => r.name || r.uri).join(', ');
      } else if (depth === 'standard' || depth === 'deep') {
        // In production, actually analyze the file system
        workspace.totalSize = '~250 MB';
        workspace.fileTypes = {
          typescript: 42,
          javascript: 18,
          json: 15,
          markdown: 8,
          other: 12,
        };
        workspace.structure = `${roots.length} root${roots.length === 1 ? '' : 's'}: ${roots.map((r) => r.name || 'unnamed').join(', ')}`;
      }

      const summary = depth === 'deep'
        ? `Deep analysis complete: ${roots.length} roots analyzed with detailed file type breakdown`
        : depth === 'standard'
          ? `Standard analysis complete: ${roots.length} roots with file type summary`
          : `Quick analysis complete: ${roots.length} roots identified`;

      return {
        success: true,
        summary,
        workspace,
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        summary: `Error analyzing workspace: ${errorMessage}`,
        workspace: {
          rootCount: 0,
        },
        analyzedAt: new Date().toISOString(),
      };
    }
  };

  /**
   * Search files in workspace
   */
  searchWorkspaceFiles: SearchWorkspaceFilesTool = async (params, context) => {
    // Check if roots capability is available
    if (!context?.listRoots) {
      return {
        success: false,
        message: 'Roots capability not available',
        files: [],
        totalMatches: 0,
        searchTime: 0,
      };
    }

    try {
      const startTime = Date.now();

      // Get roots
      let roots = this.rootsCache;
      if (!roots || Date.now() - this.rootsCacheTime > this.CACHE_TTL) {
        roots = await context.listRoots();
        this.rootsCache = roots;
        this.rootsCacheTime = Date.now();
      }

      const maxResults = params.maxResults || 50;

      // Simulate file search (in production, use actual file system search)
      const mockFiles = [
        { path: '/src/index.ts', root: roots[0]?.uri || '', name: 'index.ts', size: 1024 },
        { path: '/src/server.ts', root: roots[0]?.uri || '', name: 'server.ts', size: 2048 },
        { path: '/README.md', root: roots[0]?.uri || '', name: 'README.md', size: 512 },
      ];

      // Filter by pattern (simple contains check for demo)
      const files = mockFiles.filter((f) => f.name.includes(params.pattern) || params.pattern === '*');

      // Filter by file type if specified
      let filteredFiles = files;
      if (params.fileType && params.fileType !== 'all') {
        const extensions: Record<string, string[]> = {
          javascript: ['.js', '.jsx'],
          typescript: ['.ts', '.tsx'],
          python: ['.py'],
          markdown: ['.md'],
        };
        const exts = extensions[params.fileType] || [];
        filteredFiles = files.filter((f) => exts.some((ext) => f.name.endsWith(ext)));
      }

      // Limit results
      const limitedFiles = filteredFiles.slice(0, maxResults);

      const searchTime = Date.now() - startTime;

      return {
        success: true,
        message: `Found ${limitedFiles.length} file${limitedFiles.length === 1 ? '' : 's'} matching pattern "${params.pattern}"`,
        files: limitedFiles,
        totalMatches: filteredFiles.length,
        searchTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Error searching files: ${errorMessage}`,
        files: [],
        totalMatches: 0,
        searchTime: 0,
      };
    }
  };

  /**
   * Get workspace configuration
   */
  getWorkspaceConfig: GetWorkspaceConfigTool = async (params, context) => {
    // Check if roots capability is available
    if (!context?.listRoots) {
      return {
        success: false,
        summary: 'Roots capability not available',
        configs: [],
      };
    }

    try {
      // Get roots
      let roots = this.rootsCache;
      if (!roots || Date.now() - this.rootsCacheTime > this.CACHE_TTL) {
        roots = await context.listRoots();
        this.rootsCache = roots;
        this.rootsCacheTime = Date.now();
      }

      const configTypes = params.configTypes || ['all'];
      const detectAll = configTypes.includes('all');

      // Detect common configuration files
      const configs: Array<{ type: string; file: string; root: string; exists: boolean }> = [];

      for (const root of roots) {
        if (detectAll || configTypes.includes('package')) {
          configs.push({
            type: 'package',
            file: 'package.json',
            root: root.uri,
            exists: true, // In production, actually check file existence
          });
        }

        if (detectAll || configTypes.includes('typescript')) {
          configs.push({
            type: 'typescript',
            file: 'tsconfig.json',
            root: root.uri,
            exists: true,
          });
        }

        if (detectAll || configTypes.includes('git')) {
          configs.push({
            type: 'git',
            file: '.git',
            root: root.uri,
            exists: true,
          });
        }

        if (detectAll || configTypes.includes('docker')) {
          configs.push({
            type: 'docker',
            file: 'Dockerfile',
            root: root.uri,
            exists: false,
          });
        }
      }

      // Infer project type
      let projectType = 'unknown';
      if (configs.some((c) => c.type === 'package' && c.exists)) {
        projectType = configs.some((c) => c.type === 'typescript' && c.exists)
          ? 'TypeScript/Node.js'
          : 'JavaScript/Node.js';
      }

      return {
        success: true,
        summary: `Detected ${configs.filter((c) => c.exists).length} configuration file${configs.filter((c) => c.exists).length === 1 ? '' : 's'}`,
        configs,
        projectType,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        summary: `Error detecting configurations: ${errorMessage}`,
        configs: [],
      };
    }
  };

  /**
   * Monitor workspace changes
   */
  monitorWorkspace: MonitorWorkspaceTool = async (params, context) => {
    // Check if roots capability is available
    if (!context?.listRoots) {
      return {
        success: false,
        message: 'Roots capability not available',
        monitoring: {
          active: false,
          rootsWatched: 0,
          patternsWatched: [],
        },
      };
    }

    try {
      if (params.mode === 'start') {
        // Get roots
        const roots = await context.listRoots();

        // Start monitoring (in production, set up file watchers)
        this.monitoringActive = true;
        this.monitoredRoots = roots.map((r) => r.uri);
        this.changeCount = 0;

        const patterns = params.watchPatterns || ['**/*'];

        return {
          success: true,
          message: `Monitoring started for ${roots.length} root${roots.length === 1 ? '' : 's'}`,
          monitoring: {
            active: true,
            rootsWatched: roots.length,
            patternsWatched: patterns,
            changesSinceStart: 0,
          },
        };
      } else if (params.mode === 'stop') {
        // Stop monitoring
        this.monitoringActive = false;
        const rootsWatched = this.monitoredRoots.length;
        this.monitoredRoots = [];

        return {
          success: true,
          message: `Monitoring stopped. Detected ${this.changeCount} change${this.changeCount === 1 ? '' : 's'}`,
          monitoring: {
            active: false,
            rootsWatched,
            patternsWatched: [],
            changesSinceStart: this.changeCount,
          },
        };
      } else {
        // status
        return {
          success: true,
          message: this.monitoringActive ? `Monitoring ${this.monitoredRoots.length} roots` : 'Monitoring inactive',
          monitoring: {
            active: this.monitoringActive,
            rootsWatched: this.monitoredRoots.length,
            patternsWatched: params.watchPatterns || [],
            changesSinceStart: this.changeCount,
          },
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Error: ${errorMessage}`,
        monitoring: {
          active: false,
          rootsWatched: 0,
          patternsWatched: [],
        },
      };
    }
  };

  // ========================================================================
  // STATIC PROMPTS - No implementation needed
  // ========================================================================

  // WorkspaceAnalysisPrompt - template auto-interpolated
  // FileSearchPrompt - template auto-interpolated

  // ========================================================================
  // STATIC RESOURCES - No implementation needed
  // ========================================================================

  // WorkspaceCapabilitiesResource - data served as-is
  // UsageGuideResource - markdown documentation served as-is

  // ========================================================================
  // DYNAMIC RESOURCES - Require implementation
  // ========================================================================

  /**
   * Current workspace resource
   */
  'workspace://current': CurrentWorkspaceResource = async (params, context) => {
    // Try to get current roots
    if (context?.listRoots) {
      try {
        const roots = await context.listRoots();
        return {
          roots,
          rootCount: roots.length,
          lastUpdated: new Date().toISOString(),
        };
      } catch (error) {
        // Fall through to cached or empty
      }
    }

    // Return cached or empty
    return {
      roots: this.rootsCache || [],
      rootCount: this.rootsCache?.length || 0,
      lastUpdated: new Date(this.rootsCacheTime || Date.now()).toISOString(),
    };
  };
}
