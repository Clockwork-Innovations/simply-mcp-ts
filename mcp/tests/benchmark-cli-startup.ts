/**
 * CLI Startup Performance Benchmark
 * Measures CLI startup time and identifies bottlenecks
 */

import { performance } from 'node:perf_hooks';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

interface BenchmarkResult {
  operation: string;
  duration: number;
  timestamp: number;
}

const results: BenchmarkResult[] = [];

function benchmark(name: string): () => void {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    results.push({
      operation: name,
      duration,
      timestamp: Date.now(),
    });
  };
}

async function benchmarkAPIDetection(filePath: string): Promise<void> {
  // Benchmark file reading
  const endRead = benchmark('File Read');
  const content = await readFile(filePath, 'utf-8');
  endRead();

  // Benchmark regex detection
  const endRegex = benchmark('Regex Detection');
  const isDecorator = /@MCPServer\s*\(/.test(content);
  const isFunctional = /export\s+default\s+defineMCP\s*\(/.test(content);
  endRegex();

  console.log(`Detection result: ${isDecorator ? 'decorator' : isFunctional ? 'functional' : 'programmatic'}`);
}

async function benchmarkImports(): Promise<void> {
  // Benchmark core imports
  const endCore = benchmark('Import Core (SimplyMCP)');
  await import('../SimplyMCP.js');
  endCore();

  // Benchmark decorator imports
  const endDecorator = benchmark('Import Decorators');
  await import('../decorators.js');
  endDecorator();

  // Benchmark schema builder
  const endSchema = benchmark('Import Schema Builder');
  await import('../schema-builder.js');
  endSchema();

  // Benchmark adapter utils
  const endUtils = benchmark('Import Adapter Utils');
  await import('../cli/adapter-utils.js');
  endUtils();
}

async function benchmarkModuleLoading(filePath: string): Promise<void> {
  const absolutePath = resolve(process.cwd(), filePath);
  const fileUrl = pathToFileURL(absolutePath).href;

  const endLoad = benchmark('Module Load');
  await import(fileUrl);
  endLoad();
}

function printResults(): void {
  console.log('\n=== Performance Benchmark Results ===\n');

  let total = 0;
  for (const result of results) {
    console.log(`${result.operation.padEnd(35)} ${result.duration.toFixed(2).padStart(8)}ms`);
    total += result.duration;
  }

  console.log('─'.repeat(45));
  console.log(`${'TOTAL'.padEnd(35)} ${total.toFixed(2).padStart(8)}ms`);
  console.log('\n=== Performance Targets ===\n');
  console.log(`Detection:                           < 50ms   ${results.find(r => r.operation.includes('Detection'))?.duration! < 50 ? '✓' : '✗'}`);
  console.log(`Total startup overhead:             < 100ms   ${total < 100 ? '✓' : '✗'}`);

  console.log('\n=== Detailed Breakdown ===\n');
  const categories = new Map<string, number>();

  for (const result of results) {
    const category = result.operation.split(' ')[0];
    categories.set(category, (categories.get(category) || 0) + result.duration);
  }

  for (const [category, duration] of categories) {
    const percentage = (duration / total) * 100;
    console.log(`${category.padEnd(20)} ${duration.toFixed(2).padStart(8)}ms (${percentage.toFixed(1)}%)`);
  }
}

// Main benchmark execution
async function runBenchmark(): Promise<void> {
  const startTime = performance.now();

  console.log('Starting CLI Performance Benchmark...\n');

  // Test file for detection
  const testFile = process.argv[2] || './mcp/examples/simple-server.ts';

  console.log(`Test file: ${testFile}\n`);

  try {
    // Benchmark detection
    console.log('Benchmarking API detection...');
    await benchmarkAPIDetection(testFile);

    // Benchmark imports (cold start)
    console.log('Benchmarking imports...');
    await benchmarkImports();

    // Benchmark module loading
    console.log('Benchmarking module loading...');
    // await benchmarkModuleLoading(testFile);

    const totalTime = performance.now() - startTime;
    results.push({
      operation: 'Total Benchmark',
      duration: totalTime,
      timestamp: Date.now(),
    });

    // Print results
    printResults();

  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

runBenchmark();
