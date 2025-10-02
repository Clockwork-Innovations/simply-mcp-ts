#!/usr/bin/env bash

# Bundling Feature - Master Test Runner
# Runs all bundling tests (unit, integration, E2E)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
ENTRY_DETECTOR_EXIT=1
CONFIG_LOADER_EXIT=1
DEPENDENCY_RESOLVER_EXIT=1
INTEGRATION_EXIT=1
E2E_EXIT=1

echo ""
echo "========================================="
echo "Bundling Test Suite - Feature 4"
echo "========================================="
echo ""
echo "Running comprehensive test suite for bundling feature..."
echo ""

# Unit Tests
echo -e "${BLUE}>>> Running Entry Detector Unit Tests...${NC}"
echo "==========================================="
if bash "$SCRIPT_DIR/test-bundle-entry-detector.sh"; then
  ENTRY_DETECTOR_EXIT=0
  echo ""
else
  ENTRY_DETECTOR_EXIT=1
  echo ""
fi

echo ""
echo -e "${BLUE}>>> Running Config Loader Unit Tests...${NC}"
echo "==========================================="
if bash "$SCRIPT_DIR/test-bundle-config-loader.sh"; then
  CONFIG_LOADER_EXIT=0
  echo ""
else
  CONFIG_LOADER_EXIT=1
  echo ""
fi

echo ""
echo -e "${BLUE}>>> Running Dependency Resolver Unit Tests...${NC}"
echo "==========================================="
if bash "$SCRIPT_DIR/test-bundle-dependency-resolver.sh"; then
  DEPENDENCY_RESOLVER_EXIT=0
  echo ""
else
  DEPENDENCY_RESOLVER_EXIT=1
  echo ""
fi

# Integration Tests
echo ""
echo -e "${BLUE}>>> Running Integration Tests...${NC}"
echo "==========================================="
cd "$MCP_ROOT"
if npx vitest run tests/phase2/bundle-integration.test.ts; then
  INTEGRATION_EXIT=0
  echo ""
else
  INTEGRATION_EXIT=1
  echo ""
fi

# E2E Tests
echo ""
echo -e "${BLUE}>>> Running E2E Tests...${NC}"
echo "==========================================="
if bash "$SCRIPT_DIR/test-bundle-e2e.sh"; then
  E2E_EXIT=0
  echo ""
else
  E2E_EXIT=1
  echo ""
fi

# Summary Report
echo ""
echo "========================================="
echo "Bundling Test Suite - Summary Report"
echo "========================================="
echo ""

# Calculate totals
TOTAL_SUITES=5
PASSED_SUITES=0

if [ $ENTRY_DETECTOR_EXIT -eq 0 ]; then
  PASSED_SUITES=$((PASSED_SUITES + 1))
fi
if [ $CONFIG_LOADER_EXIT -eq 0 ]; then
  PASSED_SUITES=$((PASSED_SUITES + 1))
fi
if [ $DEPENDENCY_RESOLVER_EXIT -eq 0 ]; then
  PASSED_SUITES=$((PASSED_SUITES + 1))
fi
if [ $INTEGRATION_EXIT -eq 0 ]; then
  PASSED_SUITES=$((PASSED_SUITES + 1))
fi
if [ $E2E_EXIT -eq 0 ]; then
  PASSED_SUITES=$((PASSED_SUITES + 1))
fi

# Test suite results
echo "Test Suite Results:"
echo "-------------------"
if [ $ENTRY_DETECTOR_EXIT -eq 0 ]; then
  echo -e "Entry Detector:       ${GREEN}✓ PASS${NC} (20 tests)"
else
  echo -e "Entry Detector:       ${RED}✗ FAIL${NC}"
fi

if [ $CONFIG_LOADER_EXIT -eq 0 ]; then
  echo -e "Config Loader:        ${GREEN}✓ PASS${NC} (15 tests)"
else
  echo -e "Config Loader:        ${RED}✗ FAIL${NC}"
fi

if [ $DEPENDENCY_RESOLVER_EXIT -eq 0 ]; then
  echo -e "Dependency Resolver:  ${GREEN}✓ PASS${NC} (15 tests)"
else
  echo -e "Dependency Resolver:  ${RED}✗ FAIL${NC}"
fi

if [ $INTEGRATION_EXIT -eq 0 ]; then
  echo -e "Integration:          ${GREEN}✓ PASS${NC} (46 tests)"
else
  echo -e "Integration:          ${RED}✗ FAIL${NC}"
fi

if [ $E2E_EXIT -eq 0 ]; then
  echo -e "E2E:                  ${GREEN}✓ PASS${NC} (20 tests)"
else
  echo -e "E2E:                  ${RED}✗ FAIL${NC}"
fi

echo ""
echo "-------------------"
echo "Test Suites: $PASSED_SUITES/$TOTAL_SUITES passed"
echo "Total Tests: ~116 tests"
echo ""

# Overall result
if [ $ENTRY_DETECTOR_EXIT -eq 0 ] && [ $CONFIG_LOADER_EXIT -eq 0 ] && [ $DEPENDENCY_RESOLVER_EXIT -eq 0 ] && [ $INTEGRATION_EXIT -eq 0 ] && [ $E2E_EXIT -eq 0 ]; then
  echo -e "${GREEN}========================================="
  echo "✓ ALL TESTS PASSED"
  echo "=========================================${NC}"
  echo ""
  echo "Bundling feature is ready for review!"
  echo ""
  exit 0
else
  echo -e "${RED}========================================="
  echo "✗ SOME TESTS FAILED"
  echo "=========================================${NC}"
  echo ""
  echo "Please review failed test suites above."
  echo ""

  # Show which suites failed
  echo "Failed suites:"
  if [ $ENTRY_DETECTOR_EXIT -ne 0 ]; then
    echo "  - Entry Detector"
  fi
  if [ $CONFIG_LOADER_EXIT -ne 0 ]; then
    echo "  - Config Loader"
  fi
  if [ $DEPENDENCY_RESOLVER_EXIT -ne 0 ]; then
    echo "  - Dependency Resolver"
  fi
  if [ $INTEGRATION_EXIT -ne 0 ]; then
    echo "  - Integration"
  fi
  if [ $E2E_EXIT -ne 0 ]; then
    echo "  - E2E"
  fi
  echo ""

  exit 1
fi
