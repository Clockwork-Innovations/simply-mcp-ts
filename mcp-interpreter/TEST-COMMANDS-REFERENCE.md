# Error Scenario Test Commands - Reference

This document contains the exact commands used to test error scenarios and edge cases for the MCP Interpreter. These commands can be re-run to verify robustness.

## Prerequisites

1. MCP Interpreter running on port 3006
2. Test servers available:
   - HTTP stateful on port 3100
   - HTTP stateless on port 3102

## Scenario 5: Operations on Disconnected State

```bash
# Verify disconnected
curl -s http://localhost:3006/api/mcp/status | jq '.data.status'

# Try each operation
curl -s http://localhost:3006/api/mcp/tools | jq .
curl -s http://localhost:3006/api/mcp/resources | jq .
curl -s http://localhost:3006/api/mcp/prompts | jq .
curl -s http://localhost:3006/api/mcp/roots | jq .

# Try tool execution
curl -s -X POST http://localhost:3006/api/mcp/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"name":"test","parameters":{}}' | jq .

# Try resource read
curl -s -X POST http://localhost:3006/api/mcp/resources/read \
  -H "Content-Type: application/json" \
  -d '{"uri":"test://resource"}' | jq .
```

**Expected:** All return `{"success": false, "error": "Not connected to MCP server"}`

---

## Scenario 2: Invalid Connection Configurations

```bash
# Invalid server path
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"stdio","serverPath":"/nonexistent/path.ts"}' | jq .

# Invalid HTTP URL
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"http-stateful","url":"http://localhost:9999/mcp"}' | jq .

# Missing serverPath
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"stdio"}' | jq .

# Missing type
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"serverPath":"/some/path.ts"}' | jq .

# Invalid type
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"invalid-type","serverPath":"/some/path.ts"}' | jq .

# Malformed JSON
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{invalid json}' | jq .

# Empty body
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

**Expected:** Clear error messages for each invalid configuration

---

## Scenario 3: Reconnection Flow

```bash
# Connect
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"http-stateful","url":"http://localhost:3100/mcp"}' | jq .

# Verify connected
sleep 2
curl -s http://localhost:3006/api/mcp/status | jq '.data.status'

# Test functionality
curl -s http://localhost:3006/api/mcp/resources | jq '.success'

# Disconnect
curl -s -X POST http://localhost:3006/api/mcp/disconnect | jq .

# Verify disconnected
curl -s http://localhost:3006/api/mcp/status | jq '.data.status'

# Reconnect
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"http-stateful","url":"http://localhost:3100/mcp"}' | jq .

# Verify reconnection
sleep 2
curl -s http://localhost:3006/api/mcp/resources | jq '.success'
```

**Expected:** Clean transitions through 3+ cycles

---

## Scenario 4: Rapid Connect/Disconnect

```bash
# Rapid cycles with delays
for i in {1..5}; do
  echo "Iteration $i:"
  curl -s -X POST http://localhost:3006/api/mcp/connect \
    -H "Content-Type: application/json" \
    -d '{"type":"http-stateful","url":"http://localhost:3100/mcp"}' | jq -r '.success'
  sleep 1
  curl -s -X POST http://localhost:3006/api/mcp/disconnect | jq -r '.success'
  sleep 0.5
  echo ""
done

# Extremely rapid (no delays)
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"http-stateful","url":"http://localhost:3100/mcp"}' > /dev/null

curl -s -X POST http://localhost:3006/api/mcp/disconnect > /dev/null

curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"http-stateful","url":"http://localhost:3100/mcp"}' > /dev/null

curl -s -X POST http://localhost:3006/api/mcp/disconnect > /dev/null

# Verify still responsive
curl -s http://localhost:3006/api/mcp/status | jq '.success'
```

**Expected:** All operations succeed, no crashes

---

## Scenario 1: Server Crash During Operation

```bash
# Connect to server
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"http-stateful","url":"http://localhost:3100/mcp"}' | jq .

