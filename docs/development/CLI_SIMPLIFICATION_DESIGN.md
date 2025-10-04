# CLI Simplification Design Document

## Executive Summary

This design simplifies SimplyMCP server configuration from verbose commands like:
```bash
npx tsx node_modules/simply-mcp/mcp/class-adapter.ts server.ts
```

To clean, intuitive commands:
```bash
simplymcp run server.ts              # Auto-detect API style
simplymcp-class server.ts            # Explicit decorator API
simplymcp-func server.ts             # Explicit functional API
```

## 1. Current State Analysis

### Existing API Styles

1. **Decorator API** (Class-based)
   - Uses `@MCPServer` decorator on classes
   - Public methods auto-register as tools
   - Handled by `mcp/class-adapter.ts`
   - Example: `mcp/examples/class-minimal.ts`

2. **Functional API** (Single-file)
   - Uses `defineMCP()` function with config object
   - Tools defined as array of objects
   - Handled by `mcp/adapter.ts`
   - Example: `mcp/examples/single-file-basic.ts`

3. **Programmatic API** (Direct instantiation)
   - Uses `new SimplyMCP()` constructor
   - Tools added via `server.addTool()`
   - Self-contained, runs directly with `npx tsx`
   - Example: `mcp/examples/simple-server.ts`

### Current Adapter Architecture

**mcp/adapter.ts** (Functional API):
- Loads config file via dynamic import
- Expects `export default defineMCP({...})`
- Validates required fields: `name`, `version`
- Creates `SimplyMCP` instance and registers tools/prompts/resources
- Supports `--http` and `--port` flags

**mcp/class-adapter.ts** (Decorator API):
- Imports `reflect-metadata` for decorator support
- Loads class file via dynamic import
- Extracts decorator metadata using `getServerConfig()`, `getTools()`, etc.
- Parses TypeScript AST for parameter types
- Auto-registers public methods (excluding `_private` methods)
- Supports `--http` and `--port` flags

**mcp/cli/index.ts** (Current CLI):
- Uses yargs for command parsing
- Only has `bundle` command currently
- Uses `simplymcp` bin entry point

## 2. Auto-Detection Strategy

### Detection Logic

Auto-detection must analyze file content before execution to determine API style. Detection order:

1. **Decorator API Detection** (Highest Priority)
   - Import regex: `/from\s+['"]simply-mcp(?:\/decorators)?['"].*?@MCPServer/s`
   - Or: Check for `@MCPServer` decorator usage
   - Pattern: Class declaration with `@MCPServer` decorator
   - Example indicators:
     ```typescript
     import { MCPServer } from 'simply-mcp';
     @MCPServer({ name: '...' })
     export default class MyServer {
     ```

2. **Functional API Detection** (Medium Priority)
   - Import regex: `/from\s+['"]simply-mcp(?:\/single-file-types)?['"]/`
   - Export pattern: `export default defineMCP(`
   - Function call: Uses `defineMCP()` helper
   - Example indicators:
     ```typescript
     import { defineMCP } from 'simply-mcp';
     export default defineMCP({
       name: '...',
       tools: [...]
     });
     ```

3. **Programmatic API Detection** (Fallback)
   - Import: `import { SimplyMCP } from 'simply-mcp'`
   - Constructor: `new SimplyMCP({...})`
   - Method calls: `server.addTool()`, `server.start()`
   - Example indicators:
     ```typescript
     import { SimplyMCP } from 'simply-mcp';
     const server = new SimplyMCP({...});
     server.addTool({...});
     await server.start();
     ```

### Detection Implementation

**File Reading Strategy:**
```typescript
async function detectAPIStyle(filePath: string): Promise<'decorator' | 'functional' | 'programmatic'> {
  const content = await fs.readFile(filePath, 'utf-8');

  // Check for decorator API
  if (/@MCPServer/.test(content) &&
      /from\s+['"]simply-mcp(?:\/decorators)?['"]/.test(content)) {
    return 'decorator';
  }

  // Check for functional API
  if (/defineMCP\s*\(/.test(content) &&
      /export\s+default\s+defineMCP/.test(content)) {
    return 'functional';
  }

  // Default to programmatic
  return 'programmatic';
}
```

### Error Cases

1. **File Not Found**
   - Error: "Server file not found: {path}"
   - Exit code: 1

2. **Ambiguous API Style**
   - If multiple patterns detected, use first match in priority order
   - Warn user: "Multiple API styles detected, using {style}"

