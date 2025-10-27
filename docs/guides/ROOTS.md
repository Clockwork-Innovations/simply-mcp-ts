# Roots Guide - Client Root Directory Listing

**Implementation requirement:** ✅ Always required - uses `context.listRoots()` within tool implementations

**Method naming:** N/A (context feature used within tool logic, not named separately)

---

Learn how to request the client's working directories using the roots capability.

**What are Roots?** A server-side capability that allows your tools to request the client's working directories (root paths), enabling file-based operations scoped to the client's project context.

**See working examples:**
- Foundation: [examples/interface-roots-foundation.ts](../../examples/interface-roots-foundation.ts)
- Advanced: [examples/interface-roots.ts](../../examples/interface-roots.ts)
- Comprehensive: [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)

---

## Overview

The roots protocol enables MCP servers to discover the client's working directories. This is useful when:
- **File Operations**: Scope file reading/writing to client's project directories
- **Workspace Management**: Understand the client's project structure
- **Path Resolution**: Resolve relative paths within client context
- **Multi-Project Support**: Work with clients managing multiple projects
- **Security**: Limit file operations to authorized directories

Roots is a **runtime capability** accessed through the `HandlerContext` in tool implementations. The `IRoots` interface is only for type definitions.

---

## IRoots Interface

The roots interface defines the structure for root directory requests:

```typescript
import type { IRoots } from 'simply-mcp';

/**
 * Roots request structure
 */
interface IRoots {
  /**
   * Human-readable name for this roots request
   */
  name: string;

  /**
   * Description of what the roots are used for
   */
  description: string;

  /**
   * Callable signature for dynamic roots
   */
  (): Array<{ uri: string; name?: string }> | Promise<Array<{ uri: string; name?: string }>>;
}
```

**Root Object Structure:**
```typescript
interface Root {
  /**
   * File URI of the root directory
   * Format: 'file:///absolute/path/to/directory'
   */
  uri: string;

  /**
   * Optional human-readable name for this root
   * Example: 'My Project', 'Frontend App', 'Backend Service'
   */
  name?: string;
}
```

---

## Basic Usage

### List Client Roots

Request the client's working directories:

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface ListProjectsTool extends ITool {
  name: 'list_projects';
  description: 'List all active projects';
  params: {};
  result: {
    projects: Array<{
      path: string;
      name: string;
    }>;
  };
}

interface MyServer extends IServer {
  name: 'file-service';
  version: '1.0.0';
}

export default class MyServerImpl implements MyServer {
  listProjects: ListProjectsTool = async (params, context) => {
    // Check if roots capability is available
    if (!context.listRoots) {
      throw new Error('Roots not supported by this client');
    }

    // Request client's root directories
    const roots = await context.listRoots();

    return {
      projects: roots.map(root => ({
        path: root.uri.replace('file://', ''),
        name: root.name || 'Unnamed Project'
      }))
    };
  };
}
```

**Key points:**
- Access roots via `context.listRoots()` in tool handlers
- Always check if `context.listRoots` exists before using
- Roots are returned as file URIs (e.g., `file:///home/user/project`)
- Each root may have an optional human-readable name

---

## Using in Tool Handlers

### File Search Tool

Search for files within client's project roots:

```typescript
interface SearchFilesTool extends ITool {
  name: 'search_files';
  description: 'Search for files in project';
  params: {
    /** Filename pattern to search for */
    pattern: string;
    /** File extension filter */
    extension?: string;
  };
  result: {
    files: Array<{
      path: string;
      project: string;
    }>;
  };
}

export default class FileSearch implements IServer {
  searchFiles: SearchFilesTool = async (params, context) => {
    if (!context.listRoots) {
      throw new Error('File search requires roots capability');
    }

    // Get client's project roots
    const roots = await context.listRoots();

    if (roots.length === 0) {
      return { files: [] };
    }

    // Search in each root
    const results: Array<{ path: string; project: string }> = [];

    for (const root of roots) {
      const rootPath = root.uri.replace('file://', '');
      const projectName = root.name || rootPath;

      // Search for files in this root
      const files = await searchInDirectory(
        rootPath,
        params.pattern,
        params.extension
      );

      results.push(...files.map(file => ({
        path: file,
        project: projectName
      })));
    }

    return { files: results };
  };
}

async function searchInDirectory(
  dir: string,
  pattern: string,
  extension?: string
): Promise<string[]> {
  // Implementation - recursively search directory
  return [];
}
```

### Read Project Configuration

Read configuration files from the first available root:

