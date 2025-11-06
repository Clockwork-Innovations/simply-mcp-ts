/**
 * Test UI parser functionality
 *
 * Tests parsing of static and dynamic IUI interfaces
 */

import { parseInterfaceFile } from '../src/server/parser';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const tmpDir = '/tmp';

// Test 1: Static UI with inline HTML
console.log('=== Test 1: Static UI with Inline HTML ===');
const staticUICode = `
import { IUI, IServer } from '../src/index';

interface ProductSelectorUI extends IUI {
  uri: 'ui://products/selector';
  name: 'Product Selector';
  description: 'Select a product from the catalog';
  html: \`
    <div style="padding: 20px;">
      <h2>Choose a Product</h2>
      <button onclick="callTool('select_product', { id: 'widget-a' })">
        Widget A - $99
      </button>
    </div>
  \`;
  tools: ['select_product'];
}
`;

const staticUIPath = join(tmpDir, 'test-static-ui.ts');
writeFileSync(staticUIPath, staticUICode);

try {
  const result = parseInterfaceFile(staticUIPath);
  console.log('UIs found:', result.uis.length);

  if (result.uis.length > 0) {
    const ui = result.uis[0];
    console.log('✓ UI parsed successfully:');
    console.log('  - Interface:', ui.interfaceName);
    console.log('  - URI:', ui.uri);
    console.log('  - Name:', ui.name);
    console.log('  - Description:', ui.description);
    console.log('  - Has HTML:', !!ui.html);
    console.log('  - HTML length:', ui.html?.length);
    console.log('  - Tools:', ui.tools);
    console.log('  - Dynamic:', ui.dynamic);
    console.log('  - Method name:', ui.methodName);

    // Validate
    if (ui.uri === 'ui://products/selector' &&
        ui.name === 'Product Selector' &&
        ui.description === 'Select a product from the catalog' &&
        ui.html &&
        ui.html.includes('Choose a Product') &&
        ui.tools?.includes('select_product') &&
        !ui.dynamic) {
      console.log('✓ All fields extracted correctly');
    } else {
      console.log('✗ Some fields incorrect');
    }
  } else {
    console.log('✗ No UIs found');
  }
} finally {
  unlinkSync(staticUIPath);
}

console.log('\n=== Test 2: Static UI with CSS ===');
const staticUICSSCode = `
import { IUI, IServer } from '../src/index';

interface DashboardUI extends IUI {
  uri: 'ui://dashboard/main';
  name: 'Main Dashboard';
  description: 'Server statistics dashboard';
  html: '<div class="dashboard">...</div>';
  css: \`
    .dashboard { display: grid; gap: 20px; }
    .card { padding: 16px; border-radius: 8px; }
  \`;
  tools: ['get_stats', 'refresh_data'];
}
`;

const staticUICSSPath = join(tmpDir, 'test-static-ui-css.ts');
writeFileSync(staticUICSSPath, staticUICSSCode);

try {
  const result = parseInterfaceFile(staticUICSSPath);
  console.log('UIs found:', result.uis.length);

  if (result.uis.length > 0) {
    const ui = result.uis[0];
    console.log('✓ UI parsed successfully:');
    console.log('  - URI:', ui.uri);
    console.log('  - Has HTML:', !!ui.html);
    console.log('  - Has CSS:', !!ui.css);
    console.log('  - CSS length:', ui.css?.length);
    console.log('  - Tools:', ui.tools);
    console.log('  - Dynamic:', ui.dynamic);

    // Validate
    if (ui.css && ui.css.includes('.dashboard') && ui.tools?.length === 2) {
      console.log('✓ CSS and tools extracted correctly');
    } else {
      console.log('✗ CSS or tools incorrect');
    }
  } else {
    console.log('✗ No UIs found');
  }
} finally {
  unlinkSync(staticUICSSPath);
}

console.log('\n=== Test 3: Dynamic UI ===');
const dynamicUICode = `
import { IUI, IServer } from '../src/index';

interface StatsUI extends IUI {
  uri: 'ui://stats/live';
  name: 'Live Statistics';
  description: 'Real-time server stats';
  tools: ['reset_counter'];
  data: string;
}
`;

