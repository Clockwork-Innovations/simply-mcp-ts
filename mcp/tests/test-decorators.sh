#!/bin/bash
# Test script for MCP Decorator API (@tool, @prompt, @resource)
# This script wraps the TypeScript test client for decorator functionality

echo "========================================="
echo "Testing MCP Decorator API"
echo "========================================="
echo ""
echo "Running TypeScript-based decorator tests..."
echo ""

# Execute the TypeScript test client
npx tsx mcp/tests/test-decorators-client.ts

# Exit with the same exit code as the test
exit $?
