/**
 * Bundle Test Server
 *
 * Simple interface-driven server for testing bundle command in integration tests.
 * This file is used by scripts/integration-test.sh to verify bundling works correctly.
 */

import type { IServer, ITool, IParam } from 'simply-mcp';

// Server configuration
const server: IServer = {
  name: 'bundle-test',
  version: '1.0.0',
  description: 'Test server for bundle integration testing'
};

// Parameter interface
interface InputParam extends IParam {
  type: 'string';
  description: 'Input text to echo';
}

// Tool interface
interface TestTool extends ITool {
  name: 'test';
  description: 'Test tool that echoes input';
  params: { input: InputParam };
  result: { output: string };
}

// Implementation
export default class BundleTestServer {
  test: TestTool = async (params) => {
    return { output: `Processed: ${params.input}` };
  };
}
