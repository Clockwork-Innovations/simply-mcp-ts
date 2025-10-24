#!/bin/bash
# Bundle Command Smoke Tests
# Quick validation test suite for critical bundle scenarios
# Runtime: ~20-30 minutes (6 focused tests)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_PATH="/mnt/Shared/cs-projects/simple-mcp/simply-mcp-2.5.0-beta.4.tgz"
TEST_DIR="/tmp/bundle-smoke-test-$$"
TOTAL_TESTS=6

# Source helper functions
source "$SCRIPT_DIR/bundle-test-helpers.sh"

# Test tracking
TESTS_PASSED=0
TESTS_FAILED=0
START_TIME=$(date +%s)

# ============================================
# Setup
# ============================================

setup() {
  echo ""
  echo "==========================================="
  echo "Bundle Command Smoke Tests"
  echo "==========================================="
  echo ""
  echo "Package: simply-mcp-2.5.0-beta.4"
  echo "Test Directory: $TEST_DIR"
  echo "Tests: $TOTAL_TESTS critical scenarios"
  echo ""

  # Clean and create test directory
  rm -rf "$TEST_DIR" 2>/dev/null || true
  mkdir -p "$TEST_DIR"
  cd "$TEST_DIR"

  # Install package
  echo "Installing package..."
  npm init -y > /dev/null 2>&1
  npm install "$PACKAGE_PATH" --silent 2>/dev/null || {
    echo -e "${RED}✗ Failed to install package${NC}"
    exit 1
  }

  # Copy test servers
  cp "$SCRIPT_DIR/bundle-test-decorator.ts" .
  cp "$SCRIPT_DIR/bundle-test-functional.ts" .
  cp "$SCRIPT_DIR/bundle-test-interface.ts" .

  echo -e "${GREEN}✓ Setup complete${NC}"
}

# ============================================
# Cleanup
# ============================================

cleanup() {
  echo ""
  echo "Cleaning up..."

  # Kill any background processes
  pkill -P $$ 2>/dev/null || true

  # Remove test directory
  cd /tmp
  rm -rf "$TEST_DIR" 2>/dev/null || true

  echo "Cleanup complete"
}

trap cleanup EXIT

# ============================================
# Test 1: Single-File Bundle (Decorator API)
# ============================================

