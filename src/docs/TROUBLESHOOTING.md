# MCP Framework Troubleshooting Guide

**Version:** 1.0.0
**Last Updated:** 2025-09-30

A comprehensive guide to diagnosing and resolving common issues with the MCP Configurable Framework.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Diagnostic Steps](#quick-diagnostic-steps)
3. [Server Issues](#server-issues)
4. [Configuration Issues](#configuration-issues)
5. [Handler Errors](#handler-errors)
6. [Validation Errors](#validation-errors)
7. [Transport Issues](#transport-issues)
8. [Performance Issues](#performance-issues)
9. [Testing Issues](#testing-issues)
10. [Common Error Messages](#common-error-messages)
11. [Debugging Tips](#debugging-tips)
12. [Getting Additional Help](#getting-additional-help)

---

## Introduction

### Purpose of This Guide

This guide helps you quickly identify and resolve common problems with the MCP framework. Each issue includes:
- **Problem:** Clear description of symptoms
- **Cause:** Root cause explanation
- **Solution:** Step-by-step fix
- **Prevention:** How to avoid in future
- **Related:** Links to relevant documentation

### How to Use This Guide

1. **Identify your problem category** from the table of contents
2. **Match symptoms** to the problem descriptions
3. **Follow the solution steps** exactly
4. **Verify the fix** using the provided commands
5. **Check prevention tips** to avoid recurring issues

### When to Seek Additional Help

If you've tried the solutions in this guide and still have issues:
- Check the [GitHub Issues](../../../issues/) for similar problems
- Review the [TESTING.md](../TESTING.md) for known test issues
- See the [API-EXAMPLES.md](../API-EXAMPLES.md) for working examples
- Consult the [ARCHITECTURE.md](../ARCHITECTURE.md) for system design details

---

## Quick Diagnostic Steps

### Check Server Status

```bash
# Check if server process is running
ps aux | grep "tsx.*configurableServer"

# Check if port is in use
lsof -i :3002  # Replace 3002 with your configured port

# Test basic connectivity
curl http://localhost:3002/health
```

### View Logs

```bash
# View server logs (if using systemd)
journalctl -u mcp-server -f

# View logs from file
tail -f /var/log/mcp/server.log

# Check audit logs
tail -f /var/log/mcp/audit.log

# View test server logs
cat /tmp/mcp-stateful-server.log
```

### Verify Configuration

```bash
# Validate JSON syntax
jq empty mcp/config.json

# Check for required fields
jq '.name, .version, .tools, .prompts, .resources' mcp/config.json

# Verify handler paths exist
find mcp/handlers/examples -name "*.ts"
```

### Test Basic Operations

```bash
# Initialize connection (stateful HTTP)
curl -i -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","clientInfo":{"name":"test","version":"1.0"}}}'

# List available tools
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

---

## Server Issues

### Server Won't Start

#### Port Already in Use

**Problem:** Server fails to start with "EADDRINUSE" or "port already in use" error.

**Cause:** Another process is already listening on the configured port.

**Solution:**
```bash
# 1. Find process using the port
lsof -i :3002  # Replace with your port

# 2. Kill the process
kill -9 <PID>

# OR change port in config
jq '.port = 3003' mcp/config.json > mcp/config-new.json
mv mcp/config-new.json mcp/config.json

# 3. Restart server
npx tsx mcp/configurableServer.ts mcp/config.json
```

**Prevention:**
- Use unique ports for each server instance
- Implement proper shutdown handlers
- Check port availability before starting

**Related:** [DEPLOYMENT.md - Port Configuration](../DEPLOYMENT.md#environment-variables)

---

#### Config File Not Found

**Problem:** Server exits with "Failed to load config from <path>: ENOENT: no such file or directory".

**Cause:** Configuration file doesn't exist at the specified path or path is incorrect.

**Solution:**
```bash
# 1. Verify file exists
ls -la mcp/config.json

# 2. Check file path in command
echo "Current directory: $(pwd)"
echo "Config path: mcp/config.json"

# 3. Use absolute path
npx tsx mcp/configurableServer.ts $(pwd)/mcp/config.json

# 4. Or create missing config from template
cp mcp/config-test.json mcp/config.json
```

**Prevention:**
- Always use absolute paths in production
- Add config file validation to CI/CD
- Keep template configs in version control

**Related:** [README.md - Configuration](../README.md#configuration)

---

#### Dependencies Missing

**Problem:** Server fails with "Cannot find module" or "Module not found" errors.

**Cause:** npm packages not installed or TypeScript compilation failed.

**Solution:**
```bash
# 1. Install dependencies
npm install

# 2. Verify MCP SDK installation
npm list @modelcontextprotocol/sdk

# 3. If SDK missing, install it
npm install @modelcontextprotocol/sdk

# 4. Clear cache and reinstall if needed
rm -rf node_modules package-lock.json
npm install

# 5. For TypeScript modules, ensure proper resolution
npm install tsx --save-dev
```

**Prevention:**
- Run `npm ci` in production (uses package-lock.json)
- Add dependency checks to startup scripts
- Use Node.js version 18+ as required

**Related:** [README.md - Requirements](../README.md#requirements)

---

#### Module Import Errors

**Problem:** "ERR_MODULE_NOT_FOUND" or "Cannot use import statement outside a module".

**Cause:** TypeScript/ESM module resolution issues or incorrect file extensions.

**Solution:**
```bash
# 1. Ensure .js extensions in imports (even for .ts files)
# Bad:  import { Server } from './types'
# Good: import { Server } from './types.js'

# 2. Verify package.json has type: module
cat package.json | grep '"type"'

# 3. Check tsconfig.json module settings
cat tsconfig.json | jq '.compilerOptions.module'

# 4. Use tsx for TypeScript execution
npx tsx mcp/configurableServer.ts mcp/config.json

# NOT: node mcp/configurableServer.ts (won't work)
```

**Prevention:**
- Always use `.js` extensions in TypeScript imports
- Keep `"type": "module"` in package.json
- Use tsx for development, compile for production

**Related:** [ARCHITECTURE.md - Module System](../ARCHITECTURE.md)

---

### Server Crashes on Startup

**Problem:** Server starts but immediately exits or crashes within seconds.

**Cause:** Usually invalid configuration, handler loading errors, or unhandled exceptions.

**Solution:**
```bash
# 1. Run with verbose error output
NODE_ENV=development npx tsx mcp/configurableServer.ts mcp/config.json

# 2. Check for syntax errors in config
jq empty mcp/config.json
echo "Exit code: $?"  # Should be 0

# 3. Test each handler independently
npx tsx -e "import('./mcp/handlers/examples/greetHandler.js').then(m => console.log(m))"

# 4. Validate handler paths
jq -r '.tools[].handler | select(.type=="file") | .path' mcp/config.json | while read path; do
  [ -f "$path" ] && echo "✓ $path" || echo "✗ MISSING: $path"
done

# 5. Enable debug logging
LOG_LEVEL=debug npx tsx mcp/configurableServer.ts mcp/config.json
```

**Prevention:**
- Validate config with schema before deployment
- Add unit tests for all handlers
- Use try-catch in handler initialization
- Implement proper error logging

**Related:** [HANDLER-GUIDE.md - Error Handling](../HANDLER-GUIDE.md#error-handling)

---

### Server Stops Responding

**Problem:** Server is running but doesn't respond to requests; no errors in logs.

**Cause:** Handler timeout, infinite loop, deadlock, or resource exhaustion.

**Solution:**
```bash
# 1. Check if process is consuming CPU
top -p $(pgrep -f "tsx.*configurableServer")

# 2. Check memory usage
ps aux | grep "tsx.*configurableServer" | awk '{print $4}'  # Memory %

# 3. Send test request with timeout
timeout 10s curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","clientInfo":{"name":"test","version":"1.0"}}}'

# 4. If no response, check handler timeouts in config
jq '.tools[].handler | select(.timeout) | .timeout' mcp/config.json

# 5. Restart server with lower timeout
# Edit config.json: set all handler timeouts to 5000ms

# 6. For production, use process manager with auto-restart
pm2 start mcp/configurableServer.ts --interpreter tsx -- mcp/config.json
```

**Prevention:**
- Set reasonable timeouts on all handlers (5000ms default)
- Add request timeout middleware
- Monitor server health with external checks
- Use connection pooling for external services

**Related:** [DEPLOYMENT.md - Health Checks](../DEPLOYMENT.md#health-checks)

---

## Configuration Issues

### Invalid Config JSON

**Problem:** "Unexpected token" or "JSON parse error" when loading config.

**Cause:** Malformed JSON syntax (trailing commas, missing quotes, etc.).

**Solution:**
```bash
# 1. Validate JSON syntax
jq empty mcp/config.json

# 2. Pretty-print to find errors
jq . mcp/config.json

# 3. Common JSON errors to check:
# - Trailing commas in arrays/objects
# - Missing closing brackets
# - Single quotes instead of double quotes
# - Unescaped backslashes in strings
# - Comments (JSON doesn't support //)

# 4. Use online validator if needed
curl -X POST https://jsonlint.com/api/json \
  -d "$(cat mcp/config.json)"

# 5. Compare with working template
diff mcp/config.json mcp/config-test.json
```

**Prevention:**
- Use IDE with JSON validation (VS Code, etc.)
- Validate config in CI/CD pipeline
- Use JSON schema validation
- Keep backups of working configs

**Related:** [README.md - Configuration Format](../README.md#configuration-format)

---

### Tool Definition Errors

**Problem:** Tools don't appear in `tools/list` or can't be called.

**Cause:** Invalid tool definition in config (missing required fields, wrong schema format).

**Solution:**
```bash
# 1. Verify tool structure
jq '.tools[] | {name, description, inputSchema, handler}' mcp/config.json

# 2. Check required fields
jq '.tools[] | select(.name == null or .description == null or .inputSchema == null or .handler == null)' mcp/config.json

# 3. Validate input schema format
jq '.tools[].inputSchema | select(.type != "object")' mcp/config.json

# 4. Ensure handler has correct structure
jq '.tools[].handler | select(.type == null)' mcp/config.json

# 5. Test with minimal tool config
cat > mcp/config-minimal.json <<'EOF'
{
  "name": "test-server",
  "version": "1.0.0",
  "port": 3002,
  "tools": [{
    "name": "test",
    "description": "Test tool",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    },
    "handler": {
      "type": "inline",
      "code": "async () => ({ content: [{ type: 'text', text: 'OK' }] })"
    }
  }]
}
EOF

npx tsx mcp/configurableServer.ts mcp/config-minimal.json
```

**Prevention:**
- Use config template as starting point
- Validate against JSON schema
- Test each tool individually
- Document required fields

**Related:** [HANDLER-GUIDE.md - Tool Configuration](../HANDLER-GUIDE.md#configuration)

---

### Handler Registration Fails

**Problem:** "No resolver found for handler type" or handler execution always fails.

**Cause:** Unsupported handler type or incorrect handler configuration structure.

**Solution:**
```bash
# 1. Check supported handler types
echo "Supported types: file, inline, http, registry"

# 2. Verify handler type in config
jq '.tools[].handler.type' mcp/config.json

# 3. Validate handler config by type:

# File handler - requires path
jq '.tools[] | select(.handler.type == "file") | .handler | select(.path == null)' mcp/config.json

# Inline handler - requires code
jq '.tools[] | select(.handler.type == "inline") | .handler | select(.code == null)' mcp/config.json

# HTTP handler - requires url and method
jq '.tools[] | select(.handler.type == "http") | .handler | select(.url == null or .method == null)' mcp/config.json

# 4. Test handler resolution manually
cat > test-handler.js <<'EOF'
import { HandlerManager } from './mcp/core/HandlerManager.js';

const manager = new HandlerManager({ basePath: process.cwd() });
const config = { type: 'inline', code: 'async () => ({ content: [{ type: "text", text: "OK" }] })' };

try {
  const handler = await manager.resolveHandler(config);
  console.log('✓ Handler resolved successfully');
} catch (error) {
  console.error('✗ Handler resolution failed:', error.message);
}
EOF

npx tsx test-handler.js
rm test-handler.js
```

**Prevention:**
- Use only supported handler types
- Follow handler config templates exactly
- Add handler type validation
- Test handlers before adding to production config

**Related:** [HANDLER-GUIDE.md - Handler Types](../HANDLER-GUIDE.md#handler-types)

---

### Schema Validation Errors

**Problem:** "Schema validation failed" when starting server or calling tools.

**Cause:** inputSchema doesn't conform to JSON Schema specification.

**Solution:**
```bash
# 1. Validate schema structure
jq '.tools[].inputSchema | {type, properties, required}' mcp/config.json

# 2. Common schema issues:

# Missing type field
jq '.tools[].inputSchema | select(.type == null)' mcp/config.json

# Invalid property types
# Valid types: string, number, integer, boolean, object, array, null
jq '.tools[].inputSchema.properties | to_entries[] | select(.value.type | IN("string","number","integer","boolean","object","array","null") | not)' mcp/config.json

# Invalid enum values
jq '.tools[] | select(.inputSchema.properties[].enum? | length == 0)' mcp/config.json

# 3. Test schema with sample data
cat > test-schema.js <<'EOF'
import { validateAndSanitize } from './mcp/validation/index.js';

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' }
  },
  required: ['name']
};

const result = validateAndSanitize({ name: 'Test', age: 25 }, schema, { validate: true });
console.log(result.valid ? '✓ Schema valid' : '✗ Schema invalid:', result.errors);
EOF

npx tsx test-schema.js
rm test-schema.js
```

**Prevention:**
- Use JSON Schema validator during development
- Test schemas with various inputs
- Keep schemas simple initially
- Reference [JSON Schema documentation](https://json-schema.org/)

**Related:** [VALIDATION-GUIDE.md](../VALIDATION-GUIDE.md)

---

### Path Resolution Problems

**Problem:** "Cannot resolve path" or "Module not found" for handler files.

**Cause:** Relative paths resolved incorrectly or base path misconfigured.

**Solution:**
```bash
# 1. Check current working directory
pwd

# 2. Verify handler file exists
find . -name "greetHandler.ts"

# 3. Use absolute paths in config
jq --arg pwd "$(pwd)" '.tools[].handler |= if .type == "file" then .path = ($pwd + "/" + .path) else . end' mcp/config.json > mcp/config-absolute.json

# 4. Or ensure correct base path
# When starting server, ensure CWD is project root:
cd /home/nick/dev/cs-projects/cv-gen
npx tsx mcp/configurableServer.ts mcp/config.json

# 5. Test path resolution
node -e "const path = require('path'); console.log(path.resolve('./mcp/handlers/examples/greetHandler.ts'))"
```

**Prevention:**
- Always start server from project root
- Use absolute paths in production configs
- Document required directory structure
- Add path validation on startup

**Related:** [DEPLOYMENT.md - File Paths](../DEPLOYMENT.md#environment-variables)

---

## Handler Errors

### Handler Not Found

**Problem:** "Unknown tool: <name>" when calling a tool.

**Cause:** Tool name mismatch between client request and server configuration.

**Solution:**
```bash
# 1. List registered tools
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[].name'

# 2. Compare with your request
echo "Requested tool name: greet"
echo "Available tools:"
jq -r '.tools[].name' mcp/config.json

# 3. Check for typos or case sensitivity
# Tool names are case-sensitive: "greet" ≠ "Greet"

# 4. Verify tool is actually configured
jq '.tools[] | select(.name == "greet")' mcp/config.json

# 5. Check if tool was filtered by security config
jq '.security.accessControl.toolRestrictions' mcp/config.json
```

**Prevention:**
- Use consistent naming conventions
- List tools before calling
- Add tool name validation in client
- Document available tools

**Related:** [API-EXAMPLES.md - Tool Calls](../API-EXAMPLES.md#calling-tools)

---

### Handler Execution Fails

**Problem:** Tool call returns error: "Handler Error (HANDLER_EXECUTION_ERROR)".

**Cause:** Exception thrown during handler execution.

**Solution:**
```bash
# 1. Check server logs for detailed error
tail -f /tmp/mcp-stateful-server.log | grep "Handler Error"

# 2. Test handler in isolation
npx tsx -e "
import handler from './mcp/handlers/examples/greetHandler.js';
const result = await handler.default({ name: 'Test' }, {
  sessionId: 'test',
  logger: console,
  metadata: {}
});
console.log(result);
"

# 3. Common handler errors:

# Division by zero
# Fix: Add validation in calculate handler
jq '.tools[] | select(.name == "calculate")' mcp/config.json

# Network timeout
# Fix: Increase timeout in HTTP handler config
jq '.tools[] | select(.handler.type == "http") | .handler.timeout = 10000' mcp/config.json > mcp/config-new.json

# File not found
# Fix: Verify file path exists
jq -r '.tools[] | select(.handler.type == "file") | .handler.path' mcp/config.json | xargs ls -la

# 4. Enable debug mode
LOG_LEVEL=debug npx tsx mcp/configurableServer.ts mcp/config.json
```

**Prevention:**
- Add error handling in all handlers
- Validate inputs before processing
- Set appropriate timeouts
- Log handler errors with context

**Related:** [HANDLER-GUIDE.md - Error Handling](../HANDLER-GUIDE.md#error-handling)

---

### File Handler Can't Load

**Problem:** "Handler Load Error: Failed to load handler from <path>".

**Cause:** Handler file doesn't exist, has syntax errors, or wrong export format.

**Solution:**
```bash
# 1. Verify file exists
ls -la mcp/handlers/examples/greetHandler.ts

# 2. Check for TypeScript syntax errors
npx tsx --check mcp/handlers/examples/greetHandler.ts

# 3. Verify export format
cat mcp/handlers/examples/greetHandler.ts | grep "export"
# Should have: export default async function (args, context) { ... }
# Or: export default handler;

# 4. Test import manually
npx tsx -e "import handler from './mcp/handlers/examples/greetHandler.js'; console.log(typeof handler)"
# Should output: function

# 5. Check file permissions
ls -la mcp/handlers/examples/greetHandler.ts
# Should be readable: -rw-r--r--

# 6. If using custom export name
jq '.tools[] | select(.handler.type == "file" and .handler.path == "./mcp/handlers/examples/greetHandler.ts") | .handler.export = "default"' mcp/config.json
```

**Prevention:**
- Use consistent export pattern
- Test handler files before deploying
- Add syntax validation to CI/CD
- Keep handler templates for reference

**Related:** [HANDLER-GUIDE.md - File Handlers](../HANDLER-GUIDE.md#file-handlers)

---

### Inline Handler Syntax Errors

**Problem:** "Handler Syntax Error: Syntax error in inline handler code".

**Cause:** Invalid JavaScript syntax in inline handler code string.

**Solution:**
```bash
# 1. Extract inline handler code
jq -r '.tools[] | select(.handler.type == "inline") | .handler.code' mcp/config.json

# 2. Test syntax with Node.js
jq -r '.tools[] | select(.handler.type == "inline") | .handler.code' mcp/config.json | while read code; do
  echo "Testing: $code"
  node -e "$code" 2>&1
done

# 3. Common inline handler issues:

# Missing async keyword
# Bad:  "(args) => { return { content: [...] } }"
# Good: "async (args) => { return { content: [...] } }"

# Incorrect return format
# Bad:  "async (args) => 'Hello'"
# Good: "async (args) => ({ content: [{ type: 'text', text: 'Hello' }] })"

# Unescaped quotes in JSON
# Bad:  "async (args) => ({ content: [{ type: "text", text: "Hello" }] })"
# Good: "async (args) => ({ content: [{ type: 'text', text: 'Hello' }] })"

# 4. Use proper escaping
cat > mcp/config.json <<'EOF'
{
  "handler": {
    "type": "inline",
    "code": "async (args) => ({ content: [{ type: 'text', text: 'OK' }] })"
  }
}
EOF
```

**Prevention:**
- Test inline code before adding to config
- Use single quotes inside handler code
- Keep inline handlers simple
- Consider file handlers for complex logic

**Related:** [HANDLER-GUIDE.md - Inline Handlers](../HANDLER-GUIDE.md#inline-handlers)

---

### HTTP Handler Timeout

**Problem:** "Handler Network Error: Request timeout" for HTTP handlers.

**Cause:** External API not responding within configured timeout.

**Solution:**
```bash
# 1. Test external API directly
curl -w "Time: %{time_total}s\n" https://official-joke-api.appspot.com/random_joke

# 2. Check current timeout setting
jq '.tools[] | select(.handler.type == "http") | .handler.timeout' mcp/config.json

# 3. Increase timeout if needed
jq '(.tools[] | select(.handler.type == "http") | .handler.timeout) = 10000' mcp/config.json > mcp/config-new.json
mv mcp/config-new.json mcp/config.json

# 4. Check network connectivity
ping -c 3 official-joke-api.appspot.com
nslookup official-joke-api.appspot.com

# 5. Test with longer timeout
curl --max-time 10 https://official-joke-api.appspot.com/random_joke

# 6. Consider retry logic
jq '.tools[] | select(.handler.type == "http") | .handler.retries = 3' mcp/config.json
```

**Prevention:**
- Set realistic timeouts (10s for external APIs)
- Implement retry logic
- Monitor external API health
- Cache responses when possible

**Related:** [HANDLER-GUIDE.md - HTTP Handlers](../HANDLER-GUIDE.md#http-handlers)

---

## Validation Errors

### Input Validation Failures

**Problem:** Tool calls return "Validation Error: <field>: <message>".

**Cause:** Input arguments don't match tool's inputSchema requirements.

**Solution:**
```bash
# 1. Check tool schema requirements
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[] | select(.name == "calculate") | .inputSchema'

# 2. Compare with your arguments
echo '{"operation": "add", "a": 5, "b": 3}' | jq .

# 3. Common validation errors:

# Missing required field
# Error: "operation: Required field missing"
# Fix: Add all required fields from schema

# Wrong type
# Error: "a: Expected number but got string"
# Fix: Use correct type (5 not "5")

# Invalid enum value
# Error: "operation: Must be one of: add, subtract, multiply, divide"
# Fix: Use exact enum value from schema

# Out of range
# Error: "age: Must be at least 0"
# Fix: Check minimum/maximum constraints

# 4. Test validation manually
cat > test-validate.js <<'EOF'
import { validateAndSanitize } from './mcp/validation/index.js';

const schema = {
  type: 'object',
  properties: {
    operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
    a: { type: 'number' },
    b: { type: 'number' }
  },
  required: ['operation', 'a', 'b']
};

const args = { operation: 'add', a: 5, b: 3 };
const result = validateAndSanitize(args, schema, { validate: true });
console.log(result.valid ? '✓ Valid' : '✗ Invalid:', result.errors);
EOF

npx tsx test-validate.js
rm test-validate.js
```

**Prevention:**
- Read tool schema before calling
- Validate input client-side
- Use strong typing (TypeScript)
- Test with various inputs

**Related:** [VALIDATION-GUIDE.md](../VALIDATION-GUIDE.md), [LLM-SELF-HEALING.md](../LLM-SELF-HEALING.md)

---

### Schema Mismatch

**Problem:** "Schema validation failed" even though input looks correct.

**Cause:** Schema expects different structure than provided.

**Solution:**
```bash
# 1. Get exact schema from server
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[] | select(.name == "greet") | .inputSchema' > schema.json

# 2. Validate your input against schema
cat > validate.js <<'EOF'
import Ajv from 'ajv';
const ajv = new Ajv();

const schema = JSON.parse(require('fs').readFileSync('schema.json', 'utf8'));
const data = { name: 'Test' };

const validate = ajv.compile(schema);
const valid = validate(data);

if (!valid) {
  console.log('Validation errors:', validate.errors);
} else {
  console.log('✓ Input is valid');
}
EOF

node validate.js
rm validate.js schema.json

# 3. Check for common schema mismatches:

# Nested object expected
# Schema: { type: 'object', properties: { user: { type: 'object' } } }
# Wrong: { name: 'Test' }
# Right: { user: { name: 'Test' } }

# Array expected
# Schema: { type: 'array', items: { type: 'string' } }
# Wrong: "item1"
# Right: ["item1"]

# Additional properties not allowed
# Schema: { type: 'object', additionalProperties: false }
# Wrong: { name: 'Test', extra: 'field' }
# Right: { name: 'Test' }
```

**Prevention:**
- Always get schema from `tools/list`
- Use schema validation library
- Test with schema validator
- Document input format clearly

**Related:** [VALIDATION-GUIDE.md - Schema Validation](../VALIDATION-GUIDE.md#schema-validation)

---

### Type Checking Errors

**Problem:** "Expected <type> but got <actual_type>".

**Cause:** Argument type doesn't match schema type definition.

**Solution:**
```bash
# 1. Check JavaScript type coercion
node -e "console.log(typeof '5')"    # string
node -e "console.log(typeof 5)"      # number
node -e "console.log(typeof true)"   # boolean

# 2. Common type mismatches:

# Number as string
# Wrong: { "a": "5", "b": "3" }
# Right: { "a": 5, "b": 3 }

# Boolean as string
# Wrong: { "enabled": "true" }
# Right: { "enabled": true }

# String as number
# Wrong: { "name": 123 }
# Right: { "name": "123" }

# 3. Fix in JSON payload
cat > request.json <<'EOF'
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "calculate",
    "arguments": {
      "operation": "add",
      "a": 5,
      "b": 3
    }
  }
}
EOF

# 4. Validate JSON types
jq '.params.arguments.a | type' request.json  # Should be "number" not "string"

# 5. For shells, use proper JSON formatting
# Don't: -d '{"a":"5"}'
# Do:    -d '{"a":5}'
```

**Prevention:**
- Use proper JSON serialization
- Don't quote numbers/booleans
- Validate types before sending
- Use TypeScript for compile-time checking

**Related:** [VALIDATION-GUIDE.md - Type Validation](../VALIDATION-GUIDE.md)

---

### Required Field Missing

**Problem:** "Required field missing" error.

**Cause:** Schema defines field as required but it's not provided in input.

**Solution:**
```bash
# 1. Check which fields are required
jq '.tools[] | select(.name == "greet") | .inputSchema.required' mcp/config.json

# 2. Verify you're providing all required fields
cat > request.json <<'EOF'
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "greet",
    "arguments": {
      "name": "Test"
    }
  }
}
EOF

# Compare required vs provided
jq '.params.arguments | keys' request.json

# 3. Add missing fields
jq '.params.arguments.missingField = "value"' request.json

# 4. Check for typos in field names
# Schema: { required: ["name"] }
# Wrong: { "Name": "Test" }  # Capital N
# Right: { "name": "Test" }

# 5. Verify null/undefined handling
# Wrong: { "name": null }     # null not allowed
# Right: { "name": "Test" }   # actual value
```

**Prevention:**
- Check required fields before calling
- Create input validation functions
- Use TypeScript interfaces
- Test with missing fields

**Related:** [VALIDATION-GUIDE.md - Required Fields](../VALIDATION-GUIDE.md)

---

### Pattern Validation Fails

**Problem:** "Does not match pattern" or "Invalid format" error.

**Cause:** String value doesn't match regex pattern defined in schema.

**Solution:**
```bash
# 1. Check pattern in schema
jq '.tools[] | select(.name == "email") | .inputSchema.properties.email.pattern' mcp/config.json

# 2. Test pattern matching
node -e "
const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const email = 'test@example.com';
console.log(pattern.test(email) ? '✓ Match' : '✗ No match');
"

# 3. Common pattern requirements:

# Email pattern
# Pattern: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
# Valid: test@example.com
# Invalid: test@example

# Phone pattern
# Pattern: ^\+?[1-9]\d{1,14}$
# Valid: +1234567890
# Invalid: 123-456-7890

# UUID pattern
# Pattern: ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
# Valid: 123e4567-e89b-12d3-a456-426614174000
# Invalid: not-a-uuid

# 4. Fix input to match pattern
# Use validator library for complex patterns
npm install validator
node -e "
const validator = require('validator');
const email = 'test@example.com';
console.log(validator.isEmail(email) ? '✓ Valid email' : '✗ Invalid email');
"
```

**Prevention:**
- Document expected formats
- Use validation libraries
- Provide format examples in errors
- Test pattern matching

**Related:** [VALIDATION-GUIDE.md - Pattern Validation](../VALIDATION-GUIDE.md)

---

## Transport Issues

### Stdio Communication Problems

**Problem:** Stdio server doesn't respond to input or test fails with "Communication pattern mismatch".

**Cause:** Message framing mismatch - server expects line-delimited JSON-RPC.

**Solution:**
```bash
# 1. Verify server is reading line-by-line
grep "readline" mcp/servers/stdioServer.ts

# 2. Send messages with newline delimiter
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","clientInfo":{"name":"test","version":"1.0"}}}' | npx tsx mcp/servers/stdioServer.ts mcp/config-test.json

# 3. For testing, use proper client
npx tsx mcp/tests/test-stdio-client.ts

# 4. Debug stdio communication
# Add logging to server:
# console.error('[DEBUG] Received line:', line);

# 5. Check for buffer issues
# Ensure stdin is flushed:
process.stdin.setEncoding('utf8');
```

**Prevention:**
- Use MCP SDK StdioServerTransport
- Send line-delimited JSON-RPC
- Test with official clients
- Document stdio protocol

**Related:** [TRANSPORTS.md - Stdio Transport](../TRANSPORTS.md#stdio-transport), [mcp-transport-tests-fixes.md](../../issues/mcp-transport-tests-fixes.md)

---

### HTTP Connection Refused

**Problem:** "ECONNREFUSED" when connecting to HTTP server.

**Cause:** Server not running, wrong port, or firewall blocking connection.

**Solution:**
```bash
# 1. Verify server is running
ps aux | grep "tsx.*configurableServer"

# 2. Check server is listening on correct port
lsof -i :3002

# 3. Test with curl
curl -v http://localhost:3002/mcp

# 4. Check for firewall issues
sudo iptables -L | grep 3002

# 5. Verify port in config matches request
jq '.port' mcp/config.json
echo "Requesting: http://localhost:3002"

# 6. Try 127.0.0.1 instead of localhost
curl http://127.0.0.1:3002/mcp

# 7. Check if port is accessible
telnet localhost 3002

# 8. Start server if not running
npx tsx mcp/configurableServer.ts mcp/config.json &
sleep 3
curl http://localhost:3002/health
```

**Prevention:**
- Verify server started successfully
- Use health check endpoint
- Check logs for startup errors
- Document correct port numbers

**Related:** [TRANSPORTS.md - HTTP Transport](../TRANSPORTS.md#http-transport)

---

### SSE Timeout

**Problem:** SSE connection hangs or times out waiting for events.

**Cause:** Client not properly parsing SSE event format or connection not maintained.

**Solution:**
```bash
# 1. Test SSE connection with timeout
timeout 10s curl -N http://localhost:3004/mcp

# 2. Parse SSE events correctly
# SSE format:
# event: endpoint
# data: {"sessionId":"abc-123"}

# 3. Extract session ID from SSE stream
session_id=$(timeout 5s curl -s -N http://localhost:3004/mcp | grep -A1 "event: endpoint" | grep "data:" | jq -r '.sessionId')
echo "Session ID: $session_id"

# 4. Use the session ID for messages
curl -X POST "http://localhost:3004/messages?sessionId=$session_id" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# 5. Check server SSE implementation
grep "SSEServerTransport" mcp/servers/sseServer.ts

# 6. Verify SSE headers
curl -i -N http://localhost:3004/mcp | head -20
# Should see:
# Content-Type: text/event-stream
# Cache-Control: no-cache
# Connection: keep-alive
```

**Prevention:**
- Use proper SSE client library
- Add timeout to connections
- Handle connection drops
- Consider using stateful HTTP instead

**Related:** [TRANSPORTS.md - SSE Transport](../TRANSPORTS.md#sse-transport), [mcp-transport-tests-fixes.md](../../issues/mcp-transport-tests-fixes.md#issue-4-sse-event-parser-moderate---20-min)

---

### Session ID Issues

**Problem:** "Invalid or missing session ID" error in stateful mode.

**Cause:** Session ID not extracted correctly from headers or not sent with request.

**Solution:**
```bash
# 1. Initialize and capture session ID
response=$(curl -i -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","clientInfo":{"name":"test","version":"1.0"}}}')

# 2. Extract session ID (case-insensitive)
session_id=$(echo "$response" | grep -i "^mcp-session-id:" | head -1 | sed 's/^[^:]*: *//' | tr -d '\r\n ')
echo "Session ID: $session_id"

# 3. Verify session ID is not empty
if [ -z "$session_id" ]; then
  echo "✗ Failed to extract session ID"
  echo "$response" | grep -i "mcp-session-id"
else
  echo "✓ Session ID: $session_id"
fi

# 4. Use session ID in subsequent requests
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $session_id" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# 5. Check header name (case matters in some clients)
# Server sends: mcp-session-id (lowercase)
# Use exactly: Mcp-Session-Id in requests
```

**Prevention:**
- Use case-insensitive header matching
- Log session IDs for debugging
- Validate session ID before using
- Handle session expiration

**Related:** [TRANSPORTS.md - Stateful HTTP](../TRANSPORTS.md#stateful-http), [mcp-transport-tests-fixes.md](../../issues/mcp-transport-tests-fixes.md#issue-1-session-id-extraction-easy---5-min)

---

### CORS Errors

**Problem:** "CORS policy" error in browser console.

**Cause:** Cross-origin requests blocked by browser security.

**Solution:**
```bash
# 1. Enable CORS in server config
jq '.cors = {"enabled": true, "origins": ["*"]}' mcp/config.json

# 2. Check CORS headers
curl -i -X OPTIONS http://localhost:3002/mcp \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"

# Should see:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: POST, GET, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Mcp-Session-Id

# 3. For production, specify allowed origins
jq '.cors.origins = ["https://yourdomain.com"]' mcp/config.json

# 4. Verify CORS middleware is loaded
grep "cors" mcp/configurableServer.ts

# 5. Test from browser
fetch('http://localhost:3002/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({...})
}).then(r => r.json()).then(console.log);
```

**Prevention:**
- Enable CORS in development
- Restrict origins in production
- Include all required headers
- Test cross-origin requests

**Related:** [DEPLOYMENT.md - CORS Configuration](../DEPLOYMENT.md#security-hardening)

---

## Performance Issues

### Server Slow to Respond

**Problem:** Requests take several seconds to complete.

**Cause:** Slow handlers, no caching, inefficient validation, or resource constraints.

**Solution:**
```bash
# 1. Measure request timing
time curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"greet","arguments":{"name":"Test"}}}'

# 2. Check handler timeouts
jq '.tools[].handler.timeout' mcp/config.json

# 3. Enable performance logging
LOG_LEVEL=debug npx tsx mcp/configurableServer.ts mcp/config.json | grep "execution time"

# 4. Profile handler execution
cat > profile-handler.js <<'EOF'
import { performance } from 'perf_hooks';
import handler from './mcp/handlers/examples/greetHandler.js';

const start = performance.now();
await handler.default({ name: 'Test' }, { sessionId: 'test', logger: console, metadata: {} });
const end = performance.now();
console.log(`Handler execution time: ${end - start}ms`);
EOF

npx tsx profile-handler.js
rm profile-handler.js

# 5. Optimize slow handlers:
# - Add caching
# - Reduce external API calls
# - Use connection pooling
# - Optimize database queries

# 6. Check system resources
top -p $(pgrep -f "tsx.*configurableServer")
free -h
df -h
```

**Prevention:**
- Set realistic handler timeouts
- Implement caching strategies
- Monitor handler performance
- Use load testing

**Related:** [DEPLOYMENT.md - Performance Tuning](../DEPLOYMENT.md#performance-tuning)

---

### Memory Usage High

**Problem:** Server memory usage grows over time.

**Cause:** Memory leak, unbounded caching, or session accumulation.

**Solution:**
```bash
# 1. Monitor memory usage
watch -n 5 'ps aux | grep "tsx.*configurableServer" | grep -v grep | awk "{print \$4, \$6}"'

# 2. Check for memory leaks with heapdump
npm install heapdump
node --expose-gc --inspect mcp/configurableServer.ts mcp/config.json

# Open Chrome DevTools → Memory → Take heap snapshot

# 3. Limit session cache size
jq '.sessionCacheSize = 1000' mcp/config.json

# 4. Enable session cleanup
jq '.sessionTimeout = 3600' mcp/config.json  # 1 hour

# 5. Increase Node.js memory limit if needed
NODE_OPTIONS="--max-old-space-size=2048" npx tsx mcp/configurableServer.ts mcp/config.json

# 6. Restart server periodically in production
# Use pm2 with max_memory_restart:
pm2 start mcp/configurableServer.ts --interpreter tsx --max-memory-restart 500M -- mcp/config.json

# 7. Profile memory usage
node --prof mcp/configurableServer.ts mcp/config.json
# Process prof file with: node --prof-process isolate-*.log
```

**Prevention:**
- Implement session expiration
- Limit cache sizes
- Clear unused resources
- Monitor memory metrics
- Use streaming for large data

**Related:** [DEPLOYMENT.md - Memory Management](../DEPLOYMENT.md#performance-tuning)

---

### Request Timeouts

**Problem:** Requests timeout before completion.

**Cause:** Handler takes longer than configured timeout or network latency.

**Solution:**
```bash
# 1. Check current timeout settings
jq '.requestTimeout' mcp/config.json
jq '.tools[].handler.timeout' mcp/config.json

# 2. Increase request timeout
jq '.requestTimeout = 30000' mcp/config.json  # 30 seconds

# 3. Increase handler timeout for slow operations
jq '(.tools[] | select(.name == "fetch-data") | .handler.timeout) = 60000' mcp/config.json

# 4. Test with longer timeout
curl --max-time 60 -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"slow-tool","arguments":{}}}'

# 5. Implement progress reporting for long operations
# Use streaming response or status endpoint

# 6. Consider async processing
# Return job ID immediately, poll for results
```

**Prevention:**
- Set appropriate timeouts per tool
- Implement async processing
- Add progress indicators
- Optimize slow operations

**Related:** [HANDLER-GUIDE.md - Timeouts](../HANDLER-GUIDE.md#timeouts)

---

### Handler Execution Slow

**Problem:** Specific handler takes too long to execute.

**Cause:** Inefficient algorithm, blocking I/O, or external service latency.

**Solution:**
```bash
# 1. Profile specific handler
cat > profile.js <<'EOF'
import { performance } from 'perf_hooks';
import handler from './mcp/handlers/examples/calculateHandler.js';

const iterations = 100;
const times = [];

for (let i = 0; i < iterations; i++) {
  const start = performance.now();
  await handler.default(
    { operation: 'add', a: 5, b: 3 },
    { sessionId: 'test', logger: console, metadata: {} }
  );
  times.push(performance.now() - start);
}

const avg = times.reduce((a, b) => a + b) / times.length;
const min = Math.min(...times);
const max = Math.max(...times);

console.log(`Average: ${avg.toFixed(2)}ms`);
console.log(`Min: ${min.toFixed(2)}ms`);
console.log(`Max: ${max.toFixed(2)}ms`);
EOF

npx tsx profile.js
rm profile.js

# 2. Optimize handler code:

# Use async/await properly
# Bad:  const result = someAsyncFunc().then(...)
# Good: const result = await someAsyncFunc()

# Avoid blocking operations
# Bad:  const data = fs.readFileSync('large.json')
# Good: const data = await fs.promises.readFile('large.json')

# Implement caching
const cache = new Map();
if (cache.has(key)) return cache.get(key);
const result = await expensiveOperation();
cache.set(key, result);

# Use connection pooling for databases
# Use HTTP keep-alive for API calls

# 3. Move heavy operations to separate service
# Use HTTP handler to call optimized service

# 4. Add caching middleware
jq '.cache = {"enabled": true, "ttl": 300}' mcp/config.json
```

**Prevention:**
- Profile handlers during development
- Use efficient algorithms
- Implement caching
- Offload heavy processing

**Related:** [HANDLER-GUIDE.md - Performance](../HANDLER-GUIDE.md#performance)

---

## Testing Issues

### Tests Failing

**Problem:** Test suite fails with various errors.

**Cause:** Server not started, incorrect expectations, or test environment issues.

**Solution:**
```bash
# 1. Run original working test suite
bash mcp/test-framework.sh

# 2. Check if server is running
lsof -i :3002

# 3. Kill any existing server processes
pkill -f "tsx.*configurableServer"

# 4. Check test configuration
jq '.' mcp/config-test.json

# 5. Run tests with verbose output
bash -x mcp/tests/test-stateful-http.sh

# 6. Check test dependencies
npm list curl jq

# 7. Verify test server logs
tail -f /tmp/mcp-stateful-server.log

# 8. Run single test in isolation
# Extract one test from test script and run separately

# 9. Compare with working examples
diff mcp/config-test.json mcp/config.json
```

**Prevention:**
- Keep working test suite as reference
- Clean up server processes between tests
- Use consistent test configuration
- Document test requirements

**Related:** [TESTING.md](../TESTING.md), [mcp-transport-tests-fixes.md](../../issues/mcp-transport-tests-fixes.md)

---

### Session ID Extraction in Tests

**Problem:** Tests fail with "Failed to extract session ID".

**Cause:** Header parsing doesn't handle response format correctly.

**Solution:**
```bash
# 1. Debug response headers
curl -i -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","clientInfo":{"name":"test","version":"1.0"}}}' | grep -i "mcp-session-id"

# 2. Use improved extraction function
extract_session_id() {
  local response=$1
  # Extract from response headers (case-insensitive, trim whitespace)
  echo "$response" | grep -i "^mcp-session-id:" | head -1 | sed 's/^[^:]*: *//' | tr -d '\r\n '
}

# 3. Test extraction
response=$(curl -i -s -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","clientInfo":{"name":"test","version":"1.0"}}}')

session_id=$(extract_session_id "$response")
echo "Extracted session ID: '$session_id'"

# 4. Handle different curl output formats
# Include -i for headers
# Use -s for silent mode
# Parse carefully to handle \r\n

# 5. Fix in test script
# Update mcp/tests/test-stateful-http.sh line 72-76
```

**Prevention:**
- Use robust header parsing
- Test with various curl versions
- Handle whitespace correctly
- Log extraction failures

**Related:** [mcp-transport-tests-fixes.md - Session ID Extraction](../../issues/mcp-transport-tests-fixes.md#issue-1-session-id-extraction-easy---5-min)

---

### Transport Test Timeout

**Problem:** Test hangs and eventually times out.

**Cause:** Server not responding, wrong endpoint, or test waiting for events that never arrive.

**Solution:**
```bash
# 1. Add timeout to curl commands
timeout 10s curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","clientInfo":{"name":"test","version":"1.0"}}}'

# 2. Check server is responding
curl --max-time 5 -X POST http://localhost:3002/health

# 3. Verify correct endpoint
jq '.port' mcp/config-test.json
echo "Testing endpoint: http://localhost:3002/mcp"

# 4. For SSE tests, handle streaming correctly
timeout 5s curl -N http://localhost:3004/mcp | head -10

# 5. Add timeout to test script
MAX_WAIT=30
START_TIME=$(date +%s)
while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  if [ $ELAPSED -gt $MAX_WAIT ]; then
    echo "✗ Test timed out after ${MAX_WAIT}s"
    exit 1
  fi
  # Test logic here
  sleep 1
done

# 6. Debug with curl verbose mode
curl -v --max-time 10 http://localhost:3002/mcp
```

**Prevention:**
- Add timeouts to all network operations
- Implement test timeout guards
- Use health checks before tests
- Log test progress

**Related:** [mcp-transport-tests-fixes.md - SSE Timeout](../../issues/mcp-transport-tests-fixes.md#issue-4-sse-event-parser-moderate---20-min)

---

### Validation Test Failures

**Problem:** Validation tests don't catch expected errors.

**Cause:** Validation disabled, incorrect schema, or error not propagated.

**Solution:**
```bash
# 1. Verify validation is enabled
jq '.security.inputValidation.enabled' mcp/config-test.json

# 2. Enable validation if disabled
jq '.security.inputValidation.enabled = true' mcp/config-test.json > mcp/config-test-new.json
mv mcp/config-test-new.json mcp/config-test.json

# 3. Test validation manually
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"calculate","arguments":{"operation":"invalid","a":"not-a-number","b":3}}}'

