/**
 * Source Type Detector - Intelligently detect UI source content type
 *
 * The `source` field in IUI v4.0 is a unified field that can be:
 * - External URL (https://example.com)
 * - Inline HTML (<div>...)
 * - Inline Remote DOM JSON ({"type":"div",...})
 * - File path (./page.html, ./Component.tsx)
 * - Folder path (./ui/dashboard/)
 *
 * This module detects which type based on content patterns.
 *
 * @module source-detector
 */

import { existsSync, statSync } from 'fs';
import { resolve, extname } from 'path';

/**
 * Detected source type
 */
export type SourceType =
  | 'url'        // External URL
  | 'inline-html' // Inline HTML string
  | 'inline-remote-dom' // Inline Remote DOM JSON
  | 'file-html'  // HTML file path
  | 'file-component' // React component file (.tsx/.jsx)
  | 'folder'     // Folder containing UI files
  | 'unknown';   // Could not determine

/**
 * Detection result with metadata
 */
export interface DetectionResult {
  /**
   * Detected source type
   */
  type: SourceType;

  /**
   * Resolved file system path (for file/folder types)
   */
  resolvedPath?: string;

  /**
   * File extension (for file types)
   */
  extension?: string;

  /**
   * Original source value
   */
  source: string;

  /**
   * Confidence level (0-1)
   * 1.0 = definitely this type
   * 0.5 = probably this type
   * 0.0 = ambiguous
   */
  confidence: number;

  /**
   * Reason for detection (for debugging)
   */
  reason: string;
}

/**
 * Options for source detection
 */
export interface SourceDetectionOptions {
  /**
   * Base path for resolving relative file paths
   * @default process.cwd()
   */
  basePath?: string;

  /**
   * Whether to check file system (slower but more accurate)
   * @default true
   */
  checkFileSystem?: boolean;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
}

/**
 * Detect the type of UI source content
 *
 * Uses multiple heuristics to determine the source type:
 * 1. URL detection (http://, https://)
 * 2. Inline HTML detection (HTML tags, DOCTYPE)
 * 3. Remote DOM JSON detection (JSON structure)
 * 4. File system check (if enabled)
 * 5. Extension-based detection
 *
 * @param source - The source string to analyze
 * @param options - Detection options
 * @returns Detection result with type and metadata
 *
 * @example External URL
 * ```typescript
 * detectSourceType('https://example.com/dashboard')
 * // => { type: 'url', confidence: 1.0, ... }
 * ```
 *
 * @example Inline HTML
 * ```typescript
 * detectSourceType('<div>Hello</div>')
 * // => { type: 'inline-html', confidence: 1.0, ... }
 * ```
 *
 * @example Component File
 * ```typescript
 * detectSourceType('./Dashboard.tsx')
 * // => { type: 'file-component', extension: '.tsx', ... }
 * ```
 *
 * @example Folder
 * ```typescript
 * detectSourceType('./ui/dashboard/')
 * // => { type: 'folder', resolvedPath: '/abs/path/ui/dashboard', ... }
 * ```
 */
export function detectSourceType(
  source: string,
  options: SourceDetectionOptions = {}
): DetectionResult {
  const {
    basePath = process.cwd(),
    checkFileSystem = true,
    verbose = false,
  } = options;

  const trimmedSource = source.trim();

  if (verbose) {
    console.log(`[SourceDetector] Analyzing: "${trimmedSource.slice(0, 50)}..."`);
  }

  // ============================================================================
  // 1. URL Detection (highest priority - most specific)
  // ============================================================================
  if (isExternalUrl(trimmedSource)) {
    return {
      type: 'url',
      source: trimmedSource,
      confidence: 1.0,
      reason: 'Starts with http:// or https://',
    };
  }

  // ============================================================================
  // 2. Inline HTML Detection
  // ============================================================================
  if (isInlineHtml(trimmedSource)) {
    return {
      type: 'inline-html',
      source: trimmedSource,
      confidence: 1.0,
      reason: 'Contains HTML tags or DOCTYPE',
    };
  }

  // ============================================================================
  // 3. Remote DOM JSON Detection
  // ============================================================================
  if (isRemoteDomJson(trimmedSource)) {
    return {
      type: 'inline-remote-dom',
      source: trimmedSource,
      confidence: 0.9, // Slightly less confident (could be any JSON)
      reason: 'Valid JSON with Remote DOM structure',
    };
  }

  // ============================================================================
  // 4. File System Detection (if enabled)
  // ============================================================================
  if (checkFileSystem) {
    const fsResult = detectFileSystemType(trimmedSource, basePath, verbose);
    if (fsResult) {
      return fsResult;
    }
  }

  // ============================================================================
  // 5. Extension-based Detection (fallback)
  // ============================================================================
  const extResult = detectByExtension(trimmedSource);
  if (extResult) {
    return extResult;
  }

  // ============================================================================
  // 6. Unknown
  // ============================================================================
  return {
    type: 'unknown',
    source: trimmedSource,
    confidence: 0.0,
    reason: 'Could not determine type - no patterns matched',
  };
}

