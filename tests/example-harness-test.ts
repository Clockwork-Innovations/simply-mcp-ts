#!/usr/bin/env npx tsx
/**
 * Example Test Harness
 *
 * Demonstrates usage of the complete test artifact management infrastructure:
 * - TestArtifactManager for file and artifact management
 * - TestReporter for test result tracking and reporting
 * - Browser helpers for Chrome MCP integration
 * - MCPTestClient for MCP server communication
 *
 * This example test:
 * 1. Creates artifact manager
 * 2. Creates 50MB test payload
 * 3. Saves HTML content
 * 4. Prepares screenshot capture
 * 5. Generates test report
 * 6. Verifies cleanup removes large files
 * 7. Checks .gitignore prevents commits
 *
 * Usage:
 *   npx tsx tests/example-harness-test.ts
 *   npx tsx tests/example-harness-test.ts --verbose
 */

import { TestArtifactManager } from './utils/artifact-manager.js';
import { TestReporter } from './utils/test-reporter.js';
import { MCPTestClient } from './utils/mcp-test-client.js';
import * as browser from './utils/browser-helpers.js';
import { colors } from './utils/test-helpers.js';
import * as fs from 'fs';

// ============================================================================
// Configuration
// ============================================================================

const VERBOSE = process.argv.includes('--verbose');
const TEST_DIR = '/tmp/mcp-ui-aggressive-test';
const SERVER_URL = 'http://localhost:3001/mcp';

// ============================================================================
// Main Test
// ============================================================================

