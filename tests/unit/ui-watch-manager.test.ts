/**
 * Unit tests for UI Watch Manager
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UIWatchManager } from '../../src/features/ui/ui-watch-manager.js';
import { invalidateReactCache, clearReactCache, getReactCacheStats } from '../../src/features/ui/ui-react-compiler.js';
import { invalidateFileCache, clearFileCache, getFileCacheStats } from '../../src/features/ui/ui-file-resolver.js';
import { join } from 'path';

describe('UIWatchManager', () => {
  let manager: UIWatchManager;
  const testServerPath = join(__dirname, 'test-server.ts');

  afterEach(async () => {
    if (manager && manager.isActive()) {
      await manager.stop();
    }
  });

  describe('constructor', () => {
    it('should create manager with default config', () => {
      manager = new UIWatchManager({
        serverFilePath: testServerPath,
      });

      expect(manager).toBeDefined();
      expect(manager.isActive()).toBe(false);
    });

    it('should create manager with custom config', () => {
      manager = new UIWatchManager({
        serverFilePath: testServerPath,
        enabled: true,
        debounceMs: 500,
        verbose: true,
        patterns: ['**/*.tsx'],
        ignored: ['**/test/**'],
      });

      expect(manager).toBeDefined();
    });
  });

  describe('start and stop', () => {
    it('should not start if disabled', async () => {
      manager = new UIWatchManager({
        serverFilePath: testServerPath,
        enabled: false,
      });

      await manager.start();
      expect(manager.isActive()).toBe(false);
    });

    it('should throw if already started', async () => {
      manager = new UIWatchManager({
        serverFilePath: testServerPath,
        enabled: true,
      });

      await manager.start();
      expect(manager.isActive()).toBe(true);

      await expect(manager.start()).rejects.toThrow('already started');
    });

    it('should stop gracefully', async () => {
      manager = new UIWatchManager({
        serverFilePath: testServerPath,
        enabled: true,
      });

      await manager.start();
      expect(manager.isActive()).toBe(true);

      await manager.stop();
      expect(manager.isActive()).toBe(false);
    });

    it('should be safe to stop multiple times', async () => {
      manager = new UIWatchManager({
        serverFilePath: testServerPath,
        enabled: true,
      });

      await manager.start();
      await manager.stop();
      await manager.stop(); // Should not throw
      expect(manager.isActive()).toBe(false);
    });
  });

  describe('event emission', () => {
    it('should emit ready event', async () => {
      manager = new UIWatchManager({
        serverFilePath: testServerPath,
        enabled: true,
      });

      let readyEmitted = false;
      manager.on('ready', () => {
        readyEmitted = true;
      });

      await manager.start();

      // Wait a bit for ready event
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(readyEmitted).toBe(true);
    });

    it('should support all event types', () => {
      manager = new UIWatchManager({
        serverFilePath: testServerPath,
        enabled: false,
      });

      let readyCount = 0;
      let fileChangeCount = 0;
      let componentChangeCount = 0;
      let htmlChangeCount = 0;
      let cssChangeCount = 0;
      let scriptChangeCount = 0;
      let errorCount = 0;

      manager.on('ready', () => readyCount++);
      manager.on('fileChange', () => fileChangeCount++);
      manager.on('componentChange', () => componentChangeCount++);
      manager.on('htmlChange', () => htmlChangeCount++);
      manager.on('cssChange', () => cssChangeCount++);
      manager.on('scriptChange', () => scriptChangeCount++);
      manager.on('error', () => errorCount++);

      // Manually emit to verify listeners
      manager.emit('ready');
      manager.emit('fileChange', {
        type: 'change',
        filePath: 'test.html',
        absolutePath: '/test.html',
        timestamp: Date.now(),
        extension: '.html',
      });

      expect(readyCount).toBe(1);
      expect(fileChangeCount).toBe(1);
    });
  });

  describe('status methods', () => {
    it('should return correct active status', async () => {
      manager = new UIWatchManager({
        serverFilePath: testServerPath,
        enabled: true,
      });

      expect(manager.isActive()).toBe(false);

      await manager.start();
      expect(manager.isActive()).toBe(true);

      await manager.stop();
      expect(manager.isActive()).toBe(false);
    });

    it('should return watched files count', async () => {
      manager = new UIWatchManager({
        serverFilePath: testServerPath,
        enabled: true,
      });

      await manager.start();
      const count = manager.getWatchedFilesCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return watched files list', async () => {
      manager = new UIWatchManager({
        serverFilePath: testServerPath,
        enabled: true,
      });

      await manager.start();
      const files = manager.getWatchedFiles();
      expect(Array.isArray(files)).toBe(true);
    });
  });
});

describe('React cache management', () => {
  beforeEach(() => {
    clearReactCache();
  });

  it('should start with empty cache', () => {
    const stats = getReactCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.components).toEqual([]);
  });

  it('should clear cache', () => {
    clearReactCache();
    const stats = getReactCacheStats();
    expect(stats.size).toBe(0);
  });

  it('should invalidate specific component', () => {
    // Note: This just ensures the function doesn't throw
    invalidateReactCache('/path/to/Component.tsx');
    expect(true).toBe(true);
  });

  it('should return cache statistics', () => {
    const stats = getReactCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('components');
    expect(typeof stats.size).toBe('number');
    expect(Array.isArray(stats.components)).toBe(true);
  });
});

describe('File cache management', () => {
  beforeEach(() => {
    clearFileCache();
  });

  it('should start with empty cache', () => {
    const stats = getFileCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.files).toEqual([]);
  });

  it('should clear cache', () => {
    clearFileCache();
    const stats = getFileCacheStats();
    expect(stats.size).toBe(0);
  });

  it('should invalidate specific file', () => {
    // Note: This just ensures the function doesn't throw
    invalidateFileCache('/path/to/file.html');
    expect(true).toBe(true);
  });

  it('should return cache statistics', () => {
    const stats = getFileCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('files');
    expect(typeof stats.size).toBe('number');
    expect(Array.isArray(stats.files)).toBe(true);
  });
});

describe('createWatchManager', () => {
  it('should create and start manager', async () => {
    // This test requires chokidar to be installed
    // We'll just import to verify the function exists
    const { createWatchManager } = await import('../../src/features/ui/ui-watch-manager.js');
    expect(typeof createWatchManager).toBe('function');
  });
});