/**
 * Check if source is an external URL
 */
function isExternalUrl(source: string): boolean {
  return (
    source.startsWith('http://') ||
    source.startsWith('https://') ||
    source.startsWith('//') // Protocol-relative URL
  );
}

/**
 * Check if source is inline HTML
 */
function isInlineHtml(source: string): boolean {
  // Starts with HTML tag
  if (source.startsWith('<')) {
    return true;
  }

  // Contains DOCTYPE declaration
  if (source.toLowerCase().includes('<!doctype')) {
    return true;
  }

  // Contains common HTML tags
  const htmlTags = ['<div', '<span', '<p>', '<h1', '<html', '<body', '<head'];
  return htmlTags.some((tag) => source.toLowerCase().includes(tag));
}

/**
 * Check if source is Remote DOM JSON
 */
function isRemoteDomJson(source: string): boolean {
  // Must start with {
  if (!source.startsWith('{')) {
    return false;
  }

  try {
    const parsed = JSON.parse(source);

    // Check for Remote DOM structure
    // Remote DOM objects have: { type: string, properties?: {}, children?: [] }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.type === 'string'
    ) {
      // Looks like Remote DOM
      return true;
    }
  } catch {
    // Not valid JSON
    return false;
  }

  return false;
}

/**
 * Detect type by checking file system
 */
function detectFileSystemType(
  source: string,
  basePath: string,
  verbose: boolean
): DetectionResult | null {
  // Skip if looks like inline content
  if (source.startsWith('<') || source.startsWith('{')) {
    return null;
  }

  // Resolve path
  const resolvedPath = isAbsolutePath(source)
    ? source
    : resolve(basePath, source);

  // Check if path exists
  if (!existsSync(resolvedPath)) {
    if (verbose) {
      console.log(`  [FS] Path does not exist: ${resolvedPath}`);
    }
    return null;
  }

  const stats = statSync(resolvedPath);

  // Directory/Folder
  if (stats.isDirectory()) {
    return {
      type: 'folder',
      source,
      resolvedPath,
      confidence: 1.0,
      reason: 'Path exists and is a directory',
    };
  }

  // File
  if (stats.isFile()) {
    const ext = extname(resolvedPath);

    // React component
    if (ext === '.tsx' || ext === '.jsx') {
      return {
        type: 'file-component',
        source,
        resolvedPath,
        extension: ext,
        confidence: 1.0,
        reason: `File exists with React component extension (${ext})`,
      };
    }

    // HTML file
    if (ext === '.html' || ext === '.htm') {
      return {
        type: 'file-html',
        source,
        resolvedPath,
        extension: ext,
        confidence: 1.0,
        reason: `File exists with HTML extension (${ext})`,
      };
    }

    // Other file types - treat as unknown but return path
    return {
      type: 'unknown',
      source,
      resolvedPath,
      extension: ext,
      confidence: 0.5,
      reason: `File exists but unrecognized extension (${ext})`,
    };
  }

  return null;
}

/**
 * Detect type by file extension (without file system check)
 */
function detectByExtension(source: string): DetectionResult | null {
  // Check for folder pattern (trailing slash) - BEFORE extension check
  if (source.endsWith('/') || source.endsWith('\\')) {
    return {
      type: 'folder',
      source,
      confidence: 0.7, // Medium confidence (could be URL path)
      reason: 'Ends with slash - likely a folder path',
    };
  }

  const ext = extname(source);

  if (!ext) {
    return null;
  }

  // React component extensions
  if (ext === '.tsx' || ext === '.jsx') {
    return {
      type: 'file-component',
      source,
      extension: ext,
      confidence: 0.8, // Medium confidence (file might not exist)
      reason: `Has React component extension (${ext})`,
    };
  }

  // HTML extensions
  if (ext === '.html' || ext === '.htm') {
    return {
      type: 'file-html',
      source,
      extension: ext,
      confidence: 0.8,
      reason: `Has HTML extension (${ext})`,
    };
  }

  return null;
}

/**
 * Check if path is absolute
 */
function isAbsolutePath(path: string): boolean {
  // Unix absolute path
  if (path.startsWith('/')) {
    return true;
  }

  // Windows absolute path
  if (/^[A-Za-z]:[/\\]/.test(path)) {
    return true;
  }

  return false;
}

/**
 * Batch detect source types for multiple sources
 *
 * @param sources - Array of source strings
 * @param options - Detection options
 * @returns Array of detection results
 *
 * @example
 * ```typescript
 * const results = batchDetectSourceType([
 *   'https://example.com',
 *   '<div>Hello</div>',
 *   './Dashboard.tsx'
 * ]);
 * ```
 */
export function batchDetectSourceType(
  sources: string[],
  options: SourceDetectionOptions = {}
): DetectionResult[] {
  return sources.map((source) => detectSourceType(source, options));
}
