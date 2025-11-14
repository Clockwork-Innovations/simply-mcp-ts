/**
 * Test bundled vs TS version timing
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const BUNDLED_SERVER = '/mnt/Shared/cs-projects/site-monitor/dist/mcp/site-monitor-server-bundled.js';

console.log('Testing BUNDLED server timing\n');
console.log('================================================================================\n');

async function testBundledServer() {
  const startTime = Date.now();

  const transport = new StdioClientTransport({
    command: 'node',
    args: [BUNDLED_SERVER],
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });

  const client = new Client(
    { name: 'timing-test', version: '1.0.0' },
    { capabilities: {} }
  );

  console.log('Connecting...');
  await client.connect(transport);
  const connectTime = Date.now() - startTime;
  console.log(`✓ Connected in ${connectTime}ms (${(connectTime / 1000).toFixed(1)}s)`);

  console.log('Listing tools...');
  const result = await client.listTools();
  const totalTime = Date.now() - startTime;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Tools discovered: ${result.tools.length}`);
  console.log(`Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);
  console.log('='.repeat(80));

  await transport.close();

  if (result.tools.length !== 27) {
    console.error(`\n❌ Expected 27 tools, got ${result.tools.length}`);
    process.exit(1);
  }
}

testBundledServer().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
