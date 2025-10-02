#!/bin/bash
# Test script for MCP SSE Transport (Legacy)

echo "========================================="
echo "Testing MCP SSE Transport"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((TESTS_FAILED++))
  fi
}

# Start server in background
echo "Starting MCP SSE server..."
npx tsx mcp/servers/sseServer.ts mcp/config-test-sse.json > /tmp/mcp-sse-server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
echo ""

# Wait for server to start
echo "Waiting for server to start..."
MAX_WAIT=15
WAIT_COUNT=0

# Give server a moment to initialize and for log buffering
sleep 2

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  # Check if server has logged the startup message
  if grep -q "listening on port 3004" /tmp/mcp-sse-server.log 2>/dev/null; then
    echo -e "${GREEN}Server logged startup message${NC}"

    # Verify server is actually responding to HTTP requests
    # Try GET endpoint which should return SSE stream
    if curl -s --max-time 2 -X GET http://localhost:3004/mcp \
         -H "Accept: text/event-stream" 2>&1 | grep -q "event:\|data:\|Content-Type"; then
      echo -e "${GREEN}Server is responding to requests${NC}"
      break
    else
      echo "Server logged startup but not responding yet, waiting..."
    fi
  fi

  sleep 1
  ((WAIT_COUNT++))
done

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
  echo -e "${RED}ERROR: Server failed to start within ${MAX_WAIT} seconds${NC}"
  echo "Server log:"
  cat /tmp/mcp-sse-server.log
  # Try to find and kill any server processes
  pkill -f "tsx mcp/servers/sseServer.ts mcp/config-test-sse.json" 2>/dev/null || true
  exit 1
fi
echo ""

# Test 1: Establish SSE connection and extract session ID
echo -e "${YELLOW}Test: Establish SSE connection${NC}"
echo "Opening SSE stream..."

# Clean up any previous log file
rm -f /tmp/sse-stream.log

# Establish SSE connection with timeout to capture initial endpoint event
sse_response=$(timeout 5s curl -s -N -X GET http://localhost:3004/mcp \
  -H "Accept: text/event-stream" 2>&1)

# Parse SSE events: extract sessionId from "event: endpoint" followed by "data: /messages?sessionId=..."
# The data line contains the URL with sessionId as a query parameter, not JSON
SESSION_ID=$(echo "$sse_response" | grep -A1 "event: endpoint" | grep "data:" | head -1 | sed 's/^data: \/messages?sessionId=//' | tr -d '\r\n ')

if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "null" ]; then
  echo "Session ID extracted: $SESSION_ID"
  print_result 0 "SSE connection established and session ID extracted"

  # Now start persistent SSE connection in background for monitoring responses
  (timeout 30s curl -s -N -X GET http://localhost:3004/mcp \
    -H "Accept: text/event-stream" 2>/dev/null > /tmp/sse-stream.log) &
  SSE_PID=$!
  sleep 1
else
  echo "Failed to extract session ID"
  echo "SSE Response sample:"
  echo "$sse_response" | head -10
  print_result 1 "SSE connection established and session ID extracted"
  SESSION_ID="test-fallback-session"

  # Still start a background connection
  (timeout 30s curl -s -N -X GET http://localhost:3004/mcp \
    -H "Accept: text/event-stream" 2>/dev/null > /tmp/sse-stream.log) &
  SSE_PID=$!
  sleep 1
fi
echo ""

# Test 2: Send initialize message
echo -e "${YELLOW}Test: Send initialize message${NC}"
response=$(curl -s -X POST "http://localhost:3004/messages?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "sse-test-client",
        "version": "1.0.0"
      }
    }
  }')

echo "$response" | jq . 2>/dev/null || echo "$response"

# Initialize should succeed
if echo "$response" | grep -q "200\|204" 2>/dev/null || [ -z "$response" ]; then
  print_result 0 "Initialize message sent"
else
  # Check if response is JSON with result
  echo "$response" | jq . >/dev/null 2>&1
  print_result $? "Initialize message sent"
fi
echo ""

# Give SSE stream time to receive response
sleep 1

# Test 3: List tools via SSE
echo -e "${YELLOW}Test: List tools via SSE${NC}"
response=$(curl -s -X POST "http://localhost:3004/messages?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }')

echo "$response" | jq . 2>/dev/null || echo "$response"

if [ -z "$response" ] || echo "$response" | grep -q "200\|204"; then
  print_result 0 "List tools request sent"
else
  echo "$response" | jq . >/dev/null 2>&1
  print_result $? "List tools request sent"
fi

# Check SSE stream for response
sleep 1
if grep -q "tools/list" /tmp/sse-stream.log 2>/dev/null; then
  echo "Response received in SSE stream"
fi
echo ""

# Test 4: Call greet tool
echo -e "${YELLOW}Test: Call greet tool via SSE${NC}"
response=$(curl -s -X POST "http://localhost:3004/messages?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "greet",
      "arguments": {
        "name": "SSE User"
      }
    }
  }')

