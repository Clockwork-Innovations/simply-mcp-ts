#!/bin/bash
# Manual Test: Verify bundled servers work with Claude CLI
#
# This test verifies that:
# 1. Bundled servers can be used via Claude CLI with stdio transport
# 2. Bundled servers can be used via Claude CLI with HTTP transport
# 3. Claude CLI can discover tools with proper schemas
# 4. Claude CLI can execute tools successfully
#
# Requirements:
# - Claude CLI installed and in PATH
# - simply-mcp built (npm run build)
#
# Usage: bash tests/manual/test-bundled-schemas-with-claude-cli.sh

set -e

echo "=========================================="
echo "Claude CLI Test: Bundled Server Integration"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Claude CLI is available
if ! command -v claude &> /dev/null; then
    echo -e "${RED}ERROR: Claude CLI not found in PATH${NC}"
    echo "Please install Claude CLI: https://github.com/anthropics/claude-code"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLI_PATH="$PROJECT_ROOT/dist/src/cli/index.js"

# Check if CLI is built
if [ ! -f "$CLI_PATH" ]; then
    echo -e "${RED}ERROR: CLI not built${NC}"
    echo "Please run: npm run build"
    exit 1
fi

# Create temp directory for test
TEST_DIR=$(mktemp -d)

# Cleanup function to ensure servers and temp files are removed
cleanup() {
    echo ""
    echo "Cleaning up..."

    # Kill any HTTP servers we started
    if [ -n "$HTTP_STATEFUL_PID" ]; then
        kill $HTTP_STATEFUL_PID 2>/dev/null || true
        wait $HTTP_STATEFUL_PID 2>/dev/null || true
    fi

    if [ -n "$HTTP_STATELESS_PID" ]; then
        kill $HTTP_STATELESS_PID 2>/dev/null || true
        wait $HTTP_STATELESS_PID 2>/dev/null || true
    fi

    # Kill any orphaned servers using test ports
    lsof -ti:3457,3458 2>/dev/null | xargs -r kill -9 2>/dev/null || true

    # Remove temp directory
    rm -rf "$TEST_DIR"

    # Clean up log files
    rm -f /tmp/http-stateful-test.log /tmp/http-stateless-test.log /tmp/http-init-headers.txt 2>/dev/null || true

    echo "Cleanup complete"
}

trap cleanup EXIT

echo "Test directory: $TEST_DIR"
echo ""

# Create test server with simple tools
echo "Creating test server..."
cat > "$TEST_DIR/test-server.ts" << 'EOF'
import type { ITool, IServer, IParam } from 'simply-mcp';

interface NumberParam extends IParam {
  type: 'number';
  description: 'A number';
  required: true;
}

interface AddTool extends ITool {
  description: 'Add two numbers';
  params: {
    a: NumberParam;
    b: NumberParam;
  };
}

interface GreetTool extends ITool {
  description: 'Greet someone';
  params: {
    name: { type: 'string'; description: 'Name'; required: true; };
  };
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
  description: 'Test server';
  add: AddTool;
  greet: GreetTool;
}

export default class implements TestServer {
  name = 'test-server' as const;
  version = '1.0.0' as const;
  description = 'Test server' as const;

  add: AddTool = async (params) => {
    return `Result: ${params.a + params.b}`;
  };

  greet: GreetTool = async (params) => {
    return `Hello, ${params.name}!`;
  };
}
EOF

# Bundle the server
echo "Bundling server..."
node "$CLI_PATH" bundle "$TEST_DIR/test-server.ts" -o "$TEST_DIR/test-server.js" > /dev/null 2>&1

if [ ! -f "$TEST_DIR/test-server.js" ]; then
    echo -e "${RED}FAIL: Bundle not created${NC}"
    exit 1
fi

# Check if schemas file was created
if [ ! -f "$TEST_DIR/test-server.schemas.json" ]; then
    echo -e "${RED}FAIL: Schemas file not created${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Server bundled with schemas${NC}"
echo ""

# Verify schemas contain proper definitions
echo "Verifying schema structure..."
if grep -q '"type": "number"' "$TEST_DIR/test-server.schemas.json" && \
   grep -q '"required": true' "$TEST_DIR/test-server.schemas.json"; then
    echo -e "${GREEN}✓ Schemas contain proper type definitions${NC}"
else
    echo -e "${RED}FAIL: Schemas missing expected content${NC}"
    exit 1
fi
echo ""

# Test with direct MCP protocol - STDIO (verify server works)
echo "Testing direct MCP protocol (stdio)..."
DIRECT_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  node "$CLI_PATH" run "$TEST_DIR/test-server.js" 2>&1 | \
  grep -v '^\[' | head -1)