3. **No Valid Pattern**
   - If programmatic API detected but no `server.start()` call
   - Error: "File does not appear to be a valid MCP server"
   - Suggest: "Use explicit commands: simplymcp-class or simplymcp-func"

4. **Import Errors**
   - Dynamic import failures should show clear error
   - Error: "Failed to load server file: {error.message}"
   - Suggest: "Run 'npm install' to ensure dependencies are installed"

## 3. CLI Command Structure

### Command Hierarchy

```
simplymcp
├── run <file> [options]     # Auto-detect and run server
├── bundle [entry] [options]  # Existing bundle command
└── --help, --version         # Standard flags
```

### Bin Aliases

Update `package.json` bin section:
```json
{
  "bin": {
    "simplymcp": "./dist/mcp/cli/index.js",
    "simplymcp-run": "./dist/mcp/cli/run-adapter.js",
    "simplymcp-class": "./dist/mcp/cli/class-adapter-bin.js",
    "simplymcp-func": "./dist/mcp/cli/func-adapter-bin.js"
  }
}
```

### Command Definitions

**simplymcp run [file] [options]**
- Auto-detects API style
- Delegates to appropriate adapter
- Options:
  - `--http` - Use HTTP transport
  - `--port <number>` - Port for HTTP server (default: 3000)
  - `--style <decorator|functional|programmatic>` - Force API style
  - `--verbose` - Show detection details

**simplymcp-run [file] [options]**
- Direct alias to `simplymcp run`

**simplymcp-class [file] [options]**
- Explicit decorator API runner
- Wraps class-adapter functionality
- Options: `--http`, `--port`

**simplymcp-func [file] [options]**
- Explicit functional API runner
- Wraps adapter functionality
- Options: `--http`, `--port`

### Argument Passing

All transport and configuration flags must pass through:
- `--http` - Enable HTTP transport
- `--port <number>` - HTTP server port
- Future flags: `--log-level`, `--timeout`, etc.

### Usage Examples

```bash
# Auto-detect and run
simplymcp run server.ts

# Auto-detect with HTTP transport
simplymcp run server.ts --http --port 3000

# Force specific API style
simplymcp run server.ts --style decorator

# Explicit decorator API
simplymcp-class server.ts

# Explicit functional API
simplymcp-func server.ts --http
```

## 4. File Structure

### New Files to Create

1. **mcp/cli/run.ts** - Main run command implementation
   - Auto-detection logic
   - Delegation to adapters
   - Error handling

2. **mcp/cli/run-adapter.ts** - Bin entry point for simplymcp-run
   - Shebang: `#!/usr/bin/env node`
   - Simple wrapper that calls run command

3. **mcp/cli/class-adapter-bin.ts** - Bin entry point for simplymcp-class
   - Shebang: `#!/usr/bin/env node`
   - Wraps existing class-adapter logic
   - Reuses core from mcp/class-adapter.ts

4. **mcp/cli/func-adapter-bin.ts** - Bin entry point for simplymcp-func
   - Shebang: `#!/usr/bin/env node`
   - Wraps existing adapter logic
   - Reuses core from mcp/adapter.ts

### Code Reuse Strategy

**Extract Adapter Core Functions:**

1. From `mcp/adapter.ts`:
   - Extract `loadConfig()` - Make it export
   - Extract `createServerFromConfig()` - Make it export
   - Keep original file as standalone script
   - New bin file imports and reuses these functions

2. From `mcp/class-adapter.ts`:
   - Extract `loadClass()` - Make it export
   - Extract `createServerFromClass()` - Make it export
   - Keep original file as standalone script
   - New bin file imports and reuses these functions

3. Create shared utilities in `mcp/cli/adapter-utils.ts`:
   - `parseCommonArgs()` - Parse --http, --port, etc.
   - `startServer()` - Common server start logic
   - `displayServerInfo()` - Common logging

### Updated CLI Index

**mcp/cli/index.ts**:
```typescript
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { bundleCommand } from './bundle.js';
import { runCommand } from './run.js';

yargs(hideBin(process.argv))
  .scriptName('simplymcp')
  .usage('$0 <command> [options]')
  .command(bundleCommand)
  .command(runCommand)  // NEW
  .demandCommand(1, 'You must provide a command')
  .help('h')
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .strict()
  .parse();
```

## 5. Implementation Checklist

### Bicycle Phase (MVP - Core Functionality)

#### Task 1: Refactor Existing Adapters
- [ ] **File: mcp/adapter.ts**
  - [ ] Extract `loadConfig()` to be exportable
  - [ ] Extract `createServerFromConfig()` to be exportable
  - [ ] Keep main() as is for backward compatibility

