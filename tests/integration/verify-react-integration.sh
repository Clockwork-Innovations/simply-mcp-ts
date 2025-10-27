#!/bin/bash

# React Compiler Integration Verification Script
#
# This script verifies that the React compiler integration is working correctly
# by running all relevant tests and checks.

set -e

echo "================================================"
echo "React Compiler Integration Verification"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Build the project
echo -e "${BLUE}[1/4] Building project...${NC}"
npm run build > /dev/null 2>&1
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Step 2: Verify compiled adapter includes React integration
echo -e "${BLUE}[2/4] Verifying compiled adapter...${NC}"
if grep -q "injectToolHelpersForReact" dist/src/adapters/ui-adapter.js; then
  echo -e "${GREEN}✓ React integration found in compiled adapter${NC}"
else
  echo "❌ React integration NOT found in compiled adapter"
  exit 1
fi
echo ""

# Step 3: Run integration test
echo -e "${BLUE}[3/4] Running integration test...${NC}"
if npx tsx tests/test-react-integration.ts > /tmp/react-test-output.log 2>&1; then
  echo -e "${GREEN}✓ Integration test passed${NC}"
  # Show summary
  grep -A 10 "=== All Tests Passed ===" /tmp/react-test-output.log || true
else
  echo "❌ Integration test failed"
  cat /tmp/react-test-output.log
  exit 1
fi
echo ""

# Step 4: Verify example files exist
echo -e "${BLUE}[4/4] Verifying example files...${NC}"
if [ -f examples/interface-react-component.ts ]; then
  echo -e "${GREEN}✓ Example server found${NC}"
else
  echo "❌ Example server NOT found"
  exit 1
fi

if [ -f examples/ui/Counter.tsx ]; then
  echo -e "${GREEN}✓ Example React component found${NC}"
else
  echo "❌ Example React component NOT found"
  exit 1
fi
echo ""

# Summary
echo "================================================"
echo -e "${GREEN}All Verification Checks Passed!${NC}"
echo "================================================"
echo ""
echo "React compiler integration is working correctly."
echo ""
echo "Quick Start:"
echo "  1. Create a React component in ui/YourComponent.tsx"
echo "  2. Define IUI interface with component field"
echo "  3. Run: npx simply-mcp run your-server.ts"
echo ""
echo "Example:"
echo "  npx simply-mcp run examples/interface-react-component.ts"
echo ""
