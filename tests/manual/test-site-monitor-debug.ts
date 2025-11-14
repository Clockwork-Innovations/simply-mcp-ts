/**
 * Debug test for site-monitor server with Agent SDK
 * Tests low-level MCP protocol to see debug logs and tool discovery
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

const SITE_MONITOR_SERVER = '/mnt/Shared/cs-projects/site-monitor/src/mcp/site-monitor-server.ts';
const CLI_PATH = path.resolve(import.meta.dirname, '../../dist/src/cli/index.js');

console.log('================================================================================');
console.log('  Site-Monitor Server Debug Test');
console.log('================================================================================\n');
console.log('Server:', SITE_MONITOR_SERVER);
console.log('Protocol Debug: ENABLED');
console.log('Expected: 27 tools\n');

async function testSiteMonitorServer() {
  const startTime = Date.now();

  console.log('Creating transport with debug logging enabled...');
  const transport = new StdioClientTransport({
    command: 'node',
    args: [
      CLI_PATH,
      'run',
      SITE_MONITOR_SERVER,
      '--quick'
    ],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      SIMPLY_MCP_DEBUG_PROTOCOL: 'true',
      SIMPLY_MCP_DEBUG: 'true'  // Enable all debug logs
    }
  });

  console.log('Creating MCP client...');
  const client = new Client(
    { name: 'debug-test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  console.log('Connecting to server...\n');
  console.log('--- SERVER OUTPUT BELOW ---\n');

  try {
    await client.connect(transport);
    const connectTime = Date.now() - startTime;

    console.log(`\n--- CLIENT OUTPUT ---`);
    console.log(`✓ Connected in ${connectTime}ms`);

    console.log('\nListing tools...');
    const toolsStart = Date.now();
    const result = await client.listTools();
    const toolsTime = Date.now() - toolsStart;

    console.log(`✓ tools/list completed in ${toolsTime}ms\n`);
    console.log('='.repeat(80));
    console.log(`RESULT: ${result.tools.length} tools discovered`);
    console.log('='.repeat(80));

    if (result.tools.length === 0) {
      console.log('\n❌ NO TOOLS FOUND!');
      console.log('This confirms the issue reported by the user.');
    } else {
      console.log(`\n✅ Found ${result.tools.length} tools:`);
      result.tools.slice(0, 10).forEach((tool, idx) => {
        console.log(`  ${idx + 1}. ${tool.name}`);
      });
      if (result.tools.length > 10) {
        console.log(`  ... and ${result.tools.length - 10} more`);
      }
    }

    console.log('\n='.repeat(80));
    console.log(`Total time: ${Date.now() - startTime}ms`);
    console.log('='.repeat(80));

    await transport.close();

    if (result.tools.length !== 27) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

testSiteMonitorServer().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