```typescript
interface GetConfigTool extends ITool {
  name: 'get_config';
  description: 'Read project configuration file';
  params: {
    /** Configuration file name */
    configFile?: string;
  };
  result: {
    config: Record<string, any>;
    projectName: string;
  };
}

export default class ConfigReader implements IServer {
  getConfig: GetConfigTool = async (params, context) => {
    if (!context.listRoots) {
      throw new Error('Cannot read config - roots not available');
    }

    const roots = await context.listRoots();

    if (roots.length === 0) {
      throw new Error('No project roots available');
    }

    // Use first root
    const primaryRoot = roots[0];
    const rootPath = primaryRoot.uri.replace('file://', '');
    const configFile = params.configFile || 'config.json';

    // Read configuration
    const config = await readConfigFile(rootPath, configFile);

    return {
      config,
      projectName: primaryRoot.name || 'Unknown Project'
    };
  };
}

async function readConfigFile(
  rootPath: string,
  filename: string
): Promise<Record<string, any>> {
  // Implementation - read and parse config file
  return {};
}
```

---

## File Operation Patterns

### Scoping File Operations to Roots

Ensure file operations stay within authorized directories:

```typescript
interface ReadFileTool extends ITool {
  name: 'read_file';
  description: 'Read file contents (must be within project roots)';
  params: {
    /** Relative path to file */
    filepath: string;
  };
  result: {
    content: string;
    project: string;
  };
}

export default class SecureFileReader implements IServer {
  readFile: ReadFileTool = async (params, context) => {
    if (!context.listRoots) {
      throw new Error('Roots capability required for file operations');
    }

    const roots = await context.listRoots();

    // Resolve absolute path
    const requestedPath = resolveAbsolutePath(params.filepath);

    // Verify path is within one of the roots
    const authorizedRoot = roots.find(root => {
      const rootPath = root.uri.replace('file://', '');
      return requestedPath.startsWith(rootPath);
    });

    if (!authorizedRoot) {
      throw new Error(
        `Access denied: ${params.filepath} is not within authorized project roots`
      );
    }

    // Read file securely
    const content = await readFileSecurely(requestedPath);

    return {
      content,
      project: authorizedRoot.name || 'Project'
    };
  };
}

function resolveAbsolutePath(filepath: string): string {
  // Implementation - resolve to absolute path
  return filepath;
}

async function readFileSecurely(path: string): Promise<string> {
  // Implementation - read file with security checks
  return '';
}
```

### Creating Files in Roots

Write files to client's project directories:

```typescript
interface CreateFileTool extends ITool {
  name: 'create_file';
  description: 'Create a file in project root';
  params: {
    /** Filename to create */
    filename: string;
    /** File content */
    content: string;
    /** Optional: specific root index (default: first root) */
    rootIndex?: number;
  };
  result: {
    filepath: string;
    project: string;
  };
}

export default class FileCreator implements IServer {
  createFile: CreateFileTool = async (params, context) => {
    if (!context.listRoots) {
      throw new Error('File creation requires roots capability');
    }

    const roots = await context.listRoots();

    if (roots.length === 0) {
      throw new Error('No project roots available');
    }

    // Select target root
    const targetIndex = params.rootIndex ?? 0;
    if (targetIndex >= roots.length) {
      throw new Error(`Invalid root index: ${targetIndex}`);
    }

    const targetRoot = roots[targetIndex];
    const rootPath = targetRoot.uri.replace('file://', '');

    // Create file
    const filepath = await createFileInRoot(
      rootPath,
      params.filename,
      params.content
    );

    return {
      filepath,
      project: targetRoot.name || 'Project'
    };
  };
}

async function createFileInRoot(
  rootPath: string,
  filename: string,
  content: string
): Promise<string> {
  // Implementation - create file securely
  return `${rootPath}/${filename}`;
}
```

---

## Workspace Management

### Multi-Project Support

Handle clients working with multiple projects:

```typescript
interface AnalyzeWorkspaceTool extends ITool {
  name: 'analyze_workspace';
  description: 'Analyze all projects in workspace';
  params: {};
  result: {
    summary: string;
    projects: Array<{
      name: string;
      path: string;
      fileCount: number;
      language?: string;
    }>;
  };
}

export default class WorkspaceAnalyzer implements IServer {
  analyzeWorkspace: AnalyzeWorkspaceTool = async (params, context) => {
    if (!context.listRoots) {
      throw new Error('Workspace analysis requires roots capability');
    }

    const roots = await context.listRoots();

    if (roots.length === 0) {
      return {
        summary: 'No projects found',
        projects: []
      };
    }

    // Analyze each project
    const projects = await Promise.all(
      roots.map(async (root, index) => {
        const rootPath = root.uri.replace('file://', '');
        const analysis = await analyzeProject(rootPath);

        return {
          name: root.name || `Project ${index + 1}`,
          path: rootPath,
          fileCount: analysis.fileCount,
          language: analysis.primaryLanguage
        };
      })
    );

    const totalFiles = projects.reduce((sum, p) => sum + p.fileCount, 0);

    return {
      summary: `Found ${roots.length} project(s) with ${totalFiles} total files`,
      projects
    };
  };
}

async function analyzeProject(
  path: string
): Promise<{ fileCount: number; primaryLanguage?: string }> {
  // Implementation - analyze project structure
  return { fileCount: 0 };
}
```

