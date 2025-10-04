# Performance Guide

Quick reference for SimplyMCP CLI performance features and optimization techniques.

## Quick Start

### Using the Performance Cache

```typescript
import { detectAPIStyleCached } from './cli/performance-cache.js';

// Automatically cached detection
const style = await detectAPIStyleCached('server.ts', verbose);
// Second call will be ~12x faster!
```

### Running Benchmarks

```bash
# Demo the performance cache
npx tsx mcp/examples/performance-demo.ts

# Measure startup performance
npx tsx mcp/tests/benchmark-cli-startup.ts

# Full CLI benchmark
bash mcp/tests/benchmark-cli-performance.sh
```

## Performance Characteristics

### API Style Overhead

| API Style     | Startup Time | Reason |
|---------------|--------------|--------|
| Programmatic  | ~20ms        | Minimal imports |
| Functional    | ~65ms        | Schema builder |
| Decorator     | ~165ms       | reflect-metadata + parser |

### Caching Performance

| Operation | Cold | Cached | Speedup |
|-----------|------|--------|---------|
| Detection | 2.5ms | 0.2ms | 12x |
| File stat | 0.5ms | 0.5ms | 1x |
| Total     | 3ms   | 0.7ms | 4x |

## Optimization Techniques

### 1. Lazy Loading ✅ (Already Implemented)

All adapters use dynamic imports - no action needed.

```typescript
// Only loads when decorator API is detected
const { default: reflectMetadata } = await import('reflect-metadata');
```

### 2. Caching

Use the performance cache for repeated detections:

```typescript
import { detectAPIStyleCached, clearDetectionCache } from './cli/performance-cache.js';

// Normal usage - automatically cached
const style = await detectAPIStyleCached('server.ts');

// Clear cache if needed (rarely necessary)
clearDetectionCache();
```

### 3. Monitoring

Get performance metrics:

```typescript
import { getPerformanceMetrics } from './cli/performance-cache.js';

const metrics = getPerformanceMetrics();
console.log(`Detection: ${metrics.detection}ms`);
console.log(`Load: ${metrics.load}ms`);
console.log(`Total: ${metrics.total}ms`);
```

## Cache Management

### Cache Statistics

```typescript
import { getCacheStats } from './cli/performance-cache.js';

const stats = getCacheStats();
console.log(`Cache size: ${stats.size}`);
console.log(`Cached files:`, stats.entries);
```

### Cache Invalidation

The cache automatically invalidates when:
- File modification time changes
- File is deleted (ENOENT error)

Manual cache clear (optional):
```typescript
import { clearDetectionCache } from './cli/performance-cache.js';
clearDetectionCache();
```

## Best Practices

### For Library Users

1. **Choose API style wisely:**
   - Need speed? → Programmatic or Functional
   - Need simplicity? → Decorator (accept 165ms overhead)

2. **Monitor performance:**
   - Use `--verbose` flag (when integrated)
   - Run benchmarks periodically

3. **Accept decorator overhead:**
   - 165ms is normal for decorator API
   - One-time cost at startup
   - Worth it for developer experience

### For Library Developers

1. **Use dynamic imports:**
   ```typescript
   // Good: Lazy loaded
   const { Module } = await import('./module.js');

   // Bad: Eager loaded
   import { Module } from './module.js';
   ```

2. **Profile new dependencies:**
   ```bash
   npx tsx mcp/tests/benchmark-cli-startup.ts
   ```

3. **Keep detection fast:**
   - Use regex over AST parsing
   - Cache results when possible
   - Validate cache with file mtime

4. **Document performance:**
   - Update benchmarks
   - Note breaking changes
   - Set expectations

## Troubleshooting

### Slow Startup

**Symptom:** CLI takes > 200ms to start

**Diagnosis:**
```bash
npx tsx mcp/tests/benchmark-cli-startup.ts
```

**Common causes:**
- Using decorator API (expected ~165ms)
- Many dependencies in user code
- Slow filesystem (network drives)

**Solutions:**
- Use functional or programmatic API
- Profile user code imports
- Enable watch polling for network drives

### Cache Not Working

**Symptom:** Repeated detections are slow

**Diagnosis:**
```typescript
import { getCacheStats } from './cli/performance-cache.js';
console.log(getCacheStats());
```

**Common causes:**
- Cache not integrated into run.ts
- File path changing (absolute vs relative)
- Cache cleared between calls

**Solutions:**
- Integrate performance-cache.ts
- Use consistent file paths
- Don't clear cache unnecessarily

## Performance Targets

Our targets and achievement:

| Metric | Target | Achieved | Status |
|--------|--------|----------|--------|
| Detection (cold) | < 50ms | ~2.5ms | ✅ 20x better |
| Detection (cached) | < 5ms | ~0.2ms | ✅ 25x better |
| Total (functional) | < 100ms | ~65ms | ✅ Met |
| Total (decorator) | < 100ms | ~165ms | ⚠️ Acceptable |

## API Reference

### `detectAPIStyleCached(filePath, verbose?)`

Detect API style with caching.

```typescript
const style = await detectAPIStyleCached('server.ts', true);
// Returns: 'decorator' | 'functional' | 'programmatic'
```

### `getPerformanceMetrics()`

Get current performance metrics.

```typescript
const metrics = getPerformanceMetrics();
// Returns: { detection: number, load: number, total: number }
```

### `getCacheStats()`

Get cache statistics.

```typescript
const stats = getCacheStats();
// Returns: { size: number, entries: Array<{file, style, mtime}> }
```

### `clearDetectionCache()`

Clear the detection cache.

```typescript
clearDetectionCache();
// Cache is now empty
```

### `updatePerformanceMetrics(metrics)`

Update performance metrics (internal use).

```typescript
updatePerformanceMetrics({ load: 50.5 });
```

## Examples

### Basic Usage

```typescript
import { detectAPIStyleCached } from './cli/performance-cache.js';

const style = await detectAPIStyleCached('server.ts');
console.log(`Detected: ${style}`);
```

### With Metrics

```typescript
import {
  detectAPIStyleCached,
  getPerformanceMetrics
} from './cli/performance-cache.js';

const start = performance.now();
const style = await detectAPIStyleCached('server.ts', true);
const metrics = getPerformanceMetrics();

console.log(`Style: ${style}`);
console.log(`Detection: ${metrics.detection}ms`);
console.log(`Total: ${performance.now() - start}ms`);
```

### Cache Management

```typescript
import {
  detectAPIStyleCached,
  getCacheStats,
  clearDetectionCache
} from './cli/performance-cache.js';

// First call (cold)
await detectAPIStyleCached('server.ts');

// Check cache
const stats = getCacheStats();
console.log(`Cached files: ${stats.size}`);

// Second call (warm)
await detectAPIStyleCached('server.ts');  // Fast!

// Clear if needed
clearDetectionCache();
```

## Further Reading

- [PERFORMANCE_OPTIMIZATION_REPORT.md](../PERFORMANCE_OPTIMIZATION_REPORT.md) - Full technical report
- [TASK6_PERFORMANCE_SUMMARY.md](../TASK6_PERFORMANCE_SUMMARY.md) - Implementation summary
- [performance-cache.ts](../mcp/cli/performance-cache.ts) - Source code

---

**Last Updated:** 2025-10-03
**Version:** 2.2.0