# Should return validation error

# 4. Check error response format
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"calculate","arguments":{}}}' | jq '.result.content[0].text'

# 5. Verify schema has proper constraints
jq '.tools[] | select(.name == "calculate") | .inputSchema' mcp/config-test.json
```

**Prevention:**
- Always enable validation in tests
- Test both valid and invalid inputs
- Verify error messages
- Document validation behavior

**Related:** [VALIDATION-GUIDE.md](../VALIDATION-GUIDE.md)

---

## Common Error Messages

### "Failed to load config from X: ENOENT"

**Meaning:** Configuration file not found at specified path.

**Solution:** Verify file exists: `ls -la <path>`, use absolute path, or correct the path.

**Related:** [Config File Not Found](#config-file-not-found)

---

### "Cannot find module '@modelcontextprotocol/sdk'"

**Meaning:** MCP SDK package not installed.

**Solution:** Run `npm install @modelcontextprotocol/sdk`.

**Related:** [Dependencies Missing](#dependencies-missing)

---

### "EADDRINUSE: address already in use"

**Meaning:** Another process is using the configured port.

**Solution:** Kill existing process or change port.

**Related:** [Port Already in Use](#port-already-in-use)

---

### "No resolver found for handler type: X"

**Meaning:** Unsupported or misspelled handler type.

**Solution:** Use file, inline, http, or registry. Check spelling in config.

**Related:** [Handler Registration Fails](#handler-registration-fails)

---

### "Unknown tool: X"

**Meaning:** Requested tool name doesn't match any configured tools.

**Solution:** Run `tools/list` to get available tools, check spelling.

**Related:** [Handler Not Found](#handler-not-found)

---

### "Handler Load Error: Failed to load handler from X"

**Meaning:** Handler file doesn't exist, has syntax errors, or wrong export.

**Solution:** Verify file exists, check syntax, ensure proper export format.

**Related:** [File Handler Can't Load](#file-handler-cant-load)

---

### "Handler Syntax Error: Syntax error in inline handler code"

**Meaning:** Invalid JavaScript in inline handler code string.

**Solution:** Test code syntax, use async functions, proper return format.

**Related:** [Inline Handler Syntax Errors](#inline-handler-syntax-errors)

---

### "Handler Network Error: Request timeout"

**Meaning:** HTTP handler didn't receive response within timeout.

**Solution:** Increase timeout, check external API, verify connectivity.

**Related:** [HTTP Handler Timeout](#http-handler-timeout)

---

### "Handler Timeout Error: Handler execution exceeded timeout"

**Meaning:** Handler took longer than configured timeout to execute.

**Solution:** Increase timeout or optimize handler code.

**Related:** [Request Timeouts](#request-timeouts)

---

### "Validation Error: X: Required field missing"

**Meaning:** Required input field not provided.

**Solution:** Add all required fields from schema.

**Related:** [Required Field Missing](#required-field-missing)

---

### "Validation Error: X: Expected Y but got Z"

**Meaning:** Input field has wrong type.

**Solution:** Use correct type (number not string, etc.).

**Related:** [Type Checking Errors](#type-checking-errors)

---

### "Schema validation failed"

**Meaning:** inputSchema doesn't conform to JSON Schema spec.

**Solution:** Fix schema structure, validate with JSON Schema tool.

**Related:** [Schema Validation Errors](#schema-validation-errors)

---

### "Invalid or missing session ID"

**Meaning:** Session ID not provided or doesn't exist (stateful mode).

**Solution:** Extract session ID from initialize response, include in headers.

**Related:** [Session ID Issues](#session-id-issues)

---

### "ECONNREFUSED"

**Meaning:** Cannot connect to server (not running or wrong port).

**Solution:** Start server, verify port, check firewall.

**Related:** [HTTP Connection Refused](#http-connection-refused)

---

### "CORS policy" (browser)

**Meaning:** Cross-origin request blocked by browser.

**Solution:** Enable CORS in server config.

**Related:** [CORS Errors](#cors-errors)

---

## Debugging Tips

### Enable Verbose Logging

```bash
# Development mode with debug logs
NODE_ENV=development LOG_LEVEL=debug npx tsx mcp/configurableServer.ts mcp/config.json

