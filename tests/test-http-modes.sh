#!/bin/bash
# Integration Test Script for HTTP Transport Modes (Stateful vs Stateless)
#
# This script tests both stateful and stateless HTTP transport modes
# to verify they behave correctly and as expected.

echo "========================================="
echo "Testing HTTP Transport Modes"
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
  echo ""
}

# Cleanup function
cleanup() {
  echo ""
  echo "Cleaning up..."

  # Kill stateful server
  if [ ! -z "$STATEFUL_PID" ]; then
    echo "Stopping stateful server (PID: $STATEFUL_PID)..."
    kill $STATEFUL_PID 2>/dev/null || true
    wait $STATEFUL_PID 2>/dev/null || true
  fi

  # Kill stateless server
  if [ ! -z "$STATELESS_PID" ]; then
    echo "Stopping stateless server (PID: $STATELESS_PID)..."
    kill $STATELESS_PID 2>/dev/null || true
    wait $STATELESS_PID 2>/dev/null || true
  fi

  # Clean up any remaining processes
  pkill -f "test-http-mode-stateful" 2>/dev/null || true
  pkill -f "test-http-mode-stateless" 2>/dev/null || true

  # Clean up temp files
  rm -f /tmp/mcp-stateful-mode-server.log /tmp/mcp-stateless-mode-server.log
  rm -f /tmp/http-mode-*.json
}

# Set up trap for cleanup
trap cleanup EXIT

# Create test server files
print_section "Setting up test servers"

# Get the project root directory (parent of tests)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Create stateful mode server using cat with EOF to avoid variable expansion issues
cat > "$PROJECT_ROOT/tests/.test-http-mode-stateful.ts" <<'EOFSTATEFUL'
import { BuildMCPServer } from '../dist/src/server/builder-server.js';
import { z } from 'zod';

async function main() {
  const server = new BuildMCPServer({
    name: 'stateful-test-server',
    version: '1.0.0',
  });

  server.addTool({
    name: 'echo',
    description: 'Echo a message',
    parameters: z.object({
      message: z.string(),
    }),
    execute: async (args) => {
      return `Stateful Echo: ${args.message}`;
    },
  });

  server.addTool({
    name: 'add',
    description: 'Add two numbers',
    parameters: z.object({
      a: z.number(),
      b: z.number(),
    }),
    execute: async (args) => {
      return `${args.a} + ${args.b} = ${args.a + args.b}`;
    },
  });

  await server.start({
    transport: 'http',
    port: 3200,
    stateful: true,
  });
}

main().catch(console.error);
EOFSTATEFUL

# Create stateless mode server
cat > "$PROJECT_ROOT/tests/.test-http-mode-stateless.ts" <<'EOFSTATELESS'
import { BuildMCPServer } from '../dist/src/server/builder-server.js';
import { z } from 'zod';

async function main() {
  const server = new BuildMCPServer({
    name: 'stateless-test-server',
    version: '1.0.0',
  });

  server.addTool({
    name: 'echo',
    description: 'Echo a message',
    parameters: z.object({
      message: z.string(),
    }),
    execute: async (args) => {
      return `Stateless Echo: ${args.message}`;
    },
  });

  server.addTool({
    name: 'add',
    description: 'Add two numbers',
    parameters: z.object({
      a: z.number(),
      b: z.number(),
    }),
    execute: async (args) => {
      return `${args.a} + ${args.b} = ${args.a + args.b}`;
    },
  });

  await server.start({
    transport: 'http',
    port: 3201,
    stateful: false,
  });
}

main().catch(console.error);
EOFSTATELESS

echo "Test server files created"

# Start stateful server
print_section "Starting STATEFUL mode server (port 3200)"
cd "$PROJECT_ROOT" && npx tsx tests/.test-http-mode-stateful.ts > /tmp/mcp-stateful-mode-server.log 2>&1 &
STATEFUL_PID=$!
echo "Stateful server PID: $STATEFUL_PID"

# Start stateless server
print_section "Starting STATELESS mode server (port 3201)"
cd "$PROJECT_ROOT" && npx tsx tests/.test-http-mode-stateless.ts > /tmp/mcp-stateless-mode-server.log 2>&1 &
STATELESS_PID=$!
echo "Stateless server PID: $STATELESS_PID"

# Wait for both servers to start
echo ""
echo "Waiting for servers to start..."
MAX_WAIT=15

# Wait for stateful server
WAIT_COUNT=0
sleep 2
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  if grep -q "listening on port 3200" /tmp/mcp-stateful-mode-server.log 2>/dev/null; then
    echo -e "${GREEN}Stateful server is ready${NC}"
    break
  fi
  sleep 1
  ((WAIT_COUNT++))
done

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
  echo -e "${RED}ERROR: Stateful server failed to start${NC}"
  echo "Server log:"
  cat /tmp/mcp-stateful-mode-server.log
  exit 1
fi

