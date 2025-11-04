# Issue: Tools Tab Not Displaying Connected Server's Tools

**Date**: 2025-10-31
**Reporter**: Automated Testing (handoff execution)
**Severity**: High
**Category**: Bug
**Component**: mcp-interpreter UI

## Summary

After successfully connecting to an MCP server via HTTP (SSE), the Tools tab continues to show "Please connect to an MCP server to view available tools" even though:
1. Connection status shows "Connected"
2. Server name and version display correctly (hello-world-server v1.0.0)
3. The `/api/mcp/tools` API endpoint returns all tools successfully (HTTP 200)

## Steps to Reproduce

1. Start mcp-interpreter: `cd mcp-interpreter && npm run dev`
2. Start test server in HTTP mode: `cd /tmp/test-server-hello-world && npm run http` (port 3001)
3. Navigate to http://localhost:3000 in browser
4. Select "HTTP Stateful (SSE)" transport
5. Enter server URL: `http://localhost:3001/mcp`
6. Click "Connect"
7. Wait for connection to complete (status shows "Connected")
8. Observe Tools tab

## Expected Behavior

The Tools tab should display a list of all 6 available tools:
- greet
- greet_multiple
- calculate_greeting_length
- format_greeting
- customize_greeting
- generate_creative_greeting

## Actual Behavior

The Tools tab shows the placeholder message:
```
Please connect to an MCP server to view available tools.
```

## Evidence

### Connection Status
✅ Status: Connected
✅ Transport: HTTP (SSE)
✅ Server: hello-world-server v1.0.0
✅ Button changed to "Disconnect"

### API Response
The `/api/mcp/tools` endpoint returns HTTP 200 with correct data:

```json
{
  "success": true,
  "data": [
    {
      "name": "greet",
      "description": "Greet a person by name",
      "inputSchema": {...}
    },
    // ... 5 more tools
  ]
}
```

### Network Activity
```
GET /api/mcp/tools 200 in 441ms (compile: 406ms, render: 35ms)
```

### UI Behavior Tested
- Switching to Resources tab and back to Tools: No change
- Page refresh: Loses connection (expected), bug persists after reconnect

## Environment

- **Platform**: Linux 6.14.0-34-generic
- **Node**: v22.20.0
- **Browser**: Chrome 142.0.0.0
- **mcp-interpreter**: Next.js 16.0.1 (Turbopack)
- **simply-mcp**: v4 (local link from /mnt/Shared/cs-projects/simply-mcp-ts)
- **Test Server**: /tmp/test-server-hello-world/ (hello-world-server v1.0.0)

## Root Cause Analysis

**Suspected Issue**: React component state not updating after successful API fetch.

The data flow appears to be:
1. ✅ User clicks Connect
2. ✅ `/api/mcp/connect` succeeds (HTTP 200 on retry)
3. ✅ `/api/mcp/tools` fetches successfully (HTTP 200)
4. ❌ Tools component doesn't re-render with fetched data

Possible causes:
- State update not triggered after fetch completes
- Conditional rendering logic checking wrong property
- Component not subscribed to the correct state changes
- Race condition between connection state and tools fetch

## Impact

**User Impact**: High
- Cannot test tools via UI
- Requires manual API testing with curl/Postman
- Blocks primary use case of the interpreter

**Workaround**: Test tools via API directly:
```bash
curl http://localhost:3000/api/mcp/tools
```

## Recommended Fix

1. Investigate Tools component's state management
2. Add debug logging to track:
   - When `/api/mcp/tools` fetch completes
   - When component state updates
   - What conditional renders the placeholder vs tools list
3. Ensure component re-renders when tools data is available
4. Add E2E test to prevent regression

## Related Files

- `/mnt/Shared/cs-projects/simply-mcp-ts/mcp-interpreter/` (interpreter root)
- `/mnt/Shared/cs-projects/simply-mcp-ts/mcp-interpreter/lib/mcp/client.ts` (client implementation)
- Tools component (location TBD - needs investigation)

## Screenshots

- Connected state: `/tmp/mcp-interpreter-screenshots/01-connected-state.png`
- Tools tab issue: (shows placeholder text despite connection)

## Next Steps

1. Locate Tools tab component implementation
2. Add console.log to track tools state
3. Fix state update/re-render issue
4. Add test coverage for this scenario
5. Verify fix with hello-world-server

## Notes

- Resources and Prompts tabs may have the same issue (not tested yet)
- Initial connection attempt returned HTTP 500, but retry succeeded
- This may be a known issue if the interpreter is still in development
