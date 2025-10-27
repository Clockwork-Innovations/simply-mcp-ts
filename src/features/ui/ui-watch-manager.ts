/**
 * UI Watch Manager - File watching and hot reload for UI resources
 *
 * Watches UI files for changes and triggers recompilation/cache invalidation.
 * Supports hot reload via MCP resource update notifications.
 *
 * This watch manager is designed specifically for UI resources and components,
 * providing fine-grained change detection and efficient cache invalidation.
 *
 * @module ui-watch-manager
 */

import type { FSWatcher } from 'chokidar';
import { resolve, dirname, extname } from 'path';
import { EventEmitter } from 'events';
import { invalidateFileCache } from './ui-file-resolver.js';

/**
 * Watch mode configuration
 */
export interface WatchModeConfig {
  /**
   * Server file path (base directory for relative paths)
   */
  serverFilePath: string;

  /**
   * Enable watch mode
   * @default false
   */
  enabled?: boolean;

  /**
   * Debounce delay in milliseconds
   * Prevents excessive recompilation when files change rapidly
   * @default 300
   */
  debounceMs?: number;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;

  /**
   * File patterns to watch (glob patterns)
   * @default ['**\/*.{html,css,js,jsx,ts,tsx}']
   */
  patterns?: string[];

  /**
   * Patterns to ignore (glob patterns)
   * @default ['**\/node_modules/**', '**\/.git/**', '**\/dist/**']
   */
  ignored?: string[];
}

/**
 * File change event
 */
export interface FileChangeEvent {
  /**
   * Type of file system event
   */
  type: 'add' | 'change' | 'unlink';

  /**
   * Relative file path from server directory
   */
  filePath: string;

  /**
   * Absolute file path
   */
  absolutePath: string;

  /**
   * Timestamp when event occurred
   */
  timestamp: number;

  /**
   * File extension (e.g., '.tsx', '.html')
   */
  extension: string;
}

/**
 * Watch manager events interface
 */
export interface UIWatchManagerEvents {
  /**
   * Emitted when watch manager is ready
   */
  ready: () => void;

  /**
   * Emitted when any file changes
   */
  fileChange: (event: FileChangeEvent) => void;

  /**
   * Emitted when a React component changes (.tsx, .jsx)
   */
  componentChange: (event: FileChangeEvent) => void;

  /**
   * Emitted when an HTML file changes
   */
  htmlChange: (event: FileChangeEvent) => void;

  /**
   * Emitted when a CSS file changes
   */
  cssChange: (event: FileChangeEvent) => void;

  /**
   * Emitted when a JavaScript/TypeScript file changes
   */
  scriptChange: (event: FileChangeEvent) => void;

  /**
   * Emitted when watcher encounters an error
   */
  error: (error: Error) => void;
}

/**
 * UI Watch Manager class
 *
 * Manages file watching for UI resources with intelligent caching,
 * debouncing, and hot reload support.
 *
 * @example
 * ```typescript
 * const manager = new UIWatchManager({
 *   serverFilePath: './server.ts',
 *   enabled: true,
 *   verbose: true
 * });
 *
 * manager.on('componentChange', (event) => {
 *   console.log('Component changed:', event.filePath);
 *   // Trigger recompilation, notify subscribers, etc.
 * });
 *
 * await manager.start();
 * ```
 */
