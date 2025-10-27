#!/bin/bash
# Package Content Validation Script for simply-mcp
# Validates package structure, files, and configuration before publishing
#
# Usage: bash scripts/validate-package.sh

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

PASSED_CHECKS=0
FAILED_CHECKS=0
TOTAL_CHECKS=0
WARNING_CHECKS=0

# Arrays to track results
declare -a CHECK_RESULTS
declare -a CHECK_NAMES
declare -a CHECK_TYPES

# Function to run validation check
validate() {
  local check_name="$1"
  local check_command="$2"
  local check_type="${3:-ERROR}" # ERROR or WARNING

  ((TOTAL_CHECKS++)) || true

  if eval "$check_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $check_name"
    CHECK_RESULTS+=("PASS")
    CHECK_NAMES+=("$check_name")
    CHECK_TYPES+=("$check_type")
    ((PASSED_CHECKS++)) || true
    return 0
  else
    if [ "$check_type" == "WARNING" ]; then
      echo -e "${YELLOW}⚠${NC} $check_name"
      CHECK_RESULTS+=("WARN")
      CHECK_NAMES+=("$check_name")
      CHECK_TYPES+=("WARNING")
      ((WARNING_CHECKS++)) || true
      return 0
    else
      echo -e "${RED}✗${NC} $check_name"
      CHECK_RESULTS+=("FAIL")
      CHECK_NAMES+=("$check_name")
      CHECK_TYPES+=("ERROR")
      ((FAILED_CHECKS++)) || true
      return 1
    fi
  fi
}

# Header
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  simply-mcp Package Validation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check 1: Build Directory
echo -e "${BOLD}Checking Build Directory...${NC}"

validate "dist/ directory exists" "test -d dist"
validate "dist/src/ directory exists" "test -d dist/src"
validate "dist/src/cli/ directory exists" "test -d dist/src/cli"
validate "dist/src/core/ directory exists" "test -d dist/src/core"

# Check 2: Main Entry Points
echo ""
echo -e "${BOLD}Checking Main Entry Points...${NC}"

validate "Main entry point (index.js) exists" "test -f dist/src/index.js"
validate "Main type declarations (index.d.ts) exist" "test -f dist/src/index.d.ts"

# Check 3: CLI Binaries
echo ""
echo -e "${BOLD}Checking CLI Binaries...${NC}"

validate "Main CLI binary exists" "test -f dist/src/cli/index.js"
validate "Run binary exists" "test -f dist/src/cli/run-bin.js"
validate "Interface binary exists" "test -f dist/src/cli/interface-bin.js"
validate "Bundle binary exists" "test -f dist/src/cli/bundle-bin.js"

# Check executability (shebang)
validate "Main CLI has shebang" "head -n 1 dist/src/cli/index.js | grep -q '^#!'"
validate "Run binary has shebang" "head -n 1 dist/src/cli/run-bin.js | grep -q '^#!'"
validate "Interface binary has shebang" "head -n 1 dist/src/cli/interface-bin.js | grep -q '^#!'"
validate "Bundle binary has shebang" "head -n 1 dist/src/cli/bundle-bin.js | grep -q '^#!'"

# Check 4: Core Files
echo ""
echo -e "${BOLD}Checking Core Files...${NC}"

validate "Core config loader exists" "test -f dist/src/core/config-loader.js"
validate "Core handler manager exists" "test -f dist/src/core/HandlerManager.js"
validate "Core types exist" "test -f dist/src/types/index.d.ts"

# Check 5: package.json Validation
echo ""
echo -e "${BOLD}Checking package.json...${NC}"

validate "package.json exists" "test -f package.json"

# Parse and validate package.json fields
if [ -f package.json ]; then
  validate "package.json has name field" "node -e 'const p=require(\"./package.json\"); if(!p.name) process.exit(1)'"
  validate "package.json has version field" "node -e 'const p=require(\"./package.json\"); if(!p.version) process.exit(1)'"
  validate "package.json has description field" "node -e 'const p=require(\"./package.json\"); if(!p.description) process.exit(1)'"
  validate "package.json has main field" "node -e 'const p=require(\"./package.json\"); if(!p.main) process.exit(1)'"
  validate "package.json has types field" "node -e 'const p=require(\"./package.json\"); if(!p.types) process.exit(1)'"
  validate "package.json has exports field" "node -e 'const p=require(\"./package.json\"); if(!p.exports) process.exit(1)'"
  validate "package.json has bin field" "node -e 'const p=require(\"./package.json\"); if(!p.bin) process.exit(1)'"
  validate "package.json has files field" "node -e 'const p=require(\"./package.json\"); if(!p.files) process.exit(1)'"
  validate "package.json has license field" "node -e 'const p=require(\"./package.json\"); if(!p.license) process.exit(1)'"
  validate "package.json has repository field" "node -e 'const p=require(\"./package.json\"); if(!p.repository) process.exit(1)'"
