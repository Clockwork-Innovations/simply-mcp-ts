# API Examples

**Version:** 1.0.0
**Last Updated:** 2025-09-29

Complete collection of client examples for integrating with the MCP Configurable Framework.

## Table of Contents

1. [curl Examples](#curl-examples)
2. [JavaScript/TypeScript Client](#javascripttypescript-client)
3. [Python Client](#python-client)
4. [Authentication Examples](#authentication-examples)
5. [Error Handling](#error-handling)
6. [Batch Operations](#batch-operations)
7. [Streaming Responses](#streaming-responses)

---

## curl Examples

### Basic Workflow

```bash
# 1. Initialize connection
RESPONSE=$(curl -s -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "curl-client",
        "version": "1.0.0"
      }
    }
  }')

# Extract session ID from Mcp-Session-Id header
SESSION_ID=$(curl -i -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{...}' | grep -i 'Mcp-Session-Id:' | cut -d' ' -f2 | tr -d '\r')

echo "Session ID: $SESSION_ID"

# 2. List available tools
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }' | jq

# 3. Call a tool
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "greet",
      "arguments": {
        "name": "World"
      }
    }
  }' | jq

# 4. Get a prompt
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "prompts/get",
    "params": {
      "name": "greeting-template",
      "arguments": {
        "name": "Alice"
      }
    }
  }' | jq

# 5. Read a resource
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "resources/read",
    "params": {
      "uri": "https://example.com/api/info"
    }
  }' | jq
```

### With Authentication

```bash
# Initialize with API key
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-key-12345-test-only" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "authenticated-client",
        "version": "1.0.0"
      }
    }
  }' | jq
```

### Helper Script

```bash
#!/bin/bash
# mcp-client.sh - Interactive MCP client

SERVER_URL="http://localhost:3001/mcp"
API_KEY="${MCP_API_KEY}"
SESSION_ID=""

# Initialize connection
init() {
    echo "Initializing connection..."

    RESPONSE=$(curl -i -s -X POST $SERVER_URL \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_KEY" \
        -d '{
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "bash-client",
                    "version": "1.0.0"
                }
            }
        }')

    SESSION_ID=$(echo "$RESPONSE" | grep -i 'Mcp-Session-Id:' | cut -d' ' -f2 | tr -d '\r')

    if [ -z "$SESSION_ID" ]; then
        echo "Failed to get session ID"
        exit 1
    fi

    echo "Session ID: $SESSION_ID"
}

# List tools
list_tools() {
    curl -s -X POST $SERVER_URL \
        -H "Content-Type: application/json" \
        -H "Mcp-Session-Id: $SESSION_ID" \
        -H "Authorization: Bearer $API_KEY" \
        -d '{
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list"
        }' | jq -r '.result.tools[].name'
}

# Call tool
call_tool() {
    local tool_name=$1
    local args=$2

    curl -s -X POST $SERVER_URL \
        -H "Content-Type: application/json" \
        -H "Mcp-Session-Id: $SESSION_ID" \
        -H "Authorization: Bearer $API_KEY" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"id\": 3,
            \"method\": \"tools/call\",
            \"params\": {
                \"name\": \"$tool_name\",
                \"arguments\": $args
            }
        }" | jq
}

# Main
init
echo -e "\nAvailable tools:"
list_tools

echo -e "\nCalling greet tool:"
call_tool "greet" '{"name":"World"}'
```

---

## JavaScript/TypeScript Client

### Basic Client

```typescript
// mcp-client.ts
import axios, { AxiosInstance } from 'axios';

interface MCPClientOptions {
  baseURL: string;
  apiKey?: string;
  clientInfo?: {
    name: string;
    version: string;
  };
}

class MCPClient {
  private client: AxiosInstance;
  private sessionId?: string;
  private requestId: number = 0;

  constructor(options: MCPClientOptions) {
    this.client = axios.create({
      baseURL: options.baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey && {
          'Authorization': `Bearer ${options.apiKey}`
        })
      }
    });
  }

  private getNextId(): number {
    return ++this.requestId;
  }

  private async request(method: string, params?: any): Promise<any> {
    const headers: any = {};

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    const response = await this.client.post('', {
      jsonrpc: '2.0',
      id: this.getNextId(),
      method,
      params
    }, { headers });

    // Extract session ID from response headers
    if (response.headers['mcp-session-id']) {
      this.sessionId = response.headers['mcp-session-id'];
    }

    if (response.data.error) {
      throw new Error(`MCP Error: ${response.data.error.message}`);
    }

    return response.data.result;
  }

  async initialize(): Promise<void> {
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'typescript-client',
        version: '1.0.0'
      }
    });
  }

  async listTools(): Promise<any[]> {
    const result = await this.request('tools/list');
    return result.tools;
  }

  async callTool(name: string, arguments: any): Promise<any> {
    return await this.request('tools/call', {
      name,
      arguments
    });
  }

  async listPrompts(): Promise<any[]> {
    const result = await this.request('prompts/list');
    return result.prompts;
  }

  async getPrompt(name: string, arguments?: any): Promise<any> {
    return await this.request('prompts/get', {
      name,
      arguments
    });
  }

  async listResources(): Promise<any[]> {
    const result = await this.request('resources/list');
    return result.resources;
  }

  async readResource(uri: string): Promise<any> {
    return await this.request('resources/read', { uri });
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }
}

export default MCPClient;
```

### Usage Example

```typescript
// example.ts
import MCPClient from './mcp-client';

async function main() {
  // Create client
  const client = new MCPClient({
    baseURL: 'http://localhost:3001/mcp',
    apiKey: process.env.MCP_API_KEY
  });

  try {
    // Initialize connection
    await client.initialize();
    console.log('Connected with session:', client.getSessionId());

    // List tools
    const tools = await client.listTools();
    console.log('Available tools:', tools.map(t => t.name));

    // Call a tool
    const result = await client.callTool('greet', {
      name: 'TypeScript Client'
    });
    console.log('Tool result:', result);

    // Get a prompt
    const prompt = await client.getPrompt('greeting-template', {
      name: 'Alice'
    });
    console.log('Prompt:', prompt);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

### React Integration

```typescript
// useMCP.ts - React Hook
import { useState, useEffect } from 'react';
import MCPClient from './mcp-client';

export function useMCP(baseURL: string, apiKey?: string) {
  const [client, setClient] = useState<MCPClient | null>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initClient = async () => {
      try {
        const mcpClient = new MCPClient({ baseURL, apiKey });
        await mcpClient.initialize();

        const toolsList = await mcpClient.listTools();

        setClient(mcpClient);
        setTools(toolsList);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    initClient();
  }, [baseURL, apiKey]);

  const callTool = async (name: string, args: any) => {
    if (!client) throw new Error('Client not initialized');
    return await client.callTool(name, args);
  };

  return { client, tools, loading, error, callTool };
}

// Component usage
function ToolExecutor() {
  const { tools, loading, error, callTool } = useMCP(
    'http://localhost:3001/mcp',
    process.env.REACT_APP_MCP_API_KEY
  );

  const [result, setResult] = useState(null);

  const handleExecute = async () => {
    try {
      const res = await callTool('greet', { name: 'React User' });
      setResult(res);
    } catch (err) {
      console.error('Tool execution failed:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Available Tools</h2>
      <ul>
        {tools.map(tool => (
          <li key={tool.name}>{tool.name}</li>
        ))}
      </ul>
      <button onClick={handleExecute}>Execute Tool</button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

---

## Python Client

### Basic Client

```python
# mcp_client.py
import requests
from typing import Dict, Any, Optional, List

class MCPClient:
    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        client_info: Optional[Dict[str, str]] = None
    ):
        self.base_url = base_url
        self.session_id: Optional[str] = None
        self.request_id = 0

        self.headers = {
            'Content-Type': 'application/json'
        }

        if api_key:
            self.headers['Authorization'] = f'Bearer {api_key}'

        self.client_info = client_info or {
            'name': 'python-client',
            'version': '1.0.0'
        }

    def _get_next_id(self) -> int:
        self.request_id += 1
        return self.request_id

    def _request(self, method: str, params: Optional[Dict] = None) -> Any:
        headers = self.headers.copy()

        if self.session_id:
            headers['Mcp-Session-Id'] = self.session_id

        payload = {
            'jsonrpc': '2.0',
            'id': self._get_next_id(),
            'method': method,
            'params': params or {}
        }

        response = requests.post(
            self.base_url,
            json=payload,
            headers=headers
        )

        # Extract session ID from headers
        if 'Mcp-Session-Id' in response.headers:
            self.session_id = response.headers['Mcp-Session-Id']

        data = response.json()

        if 'error' in data:
            raise Exception(f"MCP Error: {data['error']['message']}")

        return data.get('result')

    def initialize(self) -> Dict:
        return self._request('initialize', {
            'protocolVersion': '2024-11-05',
            'capabilities': {},
            'clientInfo': self.client_info
        })

    def list_tools(self) -> List[Dict]:
        result = self._request('tools/list')
        return result['tools']

    def call_tool(self, name: str, arguments: Dict) -> Any:
        return self._request('tools/call', {
            'name': name,
            'arguments': arguments
        })

    def list_prompts(self) -> List[Dict]:
        result = self._request('prompts/list')
        return result['prompts']

    def get_prompt(self, name: str, arguments: Optional[Dict] = None) -> Any:
        return self._request('prompts/get', {
            'name': name,
            'arguments': arguments or {}
        })

    def list_resources(self) -> List[Dict]:
        result = self._request('resources/list')
        return result['resources']

    def read_resource(self, uri: str) -> Any:
        return self._request('resources/read', {'uri': uri})
```

### Usage Example

```python
# example.py
import os
from mcp_client import MCPClient

def main():
    # Create client
    client = MCPClient(
        base_url='http://localhost:3001/mcp',
        api_key=os.environ.get('MCP_API_KEY')
    )

    try:
        # Initialize
        client.initialize()
        print(f'Connected with session: {client.session_id}')

        # List tools
        tools = client.list_tools()
        print(f'Available tools: {[t["name"] for t in tools]}')

        # Call tool
        result = client.call_tool('greet', {'name': 'Python Client'})
        print(f'Tool result: {result}')

        # Get prompt
        prompt = client.get_prompt('greeting-template', {'name': 'Bob'})
        print(f'Prompt: {prompt}')

    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    main()
```

### Async Client

```python
# async_mcp_client.py
import aiohttp
from typing import Dict, Any, Optional, List

class AsyncMCPClient:
    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None
    ):
        self.base_url = base_url
        self.session_id: Optional[str] = None
        self.request_id = 0

        self.headers = {
            'Content-Type': 'application/json'
        }

        if api_key:
            self.headers['Authorization'] = f'Bearer {api_key}'

    async def _request(
        self,
        session: aiohttp.ClientSession,
        method: str,
        params: Optional[Dict] = None
    ) -> Any:
        self.request_id += 1

        headers = self.headers.copy()
        if self.session_id:
            headers['Mcp-Session-Id'] = self.session_id

        payload = {
            'jsonrpc': '2.0',
            'id': self.request_id,
            'method': method,
            'params': params or {}
        }

        async with session.post(
            self.base_url,
            json=payload,
            headers=headers
        ) as response:
            # Extract session ID
            if 'Mcp-Session-Id' in response.headers:
                self.session_id = response.headers['Mcp-Session-Id']

            data = await response.json()

            if 'error' in data:
                raise Exception(f"MCP Error: {data['error']['message']}")

            return data.get('result')

    async def initialize(self) -> Dict:
        async with aiohttp.ClientSession() as session:
            return await self._request(session, 'initialize', {
                'protocolVersion': '2024-11-05',
                'capabilities': {},
                'clientInfo': {
                    'name': 'async-python-client',
                    'version': '1.0.0'
                }
            })

    async def call_tool(
        self,
        name: str,
        arguments: Dict
    ) -> Any:
        async with aiohttp.ClientSession() as session:
            return await self._request(session, 'tools/call', {
                'name': name,
                'arguments': arguments
            })

# Usage
import asyncio

async def main():
    client = AsyncMCPClient(
        'http://localhost:3001/mcp',
        api_key='your-api-key'
    )

    await client.initialize()

    # Concurrent tool calls
    results = await asyncio.gather(
        client.call_tool('tool1', {'arg': 'value1'}),
        client.call_tool('tool2', {'arg': 'value2'}),
        client.call_tool('tool3', {'arg': 'value3'})
    )

    print(results)

asyncio.run(main())
```

---

## Authentication Examples

### API Key in Header

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Authorization: Bearer dev-key-12345-test-only" \
  -H "Content-Type: application/json" \
  -d '...'
```

```typescript
// TypeScript
const client = axios.create({
  baseURL: 'http://localhost:3001/mcp',
  headers: {
    'Authorization': `Bearer ${process.env.MCP_API_KEY}`
  }
});
```

```python
# Python
headers = {
    'Authorization': f'Bearer {os.environ["MCP_API_KEY"]}'
}
```

### Handling 401 Unauthorized

```typescript
// TypeScript
try {
  await client.callTool('tool-name', args);
} catch (error) {
  if (error.response?.status === 401) {
    console.error('Invalid API key');
    // Refresh key or re-authenticate
  }
}
```

```python
# Python
try:
    client.call_tool('tool-name', args)
except requests.HTTPError as e:
    if e.response.status_code == 401:
        print('Invalid API key')
        # Handle authentication error
```

---

## Error Handling

### Standard Error Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Validation Error: name is required",
    "data": {
      "field": "name",
      "type": "required"
    }
  }
}
```

### TypeScript Error Handling

```typescript
interface MCPError {
  code: number;
  message: string;
  data?: any;
}

async function callToolSafely(
  client: MCPClient,
  name: string,
  args: any
): Promise<any> {
  try {
    return await client.callTool(name, args);
  } catch (error) {
    if (error.response?.data?.error) {
      const mcpError: MCPError = error.response.data.error;

      switch (mcpError.code) {
        case -32000:
          console.error('Validation error:', mcpError.message);
          break;
        case -32601:
          console.error('Unknown tool:', name);
          break;
        case -32603:
          console.error('Internal error:', mcpError.message);
          break;
        default:
          console.error('MCP error:', mcpError.message);
      }

      throw new Error(mcpError.message);
    }

    throw error;
  }
}
```

### Python Error Handling

```python
class MCPException(Exception):
    def __init__(self, code: int, message: str, data: Any = None):
        self.code = code
        self.message = message
        self.data = data
        super().__init__(message)

def call_tool_safely(
    client: MCPClient,
    name: str,
    args: Dict
) -> Any:
    try:
        return client.call_tool(name, args)
    except Exception as e:
        error_msg = str(e)

        if 'Validation Error' in error_msg:
            print(f'Input validation failed: {error_msg}')
        elif 'Unknown tool' in error_msg:
            print(f'Tool not found: {name}')
        elif 'Rate limit' in error_msg:
            print('Rate limit exceeded, retrying after delay...')
            time.sleep(60)
            return call_tool_safely(client, name, args)
        else:
            print(f'Unexpected error: {error_msg}')

        raise
```

---

## Batch Operations

### Sequential Execution

```typescript
// TypeScript
async function executeBatch(
  client: MCPClient,
  operations: Array<{tool: string; args: any}>
) {
  const results = [];

  for (const op of operations) {
    const result = await client.callTool(op.tool, op.args);
    results.push(result);
  }

  return results;
}

// Usage
const operations = [
  { tool: 'greet', args: { name: 'Alice' } },
  { tool: 'calculate', args: { operation: 'add', a: 5, b: 3 } },
  { tool: 'fetch-joke', args: {} }
];

const results = await executeBatch(client, operations);
```

### Parallel Execution

```typescript
// TypeScript
async function executeParallel(
  client: MCPClient,
  operations: Array<{tool: string; args: any}>
) {
  const promises = operations.map(op =>
    client.callTool(op.tool, op.args)
  );

  return await Promise.all(promises);
}
```

```python
# Python (async)
async def execute_parallel(
    client: AsyncMCPClient,
    operations: List[Dict]
):
    tasks = [
        client.call_tool(op['tool'], op['args'])
        for op in operations
    ]

    return await asyncio.gather(*tasks)
```

---

## Streaming Responses

### SSE Connection

```typescript
// TypeScript - EventSource
const eventSource = new EventSource(
  'http://localhost:3001/mcp',
  {
    headers: {
      'Mcp-Session-Id': sessionId,
      'Authorization': `Bearer ${apiKey}`
    }
  }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};

// Close connection
eventSource.close();
```

### Long-Polling Alternative

```typescript
// TypeScript
async function longPoll(
  client: MCPClient,
  tool: string,
  args: any,
  onUpdate: (data: any) => void
) {
  let polling = true;

  // Start operation
  const operationId = await client.callTool(tool, {
    ...args,
    async: true
  });

  // Poll for updates
  while (polling) {
    const status = await client.callTool('get-status', {
      operationId
    });

    if (status.complete) {
      polling = false;
      onUpdate(status.result);
    } else {
      onUpdate(status.progress);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

---

## Summary

### Quick Reference

| Language | Client Library | Authentication | Async Support |
|----------|---------------|----------------|---------------|
| bash/curl | Native | Header | No |
| TypeScript | Axios | Header | Yes |
| Python | Requests | Header | Optional |
| JavaScript | Fetch/Axios | Header | Yes |

### Best Practices

1. **Always handle errors**: Network issues, validation errors, rate limits
2. **Use environment variables** for API keys
3. **Implement retry logic** for transient failures
4. **Log requests** for debugging
5. **Cache session IDs** to avoid re-initialization
6. **Close connections** properly
7. **Monitor rate limits** to avoid 429 errors

---

**Next Steps**:
- Review [Documentation Index](../INDEX.md) for framework overview
- Check [Handler Development Guide](./HANDLER-DEVELOPMENT.md) for handler development
- See [Deployment Guide](./DEPLOYMENT.md) for production deployment

**Support**: GitHub Issues or community forums