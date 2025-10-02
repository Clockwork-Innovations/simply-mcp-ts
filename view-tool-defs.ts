/**
 * Quick script to view tool definitions from a running MCP server
 */

const SERVER_URL = 'http://localhost:3400/mcp';

async function viewToolDefinitions() {
  console.log('🔍 Fetching tool definitions from MCP server...\n');

  // Initialize
  const initResponse = await fetch(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'tool-viewer', version: '1.0.0' },
      },
    }),
  });

  const initText = await initResponse.text();
  const sessionId = initResponse.headers.get('mcp-session-id');

  // List tools
  const toolsResponse = await fetch(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Mcp-Session-Id': sessionId!,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    }),
  });

  const toolsText = await toolsResponse.text();
  const lines = toolsText.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.substring(6));
      console.log(JSON.stringify(data.result.tools, null, 2));
      return;
    }
  }
}

viewToolDefinitions().catch(console.error);