# Log to file
npx tsx mcp/configurableServer.ts mcp/config.json 2>&1 | tee server.log

# Watch logs in real-time
tail -f server.log | grep -i error
```

### Trace Handler Execution

```bash
# Add console.log to handler
cat > mcp/handlers/examples/debugHandler.ts <<'EOF'
export default async function (args: any, context: any) {
  console.error('[DEBUG] Handler called with:', JSON.stringify(args));
  console.error('[DEBUG] Session ID:', context.sessionId);

  try {
    const result = { content: [{ type: 'text', text: 'OK' }] };
    console.error('[DEBUG] Returning:', JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    throw error;
  }
}
EOF

# Use console.error (not console.log) to keep stdout clean for JSON-RPC
```

### Inspect Validation Errors

```bash
# Enable detailed validation errors
jq '.security.inputValidation.strictMode = true' mcp/config.json

# Test validation with curl
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"calculate","arguments":{"operation":"add"}}}' \
  | jq '.result.content[0].text'

# Should show detailed validation error with field names
```

### Debug Transport Issues

```bash
# Stdio - add line logging
console.error('[DEBUG] Received line:', line);

# HTTP - log all requests
app.use((req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

# SSE - log events
console.error('[DEBUG] Sending SSE event:', eventName, data);

# Stateful - log session operations
console.error('[DEBUG] Session created:', sessionId);
console.error('[DEBUG] Session used:', sessionId);
```

### Use Node.js Inspector

```bash
# Start server with debugger
node --inspect-brk $(which tsx) mcp/configurableServer.ts mcp/config.json

# Open Chrome DevTools
# Navigate to: chrome://inspect
# Click "inspect" under Remote Target

# Set breakpoints, inspect variables, step through code
```

### Test Individual Components

```bash
# Test handler in isolation
cat > test-component.js <<'EOF'
import handler from './mcp/handlers/examples/greetHandler.js';

const args = { name: 'Test' };
const context = {
  sessionId: 'test-session',
  logger: console,
  metadata: { toolName: 'greet' }
};

try {
  const result = await handler.default(args, context);
  console.log('✓ Success:', result);
} catch (error) {
  console.error('✗ Error:', error.message);
}
EOF

npx tsx test-component.js
rm test-component.js

# Test validation
cat > test-validation.js <<'EOF'
import { validateAndSanitize } from './mcp/validation/index.js';

const schema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] };
const data = { name: 'Test' };

