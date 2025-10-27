/**
 * Comprehensive UI parser test
 *
 * Tests a realistic UI interface with all optional fields
 */

import { parseInterfaceFile } from '../src/server/parser';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const tmpDir = '/tmp';

console.log('=== Comprehensive UI Parser Test ===\n');

const comprehensiveCode = `
import { IUI, IServer, ITool } from '../src/index';

// Tool interfaces that the UI can call
interface SelectProductTool extends ITool {
  name: 'select_product';
  description: 'Select a product by ID';
  params: { id: string };
  result: { success: boolean };
}

interface GetStatsToolTool extends ITool {
  name: 'get_stats';
  description: 'Get current statistics';
  params: {};
  result: { count: number };
}

// Static UI with all features
interface ComprehensiveStaticUI extends IUI {
  uri: 'ui://dashboard/comprehensive';
  name: 'Comprehensive Dashboard';
  description: 'A fully-featured dashboard with all UI options';
  html: \`
    <div class="dashboard">
      <header>
        <h1>Product Dashboard</h1>
      </header>
      <main>
        <div class="stats" id="stats"></div>
        <div class="products">
          <button class="btn" onclick="callTool('select_product', { id: 'p1' })">
            Product 1
          </button>
          <button class="btn" onclick="callTool('select_product', { id: 'p2' })">
            Product 2
          </button>
        </div>
        <button class="refresh" onclick="callTool('get_stats', {})">
          Refresh Stats
        </button>
      </main>
    </div>
  \`;
  css: \`
    .dashboard {
      font-family: system-ui;
      padding: 20px;
    }
    .btn {
      background: #007bff;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn:hover {
      background: #0056b3;
    }
    .refresh {
      background: #28a745;
      color: white;
      padding: 8px 16px;
      margin-top: 20px;
    }
  \`;
  tools: ['select_product', 'get_stats'];
  size: { width: 1024, height: 768 };
  subscribable: true;
}

// Dynamic UI with updates
interface LiveChartUI extends IUI {
  uri: 'ui://charts/live';
  name: 'Live Chart';
  description: 'Real-time updating chart with tool integration';
  dynamic: true;
  subscribable: true;
  tools: ['pause_updates', 'resume_updates', 'reset_data'];
  size: { width: 800, height: 600 };
  data: string;
}

// Minimal static UI
interface SimpleFormUI extends IUI {
  uri: 'ui://forms/simple';
  name: 'Simple Form';
  description: 'Basic form interface';
  html: '<form><input type="text" /><button>Submit</button></form>';
  tools: ['submit_form'];
}

// Server interface (to verify parsing works with other interface types)
interface MyServer extends IServer {
  name: 'test_server';
  version: '1.0.0';
  description: 'Test server';
}
`;

const comprehensivePath = join(tmpDir, 'test-comprehensive-ui.ts');
writeFileSync(comprehensivePath, comprehensiveCode);