const dynamicUIPath = join(tmpDir, 'test-dynamic-ui.ts');
writeFileSync(dynamicUIPath, dynamicUICode);

try {
  const result = parseInterfaceFile(dynamicUIPath);
  console.log('UIs found:', result.uis.length);

  if (result.uis.length > 0) {
    const ui = result.uis[0];
    console.log('✓ UI parsed successfully:');
    console.log('  - URI:', ui.uri);
    console.log('  - Dynamic:', ui.dynamic);
    console.log('  - Has HTML:', !!ui.html);
    console.log('  - Method name:', ui.methodName);
    console.log('  - Tools:', ui.tools);
    console.log('  - Data type:', ui.dataType);

    // Validate
    if (ui.dynamic && !ui.html && ui.methodName === 'ui://stats/live' && ui.dataType === 'string') {
      console.log('✓ Dynamic UI fields correct');
    } else {
      console.log('✗ Dynamic UI fields incorrect');
    }
  } else {
    console.log('✗ No UIs found');
  }
} finally {
  unlinkSync(dynamicUIPath);
}

console.log('\n=== Test 4: UI with Size and Subscribable ===');
const sizeUICode = `
import { IUI, IServer } from '../src/index';

interface MapUI extends IUI {
  uri: 'ui://map/viewer';
  name: 'Map Viewer';
  description: 'Interactive map';
  html: '<div id="map">...</div>';
  size: { width: 800, height: 600 };
  subscribable: true;
  tools: ['zoom_in', 'zoom_out'];
}
`;

const sizeUIPath = join(tmpDir, 'test-size-ui.ts');
writeFileSync(sizeUIPath, sizeUICode);

try {
  const result = parseInterfaceFile(sizeUIPath);
  console.log('UIs found:', result.uis.length);

  if (result.uis.length > 0) {
    const ui = result.uis[0];
    console.log('✓ UI parsed successfully:');
    console.log('  - URI:', ui.uri);
    console.log('  - Size:', ui.size);
    console.log('  - Subscribable:', ui.subscribable);
    console.log('  - Tools:', ui.tools);

    // Validate
    if (ui.size?.width === 800 &&
        ui.size?.height === 600 &&
        ui.subscribable === true &&
        ui.tools?.length === 2) {
      console.log('✓ Size and subscribable fields correct');
    } else {
      console.log('✗ Size or subscribable fields incorrect');
    }
  } else {
    console.log('✗ No UIs found');
  }
} finally {
  unlinkSync(sizeUIPath);
}

console.log('\n=== Test 5: Auto-infer Dynamic (no html field) ===');
const autoInferDynamicCode = `
import { IUI, IServer } from '../src/index';

interface AutoDynamicUI extends IUI {
  uri: 'ui://auto/dynamic';
  name: 'Auto Dynamic';
  description: 'Automatically inferred as dynamic';
  tools: ['action'];
  data: string;
}
`;

const autoInferPath = join(tmpDir, 'test-auto-infer.ts');
writeFileSync(autoInferPath, autoInferDynamicCode);

try {
  const result = parseInterfaceFile(autoInferPath);
  console.log('UIs found:', result.uis.length);

  if (result.uis.length > 0) {
    const ui = result.uis[0];
    console.log('✓ UI parsed successfully:');
    console.log('  - URI:', ui.uri);
    console.log('  - Dynamic (auto-inferred):', ui.dynamic);
    console.log('  - Has HTML:', !!ui.html);
    console.log('  - Method name:', ui.methodName);

    // Validate - should be inferred as dynamic since no html field
    if (ui.dynamic && !ui.html && ui.methodName === 'ui://auto/dynamic') {
      console.log('✓ Auto-inferred as dynamic correctly');
    } else {
      console.log('✗ Auto-inference failed');
    }
  } else {
    console.log('✗ No UIs found');
  }
} finally {
  unlinkSync(autoInferPath);
}

console.log('\n=== All Tests Complete ===');