sleep 2

# Verify working
curl -s http://localhost:3006/api/mcp/resources | jq '.success'

# Find server PID
ps aux | grep "simply-mcp run.*3100" | grep -v grep

# Kill server (replace PID)
kill -9 <PID>

# Try operations
curl -s http://localhost:3006/api/mcp/resources | jq .
curl -s http://localhost:3006/api/mcp/tools | jq .

# Check backend still running
curl -s http://localhost:3006/api/mcp/status | jq '.success'

# Restart server
npx simply-mcp run tests/fixtures/interface-static-resource.ts \
  --http --port 3100 --inspect-port 9229 > /tmp/server.log 2>&1 &

# Wait for startup
sleep 5

# Reconnect
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"http-stateful","url":"http://localhost:3100/mcp"}' | jq .

# Verify recovery
sleep 2
curl -s http://localhost:3006/api/mcp/resources | jq '.success'
```

**Expected:** Backend doesn't crash, clean recovery after server restart

---

## Additional Edge Cases

### Double Connect

```bash
# Connect first time
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"http-stateful","url":"http://localhost:3100/mcp"}' | jq .

sleep 2

# Connect again while connected
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"http-stateful","url":"http://localhost:3100/mcp"}' | jq .
```

**Expected:** Returns success with current connection (idempotent)

### Double Disconnect

```bash
# Disconnect once
curl -s -X POST http://localhost:3006/api/mcp/disconnect | jq .

# Disconnect again
curl -s -X POST http://localhost:3006/api/mcp/disconnect | jq .
```

**Expected:** Both succeed (idempotent)

### Concurrent Requests

```bash
# Fire multiple requests simultaneously
(curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"http-stateful","url":"http://localhost:3100/mcp"}' > /tmp/req1.json &)

(curl -s http://localhost:3006/api/mcp/status > /tmp/req2.json &)

(curl -s http://localhost:3006/api/mcp/resources > /tmp/req3.json &)

# Wait and check results
sleep 3
cat /tmp/req1.json | jq .
cat /tmp/req2.json | jq .
cat /tmp/req3.json | jq .
```

**Expected:** All requests handled correctly, no race conditions

### Memory Leak Test

```bash
# Get baseline memory
ps aux | grep "next dev" | grep -v grep | \
  awk '{printf "Memory: %s MB\n", $6/1024}'

# Stress test
for i in {1..10}; do
  curl -s -X POST http://localhost:3006/api/mcp/connect \
    -H "Content-Type: application/json" \
    -d '{"type":"http-stateful","url":"http://localhost:3100/mcp"}' > /dev/null
  sleep 0.5
  curl -s -X POST http://localhost:3006/api/mcp/disconnect > /dev/null
  sleep 0.2
done

# Check memory again
ps aux | grep "next dev" | grep -v grep | \
  awk '{printf "Memory: %s MB\n", $6/1024}'
```

**Expected:** Memory should be stable (no significant increase)

---

## HTTP Stateless Testing

```bash
# Connect to stateless server
curl -s -X POST http://localhost:3006/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"type":"http-stateless","url":"http://localhost:3102/mcp"}' | jq .

sleep 2

# Test operations
curl -s http://localhost:3006/api/mcp/resources | jq '.success'

# Disconnect
curl -s -X POST http://localhost:3006/api/mcp/disconnect | jq .
```

**Expected:** Works the same as stateful

---

## Verification Checklist

After running all tests, verify:

- [ ] Backend process still running
- [ ] No error messages in logs
- [ ] Memory usage stable
- [ ] No zombie processes
- [ ] Status shows "disconnected"
- [ ] Can connect again successfully

```bash
# Final check
curl -s http://localhost:3006/api/mcp/status | jq .
ps aux | grep mcp-interpreter
```

---

## Notes

- All commands tested on Ubuntu Linux
- Tests performed on 2025-10-30
- MCP Interpreter version: Latest
- Simply MCP version: v3.4.0+

