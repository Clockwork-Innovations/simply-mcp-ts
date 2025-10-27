/**
 * Manual Integration Test for text/uri-list MIME Type Support
 *
 * Tests the implementation of text/uri-list MIME type for external URLs.
 * Run with: npx tsx tests/test-mime-types-uri-list.ts
 */

import { loadInterfaceServer } from '../src/index.js';
import { parseInterfaceFile } from '../src/server/parser.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';

// Test fixtures directory
const fixturesDir = path.join(process.cwd(), 'tests/fixtures/mime-uri-list-manual');

// Create fixtures directory
try {
  mkdirSync(fixturesDir, { recursive: true });
} catch (e) {
  // Directory already exists
}

async function runTests() {
  console.log('=== text/uri-list MIME Type Support Tests ===\n');

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Basic external URL
  console.log('Test 1: Basic external URL with text/uri-list');
  try {
    const testFile = path.join(fixturesDir, 'test1.ts');
    writeFileSync(
      testFile,
      `
import type { IUI, IServer } from '../../../src/interface-types.js';

interface ExternalDashboard extends IUI {
  uri: 'ui://dashboard/external';
  name: 'External Dashboard';
  description: 'External analytics dashboard';
  externalUrl: 'https://dashboard.example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  name = 'test-server' as const;
  version = '1.0.0' as const;
}
      `.trim()
    );

    const server = await loadInterfaceServer({ filePath: testFile });
    const resource = await server.readResource('ui://dashboard/external');

    if (resource.contents[0].mimeType !== 'text/uri-list') {
      throw new Error(`Expected mimeType 'text/uri-list', got '${resource.contents[0].mimeType}'`);
    }

    if (resource.contents[0].text !== 'https://dashboard.example.com') {
      throw new Error(`Expected URL 'https://dashboard.example.com', got '${resource.contents[0].text}'`);
    }

    console.log('  ✓ MIME type is text/uri-list');
    console.log('  ✓ URL is returned as plain text');
    console.log('  ✓ PASSED\n');
    passedTests++;
  } catch (error: any) {
    console.log('  ✗ FAILED:', error.message, '\n');
    failedTests++;
  }

  // Test 2: HTML should use text/html
  console.log('Test 2: Inline HTML should use text/html');
  try {
    const testFile = path.join(fixturesDir, 'test2.ts');
    writeFileSync(
      testFile,
      `
import type { IUI, IServer } from '../../../src/interface-types.js';

interface InternalUI extends IUI {
  uri: 'ui://internal/ui';
  name: 'Internal UI';
  description: 'Inline HTML UI';
  html: '<div>Hello World</div>';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  name = 'test-server' as const;
  version = '1.0.0' as const;
}
      `.trim()
    );

    const server = await loadInterfaceServer({ filePath: testFile });
    const resource = await server.readResource('ui://internal/ui');

    if (resource.contents[0].mimeType !== 'text/html') {
      throw new Error(`Expected mimeType 'text/html', got '${resource.contents[0].mimeType}'`);
    }

    console.log('  ✓ MIME type is text/html (not text/uri-list)');
    console.log('  ✓ PASSED\n');
    passedTests++;
  } catch (error: any) {
    console.log('  ✗ FAILED:', error.message, '\n');
    failedTests++;
  }

  // Test 3: URL with query parameters
  console.log('Test 3: URL with query parameters');
  try {
    const testFile = path.join(fixturesDir, 'test3.ts');
    const url = 'https://example.com/dashboard?user=123&view=analytics';
    writeFileSync(
      testFile,
      `
import type { IUI, IServer } from '../../../src/interface-types.js';

interface QueryUI extends IUI {
  uri: 'ui://test/query';
  name: 'Query UI';
  description: 'URL with query params';
  externalUrl: '${url}';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  name = 'test-server' as const;
  version = '1.0.0' as const;
}
      `.trim()
    );

    const server = await loadInterfaceServer({ filePath: testFile });
    const resource = await server.readResource('ui://test/query');

    if (resource.contents[0].text !== url) {
      throw new Error(`Expected URL '${url}', got '${resource.contents[0].text}'`);
    }

    console.log('  ✓ Query parameters preserved');
    console.log('  ✓ PASSED\n');
    passedTests++;
  } catch (error: any) {
    console.log('  ✗ FAILED:', error.message, '\n');
    failedTests++;
  }

  // Test 4: Parser extracts externalUrl
  console.log('Test 4: Parser extracts externalUrl field');
  try {
    const testFile = path.join(fixturesDir, 'test4.ts');
    writeFileSync(
      testFile,
      `
import type { IUI, IServer } from '../../../src/interface-types.js';

interface ParserUI extends IUI {
  uri: 'ui://test/parser';
  name: 'Parser Test';
  description: 'Parser integration';
  externalUrl: 'https://example.com/dashboard';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  name = 'test-server' as const;
  version = '1.0.0' as const;
}
      `.trim()
    );

    const parseResult = parseInterfaceFile(testFile);

    if (parseResult.uis.length !== 1) {
      throw new Error(`Expected 1 UI, got ${parseResult.uis.length}`);
    }

    if (parseResult.uis[0].externalUrl !== 'https://example.com/dashboard') {
      throw new Error(`Expected externalUrl 'https://example.com/dashboard', got '${parseResult.uis[0].externalUrl}'`);
    }

    if (parseResult.uis[0].dynamic) {
      throw new Error('Expected dynamic to be false');
    }

    console.log('  ✓ Parser extracted externalUrl');
    console.log('  ✓ UI marked as static');
    console.log('  ✓ PASSED\n');
    passedTests++;
  } catch (error: any) {
    console.log('  ✗ FAILED:', error.message, '\n');
    failedTests++;
  }

  // Test 5: Invalid URL should throw
  console.log('Test 5: Invalid URL should throw error');
  try {
    const testFile = path.join(fixturesDir, 'test5.ts');
    writeFileSync(
      testFile,
      `
import type { IUI, IServer } from '../../../src/interface-types.js';

interface InvalidUI extends IUI {
  uri: 'ui://test/invalid';
  name: 'Invalid UI';
  description: 'Invalid URL';
  externalUrl: 'not-a-valid-url';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  name = 'test-server' as const;
  version = '1.0.0' as const;
}
      `.trim()
    );

    try {
      await loadInterfaceServer({ filePath: testFile });
      throw new Error('Should have thrown error for invalid URL');
    } catch (error: any) {
      if (!error.message.includes('invalid externalUrl')) {
        throw new Error(`Expected error message to contain 'invalid externalUrl', got: ${error.message}`);
      }
    }

    console.log('  ✓ Invalid URL rejected');
    console.log('  ✓ PASSED\n');
    passedTests++;
  } catch (error: any) {
    console.log('  ✗ FAILED:', error.message, '\n');
    failedTests++;
  }

  // Test 6: No HTML wrapper for external URLs
  console.log('Test 6: External URL returned as plain text (no HTML)');
  try {
    const testFile = path.join(fixturesDir, 'test6.ts');
    writeFileSync(
      testFile,
      `
import type { IUI, IServer } from '../../../src/interface-types.js';

interface PlainUI extends IUI {
  uri: 'ui://test/plain';
  name: 'Plain UI';
  description: 'Plain URL test';
  externalUrl: 'https://analytics.example.com/dashboard';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  name = 'test-server' as const;
  version = '1.0.0' as const;
}
      `.trim()
    );

    const server = await loadInterfaceServer({ filePath: testFile });
    const resource = await server.readResource('ui://test/plain');

    const text = resource.contents[0].text;

    if (text.includes('<') || text.includes('>') || text.includes('html') || text.includes('iframe')) {
      throw new Error('URL should not contain HTML tags');
    }

    if (text !== 'https://analytics.example.com/dashboard') {
      throw new Error(`Expected plain URL, got: ${text}`);
    }

    console.log('  ✓ No HTML wrapper');
    console.log('  ✓ Plain URL returned');
    console.log('  ✓ PASSED\n');
    passedTests++;
  } catch (error: any) {
    console.log('  ✗ FAILED:', error.message, '\n');
    failedTests++;
  }

  // Clean up
  try {
    rmSync(fixturesDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup errors
  }

  // Summary
  console.log('=== Test Summary ===');
  console.log(`Total: ${passedTests + failedTests}`);
  console.log(`✓ Passed: ${passedTests}`);
  console.log(`✗ Failed: ${failedTests}`);

  if (failedTests > 0) {
    console.log('\nSome tests FAILED');
    process.exit(1);
  } else {
    console.log('\nAll tests PASSED!');
  }
}

runTests().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
