#!/bin/bash
# Master Test Runner for MCP Framework
# Runs all transport test suites and generates a comprehensive report

echo "==========================================="
echo "  MCP Framework - Master Test Runner"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test tracking
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Results storage
declare -A SUITE_RESULTS
declare -A SUITE_PASSED
declare -A SUITE_FAILED
declare -A SUITE_TOTAL
declare -A SUITE_DURATION

START_TIME=$(date +%s)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to run a test suite
run_suite() {
  local suite_name=$1
  local script_path=$2

  echo ""
  echo -e "${BLUE}=========================================${NC}"
  echo -e "${BLUE}Running: ${suite_name}${NC}"
  echo -e "${BLUE}=========================================${NC}"

  ((TOTAL_SUITES++))

  local suite_start=$(date +%s)

  # Run the test suite
  if bash "$script_path"; then
    SUITE_RESULTS[$suite_name]="PASS"
    ((PASSED_SUITES++))
    echo -e "${GREEN}✓ ${suite_name} PASSED${NC}"
  else
    SUITE_RESULTS[$suite_name]="FAIL"
    ((FAILED_SUITES++))
    echo -e "${RED}✗ ${suite_name} FAILED${NC}"
  fi

  local suite_end=$(date +%s)
  SUITE_DURATION[$suite_name]=$((suite_end - suite_start))

  # Extract test counts from output (captured during run)
  # This is a simplified version - actual counts would need to be parsed
}

# Check if jq is available
if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}Warning: jq not found. Some tests may fail.${NC}"
  echo "Install jq: sudo apt-get install jq (Ubuntu/Debian) or brew install jq (macOS)"
  echo ""
fi

# Check if npx and tsx are available
if ! command -v npx &> /dev/null; then
  echo -e "${RED}Error: npx not found. Please install Node.js and npm.${NC}"
  exit 1
fi

echo "Starting test suite execution..."
echo "Timestamp: $TIMESTAMP"
echo ""

# Run all test suites
# NOTE: Deprecated tests for old APIs have been archived to tests/deprecated/
# Only Interface API tests are maintained going forward
run_suite "Stdio Transport" "tests/test-stdio.sh"
sleep 2  # Allow server cleanup
run_suite "Stateless HTTP Transport" "tests/test-stateless-http.sh"
sleep 2  # Allow server cleanup
run_suite "Stateful HTTP Transport" "tests/test-stateful-http.sh"
sleep 2  # Allow server cleanup
run_suite "HTTP Modes (Stateful/Stateless)" "tests/test-http-modes.sh"

END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

# Generate summary report
echo ""
echo "==========================================="
echo "  TEST EXECUTION COMPLETE"
echo "==========================================="
echo ""

# Calculate percentages
if [ $TOTAL_SUITES -gt 0 ]; then
  SUCCESS_RATE=$((PASSED_SUITES * 100 / TOTAL_SUITES))
else
  SUCCESS_RATE=0
fi

# Print results table
echo "Transport Test Results:"
echo "-------------------------------------------"
printf "% -30s | %s\n" "Test Suite" "Result"
echo "-------------------------------------------"

for suite in "Stdio Transport" "Stateless HTTP Transport" "Stateful HTTP Transport" "HTTP Modes (Stateful/Stateless)"; do
  result="${SUITE_RESULTS[$suite]}"
  duration="${SUITE_DURATION[$suite]}"

  if [ "$result" == "PASS" ]; then
    printf "% -30s | ${GREEN}✓ PASS${NC} (${duration}s)\n" "$suite"
  else
    printf "% -30s | ${RED}✗ FAIL${NC} (${duration}s)\n" "$suite"
  fi
done

echo "-------------------------------------------"
echo ""

# Summary statistics
echo "Summary Statistics:"
echo "-------------------------------------------"
echo "Total Test Suites:    $TOTAL_SUITES"
echo -e "Passed:               ${GREEN}$PASSED_SUITES${NC}"
echo -e "Failed:               ${RED}$FAILED_SUITES${NC}"
echo "Success Rate:         ${SUCCESS_RATE}%"
echo "Total Duration:       ${TOTAL_DURATION}s"
echo "-------------------------------------------"
echo ""

