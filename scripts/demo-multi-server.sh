#!/bin/bash
# Multi-Server Demo Script
# Demonstrates the multi-server capabilities of SimplyMCP

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

CLI="node dist/src/cli/index.js"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SimplyMCP Multi-Server Demo${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: List with no servers
echo -e "${YELLOW}Step 1: List servers (should be empty)${NC}"
$CLI list
echo ""

# Step 2: Start multiple servers
echo -e "${YELLOW}Step 2: Start 3 servers simultaneously${NC}"
echo -e "${CYAN}Command: simplymcp run test-server1.ts test-server2.ts test-server3.ts --http --port 3000${NC}"
echo ""

$CLI run test-server1.ts test-server2.ts test-server3.ts --http --port 3000 &
MULTI_PID=$!

# Wait for servers to start
sleep 4

# Step 3: List running servers
echo ""
echo -e "${YELLOW}Step 3: List running servers${NC}"
$CLI list
echo ""

# Step 4: List with verbose output
echo -e "${YELLOW}Step 4: List with verbose output${NC}"
$CLI list --verbose
echo ""

# Step 5: List as JSON
echo -e "${YELLOW}Step 5: List as JSON${NC}"
$CLI list --json
echo ""

# Step 6: Stop one server by name
echo -e "${YELLOW}Step 6: Stop one server by name${NC}"
$CLI stop test-server2
sleep 1
echo ""

echo -e "${YELLOW}Verify remaining servers:${NC}"
$CLI list
echo ""

# Step 7: Stop all remaining servers
echo -e "${YELLOW}Step 7: Stop all remaining servers${NC}"
SIMPLYMCP_AUTO_CONFIRM=true $CLI stop all
sleep 1
echo ""

# Step 8: Verify all stopped
echo -e "${YELLOW}Step 8: Verify all servers stopped${NC}"
$CLI list
echo ""

# Cleanup
kill $MULTI_PID 2>/dev/null || true

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Demo complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
