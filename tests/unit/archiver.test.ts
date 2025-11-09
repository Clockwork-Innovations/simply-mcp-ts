/**
 * Archiver Test Suite
 *
 * Tests the archive creation functionality for tar.gz and zip formats.
 *
 * Test Coverage:
 * - tar.gz format archive creation
 * - zip format archive creation
 * - Selective file inclusion
 * - Error handling (missing directories, invalid formats, etc.)
 * - Edge cases (empty directories, nested structures, special characters, symlinks)
 * - File permissions preservation (tar.gz)
 * - Archive content verification via extraction
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { mkdir, writeFile, rm, readFile, stat, chmod, symlink, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createArchive, type ArchiverOptions } from '../../src/core/archiver.js';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';

describe('Archiver - tar.gz format', () => {
  let testDir: string;
  let sourceDir: string;
  let outputDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `archiver-test-tarball-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Create fresh directories for each test
    sourceDir = join(testDir, `source-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    outputDir = join(testDir, `output-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await mkdir(sourceDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });
  });

  it('should create valid tar.gz archive from directory', async () => {
    // Create test files
    await writeFile(join(sourceDir, 'file1.txt'), 'Hello World');
    await writeFile(join(sourceDir, 'file2.txt'), 'Test Content');

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Verify archive was created
    const archiveStat = await stat(outputPath);
    expect(archiveStat.isFile()).toBe(true);
    expect(archiveStat.size).toBeGreaterThan(0);
  });

  it('should archive contains all expected files', async () => {
    // Create multiple test files
    await writeFile(join(sourceDir, 'file1.txt'), 'Content 1');
    await writeFile(join(sourceDir, 'file2.txt'), 'Content 2');
    await mkdir(join(sourceDir, 'subdir'), { recursive: true });
    await writeFile(join(sourceDir, 'subdir', 'file3.txt'), 'Content 3');

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Extract and verify contents
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    // Verify all files exist
    expect(await fileExists(join(extractDir, 'file1.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'file2.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'subdir', 'file3.txt'))).toBe(true);

    // Verify contents match
    expect(await readFile(join(extractDir, 'file1.txt'), 'utf-8')).toBe('Content 1');
    expect(await readFile(join(extractDir, 'file2.txt'), 'utf-8')).toBe('Content 2');
    expect(await readFile(join(extractDir, 'subdir', 'file3.txt'), 'utf-8')).toBe('Content 3');
  });

  it('should preserve file permissions in tar.gz', async () => {
    // Create file with specific permissions
    const filePath = join(sourceDir, 'executable.sh');
    await writeFile(filePath, '#!/bin/bash\necho "test"');
    await chmod(filePath, 0o755); // Make executable

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Extract and verify permissions
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    const extractedFile = join(extractDir, 'executable.sh');
    const stats = await stat(extractedFile);
    const mode = stats.mode & 0o777;

    // Should preserve executable bit
    expect(mode & 0o100).toBeGreaterThan(0); // Owner execute bit
  });

  it('should handle nested directory structures', async () => {
    // Create deeply nested structure
    const deepDir = join(sourceDir, 'level1', 'level2', 'level3');
    await mkdir(deepDir, { recursive: true });
    await writeFile(join(deepDir, 'deep.txt'), 'Deep content');
    await writeFile(join(sourceDir, 'root.txt'), 'Root content');

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Extract and verify
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    expect(await fileExists(join(extractDir, 'root.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'level1', 'level2', 'level3', 'deep.txt'))).toBe(true);
    expect(await readFile(join(extractDir, 'level1', 'level2', 'level3', 'deep.txt'), 'utf-8')).toBe('Deep content');
  });

  it('should handle empty directories', async () => {
    // Create empty directory
    await mkdir(join(sourceDir, 'empty-dir'), { recursive: true });
    await writeFile(join(sourceDir, 'file.txt'), 'Content');

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Extract and verify empty directory exists
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    const emptyDirPath = join(extractDir, 'empty-dir');
    const stats = await stat(emptyDirPath);
    expect(stats.isDirectory()).toBe(true);

    const contents = await readdir(emptyDirPath);
    expect(contents.length).toBe(0);
  });

  it('should handle files with special characters in names', async () => {
    // Create files with special characters
    await writeFile(join(sourceDir, 'file-with-dashes.txt'), 'Content 1');
    await writeFile(join(sourceDir, 'file_with_underscores.txt'), 'Content 2');
    await writeFile(join(sourceDir, 'file.with.dots.txt'), 'Content 3');
    await writeFile(join(sourceDir, 'file with spaces.txt'), 'Content 4');

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Extract and verify
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    expect(await fileExists(join(extractDir, 'file-with-dashes.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'file_with_underscores.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'file.with.dots.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'file with spaces.txt'))).toBe(true);
  });

  it('should handle symlinks correctly', async () => {
    // Create file and symlink to it
    const realFile = join(sourceDir, 'real.txt');
    await writeFile(realFile, 'Real content');
    const linkPath = join(sourceDir, 'link.txt');

    try {
      await symlink(realFile, linkPath);
    } catch (error) {
      // Skip test on systems that don't support symlinks
      console.warn('Skipping symlink test - symlinks not supported on this system');
      return;
    }

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Extract and verify symlink is included
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    // At minimum, the link should be included (behavior may vary by platform)
    expect(await fileExists(join(extractDir, 'link.txt'))).toBe(true);
  });

  it('should verify extracted files match originals byte-by-byte', async () => {
    // Create files with binary content
    const file1Content = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFD]);
    const file2Content = 'Text content with unicode: 你好世界 🌍';

    await writeFile(join(sourceDir, 'binary.bin'), file1Content);
    await writeFile(join(sourceDir, 'unicode.txt'), file2Content);

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Extract and verify byte-by-byte
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    const extractedBinary = await readFile(join(extractDir, 'binary.bin'));
    const extractedText = await readFile(join(extractDir, 'unicode.txt'), 'utf-8');

    expect(Buffer.compare(extractedBinary, file1Content)).toBe(0);
    expect(extractedText).toBe(file2Content);
  });

  it('should verify extracted files match originals by hash', async () => {
    // Create test files
    const content1 = 'This is a test file with some content for hash verification';
    const content2 = 'Another file with different content';

    await writeFile(join(sourceDir, 'file1.txt'), content1);
    await writeFile(join(sourceDir, 'file2.txt'), content2);

    // Calculate original hashes
    const hash1Original = await fileHash(join(sourceDir, 'file1.txt'));
    const hash2Original = await fileHash(join(sourceDir, 'file2.txt'));

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Extract and verify hashes match
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    const hash1Extracted = await fileHash(join(extractDir, 'file1.txt'));
    const hash2Extracted = await fileHash(join(extractDir, 'file2.txt'));

    expect(hash1Extracted).toBe(hash1Original);
    expect(hash2Extracted).toBe(hash2Original);
  });
});

describe('Archiver - zip format', () => {
  let testDir: string;
  let sourceDir: string;
  let outputDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `archiver-test-zip-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    sourceDir = join(testDir, `source-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    outputDir = join(testDir, `output-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await mkdir(sourceDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });
  });

  it('should create valid zip archive from directory', async () => {
    // Create test files
    await writeFile(join(sourceDir, 'file1.txt'), 'Hello World');
    await writeFile(join(sourceDir, 'file2.txt'), 'Test Content');

    const outputPath = join(outputDir, 'test.zip');

    await createArchive({
      format: 'zip',
      sourceDir,
      outputPath,
    });

    // Verify archive was created
    const archiveStat = await stat(outputPath);
    expect(archiveStat.isFile()).toBe(true);
    expect(archiveStat.size).toBeGreaterThan(0);
  });

  it('should archive contains all expected files', async () => {
    // Create multiple test files
    await writeFile(join(sourceDir, 'file1.txt'), 'Content 1');
    await writeFile(join(sourceDir, 'file2.txt'), 'Content 2');
    await mkdir(join(sourceDir, 'subdir'), { recursive: true });
    await writeFile(join(sourceDir, 'subdir', 'file3.txt'), 'Content 3');

    const outputPath = join(outputDir, 'test.zip');

    await createArchive({
      format: 'zip',
      sourceDir,
      outputPath,
    });

    // Extract and verify contents
    const extractDir = join(outputDir, 'extracted');
    await extractZip(outputPath, extractDir);

    // Verify all files exist
    expect(await fileExists(join(extractDir, 'file1.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'file2.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'subdir', 'file3.txt'))).toBe(true);

    // Verify contents match
    expect(await readFile(join(extractDir, 'file1.txt'), 'utf-8')).toBe('Content 1');
    expect(await readFile(join(extractDir, 'file2.txt'), 'utf-8')).toBe('Content 2');
    expect(await readFile(join(extractDir, 'subdir', 'file3.txt'), 'utf-8')).toBe('Content 3');
  });

  it('should verify extracted files match originals by hash', async () => {
    // Create test files
    const content1 = 'ZIP test file with content for hash verification';
    const content2 = 'Another ZIP file with different content';

    await writeFile(join(sourceDir, 'file1.txt'), content1);
    await writeFile(join(sourceDir, 'file2.txt'), content2);

    // Calculate original hashes
    const hash1Original = await fileHash(join(sourceDir, 'file1.txt'));
    const hash2Original = await fileHash(join(sourceDir, 'file2.txt'));

    const outputPath = join(outputDir, 'test.zip');

    await createArchive({
      format: 'zip',
      sourceDir,
      outputPath,
    });

    // Extract and verify hashes match
    const extractDir = join(outputDir, 'extracted');
    await extractZip(outputPath, extractDir);

    const hash1Extracted = await fileHash(join(extractDir, 'file1.txt'));
    const hash2Extracted = await fileHash(join(extractDir, 'file2.txt'));

    expect(hash1Extracted).toBe(hash1Original);
    expect(hash2Extracted).toBe(hash2Original);
  });

  it('should handle nested directory structures', async () => {
    // Create deeply nested structure
    const deepDir = join(sourceDir, 'level1', 'level2', 'level3');
    await mkdir(deepDir, { recursive: true });
    await writeFile(join(deepDir, 'deep.txt'), 'Deep content');
    await writeFile(join(sourceDir, 'root.txt'), 'Root content');

    const outputPath = join(outputDir, 'test.zip');

    await createArchive({
      format: 'zip',
      sourceDir,
      outputPath,
    });

    // Extract and verify
    const extractDir = join(outputDir, 'extracted');
    await extractZip(outputPath, extractDir);

    expect(await fileExists(join(extractDir, 'root.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'level1', 'level2', 'level3', 'deep.txt'))).toBe(true);
    expect(await readFile(join(extractDir, 'level1', 'level2', 'level3', 'deep.txt'), 'utf-8')).toBe('Deep content');
  });

  it('should handle empty directories', async () => {
    // Create empty directory
    await mkdir(join(sourceDir, 'empty-dir'), { recursive: true });
    await writeFile(join(sourceDir, 'file.txt'), 'Content');

    const outputPath = join(outputDir, 'test.zip');

    await createArchive({
      format: 'zip',
      sourceDir,
      outputPath,
    });

    // Extract and verify empty directory exists
    const extractDir = join(outputDir, 'extracted');
    await extractZip(outputPath, extractDir);

    const emptyDirPath = join(extractDir, 'empty-dir');
    const stats = await stat(emptyDirPath);
    expect(stats.isDirectory()).toBe(true);
  });
});

describe('Archiver - Selective inclusion', () => {
  let testDir: string;
  let sourceDir: string;
  let outputDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `archiver-test-include-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    sourceDir = join(testDir, `source-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    outputDir = join(testDir, `output-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await mkdir(sourceDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });
  });

  it('should only include specified files when include parameter is provided', async () => {
    // Create multiple files
    await writeFile(join(sourceDir, 'included1.txt'), 'Included 1');
    await writeFile(join(sourceDir, 'included2.txt'), 'Included 2');
    await writeFile(join(sourceDir, 'excluded1.txt'), 'Excluded 1');
    await writeFile(join(sourceDir, 'excluded2.txt'), 'Excluded 2');

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
      include: ['included1.txt', 'included2.txt'],
    });

    // Extract and verify only included files are present
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    expect(await fileExists(join(extractDir, 'included1.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'included2.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'excluded1.txt'))).toBe(false);
    expect(await fileExists(join(extractDir, 'excluded2.txt'))).toBe(false);
  });

  it('should handle directory inclusion (includes all files in directory)', async () => {
    // Create directory structure
    await mkdir(join(sourceDir, 'included-dir'), { recursive: true });
    await writeFile(join(sourceDir, 'included-dir', 'file1.txt'), 'File 1');
    await writeFile(join(sourceDir, 'included-dir', 'file2.txt'), 'File 2');
    await mkdir(join(sourceDir, 'excluded-dir'), { recursive: true });
    await writeFile(join(sourceDir, 'excluded-dir', 'file3.txt'), 'File 3');

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
      include: ['included-dir'],
    });

    // Extract and verify
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    expect(await fileExists(join(extractDir, 'included-dir', 'file1.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'included-dir', 'file2.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'excluded-dir', 'file3.txt'))).toBe(false);
  });

  it('should throw error when included file does not exist', async () => {
    await writeFile(join(sourceDir, 'exists.txt'), 'Content');

    const outputPath = join(outputDir, 'test.tar.gz');

    await expect(
      createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath,
        include: ['exists.txt', 'does-not-exist.txt'],
      })
    ).rejects.toThrow('Include path does not exist: does-not-exist.txt');
  });

  it('should work with zip format and selective inclusion', async () => {
    // Create files
    await writeFile(join(sourceDir, 'included.txt'), 'Included');
    await writeFile(join(sourceDir, 'excluded.txt'), 'Excluded');

    const outputPath = join(outputDir, 'test.zip');

    await createArchive({
      format: 'zip',
      sourceDir,
      outputPath,
      include: ['included.txt'],
    });

    // Extract and verify
    const extractDir = join(outputDir, 'extracted');
    await extractZip(outputPath, extractDir);

    expect(await fileExists(join(extractDir, 'included.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'excluded.txt'))).toBe(false);
  });

  it('should handle nested path inclusion', async () => {
    // Create nested structure
    await mkdir(join(sourceDir, 'dir1', 'dir2'), { recursive: true });
    await writeFile(join(sourceDir, 'dir1', 'dir2', 'file.txt'), 'Nested content');
    await writeFile(join(sourceDir, 'root.txt'), 'Root content');

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
      include: ['dir1/dir2/file.txt'],
    });

    // Extract and verify
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    expect(await fileExists(join(extractDir, 'dir1', 'dir2', 'file.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'root.txt'))).toBe(false);
  });
});

describe('Archiver - Error handling', () => {
  let testDir: string;
  let outputDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `archiver-test-errors-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    outputDir = join(testDir, `output-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await mkdir(outputDir, { recursive: true });
  });

  it('should throw error when sourceDir does not exist', async () => {
    const nonExistentDir = join(testDir, 'does-not-exist');
    const outputPath = join(outputDir, 'test.tar.gz');

    await expect(
      createArchive({
        format: 'tar.gz',
        sourceDir: nonExistentDir,
        outputPath,
      })
    ).rejects.toThrow('Source directory does not exist');
  });

  it('should throw error when sourceDir is a file, not a directory', async () => {
    const filePath = join(testDir, 'not-a-directory.txt');
    await writeFile(filePath, 'Content');

    const outputPath = join(outputDir, 'test.tar.gz');

    await expect(
      createArchive({
        format: 'tar.gz',
        sourceDir: filePath,
        outputPath,
      })
    ).rejects.toThrow('Source path is not a directory');
  });

  it('should throw error when output directory does not exist', async () => {
    const sourceDir = join(testDir, `source-${Date.now()}`);
    await mkdir(sourceDir, { recursive: true });
    await writeFile(join(sourceDir, 'file.txt'), 'Content');

    const nonExistentOutputDir = join(testDir, 'non-existent-output-dir');
    const outputPath = join(nonExistentOutputDir, 'test.tar.gz');

    await expect(
      createArchive({
        format: 'tar.gz',
        sourceDir,
        outputPath,
      })
    ).rejects.toThrow('Output directory does not exist');
  });

  it('should throw error for invalid archive format', async () => {
    const sourceDir = join(testDir, `source-${Date.now()}`);
    await mkdir(sourceDir, { recursive: true });
    await writeFile(join(sourceDir, 'file.txt'), 'Content');

    const outputPath = join(outputDir, 'test.rar');

    await expect(
      createArchive({
        format: 'rar' as any, // Invalid format
        sourceDir,
        outputPath,
      })
    ).rejects.toThrow('Invalid archive format');
  });

  it('should handle permission errors gracefully', async () => {
    const sourceDir = join(testDir, `source-${Date.now()}`);
    await mkdir(sourceDir, { recursive: true });

    // Create a file
    const unreadableFile = join(sourceDir, 'unreadable.txt');
    await writeFile(unreadableFile, 'Content');

    // Try to make file unreadable (may not work on all platforms)
    try {
      await chmod(unreadableFile, 0o000);

      const outputPath = join(outputDir, 'test.tar.gz');

      // Should either succeed (if platform doesn't enforce permissions)
      // or fail with a readable error
      try {
        await createArchive({
          format: 'tar.gz',
          sourceDir,
          outputPath,
        });
        // If it succeeded, restore permissions and pass
        await chmod(unreadableFile, 0o644);
      } catch (error) {
        // Restore permissions
        await chmod(unreadableFile, 0o644);
        // Verify error is about reading the file
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/Failed to read file|permission denied|EACCES/i);
      }
    } catch (error) {
      // If chmod fails, skip test (likely Windows or restricted environment)
      console.warn('Skipping permission test - unable to modify file permissions');
    }
  });
});

describe('Archiver - Edge cases', () => {
  let testDir: string;
  let sourceDir: string;
  let outputDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `archiver-test-edge-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    sourceDir = join(testDir, `source-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    outputDir = join(testDir, `output-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await mkdir(sourceDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });
  });

  it('should handle completely empty directory', async () => {
    // sourceDir is already empty from beforeEach

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Archive should be created (though minimal)
    const archiveStat = await stat(outputPath);
    expect(archiveStat.isFile()).toBe(true);
    expect(archiveStat.size).toBeGreaterThan(0);
  });

  it('should handle very large number of files', async () => {
    // Create 100 small files
    for (let i = 0; i < 100; i++) {
      await writeFile(join(sourceDir, `file${i}.txt`), `Content ${i}`);
    }

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Extract and verify count
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    const extractedFiles = await readdir(extractDir);
    expect(extractedFiles.length).toBe(100);
  });

  it('should handle files with unicode characters in names', async () => {
    // Create files with unicode names
    await writeFile(join(sourceDir, '文件.txt'), 'Chinese');
    await writeFile(join(sourceDir, 'файл.txt'), 'Russian');
    await writeFile(join(sourceDir, 'αρχείο.txt'), 'Greek');
    await writeFile(join(sourceDir, 'ファイル.txt'), 'Japanese');

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Extract and verify
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    expect(await fileExists(join(extractDir, '文件.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'файл.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'αρχείο.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'ファイル.txt'))).toBe(true);
  });

  it('should handle large binary files correctly', async () => {
    // Create a 1MB binary file
    const largeBuffer = Buffer.alloc(1024 * 1024);
    for (let i = 0; i < largeBuffer.length; i++) {
      largeBuffer[i] = i % 256;
    }

    await writeFile(join(sourceDir, 'large.bin'), largeBuffer);

    const originalHash = await fileHash(join(sourceDir, 'large.bin'));

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Extract and verify hash matches
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    const extractedHash = await fileHash(join(extractDir, 'large.bin'));
    expect(extractedHash).toBe(originalHash);
  });

  it('should handle directory names with special characters', async () => {
    // Create directories with special characters
    await mkdir(join(sourceDir, 'dir-with-dashes'), { recursive: true });
    await mkdir(join(sourceDir, 'dir_with_underscores'), { recursive: true });
    await mkdir(join(sourceDir, 'dir.with.dots'), { recursive: true });

    await writeFile(join(sourceDir, 'dir-with-dashes', 'file.txt'), 'Content 1');
    await writeFile(join(sourceDir, 'dir_with_underscores', 'file.txt'), 'Content 2');
    await writeFile(join(sourceDir, 'dir.with.dots', 'file.txt'), 'Content 3');

    const outputPath = join(outputDir, 'test.zip');

    await createArchive({
      format: 'zip',
      sourceDir,
      outputPath,
    });

    // Extract and verify
    const extractDir = join(outputDir, 'extracted');
    await extractZip(outputPath, extractDir);

    expect(await fileExists(join(extractDir, 'dir-with-dashes', 'file.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'dir_with_underscores', 'file.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'dir.with.dots', 'file.txt'))).toBe(true);
  });

  it('should handle zero-byte files', async () => {
    // Create empty files
    await writeFile(join(sourceDir, 'empty1.txt'), '');
    await writeFile(join(sourceDir, 'empty2.txt'), '');
    await writeFile(join(sourceDir, 'non-empty.txt'), 'Content');

    const outputPath = join(outputDir, 'test.tar.gz');

    await createArchive({
      format: 'tar.gz',
      sourceDir,
      outputPath,
    });

    // Extract and verify
    const extractDir = join(outputDir, 'extracted');
    await extractTarGz(outputPath, extractDir);

    expect(await fileExists(join(extractDir, 'empty1.txt'))).toBe(true);
    expect(await fileExists(join(extractDir, 'empty2.txt'))).toBe(true);

    const stats1 = await stat(join(extractDir, 'empty1.txt'));
    const stats2 = await stat(join(extractDir, 'empty2.txt'));

    expect(stats1.size).toBe(0);
    expect(stats2.size).toBe(0);
  });
});

// Helper functions

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Calculate SHA256 hash of a file
 */
