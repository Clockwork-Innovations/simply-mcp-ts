#!/usr/bin/env npx tsx
/**
 * Simple MCP Test Client
 * Tests the single-file MCP server
 */

const SERVER_URL = 'http://localhost:3333/mcp';

async function mcpRequest(method: string, params: any = {}, sessionId?: string): Promise<{ response: any, sessionId?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };

  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const response = await fetch(SERVER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  const text = await response.text();

  // Extract session ID from response headers
  const newSessionId = response.headers.get('mcp-session-id');

  // Handle SSE format (event: message\ndata: {...})
  const lines = text.split('\n').filter(line => line.trim());
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonData = JSON.parse(line.substring(6));
      return { response: jsonData, sessionId: newSessionId || sessionId };
    }
  }

  // Handle regular JSON
  try {
    const jsonData = JSON.parse(text);
    return { response: jsonData, sessionId: newSessionId || sessionId };
  } catch {
    console.error('Failed to parse response:', text);
    throw new Error('Invalid response format');
  }
}

async function main() {
  console.log('🧪 Testing Single-File MCP Server\n');

  // 1. Initialize
  console.log('1️⃣  Initializing connection...');
  const init = await mcpRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  });

  const sessionId = init.sessionId!;
  console.log(`✅ Connected! Session ID: ${sessionId}`);
  console.log(`   Server: ${init.response.result?.serverInfo?.name} v${init.response.result?.serverInfo?.version}\n`);

  // 2. List tools
  console.log('2️⃣  Listing available tools...');
  const toolsResult = await mcpRequest('tools/list', {}, sessionId);
  const tools = toolsResult.response.result?.tools || [];
  console.log(`✅ Found ${tools.length} tools:`);
  tools.forEach((tool: any) => {
    console.log(`   - ${tool.name}: ${tool.description}`);
  });
  console.log();

  // 3. Call a tool
  console.log('3️⃣  Calling greet tool...');
  const greetResult = await mcpRequest(
    'tools/call',
    {
      name: 'greet',
      arguments: { name: 'Developer', formal: false },
    },
    sessionId
  );
  console.log(`✅ Result: ${greetResult.response.result?.content?.[0]?.text}\n`);

  // 4. Call add tool
  console.log('4️⃣  Calling add tool...');
  const addResult = await mcpRequest(
    'tools/call',
    {
      name: 'add',
      arguments: { a: 42, b: 8 },
    },
    sessionId
  );
  console.log(`✅ Result: ${addResult.response.result?.content?.[0]?.text}\n`);

  // 5. List prompts
  console.log('5️⃣  Listing prompts...');
  const promptsResult = await mcpRequest('prompts/list', {}, sessionId);
  const prompts = promptsResult.response.result?.prompts || [];
  console.log(`✅ Found ${prompts.length} prompts:`);
  prompts.forEach((prompt: any) => {
    console.log(`   - ${prompt.name}: ${prompt.description}`);
  });
  console.log();

  console.log('🎉 All tests passed!');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
