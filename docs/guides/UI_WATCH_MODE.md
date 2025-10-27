# UI Watch Mode Guide

## Overview

The UI Watch Manager provides file watching and hot reload capabilities for UI resources in SimplyMCP. It monitors UI files (HTML, CSS, JS, JSX, TSX) for changes, invalidates caches, and enables hot reload through MCP resource update notifications.

## Features

- **File Watching**: Monitor UI files using chokidar for cross-platform compatibility
- **Debouncing**: Prevent excessive recompilation with configurable debounce delays
- **Cache Invalidation**: Automatically invalidate file and React compilation caches
- **Event System**: Fine-grained events for different file types
- **Hot Reload**: Support MCP resource update notifications for live updates
- **Graceful Shutdown**: Clean resource cleanup on stop

## Installation

Chokidar is an optional dependency:

```bash
npm install chokidar
```

## Basic Usage

### Creating a Watch Manager

```typescript
import { UIWatchManager } from 'simply-mcp';

const manager = new UIWatchManager({
  serverFilePath: './server.ts',
  enabled: true,
  debounceMs: 300,
  verbose: true,
});

// Start watching
await manager.start();
```

### Event Handling

```typescript
// Listen for any file change
manager.on('fileChange', (event) => {
  console.log('File changed:', event.filePath);
});

// Listen for React component changes
manager.on('componentChange', async (event) => {
  console.log('Component changed:', event.filePath);

  // Invalidate cache
  invalidateReactCache(event.absolutePath);

  // Recompile component
  const result = await compileReactComponent({
    componentPath: event.absolutePath,
    componentCode: await readFile(event.absolutePath, 'utf-8'),
  });

  // Notify subscribers
  notifyResourceUpdate('ui://my-component/v1');
});

// Listen for HTML changes
manager.on('htmlChange', (event) => {
  console.log('HTML changed:', event.filePath);
  invalidateFileCache(event.absolutePath);
});

// Listen for CSS changes
manager.on('cssChange', (event) => {
  console.log('CSS changed:', event.filePath);
  invalidateFileCache(event.absolutePath);
});

// Listen for script changes
manager.on('scriptChange', (event) => {
  console.log('Script changed:', event.filePath);
  invalidateFileCache(event.absolutePath);
});

// Handle errors
manager.on('error', (error) => {
  console.error('Watch error:', error.message);
});
```

### Graceful Shutdown

```typescript
// Stop watching
await manager.stop();

// Or with cleanup
process.on('SIGINT', async () => {
  await manager.stop();
  process.exit(0);
});
```

## Configuration Options

```typescript
interface WatchModeConfig {
  /** Server file path (base directory for relative paths) */
  serverFilePath: string;

  /** Enable watch mode (default: false) */
  enabled?: boolean;

  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;

  /** Enable verbose logging (default: false) */
  verbose?: boolean;

  /** File patterns to watch (default: ['**/*.{html,css,js,jsx,ts,tsx}']) */
  patterns?: string[];

  /** Patterns to ignore (default: node_modules, .git, dist, etc.) */
  ignored?: string[];
}
```

## File Change Events

### Event Structure

```typescript
interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  filePath: string;        // Relative path
  absolutePath: string;    // Absolute path
  timestamp: number;       // Unix timestamp
  extension: string;       // File extension (e.g., '.tsx')
}
```

### Event Types

| Event | Description | Use Case |
|-------|-------------|----------|
| `ready` | Watcher initialized | Log startup message |
| `fileChange` | Any file changed | Generic handling |
| `componentChange` | React component (.tsx, .jsx) | Recompile component |
| `htmlChange` | HTML file changed | Reload HTML resource |
| `cssChange` | CSS file changed | Reload styles |
| `scriptChange` | JS/TS file changed | Reload script |
| `error` | Watcher error | Error handling |

## Cache Management

### File Cache

```typescript
import { invalidateFileCache, clearFileCache, getFileCacheStats } from 'simply-mcp';

// Invalidate specific file
invalidateFileCache('/path/to/file.html');

// Clear all cached files
clearFileCache();

// Get cache statistics
const stats = getFileCacheStats();
console.log(`Cached ${stats.size} files:`, stats.files);
```

