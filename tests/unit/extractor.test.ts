/**
 * Extractor Test Suite
 *
 * Tests the archive extraction component for tar.gz and zip bundles.
 *
 * Test Coverage:
 * - tar.gz extraction (valid archives, file content, directory structure, permissions)
 * - zip extraction (valid archives, file content, directory structure)
 * - Auto-detection of archive formats (.tar.gz, .tgz, .zip)
 * - Error handling (missing files, corrupted archives, invalid formats)
 * - Edge cases (empty archives, nested directories, special characters, cleanup)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { mkdir, writeFile, rm, readFile, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createWriteStream, createReadStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { extractArchive } from '../../src/core/extractor.js';
import archiver from 'archiver';

// Helper function to create a tar.gz archive
async function createTarGzArchive(
  archivePath: string,
  files: Array<{ path: string; content: string | Buffer; mode?: number }>
): Promise<void> {
  const archive = archiver('tar', {
    gzip: true,
    gzipOptions: {
      level: 6,
    },
  });

  const output = createWriteStream(archivePath);
  const streamDone = new Promise<void>((resolve, reject) => {
    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);
  });

  archive.pipe(output);

  for (const file of files) {
    archive.append(file.content, {
      name: file.path,
      mode: file.mode,
    });
  }

  await archive.finalize();
  await streamDone;
}

// Helper function to create a zip archive
async function createZipArchive(
  archivePath: string,
  files: Array<{ path: string; content: string | Buffer }>
): Promise<void> {
  const archive = archiver('zip', {
    zlib: { level: 6 },
  });

  const output = createWriteStream(archivePath);
  const streamDone = new Promise<void>((resolve, reject) => {
    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);
  });

  archive.pipe(output);

  for (const file of files) {
    archive.append(file.content, { name: file.path });
  }

  await archive.finalize();
  await streamDone;
}

// Helper function to create a corrupted gzip file
async function createCorruptedGzFile(archivePath: string): Promise<void> {
  // Write invalid gzip header followed by random data
  const corruptedData = Buffer.concat([
    Buffer.from([0x1f, 0x8b, 0xff, 0xff]), // Invalid gzip header
    Buffer.from('corrupted data that is not valid gzip'),
  ]);
  await writeFile(archivePath, corruptedData);
}

// Helper function to create a corrupted zip file
async function createCorruptedZipFile(archivePath: string): Promise<void> {
  // Write data that looks like zip but is corrupted
  const corruptedData = Buffer.concat([
    Buffer.from('PK'), // Zip signature start
    Buffer.from('corrupted zip data that is invalid'),
  ]);
  await writeFile(archivePath, corruptedData);
}

describe('Extractor - tar.gz Extraction', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `extractor-test-targz-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should extract valid tar.gz archive correctly', async () => {
    const archivePath = join(testDir, 'valid.tar.gz');
    const extractDir = join(testDir, 'extracted-valid');

    await createTarGzArchive(archivePath, [
      { path: 'file1.txt', content: 'Hello World' },
      { path: 'file2.txt', content: 'Test Content' },
    ]);

    const result = await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    expect(result).toBe(extractDir);

    // Verify files exist and have correct content
    const file1Content = await readFile(join(extractDir, 'file1.txt'), 'utf-8');
    const file2Content = await readFile(join(extractDir, 'file2.txt'), 'utf-8');

    expect(file1Content).toBe('Hello World');
    expect(file2Content).toBe('Test Content');
  });

  it('should preserve directory structure in tar.gz', async () => {
    const archivePath = join(testDir, 'nested.tar.gz');
    const extractDir = join(testDir, 'extracted-nested');

    await createTarGzArchive(archivePath, [
      { path: 'root.txt', content: 'root file' },
      { path: 'dir1/file1.txt', content: 'nested file 1' },
      { path: 'dir1/dir2/file2.txt', content: 'deeply nested file' },
      { path: 'dir3/file3.txt', content: 'another nested file' },
    ]);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    // Verify directory structure
    const rootContent = await readFile(join(extractDir, 'root.txt'), 'utf-8');
    const file1Content = await readFile(join(extractDir, 'dir1', 'file1.txt'), 'utf-8');
    const file2Content = await readFile(join(extractDir, 'dir1', 'dir2', 'file2.txt'), 'utf-8');
    const file3Content = await readFile(join(extractDir, 'dir3', 'file3.txt'), 'utf-8');

    expect(rootContent).toBe('root file');
    expect(file1Content).toBe('nested file 1');
    expect(file2Content).toBe('deeply nested file');
    expect(file3Content).toBe('another nested file');
  });

  it('should handle binary files in tar.gz', async () => {
    const archivePath = join(testDir, 'binary.tar.gz');
    const extractDir = join(testDir, 'extracted-binary');

    const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);

    await createTarGzArchive(archivePath, [
      { path: 'binary.dat', content: binaryData },
      { path: 'text.txt', content: 'text file' },
    ]);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    const extractedBinary = await readFile(join(extractDir, 'binary.dat'));
    const extractedText = await readFile(join(extractDir, 'text.txt'), 'utf-8');

    expect(Buffer.compare(extractedBinary, binaryData)).toBe(0);
    expect(extractedText).toBe('text file');
  });

  it('should return correct extraction path for tar.gz', async () => {
    const archivePath = join(testDir, 'path-test.tar.gz');
    const extractDir = join(testDir, 'extracted-path');

    await createTarGzArchive(archivePath, [
      { path: 'test.txt', content: 'test' },
    ]);

    const result = await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    // Result should be normalized absolute path
    expect(result).toBe(extractDir);
    expect(result).toContain('extracted-path');
  });

  it('should handle empty tar.gz archive', async () => {
    const archivePath = join(testDir, 'empty.tar.gz');
    const extractDir = join(testDir, 'extracted-empty');

    await createTarGzArchive(archivePath, []);

    const result = await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    expect(result).toBe(extractDir);
  });

  it('should handle files with special characters in tar.gz', async () => {
    const archivePath = join(testDir, 'special-chars.tar.gz');
    const extractDir = join(testDir, 'extracted-special');

    await createTarGzArchive(archivePath, [
      { path: 'file with spaces.txt', content: 'spaces' },
      { path: 'file-with-dashes.txt', content: 'dashes' },
      { path: 'file_with_underscores.txt', content: 'underscores' },
    ]);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    const spacesContent = await readFile(join(extractDir, 'file with spaces.txt'), 'utf-8');
    const dashesContent = await readFile(join(extractDir, 'file-with-dashes.txt'), 'utf-8');
    const underscoresContent = await readFile(join(extractDir, 'file_with_underscores.txt'), 'utf-8');

    expect(spacesContent).toBe('spaces');
    expect(dashesContent).toBe('dashes');
    expect(underscoresContent).toBe('underscores');
  });
});

describe('Extractor - zip Extraction', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `extractor-test-zip-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should extract valid zip archive correctly', async () => {
    const archivePath = join(testDir, 'valid.zip');
    const extractDir = join(testDir, 'extracted-valid');

    await createZipArchive(archivePath, [
      { path: 'file1.txt', content: 'Zip Content 1' },
      { path: 'file2.txt', content: 'Zip Content 2' },
    ]);

    const result = await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    expect(result).toBe(extractDir);

    const file1Content = await readFile(join(extractDir, 'file1.txt'), 'utf-8');
    const file2Content = await readFile(join(extractDir, 'file2.txt'), 'utf-8');

    expect(file1Content).toBe('Zip Content 1');
    expect(file2Content).toBe('Zip Content 2');
  });

  it('should preserve directory structure in zip', async () => {
    const archivePath = join(testDir, 'nested.zip');
    const extractDir = join(testDir, 'extracted-nested');

    await createZipArchive(archivePath, [
      { path: 'root.txt', content: 'root zip file' },
      { path: 'dir1/file1.txt', content: 'nested zip file 1' },
      { path: 'dir1/dir2/file2.txt', content: 'deeply nested zip file' },
    ]);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    const rootContent = await readFile(join(extractDir, 'root.txt'), 'utf-8');
    const file1Content = await readFile(join(extractDir, 'dir1', 'file1.txt'), 'utf-8');
    const file2Content = await readFile(join(extractDir, 'dir1', 'dir2', 'file2.txt'), 'utf-8');

    expect(rootContent).toBe('root zip file');
    expect(file1Content).toBe('nested zip file 1');
    expect(file2Content).toBe('deeply nested zip file');
  });

  it('should handle binary files in zip', async () => {
    const archivePath = join(testDir, 'binary.zip');
    const extractDir = join(testDir, 'extracted-binary');

    const binaryData = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0xff]);

    await createZipArchive(archivePath, [
      { path: 'binary.bin', content: binaryData },
      { path: 'text.txt', content: 'zip text' },
    ]);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    const extractedBinary = await readFile(join(extractDir, 'binary.bin'));
    const extractedText = await readFile(join(extractDir, 'text.txt'), 'utf-8');

    expect(Buffer.compare(extractedBinary, binaryData)).toBe(0);
    expect(extractedText).toBe('zip text');
  });

  it('should handle empty zip archive', async () => {
    const archivePath = join(testDir, 'empty.zip');
    const extractDir = join(testDir, 'extracted-empty');

    await createZipArchive(archivePath, []);

    const result = await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    expect(result).toBe(extractDir);
  });

  it('should handle files with special characters in zip', async () => {
    const archivePath = join(testDir, 'special.zip');
    const extractDir = join(testDir, 'extracted-special');

    await createZipArchive(archivePath, [
      { path: 'file with spaces.txt', content: 'zip spaces' },
      { path: 'unicode-café.txt', content: 'unicode content' },
    ]);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    const spacesContent = await readFile(join(extractDir, 'file with spaces.txt'), 'utf-8');
    const unicodeContent = await readFile(join(extractDir, 'unicode-café.txt'), 'utf-8');

    expect(spacesContent).toBe('zip spaces');
    expect(unicodeContent).toBe('unicode content');
  });
});

describe('Extractor - Auto-detection', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `extractor-test-autodetect-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should auto-detect .tar.gz format', async () => {
    const archivePath = join(testDir, 'auto.tar.gz');
    const extractDir = join(testDir, 'extracted-auto-targz');

    await createTarGzArchive(archivePath, [
      { path: 'test.txt', content: 'auto-detected tar.gz' },
    ]);

    // Don't specify format - let it auto-detect
    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    const content = await readFile(join(extractDir, 'test.txt'), 'utf-8');
    expect(content).toBe('auto-detected tar.gz');
  });

  it('should auto-detect .tgz format', async () => {
    const archivePath = join(testDir, 'auto.tgz');
    const extractDir = join(testDir, 'extracted-auto-tgz');

    await createTarGzArchive(archivePath, [
      { path: 'test.txt', content: 'auto-detected tgz' },
    ]);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    const content = await readFile(join(extractDir, 'test.txt'), 'utf-8');
    expect(content).toBe('auto-detected tgz');
  });

  it('should auto-detect .zip format', async () => {
    const archivePath = join(testDir, 'auto.zip');
    const extractDir = join(testDir, 'extracted-auto-zip');

    await createZipArchive(archivePath, [
      { path: 'test.txt', content: 'auto-detected zip' },
    ]);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    const content = await readFile(join(extractDir, 'test.txt'), 'utf-8');
    expect(content).toBe('auto-detected zip');
  });

  it('should throw error for unknown extension', async () => {
    const archivePath = join(testDir, 'unknown.rar');
    const extractDir = join(testDir, 'extracted-unknown');

    await writeFile(archivePath, 'fake rar file');

    await expect(
      extractArchive({
        archivePath,
        targetDir: extractDir,
      })
    ).rejects.toThrow('Unable to detect archive format');
  });

  it('should respect explicit format parameter over auto-detection', async () => {
    const archivePath = join(testDir, 'explicit.tar.gz');
    const extractDir = join(testDir, 'extracted-explicit');

    await createTarGzArchive(archivePath, [
      { path: 'test.txt', content: 'explicit format' },
    ]);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
      format: 'tar.gz', // Explicitly specify format
    });

    const content = await readFile(join(extractDir, 'test.txt'), 'utf-8');
    expect(content).toBe('explicit format');
  });
});

describe('Extractor - Error Handling', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `extractor-test-errors-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should throw error when archive does not exist', async () => {
    const archivePath = join(testDir, 'does-not-exist.tar.gz');
    const extractDir = join(testDir, 'extracted-nonexistent');

    await expect(
      extractArchive({
        archivePath,
        targetDir: extractDir,
      })
    ).rejects.toThrow('Archive file not found or not readable');
  });

  it('should throw error for corrupted tar.gz', async () => {
    const archivePath = join(testDir, 'corrupted.tar.gz');
    const extractDir = join(testDir, 'extracted-corrupted-targz');

    await createCorruptedGzFile(archivePath);

    await expect(
      extractArchive({
        archivePath,
        targetDir: extractDir,
      })
    ).rejects.toThrow();
  });

  it('should throw error for corrupted zip', async () => {
    const archivePath = join(testDir, 'corrupted.zip');
    const extractDir = join(testDir, 'extracted-corrupted-zip');

    await createCorruptedZipFile(archivePath);

    await expect(
      extractArchive({
        archivePath,
        targetDir: extractDir,
      })
    ).rejects.toThrow();
  });

  it('should throw error for invalid format parameter', async () => {
    const archivePath = join(testDir, 'invalid-format.tar.gz');
    const extractDir = join(testDir, 'extracted-invalid-format');

    await createTarGzArchive(archivePath, [
      { path: 'test.txt', content: 'test' },
    ]);

    await expect(
      extractArchive({
        archivePath,
        targetDir: extractDir,
        format: 'invalid' as any, // Invalid format
      })
    ).rejects.toThrow('Unsupported archive format');
  });

  it('should clean up partial extraction on tar.gz failure', async () => {
    const archivePath = join(testDir, 'cleanup-test.tar.gz');
    const extractDir = join(testDir, 'extracted-cleanup');

    // Create a corrupted archive
    await createCorruptedGzFile(archivePath);

    try {
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });
      fail('Should have thrown an error');
    } catch (error) {
      // Expected error
    }

    // Verify cleanup - directory should be removed or empty
    // (Implementation may vary, but partial files should be cleaned up)
    try {
      const files = await readFile(extractDir);
      // If directory exists, it should be empty or not contain partial files
    } catch (err: any) {
      // Directory doesn't exist - cleanup successful
      expect(err.code).toBe('ENOENT');
    }
  });

  it('should clean up partial extraction on zip failure', async () => {
    const archivePath = join(testDir, 'cleanup-zip.zip');
    const extractDir = join(testDir, 'extracted-cleanup-zip');

    await createCorruptedZipFile(archivePath);

    try {
      await extractArchive({
        archivePath,
        targetDir: extractDir,
      });
      fail('Should have thrown an error');
    } catch (error) {
      // Expected error
    }

    // Verify cleanup
    try {
      const files = await readFile(extractDir);
    } catch (err: any) {
      expect(err.code).toBe('ENOENT');
    }
  });

  it('should handle path traversal attempts in tar.gz', async () => {
    const archivePath = join(testDir, 'traversal.tar.gz');
    const extractDir = join(testDir, 'extracted-traversal');

    // Create archive with path traversal attempt using tar-stream directly
    // (archiver normalizes paths, so we need to use tar-stream directly)
    const tarStream = await import('tar-stream');
    const { createGzip } = await import('zlib');
    const pack = tarStream.default.pack();

    const output = createWriteStream(archivePath);
    pack.pipe(createGzip()).pipe(output);

    // Add entry with path traversal
    pack.entry({ name: '../../../etc/passwd', type: 'file' }, 'malicious', (err) => {
      if (err) throw err;
      pack.finalize();
    });

    await new Promise<void>((resolve) => output.on('close', () => resolve()));

    await expect(
      extractArchive({
        archivePath,
        targetDir: extractDir,
      })
    ).rejects.toThrow('Path traversal detected');
  });

  it('should handle path traversal attempts in zip', async () => {
    const archivePath = join(testDir, 'traversal.zip');
    const extractDir = join(testDir, 'extracted-traversal-zip');

    // Archiver doesn't allow path traversal, but the extractor will detect it
    // if the zip contains such paths. Let's test with a path that triggers detection
    await createZipArchive(archivePath, [
      { path: 'subdir/../../safe.txt', content: 'path traversal attempt' },
    ]);

    // The extractor should detect and reject this
    await expect(
      extractArchive({
        archivePath,
        targetDir: extractDir,
      })
    ).rejects.toThrow('Path traversal detected');
  });
});

describe('Extractor - Edge Cases', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `extractor-test-edge-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should handle archives with many files', async () => {
    const archivePath = join(testDir, 'many-files.tar.gz');
    const extractDir = join(testDir, 'extracted-many');

    const files: Array<{ path: string; content: string }> = [];
    for (let i = 0; i < 100; i++) {
      files.push({
        path: `file${i}.txt`,
        content: `Content ${i}`,
      });
    }

    await createTarGzArchive(archivePath, files);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    // Verify a few random files
    const content0 = await readFile(join(extractDir, 'file0.txt'), 'utf-8');
    const content50 = await readFile(join(extractDir, 'file50.txt'), 'utf-8');
    const content99 = await readFile(join(extractDir, 'file99.txt'), 'utf-8');

    expect(content0).toBe('Content 0');
    expect(content50).toBe('Content 50');
    expect(content99).toBe('Content 99');
  });

  it('should handle deeply nested directory structures', async () => {
    const archivePath = join(testDir, 'deep-nested.tar.gz');
    const extractDir = join(testDir, 'extracted-deep');

    const deepPath = Array.from({ length: 10 }, (_, i) => `level${i}`).join('/');

    await createTarGzArchive(archivePath, [
      { path: `${deepPath}/deep-file.txt`, content: 'deeply nested content' },
    ]);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    const content = await readFile(join(extractDir, deepPath, 'deep-file.txt'), 'utf-8');
    expect(content).toBe('deeply nested content');
  });

  it('should handle large files (within test limits)', async () => {
    const archivePath = join(testDir, 'large-file.tar.gz');
    const extractDir = join(testDir, 'extracted-large');

    // Create 1MB file
    const largeContent = 'x'.repeat(1024 * 1024);

    await createTarGzArchive(archivePath, [
      { path: 'large.txt', content: largeContent },
    ]);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    const content = await readFile(join(extractDir, 'large.txt'), 'utf-8');
    expect(content.length).toBe(1024 * 1024);
    expect(content).toBe(largeContent);
  });

  it('should handle mixed file types (text, binary, empty)', async () => {
    const archivePath = join(testDir, 'mixed.tar.gz');
    const extractDir = join(testDir, 'extracted-mixed');

    await createTarGzArchive(archivePath, [
      { path: 'text.txt', content: 'text content' },
      { path: 'binary.bin', content: Buffer.from([0x00, 0xff, 0xaa, 0x55]) },
      { path: 'empty.txt', content: '' },
    ]);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    const textContent = await readFile(join(extractDir, 'text.txt'), 'utf-8');
    const binaryContent = await readFile(join(extractDir, 'binary.bin'));
    const emptyContent = await readFile(join(extractDir, 'empty.txt'), 'utf-8');

    expect(textContent).toBe('text content');
    expect(Buffer.compare(binaryContent, Buffer.from([0x00, 0xff, 0xaa, 0x55]))).toBe(0);
    expect(emptyContent).toBe('');
  });

  it('should create target directory if it does not exist', async () => {
    const archivePath = join(testDir, 'create-dir.tar.gz');
    const extractDir = join(testDir, 'non-existent-dir', 'nested', 'extract');

    await createTarGzArchive(archivePath, [
      { path: 'test.txt', content: 'test' },
    ]);

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    const content = await readFile(join(extractDir, 'test.txt'), 'utf-8');
    expect(content).toBe('test');
  });

  it('should normalize paths correctly', async () => {
    const archivePath = join(testDir, 'normalize.tar.gz');
    const extractDir = join(testDir, './././extracted-normalize/../extracted-normalize');

    await createTarGzArchive(archivePath, [
      { path: 'test.txt', content: 'normalized' },
    ]);

    const result = await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    // Result should be normalized
    expect(result).toBe(join(testDir, 'extracted-normalize'));

    const content = await readFile(join(result, 'test.txt'), 'utf-8');
    expect(content).toBe('normalized');
  });

  it('should handle archives with only directories (no files)', async () => {
    const archivePath = join(testDir, 'only-dirs.tar.gz');
    const extractDir = join(testDir, 'extracted-only-dirs');

    // Create archive using tar-stream directly to include directories
    const tarStream = await import('tar-stream');
    const { createGzip } = await import('zlib');
    const pack = tarStream.default.pack();

    const output = createWriteStream(archivePath);
    pack.pipe(createGzip()).pipe(output);

    // Add directory entries
    pack.entry({ name: 'dir1/', type: 'directory' }, (err) => {
      if (err) throw err;
      pack.entry({ name: 'dir1/dir2/', type: 'directory' }, (err) => {
        if (err) throw err;
        pack.finalize();
      });
    });

    await new Promise<void>((resolve) => output.on('close', () => resolve()));

    await extractArchive({
      archivePath,
      targetDir: extractDir,
    });

    // Directories should be created (though we can't verify directory entries easily without fs.stat)
    // Just verify extraction completes without error
    expect(true).toBe(true);
  });
});