### Root Selection

Let users choose which root to operate on:

```typescript
interface InitializeProjectTool extends ITool {
  name: 'initialize_project';
  description: 'Initialize a project in selected root';
  params: {
    /** Optional: specific root to initialize */
    projectName?: string;
  };
  result: {
    initialized: boolean;
    projectPath: string;
  };
}

export default class ProjectInitializer implements IServer {
  initializeProject: InitializeProjectTool = async (params, context) => {
    if (!context.listRoots) {
      throw new Error('Project initialization requires roots capability');
    }

    const roots = await context.listRoots();

    if (roots.length === 0) {
      throw new Error('No project roots available');
    }

    // Find matching root if project name specified
    let targetRoot = roots[0];  // Default to first root

    if (params.projectName) {
      const matching = roots.find(r =>
        r.name?.toLowerCase() === params.projectName?.toLowerCase()
      );

      if (matching) {
        targetRoot = matching;
      }
    }

    const rootPath = targetRoot.uri.replace('file://', '');

    // Initialize project
    await initializeInRoot(rootPath);

    return {
      initialized: true,
      projectPath: rootPath
    };
  };
}

async function initializeInRoot(path: string): Promise<void> {
  // Implementation - create project structure
}
```

---

## Best Practices

### Security Considerations

Always validate paths are within authorized roots:

```typescript
function isPathInRoots(path: string, roots: Array<{ uri: string }>): boolean {
  const absolutePath = resolveAbsolutePath(path);

  return roots.some(root => {
    const rootPath = root.uri.replace('file://', '');
    return absolutePath.startsWith(rootPath);
  });
}

// Usage in tool
readFileTool: ReadFileTool = async (params, context) => {
  const roots = await context.listRoots!();

  if (!isPathInRoots(params.filepath, roots)) {
    throw new Error('Access denied: path not in authorized roots');
  }

  // Safe to proceed
  return await readFile(params.filepath);
};
```

### Path Validation

Prevent directory traversal attacks:

```typescript
function validatePath(filepath: string): void {
  // Check for directory traversal attempts
  if (filepath.includes('..')) {
    throw new Error('Invalid path: directory traversal not allowed');
  }

  // Check for absolute paths (should be relative to roots)
  if (filepath.startsWith('/') || filepath.match(/^[A-Za-z]:\\/)) {
    throw new Error('Invalid path: must be relative to project root');
  }

  // Additional validation...
}

// Usage
readFileTool: ReadFileTool = async (params, context) => {
  validatePath(params.filepath);

  const roots = await context.listRoots!();
  // ... proceed with validated path
};
```

### Error Handling

Handle cases where roots are unavailable:

```typescript
fileOperationTool: FileOperationTool = async (params, context) => {
  // Check capability availability
  if (!context.listRoots) {
    throw new Error('File operations require roots capability');
  }

  try {
    const roots = await context.listRoots();

    if (roots.length === 0) {
      return {
        success: false,
        message: 'No project roots configured in client'
      };
    }

    // Perform operation
    return await processFile(roots, params);
  } catch (error) {
    return {
      success: false,
      message: `File operation failed: ${error.message}`
    };
  }
};
```

### Fallback Strategies

Provide alternatives when roots are unavailable:

```typescript
searchTool: SearchTool = async (params, context) => {
  let searchPaths: string[];

  if (context.listRoots) {
    // Use client roots if available
    const roots = await context.listRoots();
    searchPaths = roots.map(r => r.uri.replace('file://', ''));
  } else {
    // Fallback to current working directory
    console.warn('Roots not available - using current directory');
    searchPaths = [process.cwd()];
  }

  return await searchInPaths(searchPaths, params.pattern);
};
```

---

## Error Handling

### No Roots Available

Handle clients with no configured roots:

```typescript
projectTool: ProjectTool = async (params, context) => {
  if (!context.listRoots) {
    throw new Error('This tool requires project roots');
  }

  const roots = await context.listRoots();

  if (roots.length === 0) {
    return {
      success: false,
      message: 'No project roots configured. Please open a project in your client.'
    };
  }

  // Process with roots
  return await processProject(roots);
};
```

### Access Denied

Handle unauthorized file access attempts:

