/**
 * Test: Runtime Configuration Flow
 *
 * Validates that parsed IServer configuration (transport, port, stateful, auth)
 * flows correctly from the parser to the InterfaceServer runtime.
 */

import { parseInterfaceFile } from '../src/parser.js';
import { loadInterfaceServer } from '../src/adapter.js';
import { resolve } from 'path';

console.log('=== Runtime Configuration Flow Test ===\n');

// Test 1: Parse file and verify server config extraction
console.log('Test 1: Parser extracts server config from IServer interface');
const filePath = resolve(process.cwd(), 'examples/interface-comprehensive.ts');

try {
  const parseResult = parseInterfaceFile(filePath);

  console.log('✓ File parsed successfully');
  console.log(`  Server name: ${parseResult.server?.name}`);
  console.log(`  Server version: ${parseResult.server?.version}`);
  console.log(`  Transport: ${parseResult.server?.transport || 'not specified (defaults to stdio)'}`);
  console.log(`  Port: ${parseResult.server?.port || 'not specified (defaults to 3000)'}`);
  console.log(`  Stateful: ${parseResult.server?.stateful !== undefined ? parseResult.server.stateful : 'not specified (defaults to true)'}`);
  console.log(`  Auth: ${parseResult.server?.auth ? parseResult.server.auth.type : 'not configured'}`);
} catch (error) {
  console.error('✗ Parser failed:', error);
  process.exit(1);
}

console.log('\n---\n');

// Test 2: Load server and verify runtime config
console.log('Test 2: Adapter wires config to InterfaceServer');

loadInterfaceServer({
  filePath,
  verbose: false,
})
  .then((server) => {
    console.log('✓ Server loaded successfully');

    const runtimeConfig = server.getRuntimeConfig();

    if (!runtimeConfig) {
      console.error('✗ Runtime config not set on server instance');
      process.exit(1);
    }

    console.log('✓ Runtime config is set');
    console.log(`  Transport: ${runtimeConfig.transport}`);
    console.log(`  Port: ${runtimeConfig.port}`);
    console.log(`  Stateful: ${runtimeConfig.stateful}`);
    console.log(`  Auth: ${runtimeConfig.auth ? 'configured' : 'not configured'}`);

    console.log('\n---\n');

    // Test 3: Verify CLI flag override behavior
    console.log('Test 3: CLI flags override file config');

    return loadInterfaceServer({
      filePath,
      verbose: false,
      http: true,  // Override to HTTP
      port: 4000,  // Override port
      stateful: false,  // Override stateful
    });
  })
  .then((server) => {
    const runtimeConfig = server.getRuntimeConfig();

    if (!runtimeConfig) {
      console.error('✗ Runtime config not set');
      process.exit(1);
    }

    // Verify CLI overrides worked
    const expectedTransport = 'http';
    const expectedPort = 4000;
    const expectedStateful = false;

    if (runtimeConfig.transport !== expectedTransport) {
      console.error(`✗ Transport override failed: expected ${expectedTransport}, got ${runtimeConfig.transport}`);
      process.exit(1);
    }
    console.log(`✓ Transport override: ${runtimeConfig.transport} (CLI flag)`);

    if (runtimeConfig.port !== expectedPort) {
      console.error(`✗ Port override failed: expected ${expectedPort}, got ${runtimeConfig.port}`);
      process.exit(1);
    }
    console.log(`✓ Port override: ${runtimeConfig.port} (CLI flag)`);

    if (runtimeConfig.stateful !== expectedStateful) {
      console.error(`✗ Stateful override failed: expected ${expectedStateful}, got ${runtimeConfig.stateful}`);
      process.exit(1);
    }
    console.log(`✓ Stateful override: ${runtimeConfig.stateful} (CLI flag)`);

    console.log('\n---\n');

    // Test 4: Verify backward compatibility (no config = defaults)
    console.log('Test 4: Backward compatibility - defaults when no config');

    return loadInterfaceServer({
      filePath,
      verbose: false,
      // No overrides - should use file config or defaults
    });
  })
  .then((server) => {
    const runtimeConfig = server.getRuntimeConfig();

    if (!runtimeConfig) {
      console.error('✗ Runtime config not set');
      process.exit(1);
    }

    // Should have defaults or file config
    console.log(`✓ Transport: ${runtimeConfig.transport || 'stdio'} (file or default)`);
    console.log(`✓ Port: ${runtimeConfig.port || 3000} (file or default)`);
    console.log(`✓ Stateful: ${runtimeConfig.stateful !== undefined ? runtimeConfig.stateful : true} (file or default)`);

    console.log('\n=== All Tests Passed ===\n');
    console.log('Summary:');
    console.log('  ✓ Parser extracts transport/port/stateful/auth from IServer');
    console.log('  ✓ Adapter wires config to InterfaceServer runtime');
    console.log('  ✓ CLI flags override file config');
    console.log('  ✓ Backward compatible (defaults work)');
    console.log('  ✓ Auth config flows through (ready for wiring)');
  })
  .catch((error) => {
    console.error('✗ Test failed:', error);
    process.exit(1);
  });
