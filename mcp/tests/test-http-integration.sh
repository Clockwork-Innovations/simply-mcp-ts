#!/bin/bash
# Comprehensive Integration Tests for MCP HTTP Transport
# Tests all HTTP endpoints, session management, and error handling

echo "========================================="
echo "MCP HTTP Transport Integration Tests"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Function to print section header
print_section() {
  echo ""
  echo -e "${BLUE}=========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}=========================================${NC}"
}

# Function to extract session ID from response headers
extract_session_id() {
  local response=$1
  echo "$response" | grep -i "^mcp-session-id:" | head -1 | sed 's/^[^:]*: *//' | tr -d '\r\n '
}

# Function to extract JSON from SSE or plain response
extract_json() {
  local response=$1

  # Check if response includes HTTP headers (contains "HTTP/")
  if echo "$response" | grep -q "^HTTP/"; then
    # Extract body (everything after the blank line with \r)
    local body=$(echo "$response" | sed -n '/^\r$/,$p' | tail -n +2)
  else
    # No HTTP headers, use response as-is
    local body="$response"
  fi

  # Extract JSON from SSE format - handle both "data: {...}" and "event: message\ndata: {...}"
  local json=$(echo "$body" | grep '^data:' | sed 's/^data: *//')

  # If no SSE format found, try as plain JSON
  if [ -z "$json" ]; then
    json="$body"
  fi

  echo "$json"
}

# Function to make MCP request with session
mcp_request() {
  local session_id=$1
  local request_json=$2
  local timeout=${3:-5}

  curl -s --max-time "$timeout" -X POST http://localhost:3003/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Mcp-Session-Id: $session_id" \
    -d "$request_json" 2>&1
}

# Start server in background
print_section "Starting MCP HTTP Server"
echo "Starting server on port 3003..."
npx tsx mcp/configurableServer.ts mcp/config-test-stateful.json > /tmp/mcp-http-integration.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
echo ""

# Wait for server to start
echo "Waiting for server to start..."
MAX_WAIT=15
WAIT_COUNT=0
sleep 2

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  if grep -q "listening on port 3003" /tmp/mcp-http-integration.log 2>/dev/null; then
    echo -e "${GREEN}Server logged startup message${NC}"

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
  cat /tmp/mcp-http-integration.log
  pkill -f "tsx mcp/configurableServer.ts mcp/config-test-stateful.json" 2>/dev/null || true
  exit 1
fi
echo ""

# =========================================
# Test Section 1: Session Initialization
# =========================================
print_section "Test Section 1: Session Initialization"

echo ""
echo -e "${YELLOW}Test 1.1: Initialize session with POST /mcp${NC}"
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
        "name": "integration-test-client",
        "version": "1.0.0"
      }
    }
  }'  2>&1)

SESSION_ID=$(extract_session_id "$response")
json=$(extract_json "$response")

echo "Session ID: $SESSION_ID"
echo "$json" | jq . 2>/dev/null

if [ -n "$SESSION_ID" ] && echo "$json" | jq -e '.result.serverInfo.name == "mcp-test-server"' >/dev/null 2>&1; then
  print_result 0 "Initialize session and receive session ID"
else
  print_result 1 "Initialize session and receive session ID"
  echo "ERROR: Failed to get session ID or server info"
  SESSION_ID="fallback-session-$(date +%s)"
fi

echo ""
echo -e "${YELLOW}Test 1.2: Verify mcp-session-id header is present${NC}"
if echo "$response" | grep -qi "mcp-session-id:"; then
  print_result 0 "Session ID header present in response"
else
  print_result 1 "Session ID header present in response"
fi

echo ""
echo -e "${YELLOW}Test 1.3: Verify server capabilities in initialization response${NC}"
if echo "$json" | jq -e '.result.capabilities.tools' >/dev/null 2>&1 && \
   echo "$json" | jq -e '.result.capabilities.prompts' >/dev/null 2>&1 && \
   echo "$json" | jq -e '.result.capabilities.resources' >/dev/null 2>&1; then
  print_result 0 "Server capabilities present"
else
  print_result 1 "Server capabilities present"
fi

# =========================================
# Test Section 2: Tools Operations
# =========================================
print_section "Test Section 2: Tools Operations"

echo ""
echo -e "${YELLOW}Test 2.1: List available tools${NC}"
response=$(curl -s -i -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.result.tools | length > 0' >/dev/null 2>&1; then
  print_result 0 "List tools returns available tools"
else
  print_result 1 "List tools returns available tools"
fi

echo ""
echo -e "${YELLOW}Test 2.2: Call greet tool${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "greet",
      "arguments": {
        "name": "HTTPTester"
      }
    }
  }' 2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.result.content[0].text | contains("HTTPTester")' >/dev/null 2>&1; then
  print_result 0 "Call greet tool successfully"
