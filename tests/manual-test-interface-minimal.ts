/**
 * Manual test for interface-minimal.ts example
 */

import { loadInterfaceServer } from '../dist/src/adapter.js';

async function testInterfaceMinimal() {
  console.log('\n=== Testing interface-minimal.ts ===\n');

  try {
    const server = await loadInterfaceServer({
      filePath: 'examples/interface-minimal.ts',
      verbose: true,
    });

    console.log('\n✅ Server loaded successfully!');
    console.log('Server name:', server.name);
    console.log('Server version:', server.version);
    console.log('Server description:', server.description);

    console.log('\n=== Server validation complete ===');

    console.log('\n✅ All manual tests passed!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testInterfaceMinimal();
