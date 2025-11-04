/**
 * Test script for dependency extractor POC
 */

import { extractDependencies } from './dependency-extractor.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test with real React component files
const testFiles = [
  '../examples/components/Dashboard.tsx',
  '../examples/ui/Counter.tsx',
  '../examples/ui/Dashboard.tsx',
];

console.log('='.repeat(80));
console.log('DEPENDENCY EXTRACTOR POC TEST');
console.log('='.repeat(80));

for (const testFile of testFiles) {
  const filePath = resolve(__dirname, '..', '..', testFile);

  console.log(`\n📄 Testing: ${testFile}`);
  console.log('-'.repeat(80));

  try {
    const result = extractDependencies({
      filePath,
      verbose: true,
      recursive: false,
    });

    console.log('\n✅ RESULTS:');
    console.log('NPM Packages:', result.npmPackages);
    console.log('Local Files:', result.localFiles);
    console.log('Stylesheets:', result.stylesheets);
    console.log('Scripts:', result.scripts);
    console.log('Dynamic Imports:', result.dynamicImports);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }

  console.log('');
}

// Test with inline code
console.log('\n' + '='.repeat(80));
console.log('TESTING INLINE CODE');
console.log('='.repeat(80));

const inlineCode = `
import React, { useState } from 'react';
import { Chart } from 'recharts';
import { formatDate } from 'date-fns';
import { Button } from './components/Button';
import './Dashboard.css';
import './theme.scss';
import analytics from './analytics.js';
`;

console.log('\nSource code:');
console.log(inlineCode);

import { extractDependenciesFromCode } from './dependency-extractor.js';

const inlineResult = extractDependenciesFromCode(inlineCode);

console.log('\n✅ RESULTS:');
console.log('NPM Packages:', inlineResult.npmPackages);
console.log('Local Files:', inlineResult.localFiles);
console.log('Stylesheets:', inlineResult.stylesheets);
console.log('Scripts:', inlineResult.scripts);

console.log('\n' + '='.repeat(80));
console.log('POC VALIDATION COMPLETE');
console.log('='.repeat(80));