else
  print_result 1 "Call greet tool successfully"
fi

echo ""
echo -e "${YELLOW}Test 2.3: Call calculate tool - addition${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "calculate",
      "arguments": {
        "operation": "add",
        "a": 15,
        "b": 27
      }
    }
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.result.content[0].text | contains("42")' >/dev/null 2>&1; then
  print_result 0 "Calculate tool addition works"
else
  print_result 1 "Calculate tool addition works"
fi

echo ""
echo -e "${YELLOW}Test 2.4: Call calculate tool - multiplication${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "calculate",
      "arguments": {
        "operation": "multiply",
        "a": 6,
        "b": 7
      }
    }
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.result.content[0].text | contains("42")' >/dev/null 2>&1; then
  print_result 0 "Calculate tool multiplication works"
else
  print_result 1 "Calculate tool multiplication works"
fi

echo ""
echo -e "${YELLOW}Test 2.5: Call echo tool (inline handler)${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "echo",
      "arguments": {
        "message": "Integration test message"
      }
    }
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.result.content[0].text | contains("Integration test message")' >/dev/null 2>&1; then
  print_result 0 "Echo tool (inline handler) works"
else
  print_result 1 "Echo tool (inline handler) works"
fi

# =========================================
# Test Section 3: Prompts Operations
# =========================================
print_section "Test Section 3: Prompts Operations"

echo ""
echo -e "${YELLOW}Test 3.1: List available prompts${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "prompts/list",
    "params": {}
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.result.prompts | length > 0' >/dev/null 2>&1; then
  print_result 0 "List prompts returns available prompts"
else
  print_result 1 "List prompts returns available prompts"
fi

echo ""
echo -e "${YELLOW}Test 3.2: Get prompt with arguments${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "prompts/get",
    "params": {
      "name": "test-greeting",
      "arguments": {
        "name": "PromptUser"
      }
    }
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.result.messages[0].content.text | contains("PromptUser")' >/dev/null 2>&1; then
  print_result 0 "Get prompt with arguments works"
else
  print_result 1 "Get prompt with arguments works"
fi

# =========================================
# Test Section 4: Resources Operations
# =========================================
print_section "Test Section 4: Resources Operations"

echo ""
echo -e "${YELLOW}Test 4.1: List available resources${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "resources/list",
    "params": {}
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.result.resources | length > 0' >/dev/null 2>&1; then
  print_result 0 "List resources returns available resources"
else
  print_result 1 "List resources returns available resources"
fi

echo ""
echo -e "${YELLOW}Test 4.2: Read specific resource${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 10,
    "method": "resources/read",
    "params": {
      "uri": "test://resource/info"
    }
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.result.contents[0].text | contains("test resource")' >/dev/null 2>&1; then
  print_result 0 "Read resource returns content"
else
  print_result 1 "Read resource returns content"
fi

# =========================================
# Test Section 5: Error Handling
# =========================================
print_section "Test Section 5: Error Handling"

echo ""
echo -e "${YELLOW}Test 5.1: Request without session ID${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 11,
    "method": "tools/list",
    "params": {}
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.error.message | contains("session")' >/dev/null 2>&1; then
  print_result 0 "Request without session ID returns error"
else
  print_result 1 "Request without session ID returns error"
fi

echo ""
echo -e "${YELLOW}Test 5.2: Request with invalid session ID${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: invalid-session-12345-nonexistent" \
  -d '{
    "jsonrpc": "2.0",
    "id": 12,
    "method": "tools/list",
    "params": {}
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.error' >/dev/null 2>&1; then
  print_result 0 "Invalid session ID returns error"
else
  print_result 1 "Invalid session ID returns error"
fi

echo ""
echo -e "${YELLOW}Test 5.3: Tool call with missing required parameter${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 13,
    "method": "tools/call",
    "params": {
      "name": "greet",
      "arguments": {}
    }
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.error' >/dev/null 2>&1 || \
   echo "$json" | jq -e '.result.isError == true' >/dev/null 2>&1; then
  print_result 0 "Missing required parameter returns error"
else
  print_result 1 "Missing required parameter returns error"
fi

echo ""
echo -e "${YELLOW}Test 5.4: Call non-existent tool${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 14,
    "method": "tools/call",
    "params": {
      "name": "nonexistent-tool",
      "arguments": {}
    }
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.error' >/dev/null 2>&1; then
  print_result 0 "Non-existent tool returns error"
else
  print_result 1 "Non-existent tool returns error"
fi

echo ""
echo -e "${YELLOW}Test 5.5: Division by zero error handling${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 15,
    "method": "tools/call",
    "params": {
      "name": "calculate",
      "arguments": {
        "operation": "divide",
        "a": 100,
        "b": 0
      }
    }
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.error' >/dev/null 2>&1 || \
   echo "$json" | jq -e '.result.errors' >/dev/null 2>&1; then
  print_result 0 "Division by zero handled properly"