### React Compilation Cache

```typescript
import { invalidateReactCache, clearReactCache, getReactCacheStats } from 'simply-mcp';

// Invalidate specific component
invalidateReactCache('/path/to/Component.tsx');

// Clear all compiled components
clearReactCache();

// Get cache statistics
const stats = getReactCacheStats();
console.log(`Cached ${stats.size} components:`, stats.components);
```

## Integration with MCP Server

### Subscribable Resources

```typescript
interface IUIServer {
  getCalculatorUI: {
    params: {};
    result: {
      uri: string;
      mimeType: string;
      text: string;
    };
    annotations: {
      'simplymcp.dev/subscribable': true;
    };
  };
}

const server = SimplyMCP.ServerBuilder<IUIServer>({
  serverInfo: { name: 'ui-server', version: '1.0.0' },
})
  .addResource('getCalculatorUI', async () => {
    const resolved = await resolveUIFile('./ui/calculator.html', {
      serverFilePath: __filename,
    });

    return {
      uri: 'ui://calculator/v1',
      mimeType: resolved.mimeType,
      text: resolved.content,
    };
  })
  .build();

// Set up watch manager
const manager = new UIWatchManager({
  serverFilePath: __filename,
  enabled: true,
});

manager.on('htmlChange', async (event) => {
  if (event.filePath.includes('calculator.html')) {
    invalidateFileCache(event.absolutePath);

    // Notify subscribers of resource update
    // (MCP SDK will handle sending notifications)
    await server.notifyResourceUpdate('ui://calculator/v1');
  }
});

await manager.start();
```

## Advanced Patterns

### Conditional Watching

```typescript
// Only enable watch mode in development
const manager = new UIWatchManager({
  serverFilePath: __filename,
  enabled: process.env.NODE_ENV === 'development',
  verbose: process.env.DEBUG === 'true',
});
```

### Custom File Patterns

```typescript
// Watch only specific directories
const manager = new UIWatchManager({
  serverFilePath: __filename,
  enabled: true,
  patterns: [
    'ui/**/*.html',
    'components/**/*.tsx',
    'styles/**/*.css',
  ],
  ignored: [
    '**/*.test.tsx',
    '**/*.spec.tsx',
    '**/storybook/**',
  ],
});
```

### Debounce Configuration

```typescript
// Fast debounce for rapid iteration
const fastManager = new UIWatchManager({
  serverFilePath: __filename,
  enabled: true,
  debounceMs: 100, // Quick response
});

// Slower debounce for heavy operations
const slowManager = new UIWatchManager({
  serverFilePath: __filename,
  enabled: true,
  debounceMs: 1000, // Wait for more changes
});
```

### Multi-Resource Updates

```typescript
// Map file paths to resource URIs
const fileToResourceMap = new Map([
  ['ui/calculator.html', 'ui://calculator/v1'],
  ['ui/dashboard.html', 'ui://dashboard/v1'],
  ['components/Chart.tsx', ['ui://dashboard/v1', 'ui://analytics/v1']],
]);

manager.on('fileChange', async (event) => {
  const resources = fileToResourceMap.get(event.filePath);

  if (resources) {
    // Invalidate cache
    invalidateFileCache(event.absolutePath);

    // Notify all affected resources
    const resourceList = Array.isArray(resources) ? resources : [resources];
    for (const uri of resourceList) {
      await server.notifyResourceUpdate(uri);
    }
  }
});
```

## Status Methods

```typescript
// Check if watcher is active
if (manager.isActive()) {
  console.log('Watch mode is running');
}

// Get watched file count
const count = manager.getWatchedFilesCount();
console.log(`Watching ${count} files`);

// Get list of watched files
const files = manager.getWatchedFiles();
console.log('Watched files:', files);
```

## Best Practices

### 1. Enable Only in Development

```typescript
const watchEnabled = process.env.NODE_ENV === 'development';

const manager = new UIWatchManager({
  serverFilePath: __filename,
  enabled: watchEnabled,
});
```

### 2. Handle Errors Gracefully

```typescript
manager.on('error', (error) => {
  console.error('Watch error:', error.message);
  // Don't crash the server - watch mode is a convenience feature
});
```

