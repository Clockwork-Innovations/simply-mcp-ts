/**
 * IUI v4.0 Mini-Integration Test
 *
 * Tests the complete flow: Interface → Parser → Source Detection
 * Validates that the new `source` field works end-to-end.
 */

import { parseInterfaceFile } from './src/server/parser.js';
import { detectSourceType } from './src/features/ui/source-detector.js';
import fs from 'fs';
import path from 'path';

console.log('================================================================================');
console.log('IUI v4.0 MINI-INTEGRATION TEST');
console.log('================================================================================\n');

// Test file content with 3 IUI interfaces
const testFileContent = `
import { IUI } from './src/server/interface-types.js';

/**
 * Test 1: External URL Source
 */
export interface ExternalDashboardUI extends IUI {
  uri: 'ui://external';
  name: 'External Dashboard';
  description: 'External URL test';
  source: 'https://example.com/dashboard';
}

/**
 * Test 2: Inline HTML Source
 */
export interface InlineHtmlUI extends IUI {
  uri: 'ui://inline';
  name: 'Inline HTML';
  description: 'Inline HTML test';
  source: '<div><h1>Hello IUI v4.0</h1><p>Minimal API!</p></div>';
  css: 'h1 { color: blue; }';
}

/**
 * Test 3: React Component Source
 */
export interface ComponentUI extends IUI {
  uri: 'ui://component';
  name: 'React Component';
  description: 'Component file test';
  source: './test-component.tsx';
}
`;

// Create temporary test file
const testFilePath = path.join(process.cwd(), 'temp-test-iui-v4.ts');
fs.writeFileSync(testFilePath, testFileContent, 'utf-8');

// Create simple test component
const testComponentPath = path.join(process.cwd(), 'test-component.tsx');
const testComponentContent = `
import React from 'react';

export default function TestComponent() {
  return (
    <div>
      <h1>Test Component</h1>
      <button onClick={() => alert('Clicked!')}>
        Click Me
      </button>
    </div>
  );
}
`;
fs.writeFileSync(testComponentPath, testComponentContent, 'utf-8');

try {
  // Parse the test file
  const parsed = parseInterfaceFile(testFilePath);

  // Validate results
  let passed = 0;
  let failed = 0;

  // Test 1: External URL
  console.log('Test 1: External URL Source');
  const test1 = parsed.uis.find(ui => ui.interfaceName === 'ExternalDashboardUI');
  if (!test1) {
    console.log('  ✗ FAILED: Interface not parsed\n');
    failed++;
  } else if (!test1.source) {
    console.log('  ✗ FAILED: Source field not extracted\n');
    failed++;
  } else {
    const detection = detectSourceType(test1.source, { checkFileSystem: false });
    console.log('  ✓ Parsed successfully');
    console.log(`  - URI: ${test1.uri}`);
    console.log(`  - Source: ${test1.source}`);
    console.log(`  - Type detected: ${detection.type} (confidence: ${detection.confidence})`);
    console.log(`  - Reason: ${detection.reason}\n`);
    passed++;
  }

  // Test 2: Inline HTML
  console.log('Test 2: Inline HTML Source');
  const test2 = parsed.uis.find(ui => ui.interfaceName === 'InlineHtmlUI');
  if (!test2) {
    console.log('  ✗ FAILED: Interface not parsed\n');
    failed++;
  } else if (!test2.source) {
    console.log('  ✗ FAILED: Source field not extracted\n');
    failed++;
  } else {
    const detection = detectSourceType(test2.source, { checkFileSystem: false });
    console.log('  ✓ Parsed successfully');
    console.log(`  - URI: ${test2.uri}`);
    console.log(`  - Source: ${test2.source.slice(0, 50)}...`);
    console.log(`  - Type detected: ${detection.type} (confidence: ${detection.confidence})`);
    console.log(`  - CSS provided: ${test2.css || 'none'}\n`);
    passed++;
  }

  // Test 3: React Component
  console.log('Test 3: React Component Source');
  const test3 = parsed.uis.find(ui => ui.interfaceName === 'ComponentUI');
  if (!test3) {
    console.log('  ✗ FAILED: Interface not parsed\n');
    failed++;
  } else if (!test3.source) {
    console.log('  ✗ FAILED: Source field not extracted\n');
    failed++;
  } else {
    const detection = detectSourceType(test3.source, {
      checkFileSystem: true,
      basePath: process.cwd(),
    });
    console.log('  ✓ Parsed successfully');
    console.log(`  - URI: ${test3.uri}`);
    console.log(`  - Source: ${test3.source}`);
    console.log(`  - Type detected: ${detection.type} (confidence: ${detection.confidence})`);
    if (detection.resolvedPath) {
      console.log(`  - Resolved path: ${detection.resolvedPath}`);
    }
    console.log('');
    passed++;
  }

  // Summary
  console.log('================================================================================');
  if (failed === 0) {
    console.log(`GATE CHECK 1: PASS (${passed}/3 tests passed)`);
  } else {
    console.log(`GATE CHECK 1: FAIL (${passed}/3 passed, ${failed}/3 failed)`);
  }
  console.log('================================================================================\n');

  // Cleanup
  fs.unlinkSync(testFilePath);
  fs.unlinkSync(testComponentPath);

  // Exit with appropriate code
  process.exit(failed === 0 ? 0 : 1);

} catch (error) {
  console.error('\n✗ TEST EXECUTION FAILED:');
  console.error(error);

  // Cleanup
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
  if (fs.existsSync(testComponentPath)) {
    fs.unlinkSync(testComponentPath);
  }

  process.exit(1);
}
