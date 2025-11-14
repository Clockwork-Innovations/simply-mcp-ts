/**
 * Performance test for adapter tool registration
 *
 * RED: Sequential tool registration takes 40+ seconds for 27 tools
 * GREEN: Parallel tool registration takes < 10 seconds for 27 tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

const SITE_MONITOR_SERVER = '/mnt/Shared/cs-projects/site-monitor/src/mcp/site-monitor-server.ts';
const CLI_PATH = path.resolve(__dirname, '../../dist/src/cli/index.js');

describe('Adapter Performance', () => {
  describe('Tool Registration for Large Servers', () => {
    it('should register 27 tools in under 10 seconds (parallel)', async () => {
      const startTime = Date.now();

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
          NODE_ENV: 'production'
        }
      });

      const client = new Client(
        { name: 'perf-test', version: '1.0.0' },
        { capabilities: {} }
      );

      await client.connect(transport);
      const connectTime = Date.now() - startTime;

      const result = await client.listTools();
      await transport.close();

      console.log(`\n[PERF] Connect time: ${connectTime}ms (${(connectTime / 1000).toFixed(1)}s)`);
      console.log(`[PERF] Tools found: ${result.tools.length}`);

      expect(result.tools.length).toBe(27);

      // RED: This will FAIL with sequential registration (~48s)
      // GREEN: This will PASS with parallel registration (~8s)
      expect(connectTime).toBeLessThan(10000); // 10 seconds
    }, 60000); // Allow 60s for test timeout

    it('should measure individual tool registration timing', async () => {
      // This test just measures - doesn't assert
      const startTime = Date.now();

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
          SIMPLY_MCP_DEBUG: 'true' // Enable timing logs
        }
      });

      const client = new Client(
        { name: 'timing-test', version: '1.0.0' },
        { capabilities: {} }
      );

      await client.connect(transport);
      const connectTime = Date.now() - startTime;

      const result = await client.listTools();
      await transport.close();

      console.log(`\n[MEASUREMENT] Total: ${connectTime}ms`);
      console.log(`[MEASUREMENT] Tools: ${result.tools.length}`);
      console.log(`[MEASUREMENT] Avg per tool: ${(connectTime / result.tools.length).toFixed(0)}ms`);
    }, 60000);
  });
});
