/**
 * Test fixture for named export support
 * This file demonstrates that export class works (without default)
 */

import type { IServer, ITool } from '../../src/index.js';

// Server interface (use different name to avoid TS2395 error)
interface NamedServer extends IServer {
  name: 'named-export-test';
  version: '1.0.0';
  description: 'Test server with named export';
}

// Tool interface
interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo back the message';
  params: {
    message: string;
  };
  result: string;
}

// Implementation class with named export (not default)
// This should work as the framework can find it by name
export class NamedExportServer {
  echo = async (params: EchoTool['params']): Promise<EchoTool['result']> => {
    return params.message;
  };
}
