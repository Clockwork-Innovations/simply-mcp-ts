# Dry-Run Mode Guide

## Overview

The dry-run mode validates your MCP server configuration without actually starting the server. This is useful for:

- Quick validation during development
- CI/CD pipeline integration
- Pre-deployment checks
- Configuration debugging

## Basic Usage

### Validate a Server

```bash
# Basic validation
simplymcp run server.ts --dry-run

# With TypeScript files
npx tsx dist/mcp/cli/index.js run server.ts --dry-run
```

### JSON Output (for CI/CD)

```bash
# Get machine-readable output
simplymcp run server.ts --dry-run --json
```

### Validate with HTTP Transport

```bash
# Validate HTTP configuration and port
simplymcp run server.ts --dry-run --http --port 3000
```

### Force API Style

```bash
# Force decorator API style detection
simplymcp run server.ts --dry-run --style decorator

# Force functional API style
simplymcp run server.ts --dry-run --style functional
```

## Output Formats

### Human-Readable Output

Shows a clear, formatted summary:

```
✓ Dry run complete

Server Configuration:
  Name: my-server
  Version: 1.0.0
  API Style: decorator
  
Transport:
  Type: stdio
  Port: N/A (stdio mode)

Capabilities:
  Tools: 6
    - greet: Greet a user with a personalized message
    - add: Add two numbers together
    ...
  
  Prompts: 1
    - codeReview: Generate a code review prompt
  
  Resources: 2
    - serverConfig: Resource serverConfig
    - README: Resource README

Status: ✓ Ready to run
```

### JSON Output

Structured data for automation:

```json
{
  "success": true,
  "detectedStyle": "decorator",
  "serverConfig": {
    "name": "my-server",
    "version": "1.0.0"
  },
  "tools": [
    {
      "name": "greet",
      "description": "Greet a user"
    }
  ],
  "prompts": [],
  "resources": [],
  "transport": "stdio",
  "portConfig": 3000,
  "warnings": [],
  "errors": []
}
```

## Validation Checks

### Errors (Will Cause Failure)

1. **Missing Required Fields**
   - Server name
   - Server version

2. **Duplicate Tool Names**
   - Each tool must have a unique name

3. **Invalid Port**
   - Port must be between 1-65535 (only checked with --http)

4. **Missing Tool Names**
   - All tools must have a name field

### Warnings (Won't Cause Failure)

1. **Version Format**
   - Version should follow semver (x.y.z)

2. **Naming Conventions**
   - Tools should use kebab-case naming (e.g., 'get-user' not 'GetUser')

3. **Missing Descriptions**
   - Tools should have descriptions for better UX

4. **Large Tool Count**
   - Warning if server has > 50 tools

## Exit Codes

- **0**: Validation passed (no errors)
- **1**: Validation failed (has errors)

Use exit codes in scripts:

```bash
#!/bin/bash
if simplymcp run server.ts --dry-run; then
  echo "Validation passed!"
  # Deploy or run the server
else
  echo "Validation failed!"
  exit 1
fi
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Validate MCP Server
  run: |
    npm run build
    npx tsx dist/mcp/cli/index.js run server.ts --dry-run --json > validation.json
    
- name: Check Validation
  run: |
    if ! jq -e '.success == true' validation.json; then
      echo "Server validation failed"
      jq '.errors[]' validation.json
      exit 1
    fi
```

### GitLab CI

```yaml
validate:
  script:
    - npm run build
    - npx tsx dist/mcp/cli/index.js run server.ts --dry-run --json
  only:
    - merge_requests
```

### Jenkins

```groovy
stage('Validate MCP Server') {
  steps {
    sh 'npm run build'
    sh 'npx tsx dist/mcp/cli/index.js run server.ts --dry-run'
  }
}
```

## Examples

### Example 1: Valid Server

