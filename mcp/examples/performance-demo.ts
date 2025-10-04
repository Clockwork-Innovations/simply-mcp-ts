/**
 * Performance Optimization Demo
 * Demonstrates the CLI performance cache and metrics
 */

import { detectAPIStyleCached, getPerformanceMetrics, getCacheStats, clearDetectionCache } from '../cli/performance-cache.js';

async function demo() {
  console.log('=== CLI Performance Cache Demo ===\n');

  const testFile = 'mcp/examples/simple-server.ts';

  // Clear cache to start fresh
  clearDetectionCache();
  console.log('1. Cache cleared\n');

  // First detection (cold - will read file)
  console.log('2. First detection (cold):');
  const start1 = performance.now();
  const style1 = await detectAPIStyleCached(testFile, true);
  const end1 = performance.now();
  console.log(`   Result: ${style1}`);
  console.log(`   Time: ${(end1 - start1).toFixed(2)}ms\n`);

  // Second detection (warm - cache hit)
  console.log('3. Second detection (cached):');
  const start2 = performance.now();
  const style2 = await detectAPIStyleCached(testFile, true);
  const end2 = performance.now();
  console.log(`   Result: ${style2}`);
  console.log(`   Time: ${(end2 - start2).toFixed(2)}ms\n`);

  // Show speedup
  const speedup = ((end1 - start1) / (end2 - start2)).toFixed(1);
  console.log(`4. Performance improvement: ${speedup}x faster\n`);

  // Show cache stats
  const stats = getCacheStats();
  console.log('5. Cache statistics:');
  console.log(`   Entries: ${stats.size}`);
  console.log(`   Files cached:`);
  for (const entry of stats.entries) {
    console.log(`     - ${entry.file}: ${entry.style}`);
  }
  console.log();

  // Show metrics
  const metrics = getPerformanceMetrics();
  console.log('6. Performance metrics:');
  console.log(`   Detection: ${metrics.detection.toFixed(2)}ms`);
  console.log(`   Load: ${metrics.load.toFixed(2)}ms`);
  console.log(`   Total: ${metrics.total.toFixed(2)}ms`);
  console.log();

  console.log('=== Demo Complete ===');
}

// Run demo
demo().catch(console.error);
