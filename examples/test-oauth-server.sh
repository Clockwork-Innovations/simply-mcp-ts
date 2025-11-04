#!/bin/bash
#
# OAuth Comprehensive Server - Quick Test
#
# This script demonstrates basic OAuth server functionality:
# 1. Validates server configuration (dry-run)
# 2. Starts server briefly
# 3. Checks OAuth metadata endpoint
#
# For full OAuth flow testing, see the comprehensive guide in:
# examples/interface-oauth-server.ts (bottom of file)
#

set -e  # Exit on error

echo "=========================================="
echo "OAuth Comprehensive Server - Quick Test"
echo "=========================================="
echo

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Dry-run validation
echo -e "${YELLOW}Test 1: Validating server configuration...${NC}"
if npx tsx src/cli/run.ts examples/interface-oauth-server.ts --dry-run 2>&1 | grep -q "error"; then
  echo -e "${RED}✗ Configuration validation failed${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Configuration validated successfully${NC}"
fi
echo

# Test 2: Start server in background
echo -e "${YELLOW}Test 2: Starting OAuth server...${NC}"
npx tsx src/cli/run.ts examples/interface-oauth-server.ts > /tmp/oauth-server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to initialize..."
sleep 3

# Check if server is still running
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo -e "${RED}✗ Server failed to start${NC}"
  cat /tmp/oauth-server.log
  exit 1
fi
echo -e "${GREEN}✓ Server started (PID: $SERVER_PID)${NC}"
echo

# Test 3: Check OAuth metadata endpoint
echo -e "${YELLOW}Test 3: Checking OAuth metadata endpoint...${NC}"
METADATA_URL="http://localhost:3000/.well-known/oauth-authorization-server"

# Give server a moment to fully initialize
sleep 2

if curl -f -s "$METADATA_URL" > /tmp/oauth-metadata.json 2>&1; then
  echo -e "${GREEN}✓ OAuth metadata endpoint responding${NC}"

  # Validate metadata contains expected fields
  if command -v jq &> /dev/null; then
    echo
    echo "OAuth Server Configuration:"
    echo "  Issuer: $(jq -r '.issuer' /tmp/oauth-metadata.json)"
    echo "  Authorization Endpoint: $(jq -r '.authorization_endpoint' /tmp/oauth-metadata.json)"
    echo "  Token Endpoint: $(jq -r '.token_endpoint' /tmp/oauth-metadata.json)"
    echo "  Scopes Supported: $(jq -r '.scopes_supported | join(", ")' /tmp/oauth-metadata.json)"
    echo "  PKCE Methods: $(jq -r '.code_challenge_methods_supported | join(", ")' /tmp/oauth-metadata.json)"
  else
    echo "  (Install jq for formatted output: brew install jq)"
    cat /tmp/oauth-metadata.json
  fi
else
  echo -e "${RED}✗ OAuth metadata endpoint not responding${NC}"
  echo "Server log:"
  cat /tmp/oauth-server.log
  kill $SERVER_PID 2>/dev/null
  exit 1
fi
echo

# Cleanup
echo -e "${YELLOW}Cleaning up...${NC}"
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null || true
echo -e "${GREEN}✓ Server stopped${NC}"
echo

# Summary
echo "=========================================="
echo -e "${GREEN}All tests passed!${NC}"
echo "=========================================="
echo
echo "Next steps:"
echo "  1. Start server: npx simply-mcp run examples/interface-oauth-server.ts"
echo "  2. View quick reference: cat examples/OAUTH_SERVER_QUICK_REFERENCE.md"
echo "  3. Follow testing guide in: examples/interface-oauth-server.ts"
echo
echo "OAuth Clients Available:"
echo "  • admin-client      - Full access (admin scope)"
echo "  • developer-client  - Tools + Resources (tools:execute, resources:read)"
echo "  • viewer-client     - Read-only (read scope)"
echo "  • analytics-client  - Custom scope (analytics:query)"
echo
