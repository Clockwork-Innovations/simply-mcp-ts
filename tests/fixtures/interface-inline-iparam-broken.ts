/**
 * Test fixture for inline IParam intersection validation
 * This file should FAIL dry-run with a clear error message
 */

import type { IServer, ITool, IParam } from '../../src/index.js';

interface TestServer extends IServer {
  name: 'test-inline-iparam-broken';
  description: 'Test server with BROKEN inline IParam intersections';
  version: '1.0.0';
}

// THIS IS THE BROKEN PATTERN - should fail dry-run
interface BrokenTool extends ITool {
  name: 'broken_add';
  description: 'This tool will fail because it uses inline IParam intersection';
  params: {
    a: { type: 'number'; description: 'First number' } & IParam;
    b: { type: 'number'; description: 'Second number' } & IParam;
  };
  result: { sum: number };
}

export default class TestServer implements TestServer {
  brokenAdd: BrokenTool = async ({ a, b }) => {
    // This will receive strings, not numbers!
    // 42 + 58 will result in "4258" instead of 100
    return {
      sum: a + b,
    };
  };
}