- [ ] **File: mcp/class-adapter.ts**
  - [ ] Extract `loadClass()` to be exportable
  - [ ] Extract `createServerFromClass()` to be exportable
  - [ ] Keep main() as is for backward compatibility

#### Task 2: Create Shared Utilities
- [ ] **File: mcp/cli/adapter-utils.ts**
  - [ ] Create `parseCommonArgs(argv: string[])` function
  - [ ] Create `startServer(server, options)` function
  - [ ] Create `displayServerInfo(server)` function
  - [ ] Add shared type definitions

#### Task 3: Create Run Command
- [ ] **File: mcp/cli/run.ts**
  - [ ] Implement `detectAPIStyle(filePath)` function
  - [ ] Create yargs command definition
  - [ ] Add `--style` flag for override
  - [ ] Add `--verbose` flag for detection info
  - [ ] Delegate to appropriate adapter based on detection
  - [ ] Handle all error cases with clear messages

#### Task 4: Create Bin Entry Points
- [ ] **File: mcp/cli/run-adapter.ts**
  - [ ] Add shebang line
  - [ ] Import and execute run command
  - [ ] Handle process exit codes

- [ ] **File: mcp/cli/class-adapter-bin.ts**
  - [ ] Add shebang line
  - [ ] Import loadClass and createServerFromClass
  - [ ] Parse args using adapter-utils
  - [ ] Execute class adapter logic

- [ ] **File: mcp/cli/func-adapter-bin.ts**
  - [ ] Add shebang line
  - [ ] Import loadConfig and createServerFromConfig
  - [ ] Parse args using adapter-utils
  - [ ] Execute functional adapter logic

#### Task 5: Update CLI Index
- [ ] **File: mcp/cli/index.ts**
  - [ ] Import runCommand from './run.js'
  - [ ] Add command to yargs configuration
  - [ ] Test help output

#### Task 6: Update Package Configuration
- [ ] **File: package.json**
  - [ ] Add bin entries for all aliases
  - [ ] Verify dist paths match compiled output

#### Task 7: Build and Test
- [ ] Run `npm run build`
- [ ] Test `simplymcp run` with decorator example
- [ ] Test `simplymcp run` with functional example
- [ ] Test `simplymcp run` with programmatic example
- [ ] Test explicit commands: `simplymcp-class`, `simplymcp-func`
- [ ] Test error cases (file not found, invalid format)
- [ ] Test transport flags (--http, --port)

### Motorcycle Phase (Enhanced Features)

#### Task 8: Enhanced Auto-Detection
- [ ] **File: mcp/cli/run.ts**
  - [ ] Add AST parsing for more reliable detection
  - [ ] Handle TypeScript syntax edge cases
  - [ ] Support .js files (compiled output)
  - [ ] Add caching for repeated detection

#### Task 9: Developer Experience Improvements
- [ ] Add `--watch` flag for development
  - [ ] Watch file changes
  - [ ] Auto-restart server on changes
  - [ ] Preserve stdio connection

- [ ] Add `--inspect` flag for debugging
  - [ ] Pass through to Node.js inspector
  - [ ] Show debug URL

- [ ] Add `--dry-run` flag
  - [ ] Detect API style without running
  - [ ] Show what would be executed
  - [ ] Validate configuration

#### Task 10: Configuration File Support
- [ ] Support `simplymcp.config.ts` file
  - [ ] Define default options
  - [ ] Specify entry points
  - [ ] Set transport preferences

- [ ] Add `--config` flag
  - [ ] Load custom config file
  - [ ] Merge with CLI args

#### Task 11: Multi-Server Support
- [ ] Support running multiple servers
  - [ ] `simplymcp run server1.ts server2.ts`
  - [ ] Auto-assign ports
  - [ ] Aggregate logging

- [ ] Add `simplymcp list` command
  - [ ] Show running servers
  - [ ] Display ports and status

#### Task 12: Performance Optimizations
- [ ] Cache detection results
- [ ] Lazy-load adapter modules
- [ ] Optimize import resolution
- [ ] Add startup time metrics

### Completion Criteria

**Bicycle Phase Complete When:**
- All three API styles can be run with `simplymcp run`
- Explicit bin aliases work (`simplymcp-class`, `simplymcp-func`)
- Auto-detection correctly identifies all example files
- Error messages are clear and actionable
- All transport flags pass through correctly
- Backward compatibility maintained (original adapters still work)
- Tests pass for all command variants