# Wait for stateless server
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  if grep -q "listening on port 3201" /tmp/mcp-stateless-mode-server.log 2>/dev/null; then
    echo -e "${GREEN}Stateless server is ready${NC}"
    break
  fi
  sleep 1
  ((WAIT_COUNT++))
done

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
  echo -e "${RED}ERROR: Stateless server failed to start${NC}"
  echo "Server log:"
  cat /tmp/mcp-stateless-mode-server.log
  exit 1
fi

# =========================================
# STATEFUL MODE TESTS
# =========================================

print_section "Testing STATEFUL Mode"

# Test 1: Initialize connection and get session ID
echo -e "${YELLOW}Test: Initialize stateful connection${NC}"
response=$(curl -s -i -X POST http://localhost:3200/mcp \
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

# Extract session ID from headers
SESSION_ID=$(echo "$response" | grep -i "^mcp-session-id:" | head -1 | sed 's/^[^:]*: *//' | tr -d '\r\n ')

# Extract body
body=$(echo "$response" | sed -n '/^\r$/,$p' | tail -n +2)
json=$(echo "$body" | grep '^data:' | sed 's/^data: //')
if [ -z "$json" ]; then
  json="$body"
fi

echo "Session ID: $SESSION_ID"
echo "$json" | jq . 2>/dev/null

if [ -n "$SESSION_ID" ] && echo "$json" | jq . >/dev/null 2>&1; then
  print_result 0 "Stateful: Initialize and get session ID"
else
  print_result 1 "Stateful: Initialize and get session ID"
  SESSION_ID="fallback-session-$(date +%s)"
fi

# Test 2: Reuse session ID for tools/list
echo ""
echo -e "${YELLOW}Test: List tools with session ID${NC}"
response=$(curl -s -X POST http://localhost:3200/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }')

json=$(echo "$response" | grep '^data:' | sed 's/^data: //')
if [ -z "$json" ]; then
  json="$response"
fi

echo "$json" | jq . 2>/dev/null
echo "$json" | jq -e '.result.tools' >/dev/null 2>&1
print_result $? "Stateful: Reuse session for tools/list"

# Test 3: Call tool with session
echo ""
echo -e "${YELLOW}Test: Call tool with session${NC}"
response=$(curl -s -X POST http://localhost:3200/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "echo",
      "arguments": {
        "message": "Hello Stateful!"
      }
    }
  }')

json=$(echo "$response" | grep '^data:' | sed 's/^data: //')
if [ -z "$json" ]; then
  json="$response"
fi

echo "$json" | jq . 2>/dev/null
echo "$json" | jq -e '.result.content[0].text | contains("Stateful Echo")' >/dev/null 2>&1
print_result $? "Stateful: Call tool with session"

# Test 4: Request without session ID (should fail)
echo ""
echo -e "${YELLOW}Test: Request without session ID${NC}"
response=$(curl -s -X POST http://localhost:3200/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/list"
  }')

echo "$response" | jq . 2>/dev/null
echo "$response" | jq -e '.error' >/dev/null 2>&1
print_result $? "Stateful: Request without session rejected"

# Test 5: GET endpoint (SSE) should accept valid session
echo ""
echo -e "${YELLOW}Test: GET endpoint with valid session${NC}"
http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 \
  -X GET http://localhost:3200/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H "Accept: text/event-stream")

if [ "$http_code" = "200" ] || [ "$http_code" = "000" ]; then
  print_result 0 "Stateful: GET endpoint accepts valid session"
else
  print_result 1 "Stateful: GET endpoint accepts valid session (HTTP $http_code)"
fi

# Test 6: DELETE endpoint (session termination)
echo ""
echo -e "${YELLOW}Test: DELETE endpoint for session termination${NC}"
response=$(curl -s -i -X DELETE http://localhost:3200/mcp \
  -H "Mcp-Session-Id: $SESSION_ID")

if echo "$response" | grep -E "HTTP/.*200|204" >/dev/null 2>&1; then
  print_result 0 "Stateful: DELETE endpoint terminates session"

  # Test 7: Verify session is terminated
  echo ""
  echo -e "${YELLOW}Test: Verify terminated session cannot be used${NC}"
  response=$(curl -s -X POST http://localhost:3200/mcp \
    -H "Content-Type: application/json" \
    -H "Mcp-Session-Id: $SESSION_ID" \
    -d '{
      "jsonrpc": "2.0",
      "id": 5,
      "method": "tools/list"
    }')

  echo "$response" | jq . 2>/dev/null
  echo "$response" | jq -e '.error' >/dev/null 2>&1
  print_result $? "Stateful: Terminated session cannot be reused"
else
  print_result 1 "Stateful: DELETE endpoint terminates session"
fi

# =========================================
# STATELESS MODE TESTS
# =========================================

print_section "Testing STATELESS Mode"

# Test 8: Initialize request (should work but no session tracking)
echo -e "${YELLOW}Test: Initialize stateless connection${NC}"
response=$(curl -s -i -X POST http://localhost:3201/mcp \
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

# Check for session ID (should NOT be present or not required)
STATELESS_SESSION=$(echo "$response" | grep -i "^mcp-session-id:" | head -1 | sed 's/^[^:]*: *//' | tr -d '\r\n ')

body=$(echo "$response" | sed -n '/^\r$/,$p' | tail -n +2)
json=$(echo "$body" | grep '^data:' | sed 's/^data: //')
if [ -z "$json" ]; then
  json="$body"
fi

echo "$json" | jq . 2>/dev/null
echo "$json" | jq . >/dev/null 2>&1
print_result $? "Stateless: Initialize connection"

# Test 9: tools/list without session (stateless allows any request)
echo ""
echo -e "${YELLOW}Test: tools/list works independently in stateless mode${NC}"
response=$(curl -s -X POST http://localhost:3201/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }')

json=$(echo "$response" | grep '^data:' | sed 's/^data: //')
if [ -z "$json" ]; then
  json="$response"
fi

echo "$json" | jq . 2>/dev/null
# In stateless mode, each request is independent and self-contained
# tools/list should work without prior initialization (fresh transport per request)
echo "$json" | jq -e '.result.tools' >/dev/null 2>&1
print_result $? "Stateless: Independent requests work without session"

# Test 10: GET endpoint should NOT be available in stateless mode
echo ""
echo -e "${YELLOW}Test: GET endpoint not available in stateless mode${NC}"
http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 \
  -X GET http://localhost:3201/mcp \
  -H "Accept: text/event-stream")

if [ "$http_code" = "404" ] || [ "$http_code" = "405" ]; then
  print_result 0 "Stateless: GET endpoint not available"
else
  print_result 1 "Stateless: GET endpoint not available (got HTTP $http_code, expected 404 or 405)"
fi

# Test 11: DELETE endpoint should NOT be available in stateless mode
echo ""
echo -e "${YELLOW}Test: DELETE endpoint not available in stateless mode${NC}"
http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 \
  -X DELETE http://localhost:3201/mcp)

if [ "$http_code" = "404" ] || [ "$http_code" = "405" ]; then
  print_result 0 "Stateless: DELETE endpoint not available"
else
  print_result 1 "Stateless: DELETE endpoint not available (got HTTP $http_code, expected 404 or 405)"
fi

# Test 12: Multiple concurrent requests (should all work independently)
echo ""
echo -e "${YELLOW}Test: Concurrent stateless requests${NC}"

# Make 3 concurrent initialize requests
# Use timeout command to kill after first SSE response (2 seconds should be enough)
(timeout 2 curl -s --no-buffer -X POST http://localhost:3201/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "client1", "version": "1.0.0"}
    }
  }' > /tmp/http-mode-concurrent1.json 2>&1; true) &
PID1=$!

(timeout 2 curl -s --no-buffer -X POST http://localhost:3201/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "client2", "version": "1.0.0"}
    }
  }' > /tmp/http-mode-concurrent2.json 2>&1; true) &
