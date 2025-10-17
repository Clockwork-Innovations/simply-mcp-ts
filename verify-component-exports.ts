#!/usr/bin/env tsx
/**
 * Comprehensive verification script for component exports
 * Tests all exports from simply-mcp/client
 */

import {
  // Components
  UIResourceRenderer,
  HTMLResourceRenderer,
  RemoteDOMRenderer,

  // Component Props Types
  type UIResourceRendererProps,
  type HTMLResourceRendererProps,
  type RemoteDOMRendererProps,

  // UI Types
  type UIContentType,
  type UIResourceContent,
  type UIAction,
  type UIActionResult,
  type ToolCallAction,

  // Utility Functions
  getContentType,
  isUIResource,
  getHTMLContent,
  validateOrigin,
  buildSandboxAttribute,
  getPreferredFrameSize,
  getInitialRenderData,
} from './dist/src/client/index.js';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  simply-mcp/client Component Export Verification          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let allPassed = true;

// Test Components
console.log('📦 Component Exports:');
const componentTests = [
  { name: 'UIResourceRenderer', value: UIResourceRenderer, expected: 'function' },
  { name: 'HTMLResourceRenderer', value: HTMLResourceRenderer, expected: 'function' },
  { name: 'RemoteDOMRenderer', value: RemoteDOMRenderer, expected: 'function' },
];

componentTests.forEach(test => {
  const passed = typeof test.value === test.expected;
  console.log(`   ${passed ? '✅' : '❌'} ${test.name}: ${typeof test.value}`);
  if (!passed) allPassed = false;
});

// Test Utility Functions
console.log('\n🔧 Utility Function Exports:');
const utilityTests = [
  { name: 'getContentType', value: getContentType },
  { name: 'isUIResource', value: isUIResource },
  { name: 'getHTMLContent', value: getHTMLContent },
  { name: 'validateOrigin', value: validateOrigin },
  { name: 'buildSandboxAttribute', value: buildSandboxAttribute },
  { name: 'getPreferredFrameSize', value: getPreferredFrameSize },
  { name: 'getInitialRenderData', value: getInitialRenderData },
];

utilityTests.forEach(test => {
  const passed = typeof test.value === 'function';
  console.log(`   ${passed ? '✅' : '❌'} ${test.name}: ${typeof test.value}`);
  if (!passed) allPassed = false;
});

// Test Functional Behavior
console.log('\n⚙️  Functional Verification:');
const testResource = {
  uri: 'ui://test',
  mimeType: 'text/html' as UIContentType,
  text: '<div>Test</div>',
};

const functionalTests = [
  {
    name: 'isUIResource(resource)',
    test: () => isUIResource(testResource) === true,
  },
  {
    name: 'getContentType("text/html")',
    test: () => getContentType('text/html') === 'rawHtml',
  },
  {
    name: 'getContentType("text/uri-list")',
    test: () => getContentType('text/uri-list') === 'externalUrl',
  },
  {
    name: 'getContentType("application/vnd.mcp-ui.remote-dom+json")',
    test: () => getContentType('application/vnd.mcp-ui.remote-dom+json') === 'remoteDom',
  },
  {
    name: 'validateOrigin(url, allowed)',
    test: () => {
      try {
        validateOrigin('https://example.com', ['https://example.com']);
        return true;
      } catch {
        return false;
      }
    },
  },
];

functionalTests.forEach(test => {
  try {
    const passed = test.test();
    console.log(`   ${passed ? '✅' : '❌'} ${test.name}`);
    if (!passed) allPassed = false;
  } catch (error) {
    console.log(`   ❌ ${test.name} (threw error)`);
    allPassed = false;
  }
});

// Summary
console.log('\n' + '═'.repeat(60));
if (allPassed) {
  console.log('✅ All verification tests passed!');
  console.log('\n📌 Import Statement:');
  console.log("   import { UIResourceRenderer } from 'simply-mcp/client';");
  console.log('\n🎯 Ready for Next.js Demo Integration');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}
