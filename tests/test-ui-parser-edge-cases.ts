/**
 * Test UI parser edge cases
 *
 * Tests error handling and edge cases
 */

import { parseInterfaceFile } from '../src/server/parser';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const tmpDir = '/tmp';

// Test 1: Missing required field - uri
console.log('=== Test 1: Missing URI (should fail) ===');
const missingURICode = `
import { IUI, IServer } from '../src/index';

interface BadUI extends IUI {
  name: 'Bad UI';
  description: 'Missing URI';
  html: '<div>test</div>';
}
`;

const missingURIPath = join(tmpDir, 'test-missing-uri.ts');
writeFileSync(missingURIPath, missingURICode);

try {
  console.log('Parsing file with missing URI...');
  const result = parseInterfaceFile(missingURIPath);
  console.log('UIs found:', result.uis.length);

  if (result.uis.length === 0) {
    console.log('✓ Correctly rejected UI without URI');
  } else {
    console.log('✗ Should have rejected UI without URI');
  }
} finally {
  unlinkSync(missingURIPath);
}

// Test 2: Missing required field - name
console.log('\n=== Test 2: Missing Name (should fail) ===');
const missingNameCode = `
import { IUI, IServer } from '../src/index';

interface BadUI2 extends IUI {
  uri: 'ui://bad/ui';
  description: 'Missing name';
  html: '<div>test</div>';
}
`;

const missingNamePath = join(tmpDir, 'test-missing-name.ts');
writeFileSync(missingNamePath, missingNameCode);

try {
  console.log('Parsing file with missing name...');
  const result = parseInterfaceFile(missingNamePath);
  console.log('UIs found:', result.uis.length);

  if (result.uis.length === 0) {
    console.log('✓ Correctly rejected UI without name');
  } else {
    console.log('✗ Should have rejected UI without name');
  }
} finally {
  unlinkSync(missingNamePath);
}

// Test 3: Missing required field - description
console.log('\n=== Test 3: Missing Description (should fail) ===');
const missingDescCode = `
import { IUI, IServer } from '../src/index';

interface BadUI3 extends IUI {
  uri: 'ui://bad/ui';
  name: 'Bad UI';
  html: '<div>test</div>';
}
`;

const missingDescPath = join(tmpDir, 'test-missing-desc.ts');
writeFileSync(missingDescPath, missingDescCode);

try {
  console.log('Parsing file with missing description...');
  const result = parseInterfaceFile(missingDescPath);
  console.log('UIs found:', result.uis.length);

  if (result.uis.length === 0) {
    console.log('✓ Correctly rejected UI without description');
  } else {
    console.log('✗ Should have rejected UI without description');
  }
} finally {
  unlinkSync(missingDescPath);
}

// Test 4: Minimal static UI (only required fields + html)
console.log('\n=== Test 4: Minimal Static UI ===');
const minimalStaticCode = `
import { IUI, IServer } from '../src/index';

interface MinimalUI extends IUI {
  uri: 'ui://minimal/static';
  name: 'Minimal UI';
  description: 'Only required fields';
  html: '<div>Hello</div>';
}
`;

const minimalStaticPath = join(tmpDir, 'test-minimal-static.ts');
writeFileSync(minimalStaticPath, minimalStaticCode);

try {
  const result = parseInterfaceFile(minimalStaticPath);
  console.log('UIs found:', result.uis.length);

  if (result.uis.length > 0) {
    const ui = result.uis[0];
    console.log('✓ UI parsed successfully:');
    console.log('  - URI:', ui.uri);
    console.log('  - Has HTML:', !!ui.html);
    console.log('  - Has CSS:', !!ui.css);
    console.log('  - Has Tools:', !!ui.tools);
    console.log('  - Has Size:', !!ui.size);
    console.log('  - Subscribable:', ui.subscribable);
    console.log('  - Dynamic:', ui.dynamic);

    // Validate - optional fields should be undefined
    if (!ui.css && !ui.tools && !ui.size && ui.subscribable === undefined && !ui.dynamic) {
      console.log('✓ Optional fields correctly undefined');
    } else {
      console.log('✗ Optional fields should be undefined');
    }
  } else {
    console.log('✗ Should have parsed minimal UI');
  }
} finally {
  unlinkSync(minimalStaticPath);
}

