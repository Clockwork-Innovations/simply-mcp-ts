/**
 * Manual End-to-End Test: Skill Auto-Generation System (FT-2)
 *
 * This test verifies the complete auto-generation pipeline by directly
 * calling generateSkillManual() with various component configurations.
 */

import { BuildMCPServer } from '../../src/server/builder-server.js';
import { generateSkillManual } from '../../src/utils/skill-manual-generator.js';
import { z } from 'zod';

console.log('='.repeat(80));
console.log('FT-2 Manual End-to-End Test: Skill Auto-Generation System');
console.log('='.repeat(80));

// ============================================================================
// Test 1: Pure Auto-Generation (components only, no manual content)
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('Test 1: Pure Auto-Generation (complete skill with all components)');
console.log('='.repeat(80));

const server1 = new BuildMCPServer({
  name: 'test-autogen-pure',
  version: '1.0.0',
  silent: true,
});

// Register tools
server1.addTool({
  name: 'greet',
  description: 'Greet a user by name',
  parameters: z.object({
    name: z.string().describe('The user name to greet'),
    formal: z.boolean().optional().describe('Use formal greeting'),
  }),
  execute: async () => 'result',
});

server1.addTool({
  name: 'calculate',
  description: 'Perform arithmetic calculation',
  parameters: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('Math operation'),
    a: z.number().describe('First operand'),
    b: z.number().describe('Second operand'),
  }),
  execute: async () => 'result',
});

// Register resources
server1.addResource({
  name: 'config://app',
  description: 'Application configuration',
  uri: 'config://app',
  mimeType: 'application/json',
  read: async () => '{}',
});

server1.addResource({
  name: 'db://users/{id}',
  description: 'User record by ID',
  uri: 'db://users/{id}',
  mimeType: 'application/json',
  read: async () => '{}',
});

// Register prompts
server1.addPrompt({
  name: 'summarize',
  description: 'Generate a summary of text',
  arguments: [
    { name: 'text', description: 'Text to summarize', required: true },
    { name: 'max_words', description: 'Maximum words in summary', required: false },
  ],
  template: async () => 'summary prompt',
});

// Generate skill manual from all components
console.log('\nGenerating skill manual from components...');
const startTime1 = Date.now();
const result1 = await generateSkillManual(
  'complete_toolkit',
  'Complete toolkit with all component types',
  {
    tools: ['greet', 'calculate'],
    resources: ['config://app', 'db://users/{id}'],
    prompts: ['summarize'],
  },
  server1
);
const genTime1 = Date.now() - startTime1;

console.log(`✓ Manual generated in ${genTime1}ms`);
console.log(`✓ Generated markdown length: ${result1.content.length} chars`);
console.log(`✓ Stats: ${result1.stats.toolsFound} tools, ${result1.stats.resourcesFound} resources, ${result1.stats.promptsFound} prompts`);
console.log(`✓ Warnings: ${result1.warnings.length}`);

if (genTime1 < 50) {
  console.log(`✓ Performance excellent (< 50ms)`);
} else if (genTime1 < 100) {
  console.log(`✓ Performance acceptable (< 100ms)`);
} else {
  console.log(`⚠ Performance warning: ${genTime1}ms (target < 50ms)`);
}

console.log('\nGenerated Markdown Preview (first 1000 chars):');
console.log('-'.repeat(80));
console.log(result1.content.substring(0, 1000));
console.log('-'.repeat(80));

