# Performance Testing Suite

This directory contains comprehensive performance benchmarks and analysis for the simply-mcp-ts framework.

## 📁 Contents

### Test Suites

1. **`baseline-metrics.test.ts`**
   - Remote DOM performance baselines
   - Bundle size measurements
   - Build performance tracking
   - Created: 2025-10-31

2. **`batch-performance.test.ts`** ⭐ NEW
   - JSON-RPC batch processing benchmarks
   - Sequential vs parallel mode comparison
   - Throughput and latency measurements
   - Overhead analysis
   - **Status:** ✅ All 16 tests passing
   - **Runtime:** ~32-40 seconds
   - Created: 2025-11-01

### Documentation

1. **`BATCH_PERFORMANCE_ANALYSIS.md`**
   - Detailed performance analysis
   - Why performance exceeds predictions
   - Deep dive into all metrics
   - ~12KB

2. **`BATCH_PERFORMANCE_SUMMARY.md`**
   - Executive summary
   - Key findings and recommendations
   - Usage guidelines
   - Test coverage summary
   - ~14KB

3. **`BATCH_PERFORMANCE_QUICK_REFERENCE.md`**
   - Quick reference card for developers
   - Performance numbers at a glance
   - Decision trees
   - Configuration examples
   - ~6KB

---

## 🚀 Quick Start

### Run All Performance Tests

```bash
# Run all performance tests
npm test tests/performance/

# Run specific test suite
npx jest tests/performance/batch-performance.test.ts --testTimeout=120000

# Run with verbose output
npx jest tests/performance/batch-performance.test.ts --verbose
```

### Expected Results

**Baseline Metrics:**
```
Test Suites: 1 passed
Tests:       6 passed
Time:        ~2 seconds
```

**Batch Performance:**
```
Test Suites: 1 passed
Tests:       16 passed
Time:        ~32-40 seconds
```

---

## 📊 Performance Highlights

### Batch Processing Performance

| Metric | Value | Rating |
|--------|-------|--------|
| **Batch Overhead** | 1.9% | ⭐⭐⭐⭐⭐ Excellent |
| **Parallel Speedup** | 5x throughput | ⭐⭐⭐⭐⭐ |
| **Scaling Efficiency** | 8.8x cost reduction | ⭐⭐⭐⭐⭐ |
| **Latency Consistency** | 0.54ms std dev | ⭐⭐⭐⭐⭐ |

**Key Numbers:**
- Baseline: 50.90ms (very consistent)
- Sequential: ~192 req/sec
- Parallel: ~940 req/sec (5x improvement)
- Per-request cost: 5.3ms (size 10) → 0.6ms (size 100)

---

## 📖 Documentation Guide

### For Framework Users

**Start here:**
1. `BATCH_PERFORMANCE_QUICK_REFERENCE.md` - Quick decisions and examples
2. `BATCH_PERFORMANCE_SUMMARY.md` - Full context and recommendations

**When to read:**
- Deciding whether to use batch processing
- Choosing optimal batch sizes
- Understanding performance characteristics
- Setting up monitoring/alerts

### For Framework Developers

**Start here:**
1. `BATCH_PERFORMANCE_ANALYSIS.md` - Deep technical analysis
2. `batch-performance.test.ts` - Implementation details

**When to read:**
- Making changes to batch processing
- Understanding why performance differs from predictions
- Validating performance optimizations
- Adding instrumentation

---

## 🎯 Performance Test Scenarios

### Batch Processing Tests (16 scenarios)

#### 1. Baseline Performance
- ✅ Single request latency (20 samples)
- ✅ Percentile calculation (P50, P95, P99)

#### 2. Small Batches (10 requests)
- ✅ Sequential processing time
- ✅ Parallel processing time
- ✅ Speedup comparison

#### 3. Medium Batches (50 requests)
- ✅ Sequential processing time
- ✅ Parallel processing time
- ✅ Speedup comparison

#### 4. Large Batches (100 requests)
- ✅ Sequential processing time
- ✅ Parallel processing time
- ✅ Diminishing returns analysis

