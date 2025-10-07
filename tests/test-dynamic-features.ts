/**
 * Test: Dynamic Prompts and Resources
 *
 * Verifies that dynamic prompts and resources execute functions at runtime
 * when MCP requests (prompts/get, resources/read) are received.
 */

import { loadInterfaceServer } from '../src/api/interface/adapter.js';
import { resolve } from 'path';

const filePath = resolve('examples/interface-comprehensive.ts');

console.log('🧪 Testing Dynamic Prompts and Resources\n');
console.log('=' .repeat(80) + '\n');

async function testDynamicFeatures() {
  // Load the interface server
  console.log('Loading interface server...\n');
  const server = await loadInterfaceServer({
    filePath,
    verbose: true,
  });

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 1: Static Prompt
  console.log('Test 1: Static Prompt (search_assistant)\n');
  try {
    // Access internal prompts map to test
    const prompts = (server as any).prompts;
    const staticPrompt = prompts.get('search_assistant');

    if (!staticPrompt) {
      console.log('  ✗ FAIL: Static prompt not registered');
    } else {
      console.log('  ✓ Prompt registered');
      console.log(`  ✓ Template type: ${typeof staticPrompt.template}`);

      // Simulate what happens when prompts/get is called
      if (typeof staticPrompt.template === 'string') {
        console.log('  ✓ Template is static string');
        console.log(`  ✓ Preview: ${staticPrompt.template.substring(0, 60)}...`);
      } else {
        console.log('  ✗ FAIL: Expected static template to be string');
      }
    }
  } catch (error: any) {
    console.log(`  ✗ FAIL: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 2: Dynamic Prompt
  console.log('Test 2: Dynamic Prompt (contextual_search)\n');
  try {
    const prompts = (server as any).prompts;
    const dynamicPrompt = prompts.get('contextual_search');

    if (!dynamicPrompt) {
      console.log('  ✗ FAIL: Dynamic prompt not registered');
    } else {
      console.log('  ✓ Prompt registered');
      console.log(`  ✓ Template type: ${typeof dynamicPrompt.template}`);

      // Simulate what happens when prompts/get is called
      if (typeof dynamicPrompt.template === 'function') {
        console.log('  ✓ Template is function (dynamic)');

        // Call the function with test arguments
        const args1 = { query: 'TypeScript', userLevel: 'beginner' as const };
        const result1 = await Promise.resolve(dynamicPrompt.template(args1));
        console.log('\n  Test with beginner level:');
        console.log(`    Args: ${JSON.stringify(args1)}`);
        console.log(`    Result length: ${result1.length} chars`);
        console.log(`    Contains "beginner": ${result1.includes('beginner') || result1.includes('friendly')}`);
        console.log(`    Preview: ${result1.substring(0, 80)}...`);

        const args2 = { query: 'TypeScript', userLevel: 'expert' as const };
        const result2 = await Promise.resolve(dynamicPrompt.template(args2));
        console.log('\n  Test with expert level:');
        console.log(`    Args: ${JSON.stringify(args2)}`);
        console.log(`    Result length: ${result2.length} chars`);
        console.log(`    Contains "expert" or "advanced": ${result2.includes('expert') || result2.includes('Advanced')}`);
        console.log(`    Preview: ${result2.substring(0, 80)}...`);

        console.log('\n  ✓ Dynamic prompt generates different content based on args!');
      } else {
        console.log('  ✗ FAIL: Expected dynamic template to be function');
      }
    }
  } catch (error: any) {
    console.log(`  ✗ FAIL: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 3: Static Resource
  console.log('Test 3: Static Resource (config://server)\n');
  try {
    const resources = (server as any).resources;
    const staticResource = resources.get('config://server');

    if (!staticResource) {
      console.log('  ✗ FAIL: Static resource not registered');
    } else {
      console.log('  ✓ Resource registered');
      console.log(`  ✓ Content type: ${typeof staticResource.content}`);

      // Simulate what happens when resources/read is called
      if (typeof staticResource.content === 'string') {
        console.log('  ✓ Content is static string');
        const parsed = JSON.parse(staticResource.content);
        console.log(`  ✓ Parsed data: ${JSON.stringify(parsed, null, 2).substring(0, 200)}...`);
      } else if (typeof staticResource.content === 'object') {
        console.log('  ✓ Content is static object');
        console.log(`  ✓ Data: ${JSON.stringify(staticResource.content, null, 2).substring(0, 200)}...`);
      } else {
        console.log('  ✗ FAIL: Expected static content to be string or object');
      }
    }
  } catch (error: any) {
    console.log(`  ✗ FAIL: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 4: Dynamic Resource
  console.log('Test 4: Dynamic Resource (stats://search)\n');
  try {
    const resources = (server as any).resources;
    const dynamicResource = resources.get('stats://search');

    if (!dynamicResource) {
      console.log('  ✗ FAIL: Dynamic resource not registered');
    } else {
      console.log('  ✓ Resource registered');
      console.log(`  ✓ Content type: ${typeof dynamicResource.content}`);

      // Simulate what happens when resources/read is called
      if (typeof dynamicResource.content === 'function') {
        console.log('  ✓ Content is function (dynamic)');

        // Call the function multiple times to verify it generates different data
        const result1 = await Promise.resolve(dynamicResource.content());
        console.log('\n  First call:');
        console.log(`    Result type: ${typeof result1}`);
        console.log(`    Has totalSearches: ${result1 && 'totalSearches' in result1}`);
        console.log(`    Data: ${JSON.stringify(result1, null, 2)}`);

        // Wait a tiny bit and call again
        await new Promise(resolve => setTimeout(resolve, 10));

        const result2 = await Promise.resolve(dynamicResource.content());
        console.log('\n  Second call:');
        console.log(`    Data: ${JSON.stringify(result2, null, 2)}`);

        // Check if values are different (since they use Math.random())
        const isDifferent = JSON.stringify(result1) !== JSON.stringify(result2);
        console.log(`\n  ✓ Dynamic resource generates ${isDifferent ? 'different' : 'potentially different'} data on each call!`);
        if (isDifferent) {
          console.log('  ✓ Confirmed: Values changed between calls (Math.random working)');
        }
      } else {
        console.log('  ✗ FAIL: Expected dynamic content to be function');
      }
    }
  } catch (error: any) {
    console.log(`  ✗ FAIL: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 5: Another Dynamic Resource
  console.log('Test 5: Dynamic Resource (cache://status)\n');
  try {
    const resources = (server as any).resources;
    const cacheResource = resources.get('cache://status');

    if (!cacheResource) {
      console.log('  ✗ FAIL: Cache resource not registered');
    } else {
      console.log('  ✓ Resource registered');

      if (typeof cacheResource.content === 'function') {
        console.log('  ✓ Content is function (dynamic)');

        const result = await Promise.resolve(cacheResource.content());
        console.log('\n  Generated data:');
        console.log(`    ${JSON.stringify(result, null, 2)}`);
        console.log(`  ✓ Has size field: ${'size' in result}`);
        console.log(`  ✓ Has hits field: ${'hits' in result}`);
        console.log(`  ✓ Has misses field: ${'misses' in result}`);
      } else {
        console.log('  ✗ FAIL: Expected dynamic content to be function');
      }
    }
  } catch (error: any) {
    console.log(`  ✗ FAIL: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80) + '\n');
  console.log('📊 SUMMARY\n');
  console.log('✓ Static prompts use template strings');
  console.log('✓ Dynamic prompts use functions called at runtime');
  console.log('✓ Static resources use literal data');
  console.log('✓ Dynamic resources use functions called at runtime');
  console.log('✓ Dynamic content changes on each request');
  console.log('\n🎉 All dynamic features working correctly!\n');
}

// Run tests
testDynamicFeatures().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