# Generate markdown report
REPORT_FILE="tests/TEST-REPORT.md"

cat > "$REPORT_FILE" << EOF
# MCP Framework - Transport Test Report

**Generated:** $TIMESTAMP
**Duration:** ${TOTAL_DURATION}s

## Summary

- **Total Test Suites:** $TOTAL_SUITES
- **Passed:** $PASSED_SUITES
- **Failed:** $FAILED_SUITES
- **Success Rate:** ${SUCCESS_RATE}%

## Test Results

| Transport Type | Status | Duration |
|----------------|--------|----------|
EOF

for suite in "Stdio Transport" "Stateless HTTP Transport" "Stateful HTTP Transport" "HTTP Modes (Stateful/Stateless)"; do
  result="${SUITE_RESULTS[$suite]}"
  duration="${SUITE_DURATION[$suite]}"

  if [ "$result" == "PASS" ]; then
    echo "| $suite | ✅ PASS | ${duration}s |" >> "$REPORT_FILE"
  else
    echo "| $suite | ❌ FAIL | ${duration}s |" >> "$REPORT_FILE"
  fi
done

cat >> "$REPORT_FILE" << EOF

## Test Categories

### 1. Stdio Transport
- **Type:** Standard input/output communication
- **Use Case:** CLI tools, local processes
- **Session:** Per-process
- **Tests:** Initialize, tools, prompts, resources, validation

### 2. Stateless HTTP Transport
- **Type:** HTTP without session persistence
- **Use Case:** Simple REST APIs, serverless functions
- **Session:** None (new transport per request)
- **Tests:** Independent requests, concurrent requests, no session tracking

### 3. Stateful HTTP Transport
- **Type:** HTTP with session management
- **Use Case:** Long-running applications, persistent connections
- **Session:** Tracked via Mcp-Session-Id header
- **Tests:** Session creation, reuse, isolation, termination, SSE streaming

### 4. HTTP Modes
- **Type:** Testing both stateful and stateless HTTP modes
- **Use Case:** Verify correct behavior of both modes
- **Session:** Varies by mode
- **Tests:** Mode-specific behavior, backwards compatibility

## Deprecated Tests

The following test suites have been archived to `tests/deprecated/`:
- **Decorator API** - Removed in v4.0.0 (archived to `tests/deprecated/decorator-api/`)
- **Functional API** - Removed in v4.0.0 (archived to `tests/deprecated/functional-api/`)
- **Auto-detect** - Removed in v4.0.0 (archived to `tests/deprecated/auto-detect/`)
- **Old Version Bug Fixes** - Archived to `tests/deprecated/old-versions/`

All servers now use the **Interface API** exclusively. See `docs/guides/QUICK_START.md` for current usage.

## Notes

EOF

if [ $FAILED_SUITES -eq 0 ]; then
  echo "All test suites passed successfully!" >> "$REPORT_FILE"
else
  echo "Some test suites failed. Please review the test output above." >> "$REPORT_FILE"
fi


echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Generated by MCP Framework Master Test Runner" >> "$REPORT_FILE"

echo -e "${GREEN}Report generated: $REPORT_FILE${NC}"
echo ""

# Exit with appropriate code
if [ $FAILED_SUITES -eq 0 ]; then
  echo -e "${GREEN}=========================================${NC}"
  echo -e "${GREEN}  ALL TEST SUITES PASSED!${NC}"
  echo -e "${GREEN}=========================================${NC}"
  exit 0
else
  echo -e "${RED}=========================================${NC}"
  echo -e "${RED}  SOME TEST SUITES FAILED${NC}"
  echo -e "${RED}=========================================${NC}"
  echo ""
  echo "Failed suites:"
  for suite in "${!SUITE_RESULTS[@]}"; do
    if [ "${SUITE_RESULTS[$suite]}" == "FAIL" ]; then
      echo -e "  ${RED}✗${NC} $suite"
    fi
  done
  exit 1
fi
