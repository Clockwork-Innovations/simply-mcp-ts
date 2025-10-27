import type { IUI, IServer } from 'simply-mcp';

/**
 * Minimal UI fixture for testing parser behavior with small HTML
 * HTML size: ~180 bytes
 */
interface MinimalTestUI extends IUI {
  uri: 'ui://test/minimal';
  name: 'Minimal Test UI';
  description: 'Small HTML fixture for parser testing';
  html: `<!DOCTYPE html>
<html>
<head><title>Minimal Test</title></head>
<body>
  <h1>Minimal UI</h1>
  <p>This is a small test fixture.</p>
</body>
</html>`;
  tools: ['test_tool'];
}

export interface MinimalTestServer extends IServer {
  ui: [MinimalTestUI];
  tools: {
    test_tool: {
      description: 'A simple test tool';
      parameters: {
        type: 'object';
        properties: {
          input: { type: 'string'; description: 'Test input' };
        };
        required: ['input'];
      };
    };
  };
}
