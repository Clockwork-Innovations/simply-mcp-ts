/**
 * Binary and image content helper functions for SimpleMCP
 * Handles conversion, detection, and validation of binary content
 */

import { readFile } from 'fs/promises';
import { resolve, extname, basename } from 'path';
import { access, constants as fsConstants } from 'fs/promises';

// File size limits
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB hard limit
export const MAX_SAFE_SIZE = 10 * 1024 * 1024; // 10MB warning threshold

/**
 * MIME type mapping by file extension
 */
export const MIME_TYPES: Record<string, string> = {
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.7z': 'application/x-7z-compressed',
  '.rar': 'application/vnd.rar',

  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',

  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',

  // Text
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
};

/**
 * Magic bytes for common file formats
 * Maps MIME type to the first bytes of the file
 */
export const MAGIC_BYTES: Record<string, number[]> = {
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/gif': [0x47, 0x49, 0x46, 0x38], // GIF8
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF (followed by WEBP)
  'image/bmp': [0x42, 0x4d], // BM
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'application/zip': [0x50, 0x4b, 0x03, 0x04], // PK
  'audio/mpeg': [0xff, 0xfb], // MP3 (or 0xFF 0xF3)
  'audio/wav': [0x52, 0x49, 0x46, 0x46], // RIFF (followed by WAVE)
};

/**
 * Type guard to check if value is a Buffer
 */
export function isBuffer(obj: any): obj is Buffer {
  return obj != null && obj.constructor != null && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj);
}

/**
 * Type guard to check if value is a Uint8Array
 */
export function isUint8Array(obj: any): obj is Uint8Array {
  return obj instanceof Uint8Array && !(obj instanceof Buffer);
}

/**
 * Convert Buffer or Uint8Array to base64 string
 * @param buffer Binary data
 * @returns Base64-encoded string
 */
export function bufferToBase64(buffer: Buffer | Uint8Array): string {
  if (isBuffer(buffer)) {
    return buffer.toString('base64');
  }
  if (isUint8Array(buffer)) {
    return Buffer.from(buffer).toString('base64');
  }
  throw new Error('Input must be Buffer or Uint8Array');
}

/**
 * Convert base64 string to Buffer
 * @param base64 Base64-encoded string
 * @returns Buffer
 */
export function base64ToBuffer(base64: string): Buffer {
  // Strip data URL prefix if present
  const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');

  try {
    return Buffer.from(cleanBase64, 'base64');
  } catch (error) {
    throw new Error(`Failed to decode base64: ${error instanceof Error ? error.message : 'Invalid base64 string'}`);
  }
}

/**
 * Validate base64 string
 * @param data String to validate
 * @returns True if valid base64
 */
