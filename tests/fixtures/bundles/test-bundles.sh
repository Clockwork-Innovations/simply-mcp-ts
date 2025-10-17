#!/bin/bash

# Bundle Execution Validation Script
# Tests all bundle fixtures with various configurations

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CLI_PATH="/mnt/Shared/cs-projects/simple-mcp/dist/src/cli/index.js"
FIXTURES_DIR="/mnt/Shared/cs-projects/simple-mcp/tests/fixtures/bundles"

echo -e "${BLUE}=== Bundle Execution Validation ===${NC}\n"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to run a test
run_test() {
    local test_name="$1"
    local command="$2"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    echo -ne "${YELLOW}Testing:${NC} $test_name ... "

    if eval "$command" > /tmp/bundle-test-$TESTS_TOTAL.log 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "  Error details in: /tmp/bundle-test-$TESTS_TOTAL.log"
        return 1
    fi
}

echo -e "${BLUE}1. Bundle Detection Tests${NC}\n"

run_test "Calculator bundle detection" \
    "node $CLI_PATH run $FIXTURES_DIR/calculator --style functional --verbose --dry-run | grep -q 'calculator-server'"

run_test "Weather bundle detection (bin field)" \
    "node $CLI_PATH run $FIXTURES_DIR/weather --style functional --verbose --dry-run | grep -q 'weather-server'"

run_test "DB Server bundle detection (main field)" \
    "node $CLI_PATH run $FIXTURES_DIR/db-server --style functional --verbose --dry-run | grep -q 'db-server'"

run_test "Variants bundle detection (module field)" \
    "node $CLI_PATH run $FIXTURES_DIR/variants --style functional --verbose --dry-run | grep -q 'variants-server'"

echo ""
echo -e "${BLUE}2. Entry Point Resolution Tests${NC}\n"

run_test "Calculator main field resolution" \
    "node $CLI_PATH run $FIXTURES_DIR/calculator --style functional --verbose --dry-run 2>&1 | grep -q 'src/server.ts'"

run_test "Weather bin field resolution" \
    "node $CLI_PATH run $FIXTURES_DIR/weather --style functional --verbose --dry-run 2>&1 | grep -q 'src/server.ts'"

run_test "DB Server main field at root" \
    "node $CLI_PATH run $FIXTURES_DIR/db-server --style functional --verbose --dry-run 2>&1 | grep -q 'index.ts'"

run_test "Variants module field resolution" \
    "node $CLI_PATH run $FIXTURES_DIR/variants --style functional --verbose --dry-run 2>&1 | grep -q 'src/server.ts'"

echo ""
echo -e "${BLUE}3. Tool Registration Tests${NC}\n"

run_test "Calculator tools loaded" \
    "node $CLI_PATH run $FIXTURES_DIR/calculator --style functional --verbose --dry-run 2>&1 | grep -q 'Loaded: 4 tools'"

run_test "Weather tools loaded" \
    "node $CLI_PATH run $FIXTURES_DIR/weather --style functional --verbose --dry-run 2>&1 | grep -q 'Loaded: 2 tools'"

run_test "DB Server tools loaded" \
    "node $CLI_PATH run $FIXTURES_DIR/db-server --style functional --verbose --dry-run 2>&1 | grep -q 'Loaded: 3 tools'"

run_test "Variants tools loaded" \
    "node $CLI_PATH run $FIXTURES_DIR/variants --style functional --verbose --dry-run 2>&1 | grep -q 'Loaded: 2 tools'"

echo ""
echo -e "${BLUE}4. Bundle Package Info Tests${NC}\n"

run_test "Calculator package version" \
    "node $CLI_PATH run $FIXTURES_DIR/calculator --style functional --verbose --dry-run 2>&1 | grep -q 'Package: calculator-server@1.0.0'"

run_test "Weather package version" \
    "node $CLI_PATH run $FIXTURES_DIR/weather --style functional --verbose --dry-run 2>&1 | grep -q 'Package: weather-server@2.0.0'"

run_test "DB Server package version" \
    "node $CLI_PATH run $FIXTURES_DIR/db-server --style functional --verbose --dry-run 2>&1 | grep -q 'Package: db-server@1.5.0'"

echo ""
echo -e "${BLUE}=== Test Summary ===${NC}\n"
echo -e "Total Tests:  $TESTS_TOTAL"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
    exit 1
else
    echo -e "Failed:       0"
    echo ""
    echo -e "${GREEN}✓ All bundle tests passed!${NC}"
    exit 0
fi
