#!/bin/bash
# Bundle Test Helper Functions
# Provides reusable validation functions for bundle smoke tests

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if file exists
check_file_exists() {
  local file=$1
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} File exists: $file"
    return 0
  else
    echo -e "  ${RED}✗${NC} File missing: $file"
    return 1
  fi
}

# Check if directory exists
check_dir_exists() {
  local dir=$1
  if [ -d "$dir" ]; then
    echo -e "  ${GREEN}✓${NC} Directory exists: $dir"
    return 0
  else
    echo -e "  ${RED}✗${NC} Directory missing: $dir"
    return 1
  fi
}

# Check file size is reasonable
check_file_size() {
  local file=$1
  local min_size=${2:-1048576}      # Default 1MB
  local max_size=${3:-52428800}     # Default 50MB

  if [ ! -f "$file" ]; then
    echo -e "  ${RED}✗${NC} Cannot check size: file does not exist"
    return 1
  fi

  local size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null)
  local size_mb=$(echo "scale=1; $size / 1048576" | bc)

  if [ $size -lt $min_size ]; then
    echo -e "  ${RED}✗${NC} File too small: ${size_mb}MB (min: $(echo "scale=1; $min_size / 1048576" | bc)MB)"
    return 1
  elif [ $size -gt $max_size ]; then
    echo -e "  ${RED}✗${NC} File too large: ${size_mb}MB (max: $(echo "scale=1; $max_size / 1048576" | bc)MB)"
    return 1
  else
    echo -e "  ${GREEN}✓${NC} File size OK: ${size_mb}MB"
    return 0
  fi
}

# Check if file has shebang
check_shebang() {
  local file=$1

  if [ ! -f "$file" ]; then
    echo -e "  ${RED}✗${NC} Cannot check shebang: file does not exist"
    return 1
  fi

  if head -n 1 "$file" | grep -q "^#!/usr/bin/env node"; then
    echo -e "  ${GREEN}✓${NC} Shebang present"
    return 0
  else
    echo -e "  ${RED}✗${NC} Shebang missing or incorrect"
    return 1
  fi
}

# Check if file is executable
check_executable() {
  local file=$1

  if [ ! -f "$file" ]; then
    echo -e "  ${RED}✗${NC} Cannot check permissions: file does not exist"
    return 1
  fi

  if [ -x "$file" ]; then
    echo -e "  ${GREEN}✓${NC} File is executable"
    return 0
  else
    echo -e "  ${RED}✗${NC} File is not executable"
    return 1
  fi
}

# Smoke test: check if bundle runs without crashing
smoke_test_bundle() {
  local bundle=$1
  local timeout_sec=${2:-5}

  if [ ! -f "$bundle" ]; then
    echo -e "  ${RED}✗${NC} Cannot test: bundle does not exist"
    return 1
  fi

  # Start bundle in background
  timeout $timeout_sec node "$bundle" > /dev/null 2>&1 &
  local pid=$!

  # Give it a moment to start
  sleep 1

  # Check if process is still running
  if ps -p $pid > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Bundle starts without crashing"
    kill $pid 2>/dev/null
    wait $pid 2>/dev/null
    return 0
  else
    echo -e "  ${RED}✗${NC} Bundle crashed on startup"
    return 1
  fi
}

# Compare two file sizes (returns true if first is smaller)
compare_sizes() {
  local file1=$1
  local file2=$2

  if [ ! -f "$file1" ] || [ ! -f "$file2" ]; then
    echo -e "  ${RED}✗${NC} Cannot compare: one or both files missing"
    return 1
  fi

  local size1=$(stat -c%s "$file1" 2>/dev/null || stat -f%z "$file1" 2>/dev/null)
  local size2=$(stat -c%s "$file2" 2>/dev/null || stat -f%z "$file2" 2>/dev/null)

  local size1_mb=$(echo "scale=1; $size1 / 1048576" | bc)
  local size2_mb=$(echo "scale=1; $size2 / 1048576" | bc)

  if [ $size1 -lt $size2 ]; then
    local reduction=$(echo "scale=1; ($size2 - $size1) * 100 / $size2" | bc)
    echo -e "  ${GREEN}✓${NC} Size reduction: ${reduction}% (${size2_mb}MB → ${size1_mb}MB)"
    return 0
  else
    echo -e "  ${RED}✗${NC} No size reduction (${size2_mb}MB → ${size1_mb}MB)"
    return 1
  fi
}