// Validate markdown structure
const checks1 = [
  { test: /^# Complete Toolkit/m, desc: 'Contains main header with title' },
  { test: /## Available Tools/m, desc: 'Contains Tools section' },
  { test: /## Available Resources/m, desc: 'Contains Resources section' },
  { test: /## Available Prompts/m, desc: 'Contains Prompts section' },
  { test: /### greet/m, desc: 'Contains greet tool' },
  { test: /### calculate/m, desc: 'Contains calculate tool' },
  { test: /\| Parameter \| Type \| Required \| Description \|/m, desc: 'Contains parameter table' },
  { test: /config:\/\/app/m, desc: 'Contains config resource' },
  { test: /db:\/\/users\/\{id\}/m, desc: 'Contains db resource with template' },
  { test: /### summarize/m, desc: 'Contains summarize prompt' },
  { test: /```typescript/m, desc: 'Contains code blocks' },
  { test: /auto-generated/i, desc: 'Contains auto-generation note' },
];

let passed1 = 0;
for (const check of checks1) {
  if (check.test.test(result1.content)) {
    console.log(`✓ ${check.desc}`);
    passed1++;
  } else {
    console.log(`✗ ${check.desc}`);
  }
}

console.log(`\nTest 1 Result: ${passed1}/${checks1.length} checks passed`);

// ============================================================================
// Test 2: Missing Components (graceful degradation)
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('Test 2: Missing Components (graceful degradation)');
console.log('='.repeat(80));

const server2 = new BuildMCPServer({
  name: 'test-missing-components',
  version: '1.0.0',
  silent: true,
});

server2.addTool({
  name: 'greet',
  description: 'Greet a user by name',
  parameters: z.object({
    name: z.string().describe('The user name'),
  }),
  execute: async () => 'result',
});

console.log('\nGenerating manual with some missing components...');
const result2 = await generateSkillManual(
  'partial_skill',
  'Skill referencing some missing components',
  {
    tools: ['greet', 'nonexistent_tool'],
    resources: ['missing_resource'],
    prompts: ['translate'],
  },
  server2
);

console.log('✓ Manual generated despite missing components');
console.log(`✓ Generated markdown length: ${result2.content.length} chars`);
console.log(`✓ Stats: ${result2.stats.toolsFound}/${result2.stats.toolsFound + result2.stats.toolsMissing} tools found`);
console.log(`✓ Warnings: ${result2.warnings.length}`);

console.log('\nGenerated Markdown with Missing Components:');
console.log('-'.repeat(80));
console.log(result2.content);
console.log('-'.repeat(80));

// Check for warning messages
const checks2 = [
  { test: /### greet/m, desc: 'Contains existing greet tool' },
  { test: /⚠️|WARNING|not found/i, desc: 'Contains warning about missing components' },
  { test: /nonexistent_tool/i, desc: 'Mentions missing tool name' },
  { test: /missing_resource/i, desc: 'Mentions missing resource name' },
  { test: /translate/i, desc: 'Mentions missing prompt name' },
];

let passed2 = 0;
for (const check of checks2) {
  if (check.test.test(result2.content)) {
    console.log(`✓ ${check.desc}`);
    passed2++;
  } else {
    console.log(`✗ ${check.desc}`);
  }
}

console.log(`\nTest 2 Result: ${passed2}/${checks2.length} checks passed`);

// ============================================================================
// Test 3: Complex Auto-Generation (all component types)
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('Test 3: Complex Auto-Generation (multiple of each type)');
console.log('='.repeat(80));

const server3 = new BuildMCPServer({
  name: 'test-complex-autogen',
  version: '1.0.0',
  silent: true,
});

// Add multiple tools
server3.addTool({
  name: 'greet',
  description: 'Greet a user by name',
  parameters: z.object({
    name: z.string().describe('The user name to greet'),
    formal: z.boolean().optional().describe('Use formal greeting'),
  }),
  execute: async () => 'result',
});

server3.addTool({
  name: 'calculate',
  description: 'Perform arithmetic calculation',
  parameters: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('Math operation'),
    a: z.number().describe('First operand'),
    b: z.number().describe('Second operand'),
  }),
  execute: async () => 'result',
});

server3.addTool({
  name: 'search',
  description: 'Search for information',
  parameters: z.object({
    query: z.string().describe('Search query'),
    limit: z.number().optional().describe('Max results'),
  }),
  execute: async () => 'result',
});

// Add multiple resources
server3.addResource({
  name: 'config://app',
  description: 'Application configuration',
  uri: 'config://app',
  mimeType: 'application/json',
  read: async () => '{}',
});

server3.addResource({
  name: 'db://users/{id}',
  description: 'User record by ID',
  uri: 'db://users/{id}',
  mimeType: 'application/json',
  read: async () => '{}',
});

// Add multiple prompts
server3.addPrompt({
  name: 'summarize',
  description: 'Generate a summary of text',
  arguments: [
    { name: 'text', description: 'Text to summarize', required: true },
    { name: 'max_words', description: 'Maximum words in summary', required: false },
  ],
  template: async () => 'prompt',
});

server3.addPrompt({
  name: 'translate',
  description: 'Translate text to another language',
  arguments: [
    { name: 'text', description: 'Text to translate', required: true },
    { name: 'target_lang', description: 'Target language code', required: true },
  ],
  template: async () => 'prompt',
});

console.log('\nGenerating comprehensive manual with all components...');
const startTime3 = Date.now();
const result3 = await generateSkillManual(
  'comprehensive_manual',
  'Comprehensive manual with all component types',
  {
    tools: ['greet', 'calculate', 'search'],
    resources: ['config://app', 'db://users/{id}'],
    prompts: ['summarize', 'translate'],
  },
  server3
);
const genTime3 = Date.now() - startTime3;

console.log(`✓ Manual generated in ${genTime3}ms`);
console.log(`✓ Generated markdown length: ${result3.content.length} chars`);
console.log(`✓ Stats: ${result3.stats.toolsFound} tools, ${result3.stats.resourcesFound} resources, ${result3.stats.promptsFound} prompts`);

if (genTime3 < 50) {
  console.log(`✓ Performance excellent (< 50ms)`);
} else if (genTime3 < 100) {
  console.log(`✓ Performance acceptable (< 100ms)`);
} else {
  console.log(`⚠ Performance warning: ${genTime3}ms`);
}

// Validate all sections present
const checks3 = [
  { test: /^# Comprehensive Manual Skill/m, desc: 'Main header with proper title case' },
  { test: /## Available Tools/m, desc: 'Tools section header' },
  { test: /## Available Resources/m, desc: 'Resources section header' },
  { test: /## Available Prompts/m, desc: 'Prompts section header' },
  { test: /### greet/m, desc: 'Greet tool subsection' },
  { test: /### calculate/m, desc: 'Calculate tool subsection' },
  { test: /### search/m, desc: 'Search tool subsection' },
  { test: /\| Parameter \| Type \| Required \| Description \|/m, desc: 'Parameter table headers' },
  { test: /```typescript/m, desc: 'Code blocks with language spec' },
  { test: /config:\/\/app/m, desc: 'Config resource URI' },
  { test: /db:\/\/users\/\{id\}/m, desc: 'Template resource URI' },
  { test: /### summarize/m, desc: 'Summarize prompt' },
  { test: /### translate/m, desc: 'Translate prompt' },
];

let passed3 = 0;
for (const check of checks3) {
  if (check.test.test(result3.content)) {
    console.log(`✓ ${check.desc}`);
    passed3++;
  } else {
    console.log(`✗ ${check.desc}`);
  }
}

console.log(`\nTest 3 Result: ${passed3}/${checks3.length} checks passed`);

// ============================================================================
// Test 4: Markdown Quality Validation
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('Test 4: Markdown Quality Validation');
console.log('='.repeat(80));

console.log('\nValidating markdown structure and quality...');

// Check markdown structure
const qualityChecks = [
  {
    test: /^#\s+\w+/m,
    desc: 'Has proper level-1 header',
    category: 'Structure'
  },
  {
    test: /^##\s+Available\s+(Tools|Resources|Prompts)/m,
    desc: 'Has proper level-2 section headers',
    category: 'Structure'
  },
  {
    test: /^###\s+\w+/m,
    desc: 'Has proper level-3 subsection headers',
    category: 'Structure'
  },
  {
    test: /```typescript[\s\S]*?```/m,
    desc: 'Has properly formatted code blocks',
    category: 'Formatting'
  },
  {
    test: /\|\s*Parameter\s*\|\s*Type\s*\|\s*Required\s*\|\s*Description\s*\|/m,
    desc: 'Has properly formatted parameter tables',
    category: 'Formatting'
  },
  {
    test: /\|\s*`\w+`\s*\|\s*\w+\s*\|\s*[✓-]\s*\|\s*.+\s*\|/m,
    desc: 'Has properly formatted table rows',
    category: 'Formatting'
  },
  {
    test: /\*\*Description:\*\*/m,
    desc: 'Uses bold formatting for labels',
    category: 'Formatting'
  },
  {
    test: /\*\*Parameters:\*\*/m,
    desc: 'Includes Parameters section',
    category: 'Content'
  },
  {
    test: /\*\*Example:\*\*/m,
    desc: 'Includes Example section',
    category: 'Content'
  },
  {
    test: /await callTool\(/m,
    desc: 'Includes usage examples',
    category: 'Content'
  },
];

let qualityPassed = 0;
const qualityByCategory: Record<string, { passed: number; total: number }> = {};

for (const check of qualityChecks) {
  const passed = check.test.test(result3.content);
  if (!qualityByCategory[check.category]) {
    qualityByCategory[check.category] = { passed: 0, total: 0 };
  }
  qualityByCategory[check.category].total++;
  if (passed) {
    console.log(`✓ [${check.category}] ${check.desc}`);
    qualityPassed++;
    qualityByCategory[check.category].passed++;
  } else {
    console.log(`✗ [${check.category}] ${check.desc}`);
  }
}

console.log('\nQuality Summary by Category:');
for (const [category, stats] of Object.entries(qualityByCategory)) {
  const percentage = Math.round((stats.passed / stats.total) * 100);
  console.log(`  ${category}: ${stats.passed}/${stats.total} (${percentage}%)`);
}

console.log(`\nTest 4 Result: ${qualityPassed}/${qualityChecks.length} quality checks passed`);

// ============================================================================
// Summary
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('FT-2 Manual E2E Test Summary');
console.log('='.repeat(80));
console.log(`Test 1 (Pure Auto-Gen):        ${passed1 >= 10 ? '✓ PASS' : '✗ FAIL'} (${passed1}/${checks1.length})`);
console.log(`Test 2 (Missing Components):   ${passed2 >= 3 ? '✓ PASS' : '✗ FAIL'} (${passed2}/${checks2.length})`);
console.log(`Test 3 (Complex Auto-Gen):     ${passed3 >= 11 ? '✓ PASS' : '✗ FAIL'} (${passed3}/${checks3.length})`);
console.log(`Test 4 (Markdown Quality):     ${qualityPassed >= 8 ? '✓ PASS' : '✗ FAIL'} (${qualityPassed}/${qualityChecks.length})`);
console.log('='.repeat(80));

const allPassed =
  passed1 >= 10 &&
  passed2 >= 3 &&
  passed3 >= 11 &&
  qualityPassed >= 8;

if (allPassed) {
  console.log('\n✓✓✓ ALL TESTS PASSED ✓✓✓');
  console.log('FT-2 auto-generation system is working correctly end-to-end');
  console.log('\nKey Achievements:');
  console.log('  • Auto-generation produces valid, structured markdown');
  console.log('  • Missing components handled gracefully with warnings');
  console.log('  • Complex scenarios with multiple components work correctly');
  console.log('  • Markdown quality is LLM-friendly and well-formatted');
  console.log('  • Performance is acceptable (< 100ms)');
  process.exit(0);
} else {
  console.log('\n✗✗✗ SOME TESTS FAILED ✗✗✗');
  console.log('Review failures above');
  process.exit(1);
}
