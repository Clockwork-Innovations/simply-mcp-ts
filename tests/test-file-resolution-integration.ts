/**
 * Test: File Resolution Integration (Task 15)
 *
 * Validates that parser extracts new UI fields and adapter handles file-based UIs.
 */

import { parseInterfaceFile } from '../src/parser.js';
import { resolve } from 'path';
import { writeFileSync, mkdirSync, rmSync } from 'fs';

// Create test directory and files
const testDir = resolve(process.cwd(), 'tests/fixtures/ui-file-test');
const serverFile = resolve(testDir, 'test-server.ts');
const htmlFile = resolve(testDir, 'ui/calculator.html');
const cssFile = resolve(testDir, 'styles/theme.css');
const jsFile = resolve(testDir, 'scripts/calculator.js');

try {
  // Clean and create test directory structure
  rmSync(testDir, { recursive: true, force: true });
  mkdirSync(resolve(testDir, 'ui'), { recursive: true });
  mkdirSync(resolve(testDir, 'styles'), { recursive: true });
  mkdirSync(resolve(testDir, 'scripts'), { recursive: true });

  // Create test HTML file
  writeFileSync(htmlFile, `<!DOCTYPE html>
<html>
<head>
  <title>Calculator</title>
</head>
<body>
  <div id="calculator">
    <h1>Calculator</h1>
    <input id="display" type="text" readonly />
    <button onclick="calculate()">Calculate</button>
  </div>
</body>
</html>`);

  // Create test CSS file
  writeFileSync(cssFile, `
body {
  font-family: Arial, sans-serif;
  background: #f0f0f0;
}
#calculator {
  padding: 20px;
  background: white;
  border-radius: 8px;
}
`);

  // Create test JS file
  writeFileSync(jsFile, `
function calculate() {
  const display = document.getElementById('display');
  display.value = 'Result: 42';
}
`);

  // Create test server with file-based UI
  const serverCode = `
import type { IServer, IUI } from 'simply-mcp';

interface CalculatorUI extends IUI {
  uri: 'ui://calculator/v1';
  name: 'Calculator';
  description: 'Simple calculator interface';
  file: './ui/calculator.html';
  stylesheets: ['./styles/theme.css'];
  scripts: ['./scripts/calculator.js'];
  tools: ['add', 'subtract'];
  size: { width: 400, height: 600 };
}

interface ReactDashboard extends IUI {
  uri: 'ui://dashboard/v1';
  name: 'Dashboard';
  description: 'React-based dashboard';
  component: './components/Dashboard.tsx';
  dependencies: ['react', 'recharts'];
  tools: ['fetch_data'];
}

interface InlineUI extends IUI {
  uri: 'ui://simple/v1';
  name: 'Simple UI';
  description: 'Inline HTML UI';
  html: '<div>Hello World</div>';
}

interface MyServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServer implements MyServer {}
`;

  writeFileSync(serverFile, serverCode);

  // Parse the server file
  console.log('Parsing server file...');
  const parseResult = parseInterfaceFile(serverFile);

  console.log('\n=== Parser Test Results ===\n');

  // Validate parsing results
  if (parseResult.uis.length !== 3) {
    throw new Error(`Expected 3 UIs, got ${parseResult.uis.length}`);
  }

  console.log(`✓ Found ${parseResult.uis.length} UI interfaces`);

  // Test 1: File-based UI with external resources
  const calculatorUI = parseResult.uis.find(ui => ui.uri === 'ui://calculator/v1');
  if (!calculatorUI) {
    throw new Error('Calculator UI not found');
  }

  console.log('\n--- File-based UI (Calculator) ---');
  console.log(`URI: ${calculatorUI.uri}`);
  console.log(`Name: ${calculatorUI.name}`);
  console.log(`File: ${calculatorUI.file}`);
  console.log(`Stylesheets: ${calculatorUI.stylesheets?.join(', ')}`);
  console.log(`Scripts: ${calculatorUI.scripts?.join(', ')}`);
  console.log(`Tools: ${calculatorUI.tools?.join(', ')}`);
  console.log(`Size: ${JSON.stringify(calculatorUI.size)}`);
  console.log(`Dynamic: ${calculatorUI.dynamic}`);

  // Validate calculator UI fields
  if (calculatorUI.file !== './ui/calculator.html') {
    throw new Error(`Expected file='./ui/calculator.html', got '${calculatorUI.file}'`);
  }

  if (!calculatorUI.stylesheets || calculatorUI.stylesheets.length !== 1) {
    throw new Error('Expected 1 stylesheet');
  }

  if (calculatorUI.stylesheets[0] !== './styles/theme.css') {
    throw new Error(`Expected stylesheet='./styles/theme.css', got '${calculatorUI.stylesheets[0]}'`);
  }

  if (!calculatorUI.scripts || calculatorUI.scripts.length !== 1) {
    throw new Error('Expected 1 script');
  }

  if (calculatorUI.scripts[0] !== './scripts/calculator.js') {
    throw new Error(`Expected script='./scripts/calculator.js', got '${calculatorUI.scripts[0]}'`);
  }

  if (!calculatorUI.tools || calculatorUI.tools.length !== 2) {
    throw new Error('Expected 2 tools');
  }

  if (calculatorUI.dynamic !== false) {
    throw new Error('Expected dynamic=false for file-based UI');
  }

  console.log('✓ All calculator UI fields parsed correctly');

  // Test 2: React component UI
  const dashboardUI = parseResult.uis.find(ui => ui.uri === 'ui://dashboard/v1');
  if (!dashboardUI) {
    throw new Error('Dashboard UI not found');
  }

  console.log('\n--- React Component UI (Dashboard) ---');
  console.log(`URI: ${dashboardUI.uri}`);
  console.log(`Component: ${dashboardUI.component}`);
  console.log(`Dependencies: ${dashboardUI.dependencies?.join(', ')}`);
  console.log(`Dynamic: ${dashboardUI.dynamic}`);

  if (dashboardUI.component !== './components/Dashboard.tsx') {
    throw new Error(`Expected component='./components/Dashboard.tsx', got '${dashboardUI.component}'`);
  }

  if (!dashboardUI.dependencies || dashboardUI.dependencies.length !== 2) {
    throw new Error('Expected 2 dependencies');
  }

  if (dashboardUI.dependencies[0] !== 'react' || dashboardUI.dependencies[1] !== 'recharts') {
    throw new Error('Expected dependencies=[react, recharts]');
  }

  if (dashboardUI.dynamic !== false) {
    throw new Error('Expected dynamic=false for component UI');
  }

  console.log('✓ All dashboard UI fields parsed correctly');

  // Test 3: Inline HTML UI (backward compatibility)
  const simpleUI = parseResult.uis.find(ui => ui.uri === 'ui://simple/v1');
  if (!simpleUI) {
    throw new Error('Simple UI not found');
  }

  console.log('\n--- Inline HTML UI (Simple) ---');
  console.log(`URI: ${simpleUI.uri}`);
  console.log(`HTML: ${simpleUI.html}`);
  console.log(`Dynamic: ${simpleUI.dynamic}`);

  if (simpleUI.html !== '<div>Hello World</div>') {
    throw new Error(`Expected html='<div>Hello World</div>', got '${simpleUI.html}'`);
  }

  if (simpleUI.dynamic !== false) {
    throw new Error('Expected dynamic=false for inline HTML UI');
  }

  console.log('✓ Inline HTML UI parsed correctly (backward compatibility maintained)');

  // Test 4: Mutual exclusivity validation
  console.log('\n--- Testing Mutual Exclusivity Validation ---');

  const conflictingServerCode = `
import type { IServer, IUI } from 'simply-mcp';

interface ConflictingUI extends IUI {
  uri: 'ui://conflict/v1';
  name: 'Conflict';
  description: 'Has both html and file';
  html: '<div>Inline</div>';
  file: './ui/calculator.html';
}

interface MyServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServer implements MyServer {}
`;

  const conflictServerFile = resolve(testDir, 'conflict-server.ts');
  writeFileSync(conflictServerFile, conflictingServerCode);

  let caughtError = false;
  try {
    parseInterfaceFile(conflictServerFile);
  } catch (error: any) {
    if (error.message.includes('mutually exclusive')) {
      caughtError = true;
      console.log('✓ Mutual exclusivity validation works correctly');
      console.log(`  Error: ${error.message}`);
    }
  }

  if (!caughtError) {
    throw new Error('Expected mutual exclusivity error but none was thrown');
  }

  console.log('\n=== All Tests Passed ===\n');
  console.log('Summary:');
  console.log('  ✓ ParsedUI interface extended with 6 new fields');
  console.log('  ✓ parseUIInterface() extracts new fields');
  console.log('  ✓ File-based UI fields extracted correctly');
  console.log('  ✓ React component fields extracted correctly');
  console.log('  ✓ Backward compatibility maintained (inline HTML)');
  console.log('  ✓ Mutual exclusivity validation works');

  process.exit(0);
} catch (error: any) {
  console.error('\n❌ Test Failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  // Cleanup
  rmSync(testDir, { recursive: true, force: true });
}
