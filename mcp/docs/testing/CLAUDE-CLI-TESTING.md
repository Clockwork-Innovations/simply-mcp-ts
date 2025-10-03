# Testing MCP Servers with Claude CLI

This guide covers how to test your MCP servers using Claude CLI, the easiest and most intuitive way to verify your server works correctly.

## Why Use Claude CLI for Testing?

- **Natural Language Interface**: Test tools by describing what you want in plain English
- **Instant Feedback**: See results immediately without manual JSON crafting
- **Real-World Simulation**: Test how LLMs will actually use your tools
- **Easy Debugging**: Claude explains what tools it's calling and why

## Prerequisites

```bash
# Verify Claude CLI is installed
claude --version

# Should output something like: 2.0.1 (Claude Code)
```

## Quick Start

### 1. Add Your Server

```bash
# Add a server (stdio transport)
claude mcp add my-server "npx tsx mcp/examples/simple-server.ts"

# Verify it was added
claude mcp list
```

### 2. Test Your Tools

**Interactive Mode** (Best for exploration):
```bash
claude

# At the prompt, try:
> List all available tools

> Use the greet tool to say hello to Alice

> Calculate 42 multiplied by 123 using the calculate tool
```

**Non-Interactive Mode** (Best for automation):
```bash
echo "What tools are available from my server?" | claude --print --dangerously-skip-permissions

echo "Use the greet tool with name 'Developer' and formal set to true" | \
  claude --print --dangerously-skip-permissions
```

## Testing Strategies

### Strategy 1: Tool Discovery Testing

Verify Claude can discover all your tools:

```bash
echo "List all available tools and their descriptions" | \
  claude --print --dangerously-skip-permissions
```

**What to check:**
- ✅ All tools are listed
- ✅ Descriptions are clear and helpful
- ✅ Parameter schemas are correct

### Strategy 2: Basic Functionality Testing

Test each tool with simple inputs:

```bash
# Test greeting tool
echo "Greet 'World' using the greet tool" | \
  claude --print --dangerously-skip-permissions

# Test calculation tool
echo "Calculate 10 + 5 using the calculate tool" | \
  claude --print --dangerously-skip-permissions

# Test with multiple parameters
echo "Use the greet tool to formally greet 'Dr. Smith'" | \
  claude --print --dangerously-skip-permissions
```

### Strategy 3: Edge Case Testing

Test boundary conditions and error handling:

```bash
# Test division by zero
echo "Calculate 10 divided by 0 using the calculate tool" | \
  claude --print --dangerously-skip-permissions

# Test missing required parameters
echo "Call the greet tool without providing a name" | \
  claude --print --dangerously-skip-permissions

# Test invalid parameter types
echo "Call calculate tool with 'abc' as a number" | \
  claude --print --dangerously-skip-permissions
```

### Strategy 4: Integration Testing

Test how tools work together:

```bash
echo "First greet 'Alice', then calculate 10 times 5, then greet 'Bob'" | \
  claude --print --dangerously-skip-permissions
```

## Advanced Testing

### Temporary Server Testing (No Config Changes)

Test a server without permanently adding it to your config:

```bash
echo "List available tools" | claude --print \
  --strict-mcp-config \
  --dangerously-skip-permissions \
  --mcp-config '{"mcpServers":{"temp":{"command":"npx","args":["tsx","mcp/examples/simple-server.ts"]}}}'
```

**Use cases:**
- Testing during development
- Testing different server versions
- CI/CD test scripts
- Temporary debugging

### Testing Multiple Servers

```bash
# Add multiple servers
claude mcp add server-a "npx tsx mcp/examples/simple-server.ts"
claude mcp add server-b "npx tsx mcp/examples/class-minimal.ts"

# Claude will have access to tools from both
echo "List all tools from all servers" | claude --print --dangerously-skip-permissions
```

### Testing with Specific Permissions

```bash
# Test with permissions dialog (more realistic)
echo "Use the greet tool" | claude --print

# Test bypassing permissions (faster for development)
echo "Use the greet tool" | claude --print --dangerously-skip-permissions
```

## Common Testing Scenarios

### Scenario 1: New Tool Development

```bash
# 1. Add your dev server
claude mcp add dev "npx tsx mcp/my-new-server.ts"

# 2. Test tool discovery
echo "What tools are available?" | claude --print --dangerously-skip-permissions

# 3. Test basic usage
echo "Use the new_tool with test parameters" | claude --print --dangerously-skip-permissions

# 4. Test error cases
echo "Use the new_tool with invalid parameters" | claude --print --dangerously-skip-permissions

# 5. Remove when done
claude mcp remove dev
```

### Scenario 2: Debugging Tool Parameters

```bash
# Test with verbose output to see parameter passing
echo "Use the calculate tool to add 5 and 3" | \
  claude --print --dangerously-skip-permissions --debug

# Check what parameters Claude is actually sending
```

### Scenario 3: Production Readiness Verification

```bash
# Test all critical paths
echo "Test the greet tool with 'Alice'" | claude --print --dangerously-skip-permissions
echo "Test the calculate tool: add 10 and 5" | claude --print --dangerously-skip-permissions
echo "Test the calculate tool: divide 10 by 0" | claude --print --dangerously-skip-permissions

# Verify error messages are clear
# Verify all tools respond correctly
# Verify edge cases are handled
```

### Scenario 4: Performance Testing

```bash
# Time tool execution
time echo "Calculate 1000 multiplied by 1000" | \
  claude --print --dangerously-skip-permissions

# Test multiple sequential calls
echo "Do 10 calculations: 1+1, 2+2, 3+3, 4+4, 5+5, 6+6, 7+7, 8+8, 9+9, 10+10" | \
  claude --print --dangerously-skip-permissions
```

