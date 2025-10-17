# Bundle Execution - Quick Start Guide

## What is Bundle Execution?

SimpleMCP can now run entire npm package directories (bundles) as MCP servers, not just single files. This enables distribution of complete MCP servers as npm packages.

## Basic Usage

### Running a Bundle

```bash
# Run any directory with a package.json
simplymcp run ./my-mcp-server

# Run with verbose output
simplymcp run ./my-mcp-server --verbose

# Run with HTTP transport
simplymcp run ./my-mcp-server --http --port 3000
```

## Entry Point Resolution

SimpleMCP automatically finds your server entry point using this priority:

1. **`bin` field** (first entry if object)
2. **`main` field**
3. **`module` field**
4. **Default locations** (src/server.ts, src/index.ts, server.ts, index.ts, etc.)

### Example package.json Configurations

#### Using `bin` field (recommended for CLI servers)
```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "bin": {
    "my-server": "./dist/index.js"
  }
}
```

#### Using `main` field
```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "main": "./src/server.ts"
}
```

#### Using `module` field (ESM)
```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "module": "./src/server.js",
  "type": "module"
}
```

## Test Bundles

Four test bundles are available in `tests/fixtures/bundles/`:

### Calculator Server
```bash
simplymcp run tests/fixtures/bundles/calculator --style functional
# Entry: src/server.ts (via main field)
# Tools: add, subtract, multiply, divide
```

### Weather Server
```bash
simplymcp run tests/fixtures/bundles/weather --style functional
# Entry: src/server.ts (via bin field)
# Tools: get-current-weather, get-forecast
```

### Database Server
```bash
simplymcp run tests/fixtures/bundles/db-server --style functional
# Entry: index.ts at root (via main field)
# Tools: query, get-record, list-tables
```

### Variants Server
```bash
simplymcp run tests/fixtures/bundles/variants --style functional
# Entry: src/server.ts (via module field)
# Tools: echo, get-info
```

## How It Works

1. **Detection:** SimpleMCP checks if the path is a directory with `package.json`
2. **Reading:** Validates `name` and `version` fields are present
3. **Resolution:** Finds entry point using priority order (bin → main → module → defaults)
4. **API Detection:** Auto-detects API style (decorator, functional, interface, etc.)
5. **Execution:** Runs the appropriate adapter with the resolved entry point

## Verbose Mode

Use `--verbose` to see detailed bundle processing:

```bash
simplymcp run ./my-bundle --verbose
```

Output includes:
```
[BundleRunner] Detected package bundle: ./my-bundle
[BundleRunner] Package: my-server@1.0.0
[BundleRunner] Description: My awesome MCP server
[BundleRunner] Resolved entry point: /full/path/to/entry.ts
[BundleRunner] Detected API style: functional
[Adapter] Server: my-server v1.0.0
[Adapter] Loaded: 5 tools, 2 prompts, 1 resources
```

## Compatibility

### ✅ Works With:
- All SimpleMCP API styles (decorator, functional, interface, programmatic, mcp-builder)
- HTTP and STDIO transports
- All CLI flags (--verbose, --dry-run, --http, --port, etc.)
- TypeScript and JavaScript files
- Existing file-based execution (no breaking changes)

### ✅ Tested Entry Points:
- `bin` field (string or object)
- `main` field (standard location)
- `main` field (root level file)
- `module` field
- Default fallbacks

## Tips

1. **Force API Style:** If auto-detection fails, use `--style`:
   ```bash
   simplymcp run ./my-bundle --style functional
   ```

2. **Dry Run:** Validate bundle configuration without starting:
   ```bash
   simplymcp run ./my-bundle --dry-run
   ```

3. **Debug Entry Resolution:** Use `--verbose` to see which entry point was chosen

4. **HTTP Mode:** Bundles work seamlessly with HTTP transport:
   ```bash
   simplymcp run ./my-bundle --http --port 3000
   ```

## Package Structure Example

```
my-mcp-server/
├── package.json          # Required (name + version)
├── README.md             # Optional
├── src/
│   ├── server.ts        # Entry point (if using default)
│   └── tools/
│       └── my-tool.ts
└── node_modules/         # Dependencies (assumed installed)
```

## Validation Status

✅ **Foundation Layer Complete**
- Bundle detection: Working
- Entry point resolution: All fields tested
- API adapter integration: Seamless
- Regression tests: All passing
- Performance: <2s startup

**Ready for Feature Layer** (auto-install, registry integration)

---

For full validation details, see: `BUNDLE-VALIDATION-REPORT.md`