const result = validateAndSanitize(data, schema, { validate: true });
console.log(result.valid ? '✓ Valid' : '✗ Invalid:', result.errors);
EOF

npx tsx test-validation.js
rm test-validation.js
```

### Monitor Network Traffic

```bash
# Use tcpdump to capture packets
sudo tcpdump -i lo -A -s 0 'tcp port 3002' | grep -A 10 "POST /mcp"

# Use netcat to test raw HTTP
cat > request.txt <<'EOF'
POST /mcp HTTP/1.1
Host: localhost:3002
Content-Type: application/json
Content-Length: 150

{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","clientInfo":{"name":"test","version":"1.0"}}}
EOF

cat request.txt | nc localhost 3002
rm request.txt
```

### Profile Performance

```bash
# CPU profiling
node --prof $(which tsx) mcp/configurableServer.ts mcp/config.json
# Generate readable output
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect $(which tsx) mcp/configurableServer.ts mcp/config.json
# Open chrome://inspect
# Take heap snapshot, compare snapshots

# Benchmark requests
ab -n 1000 -c 10 -p request.json -T application/json http://localhost:3002/mcp
```

---

## Getting Additional Help

### Documentation Resources

- **README.md** - Framework overview and quick start
- **ARCHITECTURE.md** - System design and components
- **HANDLER-GUIDE.md** - Creating and configuring handlers
- **VALIDATION-GUIDE.md** - Input validation and sanitization
- **TRANSPORTS.md** - Transport types and usage
- **DEPLOYMENT.md** - Production deployment guide
- **API-EXAMPLES.md** - Client code examples
- **TESTING.md** - Testing guide and known issues

### Issue Tracking

- **issues/mcp-transport-tests-fixes.md** - Known test issues and fixes
- **GitHub Issues** - Report bugs and request features

### Diagnostic Commands Summary

```bash
# Quick health check
curl http://localhost:3002/health
ps aux | grep tsx
lsof -i :3002

# Validate configuration
jq empty mcp/config.json
jq '.tools[].handler | {type, path, code, url}' mcp/config.json

# Test connectivity
curl -X POST http://localhost:3002/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","clientInfo":{"name":"test","version":"1.0"}}}'

# View logs
tail -f /tmp/mcp-stateful-server.log
journalctl -u mcp-server -f

# Check resources
top -p $(pgrep -f "tsx.*configurableServer")
free -h
df -h
```

### Getting Help Checklist

Before asking for help, ensure you have:

- [ ] Checked this troubleshooting guide
- [ ] Reviewed relevant documentation
- [ ] Verified configuration is valid JSON
- [ ] Confirmed server is running
- [ ] Tested with working examples
- [ ] Checked logs for errors
- [ ] Tried diagnostic commands
- [ ] Isolated the problem (specific handler, transport, etc.)
- [ ] Documented reproduction steps
- [ ] Gathered error messages and logs

### Support Channels

1. **Documentation** - Read all relevant docs first
2. **Examples** - Compare your config with working examples
3. **Tests** - Run test suite to identify issues
4. **Issues** - Search existing issues for similar problems
5. **New Issue** - Create detailed bug report with reproduction steps

---

**End of Troubleshooting Guide**

*For the latest version of this guide, see `/mcp/docs/TROUBLESHOOTING.md`*
