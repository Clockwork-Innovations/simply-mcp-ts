#!/usr/bin/env npx tsx

/**
 * Validates all example files by running them with --dry-run
 *
 * This script ensures all examples in the examples/ directory:
 * - Can be executed without errors
 * - Have correct MCP server configuration
 * - Are suitable for documentation and users to follow
 *
 * Exit codes:
 * - 0: All examples validated successfully
 * - 1: One or more examples failed validation
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  file: string;
  status: 'pass' | 'fail';
  error?: string;
  duration: number;
}

const EXAMPLES_DIR = './examples';
const TIMEOUT_MS = 30000; // 30 seconds per example
const REPORT_FILE = 'examples-validation-report.md';

// Examples to exclude from validation (experimental/demo-only)
// These examples showcase features that are still being integrated or are demos/tutorials
const EXCLUDED_EXAMPLES = [
  'ui-all-apis-demo.ts',                   // Demo-only file, showcases API styles
  'oauth-in-memory-simple.ts',             // Tutorial demo, not a runnable server
  'oauth-redis-production.ts',             // Tutorial demo, not a runnable server
  'oauth-provider-demo.ts',                // Tutorial demo, not a runnable server
  'oauth-router-demo.ts',                  // Tutorial demo, not a runnable server
  'oauth-scope-enforcement-demo.ts',       // Tutorial demo, not a runnable server
  'react-compiler-demo.ts',                // Demo file, not a runnable server
  'reference-oauth-provider.ts'            // Reference implementation, not a runnable server
];

async function validateExample(filePath: string): Promise<ValidationResult> {
  const startTime = Date.now();
  const file = path.basename(filePath);

  try {
    // Run with --dry-run to validate without execution
    const command = `npx simply-mcp run "${filePath}" --dry-run --verbose`;

    try {
      execSync(command, {
        stdio: 'pipe',
        timeout: TIMEOUT_MS,
        encoding: 'utf-8'
      });

      return {
        file,
        status: 'pass',
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      const output = error.stderr || error.message || String(error);
      return {
        file,
        status: 'fail',
        error: output.substring(0, 200), // First 200 chars of error
        duration: Date.now() - startTime
      };
    }
  } catch (error) {
    return {
      file,
      status: 'fail',
      error: `Unexpected error: ${String(error).substring(0, 200)}`,
      duration: Date.now() - startTime
    };
  }
}

function generateReport(results: ValidationResult[]): string {
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  let report = `# Examples Validation Report

**Date**: ${new Date().toISOString()}
**Total Examples**: ${results.length}
**Passed**: ${passed} ✅
**Failed**: ${failed} ❌
**Total Time**: ${(totalTime / 1000).toFixed(2)}s

## Summary

| Example | Status | Duration | Error |
|---------|--------|----------|-------|
`;

  for (const result of results) {
    const status = result.status === 'pass' ? '✅ Pass' : '❌ Fail';
    const error = result.error ? `\`${result.error.replace(/\|/g, '\\|')}\`` : '-';
    const duration = `${result.duration}ms`;
    report += `| ${result.file} | ${status} | ${duration} | ${error} |\n`;
  }

  if (failed > 0) {
    report += '\n## Failed Examples\n\n';
    for (const result of results) {
      if (result.status === 'fail') {
        report += `### ${result.file}\n\n\`\`\`\n${result.error}\n\`\`\`\n\n`;
      }
    }
  }

  report += `\n## Excluded Examples\n\n`;
  report += `${EXCLUDED_EXAMPLES.length} example(s) excluded from validation:\n`;
  for (const example of EXCLUDED_EXAMPLES) {
    report += `- ${example} (experimental/demo-only)\n`;
  }

  report += `\n## Status\n\n`;
  if (failed === 0) {
    report += '✅ **ALL VALIDATED EXAMPLES PASSED SUCCESSFULLY**\n';
  } else {
    report += `❌ **${failed} example(s) failed validation**\n`;
  }

  return report;
}

async function main() {
  console.log('🔍 Validating examples...\n');

  // Get all .ts files in examples/ (top-level only)
  const files = fs.readdirSync(EXAMPLES_DIR)
    .filter(f => f.endsWith('.ts') && !EXCLUDED_EXAMPLES.includes(f))
    .map(f => path.join(EXAMPLES_DIR, f))
    .sort();

  if (files.length === 0) {
    console.error('❌ No example files found');
    process.exit(1);
  }

  console.log(`Found ${files.length} examples to validate:\n`);
  files.forEach(f => console.log(`  - ${path.basename(f)}`));
  console.log('');

  // Validate each example
  const results: ValidationResult[] = [];
  for (const file of files) {
    const fileName = path.basename(file);
    process.stdout.write(`Validating ${fileName}... `);

    const result = await validateExample(file);
    results.push(result);

    if (result.status === 'pass') {
      console.log(`✅ (${result.duration}ms)`);
    } else {
      console.log(`❌ (${result.duration}ms)`);
    }
  }

  // Generate report
  console.log('\n📄 Generating report...\n');
  const report = generateReport(results);
  fs.writeFileSync(REPORT_FILE, report);
  console.log(`Report saved to: ${REPORT_FILE}\n`);

  // Print summary
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log('═'.repeat(60));
  console.log(`\n📊 VALIDATION RESULTS\n`);
  console.log(`Total: ${results.length} | Passed: ${passed} ✅ | Failed: ${failed} ❌`);
  console.log(`Time: ${(totalTime / 1000).toFixed(2)}s\n`);

  if (failed > 0) {
    console.log('❌ VALIDATION FAILED\n');
    console.log('Failed examples:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  - ${r.file}`);
    });
    console.log('');
    process.exit(1);
  } else {
    console.log('✅ ALL EXAMPLES VALIDATED SUCCESSFULLY\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Validation error:', error);
  process.exit(1);
});
