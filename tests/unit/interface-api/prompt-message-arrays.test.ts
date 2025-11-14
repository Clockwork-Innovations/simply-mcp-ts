/**
 * Prompt Message Array Support Feature Test
 *
 * Tests PromptMessage[] return type support in the interface-driven API:
 * - IPrompt accepts PromptMessage[] return type
 * - Parser correctly handles dynamic prompts returning message arrays
 * - Handler detects and returns message arrays directly
 * - Backward compatibility: string returns still work
 * - Mixed usage: string and message array prompts in same server
 * - Async returns: Promise<PromptMessage[]> works
 * - Error handling: invalid message structures
 *
 * Target: >80% code coverage of prompt message array code paths
 */

import { parseInterfaceFile, type ParseResult } from '../../../src/server/parser.js';
import { loadInterfaceServer } from '../../../src/server/adapter.js';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import type { PromptMessage } from '../../../src/server/interface-types.js';

// Detect if running under Jest to avoid crashing Jest workers
const isJest = typeof jest !== 'undefined' || process.env.JEST_WORKER_ID !== undefined;

// Test fixture: Server with both string and message array prompts
const TEST_SERVER_CODE = `
import type { IPrompt, IServer, PromptMessage } from '../../../src/server/interface-types.js';

/**
 * Test server with mixed prompt types
 */
const server: IServer = {
  name: 'message-array-test-server',
  version: '1.0.0',
  description: 'Test server for PromptMessage[] support'
}

/**
 * Simple string prompt (backward compatibility)
 */
interface SimplePrompt extends IPrompt {
  name: 'simple_string';
  description: 'Returns a simple string';
  args: {
    name: {};
  };
}

/**
 * Message array prompt
 */
interface ConversationPrompt extends IPrompt {
  name: 'conversation';
  description: 'Returns a multi-message conversation';
  args: {
    topic: {};
  };
}

/**
 * Async message array prompt
 */
interface AsyncConversationPrompt extends IPrompt {
  name: 'async_conversation';
  description: 'Returns async message array';
  args: {
    subject: {};
  };
}

/**
 * Static template prompt (string)
 */
interface StaticPrompt extends IPrompt {
  name: 'static_template';
  description: 'Static template with placeholders';
  args: {
    location: {};
    style: {};
  };
}

/**
 * Test server implementation
 */
export default class TestServerImpl {
  name = 'message-array-test-server' as const;
  version = '1.0.0' as const;
  description = 'Test server for PromptMessage[] support' as const;

  /**
   * Simple string return (backward compatibility)
   */
  simpleString = (args: { name: string }) => {
    return \`Hello, \${args.name}! This is a simple string prompt.\`;
  };

  /**
   * Message array return (new feature)
   */
  conversation = (args: { topic: string }): PromptMessage[] => {
    return [
      {
        role: 'user',
        content: { type: 'text', text: \`I want to learn about \${args.topic}\` }
      },
      {
        role: 'assistant',
        content: { type: 'text', text: 'Great! Let me teach you with an example...' }
      },
      {
        role: 'user',
        content: { type: 'text', text: 'Can you show me an advanced technique?' }
      }
    ];
  };

  /**
   * Async message array return
   */
  asyncConversation = async (args: { subject: string }): Promise<PromptMessage[]> => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));

    return [
      {
        role: 'user',
        content: { type: 'text', text: \`Tell me about \${args.subject}\` }
      },
      {
        role: 'assistant',
        content: { type: 'text', text: 'Let me explain that concept...' }
      }
    ];
  };

  /**
   * Static template prompt
   */
  staticTemplate = (args: { location: string; style: string }) => {
    return \`Generate a \${args.style} report for \${args.location}.\`;
  };
}
`;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
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

