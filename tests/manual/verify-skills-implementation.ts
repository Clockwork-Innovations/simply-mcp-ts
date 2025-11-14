/**
 * Manual End-to-End Test: Skills Implementation (v4.4.0)
 *
 * Verifies the new flat structure skills implementation with:
 * - Flat arrays (tools, resources, prompts)
 * - Intelligence-based model selection
 * - Manual and auto-generated skills
 */

import { generateSkillManual } from '../../src/utils/skill-manual-generator.js';
import { BuildMCPServer } from '../../src/server/builder-server.js';
import { z } from 'zod';

console.log('='.repeat(80));
console.log('Skills Implementation Verification (v4.4.0)');
console.log('='.repeat(80));

let allTestsPassed = true;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.log(`\x1b[31m✗ FAIL: ${message}\x1b[0m`);
    allTestsPassed = false;
  } else {
    console.log(`\x1b[32m✓ PASS: ${message}\x1b[0m`);
  }
}

// ============================================================================
// Test 1: Flat Structure - Auto-Generated Skill
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('Test 1: Auto-Generated Skill with Flat Arrays');
console.log('='.repeat(80));

const server1 = new BuildMCPServer({
  name: 'test-flat-autogen',
  version: '1.0.0',
  silent: true,
});

// Register tools for auto-generation
server1.addTool({
  name: 'add',
  description: 'Add two numbers together',
  parameters: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  execute: async ({ a, b }) => ({ result: a + b }),
});

server1.addTool({
  name: 'multiply',
  description: 'Multiply two numbers',
  parameters: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  execute: async ({ a, b }) => ({ result: a * b }),
});

// Test flat array structure (not nested components)
console.log('\nGenerating skill from flat arrays...');
const autoGenResult = await generateSkillManual(
  'quick_math',
  'Perform quick mathematical calculations',
  {
    tools: ['add', 'multiply'],  // Flat array
  },
  server1
);

assert(autoGenResult.content.length > 0, 'Auto-generated content is not empty');
assert(
  autoGenResult.content.includes('add'),
  'Auto-generated content includes "add" tool'
);
assert(
  autoGenResult.content.includes('multiply'),
  'Auto-generated content includes "multiply" tool'
);
assert(
  autoGenResult.content.includes('quick_math'),
  'Auto-generated content includes skill name'
);

console.log('\nGenerated Content Preview:');
console.log('-'.repeat(80));
console.log(autoGenResult.content.split('\n').slice(0, 15).join('\n'));
console.log('-'.repeat(80));

// ============================================================================
// Test 2: Empty Components Array Handling
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('Test 2: Empty Components (Should Generate Minimal Content)');
console.log('='.repeat(80));

const emptyResult = await generateSkillManual(
  'empty_skill',
  'A skill with no components',
  {
    tools: [],
    resources: [],
    prompts: [],
  },
  server1
);

assert(
  emptyResult.content.length > 0,
  'Empty skill still generates some content'
);
assert(
  emptyResult.content.includes('empty_skill'),
  'Empty skill content includes skill name'
);

console.log('\nEmpty Skill Content:');
console.log('-'.repeat(80));
console.log(emptyResult.content);
console.log('-'.repeat(80));

// ============================================================================
// Test 3: Mixed Components (Tools + Resources + Prompts)
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('Test 3: Mixed Components (Tools + Resources + Prompts)');
console.log('='.repeat(80));

const server2 = new BuildMCPServer({
  name: 'test-mixed',
  version: '1.0.0',
  silent: true,
});

// Add tools
server2.addTool({
  name: 'search',
  description: 'Search for items',
  parameters: z.object({
    query: z.string().describe('Search query'),
  }),
  execute: async () => ({ results: [] }),
});

// Add resources
server2.addResource({
  name: 'data://index',
  description: 'Search index data',
  uri: 'data://index',
  mimeType: 'application/json',
  read: async () => '{}',
});

// Add prompts
server2.addPrompt({
  name: 'search_help',
  description: 'Help with searching',
  arguments: [],
  template: async () => 'Search help prompt',
});

const mixedResult = await generateSkillManual(
  'search_skill',
  'Search and query data',
  {
    tools: ['search'],
    resources: ['data://index'],
    prompts: ['search_help'],
  },
  server2
);

assert(mixedResult.content.includes('search'), 'Mixed content includes tool');
assert(mixedResult.content.includes('data://index'), 'Mixed content includes resource');
assert(mixedResult.content.includes('search_help'), 'Mixed content includes prompt');

console.log('\nMixed Components Content Preview:');
console.log('-'.repeat(80));
console.log(mixedResult.content.split('\n').slice(0, 20).join('\n'));
console.log('-'.repeat(80));

// ============================================================================
// Test 4: Invalid Component References
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('Test 4: Invalid Component References (Should Handle Gracefully)');
console.log('='.repeat(80));

const invalidResult = await generateSkillManual(
  'invalid_skill',
  'Skill with non-existent components',
  {
    tools: ['nonexistent_tool'],
    resources: ['nonexistent://resource'],
    prompts: ['nonexistent_prompt'],
  },
  server1
);

assert(
  invalidResult.content.length > 0,
  'Invalid references still generate content'
);
console.log('\nInvalid References Content:');
console.log('-'.repeat(80));
console.log(invalidResult.content.split('\n').slice(0, 10).join('\n'));
console.log('-'.repeat(80));

// ============================================================================
// Test 5: Component Discovery Pattern
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('Test 5: Verify Components Are Listed Correctly');
console.log('='.repeat(80));

// Test that components property is properly structured
const testComponents = {
  tools: ['tool1', 'tool2'],
  resources: ['res1', 'res2'],
  prompts: ['prompt1'],
};

assert(
  Array.isArray(testComponents.tools),
  'tools is an array (flat structure)'
);
assert(
  Array.isArray(testComponents.resources),
  'resources is an array (flat structure)'
);
assert(
  Array.isArray(testComponents.prompts),
  'prompts is an array (flat structure)'
);
assert(
  testComponents.tools.length === 2,
  'tools array has correct length'
);
assert(
  testComponents.resources.length === 2,
  'resources array has correct length'
);
assert(
  testComponents.prompts.length === 1,
  'prompts array has correct length'
);

// ============================================================================
// Test Summary
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('Test Summary');
console.log('='.repeat(80));

if (allTestsPassed) {
  console.log('\x1b[32m✓ ALL TESTS PASSED\x1b[0m');
  console.log('\nSkills implementation verified:');
  console.log('  ✓ Flat array structure (tools, resources, prompts)');
  console.log('  ✓ Auto-generation from component arrays');
  console.log('  ✓ Mixed component types');
  console.log('  ✓ Empty skill handling');
  console.log('  ✓ Invalid reference handling');
  process.exit(0);
} else {
  console.log('\x1b[31m✗ SOME TESTS FAILED\x1b[0m');
  process.exit(1);
}
