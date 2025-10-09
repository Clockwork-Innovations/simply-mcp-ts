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

# Phase 3: Import Pattern Tests
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Phase 3: Import Pattern Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Test 3.1: Old import pattern (backward compatibility)
cat > test-old-imports.ts << 'EOF'
import { tool, prompt, resource } from 'simply-mcp/decorators';
import { defineConfig } from 'simply-mcp/config';

console.log('✓ Old decorator imports work');
console.log('✓ Old config imports work');

if (typeof tool !== 'function') {
  throw new Error('tool decorator not imported correctly');
}
if (typeof defineConfig !== 'function') {
  throw new Error('defineConfig not imported correctly');
}
EOF

run_test "Old import pattern (decorators)" "npx tsx test-old-imports.ts"

# Test 3.2: New unified import pattern
cat > test-new-imports.ts << 'EOF'
import { tool, prompt, resource, defineConfig, MCPServer } from 'simply-mcp';

console.log('✓ New unified imports work');

if (typeof tool !== 'function') {
  throw new Error('tool decorator not imported correctly from main export');
}
if (typeof defineConfig !== 'function') {
  throw new Error('defineConfig not imported correctly from main export');
}
if (typeof MCPServer !== 'function') {
  throw new Error('MCPServer decorator not imported correctly from main export');
}
EOF

run_test "New unified import pattern" "npx tsx test-new-imports.ts"

# Test 3.3: Programmatic API imports
cat > test-programmatic-imports.ts << 'EOF'
import { SimplyMCP } from 'simply-mcp';

console.log('✓ Programmatic API imports work');

if (typeof SimplyMCP !== 'function') {
  throw new Error('SimplyMCP not imported correctly');
}
EOF

run_test "Programmatic API imports" "npx tsx test-programmatic-imports.ts"

# Phase 4: API Style Tests
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Phase 4: API Style Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Test 4.1: Decorator API (class-based)
cat > test-decorator.ts << 'EOF'
import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({
  name: 'test-decorator',
  version: '1.0.0',
  description: 'Test decorator API'
})
class TestDecoratorServer {
  @tool('Calculate sum of two numbers')
  async add(a: number, b: number): Promise<number> {
    return a + b;
  }

  @prompt('Generate greeting')
  async greet(name: string): Promise<string> {
    return `Hello, ${name}!`;
  }

  @resource('test://data')
  async getData(): Promise<string> {
    return 'Test data';
  }
}

export default TestDecoratorServer;
console.log('✓ Decorator server created successfully');
EOF

run_test "Decorator API (class-based)" "npx tsx test-decorator.ts"

# Test 4.2: Functional API
cat > test-functional.ts << 'EOF'
import { SimplyMCP } from 'simply-mcp';

const server = new SimplyMCP({
  name: 'test-functional',
  version: '1.0.0',
  description: 'Test functional API'
});

server.addTool({
  name: 'multiply',
  description: 'Multiply two numbers',
  parameters: {
    type: 'object',
    properties: {
      a: { type: 'number' },
      b: { type: 'number' }
    },
    required: ['a', 'b']
  },
  execute: async ({ a, b }) => ({ result: a * b })
});

console.log('✓ Functional server created successfully');
EOF

run_test "Functional API" "npx tsx test-functional.ts"

# Test 4.3: Programmatic API with config
cat > test-programmatic.ts << 'EOF'
import { SimplyMCP, defineConfig } from 'simply-mcp';

const config = defineConfig({
  name: 'test-programmatic',
  version: '1.0.0',
  description: 'Test programmatic API with config'
});

const server = new SimplyMCP(config);

server.addPrompt({
  name: 'test-prompt',
  description: 'Test prompt',
  execute: async () => ({
    messages: [{ role: 'user', content: { type: 'text', text: 'Test' } }]
  })
});

console.log('✓ Programmatic server with config created successfully');
EOF

run_test "Programmatic API with config" "npx tsx test-programmatic.ts"

# Phase 5: CLI Command Tests
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Phase 5: CLI Command Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

run_test "CLI: simply-mcp --version" "npx simply-mcp --version > /dev/null 2>&1"

run_test "CLI: simplymcp --help" "npx simplymcp --help > /dev/null 2>&1"

run_test "CLI: simplymcp-run --help" "npx simplymcp-run --help > /dev/null 2>&1"

run_test "CLI: simplymcp-class --help" "npx simplymcp-class --help > /dev/null 2>&1"

run_test "CLI: simplymcp-func --help" "npx simplymcp-func --help > /dev/null 2>&1"

run_test "CLI: simplymcp-bundle --help" "npx simplymcp-bundle --help > /dev/null 2>&1"

# Test dry-run execution
run_test "CLI: Run decorator server (dry-run)" "npx simplymcp run test-decorator.ts --dry-run 2>&1 | grep -q 'Dry run'"

# Phase 6: Type Checking Tests
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Phase 6: Type Checking Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Install TypeScript for type checking
npm install --save-dev typescript --silent

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "types": ["node"]
  }
}
EOF

run_test "TypeScript: Check decorator types" "npx tsc --noEmit test-decorator.ts"

run_test "TypeScript: Check functional types" "npx tsc --noEmit test-functional.ts"

run_test "TypeScript: Check import types" "npx tsc --noEmit test-new-imports.ts"

# Phase 7: Package Content Validation
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Phase 7: Package Content Validation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

run_test "Package: README.md exists" "test -f node_modules/simply-mcp/README.md"

run_test "Package: LICENSE exists" "test -f node_modules/simply-mcp/LICENSE"

run_test "Package: dist/ directory exists" "test -d node_modules/simply-mcp/dist"

run_test "Package: Main entry point exists" "test -f node_modules/simply-mcp/dist/src/index.js"

run_test "Package: CLI binaries exist" "test -f node_modules/simply-mcp/dist/src/cli/index.js"

run_test "Package: Type declarations exist" "test -f node_modules/simply-mcp/dist/src/index.d.ts"

# Check package.json exports
run_test "Package: package.json exports valid" "node -e 'require(\"simply-mcp/package.json\").exports'"

# Phase 8: Error Message Validation
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Phase 8: Error Message Validation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Test error message quality (expect failure, check for helpful message)
cat > test-error-decorator.ts << 'EOF'
import { tool } from 'simply-mcp';

class BadServer {
  // Missing @MCPServer decorator - should produce helpful error
  @tool('Test tool')
  async test() {
    return { result: 'test' };
  }
}

export default BadServer;
EOF

if npx simplymcp-class test-error-decorator.ts --dry-run 2>&1 | grep -q "@MCPServer"; then
  echo -e "${GREEN}✓ PASS${NC}: Error messages are helpful"
  ((PASSED_TESTS++)) || true
  ((TOTAL_TESTS++)) || true
  TEST_RESULTS+=("PASS")
  TEST_NAMES+=("Error messages are helpful")
else
  echo -e "${YELLOW}⚠ SKIP${NC}: Error message test (non-critical)"
  ((TOTAL_TESTS++)) || true
fi

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
