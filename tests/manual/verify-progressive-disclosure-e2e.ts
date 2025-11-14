#!/usr/bin/env node --import tsx
/**
 * End-to-End Progressive Disclosure Verification Test
 *
 * This test verifies that progressive disclosure is working correctly with the
 * 3-skill test server (weather, file, math). It uses the Anthropic Agent SDK
 * to create an AI agent and tracks ALL MCP requests to measure what was accessed.
 *
 * Test Objectives:
 * 1. Verify LLM chooses the correct skill based on query
 * 2. Verify LLM only reads the chosen skill (not all 3)
 * 3. Verify LLM only discovers tools from the chosen skill
 * 4. Verify task completes successfully
 * 5. Measure efficiency (% of unnecessary reads)
 *
 * Usage:
 * ```bash
 * # Build the project first
 * npm run build
 *
 * # Run the test
 * node --import tsx tests/manual/verify-progressive-disclosure-e2e.ts
 *
 * # Or with npm script (if added)
 * npm run test:progressive-disclosure
 * ```
 *
 * Expected Results:
 * - Weather query → reads only weather_analysis skill
 * - File query → reads only file_management skill
 * - Math query → reads only math_calculations skill
 * - Efficiency: 33% overhead (1 skill read out of 3 available)
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_PATH = resolve(__dirname, '../../dist/src/cli/index.js');
const TEST_SERVER_PATH = resolve(__dirname, '../../examples/progressive-disclosure-test-server.ts');

// ANSI color codes for beautiful output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Test scenario definition
interface TestScenario {
  name: string;
  query: string;
  expectedSkill: string;
  expectedToolPattern: string;
  description: string;
}

// Test metrics
interface TestMetrics {
  skillsAvailable: number;
  skillsRead: string[];
  toolsCalled: string[];
  resourcesRead: string[];
  chosenSkill: string | null;
  correctSkill: boolean;
  successfulCompletion: boolean;
  unnecessaryReads: number;
  efficiencyScore: number; // 0-100, higher is better
}

// Test result
interface TestResult {
  scenario: TestScenario;
  metrics: TestMetrics;
  passed: boolean;
  responseText: string;
  errors: string[];
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Weather Query',
    query: "What's the weather forecast for tomorrow in San Francisco?",
    expectedSkill: 'weather_analysis',
    expectedToolPattern: 'get_forecast|get_weather',
    description: 'Should choose weather_analysis skill and use weather tools',
  },
  {
    name: 'File Operation',
    query: 'List all files in my documents folder',
    expectedSkill: 'file_management',
    expectedToolPattern: 'list_files',
    description: 'Should choose file_management skill and use file tools',
  },
  {
    name: 'Math Calculation',
    query: 'Calculate the average of these numbers: 10, 20, 30, 40, 50',
    expectedSkill: 'math_calculations',
    expectedToolPattern: 'calculate_stats|add',
    description: 'Should choose math_calculations skill and use math tools',
  },
];

/**
 * Create MCP server configuration for Agent SDK
 */
function createMcpConfig() {
  return {
    'pd-test': {
      type: 'stdio' as const,
      command: 'node',
      args: [
        '--import', 'tsx',
        CLI_PATH,
        'run',
        TEST_SERVER_PATH,
        '--transport', 'stdio',
      ],
      env: {
        MCP_TIMEOUT: '30000',
        NODE_ENV: 'test',
      },
    },
  };
}

/**
 * Run a single test scenario
 */