try {
  const result = parseInterfaceFile(comprehensivePath);

  console.log('Parse Results:');
  console.log('  - Server:', result.server ? result.server.name : 'none');
  console.log('  - Tools:', result.tools.length);
  console.log('  - UIs:', result.uis.length);
  console.log('');

  if (result.uis.length === 3) {
    console.log('✓ Found all 3 UI interfaces\n');

    // Test comprehensive static UI
    const staticUI = result.uis.find(u => u.uri === 'ui://dashboard/comprehensive');
    if (staticUI) {
      console.log('UI 1: Comprehensive Static Dashboard');
      console.log('  ✓ Interface name:', staticUI.interfaceName);
      console.log('  ✓ URI:', staticUI.uri);
      console.log('  ✓ Name:', staticUI.name);
      console.log('  ✓ Description:', staticUI.description);
      console.log('  ✓ HTML length:', staticUI.html?.length, 'chars');
      console.log('  ✓ CSS length:', staticUI.css?.length, 'chars');
      console.log('  ✓ Tools:', staticUI.tools);
      console.log('  ✓ Size:', staticUI.size);
      console.log('  ✓ Subscribable:', staticUI.subscribable);
      console.log('  ✓ Dynamic:', staticUI.dynamic);
      console.log('  ✓ Method name:', staticUI.methodName || 'none (static)');

      // Validate all fields
      const valid =
        staticUI.interfaceName === 'ComprehensiveStaticUI' &&
        staticUI.uri === 'ui://dashboard/comprehensive' &&
        staticUI.html && staticUI.html.includes('Product Dashboard') &&
        staticUI.css && staticUI.css.includes('.dashboard') &&
        staticUI.tools?.length === 2 &&
        staticUI.tools.includes('select_product') &&
        staticUI.tools.includes('get_stats') &&
        staticUI.size?.width === 1024 &&
        staticUI.size?.height === 768 &&
        staticUI.subscribable === true &&
        staticUI.dynamic === false &&
        !staticUI.methodName;

      console.log('  ' + (valid ? '✓' : '✗'), 'All fields validated\n');
    } else {
      console.log('✗ Comprehensive static UI not found\n');
    }

    // Test dynamic UI
    const dynamicUI = result.uis.find(u => u.uri === 'ui://charts/live');
    if (dynamicUI) {
      console.log('UI 2: Live Chart (Dynamic)');
      console.log('  ✓ Interface name:', dynamicUI.interfaceName);
      console.log('  ✓ URI:', dynamicUI.uri);
      console.log('  ✓ Dynamic:', dynamicUI.dynamic);
      console.log('  ✓ Method name:', dynamicUI.methodName);
      console.log('  ✓ Tools:', dynamicUI.tools);
      console.log('  ✓ Size:', dynamicUI.size);
      console.log('  ✓ Subscribable:', dynamicUI.subscribable);
      console.log('  ✓ Data type:', dynamicUI.dataType);
      console.log('  ✓ Has HTML:', !!dynamicUI.html);

      const valid =
        dynamicUI.interfaceName === 'LiveChartUI' &&
        dynamicUI.dynamic === true &&
        dynamicUI.methodName === 'ui://charts/live' &&
        dynamicUI.tools?.length === 3 &&
        dynamicUI.subscribable === true &&
        dynamicUI.size?.width === 800 &&
        !dynamicUI.html &&
        dynamicUI.dataType === 'string';

      console.log('  ' + (valid ? '✓' : '✗'), 'All fields validated\n');
    } else {
      console.log('✗ Dynamic UI not found\n');
    }

    // Test minimal UI
    const minimalUI = result.uis.find(u => u.uri === 'ui://forms/simple');
    if (minimalUI) {
      console.log('UI 3: Simple Form (Minimal)');
      console.log('  ✓ Interface name:', minimalUI.interfaceName);
      console.log('  ✓ URI:', minimalUI.uri);
      console.log('  ✓ Has HTML:', !!minimalUI.html);
      console.log('  ✓ Has CSS:', !!minimalUI.css);
      console.log('  ✓ Tools:', minimalUI.tools);
      console.log('  ✓ Has Size:', !!minimalUI.size);
      console.log('  ✓ Subscribable:', minimalUI.subscribable || 'undefined');
      console.log('  ✓ Dynamic:', minimalUI.dynamic);

      const valid =
        minimalUI.interfaceName === 'SimpleFormUI' &&
        minimalUI.html && minimalUI.html.includes('form') &&
        !minimalUI.css &&
        minimalUI.tools?.length === 1 &&
        !minimalUI.size &&
        minimalUI.subscribable === undefined &&
        minimalUI.dynamic === false;

      console.log('  ' + (valid ? '✓' : '✗'), 'All fields validated\n');
    } else {
      console.log('✗ Minimal UI not found\n');
    }

    // Verify other interface types still parse
    if (result.server && result.tools.length === 2) {
      console.log('✓ Other interface types (IServer, ITool) still parse correctly');
    } else {
      console.log('✗ Other interface types not parsed correctly');
    }

    console.log('\n✓ Comprehensive test PASSED');
  } else {
    console.log('✗ Expected 3 UIs, found:', result.uis.length);
  }
} finally {
  unlinkSync(comprehensivePath);
}

console.log('\n=== Test Complete ===');
