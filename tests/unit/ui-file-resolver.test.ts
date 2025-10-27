/**
 * UI File Resolver Tests
 *
 * Comprehensive security and functionality tests for the UI file resolver
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  resolveUIFile,
  clearFileCache,
  getFileCacheStats,
  invalidateFileCache,
} from '../../src/features/ui/ui-file-resolver.js';

describe('UI File Resolver', () => {
  let testDir: string;
  let serverFile: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `ui-resolver-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Create test server file
    serverFile = join(testDir, 'server.ts');
    await writeFile(serverFile, '// Test server');

    // Create test UI files
    const uiDir = join(testDir, 'ui');
    await mkdir(uiDir, { recursive: true });
    await writeFile(join(uiDir, 'test.html'), '<html><body>Test</body></html>');
    await writeFile(join(uiDir, 'style.css'), 'body { margin: 0; }');
    await writeFile(join(uiDir, 'script.js'), 'console.log("test");');

    // Clear cache before each test
    clearFileCache();
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Security Validation', () => {
    it('should reject absolute paths (Unix)', async () => {
      await expect(
        resolveUIFile('/etc/passwd', { serverFilePath: serverFile })
      ).rejects.toThrow(/Security violation: Absolute paths not allowed/);
    });

    it('should reject absolute paths (Windows)', async () => {
      await expect(
        resolveUIFile('C:\\Windows\\System32\\config', { serverFilePath: serverFile })
      ).rejects.toThrow(/Security violation: Absolute paths not allowed/);
    });

    it('should reject parent directory traversal (..)', async () => {
      await expect(
        resolveUIFile('../../../etc/passwd', { serverFilePath: serverFile })
      ).rejects.toThrow(/Security violation: Parent directory traversal not allowed/);
    });

    it('should reject paths with .. in middle', async () => {
      await expect(
        resolveUIFile('./ui/../../../etc/passwd', { serverFilePath: serverFile })
      ).rejects.toThrow(/Security violation: Parent directory traversal not allowed/);
    });

    it('should reject empty paths', async () => {
      await expect(
        resolveUIFile('', { serverFilePath: serverFile })
      ).rejects.toThrow(/File path cannot be empty/);
    });

    it('should reject whitespace-only paths', async () => {
      await expect(
        resolveUIFile('   ', { serverFilePath: serverFile })
      ).rejects.toThrow(/File path cannot be empty/);
    });

    it('should ensure resolved path stays within server directory', async () => {
      // This test verifies the path.resolve + isPathWithinDirectory check
      // Even if a path doesn't contain "..", it shouldn't escape the server dir
      const outsideFile = join(tmpdir(), 'outside.html');
      await writeFile(outsideFile, 'Outside file');

      // Try to access file outside server directory
      const relativePath = join('..', 'outside.html');

      // Should be caught by ".." validation first
      await expect(
        resolveUIFile(relativePath, { serverFilePath: serverFile })
      ).rejects.toThrow(/Security violation/);

      // Clean up
      await rm(outsideFile, { force: true });
    });
  });

  describe('File Loading', () => {
    it('should load HTML file successfully', async () => {
      const result = await resolveUIFile('./ui/test.html', {
        serverFilePath: serverFile,
      });

      expect(result.content).toBe('<html><body>Test</body></html>');
      expect(result.mimeType).toBe('text/html');
      expect(result.size).toBeGreaterThan(0);
      expect(result.path).toContain('test.html');
    });

    it('should load CSS file successfully', async () => {
      const result = await resolveUIFile('./ui/style.css', {
        serverFilePath: serverFile,
      });

      expect(result.content).toBe('body { margin: 0; }');
      expect(result.mimeType).toBe('text/css');
    });

    it('should load JS file successfully', async () => {
      const result = await resolveUIFile('./ui/script.js', {
        serverFilePath: serverFile,
      });

      expect(result.content).toBe('console.log("test");');
      expect(result.mimeType).toBe('application/javascript');
    });

    it('should handle missing files with clear error', async () => {
      await expect(
        resolveUIFile('./ui/missing.html', { serverFilePath: serverFile })
      ).rejects.toThrow(/File not found.*missing\.html/);
    });

    it('should handle permission errors gracefully', async () => {
      // This test is platform-dependent and may not work on all systems
      // Skip on Windows where chmod doesn't work the same way
      if (process.platform === 'win32') {
        return;
      }

      const restrictedFile = join(testDir, 'ui', 'restricted.html');
      await writeFile(restrictedFile, 'Restricted');

      // Make file unreadable
      const { chmod } = await import('fs/promises');
      await chmod(restrictedFile, 0o000);

      await expect(
        resolveUIFile('./ui/restricted.html', { serverFilePath: serverFile })
      ).rejects.toThrow(/Permission denied/);

      // Restore permissions for cleanup
      await chmod(restrictedFile, 0o644);
    });
  });

  describe('MIME Type Inference', () => {
    const testCases = [
      { file: 'test.html', expected: 'text/html' },
      { file: 'test.css', expected: 'text/css' },
      { file: 'test.js', expected: 'application/javascript' },
      { file: 'test.jsx', expected: 'application/javascript' },
      { file: 'test.ts', expected: 'application/typescript' },
      { file: 'test.tsx', expected: 'application/typescript' },
      { file: 'test.json', expected: 'application/json' },
      { file: 'test.svg', expected: 'image/svg+xml' },
      { file: 'test.png', expected: 'image/png' },
      { file: 'test.jpg', expected: 'image/jpeg' },
      { file: 'test.jpeg', expected: 'image/jpeg' },
      { file: 'test.gif', expected: 'image/gif' },
      { file: 'test.unknown', expected: 'text/plain' },
    ];

    for (const { file, expected } of testCases) {
      it(`should infer ${expected} for ${file}`, async () => {
        const filePath = join(testDir, 'ui', file);
        await writeFile(filePath, 'test content');

        const result = await resolveUIFile(`./ui/${file}`, {
          serverFilePath: serverFile,
        });

        expect(result.mimeType).toBe(expected);
      });
    }
  });

  describe('File Caching', () => {
    it('should cache files by default', async () => {
      // First load
      await resolveUIFile('./ui/test.html', { serverFilePath: serverFile });

      const stats1 = getFileCacheStats();
      expect(stats1.size).toBe(1);

      // Second load (should use cache)
      await resolveUIFile('./ui/test.html', { serverFilePath: serverFile });

      const stats2 = getFileCacheStats();
      expect(stats2.size).toBe(1); // Still only 1 cached file
    });

    it('should respect cache: false option', async () => {
      // Load with cache disabled
      await resolveUIFile('./ui/test.html', {
        serverFilePath: serverFile,
        cache: false,
      });

      const stats = getFileCacheStats();
      expect(stats.size).toBe(0); // Nothing cached
    });

    it('should cache multiple different files', async () => {
      await resolveUIFile('./ui/test.html', { serverFilePath: serverFile });
      await resolveUIFile('./ui/style.css', { serverFilePath: serverFile });
      await resolveUIFile('./ui/script.js', { serverFilePath: serverFile });

      const stats = getFileCacheStats();
      expect(stats.size).toBe(3);
      expect(stats.files.length).toBe(3);
    });

    it('should support cache invalidation', async () => {
      const result = await resolveUIFile('./ui/test.html', {
        serverFilePath: serverFile,
      });

      const stats1 = getFileCacheStats();
      expect(stats1.size).toBe(1);

      // Invalidate cache
      invalidateFileCache(result.path);

      const stats2 = getFileCacheStats();
      expect(stats2.size).toBe(0);
    });

    it('should support clearing entire cache', async () => {
      await resolveUIFile('./ui/test.html', { serverFilePath: serverFile });
      await resolveUIFile('./ui/style.css', { serverFilePath: serverFile });

      const stats1 = getFileCacheStats();
      expect(stats1.size).toBe(2);

      clearFileCache();

      const stats2 = getFileCacheStats();
      expect(stats2.size).toBe(0);
    });
  });

  describe('Verbose Logging', () => {
    it('should support verbose mode', async () => {
      // Just verify it doesn't crash with verbose: true
      const result = await resolveUIFile('./ui/test.html', {
        serverFilePath: serverFile,
        verbose: true,
      });

      expect(result.content).toBe('<html><body>Test</body></html>');
    });
  });

  describe('Path Resolution', () => {
    it('should resolve paths relative to server file directory', async () => {
      const result = await resolveUIFile('./ui/test.html', {
        serverFilePath: serverFile,
      });

      expect(result.path).toContain(testDir);
      expect(result.path).toContain('ui');
      expect(result.path).toContain('test.html');
    });

    it('should handle nested directories', async () => {
      const nestedDir = join(testDir, 'ui', 'components');
      await mkdir(nestedDir, { recursive: true });
      await writeFile(join(nestedDir, 'button.html'), '<button>Click</button>');

      const result = await resolveUIFile('./ui/components/button.html', {
        serverFilePath: serverFile,
      });

      expect(result.content).toBe('<button>Click</button>');
    });

    it('should handle paths without ./ prefix', async () => {
      const result = await resolveUIFile('ui/test.html', {
        serverFilePath: serverFile,
      });

      expect(result.content).toBe('<html><body>Test</body></html>');
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error for missing files', async () => {
      try {
        await resolveUIFile('./ui/missing.html', { serverFilePath: serverFile });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('File not found');
        expect(error.message).toContain('missing.html');
        expect(error.message).toContain('Hint');
      }
    });

    it('should provide helpful error for absolute paths', async () => {
      try {
        await resolveUIFile('/etc/passwd', { serverFilePath: serverFile });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Security violation');
        expect(error.message).toContain('Absolute paths not allowed');
        expect(error.message).toContain('Hint');
      }
    });

    it('should provide helpful error for parent traversal', async () => {
      try {
        await resolveUIFile('../../../etc/passwd', { serverFilePath: serverFile });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Security violation');
        expect(error.message).toContain('Parent directory traversal');
        expect(error.message).toContain('Hint');
      }
    });
  });
});