```bash
$ npx tsx dist/mcp/cli/index.js run mcp/examples/class-basic.ts --dry-run

✓ Dry run complete

Server Configuration:
  Name: my-server
  Version: 1.0.0
  API Style: decorator
  
Transport:
  Type: stdio
  Port: N/A (stdio mode)

Capabilities:
  Tools: 6
  Prompts: 1
  Resources: 2

Status: ✓ Ready to run
```

Exit code: 0

### Example 2: Server with Warnings

```bash
$ npx tsx dist/mcp/cli/index.js run mcp/examples/single-file-basic.ts --dry-run

✓ Dry run complete

...

Warnings:
  - Tool 'get_timestamp' doesn't follow kebab-case naming convention

Status: ✓ Ready to run
```

Exit code: 0 (warnings don't fail validation)

### Example 3: Server with Errors

```bash
$ npx tsx dist/mcp/cli/index.js run bad-server.ts --dry-run

✗ Dry run failed

...

Errors:
  - Missing required field: name
  - Missing required field: version
  - Duplicate tool name: greet

Status: ✗ Cannot run (fix errors above)
```

Exit code: 1

### Example 4: JSON Output

```bash
$ npx tsx dist/mcp/cli/index.js run server.ts --dry-run --json
{
  "success": true,
  "detectedStyle": "decorator",
  "serverConfig": {
    "name": "my-server",
    "version": "1.0.0"
  },
  "tools": [...],
  "prompts": [...],
  "resources": [...],
  "warnings": [],
  "errors": []
}
```

## Common Use Cases

### 1. Pre-Commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "Validating MCP server..."
if ! simplymcp run src/server.ts --dry-run; then
  echo "❌ Server validation failed. Fix errors before committing."
  exit 1
fi
echo "✅ Server validation passed!"
```

### 2. VS Code Task

Add to `.vscode/tasks.json`:

```json
{
  "label": "Validate MCP Server",
  "type": "shell",
  "command": "npx tsx dist/mcp/cli/index.js run ${file} --dry-run",
  "problemMatcher": []
}
```

### 3. npm Script

Add to `package.json`:

```json
{
  "scripts": {
    "validate": "tsx dist/mcp/cli/index.js run src/server.ts --dry-run",
    "validate:json": "tsx dist/mcp/cli/index.js run src/server.ts --dry-run --json"
  }
}
```

### 4. Makefile

```makefile
.PHONY: validate
validate:
	npm run build
	npx tsx dist/mcp/cli/index.js run src/server.ts --dry-run

.PHONY: validate-json
validate-json:
	npm run build
	npx tsx dist/mcp/cli/index.js run src/server.ts --dry-run --json
```

## API Support

Dry-run works with all SimplyMCP API styles:

- ✅ **Decorator API** - Full validation with metadata extraction
- ✅ **Functional API** - Full validation of config structure
- ⚠️ **Programmatic API** - Limited validation (config self-managed)

## Best Practices

1. **Run before commits**: Validate before committing code
2. **Use in CI/CD**: Add to deployment pipelines
3. **Check exit codes**: Use exit codes for automation
4. **Review warnings**: Address warnings for better UX
5. **Use JSON in automation**: Parse JSON output in scripts

## Troubleshooting

### "Invalid or unexpected token"

If you see this error, you're trying to load TypeScript files with plain node. Use `tsx`:

```bash
# Wrong
node dist/mcp/cli/index.js run server.ts --dry-run

# Right
npx tsx dist/mcp/cli/index.js run server.ts --dry-run
```

### "No class found in module"

For decorator API, ensure:
- Class is exported (default or named)
- Class has @MCPServer decorator
- File is valid TypeScript/JavaScript

### "Config file must have a default export"

For functional API, ensure:
- File has `export default defineMCP(...)`
- Config object is properly formatted

## See Also

- [CLI Documentation](./CLI.md)
- [Configuration Guide](./CONFIGURATION.md)
- [API Styles](./API-STYLES.md)
