/**
 * Manual test for interface-advanced.ts example
 */

import { loadInterfaceServer } from '../dist/src/api/interface/index.js';

async function testInterfaceAdvanced() {
  console.log('\n=== Testing interface-advanced.ts ===\n');

  try {
    const server = await loadInterfaceServer({
      filePath: 'examples/interface-advanced.ts',
      verbose: true,
    });

    console.log('\n✅ Server loaded successfully!');
    console.log('Server name:', server.name);
    console.log('Server version:', server.version);
    console.log('Server description:', server.description);

    console.log('\n=== Server validation complete ===');
    console.log('✅ All manual tests passed!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testInterfaceAdvanced();
