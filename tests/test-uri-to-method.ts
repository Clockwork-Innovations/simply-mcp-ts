/**
 * Test URI to method name conversion
 */

import { snakeToCamel } from '../dist/src/api/interface/parser.js';

function uriToMethodName(uri: string): string {
  return snakeToCamel(
    uri
      .replace(/^(\w+):\/\//, '$1_')  // 'config://' → 'config_'
      .replace(/\//g, '_')             // '/' → '_'
      .replace(/[^a-zA-Z0-9_]/g, '_')  // Other special chars → '_'
  );
}

const testCases = [
  { uri: 'config://server', expected: 'configServer' },
  { uri: 'stats://current', expected: 'statsCurrent' },
  { uri: 'user://profile/settings', expected: 'userProfileSettings' },
  { uri: 'api://v1/status', expected: 'apiV1Status' },
  { uri: 'data://cache/items', expected: 'dataCacheItems' },
  { uri: 'file:///absolute/path', expected: 'fileAbsolutePath' },
];

console.log('\n=== URI → Method Name Conversion Tests ===\n');

let allPassed = true;

for (const { uri, expected } of testCases) {
  const result = uriToMethodName(uri);
  const passed = result === expected;

  if (passed) {
    console.log(`✅ ${uri.padEnd(30)} → ${result}`);
  } else {
    console.log(`❌ ${uri.padEnd(30)} → ${result} (expected: ${expected})`);
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(60));

if (allPassed) {
  console.log('✅ All tests passed!\n');
  console.log('Benefits of new algorithm:');
  console.log('  - Single underscores (cleaner than double)');
  console.log('  - Preserves namespace (scheme part)');
  console.log('  - Handles paths correctly');
  console.log('  - Consistent snake_case → camelCase');
} else {
  console.log('❌ Some tests failed\n');
  process.exit(1);
}
