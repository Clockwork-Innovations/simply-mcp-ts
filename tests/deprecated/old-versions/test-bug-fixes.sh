#!/bin/bash
# Test runner for v2.4.5 bug fixes
# Runs the comprehensive bug fix test suite

echo "==========================================="
echo "  Simply-MCP v2.4.5 Bug Fixes Test Suite"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Running comprehensive bug fix tests...${NC}"
echo ""

# Build first to ensure latest changes
echo "Building package..."
npm run build > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo -e "${RED}Build failed! Cannot run tests.${NC}"
  exit 1
fi

echo "Build successful."
echo ""

# Run the TypeScript test suite
npx tsx tests/test-bug-fixes-v2.4.5.ts

TEST_RESULT=$?

echo ""

if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}==========================================${NC}"
  echo -e "${GREEN}  v2.4.5 BUG FIX TESTS PASSED!${NC}"
  echo -e "${GREEN}==========================================${NC}"
  exit 0
else
  echo -e "${RED}==========================================${NC}"
  echo -e "${RED}  v2.4.5 BUG FIX TESTS FAILED${NC}"
  echo -e "${RED}==========================================${NC}"
  exit 1
fi