export function validateBase64(data: string): boolean {
  // Strip data URL prefix if present
  const cleanData = data.replace(/^data:[^;]+;base64,/, '');

  // Base64 regex pattern
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

  if (!base64Regex.test(cleanData)) {
    return false;
  }

  try {
    Buffer.from(cleanData, 'base64');
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect MIME type from file extension
 * @param filePath Path to file
 * @returns MIME type string or null if unknown
 */
export function detectMimeTypeFromExtension(filePath: string): string | null {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || null;
}

/**
 * Detect MIME type from magic bytes
 * @param buffer Binary data
 * @returns MIME type string or null if unknown
 */
export function detectMimeTypeFromMagicBytes(buffer: Buffer | Uint8Array): string | null {
  const bytes = isBuffer(buffer) ? buffer : Buffer.from(buffer);

  // Check against known magic bytes
  for (const [mimeType, magic] of Object.entries(MAGIC_BYTES)) {
    if (bytes.length < magic.length) continue;

    let matches = true;
    for (let i = 0; i < magic.length; i++) {
      if (bytes[i] !== magic[i]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      // Special case for WEBP - need to check for WEBP signature after RIFF
      if (mimeType === 'image/webp') {
        if (bytes.length >= 12) {
          const webpSig = bytes.slice(8, 12).toString('ascii');
          if (webpSig === 'WEBP') {
            return mimeType;
          }
        }
        continue;
      }

      // Special case for WAV - need to check for WAVE signature after RIFF
      if (mimeType === 'audio/wav') {
        if (bytes.length >= 12) {
          const waveSig = bytes.slice(8, 12).toString('ascii');
          if (waveSig === 'WAVE') {
            return mimeType;
          }
        }
        continue;
      }

      return mimeType;
    }
  }

  return null;
}

/**
 * Detect MIME type from buffer, file path, or provided type
 * @param input Binary data, file path, or string
 * @param filePath Optional file path for extension detection
 * @param providedMimeType Optional explicitly provided MIME type
 * @returns MIME type string (defaults to application/octet-stream)
 */
export function detectMimeType(
  input: Buffer | Uint8Array | string,
  filePath?: string,
  providedMimeType?: string
): string {
  // 1. Use provided MIME type if available
  if (providedMimeType) {
    return providedMimeType;
  }

  // 2. Try to detect from file extension if path is provided
  if (filePath) {
    const mimeFromExt = detectMimeTypeFromExtension(filePath);
    if (mimeFromExt) {
      return mimeFromExt;
    }
  }

  // 3. Try to detect from input if it's a file path
  if (typeof input === 'string' && !input.includes('\n') && input.length < 1000) {
    const mimeFromExt = detectMimeTypeFromExtension(input);
    if (mimeFromExt) {
      return mimeFromExt;
    }
  }

  // 4. Try to detect from magic bytes if binary data
  if (isBuffer(input) || isUint8Array(input)) {
    const mimeFromMagic = detectMimeTypeFromMagicBytes(input);
    if (mimeFromMagic) {
      return mimeFromMagic;
    }
  }

  // 5. Default to octet-stream
  return 'application/octet-stream';
}

/**
 * Validate MIME type format
 * @param mimeType MIME type string
 * @returns True if valid format
 */
export function isValidMimeType(mimeType: string): boolean {
  // Basic MIME type validation (type/subtype)
  const mimeRegex = /^[a-z]+\/[a-z0-9\-\+\.]+$/i;
  return mimeRegex.test(mimeType);
}

/**
 * Sanitize file path to prevent path traversal
 * @param filePath File path to sanitize
 * @param basePath Base path to restrict to
 * @returns Sanitized absolute path
 * @throws Error if path traversal is detected
 */
export function sanitizeFilePath(filePath: string, basePath: string = process.cwd()): string {
  // Resolve the file path relative to basePath
  const resolved = resolve(basePath, filePath);

  // Ensure resolved path is within basePath
  const normalizedBase = resolve(basePath);
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error(`Path traversal detected: ${filePath} resolves outside base path ${basePath}`);
  }

  return resolved;
}

/**
 * Read a file and convert to base64
 * @param filePath Path to file
 * @param basePath Base path for relative paths
 * @returns Base64-encoded file contents
 * @throws Error if file not found or too large
 */
export async function readBinaryFile(filePath: string, basePath: string = process.cwd()): Promise<Buffer> {
  // Sanitize path
  const safePath = sanitizeFilePath(filePath, basePath);

  try {
    // Check file exists and is readable
    await access(safePath, fsConstants.R_OK);
  } catch (error) {
    throw new Error(`Failed to read file '${basename(filePath)}': File not found or permission denied`);
  }

  // Read file
  let buffer: Buffer;
  try {
    buffer = await readFile(safePath);
  } catch (error) {
    throw new Error(`Failed to read file '${basename(filePath)}': ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${buffer.length} bytes (max: ${MAX_FILE_SIZE} bytes). ` +
      `Consider reducing file size or splitting into smaller files.`
    );
  }

  return buffer;
}

/**
 * Content types for different binary data
 */
export interface ImageContent {
  type: 'image';
  data: string; // base64
  mimeType: string;
  _meta?: {
    size?: number;
    originalPath?: string;
  };
}

export interface AudioContent {
  type: 'audio';
  data: string; // base64
  mimeType: string;
  _meta?: {
    size?: number;
    originalPath?: string;
  };
}

export interface BinaryContent {
  type: 'binary';
  data: string; // base64
  mimeType: string;
  _meta?: {
    size?: number;
    originalPath?: string;
  };
}

/**
 * Input types for image content
 */
export type ImageInput =
  | Buffer
  | Uint8Array
  | string // base64 or file path
  | { type: 'image'; data: string | Buffer | Uint8Array; mimeType?: string }
  | { type: 'file'; path: string; mimeType?: string };

/**
 * Input types for binary content
 */
export type BinaryInput =
  | Buffer
  | Uint8Array
  | string // base64 or file path
  | { type: 'binary'; data: string | Buffer | Uint8Array; mimeType?: string }
  | { type: 'file'; path: string; mimeType?: string };

/**
 * Input types for audio content
 */
export type AudioInput =
  | Buffer
  | Uint8Array
  | string // base64 or file path
  | { type: 'audio'; data: string | Buffer | Uint8Array; mimeType?: string }
  | { type: 'file'; path: string; mimeType?: string };

/**
 * Convert input to ImageContent
 * @param input Image data in various formats
 * @param mimeType Optional MIME type override
 * @param basePath Base path for file operations
 * @param logger Optional logger for warnings
 * @returns ImageContent object
 */
export async function createImageContent(
  input: ImageInput,
  mimeType?: string,
  basePath: string = process.cwd(),
  logger?: { warn: (message: string) => void }
): Promise<ImageContent> {
  let buffer: Buffer;
  let detectedMimeType: string;
  let originalPath: string | undefined;

  // Handle different input types
  if (isBuffer(input) || isUint8Array(input)) {
    // Direct buffer/Uint8Array
    buffer = isBuffer(input) ? input : Buffer.from(input);
    detectedMimeType = detectMimeType(buffer, undefined, mimeType);
  } else if (typeof input === 'string') {
    // Could be base64 or file path
    if (validateBase64(input)) {
      // It's base64
      buffer = base64ToBuffer(input);
      detectedMimeType = detectMimeType(buffer, undefined, mimeType);
    } else {
      // Assume it's a file path
      originalPath = input;
      buffer = await readBinaryFile(input, basePath);
      detectedMimeType = detectMimeType(buffer, input, mimeType);
    }
  } else if (typeof input === 'object' && input !== null) {
    if ('type' in input && input.type === 'file' && 'path' in input) {
      // File path object
      originalPath = input.path;
      buffer = await readBinaryFile(input.path, basePath);
      detectedMimeType = detectMimeType(buffer, input.path, input.mimeType || mimeType);
    } else if ('type' in input && input.type === 'image' && 'data' in input) {
      // Image data object
      const data = input.data;
      if (isBuffer(data) || isUint8Array(data)) {
        buffer = isBuffer(data) ? data : Buffer.from(data);
      } else if (typeof data === 'string') {
        buffer = base64ToBuffer(data);
      } else {
        throw new Error('Invalid image data type in input object');
      }
      detectedMimeType = detectMimeType(buffer, undefined, input.mimeType || mimeType);
    } else {
      throw new Error('Invalid input object format for image content');
    }
  } else {
    throw new Error('Invalid input type for image content');
  }

  // Check if buffer is empty
  if (buffer.length === 0) {
    throw new Error('Cannot convert empty buffer to image content');
  }

  // Warn if file is large
  if (buffer.length > MAX_SAFE_SIZE && logger) {
    logger.warn(
      `Large image file detected: ${buffer.length} bytes. ` +
      `Consider optimizing image size for better performance.`
    );
  }

  // Convert to base64
  const base64Data = bufferToBase64(buffer);

  return {
    type: 'image',
    data: base64Data,
    mimeType: detectedMimeType,
    _meta: {
      size: buffer.length,
      ...(originalPath && { originalPath }),
    },
  };
}

/**
 * Convert input to AudioContent
 * @param input Audio data in various formats
 * @param mimeType Optional MIME type override
 * @param basePath Base path for file operations
 * @param logger Optional logger for warnings
 * @returns AudioContent object
 */
export async function createAudioContent(
  input: AudioInput,
  mimeType?: string,
  basePath: string = process.cwd(),
  logger?: { warn: (message: string) => void }
): Promise<AudioContent> {
  let buffer: Buffer;
  let detectedMimeType: string;
  let originalPath: string | undefined;

  // Handle different input types
  if (isBuffer(input) || isUint8Array(input)) {
    buffer = isBuffer(input) ? input : Buffer.from(input);
    detectedMimeType = detectMimeType(buffer, undefined, mimeType);
  } else if (typeof input === 'string') {
    if (validateBase64(input)) {
      buffer = base64ToBuffer(input);
      detectedMimeType = detectMimeType(buffer, undefined, mimeType);
    } else {
      originalPath = input;
      buffer = await readBinaryFile(input, basePath);
      detectedMimeType = detectMimeType(buffer, input, mimeType);
    }
  } else if (typeof input === 'object' && input !== null) {
    if ('type' in input && input.type === 'file' && 'path' in input) {
      originalPath = input.path;
      buffer = await readBinaryFile(input.path, basePath);
      detectedMimeType = detectMimeType(buffer, input.path, input.mimeType || mimeType);
    } else if ('type' in input && input.type === 'audio' && 'data' in input) {
      const data = input.data;
      if (isBuffer(data) || isUint8Array(data)) {
        buffer = isBuffer(data) ? data : Buffer.from(data);
      } else if (typeof data === 'string') {
        buffer = base64ToBuffer(data);
      } else {
        throw new Error('Invalid audio data type in input object');
      }
      detectedMimeType = detectMimeType(buffer, undefined, input.mimeType || mimeType);
    } else {
      throw new Error('Invalid input object format for audio content');
    }
  } else {
    throw new Error('Invalid input type for audio content');
  }

  if (buffer.length === 0) {
    throw new Error('Cannot convert empty buffer to audio content');
  }

  if (buffer.length > MAX_SAFE_SIZE && logger) {
    logger.warn(
      `Large audio file detected: ${buffer.length} bytes. ` +
      `Consider compressing audio for better performance.`
    );
  }

  const base64Data = bufferToBase64(buffer);

  return {
    type: 'audio',
    data: base64Data,
    mimeType: detectedMimeType,
    _meta: {
      size: buffer.length,
      ...(originalPath && { originalPath }),
    },
  };
}

/**
 * Convert input to BinaryContent
 * @param input Binary data in various formats
 * @param mimeType Optional MIME type override
 * @param basePath Base path for file operations
 * @param logger Optional logger for warnings
 * @returns BinaryContent object
 */
export async function createBlobContent(
  input: BinaryInput,
  mimeType?: string,
  basePath: string = process.cwd(),
  logger?: { warn: (message: string) => void }
): Promise<BinaryContent> {
  let buffer: Buffer;
  let detectedMimeType: string;
  let originalPath: string | undefined;

  // Handle different input types
  if (isBuffer(input) || isUint8Array(input)) {
    buffer = isBuffer(input) ? input : Buffer.from(input);
    detectedMimeType = detectMimeType(buffer, undefined, mimeType);
  } else if (typeof input === 'string') {
    if (validateBase64(input)) {
      buffer = base64ToBuffer(input);
      detectedMimeType = detectMimeType(buffer, undefined, mimeType);
    } else {
      originalPath = input;
      buffer = await readBinaryFile(input, basePath);
      detectedMimeType = detectMimeType(buffer, input, mimeType);
    }
  } else if (typeof input === 'object' && input !== null) {
    if ('type' in input && input.type === 'file' && 'path' in input) {
      originalPath = input.path;
      buffer = await readBinaryFile(input.path, basePath);
      detectedMimeType = detectMimeType(buffer, input.path, input.mimeType || mimeType);
    } else if ('type' in input && input.type === 'binary' && 'data' in input) {
      const data = input.data;
      if (isBuffer(data) || isUint8Array(data)) {
        buffer = isBuffer(data) ? data : Buffer.from(data);
      } else if (typeof data === 'string') {
        buffer = base64ToBuffer(data);
      } else {
        throw new Error('Invalid binary data type in input object');
      }
      detectedMimeType = detectMimeType(buffer, undefined, input.mimeType || mimeType);
    } else {
      throw new Error('Invalid input object format for binary content');
    }
  } else {
    throw new Error('Invalid input type for binary content');
  }

  if (buffer.length === 0) {
    throw new Error('Cannot convert empty buffer to binary content');
  }

  if (buffer.length > MAX_SAFE_SIZE && logger) {
    logger.warn(
      `Large binary file detected: ${buffer.length} bytes. ` +
      `This may impact performance.`
    );
  }

  const base64Data = bufferToBase64(buffer);

  return {
    type: 'binary',
    data: base64Data,
    mimeType: detectedMimeType,
    _meta: {
      size: buffer.length,
      ...(originalPath && { originalPath }),
    },
  };
}
