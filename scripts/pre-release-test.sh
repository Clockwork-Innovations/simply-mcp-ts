#!/bin/bash
# Pre-Release Validation Script for simply-mcp
# Tests package installation from tarball before publishing to npm
#
# Usage: bash scripts/pre-release-test.sh [version]
# Example: bash scripts/pre-release-test.sh 2.5.0

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
VERSION=${1:-"2.5.0"}
ORIGINAL_DIR=$(pwd)
TEST_DIR="/tmp/simply-mcp-pre-release-test-$$"
TARBALL=""
PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=0

# Test tracking
declare -a TEST_RESULTS
declare -a TEST_NAMES

# Function to run a test and track results
run_test() {
  local test_name="$1"
  local test_command="$2"

  ((TOTAL_TESTS++)) || true
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}Test $TOTAL_TESTS: $test_name${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if eval "$test_command"; then
    echo -e "${GREEN}✓ PASS${NC}: $test_name"
    TEST_RESULTS+=("PASS")
    TEST_NAMES+=("$test_name")
    ((PASSED_TESTS++)) || true
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}: $test_name"
    TEST_RESULTS+=("FAIL")
    TEST_NAMES+=("$test_name")
    ((FAILED_TESTS++)) || true
    return 1
  fi
}

# Cleanup function
cleanup() {
  echo ""
  echo -e "${YELLOW}Cleaning up test environment...${NC}"
  cd "$ORIGINAL_DIR"
  rm -rf "$TEST_DIR"
  echo -e "${GREEN}Cleanup complete${NC}"
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Header
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  simply-mcp Pre-Release Validation for v${VERSION}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Original Directory: ${CYAN}${ORIGINAL_DIR}${NC}"
echo -e "Test Directory:     ${CYAN}${TEST_DIR}${NC}"
echo -e "Node Version:       ${CYAN}$(node --version)${NC}"
echo -e "NPM Version:        ${CYAN}$(npm --version)${NC}"
echo ""

# Phase 1: Build and Package
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Phase 1: Build and Package${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

run_test "Clean build directory" "npm run clean"

run_test "Build package" "npm run build"

run_test "Verify dist/ exists" "test -d dist"

run_test "Run existing test suite" "npm test"

echo ""
echo -e "${YELLOW}Creating package tarball...${NC}"
TARBALL=$(npm pack --quiet 2>&1 | tail -n 1)
echo -e "${GREEN}Created: ${TARBALL}${NC}"

run_test "Verify tarball created" "test -f ${TARBALL}"

# Get tarball size
TARBALL_SIZE=$(du -h "$TARBALL" | cut -f1)
echo -e "Tarball size: ${CYAN}${TARBALL_SIZE}${NC}"

# Phase 2: Setup Test Environment
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Phase 2: Setup Test Environment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

echo -e "${YELLOW}Creating test directory: ${TEST_DIR}${NC}"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

run_test "Initialize test project" "npm init -y > /dev/null 2>&1"

echo -e "${YELLOW}Installing from tarball...${NC}"
run_test "Install from tarball" "npm install ${ORIGINAL_DIR}/${TARBALL} --silent"

run_test "Verify package installed" "test -d node_modules/simply-mcp"

echo -e "${YELLOW}Installing test dependencies...${NC}"
run_test "Install tsx for testing" "npm install --save-dev tsx --silent"

# Phase 3: Interface-Driven API Tests
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Phase 3: Interface-Driven API Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Install TypeScript BEFORE interface tests (critical!)
echo -e "${YELLOW}Installing TypeScript for interface tests...${NC}"
npm install --save-dev typescript --silent

# Test 3.1: Type-only imports (should work without TypeScript runtime)
cat > test-type-imports.ts << 'EOF'
import type { ITool, IPrompt, IResource, IServer } from 'simply-mcp';

// Type-only imports should work fine
type MyTool = ITool;
type MyServer = IServer;

console.log('✓ Type-only imports work');
EOF

run_test "Type-only imports" "npx tsx test-type-imports.ts"

# Test 3.2: Minimal interface server
cat > test-interface-minimal.ts << 'EOF'
import type { ITool, IServer } from 'simply-mcp';

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person';
  params: { name: string };
  result: string;
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class implements TestServer {
  greet: GreetTool = async (params) => `Hello, ${params.name}!`;
}

console.log('✓ Interface server created successfully');
EOF

run_test "Interface-driven API (minimal)" "npx tsx test-interface-minimal.ts"

# Test 3.3: Interface server with multiple tools
cat > test-interface-multi.ts << 'EOF'
import type { ITool, IPrompt, IServer } from 'simply-mcp';

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: number; b: number };
  result: { sum: number };
}

interface GreetPrompt extends IPrompt {
  name: 'greet_prompt';
  description: 'Greeting template';
  template: 'Hello, {name}!';
}

interface MultiServer extends IServer {
  name: 'multi-test';
  version: '1.0.0';
}

