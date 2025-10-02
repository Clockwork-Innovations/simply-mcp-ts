#!/bin/bash
###############################################################################
# Master Test Runner for Phase 2: Binary Content Feature
#
# Runs all Phase 2 tests in sequence and provides comprehensive reporting.
#
# Test suites:
# 1. Unit Tests (test-binary-helpers.sh) - Tests individual helper functions
# 2. Integration Tests (test-binary-integration.sh) - Tests SimpleMCP integration
# 3. End-to-End Tests (test-binary-e2e.sh) - Tests complete workflows
#
# Usage: bash mcp/tests/phase2/run-phase2-tests.sh
#
# Options:
#   --verbose    Show detailed output from each test
#   --stop-on-fail  Stop execution on first failure
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Options
VERBOSE=false
STOP_ON_FAIL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose)
            VERBOSE=true
            shift
            ;;
        --stop-on-fail)
            STOP_ON_FAIL=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Test suite counters
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Individual test counters (accumulated)
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test results array
declare -A SUITE_RESULTS

# Banner
echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                                                               ║${NC}"
echo -e "${MAGENTA}║       ${CYAN}Phase 2 Feature 1: Binary Content Support${MAGENTA}            ║${NC}"
echo -e "${MAGENTA}║       ${CYAN}Comprehensive Test Suite${MAGENTA}                            ║${NC}"
echo -e "${MAGENTA}║                                                               ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}Test Environment:${NC}"
echo -e "  Location: $(dirname $SCRIPT_DIR)"
echo -e "  Date: $(date)"
echo -e "  Node: $(node --version 2>/dev/null || echo 'Not found')"
echo -e "  Options: $([ "$VERBOSE" = true ] && echo 'verbose')$([ "$STOP_ON_FAIL" = true ] && echo ' stop-on-fail')"
echo ""

# Function to run a test suite
run_suite() {
    local suite_name="$1"
    local suite_script="$2"
    local suite_description="$3"

    TOTAL_SUITES=$((TOTAL_SUITES + 1))

    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}Suite $TOTAL_SUITES: $suite_description${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

    # Check if script exists
    if [ ! -f "$suite_script" ]; then
        echo -e "${RED}✗ Test script not found: $suite_script${NC}"
        FAILED_SUITES=$((FAILED_SUITES + 1))
        SUITE_RESULTS[$suite_name]="MISSING"
        return 1
    fi

    # Run the test suite
    local start_time=$(date +%s)
    local output_file="/tmp/phase2-$suite_name-$$.log"

    if [ "$VERBOSE" = true ]; then
        # Show output in real-time
        if bash "$suite_script"; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            echo -e "${GREEN}✓ Suite passed${NC} (${duration}s)"
            PASSED_SUITES=$((PASSED_SUITES + 1))
            SUITE_RESULTS[$suite_name]="PASS"

            # Extract test counts from output (if available)
            extract_test_counts "$output_file"
            return 0
        else
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            echo -e "${RED}✗ Suite failed${NC} (${duration}s)"
            FAILED_SUITES=$((FAILED_SUITES + 1))
            SUITE_RESULTS[$suite_name]="FAIL"

            if [ "$STOP_ON_FAIL" = true ]; then
                echo -e "${YELLOW}Stopping execution due to --stop-on-fail${NC}"
                exit 1
            fi
            return 1
        fi
    else
        # Capture output to file
        if bash "$suite_script" > "$output_file" 2>&1; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            echo -e "${GREEN}✓ Suite passed${NC} (${duration}s)"
            PASSED_SUITES=$((PASSED_SUITES + 1))
            SUITE_RESULTS[$suite_name]="PASS"

            # Extract test counts from output
            extract_test_counts "$output_file"

            # Clean up log file
            rm -f "$output_file"
            return 0
        else
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            echo -e "${RED}✗ Suite failed${NC} (${duration}s)"
            FAILED_SUITES=$((FAILED_SUITES + 1))
            SUITE_RESULTS[$suite_name]="FAIL"

            # Show last 20 lines of output
            echo -e "${YELLOW}Last 20 lines of output:${NC}"
            tail -n 20 "$output_file" | sed 's/^/  /'

            # Keep log file for debugging
            echo -e "${YELLOW}Full log saved to: $output_file${NC}"

            if [ "$STOP_ON_FAIL" = true ]; then
                echo -e "${YELLOW}Stopping execution due to --stop-on-fail${NC}"
                exit 1
            fi
            return 1
        fi
    fi
}