export class UIWatchManager extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private config: Required<WatchModeConfig>;
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private watchedFiles = new Set<string>();

  constructor(config: WatchModeConfig) {
    super();

    // Merge with defaults
    this.config = {
      serverFilePath: config.serverFilePath,
      enabled: config.enabled ?? false,
      debounceMs: config.debounceMs ?? 300,
      verbose: config.verbose ?? false,
      patterns: config.patterns ?? ['**/*.{html,css,js,jsx,ts,tsx}'],
      ignored: config.ignored ?? [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**',
      ],
    };

    if (this.config.verbose) {
      console.log('[UI Watch] Configuration:', {
        serverFilePath: this.config.serverFilePath,
        enabled: this.config.enabled,
        debounceMs: this.config.debounceMs,
        patterns: this.config.patterns,
        ignored: this.config.ignored,
      });
    }
  }

  /**
   * Start watching files
   *
   * Initializes the file watcher using chokidar and begins monitoring
   * UI files for changes. Requires chokidar to be installed.
   *
   * @throws {Error} If watch mode is already started
   * @throws {Error} If chokidar is not installed
   *
   * @example
   * ```typescript
   * const manager = new UIWatchManager({ ... });
   * await manager.start();
   * console.log('Watch mode active');
   * ```
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      if (this.config.verbose) {
        console.log('[UI Watch] Not enabled, skipping...');
      }
      return;
    }

    if (this.watcher) {
      throw new Error('UI watch mode already started');
    }

    // Import chokidar dynamically (optional dependency)
    let chokidar: typeof import('chokidar');
    try {
      chokidar = await import('chokidar');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        'UI watch mode requires chokidar.\n' +
          'Install it with: npm install chokidar\n\n' +
          `Or disable watch mode. (Error: ${errorMsg})`
      );
    }

    const serverDir = dirname(this.config.serverFilePath);

    if (this.config.verbose) {
      console.log(`[UI Watch] Starting file watcher in: ${serverDir}`);
      console.log(`[UI Watch] Watching patterns:`, this.config.patterns);
    }

    // Create watcher
    this.watcher = chokidar.watch(this.config.patterns, {
      cwd: serverDir,
      ignored: this.config.ignored,
      persistent: true,
      ignoreInitial: true, // Don't trigger on initial scan
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    // Attach event handlers
    this.watcher
      .on('add', (filePath) => this.handleFileEvent('add', filePath, serverDir))
      .on('change', (filePath) => this.handleFileEvent('change', filePath, serverDir))
      .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath, serverDir))
      .on('error', (error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.handleError(err);
      })
      .on('ready', () => {
        if (this.config.verbose) {
          console.log('[UI Watch] File watcher ready');
        }
        this.emit('ready');
      });
  }

  /**
   * Stop watching files
   *
   * Closes the file watcher and cleans up all timers and state.
   * Safe to call multiple times.
   *
   * @example
   * ```typescript
   * await manager.stop();
   * console.log('Watch mode stopped');
   * ```
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;

      // Clear all debounce timers
      this.debounceTimers.forEach((timer) => clearTimeout(timer));
      this.debounceTimers.clear();
      this.watchedFiles.clear();

      if (this.config.verbose) {
        console.log('[UI Watch] Stopped');
      }
    }
  }

  /**
   * Handle file change event (with debouncing)
   *
   * Debounces rapid file changes to prevent excessive processing.
   * Each file has its own debounce timer.
   *
   * @param type - Event type (add, change, unlink)
   * @param filePath - Relative file path
   * @param baseDir - Base directory for resolving absolute paths
   *
   * @internal
   */
  private handleFileEvent(
    type: FileChangeEvent['type'],
    filePath: string,
    baseDir: string
  ): void {
    const absolutePath = resolve(baseDir, filePath);

    // Clear existing debounce timer for this file
    const existingTimer = this.debounceTimers.get(absolutePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.processFileChange({
        type,
        filePath,
        absolutePath,
        timestamp: Date.now(),
        extension: extname(filePath).toLowerCase(),
      });
      this.debounceTimers.delete(absolutePath);
    }, this.config.debounceMs);

    this.debounceTimers.set(absolutePath, timer);
  }

  /**
   * Process file change (after debouncing)
   *
   * Invalidates caches, tracks file state, and emits appropriate events
   * for subscribers to react to changes.
   *
   * @param event - File change event details
   *
   * @internal
   */
  private processFileChange(event: FileChangeEvent): void {
    if (this.config.verbose) {
      console.log(`[UI Watch] File ${event.type}: ${event.filePath}`);
    }

    // Invalidate file cache for this file
    invalidateFileCache(event.absolutePath);

    // Track watched files
    if (event.type === 'add' || event.type === 'change') {
      this.watchedFiles.add(event.absolutePath);
    } else if (event.type === 'unlink') {
      this.watchedFiles.delete(event.absolutePath);
    }

    // Emit generic file change event
    this.emit('fileChange', event);

    // Emit specific events for different file types
    const ext = event.extension;

    if (['.tsx', '.jsx'].includes(ext)) {
      this.emit('componentChange', event);
      if (this.config.verbose) {
        console.log(`[UI Watch] Component change detected: ${event.filePath}`);
      }
    } else if (ext === '.html') {
      this.emit('htmlChange', event);
      if (this.config.verbose) {
        console.log(`[UI Watch] HTML change detected: ${event.filePath}`);
      }
    } else if (ext === '.css') {
      this.emit('cssChange', event);
      if (this.config.verbose) {
        console.log(`[UI Watch] CSS change detected: ${event.filePath}`);
      }
    } else if (['.js', '.ts'].includes(ext)) {
      this.emit('scriptChange', event);
      if (this.config.verbose) {
        console.log(`[UI Watch] Script change detected: ${event.filePath}`);
      }
    }
  }

  /**
   * Handle watcher errors
   *
   * Logs errors and emits error events for external handling.
   *
   * @param error - Error from chokidar watcher
   *
   * @internal
   */
  private handleError(error: Error): void {
    console.error('[UI Watch] Error:', error.message);
    this.emit('error', error);
  }

  /**
   * Check if watch mode is active
   *
   * @returns True if watcher is running
   *
   * @example
   * ```typescript
   * if (manager.isActive()) {
   *   console.log('Watching for changes...');
   * }
   * ```
   */
  isActive(): boolean {
    return this.watcher !== null;
  }

  /**
   * Get number of watched files
   *
   * @returns Count of files currently being tracked
   *
   * @example
   * ```typescript
   * console.log(`Watching ${manager.getWatchedFilesCount()} files`);
   * ```
   */
  getWatchedFilesCount(): number {
    return this.watchedFiles.size;
  }

  /**
   * Get list of watched files
   *
   * @returns Array of absolute file paths being watched
   *
   * @example
   * ```typescript
   * const files = manager.getWatchedFiles();
   * console.log('Watched files:', files);
   * ```
   */
  getWatchedFiles(): string[] {
    return Array.from(this.watchedFiles);
  }
}

/**
 * Create and start a UI watch manager
 *
 * Convenience function that creates a manager instance and starts it.
 *
 * @param config - Watch mode configuration
 * @returns Started watch manager instance
 *
 * @example
 * ```typescript
 * const manager = await createWatchManager({
 *   serverFilePath: './server.ts',
 *   enabled: true,
 *   verbose: true
 * });
 *
 * manager.on('componentChange', (event) => {
 *   console.log('Recompiling:', event.filePath);
 * });
 * ```
 */
export async function createWatchManager(
  config: WatchModeConfig
): Promise<UIWatchManager> {
  const manager = new UIWatchManager(config);
  await manager.start();
  return manager;
}
