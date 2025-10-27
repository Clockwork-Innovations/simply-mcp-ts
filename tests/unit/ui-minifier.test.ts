/**
 * Unit tests for ui-minifier module
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  minifyHTML,
  minifyCSS,
  minifyJS,
  minifyDocument,
  normalizeMinifyOptions,
  type MinifyResult,
  type MinifyOptions,
} from '../../src/features/ui/ui-minifier.js';

describe('UI Minifier', () => {
  describe('minifyHTML', () => {
    it('should minify HTML and remove whitespace', async () => {
      const html = `
        <html>
          <body>
            <h1>Hello World</h1>
            <p>  Test paragraph  </p>
          </body>
        </html>
      `;

      const result: MinifyResult = await minifyHTML(html);

      expect(result.code).toBeTruthy();
      expect(result.code.length).toBeLessThan(html.length);
      expect(result.minifiedSize).toBeLessThan(result.originalSize);
      expect(result.savings).toBeGreaterThan(0);
      expect(result.savingsPercent).toBeGreaterThan(0);
      expect(result.warnings).toEqual([]);
    });

    it('should remove HTML comments', async () => {
      const html = '<!-- Comment --><div>Content</div>';

      const result = await minifyHTML(html);

      expect(result.code).not.toContain('Comment');
      expect(result.code).toContain('Content');
    });

    it('should preserve functionality', async () => {
      const html = '<input type="text" required>';

      const result = await minifyHTML(html);

      expect(result.code).toContain('required');
      // Note: type="text" may be removed as it's the default for input elements
      expect(result.code).toContain('input');
    });

    it('should handle empty HTML', async () => {
      const result = await minifyHTML('');

      expect(result.code).toBe('');
      expect(result.originalSize).toBe(0);
    });
  });

  describe('minifyCSS', () => {
    it('should minify CSS and remove whitespace', async () => {
      const css = `
        .button {
          color: #ffffff;
          padding: 10px;
          margin: 5px;
        }
      `;

      const result: MinifyResult = await minifyCSS(css);

      expect(result.code).toBeTruthy();
      expect(result.code.length).toBeLessThan(css.length);
      expect(result.minifiedSize).toBeLessThan(result.originalSize);
      expect(result.savings).toBeGreaterThan(0);
    });

    it('should optimize color values', async () => {
      const css = '.test { color: #ffffff; }';

      const result = await minifyCSS(css);

      expect(result.code).toContain('#fff');
      expect(result.code).not.toContain('#ffffff');
    });

    it('should handle CSS warnings gracefully', async () => {
      const css = '.valid { color: red; }';

      const result = await minifyCSS(css);

      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should handle empty CSS', async () => {
      const result = await minifyCSS('');

      expect(result.code).toBe('');
      expect(result.originalSize).toBe(0);
    });
  });

  describe('minifyJS', () => {
    it('should minify JavaScript', async () => {
      const js = `
        function hello() {
          console.log("Hello World");
          return true;
        }
      `;

      const result: MinifyResult = await minifyJS(js);

      expect(result.code).toBeTruthy();
      expect(result.code.length).toBeLessThan(js.length);
      expect(result.minifiedSize).toBeLessThan(result.originalSize);
      expect(result.savings).toBeGreaterThan(0);
    });

    it('should mangle variable names', async () => {
      const js = 'function test() { const longVariableName = 42; return longVariableName; }';

      const result = await minifyJS(js);

      // Variable names should be shortened
      expect(result.code.length).toBeLessThan(js.length);
    });

    it('should preserve console.log by default', async () => {
      const js = 'console.log("test");';

      const result = await minifyJS(js);

      expect(result.code).toContain('console.log');
    });

    it('should remove debugger statements', async () => {
      const js = 'debugger; console.log("test");';

      const result = await minifyJS(js);

      expect(result.code).not.toContain('debugger');
      expect(result.code).toContain('console.log');
    });

    it('should handle empty JavaScript', async () => {
      // Empty JS will fail minification since terser expects valid code
      await expect(minifyJS('')).rejects.toThrow();
    });
  });

  describe('minifyDocument', () => {
    it('should minify complete HTML document', async () => {
      const doc = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              .button { color: #ffffff; }
            </style>
          </head>
          <body>
            <script>
              function test() { console.log("test"); }
            </script>
          </body>
        </html>
      `;

      const result = await minifyDocument(doc, {
        html: true,
        css: true,
        js: true,
      });

      expect(result.code).toBeTruthy();
      expect(result.minifiedSize).toBeLessThan(result.originalSize);
      expect(result.savings).toBeGreaterThan(0);
    });

    it('should minify inline CSS separately', async () => {
      const doc = `
        <html>
          <head>
            <style>.test { color: #ffffff; }</style>
          </head>
        </html>
      `;

      const result = await minifyDocument(doc, { css: true });

      expect(result.code).toContain('#fff');
    });

    it('should minify inline JS separately', async () => {
      const doc = `
        <html>
          <body>
            <script>
              function hello() { console.log("test"); }
            </script>
          </body>
        </html>
      `;

      const result = await minifyDocument(doc, { js: true });

      expect(result.minifiedSize).toBeLessThan(result.originalSize);
    });

    it('should respect selective minification', async () => {
      const doc = `
        <html>
          <head><style>.test { color: red; }</style></head>
          <body><script>console.log("test");</script></body>
        </html>
      `;

      // Only minify HTML
      const result = await minifyDocument(doc, {
        html: true,
        css: false,
        js: false,
      });

      expect(result.minifiedSize).toBeLessThan(result.originalSize);
      // Styles and scripts should still be there
      expect(result.code).toContain('style');
      expect(result.code).toContain('script');
    });

    it('should handle documents with no inline CSS/JS', async () => {
      const doc = '<html><body><h1>Plain HTML</h1></body></html>';

      const result = await minifyDocument(doc);

      expect(result.code).toBeTruthy();
      expect(result.warnings).toBeDefined();
    });
  });

  describe('normalizeMinifyOptions', () => {
    it('should normalize true to all enabled', () => {
      const options = normalizeMinifyOptions(true);

      expect(options.html).toBe(true);
      expect(options.css).toBe(true);
      expect(options.js).toBe(true);
    });

    it('should normalize false to all disabled', () => {
      const options = normalizeMinifyOptions(false);

      expect(options.html).toBe(false);
      expect(options.css).toBe(false);
      expect(options.js).toBe(false);
    });

    it('should normalize undefined to all disabled', () => {
      const options = normalizeMinifyOptions(undefined);

      expect(options.html).toBe(false);
      expect(options.css).toBe(false);
      expect(options.js).toBe(false);
    });

    it('should normalize partial options', () => {
      const options = normalizeMinifyOptions({ html: false, css: true });

      expect(options.html).toBe(false);
      expect(options.css).toBe(true);
      expect(options.js).toBe(true); // Default
    });

    it('should preserve verbose option', () => {
      const options = normalizeMinifyOptions({ verbose: true });

      expect(options.verbose).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should provide meaningful savings metrics', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <title>Test Page</title>
            <style>
              body { margin: 0; padding: 0; }
              .container { width: 100%; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Welcome</h1>
              <p>This is a test page with various elements.</p>
            </div>
            <script>
              function initialize() {
                console.log("Page loaded");
              }
              initialize();
            </script>
          </body>
        </html>
      `;

      const result = await minifyDocument(html, {
        html: true,
        css: true,
        js: true,
      });

      expect(result.savingsPercent).toBeGreaterThan(10); // At least 10% savings
      expect(result.savings).toBeGreaterThan(0);
      expect(result.originalSize).toBeGreaterThan(result.minifiedSize);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed HTML gracefully', async () => {
      // This should not throw, but may return original content
      const malformed = '<html><body><div>Unclosed';

      await expect(minifyHTML(malformed)).resolves.toBeDefined();
    });

    it('should handle malformed CSS gracefully', async () => {
      const malformed = '.test { color: ; }'; // Invalid property value

      await expect(minifyCSS(malformed)).resolves.toBeDefined();
    });

    it('should handle malformed JavaScript gracefully', async () => {
      const malformed = 'function test() { // Unclosed function';

      // Should throw with helpful error message
      await expect(minifyJS(malformed)).rejects.toThrow();
    });
  });
});
