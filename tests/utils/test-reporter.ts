/**
 * Test Reporter
 *
 * Comprehensive test result tracking and reporting for aggressive MCP UI testing.
 * Tracks test execution, generates detailed reports, and provides summary statistics.
 *
 * Features:
 * - Test suite and individual test tracking
 * - Pass/fail/warn/skip status tracking
 * - Duration measurement
 * - Artifact linking
 * - Markdown and HTML report generation
 * - Console summary output
 *
 * Usage:
 *   const reporter = new TestReporter(artifactManager);
 *   reporter.startSuite('MCP UI Tests');
 *   reporter.startTest('Test resource loading');
 *   reporter.passTest(['screenshot1.png', 'html1.html']);
 *   reporter.endSuite();
 *   await reporter.generateReport();
 */

import type { TestArtifactManager } from './artifact-manager.js';
import { colors } from './test-helpers.js';

// ============================================================================
// Types
// ============================================================================

export type TestStatus = 'pass' | 'fail' | 'skip' | 'warn';

export interface TestResult {
  suite: string;
  name: string;
  status: TestStatus;
  duration: number;
  error?: string;
  artifacts?: string[];
  startTime: Date;
  endTime: Date;
}

export interface SuiteResult {
  name: string;
  tests: TestResult[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export interface TestSummary {
  totalSuites: number;
  totalTests: number;
  passed: number;
  failed: number;
  warned: number;
  skipped: number;
  totalDuration: number;
  successRate: number;
}

// ============================================================================
// TestReporter Class
// ============================================================================

export class TestReporter {
  private artifactManager: TestArtifactManager;
  private suites: SuiteResult[] = [];
  private currentSuite: SuiteResult | null = null;
  private currentTest: {
    name: string;
    startTime: Date;
  } | null = null;

  constructor(artifactManager: TestArtifactManager) {
    this.artifactManager = artifactManager;
  }

  // ============================================================================
  // Suite Management
  // ============================================================================

  /**
   * Start a test suite
   */
  startSuite(name: string): void {
    if (this.currentSuite) {
      throw new Error(`Suite "${this.currentSuite.name}" is already running. Call endSuite() first.`);
    }

    this.currentSuite = {
      name,
      tests: [],
      startTime: new Date(),
    };

    this.log(`Starting suite: ${name}`);
  }

  /**
   * End the current test suite
   */
  endSuite(): void {
    if (!this.currentSuite) {
      throw new Error('No suite is currently running');
    }

    if (this.currentTest) {
      throw new Error(`Test "${this.currentTest.name}" is still running. Complete the test first.`);
    }

    this.currentSuite.endTime = new Date();
    this.currentSuite.duration =
      this.currentSuite.endTime.getTime() - this.currentSuite.startTime.getTime();

    this.suites.push(this.currentSuite);
    this.log(`Ended suite: ${this.currentSuite.name} (${this.currentSuite.duration}ms)`);

    this.currentSuite = null;
  }

  // ============================================================================
  // Test Management
  // ============================================================================

  /**
   * Start a test
   */
  startTest(name: string): void {
    if (!this.currentSuite) {
      throw new Error('No suite is running. Call startSuite() first.');
    }

    if (this.currentTest) {
      throw new Error(`Test "${this.currentTest.name}" is already running. Complete it first.`);
    }

    this.currentTest = {
      name,
      startTime: new Date(),
    };

    this.log(`  Starting test: ${name}`);
  }

  /**
   * Mark test as passed
   */
  passTest(artifacts?: string[]): void {
    this.completeTest('pass', undefined, artifacts);
    this.logTest('pass', this.currentTest?.name || 'unknown');
  }

  /**
   * Mark test as failed
   */
  failTest(error: Error, artifacts?: string[]): void {
    this.completeTest('fail', error.message, artifacts);
    this.logTest('fail', this.currentTest?.name || 'unknown', error.message);
  }

  /**
   * Mark test as warned (passed with warnings)
   */
  warnTest(message: string, artifacts?: string[]): void {
    this.completeTest('warn', message, artifacts);
    this.logTest('warn', this.currentTest?.name || 'unknown', message);
  }

  /**
   * Mark test as skipped
   */
  skipTest(reason: string): void {
    this.completeTest('skip', reason);
    this.logTest('skip', this.currentTest?.name || 'unknown', reason);
  }

  /**
   * Complete current test
   */
  private completeTest(status: TestStatus, error?: string, artifacts?: string[]): void {
    if (!this.currentSuite) {
      throw new Error('No suite is running');
    }

    if (!this.currentTest) {
      throw new Error('No test is running');
    }

    const endTime = new Date();
    const duration = endTime.getTime() - this.currentTest.startTime.getTime();

    const result: TestResult = {
      suite: this.currentSuite.name,
      name: this.currentTest.name,
      status,
      duration,
      startTime: this.currentTest.startTime,
      endTime,
    };

    if (error) {
      result.error = error;
    }

    if (artifacts && artifacts.length > 0) {
      result.artifacts = artifacts;
    }

    this.currentSuite.tests.push(result);
    this.currentTest = null;
  }

  // ============================================================================
  // Results Access
  // ============================================================================

  /**
   * Get all test results
   */
  getResults(): TestResult[] {
    const allResults: TestResult[] = [];
    for (const suite of this.suites) {
      allResults.push(...suite.tests);
    }
    return allResults;
  }

  /**
   * Get all suite results
   */
  getSuites(): SuiteResult[] {
    return [...this.suites];
  }

  /**
   * Get summary statistics
   */
  getSummary(): TestSummary {
    const results = this.getResults();

    const summary: TestSummary = {
      totalSuites: this.suites.length,
      totalTests: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      warned: results.filter(r => r.status === 'warn').length,
      skipped: results.filter(r => r.status === 'skip').length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      successRate: 0,
    };

    const completed = summary.passed + summary.failed + summary.warned;
    summary.successRate = completed > 0 ? (summary.passed / completed) * 100 : 0;

    return summary;
  }

  // ============================================================================
  // Report Generation
  // ============================================================================

  /**
   * Generate comprehensive test report
   */
  async generateReport(): Promise<string> {
    this.log('Generating test report...');

    const summary = this.getSummary();
    const results = this.getResults();

    // Prepare report data
    const reportData = {
      title: 'MCP UI Aggressive Test Report',
      timestamp: new Date(),
      summary: {
        'Total Suites': summary.totalSuites,
        'Total Tests': summary.totalTests,
        'Passed': `${summary.passed} (${colors.green}✓${colors.reset})`,
        'Failed': `${summary.failed} (${colors.red}✗${colors.reset})`,
        'Warned': `${summary.warned} (${colors.yellow}⚠${colors.reset})`,
        'Skipped': `${summary.skipped}`,
        'Success Rate': `${summary.successRate.toFixed(1)}%`,
        'Total Duration': `${summary.totalDuration}ms`,
      },
      sections: this.suites.map(suite => ({
        title: suite.name,
        content: this.formatSuiteContent(suite),
        subsections: suite.tests.map(test => ({
          title: `${this.getStatusIcon(test.status)} ${test.name}`,
          content: this.formatTestContent(test),
        })),
      })),
      artifacts: this.artifactManager.getArtifacts(),
    };

    const reportPath = await this.artifactManager.generateReport(reportData);
    this.log(`Generated report: ${reportPath}`);

    return reportPath;
  }

  /**
   * Format suite content for report
   */
  private formatSuiteContent(suite: SuiteResult): string {
    const testCount = suite.tests.length;
    const passed = suite.tests.filter(t => t.status === 'pass').length;
    const failed = suite.tests.filter(t => t.status === 'fail').length;
    const warned = suite.tests.filter(t => t.status === 'warn').length;
    const skipped = suite.tests.filter(t => t.status === 'skip').length;

    let content = `**Tests:** ${testCount}\n`;
    content += `**Passed:** ${passed}\n`;
    if (failed > 0) content += `**Failed:** ${failed}\n`;
    if (warned > 0) content += `**Warned:** ${warned}\n`;
    if (skipped > 0) content += `**Skipped:** ${skipped}\n`;
    content += `**Duration:** ${suite.duration || 0}ms`;

    return content;
  }

  /**
   * Format test content for report
   */
  private formatTestContent(test: TestResult): string {
    let content = `**Status:** ${test.status.toUpperCase()}\n`;
    content += `**Duration:** ${test.duration}ms\n`;
    content += `**Start:** ${test.startTime.toISOString()}\n`;
    content += `**End:** ${test.endTime.toISOString()}\n`;

    if (test.error) {
      content += `\n**Error:**\n\`\`\`\n${test.error}\n\`\`\`\n`;
    }

    if (test.artifacts && test.artifacts.length > 0) {
      content += `\n**Artifacts:**\n`;
      for (const artifact of test.artifacts) {
        content += `- \`${artifact}\`\n`;
      }
    }

    return content;
  }

  /**
   * Get status icon for display
   */
  private getStatusIcon(status: TestStatus): string {
    switch (status) {
      case 'pass':
        return '✓';
      case 'fail':
        return '✗';
      case 'warn':
        return '⚠';
      case 'skip':
        return '○';
      default:
        return '?';
    }
  }

  // ============================================================================
  // Console Output
  // ============================================================================

  /**
   * Print test summary to console
   */
  printSummary(): void {
    const summary = this.getSummary();

    console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.bright}TEST SUMMARY${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}\n`);

    console.log(`${colors.bright}Suites:${colors.reset}  ${summary.totalSuites}`);
    console.log(`${colors.bright}Tests:${colors.reset}   ${summary.totalTests}`);
    console.log(`${colors.green}Passed:${colors.reset}  ${summary.passed}`);

    if (summary.failed > 0) {
      console.log(`${colors.red}Failed:${colors.reset}  ${summary.failed}`);
    }

    if (summary.warned > 0) {
      console.log(`${colors.yellow}Warned:${colors.reset}  ${summary.warned}`);
    }

    if (summary.skipped > 0) {
      console.log(`${colors.dim}Skipped:${colors.reset} ${summary.skipped}`);
    }

    console.log(
      `${colors.bright}Success Rate:${colors.reset} ${summary.successRate.toFixed(1)}%`
    );
    console.log(
      `${colors.bright}Total Duration:${colors.reset} ${summary.totalDuration}ms\n`
    );

    // Detailed results per suite
    for (const suite of this.suites) {
      console.log(`${colors.cyan}${suite.name}${colors.reset}`);

      for (const test of suite.tests) {
        const icon = this.getStatusIcon(test.status);
        const statusColor = this.getStatusColor(test.status);
        console.log(
          `  ${statusColor}${icon}${colors.reset} ${test.name} (${test.duration}ms)`
        );

        if (test.error) {
          console.log(`    ${colors.red}${test.error}${colors.reset}`);
        }
      }

      console.log();
    }

    console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}\n`);

    // Artifact statistics
    const stats = this.artifactManager.getStats();
    console.log(`${colors.bright}Artifacts:${colors.reset}`);
    console.log(`  Total Files: ${stats.totalFiles}`);
    console.log(`  Total Size: ${(stats.totalSize / (1024 * 1024)).toFixed(2)} MB\n`);

    for (const [type, data] of Object.entries(stats.byType)) {
      const sizeMB = (data.size / (1024 * 1024)).toFixed(2);
      console.log(`  ${type}: ${data.count} files (${sizeMB} MB)`);
    }

    console.log();
  }

  /**
   * Get color for test status
   */
  private getStatusColor(status: TestStatus): string {
    switch (status) {
      case 'pass':
        return colors.green;
      case 'fail':
        return colors.red;
      case 'warn':
        return colors.yellow;
      case 'skip':
        return colors.dim;
      default:
        return colors.reset;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Log message through artifact manager
   */
  private log(message: string): void {
    this.artifactManager.log(`[Reporter] ${message}`);
  }

  /**
   * Log test result
   */
  private logTest(status: TestStatus, name: string, message?: string): void {
    const statusStr = status.toUpperCase().padEnd(6);
    let logMessage = `  ${statusStr} ${name}`;
    if (message) {
      logMessage += ` - ${message}`;
    }
    this.log(logMessage);
  }

  /**
   * Reset reporter state (for testing)
   */
  reset(): void {
    this.suites = [];
    this.currentSuite = null;
    this.currentTest = null;
  }
}
