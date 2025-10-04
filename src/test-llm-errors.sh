#!/bin/bash
# Test LLM-friendly error messages

echo "========================================="
echo "Testing LLM-Friendly Error Messages"
echo "========================================="
echo ""

# Start server
echo "Starting server..."
npx tsx src/configurableServer.ts src/config-validation-examples.json > /tmp/llm-error-test.log 2>&1 &
SERVER_PID=$!
sleep 3

echo "Server PID: $SERVER_PID"
echo ""

# Initialize session
echo "Initializing session..."
RESPONSE=$(curl -s -i -X POST http://localhost:3005/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }')

SESSION_ID=$(echo "$RESPONSE" | grep -i "^mcp-session-id:" | head -1 | sed 's/^[^:]*: *//' | tr -d '\r\n ')
echo "Session ID: $SESSION_ID"
echo ""

# Test 1: Multiple validation errors
echo "========================================="
echo "Test 1: Multiple Validation Errors"
echo "========================================="
echo "Sending invalid request with multiple errors..."
echo ""

curl -s -X POST http://localhost:3005/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "create-user",
      "arguments": {
        "username": "ab",
        "email": "not-an-email",
        "age": 15,
        "role": "superadmin",
        "tags": []
      }
    }
  }' | grep "^data:" | sed 's/^data: *//' | jq -r '.result.content[0].text'

echo ""
echo ""

# Test 2: Type error
echo "========================================="
echo "Test 2: Type Error"
echo "========================================="
echo "Sending wrong type for temperature..."
echo ""

curl -s -X POST http://localhost:3005/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "set-temperature",
      "arguments": {
        "temperature": "hot",
        "unit": "celsius"
      }
    }
  }' | grep "^data:" | sed 's/^data: *//' | jq -r '.result.content[0].text'

echo ""
echo ""

# Test 3: Range error
echo "========================================="
echo "Test 3: Range Error"
echo "========================================="
echo "Sending out-of-range values..."
echo ""

curl -s -X POST http://localhost:3005/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "calculate-discount",
      "arguments": {
        "price": 99.999,
        "discountPercent": 33
      }
    }
  }' | grep "^data:" | sed 's/^data: *//' | jq -r '.result.content[0].text'

echo ""
echo ""

# Test 4: Missing required fields
echo "========================================="
echo "Test 4: Missing Required Fields"
echo "========================================="
echo "Sending request without required fields..."
echo ""

curl -s -X POST http://localhost:3005/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "schedule-event",
      "arguments": {
        "eventName": "Test Event"
      }
    }
  }' | grep "^data:" | sed 's/^data: *//' | jq -r '.result.content[0].text'

echo ""
echo ""

# Cleanup
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "Done!"
