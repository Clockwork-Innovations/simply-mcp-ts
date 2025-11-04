/**
 * Test fixture for correct IParam usage
 * This file should PASS dry-run validation
 */

import type { IServer, ITool, IParam } from '../../src/index.js';

interface TestServer extends IServer {
  name: 'test-inline-iparam-correct';
  description: 'Test server with CORRECT IParam usage';
  version: '1.0.0';
}

// THIS IS THE CORRECT PATTERN - uses separate interfaces
interface AParam extends IParam {
  type: 'number';
  description: 'First number';
}

interface BParam extends IParam {
  type: 'number';
  description: 'Second number';
}

interface CorrectTool extends ITool {
  name: 'correct_add';
  description: 'This tool will pass because it uses separate IParam interfaces';
  params: {
    a: AParam;
    b: BParam;
  };
  result: { sum: number };
}

export default class TestServer implements TestServer {
  correctAdd: CorrectTool = async ({ a, b }) => {
    // This will receive proper numbers with type coercion
    // 42 + 58 will correctly result in 100
    return {
      sum: a + b,
    };
  };
}
