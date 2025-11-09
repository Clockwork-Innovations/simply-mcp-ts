/**
 * Archive extraction component for simply-mcp bundle distribution.
 *
 * Supports tar.gz and zip archives with lazy-loaded unpacker modules
 * for memory efficiency and streaming extraction.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promises as fsPromises } from 'fs';
import { pipeline } from 'stream/promises';

/**
 * Options for extracting an archive bundle.
 */
export interface ExtractorOptions {
  /** Path to the archive file (.tar.gz, .tgz, or .zip) */
  archivePath: string;

  /** Directory where the archive contents will be extracted */
  targetDir: string;

  /** Archive format (auto-detected from file extension if omitted) */
  format?: 'tar.gz' | 'zip';
}

/**
 * Supported archive formats.
 */
type ArchiveFormat = 'tar.gz' | 'zip';

/**
 * Detects the archive format based on file extension.
 *
 * @param archivePath - Path to the archive file
 * @returns The detected archive format
 * @throws Error if format cannot be detected
 */
function detectArchiveFormat(archivePath: string): ArchiveFormat {
  const ext = path.extname(archivePath).toLowerCase();
  const basename = path.basename(archivePath, ext).toLowerCase();

  // Check for .tar.gz
  if (ext === '.gz' && basename.endsWith('.tar')) {
    return 'tar.gz';
  }

  // Check for .tgz
  if (ext === '.tgz') {
    return 'tar.gz';
  }

  // Check for .zip
  if (ext === '.zip') {
    return 'zip';
  }

  throw new Error(
    `Unable to detect archive format from file extension: ${archivePath}. ` +
    `Supported formats: .tar.gz, .tgz, .zip`
  );
}

/**
 * Validates that the archive file exists and is readable.
 *
 * @param archivePath - Path to the archive file
 * @throws Error if file doesn't exist or isn't readable
 */
async function validateArchiveExists(archivePath: string): Promise<void> {
  try {
    await fsPromises.access(archivePath, fs.constants.R_OK);
  } catch (error) {
    throw new Error(
      `Archive file not found or not readable: ${archivePath}`
    );
  }
}

/**
 * Creates the target directory if it doesn't exist.
 *
 * @param targetDir - Directory to create
 */