fi

# Check 6: Exports Map Validation
echo ""
echo -e "${BOLD}Checking Exports Map...${NC}"

# Validate exports point to existing files
validate "Main export points to valid file" "node -e 'const p=require(\"./package.json\"); const fs=require(\"fs\"); if(!fs.existsSync(p.exports[\".\"].import)) process.exit(1)'"

# Check type declarations in exports
validate "Main export has types" "node -e 'const p=require(\"./package.json\"); const fs=require(\"fs\"); if(!fs.existsSync(p.exports[\".\"].types)) process.exit(1)'"

# Check 7: Bin Entries Validation
echo ""
echo -e "${BOLD}Checking Bin Entries...${NC}"

validate "simply-mcp bin points to valid file" "node -e 'const p=require(\"./package.json\"); const fs=require(\"fs\"); if(!fs.existsSync(p.bin[\"simply-mcp\"])) process.exit(1)'"
validate "simplymcp bin points to valid file" "node -e 'const p=require(\"./package.json\"); const fs=require(\"fs\"); if(!fs.existsSync(p.bin[\"simplymcp\"])) process.exit(1)'"
validate "simplymcp-run bin points to valid file" "node -e 'const p=require(\"./package.json\"); const fs=require(\"fs\"); if(!fs.existsSync(p.bin[\"simplymcp-run\"])) process.exit(1)'"
validate "simplymcp-interface bin points to valid file" "node -e 'const p=require(\"./package.json\"); const fs=require(\"fs\"); if(!fs.existsSync(p.bin[\"simplymcp-interface\"])) process.exit(1)'"
validate "simplymcp-bundle bin points to valid file" "node -e 'const p=require(\"./package.json\"); const fs=require(\"fs\"); if(!fs.existsSync(p.bin[\"simplymcp-bundle\"])) process.exit(1)'"

# Check 8: Dependencies Validation
echo ""
echo -e "${BOLD}Checking Dependencies...${NC}"

validate "Dependencies field exists" "node -e 'const p=require(\"./package.json\"); if(!p.dependencies) process.exit(1)'"
validate "@modelcontextprotocol/sdk in dependencies" "node -e 'const p=require(\"./package.json\"); if(!p.dependencies[\"@modelcontextprotocol/sdk\"]) process.exit(1)'"
validate "typescript in peerDependencies" "node -e 'const p=require(\"./package.json\"); if(!p.peerDependencies[\"typescript\"]) process.exit(1)'"
validate "tsx in peerDependencies" "node -e 'const p=require(\"./package.json\"); if(!p.peerDependencies[\"tsx\"]) process.exit(1)'"

# Check no dev dependencies leaked to dependencies
validate "No @types packages in dependencies" "node -e 'const p=require(\"./package.json\"); const deps=Object.keys(p.dependencies||{}); if(deps.some(d=>d.startsWith(\"@types/\")&&d!==\"@types/cors\"&&d!==\"@types/express\"&&d!==\"@types/yargs\")) process.exit(1)'"

# Check 9: Documentation Files
echo ""
echo -e "${BOLD}Checking Documentation Files...${NC}"

validate "README.md exists" "test -f README.md"
validate "README.md is not empty" "test -s README.md"
validate "LICENSE file exists" "test -f LICENSE"
validate "CHANGELOG or release notes exist" "test -f CHANGELOG.md || test -f docs/releases/RELEASE_NOTES_v2.5.0.md" "WARNING"

# Check 10: Files Field Validation
echo ""
echo -e "${BOLD}Checking Files Field (what gets published)...${NC}"

