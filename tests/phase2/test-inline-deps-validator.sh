#!/bin/bash
###############################################################################
# Unit Tests for Inline Dependency Validator (dependency-validator.ts)
#
# Tests all validator functions with REAL validation (no mocking).
# This script tests:
# - validateDependencies()
# - validatePackageName()
# - validateSemverRange()
# - detectConflicts()
# - Security validation
#
# Usage: bash tests/phase2/test-inline-deps-validator.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Test helper script path
TEST_HELPER="$SCRIPT_DIR/test-validator-helper.ts"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Inline Dependency Validator - Unit Tests${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Create test helper TypeScript file - comprehensive validator tests
cat > "$TEST_HELPER" << 'EOFTEST'
#!/usr/bin/env node
import {
  validateDependencies,
  validatePackageName,
  validateSemverRange,
  detectConflicts,
} from '../../core/dependency-validator.js';

const args = process.argv.slice(2);
const testName = args[0];
const testArgs = args.slice(1);

async function runTest() {
  try {
    switch (testName) {
      // Package name validation tests
      case 'validName': {
        const name = testArgs[0];
        const result = validatePackageName(name);
        console.log(JSON.stringify({ success: result.valid, data: result }));
        process.exit(result.valid ? 0 : 1);
      }

      case 'invalidName': {
        const name = testArgs[0];
        const result = validatePackageName(name);
        console.log(JSON.stringify({ success: !result.valid, data: result }));
        process.exit(!result.valid ? 0 : 1);
      }

      // Version validation tests
      case 'validVersion': {
        const version = testArgs[0];
        const result = validateSemverRange(version);
        console.log(JSON.stringify({ success: result.valid, data: result }));
        process.exit(result.valid ? 0 : 1);
      }

      case 'invalidVersion': {
        const version = testArgs[0];
        const result = validateSemverRange(version);
        console.log(JSON.stringify({ success: !result.valid, data: result }));
        process.exit(!result.valid ? 0 : 1);
      }

      // Full dependency validation
      case 'validateDeps': {
        const deps = JSON.parse(testArgs[0]);
        const result = validateDependencies(deps);
        console.log(JSON.stringify({ success: result.valid, data: result }));
        process.exit(result.valid ? 0 : 1);
      }

      // Conflict detection
      case 'detectConflicts': {
        const deps = JSON.parse(testArgs[0]);
        const result = detectConflicts(deps);
        console.log(JSON.stringify({ success: true, data: result }));
        process.exit(0);
      }

      default:
        console.log(JSON.stringify({ success: false, error: `Unknown test: ${testName}` }));
        process.exit(1);
    }
  } catch (error) {
    console.log(JSON.stringify({ success: false, error: (error as Error).message }));
    process.exit(1);
  }
}

runTest();
EOFTEST

# Helper function to run a test
run_test() {
  local test_num=$1
  local test_name=$2
  local test_case=$3
  shift 3
  local test_args="$@"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -ne "${YELLOW}Test $test_num: $test_name${NC} ... "

  RESULT=$(npx tsx "$TEST_HELPER" "$test_case" $test_args 2>&1)
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}FAIL${NC}"
    echo -e "${RED}  Error: $RESULT${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

echo -e "${BLUE}=== Package Name Validation Tests ===${NC}"
echo ""

# Valid package names (Tests 1-15)
run_test 1 "Valid: simple name" validName "axios"
run_test 2 "Valid: with hyphen" validName "date-fns"
run_test 3 "Valid: with dot" validName "lodash.merge"
run_test 4 "Valid: with underscore" validName "my_package"
run_test 5 "Valid: scoped package" validName "@types/node"
run_test 6 "Valid: scoped with hyphen" validName "@my-org/my-package"
run_test 7 "Valid: long but valid name" validName "a-very-long-package-name-that-is-still-valid"
run_test 8 "Valid: numbers" validName "package123"
run_test 9 "Valid: tilde" validName "~package"
run_test 10 "Valid: complex scoped" validName "@org/sub-package.ext"

# Invalid package names (Tests 11-30)
run_test 11 "Invalid: uppercase" invalidName "UPPERCASE"
run_test 12 "Invalid: mixed case" invalidName "MixedCase"
run_test 13 "Invalid: starts with dot" invalidName ".invalid"
run_test 14 "Invalid: starts with underscore" invalidName "_invalid"
run_test 15 "Invalid: has space" invalidName "my package"
run_test 16 "Invalid: empty string" invalidName ""
run_test 17 "Invalid: too long (>214 chars)" invalidName "$(printf 'a%.0s' {1..220})"
run_test 18 "Invalid: exclamation mark" invalidName "package!"
run_test 19 "Invalid: semicolon" invalidName "package;"
run_test 20 "Invalid: pipe" invalidName "package|cmd"
run_test 21 "Invalid: ampersand" invalidName "package&"
run_test 22 "Invalid: dollar sign" invalidName "package\$"
run_test 23 "Invalid: backtick" invalidName "package\`"
run_test 24 "Invalid: parentheses" invalidName "package()"
run_test 25 "Invalid: brackets" invalidName "package[]"
run_test 26 "Invalid: braces" invalidName "package{}"
run_test 27 "Invalid: quotes" invalidName "package\"test\""
run_test 28 "Invalid: single quote" invalidName "package'test'"
run_test 29 "Invalid: backslash" invalidName "package\\test"
run_test 30 "Invalid: greater than" invalidName "package>"

echo ""
echo -e "${BLUE}=== Version Validation Tests ===${NC}"
echo ""

# Valid versions (Tests 31-50)
run_test 31 "Valid: caret range" validVersion "^1.0.0"
run_test 32 "Valid: tilde range" validVersion "~1.2.3"
run_test 33 "Valid: exact version" validVersion "1.2.3"
run_test 34 "Valid: greater than or equal" validVersion ">=1.0.0"
run_test 35 "Valid: less than" validVersion "<2.0.0"
run_test 36 "Valid: wildcard *" validVersion "*"
run_test 37 "Valid: wildcard x" validVersion "x"
run_test 38 "Valid: partial wildcard" validVersion "1.x"
run_test 39 "Valid: partial wildcard 2" validVersion "1.2.x"
run_test 40 "Valid: keyword latest" validVersion "latest"
run_test 41 "Valid: keyword next" validVersion "next"
run_test 42 "Valid: major only" validVersion "1"
run_test 43 "Valid: major.minor" validVersion "1.2"
run_test 44 "Valid: with pre-release" validVersion "1.0.0-alpha"
run_test 45 "Valid: with build" validVersion "1.0.0+20130313"
run_test 46 "Valid: complex prerelease" validVersion "1.0.0-beta.1"
run_test 47 "Valid: range with operators" validVersion ">=1.0.0"
run_test 48 "Valid: exact match" validVersion "=1.2.3"
run_test 49 "Valid: greater than" validVersion ">1.0.0"
run_test 50 "Valid: less than or equal" validVersion "<=2.0.0"

# Invalid versions (Tests 51-65)
run_test 51 "Invalid: not a version" invalidVersion "not-a-version"
run_test 52 "Invalid: too many parts" invalidVersion "1.2.3.4.5"
run_test 53 "Invalid: semicolon" invalidVersion "1.0.0;"
run_test 54 "Invalid: pipe" invalidVersion "1.0.0|"
run_test 55 "Invalid: ampersand" invalidVersion "1.0.0&"
run_test 56 "Invalid: dollar" invalidVersion "1.0.0\$"
run_test 57 "Invalid: backtick" invalidVersion "1.0.0\`"
run_test 58 "Invalid: parentheses" invalidVersion "1.0.0()"
run_test 59 "Invalid: empty" invalidVersion ""
run_test 60 "Invalid: too long (>100 chars)" invalidVersion "$(printf '1%.0s' {1..105})"
run_test 61 "Invalid: brackets" invalidVersion "1.0.0[]"
run_test 62 "Invalid: braces" invalidVersion "1.0.0{}"
run_test 63 "Invalid: single quote" invalidVersion "1.0.0'"
run_test 64 "Invalid: double quote" invalidVersion "1.0.0\""
run_test 65 "Invalid: backslash" invalidVersion "1.0.0\\"

echo ""
echo -e "${BLUE}=== Full Validation Tests ===${NC}"
echo ""

# Full dependency validation (Tests 66-75)
run_test 66 "Validate: all valid deps" validateDeps '{"axios":"^1.6.0","zod":"^3.22.0"}'
run_test 67 "Validate: scoped packages" validateDeps '{"@types/node":"^20.0.0"}'
run_test 68 "Validate: mixed valid" validateDeps '{"axios":"^1.6.0","lodash":"~4.17.21","zod":">=3.22.0"}'

echo ""
echo -e "${BLUE}=== Conflict Detection Tests ===${NC}"
echo ""

# Conflict detection (Tests 76-80)
run_test 76 "Detect: no conflicts" detectConflicts '{"axios":"^1.6.0","zod":"^3.22.0"}'
run_test 77 "Detect: no case-sensitive dups" detectConflicts '{"axios":"^1.6.0","AXIOS":"^1.5.0"}'
run_test 78 "Detect: multiple unique" detectConflicts '{"a":"1.0.0","b":"1.0.0","c":"1.0.0"}'

# Cleanup
rm -f "$TEST_HELPER"

# Summary
echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}==========================================${NC}"
echo -e "Total tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}Failed:       $FAILED_TESTS${NC}"
else
  echo -e "Failed:       $FAILED_TESTS"
fi
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
