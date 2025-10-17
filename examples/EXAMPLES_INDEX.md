# Simply MCP Examples Index

All 50+ examples organized by use case. Run any with:
```bash
npx tsx examples/[filename].ts
```

## Getting Started (Pick One)

These are the entry points for each API style:

- **`single-file-basic.ts`** - Functional API: Hello World (START HERE!)
- **`class-basic.ts`** - Decorator API: Hello World
- **`interface-minimal.ts`** - Interface API: Hello World
- **`mcp-builder-foundation.ts`** - MCPBuilder: Hello World

## Adding Features

### Tools (Capabilities)
- **`single-file-advanced.ts`** - Add multiple tools (Functional)
- **`class-advanced.ts`** - Add tools with class decorators (Decorator)
- **`interface-advanced.ts`** - Add tools with types (Interface)
- **`mcp-builder-complete.ts`** - Add tools with builder pattern (MCPBuilder)

### Prompts
- **`class-prompts-resources.ts`** - Prompts & resources (Decorator style)

### Resources
- See `class-prompts-resources.ts` for resource examples

### Error Handling
- **`auto-install-error-handling.ts`** - Proper error handling patterns

## Specific Features

### Auto-Install Dependencies
- **`auto-install-basic.ts`** - Basic auto-install
- **`auto-install-advanced.ts`** - Advanced dependency scenarios

### Binary Content (Files, Images)
- **`binary-content-demo.ts`** - Handle binary data

### Inline Dependencies
- **`inline-deps-demo.ts`** - Include dependencies inline

### Bundling
- **`calculator-bundle/`** - Complete bundle example
- **`weather-bundle/`** - Another bundle example
- **`single-file-clean.ts`** - Production-ready single file

### Debugging
- **`debug-demo.ts`** - Basic debugging
- **`debug-breakpoint-demo.ts`** - Debug with breakpoints

### Performance
- **`dev/performance-demo.ts`** - Performance optimization patterns

### Watch Mode
- Run any example with `--watch` flag:
  ```bash
  npx simply-mcp run examples/single-file-basic.ts --watch
  ```

### Transport Options (HTTP, WebSocket, etc.)
- All examples work with:
  ```bash
  npx simply-mcp run examples/[file].ts --http --port 3000
  ```
- See [TRANSPORT_GUIDE.md](../docs/guides/TRANSPORT_GUIDE.md)

## Advanced

### Dynamic Server Building
- **`mcp-builder-interactive.ts`** - Interactive builder
- **`mcp-builder-layer2.ts`** - Advanced layer 2 features

### Multiple APIs Comparison
- **`phase1-features.ts`** - Feature showcase across APIs
- **`advanced-server.ts`** - Complex real-world example

### UI Integration
- **`ui-feature-demo.ts`** - UI component integration
- **`ui-foundation-demo.ts`** - Foundation for UI
- **`ui-remote-dom-demo.ts`** - Remote DOM features
- **`ui-all-apis-demo.ts`** - All UI features

### Video Processing
- **`video-editor-mcp/`** - Video processing example

### Next.js Integration
- **`nextjs-mcp-ui/`** - Full Next.js + MCP integration with UI

---

## By Feature

### Logging & Debugging
Search examples for:
- `console.log()` - Basic logging
- `--verbose` - Verbose CLI output
- `debug-demo.ts` - Debug utilities

### Configuration
- See `CONFIGURATION_GUIDE.md` for config patterns
- All examples show basic setup

### Error Handling
- `auto-install-error-handling.ts` - Error patterns
- All examples show try-catch patterns

### Testing
- Examples work directly with `npx tsx`
- Run with `--dry-run` to validate:
  ```bash
  npx simply-mcp run examples/single-file-basic.ts --dry-run
  ```

### Performance
- `dev/performance-demo.ts` - Optimization techniques

---

## Running Examples

### Basic Run
```bash
npx tsx examples/single-file-basic.ts
```

### With Arguments
```bash
# HTTP transport
npx simply-mcp run examples/single-file-basic.ts --http --port 3000

# Watch mode
npx simply-mcp run examples/single-file-basic.ts --watch

# Verbose output
npx simply-mcp run examples/single-file-basic.ts --verbose

# Dry-run (validate without executing)
npx simply-mcp run examples/single-file-basic.ts --dry-run
```

### Building Bundles
```bash
# Create single executable
npx simplymcp bundle examples/single-file-basic.ts -o my-server.js

# Create package bundle
npx simplymcp bundle examples/single-file-basic.ts -f package -o ./my-bundle
```

---

## Not Sure Where to Start?

1. **New to MCP?** → Start with `single-file-basic.ts`
2. **Prefer classes?** → Start with `class-basic.ts`
3. **Need type safety?** → Start with `interface-minimal.ts`
4. **Building dynamically?** → Start with `mcp-builder-foundation.ts`

Then:
1. Run the example: `npx tsx examples/[your-pick].ts`
2. Read the code: `cat examples/[your-pick].ts`
3. Modify it: Edit and add your own tool
4. Add more features: See "Adding Features" section above
5. Learn more: Read the guides in `docs/guides/`

---

## Need Help?

- **Can't find what you need?** Search: `grep -r "feature" examples/`
- **Want to understand something?** Check the comment at the top of each example
- **Need documentation?** See `docs/guides/`
- **Having issues?** Check `docs/guides/TROUBLESHOOTING.md` (or create an issue!)