## CLI Commands Reference

### Server Management

```bash
# Add stdio server
claude mcp add <name> "<command>"

# Add stdio server with args
claude mcp add my-server "npx tsx mcp/server.ts --arg1 value1"

# Add HTTP server
claude mcp add-json my-http-server '{"url":"http://localhost:3000/mcp","transport":"sse"}'

# List all servers
claude mcp list

# Get server details
claude mcp get my-server

# Remove server
claude mcp remove my-server
```

### Testing Modes

```bash
# Interactive mode
claude

# Non-interactive mode
claude --print "your prompt"

# With input from pipe
echo "your prompt" | claude --print

# Skip permissions (development only)
claude --print --dangerously-skip-permissions "your prompt"

# Strict MCP config (only use specified servers)
claude --print --strict-mcp-config --mcp-config '{"mcpServers":{...}}'

# Debug mode (see detailed logs)
claude --print --debug "your prompt"
```

## Best Practices

### 1. Development Testing

```bash
# Use temporary configs during development
TEST_CONFIG='{"mcpServers":{"dev":{"command":"npx","args":["tsx","mcp/server.ts"]}}}'

echo "Test my tool" | claude --print \
  --strict-mcp-config \
  --dangerously-skip-permissions \
  --mcp-config "$TEST_CONFIG"
```

### 2. Automated Testing

Create test scripts:

```bash
#!/bin/bash
# test-mcp-server.sh

set -e

SERVER_CONFIG='{"mcpServers":{"test":{"command":"npx","args":["tsx","mcp/server.ts"]}}}'
FLAGS="--print --strict-mcp-config --dangerously-skip-permissions --mcp-config"

echo "Testing tool discovery..."
echo "List all tools" | claude $FLAGS "$SERVER_CONFIG"

echo "Testing greet tool..."
echo "Greet 'Test User'" | claude $FLAGS "$SERVER_CONFIG"

echo "Testing calculate tool..."
echo "Calculate 5 + 3" | claude $FLAGS "$SERVER_CONFIG"

echo "Testing error handling..."
echo "Calculate 10 / 0" | claude $FLAGS "$SERVER_CONFIG"

echo "All tests passed!"
```

### 3. CI/CD Integration

```yaml
# .github/workflows/test-mcp.yml
name: Test MCP Server

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Test MCP Server
        run: |
          echo "List tools" | npx claude --print \
            --strict-mcp-config \
            --dangerously-skip-permissions \
            --mcp-config '{"mcpServers":{"test":{"command":"npx","args":["tsx","mcp/server.ts"]}}}'
```

## Troubleshooting

### Server Not Connecting

```bash
# Check server health
claude mcp list

# Should show: ✓ Connected or ✗ Failed to connect

# If failed, test server directly
npx tsx mcp/examples/simple-server.ts

# Check for errors in server startup
```

### Tools Not Appearing

```bash
# Test with debug mode
echo "List all tools" | claude --print --debug

# Check server logs
# Look for tool registration messages
```

### Unexpected Tool Behavior

```bash
# Run with debug to see exact parameters
echo "Use the problematic tool" | claude --print --debug

# Check what parameters Claude is sending
# Compare with your tool's schema
```

### Permission Prompts

```bash
# During development, skip permissions
claude --print --dangerously-skip-permissions "your prompt"

# In production, handle permissions properly
claude --print "your prompt"
```

## Comparison with Other Testing Methods

| Method | Speed | Ease of Use | Realism | Debugging |
|--------|-------|-------------|---------|-----------|
| Claude CLI | ⚡⚡⚡ | 🌟🌟🌟 | 🎯🎯🎯 | 🔍🔍🔍 |
| MCP Inspector | ⚡⚡ | 🌟🌟 | 🎯🎯 | 🔍🔍🔍 |
| Automated Tests | ⚡⚡⚡ | 🌟 | 🎯 | 🔍🔍 |
| Manual curl | ⚡ | 🌟 | 🎯 | 🔍 |

**Recommendation**: Use Claude CLI for development and manual testing, automated tests for CI/CD.

## Example Test Session

```bash
# Complete testing workflow
$ claude mcp add test-server "npx tsx mcp/examples/simple-server.ts"
Added stdio MCP server test-server

$ claude mcp list
test-server: npx tsx mcp/examples/simple-server.ts - ✓ Connected

$ echo "What tools are available?" | claude --print --dangerously-skip-permissions
The test-server provides 4 tools:
1. greet - Greet a user with a personalized message
2. calculate - Perform basic arithmetic operations
3. get_user_info - Get information about a user
4. log_message - Log a message (demonstrates context usage)

$ echo "Use the greet tool to say hello to Alice formally" | claude --print --dangerously-skip-permissions
Good day, Alice! Welcome to SimplyMCP!

$ echo "Calculate 123 multiplied by 456" | claude --print --dangerously-skip-permissions
56088

$ echo "Calculate 10 divided by 0" | claude --print --dangerously-skip-permissions
Error: Division by zero is not allowed

$ claude mcp remove test-server
Removed MCP server test-server
```

## Next Steps

- Read [TESTING OVERVIEW](./OVERVIEW.md) for all testing methods
- See [API-INTEGRATION](../guides/API-INTEGRATION.md) for curl testing
- Check [TROUBLESHOOTING](../TROUBLESHOOTING.md) for common issues

---

**Pro Tip**: Create a shell alias for common test commands:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias mcp-test='claude --print --strict-mcp-config --dangerously-skip-permissions --mcp-config'

# Usage:
echo "Test my tool" | mcp-test '{"mcpServers":{"test":{"command":"npx","args":["tsx","mcp/server.ts"]}}}'
```
