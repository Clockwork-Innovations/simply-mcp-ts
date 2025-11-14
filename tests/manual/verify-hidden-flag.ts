#!/usr/bin/env node
/**
 * Manual verification script for hidden flag functionality
 *
 * This script loads the test server and verifies:
 * 1. listTools() returns only visible tools (2 expected)
 * 2. listResources() returns only visible resources (1 expected)
 * 3. listPrompts() returns only visible prompts (1 expected)
 * 4. Hidden tools can still be called directly
 * 5. Hidden resources can still be read directly
 * 6. Hidden prompts can still be accessed directly
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { loadInterfaceServer } from '../../dist/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyHiddenFlag() {
  console.log('='.repeat(80));
  console.log('HIDDEN FLAG FUNCTIONAL VALIDATION');
  console.log('='.repeat(80));
  console.log();

  const serverPath = path.join(__dirname, 'test-hidden-flag-server.ts');
  console.log(`Loading server from: ${serverPath}`);
  console.log();

  try {
    const server = await loadInterfaceServer({ filePath: serverPath });
    console.log('✅ Server loaded successfully');
    console.log();

    let testsPassed = 0;
    let testsFailed = 0;

    // TEST 1: List Tools (should return only visible tools)
    console.log('TEST 1: listTools() filtering');
    console.log('-'.repeat(80));
    const tools = await server.listTools();
    console.log(`Total tools in list: ${tools.length}`);
    tools.forEach(tool => {
      console.log(`  - ${tool.name} (description: ${tool.description})`);
    });

    if (tools.length === 2) {
      console.log('✅ PASS: Expected 2 visible tools, got', tools.length);
      testsPassed++;
    } else {
      console.log('❌ FAIL: Expected 2 visible tools, got', tools.length);
      testsFailed++;
    }

    const visibleToolNames = tools.map(t => t.name);
    if (visibleToolNames.includes('public_greet') && visibleToolNames.includes('public_calculate')) {
      console.log('✅ PASS: Visible tools are correct');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Visible tools are incorrect. Expected public_greet and public_calculate');
      testsFailed++;
    }

    if (!visibleToolNames.includes('internal_debug') && !visibleToolNames.includes('internal_admin')) {
      console.log('✅ PASS: Hidden tools are not in list');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Hidden tools should not be in list');
      testsFailed++;
    }
    console.log();

    // TEST 2: List Resources (should return only visible resources)
    console.log('TEST 2: listResources() filtering');
    console.log('-'.repeat(80));
    const resources = await server.listResources();
    console.log(`Total resources in list: ${resources.length}`);
    resources.forEach(res => {
      console.log(`  - ${res.uri} (name: ${res.name})`);
    });

    if (resources.length === 1) {
      console.log('✅ PASS: Expected 1 visible resource, got', resources.length);
      testsPassed++;
    } else {
      console.log('❌ FAIL: Expected 1 visible resource, got', resources.length);
      testsFailed++;
    }

    const visibleResourceUris = resources.map(r => r.uri);
    if (visibleResourceUris.includes('config://public')) {
      console.log('✅ PASS: Visible resource is correct');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Visible resource is incorrect. Expected config://public');
      testsFailed++;
    }

    if (!visibleResourceUris.includes('config://internal')) {
      console.log('✅ PASS: Hidden resource is not in list');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Hidden resource should not be in list');
      testsFailed++;
    }
    console.log();

    // TEST 3: List Prompts (should return only visible prompts)
    console.log('TEST 3: listPrompts() filtering');
    console.log('-'.repeat(80));
    const prompts = await server.listPrompts();
    console.log(`Total prompts in list: ${prompts.length}`);
    prompts.forEach(prompt => {
      console.log(`  - ${prompt.name} (description: ${prompt.description})`);
    });

    if (prompts.length === 1) {
      console.log('✅ PASS: Expected 1 visible prompt, got', prompts.length);
      testsPassed++;
    } else {
      console.log('❌ FAIL: Expected 1 visible prompt, got', prompts.length);
      testsFailed++;
    }

    const visiblePromptNames = prompts.map(p => p.name);
    if (visiblePromptNames.includes('help_prompt')) {
      console.log('✅ PASS: Visible prompt is correct');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Visible prompt is incorrect. Expected help_prompt');
      testsFailed++;
    }

    if (!visiblePromptNames.includes('debug_prompt')) {
      console.log('✅ PASS: Hidden prompt is not in list');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Hidden prompt should not be in list');
      testsFailed++;
    }
    console.log();

    // TEST 4: Execute hidden tool (should work)
    console.log('TEST 4: executeTool() with hidden tool');
    console.log('-'.repeat(80));
    try {
      const result = await server.executeTool('internal_debug', { level: 'verbose' });
      console.log('Result:', JSON.stringify(result, null, 2));
      // Result is wrapped in content array with JSON stringified text
      const textContent = result.content?.find((c: any) => c.type === 'text');
      if (textContent && textContent.text) {
        const parsed = JSON.parse(textContent.text);
        if (parsed.debug === 'Debug level: verbose') {
          console.log('✅ PASS: Hidden tool executed successfully');
          testsPassed++;
        } else {
          console.log('❌ FAIL: Hidden tool returned unexpected result');
          testsFailed++;
        }
      } else {
        console.log('❌ FAIL: Hidden tool returned no text content');
        testsFailed++;
      }
    } catch (error) {
      console.log('❌ FAIL: Hidden tool execution failed:', error);
      testsFailed++;
    }
    console.log();

    // TEST 5: Read hidden resource (should work)
    console.log('TEST 5: readResource() with hidden resource');
    console.log('-'.repeat(80));
    try {
      const result = await server.readResource('config://internal');
      console.log('Result:', JSON.stringify(result, null, 2));
      // Extract text from contents array
      const textContent = result.contents.find(c => c.text);
      if (textContent && textContent.text) {
        const parsed = JSON.parse(textContent.text);
        if (parsed.apiKey === 'secret-key' && parsed.internal === true) {
          console.log('✅ PASS: Hidden resource read successfully');
          testsPassed++;
        } else {
          console.log('❌ FAIL: Hidden resource returned unexpected data');
          testsFailed++;
        }
      } else {
        console.log('❌ FAIL: Hidden resource returned no text content');
        testsFailed++;
      }
    } catch (error) {
      console.log('❌ FAIL: Hidden resource read failed:', error);
      testsFailed++;
    }
    console.log();

    // TEST 6: Get hidden prompt (should work)
    console.log('TEST 6: getPrompt() with hidden prompt');
    console.log('-'.repeat(80));
    try {
      const result = await server.getPrompt('debug_prompt', {});
      console.log('Result:', JSON.stringify(result, null, 2));
      // Access nested content structure
      const content = result.messages?.[0]?.content;
      let messageText: string | undefined;
      if (typeof content === 'string') {
        messageText = content;
      } else if (content && typeof content === 'object' && 'text' in content) {
        messageText = (content as any).text;
      }

      if (messageText === 'Debug mode activated. Enter commands:') {
        console.log('✅ PASS: Hidden prompt accessed successfully');
        testsPassed++;
      } else {
        console.log('❌ FAIL: Hidden prompt returned unexpected message. Got:', messageText);
        testsFailed++;
      }
    } catch (error) {
      console.log('❌ FAIL: Hidden prompt access failed:', error);
      testsFailed++;
    }
    console.log();

    // SUMMARY
    console.log('='.repeat(80));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Tests passed: ${testsPassed}`);
    console.log(`Tests failed: ${testsFailed}`);
    console.log();

    if (testsFailed === 0) {
      console.log('✅ ALL TESTS PASSED - Hidden flag implementation is working correctly!');
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED - Hidden flag implementation has issues');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

verifyHiddenFlag();
