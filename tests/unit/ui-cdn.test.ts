/**
 * Unit tests for ui-cdn module
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateSRI,
  compressGzip,
  compressBrotli,
  generateCDNUrl,
  prepareCDNResource,
  generateScriptTag,
  generateLinkTag,
  normalizeCDNOptions,
  type SRIHash,
  type CompressionResult,
  type CDNResource,
  type CDNOptions,
} from '../../src/features/ui/ui-cdn.js';

describe('UI CDN', () => {
  describe('calculateSRI', () => {
    it('should calculate SHA-384 hash by default', () => {
      const content = 'console.log("test");';
      const sri: SRIHash = calculateSRI(content);

      expect(sri.algorithm).toBe('sha384');
      expect(sri.hash).toBeTruthy();
      expect(sri.integrity).toMatch(/^sha384-/);
    });

    it('should calculate SHA-256 hash', () => {
      const content = 'test content';
      const sri = calculateSRI(content, 'sha256');

      expect(sri.algorithm).toBe('sha256');
      expect(sri.integrity).toMatch(/^sha256-/);
    });

    it('should calculate SHA-512 hash', () => {
      const content = 'test content';
      const sri = calculateSRI(content, 'sha512');

      expect(sri.algorithm).toBe('sha512');
      expect(sri.integrity).toMatch(/^sha512-/);
    });

    it('should produce consistent hashes for same content', () => {
      const content = 'test';
      const sri1 = calculateSRI(content);
      const sri2 = calculateSRI(content);

      expect(sri1.integrity).toBe(sri2.integrity);
    });

    it('should produce different hashes for different content', () => {
      const sri1 = calculateSRI('content1');
      const sri2 = calculateSRI('content2');

      expect(sri1.integrity).not.toBe(sri2.integrity);
    });

    it('should work with Buffer input', () => {
      const buffer = Buffer.from('test content', 'utf8');
      const sri = calculateSRI(buffer);

      expect(sri.integrity).toBeTruthy();
      expect(sri.integrity).toMatch(/^sha384-/);
    });
  });

  describe('compressGzip', () => {
    it('should compress content with gzip', async () => {
      const content = 'test content '.repeat(100);
      const result: CompressionResult = await compressGzip(content);

      expect(result.type).toBe('gzip');
      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.compressedSize).toBeLessThan(result.originalSize);
      expect(result.savings).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeLessThanOrEqual(1);
    });

    it('should handle small content', async () => {
      const content = 'small';
      const result = await compressGzip(content);

      expect(result.data).toBeInstanceOf(Buffer);
      // Small content may not compress well
      expect(result.compressedSize).toBeGreaterThan(0);
    });

    it('should work with Buffer input', async () => {
      const buffer = Buffer.from('test content', 'utf8');
      const result = await compressGzip(buffer);

      expect(result.data).toBeInstanceOf(Buffer);
    });
  });

  describe('compressBrotli', () => {
    it('should compress content with brotli', async () => {
      const content = 'test content '.repeat(100);
      const result: CompressionResult = await compressBrotli(content);

      expect(result.type).toBe('brotli');
      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.compressedSize).toBeLessThan(result.originalSize);
      expect(result.savings).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeGreaterThan(0);
    });

    it('should typically achieve better compression than gzip', async () => {
      const content = 'test content '.repeat(100);
      const gzipResult = await compressGzip(content);
      const brotliResult = await compressBrotli(content);

      // Brotli usually compresses better, but allow for edge cases
      expect(brotliResult.compressedSize).toBeLessThanOrEqual(gzipResult.compressedSize + 50);
    });

    it('should work with Buffer input', async () => {
      const buffer = Buffer.from('test content', 'utf8');
      const result = await compressBrotli(buffer);

      expect(result.data).toBeInstanceOf(Buffer);
    });
  });

  describe('generateCDNUrl', () => {
    it('should generate CDN URL with base URL and path', () => {
      const url = generateCDNUrl('https://cdn.example.com', '/assets/app.js');

      expect(url).toBe('https://cdn.example.com/assets/app.js');
    });

    it('should handle base URL with trailing slash', () => {
      const url = generateCDNUrl('https://cdn.example.com/', '/assets/app.js');

      expect(url).toBe('https://cdn.example.com/assets/app.js');
    });

    it('should handle path without leading slash', () => {
      const url = generateCDNUrl('https://cdn.example.com', 'assets/app.js');

      expect(url).toBe('https://cdn.example.com/assets/app.js');
    });

    it('should handle both trailing slash and no leading slash', () => {
      const url = generateCDNUrl('https://cdn.example.com/', 'assets/app.js');

      expect(url).toBe('https://cdn.example.com/assets/app.js');
    });
  });

  describe('prepareCDNResource', () => {
    it('should prepare resource with URL only', async () => {
      const content = 'test';
      const resource: CDNResource = await prepareCDNResource(
        content,
        '/app.js',
        { baseUrl: 'https://cdn.example.com' }
      );

      expect(resource.url).toBe('https://cdn.example.com/app.js');
      expect(resource.integrity).toBeUndefined();
      expect(resource.compressed).toBeUndefined();
    });

    it('should prepare resource with SRI', async () => {
      const content = 'test';
      const resource = await prepareCDNResource(
        content,
        '/app.js',
        { baseUrl: 'https://cdn.example.com', sri: true }
      );

      expect(resource.url).toBe('https://cdn.example.com/app.js');
      expect(resource.integrity).toBeTruthy();
      expect(resource.integrity).toMatch(/^sha384-/);
    });

    it('should prepare resource with custom SRI algorithm', async () => {
      const content = 'test';
      const resource = await prepareCDNResource(
        content,
        '/app.js',
        { baseUrl: 'https://cdn.example.com', sri: 'sha512' }
      );

      expect(resource.integrity).toMatch(/^sha512-/);
    });

    it('should prepare resource with gzip compression', async () => {
      const content = 'test content '.repeat(50);
      const resource = await prepareCDNResource(
        content,
        '/app.js',
        { compression: 'gzip' }
      );

      expect(resource.compressed).toBeDefined();
      expect(resource.compressed!.gzip).toBeDefined();
      expect(resource.compressed!.brotli).toBeUndefined();
    });

    it('should prepare resource with brotli compression', async () => {
      const content = 'test content '.repeat(50);
      const resource = await prepareCDNResource(
        content,
        '/app.js',
        { compression: 'brotli' }
      );

      expect(resource.compressed).toBeDefined();
      expect(resource.compressed!.brotli).toBeDefined();
      expect(resource.compressed!.gzip).toBeUndefined();
    });

    it('should prepare resource with both compressions', async () => {
      const content = 'test content '.repeat(50);
      const resource = await prepareCDNResource(
        content,
        '/app.js',
        { compression: 'both' }
      );

      expect(resource.compressed).toBeDefined();
      expect(resource.compressed!.gzip).toBeDefined();
      expect(resource.compressed!.brotli).toBeDefined();
    });

    it('should prepare resource with all features', async () => {
      const content = 'test content '.repeat(50);
      const resource = await prepareCDNResource(
        content,
        '/app.js',
        {
          baseUrl: 'https://cdn.example.com',
          sri: 'sha384',
          compression: 'both',
        }
      );

      expect(resource.url).toBe('https://cdn.example.com/app.js');
      expect(resource.integrity).toBeTruthy();
      expect(resource.compressed).toBeDefined();
      expect(resource.compressed!.gzip).toBeDefined();
      expect(resource.compressed!.brotli).toBeDefined();
    });

    it('should work without base URL', async () => {
      const content = 'test';
      const resource = await prepareCDNResource(content, '/app.js', { sri: true });

      expect(resource.url).toBe('/app.js');
      expect(resource.integrity).toBeTruthy();
    });
  });

  describe('generateScriptTag', () => {
    it('should generate basic script tag', () => {
      const resource: CDNResource = {
        url: 'https://cdn.example.com/app.js',
      };

      const tag = generateScriptTag(resource);

      expect(tag).toBe('<script src="https://cdn.example.com/app.js"></script>');
    });

    it('should generate script tag with SRI', () => {
      const resource: CDNResource = {
        url: 'https://cdn.example.com/app.js',
        integrity: 'sha384-abc123',
      };

      const tag = generateScriptTag(resource);

      expect(tag).toContain('src="https://cdn.example.com/app.js"');
      expect(tag).toContain('integrity="sha384-abc123"');
      expect(tag).toContain('crossorigin="anonymous"');
    });

    it('should generate script tag with async', () => {
      const resource: CDNResource = {
        url: 'https://cdn.example.com/app.js',
      };

      const tag = generateScriptTag(resource, { async: true });

      expect(tag).toContain('async');
    });

    it('should generate script tag with defer', () => {
      const resource: CDNResource = {
        url: 'https://cdn.example.com/app.js',
      };

      const tag = generateScriptTag(resource, { defer: true });

      expect(tag).toContain('defer');
    });

    it('should generate script tag with all attributes', () => {
      const resource: CDNResource = {
        url: 'https://cdn.example.com/app.js',
        integrity: 'sha384-abc123',
      };

      const tag = generateScriptTag(resource, { async: true, defer: true });

      expect(tag).toContain('src=');
      expect(tag).toContain('integrity=');
      expect(tag).toContain('crossorigin=');
      expect(tag).toContain('async');
      expect(tag).toContain('defer');
    });
  });

  describe('generateLinkTag', () => {
    it('should generate basic link tag for stylesheet', () => {
      const resource: CDNResource = {
        url: 'https://cdn.example.com/styles.css',
      };

      const tag = generateLinkTag(resource);

      expect(tag).toContain('rel="stylesheet"');
      expect(tag).toContain('href="https://cdn.example.com/styles.css"');
    });

    it('should generate link tag with SRI', () => {
      const resource: CDNResource = {
        url: 'https://cdn.example.com/styles.css',
        integrity: 'sha384-abc123',
      };

      const tag = generateLinkTag(resource);

      expect(tag).toContain('href="https://cdn.example.com/styles.css"');
      expect(tag).toContain('integrity="sha384-abc123"');
      expect(tag).toContain('crossorigin="anonymous"');
    });

    it('should generate link tag with custom rel', () => {
      const resource: CDNResource = {
        url: 'https://cdn.example.com/icon.png',
      };

      const tag = generateLinkTag(resource, 'icon');

      expect(tag).toContain('rel="icon"');
      expect(tag).toContain('href="https://cdn.example.com/icon.png"');
    });
  });

  describe('normalizeCDNOptions', () => {
    it('should normalize true to SRI enabled', () => {
      const options = normalizeCDNOptions(true);

      expect(options.sri).toBe(true);
      expect(options.baseUrl).toBeUndefined();
    });

    it('should normalize false to SRI disabled', () => {
      const options = normalizeCDNOptions(false);

      expect(options.sri).toBe(false);
    });

    it('should normalize undefined to SRI disabled', () => {
      const options = normalizeCDNOptions(undefined);

      expect(options.sri).toBe(false);
    });

    it('should preserve partial options', () => {
      const options = normalizeCDNOptions({
        baseUrl: 'https://cdn.example.com',
        sri: 'sha512',
      });

      expect(options.baseUrl).toBe('https://cdn.example.com');
      expect(options.sri).toBe('sha512');
    });

    it('should preserve compression option', () => {
      const options = normalizeCDNOptions({ compression: 'both' });

      expect(options.compression).toBe('both');
    });

    it('should preserve verbose option', () => {
      const options = normalizeCDNOptions({ verbose: true });

      expect(options.verbose).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should create production-ready CDN resource', async () => {
      const scriptContent = 'function app() { console.log("Hello"); }';

      const resource = await prepareCDNResource(
        scriptContent,
        '/js/app.js',
        {
          baseUrl: 'https://cdn.example.com',
          sri: 'sha384',
          compression: 'both',
        }
      );

      // Verify all features
      expect(resource.url).toBe('https://cdn.example.com/js/app.js');
      expect(resource.integrity).toMatch(/^sha384-/);
      expect(resource.compressed?.gzip).toBeDefined();
      expect(resource.compressed?.brotli).toBeDefined();

      // Generate tag
      const tag = generateScriptTag(resource, { async: true });
      expect(tag).toContain('src="https://cdn.example.com/js/app.js"');
      expect(tag).toContain('integrity="');
      expect(tag).toContain('crossorigin="anonymous"');
      expect(tag).toContain('async');
    });
  });
});