async function runTestScenario(scenario: TestScenario): Promise<TestResult> {
  console.log(`\n${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Scenario: ${scenario.name}${colors.reset}`);
  console.log(`${colors.dim}Query: "${scenario.query}"${colors.reset}`);
  console.log(`${colors.dim}Expected Skill: ${scenario.expectedSkill}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  const mcpConfig = createMcpConfig();
  const metrics: TestMetrics = {
    skillsAvailable: 3, // weather, file, math
    skillsRead: [],
    toolsCalled: [],
    resourcesRead: [],
    chosenSkill: null,
    correctSkill: false,
    successfulCompletion: false,
    unnecessaryReads: 0,
    efficiencyScore: 0,
  };

  const errors: string[] = [];
  const responseTexts: string[] = [];

  try {
    console.log(`${colors.blue}📡 Querying Claude with progressive disclosure server...${colors.reset}\n`);

    for await (const message of query({
      prompt: scenario.query,
      options: {
        mcpServers: mcpConfig,
        model: 'claude-3-5-haiku-20241022', // Fast model for testing
      },
    })) {
      // Collect response text
      if (message.type === 'text') {
        responseTexts.push(message.content);
        process.stdout.write('.');
      }

      // Track tool calls
      if (message.type === 'tool_use') {
        const toolCall = message as any;
        const toolName = toolCall.name || '';

        // Extract the actual tool name (strip mcp__ prefix)
        const actualToolName = toolName.replace(/^mcp__pd-test__/, '');
        metrics.toolsCalled.push(actualToolName);

        console.log(`\n${colors.yellow}🔧 Tool called: ${actualToolName}${colors.reset}`);

        // Determine which skill this tool belongs to
        if (actualToolName.match(/get_weather|get_forecast|analyze_climate/)) {
          if (!metrics.chosenSkill) metrics.chosenSkill = 'weather_analysis';
        } else if (actualToolName.match(/list_files|read_file|write_file|delete_file/)) {
          if (!metrics.chosenSkill) metrics.chosenSkill = 'file_management';
        } else if (actualToolName.match(/add|subtract|multiply|divide|calculate_stats/)) {
          if (!metrics.chosenSkill) metrics.chosenSkill = 'math_calculations';
        }
      }

      // Track tool results (indicates success)
      if (message.type === 'tool_result') {
        const toolResult = message as any;
        if (!toolResult.isError) {
          metrics.successfulCompletion = true;
        }
      }

      // Track resource reads (skill access)
      if (message.type === 'resource_read') {
        const resourceRead = message as any;
        const resourceUri = resourceRead.uri || '';
        metrics.resourcesRead.push(resourceUri);

        console.log(`\n${colors.magenta}📖 Resource read: ${resourceUri}${colors.reset}`);

        // Track skill reads
        if (resourceUri.includes('skill://weather_analysis')) {
          metrics.skillsRead.push('weather_analysis');
        } else if (resourceUri.includes('skill://file_management')) {
          metrics.skillsRead.push('file_management');
        } else if (resourceUri.includes('skill://math_calculations')) {
          metrics.skillsRead.push('math_calculations');
        }
      }
    }

    console.log('\n');

  } catch (error: any) {
    console.error(`\n${colors.red}❌ Error during test: ${error.message}${colors.reset}\n`);
    errors.push(error.message);
  }

  // Calculate metrics
  const uniqueSkillsRead = [...new Set(metrics.skillsRead)];
  metrics.skillsRead = uniqueSkillsRead;
  metrics.correctSkill = metrics.chosenSkill === scenario.expectedSkill;
  metrics.unnecessaryReads = uniqueSkillsRead.length - 1; // -1 for the correct skill

  // Efficiency score: 100% = perfect (only read 1 skill), 0% = worst (read all skills)
  // Formula: 100 - (unnecessary_reads / (total_skills - 1)) * 100
  const maxUnnecessary = metrics.skillsAvailable - 1;
  metrics.efficiencyScore = Math.round(100 - (metrics.unnecessaryReads / maxUnnecessary) * 100);

  // Determine if test passed
  const passed =
    metrics.correctSkill &&
    metrics.successfulCompletion &&
    metrics.unnecessaryReads === 0 &&
    metrics.toolsCalled.some(tool => tool.match(new RegExp(scenario.expectedToolPattern)));

  return {
    scenario,
    metrics,
    passed,
    responseText: responseTexts.join(' '),
    errors,
  };
}

/**
 * Print detailed test results
 */
function printTestResult(result: TestResult) {
  const { scenario, metrics, passed, responseText, errors } = result;

  console.log(`${colors.bright}Results:${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(70)}${colors.reset}`);

  // Expected vs Actual
  console.log(`\n${colors.bright}Expected Skill:${colors.reset} ${scenario.expectedSkill}`);
  console.log(`${colors.bright}Actual Skill:${colors.reset}   ${metrics.chosenSkill || 'NONE'} ${
    metrics.correctSkill ? colors.green + '✓' + colors.reset : colors.red + '✗' + colors.reset
  }`);

  // Skills Read
  console.log(`\n${colors.bright}Skills Read:${colors.reset} ${metrics.skillsRead.length}/${metrics.skillsAvailable}`);
  metrics.skillsRead.forEach(skill => {
    const isExpected = skill === scenario.expectedSkill;
    const icon = isExpected ? colors.green + '✓' : colors.red + '✗';
    console.log(`  ${icon} ${skill}${colors.reset}`);
  });

  // Tools Called
  console.log(`\n${colors.bright}Tools Called:${colors.reset} ${metrics.toolsCalled.length}`);
  const toolPattern = new RegExp(scenario.expectedToolPattern);
  metrics.toolsCalled.forEach(tool => {
    const isExpected = toolPattern.test(tool);
    const icon = isExpected ? colors.green + '✓' : colors.yellow + '•';
    console.log(`  ${icon} ${tool}${colors.reset}`);
  });

  // Efficiency
  console.log(`\n${colors.bright}Efficiency Metrics:${colors.reset}`);
  console.log(`  Unnecessary Reads: ${metrics.unnecessaryReads} ${
    metrics.unnecessaryReads === 0 ? colors.green + '✓' : colors.red + '✗'
  }${colors.reset}`);
  console.log(`  Efficiency Score:  ${metrics.efficiencyScore}% ${
    metrics.efficiencyScore >= 100 ? colors.green + '(PERFECT)' :
    metrics.efficiencyScore >= 66 ? colors.yellow + '(GOOD)' :
    colors.red + '(POOR)'
  }${colors.reset}`);

  // Success
  console.log(`\n${colors.bright}Task Completion:${colors.reset}   ${
    metrics.successfulCompletion ? colors.green + '✓ Success' : colors.red + '✗ Failed'
  }${colors.reset}`);

  // Response Preview
  if (responseText) {
    console.log(`\n${colors.bright}Response Preview:${colors.reset}`);
    const preview = responseText.substring(0, 200);
    console.log(`  ${colors.dim}"${preview}${responseText.length > 200 ? '...' : ''}"${colors.reset}`);
  }

  // Errors
  if (errors.length > 0) {
    console.log(`\n${colors.red}${colors.bright}Errors:${colors.reset}`);
    errors.forEach(error => {
      console.log(`  ${colors.red}• ${error}${colors.reset}`);
    });
  }

  // Overall Result
  console.log(`\n${colors.bright}Overall Result:${colors.reset}    ${
    passed ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'
  }${colors.reset}`);
}

/**
 * Print summary report
 */
function printSummaryReport(results: TestResult[]) {
  console.log(`\n${colors.cyan}${colors.bright}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}Progressive Disclosure Test Report${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);

  // Individual Results
  results.forEach((result, index) => {
    const status = result.passed ? colors.green + '✅ PASS' : colors.red + '❌ FAIL';
    console.log(`${index + 1}. ${result.scenario.name.padEnd(30)} ${status}${colors.reset}`);
    console.log(`   Expected: ${result.scenario.expectedSkill}`);
    console.log(`   Actual:   ${result.metrics.chosenSkill || 'NONE'}`);
    console.log(`   Skills Read: ${result.metrics.skillsRead.length}/3 (${result.metrics.efficiencyScore}% efficient)`);
    console.log(`   Tools Called: ${result.metrics.toolsCalled.length}`);
    console.log('');
  });

  // Aggregate Statistics
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const avgEfficiency = Math.round(
    results.reduce((sum, r) => sum + r.metrics.efficiencyScore, 0) / totalTests
  );
  const avgSkillsRead = (
    results.reduce((sum, r) => sum + r.metrics.skillsRead.length, 0) / totalTests
  ).toFixed(1);
  const avgToolsCalled = (
    results.reduce((sum, r) => sum + r.metrics.toolsCalled.length, 0) / totalTests
  ).toFixed(1);

  console.log(`${colors.cyan}${'─'.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}Summary${colors.reset}\n`);
  console.log(`Success Rate:        ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  console.log(`Average Efficiency:  ${avgEfficiency}% ${
    avgEfficiency >= 100 ? colors.green + '(PERFECT)' :
    avgEfficiency >= 66 ? colors.yellow + '(GOOD)' :
    colors.red + '(POOR)'
  }${colors.reset}`);
  console.log(`Avg Skills Read:     ${avgSkillsRead}/3 (target: 1.0)`);
  console.log(`Avg Tools Called:    ${avgToolsCalled} per query`);

  // Progressive Disclosure Status
  const progressiveDisclosureWorking =
    passedTests === totalTests &&
    avgEfficiency >= 100;

  console.log(`\n${colors.bright}Progressive Disclosure:${colors.reset} ${
    progressiveDisclosureWorking
      ? colors.green + '✅ WORKING PERFECTLY'
      : colors.yellow + '⚠️  NEEDS IMPROVEMENT'
  }${colors.reset}`);

  // Conclusion
  console.log(`\n${colors.cyan}${'─'.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}Conclusion${colors.reset}\n`);

  if (progressiveDisclosureWorking) {
    console.log(`${colors.green}✅ All tests passed! Progressive disclosure is working correctly.${colors.reset}`);
    console.log(`${colors.green}   The LLM efficiently chooses the right skill and only reads necessary${colors.reset}`);
    console.log(`${colors.green}   capabilities, resulting in optimal token usage.${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  Some tests failed or efficiency could be improved.${colors.reset}`);
    console.log(`${colors.yellow}   Review the results above to identify issues.${colors.reset}`);

    if (avgEfficiency < 100) {
      console.log(`\n${colors.yellow}   Issue: LLM is reading multiple skills instead of just one.${colors.reset}`);
      console.log(`${colors.yellow}   This increases token usage and defeats progressive disclosure.${colors.reset}`);
    }

    if (passedTests < totalTests) {
      console.log(`\n${colors.yellow}   Issue: Some tests failed to complete successfully.${colors.reset}`);
      console.log(`${colors.yellow}   Check if the LLM is choosing the wrong skill or tools.${colors.reset}`);
    }
  }

  console.log(`\n${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);
}

/**
 * Main test execution
 */
async function main() {
  console.log(`${colors.cyan}${colors.bright}╔═══════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}║  Progressive Disclosure End-to-End Verification Test             ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}╚═══════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.dim}CLI Path:     ${CLI_PATH}${colors.reset}`);
  console.log(`${colors.dim}Test Server:  ${TEST_SERVER_PATH}${colors.reset}`);
  console.log(`${colors.dim}Test Scenarios: ${TEST_SCENARIOS.length}${colors.reset}\n`);

  const results: TestResult[] = [];

  // Run all test scenarios
  for (const scenario of TEST_SCENARIOS) {
    const result = await runTestScenario(scenario);
    printTestResult(result);
    results.push(result);
  }

  // Print summary report
  printSummaryReport(results);

  // Exit with appropriate code
  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

// Error handling
main().catch(error => {
  console.error(`\n${colors.red}${colors.bright}💥 Fatal error:${colors.reset}`);
  console.error(`${colors.red}${error.stack || error.message}${colors.reset}\n`);
  process.exit(1);
});
