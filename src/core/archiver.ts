/**
 * Archive creation for bundle distribution
 * Creates tar.gz and zip archives from bundle contents
 */

import { createReadStream, createWriteStream } from 'fs';
import { stat, readdir, access } from 'fs/promises';
import { join, relative, dirname, basename } from 'path';
import { constants } from 'fs';
import { createGzip } from 'zlib';

/**
 * Options for creating an archive
 */
export interface ArchiverOptions {
  /** Archive format: 'tar.gz' or 'zip' */
  format: 'tar.gz' | 'zip';

  /** Directory to archive (must exist) */
  sourceDir: string;

  /** Path where archive will be written */
  outputPath: string;

  /**
   * Optional list of files/directories to include relative to sourceDir.
   * If not provided, all files in sourceDir will be included.
   */
  include?: string[];
}

/**
 * Create an archive from bundle contents
 *
 * @param options - Archive creation options
 * @throws {Error} If sourceDir doesn't exist, outputPath directory doesn't exist, or archive creation fails
 *
 * @example
 * ```typescript
 * // Create a tar.gz archive
 * await createArchive({
 *   format: 'tar.gz',
 *   sourceDir: './dist/my-bundle',
 *   outputPath: './dist/my-bundle.tar.gz'
 * });
 *
 * // Create a zip archive with specific files
 * await createArchive({
 *   format: 'zip',
 *   sourceDir: './dist/my-bundle',
 *   outputPath: './dist/my-bundle.zip',
 *   include: ['bundle.js', 'package.json', 'node_modules']
 * });
 * ```
 */
export async function createArchive(options: ArchiverOptions): Promise<void> {
  // Validate inputs
  await validateOptions(options);

  // Route to appropriate archiver based on format
  if (options.format === 'tar.gz') {
    await createTarGzArchive(options);
  } else {
    await createZipArchive(options);
  }
}

/**
 * Validate archiver options
 */