#### 5. Throughput Measurement
- ✅ Sequential throughput (req/sec)
- ✅ Parallel throughput (req/sec)
- ✅ Improvement verification (5x)

#### 6. Batch Overhead Analysis
- ✅ Individual vs batch comparison (9.68x speedup)
- ✅ Scaling efficiency (8.8x cost reduction)

#### 7. Documentation
- ✅ Performance summary and recommendations

---

## 🛠️ Test Infrastructure

### Helper Functions

**`batch-performance.test.ts` provides:**
- `calculatePercentile(values, percentile)` - Statistical analysis
- `calculateMetrics(samples)` - Comprehensive metrics (min, max, mean, median, P50, P95, P99, stdDev)
- `formatMetrics(metrics)` - Human-readable output
- `readJSONResponse(stream)` - JSON-RPC message parsing
- `sendRequest(server, request)` - Request/response with latency measurement
- `initializeServer(server)` - MCP initialization handshake
- `createBatchRequest(size, tool, delay)` - Batch request generator

### Test Fixtures

The tests use these fixture servers:
- `tests/fixtures/interface-batch-sequential.ts` - Sequential processing (parallel: false)
- `tests/fixtures/interface-batch-parallel.ts` - Parallel processing (parallel: true)
- `tests/fixtures/interface-batch-timeout.ts` - Timeout enforcement (timeout: 100ms)

---

## 📈 Benchmark Methodology

### Approach

1. **Warmup Phase**
   - 3-5 warmup requests to stabilize server
   - Discarded from measurements

2. **Measurement Phase**
   - Multiple iterations per test (3-20 samples)
   - Latency measured with `Date.now()` precision
   - Statistical analysis (percentiles, std dev)

3. **Validation Phase**
   - Assertions based on actual measured performance
   - Tolerances for variance (machine-dependent)

### Statistical Rigor

- **Baseline:** 20 samples for statistical significance
- **Small batches:** 10 iterations
- **Medium batches:** 5 iterations
- **Large batches:** 3 iterations (time-consuming)
- **Throughput:** Continuous testing over 2-3 seconds

### Measurement Precision

- Latency: 1ms precision (`Date.now()`)
- Throughput: Calculated from actual duration
- Percentiles: Exact calculation from sorted samples

---

## 🔍 Interpreting Results

### Console Output

Tests produce detailed console output:

```
=== BASELINE (SINGLE REQUEST) ===
Baseline latency (20 samples): Min: 50.00ms, Max: 52.00ms,
  Mean: 50.90ms, Median: 51.00ms, P50: 51.00ms, P95: 52.00ms,
  P99: 52.00ms, StdDev: 0.54ms
```

### Key Metrics

- **Min/Max:** Range of values (detects outliers)
- **Mean:** Average performance
- **Median (P50):** Middle value (not affected by outliers)
- **P95/P99:** Tail latency (worst-case scenarios)
- **StdDev:** Consistency (lower = more consistent)

### Performance Ratings

- **Excellent:** < 5% overhead, > 5x speedup
- **Good:** < 10% overhead, > 3x speedup
- **Acceptable:** < 20% overhead, > 2x speedup
- **Poor:** > 20% overhead, < 2x speedup

**Our Results:** ⭐⭐⭐⭐⭐ Excellent across all metrics

---

## 🚨 CI/CD Integration

### Running in CI

```bash
# Add to .github/workflows/test.yml
- name: Run Performance Tests
  run: |
    npm test tests/performance/batch-performance.test.ts
  timeout-minutes: 5
```

### Performance Regression Detection

Set thresholds:
- Batch overhead > 5% → Warning
- Batch overhead > 10% → Fail
- Parallel throughput < 800 req/sec → Warning
- Sequential throughput < 150 req/sec → Warning

```javascript
// Example assertion for CI
expect(metrics.overhead).toBeLessThan(0.05); // 5% threshold
expect(parallelThroughput).toBeGreaterThan(800); // 800 req/sec minimum
```

---

## 📊 Performance Trends

### Historical Tracking

To track performance over time:

1. **Capture Baseline**
   ```bash
   npx jest tests/performance/ --json > perf-baseline.json
   ```