async function ensureTargetDirectory(targetDir: string): Promise<void> {
  try {
    await fsPromises.mkdir(targetDir, { recursive: true });
  } catch (error) {
    throw new Error(
      `Failed to create target directory: ${targetDir}. ` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Cleans up a partially extracted directory on failure.
 *
 * @param targetDir - Directory to clean up
 */
async function cleanupPartialExtraction(targetDir: string): Promise<void> {
  try {
    await fsPromises.rm(targetDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors - best effort
    console.warn(`Warning: Failed to cleanup partial extraction at ${targetDir}`);
  }
}

/**
 * Extracts a tar.gz archive using streaming for memory efficiency.
 *
 * @param archivePath - Path to the .tar.gz file
 * @param targetDir - Directory to extract to
 */
async function extractTarGz(archivePath: string, targetDir: string): Promise<void> {
  // Lazy load tar-stream module
  const { default: tarStream } = await import('tar-stream');

  const extract = tarStream.extract();

  return new Promise((resolve, reject) => {
    let hasError = false;

    extract.on('entry', async (header, stream, next) => {
      if (hasError) {
        stream.resume();
        return;
      }

      try {
        const entryPath = path.join(targetDir, header.name);

        // Prevent path traversal attacks
        const normalizedPath = path.normalize(entryPath);
        if (!normalizedPath.startsWith(targetDir)) {
          throw new Error(
            `Path traversal detected in archive: ${header.name}. ` +
            `Archive may be corrupted or malicious.`
          );
        }

        if (header.type === 'directory') {
          await fsPromises.mkdir(entryPath, { recursive: true });
          stream.resume();
          next();
        } else if (header.type === 'file') {
          // Ensure parent directory exists
          const dir = path.dirname(entryPath);
          await fsPromises.mkdir(dir, { recursive: true });

          // Write file using stream
          const writeStream = fs.createWriteStream(entryPath);

          stream.pipe(writeStream);

          writeStream.on('finish', () => {
            next();
          });

          writeStream.on('error', (err) => {
            hasError = true;
            reject(new Error(
              `Failed to write file ${header.name}: ${err.message}. ` +
              `Archive may be corrupted.`
            ));
          });
        } else {
          // Skip other entry types (symlinks, etc.)
          stream.resume();
          next();
        }
      } catch (err) {
        hasError = true;
        reject(err);
      }
    });

    extract.on('finish', () => {
      if (!hasError) {
        resolve();
      }
    });

    extract.on('error', (err) => {
      hasError = true;
      reject(new Error(
        `Failed to extract tar.gz archive: ${err.message}. ` +
        `Archive may be corrupted. Try re-downloading or re-creating the archive.`
      ));
    });

    // Create read stream with gunzip
    const readStream = fs.createReadStream(archivePath);
    const gunzip = zlib.createGunzip();

    readStream.on('error', (err) => {
      hasError = true;
      reject(new Error(
        `Failed to read archive file: ${err.message}`
      ));
    });

    gunzip.on('error', (err) => {
      hasError = true;
      reject(new Error(
        `Failed to decompress archive: ${err.message}. ` +
        `Archive may be corrupted. Try re-downloading or re-creating the archive.`
      ));
    });

    // Pipe: file → gunzip → tar extract
    readStream.pipe(gunzip).pipe(extract);
  });
}

/**
 * Extracts a zip archive using streaming for memory efficiency.
 *
 * @param archivePath - Path to the .zip file
 * @param targetDir - Directory to extract to
 */
async function extractZip(archivePath: string, targetDir: string): Promise<void> {
  // Lazy load unzipper module
  const unzipper = await import('unzipper');

  return new Promise((resolve, reject) => {
    let hasError = false;

    const readStream = fs.createReadStream(archivePath);

    readStream.on('error', (err) => {
      hasError = true;
      reject(new Error(
        `Failed to read archive file: ${err.message}`
      ));
    });

    readStream
      .pipe(unzipper.Parse())
      .on('entry', async (entry: any) => {
        if (hasError) {
          entry.autodrain();
          return;
        }

        try {
          const entryPath = path.join(targetDir, entry.path);

          // Prevent path traversal attacks
          const normalizedPath = path.normalize(entryPath);
          if (!normalizedPath.startsWith(targetDir)) {
            throw new Error(
              `Path traversal detected in archive: ${entry.path}. ` +
              `Archive may be corrupted or malicious.`
            );
          }

          if (entry.type === 'Directory') {
            await fsPromises.mkdir(entryPath, { recursive: true });
            entry.autodrain();
          } else if (entry.type === 'File') {
            // Ensure parent directory exists
            const dir = path.dirname(entryPath);
            await fsPromises.mkdir(dir, { recursive: true });

            // Write file using stream
            const writeStream = fs.createWriteStream(entryPath);

            entry.pipe(writeStream);

            writeStream.on('error', (err) => {
              hasError = true;
              reject(new Error(
                `Failed to write file ${entry.path}: ${err.message}. ` +
                `Archive may be corrupted.`
              ));
            });
          } else {
            // Skip other entry types
            entry.autodrain();
          }
        } catch (err) {
          hasError = true;
          entry.autodrain();
          reject(err);
        }
      })
      .on('finish', () => {
        if (!hasError) {
          resolve();
        }
      })
      .on('error', (err: Error) => {
        hasError = true;
        reject(new Error(
          `Failed to extract zip archive: ${err.message}. ` +
          `Archive may be corrupted. Try re-downloading or re-creating the archive.`
        ));
      });
  });
}

/**
 * Extracts an archive bundle to a target directory.
 *
 * Supports tar.gz (.tar.gz, .tgz) and zip (.zip) formats with auto-detection
 * from file extension. Uses streaming for memory efficiency and lazy-loads
 * unpacker modules only when needed.
 *
 * @param options - Extraction options
 * @returns Path to the extracted directory
 * @throws Error if archive is invalid, corrupted, or extraction fails
 *
 * @example
 * ```typescript
 * // Extract a tar.gz bundle
 * const extractedPath = await extractArchive({
 *   archivePath: '/path/to/bundle.tar.gz',
 *   targetDir: '/tmp/extracted'
 * });
 *
 * // Extract a zip bundle with explicit format
 * const extractedPath = await extractArchive({
 *   archivePath: '/path/to/bundle.zip',
 *   targetDir: '/tmp/extracted',
 *   format: 'zip'
 * });
 * ```
 */
export async function extractArchive(options: ExtractorOptions): Promise<string> {
  const { archivePath, targetDir } = options;

  // Normalize paths
  const normalizedArchivePath = path.resolve(archivePath);
  const normalizedTargetDir = path.resolve(targetDir);

  try {
    // Validate inputs
    await validateArchiveExists(normalizedArchivePath);

    // Detect or use provided format
    const format = options.format ?? detectArchiveFormat(normalizedArchivePath);

    // Ensure target directory exists
    await ensureTargetDirectory(normalizedTargetDir);

    // Extract based on format
    if (format === 'tar.gz') {
      await extractTarGz(normalizedArchivePath, normalizedTargetDir);
    } else if (format === 'zip') {
      await extractZip(normalizedArchivePath, normalizedTargetDir);
    } else {
      throw new Error(
        `Unsupported archive format: ${format}. ` +
        `Supported formats: tar.gz, zip`
      );
    }

    return normalizedTargetDir;

  } catch (error) {
    // Clean up partial extraction on failure
    await cleanupPartialExtraction(normalizedTargetDir);

    // Re-throw with context
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `Failed to extract archive: ${String(error)}`
    );
  }
}
