/**
 * Integration test for production optimizations (Tasks 34-36)
 *
 * Tests the complete production optimization pipeline:
 * - Minification (HTML, CSS, JS)
 * - CDN URL generation and SRI hashes
 * - Performance tracking and reporting
 */

import { minifyHTML, minifyCSS, minifyJS, minifyDocument } from '../src/features/ui/ui-minifier.js';
import {
  calculateSRI,
  compressGzip,
  compressBrotli,
  prepareCDNResource,
  generateScriptTag,
  generateLinkTag,
} from '../src/features/ui/ui-cdn.js';
import {
  getPerformanceTracker,
  trackPerformance,
  recordCacheAccess,
} from '../src/features/ui/ui-performance.js';
import {
  generatePerformanceReport,
  formatConsoleReport,
  formatJSONReport,
  formatMarkdownReport,
  printPerformanceReport,
} from '../src/features/ui/ui-performance-reporter.js';

console.log('========================================');
console.log('PRODUCTION OPTIMIZATIONS INTEGRATION TEST');
console.log('========================================\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ ${testName}`);
      passed++;
    } else {
      console.error(`✗ ${testName}`);
      failed++;
    }
  }

  // Initialize performance tracker
  const tracker = getPerformanceTracker();
  tracker.clear();
  tracker.enable();

  console.log('Test 1: HTML Minification');
  console.log('─'.repeat(40));
  {
    const completeMinification = trackPerformance('minification', 'test.html');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <h1>Hello World</h1>
          <p>This is a test paragraph with     extra   spaces.</p>
        </body>
      </html>
    `;

    const result = await minifyHTML(html);

    completeMinification({ size: { original: result.originalSize, processed: result.minifiedSize } });

    assert(result.code.length > 0, 'HTML minified successfully');
    assert(result.minifiedSize < result.originalSize, 'HTML size reduced');
    assert(result.savings > 0, 'HTML has savings');
    assert(result.savingsPercent > 0, 'HTML has savings percentage');
    console.log(`  Original: ${result.originalSize} bytes`);
    console.log(`  Minified: ${result.minifiedSize} bytes`);
    console.log(`  Savings: ${result.savings} bytes (${result.savingsPercent.toFixed(1)}%)\n`);
  }

  console.log('Test 2: CSS Minification');
  console.log('─'.repeat(40));
  {
    const completeMinification = trackPerformance('minification', 'test.css');

    const css = `
      .button {
        color: #ffffff;
        padding: 10px;
        margin: 5px;
      }
      .container {
        width: 100%;
        max-width: 1200px;
      }
    `;

    const result = await minifyCSS(css);

    completeMinification({ size: { original: result.originalSize, processed: result.minifiedSize } });

    assert(result.code.length > 0, 'CSS minified successfully');
    assert(result.minifiedSize < result.originalSize, 'CSS size reduced');
    assert(result.code.includes('#fff'), 'CSS colors optimized');
    console.log(`  Original: ${result.originalSize} bytes`);
    console.log(`  Minified: ${result.minifiedSize} bytes`);
    console.log(`  Savings: ${result.savingsPercent.toFixed(1)}%\n`);
  }

  console.log('Test 3: JavaScript Minification');
  console.log('─'.repeat(40));
  {
    const completeMinification = trackPerformance('minification', 'test.js');

    const js = `
      function calculateSum(a, b) {
        const result = a + b;
        console.log("Calculating sum:", result);
        return result;
      }

      const myVariable = 42;
    `;

    const result = await minifyJS(js);

    completeMinification({ size: { original: result.originalSize, processed: result.minifiedSize } });

    assert(result.code.length > 0, 'JS minified successfully');
    assert(result.minifiedSize < result.originalSize, 'JS size reduced');
    assert(!result.code.includes('  '), 'JS whitespace removed');
    console.log(`  Original: ${result.originalSize} bytes`);
    console.log(`  Minified: ${result.minifiedSize} bytes`);
    console.log(`  Savings: ${result.savingsPercent.toFixed(1)}%\n`);
  }

  console.log('Test 4: Complete Document Minification');
  console.log('─'.repeat(40));
  {
    const doc = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; }
            .container { width: 100%; color: #ffffff; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Welcome</h1>
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

    const result = await minifyDocument(doc, {
      html: true,
      css: true,
      js: true,
    });

    assert(result.code.length > 0, 'Document minified successfully');
    assert(result.minifiedSize < result.originalSize, 'Document size reduced');
    assert(result.savingsPercent > 10, 'Document has significant savings (>10%)');
    console.log(`  Original: ${result.originalSize} bytes`);
    console.log(`  Minified: ${result.minifiedSize} bytes`);
    console.log(`  Total Savings: ${result.savingsPercent.toFixed(1)}%\n`);
  }

  console.log('Test 5: SRI Hash Generation');
  console.log('─'.repeat(40));
  {
    const content = 'console.log("test");';

    const sri256 = calculateSRI(content, 'sha256');
    const sri384 = calculateSRI(content, 'sha384');
    const sri512 = calculateSRI(content, 'sha512');

    assert(sri256.algorithm === 'sha256', 'SHA-256 algorithm set correctly');
    assert(sri256.integrity.startsWith('sha256-'), 'SHA-256 integrity format correct');

    assert(sri384.algorithm === 'sha384', 'SHA-384 algorithm set correctly');
    assert(sri384.integrity.startsWith('sha384-'), 'SHA-384 integrity format correct');

    assert(sri512.algorithm === 'sha512', 'SHA-512 algorithm set correctly');
    assert(sri512.integrity.startsWith('sha512-'), 'SHA-512 integrity format correct');

    console.log(`  SHA-256: ${sri256.integrity.substring(0, 30)}...`);
    console.log(`  SHA-384: ${sri384.integrity.substring(0, 30)}...`);
    console.log(`  SHA-512: ${sri512.integrity.substring(0, 30)}...\n`);
  }

  console.log('Test 6: Gzip Compression');
  console.log('─'.repeat(40));
  {
    const completeCompression = trackPerformance('compression', 'test.js');

    const content = 'test content '.repeat(100);
    const result = await compressGzip(content);

    completeCompression({
      size: { original: result.originalSize, processed: result.compressedSize },
    });

    assert(result.type === 'gzip', 'Compression type is gzip');
    assert(result.compressedSize < result.originalSize, 'Gzip reduced size');
    assert(result.compressionRatio > 0, 'Gzip has compression ratio');
    assert(Buffer.isBuffer(result.data), 'Gzip output is Buffer');
    console.log(`  Original: ${result.originalSize} bytes`);
    console.log(`  Compressed: ${result.compressedSize} bytes`);
    console.log(`  Ratio: ${(result.compressionRatio * 100).toFixed(1)}%\n`);
  }

  console.log('Test 7: Brotli Compression');
  console.log('─'.repeat(40));
  {
    const completeCompression = trackPerformance('compression', 'test.js');

    const content = 'test content '.repeat(100);
    const result = await compressBrotli(content);

    completeCompression({
      size: { original: result.originalSize, processed: result.compressedSize },
    });

    assert(result.type === 'brotli', 'Compression type is brotli');
    assert(result.compressedSize < result.originalSize, 'Brotli reduced size');
    assert(result.compressionRatio > 0, 'Brotli has compression ratio');
    assert(Buffer.isBuffer(result.data), 'Brotli output is Buffer');
    console.log(`  Original: ${result.originalSize} bytes`);
    console.log(`  Compressed: ${result.compressedSize} bytes`);
    console.log(`  Ratio: ${(result.compressionRatio * 100).toFixed(1)}%\n`);
  }

  console.log('Test 8: CDN Resource Preparation');
  console.log('─'.repeat(40));
  {
    const scriptContent = 'function app() { console.log("Hello"); }';

    const resource = await prepareCDNResource(scriptContent, '/js/app.js', {
      baseUrl: 'https://cdn.example.com',
      sri: 'sha384',
      compression: 'both',
    });

    assert(resource.url === 'https://cdn.example.com/js/app.js', 'CDN URL generated');
    assert(resource.integrity !== undefined, 'SRI hash generated');
    assert(resource.integrity!.startsWith('sha384-'), 'SRI uses correct algorithm');
    assert(resource.compressed !== undefined, 'Compression applied');
    assert(resource.compressed!.gzip !== undefined, 'Gzip compression included');
    assert(resource.compressed!.brotli !== undefined, 'Brotli compression included');
    console.log(`  URL: ${resource.url}`);
    console.log(`  Integrity: ${resource.integrity?.substring(0, 30)}...`);
    console.log(`  Gzip: ${resource.compressed!.gzip!.compressedSize} bytes`);
    console.log(`  Brotli: ${resource.compressed!.brotli!.compressedSize} bytes\n`);
  }

  console.log('Test 9: Script Tag Generation');
  console.log('─'.repeat(40));
  {
    const resource = await prepareCDNResource(
      'test',
      '/app.js',
      { baseUrl: 'https://cdn.example.com', sri: 'sha384' }
    );

    const tag = generateScriptTag(resource, { async: true, defer: true });

    assert(tag.includes('src="https://cdn.example.com/app.js"'), 'Script tag has src');
    assert(tag.includes('integrity='), 'Script tag has integrity');
    assert(tag.includes('crossorigin="anonymous"'), 'Script tag has crossorigin');
    assert(tag.includes('async'), 'Script tag has async');
    assert(tag.includes('defer'), 'Script tag has defer');
    console.log(`  ${tag}\n`);
  }

  console.log('Test 10: Link Tag Generation');
  console.log('─'.repeat(40));
  {
    const resource = await prepareCDNResource(
      'test',
      '/styles.css',
      { baseUrl: 'https://cdn.example.com', sri: 'sha384' }
    );

    const tag = generateLinkTag(resource);

    assert(tag.includes('rel="stylesheet"'), 'Link tag has rel');
    assert(tag.includes('href="https://cdn.example.com/styles.css"'), 'Link tag has href');
    assert(tag.includes('integrity='), 'Link tag has integrity');
    assert(tag.includes('crossorigin="anonymous"'), 'Link tag has crossorigin');
    console.log(`  ${tag}\n`);
  }

  console.log('Test 11: Performance Tracking');
  console.log('─'.repeat(40));
  {
    // Record cache accesses
    recordCacheAccess('./react', true, 'react');
    recordCacheAccess('./react-dom', true, 'react-dom');
    recordCacheAccess('./lodash', false, 'lodash');

    // Track compilation
    const completeCompilation = trackPerformance('compilation', './App.tsx');
    completeCompilation({ size: { original: 5000, processed: 4500 } });

    // Track bundling
    const completeBundling = trackPerformance('bundling', './App.tsx');
    completeBundling({ size: { original: 4500, processed: 3000 } });

    const metrics = tracker.getMetrics();

    assert(metrics.length > 0, 'Metrics recorded');
    assert(tracker.getMetricsByType('cache').length === 3, 'Cache metrics recorded');
    assert(tracker.getMetricsByType('compilation').length >= 1, 'Compilation metrics recorded');
    assert(tracker.getMetricsByType('bundling').length >= 1, 'Bundling metrics recorded');
    console.log(`  Total metrics: ${metrics.length}`);
    console.log(`  Cache metrics: ${tracker.getMetricsByType('cache').length}`);
    console.log(`  Compilation metrics: ${tracker.getMetricsByType('compilation').length}`);
    console.log(`  Bundling metrics: ${tracker.getMetricsByType('bundling').length}\n`);
  }

  console.log('Test 12: Performance Summary');
  console.log('─'.repeat(40));
  {
    const summary = tracker.getSummary();

    assert(summary.totalMetrics > 0, 'Summary has total metrics');
    assert(summary.cache.hits > 0, 'Summary has cache hits');
    assert(summary.cache.misses > 0, 'Summary has cache misses');
    assert(summary.cache.hitRate > 0, 'Summary has cache hit rate');
    assert(summary.size.totalSavings > 0, 'Summary has total savings');
    console.log(`  Total Metrics: ${summary.totalMetrics}`);
    console.log(`  Cache Hit Rate: ${(summary.cache.hitRate * 100).toFixed(1)}%`);
    console.log(`  Total Savings: ${summary.size.totalSavings} bytes (${summary.size.savingsPercent.toFixed(1)}%)\n`);
  }

  console.log('Test 13: Performance Report Generation');
  console.log('─'.repeat(40));
  {
    const report = generatePerformanceReport({
      includeMetrics: true,
      includeWarnings: true,
      thresholds: {
        maxBundleSize: 500000,
        maxCompilationTime: 5000,
      },
    });

    assert(report.timestamp > 0, 'Report has timestamp');
    assert(report.summary !== undefined, 'Report has summary');
    assert(report.metrics !== undefined, 'Report has metrics');
    assert(Array.isArray(report.metrics), 'Metrics is array');
    console.log(`  Report generated at: ${new Date(report.timestamp).toISOString()}`);
    console.log(`  Metrics included: ${report.metrics!.length}`);
    console.log(`  Warnings: ${report.warnings?.length || 0}\n`);
  }

  console.log('Test 14: Console Report Formatting');
  console.log('─'.repeat(40));
  {
    const report = generatePerformanceReport();
    const output = formatConsoleReport(report);

    assert(output.length > 0, 'Console report generated');
    assert(output.includes('UI PERFORMANCE REPORT'), 'Console report has title');
    assert(output.includes('TIMING'), 'Console report has timing section');
    assert(output.includes('SIZE'), 'Console report has size section');
    assert(output.includes('CACHE'), 'Console report has cache section');
    console.log('  Console report formatted successfully\n');
  }

  console.log('Test 15: JSON Report Formatting');
  console.log('─'.repeat(40));
  {
    const report = generatePerformanceReport();
    const output = formatJSONReport(report);

    assert(output.length > 0, 'JSON report generated');

    let parsed;
    try {
      parsed = JSON.parse(output);
      assert(true, 'JSON report is valid JSON');
    } catch {
      assert(false, 'JSON report is valid JSON');
    }

    assert(parsed.summary !== undefined, 'JSON report has summary');
    console.log('  JSON report formatted successfully\n');
  }

  console.log('Test 16: Markdown Report Formatting');
  console.log('─'.repeat(40));
  {
    const report = generatePerformanceReport();
    const output = formatMarkdownReport(report);

    assert(output.length > 0, 'Markdown report generated');
    assert(output.includes('# UI Performance Report'), 'Markdown report has title');
    assert(output.includes('##'), 'Markdown report has sections');
    assert(output.includes('|'), 'Markdown report has tables');
    console.log('  Markdown report formatted successfully\n');
  }

  // Print final performance report
  console.log('\n' + '='.repeat(80));
  console.log('FINAL PERFORMANCE REPORT');
  console.log('='.repeat(80));
  printPerformanceReport({ format: 'console', verbose: false });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(80) + '\n');

  if (failed === 0) {
    console.log('✓ ALL TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error(`✗ ${failed} TEST(S) FAILED!\n`);
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
