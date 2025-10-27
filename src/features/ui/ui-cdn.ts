/**
 * UI CDN - CDN URL generation and Subresource Integrity (SRI) support
 *
 * Provides utilities for serving UI resources from CDNs with security features:
 * - Generate CDN URLs for resources
 * - Calculate SRI hashes (sha256, sha384, sha512)
 * - Compress resources (gzip, brotli)
 * - Generate integrity attributes for <script> and <link> tags
 *
 * Zero-weight: Only loaded when CDN features are explicitly enabled.
 *
 * @module ui-cdn
 */

import { createHash } from 'node:crypto';
import { gzip as gzipCallback, brotliCompress as brotliCallback } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzipCallback);
const brotliAsync = promisify(brotliCallback);

/**
 * SRI hash algorithm types
 */
export type SRIAlgorithm = 'sha256' | 'sha384' | 'sha512';

/**
 * Compression algorithm types
 */
export type CompressionType = 'gzip' | 'brotli' | 'both';

/**
 * CDN configuration options
 */
export interface CDNOptions {
  /**
   * CDN base URL (e.g., 'https://cdn.example.com')
   * @default undefined (no CDN)
   */
  baseUrl?: string;

  /**
   * Enable Subresource Integrity (SRI) hashes
   * Can be boolean (use sha384) or specific algorithm
   * @default false
   */
  sri?: boolean | SRIAlgorithm;

  /**
   * Compression to apply
   * @default undefined (no compression)
   */
  compression?: CompressionType;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
}

/**
 * SRI hash result
 */
export interface SRIHash {
  /**
   * Algorithm used (sha256, sha384, sha512)
   */
  algorithm: SRIAlgorithm;

  /**
   * Base64-encoded hash value
   */
  hash: string;

  /**
   * Complete integrity attribute value
   * Format: "sha384-abc123..."
   */
  integrity: string;
}

/**
 * Compression result
 */
export interface CompressionResult {
  /**
   * Compression type applied
   */
  type: 'gzip' | 'brotli';

  /**
   * Compressed data buffer
   */
  data: Buffer;

  /**
   * Original size in bytes
   */
  originalSize: number;

  /**
   * Compressed size in bytes
   */
  compressedSize: number;

  /**
   * Compression ratio (0-1, where 0.5 = 50% reduction)
   */
  compressionRatio: number;

  /**
   * Savings in bytes
   */
  savings: number;
}

/**
 * CDN resource result
 */
export interface CDNResource {
  /**
   * CDN URL for the resource
   */
  url: string;

  /**
   * SRI integrity hash (if enabled)
   */
  integrity?: string;

  /**
   * Compressed versions (if compression enabled)
   */
  compressed?: {
    gzip?: CompressionResult;
    brotli?: CompressionResult;
  };
}

/**
 * Calculate SRI hash for content
 *
 * Generates a Subresource Integrity (SRI) hash for the given content.
 * SRI hashes are used to verify that CDN-hosted files haven't been tampered with.
 *
 * @param content - Content to hash (string or Buffer)
 * @param algorithm - Hash algorithm to use (sha256, sha384, sha512)
 * @returns SRI hash object with algorithm, hash, and integrity string
 *
 * @example
 * ```typescript
 * const content = 'console.log("Hello");';
 * const sri = calculateSRI(content, 'sha384');
 * console.log(sri.integrity); // "sha384-abc123..."
 *
 * // Use in HTML:
 * // <script src="https://cdn.example.com/script.js"
 * //         integrity="sha384-abc123..."
 * //         crossorigin="anonymous"></script>
 * ```
 */
export function calculateSRI(
  content: string | Buffer,
  algorithm: SRIAlgorithm = 'sha384'
): SRIHash {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');

  const hash = createHash(algorithm).update(buffer).digest('base64');

  return {
    algorithm,
    hash,
    integrity: `${algorithm}-${hash}`,
  };
}

/**
 * Compress content with gzip
 *
 * Compresses content using gzip algorithm (RFC 1952).
 * Gzip provides good compression with wide browser support.
 *
 * @param content - Content to compress
 * @param options - Compression options
 * @returns Compression result with metrics
 *
 * @example
 * ```typescript
 * const html = '<html><body>Hello World</body></html>';
 * const result = await compressGzip(html);
 * console.log(`${result.savings} bytes saved (${(result.compressionRatio * 100).toFixed(1)}%)`);
 * ```
 */
