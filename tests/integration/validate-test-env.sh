#!/bin/bash

################################################################################
# Test Environment Validator
# Validates prerequisites for watch mode tests
################################################################################

set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

errors=0
warnings=0

echo "=================================="
echo "Watch Mode Test Environment Check"
echo "=================================="
echo ""

# Check Node.js version
echo -n "Checking Node.js version... "
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

    if [ "$NODE_MAJOR" -ge 20 ]; then
        echo -e "${GREEN}✓${NC} v$NODE_VERSION (>= 20.0.0)"
    else
        echo -e "${RED}✗${NC} v$NODE_VERSION (need >= 20.0.0)"
        errors=$((errors + 1))
    fi
else
    echo -e "${RED}✗${NC} Node.js not found"
    errors=$((errors + 1))
fi

# Check npm
echo -n "Checking npm... "
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} v$NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    errors=$((errors + 1))
fi

# Check required commands
for cmd in bash ps pgrep pkill grep sed; do
    echo -n "Checking $cmd... "
    if command -v $cmd >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC} $cmd not found"
        errors=$((errors + 1))
    fi
done

# Check /tmp directory
echo -n "Checking /tmp directory... "
if [ -d "/tmp" ] && [ -w "/tmp" ]; then
    echo -e "${GREEN}✓${NC} writable"
else
    echo -e "${RED}✗${NC} /tmp not writable"
    errors=$((errors + 1))
fi

# Check tarball
echo -n "Checking tarball... "
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TARBALL="$PROJECT_ROOT/simply-mcp-2.5.0-beta.3.tgz"

if [ -f "$TARBALL" ]; then
    SIZE=$(du -h "$TARBALL" | cut -f1)
    echo -e "${GREEN}✓${NC} Found ($SIZE)"
else
    echo -e "${RED}✗${NC} Not found: $TARBALL"
    echo "    Run 'npm pack' in project root to create it"
    errors=$((errors + 1))
fi

# Check test script
echo -n "Checking test script... "
TEST_SCRIPT="$SCRIPT_DIR/test-watch-mode.sh"
if [ -f "$TEST_SCRIPT" ]; then
    if [ -x "$TEST_SCRIPT" ]; then
        echo -e "${GREEN}✓${NC} Executable"
    else
        echo -e "${YELLOW}⚠${NC} Not executable (run: chmod +x test-watch-mode.sh)"
        warnings=$((warnings + 1))
    fi
else
    echo -e "${RED}✗${NC} test-watch-mode.sh not found"
    errors=$((errors + 1))
fi

# Check available disk space
echo -n "Checking disk space... "
AVAILABLE=$(df /tmp | tail -1 | awk '{print $4}')
AVAILABLE_MB=$((AVAILABLE / 1024))

if [ "$AVAILABLE_MB" -gt 100 ]; then
    echo -e "${GREEN}✓${NC} ${AVAILABLE_MB}MB available"
else
    echo -e "${YELLOW}⚠${NC} Only ${AVAILABLE_MB}MB available (recommend > 100MB)"
    warnings=$((warnings + 1))
fi

# Summary
echo ""
echo "=================================="
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed${NC}"
    echo ""
    echo "Ready to run tests:"
    echo "  ./test-watch-mode.sh          # Run all tests"
    echo "  ./test-watch-mode.sh 1        # Run scenario 1"
    echo ""
    exit 0
elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠ Checks passed with warnings: $warnings${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Failed with $errors errors and $warnings warnings${NC}"
    echo ""
    exit 1
fi
