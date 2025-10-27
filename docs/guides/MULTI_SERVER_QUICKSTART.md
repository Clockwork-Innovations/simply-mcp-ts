# Multi-Server Quick Start Guide

## Installation

The multi-server commands are built into SimplyMCP CLI. No additional installation required.

```bash
npm run build  # Build the project
```

## Basic Commands

### Run Multiple Servers

```bash
# Start 3 servers on HTTP (ports 3000, 3001, 3002)
simplymcp run server1.ts server2.ts server3.ts --http --port 3000
```

### List Running Servers

```bash
# Basic list
simplymcp list

# Verbose output
simplymcp list --verbose

# JSON format
simplymcp list --json
```

### Stop Servers

```bash
# Stop all servers
simplymcp stop all

# Stop by PID
simplymcp stop 12345

# Stop by name
simplymcp stop my-server

# Force kill
simplymcp stop 12345 --force
```

## Common Workflows

### Development Setup

Start your development servers:
```bash
# Terminal 1: Start all your MCP servers
simplymcp run \
  services/auth-server.ts \
  services/data-server.ts \
  services/api-server.ts \
  --http --port 3000

# Servers will run on ports: 3000, 3001, 3002
```

Check status:
```bash
# Terminal 2: Check running servers
simplymcp list
```

Stop all when done:
```bash
# Stop everything
simplymcp stop all
```

### Testing Multiple Configurations

```bash
# Start 3 instances of the same server on different ports
simplymcp run server.ts server.ts server.ts --http --port 3000

# Test load distribution
curl http://localhost:3000
curl http://localhost:3001
curl http://localhost:3002
```

### Cleanup Dead Servers

```bash
# If servers crash or are killed manually
simplymcp list --cleanup

# Verifies processes are alive and removes dead entries
```

## Output Examples

### Running Servers

```
[server1.ts:3000] Server started: auth-service v1.0.0
[server2.ts:3001] Server started: data-service v1.0.0
[server3.ts:3002] Server started: api-service v1.0.0
All 3 servers running

Press Ctrl+C to stop all servers
```

### List Output

```
Running MCP Servers:
  ✓ auth-service - HTTP :3000 - PID 12345
  ✓ data-service - HTTP :3001 - PID 12346
  ✓ api-service - HTTP :3002 - PID 12347

Total: 3 running
```

### Stop Output

```
Stopping 3 server(s)...

✓ Stopped auth-service (PID 12345)
✓ Stopped data-service (PID 12346)
✓ Stopped api-service (PID 12347)

Stopped 3/3 server(s)
```

## Tips & Tricks

### Auto-Confirm Stops

Skip confirmation when stopping multiple servers:
```bash
SIMPLYMCP_AUTO_CONFIRM=true simplymcp stop all
```

### Custom Port Ranges

Start servers on custom port range:
```bash
# Starts on ports 8000, 8001, 8002
simplymcp run s1.ts s2.ts s3.ts --http --port 8000
```

### Watch Mode (Future Feature)

Currently, watch mode is for single servers:
```bash
# Single server with auto-restart
simplymcp run server.ts --watch --http --port 3000
```

Multi-server watch mode coming soon!

### JSON Parsing

Use `jq` for advanced queries:
```bash
# Get all HTTP ports
simplymcp list --json | jq '.[] | select(.transport=="http") | .port'

# Count running servers
simplymcp list --json | jq 'length'

# Get PIDs
simplymcp list --json | jq '.[].pid'
```

## Error Messages

### Stdio Conflict

```
Error: Cannot run multiple servers with stdio transport
Hint: Use --http flag to run servers with HTTP transport
```

**Solution**: Add `--http --port 3000` to your command.

### Port In Use

```
[server1.ts:3000] Error: Port 3000 already in use
```

**Solution**: The CLI automatically finds the next available port. If you see this, another application is using the port.

### File Not Found

```
Error: Server file not found: server.ts
```

**Solution**: Check file path is correct relative to current directory.

## Advanced Usage

### Group Management

When running multiple servers together, they're assigned a group ID:

```bash
# Start servers (note the group ID in verbose output)
simplymcp run s1.ts s2.ts s3.ts --http --port 3000

# List with verbose shows group
simplymcp list --verbose
# Output: Group: multi-1696348800-abc123

# Stop entire group
simplymcp stop --group multi-1696348800-abc123
```

### Mixed Transports

```bash
# This will fail - can't mix stdio and HTTP
simplymcp run server1.ts --http server2.ts

# All must use same transport
simplymcp run server1.ts server2.ts --http --port 3000
```

### Name Pattern Matching

```bash
# Stop all servers with "test" in name or path
simplymcp stop test

# Case-insensitive, matches name or file path
simplymcp stop weather  # Matches "weather-server" or "path/to/weather.ts"
```

## Troubleshooting

### Servers Won't Stop

Try force kill:
```bash
simplymcp stop all --force
```

### Registry Out of Sync

Clean up and verify:
```bash
simplymcp list --cleanup
```

### Check Process Directly

```bash
# Get PIDs from list
simplymcp list --json | jq '.[].pid'

# Check with ps
ps aux | grep <PID>

# Kill directly if needed
kill <PID>
```

### Reset Everything

```bash
# Stop all servers
simplymcp stop all --force

# Clean registry
simplymcp list --cleanup

# Manually clear registry if needed
rm -f /tmp/simplymcp/servers.json
```

## Integration Examples

### With npm Scripts

```json
{
  "scripts": {
    "dev:all": "simplymcp run services/*.ts --http --port 3000",
    "dev:status": "simplymcp list",
    "dev:stop": "SIMPLYMCP_AUTO_CONFIRM=true simplymcp stop all",
    "dev:clean": "simplymcp list --cleanup"
  }
}
```

### With Docker Compose

```yaml
version: '3.8'
services:
  mcp-servers:
    image: node:20
    command: >
      bash -c "
        npm install &&
        npm run build &&
        simplymcp run server1.ts server2.ts server3.ts --http --port 3000
      "
    ports:
      - "3000-3002:3000-3002"
```

### With Systemd

```ini
[Unit]
Description=MCP Multi-Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/path/to/project
ExecStart=/usr/bin/simplymcp run server1.ts server2.ts server3.ts --http --port 3000
Restart=always

[Install]
WantedBy=multi-user.target
```

## Next Steps

- Read the full implementation docs: `MULTI_SERVER_IMPLEMENTATION.md`
- Run the test suite: `./mcp/tests/test-multi-server.sh`
- Try the demo: `npx tsx test-multi-server-demo.ts`
- Explore individual command help: `simplymcp <command> --help`

## Getting Help

```bash
# Main CLI help
simplymcp --help

# Command-specific help
simplymcp run --help
simplymcp list --help
simplymcp stop --help
```

For issues or questions, check the project README or open an issue on GitHub.
