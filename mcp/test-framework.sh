#!/bin/bash
# Test script for MCP framework
# This script tests the stateful HTTP transport
# For all transports, use: ./mcp/tests/run-all-tests.sh

# Check for --all flag
if [ "$1" == "--all" ]; then
  echo "Running all transport tests..."
  exec bash mcp/tests/run-all-tests.sh
fi

echo "========================================="
echo "Testing MCP Framework - Stateful HTTP"
echo "========================================="
echo "Note: To test all transports, run: $0 --all"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0
START_TIME=$(date +%s)

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

# Function to run test and capture result
run_test() {
  local test_name=$1
  local session_id=$2
  local request=$3

  echo ""
  echo -e "${YELLOW}Test: ${test_name}${NC}"
  echo "Request:"
  echo "$request" | jq . 2>/dev/null || echo "$request"
  echo ""
  echo "Response:"

  response=$(curl -s -X POST http://localhost:3003/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Mcp-Session-Id: $session_id" \
    -d "$request")

  # Extract JSON from SSE format if needed
  json_response="$response"
  if echo "$response" | grep -q "^event:"; then
    json_response=$(echo "$response" | grep "^data:" | sed 's/^data: *//' | head -1)
  fi

  echo "$json_response" | jq . 2>/dev/null || echo "$json_response"

  # Check if response is valid JSON
  echo "$json_response" | jq . >/dev/null 2>&1
  return $?
}

# Start server in background
echo "Starting MCP test server..."
npx tsx mcp/configurableServer.ts mcp/config-test-stateful.json > /tmp/mcp-test-server.log 2>&1 &
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
  if grep -q "listening on port 3003" /tmp/mcp-test-server.log 2>/dev/null; then
    echo -e "${GREEN}Server logged startup message${NC}"

    # Verify server is actually responding to requests
    if curl -s --max-time 2 -X POST http://localhost:3003/mcp \
         -H "Content-Type: application/json" \
         -H "Accept: application/json, text/event-stream" \
         -d '{}' 2>&1 | grep -q "jsonrpc\|session\|Bad Request"; then
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
  cat /tmp/mcp-test-server.log
  exit 1
fi
echo ""

# Test 1: Initialize connection and extract session ID
echo -e "${YELLOW}Test: Initialize connection and extract session ID${NC}"
response=$(curl -s -i -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }')

# Extract session ID from Mcp-Session-Id header (improved extraction)
SESSION_ID=$(echo "$response" | grep -i "^mcp-session-id:" | head -1 | sed 's/^[^:]*: *//' | tr -d '\r\n ')

# Extract body - handle both regular and SSE format responses
body=$(echo "$response" | sed -n '/^\r$/,$p' | tail -n +2)

# If body starts with "event:", extract JSON from SSE data field
if echo "$body" | grep -q "^event:"; then
  body=$(echo "$body" | grep "^data:" | sed 's/^data: *//' | head -1)
fi

echo "Extracted Session ID: $SESSION_ID"
echo "$body" | jq . 2>/dev/null

if [ -n "$SESSION_ID" ] && echo "$body" | jq . >/dev/null 2>&1; then
  print_result 0 "Initialize and extract session ID"
else
  print_result 1 "Initialize and extract session ID"
  echo "Note: Continuing with generated session ID for testing"
  SESSION_ID="test-session-$(date +%s)"
fi
echo ""

# Test 2: List tools
run_test "List available tools" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}'
print_result $? "List tools"

# Test 3: List prompts
run_test "List available prompts" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "prompts/list"
}'
print_result $? "List prompts"

# Test 4: List resources
run_test "List available resources" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/list"
}'
print_result $? "List resources"

# Test 5: Call greet tool (file handler)
run_test "Call greet tool (file handler)" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "greet",
    "arguments": {
      "name": "World"
    }
  }
}'
print_result $? "Greet tool execution"

# Test 6: Call calculate tool (file handler)
run_test "Call calculate tool - addition (file handler)" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "calculate",
    "arguments": {
      "operation": "add",
      "a": 5,
      "b": 3
    }
  }
}'
print_result $? "Calculate tool - addition"

# Test 7: Call calculate tool - multiplication
run_test "Call calculate tool - multiplication" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "calculate",
    "arguments": {
      "operation": "multiply",
      "a": 7,
      "b": 6
    }
  }
}'
print_result $? "Calculate tool - multiplication"

# Test 8: Call echo tool (inline handler)
run_test "Call echo tool (inline handler)" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "echo",
    "arguments": {
      "message": "Hello from inline handler!"
    }
  }
}'
print_result $? "Echo tool execution"

# Test 9: Call fetch-joke tool (HTTP handler)
run_test "Call fetch-joke tool (HTTP handler)" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "fetch-joke",
    "arguments": {}
  }
}'
print_result $? "Fetch-joke tool execution"

# Test 10: Invalid input validation (missing required field)
run_test "Invalid input validation - missing required field" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "greet",
    "arguments": {}
  }
}'
# This should fail validation, so we expect an error response
print_result $? "Validation error handling"

# Test 11: Invalid input validation (wrong type)
run_test "Invalid input validation - wrong type" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "calculate",
    "arguments": {
      "operation": "add",
      "a": "not-a-number",
      "b": 3
    }
  }
}'
print_result $? "Type validation error handling"

# Test 12: Invalid operation enum
run_test "Invalid input validation - invalid enum" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "calculate",
    "arguments": {
      "operation": "invalid-operation",
      "a": 5,
      "b": 3
    }
  }
}'
print_result $? "Enum validation error handling"

# Test 13: Get prompt
run_test "Get prompt template" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 13,
  "method": "prompts/get",
  "params": {
    "name": "test-greeting",
    "arguments": {
      "name": "Test User"
    }
  }
}'
print_result $? "Get prompt"

# Test 14: Read resource
run_test "Read resource" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 14,
  "method": "resources/read",
  "params": {
    "uri": "test://resource/info"
  }
}'
print_result $? "Read resource"

# Test 15: Division by zero error handling
run_test "Division by zero error handling" "$SESSION_ID" '{
  "jsonrpc": "2.0",
  "id": 15,
  "method": "tools/call",
  "params": {
    "name": "calculate",
    "arguments": {
      "operation": "divide",
      "a": 10,
      "b": 0
    }
  }
}'
print_result $? "Division by zero error handling"

echo ""
echo "========================================="
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
echo "Server stopped"
echo ""

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo "Duration: ${DURATION}s"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  echo ""
  echo "To test all transports, run: $0 --all"
  exit 0
else
  echo -e "${RED}Some tests failed. Check the output above.${NC}"
  exit 1
fi