export async function compressGzip(
  content: string | Buffer,
  options: { verbose?: boolean } = {}
): Promise<CompressionResult> {
  const { verbose = false } = options;

  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  const originalSize = buffer.length;

  if (verbose) {
    console.log(`[UI CDN] Compressing with gzip (${originalSize} bytes)...`);
  }

  const compressed = await gzipAsync(buffer);
  const compressedSize = compressed.length;
  const savings = originalSize - compressedSize;
  const compressionRatio = originalSize > 0 ? savings / originalSize : 0;

  if (verbose) {
    console.log(
      `[UI CDN] Gzip: ${originalSize} → ${compressedSize} bytes (${(compressionRatio * 100).toFixed(1)}% reduction)`
    );
  }

  return {
    type: 'gzip',
    data: compressed,
    originalSize,
    compressedSize,
    compressionRatio,
    savings,
  };
}

/**
 * Compress content with brotli
 *
 * Compresses content using brotli algorithm (RFC 7932).
 * Brotli typically provides better compression than gzip but requires more CPU.
 *
 * @param content - Content to compress
 * @param options - Compression options
 * @returns Compression result with metrics
 *
 * @example
 * ```typescript
 * const css = '.button { padding: 10px; margin: 5px; }';
 * const result = await compressBrotli(css);
 * console.log(`Compressed to ${result.compressedSize} bytes`);
 * ```
 */
export async function compressBrotli(
  content: string | Buffer,
  options: { verbose?: boolean } = {}
): Promise<CompressionResult> {
  const { verbose = false } = options;

  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  const originalSize = buffer.length;

  if (verbose) {
    console.log(`[UI CDN] Compressing with brotli (${originalSize} bytes)...`);
  }

  const compressed = await brotliAsync(buffer);
  const compressedSize = compressed.length;
  const savings = originalSize - compressedSize;
  const compressionRatio = originalSize > 0 ? savings / originalSize : 0;

  if (verbose) {
    console.log(
      `[UI CDN] Brotli: ${originalSize} → ${compressedSize} bytes (${(compressionRatio * 100).toFixed(1)}% reduction)`
    );
  }

  return {
    type: 'brotli',
    data: compressed,
    originalSize,
    compressedSize,
    compressionRatio,
    savings,
  };
}

/**
 * Generate CDN URL for resource
 *
 * Creates a CDN URL by combining base URL with resource path.
 * Handles trailing slashes and path normalization.
 *
 * @param baseUrl - CDN base URL (e.g., 'https://cdn.example.com')
 * @param resourcePath - Resource path (e.g., '/assets/app.js' or 'assets/app.js')
 * @returns Complete CDN URL
 *
 * @example
 * ```typescript
 * const url = generateCDNUrl('https://cdn.example.com', '/assets/app.js');
 * console.log(url); // 'https://cdn.example.com/assets/app.js'
 * ```
 */
export function generateCDNUrl(baseUrl: string, resourcePath: string): string {
  // Remove trailing slash from base URL
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  // Ensure resource path starts with /
  const cleanPath = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;

  return `${cleanBaseUrl}${cleanPath}`;
}

/**
 * Prepare resource for CDN deployment
 *
 * Prepares a resource for CDN hosting by:
 * 1. Generating CDN URL
 * 2. Calculating SRI hash (if enabled)
 * 3. Compressing content (if enabled)
 *
 * @param content - Resource content
 * @param resourcePath - Resource path on CDN
 * @param options - CDN configuration options
 * @returns CDN resource with URL, integrity, and compressed versions
 *
 * @example
 * ```typescript
 * const script = 'function hello() { console.log("Hi"); }';
 * const resource = await prepareCDNResource(
 *   script,
 *   '/js/hello.js',
 *   {
 *     baseUrl: 'https://cdn.example.com',
 *     sri: 'sha384',
 *     compression: 'both'
 *   }
 * );
 *
 * console.log(resource.url); // 'https://cdn.example.com/js/hello.js'
 * console.log(resource.integrity); // 'sha384-abc123...'
 * console.log(resource.compressed?.gzip); // Gzip compression result
 * console.log(resource.compressed?.brotli); // Brotli compression result
 * ```
 */