### 3. Clean Up Resources

```typescript
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await manager.stop();
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await manager.stop();
  await server.close();
  process.exit(0);
});
```

### 4. Use Appropriate Debounce

```typescript
// For large projects with frequent saves
const manager = new UIWatchManager({
  serverFilePath: __filename,
  enabled: true,
  debounceMs: 500, // Wait for multiple changes
});
```

### 5. Log in Verbose Mode

```typescript
const manager = new UIWatchManager({
  serverFilePath: __filename,
  enabled: true,
  verbose: process.env.DEBUG === 'true',
});
```

## Troubleshooting

### Watch Not Detecting Changes

**Problem**: Files are changing but events aren't firing.

**Solutions**:
- Check `patterns` matches your files
- Ensure files aren't in `ignored` patterns
- Try increasing `debounceMs`
- Enable `verbose` mode for debugging

### Too Many Events

**Problem**: Getting flooded with change events.

**Solutions**:
- Increase `debounceMs` delay
- Add more patterns to `ignored`
- Check for build tools creating temporary files

### Performance Issues

**Problem**: Watch mode slowing down development.

**Solutions**:
- Reduce `patterns` scope
- Add more patterns to `ignored`
- Use conditional watching (dev only)
- Increase `debounceMs`

### Chokidar Not Found

**Problem**: Error about chokidar not being installed.

**Solution**:
```bash
npm install chokidar
```

## Examples

**Working Examples:**

### Basic UI Examples
- [examples/interface-ui-foundation.ts](../../examples/interface-ui-foundation.ts) - Foundation UI with inline HTML
- [examples/interface-file-based-ui.ts](../../examples/interface-file-based-ui.ts) - File-based UI loading

### React Examples
- [examples/interface-react-component.ts](../../examples/interface-react-component.ts) - React components in MCP UI
- [examples/interface-react-dashboard.ts](../../examples/interface-react-dashboard.ts) - Full React dashboard

### Advanced UI
- [examples/interface-remote-dom.ts](../../examples/interface-remote-dom.ts) - Remote DOM protocol
- [examples/interface-external-url.ts](../../examples/interface-external-url.ts) - External URL references
- [examples/interface-theme-demo.ts](../../examples/interface-theme-demo.ts) - Theme system demo
- [examples/interface-component-library.ts](../../examples/interface-component-library.ts) - Component library patterns

### Watch Mode Integration
- [examples/interface-watch-mode.ts](../../examples/interface-watch-mode.ts) - Complete watch mode implementation with hot reload
- [tests/manual-test-ui-watch.ts](../../tests/manual-test-ui-watch.ts) - Manual testing example

## Related Documentation

- [UI Resources Guide](./RESOURCES.md) - UI resource fundamentals
- [React Components](./PROMPTS.md) - React component compilation
- [File Resolution](./CONFIGURATION.md) - File path resolution
- [Subscriptions](./SUBSCRIPTIONS.md) - MCP resource subscriptions

## API Reference

### UIWatchManager Class

```typescript
class UIWatchManager extends EventEmitter {
  constructor(config: WatchModeConfig);

  start(): Promise<void>;
  stop(): Promise<void>;

  isActive(): boolean;
  getWatchedFilesCount(): number;
  getWatchedFiles(): string[];

  on(event: 'ready', listener: () => void): this;
  on(event: 'fileChange', listener: (event: FileChangeEvent) => void): this;
  on(event: 'componentChange', listener: (event: FileChangeEvent) => void): this;
  on(event: 'htmlChange', listener: (event: FileChangeEvent) => void): this;
  on(event: 'cssChange', listener: (event: FileChangeEvent) => void): this;
  on(event: 'scriptChange', listener: (event: FileChangeEvent) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
}
```

### Helper Functions

```typescript
// Create and start manager
function createWatchManager(config: WatchModeConfig): Promise<UIWatchManager>;

// File cache management
function invalidateFileCache(absolutePath: string): void;
function clearFileCache(): void;
function getFileCacheStats(): { size: number; files: string[] };

// React cache management
function invalidateReactCache(componentPath: string): void;
function clearReactCache(): void;
function getReactCacheStats(): { size: number; components: string[] };
```
