#!/bin/bash
# Master Test Runner for MCP Framework
# Runs all transport test suites and generates a comprehensive report

# ============================================================================
# SECURITY: RECURSION DEPTH DETECTION
# ============================================================================
# Track recursion depth to prevent infinite spawning
export RUN_ALL_TESTS_DEPTH=${RUN_ALL_TESTS_DEPTH:-0}

# CRITICAL: Log every single invocation to persistent file for investigation
TRACE_FILE="/tmp/run-all-tests-trace.log"
echo "===========================================" >> "$TRACE_FILE"
echo "INVOCATION at $(date '+%Y-%m-%d %H:%M:%S.%N')" >> "$TRACE_FILE"
echo "PID: $$ | PPID: $PPID | Depth: $RUN_ALL_TESTS_DEPTH" >> "$TRACE_FILE"
echo "PWD: $(pwd)" >> "$TRACE_FILE"
echo "Args: $# => $@" >> "$TRACE_FILE"
echo "Call stack:" >> "$TRACE_FILE"
ps -ef | grep $$ >> "$TRACE_FILE" 2>&1
pstree -p $PPID >> "$TRACE_FILE" 2>&1 || true
echo "===========================================" >> "$TRACE_FILE"

# Function to log bash call stack
log_call_stack() {
  local i=0
  local FRAMES=${#BASH_SOURCE[@]}
  echo "========================================" >&2
  echo "RECURSION DETECTED - Call Stack Analysis" >&2
  echo "========================================" >&2
  echo "Recursion Depth: $RUN_ALL_TESTS_DEPTH" >&2
  echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S.%N')" >&2
  echo "PID: $$" >&2
  echo "PPID: $PPID" >&2
  echo "" >&2
  echo "Call Stack:" >&2
  for ((i=0; i<$FRAMES; i++)); do
    echo "  [$i] ${BASH_SOURCE[$i]}:${BASH_LINENO[$i]} ${FUNCNAME[$i]}" >&2
  done
  echo "" >&2
  echo "Process Tree:" >&2
  ps -ef | grep -E "(run-all-tests|simply-mcp|npm)" | grep -v grep >&2 || true
  echo "" >&2
  echo "Environment Variables:" >&2
  env | grep -E "RUN_ALL_TESTS|TEST|MCP|BASH" | sort >&2 || true
  echo "========================================" >&2
}

# Check recursion depth BEFORE doing anything else
if [ "$RUN_ALL_TESTS_DEPTH" -ge 2 ]; then
  echo "========================================"
  echo "ERROR: Recursive spawning detected!"
  echo "========================================"
  echo "This script has been called recursively $RUN_ALL_TESTS_DEPTH times."
  echo "This indicates a bug in the test infrastructure."
  echo ""
  log_call_stack
  echo ""
  echo "EMERGENCY: Killing all related processes..."
  pkill -9 -f "run-all-tests.sh" || true
  pkill -9 -f "simply-mcp run.*--watch" || true
  echo ""
  echo "Please investigate why this script is being spawned recursively."
  echo "Check the handoff document for known issues."
  exit 1
fi

# Increment depth counter
export RUN_ALL_TESTS_DEPTH=$((RUN_ALL_TESTS_DEPTH + 1))

# DEBUG: Log entry point
echo "[DEBUG:run-all-tests.sh] ========================================" >&2
echo "[DEBUG:run-all-tests.sh] Script Entry at depth $RUN_ALL_TESTS_DEPTH" >&2
echo "[DEBUG:run-all-tests.sh] PID: $$, PPID: $PPID" >&2
echo "[DEBUG:run-all-tests.sh] Timestamp: $(date '+%Y-%m-%d %H:%M:%S.%N')" >&2
echo "[DEBUG:run-all-tests.sh] Arguments: $# args => $@" >&2
echo "[DEBUG:run-all-tests.sh] Working dir: $(pwd)" >&2
echo "[DEBUG:run-all-tests.sh] ========================================" >&2

# Enable detailed bash tracing if DEBUG_TRACE is set
if [ -n "$DEBUG_TRACE" ]; then
  echo "[DEBUG:run-all-tests.sh] Enabling bash trace mode (-x)" >&2
  set -x
  # Enhanced PS4 prompt for better trace readability
  export PS4='+(${BASH_SOURCE}:${LINENO}): ${FUNCNAME[0]:+${FUNCNAME[0]}(): }'
fi

# ============================================================================
# SECURITY: Prevent recursive invocation and argument injection
# ============================================================================
if [ $# -gt 0 ]; then
  echo "ERROR: This script does not accept arguments" >&2
  echo "Usage: bash tests/run-all-tests.sh" >&2
  echo "" >&2
  echo "If you want to run specific tests, use:" >&2
  echo "  npm test                    # Run Jest unit tests" >&2
  echo "  bash tests/test-stdio.sh    # Run specific transport test" >&2
  exit 1
fi

# SECURITY: Prevent multiple instances from running simultaneously
LOCKFILE="/tmp/simply-mcp-tests.lock"
if [ -f "$LOCKFILE" ]; then
  LOCK_PID=$(cat "$LOCKFILE" 2>/dev/null)
  if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
    echo "ERROR: Test suite is already running (PID: $LOCK_PID)" >&2
    echo "If this is incorrect, remove: $LOCKFILE" >&2
    exit 1
  else
    # Stale lock file, remove it
    rm -f "$LOCKFILE"
  fi
fi

# Create lock file
echo $$ > "$LOCKFILE"
trap "rm -f '$LOCKFILE'" EXIT INT TERM

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

## Notes

All servers use the **Interface API** exclusively. See [QUICK_START.md](docs/guides/QUICK_START.md) for current usage.

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