async function fileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Extract a tar.gz archive
 */
async function extractTarGz(archivePath: string, targetDir: string): Promise<void> {
  const tar = await import('tar-stream');
  const { createReadStream } = await import('node:fs');
  const { createGunzip } = await import('node:zlib');
  const { pipeline } = await import('node:stream/promises');

  await mkdir(targetDir, { recursive: true });

  const extract = tar.extract();

  return new Promise((resolve, reject) => {
    extract.on('entry', async (header, stream, next) => {
      const targetPath = join(targetDir, header.name);

      if (header.type === 'directory') {
        await mkdir(targetPath, { recursive: true });
        stream.resume();
        next();
      } else if (header.type === 'file') {
        await mkdir(join(targetPath, '..'), { recursive: true });
        const writeStream = (await import('node:fs')).createWriteStream(targetPath, {
          mode: header.mode,
        });
        stream.pipe(writeStream);
        writeStream.on('finish', next);
        writeStream.on('error', reject);
      } else {
        // Symlink or other - just consume the stream
        stream.resume();
        next();
      }
    });

    extract.on('finish', () => resolve());
    extract.on('error', reject);

    const gunzip = createGunzip();
    const input = createReadStream(archivePath);

    input.pipe(gunzip).pipe(extract);
  });
}

/**
 * Extract a zip archive
 */
async function extractZip(archivePath: string, targetDir: string): Promise<void> {
  const unzipper = await import('unzipper');
  const { createReadStream } = await import('node:fs');

  await mkdir(targetDir, { recursive: true });

  return new Promise((resolve, reject) => {
    createReadStream(archivePath)
      .pipe(unzipper.Extract({ path: targetDir }))
      .on('close', resolve)
      .on('error', reject);
  });
}