2. **Compare Against Baseline**
   ```bash
   npx jest tests/performance/ --json > perf-current.json
   diff perf-baseline.json perf-current.json
   ```

3. **Monitor Metrics**
   - Batch overhead
   - Throughput (seq/parallel)
   - P95/P99 latency
   - Scaling efficiency

---

## 🎓 Learning Resources

### Understanding the Results

**Why is sequential mode so fast?**
- Node.js async I/O allows concurrent internal processing
- "Sequential" controls ordering, not sync execution
- See: `BATCH_PERFORMANCE_ANALYSIS.md` section "Why Performance Differs"

**Why is parallel only 5x faster?**
- Both modes have similar latency (~50-60ms)
- Speedup is in **throughput** (940 vs 192 req/sec)
- Async I/O makes both modes efficient

**What's the per-request cost?**
- Batch of 10: 5.3ms per request
- Batch of 100: 0.6ms per request
- 8.8x improvement due to overhead amortization

---

## 🔧 Troubleshooting

### Tests Failing

**Symptoms:** Tests timeout or fail assertions

**Causes:**
1. Slow machine (adjust timeouts)
2. High CPU load (run when system is idle)
3. Network issues (tests use stdio, shouldn't affect)

**Solutions:**
```bash
# Increase timeout
npx jest tests/performance/batch-performance.test.ts --testTimeout=240000

# Run with verbose output
npx jest tests/performance/batch-performance.test.ts --verbose

# Run individual test
npx jest -t "should measure single request latency"
```

### Performance Degradation

**Symptoms:** Metrics worse than documented

**Check:**
1. Node.js version (use v18+ recommended)
2. System load (run `top` or `htop`)
3. Other processes consuming resources
4. Disk I/O (SSD recommended)

**Baseline Comparison:**
```bash
# Run multiple times and compare
for i in {1..3}; do
  npx jest tests/performance/batch-performance.test.ts --silent
done
```

---

## 📝 Adding New Performance Tests

### Template

```typescript
describe('My Performance Test', () => {
  let server: ChildProcess;

  beforeAll(async () => {
    server = spawn('npx', ['tsx', 'path/to/fixture.ts']);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await initializeServer(server);
  });

  afterAll(async () => {
    if (server && !server.killed) {
      server.kill();
      await new Promise(resolve => server.on('exit', resolve));
    }
  });

  it('should measure my feature performance', async () => {
    const samples: number[] = [];
    const iterations = 10;

    // Warmup
    for (let i = 0; i < 3; i++) {
      await sendRequest(server, myRequest);
    }

    // Measure
    for (let i = 0; i < iterations; i++) {
      const { latency } = await sendRequest(server, myRequest);
      samples.push(latency);
    }

    const metrics = calculateMetrics(samples);
    console.log(`My feature (${iterations} samples): ${formatMetrics(metrics)}`);

    expect(metrics.mean).toBeLessThan(100); // Your threshold
  });
});
```

### Best Practices

1. **Warmup:** Always include 3-5 warmup iterations
2. **Samples:** Use 10+ samples for statistical significance
3. **Timeouts:** Set appropriate `jest.setTimeout()` for long tests
4. **Cleanup:** Always kill servers in `afterAll()`
5. **Documentation:** Update README and create analysis docs

---

## 🎯 Success Criteria

Performance tests should validate:
- ✅ Baseline performance (latency, throughput)
- ✅ Scaling characteristics (small, medium, large batches)
- ✅ Overhead analysis (batch vs individual)
- ✅ Consistency (standard deviation, percentiles)
- ✅ Regression prevention (assertions with tolerances)

---

## 📞 Support

**Questions about performance tests?**
- Check: `BATCH_PERFORMANCE_QUICK_REFERENCE.md` for quick answers
- Read: `BATCH_PERFORMANCE_ANALYSIS.md` for deep dive
- Review: Test source code for implementation details

**Found a performance regression?**
1. Verify with multiple runs
2. Check system resources
3. Compare against baseline
4. File issue with benchmark results

---

**Last Updated:** 2025-11-01
**Maintainer:** Performance Testing Team
**Status:** ✅ All tests passing, documentation complete
