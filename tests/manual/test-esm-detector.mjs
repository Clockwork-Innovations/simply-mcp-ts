#!/usr/bin/env node
/**
 * Production ESM Test - TypeScript Detector
 *
 * This test simulates how the published package works in a pure ESM context.
 * Run this test OUTSIDE of Jest to verify import.meta.url works correctly.
 *
 * Usage:
 *   node tests/manual/test-esm-detector.mjs
 *
 * Expected: SUCCESS (TypeScript detected)
 * Before fix (v4.0.18): FAIL (Cannot use 'import.meta' outside a module)
 * After fix (v4.0.19): PASS (Direct import.meta.url works)
 */

import { ensureTypeScript } from '../../dist/src/core/typescript-detector.js';

console.log('='.repeat(60));
console.log('Production ESM Test - TypeScript Detector');
console.log('='.repeat(60));
console.log();

console.log('Environment:');
console.log('  - Context: Pure ESM (no Jest, no tsx)');
console.log('  - typeof require:', typeof require);
console.log('  - typeof import.meta:', typeof import.meta);
console.log('  - import.meta.url:', import.meta.url);
console.log();

console.log('Testing TypeScript detection...');
console.log();

try {
  const ts = ensureTypeScript();
  console.log('✅ SUCCESS: TypeScript detected');
  console.log('  - Version:', ts.version);
  console.log('  - Module loaded successfully');
  console.log();
  console.log('='.repeat(60));
  console.log('✅ PRODUCTION ESM TEST PASSED');
  console.log('='.repeat(60));
  process.exit(0);
} catch (error) {
  console.error('❌ FAILED: TypeScript detection failed');
  console.error('  - Error:', error.message);
  console.error();
  console.error('Full error:');
  console.error(error);
  console.error();
  console.log('='.repeat(60));
  console.log('❌ PRODUCTION ESM TEST FAILED');
  console.log('='.repeat(60));
  process.exit(1);
}