async function main() {
  console.log(`\n${colors.blue}╔═══════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║       Example Test Harness - Infrastructure Demo                  ║${colors.reset}`);
  console.log(`${colors.blue}╚═══════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // ============================================================================
  // Step 1: Initialize Artifact Manager
  // ============================================================================

  console.log(`${colors.cyan}Step 1: Initialize Artifact Manager${colors.reset}\n`);

  const manager = new TestArtifactManager(TEST_DIR, {
    verbose: VERBOSE,
    autoCleanup: true,
    cleanupThresholdMB: 10,
  });

  await manager.ensureTestDirectory();
  console.log(`${colors.green}✓${colors.reset} Test directory created: ${TEST_DIR}\n`);

  // ============================================================================
  // Step 2: Initialize Test Reporter
  // ============================================================================

  console.log(`${colors.cyan}Step 2: Initialize Test Reporter${colors.reset}\n`);

  const reporter = new TestReporter(manager);
  reporter.startSuite('Example Harness Test');

  console.log(`${colors.green}✓${colors.reset} Test reporter initialized\n`);

  // ============================================================================
  // Step 3: Test Large Payload Creation
  // ============================================================================

  console.log(`${colors.cyan}Step 3: Test Large Payload Creation${colors.reset}\n`);

  reporter.startTest('Create 50MB test payload');
  try {
    const payloadPath = await manager.createLargePayload(50, 'test-payload-50mb.bin');
    console.log(`${colors.green}✓${colors.reset} Created 50MB payload: ${payloadPath}`);

    // Verify file exists and has correct size
    const stats = fs.statSync(payloadPath);
    const sizeMB = stats.size / (1024 * 1024);
    console.log(`${colors.green}✓${colors.reset} Verified payload size: ${sizeMB.toFixed(2)} MB`);

    if (Math.abs(sizeMB - 50) > 0.1) {
      throw new Error(`Payload size mismatch: expected 50MB, got ${sizeMB.toFixed(2)}MB`);
    }

    reporter.passTest([payloadPath]);
  } catch (error: any) {
    console.log(`${colors.red}✗${colors.reset} Failed: ${error.message}`);
    reporter.failTest(error);
  }
  console.log();

  // ============================================================================
  // Step 4: Test HTML Saving
  // ============================================================================

  console.log(`${colors.cyan}Step 4: Test HTML Saving${colors.reset}\n`);

  reporter.startTest('Save HTML content');
  try {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test Page</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    h1 { color: #2c3e50; }
  </style>
</head>
<body>
  <h1>MCP UI Test Page</h1>
  <p>This is a test page for browser automation testing.</p>
  <button id="testBtn">Click Me</button>
  <input type="text" id="testInput" placeholder="Enter text">
</body>
</html>`;

    const htmlPath = await manager.saveHTML(html, 'test-page.html');
    console.log(`${colors.green}✓${colors.reset} Saved HTML: ${htmlPath}`);

    // Verify file exists
    if (!fs.existsSync(htmlPath)) {
      throw new Error('HTML file was not created');
    }

    const fileUrl = `file://${htmlPath}`;
    console.log(`${colors.green}✓${colors.reset} File URL: ${fileUrl}`);

    reporter.passTest([htmlPath]);
  } catch (error: any) {
    console.log(`${colors.red}✗${colors.reset} Failed: ${error.message}`);
    reporter.failTest(error);
  }
  console.log();

  // ============================================================================
  // Step 5: Test Screenshot Capture Preparation
  // ============================================================================

  console.log(`${colors.cyan}Step 5: Test Screenshot Capture Preparation${colors.reset}\n`);

  reporter.startTest('Prepare screenshot capture');
  try {
    const url = `file://${TEST_DIR}/test-page.html`;
    const screenshotPath = manager.captureScreenshot(url, 'test-screenshot.png');

    console.log(`${colors.green}✓${colors.reset} Screenshot path prepared: ${screenshotPath}`);
    console.log(`${colors.yellow}⚠${colors.reset}  Chrome MCP required to capture actual screenshot:`);
    console.log(`   ${colors.dim}mcp__chrome-devtools__navigate_page({ url: "${url}" })${colors.reset}`);
    console.log(`   ${colors.dim}mcp__chrome-devtools__take_screenshot({ filePath: "${screenshotPath}" })${colors.reset}`);

    reporter.warnTest('Screenshot capture requires Chrome MCP invocation', [screenshotPath]);
  } catch (error: any) {
    console.log(`${colors.red}✗${colors.reset} Failed: ${error.message}`);
    reporter.failTest(error);
  }
  console.log();

  // ============================================================================
  // Step 6: Test Browser Helper Functions
  // ============================================================================

  console.log(`${colors.cyan}Step 6: Test Browser Helper Functions${colors.reset}\n`);

  reporter.startTest('Parse snapshot content');
  try {
    // Simulate a snapshot result
    const mockSnapshot = `[uid=1] Heading: MCP UI Test Page
[uid=2] Paragraph: This is a test page for browser automation testing.
[uid=3] Button: Click Me
[uid=4] TextInput: Enter text`;

    const snapshotResult = browser.parseSnapshot(mockSnapshot);
    console.log(`${colors.green}✓${colors.reset} Parsed ${snapshotResult.elements.length} elements`);

    // Find element by text
    const buttonUid = browser.findElementByText(snapshotResult, 'Click Me');
    if (!buttonUid) {
      throw new Error('Failed to find button element');
    }
    console.log(`${colors.green}✓${colors.reset} Found button UID: ${buttonUid}`);

    // Verify elements present
    const verification = browser.verifyElementsPresent(snapshotResult, [
      'MCP UI Test Page',
      'Click Me',
      'Enter text',
    ]);

    if (!verification.success) {
      throw new Error(`Verification failed: ${verification.details}`);
    }
    console.log(`${colors.green}✓${colors.reset} All expected elements found`);

    reporter.passTest();
  } catch (error: any) {
    console.log(`${colors.red}✗${colors.reset} Failed: ${error.message}`);
    reporter.failTest(error);
  }
  console.log();

  // ============================================================================
  // Step 7: Test MCP Client (Optional)
  // ============================================================================

  console.log(`${colors.cyan}Step 7: Test MCP Client Connection${colors.reset}\n`);

  reporter.startTest('Connect to MCP server');
  try {
    const client = new MCPTestClient({ verbose: VERBOSE });
    await client.connect(SERVER_URL);

    console.log(`${colors.green}✓${colors.reset} Connected to MCP server: ${SERVER_URL}`);

    const resources = await client.listResources();
    console.log(`${colors.green}✓${colors.reset} Found ${resources.length} resources`);

    const tools = await client.listTools();
    console.log(`${colors.green}✓${colors.reset} Found ${tools.length} tools`);

    await client.disconnect();
    console.log(`${colors.green}✓${colors.reset} Disconnected from MCP server`);

    reporter.passTest();
  } catch (error: any) {
    console.log(`${colors.yellow}⚠${colors.reset}  MCP server not available: ${error.message}`);
    reporter.skipTest('MCP server not running');
  }
  console.log();

  // ============================================================================
  // Step 8: Test Artifact Statistics
  // ============================================================================

  console.log(`${colors.cyan}Step 8: Test Artifact Statistics${colors.reset}\n`);

  reporter.startTest('Get artifact statistics');
  try {
    const stats = manager.getStats();
    console.log(`${colors.green}✓${colors.reset} Total artifacts: ${stats.totalFiles}`);
    console.log(`${colors.green}✓${colors.reset} Total size: ${(stats.totalSize / (1024 * 1024)).toFixed(2)} MB`);

    for (const [type, data] of Object.entries(stats.byType)) {
      const sizeMB = (data.size / (1024 * 1024)).toFixed(2);
      console.log(`   ${type}: ${data.count} files (${sizeMB} MB)`);
    }

    reporter.passTest();
  } catch (error: any) {
    console.log(`${colors.red}✗${colors.reset} Failed: ${error.message}`);
    reporter.failTest(error);
  }
  console.log();

  // ============================================================================
  // Step 9: Generate Test Report
  // ============================================================================

  console.log(`${colors.cyan}Step 9: Generate Test Report${colors.reset}\n`);

  reporter.endSuite();

  try {
    const reportPath = await reporter.generateReport();
    console.log(`${colors.green}✓${colors.reset} Report generated: ${reportPath}`);

    // Also generate HTML report
    const htmlReportPath = `${TEST_DIR}/REPORT.html`;
    if (fs.existsSync(htmlReportPath)) {
      console.log(`${colors.green}✓${colors.reset} HTML report: ${htmlReportPath}`);
    }
  } catch (error: any) {
    console.log(`${colors.red}✗${colors.reset} Report generation failed: ${error.message}`);
  }
  console.log();

  // ============================================================================
  // Step 10: Test Cleanup
  // ============================================================================

  console.log(`${colors.cyan}Step 10: Test Large File Cleanup${colors.reset}\n`);

  try {
    // Check large files before cleanup
    const beforeStats = manager.getStats();
    const largeFilesBefore = manager.getArtifacts().filter(
      a => a.size > 10 * 1024 * 1024
    );
    console.log(`${colors.yellow}→${colors.reset} Large files before cleanup: ${largeFilesBefore.length}`);

    // Cleanup
    await manager.cleanupLargeFiles();
    console.log(`${colors.green}✓${colors.reset} Cleanup completed`);

    // Check after cleanup
    const afterStats = manager.getStats();
    const largeFilesAfter = manager.getArtifacts().filter(
      a => a.size > 10 * 1024 * 1024
    );
    console.log(`${colors.green}✓${colors.reset} Large files after cleanup: ${largeFilesAfter.length}`);

    if (largeFilesAfter.length === 0) {
      console.log(`${colors.green}✓${colors.reset} All large files cleaned up successfully`);
    } else {
      console.log(`${colors.yellow}⚠${colors.reset}  Some large files remain (may be reports)`);
    }
  } catch (error: any) {
    console.log(`${colors.red}✗${colors.reset} Cleanup failed: ${error.message}`);
  }
  console.log();

  // ============================================================================
  // Step 11: Save Logs
  // ============================================================================

  console.log(`${colors.cyan}Step 11: Save Test Logs${colors.reset}\n`);

  try {
    const logPath = await manager.saveLog('example-harness.log');
    console.log(`${colors.green}✓${colors.reset} Logs saved: ${logPath}`);
  } catch (error: any) {
    console.log(`${colors.red}✗${colors.reset} Log saving failed: ${error.message}`);
  }
  console.log();

  // ============================================================================
  // Step 12: Print Summary
  // ============================================================================

  console.log(`${colors.cyan}Step 12: Print Test Summary${colors.reset}\n`);

  reporter.printSummary();

  // ============================================================================
  // Step 13: Verify .gitignore
  // ============================================================================

  console.log(`${colors.cyan}Step 13: Verify .gitignore Configuration${colors.reset}\n`);

  try {
    const gitignorePath = process.cwd() + '/.gitignore';
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');

    const requiredPatterns = [
      '/tmp/mcp-ui-aggressive-test/',
      'tests/artifacts/',
      '*.test-artifact.*',
      '*.large-payload.*',
      'REPORT.md',
      'REPORT.html',
    ];

    let allPresent = true;
    for (const pattern of requiredPatterns) {
      if (gitignoreContent.includes(pattern)) {
        console.log(`${colors.green}✓${colors.reset} Pattern present: ${pattern}`);
      } else {
        console.log(`${colors.red}✗${colors.reset} Pattern missing: ${pattern}`);
        allPresent = false;
      }
    }

    if (allPresent) {
      console.log(`\n${colors.green}✓${colors.reset} All required .gitignore patterns present`);
    } else {
      console.log(`\n${colors.yellow}⚠${colors.reset}  Some .gitignore patterns missing`);
    }
  } catch (error: any) {
    console.log(`${colors.red}✗${colors.reset} .gitignore verification failed: ${error.message}`);
  }
  console.log();

  // ============================================================================
  // Final Summary
  // ============================================================================

  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}Example Test Harness Complete${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}\n`);

  const summary = reporter.getSummary();
  console.log(`${colors.bright}Results:${colors.reset}`);
  console.log(`  Passed:  ${colors.green}${summary.passed}${colors.reset}`);
  console.log(`  Failed:  ${colors.red}${summary.failed}${colors.reset}`);
  console.log(`  Warned:  ${colors.yellow}${summary.warned}${colors.reset}`);
  console.log(`  Skipped: ${colors.dim}${summary.skipped}${colors.reset}`);
  console.log(`  Success Rate: ${summary.successRate.toFixed(1)}%`);
  console.log();

  console.log(`${colors.bright}Artifacts:${colors.reset}`);
  console.log(`  Directory: ${TEST_DIR}`);
  console.log(`  Total Files: ${manager.getStats().totalFiles}`);
  console.log(`  Total Size: ${(manager.getStats().totalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log();

  console.log(`${colors.bright}Next Steps:${colors.reset}`);
  console.log(`  1. Review generated report: ${TEST_DIR}/REPORT.md`);
  console.log(`  2. Open HTML report: ${TEST_DIR}/REPORT.html`);
  console.log(`  3. Check logs: ${TEST_DIR}/example-harness.log`);
  console.log(`  4. Run full test suite: npx tsx tests/run-aggressive-tests.ts`);
  console.log();

  // Exit with appropriate code
  process.exit(summary.failed > 0 ? 1 : 0);
}

// Run the test
main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
