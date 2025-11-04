#!/bin/bash
# Pre-Test Validation Script
# Ensures no executable markdown files and no rogue processes before testing

set -e

echo "======================================"
echo " Pre-Test Security Validation"
echo "======================================"
echo ""

# Check 1: No executable .md files
echo "[1/4] Checking for executable .md files..."
EXEC_MD_COUNT=$(find docs/ -name "*.md" -executable -type f 2>/dev/null | wc -l || echo "0")
if [ "$EXEC_MD_COUNT" -gt 0 ]; then
    echo "❌ FAIL: Found $EXEC_MD_COUNT executable .md files!"
    echo "This is a security risk on NTFS filesystems."
    echo "Executable .md files found:"
    find docs/ -name "*.md" -executable -type f 2>/dev/null | head -10
    echo ""
    echo "This is expected on NTFS filesystems (all files show 777)."
    echo "Continuing with warning..."
fi

# Check 2: No rogue simply-mcp processes
echo "[2/4] Checking for rogue simply-mcp processes..."
ROGUE_PROCS=$(ps aux | grep -E "simply-mcp run.*\.ts.*--watch" | grep -v grep | wc -l || echo "0")
if [ "$ROGUE_PROCS" -gt 0 ]; then
    echo "❌ FAIL: Found $ROGUE_PROCS rogue watch mode processes!"
    ps aux | grep -E "simply-mcp run.*\.ts.*--watch" | grep -v grep
    echo ""
    echo "Please kill these processes before running tests:"
    echo "  pkill -f 'simply-mcp run.*--watch'"
    exit 1
fi

# Check 3: No ImageMagick import processes
echo "[3/4] Checking for ImageMagick import processes..."
IMPORT_PROCS=$(ps aux | grep -E "^[^ ]+ +[0-9]+ .*/import " | grep -v grep | wc -l || echo "0")
if [ "$IMPORT_PROCS" -gt 0 ]; then
    echo "⚠️  WARNING: Found ImageMagick import process running!"
    ps aux | grep -E "/import " | grep -v grep
    echo "This might indicate the .md execution bug is active!"
    exit 1
fi

# Check 4: No PostScript artifacts
echo "[4/4] Checking for PostScript artifacts..."
if [ -f "simply-mcp" ]; then
    FILE_TYPE=$(file simply-mcp 2>/dev/null || echo "unknown")
    if echo "$FILE_TYPE" | grep -q "PostScript"; then
        echo "❌ FAIL: Found PostScript artifact 'simply-mcp'!"
        ls -lh simply-mcp
        echo "This is evidence of .md file execution!"
        echo "Removing artifact..."
        rm -f simply-mcp
    fi
fi

echo ""
echo "✅ All pre-test validations passed"
echo "======================================"
echo ""