echo "$response" | jq . 2>/dev/null || echo "$response"

if [ -z "$response" ] || echo "$response" | grep -q "200\|204"; then
  print_result 0 "Greet tool call sent"
else
  echo "$response" | jq . >/dev/null 2>&1
  print_result $? "Greet tool call sent"
fi
echo ""

# Test 5: Calculate tool
echo -e "${YELLOW}Test: Call calculate tool via SSE${NC}"
response=$(curl -s -X POST "http://localhost:3004/messages?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "calculate",
      "arguments": {
        "operation": "multiply",
        "a": 6,
        "b": 7
      }
    }
  }')

echo "$response" | jq . 2>/dev/null || echo "$response"

if [ -z "$response" ] || echo "$response" | grep -q "200\|204"; then
  print_result 0 "Calculate tool call sent"
else
  echo "$response" | jq . >/dev/null 2>&1
  print_result $? "Calculate tool call sent"
fi
echo ""

# Test 6: Echo tool (inline handler)
echo -e "${YELLOW}Test: Call echo tool (inline) via SSE${NC}"
response=$(curl -s -X POST "http://localhost:3004/messages?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "echo",
      "arguments": {
        "message": "SSE Echo Test"
      }
    }
  }')

echo "$response" | jq . 2>/dev/null || echo "$response"

if [ -z "$response" ] || echo "$response" | grep -q "200\|204"; then
  print_result 0 "Echo tool call sent"
else
  echo "$response" | jq . >/dev/null 2>&1
  print_result $? "Echo tool call sent"
fi
echo ""

# Test 7: Invalid session ID
echo -e "${YELLOW}Test: Request with invalid session ID${NC}"
response=$(curl -s -X POST "http://localhost:3004/messages?sessionId=invalid-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/list"
  }')

echo "$response" | jq . 2>/dev/null || echo "$response"

# Should get error response
echo "$response" | jq -e '.error' >/dev/null 2>&1
print_result $? "Invalid session ID rejected"
echo ""

# Test 8: Missing session ID
echo -e "${YELLOW}Test: Request without session ID${NC}"
response=$(curl -s -X POST "http://localhost:3004/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/list"
  }')

echo "$response" | jq . 2>/dev/null || echo "$response"

# Should get error response
echo "$response" | jq -e '.error' >/dev/null 2>&1
print_result $? "Missing session ID rejected"
echo ""

# Test 9: Check SSE stream is still alive
echo -e "${YELLOW}Test: SSE stream persistence${NC}"
if kill -0 $SSE_PID 2>/dev/null; then
  print_result 0 "SSE stream still connected"
else
  print_result 1 "SSE stream disconnected unexpectedly"
fi
echo ""

# Test 10: Get prompt via SSE
echo -e "${YELLOW}Test: Get prompt via SSE${NC}"
response=$(curl -s -X POST "http://localhost:3004/messages?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "prompts/get",
    "params": {
      "name": "test-greeting",
      "arguments": {
        "name": "SSE Prompt User"
      }
    }
  }')

echo "$response" | jq . 2>/dev/null || echo "$response"

if [ -z "$response" ] || echo "$response" | grep -q "200\|204"; then
  print_result 0 "Prompt request sent"
else
  echo "$response" | jq . >/dev/null 2>&1
  print_result $? "Prompt request sent"
fi
echo ""

# Test 11: Read resource via SSE
echo -e "${YELLOW}Test: Read resource via SSE${NC}"
response=$(curl -s -X POST "http://localhost:3004/messages?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "resources/read",
    "params": {
      "uri": "test://resource/info"
    }
  }')

echo "$response" | jq . 2>/dev/null || echo "$response"

if [ -z "$response" ] || echo "$response" | grep -q "200\|204"; then
  print_result 0 "Resource read request sent"
else
  echo "$response" | jq . >/dev/null 2>&1
  print_result $? "Resource read request sent"
fi
echo ""

# Test 12: Check SSE stream output
echo -e "${YELLOW}Test: Verify SSE stream received events${NC}"
if [ -f /tmp/sse-stream.log ] && [ -s /tmp/sse-stream.log ]; then
  echo "SSE stream log size: $(wc -l < /tmp/sse-stream.log) lines"
  echo "Sample events:"
  head -20 /tmp/sse-stream.log
  print_result 0 "SSE stream received events"
else
  print_result 1 "SSE stream received events"
fi
echo ""

# Cleanup SSE connection
echo "Closing SSE connection..."
kill $SSE_PID 2>/dev/null
wait $SSE_PID 2>/dev/null

echo ""
echo "========================================="
echo "Stopping server..."
pkill -f "tsx mcp/servers/sseServer.ts mcp/config-test-sse.json" 2>/dev/null || true
sleep 1
echo "Server stopped"
echo ""

echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Check the output above.${NC}"
  exit 1
fi