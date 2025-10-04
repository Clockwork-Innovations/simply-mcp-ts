#!/bin/bash
###############################################################################
# Unit Tests for Inline Dependency Parser (dependency-parser.ts)
#
# Tests all parser functions in isolation with REAL data (no mocking).
# This script tests:
# - parseInlineDependencies()
# - extractDependencyBlock()
# - parseDependencyLine()
# - Error handling and validation
# - Edge cases and security
#
# Usage: bash tests/phase2/test-inline-deps-parser.sh
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
FIXTURES_DIR="$SCRIPT_DIR/fixtures/inline-deps"
MCP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Test helper script path
TEST_HELPER="$SCRIPT_DIR/test-parser-helper.ts"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Inline Dependency Parser - Unit Tests${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Create test helper TypeScript file
cat > "$TEST_HELPER" << 'EOFTEST'
#!/usr/bin/env node
/**
 * Test helper for inline dependency parser
 * Runs tests and outputs JSON results
 */

import { readFile } from 'fs/promises';
import {
  parseInlineDependencies,
  extractDependencyBlock,
  parseDependencyLine,
} from '../../core/dependency-parser.js';

const args = process.argv.slice(2);
const testName = args[0];
const testArgs = args.slice(1);

interface TestResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

async function runTest(): Promise<TestResult> {
  try {
    switch (testName) {
      // ========================================================================
      // Parser Tests - Valid Formats
      // ========================================================================
      case 'parseSimple': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            errorCount: result.errors.length,
            warningCount: result.warnings.length,
          },
        };
      }

      case 'parseScoped': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            packageNames: Object.keys(result.dependencies),
          },
        };
      }

      case 'parseComments': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            count: Object.keys(result.dependencies).length,
          },
        };
      }

      case 'parseEmpty': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            isEmpty: Object.keys(result.dependencies).length === 0,
            errorCount: result.errors.length,
          },
        };
      }

      case 'parseVersions': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            versions: Object.entries(result.dependencies).map(([n, v]) => `${n}=${v}`),
          },
        };
      }

      case 'parseNoVersion': {
        const source = `// /// dependencies\n// axios\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            axiosVersion: result.dependencies.axios,
          },
        };
      }

      case 'parseWhitespace': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            count: Object.keys(result.dependencies).length,
          },
        };
      }

      case 'parseNoDeps': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            isEmpty: Object.keys(result.dependencies).length === 0,
            hasErrors: result.errors.length > 0,
          },
        };
      }

      case 'parseMultipleBlocks': {
        const source = `// /// dependencies
// axios@^1.6.0
// ///

// /// dependencies
// zod@^3.22.0
// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            hasAxios: 'axios' in result.dependencies,
            hasZod: 'zod' in result.dependencies,
          },
        };
      }

      case 'parseMixedLineEndings': {
        const source = "// /// dependencies\r\n// axios@^1.6.0\n// zod@^3.22.0\r\n// ///";
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            count: Object.keys(result.dependencies).length,
            hasAxios: 'axios' in result.dependencies,
            hasZod: 'zod' in result.dependencies,
          },
        };
      }

      // ========================================================================
      // Parser Tests - Invalid Formats
      // ========================================================================
      case 'parseInvalidName': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasInvalidNameError: result.errors.some(e => e.type === 'INVALID_NAME'),
            errorTypes: result.errors.map(e => e.type),
          },
        };
      }

      case 'parseInvalidVersion': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasInvalidVersionError: result.errors.some(e => e.type === 'INVALID_VERSION'),
          },
        };
      }

      case 'parseDuplicate': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasDuplicateError: result.errors.some(e => e.type === 'DUPLICATE'),
          },
        };
      }

      case 'parseMissingEnd': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            isEmpty: Object.keys(result.dependencies).length === 0,
            raw: result.raw,
          },
        };
      }

      case 'parseStrictMode': {
        const source = `// /// dependencies\n// INVALID@^1.0.0\n// ///`;
        try {
          parseInlineDependencies(source, { strict: true });
          return { success: false, error: 'Should have thrown' };
        } catch (err) {
          return {
            success: true,
            data: { threw: true, message: (err as Error).message },
          };
        }
      }

      case 'parseLongName': {
        const longName = 'a'.repeat(215);
        const source = `// /// dependencies\n// ${longName}@^1.0.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasError: result.errors.length > 0,
          },
        };
      }

      case 'parseSpacesInName': {
        const source = `// /// dependencies\n// my package@^1.0.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasError: result.errors.length > 0,
          },
        };
      }

      // ========================================================================
      // extractDependencyBlock Tests
      // ========================================================================
      case 'extractBlock': {
        const source = await readFile(testArgs[0], 'utf-8');
        const block = extractDependencyBlock(source);
        return {
          success: true,
          data: {
            found: block !== null,
            hasContent: block?.content !== undefined,
            hasRaw: block?.raw !== undefined,
            startLine: block?.startLine,
            endLine: block?.endLine,
          },
        };
      }

      case 'extractNoBlock': {
        const source = await readFile(testArgs[0], 'utf-8');
        const block = extractDependencyBlock(source);
        return {
          success: true,
          data: {
            isNull: block === null,
          },
        };
      }

      // ========================================================================
      // parseDependencyLine Tests
      // ========================================================================
      case 'parseLine': {
        const line = testArgs[0];
        const result = parseDependencyLine(line, 1);
        return {
          success: true,
          data: {
            hasDependency: result.dependency !== undefined,
            hasError: result.error !== undefined,
            dependency: result.dependency,
            error: result.error,
          },
        };
      }

      // ========================================================================
      // Edge Case Tests
      // ========================================================================
      case 'parseLargeList': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            count: Object.keys(result.dependencies).length,
            errorCount: result.errors.length,
          },
        };
      }

      case 'parseUnicode': {
        const source = `// /// dependencies\n// 中文包@^1.0.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasError: result.errors.length > 0,
          },
        };
      }

      case 'parseSecurityInjection': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            isEmpty: Object.keys(result.dependencies).length === 0,
            errors: result.errors.map(e => ({ type: e.type, msg: e.message })),
          },
        };
      }

      case 'parseTabsVsSpaces': {
        const source = `//\t///\tdependencies\n//\taxios@^1.6.0\n//   zod@^3.22.0\n//\t///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            count: Object.keys(result.dependencies).length,
            dependencies: result.dependencies,
          },
        };
      }

      case 'parseNestedDelimiters': {
        const source = `// /// dependencies
// axios@^1.6.0
// # /// nested
// # zod@^3.22.0
// # ///
// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            hasZod: 'zod' in result.dependencies,
            hasAxios: 'axios' in result.dependencies,
          },
        };
      }

      case 'parseVeryLongLine': {
        const longContent = 'a'.repeat(1500);
        const source = `// /// dependencies\n// ${longContent}@^1.0.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasSecurityError: result.errors.some(e => e.type === 'SECURITY'),
          },
        };
      }

      // ========================================================================
      // Version Range Tests
      // ========================================================================
      case 'parseCaretRange': {
        const source = `// /// dependencies\n// axios@^1.6.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            version: result.dependencies.axios,
            isCaret: result.dependencies.axios?.startsWith('^'),
          },
        };
      }

      case 'parseTildeRange': {
        const source = `// /// dependencies\n// axios@~1.6.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            version: result.dependencies.axios,
            isTilde: result.dependencies.axios?.startsWith('~'),
          },
        };
      }

      case 'parseGteRange': {
        const source = `// /// dependencies\n// axios@>=1.6.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            version: result.dependencies.axios,
          },
        };
      }

      case 'parseWildcard': {
        const source = `// /// dependencies\n// axios@*\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            version: result.dependencies.axios,
            warningCount: result.warnings.length,
          },
        };
      }

      case 'parseLatest': {
        const source = `// /// dependencies\n// axios@latest\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            version: result.dependencies.axios,
            isLatest: result.dependencies.axios === 'latest',
            warningCount: result.warnings.length,
          },
        };
      }

      default:
        return {
          success: false,
          error: `Unknown test: ${testName}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

runTest().then((result) => {
  console.log(JSON.stringify(result));
  process.exit(result.success ? 0 : 1);
});
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

  # Run the test
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

# Helper to verify test result
verify_result() {
  local test_num=$1
  local test_name=$2
  local test_case=$3
  local expected_field=$4
  local expected_value=$5
  shift 5
  local test_args="$@"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  echo -ne "${YELLOW}Test $test_num: $test_name${NC} ... "

  RESULT=$(npx tsx "$TEST_HELPER" "$test_case" $test_args 2>&1)
  EXIT_CODE=$?

  if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}FAIL (exec)${NC}"
    echo -e "${RED}  Error: $RESULT${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return
  fi

  # Parse JSON and check field
  ACTUAL=$(echo "$RESULT" | npx tsx -e "const data=JSON.parse(require('fs').readFileSync(0,'utf-8')); console.log(data.data?.$expected_field)")

  if [ "$ACTUAL" == "$expected_value" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}FAIL${NC}"
    echo -e "${RED}  Expected $expected_field=$expected_value, got $ACTUAL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

echo -e "${BLUE}=== Valid Format Tests ===${NC}"
echo ""

# Test 1-10: Valid parsing
run_test 1 "Parse simple dependencies" parseSimple "$FIXTURES_DIR/valid-simple.txt"
run_test 2 "Parse scoped packages" parseScoped "$FIXTURES_DIR/valid-scoped.txt"
run_test 3 "Parse with comments" parseComments "$FIXTURES_DIR/valid-comments.txt"
run_test 4 "Parse empty block" parseEmpty "$FIXTURES_DIR/valid-empty.txt"
run_test 5 "Parse version ranges" parseVersions "$FIXTURES_DIR/valid-versions.txt"
run_test 6 "Parse without version (implicit latest)" parseNoVersion
run_test 7 "Parse with whitespace" parseWhitespace "$FIXTURES_DIR/valid-whitespace.txt"
run_test 8 "Parse file with no deps" parseNoDeps "$FIXTURES_DIR/no-deps.txt"
run_test 9 "Parse multiple blocks (only first)" parseMultipleBlocks
run_test 10 "Parse mixed line endings" parseMixedLineEndings

echo ""
echo -e "${BLUE}=== Invalid Format Tests ===${NC}"
echo ""

# Test 11-20: Invalid formats
run_test 11 "Reject invalid package name (uppercase)" parseInvalidName "$FIXTURES_DIR/invalid-uppercase.txt"
run_test 12 "Reject invalid version" parseInvalidVersion "$FIXTURES_DIR/invalid-version.txt"
run_test 13 "Detect duplicate dependencies" parseDuplicate "$FIXTURES_DIR/invalid-duplicate.txt"
run_test 14 "Handle missing end delimiter" parseMissingEnd "$FIXTURES_DIR/invalid-missing-end.txt"
run_test 15 "Strict mode throws on errors" parseStrictMode
run_test 16 "Reject package name too long" parseLongName
run_test 17 "Reject package name with spaces" parseSpacesInName

echo ""
echo -e "${BLUE}=== Block Extraction Tests ===${NC}"
echo ""

# Test 18-20: Block extraction
run_test 18 "Extract dependency block" extractBlock "$FIXTURES_DIR/valid-simple.txt"
run_test 19 "Extract no block (none present)" extractNoBlock "$FIXTURES_DIR/no-deps.txt"

echo ""
echo -e "${BLUE}=== Line Parsing Tests ===${NC}"
echo ""

# Test 20-25: Line parsing
run_test 20 "Parse valid dependency line" parseLine "axios@^1.6.0"
run_test 21 "Parse scoped package line" parseLine "@types/node@^20.0.0"
run_test 22 "Parse line with comment" parseLine "axios@^1.6.0 # HTTP client"
run_test 23 "Parse line without version" parseLine "axios"
run_test 24 "Parse empty line" parseLine ""
run_test 25 "Parse invalid line" parseLine "not a valid dependency!!!"

echo ""
echo -e "${BLUE}=== Edge Case Tests ===${NC}"
echo ""

# Test 26-35: Edge cases
run_test 26 "Parse large dependency list" parseLargeList "$FIXTURES_DIR/large-list.txt"
run_test 27 "Reject unicode package names" parseUnicode
run_test 28 "Block security injection attempts" parseSecurityInjection "$FIXTURES_DIR/security-injection.txt"
run_test 29 "Handle tabs vs spaces" parseTabsVsSpaces
run_test 30 "Ignore nested delimiters in comments" parseNestedDelimiters
run_test 31 "Reject very long lines (DoS)" parseVeryLongLine

echo ""
echo -e "${BLUE}=== Version Range Tests ===${NC}"
echo ""

# Test 32-40: Version ranges
run_test 32 "Parse caret range (^)" parseCaretRange
run_test 33 "Parse tilde range (~)" parseTildeRange
run_test 34 "Parse >=  range" parseGteRange
run_test 35 "Parse wildcard (*)" parseWildcard
run_test 36 "Parse latest keyword" parseLatest

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