export default class implements MultiServer {
  add: AddTool = async (params) => ({ sum: params.a + params.b });
}

console.log('✓ Multi-feature interface server created');
EOF

run_test "Interface-driven API (multi-tool)" "npx tsx test-interface-multi.ts"

# Test 3.4: defineConfig import
cat > test-define-config.ts << 'EOF'
import { defineConfig } from 'simply-mcp';

const config = defineConfig({
  name: 'test-config',
  version: '1.0.0',
  description: 'Test config definition'
});

if (!config.name || !config.version) {
  throw new Error('Config not created correctly');
}

console.log('✓ defineConfig works');
EOF

run_test "defineConfig utility" "npx tsx test-define-config.ts"

# Phase 4: CLI Command Tests
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Phase 4: CLI Command Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

run_test "CLI: simply-mcp --version" "npx simply-mcp --version > /dev/null 2>&1"

run_test "CLI: simplymcp --help" "npx simplymcp --help > /dev/null 2>&1"

run_test "CLI: simply-mcp-run --help" "npx simply-mcp-run --help > /dev/null 2>&1"

run_test "CLI: simply-mcp-bundle --help" "npx simply-mcp-bundle --help > /dev/null 2>&1"

# Test dry-run execution with interface server
run_test "CLI: Run interface server (dry-run)" "npx simplymcp run test-interface-minimal.ts --dry-run 2>&1 | grep -q 'Dry run'"

# Phase 5: Package Content Validation
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Phase 5: Package Content Validation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

run_test "Package: README.md exists" "test -f node_modules/simply-mcp/README.md"

run_test "Package: LICENSE exists" "test -f node_modules/simply-mcp/LICENSE"

run_test "Package: dist/ directory exists" "test -d node_modules/simply-mcp/dist"

run_test "Package: Main entry point exists" "test -f node_modules/simply-mcp/dist/src/index.js"

run_test "Package: CLI binaries exist" "test -f node_modules/simply-mcp/dist/src/cli/index.js"

run_test "Package: Type declarations exist" "test -f node_modules/simply-mcp/dist/src/index.d.ts"

# Check package.json exports
run_test "Package: package.json exports valid" "node -e 'require(\"simply-mcp/package.json\").exports'"

# Final Report
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Pre-Release Validation Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
  SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
else
  SUCCESS_RATE=0
fi

echo -e "Package:        ${CYAN}simply-mcp v${VERSION}${NC}"
echo -e "Tarball:        ${CYAN}${TARBALL}${NC}"
echo -e "Tarball Size:   ${CYAN}${TARBALL_SIZE}${NC}"
echo ""
echo -e "Total Tests:    ${BOLD}${TOTAL_TESTS}${NC}"
echo -e "Passed:         ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed:         ${RED}${FAILED_TESTS}${NC}"
echo -e "Success Rate:   ${BOLD}${SUCCESS_RATE}%${NC}"
echo ""

# Detailed results
if [ ${#TEST_NAMES[@]} -gt 0 ]; then
  echo -e "${BOLD}Test Results:${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  for i in "${!TEST_NAMES[@]}"; do
    if [ "${TEST_RESULTS[$i]}" == "PASS" ]; then
      printf "${GREEN}✓${NC} %s\n" "${TEST_NAMES[$i]}"
    else
      printf "${RED}✗${NC} %s\n" "${TEST_NAMES[$i]}"
    fi
  done
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
fi

# Final verdict
if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}${BOLD}  ✓ ALL PRE-RELEASE TESTS PASSED!${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${GREEN}Package is ready for release to npm${NC}"
  echo ""
  echo -e "Next steps:"
  echo -e "  1. Review the test results above"
  echo -e "  2. Update version: ${CYAN}npm version ${VERSION}${NC}"
  echo -e "  3. Create git tag: ${CYAN}git tag v${VERSION}${NC}"
  echo -e "  4. Publish to npm: ${CYAN}npm publish${NC}"
  echo -e "  5. Push to GitHub: ${CYAN}git push && git push --tags${NC}"
  echo ""
  echo -e "Or test with beta first:"
  echo -e "  1. Publish beta: ${CYAN}npm publish --tag beta${NC}"
  echo -e "  2. Test install: ${CYAN}npm install simply-mcp@beta${NC}"
  echo -e "  3. If good, publish stable: ${CYAN}npm publish${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
  echo -e "${RED}${BOLD}  ✗ SOME TESTS FAILED${NC}"
  echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${RED}Failed tests:${NC}"
  for i in "${!TEST_NAMES[@]}"; do
    if [ "${TEST_RESULTS[$i]}" == "FAIL" ]; then
      echo -e "  ${RED}✗${NC} ${TEST_NAMES[$i]}"
    fi
  done
  echo ""
  echo -e "${YELLOW}Please fix the failing tests before publishing${NC}"
  echo ""
  exit 1
fi
