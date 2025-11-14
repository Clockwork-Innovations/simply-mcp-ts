/**
 * Comprehensive E2E test for FT-1: Dynamic Hidden Implementation
 *
 * Tests all scenarios:
 * 1. Static boolean (backward compatibility)
 * 2. Sync function
 * 3. Async function
 * 4. Error handling (fail-open)
 * 5. Timeout protection
 * 6. Mixed scenarios with performance validation
 */

import { BuildMCPServer } from '../../src/index.js';

// Simulate async permission check
async function simulatePermissionCheck(ctx: any): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 10));
  return ctx.metadata?.hasPermission === true;
}

// Simulate slow function (for timeout test)
async function slowFunction(): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return true;
}

async function runAllTests() {
  console.log('='.repeat(70));
  console.log('FT-1 Dynamic Hidden - End-to-End Validation');
  console.log('='.repeat(70));

  let totalTests = 0;
  let passedTests = 0;

  // Test 1: Static boolean (backward compatibility)
  console.log('\n📋 Test 1: Static Boolean (Backward Compatibility)');
  console.log('-'.repeat(70));
  try {
    const server = new BuildMCPServer({
      name: 'test-static-hidden',
      version: '1.0.0',
    });

    server.addTool({
      name: 'visible_tool',
      description: 'A visible tool',
      handler: async () => ({ content: [{ type: 'text', text: 'visible' }] }),
    });

    server.addTool({
      name: 'hidden_tool',
      description: 'A hidden tool',
      hidden: true,
      handler: async () => ({ content: [{ type: 'text', text: 'hidden' }] }),
    });

    const tools = await server.listTools();
    const visibleCount = tools.tools.length;

    totalTests++;
    if (visibleCount === 1 && tools.tools[0].name === 'visible_tool') {
      console.log('✅ Static hidden: true filtered correctly');
      console.log(`   Visible tools: ${visibleCount}/2`);
      passedTests++;
    } else {
      console.log('❌ Static hidden: true NOT filtered correctly');
      console.log(`   Expected 1 visible tool, got ${visibleCount}`);
    }

    // Verify hidden tool is still callable
    const result = await server.callTool('hidden_tool', {});
    totalTests++;
    if (result.content[0].text === 'hidden') {
      console.log('✅ Hidden tool still callable directly');
      passedTests++;
    } else {
      console.log('❌ Hidden tool not callable');
    }
  } catch (error) {
    console.log(`❌ Test 1 failed: ${error.message}`);
  }

  // Test 2: Sync function
  console.log('\n📋 Test 2: Sync Function Hidden');
  console.log('-'.repeat(70));
  try {
    const server = new BuildMCPServer({
      name: 'test-sync-hidden',
      version: '1.0.0',
    });

    server.addTool({
      name: 'admin_tool',
      description: 'Admin only tool',
      hidden: (ctx) => ctx.metadata?.role !== 'admin',
      handler: async () => ({ content: [{ type: 'text', text: 'admin' }] }),
    });

    server.addTool({
      name: 'public_tool',
      description: 'Public tool',
      handler: async () => ({ content: [{ type: 'text', text: 'public' }] }),
    });

    // Test with admin context
    const adminTools = await server.listTools({ metadata: { role: 'admin' } });
    totalTests++;
    if (adminTools.tools.length === 2) {
      console.log('✅ Admin context: Both tools visible');
      console.log(`   Visible tools: ${adminTools.tools.length}/2`);
      passedTests++;
    } else {
      console.log('❌ Admin context: Wrong tool count');
      console.log(`   Expected 2, got ${adminTools.tools.length}`);
    }

    // Test with user context
    const userTools = await server.listTools({ metadata: { role: 'user' } });
    totalTests++;
    if (userTools.tools.length === 1 && userTools.tools[0].name === 'public_tool') {
      console.log('✅ User context: Admin tool hidden');
      console.log(`   Visible tools: ${userTools.tools.length}/2`);
      passedTests++;
    } else {
      console.log('❌ User context: Admin tool not hidden');
      console.log(`   Expected 1, got ${userTools.tools.length}`);
    }

    // Verify admin tool still callable
    const result = await server.callTool('admin_tool', {});
    totalTests++;
    if (result.content[0].text === 'admin') {
      console.log('✅ Hidden tool still callable directly');
      passedTests++;
    } else {
      console.log('❌ Hidden tool not callable');
    }
  } catch (error) {
    console.log(`❌ Test 2 failed: ${error.message}`);
  }

  // Test 3: Async function
  console.log('\n📋 Test 3: Async Function Hidden');
  console.log('-'.repeat(70));
  try {
    const server = new BuildMCPServer({
      name: 'test-async-hidden',
      version: '1.0.0',
    });

    server.addTool({
      name: 'permission_tool',
      description: 'Permission-based tool',
      hidden: async (ctx) => !(await simulatePermissionCheck(ctx)),
      handler: async () => ({ content: [{ type: 'text', text: 'permitted' }] }),
    });

    server.addTool({
      name: 'public_tool',
      description: 'Public tool',
      handler: async () => ({ content: [{ type: 'text', text: 'public' }] }),
    });

    // Test with permission
    const permittedTools = await server.listTools({
      metadata: { hasPermission: true }
    });
    totalTests++;
    if (permittedTools.tools.length === 2) {
      console.log('✅ With permission: Both tools visible');
      console.log(`   Visible tools: ${permittedTools.tools.length}/2`);
      passedTests++;
    } else {
      console.log('❌ With permission: Wrong tool count');
      console.log(`   Expected 2, got ${permittedTools.tools.length}`);
    }

    // Test without permission
    const unpermittedTools = await server.listTools({
      metadata: { hasPermission: false }
    });
    totalTests++;
    if (unpermittedTools.tools.length === 1 &&
        unpermittedTools.tools[0].name === 'public_tool') {
      console.log('✅ Without permission: Permission tool hidden');
      console.log(`   Visible tools: ${unpermittedTools.tools.length}/2`);
      passedTests++;
    } else {
      console.log('❌ Without permission: Permission tool not hidden');
      console.log(`   Expected 1, got ${unpermittedTools.tools.length}`);
    }

    // Verify async tool still callable
    const result = await server.callTool('permission_tool', {});
    totalTests++;
    if (result.content[0].text === 'permitted') {
      console.log('✅ Async hidden tool still callable directly');
      passedTests++;
    } else {
      console.log('❌ Async hidden tool not callable');
    }
  } catch (error) {
    console.log(`❌ Test 3 failed: ${error.message}`);
  }

  // Test 4: Error handling (fail-open)
  console.log('\n📋 Test 4: Error Handling (Fail-Open)');
  console.log('-'.repeat(70));
  try {
    const server = new BuildMCPServer({
      name: 'test-error-handling',
      version: '1.0.0',
    });

    server.addTool({
      name: 'error_tool',
      description: 'Tool with error in predicate',
      hidden: () => {
        throw new Error('Predicate error');
      },
      handler: async () => ({ content: [{ type: 'text', text: 'error' }] }),
    });

    server.addTool({
      name: 'normal_tool',
      description: 'Normal tool',
      handler: async () => ({ content: [{ type: 'text', text: 'normal' }] }),
    });

    const tools = await server.listTools();
    totalTests++;
    if (tools.tools.length === 2) {
      console.log('✅ Error in predicate: Tool visible (fail-open)');
      console.log(`   Visible tools: ${tools.tools.length}/2`);
      passedTests++;
    } else {
      console.log('❌ Error in predicate: Wrong behavior');
      console.log(`   Expected 2 visible (fail-open), got ${tools.tools.length}`);
    }
  } catch (error) {
    console.log(`❌ Test 4 failed: ${error.message}`);
  }

  // Test 5: Timeout protection
  console.log('\n📋 Test 5: Timeout Protection');
  console.log('-'.repeat(70));
  try {
    const server = new BuildMCPServer({
      name: 'test-timeout',
      version: '1.0.0',
    });

    server.addTool({
      name: 'slow_tool',
      description: 'Tool with slow predicate',
      hidden: slowFunction,
      handler: async () => ({ content: [{ type: 'text', text: 'slow' }] }),
    });

    server.addTool({
      name: 'fast_tool',
      description: 'Fast tool',
      handler: async () => ({ content: [{ type: 'text', text: 'fast' }] }),
    });

    const startTime = Date.now();
    const tools = await server.listTools();
    const elapsed = Date.now() - startTime;

    totalTests++;
    if (tools.tools.length === 2 && elapsed < 1500) {
      console.log('✅ Slow predicate: Timed out and visible (fail-open)');
      console.log(`   Visible tools: ${tools.tools.length}/2`);
      console.log(`   Time elapsed: ${elapsed}ms (should be ~1000ms)`);
      passedTests++;
    } else if (tools.tools.length !== 2) {
      console.log('❌ Slow predicate: Wrong tool count');
      console.log(`   Expected 2 visible (fail-open), got ${tools.tools.length}`);
    } else {
      console.log('❌ Slow predicate: No timeout occurred');
      console.log(`   Time elapsed: ${elapsed}ms (expected ~1000ms)`);
    }
  } catch (error) {
    console.log(`❌ Test 5 failed: ${error.message}`);
  }

  // Test 6: Mixed scenarios with performance
  console.log('\n📋 Test 6: Mixed Scenarios + Performance');
  console.log('-'.repeat(70));
  try {
    const server = new BuildMCPServer({
      name: 'test-mixed',
      version: '1.0.0',
    });

    // 2 static hidden
    server.addTool({
      name: 'static_hidden_1',
      description: 'Static hidden 1',
      hidden: true,
      handler: async () => ({ content: [{ type: 'text', text: 'sh1' }] }),
    });

    server.addTool({
      name: 'static_hidden_2',
      description: 'Static hidden 2',
      hidden: true,
      handler: async () => ({ content: [{ type: 'text', text: 'sh2' }] }),
    });

    // 2 dynamic sync hidden
    server.addTool({
      name: 'sync_hidden_1',
      description: 'Sync hidden 1',
      hidden: (ctx) => ctx.metadata?.role !== 'admin',
      handler: async () => ({ content: [{ type: 'text', text: 'syh1' }] }),
    });

    server.addTool({
      name: 'sync_hidden_2',
      description: 'Sync hidden 2',
      hidden: (ctx) => ctx.metadata?.role !== 'admin',
      handler: async () => ({ content: [{ type: 'text', text: 'syh2' }] }),
    });

    // 2 dynamic async hidden
    server.addTool({
      name: 'async_hidden_1',
      description: 'Async hidden 1',
      hidden: async (ctx) => !(await simulatePermissionCheck(ctx)),
      handler: async () => ({ content: [{ type: 'text', text: 'ah1' }] }),
    });

    server.addTool({
      name: 'async_hidden_2',
      description: 'Async hidden 2',
      hidden: async (ctx) => !(await simulatePermissionCheck(ctx)),
      handler: async () => ({ content: [{ type: 'text', text: 'ah2' }] }),
    });

    // 2 visible
    server.addTool({
      name: 'visible_1',
      description: 'Visible 1',
      handler: async () => ({ content: [{ type: 'text', text: 'v1' }] }),
    });

    server.addTool({
      name: 'visible_2',
      description: 'Visible 2',
      handler: async () => ({ content: [{ type: 'text', text: 'v2' }] }),
    });

    // Test with admin + permission context
    const startTime = Date.now();
    const allTools = await server.listTools({
      metadata: { role: 'admin', hasPermission: true }
    });
    const elapsed = Date.now() - startTime;

    totalTests++;
    if (allTools.tools.length === 6) {
      console.log('✅ Mixed scenario: All non-static visible');
      console.log(`   Visible tools: ${allTools.tools.length}/8`);
      passedTests++;
    } else {
      console.log('❌ Mixed scenario: Wrong tool count');
      console.log(`   Expected 6 visible, got ${allTools.tools.length}`);
    }

    // Performance check
    totalTests++;
    if (elapsed < 50) {
      console.log(`✅ Performance: ${elapsed}ms (target: <50ms)`);
      passedTests++;
    } else {
      console.log(`❌ Performance: ${elapsed}ms (target: <50ms)`);
    }

    // Test with user context (no permissions)
    const userTools = await server.listTools({
      metadata: { role: 'user', hasPermission: false }
    });
    totalTests++;
    if (userTools.tools.length === 2) {
      console.log('✅ User context: Only public tools visible');
      console.log(`   Visible tools: ${userTools.tools.length}/8`);
      passedTests++;
    } else {
      console.log('❌ User context: Wrong tool count');
      console.log(`   Expected 2 visible, got ${userTools.tools.length}`);
    }
  } catch (error) {
    console.log(`❌ Test 6 failed: ${error.message}`);
  }

  // Test 7: Breaking change validation (async list methods)
  console.log('\n📋 Test 7: Breaking Change - Async List Methods');
  console.log('-'.repeat(70));
  try {
    const server = new BuildMCPServer({
      name: 'test-async-lists',
      version: '1.0.0',
    });

    server.addTool({
      name: 'test_tool',
      description: 'Test tool',
      handler: async () => ({ content: [{ type: 'text', text: 'test' }] }),
    });

    server.addResource({
      uri: 'test://resource',
      name: 'Test Resource',
      handler: async () => ({ contents: [{ uri: 'test://resource', text: 'data' }] }),
    });

    server.addPrompt({
      name: 'test_prompt',
      description: 'Test prompt',
      handler: async () => ({ messages: [] }),
    });

    // Test that all list methods return Promises
    const toolsPromise = server.listTools();
    const resourcesPromise = server.listResources();
    const promptsPromise = server.listPrompts();

    totalTests += 3;
    if (toolsPromise instanceof Promise) {
      console.log('✅ listTools() returns Promise');
      passedTests++;
    } else {
      console.log('❌ listTools() does not return Promise');
    }

    if (resourcesPromise instanceof Promise) {
      console.log('✅ listResources() returns Promise');
      passedTests++;
    } else {
      console.log('❌ listResources() does not return Promise');
    }

    if (promptsPromise instanceof Promise) {
      console.log('✅ listPrompts() returns Promise');
      passedTests++;
    } else {
      console.log('❌ listPrompts() does not return Promise');
    }

    // Test that await works
    const tools = await toolsPromise;
    const resources = await resourcesPromise;
    const prompts = await promptsPromise;

    totalTests += 3;
    if (tools.tools.length === 1) {
      console.log('✅ await listTools() works');
      passedTests++;
    } else {
      console.log('❌ await listTools() failed');
    }

    if (resources.resources.length === 1) {
      console.log('✅ await listResources() works');
      passedTests++;
    } else {
      console.log('❌ await listResources() failed');
    }

    if (prompts.prompts.length === 1) {
      console.log('✅ await listPrompts() works');
      passedTests++;
    } else {
      console.log('❌ await listPrompts() failed');
    }
  } catch (error) {
    console.log(`❌ Test 7 failed: ${error.message}`);
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n✅ ALL TESTS PASSED - FT-1 VALIDATION SUCCESSFUL');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED - FT-1 VALIDATION FAILED');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
