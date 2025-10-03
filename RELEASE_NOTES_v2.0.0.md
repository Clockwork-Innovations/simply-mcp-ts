# Release Notes - v2.0.0

**Release Date:** 2025-10-03
**Type:** Major Release (Breaking Change - API Rename)

## 🚨 Breaking Changes

### Main Class Renamed: `SimpleMCP` → `SimplyMCP`

The main class has been renamed from `SimpleMCP` to `SimplyMCP` to match the package name `simply-mcp`.

**Why this change?**
- **Consistency:** Package name is `simply-mcp`, class should be `SimplyMCP`
- **Better naming:** "SimplyMCP" reads more naturally than "SimpleMCP"
- **Clarity:** Avoids confusion between "Simple" and "Simply"

## 📦 Migration Guide

### Update Your Imports

**Before (v1.x.x):**
```typescript
import { SimpleMCP } from 'simply-mcp';

const server = new SimpleMCP({
  name: 'my-server',
  version: '1.0.0'
});
```

**After (v2.0.0):**
```typescript
import { SimplyMCP } from 'simply-mcp';

const server = new SimplyMCP({
  name: 'my-server',
  version: '1.0.0'
});
```

### Search and Replace

Use this command to update all files in your project:

```bash
# Find all occurrences
grep -r "SimpleMCP" . --include="*.ts" --include="*.js"

# Replace (macOS/BSD sed)
find . -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i '' 's/SimpleMCP/SimplyMCP/g' {} \;

# Replace (Linux sed)
find . -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i 's/SimpleMCP/SimplyMCP/g' {} \;
```

### All APIs Updated

All references have been updated across all APIs:

#### Programmatic API
```typescript
import { SimplyMCP } from 'simply-mcp';  // ✅ Updated

const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
```

#### Decorator API
```typescript
import { MCPServer } from 'simply-mcp';  // No change

@MCPServer({ name: 'my-server', version: '1.0.0' })
class MyServer {
  // Decorators unchanged
}
```

#### Functional API
```typescript
import { defineMCP } from 'simply-mcp';  // No change

export default defineMCP({
  // Functional API unchanged
});
```

#### TypeScript Types
```typescript
import type { SimplyMCPOptions } from 'simply-mcp';  // ✅ Updated
```

## 🐛 Bug Fixes

### CLI Command Now Works

Fixed the `simplymcp` CLI command that was broken in v1.1.0-v1.1.1:

**What was broken:**
- `simplymcp bundle ...` command didn't work
- Bin pointed to non-existent `.js` file
- CLI files weren't compiled by TypeScript

**What's fixed:**
- ✅ CLI files now compile to `dist/mcp/cli/`
- ✅ Bin path updated: `./dist/mcp/cli/index.js`
- ✅ Removed `mcp/cli/**/*` from tsconfig exclude
- ✅ `simplymcp bundle server.ts` now works!

### Verify CLI Works

```bash
# Check version
npx simplymcp --version

# Bundle a server
npx simplymcp bundle server.ts

# Bundle with options
npx simplymcp bundle server.ts --output dist/bundle.js --minify
```

## 📝 Documentation Updates

All documentation has been updated:

- ✅ README.md
- ✅ MODULE_USAGE.md
- ✅ CONTRIBUTING.md
- ✅ All guides in `mcp/docs/`
- ✅ All examples in `mcp/examples/`
- ✅ All test files
- ✅ All release notes

## 🔧 Technical Details

### Files Renamed

- `mcp/SimpleMCP.ts` → `mcp/SimplyMCP.ts`

### Files Updated (1053 references)

- All `.ts` files: Class imports and usages
- All `.md` files: Documentation examples
- All test files: Test cases and assertions

### TypeScript Configuration

**tsconfig.json changes:**
```diff
  "exclude": [
    "node_modules",
    "dist",
    "mcp/tests/**/*",
    "mcp/examples/**/*",
    "mcp/servers/**/*",
    "mcp/validation/**/*",
    "mcp/handlers/**/*",
-   "mcp/cli/**/*"
  ]
```

**package.json changes:**
```diff
  "bin": {
-   "simplymcp": "./mcp/cli/index.js"
+   "simplymcp": "./dist/mcp/cli/index.js"
  }
```

## ✅ Testing

All tests passing:
```bash
npm test  # 53 tests, 100% success rate
```

Build successful:
```bash
npm run build  # ✅ No errors
```

CLI functional:
```bash
npx simplymcp --version  # ✅ Works
npx simplymcp bundle server.ts  # ✅ Works
```

## 📊 Impact Summary

| Category | Count | Status |
|----------|-------|--------|
| TypeScript files updated | 89 | ✅ |
| Markdown files updated | 64 | ✅ |
| Class renamed | 1 | ✅ |
| Interface renamed | 1 (SimplyMCPOptions) | ✅ |
| CLI fixed | 1 | ✅ |
| Tests updated | 53 | ✅ |
| Examples updated | 16 | ✅ |

## 🚀 Upgrading

### Step 1: Update Package

```bash
npm update simply-mcp
```

### Step 2: Update Imports

Replace all `SimpleMCP` with `SimplyMCP` in your code:

```bash
# Linux
find . -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i 's/SimpleMCP/SimplyMCP/g' {} \;

# macOS
find . -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i '' 's/SimpleMCP/SimplyMCP/g' {} \;
```

### Step 3: Verify

```bash
# Check TypeScript compiles
npx tsc --noEmit

# Run tests
npm test

# Try the CLI
npx simplymcp --version
```

## 🎉 What's Next

This release completes the naming consistency work:

- ✅ Package: `simply-mcp`
- ✅ Command: `simplymcp`
- ✅ Class: `SimplyMCP`
- ✅ Repository: `github.com/Clockwork-Innovations/simply-mcp`

Everything now follows the "simply-mcp" pattern!

---

**Full Changelog:** https://github.com/Clockwork-Innovations/simply-mcp/compare/v1.1.1...v2.0.0

🤖 **Generated with [Claude Code](https://claude.com/claude-code)**

Co-Authored-By: Claude <noreply@anthropic.com>