async function validateOptions(options: ArchiverOptions): Promise<void> {
  // Check if sourceDir exists
  try {
    const sourceStat = await stat(options.sourceDir);
    if (!sourceStat.isDirectory()) {
      throw new Error(`Source path is not a directory: ${options.sourceDir}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Source directory does not exist: ${options.sourceDir}`);
    }
    throw new Error(`Cannot access source directory: ${options.sourceDir} - ${(error as Error).message}`);
  }

  // Check if output directory exists
  const outputDir = dirname(options.outputPath);
  try {
    await access(outputDir, constants.W_OK);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Output directory does not exist: ${outputDir}`);
    }
    throw new Error(`Cannot write to output directory: ${outputDir} - ${(error as Error).message}`);
  }

  // Validate format
  if (options.format !== 'tar.gz' && options.format !== 'zip') {
    throw new Error(`Invalid archive format: ${options.format}. Must be 'tar.gz' or 'zip'`);
  }
}

/**
 * Create a tar.gz archive using tar-stream and zlib
 */
async function createTarGzArchive(options: ArchiverOptions): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // Lazy load tar-stream only when needed
    const tar = await import('tar-stream');
    const pack = tar.pack();
    const gzip = createGzip();
    const output = createWriteStream(options.outputPath);

    // Handle errors
    const cleanup = (error: Error) => {
      pack.destroy();
      gzip.destroy();
      output.destroy();
      reject(error);
    };

    output.on('error', (err) => cleanup(new Error(`Failed to write archive: ${err.message}`)));
    gzip.on('error', (err) => cleanup(new Error(`Compression failed: ${err.message}`)));
    pack.on('error', (err) => cleanup(new Error(`Archive creation failed: ${err.message}`)));

    // Success handler
    output.on('finish', () => resolve());

    // Pipe: pack -> gzip -> output file
    pack.pipe(gzip).pipe(output);

    try {
      // Get list of files to archive
      const files = await getFilesToArchive(options.sourceDir, options.include);

      // Add each file to the archive
      for (const filePath of files) {
        const fullPath = join(options.sourceDir, filePath);
        const stats = await stat(fullPath);

        if (stats.isFile()) {
          await addFileToTar(pack, fullPath, filePath, stats);
        } else if (stats.isDirectory()) {
          // Add directory entry (for empty directories)
          pack.entry({
            name: filePath + '/',
            type: 'directory',
            mode: stats.mode,
            mtime: stats.mtime,
          });
        }
      }

      // Finalize the archive
      pack.finalize();
    } catch (error) {
      cleanup(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * Add a single file to tar archive
 */
async function addFileToTar(
  pack: any, // tar.Pack type from tar-stream
  fullPath: string,
  relativePath: string,
  stats: any
): Promise<void> {
  return new Promise((resolve, reject) => {
    const entry = pack.entry({
      name: relativePath,
      size: stats.size,
      mode: stats.mode,
      mtime: stats.mtime,
    }, (err) => {
      if (err) {
        reject(new Error(`Failed to add file ${relativePath}: ${err.message}`));
      } else {
        resolve();
      }
    });

    const readStream = createReadStream(fullPath);
    readStream.on('error', (err) => {
      reject(new Error(`Failed to read file ${relativePath}: ${err.message}`));
    });

    readStream.pipe(entry);
  });
}

/**
 * Create a zip archive using archiver
 */
async function createZipArchive(options: ArchiverOptions): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // Lazy load archiver only when needed
    const archiverModule = await import('archiver');
    const archiver = archiverModule.default;

    const output = createWriteStream(options.outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle errors
    output.on('error', (err) => {
      reject(new Error(`Failed to write archive: ${err.message}`));
    });

    archive.on('error', (err) => {
      reject(new Error(`Archive creation failed: ${err.message}`));
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        // File not found - log warning but continue
        console.warn(`Warning: ${err.message}`);
      } else {
        // Other warnings become errors
        reject(new Error(`Archive warning: ${err.message}`));
      }
    });

    // Success handler
    output.on('close', () => {
      resolve();
    });

    // Pipe archive to output
    archive.pipe(output);

    try {
      // Get list of files to archive
      const files = await getFilesToArchive(options.sourceDir, options.include);

      // Add each file to the archive
      for (const filePath of files) {
        const fullPath = join(options.sourceDir, filePath);
        const stats = await stat(fullPath);

        if (stats.isFile()) {
          archive.file(fullPath, { name: filePath });
        } else if (stats.isDirectory()) {
          // archiver automatically handles directories when adding files
          // but we need to add empty directories explicitly
          const isEmpty = await isEmptyDirectory(fullPath);
          if (isEmpty) {
            archive.append(null, { name: filePath + '/' });
          }
        }
      }

      // Finalize the archive
      await archive.finalize();
    } catch (error) {
      archive.destroy();
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * Get list of files to archive
 * If include list is provided, use it. Otherwise, get all files recursively.
 */
async function getFilesToArchive(sourceDir: string, include?: string[]): Promise<string[]> {
  if (include && include.length > 0) {
    // Validate that all included paths exist
    const files: string[] = [];
    for (const path of include) {
      const fullPath = join(sourceDir, path);
      try {
        await access(fullPath);
        // Recursively add files if it's a directory
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          const subFiles = await getFilesRecursive(fullPath, sourceDir);
          files.push(...subFiles);
        } else {
          files.push(path);
        }
      } catch (error) {
        throw new Error(`Include path does not exist: ${path}`);
      }
    }
    return files;
  } else {
    // Get all files recursively
    return getFilesRecursive(sourceDir, sourceDir);
  }
}

/**
 * Recursively get all files in a directory
 */
async function getFilesRecursive(dir: string, baseDir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      // Add directory itself (for empty directory tracking)
      files.push(relativePath);
      // Recurse into subdirectory
      const subFiles = await getFilesRecursive(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Check if a directory is empty
 */
async function isEmptyDirectory(dir: string): Promise<boolean> {
  const entries = await readdir(dir);
  return entries.length === 0;
}
