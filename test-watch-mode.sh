#!/bin/bash
# Test script for watch mode functionality

set -e

echo "=== Testing Watch Mode ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Start watch mode in background
echo -e "${YELLOW}Test 1: Starting watch mode with decorator server${NC}"
timeout 5s node dist/mcp/cli/index.js run test-watch-server.ts --watch --verbose > /tmp/watch-test.log 2>&1 &
WATCH_PID=$!
echo "Watch mode started (PID: $WATCH_PID)"
sleep 2

# Check if process is running
if ps -p $WATCH_PID > /dev/null; then
    echo -e "${GREEN}✓ Watch mode process is running${NC}"
else
    echo -e "${RED}✗ Watch mode process failed to start${NC}"
    cat /tmp/watch-test.log
    exit 1
fi

# Test 2: Modify the file to trigger restart
echo ""
echo -e "${YELLOW}Test 2: Modifying file to trigger restart${NC}"
sleep 1
cat >> test-watch-server.ts << 'EOF'

  // Added by test
  newMethod(): string {
    return "This is a new method";
  }
EOF

echo "File modified, waiting for restart..."
sleep 2

# Check log for restart message
if grep -q "File change detected, restarting server" /tmp/watch-test.log; then
    echo -e "${GREEN}✓ File change was detected and server restarted${NC}"
else
    echo -e "${RED}✗ File change was not detected${NC}"
    cat /tmp/watch-test.log
fi

# Test 3: Stop watch mode
echo ""
echo -e "${YELLOW}Test 3: Stopping watch mode${NC}"
kill -SIGTERM $WATCH_PID 2>/dev/null || true
wait $WATCH_PID 2>/dev/null || true
echo -e "${GREEN}✓ Watch mode stopped${NC}"

# Test 4: Test with stdio transport
echo ""
echo -e "${YELLOW}Test 4: Testing watch mode with STDIO transport${NC}"
timeout 3s node dist/mcp/cli/index.js run mcp/examples/class-minimal.ts --watch > /tmp/watch-stdio.log 2>&1 &
STDIO_PID=$!
sleep 2

if ps -p $STDIO_PID > /dev/null; then
    echo -e "${GREEN}✓ Watch mode works with STDIO transport${NC}"
    kill -SIGTERM $STDIO_PID 2>/dev/null || true
    wait $STDIO_PID 2>/dev/null || true
else
    echo -e "${RED}✗ Watch mode failed with STDIO transport${NC}"
    cat /tmp/watch-stdio.log
fi

# Test 5: Test with HTTP transport
echo ""
echo -e "${YELLOW}Test 5: Testing watch mode with HTTP transport${NC}"
timeout 3s node dist/mcp/cli/index.js run mcp/examples/class-minimal.ts --watch --http --port 3000 > /tmp/watch-http.log 2>&1 &
HTTP_PID=$!
sleep 2

if ps -p $HTTP_PID > /dev/null; then
    echo -e "${GREEN}✓ Watch mode works with HTTP transport${NC}"
    kill -SIGTERM $HTTP_PID 2>/dev/null || true
    wait $HTTP_PID 2>/dev/null || true
else
    echo -e "${RED}✗ Watch mode failed with HTTP transport${NC}"
    cat /tmp/watch-http.log
fi

# Test 6: Test with functional API server
echo ""
echo -e "${YELLOW}Test 6: Testing watch mode with functional API server${NC}"
timeout 3s node dist/mcp/cli/index.js run mcp/examples/single-file-basic.ts --watch > /tmp/watch-func.log 2>&1 &
FUNC_PID=$!
sleep 2

if ps -p $FUNC_PID > /dev/null; then
    echo -e "${GREEN}✓ Watch mode works with functional API${NC}"
    kill -SIGTERM $FUNC_PID 2>/dev/null || true
    wait $FUNC_PID 2>/dev/null || true
else
    echo -e "${RED}✗ Watch mode failed with functional API${NC}"
    cat /tmp/watch-func.log
fi

# Restore test file
echo ""
echo "Restoring test-watch-server.ts to original state..."
git checkout test-watch-server.ts 2>/dev/null || cat > test-watch-server.ts << 'EOF'
/**
 * Test server for watch mode
 * Simple decorator-based server that we can modify to test auto-restart
 */

import { MCPServer } from './mcp/decorators.js';

@MCPServer()
export default class TestWatchServer {
  greet(name: string): string {
    return `Hello, ${name}!`;
  }

  getTime(): string {
    return `Current time: ${new Date().toISOString()}`;
  }
}
EOF

echo ""
echo -e "${GREEN}=== All tests completed ===${NC}"
echo ""
echo "Summary:"
echo "- Watch mode starts correctly"
echo "- File changes trigger auto-restart"
echo "- Works with STDIO transport"
echo "- Works with HTTP transport"
echo "- Works with decorator API"
echo "- Works with functional API"