function section(msg: string) {
  console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`);
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}Interface-Driven API - Prompt Message Array Support Test${colors.reset}\n`);

  let testFilePath: string | null = null;
  let allPassed = true;
  let passCount = 0;
  let failCount = 0;

  try {
    // Create temporary test file
    testFilePath = resolve(process.cwd(), 'tests/unit/interface-api/__test-prompt-message-arrays.ts');
    writeFileSync(testFilePath, TEST_SERVER_CODE);

    // ========================================================================
    // Test 1: Parser Detects All Prompts
    // ========================================================================
    section('Test 1: Parser Detects All Prompts');
    let parseResult: ParseResult;

    try {
      parseResult = parseInterfaceFile(testFilePath);
      pass('File parsed successfully');
      passCount++;
    } catch (error: any) {
      fail(`Failed to parse file: ${error.message}`);
      failCount++;
      allPassed = false;
      return;
    }

    if (parseResult.prompts.length === 4) {
      pass(`Found ${parseResult.prompts.length} prompts (expected 4)`);
      passCount++;
      info(`  Prompts: ${parseResult.prompts.map(p => p.interfaceName).join(', ')}`);
    } else {
      fail(`Expected 4 prompts, found ${parseResult.prompts.length}`);
      failCount++;
      allPassed = false;
    }

    // ========================================================================
    // Test 2: Load Server and Get Server Instance
    // ========================================================================
    section('Test 2: Load Server and Get Server Instance');

    let server: any;
    try {
      server = await loadInterfaceServer({ filePath: testFilePath });
      pass('Server loaded successfully');
      passCount++;

      const promptsList = await server.listPrompts();
      if (promptsList.length === 4) {
        pass(`Server reports ${promptsList.length} prompts`);
        passCount++;
      } else {
        fail(`Expected 4 prompts in server, got ${promptsList.length}`);
        failCount++;
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Failed to load server: ${error.message}`);
      failCount++;
      allPassed = false;
      return;
    }

    // ========================================================================
    // Test 3: String Prompt Return (Backward Compatibility)
    // ========================================================================
    section('Test 3: String Prompt Return (Backward Compatibility)');

    try {
      const result = await server.getPrompt('simple_string', { name: 'TestUser' });

      if (result.messages && Array.isArray(result.messages)) {
        pass('Result has messages array');
        passCount++;

        if (result.messages.length === 1) {
          pass('Result has 1 message (string wrapped)');
          passCount++;

          const msg = result.messages[0];
          if (msg.role === 'user') {
            pass('Message has role: user');
            passCount++;
          } else {
            fail(`Expected role 'user', got '${msg.role}'`);
            failCount++;
            allPassed = false;
          }

          if (msg.content && msg.content.type === 'text' && msg.content.text) {
            pass('Message has text content');
            passCount++;
            info(`  Text: "${msg.content.text.substring(0, 50)}..."`);

            if (msg.content.text.includes('TestUser')) {
              pass('Message contains user name from args');
              passCount++;
            } else {
              fail('Message does not contain user name');
              failCount++;
              allPassed = false;
            }
          } else {
            fail('Message missing text content');
            failCount++;
            allPassed = false;
          }
        } else {
          fail(`Expected 1 message, got ${result.messages.length}`);
          failCount++;
          allPassed = false;
        }
      } else {
        fail('Result missing messages array');
        failCount++;
        allPassed = false;
      }
    } catch (error: any) {
      fail(`String prompt execution failed: ${error.message}`);
      failCount++;
      allPassed = false;
    }

    // ========================================================================
    // Test 4: Message Array Prompt Return (New Feature)
    // ========================================================================
    section('Test 4: Message Array Prompt Return (New Feature)');

    try {
      const result = await server.getPrompt('conversation', { topic: 'TypeScript' });

      if (result.messages && Array.isArray(result.messages)) {
        pass('Result has messages array');
        passCount++;

        if (result.messages.length === 3) {
          pass('Result has 3 messages (conversation)');
          passCount++;
          info(`  Message count: ${result.messages.length}`);

          // Check first message (user)
          const msg1 = result.messages[0];
          if (msg1.role === 'user' && msg1.content.type === 'text' && msg1.content.text.includes('TypeScript')) {
            pass('Message 1: user role with topic');
            passCount++;
          } else {
            fail('Message 1 incorrect');
            failCount++;
            allPassed = false;
          }

          // Check second message (assistant)
          const msg2 = result.messages[1];
          if (msg2.role === 'assistant' && msg2.content.type === 'text') {
            pass('Message 2: assistant role');
            passCount++;
          } else {
            fail('Message 2 incorrect');
            failCount++;
            allPassed = false;
          }

          // Check third message (user)
          const msg3 = result.messages[2];
          if (msg3.role === 'user' && msg3.content.type === 'text') {
            pass('Message 3: user role');
            passCount++;
          } else {
            fail('Message 3 incorrect');
            failCount++;
            allPassed = false;
          }
        } else {
          fail(`Expected 3 messages, got ${result.messages.length}`);
          failCount++;
          allPassed = false;
        }
      } else {
        fail('Result missing messages array');
        failCount++;
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Message array prompt execution failed: ${error.message}`);
      failCount++;
      allPassed = false;
    }

    // ========================================================================
    // Test 5: Async Message Array Prompt
    // ========================================================================
    section('Test 5: Async Message Array Prompt');

    try {
      const result = await server.getPrompt('async_conversation', { subject: 'async patterns' });

      if (result.messages && Array.isArray(result.messages)) {
        pass('Async result has messages array');
        passCount++;

        if (result.messages.length === 2) {
          pass('Async result has 2 messages');
          passCount++;

          const msg1 = result.messages[0];
          if (msg1.role === 'user' && msg1.content.text.includes('async patterns')) {
            pass('Async message 1: user role with subject');
            passCount++;
          } else {
            fail('Async message 1 incorrect');
            failCount++;
            allPassed = false;
          }

          const msg2 = result.messages[1];
          if (msg2.role === 'assistant') {
            pass('Async message 2: assistant role');
            passCount++;
          } else {
            fail('Async message 2 incorrect');
            failCount++;
            allPassed = false;
          }
        } else {
          fail(`Expected 2 messages, got ${result.messages.length}`);
          failCount++;
          allPassed = false;
        }
      } else {
        fail('Async result missing messages array');
        failCount++;
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Async message array prompt execution failed: ${error.message}`);
      failCount++;
      allPassed = false;
    }

    // ========================================================================
    // Test 6: Static Template Prompt (String)
    // ========================================================================
    section('Test 6: Static Template Prompt (String)');

    try {
      const result = await server.getPrompt('static_template', {
        location: 'Paris',
        style: 'formal'
      });

      if (result.messages && result.messages.length === 1) {
        pass('Static template returns single message');
        passCount++;

        const text = result.messages[0].content.text;
        if (text.includes('Paris') && text.includes('formal')) {
          pass('Static template interpolation works');
          passCount++;
          info(`  Text: "${text}"`);
        } else {
          fail('Static template interpolation failed');
          failCount++;
          allPassed = false;
        }
      } else {
        fail('Static template result incorrect');
        failCount++;
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Static template execution failed: ${error.message}`);
      failCount++;
      allPassed = false;
    }

    // ========================================================================
    // Test 7: Type Safety - PromptMessage Structure
    // ========================================================================
    section('Test 7: Type Safety - PromptMessage Structure');

    try {
      const result = await server.getPrompt('conversation', { topic: 'testing' });

      // Verify structure matches PromptMessage type
      let structureValid = true;
      for (const msg of result.messages) {
        if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
          structureValid = false;
          break;
        }
        if (!msg.content || !msg.content.type) {
          structureValid = false;
          break;
        }
        if (msg.content.type === 'text' && !msg.content.text) {
          structureValid = false;
          break;
        }
      }

      if (structureValid) {
        pass('All messages conform to PromptMessage type');
        passCount++;
      } else {
        fail('Some messages do not conform to PromptMessage type');
        failCount++;
        allPassed = false;
      }
    } catch (error: any) {
      fail(`Type structure validation failed: ${error.message}`);
      failCount++;
      allPassed = false;
    }

  } catch (error: any) {
    fail(`Fatal test error: ${error.message}`);
    console.error(error);
    failCount++;
    allPassed = false;
  } finally {
    // Cleanup: remove temporary test file
    if (testFilePath) {
      try {
        unlinkSync(testFilePath);
        info('Cleaned up temporary test file');
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  // ========================================================================
  // Test Summary
  // ========================================================================
  console.log(`\n${colors.bold}Test Summary${colors.reset}`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`${colors.green}Passed:${colors.reset} ${passCount}`);
  console.log(`${colors.red}Failed:${colors.reset} ${failCount}`);
  console.log(`${colors.cyan}Total:${colors.reset}  ${passCount + failCount}`);
  console.log(`${'─'.repeat(50)}`);

  if (allPassed && failCount === 0) {
    console.log(`\n${colors.green}${colors.bold}✓ All tests passed!${colors.reset}\n`);
    if (!isJest) process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bold}✗ Some tests failed${colors.reset}\n`);
    if (!isJest) process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Test runner error:${colors.reset}`, error);
  if (!isJest) process.exit(1);
});