**Motorcycle Phase Complete When:**
- Watch mode works reliably
- Configuration files supported
- Multi-server execution works
- Performance is acceptable (< 500ms startup overhead)
- Documentation updated with all new features
- Migration guide created

## 6. Test Strategy

### Unit Tests

**File: mcp/tests/cli/detect-api-style.test.ts**
- Test decorator API detection
- Test functional API detection
- Test programmatic API detection
- Test ambiguous cases
- Test invalid files
- Test edge cases (comments, strings containing keywords)

**File: mcp/tests/cli/run-command.test.ts**
- Test command parsing
- Test style override flag
- Test argument forwarding
- Test error handling
- Test help output

**File: mcp/tests/cli/adapter-utils.test.ts**
- Test parseCommonArgs()
- Test startServer()
- Test displayServerInfo()

### Integration Tests

**File: mcp/tests/cli/run-integration.test.ts**
- Test end-to-end execution with decorator API
- Test end-to-end execution with functional API
- Test end-to-end execution with programmatic API
- Test HTTP transport activation
- Test port assignment
- Test error recovery

**File: mcp/tests/cli/bin-aliases.test.sh**
```bash
#!/bin/bash
# Test all bin aliases work correctly

# Test simplymcp run
npx simplymcp run mcp/examples/class-minimal.ts &
PID=$!
sleep 2
kill $PID

# Test simplymcp-class
npx simplymcp-class mcp/examples/class-minimal.ts &
PID=$!
sleep 2
kill $PID

# Test simplymcp-func
npx simplymcp-func mcp/examples/single-file-basic.ts &
PID=$!
sleep 2
kill $PID

echo "All bin aliases work correctly"
```

### Manual Test Scenarios

1. **Auto-Detection Accuracy**
   - Run `simplymcp run` against each example file
   - Verify correct adapter is chosen
   - Check verbose output shows detection reasoning

2. **Transport Options**
   - Test `--http` flag with each API style
   - Test custom `--port` values
   - Verify server listens on correct port

3. **Error Handling**
   - Test with non-existent file
   - Test with invalid TypeScript syntax
   - Test with missing dependencies
   - Verify error messages are helpful

4. **Backward Compatibility**
   - Verify original adapter commands still work
   - Test with existing user configurations
   - Ensure no breaking changes

5. **Performance**
   - Measure startup time for each command
   - Compare with direct tsx execution
   - Ensure overhead is acceptable

## 7. README Updates

### Before/After Examples

**BEFORE:**
```bash
# Running a class-based server
npx tsx node_modules/simply-mcp/mcp/class-adapter.ts server.ts

# Running a functional server
npx tsx node_modules/simply-mcp/mcp/adapter.ts server.ts

# With HTTP transport
npx tsx node_modules/simply-mcp/mcp/class-adapter.ts server.ts --http --port 3000
```

**AFTER:**
```bash
# Auto-detect and run (recommended)
simplymcp run server.ts

# With HTTP transport
simplymcp run server.ts --http --port 3000

# Explicit API style
simplymcp-class server.ts
simplymcp-func server.ts
```

### Quick Start Section Update

**New Quick Start** (add to README.md):

```markdown
## Running Your Server

SimplyMCP provides multiple ways to run your server:

### Auto-Detection (Recommended)

The simplest way - SimplyMCP automatically detects your API style:

```bash
simplymcp run server.ts
```

### Explicit Commands

If you prefer to be explicit or want faster startup:

```bash
# For decorator API (@MCPServer classes)
simplymcp-class server.ts

# For functional API (defineMCP)
simplymcp-func server.ts
```

### Transport Options

All commands support stdio (default) and HTTP transport:

```bash
# HTTP transport with custom port
simplymcp run server.ts --http --port 3000

# stdio transport (default - for Claude Desktop, etc.)
simplymcp run server.ts
```

### Advanced Options

```bash
# Force specific API style detection
simplymcp run server.ts --style decorator

# Show detection details
simplymcp run server.ts --verbose

# Get help
simplymcp run --help
```
```

### Migration Guide

**Section: Migrating from Adapter Commands**

Add to README.md:

```markdown
## Migration Guide

### From Adapter Commands to Simplified CLI

If you're using the old adapter commands, migrating is simple:

| Old Command | New Command |
|-------------|-------------|
| `npx tsx mcp/class-adapter.ts server.ts` | `simplymcp-class server.ts` |
| `npx tsx mcp/adapter.ts server.ts` | `simplymcp-func server.ts` |
| Both of the above | `simplymcp run server.ts` (auto-detect) |

**Notes:**
- Old commands still work for backward compatibility
- New commands are faster and cleaner
- Auto-detection (`simplymcp run`) works for all API styles

**Example:**

Before:
```bash
npx tsx node_modules/simply-mcp/mcp/class-adapter.ts \
  mcp/examples/class-minimal.ts --http --port 3000