# Check that all files in "files" field exist
validate "All files field entries are valid" "node -e '
const p = require(\"./package.json\");
const fs = require(\"fs\");
const path = require(\"path\");

for (const file of p.files) {
  if (file === \"dist\" && !fs.existsSync(\"dist\")) {
    console.error(\"Missing: dist/\");
    process.exit(1);
  }
  if (file === \"README.md\" && !fs.existsSync(\"README.md\")) {
    console.error(\"Missing: README.md\");
    process.exit(1);
  }
  if (file === \"LICENSE\" && !fs.existsSync(\"LICENSE\")) {
    console.error(\"Missing: LICENSE\");
    process.exit(1);
  }
}
'"

# Check 11: Source Files (for debugging)
echo ""
echo -e "${BOLD}Checking Source Files (optional for debugging)...${NC}"

validate "src/ directory exists" "test -d src" "WARNING"
validate "Source files included in package" "node -e 'const p=require(\"./package.json\"); if(!p.files.some(f=>f.includes(\"src\"))) process.exit(1)'" "WARNING"

# Check 12: TypeScript Configuration
echo ""
echo -e "${BOLD}Checking TypeScript Configuration...${NC}"

validate "tsconfig.json exists" "test -f tsconfig.json"

# Check 13: Security and Size Checks
echo ""
echo -e "${BOLD}Checking Security and Size...${NC}"

# Check for sensitive files
validate "No .env files in dist/" "! find dist -name '.env*' -type f | grep -q ." "WARNING"
validate "No .git directory in dist/" "! test -d dist/.git" "WARNING"
validate "No node_modules in dist/" "! test -d dist/node_modules"

# Check package size
if command -v du > /dev/null 2>&1; then
  DIST_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
  echo -e "${CYAN}  dist/ size: ${DIST_SIZE}${NC}"
fi

# Check 14: Build Artifacts
echo ""
echo -e "${BOLD}Checking Build Artifacts...${NC}"

validate "No source .ts files in dist/" "! find dist -name '*.ts' ! -name '*.d.ts' -type f | grep -q ."
validate "Type declarations (.d.ts) present" "find dist -name '*.d.ts' -type f | grep -q ."
validate "JavaScript files (.js) present" "find dist -name '*.js' -type f | grep -q ."

# Check 15: Critical Exports
echo ""
echo -e "${BOLD}Checking Critical Exports...${NC}"

validate "Main module structure is valid" "test -f dist/src/index.js && test -s dist/src/index.js"

# Summary Report
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Package Validation Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Calculate success rate
if [ $TOTAL_CHECKS -gt 0 ]; then
  SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
else
  SUCCESS_RATE=0
fi

echo -e "Total Checks:   ${BOLD}${TOTAL_CHECKS}${NC}"
echo -e "Passed:         ${GREEN}${PASSED_CHECKS}${NC}"
echo -e "Failed:         ${RED}${FAILED_CHECKS}${NC}"
echo -e "Warnings:       ${YELLOW}${WARNING_CHECKS}${NC}"
echo -e "Success Rate:   ${BOLD}${SUCCESS_RATE}%${NC}"
echo ""

# Show warnings if any
if [ $WARNING_CHECKS -gt 0 ]; then
  echo -e "${YELLOW}Warnings (non-critical):${NC}"
  for i in "${!CHECK_NAMES[@]}"; do
    if [ "${CHECK_RESULTS[$i]}" == "WARN" ]; then
      echo -e "  ${YELLOW}⚠${NC} ${CHECK_NAMES[$i]}"
    fi
  done
  echo ""
fi

# Show failures if any
if [ $FAILED_CHECKS -gt 0 ]; then
  echo -e "${RED}Failed Checks:${NC}"
  for i in "${!CHECK_NAMES[@]}"; do
    if [ "${CHECK_RESULTS[$i]}" == "FAIL" ]; then
      echo -e "  ${RED}✗${NC} ${CHECK_NAMES[$i]}"
    fi
  done
  echo ""
fi

# Final verdict
if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}${BOLD}  ✓ PACKAGE VALIDATION PASSED${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
  echo ""

  if [ $WARNING_CHECKS -gt 0 ]; then
    echo -e "${YELLOW}Note: ${WARNING_CHECKS} warning(s) detected (non-critical)${NC}"
    echo ""
  fi

  echo -e "${GREEN}Package structure is valid and ready for publishing${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
  echo -e "${RED}${BOLD}  ✗ PACKAGE VALIDATION FAILED${NC}"
  echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${RED}Please fix the failed checks above before publishing${NC}"
  echo ""
  exit 1
fi