else
  print_result 1 "Division by zero handled properly"
fi

echo ""
echo -e "${YELLOW}Test 5.6: Get non-existent prompt${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 16,
    "method": "prompts/get",
    "params": {
      "name": "nonexistent-prompt",
      "arguments": {}
    }
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.error' >/dev/null 2>&1; then
  print_result 0 "Non-existent prompt returns error"
else
  print_result 1 "Non-existent prompt returns error"
fi

echo ""
echo -e "${YELLOW}Test 5.7: Read non-existent resource${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 17,
    "method": "resources/read",
    "params": {
      "uri": "test://nonexistent/resource"
    }
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.error' >/dev/null 2>&1; then
  print_result 0 "Non-existent resource returns error"
else
  print_result 1 "Non-existent resource returns error"
fi

# =========================================
# Test Section 6: Session Management
# =========================================
print_section "Test Section 6: Session Management"

echo ""
echo -e "${YELLOW}Test 6.1: Create second concurrent session${NC}"
response2=$(curl -s -i -X POST http://localhost:3003/mcp \
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
        "name": "test-client-2",
        "version": "1.0.0"
      }
    }
  }'  2>&1)

SESSION_ID_2=$(extract_session_id "$response2")
echo "Second Session ID: $SESSION_ID_2"

if [ -n "$SESSION_ID_2" ] && [ "$SESSION_ID" != "$SESSION_ID_2" ]; then
  print_result 0 "Create second concurrent session with unique ID"
else
  print_result 1 "Create second concurrent session with unique ID"
  SESSION_ID_2="fallback-session-2-$(date +%s)"
fi

echo ""
echo -e "${YELLOW}Test 6.2: Verify session isolation${NC}"

resp1=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 18,
    "method": "tools/call",
    "params": {
      "name": "echo",
      "arguments": {
        "message": "Session1Message"
      }
    }
  }'  2>&1)

resp2=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID_2" \
  -d '{
    "jsonrpc": "2.0",
    "id": 19,
    "method": "tools/call",
    "params": {
      "name": "echo",
      "arguments": {
        "message": "Session2Message"
      }
    }
  }'  2>&1)

json1=$(extract_json "$resp1")
json2=$(extract_json "$resp2")

echo "Session 1 response:"
echo "$json1" | jq . 2>/dev/null

echo "Session 2 response:"
echo "$json2" | jq . 2>/dev/null

if echo "$json1" | jq -e '.result.content[0].text | contains("Session1Message")' >/dev/null 2>&1 && \
   echo "$json2" | jq -e '.result.content[0].text | contains("Session2Message")' >/dev/null 2>&1; then
  print_result 0 "Sessions are properly isolated"
else
  print_result 1 "Sessions are properly isolated"
fi

echo ""
echo -e "${YELLOW}Test 6.3: Session persistence across multiple requests${NC}"

success_count=0
for i in {1..5}; do
  response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Mcp-Session-Id: $SESSION_ID" \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": $((19 + i)),
      \"method\": \"tools/call\",
      \"params\": {
        \"name\": \"calculate\",
        \"arguments\": {
          \"operation\": \"add\",
          \"a\": $i,
          \"b\": $i
        }
      }
    }")

  json=$(extract_json "$response")
  if echo "$json" | jq -e '.result' >/dev/null 2>&1; then
    ((success_count++))
  fi
done

if [ $success_count -eq 5 ]; then
  print_result 0 "Session persists across 5 sequential requests"
else
  print_result 1 "Session persists across 5 sequential requests"
  echo "Only $success_count/5 requests succeeded"
fi

# =========================================
# Test Section 7: SSE and GET Endpoint
# =========================================
print_section "Test Section 7: SSE and GET Endpoint"

echo ""
echo -e "${YELLOW}Test 7.1: GET /mcp accepts connection with valid session${NC}"

http_code=$(curl -s -o /tmp/sse-integration-test.log -w "%{http_code}" \
  --max-time 2 \
  -X GET http://localhost:3003/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H "Accept: text/event-stream")

if [ "$http_code" = "200" ] || [ "$http_code" = "000" ]; then
  print_result 0 "GET endpoint accepts valid session (HTTP $http_code)"
else
  print_result 1 "GET endpoint accepts valid session (HTTP $http_code)"
fi

echo ""
echo -e "${YELLOW}Test 7.2: GET /mcp rejects connection without session${NC}"

http_code=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 2 \
  -X GET http://localhost:3003/mcp \
  -H "Accept: text/event-stream")

if [ "$http_code" = "400" ] || [ "$http_code" = "401" ]; then
  print_result 0 "GET endpoint rejects missing session (HTTP $http_code)"
else
  print_result 1 "GET endpoint rejects missing session (HTTP $http_code)"
