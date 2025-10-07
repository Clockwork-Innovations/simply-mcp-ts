#!/bin/bash
# Quick Validation Script for simply-mcp
# Fast smoke test for developers - validates basic functionality
#
# Usage: bash scripts/quick-validate.sh

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
ORIGINAL_DIR=$(pwd)
TEST_DIR="/tmp/simply-mcp-quick-validate-$$"
TARBALL=""
FAILED=0

# Quick cleanup function
cleanup() {
  cd "$ORIGINAL_DIR" 2>/dev/null || true
  rm -rf "$TEST_DIR" 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Simple progress indicator
progress() {
  echo -e "${CYAN}→${NC} $1"
}

# Success indicator
success() {
  echo -e "${GREEN}✓${NC} $1"
}

# Error indicator
error() {
  echo -e "${RED}✗${NC} $1"
  FAILED=1
}

# Header
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  simply-mcp Quick Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Build
progress "Building package..."
if npm run build > /dev/null 2>&1; then
  success "Build successful"
else
  error "Build failed"
  exit 1
fi

# Step 2: Basic smoke tests
progress "Running basic smoke tests..."
if npm test > /dev/null 2>&1; then
  success "Tests passed"
else
  error "Tests failed"
fi

# Step 3: Create tarball
progress "Creating tarball..."
TARBALL=$(npm pack --quiet 2>&1 | tail -n 1)
if [ -f "$TARBALL" ]; then
  TARBALL_SIZE=$(du -h "$TARBALL" | cut -f1)
  success "Tarball created (${TARBALL_SIZE})"
else
  error "Failed to create tarball"
  exit 1
fi

# Step 4: Setup test environment
progress "Setting up test environment..."
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

npm init -y > /dev/null 2>&1
if npm install "$ORIGINAL_DIR/$TARBALL" --silent 2>&1; then
  success "Package installed from tarball"
else
  error "Failed to install from tarball"
  exit 1
fi

npm install --save-dev tsx --silent 2>&1

# Step 5: Test imports
progress "Testing imports..."

cat > test-imports.ts << 'EOF'
import { SimplyMCP, MCPServer, tool, defineConfig } from 'simply-mcp';
if (!SimplyMCP || !MCPServer || !tool || !defineConfig) {
  throw new Error('Import failed');
}
EOF

if npx tsx test-imports.ts > /dev/null 2>&1; then
  success "New imports work"
else
  error "New imports failed"
fi

# Test backward compatibility
cat > test-old-imports.ts << 'EOF'
import { tool } from 'simply-mcp/decorators';
import { defineConfig } from 'simply-mcp/config';
if (!tool || !defineConfig) {
  throw new Error('Old import failed');
}
EOF

if npx tsx test-old-imports.ts > /dev/null 2>&1; then
  success "Old imports work (backward compatible)"
else
  error "Old imports failed"
fi

# Step 6: Test decorator example
progress "Testing decorator API..."

cat > example-decorator.ts << 'EOF'
import { MCPServer, tool } from 'simply-mcp';

@MCPServer({ name: 'quick-test', version: '1.0.0' })
class QuickTestServer {
  @tool('Add two numbers')
  async add(a: number, b: number): Promise<number> {
    return a + b;
  }

  @tool('Multiply two numbers')
  async multiply(a: number, b: number): Promise<number> {
    return a * b;
  }
}

export default QuickTestServer;
EOF

if npx simplymcp-class example-decorator.ts --dry-run > /dev/null 2>&1; then
  success "Decorator API works"
else
  error "Decorator API failed"
fi

# Step 7: Test functional API
progress "Testing functional API..."

cat > example-functional.ts << 'EOF'
import { SimplyMCP } from 'simply-mcp';

const server = new SimplyMCP({
  name: 'quick-test-func',
  version: '1.0.0'
});

server.addTool({
  name: 'calculate',
  description: 'Calculate something',
  parameters: {
    type: 'object',
    properties: {
      x: { type: 'number' },
      y: { type: 'number' }
    },
    required: ['x', 'y']
  },
  execute: async ({ x, y }) => ({ result: x + y })
});

console.log('Functional server created');
EOF

if npx tsx example-functional.ts > /dev/null 2>&1; then
  success "Functional API works"
else
  error "Functional API failed"
fi

# Step 8: Test CLI commands
progress "Testing CLI commands..."

if npx simplymcp --version > /dev/null 2>&1; then
  success "CLI commands work"
else
  error "CLI commands failed"
fi

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  ✓ Quick validation passed!${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${GREEN}Package looks good!${NC}"
  echo ""
  echo -e "Run full validation:"
  echo -e "  ${CYAN}bash scripts/pre-release-test.sh${NC}"
  echo ""
  echo -e "Run integration tests:"
  echo -e "  ${CYAN}bash scripts/integration-test.sh${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}${BOLD}  ✗ Quick validation failed${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${RED}Some checks failed. Please fix issues before proceeding.${NC}"
  echo ""
  exit 1
fi