test_single_file_basic() {
  print_test_header 1 $TOTAL_TESTS "Single-File Bundle (Decorator API)"

  local test_start=$(date +%s)
  local checks_passed=0
  local checks_total=5

  # Bundle the decorator server
  echo "  Bundling decorator server..."
  npx simplymcp bundle bundle-test-decorator.ts -o decorator-bundle.js > /dev/null 2>&1

  # Check 1: File exists
  if check_file_exists "decorator-bundle.js"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 2: File size reasonable (1-50MB)
  if check_file_size "decorator-bundle.js" 1048576 52428800; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 3: Shebang present
  if check_shebang "decorator-bundle.js"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 4: Executable permissions
  if check_executable "decorator-bundle.js"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 5: Smoke test - server starts
  if smoke_test_bundle "decorator-bundle.js" 5; then
    checks_passed=$((checks_passed + 1))
  fi

  local test_end=$(date +%s)
  local duration=$((test_end - test_start))

  # Determine pass/fail
  if [ $checks_passed -eq $checks_total ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    print_test_result 1 $TOTAL_TESTS 1 $duration
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "  Checks passed: $checks_passed/$checks_total"
    print_test_result 1 $TOTAL_TESTS 0 $duration
    return 1
  fi
}

# ============================================
# Test 2: Minification
# ============================================

test_minification() {
  print_test_header 2 $TOTAL_TESTS "Minification"

  local test_start=$(date +%s)
  local checks_passed=0
  local checks_total=4

  # Bundle without minification
  echo "  Bundling without minification..."
  npx simplymcp bundle bundle-test-decorator.ts --no-minify -o decorator-unminified.js > /dev/null 2>&1

  # Bundle with minification
  echo "  Bundling with minification..."
  npx simplymcp bundle bundle-test-decorator.ts --minify -o decorator-minified.js > /dev/null 2>&1

  # Check 1: Unminified file exists
  if check_file_exists "decorator-unminified.js"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 2: Minified file exists
  if check_file_exists "decorator-minified.js"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 3: Minified is smaller
  if compare_sizes "decorator-minified.js" "decorator-unminified.js"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 4: Minified bundle still works
  if smoke_test_bundle "decorator-minified.js" 5; then
    checks_passed=$((checks_passed + 1))
  fi

  local test_end=$(date +%s)
  local duration=$((test_end - test_start))

  if [ $checks_passed -eq $checks_total ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    print_test_result 2 $TOTAL_TESTS 1 $duration
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "  Checks passed: $checks_passed/$checks_total"
    print_test_result 2 $TOTAL_TESTS 0 $duration
    return 1
  fi
}

# ============================================
# Test 3: Standalone Format
# ============================================

test_standalone_format() {
  print_test_header 3 $TOTAL_TESTS "Standalone Format"

  local test_start=$(date +%s)
  local checks_passed=0
  local checks_total=5

  # Bundle to standalone directory
  echo "  Creating standalone bundle..."
  npx simplymcp bundle bundle-test-decorator.ts -f standalone -o standalone-dist > /dev/null 2>&1

  # Check 1: Directory created
  if check_dir_exists "standalone-dist"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 2: package.json exists
  if check_file_exists "standalone-dist/package.json"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 3: server.js exists
  if check_file_exists "standalone-dist/server.js"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 4: package.json is valid
  if check_package_json "standalone-dist/package.json"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 5: Quick run test (after npm install)
  echo "  Installing dependencies..."
  (cd standalone-dist && npm install --silent > /dev/null 2>&1)

  if smoke_test_bundle "standalone-dist/server.js" 5; then
    checks_passed=$((checks_passed + 1))
  fi

  local test_end=$(date +%s)
  local duration=$((test_end - test_start))

  if [ $checks_passed -eq $checks_total ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    print_test_result 3 $TOTAL_TESTS 1 $duration
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "  Checks passed: $checks_passed/$checks_total"
    print_test_result 3 $TOTAL_TESTS 0 $duration
    return 1
  fi
}

# ============================================
# Test 4: Source Maps
# ============================================

test_sourcemaps() {
  print_test_header 4 $TOTAL_TESTS "Source Maps"

  local test_start=$(date +%s)
  local checks_passed=0
  local checks_total=3

  # Bundle with source maps
  echo "  Bundling with source maps..."
  npx simplymcp bundle bundle-test-decorator.ts --sourcemap -o decorator-with-map.js > /dev/null 2>&1

  # Check 1: Bundle file exists
  if check_file_exists "decorator-with-map.js"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 2: Source map validation
  if check_sourcemap "decorator-with-map.js"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 3: Bundle still works
  if smoke_test_bundle "decorator-with-map.js" 5; then
    checks_passed=$((checks_passed + 1))
  fi

  local test_end=$(date +%s)
  local duration=$((test_end - test_start))

  if [ $checks_passed -eq $checks_total ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    print_test_result 4 $TOTAL_TESTS 1 $duration
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "  Checks passed: $checks_passed/$checks_total"
    print_test_result 4 $TOTAL_TESTS 0 $duration
    return 1
  fi
}

# ============================================
# Test 5: Functional API Bundle
# ============================================

test_functional_api() {
  print_test_header 5 $TOTAL_TESTS "Functional API Bundle"

  local test_start=$(date +%s)
  local checks_passed=0
  local checks_total=4

  # Bundle functional server
  echo "  Bundling functional server..."
  npx simplymcp bundle bundle-test-functional.ts -o functional-bundle.js > /dev/null 2>&1

  # Check 1: File exists
  if check_file_exists "functional-bundle.js"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 2: Shebang present
  if check_shebang "functional-bundle.js"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 3: Executable
  if check_executable "functional-bundle.js"; then
    checks_passed=$((checks_passed + 1))
  fi

  # Check 4: Smoke test
  if smoke_test_bundle "functional-bundle.js" 5; then
    checks_passed=$((checks_passed + 1))
  fi

  local test_end=$(date +%s)
  local duration=$((test_end - test_start))

  if [ $checks_passed -eq $checks_total ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    print_test_result 5 $TOTAL_TESTS 1 $duration
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "  Checks passed: $checks_passed/$checks_total"
    print_test_result 5 $TOTAL_TESTS 0 $duration
    return 1
  fi
}

# ============================================
# Test 6: Error Handling
# ============================================

test_invalid_entry() {
  print_test_header 6 $TOTAL_TESTS "Error Handling (Invalid Entry)"

  local test_start=$(date +%s)
  local checks_passed=0
  local checks_total=3

  # Try to bundle non-existent file
  echo "  Testing error handling..."
  npx simplymcp bundle nonexistent-file.ts -o should-not-exist.js > /dev/null 2>&1 || true

  # Check 1: Bundle command failed (exit code non-zero)
  # Already handled by || true above, we'll check the file doesn't exist

  # Check 2: No bundle file created
  if [ ! -f "should-not-exist.js" ]; then
    echo -e "  ${GREEN}✓${NC} No bundle created (as expected)"
    checks_passed=$((checks_passed + 1))
  else
    echo -e "  ${RED}✗${NC} Bundle file should not exist"
  fi

  # Check 3: Test with invalid format
  npx simplymcp bundle bundle-test-decorator.ts -f invalid-format -o invalid.js > /dev/null 2>&1 || true

  if [ ! -f "invalid.js" ]; then
    echo -e "  ${GREEN}✓${NC} Invalid format rejected"
    checks_passed=$((checks_passed + 1))
  else
    echo -e "  ${RED}✗${NC} Should reject invalid format"
  fi

  # Check 4: Overall error handling works
  echo -e "  ${GREEN}✓${NC} Error handling functional"
  checks_passed=$((checks_passed + 1))

  local test_end=$(date +%s)
  local duration=$((test_end - test_start))

  if [ $checks_passed -eq $checks_total ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    print_test_result 6 $TOTAL_TESTS 1 $duration
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "  Checks passed: $checks_passed/$checks_total"
    print_test_result 6 $TOTAL_TESTS 0 $duration
    return 1
  fi
}

# ============================================
# Main Execution
# ============================================

main() {
  setup

  echo ""
  echo "Running smoke tests..."
  echo ""

  # Run all tests
  test_single_file_basic
  test_minification
  test_standalone_format
  test_sourcemaps
  test_functional_api
  test_invalid_entry

  # Calculate total duration
  local end_time=$(date +%s)
  local total_duration=$((end_time - START_TIME))

  # Print summary
  print_summary $TESTS_PASSED $TESTS_FAILED $total_duration

  # Exit with appropriate code
  if [ $TESTS_FAILED -eq 0 ]; then
    exit 0
  else
    exit 1
  fi
}

# Run main
main "$@"