```typescript
accessFileTool: AccessFileTool = async (params, context) => {
  const roots = await context.listRoots!();

  try {
    // Validate access
    validateFileAccess(params.filepath, roots);

    // Access file
    return await accessFile(params.filepath);
  } catch (error) {
    if (error.message.includes('Access denied')) {
      return {
        success: false,
        error: 'File is outside authorized project directories'
      };
    }
    throw error;
  }
};

function validateFileAccess(
  filepath: string,
  roots: Array<{ uri: string }>
): void {
  if (!isPathInRoots(filepath, roots)) {
    throw new Error('Access denied');
  }
}
```

### URI Parsing Errors

Handle malformed URIs safely:

```typescript
function parseFileUri(uri: string): string {
  try {
    // Handle different URI formats
    if (uri.startsWith('file://')) {
      return decodeURIComponent(uri.replace('file://', ''));
    }
    return uri;
  } catch (error) {
    throw new Error(`Invalid file URI: ${uri}`);
  }
}

// Usage
const roots = await context.listRoots!();
const paths = roots.map(root => {
  try {
    return parseFileUri(root.uri);
  } catch (error) {
    console.error(`Skipping invalid root: ${error.message}`);
    return null;
  }
}).filter(Boolean);
```

---

## Integration Examples

### Using with Resources and Subscriptions

Monitor files in project roots:

```typescript
interface WatchFilesTool extends ITool {
  name: 'watch_files';
  description: 'Watch files in project for changes';
  params: {
    /** File pattern to watch */
    pattern: string;
  };
  result: {
    watching: boolean;
    paths: string[];
  };
}

export default class FileWatcher implements IServer {
  watchFiles: WatchFilesTool = async (params, context) => {
    if (!context.listRoots) {
      throw new Error('File watching requires roots capability');
    }

    const roots = await context.listRoots();
    const watchedPaths: string[] = [];

    // Set up watchers in each root
    for (const root of roots) {
      const rootPath = root.uri.replace('file://', '');
      const watchPath = `${rootPath}/${params.pattern}`;

      // Start watching
      await startWatching(watchPath, async (changedFile) => {
        // Notify subscribers when file changes
        if (context.notifyResourceUpdate) {
          await context.notifyResourceUpdate(`file://${changedFile}`);
        }
      });

      watchedPaths.push(watchPath);
    }

    return {
      watching: true,
      paths: watchedPaths
    };
  };
}

async function startWatching(
  path: string,
  callback: (file: string) => Promise<void>
): Promise<void> {
  // Implementation - file system watching
}
```

### Combining with Sampling

Generate project documentation using roots and AI:

```typescript
interface GenerateDocsTool extends ITool {
  name: 'generate_docs';
  description: 'Generate project documentation using AI';
  params: {};
  result: {
    documentation: string;
    project: string;
  };
}

export default class DocsGenerator implements IServer {
  generateDocs: GenerateDocsTool = async (params, context) => {
    if (!context.listRoots) {
      throw new Error('Documentation generation requires roots capability');
    }

    const roots = await context.listRoots();

    if (roots.length === 0) {
      throw new Error('No project roots available');
    }

    const primaryRoot = roots[0];
    const rootPath = primaryRoot.uri.replace('file://', '');

    // Analyze project structure
    const structure = await analyzeProjectStructure(rootPath);

    // Use sampling to generate documentation
    if (context.sample) {
      const result = await context.sample([
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate documentation for this project:

Project: ${primaryRoot.name || 'Unknown'}
Structure:
${JSON.stringify(structure, null, 2)}

Include:
- Project overview
- File structure explanation
- Key components
- Usage instructions`
          }
        }
      ], {
        maxTokens: 2000,
        temperature: 0.6
      });

      return {
        documentation: result.content.text || 'Documentation generation failed',
        project: primaryRoot.name || 'Project'
      };
    }

    // Fallback without AI
    return {
      documentation: generateBasicDocs(structure),
      project: primaryRoot.name || 'Project'
    };
  };
}

async function analyzeProjectStructure(path: string): Promise<any> {
  // Implementation
  return {};
}

function generateBasicDocs(structure: any): string {
  // Implementation
  return '# Project Documentation\n\n...';
}
```

---

## Examples

**See working examples:**
- Foundation: [examples/interface-roots-foundation.ts](../../examples/interface-roots-foundation.ts)
- Advanced: [examples/interface-roots.ts](../../examples/interface-roots.ts)
- Comprehensive: [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)

---

## Next Steps

- **Request LLM completions?** See [SAMPLING.md](./SAMPLING.md)
- **Request user input?** See [ELICITATION.md](./ELICITATION.md)
- **Add subscriptions?** See [SUBSCRIPTIONS.md](./SUBSCRIPTIONS.md)
- **Learn more about Interface API?** See [API_PROTOCOL.md](./API_PROTOCOL.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
