/**
 * Bundle Test Server
 *
 * Simple interface-driven server for testing bundle command in integration tests.
 * This file is used by scripts/integration-test.sh to verify bundling works correctly.
 */

import type { IServer, ITool } from 'simply-mcp';

interface BundleTestServer extends IServer {
  name: 'bundle-test';
  version: '1.0.0';
  description: 'Test server for bundle integration testing';
}

interface TestTool extends ITool {
  name: 'test';
  description: 'Test tool that echoes input';
  params: { input: string };
  result: { output: string };
}

export default class implements BundleTestServer {
  test: TestTool = async ({ input }) => {
    return { output: `Processed: ${input}` };
  };
}
