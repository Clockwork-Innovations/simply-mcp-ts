/**
 * SimpleMessage Format Unit Tests
 *
 * Tests SimpleMessage[] support - simplified message format that converts to PromptMessage[]:
 * - { user: 'text' } → { role: 'user', content: { type: 'text', text: 'text' } }
 * - { assistant: 'text' } → { role: 'assistant', content: { type: 'text', text: 'text' } }
 *
 * Coverage:
 * - Parser detection of SimpleMessage prompts
 * - Type guard (isSimpleMessageArray) correctness
 * - Converter (convertSimpleMessages) accuracy
 * - Handler integration (GetPrompt)
 * - Backward compatibility with string and PromptMessage[]
 * - Mixed usage of all three patterns
 * - Async SimpleMessage[] support
 * - Edge cases (empty strings, special characters, Unicode)
 */

import { parseInterfaceFile } from '../../../src/server/parser.js';
import { loadInterfaceServer } from '../../../src/server/adapter.js';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

// Test fixture: Server with all three prompt patterns
const TEST_SERVER_CODE = `
import type { IPrompt, IServer, PromptMessage, SimpleMessage } from '../../../src/server/interface-types.js';

interface TestServer extends IServer {
  name: 'simple-message-test-server';
  version: '1.0.0';
  description: 'Test server for SimpleMessage support';
}

// Pattern 1: String return
interface StringPrompt extends IPrompt {
  name: 'string_prompt';
  description: 'Returns a string';
  args: {
    name: {};
  };
}

// Pattern 2: SimpleMessage[] return (main test target)
interface SimpleConversation extends IPrompt {
  name: 'simple_conversation';
  description: 'Returns SimpleMessage[]';
  args: {
    topic: {};
  };
}

interface MultiTurn extends IPrompt {
  name: 'multi_turn';
  description: 'Multi-turn SimpleMessage conversation';
  args: {
    question: {};
  };
}

interface AsyncSimple extends IPrompt {
  name: 'async_simple';
  description: 'Async SimpleMessage[]';
  args: {
    delay: {};
  };
}

interface EdgeCasePrompt extends IPrompt {
  name: 'edge_case';
  description: 'Edge case testing';
  args: {
    text: {};
  };
}

// Pattern 3: PromptMessage[] return (for comparison)
interface AdvancedPrompt extends IPrompt {
  name: 'advanced_prompt';
  description: 'Returns PromptMessage[]';
  args: {
    query: {};
  };
}

export default class TestServerImpl implements TestServer {
  name = 'simple-message-test-server' as const;
  version = '1.0.0' as const;
  description = 'Test server for SimpleMessage support' as const;

  stringPrompt = (args: { name: string }) => {
    return \`Hello \${args.name}, this is a string prompt.\`;
  };

  simpleConversation = (args: { topic: string }): SimpleMessage[] => {
    return [
      { user: \`I want to learn about \${args.topic}\` },
      { assistant: \`Great! Let me explain \${args.topic} to you.\` },
      { user: 'Can you give me an example?' },
      { assistant: 'Of course! Here is a practical example...' }
    ];
  };

  multiTurn = (args: { question: string }): SimpleMessage[] => {
    return [
      { user: args.question },
      { assistant: 'That is an interesting question.' },
      { user: 'Please elaborate.' },
      { assistant: 'Here are the details you requested.' }
    ];
  };

  asyncSimple = async (args: { delay: string }): Promise<SimpleMessage[]> => {
    const delay = parseInt(args.delay) || 5;
    await new Promise(resolve => setTimeout(resolve, delay));
    return [
      { user: 'Async request' },
      { assistant: \`Response after \${delay}ms\` }
    ];
  };

  edgeCase = (args: { text: string }): SimpleMessage[] => {
    return [
      { user: args.text },
      { assistant: 'Response to your input' }
    ];
  };

  advancedPrompt = (args: { query: string }): PromptMessage[] => {
    return [
      {
        role: 'user',
        content: { type: 'text', text: args.query }
      },
      {
        role: 'assistant',
        content: { type: 'text', text: 'Advanced response' }
      }
    ];
  };
}
`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function pass(msg: string) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function fail(msg: string) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function info(msg: string) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
}