```

After:
```bash
simplymcp run mcp/examples/class-minimal.ts --http --port 3000
```

Or even simpler:
```bash
simplymcp-class mcp/examples/class-minimal.ts --http --port 3000
```
```

### Claude Desktop Configuration Update

**Section: Claude Desktop Integration**

```markdown
## Claude Desktop Configuration

Update your Claude Desktop config to use the simplified commands:

Before (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["tsx", "node_modules/simply-mcp/mcp/class-adapter.ts", "server.ts"]
    }
  }
}
```

After:
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["simplymcp-class", "server.ts"]
    }
  }
}
```

Or with auto-detection:
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["simplymcp", "run", "server.ts"]
    }
  }
}
```
```

## 8. Technical Considerations

### Import Resolution

- All bin files must be compiled to `dist/mcp/cli/`
- Imports from parent directories must use `.js` extensions
- Relative imports: `../adapter.js`, `../../SimplyMCP.js`
- Maintain ESM compatibility

### TypeScript Compilation

tsconfig.json already configured correctly:
- Target: ES2022
- Module: Node16 (ESM)
- Output: dist/

Ensure all new files are included in compilation.

### Error Handling Philosophy

1. **User Errors** (Exit Code 1):
   - File not found
   - Invalid configuration
   - Missing required fields
   - Show helpful error message + suggestion

2. **System Errors** (Exit Code 2):
   - Import failures
   - Compilation errors
   - Runtime exceptions
   - Show error + stack trace if --verbose

3. **Validation Warnings** (Continue):
   - Ambiguous detection
   - Deprecated options
   - Performance suggestions
   - Log to stderr, continue execution

### Performance Targets

- Auto-detection overhead: < 50ms
- Command parsing: < 10ms
- Total startup overhead: < 100ms
- File reading: Use streams for large files
- Lazy loading: Don't import adapters until needed

### Backward Compatibility

**Must Maintain:**
- Original adapter files work unchanged
- Existing user scripts continue to work
- No breaking changes to public APIs
- Environment variable support
- Process signal handling

**Deprecation Path:**
- Document old commands as "legacy" in next major version
- Remove old adapter bin usage from examples
- Keep old files for at least 2 major versions

## 9. Future Enhancements

### Phase 3 (Future)

1. **Init Command**
   ```bash
   simplymcp init my-server --style decorator
   ```
   - Generate starter template
   - Interactive prompts
   - Choose API style

2. **Dev Command**
   ```bash
   simplymcp dev server.ts
   ```
   - Hot reload on changes
   - Pretty logging
   - Interactive debug console

3. **Test Command**
   ```bash
   simplymcp test server.ts
   ```
   - Test tool execution
   - Validate schema
   - Check MCP compliance

4. **Deploy Command**
   ```bash
   simplymcp deploy server.ts --target docker
   ```
   - Generate Dockerfile
   - Create systemd service
   - Build containers

## 10. Success Metrics

### User Experience
- Reduce command length by 70%+
- Support auto-detection 95%+ of cases
- Zero configuration for basic use
- Clear error messages (user testing)

### Developer Experience
- Onboarding time reduced by 50%
- Example complexity decreased
- Documentation simpler and clearer
- Community feedback positive

### Technical
- Startup overhead < 100ms
- Auto-detection accuracy > 95%
- Zero breaking changes
- Test coverage > 80%

## 11. Risk Assessment

### High Risk
- **Breaking Changes**: Mitigate with thorough testing and backward compatibility
- **Detection Failures**: Mitigate with fallback and override options

### Medium Risk
- **Performance Overhead**: Mitigate with lazy loading and caching
- **Complex Error Cases**: Mitigate with comprehensive error handling

### Low Risk
- **Bin Path Issues**: Standard npm bin resolution
- **Import Errors**: Well-tested in build process

## Conclusion

This design provides a complete, implementable path to simplifying SimplyMCP server configuration. The bicycle phase delivers immediate value with a clean, intuitive CLI, while the motorcycle phase adds developer-friendly enhancements. The design maintains backward compatibility while dramatically improving user experience.

**Next Steps:**
1. Review and approve design
2. Begin bicycle phase implementation
3. Create PR with test coverage
4. Update documentation
5. Release as minor version (non-breaking)
