/**
 * Test: HTTP Transport Configuration from File
 *
 * Validates that a server with transport: 'http' in IServer interface
 * uses HTTP transport without needing --http CLI flag.
 */

import { parseInterfaceFile } from '../src/server/parser.js';
import { loadInterfaceServer } from '../src/adapter.js';
import { resolve } from 'path';

console.log('=== HTTP Transport Configuration Test ===\n');

const filePath = resolve(process.cwd(), 'tests/fixtures/http-server.ts');

// Test 1: Verify parser extracts HTTP config
console.log('Test 1: Parser extracts HTTP transport config');

try {
  const parseResult = parseInterfaceFile(filePath);

  console.log('✓ File parsed successfully');
  console.log(`  Server: ${parseResult.server?.name}`);
  console.log(`  Transport: ${parseResult.server?.transport}`);
  console.log(`  Port: ${parseResult.server?.port}`);
  console.log(`  Stateful: ${parseResult.server?.stateful}`);

  if (parseResult.server?.transport !== 'http') {
    console.error(`✗ Expected transport: 'http', got: ${parseResult.server?.transport}`);
    process.exit(1);
  }
  console.log('✓ Transport correctly extracted as "http"');

  if (parseResult.server?.port !== 4000) {
    console.error(`✗ Expected port: 4000, got: ${parseResult.server?.port}`);
    process.exit(1);
  }
  console.log('✓ Port correctly extracted as 4000');

  if (parseResult.server?.stateful !== true) {
    console.error(`✗ Expected stateful: true, got: ${parseResult.server?.stateful}`);
    process.exit(1);
  }
  console.log('✓ Stateful correctly extracted as true');

} catch (error) {
  console.error('✗ Parser failed:', error);
  process.exit(1);
}

console.log('\n---\n');

// Test 2: Verify adapter sets runtime config
console.log('Test 2: Adapter sets runtime config from file');

loadInterfaceServer({
  filePath,
  verbose: false,
})
  .then((server) => {
    console.log('✓ Server loaded successfully');

    const runtimeConfig = server.getRuntimeConfig();

    if (!runtimeConfig) {
      console.error('✗ Runtime config not set');
      process.exit(1);
    }

    console.log(`  Transport: ${runtimeConfig.transport}`);
    console.log(`  Port: ${runtimeConfig.port}`);
    console.log(`  Stateful: ${runtimeConfig.stateful}`);

    if (runtimeConfig.transport !== 'http') {
      console.error(`✗ Expected runtime transport: 'http', got: ${runtimeConfig.transport}`);
      process.exit(1);
    }
    console.log('✓ Runtime transport set to "http"');

    if (runtimeConfig.port !== 4000) {
      console.error(`✗ Expected runtime port: 4000, got: ${runtimeConfig.port}`);
      process.exit(1);
    }
    console.log('✓ Runtime port set to 4000');

    if (runtimeConfig.stateful !== true) {
      console.error(`✗ Expected runtime stateful: true, got: ${runtimeConfig.stateful}`);
      process.exit(1);
    }
    console.log('✓ Runtime stateful set to true');

    console.log('\n---\n');

    // Test 3: Verify CLI flag overrides file config
    console.log('Test 3: CLI --http flag overrides file transport');

    return loadInterfaceServer({
      filePath,
      verbose: false,
      http: true,  // Should keep HTTP (already HTTP in file)
      port: 5000,  // Override port to 5000
    });
  })
  .then((server) => {
    const runtimeConfig = server.getRuntimeConfig();

    if (!runtimeConfig) {
      console.error('✗ Runtime config not set');
      process.exit(1);
    }

    console.log(`  Transport: ${runtimeConfig.transport}`);
    console.log(`  Port: ${runtimeConfig.port}`);

    if (runtimeConfig.transport !== 'http') {
      console.error(`✗ Expected transport: 'http', got: ${runtimeConfig.transport}`);
      process.exit(1);
    }
    console.log('✓ Transport remains "http"');

    if (runtimeConfig.port !== 5000) {
      console.error(`✗ Expected port: 5000, got: ${runtimeConfig.port}`);
      process.exit(1);
    }
    console.log('✓ Port overridden to 5000 by CLI flag');

    console.log('\n=== All Tests Passed ===\n');
    console.log('Summary:');
    console.log('  ✓ Parser extracts transport: "http" from IServer');
    console.log('  ✓ Parser extracts port: 4000 from IServer');
    console.log('  ✓ Parser extracts stateful: true from IServer');
    console.log('  ✓ Adapter wires config to runtime');
    console.log('  ✓ CLI flags override file config (port override works)');
    console.log('\nConclusion: File-based HTTP transport configuration works correctly!');
  })
  .catch((error) => {
    console.error('✗ Test failed:', error);
    process.exit(1);
  });