# Check if package.json is valid JSON
check_package_json() {
  local pkg_file=$1

  if [ ! -f "$pkg_file" ]; then
    echo -e "  ${RED}✗${NC} package.json does not exist"
    return 1
  fi

  if command -v jq >/dev/null 2>&1; then
    if jq -e . "$pkg_file" >/dev/null 2>&1; then
      echo -e "  ${GREEN}✓${NC} package.json is valid JSON"
      return 0
    else
      echo -e "  ${RED}✗${NC} package.json is invalid JSON"
      return 1
    fi
  else
    # Fallback: just check if file is readable
    if [ -r "$pkg_file" ]; then
      echo -e "  ${YELLOW}⚠${NC} package.json exists (jq not available for validation)"
      return 0
    else
      echo -e "  ${RED}✗${NC} package.json is not readable"
      return 1
    fi
  fi
}

# Check if source map file exists and is valid
check_sourcemap() {
  local bundle=$1
  local map_file="${bundle}.map"

  if [ ! -f "$map_file" ]; then
    echo -e "  ${RED}✗${NC} Source map file does not exist"
    return 1
  fi

  echo -e "  ${GREEN}✓${NC} Source map file exists"

  # Check if bundle references the map
  if grep -q "sourceMappingURL" "$bundle"; then
    echo -e "  ${GREEN}✓${NC} Bundle contains sourceMappingURL"
  else
    echo -e "  ${YELLOW}⚠${NC} Bundle missing sourceMappingURL reference"
  fi

  # Validate map file is JSON (if jq available)
  if command -v jq >/dev/null 2>&1; then
    if jq -e '.version' "$map_file" >/dev/null 2>&1; then
      echo -e "  ${GREEN}✓${NC} Source map is valid JSON"
      return 0
    else
      echo -e "  ${RED}✗${NC} Source map is invalid"
      return 1
    fi
  fi

  return 0
}

# Wait for file to be created (with timeout)
wait_for_file() {
  local file=$1
  local timeout=${2:-10}
  local elapsed=0

  while [ ! -f "$file" ] && [ $elapsed -lt $timeout ]; do
    sleep 1
    elapsed=$((elapsed + 1))
  done

  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} File created within ${elapsed}s"
    return 0
  else
    echo -e "  ${RED}✗${NC} File not created after ${timeout}s"
    return 1
  fi
}

# Format duration in seconds to human readable
format_duration() {
  local seconds=$1

  if [ $seconds -lt 60 ]; then
    echo "${seconds}s"
  else
    local minutes=$((seconds / 60))
    local remaining=$((seconds % 60))
    echo "${minutes}m ${remaining}s"
  fi
}

# Print test section header
print_test_header() {
  local num=$1
  local total=$2
  local name=$3

  echo ""
  echo -e "${BLUE}[$num/$total] $name${NC}"
  echo "-------------------------------------------"
}

# Print test result
print_test_result() {
  local num=$1
  local total=$2
  local passed=$3
  local duration=$4

  if [ $passed -eq 1 ]; then
    echo -e "${GREEN}[$num/$total] ✓ PASSED${NC} (${duration}s)"
  else
    echo -e "${RED}[$num/$total] ✗ FAILED${NC} (${duration}s)"
  fi
  echo ""
}

# Print final summary
print_summary() {
  local passed=$1
  local failed=$2
  local total=$((passed + failed))
  local duration=$3

  echo ""
  echo "==========================================="
  echo "SUMMARY"
  echo "==========================================="
  echo ""
  echo "Total Tests:  $total"
  echo -e "Passed:       ${GREEN}$passed${NC}"
  if [ $failed -gt 0 ]; then
    echo -e "Failed:       ${RED}$failed${NC}"
  else
    echo -e "Failed:       $failed"
  fi
  echo "Duration:     $(format_duration $duration)"
  echo ""

  if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    echo ""
    return 0
  else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo ""
    return 1
  fi
}
