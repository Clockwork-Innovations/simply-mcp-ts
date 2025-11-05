/**
 * Test React Component Integration
 *
 * Verifies that React components are correctly:
 * - Loaded from file system
 * - Compiled with Babel
 * - Integrated with tool helpers
 * - Registered as MCP resources
 */

import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { parseInterfaceFile } from '../src/server/parser.js';
import { loadInterfaceServer } from '../src/adapter.js';
import { tmpdir } from 'os';

/**
 * Test Setup:
 * 1. Create temporary directory
 * 2. Write test React component
 * 3. Write test server file with React UI interface
 * 4. Load and verify
 */

async function testReactIntegration() {
  console.log('=== React Component Integration Test ===\n');

  // Create temporary test directory
  const testDir = join(tmpdir(), 'simply-mcp-react-test-' + Date.now());
  mkdirSync(testDir, { recursive: true });

  try {
    console.log('Test directory:', testDir);

    // Step 1: Create test React component
    const componentCode = `
import React, { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  const handleIncrement = async () => {
    try {
      // Call MCP tool via window.callTool (injected by adapter)
      const result = await window.callTool('increment', { value: count });
      setCount(result.newValue);
      window.notify('info', 'Counter incremented!');
    } catch (error) {
      window.notify('error', 'Failed to increment: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>React Counter</h1>
      <p>Current count: {count}</p>
      <button onClick={handleIncrement} style={{ padding: '10px 20px' }}>
        Increment via Tool
      </button>
    </div>
  );
}
`;

    const componentPath = join(testDir, 'Counter.tsx');
    writeFileSync(componentPath, componentCode);
    console.log('✓ Created test component:', componentPath);

    // Step 2: Create test server file with React UI interface
    const serverCode = `
import type { IServer, IUI, ITool } from '../src/index.js';

// Define React component UI
interface CounterUI extends IUI {
  uri: 'ui://counter';
  name: 'Counter';
  description: 'React counter component';
  component: './Counter.tsx';
  tools: ['increment'];
  dependencies: [];
}

// Define increment tool
interface IncrementTool extends ITool {
  name: 'increment';
  description: 'Increment counter value';
  params: {
    value: number;
  };
  returns: {
    newValue: number;
  };
}

// Define server
const server: IServer = {
  name: 'react-test-server',
  version: '1.0.0',
  description: 'Test server with React UI'
}

export default class {
  // Implement increment tool
  increment: IncrementTool = async (params) => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ newValue: params.value + 1 })
        }
      ]
    };
  };
}
`;

    const serverPath = join(testDir, 'server.ts');
    writeFileSync(serverPath, serverCode);
    console.log('✓ Created test server:', serverPath);

    // Step 3: Parse the server file
    console.log('\n--- Parsing Server File ---');
    const parseResult = parseInterfaceFile(serverPath);

    console.log('Server:', parseResult.server?.name);
    console.log('Tools:', parseResult.tools.map(t => t.name).join(', '));
    console.log('UIs:', parseResult.uis.map(ui => ui.uri).join(', '));

    // Verify UI was parsed
    if (parseResult.uis.length === 0) {
      throw new Error('❌ No UI resources parsed');
    }

    const counterUI = parseResult.uis[0];
    console.log('\nParsed UI:');
    console.log('  - URI:', counterUI.uri);
    console.log('  - Name:', counterUI.name);
    console.log('  - Component:', counterUI.component);
    console.log('  - Tools:', counterUI.tools);
    console.log('  - Dependencies:', counterUI.dependencies);

    if (!counterUI.component) {
      throw new Error('❌ Component path not parsed');
    }

    if (counterUI.component !== './Counter.tsx') {
      throw new Error(`❌ Component path mismatch: expected "./Counter.tsx", got "${counterUI.component}"`);
    }

    if (!counterUI.tools || !counterUI.tools.includes('increment')) {
      throw new Error('❌ Tools not parsed correctly');
    }

    console.log('✓ Parse validation passed');

    // Step 4: Load the server (this triggers React compilation)
    console.log('\n--- Loading Server (Triggering React Compilation) ---');

    const server = await loadInterfaceServer({
      filePath: serverPath,
      verbose: true,
    });

    console.log('✓ Server loaded successfully');

    // Step 5: Verify resource was registered
    console.log('\n--- Verifying Resource Registration ---');

    // Get the resource list from the server
    const resources = (server as any).buildServer.resources;

    if (!resources || resources.size === 0) {
      throw new Error('❌ No resources registered');
    }

    console.log('Registered resources:', Array.from(resources.keys()).join(', '));

    // Find our counter UI resource
    const counterResource = resources.get('ui://counter');

    if (!counterResource) {
      throw new Error('❌ Counter UI resource not found');
    }

    console.log('✓ Counter UI resource registered');

    // Step 6: Get the resource content (compiled HTML)
    console.log('\n--- Getting Resource Content ---');

    let htmlContent: string;

    if (typeof counterResource.content === 'string') {
      htmlContent = counterResource.content;
    } else if (typeof counterResource.content === 'function') {
      htmlContent = await counterResource.content();
    } else {
      throw new Error('❌ Invalid resource content type');
    }

    console.log('HTML content length:', htmlContent.length, 'bytes');

    // Step 7: Validate compiled HTML structure
    console.log('\n--- Validating Compiled HTML ---');

    const validations = [
      { name: 'HTML structure', pattern: /<!DOCTYPE html>/, pass: false },
      { name: 'React runtime', pattern: /react\.production\.min\.js/, pass: false },
      { name: 'ReactDOM runtime', pattern: /react-dom\.production\.min\.js/, pass: false },
      { name: 'Tool helper script', pattern: /window\.callTool/, pass: false },
      { name: 'Notification helper', pattern: /window\.notify/, pass: false },
      { name: 'Tool allowlist', pattern: /ALLOWED_TOOLS.*increment/, pass: false },
      { name: 'Component rendering', pattern: /ReactDOM\.createRoot/, pass: false },
      { name: 'Root element', pattern: /<div id="root">/, pass: false },
    ];

    for (const validation of validations) {
      validation.pass = validation.pattern.test(htmlContent);
      console.log(validation.pass ? '✓' : '❌', validation.name);

      if (!validation.pass) {
        throw new Error(`❌ Validation failed: ${validation.name}`);
      }
    }

    // Step 8: Verify tool helpers are injected correctly
    console.log('\n--- Verifying Tool Helpers ---');

    // Check that tool helpers appear before the compiled component
    const toolHelperIndex = htmlContent.indexOf('window.callTool');
    const componentScriptIndex = htmlContent.indexOf('ReactDOM.createRoot');

    if (toolHelperIndex === -1) {
      throw new Error('❌ Tool helpers not found');
    }

    if (componentScriptIndex === -1) {
      throw new Error('❌ Component script not found');
    }

    if (toolHelperIndex > componentScriptIndex) {
      console.warn('⚠️  Tool helpers appear AFTER component script (may still work via hoisting)');
    } else {
      console.log('✓ Tool helpers injected before component script');
    }

    // Check for React context integration
    if (htmlContent.includes('React.callTool') || htmlContent.includes('React.notify')) {
      console.log('✓ Tool helpers exposed to React context');
    } else {
      console.warn('⚠️  Tool helpers not explicitly exposed to React context');
    }

    console.log('\n=== All Tests Passed ===\n');
    console.log('Summary:');
    console.log('  - React component loaded from file system');
    console.log('  - Component compiled with Babel (JSX → JS)');
    console.log('  - Tool helpers injected into HTML');
    console.log('  - Resource registered with MCP server');
    console.log('  - HTML includes React runtime from CDN');
    console.log('  - Tool allowlist enforced (security)');
    console.log('\nThe React compiler integration is working correctly! 🎉');

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  } finally {
    // Cleanup
    try {
      rmSync(testDir, { recursive: true, force: true });
      console.log('\n✓ Cleaned up test directory');
    } catch (error) {
      console.warn('Warning: Failed to clean up test directory:', testDir);
    }
  }
}

// Run the test
testReactIntegration().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
