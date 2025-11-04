/**
 * Source Detector Unit Tests
 *
 * Comprehensive tests for source type detection in IUI v4.0
 */

import { describe, it, expect } from '@jest/globals';
import {
  detectSourceType,
  batchDetectSourceType,
  type DetectionResult,
  type SourceType
} from '../../src/features/ui/source-detector.js';

describe('Source Detector', () => {

  // ============================================================================
  // URL Detection Tests
  // ============================================================================

  describe('URL Detection', () => {
    it('should detect HTTPS URLs with 1.0 confidence', () => {
      const result = detectSourceType('https://example.com/dashboard', {
        checkFileSystem: false
      });

      expect(result.type).toBe('url');
      expect(result.confidence).toBe(1.0);
      expect(result.source).toBe('https://example.com/dashboard');
      expect(result.reason).toContain('http');
    });

    it('should detect HTTP URLs', () => {
      const result = detectSourceType('http://analytics.example.com', {
        checkFileSystem: false
      });

      expect(result.type).toBe('url');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect protocol-relative URLs', () => {
      const result = detectSourceType('//cdn.example.com/widget.html', {
        checkFileSystem: false
      });

      expect(result.type).toBe('url');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect URLs with query parameters', () => {
      const result = detectSourceType('https://example.com/dashboard?tab=overview', {
        checkFileSystem: false
      });

      expect(result.type).toBe('url');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect URLs with fragments', () => {
      const result = detectSourceType('https://example.com/docs#section-1', {
        checkFileSystem: false
      });

      expect(result.type).toBe('url');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect URLs with ports', () => {
      const result = detectSourceType('http://localhost:3000/dashboard', {
        checkFileSystem: false
      });

      expect(result.type).toBe('url');
      expect(result.confidence).toBe(1.0);
    });
  });

  // ============================================================================
  // Inline HTML Detection Tests
  // ============================================================================

  describe('Inline HTML Detection', () => {
    it('should detect simple HTML div', () => {
      const result = detectSourceType('<div>Hello World</div>', {
        checkFileSystem: false
      });

      expect(result.type).toBe('inline-html');
      expect(result.confidence).toBe(1.0);
      expect(result.reason).toContain('HTML');
    });

    it('should detect HTML with DOCTYPE', () => {
      const result = detectSourceType('<!DOCTYPE html><html><body>Content</body></html>', {
        checkFileSystem: false
      });

      expect(result.type).toBe('inline-html');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect multi-line HTML', () => {
      const html = `
        <div class="dashboard">
          <h1>Analytics</h1>
          <p>Stats here</p>
        </div>
      `;

      const result = detectSourceType(html, {
        checkFileSystem: false
      });

      expect(result.type).toBe('inline-html');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect HTML with various tags', () => {
      const testCases = [
        '<span>Text</span>',
        '<p>Paragraph</p>',
        '<h1>Heading</h1>',
        '<html><body></body></html>',
        '<head><title>Page</title></head>',
      ];

      testCases.forEach((html) => {
        const result = detectSourceType(html, {
          checkFileSystem: false
        });

        expect(result.type).toBe('inline-html');
        expect(result.confidence).toBe(1.0);
      });
    });

    it('should detect DOCTYPE with different cases', () => {
      const testCases = [
        '<!DOCTYPE html>',
        '<!doctype html>',
        '<!DoCtYpE html>',
      ];

      testCases.forEach((html) => {
        const result = detectSourceType(html, {
          checkFileSystem: false
        });

        expect(result.type).toBe('inline-html');
      });
    });

    it('should detect HTML with leading whitespace', () => {
      const result = detectSourceType('   <div>Content</div>', {
        checkFileSystem: false
      });

      expect(result.type).toBe('inline-html');
      expect(result.confidence).toBe(1.0);
    });
  });

  // ============================================================================
  // Remote DOM JSON Detection Tests
  // ============================================================================

  describe('Remote DOM JSON Detection', () => {
    it('should detect simple Remote DOM JSON', () => {
      const json = '{"type":"div","properties":{"className":"container"},"children":["Hello"]}';

      const result = detectSourceType(json, {
        checkFileSystem: false
      });

      expect(result.type).toBe('inline-remote-dom');
      expect(result.confidence).toBe(0.9);
      expect(result.reason).toContain('Remote DOM');
    });

    it('should detect Remote DOM with nested children', () => {
      const json = JSON.stringify({
        type: 'div',
        properties: { id: 'root' },
        children: [
          { type: 'h1', children: ['Title'] },
          { type: 'p', children: ['Paragraph'] },
        ],
      });

      const result = detectSourceType(json, {
        checkFileSystem: false
      });

      expect(result.type).toBe('inline-remote-dom');
      expect(result.confidence).toBe(0.9);
    });

    it('should detect minimal Remote DOM object', () => {
      const json = '{"type":"div"}';

      const result = detectSourceType(json, {
        checkFileSystem: false
      });

      expect(result.type).toBe('inline-remote-dom');
    });

    it('should NOT detect JSON without type field', () => {
      const json = '{"name":"John","age":30}';

      const result = detectSourceType(json, {
        checkFileSystem: false
      });

      expect(result.type).not.toBe('inline-remote-dom');
    });

    it('should NOT detect malformed JSON', () => {
      const json = '{type:"div"}'; // Missing quotes

      const result = detectSourceType(json, {
        checkFileSystem: false
      });

      expect(result.type).not.toBe('inline-remote-dom');
    });

    it('should handle JSON with whitespace', () => {
      const json = `
        {
          "type": "div",
          "properties": {
            "className": "container"
          }
        }
      `;

      const result = detectSourceType(json, {
        checkFileSystem: false
      });

      expect(result.type).toBe('inline-remote-dom');
    });
  });

  // ============================================================================
  // File Path Detection Tests (Extension-based, no FS check)
  // ============================================================================

  describe('File Path Detection (Extension-based)', () => {
    describe('React Component Files', () => {
      it('should detect .tsx files', () => {
        const result = detectSourceType('./components/Dashboard.tsx', {
          checkFileSystem: false
        });

        expect(result.type).toBe('file-component');
        expect(result.extension).toBe('.tsx');
        expect(result.confidence).toBe(0.8); // Medium confidence without FS check
        expect(result.reason).toContain('tsx');
      });

      it('should detect .jsx files', () => {
        const result = detectSourceType('./ui/Button.jsx', {
          checkFileSystem: false
        });

        expect(result.type).toBe('file-component');
        expect(result.extension).toBe('.jsx');
        expect(result.confidence).toBe(0.8);
      });

      it('should detect relative paths with ../', () => {
        const result = detectSourceType('../shared/Component.tsx', {
          checkFileSystem: false
        });

        expect(result.type).toBe('file-component');
      });

      it('should detect absolute paths', () => {
        const result = detectSourceType('/usr/src/components/Dashboard.tsx', {
          checkFileSystem: false
        });

        expect(result.type).toBe('file-component');
      });
    });

    describe('HTML Files', () => {
      it('should detect .html files', () => {
        const result = detectSourceType('./pages/index.html', {
          checkFileSystem: false
        });

        expect(result.type).toBe('file-html');
        expect(result.extension).toBe('.html');
        expect(result.confidence).toBe(0.8);
      });

      it('should detect .htm files', () => {
        const result = detectSourceType('./pages/about.htm', {
          checkFileSystem: false
        });

        expect(result.type).toBe('file-html');
        expect(result.extension).toBe('.htm');
      });

      it('should detect relative HTML paths', () => {
        const result = detectSourceType('../ui/page.html', {
          checkFileSystem: false
        });

        expect(result.type).toBe('file-html');
      });
    });

    describe('Folder Detection', () => {
      it('should detect folder with trailing slash', () => {
        const result = detectSourceType('./ui/dashboard/', {
          checkFileSystem: false
        });

        expect(result.type).toBe('folder');
        expect(result.confidence).toBe(0.7); // Medium confidence (could be URL path)
        expect(result.reason).toContain('slash');
      });

      it('should detect folder with backslash (Windows)', () => {
        const result = detectSourceType('.\\ui\\dashboard\\', {
          checkFileSystem: false
        });

        expect(result.type).toBe('folder');
        expect(result.confidence).toBe(0.7);
      });

      it('should detect absolute folder paths', () => {
        const result = detectSourceType('/home/user/ui/', {
          checkFileSystem: false
        });

        expect(result.type).toBe('folder');
      });
    });
  });

  // ============================================================================
  // Edge Cases and Ambiguous Inputs
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = detectSourceType('', {
        checkFileSystem: false
      });

      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0.0);
    });

    it('should handle whitespace-only string', () => {
      const result = detectSourceType('   \n\t   ', {
        checkFileSystem: false
      });

      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0.0);
    });

    it('should handle plain text', () => {
      const result = detectSourceType('random text without patterns', {
        checkFileSystem: false
      });

      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0.0);
      expect(result.reason).toContain('Could not determine');
    });

    it('should handle file path without extension', () => {
      const result = detectSourceType('./components/Dashboard', {
        checkFileSystem: false
      });

      expect(result.type).toBe('unknown');
    });

    it('should handle numbers', () => {
      const result = detectSourceType('12345', {
        checkFileSystem: false
      });

      expect(result.type).toBe('unknown');
    });

    it('should prioritize URL over file path', () => {
      // URL with .tsx extension should still be detected as URL
      const result = detectSourceType('https://example.com/Component.tsx', {
        checkFileSystem: false
      });

      expect(result.type).toBe('url');
      expect(result.confidence).toBe(1.0);
    });

    it('should prioritize inline HTML over file path', () => {
      // HTML content should be detected even with file-like appearance
      const result = detectSourceType('<div>./file.html</div>', {
        checkFileSystem: false
      });

      expect(result.type).toBe('inline-html');
    });

    it('should handle very long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000);

      const result = detectSourceType(longUrl, {
        checkFileSystem: false
      });

      expect(result.type).toBe('url');
    });

    it('should handle very long HTML', () => {
      const longHtml = '<div>' + 'content '.repeat(500) + '</div>';

      const result = detectSourceType(longHtml, {
        checkFileSystem: false
      });

      expect(result.type).toBe('inline-html');
    });
  });

  // ============================================================================
  // Confidence Scoring Tests
  // ============================================================================

  describe('Confidence Scoring', () => {
    it('should return 1.0 confidence for URLs', () => {
      const result = detectSourceType('https://example.com', {
        checkFileSystem: false
      });

      expect(result.confidence).toBe(1.0);
    });

    it('should return 1.0 confidence for inline HTML', () => {
      const result = detectSourceType('<div>Content</div>', {
        checkFileSystem: false
      });

      expect(result.confidence).toBe(1.0);
    });

    it('should return 0.9 confidence for Remote DOM JSON', () => {
      const result = detectSourceType('{"type":"div"}', {
        checkFileSystem: false
      });

      expect(result.confidence).toBe(0.9);
    });

    it('should return 0.8 confidence for file paths without FS check', () => {
      const result = detectSourceType('./Dashboard.tsx', {
        checkFileSystem: false
      });

      expect(result.confidence).toBe(0.8);
    });

    it('should return 0.7 confidence for folders with trailing slash', () => {
      const result = detectSourceType('./ui/', {
        checkFileSystem: false
      });

      expect(result.confidence).toBe(0.7);
    });

    it('should return 0.0 confidence for unknown types', () => {
      const result = detectSourceType('unknown content', {
        checkFileSystem: false
      });

      expect(result.confidence).toBe(0.0);
    });
  });

  // ============================================================================
  // Options Testing
  // ============================================================================

  describe('Options', () => {
    it('should use default options when none provided', () => {
      const result = detectSourceType('https://example.com');

      expect(result.type).toBe('url');
      // Should not throw error
    });

    it('should respect checkFileSystem: false option', () => {
      const result = detectSourceType('./nonexistent.tsx', {
        checkFileSystem: false
      });

      // Should detect by extension only
      expect(result.type).toBe('file-component');
      expect(result.resolvedPath).toBeUndefined();
    });

    it('should skip filesystem check for inline content even when checkFileSystem: true', () => {
      const result = detectSourceType('<div>Content</div>', {
        checkFileSystem: true
      });

      expect(result.type).toBe('inline-html');
    });
  });

  // ============================================================================
  // Detection Result Structure Tests
  // ============================================================================

  describe('Detection Result Structure', () => {
    it('should always include type, source, confidence, and reason', () => {
      const result = detectSourceType('https://example.com', {
        checkFileSystem: false
      });

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reason');
    });

    it('should include extension for file types', () => {
      const result = detectSourceType('./Dashboard.tsx', {
        checkFileSystem: false
      });

      expect(result).toHaveProperty('extension');
      expect(result.extension).toBe('.tsx');
    });

    it('should include original source value', () => {
      const source = 'https://example.com/dashboard';
      const result = detectSourceType(source, {
        checkFileSystem: false
      });

      expect(result.source).toBe(source);
    });

    it('should provide meaningful reason messages', () => {
      const testCases = [
        { source: 'https://example.com', expectedKeyword: 'http' },
        { source: '<div>Test</div>', expectedKeyword: 'HTML' },
        { source: '{"type":"div"}', expectedKeyword: 'Remote DOM' },
        { source: './Component.tsx', expectedKeyword: 'tsx' },
        { source: './ui/', expectedKeyword: 'slash' },
        { source: 'unknown', expectedKeyword: 'Could not determine' },
      ];

      testCases.forEach(({ source, expectedKeyword }) => {
        const result = detectSourceType(source, {
          checkFileSystem: false
        });

        expect(result.reason.toLowerCase()).toContain(expectedKeyword.toLowerCase());
      });
    });
  });

  // ============================================================================
  // Batch Detection Tests
  // ============================================================================

  describe('Batch Detection', () => {
    it('should detect multiple sources at once', () => {
      const sources = [
        'https://example.com',
        '<div>HTML</div>',
        './Component.tsx',
        '{"type":"div"}',
        './ui/',
      ];

      const results = batchDetectSourceType(sources, {
        checkFileSystem: false
      });

      expect(results).toHaveLength(5);
      expect(results[0].type).toBe('url');
      expect(results[1].type).toBe('inline-html');
      expect(results[2].type).toBe('file-component');
      expect(results[3].type).toBe('inline-remote-dom');
      expect(results[4].type).toBe('folder');
    });

    it('should handle empty array', () => {
      const results = batchDetectSourceType([], {
        checkFileSystem: false
      });

      expect(results).toHaveLength(0);
    });

    it('should handle single source', () => {
      const results = batchDetectSourceType(['https://example.com'], {
        checkFileSystem: false
      });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('url');
    });

    it('should apply options to all sources', () => {
      const sources = ['./Component.tsx', './page.html'];

      const results = batchDetectSourceType(sources, {
        checkFileSystem: false
      });

      results.forEach((result) => {
        expect(result.resolvedPath).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // Real-World Scenarios
  // ============================================================================

  describe('Real-World Scenarios', () => {
    it('should handle typical dashboard URL', () => {
      const result = detectSourceType('https://analytics.company.com/dashboard?view=realtime', {
        checkFileSystem: false
      });

      expect(result.type).toBe('url');
    });

    it('should handle typical inline dashboard HTML', () => {
      const html = `
        <div class="dashboard">
          <div class="stats-grid">
            <div class="stat-card">
              <h3>Revenue</h3>
              <p class="value">$45,231</p>
            </div>
          </div>
        </div>
      `;

      const result = detectSourceType(html, {
        checkFileSystem: false
      });

      expect(result.type).toBe('inline-html');
    });

    it('should handle typical React component path', () => {
      const result = detectSourceType('./src/components/Dashboard/Dashboard.tsx', {
        checkFileSystem: false
      });

      expect(result.type).toBe('file-component');
    });

    it('should handle typical UI folder structure', () => {
      const result = detectSourceType('./ui/dashboard/', {
        checkFileSystem: false
      });

      expect(result.type).toBe('folder');
    });

    it('should handle CDN URLs for widgets', () => {
      const result = detectSourceType('https://cdn.example.com/widgets/analytics-v2.html', {
        checkFileSystem: false
      });

      expect(result.type).toBe('url');
    });

    it('should handle localhost development URLs', () => {
      const result = detectSourceType('http://localhost:3000/dashboard', {
        checkFileSystem: false
      });

      expect(result.type).toBe('url');
    });
  });

  // ============================================================================
  // Type Safety Tests
  // ============================================================================

  describe('Type Safety', () => {
    it('should return valid SourceType values', () => {
      const validTypes: SourceType[] = [
        'url',
        'inline-html',
        'inline-remote-dom',
        'file-html',
        'file-component',
        'folder',
        'unknown'
      ];

      const testSources = [
        'https://example.com',
        '<div>HTML</div>',
        '{"type":"div"}',
        './page.html',
        './Component.tsx',
        './ui/',
        'unknown content'
      ];

      testSources.forEach((source) => {
        const result = detectSourceType(source, {
          checkFileSystem: false
        });

        expect(validTypes).toContain(result.type);
      });
    });

    it('should have confidence between 0 and 1', () => {
      const testSources = [
        'https://example.com',
        '<div>Test</div>',
        './Component.tsx',
        'unknown'
      ];

      testSources.forEach((source) => {
        const result = detectSourceType(source, {
          checkFileSystem: false
        });

        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });
  });
});
