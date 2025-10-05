#!/bin/bash
# Quick test for stateless concurrent requests issue

echo "Testing stateless concurrent requests..."

# Create stateless server
cat > /tmp/test-stateless.ts <<'EOF'
import { SimplyMCP } from '../dist/src/SimplyMCP.js';
import { z } from 'zod';

async function main() {
  const server = new SimplyMCP({
    name: 'stateless-test',
    version: '1.0.0',
  });

  server.addTool({
    name: 'echo',
    description: 'Echo a message',
    parameters: z.object({ message: z.string() }),
    execute: async (args) => `Echo: ${args.message}`,
  });

  await server.start({ transport: 'http', port: 3333, stateful: false });
}

main().catch(console.error);
EOF

# Start server
cd /mnt/Shared/cs-projects/simple-mcp
npx tsx /tmp/test-stateless.ts > /tmp/stateless-server.log 2>&1 &
SERVER_PID=$!

echo "Server PID: $SERVER_PID"
sleep 3

# Test concurrent requests with SSE Accept header (this is the problem!)
echo ""
echo "Test 1: Single request with SSE Accept header"
curl -s -X POST http://localhost:3333/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  --max-time 5 \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }' | head -20

echo ""
echo "Test 2: Single request WITHOUT SSE Accept header"
curl -s -X POST http://localhost:3333/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --max-time 5 \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }' | jq .

echo ""
echo "Test 3: Concurrent requests with SSE Accept header (THIS HANGS)"
for i in {1..3}; do
  curl -s -X POST http://localhost:3333/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    --max-time 5 \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": $i,
      \"method\": \"initialize\",
      \"params\": {
        \"protocolVersion\": \"2024-11-05\",
        \"capabilities\": {},
        \"clientInfo\": {\"name\": \"client$i\", \"version\": \"1.0.0\"}
      }
    }" > /tmp/concurrent$i.json &
done

wait

echo "Results:"
for i in {1..3}; do
  echo "Request $i:"
  cat /tmp/concurrent$i.json | head -5
  echo ""
done

# Cleanup
kill $SERVER_PID 2>/dev/null
rm -f /tmp/test-stateless.ts /tmp/concurrent*.json