fi

# =========================================
# Test Section 8: DELETE Endpoint
# =========================================
print_section "Test Section 8: DELETE Endpoint (Session Termination)"

echo ""
echo -e "${YELLOW}Test 8.1: DELETE /mcp terminates session${NC}"
response=$(curl -s -i -X DELETE http://localhost:3003/mcp \
  -H "Mcp-Session-Id: $SESSION_ID_2")

echo "$response"

if echo "$response" | grep -E "HTTP/.*200|204" >/dev/null 2>&1; then
  print_result 0 "DELETE endpoint returns success"
else
  print_result 1 "DELETE endpoint returns success"
fi

echo ""
echo -e "${YELLOW}Test 8.2: Verify terminated session cannot be reused${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID_2" \
  -d '{
    "jsonrpc": "2.0",
    "id": 25,
    "method": "tools/list",
    "params": {}
  }'  2>&1)

json=$(extract_json "$response")
echo "$json" | jq . 2>/dev/null

if echo "$json" | jq -e '.error' >/dev/null 2>&1; then
  print_result 0 "Terminated session cannot be reused"
else
  print_result 1 "Terminated session cannot be reused"
fi

# =========================================
# Test Section 9: Stress Testing
# =========================================
print_section "Test Section 9: Stress Testing"

echo ""
echo -e "${YELLOW}Test 9.1: Rapid sequential requests${NC}"

rapid_success=0
for i in {1..10}; do
  response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Mcp-Session-Id: $SESSION_ID" \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": $((30 + i)),
      \"method\": \"tools/call\",
      \"params\": {
        \"name\": \"echo\",
        \"arguments\": {
          \"message\": \"Rapid test $i\"
        }
      }
    }")

  json=$(extract_json "$response")
  if echo "$json" | jq -e '.result' >/dev/null 2>&1; then
    ((rapid_success++))
  fi
done

if [ $rapid_success -ge 9 ]; then
  print_result 0 "Handle rapid sequential requests ($rapid_success/10 succeeded)"
else
  print_result 1 "Handle rapid sequential requests ($rapid_success/10 succeeded)"
fi

echo ""
echo -e "${YELLOW}Test 9.2: Large payload handling${NC}"

# Create a large message (approximately 1KB)
large_message=$(printf 'A%.0s' {1..1000})

response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 41,
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"echo\",
      \"arguments\": {
        \"message\": \"$large_message\"
      }
    }
  }")

json=$(extract_json "$response")

if echo "$json" | jq -e '.result' >/dev/null 2>&1; then
  print_result 0 "Handle large payload (1KB message)"
else
  print_result 1 "Handle large payload (1KB message)"
fi

# =========================================
# Test Section 10: JSON-RPC Compliance
# =========================================
print_section "Test Section 10: JSON-RPC Compliance"

echo ""
echo -e "${YELLOW}Test 10.1: Invalid JSON request${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{invalid json}'  2>&1)

if echo "$response" | grep -qi "error\|invalid\|parse"; then
  print_result 0 "Invalid JSON returns error"
else
  print_result 1 "Invalid JSON returns error"
fi

echo ""
echo -e "${YELLOW}Test 10.2: Missing jsonrpc version${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "id": 42,
    "method": "tools/list",
    "params": {}
  }'  2>&1)

json=$(extract_json "$response")

# May still work or return error - either is acceptable
if echo "$json" | jq . >/dev/null 2>&1; then
  print_result 0 "Handle missing jsonrpc version"
else
  print_result 1 "Handle missing jsonrpc version"
fi

echo ""
echo -e "${YELLOW}Test 10.3: Response includes request ID${NC}"
response=$(curl -s --max-time 5 -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 12345,
    "method": "tools/list",
    "params": {}
  }'  2>&1)

json=$(extract_json "$response")

if echo "$json" | jq -e '.id == 12345' >/dev/null 2>&1; then
  print_result 0 "Response includes matching request ID"
else
  print_result 1 "Response includes matching request ID"
fi

# =========================================
# Cleanup and Summary
# =========================================
print_section "Cleanup and Summary"

echo ""
echo "Terminating remaining test session..."
curl -s -X DELETE http://localhost:3003/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" > /dev/null 2>&1

echo "Stopping server..."
pkill -f "tsx mcp/configurableServer.ts mcp/config-test-stateful.json" 2>/dev/null || true
sleep 1
echo "Server stopped"
echo ""

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo "Duration: ${DURATION}s"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}=========================================${NC}"
  echo -e "${GREEN}All integration tests passed!${NC}"
  echo -e "${GREEN}=========================================${NC}"
  exit 0
else
  echo -e "${RED}=========================================${NC}"
  echo -e "${RED}Some tests failed. Check output above.${NC}"
  echo -e "${RED}=========================================${NC}"
  exit 1
fi
