/**
 * Test script for source type detector
 */

import { detectSourceType, batchDetectSourceType } from './source-detector.js';

console.log('='.repeat(80));
console.log('SOURCE TYPE DETECTOR TEST');
console.log('='.repeat(80));

// Test cases
const testCases = [
  // URLs
  {
    name: 'HTTPS URL',
    source: 'https://analytics.example.com/dashboard',
    expected: 'url',
  },
  {
    name: 'HTTP URL',
    source: 'http://example.com/page.html',
    expected: 'url',
  },
  {
    name: 'Protocol-relative URL',
    source: '//cdn.example.com/widget.html',
    expected: 'url',
  },

  // Inline HTML
  {
    name: 'Simple HTML div',
    source: '<div>Hello World</div>',
    expected: 'inline-html',
  },
  {
    name: 'HTML with DOCTYPE',
    source: '<!DOCTYPE html><html><body>Content</body></html>',
    expected: 'inline-html',
  },
  {
    name: 'Multi-line HTML',
    source: `
      <div class="dashboard">
        <h1>Analytics</h1>
        <p>Stats here</p>
      </div>
    `,
    expected: 'inline-html',
  },

  // Remote DOM JSON
  {
    name: 'Remote DOM JSON',
    source: '{"type":"div","properties":{"className":"container"},"children":["Hello"]}',
    expected: 'inline-remote-dom',
  },
  {
    name: 'Remote DOM with nested children',
    source: JSON.stringify({
      type: 'div',
      properties: { id: 'root' },
      children: [
        { type: 'h1', children: ['Title'] },
        { type: 'p', children: ['Paragraph'] },
      ],
    }),
    expected: 'inline-remote-dom',
  },

  // File paths (extension-based, no FS check)
  {
    name: 'React TSX component',
    source: './components/Dashboard.tsx',
    expected: 'file-component',
  },
  {
    name: 'React JSX component',
    source: './ui/Button.jsx',
    expected: 'file-component',
  },
  {
    name: 'HTML file',
    source: './pages/index.html',
    expected: 'file-html',
  },
  {
    name: 'Relative HTML file',
    source: '../ui/page.html',
    expected: 'file-html',
  },

  // Folder paths
  {
    name: 'Folder with trailing slash',
    source: './ui/dashboard/',
    expected: 'folder', // Will be unknown without FS check
  },

  // Ambiguous cases
  {
    name: 'Just text (unknown)',
    source: 'random text',
    expected: 'unknown',
  },
];

console.log('\n📊 Running test cases...\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = detectSourceType(testCase.source, {
    checkFileSystem: false, // Skip FS checks for consistent testing
    verbose: false,
  });

  const success = result.type === testCase.expected;

  if (success) {
    passed++;
    console.log(`✅ PASS: ${testCase.name}`);
  } else {
    failed++;
    console.log(`❌ FAIL: ${testCase.name}`);
    console.log(`   Expected: ${testCase.expected}`);
    console.log(`   Got: ${result.type}`);
    console.log(`   Reason: ${result.reason}`);
  }

  console.log(`   Source: ${testCase.source.slice(0, 60)}${testCase.source.length > 60 ? '...' : ''}`);
  console.log(`   Confidence: ${result.confidence}`);
  console.log('');
}

console.log('='.repeat(80));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(80));

// Test batch detection
console.log('\n📦 Testing batch detection...\n');

const batchSources = [
  'https://example.com',
  '<div>HTML</div>',
  './Component.tsx',
];

const batchResults = batchDetectSourceType(batchSources, {
  checkFileSystem: false,
});

batchResults.forEach((result, index) => {
  console.log(`${index + 1}. ${batchSources[index]}`);
  console.log(`   Type: ${result.type}`);
  console.log(`   Confidence: ${result.confidence}`);
  console.log('');
});

console.log('='.repeat(80));
console.log('SOURCE DETECTOR VALIDATION COMPLETE');
console.log('='.repeat(80));

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