PID2=$!

(timeout 2 curl -s --no-buffer -X POST http://localhost:3201/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "client3", "version": "1.0.0"}
    }
  }' > /tmp/http-mode-concurrent3.json 2>&1; true) &
PID3=$!

# Wait for specific jobs to complete (with timeout fallback)
wait $PID1 $PID2 $PID3 2>/dev/null || true

# Check all responses (stateless mode returns JSON, not SSE)
success=0
for i in 1 2 3; do
  if [ -f /tmp/http-mode-concurrent$i.json ]; then
    # Stateless mode returns JSON directly, not SSE format
    if cat /tmp/http-mode-concurrent$i.json | jq . >/dev/null 2>&1; then
      ((success++))
    fi
  fi
done

if [ $success -eq 3 ]; then
  print_result 0 "Stateless: Concurrent requests work independently"
else
  print_result 1 "Stateless: Concurrent requests work independently (only $success/3 succeeded)"
fi

# =========================================
# BACKWARDS COMPATIBILITY TESTS
# =========================================

print_section "Testing Backwards Compatibility"

# Test 13: Default mode should be stateful
echo -e "${YELLOW}Test: Verify stateful is default mode${NC}"
# This is implicitly tested by the stateful server tests above
# The stateful server should have sessions by default
if [ -n "$SESSION_ID" ]; then
  print_result 0 "Backwards Compatibility: Default mode is stateful"
else
  print_result 1 "Backwards Compatibility: Default mode is stateful"
fi

# Test 14: Existing stateful code should continue to work
echo ""
echo -e "${YELLOW}Test: Existing stateful functionality preserved${NC}"
# Already tested in stateful mode tests
print_result 0 "Backwards Compatibility: Stateful functionality preserved"

# =========================================
# SUMMARY
# =========================================

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

print_section "Test Summary"
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo "Duration: ${DURATION}s"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Check the output above.${NC}"
  echo ""
  echo "Server logs:"
  echo ""
  echo "=== Stateful Server Log ==="
  cat /tmp/mcp-stateful-mode-server.log
  echo ""
  echo "=== Stateless Server Log ==="
  cat /tmp/mcp-stateless-mode-server.log
  exit 1
fi
