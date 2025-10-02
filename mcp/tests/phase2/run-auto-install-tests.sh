#!/usr/bin/env bash

# Auto-Installation Feature - Master Test Runner
# Runs all test suites for the auto-installation feature
# Test Suite Coverage: 100+ tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test suite exit codes
CHECKER_EXIT=0
DETECTOR_EXIT=0
INSTALLER_EXIT=0
INTEGRATION_EXIT=0
E2E_EXIT=0

# Header
echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}Auto-Installation Test Suite${NC}"
echo -e "${CYAN}SimpleMCP Phase 2, Feature 3${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "${BLUE}Test Coverage:${NC}"
echo "  - Dependency Checker:    20 unit tests"
echo "  - Package Manager:       15 unit tests"
echo "  - Dependency Installer:  25 unit tests"
echo "  - Integration Tests:     30 tests"
echo "  - E2E Tests:             10 tests"
echo "  ${BLUE}TOTAL: 100+ tests${NC}"
echo ""
echo -e "${YELLOW}Running all test suites...${NC}"
echo ""

# Check dependencies
echo -e "${BLUE}>>> Checking test dependencies...${NC}"
if ! command -v jq &> /dev/null; then
  echo -e "${RED}Error: jq is not installed. Please install jq to run tests.${NC}"
  exit 1
fi

if ! command -v npx &> /dev/null; then
  echo -e "${RED}Error: npx is not installed. Please install Node.js/npm.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Test dependencies satisfied${NC}"
echo ""

# Run Unit Tests - Dependency Checker
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}1/5: Running Dependency Checker Tests${NC}"
echo -e "${BLUE}=========================================${NC}"
if bash "$SCRIPT_DIR/test-auto-install-checker.sh"; then
  CHECKER_EXIT=0
else
  CHECKER_EXIT=$?
fi
echo ""

# Run Unit Tests - Package Manager Detector
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}2/5: Running Package Manager Detector Tests${NC}"
echo -e "${BLUE}=========================================${NC}"
if bash "$SCRIPT_DIR/test-auto-install-detector.sh"; then
  DETECTOR_EXIT=0
else
  DETECTOR_EXIT=$?
fi
echo ""

# Run Unit Tests - Dependency Installer
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}3/5: Running Dependency Installer Tests${NC}"
echo -e "${BLUE}=========================================${NC}"
if bash "$SCRIPT_DIR/test-auto-install-installer.sh"; then
  INSTALLER_EXIT=0
else
  INSTALLER_EXIT=$?
fi
echo ""

# Run Integration Tests
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}4/5: Running Integration Tests${NC}"
echo -e "${BLUE}=========================================${NC}"
cd "$MCP_ROOT"
if npx vitest run tests/phase2/auto-install-integration.test.ts; then
  INTEGRATION_EXIT=0
else
  INTEGRATION_EXIT=$?
fi
echo ""

# Run E2E Tests
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}5/5: Running E2E Tests${NC}"
echo -e "${BLUE}=========================================${NC}"
if bash "$SCRIPT_DIR/test-auto-install-e2e.sh"; then
  E2E_EXIT=0
else
  E2E_EXIT=$?
fi
echo ""

# Final Summary
echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}Test Suite Summary${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

# Individual suite results
if [ $CHECKER_EXIT -eq 0 ]; then
  echo -e "Checker Tests:      ${GREEN}✓ PASS${NC}"
else
  echo -e "Checker Tests:      ${RED}✗ FAIL${NC} (exit code: $CHECKER_EXIT)"
fi

if [ $DETECTOR_EXIT -eq 0 ]; then
  echo -e "Detector Tests:     ${GREEN}✓ PASS${NC}"
else
  echo -e "Detector Tests:     ${RED}✗ FAIL${NC} (exit code: $DETECTOR_EXIT)"
fi

if [ $INSTALLER_EXIT -eq 0 ]; then
  echo -e "Installer Tests:    ${GREEN}✓ PASS${NC}"
else
  echo -e "Installer Tests:    ${RED}✗ FAIL${NC} (exit code: $INSTALLER_EXIT)"
fi

if [ $INTEGRATION_EXIT -eq 0 ]; then
  echo -e "Integration Tests:  ${GREEN}✓ PASS${NC}"
else
  echo -e "Integration Tests:  ${RED}✗ FAIL${NC} (exit code: $INTEGRATION_EXIT)"
fi

if [ $E2E_EXIT -eq 0 ]; then
  echo -e "E2E Tests:          ${GREEN}✓ PASS${NC}"
else
  echo -e "E2E Tests:          ${RED}✗ FAIL${NC} (exit code: $E2E_EXIT)"
fi

echo ""

# Overall result
if [ $CHECKER_EXIT -eq 0 ] && [ $DETECTOR_EXIT -eq 0 ] && [ $INSTALLER_EXIT -eq 0 ] && [ $INTEGRATION_EXIT -eq 0 ] && [ $E2E_EXIT -eq 0 ]; then
  echo -e "${GREEN}=========================================${NC}"
  echo -e "${GREEN}✓ ALL TESTS PASSED (100%)${NC}"
  echo -e "${GREEN}=========================================${NC}"
  echo ""
  echo -e "${GREEN}Feature 3 (Auto-Installation) is ready for review!${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}=========================================${NC}"
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  echo -e "${RED}=========================================${NC}"
  echo ""
  echo -e "${YELLOW}Failed Test Suites:${NC}"

  if [ $CHECKER_EXIT -ne 0 ]; then
    echo -e "  ${RED}✗${NC} Dependency Checker Tests"
  fi
  if [ $DETECTOR_EXIT -ne 0 ]; then
    echo -e "  ${RED}✗${NC} Package Manager Detector Tests"
  fi
  if [ $INSTALLER_EXIT -ne 0 ]; then
    echo -e "  ${RED}✗${NC} Dependency Installer Tests"
  fi
  if [ $INTEGRATION_EXIT -ne 0 ]; then
    echo -e "  ${RED}✗${NC} Integration Tests"
  fi
  if [ $E2E_EXIT -ne 0 ]; then
    echo -e "  ${RED}✗${NC} E2E Tests"
  fi

  echo ""
  echo -e "${YELLOW}Please fix failing tests before proceeding.${NC}"
  echo ""
  exit 1
fi