// Main test runner
async function runTests() {
  let passCount = 0;
  let failCount = 0;

  const testFilePath = resolve(process.cwd(), 'tests/unit/interface-api/tmp-simple-message-test-server.ts');

  try {
    // Write test server to disk
    writeFileSync(testFilePath, TEST_SERVER_CODE, 'utf-8');
    info('Created temporary test server file');

    // Test 1: Parser detects SimpleMessage prompts
    info('Test 1: Parser detects SimpleMessage prompts');
    const parseResult = parseInterfaceFile(testFilePath);
    if (!parseResult || parseResult.prompts.length !== 6) {
      fail(`Expected 6 prompts, got ${parseResult?.prompts.length || 0}`);
      failCount++;
    } else {
      pass('Parser detected all 6 prompts (string, 4x SimpleMessage, 1x PromptMessage)');
      passCount++;
    }

    // Load server for remaining tests
    const server = await loadInterfaceServer({ filePath: testFilePath });

    // Test 2: String prompt (backward compatibility)
    info('Test 2: String prompt returns correctly');
    const stringResult = await server.getPrompt('string_prompt', { name: 'TestUser' });
    if (stringResult.messages.length === 1 &&
        stringResult.messages[0].role === 'user' &&
        stringResult.messages[0].content.text.includes('TestUser')) {
      pass('String prompt works (backward compatibility)');
      passCount++;
    } else {
      fail('String prompt conversion failed');
      failCount++;
    }

    // Test 3: SimpleMessage[] conversion accuracy
    info('Test 3: SimpleMessage[] converts to PromptMessage[] correctly');
    const simpleResult = await server.getPrompt('simple_conversation', { topic: 'TypeScript' });
    if (simpleResult.messages.length === 4 &&
        simpleResult.messages[0].role === 'user' &&
        simpleResult.messages[0].content.type === 'text' &&
        simpleResult.messages[0].content.text.includes('TypeScript') &&
        simpleResult.messages[1].role === 'assistant' &&
        simpleResult.messages[1].content.type === 'text') {
      pass('SimpleMessage[] converts to PromptMessage[] correctly');
      passCount++;
    } else {
      fail('SimpleMessage[] conversion failed');
      failCount++;
    }

    // Test 4: Multi-turn conversation
    info('Test 4: Multi-turn SimpleMessage conversation');
    const multiResult = await server.getPrompt('multi_turn', { question: 'How does it work?' });
    if (multiResult.messages.length === 4 &&
        multiResult.messages[0].content.text === 'How does it work?' &&
        multiResult.messages[1].role === 'assistant' &&
        multiResult.messages[2].role === 'user' &&
        multiResult.messages[3].role === 'assistant') {
      pass('Multi-turn conversation works correctly');
      passCount++;
    } else {
      fail('Multi-turn conversation failed');
      failCount++;
    }

    // Test 5: Async SimpleMessage[]
    info('Test 5: Async SimpleMessage[] support');
    const asyncResult = await server.getPrompt('async_simple', { delay: '10' });
    if (asyncResult.messages.length === 2 &&
        asyncResult.messages[0].role === 'user' &&
        asyncResult.messages[1].content.text.includes('10ms')) {
      pass('Async SimpleMessage[] works');
      passCount++;
    } else {
      fail('Async SimpleMessage[] failed');
      failCount++;
    }

    // Test 6: PromptMessage[] still works
    info('Test 6: PromptMessage[] format still supported');
    const advancedResult = await server.getPrompt('advanced_prompt', { query: 'Test query' });
    if (advancedResult.messages.length === 2 &&
        advancedResult.messages[0].role === 'user' &&
        advancedResult.messages[0].content.text === 'Test query') {
      pass('PromptMessage[] format still works');
      passCount++;
    } else {
      fail('PromptMessage[] format failed');
      failCount++;
    }

    // Test 7: Empty string handling
    info('Test 7: Edge case - empty strings');
    const emptyResult = await server.getPrompt('edge_case', { text: '' });
    if (emptyResult.messages.length === 2 &&
        emptyResult.messages[0].content.text === '') {
      pass('Empty strings handled correctly');
      passCount++;
    } else {
      fail('Empty string handling failed');
      failCount++;
    }

    // Test 8: Special characters
    info('Test 8: Edge case - special characters');
    const specialResult = await server.getPrompt('edge_case', { text: '<script>alert("XSS")</script>' });
    if (specialResult.messages.length === 2 &&
        specialResult.messages[0].content.text.includes('<script>')) {
      pass('Special characters preserved correctly');
      passCount++;
    } else {
      fail('Special character handling failed');
      failCount++;
    }

    // Test 9: Unicode support
    info('Test 9: Edge case - Unicode characters');
    const unicodeResult = await server.getPrompt('edge_case', { text: '日本語 🎌 Emoji' });
    if (unicodeResult.messages.length === 2 &&
        unicodeResult.messages[0].content.text.includes('日本語') &&
        unicodeResult.messages[0].content.text.includes('🎌')) {
      pass('Unicode characters handled correctly');
      passCount++;
    } else {
      fail('Unicode handling failed');
      failCount++;
    }

    // Test 10: Mixed patterns in same server
    info('Test 10: Mixed usage - all patterns in same server');
    const stringCheck = await server.getPrompt('string_prompt', { name: 'User1' });
    const simpleCheck = await server.getPrompt('simple_conversation', { topic: 'Testing' });
    const advancedCheck = await server.getPrompt('advanced_prompt', { query: 'Query' });

    if (stringCheck.messages.length === 1 &&
        simpleCheck.messages.length === 4 &&
        advancedCheck.messages.length === 2) {
      pass('All three patterns work together in same server');
      passCount++;
    } else {
      fail('Mixed pattern usage failed');
      failCount++;
    }

    // Test 11: Verify message structure integrity
    info('Test 11: Verify PromptMessage structure integrity');
    const structureResult = await server.getPrompt('simple_conversation', { topic: 'Structure' });
    const userMsg = structureResult.messages[0];
    const assistantMsg = structureResult.messages[1];

    if (userMsg.role === 'user' &&
        userMsg.content.type === 'text' &&
        typeof userMsg.content.text === 'string' &&
        assistantMsg.role === 'assistant' &&
        assistantMsg.content.type === 'text' &&
        typeof assistantMsg.content.text === 'string') {
      pass('PromptMessage structure integrity verified');
      passCount++;
    } else {
      fail('PromptMessage structure integrity check failed');
      failCount++;
    }

    // Test 12: Alternating roles
    info('Test 12: Verify alternating user/assistant roles');
    const rolesResult = await server.getPrompt('multi_turn', { question: 'Test' });
    const rolesCorrect = rolesResult.messages.every((msg, idx) =>
      (idx % 2 === 0 && msg.role === 'user') || (idx % 2 === 1 && msg.role === 'assistant')
    );

    if (rolesCorrect) {
      pass('Alternating roles work correctly');
      passCount++;
    } else {
      fail('Alternating roles check failed');
      failCount++;
    }

    // Test 13: Verify argument interpolation in SimpleMessage[]');
    info('Test 13: Verify argument interpolation in SimpleMessage[]');
    const interpResult = await server.getPrompt('simple_conversation', { topic: 'INTERPOLATION_TEST' });
    if (interpResult.messages[0].content.text.includes('INTERPOLATION_TEST') &&
        interpResult.messages[1].content.text.includes('INTERPOLATION_TEST')) {
      pass('Argument interpolation works in SimpleMessage[]');
      passCount++;
    } else {
      fail('Argument interpolation failed');
      failCount++;
    }

    // Test 14: Async completion
    info('Test 14: Verify async operations complete correctly');
    const start = Date.now();
    const asyncCheck = await server.getPrompt('async_simple', { delay: '20' });
    const elapsed = Date.now() - start;

    if (asyncCheck.messages.length === 2 && elapsed >= 15) {
      pass('Async operations complete correctly');
      passCount++;
    } else {
      fail('Async operation timing check failed');
      failCount++;
    }

    // Test 15: List all prompts
    info('Test 15: Verify all prompts are discoverable');
    // Server should have all 6 prompts registered
    const promptNames = parseResult.prompts.map(p => p.name);

    if (promptNames.includes('string_prompt') &&
        promptNames.includes('simple_conversation') &&
        promptNames.includes('multi_turn') &&
        promptNames.includes('async_simple') &&
        promptNames.includes('edge_case') &&
        promptNames.includes('advanced_prompt')) {
      pass('All prompts are discoverable');
      passCount++;
    } else {
      fail('Not all prompts discoverable');
      failCount++;
    }

  } catch (error) {
    fail(`Test execution error: ${error}`);
    console.error(error);
    failCount++;
  } finally {
    // Cleanup
    try {
      unlinkSync(testFilePath);
      info('Cleaned up temporary test file');
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`${colors.green}Tests Passed: ${passCount}${colors.reset}`);
  console.log(`${colors.red}Tests Failed: ${failCount}${colors.reset}`);
  console.log('Total Tests: ' + (passCount + failCount));
  console.log('='.repeat(50));

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