if echo "$DIRECT_RESULT" | grep -q '"add".*"greet"' && \
   echo "$DIRECT_RESULT" | grep -q '"properties".*"required"'; then
    echo -e "${GREEN}✓ STDIO server responds with proper tool schemas${NC}"
else
    echo -e "${RED}FAIL: STDIO server not responding correctly${NC}"
    exit 1
fi
echo ""

# Test with direct MCP protocol - HTTP (verify HTTP transport works)
echo "Testing direct MCP protocol (HTTP)..."

# Start HTTP server in background
node "$CLI_PATH" run "$TEST_DIR/test-server.js" --http --port 3457 > /tmp/http-test-server.log 2>&1 &
HTTP_SERVER_PID=$!

# Give server time to start
sleep 3

# Test health endpoint first
if ! curl -s http://localhost:3457/health | grep -q '"status":"ok"'; then
    echo -e "${RED}FAIL: HTTP server not responding to health check${NC}"
    cat /tmp/http-test-server.log
    kill $HTTP_SERVER_PID 2>/dev/null || true
    exit 1
fi

# Test initialization with SSE (HTTP stateful requires this)
# Use -D to dump headers to a temp file so we can extract the session ID
INIT_RESULT=$(curl -s -D /tmp/http-init-headers.txt -X POST http://localhost:3457/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test","version":"1.0.0"},"capabilities":{}}}')

# Extract session ID from response header (mcp-session-id)
SESSION_ID=$(grep -i 'mcp-session-id:' /tmp/http-init-headers.txt | cut -d':' -f2 | tr -d ' \r\n' || echo "")

if [ -z "$SESSION_ID" ]; then
    echo -e "${RED}FAIL: Could not get session ID from initialize${NC}"
    echo "Headers:"
    cat /tmp/http-init-headers.txt
    echo ""
    echo "Response: $INIT_RESULT"
    kill $HTTP_SERVER_PID 2>/dev/null || true
    exit 1
fi

# Test tools/list with session
TOOLS_RESULT=$(curl -s -X POST http://localhost:3457/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}')

# Kill the HTTP server
kill $HTTP_SERVER_PID 2>/dev/null || true
wait $HTTP_SERVER_PID 2>/dev/null || true

# Parse SSE response - extract the data line
TOOLS_DATA=$(echo "$TOOLS_RESULT" | grep '^data:' | sed 's/^data: //')

# Verify response contains tools with schemas
if echo "$TOOLS_DATA" | grep -q '"add".*"greet"' && \
   echo "$TOOLS_DATA" | grep -q '"properties".*"required"'; then
    echo -e "${GREEN}✓ HTTP server responds with proper tool schemas${NC}"
else
    echo -e "${RED}FAIL: HTTP server not responding correctly${NC}"
    echo "Tools result: $TOOLS_RESULT"
    echo "Parsed data: $TOOLS_DATA"
    exit 1
fi
echo ""

# Function to test with Claude CLI
test_transport() {
    local TRANSPORT_NAME="$1"
    local CONFIG_PATH="$2"

    echo "=========================================="
    echo "Testing $TRANSPORT_NAME transport"
    echo "=========================================="
    echo ""

    # Test: Verify tool is actually called via MCP
    echo "Verify Claude CLI actually calls MCP tools..."

    # Use greet tool with a unique name that Claude can't guess the response for
    # The server returns exactly "Hello, TestUser123!" so we can verify it was called
    # Enable debug mode to see MCP tool call messages
    EXECUTION_OUTPUT=$(timeout 60 claude --print \
      --debug mcp \
      --model haiku \
      --mcp-config "$CONFIG_PATH" \
      --strict-mcp-config \
      --dangerously-skip-permissions \
      "You MUST use the 'greet' MCP tool with name='TestUser123'. Do not make up a response. Call the tool and show me exactly what it returns." 2>&1 || echo "TIMEOUT")

    echo ""
    echo "Claude CLI Output:"
    echo "---"
    echo "$EXECUTION_OUTPUT"
    echo "---"
    echo ""

    # Check if the tool was actually called by looking for:
    # 1. The exact response format from the tool
    # 2. Evidence of MCP tool execution in the output (via --debug mcp)

    # Special case: Check for terms acceptance needed
    if echo "$EXECUTION_OUTPUT" | grep -qi "ACTION REQUIRED.*Consumer Terms\|updated terms"; then
        echo -e "${RED}FAIL: Claude CLI requires terms acceptance${NC}"
        echo ""
        echo "You need to accept the updated terms interactively."
        echo "Run this command in a separate terminal:"
        echo ""
        echo "  claude \"hello\""
        echo ""
        echo "Follow the prompts to review and accept the terms."
        echo "Then re-run this test."
        exit 1
    fi

    if echo "$EXECUTION_OUTPUT" | grep -q "TIMEOUT"; then
        echo -e "${RED}FAIL: Claude API call timed out${NC}"
        echo "This usually means:"
        echo "  1. The API key is invalid or rate limited"
        echo "  2. Network connectivity issues"
        echo "  3. The MCP server failed to start or respond"
        exit 1
    elif echo "$EXECUTION_OUTPUT" | grep -q "Hello, TestUser123"; then
        # Verify we can see MCP protocol messages (tool was actually called)
        if echo "$EXECUTION_OUTPUT" | grep -qi "tools/call\|greet"; then
            echo -e "${GREEN}✓ Claude CLI successfully called MCP tool (verified via debug output)${NC}"
        else
            echo -e "${GREEN}✓ Claude CLI returned tool output (but no debug messages visible)${NC}"
        fi
    else
        echo -e "${RED}FAIL: Could not verify tool was called${NC}"
        echo "Expected output containing 'Hello, TestUser123!' but got:"
        echo "$EXECUTION_OUTPUT"
        exit 1
    fi
    echo ""

    echo -e "${GREEN}✓ $TRANSPORT_NAME transport verified${NC}"
    echo ""
}

# Create MCP configs
echo "Creating MCP configs..."

cat > "$TEST_DIR/mcp-config-stdio.json" << EOF
{
  "mcpServers": {
    "test-server": {
      "command": "node",
      "args": ["$CLI_PATH", "run", "$TEST_DIR/test-server.js"]
    }
  }
}
EOF

cat > "$TEST_DIR/mcp-config-http.json" << EOF
{
  "mcpServers": {
    "test-server": {
      "type": "http",
      "url": "http://localhost:3457/mcp"
    }
  }
}
EOF

cat > "$TEST_DIR/mcp-config-http-stateless.json" << EOF
{
  "mcpServers": {
    "test-server": {
      "type": "http",
      "url": "http://localhost:3458/mcp"
    }
  }
}
EOF

echo -e "${GREEN}✓ MCP configs created${NC}"
echo ""

# Test STDIO first (uses command/args to start server)
test_transport "STDIO" "$TEST_DIR/mcp-config-stdio.json"

# For HTTP, we need to start servers ourselves since HTTP transport expects running servers
echo "Starting HTTP stateful server..."
node "$CLI_PATH" run "$TEST_DIR/test-server.js" --http --port 3457 > /tmp/http-stateful-test.log 2>&1 &
HTTP_STATEFUL_PID=$!
sleep 3

# Verify server started
if ! curl -s http://localhost:3457/health | grep -q '"status":"ok"'; then
    echo -e "${RED}FAIL: HTTP stateful server failed to start${NC}"
    cat /tmp/http-stateful-test.log
    kill $HTTP_STATEFUL_PID 2>/dev/null || true
    exit 1
fi
echo "HTTP stateful server running (PID $HTTP_STATEFUL_PID)"

# Test HTTP stateful transport
test_transport "HTTP (Stateful)" "$TEST_DIR/mcp-config-http.json"

# Clean up stateful server
kill $HTTP_STATEFUL_PID 2>/dev/null || true
wait $HTTP_STATEFUL_PID 2>/dev/null || true
sleep 2

# Start HTTP stateless server
echo "Starting HTTP stateless server..."
node "$CLI_PATH" run "$TEST_DIR/test-server.js" --transport http-stateless --port 3458 > /tmp/http-stateless-test.log 2>&1 &
HTTP_STATELESS_PID=$!
sleep 3

# Verify server started
if ! curl -s http://localhost:3458/health | grep -q '"status":"ok"'; then
    echo -e "${RED}FAIL: HTTP stateless server failed to start${NC}"
    cat /tmp/http-stateless-test.log
    kill $HTTP_STATELESS_PID 2>/dev/null || true
    exit 1
fi
echo "HTTP stateless server running (PID $HTTP_STATELESS_PID)"

# Test HTTP stateless transport
test_transport "HTTP (Stateless)" "$TEST_DIR/mcp-config-http-stateless.json"

# Clean up stateless server
kill $HTTP_STATELESS_PID 2>/dev/null || true
wait $HTTP_STATELESS_PID 2>/dev/null || true

echo "=========================================="
echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✅ Server bundles with proper schemas"
echo "  ✅ Direct MCP protocol works correctly (stdio & HTTP)"
echo "  ✅ Claude CLI can connect and execute tools via stdio transport"
echo "  ✅ Claude CLI can connect and execute tools via HTTP stateful transport"
echo "  ✅ Claude CLI can connect and execute tools via HTTP stateless transport"
echo "  ✅ MCP tool calls verified via unique tool responses"
echo ""
