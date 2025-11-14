#!/usr/bin/env node --import tsx
/**
 * Progressive Disclosure MCP Protocol Verification
 *
 * This script verifies that progressive disclosure is correctly implemented at the
 * MCP protocol level. It does NOT test end-to-end LLM behavior (which requires
 * Claude CLI with subscription - see PRE-RELEASE-CHECKLIST.md for those tests).
 *
 * What this tests:
 * 1. tools/list returns empty array (tools hidden)
 * 2. resources/list returns 3 skills (skills visible)
 * 3. resources/read works for each skill
 * 4. Skill content includes tool documentation
 *
 * Usage:
 * ```bash
 * npm run build
 * node --import tsx tests/manual/verify-progressive-disclosure.ts
 * ```
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_PATH = resolve(__dirname, '../../dist/src/cli/index.js');
const TEST_SERVER = resolve(__dirname, '../../examples/progressive-disclosure-test-server.ts');

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

async function sendMcpRequest(method: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [
      CLI_PATH,
      'run',
      TEST_SERVER,
      '--transport',
      'stdio'
    ]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        // Find JSON-RPC response in stdout
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('{')) {
            const response = JSON.parse(line);
            resolve(response);
            return;
          }
        }
        reject(new Error('No JSON-RPC response found'));
      } catch (error) {
        reject(error);
      }
    });

    // Send request
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    });
    child.stdin.write(request + '\n');
    child.stdin.end();
  });
}

async function test1_ToolsListIsEmpty(): Promise<void> {
  console.log(`\n${colors.cyan}Test 1: tools/list should return empty array${colors.reset}`);

  try {
    const response = await sendMcpRequest('tools/list');
    const tools = response.result?.tools || [];

    if (tools.length === 0) {
      results.push({
        name: 'tools/list returns empty',
        passed: true,
        message: 'All tools are hidden initially',
        details: { toolCount: 0 }
      });
      console.log(`${colors.green}✓ PASS${colors.reset} - tools/list returned empty array`);
    } else {
      results.push({
        name: 'tools/list returns empty',
        passed: false,
        message: `Expected 0 tools, got ${tools.length}`,
        details: { tools }
      });
      console.log(`${colors.red}✗ FAIL${colors.reset} - tools/list returned ${tools.length} tools (expected 0)`);
    }
  } catch (error: any) {
    results.push({
      name: 'tools/list returns empty',
      passed: false,
      message: error.message
    });
    console.log(`${colors.red}✗ ERROR${colors.reset} - ${error.message}`);
  }
}

async function test2_ResourcesListShowsSkills(): Promise<void> {
  console.log(`\n${colors.cyan}Test 2: resources/list should return 3 skills${colors.reset}`);

  try {
    const response = await sendMcpRequest('resources/list');
    const resources = response.result?.resources || [];

    const expectedSkills = [
      'skill://weather_analysis',
      'skill://file_management',
      'skill://math_calculations'
    ];

    const skillUris = resources.map((r: any) => r.uri);
    const allPresent = expectedSkills.every(uri => skillUris.includes(uri));

    if (resources.length === 3 && allPresent) {
      results.push({
        name: 'resources/list returns 3 skills',
        passed: true,
        message: 'All 3 skills visible as resources',
        details: { skills: skillUris }
      });
      console.log(`${colors.green}✓ PASS${colors.reset} - resources/list returned 3 skills`);
      skillUris.forEach((uri: string) => {
        console.log(`  ${colors.dim}- ${uri}${colors.reset}`);
      });
    } else {
      results.push({
        name: 'resources/list returns 3 skills',
        passed: false,
        message: `Expected 3 skills, got ${resources.length}`,
        details: { resources }
      });
      console.log(`${colors.red}✗ FAIL${colors.reset} - Expected 3 skills, got ${resources.length}`);
    }
  } catch (error: any) {
    results.push({
      name: 'resources/list returns 3 skills',
      passed: false,
      message: error.message
    });
    console.log(`${colors.red}✗ ERROR${colors.reset} - ${error.message}`);
  }
}

async function test3_SkillContentIncludesTools(): Promise<void> {
  console.log(`\n${colors.cyan}Test 3: Skill content should include tool documentation${colors.reset}`);

  const skillsToTest = [
    { uri: 'skill://math_calculations', expectedTool: 'calculate_stats' },
    { uri: 'skill://weather_analysis', expectedTool: 'get_forecast' },
    { uri: 'skill://file_management', expectedTool: 'list_files' }
  ];

  for (const { uri, expectedTool } of skillsToTest) {
    try {
      const response = await sendMcpRequest('resources/read', { uri });
      const content = response.result?.contents?.[0]?.text || '';

      if (content.includes(expectedTool)) {
        results.push({
          name: `${uri} includes ${expectedTool}`,
          passed: true,
          message: `Skill content includes ${expectedTool} tool`,
          details: { contentLength: content.length }
        });
        console.log(`${colors.green}✓ PASS${colors.reset} - ${uri} includes "${expectedTool}"`);
      } else {
        results.push({
          name: `${uri} includes ${expectedTool}`,
          passed: false,
          message: `Skill content missing ${expectedTool} tool`,
          details: { content: content.substring(0, 200) }
        });
        console.log(`${colors.red}✗ FAIL${colors.reset} - ${uri} missing "${expectedTool}"`);
      }
    } catch (error: any) {
      results.push({
        name: `${uri} includes ${expectedTool}`,
        passed: false,
        message: error.message
      });
      console.log(`${colors.red}✗ ERROR${colors.reset} - ${uri}: ${error.message}`);
    }
  }
}

async function printSummary(): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${colors.cyan}Progressive Disclosure Protocol Verification - Summary${colors.reset}`);
  console.log('='.repeat(70));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  console.log(`\nTests: ${passed}/${total} passed`);

  if (!allPassed) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ${colors.red}✗${colors.reset} ${r.name}: ${r.message}`);
    });
  }

  console.log(`\n${colors.yellow}Note:${colors.reset} This only tests MCP protocol level.`);
  console.log(`For end-to-end LLM behavior tests (requires subscription):`);
  console.log(`${colors.dim}  See PRE-RELEASE-CHECKLIST.md section 2.2${colors.reset}`);

  console.log('');

  if (allPassed) {
    console.log(`${colors.green}✓ Progressive disclosure is correctly implemented${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}✗ Progressive disclosure has issues${colors.reset}`);
    process.exit(1);
  }
}

async function main() {
  console.log(`${colors.cyan}Progressive Disclosure MCP Protocol Verification${colors.reset}`);
  console.log(`${colors.dim}Test Server: ${TEST_SERVER}${colors.reset}`);

  await test1_ToolsListIsEmpty();
  await test2_ResourcesListShowsSkills();
  await test3_SkillContentIncludesTools();
  await printSummary();
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