export async function prepareCDNResource(
  content: string | Buffer,
  resourcePath: string,
  options: CDNOptions = {}
): Promise<CDNResource> {
  const {
    baseUrl,
    sri = false,
    compression,
    verbose = false,
  } = options;

  const result: CDNResource = {
    url: baseUrl ? generateCDNUrl(baseUrl, resourcePath) : resourcePath,
  };

  // Calculate SRI hash if enabled
  if (sri) {
    const algorithm = typeof sri === 'string' ? sri : 'sha384';
    const sriHash = calculateSRI(content, algorithm);
    result.integrity = sriHash.integrity;

    if (verbose) {
      console.log(`[UI CDN] Generated SRI hash: ${result.integrity}`);
    }
  }

  // Compress content if enabled
  if (compression) {
    result.compressed = {};

    if (compression === 'gzip' || compression === 'both') {
      result.compressed.gzip = await compressGzip(content, { verbose });
    }

    if (compression === 'brotli' || compression === 'both') {
      result.compressed.brotli = await compressBrotli(content, { verbose });
    }
  }

  return result;
}

/**
 * Generate HTML script tag with CDN and SRI
 *
 * Creates a complete <script> tag with CDN URL, integrity attribute,
 * and crossorigin attribute (required for SRI).
 *
 * @param cdnResource - CDN resource with URL and integrity
 * @param async - Add async attribute
 * @param defer - Add defer attribute
 * @returns Complete script tag HTML
 *
 * @example
 * ```typescript
 * const resource = await prepareCDNResource(
 *   scriptContent,
 *   '/app.js',
 *   { baseUrl: 'https://cdn.example.com', sri: 'sha384' }
 * );
 *
 * const tag = generateScriptTag(resource, { async: true });
 * // <script src="https://cdn.example.com/app.js"
 * //         integrity="sha384-..."
 * //         crossorigin="anonymous"
 * //         async></script>
 * ```
 */
export function generateScriptTag(
  cdnResource: CDNResource,
  options: { async?: boolean; defer?: boolean } = {}
): string {
  const { async = false, defer = false } = options;

  const attributes: string[] = [`src="${cdnResource.url}"`];

  if (cdnResource.integrity) {
    attributes.push(`integrity="${cdnResource.integrity}"`);
    attributes.push('crossorigin="anonymous"');
  }

  if (async) {
    attributes.push('async');
  }

  if (defer) {
    attributes.push('defer');
  }

  return `<script ${attributes.join(' ')}></script>`;
}

/**
 * Generate HTML link tag with CDN and SRI
 *
 * Creates a complete <link> tag with CDN URL, integrity attribute,
 * and crossorigin attribute (required for SRI).
 *
 * @param cdnResource - CDN resource with URL and integrity
 * @param rel - Link relationship (default: 'stylesheet')
 * @returns Complete link tag HTML
 *
 * @example
 * ```typescript
 * const resource = await prepareCDNResource(
 *   cssContent,
 *   '/styles.css',
 *   { baseUrl: 'https://cdn.example.com', sri: 'sha384' }
 * );
 *
 * const tag = generateLinkTag(resource);
 * // <link rel="stylesheet"
 * //       href="https://cdn.example.com/styles.css"
 * //       integrity="sha384-..."
 * //       crossorigin="anonymous">
 * ```
 */
export function generateLinkTag(
  cdnResource: CDNResource,
  rel: string = 'stylesheet'
): string {
  const attributes: string[] = [
    `rel="${rel}"`,
    `href="${cdnResource.url}"`,
  ];

  if (cdnResource.integrity) {
    attributes.push(`integrity="${cdnResource.integrity}"`);
    attributes.push('crossorigin="anonymous"');
  }

  return `<link ${attributes.join(' ')}>`;
}

/**
 * Normalize CDN options
 *
 * Converts boolean or object CDN configuration to full CDNOptions.
 *
 * @param cdn - CDN configuration from IUI interface
 * @returns Normalized CDNOptions
 *
 * @example
 * ```typescript
 * normalizeCDNOptions(true); // { sri: true }
 * normalizeCDNOptions({ baseUrl: 'https://cdn.example.com' }); // Full options
 * normalizeCDNOptions(false); // { sri: false }
 * ```
 */
export function normalizeCDNOptions(
  cdn?: boolean | Partial<CDNOptions>
): CDNOptions {
  if (cdn === true) {
    return { sri: true };
  }
  if (cdn === false || cdn === undefined) {
    return { sri: false };
  }
  return {
    baseUrl: cdn.baseUrl,
    sri: cdn.sri ?? false,
    compression: cdn.compression,
    verbose: cdn.verbose ?? false,
  };
}