# Function to extract test counts from output
extract_test_counts() {
    local log_file="$1"

    if [ -f "$log_file" ]; then
        local total=$(grep -oP 'Total Tests:\s*\K\d+' "$log_file" | tail -1 || echo "0")
        local passed=$(grep -oP 'Passed:\s*\K\d+' "$log_file" | tail -1 || echo "0")
        local failed=$(grep -oP 'Failed:\s*\K\d+' "$log_file" | tail -1 || echo "0")

        if [ "$total" != "0" ]; then
            TOTAL_TESTS=$((TOTAL_TESTS + total))
            PASSED_TESTS=$((PASSED_TESTS + passed))
            FAILED_TESTS=$((FAILED_TESTS + failed))
        fi
    fi
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

echo -e "${BLUE}Pre-flight Checks:${NC}"

# Check if test assets exist
if [ ! -d "$SCRIPT_DIR/assets" ] || [ -z "$(ls -A $SCRIPT_DIR/assets 2>/dev/null)" ]; then
    echo -e "  ${YELLOW}⚠${NC} Test assets missing, generating..."

    if bash "$SCRIPT_DIR/generate-test-assets.sh" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Test assets generated"
    else
        echo -e "  ${RED}✗${NC} Failed to generate test assets"
        exit 1
    fi
else
    echo -e "  ${GREEN}✓${NC} Test assets exist"
fi

# Check if core files exist
if [ ! -f "$SCRIPT_DIR/../../core/content-helpers.ts" ]; then
    echo -e "  ${RED}✗${NC} content-helpers.ts not found"
    exit 1
else
    echo -e "  ${GREEN}✓${NC} content-helpers.ts exists"
fi

if [ ! -f "$SCRIPT_DIR/../../SimpleMCP.ts" ]; then
    echo -e "  ${RED}✗${NC} SimpleMCP.ts not found"
    exit 1
else
    echo -e "  ${GREEN}✓${NC} SimpleMCP.ts exists"
fi

if [ ! -f "$SCRIPT_DIR/../../examples/binary-content-demo.ts" ]; then
    echo -e "  ${RED}✗${NC} binary-content-demo.ts not found"
    exit 1
else
    echo -e "  ${GREEN}✓${NC} binary-content-demo.ts exists"
fi

echo -e "  ${GREEN}✓${NC} All pre-flight checks passed"

# ============================================================================
# Run Test Suites
# ============================================================================

echo ""
echo -e "${MAGENTA}Starting Test Execution...${NC}"

# Suite 1: Unit Tests
run_suite "unit" \
    "$SCRIPT_DIR/test-binary-helpers.sh" \
    "Unit Tests - Binary Content Helpers"

# Suite 2: Integration Tests
run_suite "integration" \
    "$SCRIPT_DIR/test-binary-integration.sh" \
    "Integration Tests - SimpleMCP Binary Content"

# Suite 3: End-to-End Tests
run_suite "e2e" \
    "$SCRIPT_DIR/test-binary-e2e.sh" \
    "End-to-End Tests - Complete Workflows"

# ============================================================================
# Final Summary
# ============================================================================

echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                                                               ║${NC}"
echo -e "${MAGENTA}║                    ${CYAN}FINAL TEST SUMMARY${MAGENTA}                         ║${NC}"
echo -e "${MAGENTA}║                                                               ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}Test Suites:${NC}"
echo -e "  Total Suites:   $TOTAL_SUITES"
echo -e "  ${GREEN}Passed Suites:  $PASSED_SUITES${NC}"
if [ $FAILED_SUITES -gt 0 ]; then
    echo -e "  ${RED}Failed Suites:  $FAILED_SUITES${NC}"
else
    echo -e "  Failed Suites:  $FAILED_SUITES"
fi
echo ""

echo -e "${BLUE}Individual Tests:${NC}"
echo -e "  Total Tests:    $TOTAL_TESTS"
echo -e "  ${GREEN}Passed Tests:   $PASSED_TESTS${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "  ${RED}Failed Tests:   $FAILED_TESTS${NC}"
else
    echo -e "  Failed Tests:   $FAILED_TESTS"
fi

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "  Success Rate:   ${success_rate}%"
fi

echo ""

echo -e "${BLUE}Suite Results:${NC}"
for suite in unit integration e2e; do
    local result="${SUITE_RESULTS[$suite]}"
    local symbol=""
    local color=""

    case "$result" in
        "PASS")
            symbol="✓"
            color="$GREEN"
            ;;
        "FAIL")
            symbol="✗"
            color="$RED"
            ;;
        "MISSING")
            symbol="⚠"
            color="$YELLOW"
            ;;
        *)
            symbol="?"
            color="$NC"
            ;;
    esac

    printf "  ${color}%s${NC} %-20s %s\n" "$symbol" "$suite" "$result"
done

echo ""

# Overall result
if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}║              ✓ ALL TESTS PASSED SUCCESSFULLY!                 ║${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Phase 2 Feature 1 implementation is verified and working correctly.${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                               ║${NC}"
    echo -e "${RED}║                 ✗ SOME TESTS FAILED                           ║${NC}"
    echo -e "${RED}║                                                               ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Review the test output above to identify failures.${NC}"
    echo -e "${YELLOW}Log files are preserved in /tmp/ for debugging.${NC}"
    echo ""
    exit 1
fi