// Test 5: Multiple UIs in one file
console.log('\n=== Test 5: Multiple UIs in One File ===');
const multipleUIsCode = `
import { IUI, IServer } from '../src/index';

interface UI1 extends IUI {
  uri: 'ui://test/one';
  name: 'UI One';
  description: 'First UI';
  html: '<div>One</div>';
}

interface UI2 extends IUI {
  uri: 'ui://test/two';
  name: 'UI Two';
  description: 'Second UI';
  html: '<div>Two</div>';
}

interface UI3 extends IUI {
  uri: 'ui://test/three';
  name: 'UI Three';
  description: 'Third UI';
  dynamic: true;
  data: string;
}
`;

const multipleUIsPath = join(tmpDir, 'test-multiple-uis.ts');
writeFileSync(multipleUIsPath, multipleUIsCode);

try {
  const result = parseInterfaceFile(multipleUIsPath);
  console.log('UIs found:', result.uis.length);

  if (result.uis.length === 3) {
    console.log('✓ All 3 UIs parsed');
    console.log('  - UI 1:', result.uis[0].uri, '(static:', !result.uis[0].dynamic + ')');
    console.log('  - UI 2:', result.uis[1].uri, '(static:', !result.uis[1].dynamic + ')');
    console.log('  - UI 3:', result.uis[2].uri, '(dynamic:', result.uis[2].dynamic + ')');

    if (!result.uis[0].dynamic && !result.uis[1].dynamic && result.uis[2].dynamic) {
      console.log('✓ Correct static/dynamic flags');
    } else {
      console.log('✗ Incorrect static/dynamic flags');
    }
  } else {
    console.log('✗ Should have found 3 UIs');
  }
} finally {
  unlinkSync(multipleUIsPath);
}

// Test 6: UI with partial size (only width)
console.log('\n=== Test 6: UI with Partial Size ===');
const partialSizeCode = `
import { IUI, IServer } from '../src/index';

interface PartialSizeUI extends IUI {
  uri: 'ui://test/partial-size';
  name: 'Partial Size UI';
  description: 'Has only width';
  html: '<div>test</div>';
  size: { width: 400 };
}
`;

const partialSizePath = join(tmpDir, 'test-partial-size.ts');
writeFileSync(partialSizePath, partialSizeCode);

try {
  const result = parseInterfaceFile(partialSizePath);
  console.log('UIs found:', result.uis.length);

  if (result.uis.length > 0) {
    const ui = result.uis[0];
    console.log('✓ UI parsed successfully:');
    console.log('  - Size:', ui.size);

    if (ui.size?.width === 400 && ui.size?.height === undefined) {
      console.log('✓ Partial size (width only) extracted correctly');
    } else {
      console.log('✗ Partial size incorrect');
    }
  } else {
    console.log('✗ No UIs found');
  }
} finally {
  unlinkSync(partialSizePath);
}

// Test 7: Empty tools array
console.log('\n=== Test 7: Empty Tools Array ===');
const emptyToolsCode = `
import { IUI, IServer } from '../src/index';

interface NoToolsUI extends IUI {
  uri: 'ui://test/no-tools';
  name: 'No Tools UI';
  description: 'Has empty tools array';
  html: '<div>test</div>';
  tools: [];
}
`;

const emptyToolsPath = join(tmpDir, 'test-empty-tools.ts');
writeFileSync(emptyToolsPath, emptyToolsCode);

try {
  const result = parseInterfaceFile(emptyToolsPath);
  console.log('UIs found:', result.uis.length);

  if (result.uis.length > 0) {
    const ui = result.uis[0];
    console.log('✓ UI parsed successfully:');
    console.log('  - Tools:', ui.tools);

    if (!ui.tools) {
      console.log('✓ Empty tools array correctly treated as undefined');
    } else {
      console.log('✗ Empty tools array should be undefined');
    }
  } else {
    console.log('✗ No UIs found');
  }
} finally {
  unlinkSync(emptyToolsPath);
}

console.log('\n=== All Edge Case Tests Complete ===');
