# Release Notes - v1.1.1

**Release Date:** 2025-10-03
**Type:** Patch Release (Bug Fix)

## 🐛 Bug Fixes

### Missing Runtime Dependencies

Fixed critical bug where `esbuild` and `yargs` were incorrectly placed in `devDependencies` instead of `dependencies`.

**Impact:**
- Users installing `simply-mcp@1.1.0` would get import errors when:
  - Using bundler API (`import { bundle } from 'simply-mcp'`)
  - Running CLI commands (`simplemcp bundle ...`)

**Root Cause:**
- `esbuild` is imported by `mcp/core/bundler.ts` which is exported from the package
- `yargs` is imported by `mcp/cli/index.ts` which is the bin entry point
- Both were in `devDependencies`, so npm didn't install them for users

**Fix:**
- Moved `esbuild@^0.25.10` from devDependencies → dependencies
- Moved `yargs@^18.0.0` from devDependencies → dependencies
- Kept type definitions (`@types/yargs`) in devDependencies (compile-time only)

### Repository Rename

- Renamed GitHub repository from `simple-mcp` → `simply-mcp` to match package name
- Updated all documentation URLs to point to `clockwork-innovations/simply-mcp`
- Updated git remote URLs

### Naming Consistency Fixes

Fixed inconsistent naming across the codebase to follow the `simply-mcp` pattern:

**Command Name:**
- Changed bin command from `simplemcp` → `simplymcp`
- Now runs as: `simplymcp bundle ...` (matches package pattern)

**Config Files:**
- Updated config file names: `simplemcp.config.*` → `simplymcp.config.*`
- Updated generated config imports to use `'simply-mcp'`

**Documentation:**
- Updated all code examples with correct command name
- Fixed repo references in CONTRIBUTING.md, DEPLOYMENT_GUIDE.md
- Consistent naming pattern throughout

**Naming Pattern:**
- Package: `simply-mcp` (install: `npm install simply-mcp`)
- Command: `simplymcp` (run: `simplymcp bundle ...`)
- Repository: `simply-mcp` (GitHub: `Clockwork-Innovations/simply-mcp`)

## 📦 Dependencies

### Added to dependencies:
- `esbuild: ^0.25.10`
- `yargs: ^18.0.0`

### Removed from devDependencies:
- ~~`esbuild: ^0.25.10`~~ (moved to dependencies)
- ~~`yargs: ^18.0.0`~~ (moved to dependencies)

## ✅ Verification

All tests pass:
```bash
npm test  # 53 tests, 100% success rate
```

Package imports work correctly:
```bash
npm install simply-mcp
node -e "import('simply-mcp').then(m => console.log('✅', Object.keys(m)))"
```

## 🔄 Migration

If you installed v1.1.0, simply update to v1.1.1:

```bash
npm update simply-mcp
```

No code changes required - this is purely a dependency fix.

## 📊 Stats

- **Package Size:** ~76.5 MB (unchanged)
- **Dependencies:** 10 (was 8)
- **Dev Dependencies:** 4 (was 6)

---

🎉 **Generated with [Claude Code](https://claude.com/claude-code)**

Co-Authored-By: Claude <noreply@anthropic.com>
